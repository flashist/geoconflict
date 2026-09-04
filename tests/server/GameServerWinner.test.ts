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
  ClientSendWinnerMessage,
  GameConfig,
} from "../../src/core/Schemas";
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
    { gameType: GameType.Public } as unknown as GameConfig,
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

/**
 * Covers the SERVER end of match-end XP crediting: a winner message that wins
 * the vote reaches creditMatchXp (and archiveGame). Independent of any
 * particular win condition — it is fed the `["player", <clientID>]` shape an
 * ordinary human win produces.
 *
 * What this does NOT prove: handleWinner is winner-shape-agnostic — it votes on
 * JSON.stringify(clientMsg.winner) and calls
 * creditMatchXp(potentialWinner.winner) for whichever key wins, never
 * inspecting winner[0]. So this test would pass identically with
 * ["opponent", …] or any other shape, and asserts no discrimination between
 * them. That is fine: crediting is driven by playerParticipation, not by the
 * winner's shape.
 *
 * Scope, stated honestly: this covers the server end only. The middle leg
 * (Win update → WinModal → SendWinnerEvent → Transport → server) has no test
 * harness in this repo and runs on every ordinary human win in production
 * today.
 *
 * handleWinner and creditMatchXp are private; the `as any` reach-in below is
 * deliberate and owner-approved (ruling Q4, 2026-09-03).
 */
describe("GameServer winner handling", () => {
  test("a player winner message credits match XP", () => {
    const server = makeGameServer();
    const ws = new MockWebSocket();
    const client = makeClient(ws);
    server.addClient(client, 0);

    // archiveGame needs a started game's frozen roster, which this unit-level
    // server never got; it is not what this test is about.
    const archiveGame = jest
      .spyOn(server as any, "archiveGame")
      .mockImplementation(() => {});
    const creditMatchXp = jest
      .spyOn(server as any, "creditMatchXp")
      .mockImplementation(() => {});

    const winnerMsg: ClientSendWinnerMessage = {
      type: "winner",
      winner: ["player", client.clientID],
      allPlayersStats: {},
      playerParticipation: [
        {
          clientID: client.clientID,
          hasSpawned: true,
          isAliveAtEnd: true,
        },
      ],
    };

    (server as any).handleWinner(client, winnerMsg);

    expect(creditMatchXp).toHaveBeenCalledTimes(1);
    expect(creditMatchXp).toHaveBeenCalledWith(winnerMsg);
    expect(archiveGame).toHaveBeenCalledTimes(1);
  });
});
