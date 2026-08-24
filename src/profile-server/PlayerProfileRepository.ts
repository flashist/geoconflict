// Data layer for the profile backend. The ONLY component that touches Postgres —
// the game server reaches profiles over HTTP, never the DB directly.
//
// Field names are snake_case end-to-end (DB column == PlayerProfile key), so rows
// map to the shared contract with no translation layer beyond type coercion.

import { Pool } from "pg";
import { CITIZENSHIP_XP_THRESHOLD } from "../core/profile/Citizenship";
import {
  CURRENT_PROFILE_SCHEMA_VERSION,
  PlayerProfile,
  migrateProfile,
} from "../core/profile/PlayerProfile";

/** Outcome of crediting a single match for one player. */
export type CreditStatus = "credited" | "duplicate" | "no_profile";

/**
 * Full result of `creditMatchXp`. `citizenshipNewlyGranted` is true only when THIS
 * credit flipped `is_citizen` false→true via the XP threshold (task 0017) — never
 * for duplicates, missing profiles, or players already citizens (e.g. paid).
 */
export interface CreditOutcome {
  status: CreditStatus;
  citizenshipNewlyGranted: boolean;
}

// Postgres `foreign_key_violation` — a credit referencing a yandex_player_id with
// no player_profiles row. Means "create the profile first" (T6 orders upsert
// before credit), so we report it rather than failing the whole batch.
const PG_FOREIGN_KEY_VIOLATION = "23503";

// Postgres `unique_violation` — here, a `persistent_id` already linked to a
// DIFFERENT yandex_player_id (the column is UNIQUE). `persistentId` is
// browser/device-scoped and `yandexPlayerId` is account-scoped, so one device
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
    readonly yandexPlayerId: string,
    readonly persistentId: string,
  ) {
    // The raw persistentId is deliberately kept OUT of the message (and thus the
    // stack), so it never reaches the logs — it's the internal cross-device token
    // the API also strips. yandexPlayerId stays in for traceability (it's already a
    // public identifier). persistentId remains a field for programmatic use.
    super(
      `persistent_id is already linked to another yandex account ` +
        `(upsert for "${yandexPlayerId}")`,
    );
    this.name = "PersistentIdConflictError";
  }
}

// Insert the ledger row idempotently and increment xp in ONE statement. The row
// lock the UPDATE takes is held to COMMIT, so everything read back here (and the
// grant decision built on it) is race-free. `inserted` is 1 on a fresh credit, 0
// when the (game_id, yandex_player_id) row already existed (idempotent no-op —
// the UPDATE is gated on EXISTS(ins) too). RETURNING carries the post-increment
// xp plus the citizenship fields this statement does NOT touch — i.e. their
// locked PRE-grant values — which is what makes "newly granted" detectable
// without a snapshot self-join (whose pre-image goes stale under a concurrent
// credit's EvalPlanQual recheck).
const CREDIT_SQL = `
WITH ins AS (
  INSERT INTO player_match_xp_credits (game_id, yandex_player_id, xp_awarded)
  VALUES ($1, $2, $3)
  ON CONFLICT (game_id, yandex_player_id) DO NOTHING
  RETURNING xp_awarded
),
upd AS (
  UPDATE player_profiles p
  SET xp = p.xp + (SELECT xp_awarded FROM ins),
      updated_at = now()
  WHERE p.yandex_player_id = $2
    AND EXISTS (SELECT 1 FROM ins)
  RETURNING p.xp, p.is_citizen, p.citizenship_earned_at
)
SELECT
  (SELECT count(*) FROM ins)::int AS inserted,
  (SELECT u.xp FROM upd u) AS new_xp,
  (SELECT u.is_citizen FROM upd u) AS was_citizen,
  (SELECT u.citizenship_earned_at FROM upd u) AS earned_at
`;

// Grant earned citizenship / stamp citizenship_earned_at once the accumulated XP
// reaches the threshold (task 0017). Runs in the SAME transaction as CREDIT_SQL,
// on the row it already locked, so the flip is atomic with the increment. The
// `is_citizen = false OR citizenship_earned_at IS NULL` arm keeps the pre-0017
// behavior for a PAID citizen crossing the threshold (owner-ruled 2026-08-23):
// earned_at still stamps (coalesce keeps the first stamp), is_citizen stays true,
// and the caller reports citizenshipNewlyGranted only when is_citizen was false.
// The WHERE re-checks xp/state defensively even though the lock makes it stable.
const GRANT_CITIZENSHIP_SQL = `
UPDATE player_profiles
SET is_citizen = true,
    citizenship_earned_at = coalesce(citizenship_earned_at, now()),
    updated_at = now()
WHERE yandex_player_id = $1
  AND xp >= $2
  AND (is_citizen = false OR citizenship_earned_at IS NULL)
`;

