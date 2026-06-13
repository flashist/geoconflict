import { type PlayerProfile } from "./PlayerProfile";

/**
 * Shared match-XP qualification + crediting rules (S4 player profile).
 *
 * This module is the SINGLE source of truth for "did this match earn XP" and
 * "what does earning it do to the profile". It is reused by:
 *   - the client now (guest localStorage crediting, T2), and
 *   - the server later (authoritative match crediting, T6),
 * so the two can never drift. It is pure: no storage, no I/O, no clocks
 * (timestamps are injected by the caller).
 */

/** XP awarded for a single qualifying match. */
export const GUEST_XP_PER_MATCH = 10;

/** XP at which a player earns citizenship. */
export const CITIZENSHIP_XP_THRESHOLD = 1000;

/**
 * Normalized per-player outcome of a finished match, from the perspective of
 * whichever side is crediting. Each caller derives these booleans from its own
 * representation:
 *   - client: `wasEliminated` = presence of `killedAt` (a BigIntString) in the
 *     player's match stats; `leftVoluntarily` is always false because a voluntary
 *     leave navigates the page away and the credit hook never fires for that
 *     player.
 *   - server (T6): `wasEliminated` = presence of its own `killedAt` (a number);
 *     `leftVoluntarily` from its leave/surrender signal.
 *
 * Note: the server's additional "disconnected at end without returning" check is
 * a server-only signal and is layered OUTSIDE this predicate. Keeping it here
 * would force the client to author a value it cannot honestly know, reintroducing
 * the drift this shared module exists to prevent.
 */
export interface MatchParticipation {
  hasSpawned: boolean;
  isAliveAtEnd: boolean;
  wasEliminated: boolean;
  leftVoluntarily: boolean;
}

/**
 * Whether a finished match earns XP for the participating player. Qualifies only
 * if the player spawned, did not voluntarily leave, and either survived to the
 * end or was eliminated after participating.
 */
export function qualifiesForMatchXp(
  participation: MatchParticipation,
): boolean {
  if (!participation.hasSpawned) return false;
  if (participation.leftVoluntarily) return false;
  return participation.isAliveAtEnd || participation.wasEliminated;
}

/**
 * Apply one qualifying match's reward to a profile, returning a NEW profile (the
 * input is not mutated). Pure — the `nowIso` timestamp is injected by the caller.
 *
 * Touches only `xp`, `updated_at`, and — on the single crossing into citizenship
 * — `is_citizen` / `citizenship_earned_at`. It NEVER touches the paid-entitlement
 * fields (`is_paid_citizen` / `citizenship_purchased_at`), which belong to the
 * payment flow only.
 *
 * The local citizenship flip is UI-only until the player authenticates: the
 * server re-derives `is_citizen` / `citizenship_earned_at` from XP on migrate and
 * never trusts the client's value (epic Part F), so computing it here cannot grant
 * real entitlement — it only keeps the local profile self-consistent.
 */
export function applyMatchXp(
  profile: PlayerProfile,
  nowIso: string,
): PlayerProfile {
  const xp = profile.xp + GUEST_XP_PER_MATCH;
  // True only on the transition false -> true, so the earned timestamp is stamped
  // exactly once and never overwritten by a later match (idempotent).
  const crossedThreshold =
    !profile.is_citizen && xp >= CITIZENSHIP_XP_THRESHOLD;
  return {
    ...profile,
    xp,
    updated_at: nowIso,
    is_citizen: profile.is_citizen || xp >= CITIZENSHIP_XP_THRESHOLD,
    citizenship_earned_at: crossedThreshold
      ? nowIso
      : profile.citizenship_earned_at,
  };
}
