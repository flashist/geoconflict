// HTTP-level integration test: drives createApp() wired to a REAL
// PlayerProfileRepository + Postgres via supertest, proving the full
// resolve -> credit -> read flow works over the API with no psql seeding (the C1
// fix — the slice's "curl-exercisable working backend" priority). Gated by
// RUN_DB_TESTS; see jest.config.ts / TEST_DATABASE_URL. The schema is built once
// per run by globalSetup.ts; this suite only truncates.
//
// Task 0272 (S3): the only internal creator is POST /internal/v1/players/resolve,
// and credits are keyed by the internal player id it returns. Task 0273 (S4): every
// PLAYER-facing call here carries a real signed session token — the legacy
// Yandex-id request shapes are gone, and the suite proves that over real Postgres.

import { Pool } from "pg";
import request from "supertest";
import { InboxRepository } from "../../src/profile-server/InboxRepository";
import { PaymentsRepository } from "../../src/profile-server/PaymentsRepository";
import { createApp } from "../../src/profile-server/Routes";
import {
  TEST_SESSION_CONFIG,
  bearerFor,
} from "../profile-server/support/sessionToken";
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

  // The Yandex id every request below carries.
  const P = "yandex-http-1";
  // A well-formed internal id no player has.
  const GHOST_PLAYER_ID = "00000000-0000-4000-8000-00000000beef";

  /**
   * A session token for the internal player id behind `yandexId` — what the S4
   * client holds after `POST /v1/login`. The suite signs it directly rather than
   * going through the login route: `Login.it.test.ts` owns that route's proof.
   */
  async function callerFor(yandexId: string): Promise<string> {
    return bearerFor(await playerIdOf(yandexId));
  }

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
      undefined,
      TEST_SESSION_CONFIG,
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

  /** The game server's find-or-create, over HTTP (task 0272). */
  async function resolveOverHttp(platformUserId: string) {
    return request(app)
      .post("/internal/v1/players/resolve")
      .set("authorization", `Bearer ${TOKEN}`)
      .send({ platform: "yandex_games", platformUserId });
  }

  async function creditOverHttp(
    playerId: string,
    gameId: string,
    xpAwarded: number,
  ) {
    return request(app)
      .post("/internal/v1/credit")
      .set("authorization", `Bearer ${TOKEN}`)
      .send({ credits: [{ gameId, playerId, xpAwarded }] });
  }

  test("inbox: earning citizenship over HTTP sends exactly ONE citizenship_earned message", async () => {
    const resolved = await resolveOverHttp(P);
    const playerId: string = resolved.body.playerId;

    const caller = bearerFor(playerId);

    // Non-citizen: the inbox is gated (403), the bell has nothing to show.
    const gated = await request(app)
      .get("/v1/messages")
      .set("Authorization", caller);
    expect(gated.status).toBe(403);
    expect(gated.body).toEqual({ error: "not_citizen" });

    const crossing = await creditOverHttp(playerId, "g-cross", 1000);
    expect(crossing.body.results[0].status).toBe("credited");
    const rows = await waitForMessages(pool, playerId, 1);
    expect(rows).toHaveLength(1);
    expect(rows[0].template_key).toBe("citizenship_earned");

    // A duplicate of the same game and a later game: still exactly one message.
    await creditOverHttp(playerId, "g-cross", 1000);
    await creditOverHttp(playerId, "g-later", 10);
    await new Promise((resolve) => setTimeout(resolve, 100));
    const after = await pool.query(
      "SELECT count(*)::int AS n FROM player_messages WHERE player_id = $1",
      [playerId],
    );
    expect(after.rows[0].n).toBe(1);

    // Citizen now: the list is served, newest first, unread.
    const list = await request(app)
      .get("/v1/messages")
      .set("Authorization", caller);
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
    const resolved = await resolveOverHttp(P);
    await creditOverHttp(resolved.body.playerId, "g-cross", 1000);
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

    const caller = await callerFor(P);
    const marked = await request(app)
      .patch("/v1/messages/read")
      .set("Origin", "https://geoconflict.ru")
      .set("Authorization", caller)
      .send({});
    expect(marked.status).toBe(200);
    expect(marked.body).toEqual({ updated: 1 });

    // Device 2: a fresh read shows the same read state. A second device means a
    // second login, i.e. a second token for the SAME internal player id.
    const second = await request(app)
      .get("/v1/messages")
      .set("Authorization", await callerFor(P));
    expect(second.status).toBe(200);
    expect(second.body.messages[0].readAt).not.toBeNull();

    // Idempotent: re-opening marks nothing further.
    const again = await request(app)
      .patch("/v1/messages/read")
      .set("Authorization", caller)
      .send({});
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

    await resolveOverHttp(P);
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

    const list = await request(app)
      .get("/v1/messages")
      .set("Authorization", bearerFor(playerId));
    expect(list.body.messages[0]).toMatchObject({
      id: sent.body.id,
      templateKey: null,
      title: "Hello",
      body: "Welcome.",
      readAt: null,
    });
  });

  test("resolve -> credit -> read produces xp 10, no leaked fields", async () => {
    // Before resolve: a token for a player that does not exist reads 404.
    const missing = await request(app)
      .get("/v1/profile")
      .set("Authorization", bearerFor(GHOST_PLAYER_ID));
    expect(missing.status).toBe(404);

    // Create via the internal endpoint (no psql seeding). The internal response
    // carries the internal id (ADR-113 point 3) and nothing else.
    const created = await resolveOverHttp(P);
    expect(created.status).toBe(200);
    const playerId = await playerIdOf(P);
    expect(created.body).toEqual({ playerId, isCitizen: false });

    // Credit once, then idempotently again — keyed (game_id, player_id).
    const first = await creditOverHttp(playerId, "g1", 10);
    expect(first.body.results[0]).toEqual({
      gameId: "g1",
      playerId,
      status: "credited",
    });
    const second = await creditOverHttp(playerId, "g1", 10);
    expect(second.body.results[0].status).toBe("duplicate");
    const ledger = await pool.query(
      "SELECT game_id, player_id::text AS player_id FROM player_match_xp_credits",
    );
    expect(ledger.rows).toEqual([{ game_id: "g1", player_id: playerId }]);

    // Read back: xp 10 (not 20), and no paid / identity leakage to the client.
    const read = await request(app)
      .get("/v1/profile")
      .set("Authorization", bearerFor(playerId));
    expect(read.status).toBe(200);
    expect(read.body.xp).toBe(10);
    expect(read.body).not.toHaveProperty("persistent_id");
    expect(read.body).not.toHaveProperty("yandex_player_id");
    expect(read.body).not.toHaveProperty("is_paid_citizen");
    expect(read.body).not.toHaveProperty("citizenship_purchased_at");
    expect(JSON.stringify(read.body)).not.toMatch(UUID_SHAPE);
  });

  test("credit for an unknown player id reports no_profile and writes nothing", async () => {
    const res = await creditOverHttp(GHOST_PLAYER_ID, "g1", 10);
    expect(res.status).toBe(200);
    expect(res.body.results[0].status).toBe("no_profile");

    const ledger = await pool.query(
      "SELECT count(*)::int AS n FROM player_match_xp_credits",
    );
    expect(ledger.rows[0].n).toBe(0);
  });

  test("resolve is find-or-create: repeated calls return the same player, one row each, no orphans", async () => {
    const ids: string[] = [];
    for (let i = 0; i < 3; i++) {
      const res = await resolveOverHttp(P);
      expect(res.status).toBe(200);
      ids.push(res.body.playerId);
    }
    expect(new Set(ids).size).toBe(1);
    expect(ids[0]).toBe(await playerIdOf(P));
    expect(await countPlayers()).toBe(1);
    const identities = await pool.query(
      "SELECT count(*)::int AS n FROM player_identities",
    );
    expect(identities.rows[0].n).toBe(1);
    expect(await countOrphanPlayers(pool)).toBe(0);
  });

  test("parallel resolves for one new identity make ONE player and no orphans", async () => {
    const responses = await Promise.all(
      Array.from({ length: 8 }, () => resolveOverHttp("yandex-http-race")),
    );
    expect(responses.map((res) => res.status)).toEqual(Array(8).fill(200));
    expect(new Set(responses.map((res) => res.body.playerId)).size).toBe(1);
    expect(await countPlayers()).toBe(1);
    expect(await countOrphanPlayers(pool)).toBe(0);
  });

  // Two different Yandex accounts are two players (task 0270 removed the old
  // persistent_id UNIQUE that 409'd a shared browser; S3 no longer sends it at all).
  test("two Yandex accounts are two players", async () => {
    const first = await resolveOverHttp(P);
    const second = await resolveOverHttp("yandex-http-2");
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(await countPlayers()).toBe(2);
    expect(first.body.playerId).not.toBe(second.body.playerId);
  });

  test("the retired upsert route is gone (404) and creates nothing", async () => {
    const res = await request(app)
      .post("/internal/v1/profile/upsert")
      .set("authorization", `Bearer ${TOKEN}`)
      .send({ yandexPlayerId: P, persistentId: "p" });
    expect(res.status).toBe(404);
    expect(await countPlayers()).toBe(0);
  });

  // ADR-113 / design §4: a public request can never create a player. Since task
  // 0273 (S4) there are two ways to be an unknown caller, and BOTH are proved here:
  // a legacy Yandex id (now simply 401 — the fallback is gone) and a valid token
  // for a player id that does not exist (each route's own 404/403).
  test("no public route creates a players row — for a legacy id or a ghost token", async () => {
    const ghost = "yandex-http-ghost";
    const legacy = [
      await request(app).get(`/v1/profile?yandexPlayerId=${ghost}`),
      await request(app).get(`/v1/messages?yandexPlayerId=${ghost}`),
      await request(app)
        .patch("/v1/messages/read")
        .send({ yandexPlayerId: ghost }),
      await request(app)
        .post("/v1/payments/yandex/intent")
        .send({ yandexPlayerId: ghost, productId: "citizenship" }),
    ];
    expect(legacy.map((res) => res.status)).toEqual([401, 401, 401, 401]);
    for (const res of legacy) {
      expect(res.body).toEqual({ error: "session_invalid" });
    }

    const ghostCaller = bearerFor(GHOST_PLAYER_ID);
    const responses = [
      await request(app).get("/v1/profile").set("Authorization", ghostCaller),
      await request(app).get("/v1/messages").set("Authorization", ghostCaller),
      await request(app)
        .patch("/v1/messages/read")
        .set("Authorization", ghostCaller)
        .send({}),
      await request(app)
        .post("/v1/payments/yandex/intent")
        .set("Authorization", ghostCaller)
        .send({ productId: "citizenship" }),
    ];
    expect(responses.map((res) => res.status)).toEqual([404, 403, 403, 404]);
    expect(responses[0].body).toEqual({ error: "not_found" });
    expect(responses[3].body).toEqual({ error: "not_found" });

    const credit = await creditOverHttp(GHOST_PLAYER_ID, "g1", 10);
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
      .set("Authorization", bearerFor(playerId))
      .send({ productId: "citizenship" });
    expect(res.status).toBe(200);
    const intent = await payments.findIntent(res.body.intentId);
    expect(intent?.playerId).toBe(playerId);
    expect(JSON.stringify(res.body)).not.toContain(playerId);
  });
});
