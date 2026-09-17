/**
 * Shared, pure match-end XP qualification rules.
 *
 * The game server is a turn relay and does not run the simulation, so the client
 * sends a compact per-player participation summary (PlayerParticipation, keyed by
 * clientID). These helpers turn that summary plus the server's own per-client state
 * into the exact set of credits to award. Kept here in src/core (pure, no I/O) so
 * the decision is unit-testable in isolation and the client/server share one
 * definition of "qualifies", preventing drift.
 *
 * Task 0211: there are now TWO sources of that summary, and this module is
 * unchanged by the second one.
 *   1. The whole-roster array on the winner message, at a normal match end.
 *   2. A one-entry array the server builds from a single player's `participation`
 *      self-report, sent MID-MATCH — at that player's elimination, or when the
 *      simulation reports the win condition met with no declarable winner (a match
 *      that will never reach a normal end, so there is no later moment to credit).
 * Everything here therefore evaluates MID-MATCH as well as at an end. Read
 * `isAliveAtEnd` as "alive at the moment this participation was captured"; it is a
 * wire field of PlayerParticipationSchema and is deliberately NOT renamed, because
 * a rename is a cross-version wire change for a cosmetic gain.
 *
 * The *decision and the write are server-authoritative*: PlayerParticipation is an
 * input, but `selectMatchCredits` is only ever run on the server and combines it
 * with server-only signals (kicked / disconnected / whether the identity is
 * creditable, and the internal player id it resolved to).
 *
 * Task 0272 (S3, ADR-113): credits are keyed by the internal player id, and the
 * profile server's idempotency key is `(game_id, player_id)`. This module never
 * sees a platform id — only the game server's verdict that one is creditable.
 *
 * See ai-agents/tasks/done/0188-profile-06-match-end-crediting/brief.md (T6).
 */

import { XP_PER_MATCH } from "./Citizenship";
import { ClientID, PlayerParticipation } from "../Schemas";

/**
 * One resolved match-end award — exactly the wire `CreditItem` posted to
 * `/internal/v1/credit` (see CreditContract.ts).
 */
export interface MatchCredit {
  gameId: string;
  playerId: string;
  xpAwarded: number;
}

/**
 * Whether a player's participation alone qualifies them for the match XP award,
 * before any server-only gating. A player qualifies when they actually spawned
 * AND either was alive when this participation was captured or was legitimately
 * eliminated. Satisfiable MID-MATCH: `isAliveAtEnd` is not consulted at all once
 * `killedAt` is set, and a still-alive spawned player qualifies on the first clause.
 *
 * 🔴 READ THIS BEFORE "FIXING" THE LEAVER RULE BACK (task 0211, owner ruling).
 * This predicate used to be described as the participation-derived half of the
 * exclusion of players who voluntarily left mid-game. That description is now FALSE
 * AS WRITTEN, and the predicate is unchanged and correct:
 *   - A survivor of a stalled match is credited at the stall, which may be an hour
 *     before they stop playing. If they then close the tab they KEEP the XP. The
 *     owner was shown exactly this and accepted it knowingly. It is not a defect.
 *   - The exclusion still holds for a player who vanishes without ANY trigger having
 *     credited them: no elimination, no stall report, and `killedAt` unset at the
 *     match end ⇒ `hasSpawned && !isAliveAtEnd && killedAt === undefined` ⇒ false.
 * So the exclusion narrowed; it was not deleted.
 */
export function qualifiesForMatchXp(p: PlayerParticipation): boolean {
  return p.hasSpawned && (p.isAliveAtEnd || p.killedAt !== undefined);
}

/** Server-known per-client signals that gate crediting beyond participation. */
export interface ClientCreditState {
  /**
   * The internal player id resolved for this client's creditable identity, or null
   * while no resolve has succeeded yet (task 0272).
   */
  playerId: string | null;
  /**
   * Whether the game server holds a creditable identity for this client — its
   * ADR-103 funnel (`getCreditableYandexId`) returned non-null. The id itself never
   * enters core.
   */
  identityKnown: boolean;
  /** Whether the client was kicked from the game. */
  kicked: boolean;
  /** Whether the client was disconnected at match end without returning. */
  disconnected: boolean;
}

/**
 * The gates every credit decision shares: the entry is in `eligibleRoster` (a player
 * actually in this match, NOT a post-start joiner / spectator the client-supplied
 * participation could otherwise name), it qualifies, and it has a known connected
 * (not kicked, not disconnected) server client. Returns that client's state, or
 * null when a gate fails.
 *
 * The roster gate is orthogonal to identity verification (the [C1] seam): it bounds
 * *who* can be credited to the match participants regardless of whether the identity
 * is signed, so it still matters after signed-payload verification lands.
 */
function passesCreditGates(
  p: PlayerParticipation,
  clientStateById: ReadonlyMap<ClientID, ClientCreditState>,
  eligibleRoster: ReadonlySet<ClientID>,
): ClientCreditState | null {
  if (!eligibleRoster.has(p.clientID)) return null;
  if (!qualifiesForMatchXp(p)) return null;
  const state = clientStateById.get(p.clientID);
  if (state === undefined) return null;
  if (state.kicked || state.disconnected) return null;
  return state;
}

/**
 * Build the exact list of awards for a batch of participation — a whole roster at a
 * match end, or a single player mid-match (task 0211). Pure: callers supply the
 * game id, the client-reported participation, the frozen start roster, and a map of
 * server-only client state keyed by clientID. An entry is credited only if it passes
 * the shared gates (see `passesCreditGates`), its identity is creditable, and its
 * player id is already resolved. Results are deduped by player id so one player on
 * two connections is credited at most once (the profile server's
 * `(game_id, player_id)` idempotency key is the ultimate backstop).
 */
export function selectMatchCredits(
  gameId: string,
  participation: readonly PlayerParticipation[],
  clientStateById: ReadonlyMap<ClientID, ClientCreditState>,
  eligibleRoster: ReadonlySet<ClientID>,
): MatchCredit[] {
  const seen = new Set<string>();
  const credits: MatchCredit[] = [];
  for (const p of participation) {
    const state = passesCreditGates(p, clientStateById, eligibleRoster);
    if (state === null) continue;
    if (!state.identityKnown) continue;
    const playerId = state.playerId;
    if (playerId === null) continue;
    if (seen.has(playerId)) continue;
    seen.add(playerId);
    credits.push({ gameId, playerId, xpAwarded: XP_PER_MATCH });
  }
  return credits;
}

/**
 * Task 0272. The clients that WOULD be credited but whose player id is not resolved
 * yet (the resolve at join failed or is still in flight): same gates, a creditable
 * identity, and a null player id. The game server resolves these and then credits
 * them through `selectMatchCredits`. Deduped by clientID.
 */
export function selectUnresolvedCreditClients(
  participation: readonly PlayerParticipation[],
  clientStateById: ReadonlyMap<ClientID, ClientCreditState>,
  eligibleRoster: ReadonlySet<ClientID>,
): ClientID[] {
  const unresolved: ClientID[] = [];
  for (const p of participation) {
    const state = passesCreditGates(p, clientStateById, eligibleRoster);
    if (state === null) continue;
    if (!state.identityKnown || state.playerId !== null) continue;
    if (unresolved.includes(p.clientID)) continue;
    unresolved.push(p.clientID);
  }
  return unresolved;
}
