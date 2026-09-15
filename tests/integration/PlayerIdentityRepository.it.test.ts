// Integration tests for PlayerIdentityRepository (task 0270) against a REAL
// Postgres. This is where find-or-create's concurrency claims are PROVEN: exactly
// one player per identity and zero orphan players under a forced lost race and
// under a parallel stress, plus the UUID-collision retry path.
//
// Races are forced with a lock barrier observed through pg_stat_activity (the
// held-lock pattern PlayerProfileRepository.it.test.ts uses), never with sleeps.

import { Pool, type PoolClient } from "pg";
import {
  MAX_RESOLVE_ATTEMPTS,
  PLATFORM_YANDEX_GAMES,
  PlayerIdentityRepository,
} from "../../src/profile-server/PlayerIdentityRepository";
import { countOrphanPlayers, truncateProfileTables } from "./support/db";

const RUN = process.env.RUN_DB_TESTS ? describe : describe.skip;

/** Poll until `expected` sessions are lock-waiting on an identity insert. */
async function waitForBlockedIdentityInserts(
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
         AND query LIKE '%INSERT INTO player_identities%'`,
    );
    const blocked = Number(res.rows[0].n);
    if (blocked >= expected) return;
    if (Date.now() > deadline) {
      throw new Error(
        `lost-race barrier: only ${blocked}/${expected} identity inserts ` +
          `blocked on the uncommitted identity within 4s`,
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
}

async function countPlayers(pool: Pool): Promise<number> {
  const res = await pool.query("SELECT count(*)::int AS n FROM players");
  return Number(res.rows[0].n);
}

RUN("PlayerIdentityRepository (integration)", () => {
  let pool: Pool;
  let repo: PlayerIdentityRepository;
  const Y = "yandex-identity-1";

  beforeAll(() => {
    pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
    repo = new PlayerIdentityRepository(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    await truncateProfileTables(pool);
  });

  test("a miss creates exactly one player + identity; a second call finds it", async () => {
    const first = await repo.resolveOrCreatePlayer(
      PLATFORM_YANDEX_GAMES,
      Y,
      "game_server",
    );
    expect(first.created).toBe(true);
    expect(first.profile.xp).toBe(0);
    expect(first.profile).not.toHaveProperty("id");

    const second = await repo.resolveOrCreatePlayer(
      PLATFORM_YANDEX_GAMES,
      Y,
      "login",
    );
    expect(second).toMatchObject({ playerId: first.playerId, created: false });
    expect(await countPlayers(pool)).toBe(1);
    expect(await countOrphanPlayers(pool)).toBe(0);
  });

  test("findPlayerByIdentity never creates", async () => {
    await expect(
      repo.findPlayerByIdentity(PLATFORM_YANDEX_GAMES, "nobody"),
    ).resolves.toBeNull();
    expect(await countPlayers(pool)).toBe(0);

    const created = await repo.resolveOrCreatePlayer(
      PLATFORM_YANDEX_GAMES,
      Y,
      "game_server",
    );
    await expect(
      repo.findPlayerByIdentity(PLATFORM_YANDEX_GAMES, Y),
    ).resolves.toBe(created.playerId);
    expect(await countPlayers(pool)).toBe(1);
  });

  test("forced lost race: the loser rolls back its player and returns the winner's — 1 player, 0 orphans", async () => {
    const blocker: PoolClient = await pool.connect();
    let pending: ReturnType<
      PlayerIdentityRepository["resolveOrCreatePlayer"]
    > | null = null;
    let winnerId: string;
    try {
      // The "other tab": player + identity inserted, NOT committed.
      await blocker.query("BEGIN");
      const player = await blocker.query(
        "INSERT INTO players DEFAULT VALUES RETURNING id",
      );
      winnerId = String(player.rows[0].id);
      await blocker.query(
        `INSERT INTO player_identities (platform, platform_user_id, player_id)
         VALUES ($1, $2, $3)`,
        [PLATFORM_YANDEX_GAMES, Y, winnerId],
      );

      // Our call misses (the identity is invisible until commit), inserts its own
      // player, then BLOCKS on the identity's unique key.
      pending = repo.resolveOrCreatePlayer(PLATFORM_YANDEX_GAMES, Y, "login");
      // Barrier: fails loudly unless the contested path is genuinely reached.
      await waitForBlockedIdentityInserts(pool, 1);

      await blocker.query("COMMIT"); // ON CONFLICT now resolves as "no row"
    } catch (error) {
      await blocker.query("ROLLBACK").catch(() => {});
      await pending?.then(
        () => undefined,
        () => undefined,
      );
      throw error;
    } finally {
      blocker.release();
    }

    const resolved = await pending;
    expect(resolved.playerId).toBe(winnerId);
    expect(resolved.created).toBe(false);
    expect(await countPlayers(pool)).toBe(1);
    expect(await countOrphanPlayers(pool)).toBe(0);
  });

  test("stress: 20 parallel calls for one identity → exactly 1 player, 0 orphans", async () => {
    const results = await Promise.all(
      Array.from({ length: 20 }, () =>
        repo.resolveOrCreatePlayer(PLATFORM_YANDEX_GAMES, Y, "login"),
      ),
    );
    const ids = new Set(results.map((result) => result.playerId));
    expect(ids.size).toBe(1);
    expect(results.filter((result) => result.created)).toHaveLength(1);
    expect(await countPlayers(pool)).toBe(1);
    expect(await countOrphanPlayers(pool)).toBe(0);
  });

  describe("UUID primary-key collision (forced)", () => {
    const FIXED_ID = "00000000-0000-4000-8000-000000000001";

    /**
     * Point players.id's default at a test function that returns FIXED_ID for the
     * first `collisions` calls, then a real random uuid. Driven by a sequence,
     * which a ROLLBACK does not reset, so each retry sees the next value.
     */
    async function forceCollisions(collisions: number): Promise<void> {
      await pool.query("DROP SEQUENCE IF EXISTS it_player_id_calls");
      await pool.query("CREATE SEQUENCE it_player_id_calls");
      await pool.query(
        `CREATE OR REPLACE FUNCTION it_colliding_player_id() RETURNS uuid
         LANGUAGE sql VOLATILE AS $$
           SELECT CASE WHEN nextval('it_player_id_calls') <= ${collisions}
                       THEN '${FIXED_ID}'::uuid
                       ELSE gen_random_uuid() END
         $$`,
      );
      await pool.query(
        "ALTER TABLE players ALTER COLUMN id SET DEFAULT it_colliding_player_id()",
      );
    }

    async function restoreDefault(): Promise<void> {
      await pool.query(
        "ALTER TABLE players ALTER COLUMN id SET DEFAULT gen_random_uuid()",
      );
      await pool.query("DROP FUNCTION IF EXISTS it_colliding_player_id()");
      await pool.query("DROP SEQUENCE IF EXISTS it_player_id_calls");
    }

    beforeEach(async () => {
      // An existing player already owns FIXED_ID.
      await pool.query("INSERT INTO players (id) VALUES ($1)", [FIXED_ID]);
      await pool.query(
        `INSERT INTO player_identities (platform, platform_user_id, player_id)
         VALUES ($1, 'someone-else', $2)`,
        [PLATFORM_YANDEX_GAMES, FIXED_ID],
      );
    });

    test("one collision: rolls back, retries with a new id, and succeeds", async () => {
      await forceCollisions(1);
      try {
        const resolved = await repo.resolveOrCreatePlayer(
          PLATFORM_YANDEX_GAMES,
          Y,
          "login",
        );
        expect(resolved.created).toBe(true);
        expect(resolved.playerId).not.toBe(FIXED_ID);
        const calls = await pool.query(
          "SELECT last_value::int AS n FROM it_player_id_calls",
        );
        expect(calls.rows[0].n).toBe(2); // attempt 1 collided, attempt 2 won
      } finally {
        await restoreDefault();
      }
      expect(await countPlayers(pool)).toBe(2);
      expect(await countOrphanPlayers(pool)).toBe(0);
    });

    test(`every attempt collides: throws after ${MAX_RESOLVE_ATTEMPTS} and writes nothing`, async () => {
      await forceCollisions(1_000);
      try {
        await expect(
          repo.resolveOrCreatePlayer(PLATFORM_YANDEX_GAMES, Y, "login"),
        ).rejects.toThrow(`gave up after ${MAX_RESOLVE_ATTEMPTS} attempts`);
        const calls = await pool.query(
          "SELECT last_value::int AS n FROM it_player_id_calls",
        );
        expect(calls.rows[0].n).toBe(MAX_RESOLVE_ATTEMPTS);
      } finally {
        await restoreDefault();
      }
      expect(await countPlayers(pool)).toBe(1); // only the pre-existing one
      await expect(
        repo.findPlayerByIdentity(PLATFORM_YANDEX_GAMES, Y),
      ).resolves.toBeNull();
    });
  });

  describe("hit path touches last_login_at at most hourly", () => {
    async function loginTimes(playerId: string) {
      const res = await pool.query(
        `SELECT p.last_login_at AS player_at, i.last_login_at AS identity_at
         FROM players p JOIN player_identities i ON i.player_id = p.id
         WHERE p.id = $1`,
        [playerId],
      );
      return res.rows[0] as { player_at: Date; identity_at: Date };
    }

    test("under an hour old: untouched", async () => {
      const { playerId } = await repo.resolveOrCreatePlayer(
        PLATFORM_YANDEX_GAMES,
        Y,
        "login",
      );
      const stamp = new Date(Date.now() - 30 * 60_000);
      await pool.query("UPDATE players SET last_login_at = $1 WHERE id = $2", [
        stamp,
        playerId,
      ]);
      await pool.query(
        "UPDATE player_identities SET last_login_at = $1 WHERE player_id = $2",
        [stamp, playerId],
      );

      await repo.resolveOrCreatePlayer(PLATFORM_YANDEX_GAMES, Y, "login");
      const after = await loginTimes(playerId);
      expect(after.player_at.getTime()).toBe(stamp.getTime());
      expect(after.identity_at.getTime()).toBe(stamp.getTime());
    });

    test("older than an hour: both the identity and the player are touched", async () => {
      const { playerId } = await repo.resolveOrCreatePlayer(
        PLATFORM_YANDEX_GAMES,
        Y,
        "login",
      );
      const stamp = new Date(Date.now() - 2 * 60 * 60_000);
      await pool.query("UPDATE players SET last_login_at = $1 WHERE id = $2", [
        stamp,
        playerId,
      ]);
      await pool.query(
        "UPDATE player_identities SET last_login_at = $1 WHERE player_id = $2",
        [stamp, playerId],
      );

      await repo.resolveOrCreatePlayer(PLATFORM_YANDEX_GAMES, Y, "login");
      const after = await loginTimes(playerId);
      expect(after.player_at.getTime()).toBeGreaterThan(stamp.getTime());
      expect(after.identity_at.getTime()).toBeGreaterThan(stamp.getTime());
    });

    test("findPlayerByIdentity never touches last_login_at", async () => {
      const { playerId } = await repo.resolveOrCreatePlayer(
        PLATFORM_YANDEX_GAMES,
        Y,
        "login",
      );
      const stamp = new Date(Date.now() - 2 * 60 * 60_000);
      await pool.query(
        "UPDATE player_identities SET last_login_at = $1 WHERE player_id = $2",
        [stamp, playerId],
      );
      await repo.findPlayerByIdentity(PLATFORM_YANDEX_GAMES, Y);
      const after = await loginTimes(playerId);
      expect(after.identity_at.getTime()).toBe(stamp.getTime());
    });
  });
});
