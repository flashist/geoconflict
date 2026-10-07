/**
 * @jest-environment jsdom
 */
// Task 0332 (ADR-124). The client sends its profile session token to the game
// server so the profile server can vouch for it: in the join when a token is
// already held, otherwise ONCE in an update_identity after the login finishes —
// over this socket while it is open, never for a local game. The mocks follow
// TransportParticipation.test.ts, plus ProfileSession and a fake WebSocket so the
// real connect → onopen → join path runs.

jest.mock("jose", () => ({
  base64url: { decode: jest.fn() },
}));
jest.mock("../../src/client/LocalServer", () => ({
  LocalServer: jest.fn(),
}));
jest.mock("../../src/client/flashist/FlashistFacade", () => ({
  FlashistFacade: {
    instance: {
      isYandexAuthorized: jest.fn(),
      getYandexUniqueId: jest.fn(),
    },
  },
}));
jest.mock("../../src/client/ProfileSession", () => ({
  ensureSession: jest.fn(),
  heldSessionTokenFor: jest.fn(),
}));

import { FlashistFacade } from "../../src/client/flashist/FlashistFacade";
import {
  ensureSession,
  heldSessionTokenFor,
} from "../../src/client/ProfileSession";
import { Transport } from "../../src/client/Transport";
import { EventBus } from "../../src/core/EventBus";
import { GameType } from "../../src/core/game/Game";

const isYandexAuthorized = FlashistFacade.instance
  .isYandexAuthorized as jest.Mock;
const getYandexUniqueId = FlashistFacade.instance
  .getYandexUniqueId as jest.Mock;
const ensureSessionMock = ensureSession as jest.Mock;
const heldSessionTokenForMock = heldSessionTokenFor as jest.Mock;

const YANDEX_ID = "yandex-0332-a";
const TOKEN = "v1.zz0332-client-token.mac";

/** Just enough of a browser WebSocket for Transport.connectRemote. */
class FakeWebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;
  static instances: FakeWebSocket[] = [];

  readyState = FakeWebSocket.CONNECTING;
  send = jest.fn();
  close = jest.fn();
  onopen: (() => void) | null = null;
  onmessage: unknown = null;
  onclose: unknown = null;
  onerror: unknown = null;

  constructor(public readonly url: string) {
    FakeWebSocket.instances.push(this);
  }

  open(): void {
    this.readyState = FakeWebSocket.OPEN;
    this.onopen?.();
  }

  messages(): any[] {
    return this.send.mock.calls.map((call) => JSON.parse(call[0] as string));
  }
}

const originalWebSocket = global.WebSocket;

function makeTransport(
  options: { isLocal?: boolean; yandexPlayerId?: string | null } = {},
): Transport {
  const lobbyConfig: any = {
    serverConfig: {
      turnIntervalMs: () => 1000,
      workerPath: () => "w0",
    },
    cosmetics: {},
    playerName: "TestPlayer",
    clientID: "client01",
    gameID: "game0001",
    token: "token",
    yandexPlayerId:
      options.yandexPlayerId === undefined ? YANDEX_ID : options.yandexPlayerId,
    gameStartInfo: {
      config: {
        gameType: options.isLocal ? GameType.Singleplayer : GameType.Public,
      },
    },
  };
  return new Transport(lobbyConfig, new EventBus());
}

/** connect() the way ClientGameRunner does: join from onconnect. */
function connectAndOpen(transport: Transport): FakeWebSocket {
  transport.connect(
    () => transport.joinGame(0),
    () => {},
  );
  const socket = FakeWebSocket.instances[FakeWebSocket.instances.length - 1];
  socket.open();
  return socket;
}

async function flushPromises(): Promise<void> {
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

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  FakeWebSocket.instances = [];
  (global as any).WebSocket = FakeWebSocket;
  isYandexAuthorized.mockResolvedValue(true);
  getYandexUniqueId.mockResolvedValue(YANDEX_ID);
  ensureSessionMock.mockResolvedValue(null);
  heldSessionTokenForMock.mockReturnValue(null);
});

afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
  (global as any).WebSocket = originalWebSocket;
});

