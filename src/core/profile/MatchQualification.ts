/**
 * Shared, pure match-end XP qualification rules.
 *
 * The game server is a turn relay and does not run the simulation, so the client
 * sends a compact per-player participation summary (PlayerParticipation, keyed by
 * clientID) with the winner message. These helpers turn that summary plus the
 * server's own per-client state into the exact set of credits to award. Kept here
 * in src/core (pure, no I/O) so the decision is unit-testable in isolation and the
 * client/server share one definition of "qualifies", preventing drift.
 *
 * The *decision and the write are server-authoritative*: PlayerParticipation is an
 * input, but `selectMatchCredits` is only ever run on the server and combines it
 * with server-only signals (kicked / disconnected / the trusted Yandex id and the
 * internal persistentId).
 *
 * See ai-agents/tasks/backlog/s4-profile-06-match-end-crediting.md (T6).
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
 * AND either survived to the end or were legitimately eliminated. A player who
 * spawned but then vanished without dying (left / abandoned, no `killedAt`) does
 * NOT qualify — this is the participation-derived half of the brief's exclusion of
 * players who voluntarily left mid-game.
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
 * Build the exact list of awards for a finished match. Pure: callers supply the
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
