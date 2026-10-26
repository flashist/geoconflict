// Client → profile-server claim of a rewarded video's extra match XP (task 0488;
// the route is task 0491). The TenureGrantClaim.ts pattern: the outcome mapping
// and analytics live outside the popup, and it NEVER throws.
//
// The server pays only for a match it already credited to this player, once
// (primary key), so a retry can never double-pay. Retries are in-session only:
// a claim lost to a page close is not retried on the next load (owner-approved).

import { RewardedMatchXpResponseSchema } from "../core/profile/RewardedMatchXpContract";
import {
  flashist_logEventAnalytics,
  flashistConstants,
} from "./flashist/FlashistFacade";
import { profileFetch } from "./ProfileSession";

const REWARDED_MATCH_XP_FETCH_TIMEOUT_MS = 10_000;

/** The base credit can land a moment after the popup (resolve-then-credit, 0272). */
export const REWARDED_MATCH_XP_RETRY_DELAYS_MS: readonly number[] = [
  2_000, 5_000, 10_000,
];

export type RewardedMatchXpClaimResult =
  | { status: "granted"; xpAwarded: number; xp: number }
  /** This match was already rewarded (another tab, or a lost earlier answer). */
  | { status: "duplicate" }
  /** The server still holds no base credit for this match after every retry. */
  | { status: "not_credited" }
  | { status: "failed" };

type AttemptOutcome = RewardedMatchXpClaimResult | { status: "retry" };

const claimsByGameId = new Map<string, Promise<RewardedMatchXpClaimResult>>();

/** Test seam — forget every claim of this page load. */
export function resetRewardedMatchXpClaimsForTests(): void {
  claimsByGameId.clear();
}

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Claim the extra XP for `gameId`, at most once per match per page load: a
 * second call returns the first call's promise.
 */
export function claimRewardedMatchXp(
  gameId: string,
  wait: (ms: number) => Promise<void> = sleep,
): Promise<RewardedMatchXpClaimResult> {
  const existing = claimsByGameId.get(gameId);
  if (existing !== undefined) {
    return existing;
  }
  const claim = runClaim(gameId, wait)
    .catch((): RewardedMatchXpClaimResult => ({ status: "failed" }))
    .then((result) => {
      logResult(result);
      return result;
    });
  claimsByGameId.set(gameId, claim);
  return claim;
}

async function runClaim(
  gameId: string,
  wait: (ms: number) => Promise<void>,
): Promise<RewardedMatchXpClaimResult> {
  for (let attempt = 0; ; attempt++) {
    const outcome = await attemptClaim(gameId);
    if (outcome.status !== "retry" && outcome.status !== "not_credited") {
      return outcome;
    }
    if (attempt >= REWARDED_MATCH_XP_RETRY_DELAYS_MS.length) {
      return outcome.status === "retry" ? { status: "failed" } : outcome;
    }
    await wait(REWARDED_MATCH_XP_RETRY_DELAYS_MS[attempt]);
  }
}

async function attemptClaim(gameId: string): Promise<AttemptOutcome> {
  // Bearer, the one re-login and the one retry are profileFetch's. The body
  // carries no player id — the session is the caller.
  const result = await profileFetch("/v1/profile/rewarded-match-xp", {
    method: "POST",
    body: JSON.stringify({ gameId }),
    timeoutMs: REWARDED_MATCH_XP_FETCH_TIMEOUT_MS,
  });
  if (result.kind === "network_error") {
    return { status: "retry" };
  }
  if (result.kind !== "response") {
    return { status: "failed" };
  }
  const { response } = result;
  if (response.status >= 500) {
    return { status: "retry" };
  }
  if (response.status !== 200) {
    // 400 / 401 / 404 (no player row, or an old box without the route).
    return { status: "failed" };
  }
  const json: unknown = await response.json().catch(() => null);
  const parsed = RewardedMatchXpResponseSchema.safeParse(json);
  if (!parsed.success) {
    return { status: "failed" };
  }
  switch (parsed.data.status) {
    case "granted":
      return {
        status: "granted",
        xpAwarded: parsed.data.xpAwarded,
        xp: parsed.data.xp,
      };
    case "duplicate":
      return { status: "duplicate" };
    case "not_credited":
      return { status: "not_credited" };
  }
}

function logResult(result: RewardedMatchXpClaimResult): void {
  const events = flashistConstants.analyticEvents;
  try {
    switch (result.status) {
      case "granted":
        flashist_logEventAnalytics(
          events.AD_REWARDED_REWARD_GRANTED,
          result.xpAwarded,
        );
        return;
      case "duplicate":
        flashist_logEventAnalytics(events.AD_REWARDED_REWARD_DUPLICATE);
        return;
      case "not_credited":
        flashist_logEventAnalytics(events.AD_REWARDED_REWARD_NOT_CREDITED);
        return;
      case "failed":
        flashist_logEventAnalytics(events.AD_REWARDED_REWARD_FAILED);
        return;
    }
  } catch {
    // Analytics never turns a claim into a throw.
  }
}
