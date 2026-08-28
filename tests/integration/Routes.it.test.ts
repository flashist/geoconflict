// HTTP-level integration test: drives createApp() wired to a REAL
// PlayerProfileRepository + Postgres via supertest, proving the full
// upsert -> credit -> read flow works over the API with no psql seeding (the C1
// fix — the slice's "curl-exercisable working backend" priority). Gated by
// RUN_DB_TESTS; see jest.config.ts / TEST_DATABASE_URL.

import { readFileSync } from "fs";
import { join } from "path";
import { Pool } from "pg";
import request from "supertest";
import { InboxRepository } from "../../src/profile-server/InboxRepository";
import { PaymentsRepository } from "../../src/profile-server/PaymentsRepository";
import { PlayerProfileRepository } from "../../src/profile-server/PlayerProfileRepository";
import { createApp } from "../../src/profile-server/Routes";

const RUN = process.env.RUN_DB_TESTS ? describe : describe.skip;
const TOKEN = "it-internal-token";

/**
 * The post-commit inbox seams are fire-and-forget, so a message row lands a
 * tick after the HTTP response. Poll (bounded) rather than sleep; throws on
 * timeout so a missing send fails loudly instead of racing.
 */
async function waitForMessages(
  pool: Pool,
  yandexPlayerId: string,
  expected: number,
): Promise<Array<{ template_key: string | null; read_at: Date | null }>> {
  const deadline = Date.now() + 3_000;
  for (;;) {
    const res = await pool.query(
      `SELECT template_key, read_at FROM player_messages
       WHERE yandex_player_id = $1 ORDER BY id`,
      [yandexPlayerId],
    );
    if (res.rows.length >= expected) return res.rows;
    if (Date.now() > deadline) {
      throw new Error(
        `expected ${expected} inbox message(s) for ${yandexPlayerId}, saw ${res.rows.length}`,
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
}

RUN("profile API over real Postgres (integration)", () => {
  let pool: Pool;
  let app: ReturnType<typeof createApp>;
  let payments: PaymentsRepository;
  const ORIGINAL_TOKEN = process.env.PROFILE_INTERNAL_TOKEN;

  const P = "yandex-http-1";
  const PID = "33333333-3333-3333-3333-333333333333";

  beforeAll(async () => {
    process.env.PROFILE_INTERNAL_TOKEN = TOKEN;
    pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
    for (const file of [
      "migrations/001_player_profiles.sql",
      "migrations/002_yandex_payments.sql",
      "migrations/003_player_messages.sql",
      // Applied here too (task 0067) so the schema is identical whichever
      // integration suite reaches a cold DB first — the suites share one
      // database and run --runInBand.
      "migrations/004_name_change.sql",
    ]) {
      await pool.query(readFileSync(join(process.cwd(), file), "utf8"));
    }
    // Wired exactly as Server.ts wires production: one inbox repository feeds
    // the player routes AND both post-commit citizenship seams.
    const inbox = new InboxRepository(pool);
    payments = new PaymentsRepository(pool, inbox);
    app = createApp(
      new PlayerProfileRepository(pool, inbox),
      { paymentsRepo: payments, yandexPaymentsSecret: "it-secret" },
      inbox,
    );
  });

  afterAll(async () => {
    process.env.PROFILE_INTERNAL_TOKEN = ORIGINAL_TOKEN;
    await pool.end();
  });

  beforeEach(async () => {
    await pool.query(
      `TRUNCATE player_messages, processed_purchases, purchase_intents,
               player_match_xp_credits, player_name_history,
               player_cosmetic_ownership, player_profiles RESTART IDENTITY CASCADE`,
    );
  });

  // ── Personal inbox (task 0012) ─────────────────────────────────────────────

  async function creditOverHttp(gameId: string, xpAwarded: number) {
    return request(app)
      .post("/internal/v1/credit")
      .set("authorization", `Bearer ${TOKEN}`)
      .send({ credits: [{ gameId, yandexPlayerId: P, xpAwarded }] });
  }

  test("inbox: earning citizenship over HTTP sends exactly ONE citizenship_earned message", async () => {
    await request(app)
      .post("/internal/v1/profile/upsert")
      .set("authorization", `Bearer ${TOKEN}`)
      .send({ yandexPlayerId: P, persistentId: PID });

    // Non-citizen: the inbox is gated (403), the bell has nothing to show.
    const gated = await request(app).get(`/v1/messages?yandexPlayerId=${P}`);
    expect(gated.status).toBe(403);
    expect(gated.body).toEqual({ error: "not_citizen" });

    const crossing = await creditOverHttp("g-cross", 1000);
    expect(crossing.body.results[0].status).toBe("credited");
    const rows = await waitForMessages(pool, P, 1);
    expect(rows).toHaveLength(1);
    expect(rows[0].template_key).toBe("citizenship_earned");

    // A duplicate of the same game and a later game: still exactly one message.
    await creditOverHttp("g-cross", 1000);
    await creditOverHttp("g-later", 10);
    await new Promise((resolve) => setTimeout(resolve, 100));
    const after = await pool.query(
      "SELECT count(*)::int AS n FROM player_messages WHERE yandex_player_id = $1",
      [P],
    );
    expect(after.rows[0].n).toBe(1);

    // Citizen now: the list is served, newest first, unread.
    const list = await request(app).get(`/v1/messages?yandexPlayerId=${P}`);
    expect(list.status).toBe(200);
    expect(list.body.messages).toHaveLength(1);
    expect(list.body.messages[0]).toMatchObject({
      templateKey: "citizenship_earned",
      readAt: null,
    });
  });

  test("inbox: a paid grant sends citizenship_paid once; a replay stays silent", async () => {
    const intentId = await payments.createIntent(P, "citizenship");
    const grant = {
      purchaseToken: "tok-inbox-1",
      productId: "citizenship",
      yandexPlayerId: P,
      intentId,
      rawPayload: '{"test":true}',
    };
    await expect(payments.grantPaidPurchase(grant)).resolves.toBe("granted");
    const rows = await waitForMessages(pool, P, 1);
    expect(rows[0].template_key).toBe("citizenship_paid");

    await expect(payments.grantPaidPurchase(grant)).resolves.toBe(
      "already_processed",
    );
    await new Promise((resolve) => setTimeout(resolve, 100));
    const after = await pool.query(
      "SELECT count(*)::int AS n FROM player_messages WHERE yandex_player_id = $1",
      [P],
    );
    expect(after.rows[0].n).toBe(1);
  });

  test("inbox: read state set on one device is visible from a second device", async () => {
    await request(app)
      .post("/internal/v1/profile/upsert")
      .set("authorization", `Bearer ${TOKEN}`)
      .send({ yandexPlayerId: P, persistentId: PID });
    await creditOverHttp("g-cross", 1000);
    await waitForMessages(pool, P, 1);

    // Device 1: preflight, then open the Personal tab (mark all read).
    const preflight = await request(app)
      .options("/v1/messages/read")
      .set("Origin", "https://geoconflict.ru")
      .set("Access-Control-Request-Method", "PATCH");
    expect(preflight.status).toBe(204);
    expect(preflight.headers["access-control-allow-methods"]).toBe(
      "GET, PATCH",
    );

    const marked = await request(app)
      .patch("/v1/messages/read")
      .set("Origin", "https://geoconflict.ru")
      .send({ yandexPlayerId: P });
    expect(marked.status).toBe(200);
    expect(marked.body).toEqual({ updated: 1 });

    // Device 2: a fresh read shows the same read state.
    const second = await request(app).get(`/v1/messages?yandexPlayerId=${P}`);
    expect(second.status).toBe(200);
    expect(second.body.messages[0].readAt).not.toBeNull();

    // Idempotent: re-opening marks nothing further.
    const again = await request(app)
      .patch("/v1/messages/read")
      .send({ yandexPlayerId: P });
    expect(again.body).toEqual({ updated: 0 });
  });

  test("inbox: the internal send endpoint delivers a literal message to a citizen", async () => {
    const unauthenticated = await request(app)
      .post("/internal/v1/messages/send")
      .send({ yandexPlayerId: P, title: "Hello", body: "Welcome." });
    expect(unauthenticated.status).toBe(401);

    const ghost = await request(app)
      .post("/internal/v1/messages/send")
      .set("authorization", `Bearer ${TOKEN}`)
      .send({ yandexPlayerId: "ghost", title: "Hello", body: "Welcome." });
    expect(ghost.status).toBe(404);
    expect(ghost.body).toEqual({ error: "no_profile" });

    await request(app)
      .post("/internal/v1/profile/upsert")
      .set("authorization", `Bearer ${TOKEN}`)
      .send({ yandexPlayerId: P, persistentId: PID });
    await pool.query(
      "UPDATE player_profiles SET is_citizen = true WHERE yandex_player_id = $1",
      [P],
    );
    const sent = await request(app)
      .post("/internal/v1/messages/send")
      .set("authorization", `Bearer ${TOKEN}`)
      .send({ yandexPlayerId: P, title: "Hello", body: "Welcome." });
    expect(sent.status).toBe(200);
    expect(sent.body.id).toBeGreaterThan(0);

    const list = await request(app).get(`/v1/messages?yandexPlayerId=${P}`);
    expect(list.body.messages[0]).toMatchObject({
      id: sent.body.id,
      templateKey: null,
      title: "Hello",
      body: "Welcome.",
      readAt: null,
    });
  });

  test("upsert -> credit -> read produces xp 10, no leaked fields", async () => {
    // Before upsert: no profile.
    const missing = await request(app).get(`/v1/profile?yandexPlayerId=${P}`);
    expect(missing.status).toBe(404);

    // Create via the internal endpoint (no psql seeding).
    const created = await request(app)
      .post("/internal/v1/profile/upsert")
      .set("authorization", `Bearer ${TOKEN}`)
      .send({ yandexPlayerId: P, persistentId: PID });
    expect(created.status).toBe(200);
    expect(created.body.xp).toBe(0);
    expect(created.body).not.toHaveProperty("persistent_id");

    // Credit once, then idempotently again.
    const body = {
      credits: [{ gameId: "g1", yandexPlayerId: P, xpAwarded: 10 }],
    };
    const first = await request(app)
      .post("/internal/v1/credit")
      .set("authorization", `Bearer ${TOKEN}`)
      .send(body);
    expect(first.body.results[0].status).toBe("credited");
    const second = await request(app)
      .post("/internal/v1/credit")
      .set("authorization", `Bearer ${TOKEN}`)
      .send(body);
    expect(second.body.results[0].status).toBe("duplicate");

    // Read back: xp 10 (not 20), and no paid / persistent_id leakage.
    const read = await request(app).get(`/v1/profile?yandexPlayerId=${P}`);
    expect(read.status).toBe(200);
    expect(read.body.xp).toBe(10);
    expect(read.body).not.toHaveProperty("persistent_id");
    expect(read.body).not.toHaveProperty("is_paid_citizen");
    expect(read.body).not.toHaveProperty("citizenship_purchased_at");
  });

  test("credit before any profile reports no_profile and writes nothing", async () => {
    const res = await request(app)
      .post("/internal/v1/credit")
      .set("authorization", `Bearer ${TOKEN}`)
      .send({
        credits: [{ gameId: "g1", yandexPlayerId: "ghost", xpAwarded: 10 }],
      });
    expect(res.status).toBe(200);
    expect(res.body.results[0].status).toBe("no_profile");

    const ledger = await pool.query(
      "SELECT count(*)::int AS n FROM player_match_xp_credits",
    );
    expect(ledger.rows[0].n).toBe(0);
  });

  test("upsert relinks persistent_id on a changed value", async () => {
    await request(app)
      .post("/internal/v1/profile/upsert")
      .set("authorization", `Bearer ${TOKEN}`)
      .send({ yandexPlayerId: P, persistentId: PID });
    await request(app)
      .post("/internal/v1/profile/upsert")
      .set("authorization", `Bearer ${TOKEN}`)
      .send({
        yandexPlayerId: P,
        persistentId: "44444444-4444-4444-4444-444444444444",
      });

    const row = await pool.query(
      "SELECT persistent_id FROM player_profiles WHERE yandex_player_id = $1",
      [P],
    );
    expect(row.rows[0].persistent_id).toBe(
      "44444444-4444-4444-4444-444444444444",
    );
  });

  test("upsert with the same persistentId twice is a no-op (200, same row)", async () => {
    const first = await request(app)
      .post("/internal/v1/profile/upsert")
      .set("authorization", `Bearer ${TOKEN}`)
      .send({ yandexPlayerId: P, persistentId: PID });
    expect(first.status).toBe(200);

    const second = await request(app)
      .post("/internal/v1/profile/upsert")
      .set("authorization", `Bearer ${TOKEN}`)
      .send({ yandexPlayerId: P, persistentId: PID });
    expect(second.status).toBe(200);
    expect(second.body.yandex_player_id).toBe(P);
    expect(second.body.xp).toBe(0);
  });

  test("cross-account persistentId collision returns 409, not 500", async () => {
    // First account claims the device's persistentId.
    const first = await request(app)
      .post("/internal/v1/profile/upsert")
      .set("authorization", `Bearer ${TOKEN}`)
      .send({ yandexPlayerId: P, persistentId: PID });
    expect(first.status).toBe(200);

    // A second Yandex account presents the SAME persistentId (account switch /
    // shared browser) — the persistent_id UNIQUE index collides.
    const collision = await request(app)
      .post("/internal/v1/profile/upsert")
      .set("authorization", `Bearer ${TOKEN}`)
      .send({ yandexPlayerId: "yandex-http-2", persistentId: PID });
    expect(collision.status).toBe(409);
    expect(collision.body).toEqual({ error: "persistent_id_conflict" });

    // The second account got no profile row (clean failure, no partial write).
    const after = await request(app).get(
      "/v1/profile?yandexPlayerId=yandex-http-2",
    );
    expect(after.status).toBe(404);
  });
});
