// Task 0348: the real worker entry file, driven through a stubbed `self`, with
// an async game-runner start that fails. Its own file because the worker
// module keeps module-level state (gameRunner) — see WorkerWorker.test.ts.

jest.mock("../../../src/core/GameRunner", () => ({
  createGameRunner: jest.fn(() =>
    Promise.reject(new Error("Failed to fetch /maps/world/map.bin")),
  ),
}));

// A module, not a script: keeps Listener out of the global scope that
// WorkerWorker.test.ts (a script) also declares it in.
export {};

type Listener = (event: unknown) => unknown;

describe("Worker.worker reports an async init failure (task 0348)", () => {
  const listeners: Record<string, Listener> = {};
  const postMessage = jest.fn();
  const realSelf = (globalThis as { self?: unknown }).self;
  const unhandled: unknown[] = [];
  const onUnhandled = (reason: unknown) => {
    unhandled.push(reason);
  };

  beforeAll(async () => {
    process.on("unhandledRejection", onUnhandled);
    jest.spyOn(console, "error").mockImplementation(() => {});
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
    // The rejection reaches the .catch a microtask or two later; one macrotask
    // turn also lets Node report any unhandled rejection.
    await new Promise((resolve) => setImmediate(resolve));
    await new Promise((resolve) => setImmediate(resolve));
  });

  afterAll(() => {
    process.off("unhandledRejection", onUnhandled);
    (globalThis as { self?: unknown }).self = realSelf;
    jest.restoreAllMocks();
  });

  test("posts init_failed with the real reason", () => {
    expect(postMessage).toHaveBeenCalledWith({
      type: "init_failed",
      id: "init-1",
      error: "Failed to fetch /maps/world/map.bin",
    });
  });

  test("never posts initialized", () => {
    expect(postMessage).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: "initialized" }),
    );
    expect(postMessage).toHaveBeenCalledTimes(1);
  });

  test("leaves no unhandled rejection behind", () => {
    expect(unhandled).toEqual([]);
  });
});
