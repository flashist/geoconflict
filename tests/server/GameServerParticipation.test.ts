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

/** The internal player id the mocked profile server resolves a Yandex id to. */
function playerIdFor(yandexPlayerId: string): string {
  const hex = Buffer.from(yandexPlayerId).toString("hex").padEnd(12, "0");
  return `0b6f8a52-3c1e-4d7a-9f10-${hex.slice(0, 12)}`;
}

function resolvesEveryId(): jest.Mock {
  return jest.fn(async (yandexPlayerId: string) => ({
    playerId: playerIdFor(yandexPlayerId),
    isCitizen: false,
  }));
}

function makeGameServer(
  resolvePlayer: jest.Mock = resolvesEveryId(),
  { configured = true }: { configured?: boolean } = {},
): {
  server: GameServer;
  creditMatch: jest.Mock;
  resolvePlayer: jest.Mock;
  log: { warn: jest.Mock; debug: jest.Mock; info: jest.Mock };
} {
  const creditMatch = jest.fn().mockResolvedValue(undefined);
  const log = testLogger();
  const server = new GameServer(
    GAME_ID,
    log,
    0,
    fakeConfig(),
    { gameType: GameType.Public } as unknown as GameConfig,
    {
      resolvePlayer,
      creditMatch,
      isConfigured: () => configured,
    } as unknown as ProfileApiClient,
  );
  return {
    server,
    creditMatch,
    resolvePlayer,
    log: log as unknown as {
      warn: jest.Mock;
      debug: jest.Mock;
      info: jest.Mock;
    },
  };
}

/** Every warn line the game server logged, as text. */
function warnLines(log: { warn: jest.Mock }): string[] {
  return log.warn.mock.calls.map((call) => JSON.stringify(call));
}

