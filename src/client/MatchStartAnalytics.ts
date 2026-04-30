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
