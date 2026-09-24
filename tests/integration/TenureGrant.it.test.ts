// Integration test for the tenure XP grant (task 0253; ADR-112 as amended by the
// 2026-09-15 redesign): the real migrations, the real repositories and real
// Postgres, driven through createApp() exactly as Server.ts wires it — login for
// a Bearer token, then the claim. This is where brief verification 8 (and the
// server half of 9) is proven: the real primary key, the real row lock, the real
// transaction. Gated by RUN_DB_TESTS; supertest-based, so the known flake family
// applies (CLAUDE.md).

import { Pool } from "pg";
import request from "supertest";
import type { TenureEvidence } from "../../src/core/profile/TenureGrantContract";
import { InboxRepository } from "../../src/profile-server/InboxRepository";
import { PlayerProfileRepository } from "../../src/profile-server/PlayerProfileRepository";
import { createApp } from "../../src/profile-server/Routes";
import { verifySessionToken } from "../../src/profile-server/SessionToken";
import { realProfileRepo, truncateProfileTables } from "./support/db";

const RUN = process.env.RUN_DB_TESTS ? describe : describe.skip;

const SECRET = "0253-integration-session-secret-0123456789";

RUN("tenure XP grant over real Postgres (integration)", () => {
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
      { tenureGrant: profiles },
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
  ): Promise<{ token: string; tenure: string; playerId: string }> {
    const res = await request(app)
      .post("/v1/login")
      .send({ platform: "yandex_games", platformUserId });
    expect(res.status).toBe(200);
    const token: string = res.body.session.token;
    const verified = verifySessionToken(SECRET, token);
    if (verified.status !== "ok") {
      throw new Error(`token did not verify: ${verified.status}`);
    }
    return {
      token,
      tenure: res.body.grantChecks.tenure,
      playerId: verified.claims.pid,
    };
  }

  const claim = (token: string, evidence: TenureEvidence) =>
    request(app)
      .post("/v1/profile/tenure-grant")
      .set("Authorization", `Bearer ${token}`)
      .send({ evidence });

  async function xpOf(playerId: string): Promise<number> {
    const res = await pool.query("SELECT xp FROM players WHERE id = $1", [
      playerId,
    ]);
    return Number(res.rows[0].xp);
  }

  async function grantRows(playerId: string) {
    const res = await pool.query(
      `SELECT kind, xp_awarded, evidence FROM player_xp_grants
       WHERE player_id = $1`,
      [playerId],
    );
    return res.rows;
  }

  test("login → claim 10 days → +10 XP, one 10-XP row, and the next login says done", async () => {
    const first = await login("zz0253-ten");
    expect(first.tenure).toBe("pending");

    const res = await claim(first.token, { daysPlayed: 10, gameRecordDays: 4 });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "granted", xpAwarded: 10, xp: 10 });
    expect(await xpOf(first.playerId)).toBe(10);
    expect(await grantRows(first.playerId)).toEqual([
      {
        kind: "tenure",
        xp_awarded: 10,
        evidence: { daysPlayed: 10, gameRecordDays: 4 },
      },
    ]);

    const again = await login("zz0253-ten");
    expect(again.tenure).toBe("done");
  });

  test("a second claim is a duplicate and adds nothing", async () => {
    const { token, playerId } = await login("zz0253-dup");
    await claim(token, { daysPlayed: 10, gameRecordDays: 0 }).expect(200);

    const second = await claim(token, { daysPlayed: 40, gameRecordDays: 40 });
    expect(second.status).toBe(200);
    expect(second.body).toEqual({ status: "duplicate", xpAwarded: 10, xp: 10 });
    expect(await xpOf(playerId)).toBe(10);
    expect(await grantRows(playerId)).toHaveLength(1);
  });

  test("2 days → a final 0-XP row, xp unchanged, next login done", async () => {
    const { token, playerId } = await login("zz0253-short");
    const res = await claim(token, { daysPlayed: 2, gameRecordDays: 1 });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "below_minimum", xpAwarded: 0, xp: 0 });
    expect(await xpOf(playerId)).toBe(0);
    expect(await grantRows(playerId)).toEqual([
      {
        kind: "tenure",
        xp_awarded: 0,
        evidence: { daysPlayed: 2, gameRecordDays: 1 },
      },
    ]);
    expect((await login("zz0253-short")).tenure).toBe("done");

    // Final: a later claim with a big count changes nothing.
    const later = await claim(token, { daysPlayed: 90, gameRecordDays: 0 });
    expect(later.body).toEqual({ status: "duplicate", xpAwarded: 0, xp: 0 });
    expect(await xpOf(playerId)).toBe(0);
  });

  test("forged counts are capped at 50", async () => {
    const { token, playerId } = await login("zz0253-forged");
    const res = await claim(token, {
      daysPlayed: 100_000,
      gameRecordDays: 100_000,
    });
    expect(res.body).toEqual({ status: "granted", xpAwarded: 50, xp: 50 });
    expect(await xpOf(playerId)).toBe(50);
  });

  test("xp = Σ match credits + the grant", async () => {
    const { token, playerId } = await login("zz0253-sum");
    await profiles.creditMatchXp("game-1", playerId, 1);
    await profiles.creditMatchXp("game-2", playerId, 1);
    await claim(token, { daysPlayed: 9, gameRecordDays: 4 }).expect(200);
    await profiles.creditMatchXp("game-3", playerId, 1);

    const sums = await pool.query(
      `SELECT
         (SELECT coalesce(sum(xp_awarded), 0) FROM player_match_xp_credits
            WHERE player_id = $1)::int AS credits,
         (SELECT coalesce(sum(xp_awarded), 0) FROM player_xp_grants
            WHERE player_id = $1)::int AS grants`,
      [playerId],
    );
    expect(sums.rows[0]).toEqual({ credits: 3, grants: 9 });
    expect(await xpOf(playerId)).toBe(12);
  });

  test("60 credited + a 50 grant → earned citizenship flips and the inbox message exists", async () => {
    const { token, playerId } = await login("zz0253-citizen");
    for (let i = 0; i < 6; i++) {
      await profiles.creditMatchXp(`game-c-${i}`, playerId, 10);
    }
    expect(await xpOf(playerId)).toBe(60);

    const res = await claim(token, { daysPlayed: 80, gameRecordDays: 0 });
    expect(res.body).toEqual({ status: "granted", xpAwarded: 50, xp: 110 });

    const row = await pool.query(
      "SELECT is_citizen, citizenship_earned_at FROM players WHERE id = $1",
      [playerId],
    );
    expect(row.rows[0].is_citizen).toBe(true);
    expect(row.rows[0].citizenship_earned_at).not.toBeNull();

    // The inbox send runs AFTER commit and is not awaited — poll briefly.
    const deadline = Date.now() + 4_000;
    let count = 0;
    while (Date.now() < deadline) {
      const messages = await pool.query(
        `SELECT count(*)::int AS n FROM player_messages
         WHERE player_id = $1 AND template_key = 'citizenship_earned'`,
        [playerId],
      );
      count = Number(messages.rows[0].n);
      if (count > 0) break;
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
    expect(count).toBe(1);
  });

  test("two concurrent claims → exactly one row and the XP added once", async () => {
    // Repeated so a lucky serial interleaving is unlikely to pass alone.
    for (let i = 0; i < 5; i++) {
      const { token, playerId } = await login(`zz0253-race-${i}`);
      const [a, b] = await Promise.all([
        claim(token, { daysPlayed: 20, gameRecordDays: 0 }),
        claim(token, { daysPlayed: 20, gameRecordDays: 0 }),
      ]);
      expect([a.status, b.status]).toEqual([200, 200]);
      expect([a.body.status, b.body.status].sort()).toEqual([
        "duplicate",
        "granted",
      ]);
      expect(await xpOf(playerId)).toBe(20);
      expect(await grantRows(playerId)).toHaveLength(1);
    }
  });

  test("a Bearer token for a deleted player → 404, nothing written", async () => {
    const { token, playerId } = await login("zz0253-erased");
    await pool.query("DELETE FROM players WHERE id = $1", [playerId]);
    const res = await claim(token, { daysPlayed: 10, gameRecordDays: 0 });
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "not_found" });
    const rows = await pool.query(
      "SELECT count(*)::int AS n FROM player_xp_grants",
    );
    expect(rows.rows[0].n).toBe(0);
  });
});
