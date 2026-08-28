// Unit tests for InboxRepository over a mocked pg Pool — row mapping, the
// citizen gate short-circuit, and which UPDATE shape markRead picks. (Real
// Postgres behavior, CHECKs and cascade included, is covered in
// tests/integration/InboxRepository.it.test.ts under RUN_DB_TESTS.)

jest.mock("../../src/profile-server/Logger", () => ({
  logger: {
    child: () => ({ warn: jest.fn(), error: jest.fn(), info: jest.fn() }),
  },
  formatError: (error: unknown) => String(error),
}));

import type { Pool } from "pg";
import {
  InboxRepository,
  rowToMessage,
} from "../../src/profile-server/InboxRepository";

function makePool(): { pool: Pool; query: jest.Mock } {
  const query = jest.fn();
  return { pool: { query } as unknown as Pool, query };
}

describe("rowToMessage", () => {
  test("coerces bigint ids, Date timestamps and jsonb params to the wire shape", () => {
    expect(
      rowToMessage({
        id: "42",
        template_key: "name_change_rejected",
        template_params: { name: "Alpha", reason: "too short", junk: 7 },
        title: null,
        body: null,
        sent_at: new Date("2026-08-26T10:00:00.000Z"),
        read_at: new Date("2026-08-26T11:00:00.000Z"),
      }),
    ).toEqual({
      id: 42,
      templateKey: "name_change_rejected",
      templateParams: { name: "Alpha", reason: "too short" },
      title: null,
      body: null,
      sentAt: "2026-08-26T10:00:00.000Z",
      readAt: "2026-08-26T11:00:00.000Z",
    });
  });

  test("maps a literal, unread message", () => {
    expect(
      rowToMessage({
        id: 1,
        template_key: null,
        template_params: null,
        title: "Hello",
        body: "Welcome.",
        sent_at: new Date("2026-08-26T10:00:00.000Z"),
        read_at: null,
      }),
    ).toEqual({
      id: 1,
      templateKey: null,
      templateParams: {},
      title: "Hello",
      body: "Welcome.",
      sentAt: "2026-08-26T10:00:00.000Z",
      readAt: null,
    });
  });
});

describe("InboxRepository", () => {
  test("sendMessage inserts a template send and returns the new id", async () => {
    const { pool, query } = makePool();
    query.mockResolvedValue({ rows: [{ id: "5" }] });
    const repo = new InboxRepository(pool);
    await expect(
      repo.sendMessage({
        yandexPlayerId: "y1",
        templateKey: "citizenship_earned",
      }),
    ).resolves.toEqual({ status: "sent", id: 5 });
    expect(query).toHaveBeenCalledTimes(1);
    expect(String(query.mock.calls[0][0])).toContain(
      "INSERT INTO player_messages",
    );
    expect(query.mock.calls[0][1]).toEqual([
      "y1",
      "citizenship_earned",
      "{}",
      null,
      null,
    ]);
  });

  test("sendMessage maps an FK violation to no_profile and rethrows anything else", async () => {
    const { pool, query } = makePool();
    const repo = new InboxRepository(pool);
    query.mockRejectedValueOnce(
      Object.assign(new Error("fk"), { code: "23503" }),
    );
    await expect(
      repo.sendMessage({ yandexPlayerId: "ghost", title: "T", body: "B" }),
    ).resolves.toEqual({ status: "no_profile" });
    query.mockRejectedValueOnce(new Error("connection reset"));
    await expect(
      repo.sendMessage({ yandexPlayerId: "y1", title: "T", body: "B" }),
    ).rejects.toThrow("connection reset");
  });

  test("sendTemplate resolves (and only logs) on no_profile", async () => {
    const { pool, query } = makePool();
    query.mockRejectedValue(Object.assign(new Error("fk"), { code: "23503" }));
    const repo = new InboxRepository(pool);
    await expect(
      repo.sendTemplate("ghost", "citizenship_paid"),
    ).resolves.toBeUndefined();
  });

  test("listMessages gates a missing profile and a non-citizen WITHOUT reading messages", async () => {
    const { pool, query } = makePool();
    const repo = new InboxRepository(pool);
    query.mockResolvedValueOnce({ rows: [] });
    await expect(repo.listMessages("ghost")).resolves.toEqual({
      status: "not_citizen",
    });
    query.mockResolvedValueOnce({ rows: [{ is_citizen: false }] });
    await expect(repo.listMessages("y1")).resolves.toEqual({
      status: "not_citizen",
    });
    expect(query).toHaveBeenCalledTimes(2);
    for (const call of query.mock.calls) {
      expect(String(call[0])).toContain("FROM player_profiles");
    }
  });

  test("listMessages returns mapped rows for a citizen", async () => {
    const { pool, query } = makePool();
    const repo = new InboxRepository(pool);
    query
      .mockResolvedValueOnce({ rows: [{ is_citizen: true }] })
      .mockResolvedValueOnce({
        rows: [
          {
            id: "2",
            template_key: "citizenship_paid",
            template_params: {},
            title: null,
            body: null,
            sent_at: new Date("2026-08-26T10:00:00.000Z"),
            read_at: null,
          },
        ],
      });
    const outcome = await repo.listMessages("y1");
    expect(outcome.status).toBe("ok");
    if (outcome.status === "ok") {
      expect(outcome.messages).toHaveLength(1);
      expect(outcome.messages[0].id).toBe(2);
      expect(outcome.messages[0].templateKey).toBe("citizenship_paid");
    }
    expect(String(query.mock.calls[1][0])).toContain(
      "ORDER BY sent_at DESC, id DESC",
    );
  });

  test("markRead picks the mark-all vs the id-scoped UPDATE and reports rowCount", async () => {
    const { pool, query } = makePool();
    const repo = new InboxRepository(pool);
    query
      .mockResolvedValueOnce({ rows: [{ is_citizen: true }] })
      .mockResolvedValueOnce({ rowCount: 3 });
    await expect(repo.markRead("y1")).resolves.toEqual({
      status: "ok",
      updated: 3,
    });
    expect(String(query.mock.calls[1][0])).not.toContain("ANY(");
    expect(query.mock.calls[1][1]).toEqual(["y1"]);

    query
      .mockResolvedValueOnce({ rows: [{ is_citizen: true }] })
      .mockResolvedValueOnce({ rowCount: 1 });
    await expect(repo.markRead("y1", [7, 8])).resolves.toEqual({
      status: "ok",
      updated: 1,
    });
    expect(String(query.mock.calls[3][0])).toContain("ANY(");
    expect(query.mock.calls[3][1]).toEqual(["y1", [7, 8]]);
  });

  test("markRead gates a non-citizen without updating anything", async () => {
    const { pool, query } = makePool();
    const repo = new InboxRepository(pool);
    query.mockResolvedValueOnce({ rows: [{ is_citizen: false }] });
    await expect(repo.markRead("y1")).resolves.toEqual({
      status: "not_citizen",
    });
    expect(query).toHaveBeenCalledTimes(1);
  });
});
