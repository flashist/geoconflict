// Data layer for the owner-run profile merge (task 0503, ADR-128). Used ONLY by the
// one-shot `npm run merge-profiles` command (mergeProfiles.ts) — never by the server,
// never through any route.
//
// One engine for both directions: `into` is the record that is kept, the sources are
// folded into it, all in ONE transaction. The rules (which rows move, which stay) are
// the pure `planMerge` below; the dry run prints that plan and the real run applies the
// plan it recomputes from the locked rows, after checking the dry run's fingerprint.
//
// ⚠️ Timestamps are moved and compared INSIDE SQL, never round-tripped through JS: a
// JS Date holds milliseconds and timestamptz holds microseconds (the TesterRoleRepository
// rule). JS Dates here are for display and for the plan's decisions only.

import { Pool, PoolClient } from "pg";
import { CITIZENSHIP_XP_THRESHOLD } from "../core/profile/Citizenship";
import { PRODUCT_DEFINITIONS } from "../core/profile/PaymentsContract";
import {
  PaymentsRepository,
  type HolderSightingRow,
  type TransferredEntitlement,
} from "./PaymentsRepository";

export const MERGE_MIGRATION = "012_player_merges.sql";
export const MAX_MERGE_SOURCES = 5;
/** A source with activity this recent may still have a page open on it (ADR-128 §2.6). */
export const RECENT_ACTIVITY_MS = 24 * 60 * 60 * 1000;

// ── State ──────────────────────────────────────────────────────────────────

export interface LedgerRow {
  gameId: string;
  xpAwarded: number;
  at: Date;
}

export interface ReceiptRow {
  purchaseToken: string;
  productId: string;
  processedAt: Date;
}

export interface EntitlementRow {
  productId: string;
  purchaseToken: string;
}

export interface CosmeticRow {
  cosmeticType: string;
  cosmeticId: string;
}

/** One involved record, as read inside the transaction. */
export interface MergeRecordState {
  playerId: string;
  createdAt: Date;
  lastLoginAt: Date;
  xp: number;
  isCitizen: boolean;
  isPaidCitizen: boolean;
  citizenshipEarnedAt: Date | null;
  citizenshipPurchasedAt: Date | null;
  displayName: string | null;
  /** The newest name-history row's status, in the profile card's order (pending first). */
  latestNameStatus: string | null;
  hasPendingName: boolean;
  nameHistoryCount: number;
  identityCount: number;
  identityFirstCreatedAt: Date | null;
  identityLastLoginAt: Date | null;
  credits: LedgerRow[];
  rewarded: LedgerRow[];
  tenure: { xpAwarded: number; grantedAt: Date } | null;
  receipts: ReceiptRow[];
  entitlements: EntitlementRow[];
  intentCount: number;
  unusedIntentCount: number;
  messageCount: number;
  cosmetics: CosmeticRow[];
  hasTesterSnapshot: boolean;
}

export function ledgerXp(state: MergeRecordState): number {
  const sum = (rows: LedgerRow[]) =>
    rows.reduce((total, row) => total + row.xpAwarded, 0);
  return (
    sum(state.credits) + sum(state.rewarded) + (state.tenure?.xpAwarded ?? 0)
  );
}

/** ADR-112: xp = Σ match credits + Σ ad bonuses + the tenure grant. */
export function xpRuleHolds(state: MergeRecordState): boolean {
  return state.xp === ledgerXp(state);
}

/** Paid flags agree with the receipts the record holds. */
export function paidFlagsMatchReceipts(state: MergeRecordState): boolean {
  const paid = state.receipts.length > 0;
  return (
    state.isPaidCitizen === paid &&
    (state.citizenshipPurchasedAt !== null) === paid
  );
}

function isCitizenshipProduct(productId: string): boolean {
  return (
    Object.prototype.hasOwnProperty.call(PRODUCT_DEFINITIONS, productId) &&
    PRODUCT_DEFINITIONS[productId as keyof typeof PRODUCT_DEFINITIONS].kind ===
      "citizenship"
  );
}

// ── Plan (pure) ────────────────────────────────────────────────────────────

export type MergeRefusalCode =
  | "tester_snapshot"
  | "pending_name"
  | "paid_flags_mismatch"
  | "xp_rule_broken"
  | "duplicate_durable_receipts"
  | "xp_would_drop"
  | "nothing_to_move";

export interface MergeRefusal {
  code: MergeRefusalCode;
  label: string;
  message: string;
}

/** `swap`: the source's tenure row is larger, so it and the kept record's row change places. */
export type TenureAction = "none" | "move" | "swap" | "stay";
export type NameAction = "none" | "move" | "reserved";

export interface PlannedReceipt {
  purchaseToken: string;
  productId: string;
  processedAt: Date;
  entitlement: TransferredEntitlement;
}

export interface SourcePlan {
  label: string;
  playerId: string;
  identities: number;
  /** Game ids whose credit and ad-bonus rows move together. */
  movedGames: string[];
  movedCreditRows: number;
  movedCreditXp: number;
  movedRewardedRows: number;
  movedRewardedXp: number;
  duplicateGames: number;
  duplicateXp: number;
  tenure: TenureAction;
  tenureXpBefore: number | null;
  tenureXpAfter: number | null;
  receipts: PlannedReceipt[];
  intents: number;
  messages: number;
  cosmeticsMoved: CosmeticRow[];
  cosmeticsStay: number;
  name: NameAction;
  nameHistoryRows: number;
  clearsCitizenship: boolean;
  xpBefore: number;
  xpAfter: number;
}

