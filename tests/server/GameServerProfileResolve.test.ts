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
import { ClientID, GameConfig } from "../../src/core/Schemas";
import { Client } from "../../src/server/Client";
import { GameServer } from "../../src/server/GameServer";
import { ProfileApiClient } from "../../src/server/ProfileApiClient";

/**
 * Task 0272 (S3). The game server resolves a creditable identity to the internal
 * player id when it first learns it — join, a late `update_identity`, a reconnect —
 * exactly once per client object, fail-soft and without ever awaiting on the join
 * path. The profile client is mocked; the near-end-to-end proof over a real profile
 * server and Postgres is tests/integration/GameServerProfileCredit.it.test.ts.
 */

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

const PLAYER_1 = "0b6f8a52-3c1e-4d7a-9f10-2a4b6c8d0e01";

function resolvedAs(playerId: string, isCitizen = false) {
  return { playerId, isCitizen };
}

function makeServer(resolvePlayer: jest.Mock): GameServer {
  return new GameServer(
    "game1234",
    testLogger(),
    0,
    fakeConfig(),
    GAME_CONFIG,
    {
      resolvePlayer,
      creditMatch: jest.fn().mockResolvedValue(undefined),
    } as unknown as ProfileApiClient,
  );
}

function makeClient(
  ws: MockWebSocket,
  yandexPlayerId: string | null = "yx-1",
): Client {
  return new Client(
    "aaaa1111" as ClientID,
    "persistent-1",
    null,
    undefined,
    undefined,
    "127.0.0.1",
    "player",
    ws as never,
    undefined,
    yandexPlayerId,
  );
}

