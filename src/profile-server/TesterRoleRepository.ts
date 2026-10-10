// Data layer for SSH-only tester roles (task 0425). Used ONLY by the one-shot
// `npm run tester-role` command (testerRole.ts) — never by the server, never through
// any route. The allowlist and role-id checks happen BEFORE this layer is reached
// (TesterRoleCommand.ts); this file only writes what it is given.
//
// One transaction per call. apply and restore lock the tester's `players` row FIRST
// (SELECT … FOR UPDATE), the same lock order as recordTenureCheck and creditMatchXp,
// so a run racing a match credit or a tenure claim queues on that row lock and can
// never deadlock with it.
//
// ⚠️ Values are copied snapshot ⇄ players INSIDE SQL, never round-tripped through JS:
// a JS Date holds milliseconds and timestamptz holds microseconds, so a JS round trip
// would make "restore puts every value back exactly" false.

import { Pool, PoolClient } from "pg";
import type { TesterRole } from "./TesterRoles";

/** What `show` reads. Holds no id at all — the command prints it as is. */
export interface TesterRoleState {
  appliedRole: string | null;
  appliedAt: Date | null;
  xp: number;
  isCitizen: boolean;
  isPaidCitizen: boolean;
  citizenshipEarnedAt: Date | null;
  citizenshipPurchasedAt: Date | null;
  tenureGrant: { xpAwarded: number; grantedAt: Date } | null;
  snapshotSavedAt: Date | null;
}

export type TesterShowOutcome =
  | { status: "shown"; state: TesterRoleState }
  | { status: "no_such_player" };

export type TesterApplyOutcome =
  /** `snapshotCreated` is false when a snapshot was already held (it is kept as it was). */
  | { status: "applied"; snapshotCreated: boolean }
  | { status: "no_such_player" };

export type TesterRestoreOutcome =
  | { status: "restored" }
  | { status: "no_such_player" }
  | { status: "no_snapshot" };

/** The three operations the command needs — a fake stands in for it in the unit tests. */
export interface TesterRoleStore {
  show(playerId: string): Promise<TesterShowOutcome>;
  apply(playerId: string, role: TesterRole): Promise<TesterApplyOutcome>;
  restore(playerId: string): Promise<TesterRestoreOutcome>;
}

const SHOW_SQL = `
SELECT p.xp, p.is_citizen, p.is_paid_citizen,
       p.citizenship_earned_at, p.citizenship_purchased_at,
       g.xp_awarded AS tenure_xp_awarded, g.granted_at AS tenure_granted_at,
       s.applied_role, s.applied_at, s.saved_at
FROM players p
LEFT JOIN player_xp_grants g ON g.player_id = p.id AND g.kind = 'tenure'
LEFT JOIN tester_role_snapshots s ON s.player_id = p.id
WHERE p.id = $1
`;

const LOCK_PLAYER_SQL = `SELECT id FROM players WHERE id = $1 FOR UPDATE`;

// Save-before-first-apply. ON CONFLICT DO NOTHING is what keeps the FIRST snapshot:
// a later apply finds the row and writes nothing here. The values come straight from
// the locked players row and the tenure row, copied in SQL (see the header).
const SAVE_SNAPSHOT_SQL = `
INSERT INTO tester_role_snapshots (
  player_id, xp, is_citizen, is_paid_citizen,
  citizenship_earned_at, citizenship_purchased_at, updated_at,
  tenure_grant_present, tenure_xp_awarded, tenure_evidence, tenure_granted_at,
  applied_role, applied_at
)
SELECT p.id, p.xp, p.is_citizen, p.is_paid_citizen,
       p.citizenship_earned_at, p.citizenship_purchased_at, p.updated_at,
       g.player_id IS NOT NULL, g.xp_awarded, g.evidence, g.granted_at,
       $2, now()
FROM players p
LEFT JOIN player_xp_grants g ON g.player_id = p.id AND g.kind = 'tenure'
WHERE p.id = $1
ON CONFLICT (player_id) DO NOTHING
RETURNING player_id
`;

// The role's values. Timestamps use the transaction's now(), as the real writers do.
const APPLY_ROLE_SQL = `
UPDATE players
SET xp = $2,
    is_citizen = $3,
    is_paid_citizen = $4,
    citizenship_earned_at = CASE WHEN $5::boolean THEN now() ELSE NULL END,
    citizenship_purchased_at = CASE WHEN $6::boolean THEN now() ELSE NULL END,
    updated_at = now()
WHERE id = $1
`;

const DELETE_TENURE_SQL = `
DELETE FROM player_xp_grants WHERE player_id = $1 AND kind = 'tenure'
`;

const MARK_APPLIED_SQL = `
UPDATE tester_role_snapshots
SET applied_role = $2, applied_at = now()
WHERE player_id = $1
`;