export interface KeepPlan {
  label: string;
  playerId: string;
  xpBefore: number;
  xpAfter: number;
  /** ADR-111: the kept record's XP afterwards never falls below this. */
  highestXpBefore: number;
  earnedAtBefore: Date | null;
  /** The earliest earned date across every involved record (display only). */
  earnedAtAfter: Date | null;
  stampsEarnedNow: boolean;
  isCitizenAfter: boolean;
  isPaidAfter: boolean;
  nameBefore: string | null;
  nameAfter: string | null;
}

export interface MergePlan {
  keep: KeepPlan;
  sources: SourcePlan[];
  refusals: MergeRefusal[];
  warnings: string[];
  changeCount: number;
}

export const INTO_LABEL = "into";
export function sourceLabel(index: number): string {
  return `from #${index + 1}`;
}

/**
 * The merge rules of ADR-128 §2, sources taken in the order given:
 * - a game (credit + ad bonus, as one) moves unless the kept record already holds it
 *   in either table — then both of the source's rows stay, as a duplicate;
 * - the largest tenure row ends on the kept record (a 0-XP row still counts as a row);
 * - the first source name moves only onto a kept record with no name; any other stays
 *   reserved on its source (Q6);
 * - every receipt moves through transferPurchase; identities, intents and messages all
 *   move; cosmetics move unless the kept record owns the same one.
 */
