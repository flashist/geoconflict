// Task 0322: the game server shows a citizen's APPROVED name to other players,
// read off the profile resolve it already makes at join (the 0068 seam, through
// the ADR-103 identity funnel). One swap point feeds both the lobby poll
// (gameInfo) and the frozen start roster (start). The profile client is mocked;
// the harness is tests/server/CitizenFlag.test.ts's.

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

const PLAYER_ID = "0b6f8a52-3c1e-4d7a-9f10-2a4b6c8d0e1f";

const APPROVED = "Approved_Name";
const TYPED = "player";

/**
 * What the resolve route returns (task 0272), with the task-0322 name: a string,
 * `null` (none / cleared), or `undefined` for an older profile server that omits it.
 */
function resolved(displayName: string | null | undefined, isCitizen = true) {
  return displayName === undefined
    ? { playerId: PLAYER_ID, isCitizen }
    : { playerId: PLAYER_ID, isCitizen, displayName };
}

/** A profile client whose resolve result is scripted per test. */
function stubProfileApiClient(
  resolvePlayer: jest.Mock = jest.fn().mockResolvedValue(resolved(APPROVED)),
): ProfileApiClient {
  return {
    resolvePlayer,
    creditMatch: jest.fn().mockResolvedValue(undefined),
  } as unknown as ProfileApiClient;
}

function makeGameServer(
  profile: ProfileApiClient,
  log: Logger = testLogger(),
): GameServer {
  return new GameServer("game1234", log, 0, fakeConfig(), GAME_CONFIG, profile);
}

function makeClient(
  ws: MockWebSocket,
  over: {
    clientID?: string;
    yandexPlayerId?: string | null;
    ip?: string;
  } = {},
): Client {
  return new Client(
    (over.clientID ?? "aaaa1111") as ClientID,
    "persistent-1",
    null,
    undefined,
    undefined,
    over.ip ?? "127.0.0.1",
    TYPED,
    ws as never,
    undefined,
    over.yandexPlayerId === undefined ? "yx-1" : over.yandexPlayerId,
  );
}

