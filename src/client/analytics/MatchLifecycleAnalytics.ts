import { GameType } from "../../core/game/Game";
import {
  flashist_logEventAnalytics,
  flashistConstants,
} from "../flashist/FlashistFacade";

let activeGameId: string | null = null;
let matchStartTimeMs: number | null = null;
let spawnConfirmedReported = false;
let matchDurationReported = false;

function elapsedSeconds(): number | null {
  if (matchStartTimeMs === null) {
    return null;
  }
  return Math.round((Date.now() - matchStartTimeMs) / 1000);
}

export function trackGameStart(
  gameId: string,
  gameType: GameType,
  playerCount: number,
): void {
  if (activeGameId === gameId && matchStartTimeMs !== null) {
    return;
  }

  activeGameId = gameId;
  matchStartTimeMs = Date.now();
  spawnConfirmedReported = false;
  matchDurationReported = false;

  flashist_logEventAnalytics(
    flashistConstants.analyticEvents.GAME_START,
    playerCount,
  );
  flashist_logEventAnalytics(
    gameType === GameType.Singleplayer
      ? flashistConstants.analyticEvents.GAME_MODE_SOLO
      : flashistConstants.analyticEvents.GAME_MODE_MULTIPLAYER,
  );
}

export function trackSpawnConfirmed(hasSpawned: boolean): void {
  if (spawnConfirmedReported || !hasSpawned) {
    return;
  }

  const seconds = elapsedSeconds();
  if (seconds === null) {
    return;
  }

  spawnConfirmedReported = true;
  flashist_logEventAnalytics(
    flashistConstants.analyticEvents.MATCH_SPAWNED_CONFIRMED,
    Math.max(1, seconds),
  );
}

export function trackGameEnd(gameEndValue?: number): void {
  flashist_logEventAnalytics(
    flashistConstants.analyticEvents.GAME_END,
    gameEndValue,
  );
  trackMatchDuration();
}

export function trackMatchDuration(): void {
  if (matchDurationReported) {
    return;
  }

  const seconds = elapsedSeconds();
  if (seconds === null) {
    return;
  }

  matchDurationReported = true;
  flashist_logEventAnalytics(
    flashistConstants.analyticEvents.MATCH_DURATION,
    seconds,
  );
}

export function resetMatchLifecycleAnalyticsForTests(): void {
  activeGameId = null;
  matchStartTimeMs = null;
  spawnConfirmedReported = false;
  matchDurationReported = false;
}
