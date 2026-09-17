// Integration tests for POST /v1/login + the session funnel (task 0271, S2) over a
// REAL Postgres, wired exactly as Server.ts wires production. The forced lost-race
// proof for find-or-create lives in PlayerIdentityRepository.it.test.ts (0270); this
// suite proves the HTTP path on top of it: parallel logins for one new identity make
// ONE player (brief check 1), a login token reads the profile, the legacy fallback
// never creates (check 3), and grantChecks.tenure reads player_xp_grants.

import { Pool } from "pg";
import request from "supertest";
import { LoginResponseSchema } from "../../src/core/profile/LoginContract";
import { PaymentsRepository } from "../../src/profile-server/PaymentsRepository";
import { createApp } from "../../src/profile-server/Routes";
import { verifySessionToken } from "../../src/profile-server/SessionToken";
import {
  countOrphanPlayers,
  realProfileRepo,
  truncateProfileTables,
} from "./support/db";

const RUN = process.env.RUN_DB_TESTS ? describe : describe.skip;

const SECRET = "0271-integration-session-secret-0123456789";

const TOKEN = "0274-integration-internal-token";

RUN("POST /v1/login (integration)", () => {
  let pool: Pool;
  let app: ReturnType<typeof createApp>;
  // Task 0274: the SAME wiring with the creation switch OFF, so the switch is proved
  // against a real database rather than a mocked repository.
  let pausedApp: ReturnType<typeof createApp>;

  async function countPlayers(): Promise<number> {
    const res = await pool.query("SELECT count(*)::int AS n FROM players");
    return Number(res.rows[0].n);
  }

  function login(platformUserId: string) {
    return request(app)
      .post("/v1/login")
      .send({ platform: "yandex_games", platformUserId });
  }

  function pidOf(token: string): string {
    const verified = verifySessionToken(SECRET, token);
    if (verified.status !== "ok") {
      throw new Error(`token did not verify: ${verified.status}`);
    }
    return verified.claims.pid;
  }

  beforeAll(() => {
    pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
    app = createApp(
      realProfileRepo(pool),
      {
        paymentsRepo: new PaymentsRepository(pool),
        yandexPaymentsSecret: "0271-it-payments-secret",
      },
      undefined,
      undefined,
      { secret: SECRET },
    );
    pausedApp = createApp(
      realProfileRepo(pool),
      undefined,
      undefined,
      undefined,
      { secret: SECRET },
      { loginCreateEnabled: false },
    );
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    await truncateProfileTables(pool);
  });

  test("two parallel logins for one new identity → one player, zero orphans, one created:true, one pid", async () => {
    // Repeated over fresh identities: each pair is a real concurrent race through
    // HTTP → find-or-create; ten pairs make a lucky serial interleaving unlikely.
    const ids = Array.from({ length: 10 }, (_, i) => `zz0271-race-${i}`);
    for (const id of ids) {
      const [a, b] = await Promise.all([login(id), login(id)]);
      expect([a.status, b.status]).toEqual([200, 200]);
      const bodies = [a.body, b.body].map((body) =>
        LoginResponseSchema.parse(body),
      );
      expect(bodies.filter((body) => body.created)).toHaveLength(1);
      expect(pidOf(bodies[0].session.token)).toBe(
        pidOf(bodies[1].session.token),
      );
      const identities = await pool.query(
        `SELECT count(*)::int AS n FROM player_identities
         WHERE platform = 'yandex_games' AND platform_user_id = $1`,
        [id],
      );
      expect(identities.rows[0].n).toBe(1);
    }
    expect(await countPlayers()).toBe(ids.length);
    expect(await countOrphanPlayers(pool)).toBe(0);
  });

  test("a login token reads the profile over Bearer", async () => {
    const res = await login("zz0271-bearer");
    expect(res.status).toBe(200);
    const profile = await request(app)
      .get("/v1/profile")
      .set("Authorization", `Bearer ${res.body.session.token}`);
    expect(profile.status).toBe(200);
    expect(profile.body.xp).toBe(0);
  });

  // Task 0273 (S4), owner ruling D1: the legacy fallback is GONE. A Yandex id on
  // the query — known OR unknown — is 401, never a profile and never a 404, and it
  // still creates nothing.
  test("a legacy yandexPlayerId query is 401 and creates no player", async () => {
    await login("zz0271-existing");
    const before = await countPlayers();
    for (const id of ["zz0271-existing", "zz0271-never-logged-in"]) {
      const res = await request(app).get(
        `/v1/profile?yandexPlayerId=${encodeURIComponent(id)}`,
      );
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: "session_invalid" });
    }
    expect(await countPlayers()).toBe(before);
    expect(await countOrphanPlayers(pool)).toBe(0);
  });

  test("a token for a player that no longer exists → payments intent 404, not 500 (real pg 23503)", async () => {
    const res = await login("zz0271-erased");
    const token: string = res.body.session.token;
    await pool.query("DELETE FROM players WHERE id = $1", [pidOf(token)]);
    const intent = await request(app)
      .post("/v1/payments/yandex/intent")
      .set("Authorization", `Bearer ${token}`)
      .send({ productId: "citizenship" });
    expect(intent.status).toBe(404);
    expect(intent.body).toEqual({ error: "not_found" });
  });

  test("grantChecks.tenure: pending for a new and an unchecked player, done once any tenure row exists (0 XP included)", async () => {
    const first = await login("zz0271-tenure");
    expect(first.body.created).toBe(true);
    expect(first.body.grantChecks).toEqual({ tenure: "pending" });

    const second = await login("zz0271-tenure");
    expect(second.body.created).toBe(false);
    expect(second.body.grantChecks).toEqual({ tenure: "pending" });

    await pool.query(
      `INSERT INTO player_xp_grants (player_id, kind, xp_awarded, evidence)
       VALUES ($1, 'tenure', 0, '{}'::jsonb)`,
      [pidOf(first.body.session.token)],
    );
    const third = await login("zz0271-tenure");
    expect(third.body.grantChecks).toEqual({ tenure: "done" });
  });

  // ── The login-creation switch against a real database (task 0274, S5) ────────
  describe("with login creation PAUSED", () => {
    function pausedLogin(platformUserId: string) {
      return request(pausedApp)
        .post("/v1/login")
        .send({ platform: "yandex_games", platformUserId });
    }

    test("an existing player still logs in and gets a working token — pausing creation is not an outage", async () => {
      const first = await login("zz0274-existing");
      expect(first.status).toBe(200);
      const before = await countPlayers();

      const again = await pausedLogin("zz0274-existing");
      expect(again.status).toBe(200);
      expect(again.body.created).toBe(false);
      expect(await countPlayers()).toBe(before);

      const profile = await request(pausedApp)
        .get("/v1/profile")
        .set("Authorization", `Bearer ${again.body.session.token}`);
      expect(profile.status).toBe(200);
    });

    test("an unknown id is 503 creation_paused and the player table does NOT grow", async () => {
      const before = await countPlayers();
      const res = await pausedLogin("zz0274-never-seen");
      expect(res.status).toBe(503);
      expect(res.body).toEqual({ error: "creation_paused" });
      expect(await countPlayers()).toBe(before);
      const identities = await pool.query(
        `SELECT count(*)::int AS n FROM player_identities
         WHERE platform_user_id = $1`,
        ["zz0274-never-seen"],
      );
      expect(identities.rows[0].n).toBe(0);
      expect(await countOrphanPlayers(pool)).toBe(0);
    });

    test("a repeated refusal stays a refusal — nothing accumulates", async () => {
      const before = await countPlayers();
      for (let i = 0; i < 5; i++) {
        expect((await pausedLogin("zz0274-flood")).status).toBe(503);
      }
      expect(await countPlayers()).toBe(before);
    });

    test("the INTERNAL game-server resolve still creates while login is paused — a real match stays creditable", async () => {
      const original = process.env.PROFILE_INTERNAL_TOKEN;
      process.env.PROFILE_INTERNAL_TOKEN = TOKEN;
      try {
        const before = await countPlayers();
        const res = await request(pausedApp)
          .post("/internal/v1/players/resolve")
          .set("Authorization", `Bearer ${TOKEN}`)
          .send({
            platform: "yandex_games",
            platformUserId: "zz0274-game-server",
          });
        expect(res.status).toBe(200);
        expect(await countPlayers()).toBe(before + 1);
        expect(await countOrphanPlayers(pool)).toBe(0);
        // ...and that player can now log in even while creation is paused.
        const login = await pausedLogin("zz0274-game-server");
        expect(login.status).toBe(200);
        expect(login.body.created).toBe(false);
      } finally {
        process.env.PROFILE_INTERNAL_TOKEN = original;
      }
    });
  });
});
