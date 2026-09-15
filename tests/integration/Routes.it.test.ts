// HTTP-level integration test: drives createApp() wired to a REAL
// PlayerProfileRepository + Postgres via supertest, proving the full
// upsert -> credit -> read flow works over the API with no psql seeding (the C1
// fix — the slice's "curl-exercisable working backend" priority). Gated by
// RUN_DB_TESTS; see jest.config.ts / TEST_DATABASE_URL. The schema is built once
// per run by globalSetup.ts; this suite only truncates.
//
// Task 0270: routes keep their Yandex-id request shapes, resolve the caller
// find-only to the internal player id, and only the internal upsert creates.

import { Pool } from "pg";
import request from "supertest";
import { InboxRepository } from "../../src/profile-server/InboxRepository";
import { PaymentsRepository } from "../../src/profile-server/PaymentsRepository";
import { createApp } from "../../src/profile-server/Routes";
import {
  countOrphanPlayers,
  createYandexPlayer,
  realProfileRepo,
  truncateProfileTables,
} from "./support/db";

const UUID_SHAPE =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

const RUN = process.env.RUN_DB_TESTS ? describe : describe.skip;
const TOKEN = "it-internal-token";

/**
 * The post-commit inbox seams are fire-and-forget, so a message row lands a
 * tick after the HTTP response. Poll (bounded) rather than sleep; throws on
 * timeout so a missing send fails loudly instead of racing.
 */
