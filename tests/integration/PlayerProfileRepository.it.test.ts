// Integration tests for PlayerProfileRepository against a REAL Postgres.
// Gated by RUN_DB_TESTS so the default `npm test` (no DB) skips them entirely.
// See jest.integration.config.ts for how to run.

import { readFileSync } from "fs";
import { join } from "path";
import { Pool } from "pg";
import { PlayerProfileRepository } from "../../src/profile-server/PlayerProfileRepository";

const RUN = process.env.RUN_DB_TESTS ? describe : describe.skip;

RUN("PlayerProfileRepository (integration)", () => {
  let pool: Pool;
  let repo: PlayerProfileRepository;

  const P = "yandex-int-1";
  const PID = "11111111-1111-1111-1111-111111111111";

  beforeAll(async () => {
    pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
    // Apply the migration directly (idempotent IF NOT EXISTS statements). cwd is the
    // repo root under `npm run test:integration`.
    const sql = readFileSync(
      join(process.cwd(), "migrations/001_player_profiles.sql"),
      "utf8",
    );
    await pool.query(sql);
    repo = new PlayerProfileRepository(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    await pool.query(
      `TRUNCATE player_match_xp_credits, player_name_history,
               player_cosmetic_ownership, player_profiles RESTART IDENTITY CASCADE`,
    );
  });

  test("ping resolves against a live connection", async () => {
    await expect(repo.ping()).resolves.toBeUndefined();
  });

  test("upsertProfile creates a fresh profile at xp 0", async () => {
    const profile = await repo.upsertProfile(P, PID);
    expect(profile.xp).toBe(0);
    expect(profile.is_citizen).toBe(false);
    expect(profile.is_paid_citizen).toBe(false);
    expect(profile.yandex_player_id).toBe(P);
    expect(profile.persistent_id).toBe(PID);

    const read = await repo.getProfile(P);
    expect(read).not.toBeNull();
    expect(read?.xp).toBe(0);
  });

  test("getProfile returns null when no row exists", async () => {
    expect(await repo.getProfile("nobody")).toBeNull();
  });

  test("upsertProfile relinks persistent_id when it changes, no-ops when same", async () => {
    await repo.upsertProfile(P, PID);
    const newPid = "22222222-2222-2222-2222-222222222222";

    const relinked = await repo.upsertProfile(P, newPid);
    expect(relinked.persistent_id).toBe(newPid);

    // Same persistent_id again: still returns the row (DO UPDATE skipped).
    const same = await repo.upsertProfile(P, newPid);
    expect(same.persistent_id).toBe(newPid);
  });

  test("creditMatchXp is idempotent on (game_id, yandex_player_id)", async () => {
    await repo.upsertProfile(P, PID);

    expect(await repo.creditMatchXp("g1", P, 10)).toBe("credited");
    expect(await repo.creditMatchXp("g1", P, 10)).toBe("duplicate");

    const profile = await repo.getProfile(P);
    expect(profile?.xp).toBe(10); // credited once, not 20

    // Exactly one ledger row.
    const ledger = await pool.query(
      "SELECT count(*)::int AS n FROM player_match_xp_credits WHERE yandex_player_id = $1",
      [P],
    );
    expect(ledger.rows[0].n).toBe(1);
  });

  test("creditMatchXp on a missing profile reports no_profile and writes nothing", async () => {
    expect(await repo.creditMatchXp("g1", "ghost", 10)).toBe("no_profile");

    const ledger = await pool.query(
      "SELECT count(*)::int AS n FROM player_match_xp_credits",
    );
    expect(ledger.rows[0].n).toBe(0);
    expect(await repo.getProfile("ghost")).toBeNull();
  });

  test("citizenship flips at the threshold and earned_at is stamped once", async () => {
    await repo.upsertProfile(P, PID);

    await repo.creditMatchXp("g1", P, 999);
    let profile = await repo.getProfile(P);
    expect(profile?.xp).toBe(999);
    expect(profile?.is_citizen).toBe(false);
    expect(profile?.citizenship_earned_at).toBeNull();

    await repo.creditMatchXp("g2", P, 10); // crosses 1000
    profile = await repo.getProfile(P);
    expect(profile?.xp).toBe(1009);
    expect(profile?.is_citizen).toBe(true);
    const earnedAt = profile?.citizenship_earned_at;
    expect(earnedAt).not.toBeNull();
    // Paid state is never touched by crediting.
    expect(profile?.is_paid_citizen).toBe(false);
    expect(profile?.citizenship_purchased_at).toBeNull();

    await repo.creditMatchXp("g3", P, 10); // already a citizen
    profile = await repo.getProfile(P);
    expect(profile?.xp).toBe(1019);
    expect(profile?.is_citizen).toBe(true);
    expect(profile?.citizenship_earned_at).toBe(earnedAt); // not overwritten
  });

  test("a single large award flips citizenship in one shot", async () => {
    await repo.upsertProfile(P, PID);
    await repo.creditMatchXp("g1", P, 1500);
    const profile = await repo.getProfile(P);
    expect(profile?.is_citizen).toBe(true);
    expect(profile?.citizenship_earned_at).not.toBeNull();
  });

  test("concurrent identical credits apply exactly once", async () => {
    await repo.upsertProfile(P, PID);

    const [a, b] = await Promise.all([
      repo.creditMatchXp("g1", P, 10),
      repo.creditMatchXp("g1", P, 10),
    ]);
    expect([a, b].sort()).toEqual(["credited", "duplicate"]);

    const profile = await repo.getProfile(P);
    expect(profile?.xp).toBe(10);
  });

  test("xp reads back as a number, not a bigint string", async () => {
    await repo.upsertProfile(P, PID);
    await repo.creditMatchXp("g1", P, 10);
    const profile = await repo.getProfile(P);
    expect(typeof profile?.xp).toBe("number");
    expect(profile?.xp).toBe(10);
  });
});
