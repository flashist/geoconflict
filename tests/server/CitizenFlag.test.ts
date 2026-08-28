jest.mock("jose", () => ({
  base64url: {
    decode: (value: string) => Buffer.from(value, "base64url"),
  },
}));

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
import { ClientID, GameConfig, GameStartInfo } from "../../src/core/Schemas";
import { Client } from "../../src/server/Client";
import { GameServer } from "../../src/server/GameServer";
import { ProfileApiClient } from "../../src/server/ProfileApiClient";

class MockWebSocket extends EventEmitter {
  public readyState = 1; // OPEN
  public send = jest.fn();
  public close = jest.fn();
}

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
  } as unknown as ServerConfig;
}

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
} as GameConfig;

/** A profile client whose upsert result is scripted per test. */
function stubProfileApiClient(
  upsertProfile: jest.Mock = jest.fn().mockResolvedValue(false),
): ProfileApiClient {
  return {
    upsertProfile,
    creditMatch: jest.fn().mockResolvedValue(undefined),
  } as unknown as ProfileApiClient;
}

function makeGameServer(profile: ProfileApiClient): GameServer {
  return new GameServer(
    "game1234",
    testLogger(),
    0,
    fakeConfig(),
    GAME_CONFIG,
    profile,
  );
}

function makeClient(
  ws: MockWebSocket,
  over: { clientID?: string; yandexPlayerId?: string | null; ip?: string } = {},
): Client {
  return new Client(
    (over.clientID ?? "aaaa1111") as ClientID,
    "persistent-1",
    null,
    undefined,
    undefined,
    over.ip ?? "127.0.0.1",
    "player",
    ws as never,
    undefined,
    over.yandexPlayerId === undefined ? "yx-1" : over.yandexPlayerId,
  );
}

/** Let the fire-and-forget upsert promise chain settle. */
async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

/** The frozen start roster as it actually went out over the socket. */
function broadcastStartInfo(ws: MockWebSocket): GameStartInfo {
  const startCall = ws.send.mock.calls
    .map((call) => JSON.parse(call[0] as string))
    .find((msg) => msg.type === "start");
  expect(startCall).toBeDefined();
  return startCall.gameStartInfo as GameStartInfo;
}

describe("citizen flag end-to-end on the game server (0068)", () => {
  beforeEach(() => {
    // start() installs an endTurn interval; fake timers keep it from ever firing.
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("a citizen is broadcast on the frozen start roster AND the lobby poll", async () => {
    const upsert = jest.fn().mockResolvedValue(true);
    const server = makeGameServer(stubProfileApiClient(upsert));
    const ws = new MockWebSocket();

    server.addClient(makeClient(ws), 0);
    await flushMicrotasks();

    // The lobby poll payload every client reads at 1 Hz.
    expect(server.gameInfo().clients?.[0].isCitizen).toBe(true);

    server.start();

    // The value is server-authored and broadcast, not locally derived: it is in the
    // single frozen object sent to every client.
    expect(broadcastStartInfo(ws).players[0].isCitizen).toBe(true);
    expect(upsert).toHaveBeenCalledWith("yx-1", "persistent-1");
  });

  test("a non-citizen shows no flag", async () => {
    const server = makeGameServer(
      stubProfileApiClient(jest.fn().mockResolvedValue(false)),
    );
    const ws = new MockWebSocket();

    server.addClient(makeClient(ws), 0);
    await flushMicrotasks();
    server.start();

    expect(server.gameInfo().clients?.[0].isCitizen).toBe(false);
    expect(broadcastStartInfo(ws).players[0].isCitizen).toBe(false);
  });

  test("a guest is never looked up at all and shows no flag", async () => {
    const upsert = jest.fn().mockResolvedValue(true);
    const server = makeGameServer(stubProfileApiClient(upsert));
    const ws = new MockWebSocket();

    server.addClient(makeClient(ws, { yandexPlayerId: null }), 0);
    await flushMicrotasks();
    server.start();

    expect(upsert).not.toHaveBeenCalled();
    expect(server.gameInfo().clients?.[0].isCitizen).toBe(false);
    expect(broadcastStartInfo(ws).players[0].isCitizen).toBe(false);
  });

  test("a profile-API outage does not block the join and leaves the flag false", async () => {
    // Even a REJECTING upsert (contractually impossible, defensively handled) must
    // not break the join path or surface anything to the player.
    const upsert = jest.fn().mockRejectedValue(new Error("profile api down"));
    const server = makeGameServer(stubProfileApiClient(upsert));
    const ws = new MockWebSocket();
    const client = makeClient(ws);

    expect(() => server.addClient(client, 0)).not.toThrow();
    await flushMicrotasks();

    expect(server.activeClients).toContain(client);
    expect(client.isCitizen).toBe(false);
    expect(server.gameInfo().clients?.[0].isCitizen).toBe(false);
  });

  test("a hung profile API leaves the join complete and the roster frozen without the flag", async () => {
    // A never-resolving upsert is the "slow API" case: start() must still freeze a
    // roster, just without the icon for that match (accepted residual 1).
    const server = makeGameServer(
      stubProfileApiClient(jest.fn().mockReturnValue(new Promise(() => {}))),
    );
    const ws = new MockWebSocket();
    const client = makeClient(ws);

    server.addClient(client, 0);
    await flushMicrotasks();
    server.start();

    expect(server.activeClients).toContain(client);
    expect(broadcastStartInfo(ws).players[0].isCitizen).toBe(false);
  });

  test("a reconnect carries the already-resolved flag across", async () => {
    const server = makeGameServer(
      stubProfileApiClient(jest.fn().mockResolvedValue(true)),
    );
    const wsA = new MockWebSocket();
    const clientA = makeClient(wsA);

    server.addClient(clientA, 0);
    await flushMicrotasks();
    expect(clientA.isCitizen).toBe(true);

    // Same clientID + persistentID = a reconnect. The fresh upsert is still in
    // flight at this point, so only the carry-over can supply the flag.
    const wsB = new MockWebSocket();
    const clientB = makeClient(wsB);
    server.addClient(clientB, 0);

    expect(clientB.isCitizen).toBe(true);
  });

  test("a later lookup failure never clears an already-known citizen flag", async () => {
    const upsert = jest
      .fn()
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);
    const server = makeGameServer(stubProfileApiClient(upsert));
    const ws = new MockWebSocket();
    const client = makeClient(ws);

    server.addClient(client, 0);
    await flushMicrotasks();
    expect(client.isCitizen).toBe(true);

    // A second upsert (reconnect / late identity refresh) that comes back false —
    // "false" means "unknown OR not a citizen", so it must not blink the icon off.
    server.addClient(client, 0);
    await flushMicrotasks();

    expect(client.isCitizen).toBe(true);
  });
});