async function waitForMessages(
  pool: Pool,
  playerId: string,
  expected: number,
): Promise<Array<{ template_key: string | null; read_at: Date | null }>> {
  const deadline = Date.now() + 3_000;
  for (;;) {
    const res = await pool.query(
      `SELECT template_key, read_at FROM player_messages
       WHERE player_id = $1 ORDER BY id`,
      [playerId],
    );
    if (res.rows.length >= expected) return res.rows;
    if (Date.now() > deadline) {
      throw new Error(
        `expected ${expected} inbox message(s), saw ${res.rows.length}`,
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

  // The Yandex id every request below carries (the persistentId is still on the
  // upsert wire and ignored).
  const P = "yandex-http-1";
  const PID = "33333333-3333-3333-3333-333333333333";

  /** The internal player id behind P, once something has created it. */
  async function playerIdOf(yandexId: string): Promise<string> {
    const res = await pool.query(
      `SELECT player_id FROM player_identities
       WHERE platform = 'yandex_games' AND platform_user_id = $1`,
      [yandexId],
    );
    if (res.rows.length === 0) throw new Error("no identity for that id");
    return String(res.rows[0].player_id);
  }

  async function countPlayers(): Promise<number> {
    const res = await pool.query("SELECT count(*)::int AS n FROM players");
    return Number(res.rows[0].n);
  }

  beforeAll(() => {
    process.env.PROFILE_INTERNAL_TOKEN = TOKEN;
    pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
    // Wired exactly as Server.ts wires production: one inbox repository feeds
    // the player routes AND both post-commit citizenship seams.
    const inbox = new InboxRepository(pool);
    payments = new PaymentsRepository(pool, inbox);
    app = createApp(
      realProfileRepo(pool, inbox),
      { paymentsRepo: payments, yandexPaymentsSecret: "it-secret" },
      inbox,
    );
  });

  afterAll(async () => {
    process.env.PROFILE_INTERNAL_TOKEN = ORIGINAL_TOKEN;
    await pool.end();
  });

  beforeEach(async () => {
    await truncateProfileTables(pool);
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
    const playerId = await playerIdOf(P);
    const rows = await waitForMessages(pool, playerId, 1);
    expect(rows).toHaveLength(1);
    expect(rows[0].template_key).toBe("citizenship_earned");

    // A duplicate of the same game and a later game: still exactly one message.
    await creditOverHttp("g-cross", 1000);
    await creditOverHttp("g-later", 10);
    await new Promise((resolve) => setTimeout(resolve, 100));
    const after = await pool.query(
      "SELECT count(*)::int AS n FROM player_messages WHERE player_id = $1",
      [playerId],
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
    const playerId = await createYandexPlayer(pool, P);
    const intentId = await payments.createIntent(playerId, "citizenship");
    const grant = {
      purchaseToken: "tok-inbox-1",
      productId: "citizenship",
      playerId,
      intentId,
      rawPayload: '{"test":true}',
    };
    await expect(payments.grantPaidPurchase(grant)).resolves.toBe("granted");
    const rows = await waitForMessages(pool, playerId, 1);
    expect(rows[0].template_key).toBe("citizenship_paid");

    await expect(payments.grantPaidPurchase(grant)).resolves.toBe(
      "already_processed",
    );
    await new Promise((resolve) => setTimeout(resolve, 100));
    const after = await pool.query(
      "SELECT count(*)::int AS n FROM player_messages WHERE player_id = $1",
      [playerId],
    );
    expect(after.rows[0].n).toBe(1);
  });

  test("inbox: read state set on one device is visible from a second device", async () => {
    await request(app)
      .post("/internal/v1/profile/upsert")
      .set("authorization", `Bearer ${TOKEN}`)
      .send({ yandexPlayerId: P, persistentId: PID });
    await creditOverHttp("g-cross", 1000);
    await waitForMessages(pool, await playerIdOf(P), 1);

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
      .send({
        playerId: "00000000-0000-4000-8000-00000000dead",
        title: "Hello",
        body: "Welcome.",
      });
    expect(unauthenticated.status).toBe(401);

    const ghost = await request(app)
      .post("/internal/v1/messages/send")
      .set("authorization", `Bearer ${TOKEN}`)
      .send({
        playerId: "00000000-0000-4000-8000-00000000dead",
        title: "Hello",
        body: "Welcome.",
      });
    expect(ghost.status).toBe(404);
    expect(ghost.body).toEqual({ error: "no_profile" });

    await request(app)
      .post("/internal/v1/profile/upsert")
      .set("authorization", `Bearer ${TOKEN}`)
      .send({ yandexPlayerId: P, persistentId: PID });
    const playerId = await playerIdOf(P);
    await pool.query("UPDATE players SET is_citizen = true WHERE id = $1", [
      playerId,
    ]);

    // Operators address the internal id; a Yandex id is a clean 400.
    const byYandexId = await request(app)
      .post("/internal/v1/messages/send")
      .set("authorization", `Bearer ${TOKEN}`)
      .send({ yandexPlayerId: P, title: "Hello", body: "Welcome." });
    expect(byYandexId.status).toBe(400);

    const sent = await request(app)
      .post("/internal/v1/messages/send")
      .set("authorization", `Bearer ${TOKEN}`)
      .send({ playerId, title: "Hello", body: "Welcome." });
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
    expect(JSON.stringify(created.body)).not.toMatch(UUID_SHAPE);

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
    expect(read.body).not.toHaveProperty("yandex_player_id");
    expect(read.body).not.toHaveProperty("is_paid_citizen");
    expect(read.body).not.toHaveProperty("citizenship_purchased_at");
    expect(JSON.stringify(read.body)).not.toMatch(UUID_SHAPE);
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

  test("upsert is find-or-create: repeated calls return the same player, one row, no orphans", async () => {
    for (const persistentId of [
      PID,
      PID,
      "44444444-4444-4444-4444-444444444444",
    ]) {
      const res = await request(app)
        .post("/internal/v1/profile/upsert")
        .set("authorization", `Bearer ${TOKEN}`)
        .send({ yandexPlayerId: P, persistentId });
      expect(res.status).toBe(200);
      expect(res.body.xp).toBe(0);
    }
    expect(await countPlayers()).toBe(1);
    expect(await countOrphanPlayers(pool)).toBe(0);
  });

  // The old persistent_id UNIQUE constraint 409'd a shared browser with two
  // Yandex accounts. It is gone (task 0270): the same persistentId under a second
  // account is simply a second player.
  test("two Yandex accounts presenting the same persistentId are two players, not a 409", async () => {
    const first = await request(app)
      .post("/internal/v1/profile/upsert")
      .set("authorization", `Bearer ${TOKEN}`)
      .send({ yandexPlayerId: P, persistentId: PID });
    expect(first.status).toBe(200);

    const second = await request(app)
      .post("/internal/v1/profile/upsert")
      .set("authorization", `Bearer ${TOKEN}`)
      .send({ yandexPlayerId: "yandex-http-2", persistentId: PID });
    expect(second.status).toBe(200);
    expect(await countPlayers()).toBe(2);
    expect(await playerIdOf(P)).not.toBe(await playerIdOf("yandex-http-2"));
  });

  // ADR-113 / design §4: a public request can never create a player.
  test("no public route creates a players row for an unknown Yandex id", async () => {
    const ghost = "yandex-http-ghost";
    const responses = [
      await request(app).get(`/v1/profile?yandexPlayerId=${ghost}`),
      await request(app).get(`/v1/messages?yandexPlayerId=${ghost}`),
      await request(app)
        .patch("/v1/messages/read")
        .send({ yandexPlayerId: ghost }),
      await request(app)
        .post("/v1/payments/yandex/intent")
        .send({ yandexPlayerId: ghost, productId: "citizenship" }),
    ];
    expect(responses.map((res) => res.status)).toEqual([404, 403, 403, 404]);
    expect(responses[0].body).toEqual({ error: "not_found" });
    expect(responses[3].body).toEqual({ error: "not_found" });

    const credit = await request(app)
      .post("/internal/v1/credit")
      .set("authorization", `Bearer ${TOKEN}`)
      .send({
        credits: [{ gameId: "g1", yandexPlayerId: ghost, xpAwarded: 10 }],
      });
    expect(credit.body.results[0].status).toBe("no_profile");

    expect(await countPlayers()).toBe(0);
    const identities = await pool.query(
      "SELECT count(*)::int AS n FROM player_identities",
    );
    expect(identities.rows[0].n).toBe(0);
    const intents = await pool.query(
      "SELECT count(*)::int AS n FROM purchase_intents",
    );
    expect(intents.rows[0].n).toBe(0);
  });

  test("payments intent for a known player binds the intent to its internal id", async () => {
    const playerId = await createYandexPlayer(pool, P);
    const res = await request(app)
      .post("/v1/payments/yandex/intent")
      .send({ yandexPlayerId: P, productId: "citizenship" });
    expect(res.status).toBe(200);
    const intent = await payments.findIntent(res.body.intentId);
    expect(intent?.playerId).toBe(playerId);
    expect(JSON.stringify(res.body)).not.toContain(playerId);
  });
});
