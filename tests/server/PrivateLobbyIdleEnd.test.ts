jest.mock("jose", () => ({
  base64url: {
    decode: (value: string) => Buffer.from(value, "base64url"),
  },
}));

// Task 0377 (owner ruling 2026-10-04): an unstarted private lobby with no connected
// client for 30 minutes is ended, counted from when the last player left (or from
// creation, if nobody ever joined). Public lobbies and started games are unchanged.
// Harness follows GameServerReconnect.test.ts / PrivateLobbyStartGate.test.ts.

import { EventEmitter } from "events";
import { Logger } from "winston";
import { GameEnv, ServerConfig } from "../../src/core/configuration/Config";
import {
  Difficulty,
  GameMapSize,
  GameMapType,
  GameMode,
  GameType,
} from "../../src/core/game/Game";
import { ClientID, GameConfig } from "../../src/core/Schemas";
import { Client } from "../../src/server/Client";
import { GamePhase, GameServer } from "../../src/server/GameServer";
import { ProfileApiClient } from "../../src/server/ProfileApiClient";

class MockWebSocket extends EventEmitter {
  public readyState = 1; // OPEN
  public send = jest.fn();
  public close = jest.fn();
}

const T0 = Date.UTC(2026, 9, 4, 12, 0, 0);
const SECOND = 1000;
const MINUTE = 60 * SECOND;
const IDLE_MS = 30 * MINUTE;
const IDLE_LOG = "private lobby ended, no client connected";

const GAME_CONFIG: GameConfig = {
  gameMap: GameMapType.World,
  difficulty: Difficulty.Medium,
  donateGold: false,
  donateTroops: false,
  gameType: GameType.Private,
  gameMode: GameMode.FFA,
  gameMapSize: GameMapSize.Normal,
  disableNPCs: true,
  bots: 0,
  startGold: 0,
  infiniteGold: false,
  infiniteTroops: false,
  instantBuild: false,
  maxPlayers: 50,
} as GameConfig;

type TestLogger = {
  info: jest.Mock;
  warn: jest.Mock;
  error: jest.Mock;
  debug: jest.Mock;
  child: jest.Mock;
};

function testLogger(): TestLogger {
  const child = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    child: jest.fn(),
  };
  child.child.mockReturnValue(child);
  return child;
}

function fakeConfig(): ServerConfig {
  return {
    aiPlayersConfig: () => ({ enabled: false }),
    env: () => GameEnv.Dev,
    turnIntervalMs: () => 100,
    // Far beyond every time these tests reach, so a public lobby stays a lobby.
    gameCreationRate: () => 2 * 60 * MINUTE,
  } as unknown as ServerConfig;
}

function makeGameServer(
  log: TestLogger,
  gameType: GameType = GameType.Private,
): GameServer {
  return new GameServer(
    "game0377",
    log as unknown as Logger,
    T0,
    fakeConfig(),
    { ...GAME_CONFIG, gameType },
    {
      resolvePlayer: jest.fn().mockResolvedValue(null),
      creditMatch: jest.fn().mockResolvedValue(undefined),
    } as unknown as ProfileApiClient,
  );
}

function makeClient(ws: MockWebSocket): Client {
  return new Client(
    "clientAAAA" as ClientID,
    "persistent-1",
    null,
    undefined,
    undefined,
    "127.0.0.1",
    "player",
    ws as never,
    undefined,
    "yx-1",
  );
}

/** Moves the clock to T0 + ms without firing timers (start() owns an interval). */
function at(ms: number): void {
  jest.setSystemTime(T0 + ms);
}

function ping(ws: MockWebSocket): void {
  ws.emit("message", JSON.stringify({ type: "ping" }));
}

/**
 * Steps the clock from its current position to T0 + untilMs, ticking phase() every
 * 5 s (and pinging on each given socket first), asserting `expected` at every tick.
 */
function tickUntil(
  server: GameServer,
  untilMs: number,
  expected: GamePhase,
  sockets: MockWebSocket[] = [],
): void {
  let now = Date.now() - T0;
  while (now < untilMs) {
    now = Math.min(now + 5 * SECOND, untilMs);
    at(now);
    sockets.forEach(ping);
    expect(server.phase()).toBe(expected);
  }
}

function idleLogCalls(log: TestLogger): unknown[][] {
  return log.info.mock.calls.filter((call) => call[0] === IDLE_LOG);
}

