jest.mock("jose", () => ({
  base64url: {
    decode: (value: string) => Buffer.from(value, "base64url"),
  },
}));

import { EventEmitter } from "events";
import { Logger } from "winston";
import { GameEnv, ServerConfig } from "../../src/core/configuration/Config";
import { GameType } from "../../src/core/game/Game";
import {
  ClientID,
  ClientParticipationMessage,
  ClientSendWinnerMessage,
  GameConfig,
} from "../../src/core/Schemas";
import { Client } from "../../src/server/Client";
import { GameServer } from "../../src/server/GameServer";
import { ProfileApiClient } from "../../src/server/ProfileApiClient";

const GAME_ID = "game1234";

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

function makeGameServer(): {
  server: GameServer;
  creditMatch: jest.Mock;
  upsertProfile: jest.Mock;
} {
  const creditMatch = jest.fn().mockResolvedValue(undefined);
  const upsertProfile = jest.fn().mockResolvedValue(undefined);
  const server = new GameServer(
    GAME_ID,
    testLogger(),
    0,
    fakeConfig(),
    { gameType: GameType.Public } as unknown as GameConfig,
    { upsertProfile, creditMatch } as unknown as ProfileApiClient,
  );
  return { server, creditMatch, upsertProfile };
}

function makeClient(
  clientID: string,
  yandexPlayerId: string | null = "yx-1",
): Client {
  return new Client(
    clientID as ClientID,
    `persistent-${clientID}`,
    null,
    undefined,
    undefined,
    "127.0.0.1",
    "player",
    new MockWebSocket() as never,
    undefined,
    yandexPlayerId,
  );
}

/** Freeze the start roster the real `start()` would have frozen. */
function freezeRoster(server: GameServer, ...clientIDs: string[]) {
  (server as any).gameStartInfo = {
    gameID: GAME_ID,
    players: clientIDs.map((clientID) => ({ clientID })),
    config: {},
  };
}

/** Record the server-observed spawn intent the relay would have seen. */
function observeSpawn(server: GameServer, clientID: string) {
  (server as any).addIntent({ type: "spawn", clientID, tile: 1 });
}

function eliminationReport(killedAt = 120): ClientParticipationMessage {
  return {
    type: "participation",
    hasSpawned: true,
    isAliveNow: false,
    killedAt,
  };
}

function survivorReport(): ClientParticipationMessage {
  return { type: "participation", hasSpawned: true, isAliveNow: true };
}

function report(
  server: GameServer,
  client: Client,
  msg: ClientParticipationMessage,
) {
  // handleParticipation is private; the `as any` reach-in mirrors the one in
  // GameServerWinner.test.ts (owner-approved, ruling Q4 2026-09-03).
  (server as any).handleParticipation(client, msg);
}

/**
 * Task 0211. The SERVER end of the mid-match participation self-report: the new
 * path by which an eliminated player, and a survivor of a match that can never
 * declare a winner, are credited.
 *
 * ⛔ What this does NOT prove, stated plainly. Crediting has never been proven
 * end-to-end locally: `getCreditableYandexId` yields null for every client in a real
 * local run, so `creditMatchXp` returns at `credits.length === 0`. These tests inject
 * a client that already carries a Yandex id, which is why they can assert anything at
 * all. The client emission itself (Win-condition update -> ClientGameRunner ->
 * Transport -> here) has no harness in this repo. A real end-to-end proof needs task
 * 0217's wiring plus a live profile backend and does not exist in this task.
 */
