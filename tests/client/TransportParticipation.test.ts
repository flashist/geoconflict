/**
 * @jest-environment jsdom
 */
jest.mock("jose", () => ({
  base64url: { decode: jest.fn() },
}));
jest.mock("../../src/client/LocalServer", () => ({
  LocalServer: jest.fn(),
}));
jest.mock("../../src/client/flashist/FlashistFacade", () => ({
  FlashistFacade: {
    instance: {
      isYandexAuthorized: jest.fn().mockResolvedValue(false),
      getYandexUniqueId: jest.fn().mockResolvedValue(null),
    },
  },
}));

import { EventBus } from "../../src/core/EventBus";
import { GameType } from "../../src/core/game/Game";
import { Transport } from "../../src/client/Transport";

function makeTransport(isLocal: boolean): {
  transport: Transport;
  localOnMessage: jest.Mock;
  socketSend: jest.Mock;
} {
  const lobbyConfig: any = {
    serverConfig: { turnIntervalMs: () => 1000 },
    cosmetics: {},
    playerName: "TestPlayer",
    clientID: "client-1",
    gameID: "game-1",
    token: "token",
    gameStartInfo: {
      config: {
        gameType: isLocal ? GameType.Singleplayer : GameType.Public,
      },
    },
  };
  const transport = new Transport(lobbyConfig, new EventBus());
  expect(transport.isLocal).toBe(isLocal);

  const localOnMessage = jest.fn();
  (transport as any).localServer = { onMessage: localOnMessage };
  const socketSend = jest.fn();
  (transport as any).socket = {
    readyState: WebSocket.OPEN,
    send: socketSend,
  };
  return { transport, localOnMessage, socketSend };
}

/**
 * Task 0211, verification step 4c — the client half.
 *
 * The rejected design was a game-type check in GameServer, on a path solo play
 * cannot reach. This is the opposite: an isLocal check in Transport, on the path
 * solo play DOES take, which is the "a trigger moving client-side, where GameServer
 * is not involved at all" failure that reasoning identified as the real risk.
 *
 * ⛔ Unit-level, not an end-to-end Singleplayer play-through.
 */
describe("Transport.sendParticipation (task 0211)", () => {
  test("sends nothing at all in local mode (Singleplayer / replay)", () => {
    const { transport, localOnMessage, socketSend } = makeTransport(true);

    transport.sendParticipation({
      hasSpawned: true,
      isAliveNow: false,
      killedAt: 42,
    });

    // Not merely "not credited" — the message is never constructed, so it never
    // reaches LocalServer at all.
    expect(localOnMessage).not.toHaveBeenCalled();
    expect(socketSend).not.toHaveBeenCalled();
  });

  test("sends the report over the socket in a multiplayer match", () => {
    const { transport, socketSend } = makeTransport(false);

    transport.sendParticipation({
      hasSpawned: true,
      isAliveNow: false,
      killedAt: 42,
    });

    // Control: without this the suppression assertion above would be vacuous.
    expect(socketSend).toHaveBeenCalledTimes(1);
    expect(JSON.parse(socketSend.mock.calls[0][0])).toEqual({
      type: "participation",
      hasSpawned: true,
      isAliveNow: false,
      killedAt: 42,
    });
  });

  test("carries no clientID on the wire, so it can only ever report itself", () => {
    const { transport, socketSend } = makeTransport(false);

    transport.sendParticipation({ hasSpawned: true, isAliveNow: true });

    const sent = JSON.parse(socketSend.mock.calls[0][0]);
    expect(sent).not.toHaveProperty("clientID");
    expect(Object.keys(sent).sort()).toEqual([
      "hasSpawned",
      "isAliveNow",
      "type",
    ]);
  });
});
