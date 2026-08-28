// Integration tests for InboxRepository against a REAL Postgres (task 0012).
// Gated by RUN_DB_TESTS so the default `npm test` (no DB) skips them entirely.
// Run with `RUN_DB_TESTS=1 npx jest --runInBand` (suites race migrations on a
// cold DB otherwise — see the 0017 worklog).

import { readFileSync } from "fs";
import { join } from "path";
import { Pool } from "pg";
import { InboxRepository } from "../../src/profile-server/InboxRepository";
import { PlayerProfileRepository } from "../../src/profile-server/PlayerProfileRepository";

const RUN = process.env.RUN_DB_TESTS ? describe : describe.skip;

RUN("InboxRepository (integration)", () => {
  let pool: Pool;
  let inbox: InboxRepository;
  let profiles: PlayerProfileRepository;

  const A = "yandex-inbox-a";
  const B = "yandex-inbox-b";

  async function makeCitizen(id: string): Promise<void> {
    await profiles.upsertProfile(id, `pid-${id}`);
    await pool.query(
      "UPDATE player_profiles SET is_citizen = true WHERE yandex_player_id = $1",
      [id],
    );
  }

  beforeAll(async () => {
    pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
    for (const file of [
      "migrations/001_player_profiles.sql",
      "migrations/002_yandex_payments.sql",
      "migrations/003_player_messages.sql",
    ]) {
      await pool.query(readFileSync(join(process.cwd(), file), "utf8"));
    }
    inbox = new InboxRepository(pool);
    profiles = new PlayerProfileRepository(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    await pool.query(
      `TRUNCATE player_messages, processed_purchases, purchase_intents,
               player_match_xp_credits, player_name_history,
               player_cosmetic_ownership, player_profiles
       RESTART IDENTITY CASCADE`,
    );
  });

  test("sendMessage for an unknown player reports no_profile and writes nothing", async () => {
    await expect(
      inbox.sendMessage({ yandexPlayerId: "ghost", title: "T", body: "B" }),
    ).resolves.toEqual({ status: "no_profile" });
    const count = await pool.query(
      "SELECT count(*)::int AS n FROM player_messages",
    );
    expect(count.rows[0].n).toBe(0);
  });

  test("sendTemplate for an unknown player resolves without throwing", async () => {
    await expect(
      inbox.sendTemplate("ghost", "citizenship_earned"),
    ).resolves.toBeUndefined();
  });

  test("the DB CHECK is XOR: neither shape, title-only, and template+literal are all rejected", async () => {
    await profiles.upsertProfile(A, "pid-a");
    await expect(
      pool.query(
        "INSERT INTO player_messages (yandex_player_id, title) VALUES ($1, 'only title')",
        [A],
      ),
    ).rejects.toMatchObject({ code: "23514" });
    // Review R2: a template row must not also carry literal text.
    await expect(
      pool.query(
        `INSERT INTO player_messages (yandex_player_id, template_key, title, body)
         VALUES ($1, 'citizenship_paid', 'Welcome', 'x')`,
        [A],
      ),
    ).rejects.toMatchObject({ code: "23514" });
    await expect(
      pool.query(
        `INSERT INTO player_messages (yandex_player_id, template_key, body)
         VALUES ($1, 'citizenship_paid', 'x')`,
        [A],
      ),
    ).rejects.toMatchObject({ code: "23514" });
  });

  test("listMessages gates a non-citizen and a missing profile; a citizen reads newest first", async () => {
    await expect(inbox.listMessages("ghost")).resolves.toEqual({
      status: "not_citizen",
    });
    await profiles.upsertProfile(A, "pid-a");
    await expect(inbox.listMessages(A)).resolves.toEqual({
      status: "not_citizen",
    });

    await pool.query(
      "UPDATE player_profiles SET is_citizen = true WHERE yandex_player_id = $1",
      [A],
    );
    const first = await inbox.sendMessage({
      yandexPlayerId: A,
      templateKey: "citizenship_earned",
    });
    const second = await inbox.sendMessage({
      yandexPlayerId: A,
      templateKey: "name_change_rejected",
      templateParams: { name: "Alpha", reason: "too short" },
    });
    const third = await inbox.sendMessage({
      yandexPlayerId: A,
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
      yandexPlayerId: A,
      templateKey: "citizenship_paid",
    });
    await inbox.sendMessage({ yandexPlayerId: A, title: "T", body: "B" });

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
      yandexPlayerId: A,
      title: "a1",
      body: "x",
    });
    const a2 = await inbox.sendMessage({
      yandexPlayerId: A,
      title: "a2",
      body: "x",
    });
    const b1 = await inbox.sendMessage({
      yandexPlayerId: B,
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
    await profiles.upsertProfile(A, "pid-a");
    await expect(inbox.markRead(A)).resolves.toEqual({ status: "not_citizen" });
  });

  test("a profile erasure cascades to its messages", async () => {
    await makeCitizen(A);
    await inbox.sendMessage({ yandexPlayerId: A, title: "T", body: "B" });
    await pool.query(
      "DELETE FROM player_profiles WHERE yandex_player_id = $1",
      [A],
    );
    const count = await pool.query(
      "SELECT count(*)::int AS n FROM player_messages WHERE yandex_player_id = $1",
      [A],
    );
    expect(count.rows[0].n).toBe(0);
  });
});
