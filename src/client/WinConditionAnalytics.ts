import { WinConditionCheckUpdate } from "../core/game/GameUpdates";
import {
  flashist_logEventAnalytics,
  flashistConstants,
} from "./flashist/FlashistFacade";

export interface WinConditionAnalyticsState {
  isReplay: boolean;
  isReconnect: boolean;
  hasReported: boolean;
}

/**
 * Task 0208. Replays never emit. Reconnects never emit either: a reconnecting
 * client re-simulates from turn 0 with a fresh latch and would fire again,
 * while `Game:Start` — the denominator — is not re-fired on reconnect. Keeping
 * both on the same population costs a small under-count (a client that really
 * was present at the crossing), which is recorded in the reference doc.
 */
export function shouldLogWinConditionCheck({
  isReplay,
  isReconnect,
  hasReported,
}: WinConditionAnalyticsState): boolean {
  return !isReplay && !isReconnect && !hasReported;
}

/**
 * Composes the event string, or returns null when this match is not part of the
 * measured population.
 *
 * Part A measures multiplayer only. Singleplayer — tutorials included — has no
 * public or private lobby leaf, so it is dropped here rather than folded into
 * one of the multiplayer leaves, which would pollute them.
 *
 * GameAnalytics allows at most 5 colon-separated segments of <=64 characters,
 * which is why mode and lobby type are fused into a single segment.
 */
export function winConditionAnalyticsEventName(
  update: WinConditionCheckUpdate,
): string | null {
  if (update.lobbyType === "Singleplayer" || update.isTutorial) {
    return null;
  }
  return (
    `${flashistConstants.analyticEvents.MATCH_WIN_CONDITION}` +
    `:${update.mode}${update.lobbyType}` +
    `:${update.branch}` +
    `:${update.leaderKind}`
  );
}

export function logWinConditionCheckAnalytics(
  update: WinConditionCheckUpdate,
  state: WinConditionAnalyticsState,
): boolean {
  if (!shouldLogWinConditionCheck(state)) {
    return false;
  }
  const eventName = winConditionAnalyticsEventName(update);
  if (eventName === null) {
    return false;
  }
  flashist_logEventAnalytics(eventName, update.leaderSharePercent);
  return true;
}
