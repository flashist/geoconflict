// Data layer for platform identities (task 0270, ADR-113). The ONLY component that
// turns a platform login (today: a Yandex Games id) into the internal player id
// every other repository is keyed by.
//
// Three operations, and the difference matters:
//   * findPlayerByIdentity  — find-only, id only. Never writes.
//   * resolveExistingPlayer — find-only, id + profile (task 0274). Never INSERTS, and
//     that is the precise claim: it does UPDATE `last_login_at` on the player and the
//     identity (throttled in SQL to once an hour). So the switch-off login path is
//     create-free, NOT write-free — do not read it as read-only.
//     `POST /v1/login` uses this instead of the find-or-create below whenever the
//     login-creation switch is OFF, so the switch cannot be defeated by the route.
//     ⚠️ The refreshed `last_login_at` is load-bearing elsewhere: the junk-cleanup
//     predicate excludes players who came back, so a flood that keeps re-asserting the
//     same ids keeps its own rows out of the cleanup (see the cleanup runbook).
//   * resolveOrCreatePlayer — find-or-create. Only `POST /v1/login` (S2, switch ON)
//     and the internal (service-auth'd) `POST /internal/v1/players/resolve` (S3)
//     call it. The internal one ALWAYS creates — the switch never gates a real match.
//
// Design: ai-agents/knowledge-base/reports/2026-09-15-profile-identity-design.md §4.
// ⛔ Never log a platform user id or a player id from here.

import type { Pool, PoolClient } from "pg";
import type { Platform } from "../core/profile/Platform";
import type { PlayerProfile } from "../core/profile/PlayerProfile";
import { logger } from "./Logger";
import { rowToProfile } from "./PlayerProfileRepository";

const log = logger.child({ comp: "identity" });

/**
 * At most one metric-hook warning per this window (a broken hook throws on every
 * single creation, so an unthrottled warn would be the log flood instead).
 * The budget is per REPOSITORY INSTANCE, not per module: production builds exactly
 * one, so the behaviour is identical there, and it keeps the throttle from leaking
 * between tests — which module-level state does.
 */
const HOOK_WARN_INTERVAL_MS = 600_000;

/**
 * Platform spellings live in src/core/profile/Platform.ts (task 0271), shared with
 * the login contract. Re-exported here so existing server imports keep working.
 * Must match the `player_identities.platform` CHECK in migrations/006.
 */
export type { Platform };
export const PLATFORM_YANDEX_GAMES = "yandex_games" satisfies Platform;

/** Who asked for the find-or-create. S5's metrics attribute creations by it. */
export type ResolveSource = "login" | "game_server";

/**
 * Post-commit hooks (task 0274, S5). `onPlayerCreated` fires ONCE per player that
 * this process actually committed — never for a player that was merely found, a
 * lost identity race (its player row was rolled back) or a retried UUID collision.
 * Alert A1 pages on this count, so an over-count would page on nothing and an
 * under-count would hide the creation flood the alert exists for.
 *
 * ⛔ It is given the platform and the source, never an id (ADR-113). It is called
 * inside a try/catch: a metrics failure must never fail the login it is counting.
 */
export interface IdentityRepositoryHooks {
  onPlayerCreated?(platform: Platform, source: ResolveSource): void;
}

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
  /** Epoch ms of the last metric-hook warning; see HOOK_WARN_INTERVAL_MS. */
  private lastHookWarnAt = 0;

  constructor(
    private readonly pool: Pool,
    private readonly hooks: IdentityRepositoryHooks = {},
  ) {}

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
    for (let attempt = 1; attempt <= MAX_RESOLVE_ATTEMPTS; attempt++) {
      const existing = await this.resolveExistingPlayer(
        platform,
        platformUserId,
      );
      if (existing !== null) {
        return existing;
      }
      const outcome = await this.tryCreate(platform, platformUserId);
      if (outcome.status === "created") {
        // AFTER the COMMIT inside tryCreate, and only on this branch.
        this.notifyPlayerCreated(platform, source);
        return outcome.player;
      }
      // lost_race / id_collision: the transaction was rolled back — go again.
    }
    // No ids in the message: it reaches logs through the route's error line.
    throw new Error(
      `resolveOrCreatePlayer: gave up after ${MAX_RESOLVE_ATTEMPTS} attempts`,
    );
  }

  /**
   * The player for this login, profile included, or null. NEVER inserts (task
   * 0274) — this is what `POST /v1/login` calls while the creation switch is off,
   * and what find-or-create does on its hit path.
   */
  async resolveExistingPlayer(
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

  /**
   * Counting a creation must never be able to fail one. A metrics exporter that
   * throws here would turn every brand-new player's login into a 500 — the worst
   * possible way for monitoring to pay for itself.
   *
   * But swallowing it SILENTLY is its own failure (review R3): this counter is what
   * alert A1 — the creation-flood alarm — pages on, so a hook that always throws
   * would make A1 read zero forever with nothing anywhere saying why. One warn per
   * HOOK_WARN_INTERVAL_MS, carrying the error's TYPE and nothing else: not the
   * message, and never a platform id or a player id (ADR-113). Same shape as
   * Telemetry.ts's export-failure warning, for the same reason.
   */
  private notifyPlayerCreated(platform: Platform, source: ResolveSource): void {
    try {
      this.hooks.onPlayerCreated?.(platform, source);
    } catch (error) {
      const now = Date.now();
      if (now - this.lastHookWarnAt >= HOOK_WARN_INTERVAL_MS) {
        this.lastHookWarnAt = now;
        const name = error instanceof Error ? error.name : typeof error;
        log.warn(
          `player-created metric hook threw (${name}) — the creation-flood alert may be under-counting`,
        );
      }
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
