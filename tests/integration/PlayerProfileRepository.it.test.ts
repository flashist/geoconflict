// Integration tests for PlayerProfileRepository against a REAL Postgres.
// Gated by RUN_DB_TESTS so the default `npm test` (no DB) skips them entirely.
// The schema is built once per run by globalSetup.ts (reset + real runner); this
// suite only truncates. Keyed by the internal player id since task 0270.

import { Pool } from "pg";
import { PlayerProfileRepository } from "../../src/profile-server/PlayerProfileRepository";
import { createYandexPlayer, truncateProfileTables } from "./support/db";

const RUN = process.env.RUN_DB_TESTS ? describe : describe.skip;

/**
 * Poll pg_stat_activity until `expected` sessions are lock-waiting inside
 * CREDIT_SQL (identified by the ledger table name in the query text; the poller
 * itself never matches — it is not in a Lock wait). Throws on timeout so the
 * held-lock barrier test fails loudly instead of passing without contention.
 */
async function waitForBlockedCreditStatements(
  pool: Pool,
  expected: number,
): Promise<void> {
  const deadline = Date.now() + 4_000;
  for (;;) {
    const res = await pool.query(
      `SELECT count(*)::int AS n
       FROM pg_stat_activity
       WHERE state = 'active'
         AND wait_event_type = 'Lock'
         AND query LIKE '%player_match_xp_credits%'`,
    );
    const blocked = Number(res.rows[0].n);
    if (blocked >= expected) return;
    if (Date.now() > deadline) {
      throw new Error(
        `held-lock barrier: only ${blocked}/${expected} credit statements ` +
          `blocked on the profile row lock within 4s`,
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
}

RUN("PlayerProfileRepository (integration)", () => {
  let pool: Pool;
  let repo: PlayerProfileRepository;
  // The internal player id, created per test through the identity repository.
  let P: string;
  // A syntactically valid player id that no players row carries.
  const GHOST = "00000000-0000-4000-8000-00000000dead";

  beforeAll(() => {
    pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
    repo = new PlayerProfileRepository(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    await truncateProfileTables(pool);
    P = await createYandexPlayer(pool, "yandex-int-1");
  });

  test("ping resolves against a live connection", async () => {
    await expect(repo.ping()).resolves.toBeUndefined();
  });

  test("a freshly created player reads back at xp 0 with no citizenship and no identity fields", async () => {
    const profile = await repo.getProfile(P);
    expect(profile).not.toBeNull();
    expect(profile?.xp).toBe(0);
    expect(profile?.is_citizen).toBe(false);
    expect(profile?.is_paid_citizen).toBe(false);
    expect(profile).not.toHaveProperty("id");
    expect(profile).not.toHaveProperty("yandex_player_id");
  });

  test("getProfile returns null when no row exists", async () => {
    expect(await repo.getProfile(GHOST)).toBeNull();
  });

  test("creditMatchXp is idempotent on (game_id, player_id)", async () => {
    expect(await repo.creditMatchXp("g1", P, 10)).toEqual({
      status: "credited",
      citizenshipNewlyGranted: false,
    });
    expect(await repo.creditMatchXp("g1", P, 10)).toEqual({
      status: "duplicate",
      citizenshipNewlyGranted: false,
    });

    const profile = await repo.getProfile(P);
    expect(profile?.xp).toBe(10); // credited once, not 20

    // Exactly one ledger row.
    const ledger = await pool.query(
      "SELECT count(*)::int AS n FROM player_match_xp_credits WHERE player_id = $1",
      [P],
    );
    expect(ledger.rows[0].n).toBe(1);
  });

  test("creditMatchXp on a missing profile reports no_profile and writes nothing", async () => {
    expect(await repo.creditMatchXp("g1", GHOST, 10)).toEqual({
      status: "no_profile",
      citizenshipNewlyGranted: false,
    });

    const ledger = await pool.query(
      "SELECT count(*)::int AS n FROM player_match_xp_credits",
    );
    expect(ledger.rows[0].n).toBe(0);
    expect(await repo.getProfile(GHOST)).toBeNull();
  });

  test("citizenship flips at the threshold, earned_at is stamped once, and only the crossing credit reports newly granted", async () => {
    // ⛔ The literals below are the LIVE economy, deliberately spelled out rather
    // than read from CITIZENSHIP_XP_THRESHOLD / XP_PER_MATCH: a test that imports
    // the constant it is pinning cannot catch a wrong constant. They are threshold
    // 100 / award 1 (ADR-111's ÷10 rescale). ⚠️ This suite runs only under
    // `npm run test:integration`, so `npm test` CANNOT catch this drift — any
    // further move of those constants must update these numbers by hand.

    expect(await repo.creditMatchXp("g1", P, 99)).toEqual({
      status: "credited",
      citizenshipNewlyGranted: false, // below threshold
    });
    let profile = await repo.getProfile(P);
    expect(profile?.xp).toBe(99);
    expect(profile?.is_citizen).toBe(false);
    expect(profile?.citizenship_earned_at).toBeNull();

    expect(await repo.creditMatchXp("g2", P, 1)).toEqual({
      status: "credited",
      citizenshipNewlyGranted: true, // crosses 100
    });
    profile = await repo.getProfile(P);
    expect(profile?.xp).toBe(100);
    expect(profile?.is_citizen).toBe(true);
    const earnedAt = profile?.citizenship_earned_at;
    expect(earnedAt).not.toBeNull();
    // Paid state is never touched by crediting.
    expect(profile?.is_paid_citizen).toBe(false);
    expect(profile?.citizenship_purchased_at).toBeNull();

    expect(await repo.creditMatchXp("g3", P, 1)).toEqual({
      status: "credited",
      citizenshipNewlyGranted: false, // already a citizen
    });
    profile = await repo.getProfile(P);
    expect(profile?.xp).toBe(101);
    expect(profile?.is_citizen).toBe(true);
    expect(profile?.citizenship_earned_at).toBe(earnedAt); // not overwritten

    // Re-crediting the crossing game is a duplicate, never a second grant.
    expect(await repo.creditMatchXp("g2", P, 1)).toEqual({
      status: "duplicate",
      citizenshipNewlyGranted: false,
    });
  });

  test("a single large award flips citizenship in one shot", async () => {
    expect(await repo.creditMatchXp("g1", P, 1500)).toEqual({
      status: "credited",
      citizenshipNewlyGranted: true,
    });
    const profile = await repo.getProfile(P);
    expect(profile?.is_citizen).toBe(true);
    expect(profile?.citizenship_earned_at).not.toBeNull();
  });

  test("a paid citizen crossing the threshold stamps earned_at but is NOT newly granted", async () => {
    // Owner-ruled 2026-08-23: keep the pre-0017 stamp-on-crossing behavior for
    // paid citizens; the newly-granted flag (and thus the future inbox message)
    // stays suppressed because is_citizen was already true.
    await pool.query(
      `UPDATE players
       SET is_citizen = true, is_paid_citizen = true,
           citizenship_purchased_at = now()
       WHERE id = $1`,
      [P],
    );

    expect(await repo.creditMatchXp("g1", P, 1500)).toEqual({
      status: "credited",
      citizenshipNewlyGranted: false,
    });
    const profile = await repo.getProfile(P);
    expect(profile?.is_citizen).toBe(true);
    expect(profile?.is_paid_citizen).toBe(true);
    expect(profile?.citizenship_earned_at).not.toBeNull(); // still stamped
  });

  test("a manually seeded row already past the threshold is granted (and reported) on its next credit", async () => {
    // E.g. an operator seeding xp directly (the brief's own verification seeds
    // 990; seeding ≥1000 must not strand the row citizen-less forever).
    await pool.query("UPDATE players SET xp = 1500 WHERE id = $1", [P]);

    expect(await repo.creditMatchXp("g1", P, 10)).toEqual({
      status: "credited",
      citizenshipNewlyGranted: true,
    });
    const profile = await repo.getProfile(P);
    expect(profile?.xp).toBe(1510);
    expect(profile?.is_citizen).toBe(true);
    expect(profile?.citizenship_earned_at).not.toBeNull();
  });

  test("concurrent identical credits apply exactly once", async () => {
    const [a, b] = await Promise.all([
      repo.creditMatchXp("g1", P, 10),
      repo.creditMatchXp("g1", P, 10),
    ]);
    expect([a.status, b.status].sort()).toEqual(["credited", "duplicate"]);
    expect(a.citizenshipNewlyGranted).toBe(false);
    expect(b.citizenshipNewlyGranted).toBe(false);

    const profile = await repo.getProfile(P);
    expect(profile?.xp).toBe(10);
  });

  test("concurrent credits from two different games grant citizenship exactly once (deterministic held-lock barrier)", async () => {
    // The race the two-statement grant design exists for: both credits land, but
    // only the one whose locked row still shows is_citizen = false may report
    // newly granted — never both (a double inbox message otherwise).
    //
    // A bare Promise.all does NOT force the two transactions to overlap at the
    // row-lock boundary — a serialized schedule passes without exercising the
    // contested path (review R2). So build the reviewer's held-lock barrier: a
    // third session takes the profile row lock, both credits are verified BLOCKED
    // on it (their statements have started, so their READ COMMITTED snapshots
    // predate every later commit), then the barrier releases. Whichever credit
    // commits second is now guaranteed to hit the EvalPlanQual recheck against
    // the winner's committed grant — the exact interleaving that made the
    // rejected snapshot self-join shape double-report newly-granted.
    await pool.query("UPDATE players SET xp = 995 WHERE id = $1", [P]);

    const holder = await pool.connect();
    let credits: Promise<
      Awaited<ReturnType<PlayerProfileRepository["creditMatchXp"]>>[]
    > | null = null;
    try {
      await holder.query("BEGIN");
      await holder.query("SELECT 1 FROM players WHERE id = $1 FOR UPDATE", [P]);

      // Both credits block inside CREDIT_SQL (the ledger INSERT's FK check needs
      // a KEY SHARE on the profile row, which the held FOR UPDATE conflicts with).
      credits = Promise.all([
        repo.creditMatchXp("race-1", P, 10),
        repo.creditMatchXp("race-2", P, 10),
      ]);

      // Barrier assertion: the test FAILS here (never passes vacuously) unless
      // both credit statements are genuinely lock-blocked at the same time.
      await waitForBlockedCreditStatements(pool, 2);

      await holder.query("COMMIT"); // release — both race through the contested path
    } catch (error) {
      await holder.query("ROLLBACK").catch(() => {});
      // Let any in-flight credits settle so nothing dangles past the test.
      await credits?.then(
        () => undefined,
        () => undefined,
      );
      throw error;
    } finally {
      holder.release();
    }

    const [a, b] = await credits;
    expect(a.status).toBe("credited");
    expect(b.status).toBe("credited");
    expect([a, b].filter((o) => o.citizenshipNewlyGranted)).toHaveLength(1);

    const profile = await repo.getProfile(P);
    expect(profile?.xp).toBe(1015);
    expect(profile?.is_citizen).toBe(true);
    expect(profile?.citizenship_earned_at).not.toBeNull();
  });

  test("xp reads back as a number, not a bigint string", async () => {
    await repo.creditMatchXp("g1", P, 10);
    const profile = await repo.getProfile(P);
    expect(typeof profile?.xp).toBe("number");
    expect(profile?.xp).toBe(10);
  });
});