export function planMerge(
  into: MergeRecordState,
  sources: readonly MergeRecordState[],
  now: Date,
): MergePlan {
  const refusals: MergeRefusal[] = [];
  const warnings: string[] = [];
  const all = [into, ...sources];
  const labelOf = (index: number) =>
    index === 0 ? INTO_LABEL : sourceLabel(index - 1);

  all.forEach((state, index) => {
    const label = labelOf(index);
    if (state.hasTesterSnapshot) {
      refusals.push({
        code: "tester_snapshot",
        label,
        message: `${label} has a tester role applied (tester_role_snapshots). Restore it with the tester-role command first.`,
      });
    }
    if (!paidFlagsMatchReceipts(state)) {
      refusals.push({
        code: "paid_flags_mismatch",
        label,
        message: `${label}'s paid flags do not match its receipts (paid=${state.isPaidCitizen}, receipts=${state.receipts.length}). Re-plan before merging.`,
      });
    }
    if (!xpRuleHolds(state)) {
      refusals.push({
        code: "xp_rule_broken",
        label,
        message: `${label}'s XP (${state.xp}) is not the sum of its ledgers (${ledgerXp(state)}). Re-plan before merging.`,
      });
    }
  });

  const keptGames = new Set<string>([
    ...into.credits.map((row) => row.gameId),
    ...into.rewarded.map((row) => row.gameId),
  ]);
  const keptEntitlements = new Set(into.entitlements.map((e) => e.productId));
  const keptCosmetics = new Set(
    into.cosmetics.map((c) => `${c.cosmeticType}\u0000${c.cosmeticId}`),
  );
  let keptTenure = into.tenure?.xpAwarded ?? null;
  let keptName = into.displayName;
  let keptCredits = 0;
  let keptRewarded = 0;
  let changeCount = 0;

  const sourcePlans = sources.map((state, index): SourcePlan => {
    const label = sourceLabel(index);
    if (state.hasPendingName) {
      refusals.push({
        code: "pending_name",
        label,
        message: `${label} has a pending name request. Decide or withdraw it first.`,
      });
    }

    const durableCounts = new Map<string, number>();
    for (const receipt of state.receipts) {
      if (!isCitizenshipProduct(receipt.productId)) {
        durableCounts.set(
          receipt.productId,
          (durableCounts.get(receipt.productId) ?? 0) + 1,
        );
      }
    }
    for (const count of durableCounts.values()) {
      if (count > 1) {
        refusals.push({
          code: "duplicate_durable_receipts",
          label,
          message: `${label} holds more than one receipt for the same durable item. Re-plan before merging.`,
        });
        break;
      }
    }

    const creditByGame = new Map(state.credits.map((r) => [r.gameId, r]));
    const rewardedByGame = new Map(state.rewarded.map((r) => [r.gameId, r]));
    const games = [
      ...new Set([...creditByGame.keys(), ...rewardedByGame.keys()]),
    ].sort();
    const movedGames: string[] = [];
    let movedCreditRows = 0;
    let movedCreditXp = 0;
    let movedRewardedRows = 0;
    let movedRewardedXp = 0;
    let duplicateGames = 0;
    let duplicateXp = 0;
    for (const game of games) {
      const credit = creditByGame.get(game);
      const bonus = rewardedByGame.get(game);
      const xp = (credit?.xpAwarded ?? 0) + (bonus?.xpAwarded ?? 0);
      if (keptGames.has(game)) {
        duplicateGames++;
        duplicateXp += xp;
        continue;
      }
      keptGames.add(game);
      movedGames.push(game);
      if (credit !== undefined) {
        movedCreditRows++;
        movedCreditXp += credit.xpAwarded;
      }
      if (bonus !== undefined) {
        movedRewardedRows++;
        movedRewardedXp += bonus.xpAwarded;
      }
    }
    keptCredits += movedCreditXp;
    keptRewarded += movedRewardedXp;

    const tenureXpBefore = state.tenure?.xpAwarded ?? null;
    let tenure: TenureAction = "none";
    let tenureXpAfter = tenureXpBefore;
    if (tenureXpBefore !== null) {
      if (keptTenure === null) {
        tenure = "move";
        tenureXpAfter = null;
        keptTenure = tenureXpBefore;
      } else if (tenureXpBefore > keptTenure) {
        tenure = "swap";
        tenureXpAfter = keptTenure;
        keptTenure = tenureXpBefore;
      } else {
        tenure = "stay";
      }
    }

    const receipts = state.receipts.map((receipt): PlannedReceipt => {
      const holdsRow = state.entitlements.some(
        (e) =>
          e.productId === receipt.productId &&
          e.purchaseToken === receipt.purchaseToken,
      );
      let entitlement: TransferredEntitlement = "none";
      if (holdsRow) {
        if (keptEntitlements.has(receipt.productId)) {
          entitlement = "dropped_duplicate";
          warnings.push(
            `${label}'s receipt for ${receipt.productId} is for an item ${INTO_LABEL} already owns: a DOUBLE CHARGE. The receipt moves; the duplicate ownership row is removed. Consider a refund.`,
          );
        } else {
          entitlement = "moved";
          keptEntitlements.add(receipt.productId);
        }
      }
      return { ...receipt, entitlement };
    });

    const cosmeticsMoved: CosmeticRow[] = [];
    let cosmeticsStay = 0;
    for (const cosmetic of state.cosmetics) {
      const key = `${cosmetic.cosmeticType}\u0000${cosmetic.cosmeticId}`;
      if (keptCosmetics.has(key)) {
        cosmeticsStay++;
      } else {
        keptCosmetics.add(key);
        cosmeticsMoved.push(cosmetic);
      }
    }

    let name: NameAction = "none";
    if (state.displayName !== null) {
      if (keptName === null) {
        name = "move";
        keptName = state.displayName;
        if (into.hasPendingName) {
          refusals.push({
            code: "pending_name",
            label: INTO_LABEL,
            message: `${INTO_LABEL} has a pending name request and a name would move onto it. Decide or withdraw it first.`,
          });
        }
      } else {
        name = "reserved";
        warnings.push(
          `${label}'s name stays reserved on ${label} (${INTO_LABEL} already has a name). The name tool can clear it later.`,
        );
      }
    }

    // Every receipt leaves, so the source ends neither paid nor a citizen.
    const clearsCitizenship =
      state.citizenshipEarnedAt !== null || state.isCitizen;

    const lastActivity = Math.max(
      state.lastLoginAt.getTime(),
      state.identityLastLoginAt?.getTime() ?? 0,
      ...state.credits.map((r) => r.at.getTime()),
      ...state.rewarded.map((r) => r.at.getTime()),
      state.tenure?.grantedAt.getTime() ?? 0,
    );
    if (now.getTime() - lastActivity < RECENT_ACTIVITY_MS) {
      warnings.push(
        `${label} was active in the last 24 hours (last at ${new Date(lastActivity).toISOString()}). A page still open on it can keep writing to it: run the required follow-up dry run 24 hours after the merge.`,
      );
    }

    const remainingCredits = state.credits
      .filter((r) => !movedGames.includes(r.gameId))
      .reduce((total, r) => total + r.xpAwarded, 0);
    const remainingRewarded = state.rewarded
      .filter((r) => !movedGames.includes(r.gameId))
      .reduce((total, r) => total + r.xpAwarded, 0);

    const plan: SourcePlan = {
      label,
      playerId: state.playerId,
      identities: state.identityCount,
      movedGames,
      movedCreditRows,
      movedCreditXp,
      movedRewardedRows,
      movedRewardedXp,
      duplicateGames,
      duplicateXp,
      tenure,
      tenureXpBefore,
      tenureXpAfter,
      receipts,
      intents: state.intentCount,
      messages: state.messageCount,
      cosmeticsMoved,
      cosmeticsStay,
      name,
      nameHistoryRows: name === "move" ? state.nameHistoryCount : 0,
      clearsCitizenship,
      xpBefore: state.xp,
      xpAfter: remainingCredits + remainingRewarded + (tenureXpAfter ?? 0),
    };
    changeCount +=
      plan.identities +
      plan.movedCreditRows +
      plan.movedRewardedRows +
      (tenure === "move" || tenure === "swap" ? 1 : 0) +
      plan.receipts.length +
      plan.intents +
      plan.messages +
      plan.cosmeticsMoved.length +
      (name === "move" ? 1 : 0) +
      (clearsCitizenship ? 1 : 0);
    return plan;
  });

  const intoCredits = into.credits.reduce((t, r) => t + r.xpAwarded, 0);
  const intoRewarded = into.rewarded.reduce((t, r) => t + r.xpAwarded, 0);
  const xpAfter =
    intoCredits + intoRewarded + keptCredits + keptRewarded + (keptTenure ?? 0);
  const earnedDates = all
    .map((state) => state.citizenshipEarnedAt)
    .filter((date): date is Date => date !== null);
  const earliestEarned =
    earnedDates.length === 0
      ? null
      : new Date(Math.min(...earnedDates.map((date) => date.getTime())));
  const stampsEarnedNow =
    earliestEarned === null && xpAfter >= CITIZENSHIP_XP_THRESHOLD;
  const isPaidAfter =
    into.isPaidCitizen || sourcePlans.some((s) => s.receipts.length > 0);
  const keep: KeepPlan = {
    label: INTO_LABEL,
    playerId: into.playerId,
    xpBefore: into.xp,
    xpAfter,
    highestXpBefore: Math.max(...all.map((state) => state.xp)),
    earnedAtBefore: into.citizenshipEarnedAt,
    earnedAtAfter: stampsEarnedNow ? now : earliestEarned,
    stampsEarnedNow,
    isCitizenAfter:
      into.isCitizen ||
      isPaidAfter ||
      earliestEarned !== null ||
      stampsEarnedNow,
    isPaidAfter,
    nameBefore: into.displayName,
    nameAfter: keptName,
  };
  const earnedChanges =
    (earliestEarned !== null &&
      (into.citizenshipEarnedAt === null ||
        earliestEarned.getTime() < into.citizenshipEarnedAt.getTime())) ||
    stampsEarnedNow;
  if (earnedChanges) {
    changeCount++;
  }
  // The real run's invariant, predicted, so the dry run refuses what the real run
  // would roll back (a duplicate game worth more on a source than on `into`).
  if (keep.xpAfter < keep.highestXpBefore) {
    refusals.push({
      code: "xp_would_drop",
      label: INTO_LABEL,
      message: `${INTO_LABEL}'s XP afterwards (${keep.xpAfter}) would be below the highest XP before (${keep.highestXpBefore}). Re-plan before merging.`,
    });
  }
  if (into.hasPendingName && keep.nameAfter === keep.nameBefore) {
    warnings.push(
      `${INTO_LABEL} has a pending name request; it is left as it is.`,
    );
  }
  if (changeCount === 0) {
    refusals.push({
      code: "nothing_to_move",
      label: INTO_LABEL,
      message:
        "Nothing to move: the sources hold nothing a merge would change.",
    });
  }
  return { keep, sources: sourcePlans, refusals, warnings, changeCount };
}

