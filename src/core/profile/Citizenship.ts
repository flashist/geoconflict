/**
 * Shared, pure citizenship/XP rules — the single source of truth for the
 * earned-citizenship threshold and the per-match award.
 *
 * Lives in src/core so the client (CitizenshipCard / PlayerProfileView) and the
 * profile server (PlayerProfileRepository's crediting SQL) consume the SAME
 * constants and predicate, preventing the client display from drifting from the
 * server's authoritative flip. No I/O, no clocks — safe to import anywhere.
 *
 * See ai-agents/tasks/backlog/s4-profile-05-backend-db-api.md (T5) and the epic
 * s4-player-profile-store-impl.md (Part B/E).
 */

/** XP at which a player earns (free) citizenship. */
export const CITIZENSHIP_XP_THRESHOLD = 1000;

/** Flat XP awarded for a single qualifying match. */
export const XP_PER_MATCH = 10;

/**
 * Whether a given lifetime XP total qualifies for earned citizenship.
 * Pure threshold check — the server stamps `citizenship_earned_at` on the first
 * crossing; this predicate is the rule both sides agree on.
 */
export function isCitizenFromXp(xp: number): boolean {
  return xp >= CITIZENSHIP_XP_THRESHOLD;
}
