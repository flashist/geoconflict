// Data layer for the profile backend. The ONLY component that touches Postgres —
// the game server reaches profiles over HTTP, never the DB directly.
//
// Field names are snake_case end-to-end (DB column == PlayerProfile key), so rows
// map to the shared contract with no translation layer beyond type coercion.

import { Pool } from "pg";
import { CITIZENSHIP_XP_THRESHOLD } from "../core/profile/Citizenship";
import { PlayerProfile, migrateProfile } from "../core/profile/PlayerProfile";
import type { TenureEvidence } from "../core/profile/TenureGrantContract";
import { logInboxSendFailure, type InboxSender } from "./InboxRepository";

/** One-off XP grant kinds — must match the `player_xp_grants.kind` CHECK (migrations/006). */
export type XpGrantKind = "tenure";

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

/**
 * Outcome of `recordTenureCheck` (task 0253). `granted`, `below_minimum` and
 * `duplicate` are the wire statuses; `not_found` means the caller's player row
 * is gone (a token outliving its player, e.g. after a restore) — nothing written.
 */
export type TenureCheckStatus =
  | "granted"
  | "below_minimum"
  | "duplicate"
  | "not_found";

/**
 * Full result of `recordTenureCheck`. `xpAwarded` is what THIS call recorded for
 * `granted` / `below_minimum`, and what the earlier check stored for
 * `duplicate`; `xp` is the player's total after the call (0 for `not_found`).
 * `citizenshipNewlyGranted` has `CreditOutcome`'s meaning.
 */
export interface TenureCheckOutcome {
  status: TenureCheckStatus;
  xpAwarded: number;
  xp: number;
  citizenshipNewlyGranted: boolean;
}

// Postgres `foreign_key_violation` — a credit referencing a player_id with no
// players row. The credit route only passes ids it just resolved, so this is the
// "player erased in between" edge; reported rather than failing the whole batch.
const PG_FOREIGN_KEY_VIOLATION = "23503";

function isPgError(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: string }).code === code
  );
}

// Insert the ledger row idempotently and increment xp in ONE statement. The row
// lock the UPDATE takes is held to COMMIT, so everything read back here (and the
// grant decision built on it) is race-free. `inserted` is 1 on a fresh credit, 0
// when the (game_id, player_id) row already existed (idempotent no-op —
// the UPDATE is gated on EXISTS(ins) too). RETURNING carries the post-increment
// xp plus the citizenship fields this statement does NOT touch — i.e. their
// locked PRE-grant values — which is what makes "newly granted" detectable
// without a snapshot self-join (whose pre-image goes stale under a concurrent
// credit's EvalPlanQual recheck).
const CREDIT_SQL = `
WITH ins AS (
  INSERT INTO player_match_xp_credits (game_id, player_id, xp_awarded)
  VALUES ($1, $2, $3)
  ON CONFLICT (game_id, player_id) DO NOTHING
  RETURNING xp_awarded
),
upd AS (
  UPDATE players p
  SET xp = p.xp + (SELECT xp_awarded FROM ins),
      updated_at = now()
  WHERE p.id = $2
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
UPDATE players
SET is_citizen = true,
    citizenship_earned_at = coalesce(citizenship_earned_at, now()),
    updated_at = now()
WHERE id = $1
  AND xp >= $2
  AND (is_citizen = false OR citizenship_earned_at IS NULL)
`;

// ── Tenure check (task 0253, ADR-112 amended) ─────────────────────────────
// Run inside ONE transaction, in this order. The FOR UPDATE lock on the players
// row is taken FIRST and held to COMMIT, so two concurrent claims for one player
// (two tabs) serialize on it: the second sees the first's row and is a
// duplicate. It also serializes a claim with a concurrent match credit, whose
// CREDIT_SQL UPDATE takes the same row lock.
const LOCK_PLAYER_FOR_TENURE_SQL = `
SELECT xp, is_citizen, citizenship_earned_at
FROM players
WHERE id = $1
FOR UPDATE
`;

// The (player_id, kind) primary key IS the one-time rule: any row, a 0-XP one
// included, is a final "checked". No row back ⇒ the player was already checked.
const INSERT_TENURE_CHECK_SQL = `
INSERT INTO player_xp_grants (player_id, kind, xp_awarded, evidence)
VALUES ($1, 'tenure', $2, $3)
ON CONFLICT (player_id, kind) DO NOTHING
RETURNING xp_awarded
`;