// ── SQL ────────────────────────────────────────────────────────────────────

const SCHEMA_READY_SQL = `
SELECT 1 FROM schema_migrations WHERE filename = $1
`;

// A missing schema_migrations table means no runner ever ran: not ready.
const SCHEMA_TABLE_SQL = `SELECT to_regclass('schema_migrations') IS NOT NULL AS ok`;

const LOCK_ALL_SQL = `
SELECT id FROM players WHERE id = ANY($1::uuid[]) ORDER BY id FOR UPDATE
`;

const EXISTING_SQL = `SELECT id FROM players WHERE id = ANY($1::uuid[])`;

// $1 is the ordered [into, ...sources] list, so a fingerprint taken for one
// arrangement never validates another. Each part is one table's involved rows.
const FINGERPRINT_SQL = `
SELECT md5(string_agg(part, '#' ORDER BY n)) AS fingerprint FROM (
  SELECT 0 AS n, array_to_string($1::uuid[], ',') AS part
  UNION ALL SELECT 1, coalesce(string_agg(row_to_json(t)::text, '|' ORDER BY t.id), '')
    FROM players t WHERE t.id = ANY($1::uuid[])
  UNION ALL SELECT 2, coalesce(string_agg(row_to_json(t)::text, '|' ORDER BY t.platform, t.platform_user_id), '')
    FROM player_identities t WHERE t.player_id = ANY($1::uuid[])
  UNION ALL SELECT 3, coalesce(string_agg(row_to_json(t)::text, '|' ORDER BY t.game_id, t.player_id), '')
    FROM player_match_xp_credits t WHERE t.player_id = ANY($1::uuid[])
  UNION ALL SELECT 4, coalesce(string_agg(row_to_json(t)::text, '|' ORDER BY t.game_id, t.player_id), '')
    FROM player_rewarded_match_xp t WHERE t.player_id = ANY($1::uuid[])
  UNION ALL SELECT 5, coalesce(string_agg(row_to_json(t)::text, '|' ORDER BY t.player_id, t.kind), '')
    FROM player_xp_grants t WHERE t.player_id = ANY($1::uuid[])
  UNION ALL SELECT 6, coalesce(string_agg(row_to_json(t)::text, '|' ORDER BY t.id), '')
    FROM player_name_history t WHERE t.player_id = ANY($1::uuid[])
  UNION ALL SELECT 7, coalesce(string_agg(row_to_json(t)::text, '|' ORDER BY t.id), '')
    FROM player_messages t WHERE t.player_id = ANY($1::uuid[])
  UNION ALL SELECT 8, coalesce(string_agg(row_to_json(t)::text, '|' ORDER BY t.player_id, t.cosmetic_type, t.cosmetic_id), '')
    FROM player_cosmetic_ownership t WHERE t.player_id = ANY($1::uuid[])
  UNION ALL SELECT 9, coalesce(string_agg(row_to_json(t)::text, '|' ORDER BY t.id), '')
    FROM purchase_intents t WHERE t.player_id = ANY($1::uuid[])
  UNION ALL SELECT 10, coalesce(string_agg(row_to_json(t)::text, '|' ORDER BY t.purchase_token), '')
    FROM processed_purchases t WHERE t.player_id = ANY($1::uuid[])
  UNION ALL SELECT 11, coalesce(string_agg(row_to_json(t)::text, '|' ORDER BY t.player_id, t.product_id), '')
    FROM player_entitlements t WHERE t.player_id = ANY($1::uuid[])
  UNION ALL SELECT 12, coalesce(string_agg(row_to_json(t)::text, '|' ORDER BY t.purchase_token, t.seen_player_id), '')
    FROM purchase_holder_sightings t
    WHERE t.holder_player_id = ANY($1::uuid[]) OR t.seen_player_id = ANY($1::uuid[])
  UNION ALL SELECT 13, coalesce(string_agg(row_to_json(t)::text, '|' ORDER BY t.player_id), '')
    FROM tester_role_snapshots t WHERE t.player_id = ANY($1::uuid[])
) parts
`;

