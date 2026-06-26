// Data layer for the profile backend. The ONLY component that touches Postgres —
// the game server reaches profiles over HTTP, never the DB directly.
//
// Field names are snake_case end-to-end (DB column == PlayerProfile key), so rows
// map to the shared contract with no translation layer beyond type coercion.
//
// 152-ФЗ: this layer keys profiles on `yandex_player_id_hash` — the irreversible
// keyed hash of the raw Yandex id. The raw id never reaches here; Routes.ts hashes
// it at the API boundary, so every `yandexPlayerIdHash` param below is already a hash.

import { Pool } from "pg";
import { CITIZENSHIP_XP_THRESHOLD } from "../core/profile/Citizenship";
import {
  CURRENT_PROFILE_SCHEMA_VERSION,
  PlayerProfile,
  migrateProfile,
} from "../core/profile/PlayerProfile";

/** Outcome of crediting a single match for one player. */
export type CreditStatus = "credited" | "duplicate" | "no_profile";

// Postgres `foreign_key_violation` — a credit referencing a yandex_player_id_hash
// with no player_profiles row. Means "create the profile first" (T6 orders upsert
// before credit), so we report it rather than failing the whole batch.
const PG_FOREIGN_KEY_VIOLATION = "23503";

// Postgres `unique_violation` — here, a `persistent_id` already linked to a
// DIFFERENT yandex_player_id_hash (the column is UNIQUE). `persistentId` is
// browser/device-scoped and the id-hash is account-scoped, so one device
// presenting under a second account (account switch / shared browser) collides.
const PG_UNIQUE_VIOLATION = "23505";

function isPgError(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: string }).code === code
  );
}

/**
 * Thrown by `upsertProfile` when the requested `persistentId` already belongs to a
 * different Yandex account. The route maps this to HTTP 409 (a meaningful signal)
 * instead of an opaque 500. The actual device↔account relink POLICY (transfer vs
 * reject) is a T6 / identity-model decision; T5 only surfaces the conflict cleanly.
 */
export class PersistentIdConflictError extends Error {
  constructor(
    readonly yandexPlayerIdHash: string,
    readonly persistentId: string,
  ) {
    // The raw persistentId is deliberately kept OUT of the message (and thus the
    // stack), so it never reaches the logs — it's the internal cross-device token
    // the API also strips. The id-hash stays in for traceability (it's an
    // irreversible pseudonym, not raw PII). persistentId remains a field for
    // programmatic use.
    super(
      `persistent_id is already linked to another yandex account ` +
        `(upsert for "${yandexPlayerIdHash}")`,
    );
    this.name = "PersistentIdConflictError";
  }
}

// Insert the ledger row idempotently and increment xp + flip citizenship in ONE
// statement (so the post-increment total drives the flip with no read-modify-write
// race). `inserted` is 1 on a fresh credit, 0 when the (game_id, yandex_player_id_hash)
// row already existed (idempotent no-op — the UPDATE is gated on EXISTS(ins) too).
// The `upd` CTE is a data-modifying WITH, so Postgres runs it to completion even
// though the final SELECT doesn't read its output — only `inserted` is needed to
// decide credited vs duplicate.
const CREDIT_SQL = `
WITH ins AS (
  INSERT INTO player_match_xp_credits (game_id, yandex_player_id_hash, xp_awarded)
  VALUES ($1, $2, $3)
  ON CONFLICT (game_id, yandex_player_id_hash) DO NOTHING
  RETURNING xp_awarded
),
upd AS (
  UPDATE player_profiles p
  SET xp = p.xp + (SELECT xp_awarded FROM ins),
      is_citizen = p.is_citizen OR (p.xp + (SELECT xp_awarded FROM ins)) >= $4,
      citizenship_earned_at = CASE
        WHEN p.citizenship_earned_at IS NULL
             AND (p.xp + (SELECT xp_awarded FROM ins)) >= $4
        THEN now() ELSE p.citizenship_earned_at END,
      updated_at = now()
  WHERE p.yandex_player_id_hash = $2
    AND EXISTS (SELECT 1 FROM ins)
  RETURNING p.xp
)
SELECT (SELECT count(*) FROM ins)::int AS inserted
`;

// Create on first authenticated join; on conflict, relink persistent_id only when
// it actually changed. The schema_version guard is the forward-version writeback
// protection: a stale build (lower CURRENT) never overwrites a row a newer build
// wrote with a higher schema_version (the WHERE fails → DO UPDATE is skipped). It
// never touches xp, citizenship, or paid flags.
const UPSERT_SQL = `
INSERT INTO player_profiles (yandex_player_id_hash, persistent_id, created_at, updated_at)
VALUES ($1, $2, now(), now())
ON CONFLICT (yandex_player_id_hash) DO UPDATE
  SET persistent_id = EXCLUDED.persistent_id, updated_at = now()
  WHERE player_profiles.persistent_id IS DISTINCT FROM EXCLUDED.persistent_id
    AND player_profiles.schema_version <= $3
RETURNING *
`;

