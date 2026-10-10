// The fixed tester roles (task 0425) — what `npm run tester-role -- apply <id> <role>`
// writes onto an allowlisted tester's `players` row.
//
// ⛔ Deterministic by owner ruling (2026-10-09): a role is a FIXED property set that lives
// here, in the repository. Adding or changing a role is a code change plus review. The
// command takes only a role id at run time — never a property value — so nothing typed
// on the box (or by an agent) can invent a new state.
//
// Every value below was checked against the code path that produces the same state for
// a real player (PlayerProfileRepository.creditMatchXp + GRANT_CITIZENSHIP_SQL,
// PaymentsRepository.GRANT_FLAGS_SQL, a fresh players row), and every role satisfies
// the three `players` CHECK constraints (migrations/006). Both are asserted in
// tests/profile-server/TesterRoles.test.ts and, against real Postgres, in
// tests/integration/TesterRole.it.test.ts. Runbook:
// ai-agents/knowledge-base/profile-tester-roles-runbook.md.

import {
  CITIZENSHIP_XP_THRESHOLD,
  XP_PER_MATCH,
} from "../core/profile/Citizenship";

/** Low, fixed XP for a player who has played some matches but is far from citizenship. */
export const TESTER_NON_CITIZEN_XP = 10;

export type TesterRoleId =
  | "non-citizen"
  | "almost-citizen"
  | "earned-citizen"
  | "paid-citizen"
  | "brand-new";

export interface TesterRole {
  readonly id: TesterRoleId;
  readonly xp: number;
  readonly isCitizen: boolean;
  readonly isPaidCitizen: boolean;
  /** Stamp `citizenship_earned_at` with the transaction's now(); otherwise it is cleared. */
  readonly stampEarnedAt: boolean;
  /** Stamp `citizenship_purchased_at` with the transaction's now(); otherwise it is cleared. */
  readonly stampPurchasedAt: boolean;
  /** Delete this tester's `kind = 'tenure'` grant row (only `brand-new`). Otherwise it is left as it is. */
  readonly clearTenureGrant: boolean;
  /** One line for the runbook and the command's output. */
  readonly summary: string;
}

const role = (value: TesterRole): TesterRole => Object.freeze(value);

export const TESTER_ROLES: Readonly<Record<TesterRoleId, TesterRole>> =
  Object.freeze({
    // Has played some matches, not a citizen yet.
    "non-citizen": role({
      id: "non-citizen",
      xp: TESTER_NON_CITIZEN_XP,
      isCitizen: false,
      isPaidCitizen: false,
      stampEarnedAt: false,
      stampPurchasedAt: false,
      clearTenureGrant: false,
      summary: `${TESTER_NON_CITIZEN_XP} XP, not a citizen, not paid`,
    }),
    // One match credit short: the next creditMatchXp crosses the threshold and
    // GRANT_CITIZENSHIP_SQL flips is_citizen and stamps earned_at. Written as
    // threshold − XP_PER_MATCH (not − 1) so it stays "one match away" if the two move
    // together (ADR-111).
    "almost-citizen": role({
      id: "almost-citizen",
      xp: CITIZENSHIP_XP_THRESHOLD - XP_PER_MATCH,
      isCitizen: false,
      isPaidCitizen: false,
      stampEarnedAt: false,
      stampPurchasedAt: false,
      clearTenureGrant: false,
      summary: `${CITIZENSHIP_XP_THRESHOLD - XP_PER_MATCH} XP (one match short), not a citizen, not paid`,
    }),
    // What creditMatchXp + GRANT_CITIZENSHIP_SQL leave at the first crossing.
    "earned-citizen": role({
      id: "earned-citizen",
      xp: CITIZENSHIP_XP_THRESHOLD,
      isCitizen: true,
      isPaidCitizen: false,
      stampEarnedAt: true,
      stampPurchasedAt: false,
      clearTenureGrant: false,
      summary: `${CITIZENSHIP_XP_THRESHOLD} XP, earned citizen, not paid`,
    }),
    // What PaymentsRepository.GRANT_FLAGS_SQL leaves for a buyer who never earned
    // (chk_paid_implies_citizen forces is_citizen). ⛔ The flags only: NO
    // processed_purchases row and NO purchase_intents row (owner ruling, 2026-10-09).
    "paid-citizen": role({
      id: "paid-citizen",
      xp: TESTER_NON_CITIZEN_XP,
      isCitizen: true,
      isPaidCitizen: true,
      stampEarnedAt: false,
      stampPurchasedAt: true,
      clearTenureGrant: false,
      summary: `${TESTER_NON_CITIZEN_XP} XP, paid citizen (flags only, no purchase record)`,
    }),
    // A fresh players row, plus the one-time tenure check undone so login answers
    // grantChecks.tenure = "pending" again and the gift popup can show.
    "brand-new": role({
      id: "brand-new",
      xp: 0,
      isCitizen: false,
      isPaidCitizen: false,
      stampEarnedAt: false,
      stampPurchasedAt: false,
      clearTenureGrant: true,
      summary: "0 XP, not a citizen, not paid, tenure gift check reset",
    }),
  });

export const TESTER_ROLE_IDS = Object.freeze(
  Object.keys(TESTER_ROLES) as TesterRoleId[],
);

export function isTesterRoleId(value: string): value is TesterRoleId {
  return Object.prototype.hasOwnProperty.call(TESTER_ROLES, value);
}