describe("unstarted private lobby ends after 30 min with nobody connected (0377)", () => {
  let log: TestLogger;

  beforeEach(() => {
    jest.useFakeTimers();
    at(0);
    log = testLogger();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  test("P3b shape: nobody ever joined — ended 30 min after creation, not at 3 h", () => {
    const server = makeGameServer(log);

    at(IDLE_MS - SECOND);
    expect(server.phase()).toBe(GamePhase.Lobby);
    expect(idleLogCalls(log)).toHaveLength(0);

    at(IDLE_MS + SECOND);
    expect(server.phase()).toBe(GamePhase.Finished);

    expect(idleLogCalls(log)).toHaveLength(1);
    expect(idleLogCalls(log)[0][1]).toEqual({
      gameID: "game0377",
      idleMs: IDLE_MS + SECOND,
      anyClientJoined: false,
    });
    expect(log.warn).not.toHaveBeenCalledWith(
      "game past max duration",
      expect.anything(),
    );
  });

  test("a connected client keeps the lobby open", () => {
    const server = makeGameServer(log);
    const ws = new MockWebSocket();
    server.addClient(makeClient(ws), 0);

    tickUntil(server, 2 * IDLE_MS, GamePhase.Lobby, [ws]);
    expect(server.phase()).toBe(GamePhase.Lobby);
    expect(idleLogCalls(log)).toHaveLength(0);
  });

  test("counted from when the last player left, not from creation", () => {
    const server = makeGameServer(log);
    const ws = new MockWebSocket();
    server.addClient(makeClient(ws), 0);

    const leftAt = 5 * MINUTE;
    tickUntil(server, leftAt, GamePhase.Lobby, [ws]);
    ws.emit("close");
    expect(server.activeClients).toHaveLength(0);

    // Past creation + 30 min, but not yet 30 min since the player left.
    at(IDLE_MS + SECOND);
    expect(server.phase()).toBe(GamePhase.Lobby);

    at(leftAt + IDLE_MS - SECOND);
    expect(server.phase()).toBe(GamePhase.Lobby);

    at(leftAt + IDLE_MS + SECOND);
    expect(server.phase()).toBe(GamePhase.Finished);
    expect(idleLogCalls(log)).toHaveLength(1);
    expect(idleLogCalls(log)[0][1]).toEqual({
      gameID: "game0377",
      idleMs: IDLE_MS + SECOND,
      anyClientJoined: true,
    });
  });

  test("leaving and coming back inside the grace time keeps the lobby", () => {
    const server = makeGameServer(log);
    const ws1 = new MockWebSocket();
    server.addClient(makeClient(ws1), 0);

    const firstLeave = 5 * MINUTE;
    tickUntil(server, firstLeave, GamePhase.Lobby, [ws1]);
    ws1.emit("close");

    // Back 20 min later, on a new socket.
    const rejoin = firstLeave + 20 * MINUTE;
    tickUntil(server, rejoin, GamePhase.Lobby);
    const ws2 = new MockWebSocket();
    server.addClient(makeClient(ws2), 0);

    // Stays connected past the first deadline (firstLeave + 30 min).
    const secondLeave = firstLeave + IDLE_MS + 5 * MINUTE;
    tickUntil(server, secondLeave, GamePhase.Lobby, [ws2]);
    ws2.emit("close");

    at(secondLeave + IDLE_MS - SECOND);
    expect(server.phase()).toBe(GamePhase.Lobby);
    expect(idleLogCalls(log)).toHaveLength(0);

    at(secondLeave + IDLE_MS + SECOND);
    expect(server.phase()).toBe(GamePhase.Finished);
    expect(idleLogCalls(log)).toHaveLength(1);
  });

  test("a client dropped for missed pings counts as leaving", () => {
    const server = makeGameServer(log);
    const ws = new MockWebSocket();
    // A real socket emits "close" after close(); mirror that.
    ws.close.mockImplementation(() => ws.emit("close"));
    server.addClient(makeClient(ws), 0);

    // No pings at all: phase() ticks once a second, as GameManager does.
    let now = 0;
    while (server.activeClients.length > 0) {
      now += SECOND;
      at(now);
      expect(server.phase()).toBe(GamePhase.Lobby);
    }
    const droppedAt = now;
    expect(ws.close).toHaveBeenCalled();
    expect(droppedAt).toBe(61 * SECOND);

    at(droppedAt + IDLE_MS - SECOND);
    expect(server.phase()).toBe(GamePhase.Lobby);

    at(droppedAt + IDLE_MS + SECOND);
    expect(server.phase()).toBe(GamePhase.Finished);
    expect(idleLogCalls(log)).toHaveLength(1);
  });

  // Review R2: the tests above leave or join on a phase() tick, which refreshes the
  // clock anyway. These two pin the close-handler and addClient writes on their own.
  test("a leave between ticks is counted from the close itself", () => {
    const server = makeGameServer(log);
    const ws = new MockWebSocket();
    server.addClient(makeClient(ws), 0);

    const lastTick = 5 * MINUTE;
    tickUntil(server, lastTick, GamePhase.Lobby, [ws]);
    // Leaves 4 s after the last tick that saw them connected.
    const leftAt = lastTick + 4 * SECOND;
    at(leftAt);
    ws.emit("close");

    at(leftAt + IDLE_MS - SECOND);
    expect(server.phase()).toBe(GamePhase.Lobby);

    at(leftAt + IDLE_MS + SECOND);
    expect(server.phase()).toBe(GamePhase.Finished);
  });

  test("a join between ticks restarts the clock even if the client is gone by the next tick", () => {
    const server = makeGameServer(log);
    const ws = new MockWebSocket();

    // Joins 1 s before the creation deadline, then is kicked before any tick sees
    // them. kickClient removes them from activeClients first, so the later socket
    // close does not count (see the stale-close test below).
    const joinedAt = IDLE_MS - SECOND;
    at(joinedAt);
    server.addClient(makeClient(ws), 0);
    server.kickClient("clientAAAA" as ClientID);
    ws.emit("close");
    expect(server.activeClients).toHaveLength(0);

    at(IDLE_MS + SECOND);
    expect(server.phase()).toBe(GamePhase.Lobby);

    at(joinedAt + IDLE_MS + SECOND);
    expect(server.phase()).toBe(GamePhase.Finished);
  });

  test("a late close of a socket already replaced by a reconnect does not restart the clock", () => {
    const server = makeGameServer(log);
    const oldWs = new MockWebSocket();
    server.addClient(makeClient(oldWs), 0);

    // Reconnects on a new socket at 5 min; the old socket stays open for now.
    const reconnectAt = 5 * MINUTE;
    tickUntil(server, reconnectAt, GamePhase.Lobby, [oldWs]);
    const newWs = new MockWebSocket();
    server.addClient(makeClient(newWs), 0);

    // The player really leaves at 6 min.
    const leftAt = 6 * MINUTE;
    tickUntil(server, leftAt, GamePhase.Lobby, [newWs]);
    newWs.emit("close");

    // The old socket's close arrives much later.
    tickUntil(server, 20 * MINUTE, GamePhase.Lobby);
    oldWs.emit("close");

    at(leftAt + IDLE_MS - SECOND);
    expect(server.phase()).toBe(GamePhase.Lobby);

    at(leftAt + IDLE_MS + SECOND);
    expect(server.phase()).toBe(GamePhase.Finished);
    expect(idleLogCalls(log)).toHaveLength(1);
  });
});

describe("rule does not reach public lobbies or started games (0377)", () => {
  let log: TestLogger;

  beforeEach(() => {
    jest.useFakeTimers();
    at(0);
    log = testLogger();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  test("an empty public lobby is untouched", () => {
    const server = makeGameServer(log, GameType.Public);

    at(IDLE_MS + SECOND);
    expect(server.phase()).toBe(GamePhase.Lobby);

    at(2 * IDLE_MS);
    expect(server.phase()).toBe(GamePhase.Lobby);
    expect(idleLogCalls(log)).toHaveLength(0);
  });

  test("a started private game stays Active, then ends by the existing rule", () => {
    const server = makeGameServer(log);
    const ws = new MockWebSocket();
    server.addClient(makeClient(ws), 0);
    server.start();
    expect(server.hasStarted()).toBe(true);

    tickUntil(server, 2 * IDLE_MS, GamePhase.Active, [ws]);
    expect(server.phase()).toBe(GamePhase.Active);

    ws.emit("close");
    // Existing rule: no active client and no ping for 20 s.
    at(2 * IDLE_MS + 20 * SECOND);
    expect(server.phase()).toBe(GamePhase.Active);
    at(2 * IDLE_MS + 21 * SECOND);
    expect(server.phase()).toBe(GamePhase.Finished);

    expect(log.info).toHaveBeenCalledWith("private game complete", {
      gameID: "game0377",
    });
    expect(idleLogCalls(log)).toHaveLength(0);
  });
});
