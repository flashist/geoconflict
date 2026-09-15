// Integration tests for InboxRepository against a REAL Postgres (task 0012).
// Gated by RUN_DB_TESTS so the default `npm test` (no DB) skips them entirely.
// Run with `npm run test:integration`. The schema is built once per run by
// globalSetup.ts; this suite only truncates. Keyed by the internal player id
// since task 0270.

import { Pool } from "pg";
import { InboxRepository } from "../../src/profile-server/InboxRepository";
import { createYandexPlayer, truncateProfileTables } from "./support/db";

const RUN = process.env.RUN_DB_TESTS ? describe : describe.skip;

RUN("InboxRepository (integration)", () => {
  let pool: Pool;
  let inbox: InboxRepository;

  // Internal player ids, created per test (both start as non-citizens).
  let A: string;
  let B: string;
  // A syntactically valid player id that no players row carries.
  const GHOST = "00000000-0000-4000-8000-00000000dead";

  async function makeCitizen(id: string): Promise<void> {
    await pool.query("UPDATE players SET is_citizen = true WHERE id = $1", [
      id,
    ]);
  }

  beforeAll(() => {
    pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
    inbox = new InboxRepository(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    await truncateProfileTables(pool);
    A = await createYandexPlayer(pool, "yandex-inbox-a");
    B = await createYandexPlayer(pool, "yandex-inbox-b");
  });

  test("sendMessage for an unknown player reports no_profile and writes nothing", async () => {
    await expect(
      inbox.sendMessage({ playerId: GHOST, title: "T", body: "B" }),
    ).resolves.toEqual({ status: "no_profile" });
    const count = await pool.query(
      "SELECT count(*)::int AS n FROM player_messages",
    );
    expect(count.rows[0].n).toBe(0);
  });

  test("sendTemplate for an unknown player resolves without throwing", async () => {
    await expect(
      inbox.sendTemplate(GHOST, "citizenship_earned"),
    ).resolves.toBeUndefined();
  });

  test("the DB CHECK is XOR: neither shape, title-only, and template+literal are all rejected", async () => {
    await expect(
      pool.query(
        "INSERT INTO player_messages (player_id, title) VALUES ($1, 'only title')",
        [A],
      ),
    ).rejects.toMatchObject({ code: "23514" });
    // Review R2: a template row must not also carry literal text.
    await expect(
      pool.query(
        `INSERT INTO player_messages (player_id, template_key, title, body)
         VALUES ($1, 'citizenship_paid', 'Welcome', 'x')`,
        [A],
      ),
    ).rejects.toMatchObject({ code: "23514" });
    await expect(
      pool.query(
        `INSERT INTO player_messages (player_id, template_key, body)
         VALUES ($1, 'citizenship_paid', 'x')`,
        [A],
      ),
    ).rejects.toMatchObject({ code: "23514" });
  });

  test("listMessages gates a non-citizen and a missing profile; a citizen reads newest first", async () => {
    await expect(inbox.listMessages(GHOST)).resolves.toEqual({
      status: "not_citizen",
    });
    await expect(inbox.listMessages(A)).resolves.toEqual({
      status: "not_citizen",
    });

    await makeCitizen(A);
    const first = await inbox.sendMessage({
      playerId: A,
      templateKey: "citizenship_earned",
    });
    const second = await inbox.sendMessage({
      playerId: A,
      templateKey: "name_change_rejected",
      templateParams: { name: "Alpha", reason: "too short" },
    });
    const third = await inbox.sendMessage({
      playerId: A,
      title: "Hello",
      body: "Welcome.",
    });
    expect(first.status).toBe("sent");
    expect(second.status).toBe("sent");
    expect(third.status).toBe("sent");

    const outcome = await inbox.listMessages(A);
    expect(outcome.status).toBe("ok");
    if (outcome.status !== "ok") return;
    expect(outcome.messages.map((m) => m.id)).toEqual([
      (third as { id: number }).id,
      (second as { id: number }).id,
      (first as { id: number }).id,
    ]);
    expect(outcome.messages[0]).toMatchObject({
      templateKey: null,
      title: "Hello",
      body: "Welcome.",
      readAt: null,
    });
    expect(outcome.messages[1]).toMatchObject({
      templateKey: "name_change_rejected",
      templateParams: { name: "Alpha", reason: "too short" },
      title: null,
      body: null,
    });
    expect(outcome.messages[2].templateKey).toBe("citizenship_earned");
    for (const m of outcome.messages) {
      expect(new Date(m.sentAt).getTime()).not.toBeNaN();
    }
  });

  test("markRead: all, then idempotent; readAt persists for a later read", async () => {
    await makeCitizen(A);
    await inbox.sendMessage({
      playerId: A,
      templateKey: "citizenship_paid",
    });
    await inbox.sendMessage({ playerId: A, title: "T", body: "B" });

    await expect(inbox.markRead(A)).resolves.toEqual({
      status: "ok",
      updated: 2,
    });
    await expect(inbox.markRead(A)).resolves.toEqual({
      status: "ok",
      updated: 0,
    });

    const outcome = await inbox.listMessages(A);
    if (outcome.status !== "ok") throw new Error("expected ok");
    expect(outcome.messages.every((m) => m.readAt !== null)).toBe(true);
    // chk_read_after_sent holds.
    for (const m of outcome.messages) {
      expect(new Date(m.readAt as string).getTime()).toBeGreaterThanOrEqual(
        new Date(m.sentAt).getTime(),
      );
    }
  });

  test("markRead with ids touches only those; cross-player ids never leak", async () => {
    await makeCitizen(A);
    await makeCitizen(B);
    const a1 = await inbox.sendMessage({
      playerId: A,
      title: "a1",
      body: "x",
    });
    const a2 = await inbox.sendMessage({
      playerId: A,
      title: "a2",
      body: "x",
    });
    const b1 = await inbox.sendMessage({
      playerId: B,
      title: "b1",
      body: "x",
    });
    if (a1.status !== "sent" || a2.status !== "sent" || b1.status !== "sent") {
      throw new Error("expected sends");
    }

    // A marks one of its own AND tries B's id: only its own is updated.
    await expect(inbox.markRead(A, [a2.id, b1.id])).resolves.toEqual({
      status: "ok",
      updated: 1,
    });
    const aList = await inbox.listMessages(A);
    const bList = await inbox.listMessages(B);
    if (aList.status !== "ok" || bList.status !== "ok") throw new Error("ok");
    expect(aList.messages.find((m) => m.id === a2.id)?.readAt).not.toBeNull();
    expect(aList.messages.find((m) => m.id === a1.id)?.readAt).toBeNull();
    expect(bList.messages.find((m) => m.id === b1.id)?.readAt).toBeNull();
  });

  test("markRead gates a non-citizen", async () => {
    await expect(inbox.markRead(A)).resolves.toEqual({ status: "not_citizen" });
  });

  test("a profile erasure cascades to its messages", async () => {
    await makeCitizen(A);
    await inbox.sendMessage({ playerId: A, title: "T", body: "B" });
    await pool.query("DELETE FROM players WHERE id = $1", [A]);
    const count = await pool.query(
      "SELECT count(*)::int AS n FROM player_messages WHERE player_id = $1",
      [A],
    );
    expect(count.rows[0].n).toBe(0);
  });
});
