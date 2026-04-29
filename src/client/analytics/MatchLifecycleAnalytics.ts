import { GameType } from "../../core/game/Game";
import {
  flashist_logEventAnalytics,
  flashistConstants,
} from "../flashist/FlashistFacade";

const STORAGE_KEY = "match-lifecycle-analytics";

interface MatchLifecycleState {
  gameId: string;
  clientId: string;
  matchStartTimeMs: number;
  spawnConfirmedReported: boolean;
  matchDurationReported: boolean;
  abandonReported: boolean;
}

let activeGameId: string | null = null;
let activeClientId: string | null = null;
let matchStartTimeMs: number | null = null;
let spawnConfirmedReported = false;
let matchDurationReported = false;
let abandonReported = false;

function readStoredState(
  gameId: string,
  clientId: string,
): MatchLifecycleState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<MatchLifecycleState>;
    if (
      parsed.gameId === gameId &&
      parsed.clientId === clientId &&
      typeof parsed.matchStartTimeMs === "number"
    ) {
      return {
        gameId,
        clientId,
        matchStartTimeMs: parsed.matchStartTimeMs,
        spawnConfirmedReported: parsed.spawnConfirmedReported === true,
        matchDurationReported: parsed.matchDurationReported === true,
        abandonReported: parsed.abandonReported === true,
      };
    }
  } catch {
    /* localStorage is best-effort analytics state */
  }
  return null;
}

function writeStoredState(): void {
  if (
    activeGameId === null ||
    activeClientId === null ||
    matchStartTimeMs === null
  ) {
    return;
  }

  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        gameId: activeGameId,
        clientId: activeClientId,
        matchStartTimeMs,
        spawnConfirmedReported,
        matchDurationReported,
        abandonReported,
      } satisfies MatchLifecycleState),
    );
  } catch {
    /* localStorage is best-effort analytics state */
  }
}

function restoreState(state: MatchLifecycleState): void {
  activeGameId = state.gameId;
  activeClientId = state.clientId;
  matchStartTimeMs = state.matchStartTimeMs;
  spawnConfirmedReported = state.spawnConfirmedReported;
  matchDurationReported = state.matchDurationReported;
  abandonReported = state.abandonReported;
}

function elapsedSeconds(): number | null {
  if (matchStartTimeMs === null) {
    return null;
  }
  return Math.round((Date.now() - matchStartTimeMs) / 1000);
}

export function trackGameStart(
  gameId: string,
  clientId: string,
  gameType: GameType,
  playerCount: number,
): void {
  if (
    activeGameId === gameId &&
    activeClientId === clientId &&
    matchStartTimeMs !== null
  ) {
    return;
  }

  const storedState = readStoredState(gameId, clientId);
  if (storedState !== null) {
    restoreState(storedState);
    return;
  }

  activeGameId = gameId;
  activeClientId = clientId;
  matchStartTimeMs = Date.now();
  spawnConfirmedReported = false;
  matchDurationReported = false;
  abandonReported = false;
  writeStoredState();

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
  writeStoredState();
  flashist_logEventAnalytics(
    flashistConstants.analyticEvents.MATCH_SPAWNED_CONFIRMED,
    Math.max(1, seconds),
  );
}

export function trackGameEnd(
  gameEndValue?: number,
  options: { persistDuration?: boolean } = {},
): void {
  flashist_logEventAnalytics(
    flashistConstants.analyticEvents.GAME_END,
    gameEndValue,
  );
  trackMatchDuration(options);
}

export function trackMatchDuration(
  options: { persistDuration?: boolean } = {},
): void {
  const persistDuration = options.persistDuration ?? true;
  if (matchDurationReported) {
    return;
  }

  const seconds = elapsedSeconds();
  if (seconds === null) {
    return;
  }

  if (persistDuration) {
    matchDurationReported = true;
    writeStoredState();
  }
  flashist_logEventAnalytics(
    flashistConstants.analyticEvents.MATCH_DURATION,
    seconds,
  );
}

export function trackGameAbandon(
  options: { persistDuration?: boolean } = {},
): void {
  const persistDuration = options.persistDuration ?? true;
  if (abandonReported) {
    return;
  }

  trackGameEnd(undefined, { persistDuration });
  abandonReported = true;
  if (persistDuration) {
    writeStoredState();
  }
  flashist_logEventAnalytics(flashistConstants.analyticEvents.GAME_ABANDON);
}

export function resetMatchLifecycleAnalyticsForTests(
  preserveStorage = false,
): void {
  activeGameId = null;
  activeClientId = null;
  matchStartTimeMs = null;
  spawnConfirmedReported = false;
  matchDurationReported = false;
  abandonReported = false;
  if (!preserveStorage) {
    localStorage.removeItem(STORAGE_KEY);
  }
}
