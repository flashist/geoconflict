jest.mock("jose", () => ({
  base64url: { decode: jest.fn() },
}));

jest.mock("../src/client/Main", () => ({
  getPersistentID: jest.fn(() => "test-persistent-id"),
}));

jest.mock("../src/client/ClientGameRunner", () => ({}));

import { LocalServer } from "../src/client/LocalServer";
import { EventBus } from "../src/core/EventBus";

function makeServer(gameRecord?: unknown) {
  const lobbyConfig: any = {
    serverConfig: { turnIntervalMs: () => 1000 },
    cosmetics: {},
    playerName: "TestPlayer",
    clientID: "client-1",
    gameID: "game-1",
    token: "token",
    gameRecord,
  };
  const server = new LocalServer(lobbyConfig, jest.fn(), jest.fn(), false, new EventBus());
  return server;
}

describe("LocalServer onMessage hash guard", () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it("does not throw and logs a warning when hash arrives for a missing turn", () => {
    const server = makeServer();
    expect(() => {
      server.onMessage({ type: "hash", turnNumber: 0, hash: 42 });
    }).not.toThrow();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("turn 0"),
    );
  });

  it("stores hash when the turn entry exists at index", () => {
    const server = makeServer();
    (server as any).turns.push({ turnNumber: 0, intents: [] });
    server.onMessage({ type: "hash", turnNumber: 0, hash: 99 });
    expect((server as any).turns[0].hash).toBe(99);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("silently ignores hash messages for turns not divisible by 100", () => {
    const server = makeServer();
    expect(() => {
      server.onMessage({ type: "hash", turnNumber: 1, hash: 7 });
    }).not.toThrow();
    expect(warnSpy).not.toHaveBeenCalled();
  });
});
