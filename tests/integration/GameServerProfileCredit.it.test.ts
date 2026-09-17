// Near-end-to-end proof for task 0272 (S3), verification step 7 (owner ruling 1,
// 2026-09-15): a REAL GameServer and a REAL ProfileApiClient talking HTTP to a REAL
// profile-server app (createApp over the real repositories) on real Postgres. Only
// the sockets are mocks. A join resolves the player, a qualifying participation
// report credits it, and the rows land keyed (game_id, player_id).
//
// ⚠️ Not live: no browser, no Yandex SDK, no nginx, no box. The live proof of this
// path is task 0217's verification.
//
// Deliberately NOT supertest (the known-flake family, CLAUDE.md): the app listens on
// an ephemeral local port via http.createServer, exactly how the game server reaches
// it in production — over fetch.

jest.mock("jose", () => ({
  base64url: {
    decode: (value: string) => Buffer.from(value, "base64url"),
  },
}));

import { EventEmitter } from "events";
import http from "http";
import type { AddressInfo } from "net";
import { Pool } from "pg";
import { Logger } from "winston";
import { GameEnv, ServerConfig } from "../../src/core/configuration/Config";
import { GameType } from "../../src/core/game/Game";
import {
  ClientID,
  ClientParticipationMessage,
  ClientSendWinnerMessage,
  GameConfig,
} from "../../src/core/Schemas";
import { createApp } from "../../src/profile-server/Routes";
import { Client } from "../../src/server/Client";
import { GameServer } from "../../src/server/GameServer";
import { ProfileApiClient } from "../../src/server/ProfileApiClient";
import {
  countOrphanPlayers,
  realProfileRepo,
  truncateProfileTables,
} from "./support/db";

const RUN = process.env.RUN_DB_TESTS ? describe : describe.skip;

// A test-only fake, shared by both sides the way production shares the real one.
const TOKEN = "it-0272-fake-internal-token";
const GAME_ID = "it0272game";

class MockWebSocket extends EventEmitter {
  public readyState = 1; // OPEN
  public send = jest.fn();
  public close = jest.fn();
}

function quietLogger(): Logger {
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

async function waitFor<T>(
  what: string,
  probe: () => Promise<T | null> | T | null,
  timeoutMs = 5_000,
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const value = await probe();
    if (value !== null) return value;
    if (Date.now() > deadline) {
      throw new Error(`timed out waiting for ${what}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
}

RUN("game server → profile server crediting by playerId (integration)", () => {
  let pool: Pool;
  let httpServer: http.Server;
  let baseUrl: string;
  const ORIGINAL_TOKEN = process.env.PROFILE_INTERNAL_TOKEN;

  beforeAll(async () => {
    process.env.PROFILE_INTERNAL_TOKEN = TOKEN;
    pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
    httpServer = http.createServer(createApp(realProfileRepo(pool)));
    await new Promise<void>((resolve) =>
      httpServer.listen(0, "127.0.0.1", resolve),
    );
    const { port } = httpServer.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    httpServer.closeAllConnections();
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
    await pool.end();
    process.env.PROFILE_INTERNAL_TOKEN = ORIGINAL_TOKEN;
  });

  beforeEach(async () => {
    await truncateProfileTables(pool);
  });

  function makeGameServer(): GameServer {
    const config = {
      aiPlayersConfig: () => ({ enabled: false }),
      env: () => GameEnv.Dev,
      profileApiUrl: () => baseUrl,
    } as unknown as ServerConfig;
    // Short backoff: nothing here is expected to retry.
    const profileApiClient = new ProfileApiClient(config, quietLogger(), 3, 10);
    return new GameServer(
      GAME_ID,
      quietLogger(),
      0,
      config,
      { gameType: GameType.Public } as unknown as GameConfig,
      profileApiClient,
    );
  }

  function makeClient(clientID: string, yandexPlayerId: string): Client {
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

  function freezeRoster(server: GameServer, ...clientIDs: string[]) {
    (server as any).gameStartInfo = {
      gameID: GAME_ID,
      players: clientIDs.map((clientID) => ({ clientID })),
      config: {},
    };
  }

  async function count(table: string): Promise<number> {
    const res = await pool.query(`SELECT count(*)::int AS n FROM ${table}`);
    return Number(res.rows[0].n);
  }

  async function creditRows(): Promise<
    Array<{ game_id: string; player_id: string; xp_awarded: number }>
  > {
    const res = await pool.query(
      `SELECT game_id, player_id::text AS player_id, xp_awarded
       FROM player_match_xp_credits ORDER BY game_id`,
    );
    return res.rows;
  }

  test("join resolves one player; an elimination report credits it once, keyed (game_id, player_id)", async () => {
    const server = makeGameServer();
    const client = makeClient("clientAAAA", "yx-it-0272-a");

    server.addClient(client, 0);
    const playerId = await waitFor(
      "the join resolve",
      () => client.profilePlayerId,
    );

    expect(await count("players")).toBe(1);
    expect(await count("player_identities")).toBe(1);
    const identity = await pool.query(
      "SELECT player_id::text AS player_id, platform FROM player_identities",
    );
    expect(identity.rows).toEqual([
      { player_id: playerId, platform: "yandex_games" },
    ]);

    freezeRoster(server, "clientAAAA");
    (server as any).addIntent({
      type: "spawn",
      clientID: "clientAAAA",
      tile: 1,
    });
    const report: ClientParticipationMessage = {
      type: "participation",
      hasSpawned: true,
      isAliveNow: false,
      killedAt: 120,
    };
    (server as any).handleParticipation(client, report);

    const rows = await waitFor("the credit row", async () => {
      const found = await creditRows();
      return found.length > 0 ? found : null;
    });
    expect(rows).toEqual([
      { game_id: GAME_ID, player_id: playerId, xp_awarded: 1 },
    ]);
    const xp = await pool.query("SELECT xp FROM players WHERE id = $1", [
      playerId,
    ]);
    expect(Number(xp.rows[0].xp)).toBe(1);
    expect(await count("players")).toBe(1);
    expect(await countOrphanPlayers(pool)).toBe(0);
  });

  test("one account on two connections is resolved to one player and credited once at match end", async () => {
    const server = makeGameServer();
    const first = makeClient("clientAAAA", "yx-it-0272-b");
    const second = makeClient("clientBBBB", "yx-it-0272-b");

    server.addClient(first, 0);
    server.addClient(second, 0);
    await waitFor("both resolves", () =>
      first.profilePlayerId !== null && second.profilePlayerId !== null
        ? true
        : null,
    );
    expect(first.profilePlayerId).toBe(second.profilePlayerId);
    expect(await count("players")).toBe(1);
    expect(await count("player_identities")).toBe(1);

    freezeRoster(server, "clientAAAA", "clientBBBB");
    const winnerMsg: ClientSendWinnerMessage = {
      type: "winner",
      winner: ["player", first.clientID],
      allPlayersStats: {},
      playerParticipation: [
        { clientID: first.clientID, hasSpawned: true, isAliveAtEnd: true },
        { clientID: second.clientID, hasSpawned: true, isAliveAtEnd: true },
      ],
    };
    (server as any).creditMatchXp(winnerMsg);

    const rows = await waitFor("the credit row", async () => {
      const found = await creditRows();
      return found.length > 0 ? found : null;
    });
    // Give a stray second POST time to land before asserting there is none.
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(await creditRows()).toEqual(rows);
    expect(rows).toEqual([
      { game_id: GAME_ID, player_id: first.profilePlayerId, xp_awarded: 1 },
    ]);
  });
});
