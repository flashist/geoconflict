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
 * with server-only signals (kicked / disconnected / the trusted Yandex id and the
 * internal persistentId).
 *
 * See ai-agents/tasks/done/0188-profile-06-match-end-crediting/brief.md (T6).
 */

import { XP_PER_MATCH } from "./Citizenship";
import { ClientID, PlayerParticipation } from "../Schemas";

/**
 * One resolved match-end award. Carries `persistentId` (internal, never sent to the
 * credit endpoint) so the caller can upsert a missing profile and re-credit as a
 * backstop. The wire payload posted to `/internal/v1/credit` is the CreditItem
 * subset (gameId, yandexPlayerId, xpAwarded) — see CreditContract.ts.
 */
export interface MatchCredit {
  gameId: string;
  yandexPlayerId: string;
  persistentId: string;
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
  /** The trusted-for-crediting Yandex id, or null if none/unverified. */
  yandexPlayerId: string | null;
  /** Internal cross-device key linked to the Yandex id (for profile upsert). */
  persistentId: string;
  /** Whether the client was kicked from the game. */
  kicked: boolean;
  /** Whether the client was disconnected at match end without returning. */
  disconnected: boolean;
}

/**
 * Build the exact list of awards for a batch of participation — a whole roster at a
 * match end, or a single player mid-match (task 0211). Pure: callers supply the
 * game id, the client-reported participation, the frozen start roster, and a map of
 * server-only client state keyed by clientID. A participation entry is credited only
 * if it is in `eligibleRoster` (a player actually in this match, NOT a post-start
 * joiner / spectator the client-supplied participation could otherwise name), it
 * qualifies, it has a known connected (not kicked, not disconnected) server client,
 * and that client has a non-null Yandex id. Results are deduped by Yandex id so a
 * single account on two connections is credited at most once (the profile server's
 * `(game_id, yandex_player_id)` idempotency key is the ultimate backstop).
 *
 * The roster gate is orthogonal to identity verification (the [C1] seam): it bounds
 * *who* can be credited to the match participants regardless of whether the Yandex id
 * is signed, so it still matters after signed-payload verification lands.
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
    if (!eligibleRoster.has(p.clientID)) continue;
    if (!qualifiesForMatchXp(p)) continue;
    const state = clientStateById.get(p.clientID);
    if (state === undefined) continue;
    if (state.kicked || state.disconnected) continue;
    const yandexPlayerId = state.yandexPlayerId;
    if (yandexPlayerId === null) continue;
    if (seen.has(yandexPlayerId)) continue;
    seen.add(yandexPlayerId);
    credits.push({
      gameId,
      yandexPlayerId,
      persistentId: state.persistentId,
      xpAwarded: XP_PER_MATCH,
    });
  }
  return credits;
}