const SELECT_TENURE_CHECK_SQL = `
SELECT xp_awarded FROM player_xp_grants
WHERE player_id = $1 AND kind = 'tenure'
`;

const ADD_TENURE_XP_SQL = `
UPDATE players
SET xp = xp + $2, updated_at = now()
WHERE id = $1
RETURNING xp
`;

function toIsoOrNull(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

/**
 * Map a raw `players` row to the shared `PlayerProfile` contract.
 * Coerces bigint (string from pg) → number and timestamptz (Date) → ISO string,
 * drops the `extra` overflow column and the internal `id` / `last_login_at` (never
 * part of the contract — the id must not reach a client), and runs `migrateProfile` so a row written by
 * a NEWER build (higher schema_version) normalizes instead of throwing (which a
 * strict `PlayerProfileSchema.parse` on `z.literal` would do → a 500 on read).
 */
export function rowToProfile(row: Record<string, unknown>): PlayerProfile {
  return migrateProfile({
    schema_version: row.schema_version,
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
  /**
   * `inbox` is optional so tests and tools can build the repository without the
   * inbox; when absent the post-grant seam simply sends nothing.
   */
  constructor(
    private readonly pool: Pool,
    private readonly inbox?: InboxSender,
  ) {}

  /** Readiness probe for /ready — a trivial query over the real connection. */
  async ping(): Promise<void> {
    await this.pool.query("SELECT 1");
  }

  /**
   * Credit a match's XP atomically and idempotently, granting earned citizenship
   * in the same transaction when the new total crosses the threshold (task 0017).
   * Re-crediting the same (gameId, playerId) is a no-op ("duplicate"). A
   * credit for a player with no players row is reported ("no_profile"), not
   * thrown. `citizenshipNewlyGranted` is true only when THIS credit flipped
   * `is_citizen` false→true.
   */
  async creditMatchXp(
    gameId: string,
    playerId: string,
    xpAwarded: number,
  ): Promise<CreditOutcome> {
    const client = await this.pool.connect();
    let outcome: CreditOutcome;
    try {
      await client.query("BEGIN");
      const res = await client.query(CREDIT_SQL, [gameId, playerId, xpAwarded]);
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
            playerId,
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
      // Fires AFTER commit — a hook failure must never roll back a real grant,
      // nor misreport a durable grant as a wire error (0017 review residual R1,
      // owner-ruled 2026-08-24): the hook never throws by contract, and this
      // call site is guarded too (belt and suspenders).
      try {
        this.afterCitizenshipEarned(playerId);
      } catch (error) {
        logInboxSendFailure("citizenship_earned", error);
      }
    }
    return outcome;
  }

  /**
   * Record the one-time tenure check (task 0253) and add its XP, atomically and
   * at most once per player. The CALLER computes `xpAwarded` from the evidence
   * with the shared rule (TenureGrantContract.tenureGrantForEvidence); this
   * method trusts it and never recomputes it (accepted residual R3: capped only
   * at the route — one caller, one kind).
   *
   * Every check writes a row, 0 XP included: 0 is `below_minimum` and is final.
   * `duplicate` writes nothing and reports the amount the earlier check stored.
   * `not_found` writes nothing. When the grant lifts the total to the
   * citizenship threshold — only possible once real XP is already 50+ — earned
   * citizenship is granted in the same transaction and the same post-commit
   * inbox hook as `creditMatchXp` fires.
   *
   * `evidence` is stored as the two counts only — never an id.
   */
  async recordTenureCheck(
    playerId: string,
    xpAwarded: number,
    evidence: TenureEvidence,
  ): Promise<TenureCheckOutcome> {
    const client = await this.pool.connect();
    let outcome: TenureCheckOutcome;
    try {
      await client.query("BEGIN");
      const locked = await client.query(LOCK_PLAYER_FOR_TENURE_SQL, [playerId]);
      if (locked.rows.length === 0) {
        await client.query("ROLLBACK");
        return {
          status: "not_found",
          xpAwarded: 0,
          xp: 0,
          citizenshipNewlyGranted: false,
        };
      }
      const currentXp = Number(locked.rows[0].xp);

      const inserted = await client.query(INSERT_TENURE_CHECK_SQL, [
        playerId,
        xpAwarded,
        JSON.stringify({
          daysPlayed: evidence.daysPlayed,
          gameRecordDays: evidence.gameRecordDays,
        }),
      ]);
      if (inserted.rows.length === 0) {
        const stored = await client.query(SELECT_TENURE_CHECK_SQL, [playerId]);
        await client.query("COMMIT");
        return {
          status: "duplicate",
          xpAwarded: Number(stored.rows[0]?.xp_awarded ?? 0),
          xp: currentXp,
          citizenshipNewlyGranted: false,
        };
      }

      if (xpAwarded <= 0) {
        await client.query("COMMIT");
        return {
          status: "below_minimum",
          xpAwarded: 0,
          xp: currentXp,
          citizenshipNewlyGranted: false,
        };
      }

      const updated = await client.query(ADD_TENURE_XP_SQL, [
        playerId,
        xpAwarded,
      ]);
      const newXp = Number(updated.rows[0].xp);
      const wasCitizen = Boolean(locked.rows[0].is_citizen);
      const earnedAt = locked.rows[0].citizenship_earned_at as Date | null;
      let citizenshipNewlyGranted = false;
      // Same decision as creditMatchXp, on the row this transaction locked.
      if (
        newXp >= CITIZENSHIP_XP_THRESHOLD &&
        (!wasCitizen || earnedAt === null)
      ) {
        await client.query(GRANT_CITIZENSHIP_SQL, [
          playerId,
          CITIZENSHIP_XP_THRESHOLD,
        ]);
        citizenshipNewlyGranted = !wasCitizen;
      }
      await client.query("COMMIT");
      outcome = {
        status: "granted",
        xpAwarded,
        xp: newXp,
        citizenshipNewlyGranted,
      };
    } catch (error) {
      try {
        await client.query("ROLLBACK");
      } catch {
        // ROLLBACK failed (connection gone) — surface the ORIGINAL error.
      }
      throw error;
    } finally {
      client.release();
    }
    if (outcome.citizenshipNewlyGranted) {
      // After commit, never throwing — the creditMatchXp contract (0017 R1).
      try {
        this.afterCitizenshipEarned(playerId);
      } catch (error) {
        logInboxSendFailure("citizenship_earned", error);
      }
    }
    return outcome;
  }

  /**
   * Post-grant hook for EARNED citizenship (task 0012 filled the 0017 seam;
   * mirrors PaymentsRepository.afterPaidPurchaseGranted). Sends the
   * `citizenship_earned` inbox template — rendered client-side from
   * `inbox.templates.citizenship_earned.{title,body}` in resources/lang/*.json.
   * Best-effort and contractually never-throwing: a sync throw is caught here,
   * an async rejection is logged, and the credit outcome is returned unchanged
   * either way. Only ever reached for a false→true flip (never for a paid
   * citizen crossing the threshold, never for duplicates).
   */
  private afterCitizenshipEarned(playerId: string): void {
    if (this.inbox === undefined) {
      return;
    }
    try {
      void this.inbox
        .sendTemplate(playerId, "citizenship_earned")
        .catch((error: unknown) =>
          logInboxSendFailure("citizenship_earned", error),
        );
    } catch (error) {
      logInboxSendFailure("citizenship_earned", error);
    }
  }

  /**
   * Whether a one-off XP grant of `kind` has been recorded for the player (task
   * 0271, `grantChecks` on POST /v1/login). ANY row counts — a 0-XP row is a final
   * "checked, nothing granted" (ADR-112, amended). Read-only.
   */
  async hasXpGrant(playerId: string, kind: XpGrantKind): Promise<boolean> {
    const res = await this.pool.query(
      "SELECT 1 FROM player_xp_grants WHERE player_id = $1 AND kind = $2",
      [playerId, kind],
    );
    return res.rows.length > 0;
  }

  /** Read a profile by internal player id, or null if none exists. */
  async getProfile(playerId: string): Promise<PlayerProfile | null> {
    const res = await this.pool.query("SELECT * FROM players WHERE id = $1", [
      playerId,
    ]);
    if (res.rows.length === 0) {
      return null;
    }
    return rowToProfile(res.rows[0]);
  }
}
