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
import {
  GameServer,
  MAX_LATE_PROFILE_SESSIONS_PER_CLIENT,
} from "../../src/server/GameServer";
import { ProfileApiClient } from "../../src/server/ProfileApiClient";

/**
 * Task 0332 (ADR-124). The game server forwards the player's profile session token
 * on its resolve call, and the profile server vouches for it. These pin the game
 * side: which resolve carries the token, when it is dropped (owner ruling Q1:
 * after ANY answer), the chaining of a late token after a resolve in flight, the
 * reconnect carry, and the start-time identity counter. The profile client is
 * mocked; every id and token here is synthetic.
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
const TOKEN = "v1.zz0332-synthetic-token-a.mac";
const TOKEN_2 = "v1.zz0332-synthetic-token-b.mac";

function reply(verified?: boolean) {
  return verified === undefined
    ? { playerId: PLAYER_1, isCitizen: false }
    : { playerId: PLAYER_1, isCitizen: false, verified };
}

function makeServer(
  resolvePlayer: jest.Mock,
  lobbyCreatorID?: string,
  log: Logger = testLogger(),
): GameServer {
  return new GameServer(
    "game1234",
    log,
    0,
    fakeConfig(),
    GAME_CONFIG,
    {
      resolvePlayer,
      creditMatch: jest.fn().mockResolvedValue(undefined),
    } as unknown as ProfileApiClient,
    lobbyCreatorID,
  );
}

function makeClient(
  ws: MockWebSocket,
  over: {
    clientID?: string;
    yandexPlayerId?: string | null;
    profileSession?: string | null;
  } = {},
): Client {
  const client = new Client(
    (over.clientID ?? "aaaa1111") as ClientID,
    "persistent-1",
    null,
    undefined,
    undefined,
    "127.0.0.1",
    "player",
    ws as never,
    undefined,
    over.yandexPlayerId === undefined ? "yx-1" : over.yandexPlayerId,
  );
  // What Worker does with a join's token, right after construction.
  client.profileSession = over.profileSession ?? null;
  return client;
}

/** Let fire-and-forget promise chains settle (works under fake timers too). */
async function flushPromises(): Promise<void> {
  for (let i = 0; i < 30; i++) {
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

function sendUpdateIdentity(
  ws: MockWebSocket,
  yandexPlayerId: string,
  profileSession?: string,
) {
  ws.emit(
    "message",
    JSON.stringify({
      type: "update_identity",
      yandexPlayerId,
      ...(profileSession !== undefined ? { profileSession } : {}),
    }),
  );
}

describe("GameServer: the profile server vouches for the join token (task 0332)", () => {
  test("1. a join with a token and a verified:true reply → verified, token dropped", async () => {
    const resolvePlayer = jest.fn().mockResolvedValue(reply(true));
    const server = makeServer(resolvePlayer);
    const client = makeClient(new MockWebSocket(), { profileSession: TOKEN });

    server.addClient(client, 0);
    await flushPromises();

    expect(resolvePlayer).toHaveBeenCalledTimes(1);
    expect(resolvePlayer.mock.calls[0]).toEqual(["yx-1", TOKEN]);
    expect(client.identityVerified).toBe(true);
    expect(client.profileSession).toBeNull();
    expect(client.profilePlayerId).toBe(PLAYER_1);
  });

  test("2. a verified:false reply → unverified, token dropped (the answer is final)", async () => {
    const resolvePlayer = jest.fn().mockResolvedValue(reply(false));
    const server = makeServer(resolvePlayer);
    const client = makeClient(new MockWebSocket(), { profileSession: TOKEN });

    server.addClient(client, 0);
    await flushPromises();

    expect(client.identityVerified).toBe(false);
    expect(client.profileSession).toBeNull();
    expect(client.profilePlayerId).toBe(PLAYER_1);
  });

  test("3. no `verified` in the reply (old profile server) → unverified, token KEPT", async () => {
    const resolvePlayer = jest.fn().mockResolvedValue(reply());
    const server = makeServer(resolvePlayer);
    const client = makeClient(new MockWebSocket(), { profileSession: TOKEN });

    server.addClient(client, 0);
    await flushPromises();

    expect(client.identityVerified).toBe(false);
    expect(client.profileSession).toBe(TOKEN);
    expect(client.profilePlayerId).toBe(PLAYER_1);
  });

  test("4. a failed resolve keeps the token, and a later lazy resolve (lobby gate) carries it", async () => {
    const resolvePlayer = jest
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(reply(true));
    const server = makeServer(resolvePlayer, "aaaa1111");
    const client = makeClient(new MockWebSocket(), { profileSession: TOKEN });

    server.addClient(client, 0);
    await flushPromises();
    expect(client.profileSession).toBe(TOKEN);
    expect(client.identityVerified).toBe(false);

    // The private-lobby gate resolves lazily when the creator is not a known citizen.
    await server.creatorMayStartPrivateLobby(1000);

    expect(resolvePlayer).toHaveBeenCalledTimes(2);
    expect(resolvePlayer.mock.calls[1]).toEqual(["yx-1", TOKEN]);
    expect(client.identityVerified).toBe(true);
    expect(client.profileSession).toBeNull();
  });

  test("5. a late token via update_identity (id already known) → a second resolve carries it → verified", async () => {
    const resolvePlayer = jest
      .fn()
      .mockResolvedValueOnce(reply(false))
      .mockResolvedValueOnce(reply(true));
    const server = makeServer(resolvePlayer);
    const ws = new MockWebSocket();
    const client = makeClient(ws);

    server.addClient(client, 0);
    await flushPromises();
    expect(resolvePlayer.mock.calls[0]).toEqual(["yx-1"]);

    sendUpdateIdentity(ws, "yx-1", TOKEN);
    await flushPromises();

    expect(resolvePlayer).toHaveBeenCalledTimes(2);
    expect(resolvePlayer.mock.calls[1]).toEqual(["yx-1", TOKEN]);
    expect(client.identityVerified).toBe(true);
    expect(client.profileSession).toBeNull();
  });

  test("6. a late token sent with a DIFFERENT id → id unchanged, the original id is resolved with the token", async () => {
    // What the profile server answers for another player's token: other_player.
    const resolvePlayer = jest
      .fn()
      .mockResolvedValueOnce(reply(false))
      .mockResolvedValueOnce(reply(false));
    const server = makeServer(resolvePlayer);
    const ws = new MockWebSocket();
    const client = makeClient(ws);

    server.addClient(client, 0);
    await flushPromises();
    sendUpdateIdentity(ws, "yx-other", TOKEN);
    await flushPromises();

    expect(client.yandexPlayerId).toBe("yx-1");
    expect(resolvePlayer).toHaveBeenCalledTimes(2);
    expect(resolvePlayer.mock.calls[1]).toEqual(["yx-1", TOKEN]);
    expect(client.identityVerified).toBe(false);
  });

  test("7. a token arriving mid-resolve gets ONE chained resolve, after the first settles", async () => {
    const first = deferred<ReturnType<typeof reply> | null>();
    const second = deferred<ReturnType<typeof reply> | null>();
    const resolvePlayer = jest
      .fn()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise)
      .mockResolvedValue(reply(false));
    const server = makeServer(resolvePlayer);
    const ws = new MockWebSocket();
    const client = makeClient(ws);

    server.addClient(client, 0);
    await flushPromises();
    expect(resolvePlayer).toHaveBeenCalledTimes(1);

    sendUpdateIdentity(ws, "yx-1", TOKEN);
    await flushPromises();
    // Chained, not started beside the tokenless one.
    expect(resolvePlayer).toHaveBeenCalledTimes(1);

    first.resolve(reply(false));
    await flushPromises();
    expect(resolvePlayer).toHaveBeenCalledTimes(2);
    expect(resolvePlayer.mock.calls[1]).toEqual(["yx-1", TOKEN]);

    // The first resolve's cleanup must not have removed the chained entry: a
    // tokenless caller now shares the chained resolve instead of starting a third.
    void (server as any).startProfileResolve(client);
    await flushPromises();
    expect(resolvePlayer).toHaveBeenCalledTimes(2);

    second.resolve(reply(true));
    await flushPromises();
    expect(resolvePlayer).toHaveBeenCalledTimes(2);
    expect(client.identityVerified).toBe(true);
    expect(client.profileSession).toBeNull();

    // Both settled: the map is empty, so a new event starts a fresh resolve.
    expect((server as any).profileResolves.has(client)).toBe(false);
    void (server as any).startProfileResolve(client);
    await flushPromises();
    expect(resolvePlayer).toHaveBeenCalledTimes(3);
    // Verified: the fresh resolve carries no token.
    expect(resolvePlayer.mock.calls[2]).toEqual(["yx-1"]);
  });

  test("7b. a token newer than the one in flight survives that resolve's answer", async () => {
    const first = deferred<ReturnType<typeof reply> | null>();
    const resolvePlayer = jest
      .fn()
      .mockReturnValueOnce(first.promise)
      .mockResolvedValueOnce(reply(true));
    const server = makeServer(resolvePlayer);
    const ws = new MockWebSocket();
    const client = makeClient(ws, { profileSession: TOKEN });

    server.addClient(client, 0);
    await flushPromises();
    sendUpdateIdentity(ws, "yx-1", TOKEN_2);
    await flushPromises();
    expect(client.profileSession).toBe(TOKEN_2);

    first.resolve(reply(false));
    await flushPromises();

    // TOKEN's answer did not drop TOKEN_2; the chained resolve carried it.
    expect(resolvePlayer).toHaveBeenCalledTimes(2);
    expect(resolvePlayer.mock.calls[0]).toEqual(["yx-1", TOKEN]);
    expect(resolvePlayer.mock.calls[1]).toEqual(["yx-1", TOKEN_2]);
    expect(client.identityVerified).toBe(true);
    expect(client.profileSession).toBeNull();
  });

  test("8. a reconnect with the same id carries verified and drops the new token; a different id carries nothing", async () => {
    const resolvePlayer = jest.fn().mockResolvedValue(reply(true));
    const server = makeServer(resolvePlayer);
    const original = makeClient(new MockWebSocket(), {
      profileSession: TOKEN,
    });
    server.addClient(original, 0);
    await flushPromises();
    expect(original.identityVerified).toBe(true);

    resolvePlayer.mockClear();
    resolvePlayer.mockResolvedValue(reply(false));
    const sameId = makeClient(new MockWebSocket(), {
      profileSession: TOKEN_2,
    });
    server.addClient(sameId, 1);
    expect(sameId.identityVerified).toBe(true);
    expect(sameId.profileSession).toBeNull();
    await flushPromises();
    // The fresh resolve after the carry goes out without a token...
    expect(resolvePlayer.mock.calls[0]).toEqual(["yx-1"]);
    // ...and its answer cannot clear the carried vouch.
    expect(sameId.identityVerified).toBe(true);

    resolvePlayer.mockClear();
    const otherId = makeClient(new MockWebSocket(), {
      yandexPlayerId: "yx-2",
      profileSession: TOKEN_2,
    });
    server.addClient(otherId, 2);
    expect(otherId.identityVerified).toBe(false);
    expect(otherId.profileSession).toBe(TOKEN_2);
    await flushPromises();
    expect(resolvePlayer.mock.calls[0]).toEqual(["yx-2", TOKEN_2]);
    expect(otherId.identityVerified).toBe(false);
  });

  test("9. verified never goes back to false — not after a later false, a tokenless or a failed resolve", async () => {
    const first = deferred<ReturnType<typeof reply> | null>();
    const resolvePlayer = jest
      .fn()
      .mockReturnValueOnce(first.promise)
      // The chained resolve carrying TOKEN_2 answers false.
      .mockResolvedValueOnce(reply(false))
      // A later tokenless resolve, then a failed one.
      .mockResolvedValueOnce(reply(false))
      .mockResolvedValueOnce(null);
    const server = makeServer(resolvePlayer);
    const ws = new MockWebSocket();
    const client = makeClient(ws, { profileSession: TOKEN });

    server.addClient(client, 0);
    await flushPromises();
    sendUpdateIdentity(ws, "yx-1", TOKEN_2);
    await flushPromises();
    first.resolve(reply(true));
    await flushPromises();
    expect(resolvePlayer).toHaveBeenCalledTimes(2);
    expect(resolvePlayer.mock.calls[1]).toEqual(["yx-1", TOKEN_2]);
    expect(client.identityVerified).toBe(true);
    expect(client.profileSession).toBeNull();

    await (server as any).startProfileResolve(client);
    expect(client.identityVerified).toBe(true);
    await (server as any).startProfileResolve(client);
    expect(resolvePlayer).toHaveBeenCalledTimes(4);
    expect(client.identityVerified).toBe(true);
  });

  test("10. a token sent after verification is ignored — no extra resolve", async () => {
    const resolvePlayer = jest.fn().mockResolvedValue(reply(true));
    const server = makeServer(resolvePlayer);
    const ws = new MockWebSocket();
    const client = makeClient(ws, { profileSession: TOKEN });

    server.addClient(client, 0);
    await flushPromises();
    expect(client.identityVerified).toBe(true);

    sendUpdateIdentity(ws, "yx-1", TOKEN_2);
    await flushPromises();

    expect(resolvePlayer).toHaveBeenCalledTimes(1);
    expect(client.profileSession).toBeNull();
  });

  test("11. a join with no token → resolvePlayer is called with the id only", async () => {
    const resolvePlayer = jest.fn().mockResolvedValue(reply(false));
    const server = makeServer(resolvePlayer);
    const client = makeClient(new MockWebSocket());

    server.addClient(client, 0);
    await flushPromises();

    expect(resolvePlayer).toHaveBeenCalledTimes(1);
    expect(resolvePlayer.mock.calls[0]).toEqual(["yx-1"]);
    expect(client.identityVerified).toBe(false);
  });

  // Review R1: one socket could drive one profile resolve per update_identity by
  // sending a new token each time (measured: 50 tokens → 51 resolves).
  test("R1. a token arriving while a resolve is QUEUED shares it, and the queue carries the newest token", async () => {
    const first = deferred<ReturnType<typeof reply> | null>();
    const resolvePlayer = jest
      .fn()
      .mockReturnValueOnce(first.promise)
      .mockResolvedValue(reply(false));
    const server = makeServer(resolvePlayer);
    const ws = new MockWebSocket();
    const client = makeClient(ws);

    server.addClient(client, 0);
    await flushPromises();
    sendUpdateIdentity(ws, "yx-1", TOKEN);
    sendUpdateIdentity(ws, "yx-1", TOKEN_2);
    await flushPromises();
    expect(resolvePlayer).toHaveBeenCalledTimes(1);

    first.resolve(reply(false));
    await flushPromises();

    // ONE queued resolve, carrying the newest token — not one per token.
    expect(resolvePlayer).toHaveBeenCalledTimes(2);
    expect(resolvePlayer.mock.calls[1]).toEqual(["yx-1", TOKEN_2]);
    expect((server as any).profileResolves.has(client)).toBe(false);
  });

  test("R1. a burst of new tokens mid-resolve costs one extra resolve, not one each", async () => {
    const first = deferred<ReturnType<typeof reply> | null>();
    const resolvePlayer = jest
      .fn()
      .mockReturnValueOnce(first.promise)
      .mockResolvedValue(reply(false));
    const server = makeServer(resolvePlayer);
    const ws = new MockWebSocket();
    const client = makeClient(ws);

    server.addClient(client, 0);
    await flushPromises();
    for (let i = 0; i < 50; i++) {
      sendUpdateIdentity(ws, "yx-1", `v1.zz0332-burst-${i}.mac`);
    }
    await flushPromises();
    first.resolve(reply(false));
    await flushPromises();

    expect(resolvePlayer).toHaveBeenCalledTimes(2);
  });

  test("R1. at most MAX_LATE_PROFILE_SESSIONS_PER_CLIENT late tokens are taken, with one warn line", async () => {
    const resolvePlayer = jest.fn().mockResolvedValue(reply(false));
    const log = testLogger();
    const server = makeServer(resolvePlayer, undefined, log);
    const ws = new MockWebSocket();
    const client = makeClient(ws);

    server.addClient(client, 0);
    await flushPromises();
    // One at a time, each after the last resolve answered — so nothing is queued
    // and only the limit stops them.
    for (let i = 0; i < MAX_LATE_PROFILE_SESSIONS_PER_CLIENT + 3; i++) {
      sendUpdateIdentity(ws, "yx-1", `v1.zz0332-serial-${i}.mac`);
      await flushPromises();
    }

    // The join's tokenless resolve, plus one per accepted token.
    expect(resolvePlayer).toHaveBeenCalledTimes(
      1 + MAX_LATE_PROFILE_SESSIONS_PER_CLIENT,
    );
    expect(client.profileSession).toBeNull();
    const warns = (log.warn as jest.Mock).mock.calls.filter(
      ([line]) =>
        line === "client sent too many profile session tokens; ignored",
    );
    expect(warns).toHaveLength(1);
    expect(warns[0][1]).toEqual({ clientID: "aaaa1111" });
    expect(JSON.stringify((log.warn as jest.Mock).mock.calls)).not.toContain(
      "zz0332-serial",
    );
  });

  test("R1. a reconnect's new Client starts the late-token limit again", async () => {
    const resolvePlayer = jest.fn().mockResolvedValue(reply(false));
    const server = makeServer(resolvePlayer);
    const ws = new MockWebSocket();
    const client = makeClient(ws);
    server.addClient(client, 0);
    await flushPromises();
    for (let i = 0; i < MAX_LATE_PROFILE_SESSIONS_PER_CLIENT + 1; i++) {
      sendUpdateIdentity(ws, "yx-1", `v1.zz0332-first-socket-${i}.mac`);
      await flushPromises();
    }

    resolvePlayer.mockClear();
    const ws2 = new MockWebSocket();
    const reconnected = makeClient(ws2);
    server.addClient(reconnected, 1);
    await flushPromises();
    sendUpdateIdentity(ws2, "yx-1", TOKEN);
    await flushPromises();

    expect(resolvePlayer.mock.calls).toContainEqual(["yx-1", TOKEN]);
  });

  test("a guest's token is held, and resolved once the late id arrives", async () => {
    const resolvePlayer = jest.fn().mockResolvedValue(reply(true));
    const server = makeServer(resolvePlayer);
    const ws = new MockWebSocket();
    const client = makeClient(ws, { yandexPlayerId: null });

    server.addClient(client, 0);
    await flushPromises();
    expect(resolvePlayer).not.toHaveBeenCalled();

    sendUpdateIdentity(ws, "yx-1", TOKEN);
    await flushPromises();

    expect(resolvePlayer).toHaveBeenCalledTimes(1);
    expect(resolvePlayer.mock.calls[0]).toEqual(["yx-1", TOKEN]);
    expect(client.identityVerified).toBe(true);
  });
});

describe("GameServer: start-time identity counter (task 0332)", () => {
  beforeEach(() => {
    // start() installs an endTurn interval; fake timers keep it from ever firing.
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function resolveById(): jest.Mock {
    return jest.fn().mockImplementation(async (id: string) => {
      if (id === "yx-unresolved") return null;
      if (id === "yx-verified") return reply(true);
      return reply(false);
    });
  }

  test("12. one guest, one unresolved, one verified and one unverified → 1/1/1/1", async () => {
    const server = makeServer(resolveById());
    server.addClient(
      makeClient(new MockWebSocket(), {
        clientID: "guest001",
        yandexPlayerId: null,
      }),
      0,
    );
    server.addClient(
      makeClient(new MockWebSocket(), {
        clientID: "unres001",
        yandexPlayerId: "yx-unresolved",
        profileSession: TOKEN,
      }),
      0,
    );
    server.addClient(
      makeClient(new MockWebSocket(), {
        clientID: "verif001",
        yandexPlayerId: "yx-verified",
        profileSession: TOKEN,
      }),
      0,
    );
    server.addClient(
      makeClient(new MockWebSocket(), {
        clientID: "unver001",
        yandexPlayerId: "yx-unverified",
      }),
      0,
    );
    await flushPromises();

    server.start();

    expect(server.matchIdentityCounts).toEqual({
      guest: 1,
      unresolved: 1,
      verified: 1,
      unverified: 1,
    });

    // Late joiners after start() are not counted, and start() counts only once.
    server.addClient(
      makeClient(new MockWebSocket(), {
        clientID: "late0001",
        yandexPlayerId: null,
      }),
      0,
    );
    server.start();
    expect(server.matchIdentityCounts).toEqual({
      guest: 1,
      unresolved: 1,
      verified: 1,
      unverified: 1,
    });
  });

  test("an id whose resolve is still in flight at start counts as unresolved", async () => {
    const pending = deferred<ReturnType<typeof reply> | null>();
    const server = makeServer(jest.fn().mockReturnValue(pending.promise));
    server.addClient(
      makeClient(new MockWebSocket(), { profileSession: TOKEN }),
      0,
    );

    server.start();

    expect(server.matchIdentityCounts).toEqual({
      guest: 0,
      unresolved: 1,
      verified: 0,
      unverified: 0,
    });
  });

  test("a roster that fails its schema counts nothing", async () => {
    const server = makeServer(resolveById());
    // An invalid clientID makes GameStartInfoSchema refuse the roster.
    server.addClient(
      makeClient(new MockWebSocket(), {
        clientID: "bad",
        yandexPlayerId: "yx-verified",
      }),
      0,
    );
    await flushPromises();

    server.start();

    expect(server.matchIdentityCounts).toEqual({
      guest: 0,
      unresolved: 0,
      verified: 0,
      unverified: 0,
    });
  });
});