const LOCK_SNAPSHOT_SQL = `
SELECT player_id FROM tester_role_snapshots WHERE player_id = $1 FOR UPDATE
`;

// Exactly the saved values, updated_at included.
const RESTORE_PLAYER_SQL = `
UPDATE players p
SET xp = s.xp,
    is_citizen = s.is_citizen,
    is_paid_citizen = s.is_paid_citizen,
    citizenship_earned_at = s.citizenship_earned_at,
    citizenship_purchased_at = s.citizenship_purchased_at,
    updated_at = s.updated_at
FROM tester_role_snapshots s
WHERE p.id = $1 AND s.player_id = p.id
`;

const RESTORE_TENURE_SQL = `
INSERT INTO player_xp_grants (player_id, kind, xp_awarded, evidence, granted_at)
SELECT player_id, 'tenure', tenure_xp_awarded, tenure_evidence, tenure_granted_at
FROM tester_role_snapshots
WHERE player_id = $1 AND tenure_grant_present
`;

const DELETE_SNAPSHOT_SQL = `
DELETE FROM tester_role_snapshots WHERE player_id = $1
`;

function dateOrNull(value: unknown): Date | null {
  return value instanceof Date ? value : null;
}

export class TesterRoleRepository implements TesterRoleStore {
  constructor(private readonly pool: Pool) {}

  /** Read-only: no transaction, no lock. */
  async show(playerId: string): Promise<TesterShowOutcome> {
    const res = await this.pool.query(SHOW_SQL, [playerId]);
    if (res.rows.length === 0) {
      return { status: "no_such_player" };
    }
    const row = res.rows[0];
    const grantedAt = dateOrNull(row.tenure_granted_at);
    return {
      status: "shown",
      state: {
        appliedRole: (row.applied_role as string | null) ?? null,
        appliedAt: dateOrNull(row.applied_at),
        xp: Number(row.xp),
        isCitizen: Boolean(row.is_citizen),
        isPaidCitizen: Boolean(row.is_paid_citizen),
        citizenshipEarnedAt: dateOrNull(row.citizenship_earned_at),
        citizenshipPurchasedAt: dateOrNull(row.citizenship_purchased_at),
        tenureGrant:
          grantedAt === null
            ? null
            : { xpAwarded: Number(row.tenure_xp_awarded), grantedAt },
        snapshotSavedAt: dateOrNull(row.saved_at),
      },
    };
  }

  async apply(playerId: string, role: TesterRole): Promise<TesterApplyOutcome> {
    return this.inTransaction<TesterApplyOutcome>(async (client) => {
      const locked = await client.query(LOCK_PLAYER_SQL, [playerId]);
      if (locked.rows.length === 0) {
        return { rollback: true, value: { status: "no_such_player" } };
      }
      const saved = await client.query(SAVE_SNAPSHOT_SQL, [playerId, role.id]);
      await client.query(APPLY_ROLE_SQL, [
        playerId,
        role.xp,
        role.isCitizen,
        role.isPaidCitizen,
        role.stampEarnedAt,
        role.stampPurchasedAt,
      ]);
      if (role.clearTenureGrant) {
        await client.query(DELETE_TENURE_SQL, [playerId]);
      }
      await client.query(MARK_APPLIED_SQL, [playerId, role.id]);
      return {
        rollback: false,
        value: { status: "applied", snapshotCreated: saved.rows.length > 0 },
      };
    });
  }

  async restore(playerId: string): Promise<TesterRestoreOutcome> {
    return this.inTransaction<TesterRestoreOutcome>(async (client) => {
      const locked = await client.query(LOCK_PLAYER_SQL, [playerId]);
      if (locked.rows.length === 0) {
        return { rollback: true, value: { status: "no_such_player" } };
      }
      const snapshot = await client.query(LOCK_SNAPSHOT_SQL, [playerId]);
      if (snapshot.rows.length === 0) {
        return { rollback: true, value: { status: "no_snapshot" } };
      }
      await client.query(RESTORE_PLAYER_SQL, [playerId]);
      await client.query(DELETE_TENURE_SQL, [playerId]);
      await client.query(RESTORE_TENURE_SQL, [playerId]);
      await client.query(DELETE_SNAPSHOT_SQL, [playerId]);
      return { rollback: false, value: { status: "restored" } };
    });
  }

  /**
   * BEGIN, run `work`, then COMMIT — or ROLLBACK when `work` asks for it (an expected
   * refusal, nothing written) or throws (the original error is re-thrown).
   */
  private async inTransaction<T>(
    work: (client: PoolClient) => Promise<{ rollback: boolean; value: T }>,
  ): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await work(client);
      await client.query(result.rollback ? "ROLLBACK" : "COMMIT");
      return result.value;
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
  }
}