/** Let fire-and-forget promise chains settle (works under fake timers too). */
async function flushPromises(): Promise<void> {
  for (let i = 0; i < 20; i++) {
    await Promise.resolve();
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

function sendUpdateIdentity(ws: MockWebSocket, yandexPlayerId: string) {
  ws.emit(
    "message",
    JSON.stringify({ type: "update_identity", yandexPlayerId }),
  );
}

describe("GameServer resolves the profile player id (task 0272)", () => {
  test("join resolves exactly once with the creditable id and sets profilePlayerId", async () => {
    const resolvePlayer = jest.fn().mockResolvedValue(resolvedAs(PLAYER_1));
    const server = makeServer(resolvePlayer);
    const client = makeClient(new MockWebSocket());

    server.addClient(client, 0);
    expect(client.profilePlayerId).toBeNull();
    await flushPromises();

    expect(resolvePlayer).toHaveBeenCalledTimes(1);
    expect(resolvePlayer).toHaveBeenCalledWith("yx-1");
    expect(client.profilePlayerId).toBe(PLAYER_1);
  });

  test("a guest is never resolved", async () => {
    const resolvePlayer = jest.fn().mockResolvedValue(resolvedAs(PLAYER_1));
    const server = makeServer(resolvePlayer);
    const client = makeClient(new MockWebSocket(), null);

    server.addClient(client, 0);
    await flushPromises();

    expect(resolvePlayer).not.toHaveBeenCalled();
    expect(client.profilePlayerId).toBeNull();
  });

  test("update_identity null→value resolves once; a repeat for a known id resolves nothing more", async () => {
    const resolvePlayer = jest.fn().mockResolvedValue(resolvedAs(PLAYER_1));
    const server = makeServer(resolvePlayer);
    const ws = new MockWebSocket();
    const client = makeClient(ws, null);
    server.addClient(client, 0);
    await flushPromises();
    expect(resolvePlayer).not.toHaveBeenCalled();

    sendUpdateIdentity(ws, "yx-late");
    await flushPromises();
    expect(resolvePlayer).toHaveBeenCalledTimes(1);
    expect(resolvePlayer).toHaveBeenCalledWith("yx-late");
    expect(client.profilePlayerId).toBe(PLAYER_1);

    sendUpdateIdentity(ws, "yx-late");
    sendUpdateIdentity(ws, "yx-other");
    await flushPromises();
    expect(resolvePlayer).toHaveBeenCalledTimes(1);
  });

  describe("reconnect", () => {
    test("resolves once on the new socket and carries the id across when the identity matches", async () => {
      const second = deferred<ReturnType<typeof resolvedAs> | null>();
      const resolvePlayer = jest
        .fn()
        .mockResolvedValueOnce(resolvedAs(PLAYER_1))
        .mockReturnValueOnce(second.promise);
      const server = makeServer(resolvePlayer);
      const clientA = makeClient(new MockWebSocket());
      server.addClient(clientA, 0);
      await flushPromises();

      const clientB = makeClient(new MockWebSocket());
      server.addClient(clientB, 5);

      // Carried synchronously — the new socket's own resolve is still in flight.
      expect(clientB.profilePlayerId).toBe(PLAYER_1);
      expect(resolvePlayer).toHaveBeenCalledTimes(2);
      expect(resolvePlayer).toHaveBeenLastCalledWith("yx-1");

      second.resolve(resolvedAs(PLAYER_1));
      await flushPromises();
      expect(clientB.profilePlayerId).toBe(PLAYER_1);
      expect(resolvePlayer).toHaveBeenCalledTimes(2);
    });

    test("never carries the id across a different identity", async () => {
      const resolvePlayer = jest
        .fn()
        .mockResolvedValueOnce(resolvedAs(PLAYER_1))
        .mockReturnValueOnce(new Promise(() => {}));
      const server = makeServer(resolvePlayer);
      server.addClient(makeClient(new MockWebSocket(), "yx-1"), 0);
      await flushPromises();

      const clientB = makeClient(new MockWebSocket(), "yx-2");
      server.addClient(clientB, 5);
      await flushPromises();

      expect(clientB.profilePlayerId).toBeNull();
      expect(resolvePlayer).toHaveBeenLastCalledWith("yx-2");
    });

    test("never carries the id to a reconnect with no identity", async () => {
      const resolvePlayer = jest.fn().mockResolvedValue(resolvedAs(PLAYER_1));
      const server = makeServer(resolvePlayer);
      server.addClient(makeClient(new MockWebSocket(), "yx-1"), 0);
      await flushPromises();

      const clientB = makeClient(new MockWebSocket(), null);
      server.addClient(clientB, 5);
      await flushPromises();

      expect(clientB.profilePlayerId).toBeNull();
      expect(resolvePlayer).toHaveBeenCalledTimes(1);
    });

    test("a late resolve for the OLD socket never lands on the new client", async () => {
      const first = deferred<ReturnType<typeof resolvedAs> | null>();
      const resolvePlayer = jest
        .fn()
        .mockReturnValueOnce(first.promise)
        .mockReturnValueOnce(new Promise(() => {}));
      const server = makeServer(resolvePlayer);
      const clientA = makeClient(new MockWebSocket(), "yx-1");
      server.addClient(clientA, 0);

      const clientB = makeClient(new MockWebSocket(), "yx-2");
      server.addClient(clientB, 5);
      first.resolve(resolvedAs(PLAYER_1));
      await flushPromises();

      expect(clientA.profilePlayerId).toBe(PLAYER_1);
      expect(clientB.profilePlayerId).toBeNull();
    });
  });

  describe("fail-soft, never blocking the join", () => {
    test("a resolve that never settles leaves the join complete and the listener attached", async () => {
      const server = makeServer(
        jest.fn().mockReturnValue(new Promise(() => {})),
      );
      const ws = new MockWebSocket();
      const client = makeClient(ws);

      const returned = server.addClient(client, 0);

      expect(returned).toBeUndefined();
      expect(server.activeClients).toContain(client);
      expect(ws.listenerCount("message")).toBe(1);
      await flushPromises();
      expect(client.profilePlayerId).toBeNull();
    });

    test("a rejecting resolve (contractually impossible) causes no unhandled rejection", async () => {
      const unhandled: unknown[] = [];
      const onUnhandled = (reason: unknown) => unhandled.push(reason);
      process.on("unhandledRejection", onUnhandled);
      try {
        const server = makeServer(
          jest.fn().mockRejectedValue(new Error("profile api down")),
        );
        const ws = new MockWebSocket();
        const client = makeClient(ws);

        expect(() => server.addClient(client, 0)).not.toThrow();
        await new Promise((resolve) => setImmediate(resolve));

        expect(server.activeClients).toContain(client);
        expect(ws.listenerCount("message")).toBe(1);
        expect(client.profilePlayerId).toBeNull();
        expect(unhandled).toEqual([]);
      } finally {
        process.off("unhandledRejection", onUnhandled);
      }
    });

    test("a failed (null) join resolve is retried by the next identity event", async () => {
      const resolvePlayer = jest
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(resolvedAs(PLAYER_1));
      const server = makeServer(resolvePlayer);
      const clientA = makeClient(new MockWebSocket());
      server.addClient(clientA, 0);
      await flushPromises();
      expect(clientA.profilePlayerId).toBeNull();

      const clientB = makeClient(new MockWebSocket());
      server.addClient(clientB, 5);
      await flushPromises();

      expect(resolvePlayer).toHaveBeenCalledTimes(2);
      expect(clientB.profilePlayerId).toBe(PLAYER_1);
    });
  });

  test("isCitizen is only ever turned on, never cleared by a later resolve", async () => {
    const resolvePlayer = jest
      .fn()
      .mockResolvedValueOnce(resolvedAs(PLAYER_1, true))
      .mockResolvedValueOnce(resolvedAs(PLAYER_1, false))
      .mockResolvedValueOnce(null);
    const server = makeServer(resolvePlayer);
    const clientA = makeClient(new MockWebSocket());
    server.addClient(clientA, 0);
    await flushPromises();
    expect(clientA.isCitizen).toBe(true);

    const clientB = makeClient(new MockWebSocket());
    server.addClient(clientB, 5);
    await flushPromises();
    expect(clientB.isCitizen).toBe(true);

    const clientC = makeClient(new MockWebSocket());
    server.addClient(clientC, 9);
    await flushPromises();
    expect(clientC.isCitizen).toBe(true);
    expect(resolvePlayer).toHaveBeenCalledTimes(3);
  });

  describe("the internal id never reaches a client", () => {
    beforeEach(() => {
      // start() installs an endTurn interval; fake timers keep it from ever firing.
      jest.useFakeTimers();
    });
    afterEach(() => {
      jest.useRealTimers();
    });

    test("no ws.send payload and no lobby poll carries the playerId", async () => {
      const server = makeServer(
        jest.fn().mockResolvedValue(resolvedAs(PLAYER_1, true)),
      );
      const ws = new MockWebSocket();
      const client = makeClient(ws);

      server.addClient(client, 0);
      await flushPromises();
      expect(client.profilePlayerId).toBe(PLAYER_1);
      const lobbyPoll = JSON.stringify(server.gameInfo());
      server.start();

      expect(ws.send).toHaveBeenCalled();
      for (const call of ws.send.mock.calls) {
        expect(String(call[0])).not.toContain(PLAYER_1);
      }
      expect(lobbyPoll).not.toContain(PLAYER_1);
    });
  });
});