// Create on first authenticated join; on conflict, relink persistent_id only when
// it actually changed. The schema_version guard is the forward-version writeback
// protection: a stale build (lower CURRENT) never overwrites a row a newer build
// wrote with a higher schema_version (the WHERE fails → DO UPDATE is skipped). It
// never touches xp, citizenship, or paid flags.
const UPSERT_SQL = `
INSERT INTO player_profiles (yandex_player_id, persistent_id, created_at, updated_at)
VALUES ($1, $2, now(), now())
ON CONFLICT (yandex_player_id) DO UPDATE
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
    yandex_player_id: row.yandex_player_id,
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
    yandexPlayerId: string,
    persistentId: string,
  ): Promise<PlayerProfile> {
    let res;
    try {
      res = await this.pool.query(UPSERT_SQL, [
        yandexPlayerId,
        persistentId,
        CURRENT_PROFILE_SCHEMA_VERSION,
      ]);
    } catch (error) {
      // The persistent_id UNIQUE index rejected a cross-account collision (the
      // INSERT path, or the relink DO UPDATE). Surface a typed conflict so the
      // route returns 409 instead of an opaque 500. Both the fresh-insert and the
      // relink collide on the same index, so one check covers both.
      if (isPgError(error, PG_UNIQUE_VIOLATION)) {
        throw new PersistentIdConflictError(yandexPlayerId, persistentId);
      }
      throw error;
    }
    if (res.rows.length > 0) {
      return rowToProfile(res.rows[0]);
    }
    // DO UPDATE was skipped (unchanged persistent_id, or a newer-version row): the
    // row exists but RETURNING yielded nothing, so read it back.
    const existing = await this.getProfile(yandexPlayerId);
    if (existing) {
      return existing;
    }
    throw new Error(`upsertProfile: row vanished for ${yandexPlayerId}`);
  }

  /**
   * Credit a match's XP atomically and idempotently, granting earned citizenship
   * in the same transaction when the new total crosses the threshold (task 0017).
   * Re-crediting the same (gameId, yandexPlayerId) is a no-op ("duplicate"). A
   * credit for a player with no profile row yet is reported ("no_profile"), not
   * thrown. `citizenshipNewlyGranted` is true only when THIS credit flipped
   * `is_citizen` false→true.
   */
  async creditMatchXp(
    gameId: string,
    yandexPlayerId: string,
    xpAwarded: number,
  ): Promise<CreditOutcome> {
    const client = await this.pool.connect();
    let outcome: CreditOutcome;
    try {
      await client.query("BEGIN");
      const res = await client.query(CREDIT_SQL, [
        gameId,
        yandexPlayerId,
        xpAwarded,
      ]);
      const inserted = Number(res.rows[0].inserted) > 0;
      let citizenshipNewlyGranted = false;
      if (inserted) {
        const newXp = Number(res.rows[0].new_xp);
        const wasCitizen = Boolean(res.rows[0].was_citizen);
        const earnedAt = res.rows[0].earned_at as Date | null;
        // Values are from the row CREDIT_SQL locked, so this decision cannot race
        // a concurrent credit; the grant's WHERE re-checks it defensively anyway.
        if (
          newXp >= CITIZENSHIP_XP_THRESHOLD &&
          (!wasCitizen || earnedAt === null)
        ) {
          await client.query(GRANT_CITIZENSHIP_SQL, [
            yandexPlayerId,
            CITIZENSHIP_XP_THRESHOLD,
          ]);
          citizenshipNewlyGranted = !wasCitizen;
        }
      }
      await client.query("COMMIT");
      outcome = {
        status: inserted ? "credited" : "duplicate",
        citizenshipNewlyGranted,
      };
    } catch (error) {
      try {
        await client.query("ROLLBACK");
      } catch {
        // ROLLBACK failed (e.g. the connection dropped) — swallow it so the
        // ORIGINAL error below still drives classification; otherwise an
        // FK-violation would be masked as a generic error.
      }
      if (isPgError(error, PG_FOREIGN_KEY_VIOLATION)) {
        return { status: "no_profile", citizenshipNewlyGranted: false };
      }
      throw error;
    } finally {
      client.release();
    }
    if (outcome.citizenshipNewlyGranted) {
      // Fires AFTER commit — a hook failure must never roll back a real grant.
      this.afterCitizenshipEarned(yandexPlayerId);
    }
    return outcome;
  }

  /**
   * Post-grant hook seam for EARNED citizenship, mirroring
   * PaymentsRepository.afterPaidPurchaseGranted (the no-op-seam shape approved at
   * the 0019 plan gate). Deliberately a no-op today:
   * TODO(0012): the personal-inbox citizenship message fires from here once the
   * inbox feature (backlog task 0012) exists — text lives at
   * `citizenship_earned.inbox_title` / `citizenship_earned.inbox_body` in
   * resources/lang/en.json + ru.json.
   */
  private afterCitizenshipEarned(_yandexPlayerId: string): void {
    // no-op — see TODO above.
  }

  /** Read a profile by Yandex player ID, or null if none exists. */
  async getProfile(yandexPlayerId: string): Promise<PlayerProfile | null> {
    const res = await this.pool.query(
      "SELECT * FROM player_profiles WHERE yandex_player_id = $1",
      [yandexPlayerId],
    );
    if (res.rows.length === 0) {
      return null;
    }
    return rowToProfile(res.rows[0]);
  }
}