describe("GameServer participation self-report (task 0211)", () => {
  test("an eliminated player's report credits exactly once, under this game's id", () => {
    const { server, creditMatch } = makeGameServer();
    const client = makeClient("clientAAAA");
    server.addClient(client, 0);
    freezeRoster(server, "clientAAAA");
    observeSpawn(server, "clientAAAA");

    report(server, client, eliminationReport());

    expect(creditMatch).toHaveBeenCalledTimes(1);
    expect(creditMatch).toHaveBeenCalledWith([
      {
        // 🔴 Asserted as a literal, not re-derived from server.id: the profile
        // server's (game_id, yandex_player_id) primary key is what makes a player
        // creditable at most once per match, and it stops working the moment the
        // two crediting paths disagree about the game id.
        gameId: GAME_ID,
        yandexPlayerId: "yx-1",
        persistentId: "persistent-clientAAAA",
        xpAwarded: 1,
      },
    ]);
  });

  test("a stalled-match survivor's report credits", () => {
    const { server, creditMatch } = makeGameServer();
    const client = makeClient("clientAAAA");
    server.addClient(client, 0);
    freezeRoster(server, "clientAAAA");
    observeSpawn(server, "clientAAAA");

    report(server, client, survivorReport());

    expect(creditMatch).toHaveBeenCalledTimes(1);
    expect(creditMatch.mock.calls[0][0][0].xpAwarded).toBe(1);
  });

  test("the winner path uses the same game id as the self-report path", () => {
    const { server, creditMatch } = makeGameServer();
    const client = makeClient("clientAAAA");
    server.addClient(client, 0);
    freezeRoster(server, "clientAAAA");
    observeSpawn(server, "clientAAAA");

    const winnerMsg: ClientSendWinnerMessage = {
      type: "winner",
      winner: ["player", client.clientID],
      allPlayersStats: {},
      playerParticipation: [
        { clientID: client.clientID, hasSpawned: true, isAliveAtEnd: true },
      ],
    };
    (server as any).creditMatchXp(winnerMsg);
    report(server, client, eliminationReport());

    expect(creditMatch).toHaveBeenCalledTimes(2);
    const gameIds = creditMatch.mock.calls.map((call) => call[0][0].gameId);
    expect(gameIds).toEqual([GAME_ID, GAME_ID]);
  });

  test("a second report produces no second HTTP call", () => {
    const { server, creditMatch } = makeGameServer();
    const client = makeClient("clientAAAA");
    server.addClient(client, 0);
    freezeRoster(server, "clientAAAA");
    observeSpawn(server, "clientAAAA");

    report(server, client, eliminationReport());
    report(server, client, eliminationReport());
    report(server, client, survivorReport());

    // The latch is an EFFICIENCY measure. Even without it the profile server's
    // primary key would make the repeats no-ops — that key, not this count, is the
    // double-credit guard.
    expect(creditMatch).toHaveBeenCalledTimes(1);
  });

  describe("reporters that must be credited nothing", () => {
    function setUp() {
      const made = makeGameServer();
      const client = makeClient("clientAAAA");
      made.server.addClient(client, 0);
      freezeRoster(made.server, "clientAAAA");
      observeSpawn(made.server, "clientAAAA");
      return { ...made, client };
    }

    test("an out-of-sync reporter", () => {
      const { server, creditMatch, client } = setUp();
      (server as any).outOfSyncClients.add(client.clientID);

      report(server, client, eliminationReport());

      expect(creditMatch).not.toHaveBeenCalled();
    });

    test("a kicked reporter", () => {
      const { server, creditMatch, client } = setUp();
      (server as any).kickedClients.add(client.clientID);

      report(server, client, eliminationReport());

      expect(creditMatch).not.toHaveBeenCalled();
    });

    test("a reporter outside the frozen start roster", () => {
      const { server, creditMatch, client } = setUp();
      freezeRoster(server, "someoneelse");

      report(server, client, eliminationReport());

      expect(creditMatch).not.toHaveBeenCalled();
    });

    test("a reporter the server never saw spawn", () => {
      const { server, creditMatch } = makeGameServer();
      const client = makeClient("clientAAAA");
      server.addClient(client, 0);
      freezeRoster(server, "clientAAAA");
      // No observeSpawn: spawn is the one gate the server corroborates first-hand.

      report(server, client, eliminationReport());

      expect(creditMatch).not.toHaveBeenCalled();
    });

    test("a reporter whose hasSpawned claim is false", () => {
      const { server, creditMatch, client } = setUp();

      report(server, client, {
        type: "participation",
        hasSpawned: false,
        isAliveNow: false,
      });

      expect(creditMatch).not.toHaveBeenCalled();
    });

    test("a reporter who simply stopped playing (alive false, no killedAt)", () => {
      const { server, creditMatch, client } = setUp();

      report(server, client, {
        type: "participation",
        hasSpawned: true,
        isAliveNow: false,
      });

      expect(creditMatch).not.toHaveBeenCalled();
    });
  });

  test("a spawn intent recorded for one client never credits another", () => {
    const { server, creditMatch } = makeGameServer();
    const spawner = makeClient("clientAAAA", "yx-spawner");
    const freeloader = makeClient("clientBBBB", "yx-freeloader");
    server.addClient(spawner, 0);
    server.addClient(freeloader, 0);
    freezeRoster(server, "clientAAAA", "clientBBBB");
    observeSpawn(server, "clientAAAA");

    report(server, freeloader, eliminationReport());

    expect(creditMatch).not.toHaveBeenCalled();

    report(server, spawner, eliminationReport());

    expect(creditMatch).toHaveBeenCalledTimes(1);
    expect(creditMatch.mock.calls[0][0][0].yandexPlayerId).toBe("yx-spawner");
  });

  describe("late identity refresh", () => {
    test("a report dropped for a null Yandex id is credited once the id resolves", () => {
      const { server, creditMatch } = makeGameServer();
      const client = makeClient("clientAAAA", null);
      server.addClient(client, 0);
      freezeRoster(server, "clientAAAA");
      observeSpawn(server, "clientAAAA");

      report(server, client, eliminationReport(77));
      expect(creditMatch).not.toHaveBeenCalled();

      client.setYandexPlayerIdIfUnset("yx-late");
      (server as any).retryParticipationAfterIdentityRefresh(client);

      expect(creditMatch).toHaveBeenCalledTimes(1);
      expect(creditMatch.mock.calls[0][0][0].yandexPlayerId).toBe("yx-late");
    });

    test("an already-credited client is not credited again by a later refresh", () => {
      const { server, creditMatch } = makeGameServer();
      const client = makeClient("clientAAAA");
      server.addClient(client, 0);
      freezeRoster(server, "clientAAAA");
      observeSpawn(server, "clientAAAA");

      report(server, client, eliminationReport());
      (server as any).retryParticipationAfterIdentityRefresh(client);

      expect(creditMatch).toHaveBeenCalledTimes(1);
    });

    test("a reconnect carrying the resolved id credits the retained report (no update_identity)", () => {
      // The in-place socket reconnect: the rejoining socket already knows the
      // Yandex id, so `update_identity` is never sent and the retry must hang off
      // addClient or the claim is stranded (review R3).
      const { server, creditMatch } = makeGameServer();
      const client = makeClient("clientAAAA", null);
      server.addClient(client, 0);
      freezeRoster(server, "clientAAAA");
      observeSpawn(server, "clientAAAA");

      report(server, client, eliminationReport(77));
      expect(creditMatch).not.toHaveBeenCalled();

      const reconnected = makeClient("clientAAAA", "yx-reconnect");
      server.addClient(reconnected, 12);

      expect(creditMatch).toHaveBeenCalledTimes(1);
      expect(creditMatch.mock.calls[0][0][0].yandexPlayerId).toBe(
        "yx-reconnect",
      );
    });

    test("a reconnect never credits a client twice", () => {
      const { server, creditMatch } = makeGameServer();
      const client = makeClient("clientAAAA");
      server.addClient(client, 0);
      freezeRoster(server, "clientAAAA");
      observeSpawn(server, "clientAAAA");

      report(server, client, eliminationReport());
      expect(creditMatch).toHaveBeenCalledTimes(1);

      server.addClient(makeClient("clientAAAA"), 12);

      expect(creditMatch).toHaveBeenCalledTimes(1);
    });

    test("a refresh with no retained report credits nothing", () => {
      const { server, creditMatch } = makeGameServer();
      const client = makeClient("clientAAAA");
      server.addClient(client, 0);
      freezeRoster(server, "clientAAAA");

      (server as any).retryParticipationAfterIdentityRefresh(client);

      expect(creditMatch).not.toHaveBeenCalled();
    });
  });
});
