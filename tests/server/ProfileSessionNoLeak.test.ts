// Task 0332 (ADR-124; design report §8.1). The profile session token a player sends
// to the game server is a CREDENTIAL (a 24 h bearer token, no revocation). It may go
// to the profile server on the resolve call and NOWHERE else: not into a log line,
// not back over any socket (the parse-error echo included), not into game info, the
// start roster or the archive record.

jest.mock("jose", () => ({
  base64url: {
    decode: (value: string) => Buffer.from(value, "base64url"),
  },
}));

// Capture the archive record instead of sending it (Archive.test.ts's approach).
jest.mock("../../src/server/Archive", () => ({
  archive: jest.fn(),
  finalizeGameRecord: (record: unknown) => record,
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
import { archive } from "../../src/server/Archive";
import { Client } from "../../src/server/Client";
import { GameServer } from "../../src/server/GameServer";
import { errorName } from "../../src/server/Logger";
import { ProfileApiClient } from "../../src/server/ProfileApiClient";

const SENTINEL = "zz0332-sentinel-join-token";
const SENTINEL_LATE = "zz0332-sentinel-late-token";
const SENTINEL_BAD = "zz0332-sentinel-bad-message-token";
// Short on purpose: V8 quotes at most ~10 characters of a bad JSON input around the
// failure, and the WHOLE input when it is this short — so a leak shows in full.
const SENTINEL_RAW = "QZ0332RAW";
const ALL_SENTINELS = [SENTINEL, SENTINEL_LATE, SENTINEL_BAD, SENTINEL_RAW];

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

function loggedText(log: Logger): string {
  const mocked = log as unknown as Record<string, jest.Mock>;
  return ["info", "warn", "error", "debug"]
    .flatMap((level) => mocked[level].mock.calls.map((c) => JSON.stringify(c)))
    .join("\n");
}

function fakeConfig(): ServerConfig {
  return {
    aiPlayersConfig: () => ({ enabled: false }),
    env: () => GameEnv.Dev,
    turnIntervalMs: () => 100,
    gameCreationRate: () => 60_000,
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

const PLAYER_ID = "0b6f8a52-3c1e-4d7a-9f10-2a4b6c8d0e01";

function makeClient(
  ws: MockWebSocket,
  clientID: string,
  yandexPlayerId: string,
): Client {
  return new Client(
    clientID as ClientID,
    `persistent-${clientID}`,
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

async function flushPromises(): Promise<void> {
  for (let i = 0; i < 30; i++) {
    await Promise.resolve();
  }
}

describe("the profile session token never leaks from the game server (task 0332)", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    (archive as jest.Mock).mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("join, late update_identity, a failed parse and raw bad JSON: no log, socket, game info, roster or archive carries it", async () => {
    const log = testLogger();
    // Old profile server: no `verified`, so every token stays HELD on its client
    // for the whole test — the strictest case for a leak.
    const resolvePlayer = jest
      .fn()
      .mockResolvedValue({ playerId: PLAYER_ID, isCitizen: false });
    const server = new GameServer(
      "game1234",
      log,
      0,
      fakeConfig(),
      GAME_CONFIG,
      {
        resolvePlayer,
        creditMatch: jest.fn().mockResolvedValue(undefined),
      } as unknown as ProfileApiClient,
    );

    // 1. A join carrying a token (Worker sets it right after construction).
    const wsA = new MockWebSocket();
    const clientA = makeClient(wsA, "aaaa1111", "yx-a");
    clientA.profileSession = SENTINEL;
    server.addClient(clientA, 0);

    // 2. A late token via update_identity.
    const wsB = new MockWebSocket();
    const clientB = makeClient(wsB, "bbbb2222", "yx-b");
    server.addClient(clientB, 0);
    await flushPromises();
    wsB.emit(
      "message",
      JSON.stringify({
        type: "update_identity",
        yandexPlayerId: "yx-b",
        profileSession: SENTINEL_LATE,
      }),
    );
    await flushPromises();

    // Sanity: both tokens really went where they are allowed to go.
    expect(resolvePlayer).toHaveBeenCalledWith("yx-a", SENTINEL);
    expect(resolvePlayer).toHaveBeenCalledWith("yx-b", SENTINEL_LATE);
    expect(clientA.profileSession).toBe(SENTINEL);
    expect(clientB.profileSession).toBe(SENTINEL_LATE);

    server.start();
    const gameInfoJson = JSON.stringify(server.gameInfo());
    const startInfoJson = JSON.stringify((server as any).gameStartInfo);

    // 3. A message that fails ClientMessageSchema and carries a token (no id).
    const wsC = new MockWebSocket();
    const clientC = makeClient(wsC, "cccc3333", "yx-c");
    server.addClient(clientC, 0);
    wsC.emit(
      "message",
      JSON.stringify({ type: "update_identity", profileSession: SENTINEL_BAD }),
    );
    await flushPromises();
    expect(wsC.close).toHaveBeenCalledWith(1002, "ClientMessageSchema");

    // 4. Raw invalid JSON containing a token: JSON.parse's error quotes it.
    wsA.emit("message", `{"t":${SENTINEL_RAW}}`);
    await flushPromises();

    // The archive record, at game end.
    await server.end();
    expect(archive).toHaveBeenCalledTimes(1);
    const archiveJson = JSON.stringify((archive as jest.Mock).mock.calls);

    const logged = loggedText(log);
    const sent = [wsA, wsB, wsC]
      .flatMap((ws) => ws.send.mock.calls.map((call) => String(call[0])))
      .join("\n");
    // The parse-error echo did go out — just without the raw message.
    expect(sent).toContain('"type":"error"');

    for (const sentinel of ALL_SENTINELS) {
      expect(logged).not.toContain(sentinel);
      expect(sent).not.toContain(sentinel);
      expect(gameInfoJson).not.toContain(sentinel);
      expect(startInfoJson).not.toContain(sentinel);
      expect(archiveJson).not.toContain(sentinel);
    }
  });
});

describe("errorName (task 0332)", () => {
  test("a JSON parse error quoting a token gives only its type", () => {
    let caught: unknown;
    try {
      JSON.parse(`{"t":${SENTINEL_RAW}}`);
    } catch (error) {
      caught = error;
    }
    // The message really does quote the input — which is why the name is logged.
    expect(String(caught)).toContain(SENTINEL_RAW);
    expect(errorName(caught)).toBe("SyntaxError");
    expect(errorName(caught)).not.toContain(SENTINEL_RAW);
  });

  test("a non-Error gives its typeof", () => {
    expect(errorName(`text with ${SENTINEL_RAW}`)).toBe("string");
    expect(errorName(undefined)).toBe("undefined");
    expect(errorName({ token: SENTINEL_RAW })).toBe("object");
  });
});
