// Task 0389: create_game refuses an id already in use (409 game_id_taken)
// instead of silently replacing that lobby. The route lives inside
// startWorker(), which no test drives, so the refusal is tested here, at
// GameManager.createGameIfAbsent(); the route's 400/409 answers are covered by
// the local run only.
import { Logger } from "winston";
import { GameEnv, ServerConfig } from "../../src/core/configuration/Config";
import { GameManager } from "../../src/server/GameManager";
import { ProfileApiClient } from "../../src/server/ProfileApiClient";

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

function fakeConfig(): ServerConfig {
  return {
    aiPlayersConfig: () => ({ enabled: false }),
    env: () => GameEnv.Dev,
    turnIntervalMs: () => 100,
    gameCreationRate: () => 60 * 60 * 1000,
  } as unknown as ServerConfig;
}

describe("GameManager.createGameIfAbsent (task 0389)", () => {
  let gm: GameManager;

  beforeEach(() => {
    // GameManager ticks every second from its constructor.
    jest.useFakeTimers();
    gm = new GameManager(fakeConfig(), testLogger(), {
      resolvePlayer: jest.fn().mockResolvedValue(null),
      creditMatch: jest.fn().mockResolvedValue(undefined),
    } as unknown as ProfileApiClient);
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it("creates a lobby for a free id", () => {
    const game = gm.createGameIfAbsent("K7M4PCRX", undefined, "creator1");

    expect(game).not.toBeNull();
    expect(gm.game("K7M4PCRX")).toBe(game);
    expect(gm.activeGames()).toBe(1);
  });

  it("refuses a duplicate, and the first lobby is still the same instance", () => {
    const first = gm.createGameIfAbsent("K7M4PCRX", undefined, "creator1");

    const second = gm.createGameIfAbsent("K7M4PCRX", undefined, "creator2");

    expect(second).toBeNull();
    expect(gm.game("K7M4PCRX")).toBe(first);
    expect(gm.activeGames()).toBe(1);
  });

  it("a different id is not refused", () => {
    gm.createGameIfAbsent("K7M4PCRX", undefined);

    expect(gm.createGameIfAbsent("K7M4PCRY", undefined)).not.toBeNull();
    expect(gm.activeGames()).toBe(2);
  });
});
