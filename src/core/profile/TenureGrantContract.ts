import { z } from "zod";
import {
  TENURE_MIN_DAYS,
  TENURE_XP_CAP,
  TENURE_XP_PER_DAY,
} from "./Citizenship";

/**
 * Shared client↔profile-server WIRE contract and the pure amount rule for the
 * one-time tenure XP grant (task 0253): `POST /v1/profile/tenure-grant`. The
 * LoginContract.ts sibling — the client posts, and the server validates and
 * computes, exactly what is defined here. No I/O, no clocks.
 *
 * The policy is ADR-112 as amended by the 2026-09-15 redesign:
 *  - the caller is the Bearer session alone — the body carries no id;
 *  - the evidence is two day counts from the player's own device, which the
 *    server cannot verify; it bounds the harm instead: it computes the amount
 *    ITSELF (a client-sent amount is stripped by zod and never read) and caps it;
 *  - the check is ONE-TIME and FINAL: every checked claim writes a
 *    `player_xp_grants` row, a 0-XP row included, and that row — not anything on
 *    the device — is the "already checked" marker (`grantChecks.tenure` on
 *    `POST /v1/login` reads it).
 *
 * Errors:
 *   400 bad_request                                — body fails TenureGrantRequestSchema / malformed JSON
 *   401 session_expired | session_invalid          — no, expired or invalid Bearer token
 *   503 session_unavailable                        — no usable PROFILE_SESSION_SECRET
 *   503 tenure_grant_unavailable                   — the route is not wired to a repository
 *   404 not_found                                  — the token's player no longer exists
 *   500 internal_error
 */

/** The request schema's bound on each day count. */
export const TENURE_MAX_DAY_COUNT = 100_000;

export const TenureEvidenceSchema = z.object({
  /** `geoconflict.player.daysPlayed` on the device. */
  daysPlayed: z.number().int().min(0).max(TENURE_MAX_DAY_COUNT),
  /** Distinct local calendar dates across every `game-records` entry. */
  gameRecordDays: z.number().int().min(0).max(TENURE_MAX_DAY_COUNT),
});
export type TenureEvidence = z.infer<typeof TenureEvidenceSchema>;

/**
 * zod strips unknown keys, so an amount, a player id or any other field a
 * client adds — at the top level or inside `evidence` — never reaches the route.
 */
export const TenureGrantRequestSchema = z.object({
  evidence: TenureEvidenceSchema,
});
export type TenureGrantRequest = z.infer<typeof TenureGrantRequestSchema>;

export const TENURE_GRANT_STATUSES = [
  "granted",
  "below_minimum",
  "duplicate",
] as const;
export type TenureGrantStatus = (typeof TENURE_GRANT_STATUSES)[number];

/**
 * 200 body. `granted` = this call added `xpAwarded` (> 0). `below_minimum` =
 * this call recorded a final 0-XP check. `duplicate` = the player was already
 * checked; `xpAwarded` is the amount that earlier check stored and nothing was
 * added. `xp` is the player's total after the call.
 */
export const TenureGrantResponseSchema = z.object({
  status: z.enum(TENURE_GRANT_STATUSES),
  xpAwarded: z.number().int().min(0),
  xp: z.number().int().min(0),
});
export type TenureGrantResponse = z.infer<typeof TenureGrantResponseSchema>;

/**
 * The amount rule: days = the larger of the two counts; under
 * TENURE_MIN_DAYS gives 0 XP; otherwise TENURE_XP_PER_DAY per day, capped at
 * TENURE_XP_CAP.
 */
export function tenureGrantForEvidence(evidence: TenureEvidence): {
  days: number;
  xpAwarded: number;
} {
  const days = Math.max(evidence.daysPlayed, evidence.gameRecordDays);
  const xpAwarded =
    days < TENURE_MIN_DAYS
      ? 0
      : Math.min(days * TENURE_XP_PER_DAY, TENURE_XP_CAP);
  return { days, xpAwarded };
}
