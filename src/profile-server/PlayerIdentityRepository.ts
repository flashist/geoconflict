// Data layer for platform identities (task 0270, ADR-113). The ONLY component that
// turns a platform login (today: a Yandex Games id) into the internal player id
// every other repository is keyed by.
//
// Two operations, and the difference matters:
//   * findPlayerByIdentity  — find-only. Never writes. Every player-facing route
//     resolves its caller through this, so a request can never create a player.
//   * resolveOrCreatePlayer — find-or-create. Only the internal (service-auth'd)
//     upsert route calls it in S1; `/v1/login` and `/internal/v1/players/resolve`
//     take it over in S2/S3.
//
// Design: ai-agents/knowledge-base/reports/2026-09-15-profile-identity-design.md §4.
// ⛔ Never log a platform user id or a player id from here.

import type { Pool, PoolClient } from "pg";
import type { PlayerProfile } from "../core/profile/PlayerProfile";
import { rowToProfile } from "./PlayerProfileRepository";

/**
 * Platform spellings. Local to the server in S1 — no client sends a platform
 * until S2, whose `LoginContract` can take these over. Must match the
 * `player_identities.platform` CHECK in migrations/006.
 */
export const PLATFORM_YANDEX_GAMES = "yandex_games";
export type Platform = typeof PLATFORM_YANDEX_GAMES;

/** Who asked for the find-or-create. Unused until S5's metrics attribute it. */
export type ResolveSource = "login" | "game_server";

export interface ResolvedPlayer {
  playerId: string;
  created: boolean;
  profile: PlayerProfile;
}

// Postgres `unique_violation`, narrowed by constraint name: only a UUID collision
// on the players primary key is retryable. Anything else is a real error.
const PG_UNIQUE_VIOLATION = "23505";
const PLAYERS_PKEY = "players_pkey";

/** Find-or-create gives up after this many attempts (then the route answers 500). */
export const MAX_RESOLVE_ATTEMPTS = 3;

const FIND_IDENTITY_SQL = `
SELECT player_id FROM player_identities
WHERE platform = $1 AND platform_user_id = $2
`;

// Identity + profile in one read. The join also means an identity whose player
// was erased in between reads as a miss, not as a dangling id.
const FIND_PLAYER_SQL = `
SELECT p.* FROM player_identities i
JOIN players p ON p.id = i.player_id
WHERE i.platform = $1 AND i.platform_user_id = $2
`;

// Touch last_login_at on BOTH the identity and the player, but only when it is
// older than an hour — the condition is in the SQL, so a hit inside the hour
// writes nothing. Both updates run: a data-modifying CTE executes whether or not
// the outer statement references it.
const TOUCH_LOGIN_SQL = `
WITH identity_touch AS (
  UPDATE player_identities
  SET last_login_at = now()
  WHERE platform = $1 AND platform_user_id = $2
    AND last_login_at < now() - interval '1 hour'
  RETURNING 1
)
UPDATE players
SET last_login_at = now()
WHERE id = $3
  AND last_login_at < now() - interval '1 hour'
`;

const INSERT_PLAYER_SQL = `
INSERT INTO players DEFAULT VALUES RETURNING *
`;

const INSERT_IDENTITY_SQL = `
INSERT INTO player_identities (platform, platform_user_id, player_id)
VALUES ($1, $2, $3)
ON CONFLICT (platform, platform_user_id) DO NOTHING
RETURNING player_id
`;

function isRetryablePlayerIdCollision(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: string }).code === PG_UNIQUE_VIOLATION &&
    (error as { constraint?: string }).constraint === PLAYERS_PKEY
  );
}

type CreateAttempt =
  | { status: "created"; player: ResolvedPlayer }
  | { status: "lost_race" }
  | { status: "id_collision" };

export class PlayerIdentityRepository {
  constructor(private readonly pool: Pool) {}

  /** The internal player id for this login, or null. Never writes. */
  async findPlayerByIdentity(
    platform: Platform,
    platformUserId: string,
  ): Promise<string | null> {
    const res = await this.pool.query(FIND_IDENTITY_SQL, [
      platform,
      platformUserId,
    ]);
    return res.rows.length > 0 ? String(res.rows[0].player_id) : null;
  }

  /**
   * Find the player for this login, creating player + identity when there is
   * none. Deliberately NOT a single CTE: a CTE that inserts the player and then
   * loses the identity race would commit an orphan player.
   *
   * Per attempt (at most MAX_RESOLVE_ATTEMPTS):
   *  1. Look the identity up. Hit → touch last_login_at (if > 1 h old) → return.
   *  2. Miss → one transaction: insert a player, insert the identity with
   *     ON CONFLICT DO NOTHING.
   *     - identity row returned → COMMIT → created.
   *     - no row (another tab/device won) → ROLLBACK, so no orphan → retry at 1.
   *     - 23505 on players_pkey (UUID collision) → ROLLBACK → retry.
   *     - anything else → ROLLBACK and rethrow.
   */
  async resolveOrCreatePlayer(
    platform: Platform,
    platformUserId: string,
    source: ResolveSource,
  ): Promise<ResolvedPlayer> {
    void source; // S5 metrics attribute creations by source.
    for (let attempt = 1; attempt <= MAX_RESOLVE_ATTEMPTS; attempt++) {
      const existing = await this.findExisting(platform, platformUserId);
      if (existing !== null) {
        return existing;
      }
      const outcome = await this.tryCreate(platform, platformUserId);
      if (outcome.status === "created") {
        return outcome.player;
      }
      // lost_race / id_collision: the transaction was rolled back — go again.
    }
    // No ids in the message: it reaches logs through the route's error line.
    throw new Error(
      `resolveOrCreatePlayer: gave up after ${MAX_RESOLVE_ATTEMPTS} attempts`,
    );
  }

  private async findExisting(
    platform: Platform,
    platformUserId: string,
  ): Promise<ResolvedPlayer | null> {
    const res = await this.pool.query(FIND_PLAYER_SQL, [
      platform,
      platformUserId,
    ]);
    if (res.rows.length === 0) {
      return null;
    }
    const row = res.rows[0];
    const playerId = String(row.id);
    await this.pool.query(TOUCH_LOGIN_SQL, [
      platform,
      platformUserId,
      playerId,
    ]);
    return { playerId, created: false, profile: rowToProfile(row) };
  }

  private async tryCreate(
    platform: Platform,
    platformUserId: string,
  ): Promise<CreateAttempt> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const player = await client.query(INSERT_PLAYER_SQL);
      const row = player.rows[0];
      const playerId = String(row.id);
      const identity = await client.query(INSERT_IDENTITY_SQL, [
        platform,
        platformUserId,
        playerId,
      ]);
      if (identity.rows.length === 0) {
        // A parallel request committed this identity first. Roll back OUR player
        // so it never exists without an identity, then re-read theirs.
        await client.query("ROLLBACK");
        return { status: "lost_race" };
      }
      await client.query("COMMIT");
      return {
        status: "created",
        player: { playerId, created: true, profile: rowToProfile(row) },
      };
    } catch (error) {
      await rollbackQuietly(client);
      if (isRetryablePlayerIdCollision(error)) {
        return { status: "id_collision" };
      }
      throw error;
    } finally {
      client.release();
    }
  }
}

async function rollbackQuietly(client: PoolClient): Promise<void> {
  try {
    await client.query("ROLLBACK");
  } catch {
    // ROLLBACK failed (connection gone) — surface the ORIGINAL error instead.
  }
}