/** Let the fire-and-forget resolve / resolve-then-credit chains settle. */
async function flush(): Promise<void> {
  await new Promise((resolve) => setImmediate(resolve));
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
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
  test("an eliminated player's report credits exactly once, under this game's id", async () => {
    const { server, creditMatch } = makeGameServer();
    const client = makeClient("clientAAAA");
    server.addClient(client, 0);
    await flush();
    freezeRoster(server, "clientAAAA");
    observeSpawn(server, "clientAAAA");

    report(server, client, eliminationReport());

    // Resolved at join, so the credit is posted synchronously with the report.
    expect(creditMatch).toHaveBeenCalledTimes(1);
    expect(creditMatch).toHaveBeenCalledWith([
      {
        // 🔴 Asserted as a literal, not re-derived from server.id: the profile
        // server's (game_id, player_id) primary key is what makes a player
        // creditable at most once per match, and it stops working the moment the
        // two crediting paths disagree about the game id.
        gameId: GAME_ID,
        playerId: playerIdFor("yx-1"),
        xpAwarded: 1,
      },
    ]);
  });

  test("a stalled-match survivor's report credits", async () => {
    const { server, creditMatch } = makeGameServer();
    const client = makeClient("clientAAAA");
    server.addClient(client, 0);
    await flush();
    freezeRoster(server, "clientAAAA");
    observeSpawn(server, "clientAAAA");

    report(server, client, survivorReport());

    expect(creditMatch).toHaveBeenCalledTimes(1);
    expect(creditMatch.mock.calls[0][0][0].xpAwarded).toBe(1);
  });

  test("the winner path uses the same game id as the self-report path", async () => {
    const { server, creditMatch } = makeGameServer();
    const client = makeClient("clientAAAA");
    server.addClient(client, 0);
    await flush();
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

  test("a second report produces no second HTTP call", async () => {
    const { server, creditMatch } = makeGameServer();
    const client = makeClient("clientAAAA");
    server.addClient(client, 0);
    await flush();
    freezeRoster(server, "clientAAAA");
    observeSpawn(server, "clientAAAA");

    report(server, client, eliminationReport());
    report(server, client, eliminationReport());
    report(server, client, survivorReport());
    await flush();

    // The latch is an EFFICIENCY measure. Even without it the profile server's
    // primary key would make the repeats no-ops — that key, not this count, is the
    // double-credit guard.
    expect(creditMatch).toHaveBeenCalledTimes(1);
  });

  describe("reporters that must be credited nothing", () => {
    async function setUp() {
      const made = makeGameServer();
      const client = makeClient("clientAAAA");
      made.server.addClient(client, 0);
      await flush();
      freezeRoster(made.server, "clientAAAA");
      observeSpawn(made.server, "clientAAAA");
      return { ...made, client };
    }

    test("an out-of-sync reporter", async () => {
      const { server, creditMatch, client } = await setUp();
      (server as any).outOfSyncClients.add(client.clientID);

      report(server, client, eliminationReport());
      await flush();

      expect(creditMatch).not.toHaveBeenCalled();
    });

    test("a kicked reporter", async () => {
      const { server, creditMatch, client } = await setUp();
      (server as any).kickedClients.add(client.clientID);

      report(server, client, eliminationReport());
      await flush();

      expect(creditMatch).not.toHaveBeenCalled();
    });

    test("a reporter outside the frozen start roster", async () => {
      const { server, creditMatch, client } = await setUp();
      freezeRoster(server, "someoneelse");

      report(server, client, eliminationReport());
      await flush();

      expect(creditMatch).not.toHaveBeenCalled();
    });

    test("a reporter the server never saw spawn", async () => {
      const { server, creditMatch } = makeGameServer();
      const client = makeClient("clientAAAA");
      server.addClient(client, 0);
      await flush();
      freezeRoster(server, "clientAAAA");
      // No observeSpawn: spawn is the one gate the server corroborates first-hand.

      report(server, client, eliminationReport());
      await flush();

      expect(creditMatch).not.toHaveBeenCalled();
    });

    test("a reporter whose hasSpawned claim is false", async () => {
      const { server, creditMatch, client } = await setUp();

      report(server, client, {
        type: "participation",
        hasSpawned: false,
        isAliveNow: false,
      });
      await flush();

      expect(creditMatch).not.toHaveBeenCalled();
    });

    test("a reporter who simply stopped playing (alive false, no killedAt)", async () => {
      const { server, creditMatch, client } = await setUp();

      report(server, client, {
        type: "participation",
        hasSpawned: true,
        isAliveNow: false,
      });
      await flush();

      expect(creditMatch).not.toHaveBeenCalled();
    });
  });

  test("a spawn intent recorded for one client never credits another", async () => {
    const { server, creditMatch } = makeGameServer();
    const spawner = makeClient("clientAAAA", "yx-spawner");
    const freeloader = makeClient("clientBBBB", "yx-freeloader");
    server.addClient(spawner, 0);
    server.addClient(freeloader, 0);
    await flush();
    freezeRoster(server, "clientAAAA", "clientBBBB");
    observeSpawn(server, "clientAAAA");

    report(server, freeloader, eliminationReport());
    await flush();

    expect(creditMatch).not.toHaveBeenCalled();

    report(server, spawner, eliminationReport());
    await flush();

    expect(creditMatch).toHaveBeenCalledTimes(1);
    expect(creditMatch.mock.calls[0][0][0].playerId).toBe(
      playerIdFor("yx-spawner"),
    );
  });

  describe("late identity refresh", () => {
    test("a report dropped for a null Yandex id is credited once the id resolves", async () => {
      const { server, creditMatch, resolvePlayer } = makeGameServer();
      const client = makeClient("clientAAAA", null);
      server.addClient(client, 0);
      freezeRoster(server, "clientAAAA");
      observeSpawn(server, "clientAAAA");

      report(server, client, eliminationReport(77));
      await flush();
      expect(creditMatch).not.toHaveBeenCalled();
      expect(resolvePlayer).not.toHaveBeenCalled();

      client.setYandexPlayerIdIfUnset("yx-late");
      (server as any).retryParticipationAfterIdentityRefresh(client);
      await flush();

      expect(creditMatch).toHaveBeenCalledTimes(1);
      expect(creditMatch.mock.calls[0][0][0].playerId).toBe(
        playerIdFor("yx-late"),
      );
    });

    test("update_identity then an immediate retry share ONE resolve and credit once", async () => {
      const { server, creditMatch, resolvePlayer } = makeGameServer();
      const client = makeClient("clientAAAA", null);
      server.addClient(client, 0);
      freezeRoster(server, "clientAAAA");
      observeSpawn(server, "clientAAAA");
      report(server, client, eliminationReport(77));

      client.ws.emit(
        "message",
        JSON.stringify({ type: "update_identity", yandexPlayerId: "yx-late" }),
      );
      await flush();

      expect(resolvePlayer).toHaveBeenCalledTimes(1);
      expect(creditMatch).toHaveBeenCalledTimes(1);
      expect(creditMatch.mock.calls[0][0]).toEqual([
        { gameId: GAME_ID, playerId: playerIdFor("yx-late"), xpAwarded: 1 },
      ]);
    });

    test("an already-credited client is not credited again by a later refresh", async () => {
      const { server, creditMatch } = makeGameServer();
      const client = makeClient("clientAAAA");
      server.addClient(client, 0);
      await flush();
      freezeRoster(server, "clientAAAA");
      observeSpawn(server, "clientAAAA");

      report(server, client, eliminationReport());
      (server as any).retryParticipationAfterIdentityRefresh(client);
      await flush();

      expect(creditMatch).toHaveBeenCalledTimes(1);
    });

    test("a reconnect carrying the resolved id credits the retained report (no update_identity)", async () => {
      // The in-place socket reconnect: the rejoining socket already knows the
      // Yandex id, so `update_identity` is never sent and the retry must hang off
      // addClient or the claim is stranded (review R3).
      const { server, creditMatch } = makeGameServer();
      const client = makeClient("clientAAAA", null);
      server.addClient(client, 0);
      freezeRoster(server, "clientAAAA");
      observeSpawn(server, "clientAAAA");

      report(server, client, eliminationReport(77));
      await flush();
      expect(creditMatch).not.toHaveBeenCalled();

      const reconnected = makeClient("clientAAAA", "yx-reconnect");
      server.addClient(reconnected, 12);
      await flush();

      expect(creditMatch).toHaveBeenCalledTimes(1);
      expect(creditMatch.mock.calls[0][0][0].playerId).toBe(
        playerIdFor("yx-reconnect"),
      );
    });

    test("a reconnect never credits a client twice", async () => {
      const { server, creditMatch } = makeGameServer();
      const client = makeClient("clientAAAA");
      server.addClient(client, 0);
      await flush();
      freezeRoster(server, "clientAAAA");
      observeSpawn(server, "clientAAAA");

      report(server, client, eliminationReport());
      expect(creditMatch).toHaveBeenCalledTimes(1);

      server.addClient(makeClient("clientAAAA"), 12);
      await flush();

      expect(creditMatch).toHaveBeenCalledTimes(1);
    });

    test("a refresh with no retained report credits nothing", async () => {
      const { server, creditMatch } = makeGameServer();
      const client = makeClient("clientAAAA");
      server.addClient(client, 0);
      freezeRoster(server, "clientAAAA");

      (server as any).retryParticipationAfterIdentityRefresh(client);
      await flush();

      expect(creditMatch).not.toHaveBeenCalled();
    });
  });

  // Task 0272 (S3). A credit needs the internal player id. When it is not resolved
  // yet, the credit path resolves (sharing any in-flight join resolve) and credits
  // after — never blocking, never throwing.
  describe("resolve-then-credit (task 0272)", () => {
    test("a report while the join resolve is in flight shares that resolve and credits after it settles", async () => {
      const join = deferred<{ playerId: string; isCitizen: boolean } | null>();
      const resolvePlayer = jest.fn().mockReturnValueOnce(join.promise);
      const { server, creditMatch } = makeGameServer(resolvePlayer);
      const client = makeClient("clientAAAA");
      server.addClient(client, 0);
      freezeRoster(server, "clientAAAA");
      observeSpawn(server, "clientAAAA");

      report(server, client, eliminationReport());
      await flush();
      expect(creditMatch).not.toHaveBeenCalled();
      expect(resolvePlayer).toHaveBeenCalledTimes(1);

      join.resolve({ playerId: playerIdFor("yx-1"), isCitizen: false });
      await flush();

      expect(resolvePlayer).toHaveBeenCalledTimes(1);
      expect(creditMatch).toHaveBeenCalledTimes(1);
      expect(creditMatch).toHaveBeenCalledWith([
        { gameId: GAME_ID, playerId: playerIdFor("yx-1"), xpAwarded: 1 },
      ]);
    });

    test("a failed (null) join resolve is retried by the credit path, which then credits", async () => {
      const resolvePlayer = jest
        .fn()
        .mockResolvedValueOnce(null)
        .mockImplementation(async (id: string) => ({
          playerId: playerIdFor(id),
          isCitizen: false,
        }));
      const { server, creditMatch } = makeGameServer(resolvePlayer);
      const client = makeClient("clientAAAA");
      server.addClient(client, 0);
      await flush();
      expect(client.profilePlayerId).toBeNull();
      freezeRoster(server, "clientAAAA");
      observeSpawn(server, "clientAAAA");

      report(server, client, eliminationReport());
      await flush();

      expect(resolvePlayer).toHaveBeenCalledTimes(2);
      expect(creditMatch).toHaveBeenCalledTimes(1);
      expect(creditMatch.mock.calls[0][0]).toEqual([
        { gameId: GAME_ID, playerId: playerIdFor("yx-1"), xpAwarded: 1 },
      ]);
    });

    // Owner ruling 2 (2026-09-15): the same outage class as ADR-101 — accepted loss.
    test("when the second resolve also fails, nothing is credited and nothing throws", async () => {
      const resolvePlayer = jest.fn().mockResolvedValue(null);
      const { server, creditMatch } = makeGameServer(resolvePlayer);
      const client = makeClient("clientAAAA");
      server.addClient(client, 0);
      await flush();
      freezeRoster(server, "clientAAAA");
      observeSpawn(server, "clientAAAA");

      expect(() => report(server, client, eliminationReport())).not.toThrow();
      await flush();

      expect(resolvePlayer).toHaveBeenCalledTimes(2);
      expect(creditMatch).not.toHaveBeenCalled();

      // No latch release: a repeat report does not start a third resolve.
      report(server, client, eliminationReport());
      await flush();
      expect(resolvePlayer).toHaveBeenCalledTimes(2);
      expect(creditMatch).not.toHaveBeenCalled();
    });

    // Review R1 (owner ruling "Warn with a count", 2026-09-15): an award dropped because
    // the resolve failed twice must be countable by ADR-101's re-raise trigger 2, which
    // counts the N in `award(s) dropped` warn lines.
    describe("dropped-award warn (review R1)", () => {
      async function doubleFailure(options: { configured: boolean }) {
        const made = makeGameServer(jest.fn().mockResolvedValue(null), options);
        const client = makeClient("clientAAAA", "yx-zz0272r1probe");
        made.server.addClient(client, 0);
        await flush();
        freezeRoster(made.server, "clientAAAA");
        observeSpawn(made.server, "clientAAAA");
        report(made.server, client, eliminationReport());
        await flush();
        return made;
      }

      test("configured: warns with the dropped-award count, in ADR-101's wording, naming no id", async () => {
        const { log, creditMatch } = await doubleFailure({ configured: true });

        expect(creditMatch).not.toHaveBeenCalled();
        const dropped = warnLines(log).filter((line) =>
          line.includes("award(s) dropped"),
        );
        expect(dropped).toHaveLength(1);
        expect(dropped[0]).toContain("1 award(s) dropped");
        expect(dropped[0]).not.toContain("zz0272r1probe");
        expect(dropped[0]).not.toContain("clientAAAA");
      });

      test("not configured (token blank): no dropped-award warn at all", async () => {
        const { log, creditMatch } = await doubleFailure({ configured: false });

        expect(creditMatch).not.toHaveBeenCalled();
        expect(warnLines(log).join("\n")).not.toContain("award(s) dropped");
      });

      test("one account on two connections, both unresolved, counts as ONE dropped award", async () => {
        const { server, log } = makeGameServer(
          jest.fn().mockResolvedValue(null),
        );
        const clientA = makeClient("clientAAAA", "yx-same");
        const clientB = makeClient("clientBBBB", "yx-same");
        server.addClient(clientA, 0);
        server.addClient(clientB, 0);
        await flush();
        freezeRoster(server, "clientAAAA", "clientBBBB");

        (server as any).creditMatchXp({
          type: "winner",
          winner: ["player", clientA.clientID],
          allPlayersStats: {},
          playerParticipation: [
            {
              clientID: clientA.clientID,
              hasSpawned: true,
              isAliveAtEnd: true,
            },
            {
              clientID: clientB.clientID,
              hasSpawned: true,
              isAliveAtEnd: true,
            },
          ],
        } satisfies ClientSendWinnerMessage);
        await flush();

        const dropped = warnLines(log).filter((line) =>
          line.includes("award(s) dropped"),
        );
        expect(dropped).toHaveLength(1);
        expect(dropped[0]).toContain("1 award(s) dropped");
      });

      test("no warn when a sibling connection of the same account resolved and was credited", async () => {
        const samePlayer = playerIdFor("yx-same");
        let call = 0;
        const { server, log, creditMatch } = makeGameServer(
          jest.fn(async () => {
            call++;
            // Both join resolves fail; at credit time A resolves, B fails again.
            return call === 3
              ? { playerId: samePlayer, isCitizen: false }
              : null;
          }),
        );
        const clientA = makeClient("clientAAAA", "yx-same");
        const clientB = makeClient("clientBBBB", "yx-same");
        server.addClient(clientA, 0);
        server.addClient(clientB, 0);
        await flush();
        freezeRoster(server, "clientAAAA", "clientBBBB");

        (server as any).creditMatchXp({
          type: "winner",
          winner: ["player", clientA.clientID],
          allPlayersStats: {},
          playerParticipation: [
            {
              clientID: clientA.clientID,
              hasSpawned: true,
              isAliveAtEnd: true,
            },
            {
              clientID: clientB.clientID,
              hasSpawned: true,
              isAliveAtEnd: true,
            },
          ],
        } satisfies ClientSendWinnerMessage);
        await flush();

        expect(call).toBe(4);
        expect(creditMatch.mock.calls.flatMap((c) => c[0])).toEqual([
          { gameId: GAME_ID, playerId: samePlayer, xpAwarded: 1 },
        ]);
        expect(warnLines(log).join("\n")).not.toContain("award(s) dropped");
      });

      test("a resolve that succeeds emits no dropped-award warn", async () => {
        const { server, log, creditMatch } = makeGameServer(
          jest
            .fn()
            .mockResolvedValueOnce(null)
            .mockImplementation(async (id: string) => ({
              playerId: playerIdFor(id),
              isCitizen: false,
            })),
        );
        const client = makeClient("clientAAAA");
        server.addClient(client, 0);
        await flush();
        freezeRoster(server, "clientAAAA");
        observeSpawn(server, "clientAAAA");
        report(server, client, eliminationReport());
        await flush();

        expect(creditMatch).toHaveBeenCalledTimes(1);
        expect(warnLines(log).join("\n")).not.toContain("award(s) dropped");
      });
    });

    test("a resolve that rejects (contractually impossible) causes no unhandled rejection", async () => {
      const unhandled: unknown[] = [];
      const onUnhandled = (reason: unknown) => unhandled.push(reason);
      process.on("unhandledRejection", onUnhandled);
      try {
        const resolvePlayer = jest
          .fn()
          .mockRejectedValue(new Error("profile api down"));
        const { server, creditMatch } = makeGameServer(resolvePlayer);
        const client = makeClient("clientAAAA");
        server.addClient(client, 0);
        freezeRoster(server, "clientAAAA");
        observeSpawn(server, "clientAAAA");

        report(server, client, eliminationReport());
        await flush();
        await flush();

        expect(creditMatch).not.toHaveBeenCalled();
        expect(unhandled).toEqual([]);
      } finally {
        process.off("unhandledRejection", onUnhandled);
      }
    });

    test("two clients resolving to the same player, one resolved and one not, are credited once in total", async () => {
      const samePlayer = playerIdFor("yx-same");
      let call = 0;
      const resolvePlayer = jest.fn(async () => {
        call++;
        // The second client's join resolve fails; everything else succeeds.
        return call === 2 ? null : { playerId: samePlayer, isCitizen: false };
      });
      const { server, creditMatch } = makeGameServer(resolvePlayer);
      const clientA = makeClient("clientAAAA", "yx-same");
      const clientB = makeClient("clientBBBB", "yx-same");
      server.addClient(clientA, 0);
      server.addClient(clientB, 0);
      await flush();
      expect(clientA.profilePlayerId).toBe(samePlayer);
      expect(clientB.profilePlayerId).toBeNull();
      freezeRoster(server, "clientAAAA", "clientBBBB");

      const winnerMsg: ClientSendWinnerMessage = {
        type: "winner",
        winner: ["player", clientA.clientID],
        allPlayersStats: {},
        playerParticipation: [
          { clientID: clientA.clientID, hasSpawned: true, isAliveAtEnd: true },
          { clientID: clientB.clientID, hasSpawned: true, isAliveAtEnd: true },
        ],
      };
      (server as any).creditMatchXp(winnerMsg);
      await flush();

      expect(resolvePlayer).toHaveBeenCalledTimes(3);
      const posted = creditMatch.mock.calls.flatMap((c) => c[0]);
      expect(posted).toEqual([
        { gameId: GAME_ID, playerId: samePlayer, xpAwarded: 1 },
      ]);
    });

    test("the gates are judged at report time: a client that leaves during the resolve still gets its credit", async () => {
      const join = deferred<{ playerId: string; isCitizen: boolean } | null>();
      const resolvePlayer = jest.fn().mockReturnValueOnce(join.promise);
      const { server, creditMatch } = makeGameServer(resolvePlayer);
      const client = makeClient("clientAAAA");
      server.addClient(client, 0);
      freezeRoster(server, "clientAAAA");
      observeSpawn(server, "clientAAAA");

      report(server, client, eliminationReport());
      client.ws.emit("close");
      join.resolve({ playerId: playerIdFor("yx-1"), isCitizen: false });
      await flush();

      expect(creditMatch).toHaveBeenCalledTimes(1);
    });
  });
});
