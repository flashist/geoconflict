import { GameStartInfo } from "../core/Schemas";
import { GameType } from "../core/game/Game";
import {
  flashist_logEventAnalytics,
  flashistConstants,
} from "./flashist/FlashistFacade";

export interface MatchStartAnalyticsState {
  hasJoined: boolean;
  isReconnect: boolean;
  isReplay: boolean;
}

export interface MatchSpawnedConfirmedAnalyticsState {
  matchStartTimeMs: number | null;
  hasReportedSpawnConfirmed: boolean;
  hasSpawned: boolean;
  tilesOwned: number;
}

let activeMatchStartTimeMs: number | null = null;

export function shouldLogMatchStartAnalytics({
  hasJoined,
  isReconnect,
  isReplay,
}: MatchStartAnalyticsState): boolean {
  return !hasJoined && !isReconnect && !isReplay;
}

export function gameModeAnalyticsEvent(gameType: GameType): string {
  return gameType === GameType.Singleplayer
    ? flashistConstants.analyticEvents.GAME_MODE_SOLO
    : flashistConstants.analyticEvents.GAME_MODE_MULTIPLAYER;
}

export function logMatchStartAnalytics(
  gameStartInfo: GameStartInfo,
  state: MatchStartAnalyticsState,
): boolean {
  if (!shouldLogMatchStartAnalytics(state)) {
    return false;
  }

  flashist_logEventAnalytics(
    flashistConstants.analyticEvents.GAME_START,
    gameStartInfo.players.length,
  );
  flashist_logEventAnalytics(
    gameModeAnalyticsEvent(gameStartInfo.config.gameType),
  );
  return true;
}

export function setActiveMatchStartTime(matchStartTimeMs: number): void {
  activeMatchStartTimeMs = matchStartTimeMs;
}

export function clearActiveMatchStartTime(): void {
  activeMatchStartTimeMs = null;
}

export function activeMatchDurationSeconds(nowMs = Date.now()): number | null {
  if (activeMatchStartTimeMs === null) {
    return null;
  }
  return secondsSinceMatchStart(activeMatchStartTimeMs, nowMs);
}

export function logMatchEndAnalytics(value?: number, nowMs = Date.now()): void {
  if (value === undefined) {
    flashist_logEventAnalytics(flashistConstants.analyticEvents.GAME_END);
  } else {
    flashist_logEventAnalytics(
      flashistConstants.analyticEvents.GAME_END,
      value,
    );
  }

  const durationSeconds = activeMatchDurationSeconds(nowMs);
  if (durationSeconds === null) {
    return;
  }

  flashist_logEventAnalytics(
    flashistConstants.analyticEvents.MATCH_DURATION,
    durationSeconds,
  );
  clearActiveMatchStartTime();
}

export function shouldLogMatchSpawnedConfirmedAnalytics({
  matchStartTimeMs,
  hasReportedSpawnConfirmed,
  hasSpawned,
  tilesOwned,
}: MatchSpawnedConfirmedAnalyticsState): boolean {
  return (
    matchStartTimeMs !== null &&
    !hasReportedSpawnConfirmed &&
    hasSpawned &&
    tilesOwned > 0
  );
}

export function secondsSinceMatchStart(
  matchStartTimeMs: number,
  nowMs = Date.now(),
): number {
  return Math.max(1, Math.round((nowMs - matchStartTimeMs) / 1000));
}

export function logMatchSpawnedConfirmedAnalytics(
  matchStartTimeMs: number,
  nowMs = Date.now(),
): void {
  flashist_logEventAnalytics(
    flashistConstants.analyticEvents.MATCH_SPAWNED_CONFIRMED,
    secondsSinceMatchStart(matchStartTimeMs, nowMs),
  );
}
