jest.mock("jose", () => ({
  base64url: {
    decode: (value: string) => Buffer.from(value, "base64url"),
  },
}));

// Task 0302 (owner ruling 2026-09-27, Q1): a private match starts only if its
// CREATOR is a citizen (earned or paid). Harness follows CitizenFlag.test.ts.

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
  isPrivateLobbyCitizenGateBypassed,
} from "../../src/server/GameServer";
import { getServerConfigFromServer } from "../../src/core/configuration/ConfigLoader";
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

// The gate runs in every non-dev env; dev skips it (review R2). Default to prod.
let configEnv: GameEnv = GameEnv.Prod;

function fakeConfig(): ServerConfig {
  return {
    aiPlayersConfig: () => ({ enabled: false }),
    env: () => configEnv,
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

const CREATOR = "creator1";
const OTHER = "friend01";
const CAP_MS = 5000;
const PLAYER_ID = "0b6f8a52-3c1e-4d7a-9f10-2a4b6c8d0e1f";

function resolved(isCitizen: boolean) {
  return { playerId: PLAYER_ID, isCitizen };
}

function makeGameServer(
  resolvePlayer: jest.Mock,
  // null = a lobby created with no creator id (`undefined` would take the default).
  lobbyCreatorID: string | null = CREATOR,
): GameServer {
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
    lobbyCreatorID ?? undefined,
  );
}

function makeClient(
  over: { clientID?: string; yandexPlayerId?: string | null; ip?: string } = {},
): Client {
  return new Client(
    (over.clientID ?? CREATOR) as ClientID,
    `persistent-${over.clientID ?? CREATOR}`,
    null,
    undefined,
    undefined,
    over.ip ?? "127.0.0.1",
    "player",
    new MockWebSocket() as never,
    undefined,
    over.yandexPlayerId === undefined ? "yx-1" : over.yandexPlayerId,
  );
}

async function flushMicrotasks(): Promise<void> {
  for (let i = 0; i < 5; i++) {
    await Promise.resolve();
  }
}

describe.each([
  ["prod", GameEnv.Prod],
  ["preprod", GameEnv.Preprod],
] as const)("private lobby start gate (task 0302), %s config", (_name, env) => {
  beforeEach(() => {
    configEnv = env;
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("a citizen creator may start", async () => {
    const server = makeGameServer(jest.fn().mockResolvedValue(resolved(true)));
    server.addClient(makeClient(), 0);
    await flushMicrotasks();

    await expect(server.creatorMayStartPrivateLobby(CAP_MS)).resolves.toBe(
      true,
    );
  });

  test("a non-citizen creator is refused", async () => {
    const server = makeGameServer(jest.fn().mockResolvedValue(resolved(false)));
    server.addClient(makeClient(), 0);
    await flushMicrotasks();

    await expect(server.creatorMayStartPrivateLobby(CAP_MS)).resolves.toBe(
      false,
    );
  });

  test("a guest creator (no Yandex id) is refused without a lookup", async () => {
    const resolvePlayer = jest.fn().mockResolvedValue(resolved(true));
    const server = makeGameServer(resolvePlayer);
    server.addClient(makeClient({ yandexPlayerId: null }), 0);
    await flushMicrotasks();

    await expect(server.creatorMayStartPrivateLobby(CAP_MS)).resolves.toBe(
      false,
    );
    expect(resolvePlayer).not.toHaveBeenCalled();
  });

  test("a failed lookup refuses — fail closed", async () => {
    const server = makeGameServer(jest.fn().mockResolvedValue(null));
    server.addClient(makeClient(), 0);
    await flushMicrotasks();

    await expect(server.creatorMayStartPrivateLobby(CAP_MS)).resolves.toBe(
      false,
    );
  });

  test("a creator who is not connected is refused", async () => {
    const server = makeGameServer(jest.fn().mockResolvedValue(resolved(true)));
    // Only a (citizen) friend is in the lobby; the creator never joined.
    server.addClient(makeClient({ clientID: OTHER, ip: "10.0.0.2" }), 0);
    await flushMicrotasks();

    await expect(server.creatorMayStartPrivateLobby(CAP_MS)).resolves.toBe(
      false,
    );
  });

  test("a lobby with no creator is refused, even with a citizen in it", async () => {
    const server = makeGameServer(
      jest.fn().mockResolvedValue(resolved(true)),
      null,
    );
    server.addClient(makeClient(), 0);
    await flushMicrotasks();

    await expect(server.creatorMayStartPrivateLobby(CAP_MS)).resolves.toBe(
      false,
    );
  });

  test("a citizen FRIEND does not let a non-citizen creator start", async () => {
    const resolvePlayer = jest
      .fn()
      .mockImplementation((id: string) =>
        Promise.resolve(resolved(id === "yx-friend")),
      );
    const server = makeGameServer(resolvePlayer);
    server.addClient(makeClient(), 0);
    server.addClient(
      makeClient({
        clientID: OTHER,
        yandexPlayerId: "yx-friend",
        ip: "10.0.0.2",
      }),
      0,
    );
    await flushMicrotasks();

    await expect(server.creatorMayStartPrivateLobby(CAP_MS)).resolves.toBe(
      false,
    );
  });

  test("an in-flight resolve that returns citizen within the cap is allowed", async () => {
    let finish: (value: unknown) => void = () => {};
    const server = makeGameServer(
      jest.fn().mockReturnValue(new Promise((resolve) => (finish = resolve))),
    );
    server.addClient(makeClient(), 0);

    const decision = server.creatorMayStartPrivateLobby(CAP_MS);
    await jest.advanceTimersByTimeAsync(1000);
    finish(resolved(true));

    await expect(decision).resolves.toBe(true);
  });

  test("a hanging resolve is refused at the cap, not before", async () => {
    const server = makeGameServer(
      jest.fn().mockReturnValue(new Promise(() => {})),
    );
    server.addClient(makeClient(), 0);

    let settled: boolean | undefined;
    void server.creatorMayStartPrivateLobby(CAP_MS).then((value) => {
      settled = value;
    });

    await jest.advanceTimersByTimeAsync(CAP_MS - 1);
    expect(settled).toBeUndefined();

    await jest.advanceTimersByTimeAsync(1);
    expect(settled).toBe(false);
  });

  test("a reconnect keeps the resolved citizen flag", async () => {
    const resolvePlayer = jest
      .fn()
      .mockResolvedValueOnce(resolved(true))
      // The reconnect's fresh resolve hangs: only the carried flag can answer.
      .mockReturnValue(new Promise(() => {}));
    const server = makeGameServer(resolvePlayer);
    server.addClient(makeClient(), 0);
    await flushMicrotasks();

    server.addClient(makeClient(), 0);

    await expect(server.creatorMayStartPrivateLobby(CAP_MS)).resolves.toBe(
      true,
    );
  });
});

// Review R2 (owner ruling 2026-09-27, "Dev-only bypass"): local dev has no
// Yandex identity, so dev skips the check. Hardened (owner ruling 2026-09-27,
// "Harden it"): only when GAME_ENV is explicitly "dev" — an unset GAME_ENV also
// selects the dev config, and must keep the check ON. Never preprod or prod.
describe("private lobby start gate — dev-only bypass (review R2)", () => {
  const originalGameEnv = process.env.GAME_ENV;

  function setGameEnv(value: string | undefined): void {
    if (value === undefined) {
      delete process.env.GAME_ENV;
    } else {
      process.env.GAME_ENV = value;
    }
  }

  beforeEach(() => {
    jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    configEnv = GameEnv.Prod;
    setGameEnv(originalGameEnv);
    jest.restoreAllMocks();
  });

  test("GAME_ENV=dev: a non-citizen (guest) creator may start, without a lookup", async () => {
    setGameEnv("dev");
    configEnv = GameEnv.Dev;
    const resolvePlayer = jest.fn().mockResolvedValue(resolved(false));
    const server = makeGameServer(resolvePlayer);
    server.addClient(makeClient({ yandexPlayerId: null }), 0);

    await expect(server.creatorMayStartPrivateLobby(CAP_MS)).resolves.toBe(
      true,
    );
    expect(resolvePlayer).not.toHaveBeenCalled();
  });

  test("GAME_ENV unset: the fallback dev config still refuses a non-citizen", async () => {
    setGameEnv(undefined);
    configEnv = GameEnv.Dev;
    const server = makeGameServer(jest.fn().mockResolvedValue(resolved(false)));
    server.addClient(makeClient(), 0);

    await expect(server.creatorMayStartPrivateLobby(CAP_MS)).resolves.toBe(
      false,
    );
  });

  test("GAME_ENV unset: the fallback dev config still lets a citizen start", async () => {
    setGameEnv(undefined);
    configEnv = GameEnv.Dev;
    const server = makeGameServer(jest.fn().mockResolvedValue(resolved(true)));
    server.addClient(makeClient(), 0);

    await expect(server.creatorMayStartPrivateLobby(CAP_MS)).resolves.toBe(
      true,
    );
  });

  test("the bypass needs the dev config AND GAME_ENV explicitly dev", () => {
    expect(isPrivateLobbyCitizenGateBypassed(GameEnv.Dev, "dev")).toBe(true);
    expect(isPrivateLobbyCitizenGateBypassed(GameEnv.Dev, undefined)).toBe(
      false,
    );
    expect(isPrivateLobbyCitizenGateBypassed(GameEnv.Dev, "")).toBe(false);
    expect(isPrivateLobbyCitizenGateBypassed(GameEnv.Preprod, "dev")).toBe(
      false,
    );
    expect(isPrivateLobbyCitizenGateBypassed(GameEnv.Prod, "dev")).toBe(false);
  });

  // The real config chain the Worker uses: getServerConfigFromServer() reads
  // GAME_ENV (unset → the dev config), and the gate reads GAME_ENV again.
  test.each([
    ["dev", true],
    [undefined, false],
    ["prod", false],
    ["staging", false],
  ])(
    "the real server config chain with GAME_ENV=%s → bypassed: %s",
    (value, bypassed) => {
      setGameEnv(value);
      expect(
        isPrivateLobbyCitizenGateBypassed(
          getServerConfigFromServer().env(),
          process.env.GAME_ENV,
        ),
      ).toBe(bypassed);
    },
  );
});
