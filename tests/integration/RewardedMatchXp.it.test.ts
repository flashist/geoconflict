// Integration test for the rewarded-ad match-XP grant (task 0491, server part of
// 0488): the real migrations (009 included), the real repositories and real
// Postgres, driven through createApp() exactly as Server.ts wires it — login for a
// Bearer token, a base credit the way the game server writes it, then the grant.
// Gated by RUN_DB_TESTS; supertest-based, so the known flake family applies
// (CLAUDE.md).

import { Pool } from "pg";
import request from "supertest";
import { InboxRepository } from "../../src/profile-server/InboxRepository";
import { PlayerProfileRepository } from "../../src/profile-server/PlayerProfileRepository";
import { createApp } from "../../src/profile-server/Routes";
import { verifySessionToken } from "../../src/profile-server/SessionToken";
import { realProfileRepo, truncateProfileTables } from "./support/db";

const RUN = process.env.RUN_DB_TESTS ? describe : describe.skip;

const SECRET = "0491-integration-session-secret-0123456789";

RUN("rewarded-ad match XP grant over real Postgres (integration)", () => {
  let pool: Pool;
  let profiles: PlayerProfileRepository;
  let app: ReturnType<typeof createApp>;

  beforeAll(() => {
    pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
    const inbox = new InboxRepository(pool);
    profiles = new PlayerProfileRepository(pool, inbox);
    app = createApp(
      realProfileRepo(pool, inbox),
      undefined,
      inbox,
      undefined,
      { secret: SECRET },
      { rewardedMatchXp: profiles },
    );
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    await truncateProfileTables(pool);
  });

  async function login(
    platformUserId: string,
  ): Promise<{ token: string; playerId: string }> {
    const res = await request(app)
      .post("/v1/login")
      .send({ platform: "yandex_games", platformUserId });
    expect(res.status).toBe(200);
    const token: string = res.body.session.token;
    const verified = verifySessionToken(SECRET, token);
    if (verified.status !== "ok") {
      throw new Error(`token did not verify: ${verified.status}`);
    }
    return { token, playerId: verified.claims.pid };
  }

  const grant = (token: string, gameId: string) =>
    request(app)
      .post("/v1/profile/rewarded-match-xp")
      .set("Authorization", `Bearer ${token}`)
      .send({ gameId });

  async function xpOf(playerId: string): Promise<number> {
    const res = await pool.query("SELECT xp FROM players WHERE id = $1", [
      playerId,
    ]);
    return Number(res.rows[0].xp);
  }

  async function rewardedRows(playerId?: string) {
    const res =
      playerId === undefined
        ? await pool.query(
            "SELECT game_id, player_id, xp_awarded FROM player_rewarded_match_xp",
          )
        : await pool.query(
            `SELECT game_id, xp_awarded FROM player_rewarded_match_xp
             WHERE player_id = $1`,
            [playerId],
          );
    return res.rows;
  }

  test("no base credit → not_credited, nothing written", async () => {
    const { token, playerId } = await login("zz0491-none");
    const res = await grant(token, "game-never-credited");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "not_credited", xpAwarded: 0, xp: 0 });
    expect(await xpOf(playerId)).toBe(0);
    expect(await rewardedRows()).toEqual([]);
  });

  test("granted adds the base credit's own xp_awarded and writes one ledger row", async () => {
    const { token, playerId } = await login("zz0491-granted");
    await profiles.creditMatchXp("game-1", playerId, 3);
    expect(await xpOf(playerId)).toBe(3);

    const res = await grant(token, "game-1");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "granted", xpAwarded: 3, xp: 6 });
    expect(await xpOf(playerId)).toBe(6);
    expect(await rewardedRows(playerId)).toEqual([
      { game_id: "game-1", xp_awarded: 3 },
    ]);
  });

  test("a second call for the same match is a duplicate and adds nothing", async () => {
    const { token, playerId } = await login("zz0491-dup");
    await profiles.creditMatchXp("game-1", playerId, 1);
    await grant(token, "game-1").expect(200);

    const second = await grant(token, "game-1");
    expect(second.status).toBe(200);
    expect(second.body).toEqual({ status: "duplicate", xpAwarded: 1, xp: 2 });
    expect(await xpOf(playerId)).toBe(2);
    expect(await rewardedRows(playerId)).toHaveLength(1);
  });

  test("another player's credited game → not_credited for the caller, nothing written", async () => {
    const owner = await login("zz0491-owner");
    const other = await login("zz0491-other");
    await profiles.creditMatchXp("game-owned", owner.playerId, 1);

    const res = await grant(other.token, "game-owned");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "not_credited", xpAwarded: 0, xp: 0 });
    expect(await xpOf(other.playerId)).toBe(0);
    expect(await xpOf(owner.playerId)).toBe(1);
    expect(await rewardedRows()).toEqual([]);
  });

  test("99 → 101 crosses into earned citizenship and fires the inbox hook once", async () => {
    const { token, playerId } = await login("zz0491-citizen");
    for (let i = 0; i < 97; i++) {
      await profiles.creditMatchXp(`game-c-${i}`, playerId, 1);
    }
    await profiles.creditMatchXp("game-last", playerId, 2);
    expect(await xpOf(playerId)).toBe(99);

    const res = await grant(token, "game-last");
    // Every citizen reads exactly 100 to an unverified caller (task 0250 S1);
    // the store holds the true 101.
    expect(res.body).toEqual({ status: "granted", xpAwarded: 2, xp: 100 });
    expect(await xpOf(playerId)).toBe(101);

    const row = await pool.query(
      "SELECT is_citizen, citizenship_earned_at FROM players WHERE id = $1",
      [playerId],
    );
    expect(row.rows[0].is_citizen).toBe(true);
    expect(row.rows[0].citizenship_earned_at).not.toBeNull();

    // A later grant for an already-citizen must not send a second message.
    await profiles.creditMatchXp("game-after", playerId, 1);
    await grant(token, "game-after").expect(200);
    expect(await xpOf(playerId)).toBe(103);

    const countMessages = async () => {
      const messages = await pool.query(
        `SELECT count(*)::int AS n FROM player_messages
         WHERE player_id = $1 AND template_key = 'citizenship_earned'`,
        [playerId],
      );
      return Number(messages.rows[0].n);
    };
    // The send runs AFTER commit and is not awaited: poll for the first, then
    // leave a straggler time to appear before asserting exactly one.
    const deadline = Date.now() + 4_000;
    while (Date.now() < deadline && (await countMessages()) === 0) {
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(await countMessages()).toBe(1);
  });

  test("two concurrent grants for one match → exactly one row and the XP added once", async () => {
    // Repeated so a lucky serial interleaving is unlikely to pass alone.
    for (let i = 0; i < 5; i++) {
      const { token, playerId } = await login(`zz0491-race-${i}`);
      await profiles.creditMatchXp("game-race", playerId, 1);
      const [a, b] = await Promise.all([
        grant(token, "game-race"),
        grant(token, "game-race"),
      ]);
      expect([a.status, b.status]).toEqual([200, 200]);
      expect([a.body.status, b.body.status].sort()).toEqual([
        "duplicate",
        "granted",
      ]);
      expect(await xpOf(playerId)).toBe(2);
      expect(await rewardedRows(playerId)).toHaveLength(1);
    }
  });

  test("player erasure cascades to the rewarded ledger", async () => {
    const { token, playerId } = await login("zz0491-erased");
    await profiles.creditMatchXp("game-1", playerId, 1);
    await grant(token, "game-1").expect(200);
    expect(await rewardedRows(playerId)).toHaveLength(1);

    await pool.query("DELETE FROM players WHERE id = $1", [playerId]);
    expect(await rewardedRows()).toEqual([]);

    // The token outlives its player: 404, nothing written.
    const res = await grant(token, "game-1");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "not_found" });
    expect(await rewardedRows()).toEqual([]);
  });
});