/** Let the fire-and-forget resolve promise chain (and an async message handler) settle. */
async function flushMicrotasks(): Promise<void> {
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

/** Every call any mocked log method got, as text — for the no-name check. */
function loggedText(log: Logger): string {
  const mocked = log as unknown as Record<string, jest.Mock>;
  return ["info", "warn", "error", "debug"]
    .flatMap((level) => mocked[level].mock.calls.map((c) => JSON.stringify(c)))
    .join("\n");
}

const RULE_WARNING =
  "approved name fails the current join rule; typed name used";

/** The warn calls carrying the task-0322 rule-failure line. */
function ruleWarnings(log: Logger): unknown[][] {
  const warn = (log as unknown as { warn: jest.Mock }).warn;
  return warn.mock.calls.filter((call) => call[0] === RULE_WARNING);
}

/** The frozen start roster as it actually went out over the socket. */
function broadcastStartInfo(ws: MockWebSocket): GameStartInfo {
  const startCall = ws.send.mock.calls
    .map((call) => JSON.parse(call[0] as string))
    .find((msg) => msg.type === "start");
  expect(startCall).toBeDefined();
  return startCall.gameStartInfo as GameStartInfo;
}

describe("approved name in multiplayer matches (task 0322)", () => {
  beforeEach(() => {
    // start() installs an endTurn interval; fake timers keep it from ever firing.
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("the approved name is on the frozen start roster AND the lobby poll", async () => {
    const resolvePlayer = jest.fn().mockResolvedValue(resolved(APPROVED));
    const server = makeGameServer(stubProfileApiClient(resolvePlayer));
    const ws = new MockWebSocket();

    server.addClient(makeClient(ws), 0);
    await flushMicrotasks();

    expect(server.gameInfo().clients?.[0].username).toBe(APPROVED);

    server.start();

    expect(broadcastStartInfo(ws).players[0].username).toBe(APPROVED);
    expect(server.gameInfo().clients?.[0].username).toBe(APPROVED);
    expect(resolvePlayer).toHaveBeenCalledWith("yx-1");
  });

  test("the name is stored trimmed", async () => {
    const server = makeGameServer(
      stubProfileApiClient(
        jest.fn().mockResolvedValue(resolved(`  ${APPROVED}  `)),
      ),
    );
    const ws = new MockWebSocket();
    server.addClient(makeClient(ws), 0);
    await flushMicrotasks();
    server.start();

    expect(broadcastStartInfo(ws).players[0].username).toBe(APPROVED);
  });

  test.each([
    ["null (no approved name)", null],
    ["absent (an older profile server)", undefined],
  ])("displayName %s → the typed name", async (_label, displayName) => {
    const server = makeGameServer(
      stubProfileApiClient(jest.fn().mockResolvedValue(resolved(displayName))),
    );
    const ws = new MockWebSocket();
    server.addClient(makeClient(ws), 0);
    await flushMicrotasks();
    server.start();

    expect(server.gameInfo().clients?.[0].username).toBe(TYPED);
    expect(broadcastStartInfo(ws).players[0].username).toBe(TYPED);
  });

  test("a non-citizen with a name still shows it (the name does not depend on the ★)", async () => {
    const server = makeGameServer(
      stubProfileApiClient(
        jest.fn().mockResolvedValue(resolved(APPROVED, false)),
      ),
    );
    const ws = new MockWebSocket();
    server.addClient(makeClient(ws), 0);
    await flushMicrotasks();
    server.start();

    expect(broadcastStartInfo(ws).players[0].username).toBe(APPROVED);
    expect(broadcastStartInfo(ws).players[0].isCitizen).toBe(false);
  });

  test.each([
    ["too short", "ab"],
    ["too long", "x".repeat(28)],
    ["a character the rule refuses", "Bad-Name"],
    ["blank once trimmed", "     "],
  ])(
    "a stored name that fails the join rule (%s) → typed name, one warn line with the clientID and no name",
    async (_label, badName) => {
      const log = testLogger();
      const server = makeGameServer(
        stubProfileApiClient(jest.fn().mockResolvedValue(resolved(badName))),
        log,
      );
      const ws = new MockWebSocket();
      const client = makeClient(ws);
      server.addClient(client, 0);
      await flushMicrotasks();

      // The lobby poll runs the swap once a second — it must not add log lines.
      server.gameInfo();
      server.gameInfo();
      server.start();

      expect(client.approvedName).toBeNull();
      expect(server.gameInfo().clients?.[0].username).toBe(TYPED);
      expect(broadcastStartInfo(ws).players[0].username).toBe(TYPED);

      const warnings = ruleWarnings(log);
      expect(warnings).toHaveLength(1);
      expect(warnings[0][1]).toEqual({ clientID: "aaaa1111" });
      if (badName.trim() !== "") {
        expect(loggedText(log)).not.toContain(badName.trim());
      }
    },
  );

  test("the swap re-checks silently: a stored name that no longer passes → typed name, no log", async () => {
    const log = testLogger();
    const server = makeGameServer(stubProfileApiClient(), log);
    const ws = new MockWebSocket();
    const client = makeClient(ws);
    server.addClient(client, 0);
    await flushMicrotasks();
    expect(client.approvedName).toBe(APPROVED);

    // Stand-in for a rule that changed after the name was stored (task 0308).
    client.approvedName = "No-Longer-Valid";
    const warnCallsBefore = (log as unknown as { warn: jest.Mock }).warn.mock
      .calls.length;

    expect(server.gameInfo().clients?.[0].username).toBe(TYPED);
    server.start();
    expect(broadcastStartInfo(ws).players[0].username).toBe(TYPED);
    expect((log as unknown as { warn: jest.Mock }).warn.mock.calls.length).toBe(
      warnCallsBefore,
    );
    expect(loggedText(log)).not.toContain("No-Longer-Valid");
  });

  test("a resolve that finishes AFTER start() is ignored for the name, but still sets profilePlayerId", async () => {
    const pending = deferred<ReturnType<typeof resolved>>();
    const server = makeGameServer(
      stubProfileApiClient(jest.fn().mockReturnValue(pending.promise)),
    );
    const ws = new MockWebSocket();
    const client = makeClient(ws);
    server.addClient(client, 0);
    await flushMicrotasks();

    server.start();
    pending.resolve(resolved(APPROVED));
    await flushMicrotasks();

    expect(client.profilePlayerId).toBe(PLAYER_ID);
    expect(client.approvedName).toBeNull();
    expect(broadcastStartInfo(ws).players[0].username).toBe(TYPED);
    // The lobby poll after start agrees with the frozen roster.
    expect(server.gameInfo().clients?.[0].username).toBe(TYPED);
  });

  test("a hung resolve does not delay the join; the roster freezes with the typed name", async () => {
    const server = makeGameServer(
      stubProfileApiClient(jest.fn().mockReturnValue(new Promise(() => {}))),
    );
    const ws = new MockWebSocket();
    const client = makeClient(ws);

    server.addClient(client, 0);
    expect(server.activeClients).toContain(client);
    server.start();

    expect(broadcastStartInfo(ws).players[0].username).toBe(TYPED);
  });

  test("a rejected resolve does not break the join; the typed name is used", async () => {
    const server = makeGameServer(
      stubProfileApiClient(
        jest.fn().mockRejectedValue(new Error("profile api down")),
      ),
    );
    const ws = new MockWebSocket();
    const client = makeClient(ws);

    expect(() => server.addClient(client, 0)).not.toThrow();
    await flushMicrotasks();
    server.start();

    expect(server.activeClients).toContain(client);
    expect(broadcastStartInfo(ws).players[0].username).toBe(TYPED);
  });

  test("a guest (no id) is never looked up and plays under the typed name", async () => {
    const resolvePlayer = jest.fn().mockResolvedValue(resolved(APPROVED));
    const server = makeGameServer(stubProfileApiClient(resolvePlayer));
    const ws = new MockWebSocket();
    server.addClient(makeClient(ws, { yandexPlayerId: null }), 0);
    await flushMicrotasks();
    server.start();

    expect(resolvePlayer).not.toHaveBeenCalled();
    expect(broadcastStartInfo(ws).players[0].username).toBe(TYPED);
  });

  describe("reconnect", () => {
    /** First resolve answers with the name; every later one hangs, so only the carry can supply it. */
    function nameThenHang(): jest.Mock {
      return jest
        .fn()
        .mockResolvedValueOnce(resolved(APPROVED))
        .mockReturnValue(new Promise(() => {}));
    }

    test("the same id keeps the approved name across a reconnect", async () => {
      const server = makeGameServer(stubProfileApiClient(nameThenHang()));
      server.addClient(makeClient(new MockWebSocket()), 0);
      await flushMicrotasks();

      const clientB = makeClient(new MockWebSocket());
      server.addClient(clientB, 0);

      expect(clientB.approvedName).toBe(APPROVED);
      expect(server.gameInfo().clients?.[0].username).toBe(APPROVED);
    });

    test.each([
      ["a different id", "yx-2"],
      ["a missing id", null],
    ])(
      "%s does NOT carry the approved name",
      async (_label, yandexPlayerId) => {
        const server = makeGameServer(stubProfileApiClient(nameThenHang()));
        server.addClient(makeClient(new MockWebSocket()), 0);
        await flushMicrotasks();

        const clientB = makeClient(new MockWebSocket(), { yandexPlayerId });
        server.addClient(clientB, 0);
        await flushMicrotasks();

        expect(clientB.approvedName).toBeNull();
        expect(server.gameInfo().clients?.[0].username).toBe(TYPED);
      },
    );

    // Review R1: after start the lobby poll must agree with the frozen roster,
    // even when the reconnecting socket carries no name of its own.
    test.each([
      ["a different id", "yx-2"],
      ["a missing id", null],
    ])(
      "after start, a reconnect with %s: the lobby poll still shows the frozen roster's name",
      async (_label, yandexPlayerId) => {
        const server = makeGameServer(stubProfileApiClient(nameThenHang()));
        const wsA = new MockWebSocket();
        server.addClient(makeClient(wsA), 0);
        await flushMicrotasks();
        server.start();
        expect(broadcastStartInfo(wsA).players[0].username).toBe(APPROVED);

        const clientB = makeClient(new MockWebSocket(), { yandexPlayerId });
        server.addClient(clientB, 0);
        await flushMicrotasks();

        expect(clientB.approvedName).toBeNull();
        expect(server.gameInfo().clients).toHaveLength(1);
        expect(server.gameInfo().clients?.[0].username).toBe(APPROVED);
      },
    );

    test("after start, a client the roster does not list falls back to the swap (typed name)", async () => {
      const server = makeGameServer(stubProfileApiClient(nameThenHang()));
      server.addClient(makeClient(new MockWebSocket()), 0);
      await flushMicrotasks();
      server.start();

      server.addClient(
        makeClient(new MockWebSocket(), {
          clientID: "bbbb2222",
          yandexPlayerId: "yx-3",
        }),
        0,
      );
      await flushMicrotasks();

      const names = new Map(
        server.gameInfo().clients?.map((c) => [c.clientID, c.username]),
      );
      expect(names.get("aaaa1111" as ClientID)).toBe(APPROVED);
      expect(names.get("bbbb2222" as ClientID)).toBe(TYPED);
    });
  });

  test("a later resolve answering null clears the name (the task-0314 clear); an absent answer keeps it", async () => {
    const resolvePlayer = jest
      .fn()
      .mockResolvedValueOnce(resolved(APPROVED))
      .mockResolvedValueOnce(resolved(undefined))
      .mockResolvedValueOnce(resolved(null));
    const server = makeGameServer(stubProfileApiClient(resolvePlayer));
    const ws = new MockWebSocket();
    const client = makeClient(ws);

    server.addClient(client, 0);
    await flushMicrotasks();
    expect(client.approvedName).toBe(APPROVED);

    // Absent = an older profile server: unknown, so what is held stays.
    server.addClient(client, 0);
    await flushMicrotasks();
    expect(client.approvedName).toBe(APPROVED);

    // Null = no approved name any more.
    server.addClient(client, 0);
    await flushMicrotasks();
    expect(client.approvedName).toBeNull();
    expect(resolvePlayer).toHaveBeenCalledTimes(3);

    server.start();
    expect(broadcastStartInfo(ws).players[0].username).toBe(TYPED);
  });

  test("a late update_identity before the start → the swap applies", async () => {
    const resolvePlayer = jest.fn().mockResolvedValue(resolved(APPROVED));
    const server = makeGameServer(stubProfileApiClient(resolvePlayer));
    const ws = new MockWebSocket();
    server.addClient(makeClient(ws, { yandexPlayerId: null }), 0);
    await flushMicrotasks();
    expect(server.gameInfo().clients?.[0].username).toBe(TYPED);

    sendUpdateIdentity(ws, "yx-late");
    await flushMicrotasks();

    expect(resolvePlayer).toHaveBeenCalledWith("yx-late");
    expect(server.gameInfo().clients?.[0].username).toBe(APPROVED);
    server.start();
    expect(broadcastStartInfo(ws).players[0].username).toBe(APPROVED);
  });

  test("start() never aborts on a swapped name: Cyrillic, [TAG], _, inner spaces, max length", async () => {
    const names = [
      "Иван Петров",
      "[TAG] Player",
      "Under_Score",
      "Жжжжжжжжжжжжжжжжжжжжжжжжжжж",
    ];
    const resolvePlayer = jest.fn();
    for (const name of names) {
      resolvePlayer.mockResolvedValueOnce(resolved(name));
    }
    const server = makeGameServer(stubProfileApiClient(resolvePlayer));
    const sockets = names.map(() => new MockWebSocket());
    sockets.forEach((ws, index) =>
      server.addClient(
        makeClient(ws, {
          clientID: `aaaa000${index}`,
          yandexPlayerId: `yx-${index}`,
        }),
        0,
      ),
    );
    await flushMicrotasks();

    server.start();

    const roster = broadcastStartInfo(sockets[0]).players;
    expect(roster.map((p) => p.username)).toEqual(names);
  });
});
