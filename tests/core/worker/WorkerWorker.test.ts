// Task 0232: the real worker entry file, driven through a stubbed `self`.
// This is the test that would have caught the original drop: an ErrorUpdate
// handed to the runner callback must leave the worker as a game_error message.

const mockCaptured: { callback?: (gu: unknown) => void } = {};

jest.mock("../../../src/core/GameRunner", () => ({
  createGameRunner: jest.fn(
    (
      _gameStartInfo: unknown,
      _clientID: unknown,
      _mapLoader: unknown,
      callback: (gu: unknown) => void,
    ) => {
      mockCaptured.callback = callback;
      return Promise.resolve({});
    },
  ),
}));

type Listener = (event: unknown) => unknown;

describe("Worker.worker gameUpdate bridge (task 0232)", () => {
  const listeners: Record<string, Listener> = {};
  const postMessage = jest.fn();
  const realSelf = (globalThis as { self?: unknown }).self;

  beforeAll(async () => {
    (globalThis as { self?: unknown }).self = {
      postMessage,
      addEventListener: (type: string, listener: Listener) => {
        listeners[type] = listener;
      },
    };
    await import("../../../src/core/worker/Worker.worker");

    await listeners.message({
      data: { type: "init", id: "init-1", gameStartInfo: {}, clientID: "c" },
    });
    // createGameRunner's .then posts "initialized" one microtask later.
    await new Promise((resolve) => setImmediate(resolve));
  });

  afterAll(() => {
    (globalThis as { self?: unknown }).self = realSelf;
  });

  beforeEach(() => {
    postMessage.mockClear();
  });

  test("init handshake completed through the stubbed self", () => {
    expect(mockCaptured.callback).toBeDefined();
  });

  test("an ErrorUpdate leaves the worker as a game_error message", () => {
    const error = { errMsg: "boom", stack: "s" };

    mockCaptured.callback!(error);

    expect(postMessage).toHaveBeenCalledTimes(1);
    expect(postMessage).toHaveBeenCalledWith({ type: "game_error", error });
  });

  test("view data leaves the worker as a game_update message", () => {
    const gameUpdate = {
      tick: 3,
      updates: {},
      packedTileUpdates: [],
      playerNameViewData: {},
    };

    mockCaptured.callback!(gameUpdate);

    expect(postMessage).toHaveBeenCalledTimes(1);
    expect(postMessage).toHaveBeenCalledWith({
      type: "game_update",
      gameUpdate,
    });
  });
});