// The profile card's own order (NameChangeRepository LATEST_SQL): pending first.
const STATE_PLAYERS_SQL = `
SELECT p.id, p.created_at, p.last_login_at, p.xp, p.is_citizen, p.is_paid_citizen,
       p.citizenship_earned_at, p.citizenship_purchased_at, p.display_name,
       (SELECT h.moderation_status FROM player_name_history h WHERE h.player_id = p.id
        ORDER BY (h.moderation_status = 'pending') DESC, h.id DESC LIMIT 1) AS latest_name_status,
       EXISTS (SELECT 1 FROM player_name_history h
               WHERE h.player_id = p.id AND h.moderation_status = 'pending') AS has_pending_name,
       (SELECT count(*) FROM player_name_history h WHERE h.player_id = p.id)::int AS name_history_count,
       (SELECT count(*) FROM player_identities i WHERE i.player_id = p.id)::int AS identity_count,
       (SELECT min(i.created_at) FROM player_identities i WHERE i.player_id = p.id) AS identity_first_created_at,
       (SELECT max(i.last_login_at) FROM player_identities i WHERE i.player_id = p.id) AS identity_last_login_at,
       (SELECT count(*) FROM purchase_intents pi WHERE pi.player_id = p.id)::int AS intent_count,
       (SELECT count(*) FROM purchase_intents pi WHERE pi.player_id = p.id AND pi.used_at IS NULL)::int AS unused_intent_count,
       (SELECT count(*) FROM player_messages m WHERE m.player_id = p.id)::int AS message_count,
       EXISTS (SELECT 1 FROM tester_role_snapshots s WHERE s.player_id = p.id) AS has_tester_snapshot
FROM players p
WHERE p.id = ANY($1::uuid[])
`;

// The before-state the audit row keeps: the players rows without the display name.
const BEFORE_STATE_SQL = `
SELECT coalesce(jsonb_agg(to_jsonb(p) - 'display_name' ORDER BY array_position($1::uuid[], p.id)), '[]'::jsonb) AS before
FROM players p WHERE p.id = ANY($1::uuid[])
`;

// Swaps the two tenure rows' contents, not their keys: the PK is checked per row,
// so moving the keys would clash halfway. UPDATE … FROM reads the pre-statement rows.
const SWAP_TENURE_SQL = `
UPDATE player_xp_grants g
SET xp_awarded = o.xp_awarded, evidence = o.evidence, granted_at = o.granted_at
FROM player_xp_grants o
WHERE g.kind = 'tenure' AND o.kind = 'tenure'
  AND ((g.player_id = $1 AND o.player_id = $2) OR (g.player_id = $2 AND o.player_id = $1))
`;

const MOVE_COSMETICS_SQL = `
UPDATE player_cosmetic_ownership c SET player_id = $2
WHERE c.player_id = $1
  AND NOT EXISTS (SELECT 1 FROM player_cosmetic_ownership k
                  WHERE k.player_id = $2 AND k.cosmetic_type = c.cosmetic_type
                    AND k.cosmetic_id = c.cosmetic_id)
`;

// The approved row is written with its status EXPLICIT (the column defaults to
// 'approved', a trap for every other writer) and is the newest row, so the card
// shows the moved name as approved, never an older source row's decline.
const INSERT_MOVED_NAME_SQL = `
INSERT INTO player_name_history
  (player_id, old_display_name, new_display_name, moderation_status, decided_at)
VALUES ($1, NULL, $2, 'approved', now())
`;

const KEEP_EARNED_SQL = `
UPDATE players k
SET citizenship_earned_at = e.earliest,
    is_citizen = k.is_citizen OR e.earliest IS NOT NULL,
    updated_at = now()
FROM (SELECT min(citizenship_earned_at) AS earliest FROM players
      WHERE id = ANY($2::uuid[])) e
WHERE k.id = $1
`;

const CLEAR_SOURCE_CITIZENSHIP_SQL = `
UPDATE players SET citizenship_earned_at = NULL, is_citizen = is_paid_citizen,
                   updated_at = now()
WHERE id = ANY($1::uuid[])
`;

const RECOMPUTE_XP_SQL = `
UPDATE players p
SET xp = coalesce((SELECT sum(xp_awarded) FROM player_match_xp_credits c WHERE c.player_id = p.id), 0)
       + coalesce((SELECT sum(xp_awarded) FROM player_rewarded_match_xp r WHERE r.player_id = p.id), 0)
       + coalesce((SELECT sum(xp_awarded) FROM player_xp_grants g WHERE g.player_id = p.id), 0),
    updated_at = now()
WHERE p.id = ANY($1::uuid[])
`;

const STAMP_EARNED_SQL = `
UPDATE players SET citizenship_earned_at = now(), is_citizen = true, updated_at = now()
WHERE id = $1 AND xp >= $2 AND citizenship_earned_at IS NULL
`;

const INVARIANTS_SQL = `
SELECT p.id, p.xp, p.is_paid_citizen, p.citizenship_purchased_at IS NOT NULL AS has_purchased_at,
       EXISTS (SELECT 1 FROM processed_purchases pp WHERE pp.player_id = p.id) AS has_receipt,
       EXISTS (SELECT 1 FROM player_identities i WHERE i.player_id = p.id) AS has_identity,
       coalesce((SELECT sum(xp_awarded) FROM player_match_xp_credits c WHERE c.player_id = p.id), 0)
       + coalesce((SELECT sum(xp_awarded) FROM player_rewarded_match_xp r WHERE r.player_id = p.id), 0)
       + coalesce((SELECT sum(xp_awarded) FROM player_xp_grants g WHERE g.player_id = p.id), 0) AS ledger_xp
FROM players p WHERE p.id = ANY($1::uuid[])
`;