describe("the join token (task 0332)", () => {
  test("the join carries the token when one is already held for this id", async () => {
    heldSessionTokenForMock.mockImplementation((id: string) =>
      id === YANDEX_ID ? TOKEN : null,
    );
    const socket = connectAndOpen(makeTransport());
    await flushPromises();

    const joins = socket.messages().filter((m) => m.type === "join");
    expect(joins).toHaveLength(1);
    expect(joins[0].profileSession).toBe(TOKEN);
    expect(joins[0].yandexPlayerId).toBe(YANDEX_ID);
    // Carried at join: no late send, and no login wait at all.
    expect(
      socket.messages().filter((m) => m.type === "update_identity"),
    ).toHaveLength(0);
    expect(ensureSessionMock).not.toHaveBeenCalled();
  });

  test("no token on the join when none is held — the key is absent", async () => {
    const socket = connectAndOpen(makeTransport());
    await flushPromises();

    const join = socket.messages().find((m) => m.type === "join");
    expect(join).toBeDefined();
    expect(join).not.toHaveProperty("profileSession");
  });

  test("no token on the join when the held one was minted for a different id", async () => {
    heldSessionTokenForMock.mockImplementation((id: string) =>
      id === "yandex-0332-other" ? TOKEN : null,
    );
    const socket = connectAndOpen(makeTransport());
    await flushPromises();

    const join = socket.messages().find((m) => m.type === "join");
    expect(join).not.toHaveProperty("profileSession");
    expect(JSON.stringify(socket.messages())).not.toContain(TOKEN);
  });

  test("a guest's join (no id) asks for no token", async () => {
    isYandexAuthorized.mockResolvedValue(false);
    const socket = connectAndOpen(makeTransport({ yandexPlayerId: null }));
    await flushPromises();

    const join = socket.messages().find((m) => m.type === "join");
    expect(join).not.toHaveProperty("profileSession");
    expect(heldSessionTokenForMock).not.toHaveBeenCalled();
  });

  test("a local game never reads or sends the token", async () => {
    heldSessionTokenForMock.mockReturnValue(TOKEN);
    const transport = makeTransport({ isLocal: true });
    const localOnMessage = jest.fn();
    (transport as any).localServer = { onMessage: localOnMessage };

    transport.joinGame(0);
    await flushPromises();

    expect(heldSessionTokenForMock).not.toHaveBeenCalled();
    expect(JSON.stringify(localOnMessage.mock.calls)).not.toContain(TOKEN);
    expect(FakeWebSocket.instances).toHaveLength(0);
  });

  test("a late token is sent once via update_identity after the login resolves", async () => {
    const login = deferred<string | null>();
    ensureSessionMock.mockReturnValue(login.promise);
    const socket = connectAndOpen(makeTransport());
    await flushPromises();
    expect(
      socket.messages().filter((m) => m.type === "update_identity"),
    ).toHaveLength(0);

    heldSessionTokenForMock.mockImplementation((id: string) =>
      id === YANDEX_ID ? TOKEN : null,
    );
    login.resolve(TOKEN);
    await flushPromises();

    const updates = socket
      .messages()
      .filter((m) => m.type === "update_identity");
    expect(updates).toEqual([
      {
        type: "update_identity",
        yandexPlayerId: YANDEX_ID,
        profileSession: TOKEN,
      },
    ]);
    // The join itself went first, without the token.
    expect(socket.messages()[0].type).toBe("join");
    expect(socket.messages()[0]).not.toHaveProperty("profileSession");
  });

  test("a late token uses the facade's id when the lobby had none", async () => {
    ensureSessionMock.mockResolvedValue(TOKEN);
    heldSessionTokenForMock.mockImplementation((id: string) =>
      id === YANDEX_ID ? TOKEN : null,
    );
    // The join had no id (and so no token); the id refresh sends it separately.
    const transport = makeTransport({ yandexPlayerId: null });
    const socket = connectAndOpen(transport);
    await flushPromises();

    const updates = socket
      .messages()
      .filter(
        (m) => m.type === "update_identity" && m.profileSession === TOKEN,
      );
    expect(updates).toHaveLength(1);
    expect(updates[0].yandexPlayerId).toBe(YANDEX_ID);
  });

  test("nothing is sent if the login yields no token", async () => {
    ensureSessionMock.mockResolvedValue(null);
    const socket = connectAndOpen(makeTransport());
    await flushPromises();

    expect(
      socket.messages().filter((m) => m.type === "update_identity"),
    ).toHaveLength(0);
  });

  test("nothing is sent if the socket closed while the login was pending", async () => {
    const login = deferred<string | null>();
    ensureSessionMock.mockReturnValue(login.promise);
    const socket = connectAndOpen(makeTransport());
    await flushPromises();
    socket.send.mockClear();

    socket.readyState = FakeWebSocket.CLOSED;
    heldSessionTokenForMock.mockReturnValue(TOKEN);
    login.resolve(TOKEN);
    await flushPromises();

    // Not sent, and not buffered for a later socket either.
    expect(socket.send).not.toHaveBeenCalled();
    expect(FakeWebSocket.instances).toHaveLength(1);
  });

  test("nothing is sent on a socket that has been replaced", async () => {
    const login = deferred<string | null>();
    ensureSessionMock.mockReturnValue(login.promise);
    const transport = makeTransport();
    const first = connectAndOpen(transport);
    await flushPromises();
    first.send.mockClear();

    // A reconnect replaces the socket; the new one is not open yet.
    transport.reconnect();
    const second = FakeWebSocket.instances[1];
    expect(second).toBeDefined();

    heldSessionTokenForMock.mockReturnValue(TOKEN);
    login.resolve(TOKEN);
    await flushPromises();

    expect(first.send).not.toHaveBeenCalled();
    expect(second.send).not.toHaveBeenCalled();
  });

  test("nothing late is sent when the join already carried the token", async () => {
    heldSessionTokenForMock.mockReturnValue(TOKEN);
    ensureSessionMock.mockResolvedValue(TOKEN);
    const socket = connectAndOpen(makeTransport());
    await flushPromises();

    const carrying = socket
      .messages()
      .filter((m) => JSON.stringify(m).includes(TOKEN));
    expect(carrying).toHaveLength(1);
    expect(carrying[0].type).toBe("join");
  });
});
