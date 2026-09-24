/**
 * Shared, pure citizenship/XP rules — the single source of truth for the
 * earned-citizenship threshold and the per-match award.
 *
 * Lives in src/core so the client (CitizenshipCard / PlayerProfileView) and the
 * profile server (PlayerProfileRepository's crediting SQL) consume the SAME
 * constants and predicate, preventing the client display from drifting from the
 * server's authoritative flip. No I/O, no clocks — safe to import anywhere.
 *
 * See ai-agents/tasks/done/0185-profile-05-backend-db-api/brief.md (T5) and the epic
 * 0013-player-profile-store-impl (Part B/E).
 */

/**
 * XP at which a player earns (free) citizenship.
 *
 * Rescaled 1,000 → 100 by ADR-111, divided by EXACTLY 10 so the number of
 * qualifying matches a player must play is unchanged by the rescale.
 */
export const CITIZENSHIP_XP_THRESHOLD = 100;

/**
 * Flat XP awarded for a single qualifying match.
 *
 * ⛔ `1` is a DELIBERATE FLOOR, not an arbitrary constant (ADR-111 part 3):
 * players accept an award moving UP far more readily than DOWN, so the economy
 * starts low and every later move is upward. Do not "round it back up" for
 * tidiness, and do not propose moving it DOWN without the owner reopening
 * ADR-111. Any change here must move CITIZENSHIP_XP_THRESHOLD with it.
 */
export const XP_PER_MATCH = 1;

/**
 * The one-time tenure grant for players who were with us before citizenship
 * launched (task 0253): XP per day played, the cap, and the minimum day count.
 *
 * Owner-ruled; the rules they sit inside are ADR-112 as amended by the
 * 2026-09-15 redesign — a one-time server-side check, days = the larger of the
 * two device counts, a claim under the minimum still records a final 0-XP
 * check. The economy is ADR-111. The cap is deliberately half of
 * CITIZENSHIP_XP_THRESHOLD: a grant alone can never make a player a citizen.
 * The amount rule itself lives in TenureGrantContract.ts.
 */
export const TENURE_XP_PER_DAY = 1;
export const TENURE_XP_CAP = 50;
export const TENURE_MIN_DAYS = 3;

/**
 * Whether a given lifetime XP total qualifies for earned citizenship.
 * Pure threshold check — the server stamps `citizenship_earned_at` on the first
 * crossing; this predicate is the rule both sides agree on.
 */
export function isCitizenFromXp(xp: number): boolean {
  return xp >= CITIZENSHIP_XP_THRESHOLD;
}