const INSERT_AUDIT_SQL = `
INSERT INTO player_merges
  (operator, into_player_id, from_player_ids, fingerprint, moved, before_state)
VALUES ($1, $2, $3::uuid[], $4, $5::jsonb, $6::jsonb)
`;

// ── Outcomes ───────────────────────────────────────────────────────────────

export interface MergeRequest {
  into: string;
  sources: readonly string[];
}

/** Rows actually changed, per source — what the audit row and the summary line carry. */
export interface MovedCounts {
  label: string;
  receipts: number;
  entitlementsDropped: number;
  intents: number;
  identities: number;
  credits: number;
  rewarded: number;
  tenure: TenureAction;
  messages: number;
  cosmetics: number;
  nameMoved: boolean;
  nameHistoryRows: number;
}

export interface MergeInspection {
  states: MergeRecordState[];
  plan: MergePlan;
  sightings: HolderSightingRow[];
  fingerprint: string;
}

export type InspectOutcome =
  | { status: "schema_missing" }
  | { status: "no_such_player"; labels: string[] }
  | ({ status: "inspected" } & MergeInspection);

export type CommitOutcome =
  | { status: "schema_missing" }
  | { status: "no_such_player"; labels: string[] }
  | { status: "fingerprint_mismatch" }
  | { status: "refused"; refusals: MergeRefusal[] }
  | { status: "invariant_failed"; failures: string[] }
  | {
      status: "merged";
      plan: MergePlan;
      moved: MovedCounts[];
      keepXpAfter: number;
    };

/** The two operations the command needs — a fake stands in for it in the unit tests. */
export interface ProfileMergeStore {
  inspect(request: MergeRequest, now: Date): Promise<InspectOutcome>;
  commit(
    request: MergeRequest & { expectedFingerprint: string; operator: string },
    now: Date,
  ): Promise<CommitOutcome>;
}

class InvariantFailure extends Error {
  constructor(readonly failures: string[]) {
    super("merge invariants failed");
  }
}

class EarlyOutcome extends Error {
  constructor(readonly outcome: CommitOutcome) {
    super(outcome.status);
  }
}

// ── Repository ─────────────────────────────────────────────────────────────

export class ProfileMergeRepository implements ProfileMergeStore {
  private readonly payments: PaymentsRepository;

  constructor(private readonly pool: Pool) {
    this.payments = new PaymentsRepository(pool);
  }

