// jose pulls in ESM that jest can't load directly; DefaultConfig imports it.
// Mock it the same way ProfileApiUrlConfig.test.ts does so the config module loads.
jest.mock("jose", () => ({
  base64url: {
    decode: (value: string) => Buffer.from(value, "base64url"),
  },
}));

// Task 0367: the public lobby window is 60 s in prod and preprod (was 120 s);
// dev keeps its own 5 s override. GameServer harness follows
// PrivateLobbyStartGate.test.ts.

import { Logger } from "winston";
import { getServerConfig } from "../../src/core/configuration/ConfigLoader";
import { DevServerConfig } from "../../src/core/configuration/DevConfig";
import { preprodConfig } from "../../src/core/configuration/PreprodConfig";
import { prodConfig } from "../../src/core/configuration/ProdConfig";
import {
  Difficulty,
  GameMapSize,
  GameMapType,
  GameMode,
  GameType,
} from "../../src/core/game/Game";
import { GameConfig } from "../../src/core/Schemas";
import { GamePhase, GameServer } from "../../src/server/GameServer";
import { ProfileApiClient } from "../../src/server/ProfileApiClient";

const LOBBY_WINDOW_MS = 60_000;

function testLogger(): Logger {
  const child = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    child: jest.fn(),
  };
  child.child.mockReturnValue(child);
  return child as unknown as Logger;
}

describe("public lobby window (gameCreationRate)", () => {
  beforeEach(() => {
    // getServerConfig logs which config it picked.
    jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("prod and preprod are 60 s, dev stays 5 s", () => {
    expect(prodConfig.gameCreationRate()).toBe(LOBBY_WINDOW_MS);
    expect(preprodConfig.gameCreationRate()).toBe(LOBBY_WINDOW_MS);
    expect(new DevServerConfig().gameCreationRate()).toBe(5_000);
  });

  test("the config each GAME_ENV resolves to has the same windows", () => {
    expect(getServerConfig("prod").gameCreationRate()).toBe(LOBBY_WINDOW_MS);
    expect(getServerConfig("staging").gameCreationRate()).toBe(LOBBY_WINDOW_MS);
    expect(getServerConfig("dev").gameCreationRate()).toBe(5_000);
  });
});

describe("public lobby on the prod config", () => {
  const T0 = Date.UTC(2026, 9, 2, 12, 0, 0);

  const PUBLIC_GAME_CONFIG: GameConfig = {
    gameMap: GameMapType.World,
    difficulty: Difficulty.Medium,
    donateGold: false,
    donateTroops: false,
    gameType: GameType.Public,
    gameMode: GameMode.FFA,
    gameMapSize: GameMapSize.Normal,
    disableNPCs: false,
    bots: 0,
    startGold: 0,
    infiniteGold: false,
    infiniteTroops: false,
    instantBuild: false,
    maxPlayers: 50,
  } as GameConfig;

  let game: GameServer;

  beforeEach(() => {
    // Fake timers must be installed before construction: with AI enabled the
    // constructor starts the AI-lobby setInterval.
    jest.useFakeTimers();
    jest.setSystemTime(T0);
    game = new GameServer(
      "lobby060",
      testLogger(),
      T0,
      prodConfig,
      { ...PUBLIC_GAME_CONFIG },
      {
        resolvePlayer: jest.fn(),
        creditMatch: jest.fn().mockResolvedValue(undefined),
      } as unknown as ProfileApiClient,
    );
  });

  afterEach(() => {
    // Discards the AI-lobby interval so the suite leaks no handle.
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  test("prod config has AI players on (the lobby runs its full window)", () => {
    expect(prodConfig.aiPlayersConfig().enabled).toBe(true);
  });

  test("a fresh lobby reports its start 60 s after creation", () => {
    expect(game.gameInfo().msUntilStart).toBe(T0 + LOBBY_WINDOW_MS);
    expect(game.startTime()).toBe(T0 + LOBBY_WINDOW_MS);
    expect(game.phase()).toBe(GamePhase.Lobby);
  });

  test("AI fills over the window, and the lobby starts at exactly 60 s", () => {
    jest.advanceTimersByTime(30_000);
    expect(game.gameInfo().aiPlayersCount).toBeGreaterThan(0);
    expect(game.phase()).toBe(GamePhase.Lobby);

    jest.advanceTimersByTime(LOBBY_WINDOW_MS - 1 - 30_000);
    expect(Date.now()).toBe(T0 + LOBBY_WINDOW_MS - 1);
    expect(game.gameInfo().aiPlayersCount).toBeGreaterThan(0);
    expect(game.phase()).toBe(GamePhase.Lobby);

    jest.advanceTimersByTime(1);
    expect(Date.now()).toBe(T0 + LOBBY_WINDOW_MS);
    expect(game.phase()).toBe(GamePhase.Active);
  });

  test("an empty started game is cleaned up 30 s after the window (90 s)", () => {
    jest.advanceTimersByTime(LOBBY_WINDOW_MS + 30_000);
    expect(game.phase()).toBe(GamePhase.Active);

    jest.advanceTimersByTime(1);
    expect(game.phase()).toBe(GamePhase.Finished);
  });
});