function toIsoOrNull(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

/**
 * Map a raw `player_profiles` row to the shared `PlayerProfile` contract.
 * Coerces bigint (string from pg) → number and timestamptz (Date) → ISO string,
 * drops the `extra` overflow column, and runs `migrateProfile` so a row written by
 * a NEWER build (higher schema_version) normalizes instead of throwing (which a
 * strict `PlayerProfileSchema.parse` on `z.literal` would do → a 500 on read).
 */
export function rowToProfile(row: Record<string, unknown>): PlayerProfile {
  return migrateProfile({
    schema_version: row.schema_version,
    yandex_player_id_hash: row.yandex_player_id_hash,
    persistent_id: row.persistent_id,
    xp: Number(row.xp),
    is_citizen: row.is_citizen,
    is_paid_citizen: row.is_paid_citizen,
    citizenship_earned_at: toIsoOrNull(
      row.citizenship_earned_at as Date | null,
    ),
    citizenship_purchased_at: toIsoOrNull(
      row.citizenship_purchased_at as Date | null,
    ),
    display_name: row.display_name,
    created_at: (row.created_at as Date).toISOString(),
    updated_at: (row.updated_at as Date).toISOString(),
  });
}

export class PlayerProfileRepository {
  constructor(private readonly pool: Pool) {}

  /** Readiness probe for /ready — a trivial query over the real connection. */
  async ping(): Promise<void> {
    await this.pool.query("SELECT 1");
  }

  /**
   * Create a profile (xp 0) on first authenticated join; relink persistent_id if
   * it changed. Never writes xp/citizenship/paid fields. Returns the live row.
   */
  async upsertProfile(
    yandexPlayerIdHash: string,
    persistentId: string,
  ): Promise<PlayerProfile> {
    let res;
    try {
      res = await this.pool.query(UPSERT_SQL, [
        yandexPlayerIdHash,
        persistentId,
        CURRENT_PROFILE_SCHEMA_VERSION,
      ]);
    } catch (error) {
      // The persistent_id UNIQUE index rejected a cross-account collision (the
      // INSERT path, or the relink DO UPDATE). Surface a typed conflict so the
      // route returns 409 instead of an opaque 500. Both the fresh-insert and the
      // relink collide on the same index, so one check covers both.
      if (isPgError(error, PG_UNIQUE_VIOLATION)) {
        throw new PersistentIdConflictError(yandexPlayerIdHash, persistentId);
      }
      throw error;
    }
    if (res.rows.length > 0) {
      return rowToProfile(res.rows[0]);
    }
    // DO UPDATE was skipped (unchanged persistent_id, or a newer-version row): the
    // row exists but RETURNING yielded nothing, so read it back.
    const existing = await this.getProfile(yandexPlayerIdHash);
    if (existing) {
      return existing;
    }
    throw new Error(`upsertProfile: row vanished for ${yandexPlayerIdHash}`);
  }

  /**
   * Credit a match's XP atomically and idempotently. Re-crediting the same
   * (gameId, yandexPlayerIdHash) is a no-op ("duplicate"). A credit for a player
   * with no profile row yet is reported ("no_profile"), not thrown.
   */
  async creditMatchXp(
    gameId: string,
    yandexPlayerIdHash: string,
    xpAwarded: number,
  ): Promise<CreditStatus> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const res = await client.query(CREDIT_SQL, [
        gameId,
        yandexPlayerIdHash,
        xpAwarded,
        CITIZENSHIP_XP_THRESHOLD,
      ]);
      await client.query("COMMIT");
      const inserted = Number(res.rows[0].inserted);
      return inserted > 0 ? "credited" : "duplicate";
    } catch (error) {
      try {
        await client.query("ROLLBACK");
      } catch {
        // ROLLBACK failed (e.g. the connection dropped) — swallow it so the
        // ORIGINAL error below still drives classification; otherwise an
        // FK-violation would be masked as a generic error.
      }
      if (isPgError(error, PG_FOREIGN_KEY_VIOLATION)) {
        return "no_profile";
      }
      throw error;
    } finally {
      client.release();
    }
  }

  /** Read a profile by Yandex player ID hash, or null if none exists. */
  async getProfile(yandexPlayerIdHash: string): Promise<PlayerProfile | null> {
    const res = await this.pool.query(
      "SELECT * FROM player_profiles WHERE yandex_player_id_hash = $1",
      [yandexPlayerIdHash],
    );
    if (res.rows.length === 0) {
      return null;
    }
    return rowToProfile(res.rows[0]);
  }
}
