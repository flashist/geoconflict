// Task 0332 (ADR-124). GameManager sums each game's start-time identity counts for
// the cumulative `geoconflict.server.match.identity` counter. A finished game's
// counts must survive its removal (a cumulative counter must never go down) and
// must never be counted twice — the same rule as the byte totals.
import { Logger } from "winston";
import { GameEnv, ServerConfig } from "../../src/core/configuration/Config";
import { GameManager } from "../../src/server/GameManager";
import { GamePhase, MatchIdentityState } from "../../src/server/GameServer";
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

/** Only what GameManager.tick() and matchIdentityTotals() read. */
function fakeGame(
  phase: GamePhase,
  counts: Record<MatchIdentityState, number>,
) {
  return {
    phase: () => phase,
    hasStarted: () => true,
    matchIdentityCounts: counts,
    bytesSent: 0,
    bytesReceived: 0,
    end: jest.fn(),
    activeClients: [],
  };
}

describe("GameManager.matchIdentityTotals (task 0332)", () => {
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

  it("is all zeros with no games", () => {
    expect(gm.matchIdentityTotals()).toEqual({
      guest: 0,
      unresolved: 0,
      verified: 0,
      unverified: 0,
    });
  });

  it("keeps a finished game's counts after removal, without counting them twice", () => {
    const games = (gm as any).games as Map<string, unknown>;
    games.set(
      "FINISHED",
      fakeGame(GamePhase.Finished, {
        guest: 1,
        unresolved: 2,
        verified: 3,
        unverified: 4,
      }),
    );
    games.set(
      "LIVE0001",
      fakeGame(GamePhase.Lobby, {
        guest: 10,
        unresolved: 0,
        verified: 5,
        unverified: 0,
      }),
    );
    const expected = { guest: 11, unresolved: 2, verified: 8, unverified: 4 };
    expect(gm.matchIdentityTotals()).toEqual(expected);

    gm.tick();
    // tick() replaces the map, so read it afresh.
    expect(((gm as any).games as Map<string, unknown>).has("FINISHED")).toBe(
      false,
    );
    expect(gm.activeGames()).toBe(1);
    expect(gm.matchIdentityTotals()).toEqual(expected);

    gm.tick();
    expect(gm.matchIdentityTotals()).toEqual(expected);
  });
});