  /** Read-only, one snapshot: the dry run, and the command's check before its prompt. */
  async inspect(request: MergeRequest, now: Date): Promise<InspectOutcome> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
      await client.query("SET LOCAL TIME ZONE 'UTC'");
      if (!(await this.schemaReady(client))) {
        return { status: "schema_missing" };
      }
      const ids = [request.into, ...request.sources];
      const missing = await this.missingLabels(client, ids);
      if (missing.length > 0) {
        return { status: "no_such_player", labels: missing };
      }
      return {
        status: "inspected",
        ...(await this.inspection(client, ids, now)),
      };
    } finally {
      try {
        await client.query("ROLLBACK");
      } catch {
        // Read-only: a failed ROLLBACK loses nothing; the original error (if any) wins.
      }
      client.release();
    }
  }

  /**
   * The real run, in ONE transaction: lock every involved players row in id order,
   * recompute the fingerprint, re-check every precondition, apply the plan, check the
   * invariants, write the audit row, commit. Anything else rolls the whole run back.
   * READ COMMITTED on purpose: once the locks are held no child row with a foreign key
   * to these players can commit, and each later statement sees every row that did.
   */
  async commit(
    request: MergeRequest & { expectedFingerprint: string; operator: string },
    now: Date,
  ): Promise<CommitOutcome> {
    const ids = [request.into, ...request.sources];
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SET LOCAL TIME ZONE 'UTC'");
      const locked = await client.query(LOCK_ALL_SQL, [ids]);
      if (!(await this.schemaReady(client))) {
        throw new EarlyOutcome({ status: "schema_missing" });
      }
      if (locked.rows.length !== ids.length) {
        throw new EarlyOutcome({
          status: "no_such_player",
          labels: await this.missingLabels(client, ids),
        });
      }
      const inspection = await this.inspection(client, ids, now);
      if (inspection.fingerprint !== request.expectedFingerprint) {
        throw new EarlyOutcome({ status: "fingerprint_mismatch" });
      }
      if (inspection.plan.refusals.length > 0) {
        throw new EarlyOutcome({
          status: "refused",
          refusals: inspection.plan.refusals,
        });
      }
      const before = await client.query(BEFORE_STATE_SQL, [ids]);
      const moved = await this.apply(client, request, inspection.plan);
      const keepXpAfter = await this.checkInvariants(
        client,
        request,
        inspection.plan,
      );
      await client.query(INSERT_AUDIT_SQL, [
        request.operator,
        request.into,
        request.sources,
        inspection.fingerprint,
        JSON.stringify({ sources: moved }),
        JSON.stringify(before.rows[0].before),
      ]);
      await client.query("COMMIT");
      return {
        status: "merged",
        plan: inspection.plan,
        moved,
        keepXpAfter,
      };
    } catch (error) {
      try {
        await client.query("ROLLBACK");
      } catch {
        // ROLLBACK failed (connection gone) — surface the ORIGINAL error.
      }
      if (error instanceof EarlyOutcome) {
        return error.outcome;
      }
      if (error instanceof InvariantFailure) {
        return { status: "invariant_failed", failures: error.failures };
      }
      throw error;
    } finally {
      client.release();
    }
  }

  private async schemaReady(client: PoolClient): Promise<boolean> {
    const table = await client.query(SCHEMA_TABLE_SQL);
    if (table.rows[0]?.ok !== true) {
      return false;
    }
    const res = await client.query(SCHEMA_READY_SQL, [MERGE_MIGRATION]);
    return res.rows.length > 0;
  }

  private async missingLabels(
    client: PoolClient,
    ids: readonly string[],
  ): Promise<string[]> {
    const res = await client.query(EXISTING_SQL, [ids]);
    const found = new Set(res.rows.map((row) => String(row.id)));
    return ids
      .map((id, index) =>
        found.has(id)
          ? null
          : index === 0
            ? INTO_LABEL
            : sourceLabel(index - 1),
      )
      .filter((label): label is string => label !== null);
  }

  private async inspection(
    client: PoolClient,
    ids: readonly string[],
    now: Date,
  ): Promise<MergeInspection> {
    const states = await this.readStates(client, ids);
    const [into, ...sources] = states;
    const fingerprint = await client.query(FINGERPRINT_SQL, [ids]);
    return {
      states,
      plan: planMerge(into, sources, now),
      sightings: await this.payments.readHolderSightings(client, ids),
      fingerprint: String(fingerprint.rows[0].fingerprint),
    };
  }

  /** States in the order of `ids`. Every id must exist (checked by the caller). */
  async readStates(
    client: PoolClient,
    ids: readonly string[],
  ): Promise<MergeRecordState[]> {
    const players = await client.query(STATE_PLAYERS_SQL, [ids]);
    const byTable = async (sql: string) => {
      const res = await client.query(sql, [ids]);
      const grouped = new Map<string, Record<string, unknown>[]>();
      for (const row of res.rows) {
        const key = String(row.player_id);
        grouped.set(key, [...(grouped.get(key) ?? []), row]);
      }
      return grouped;
    };
    const credits = await byTable(
      `SELECT player_id, game_id, xp_awarded, credited_at AS at
       FROM player_match_xp_credits WHERE player_id = ANY($1::uuid[]) ORDER BY game_id`,
    );
    const rewarded = await byTable(
      `SELECT player_id, game_id, xp_awarded, granted_at AS at
       FROM player_rewarded_match_xp WHERE player_id = ANY($1::uuid[]) ORDER BY game_id`,
    );
    const tenure = await byTable(
      `SELECT player_id, xp_awarded, granted_at FROM player_xp_grants
       WHERE player_id = ANY($1::uuid[]) AND kind = 'tenure'`,
    );
    const receipts = await byTable(
      `SELECT player_id, purchase_token, product_id, processed_at
       FROM processed_purchases WHERE player_id = ANY($1::uuid[])
       ORDER BY processed_at, purchase_token`,
    );
    const entitlements = await byTable(
      `SELECT player_id, product_id, purchase_token FROM player_entitlements
       WHERE player_id = ANY($1::uuid[]) ORDER BY product_id`,
    );
    const cosmetics = await byTable(
      `SELECT player_id, cosmetic_type, cosmetic_id FROM player_cosmetic_ownership
       WHERE player_id = ANY($1::uuid[]) ORDER BY cosmetic_type, cosmetic_id`,
    );
    const rowsFor = (map: Map<string, Record<string, unknown>[]>, id: string) =>
      map.get(id) ?? [];
    const ledger = (rows: Record<string, unknown>[]): LedgerRow[] =>
      rows.map((row) => ({
        gameId: String(row.game_id),
        xpAwarded: Number(row.xp_awarded),
        at: row.at as Date,
      }));

    return ids.map((id): MergeRecordState => {
      const row = players.rows.find((candidate) => String(candidate.id) === id);
      if (row === undefined) {
        throw new Error("readStates: an involved player row is missing");
      }
      const tenureRow = rowsFor(tenure, id)[0];
      return {
        playerId: id,
        createdAt: row.created_at as Date,
        lastLoginAt: row.last_login_at as Date,
        xp: Number(row.xp),
        isCitizen: Boolean(row.is_citizen),
        isPaidCitizen: Boolean(row.is_paid_citizen),
        citizenshipEarnedAt: (row.citizenship_earned_at as Date | null) ?? null,
        citizenshipPurchasedAt:
          (row.citizenship_purchased_at as Date | null) ?? null,
        displayName: (row.display_name as string | null) ?? null,
        latestNameStatus: (row.latest_name_status as string | null) ?? null,
        hasPendingName: Boolean(row.has_pending_name),
        nameHistoryCount: Number(row.name_history_count),
        identityCount: Number(row.identity_count),
        identityFirstCreatedAt:
          (row.identity_first_created_at as Date | null) ?? null,
        identityLastLoginAt:
          (row.identity_last_login_at as Date | null) ?? null,
        credits: ledger(rowsFor(credits, id)),
        rewarded: ledger(rowsFor(rewarded, id)),
        tenure:
          tenureRow === undefined
            ? null
            : {
                xpAwarded: Number(tenureRow.xp_awarded),
                grantedAt: tenureRow.granted_at as Date,
              },
        receipts: rowsFor(receipts, id).map((r) => ({
          purchaseToken: String(r.purchase_token),
          productId: String(r.product_id),
          processedAt: r.processed_at as Date,
        })),
        entitlements: rowsFor(entitlements, id).map((r) => ({
          productId: String(r.product_id),
          purchaseToken: String(r.purchase_token),
        })),
        intentCount: Number(row.intent_count),
        unusedIntentCount: Number(row.unused_intent_count),
        messageCount: Number(row.message_count),
        cosmetics: rowsFor(cosmetics, id).map((r) => ({
          cosmeticType: String(r.cosmetic_type),
          cosmeticId: String(r.cosmetic_id),
        })),
        hasTesterSnapshot: Boolean(row.has_tester_snapshot),
      };
    });
  }

  private async apply(
    client: PoolClient,
    request: MergeRequest,
    plan: MergePlan,
  ): Promise<MovedCounts[]> {
    const keep = request.into;
    const moved: MovedCounts[] = [];
    for (const source of plan.sources) {
      const from = source.playerId;
      let entitlementsDropped = 0;
      for (const receipt of source.receipts) {
        const outcome = await this.payments.transferPurchase(
          client,
          receipt.purchaseToken,
          from,
          keep,
        );
        if (outcome.entitlement === "dropped_duplicate") {
          entitlementsDropped++;
        }
      }
      const intents = await this.payments.moveRemainingIntents(
        client,
        from,
        keep,
      );
      const identities = await client.query(
        `UPDATE player_identities SET player_id = $2 WHERE player_id = $1`,
        [from, keep],
      );
      const credits = await client.query(
        `UPDATE player_match_xp_credits SET player_id = $2
         WHERE player_id = $1 AND game_id = ANY($3::text[])`,
        [from, keep, source.movedGames],
      );
      const rewarded = await client.query(
        `UPDATE player_rewarded_match_xp SET player_id = $2
         WHERE player_id = $1 AND game_id = ANY($3::text[])`,
        [from, keep, source.movedGames],
      );
      if (source.tenure === "move") {
        await client.query(
          `UPDATE player_xp_grants SET player_id = $2
           WHERE player_id = $1 AND kind = 'tenure'`,
          [from, keep],
        );
      } else if (source.tenure === "swap") {
        await client.query(SWAP_TENURE_SQL, [from, keep]);
      }
      const messages = await client.query(
        `UPDATE player_messages SET player_id = $2 WHERE player_id = $1`,
        [from, keep],
      );
      const cosmetics = await client.query(MOVE_COSMETICS_SQL, [from, keep]);
      let nameHistoryRows = 0;
      if (source.name === "move") {
        const name = await client.query(
          `SELECT display_name FROM players WHERE id = $1`,
          [from],
        );
        const displayName = String(name.rows[0].display_name);
        // Source first: players_display_name_uq would see the name twice otherwise.
        await client.query(
          `UPDATE players SET display_name = NULL, updated_at = now() WHERE id = $1`,
          [from],
        );
        await client.query(
          `UPDATE players SET display_name = $2, updated_at = now() WHERE id = $1`,
          [keep, displayName],
        );
        const history = await client.query(
          `UPDATE player_name_history SET player_id = $2 WHERE player_id = $1`,
          [from, keep],
        );
        nameHistoryRows = history.rowCount ?? 0;
        await client.query(INSERT_MOVED_NAME_SQL, [keep, displayName]);
      }
      moved.push({
        label: source.label,
        receipts: source.receipts.length,
        entitlementsDropped,
        intents,
        identities: identities.rowCount ?? 0,
        credits: credits.rowCount ?? 0,
        rewarded: rewarded.rowCount ?? 0,
        tenure: source.tenure,
        messages: messages.rowCount ?? 0,
        cosmetics: cosmetics.rowCount ?? 0,
        nameMoved: source.name === "move",
        nameHistoryRows,
      });
    }
    const all = [keep, ...request.sources];
    await client.query(KEEP_EARNED_SQL, [keep, all]);
    await client.query(CLEAR_SOURCE_CITIZENSHIP_SQL, [request.sources]);
    await client.query(RECOMPUTE_XP_SQL, [all]);
    await client.query(STAMP_EARNED_SQL, [keep, CITIZENSHIP_XP_THRESHOLD]);
    return moved;
  }

  /** ADR-128 §2.6. Throws InvariantFailure (→ rollback); returns the kept record's XP. */
  private async checkInvariants(
    client: PoolClient,
    request: MergeRequest,
    plan: MergePlan,
  ): Promise<number> {
    const res = await client.query(INVARIANTS_SQL, [
      [request.into, ...request.sources],
    ]);
    const failures: string[] = [];
    let keepXp = 0;
    for (const row of res.rows) {
      const id = String(row.id);
      const isKeep = id === request.into;
      const label = isKeep
        ? INTO_LABEL
        : sourceLabel(request.sources.indexOf(id));
      const xp = Number(row.xp);
      const paid = Boolean(row.is_paid_citizen);
      const hasReceipt = Boolean(row.has_receipt);
      if (paid !== hasReceipt || Boolean(row.has_purchased_at) !== hasReceipt) {
        failures.push(`${label}'s paid flags do not match its receipts`);
      }
      if (xp !== Number(row.ledger_xp)) {
        failures.push(`${label}'s XP is not the sum of its ledgers`);
      }
      if (isKeep) {
        keepXp = xp;
        if (xp < plan.keep.highestXpBefore) {
          failures.push(
            `${INTO_LABEL}'s XP (${xp}) would be below the highest XP before (${plan.keep.highestXpBefore})`,
          );
        }
      } else {
        if (hasReceipt) {
          failures.push(`${label} still holds a receipt`);
        }
        if (row.has_identity === true) {
          failures.push(`${label} still holds an identity`);
        }
      }
    }
    if (failures.length > 0) {
      throw new InvariantFailure(failures);
    }
    return keepXp;
  }
}
