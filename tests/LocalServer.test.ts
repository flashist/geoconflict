jest.mock("jose", () => ({
  base64url: { decode: jest.fn() },
}));

jest.mock("../src/client/Main", () => ({
  getPersistentID: jest.fn(() => "test-persistent-id"),
}));

jest.mock("../src/client/OtelBrowserInit", () => ({
  logOtelWarn: jest.fn(),
}));

jest.mock("../src/client/ClientGameRunner", () => ({}));

import { LocalServer } from "../src/client/LocalServer";
import { EventBus } from "../src/core/EventBus";
import { logOtelWarn } from "../src/client/OtelBrowserInit";

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
  const server = new LocalServer(
    lobbyConfig,
    jest.fn(),
    jest.fn(),
    false,
    new EventBus(),
  );
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

  it("does not throw, logs console.warn and logOtelWarn with delta when hash arrives for a missing turn", () => {
    const server = makeServer();
    expect(() => {
      server.onMessage({ type: "hash", turnNumber: 0, hash: 42 });
    }).not.toThrow();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("turn=0"));
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("delta="));
    expect(logOtelWarn).toHaveBeenCalledWith(expect.stringContaining("delta="));
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

/**
 * Task 0211, verification step 4c. A Singleplayer or archived-replay match must
 * credit ZERO XP to ANYONE, and 0211 relocates the crediting trigger — the change
 * most likely to break that property, with nothing in the codebase that would
 * object. Nothing asserted it before this test existed.
 *
 * ⛔ Scope, stated honestly: this is a UNIT-LEVEL STAND-IN, not an end-to-end
 * Singleplayer play-through. It asserts that LocalServer — the only "server" a solo
 * match has — does nothing at all with the new message type. There is no local
 * crediting path for it to reach, because LocalServer has no credit code and no
 * profile client. Transport's own refusal to send in local mode is covered
 * separately in tests/client/TransportParticipation.test.ts.
 */
describe("LocalServer and the participation message (task 0211)", () => {
  it("ignores a participation message: no throw, no state, nothing credited", () => {
    const server = makeServer();
    const before = JSON.stringify({
      turns: (server as any).turns,
      intents: (server as any).intents,
      winner: (server as any).winner,
    });

    expect(() => {
      server.onMessage({
        type: "participation",
        hasSpawned: true,
        isAliveNow: false,
        killedAt: 42,
      });
    }).not.toThrow();

    // LocalServer's onMessage is three bare `if` blocks with no `else` and no
    // `default`, so an unknown type falls through untouched. Asserted rather than
    // read off the source, because that shape is exactly what a future `default:`
    // branch would quietly change.
    expect(
      JSON.stringify({
        turns: (server as any).turns,
        intents: (server as any).intents,
        winner: (server as any).winner,
      }),
    ).toEqual(before);
    // Not a game action: it must never enter the deterministic turn stream.
    expect((server as any).intents).toHaveLength(0);
  });

  it("ignores a participation message during a replay too", () => {
    const server = makeServer({ turns: [], gitCommit: "x" });
    expect(() => {
      server.onMessage({
        type: "participation",
        hasSpawned: true,
        isAliveNow: true,
      });
    }).not.toThrow();
    expect((server as any).intents).toHaveLength(0);
  });
});
