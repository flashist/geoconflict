// Integration tests for PlayerProfileRepository against a REAL Postgres.
// Gated by RUN_DB_TESTS so the default `npm test` (no DB) skips them entirely.
// See jest.integration.config.ts for how to run.

import { readFileSync } from "fs";
import { join } from "path";
import { Pool } from "pg";
import {
  PersistentIdConflictError,
  PlayerProfileRepository,
} from "../../src/profile-server/PlayerProfileRepository";

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

  test("cross-account persistent_id collision throws PersistentIdConflictError", async () => {
    await repo.upsertProfile(P, PID);

    // Fresh-insert path: a different Yandex account presents the same persistentId.
    await expect(
      repo.upsertProfile("yandex-other", PID),
    ).rejects.toBeInstanceOf(PersistentIdConflictError);

    // Relink path: an existing account tries to adopt a persistentId already
    // owned by a third account.
    const PID3 = "55555555-5555-5555-5555-555555555555";
    await repo.upsertProfile("yandex-3", PID3);
    await expect(repo.upsertProfile(P, PID3)).rejects.toBeInstanceOf(
      PersistentIdConflictError,
    );

    // No partial writes: the original row is intact, no stray rows created.
    const profile = await repo.getProfile(P);
    expect(profile?.persistent_id).toBe(PID);
    expect(await repo.getProfile("yandex-other")).toBeNull();
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
      "SELECT count(*)::int AS n FROM player_match_xp_credits WHERE yandex_player_id = $1",
      [P],
    );
    expect(ledger.rows[0].n).toBe(1);
  });

  test("creditMatchXp on a missing profile reports no_profile and writes nothing", async () => {
    expect(await repo.creditMatchXp("g1", "ghost", 10)).toEqual({
      status: "no_profile",
      citizenshipNewlyGranted: false,
    });

    const ledger = await pool.query(
      "SELECT count(*)::int AS n FROM player_match_xp_credits",
    );
    expect(ledger.rows[0].n).toBe(0);
    expect(await repo.getProfile("ghost")).toBeNull();
  });

  test("citizenship flips at the threshold, earned_at is stamped once, and only the crossing credit reports newly granted", async () => {
    await repo.upsertProfile(P, PID);

    expect(await repo.creditMatchXp("g1", P, 999)).toEqual({
      status: "credited",
      citizenshipNewlyGranted: false, // below threshold
    });
    let profile = await repo.getProfile(P);
    expect(profile?.xp).toBe(999);
    expect(profile?.is_citizen).toBe(false);
    expect(profile?.citizenship_earned_at).toBeNull();

    expect(await repo.creditMatchXp("g2", P, 10)).toEqual({
      status: "credited",
      citizenshipNewlyGranted: true, // crosses 1000
    });
    profile = await repo.getProfile(P);
    expect(profile?.xp).toBe(1009);
    expect(profile?.is_citizen).toBe(true);
    const earnedAt = profile?.citizenship_earned_at;
    expect(earnedAt).not.toBeNull();
    // Paid state is never touched by crediting.
    expect(profile?.is_paid_citizen).toBe(false);
    expect(profile?.citizenship_purchased_at).toBeNull();

    expect(await repo.creditMatchXp("g3", P, 10)).toEqual({
      status: "credited",
      citizenshipNewlyGranted: false, // already a citizen
    });
    profile = await repo.getProfile(P);
    expect(profile?.xp).toBe(1019);
    expect(profile?.is_citizen).toBe(true);
    expect(profile?.citizenship_earned_at).toBe(earnedAt); // not overwritten

    // Re-crediting the crossing game is a duplicate, never a second grant.
    expect(await repo.creditMatchXp("g2", P, 10)).toEqual({
      status: "duplicate",
      citizenshipNewlyGranted: false,
    });
  });

  test("a single large award flips citizenship in one shot", async () => {
    await repo.upsertProfile(P, PID);
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
    await repo.upsertProfile(P, PID);
    await pool.query(
      `UPDATE player_profiles
       SET is_citizen = true, is_paid_citizen = true,
           citizenship_purchased_at = now()
       WHERE yandex_player_id = $1`,
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
    await repo.upsertProfile(P, PID);
    await pool.query(
      "UPDATE player_profiles SET xp = 1500 WHERE yandex_player_id = $1",
      [P],
    );

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
    await repo.upsertProfile(P, PID);

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

  test("concurrent credits from two different games grant citizenship exactly once", async () => {
    // The race the two-statement grant design exists for: both credits land, but
    // only the one whose locked row still shows is_citizen = false may report
    // newly granted — never both (a double inbox message otherwise).
    await repo.upsertProfile(P, PID);
    await pool.query(
      "UPDATE player_profiles SET xp = 995 WHERE yandex_player_id = $1",
      [P],
    );

    const [a, b] = await Promise.all([
      repo.creditMatchXp("race-1", P, 10),
      repo.creditMatchXp("race-2", P, 10),
    ]);
    expect(a.status).toBe("credited");
    expect(b.status).toBe("credited");
    expect(
      [a, b].filter((o) => o.citizenshipNewlyGranted),
    ).toHaveLength(1);

    const profile = await repo.getProfile(P);
    expect(profile?.xp).toBe(1015);
    expect(profile?.is_citizen).toBe(true);
    expect(profile?.citizenship_earned_at).not.toBeNull();
  });

  test("xp reads back as a number, not a bigint string", async () => {
    await repo.upsertProfile(P, PID);
    await repo.creditMatchXp("g1", P, 10);
    const profile = await repo.getProfile(P);
    expect(typeof profile?.xp).toBe("number");
    expect(profile?.xp).toBe(10);
  });
});
