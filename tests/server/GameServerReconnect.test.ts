jest.mock("jose", () => ({
  base64url: {
    decode: (value: string) => Buffer.from(value, "base64url"),
  },
}));

import { EventEmitter } from "events";
import { Logger } from "winston";
import { GameEnv, ServerConfig } from "../../src/core/configuration/Config";
import { GameType } from "../../src/core/game/Game";
import { ClientID, GameConfig } from "../../src/core/Schemas";
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
  } as unknown as ServerConfig;
}

function noopProfileApiClient(): ProfileApiClient {
  return {
    upsertProfile: jest.fn().mockResolvedValue(undefined),
    creditMatch: jest.fn().mockResolvedValue(undefined),
  } as unknown as ProfileApiClient;
}

function makeGameServer(): GameServer {
  return new GameServer(
    "game1234",
    testLogger(),
    0,
    fakeConfig(),
    { gameType: GameType.Private } as unknown as GameConfig,
    noopProfileApiClient(),
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

describe("GameServer reconnect / close handling (N2)", () => {
  test("a stale old-socket close does not evict the reconnected live client", () => {
    const server = makeGameServer();

    const wsA = new MockWebSocket();
    const wsB = new MockWebSocket();
    const clientA = makeClient(wsA);
    const clientB = makeClient(wsB); // same clientID + persistentID = a reconnect

    server.addClient(clientA, 0);
    server.addClient(clientB, 5); // reconnect: replaces A with B in activeClients

    // The old socket's close fires AFTER the reconnect (half-open TCP / NAT rebind).
    wsA.emit("close");

    // B (the live client) must survive — the close removes only A's instance.
    expect(server.activeClients).toContain(clientB);
    expect(server.activeClients).not.toContain(clientA);
    expect(
      server.activeClients.filter((c) => c.clientID === "clientAAAA"),
    ).toHaveLength(1);
  });

  test("a normal disconnect still removes the client", () => {
    const server = makeGameServer();
    const ws = new MockWebSocket();
    const client = makeClient(ws);

    server.addClient(client, 0);
    expect(server.activeClients).toContain(client);

    ws.emit("close");
    expect(server.activeClients).not.toContain(client);
  });
});
