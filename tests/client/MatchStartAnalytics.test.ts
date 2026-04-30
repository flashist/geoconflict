jest.mock("../../src/client/flashist/FlashistFacade", () => ({
  flashistConstants: {
    analyticEvents: {
      GAME_START: "Game:Start",
      GAME_MODE_MULTIPLAYER: "Game:Mode:Multiplayer",
      GAME_MODE_SOLO: "Game:Mode:Solo",
    },
  },
  flashist_logEventAnalytics: jest.fn(),
}));

import {
  flashistConstants,
  flashist_logEventAnalytics,
} from "../../src/client/flashist/FlashistFacade";
import {
  Difficulty,
  GameMapSize,
  GameMapType,
  GameMode,
  GameType,
} from "../../src/core/game/Game";
import { GameStartInfo } from "../../src/core/Schemas";
import {
  logMatchStartAnalytics,
  shouldLogMatchStartAnalytics,
} from "../../src/client/MatchStartAnalytics";

describe("match start analytics", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([GameType.Public, GameType.Private])(
    "emits Game:Start then multiplayer mode for initial %s starts",
    (gameType) => {
      const didLog = logMatchStartAnalytics(createGameStartInfo(gameType, 3), {
        hasJoined: false,
        isReconnect: false,
        isReplay: false,
      });

      expect(didLog).toBe(true);
      expect(flashist_logEventAnalytics).toHaveBeenCalledTimes(2);
      expect(flashist_logEventAnalytics).toHaveBeenNthCalledWith(
        1,
        flashistConstants.analyticEvents.GAME_START,
        3,
      );
      expect(flashist_logEventAnalytics).toHaveBeenNthCalledWith(
        2,
        flashistConstants.analyticEvents.GAME_MODE_MULTIPLAYER,
      );
    },
  );

  it("emits Game:Start then solo mode for initial singleplayer starts", () => {
    const didLog = logMatchStartAnalytics(
      createGameStartInfo(GameType.Singleplayer, 1),
      {
        hasJoined: false,
        isReconnect: false,
        isReplay: false,
      },
    );

    expect(didLog).toBe(true);
    expect(flashist_logEventAnalytics).toHaveBeenCalledTimes(2);
    expect(flashist_logEventAnalytics).toHaveBeenNthCalledWith(
      1,
      flashistConstants.analyticEvents.GAME_START,
      1,
    );
    expect(flashist_logEventAnalytics).toHaveBeenNthCalledWith(
      2,
      flashistConstants.analyticEvents.GAME_MODE_SOLO,
    );
  });

  it.each([
    {
      name: "same-runner reconnect start",
      state: { hasJoined: true, isReconnect: false, isReplay: false },
    },
    {
      name: "persisted reconnect start",
      state: { hasJoined: false, isReconnect: true, isReplay: false },
    },
    {
      name: "archived replay start",
      state: { hasJoined: false, isReconnect: false, isReplay: true },
    },
  ])("does not emit analytics for $name", ({ state }) => {
    const didLog = logMatchStartAnalytics(
      createGameStartInfo(GameType.Public, 2),
      state,
    );

    expect(didLog).toBe(false);
    expect(shouldLogMatchStartAnalytics(state)).toBe(false);
    expect(flashist_logEventAnalytics).not.toHaveBeenCalled();
  });
});

function createGameStartInfo(
  gameType: GameType,
  playerCount: number,
): GameStartInfo {
  return {
    gameID: "00000000-0000-4000-8000-000000000001",
    players: Array.from({ length: playerCount }, (_, index) => ({
      clientID: `00000000-0000-4000-8000-00000000000${index + 2}`,
      username: `Player ${index + 1}`,
    })),
    config: {
      gameMap: GameMapType.World,
      difficulty: Difficulty.Medium,
      donateGold: false,
      donateTroops: false,
      gameType,
      gameMode: GameMode.FFA,
      gameMapSize: GameMapSize.Normal,
      disableNPCs: false,
      bots: 0,
      infiniteGold: false,
      infiniteTroops: false,
      instantBuild: false,
    },
  };
}
