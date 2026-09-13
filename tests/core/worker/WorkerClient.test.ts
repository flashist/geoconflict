import { WorkerClient } from "../../../src/core/worker/WorkerClient";

type Listener = (event: unknown) => void;

// Stand-in for the browser Worker: records listeners and posted messages so a
// test can play the worker's side of the conversation.
class FakeWorker {
  static latest: FakeWorker | undefined;
  private listeners = new Map<string, Listener[]>();
  posted: Array<Record<string, unknown>> = [];
  terminated = false;

  constructor(_url: unknown) {
    FakeWorker.latest = this;
  }

  addEventListener(type: string, listener: Listener) {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }

  postMessage(message: Record<string, unknown>) {
    this.posted.push(message);
  }

  terminate() {
    this.terminated = true;
  }

  dispatch(type: string, event: unknown) {
    for (const listener of this.listeners.get(type) ?? []) {
      listener(event);
    }
  }
}

const gameStartInfo = {
  gameID: "g",
  players: [],
  config: {},
} as never;

async function initializedClient() {
  const client = new WorkerClient(gameStartInfo, "client-1");
  const worker = FakeWorker.latest!;
  const initPromise = client.initialize();
  const init = worker.posted.find((m) => m.type === "init")!;
  worker.dispatch("message", { data: { type: "initialized", id: init.id } });
  await initPromise;
  const callback = jest.fn();
  client.start(callback);
  return { client, worker, callback };
}

describe("WorkerClient worker → main thread errors (task 0232)", () => {
  const realWorker = (globalThis as { Worker?: unknown }).Worker;

  beforeAll(() => {
    (globalThis as { Worker?: unknown }).Worker = FakeWorker;
  });

  afterAll(() => {
    (globalThis as { Worker?: unknown }).Worker = realWorker;
  });

  beforeEach(() => {
    // initialize() arms a 5 s timeout; keep it off the real clock.
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("a game_error message reaches the start() callback", async () => {
    const { worker, callback } = await initializedClient();

    worker.dispatch("message", {
      data: { type: "game_error", error: { errMsg: "boom", stack: "s" } },
    });

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith({ errMsg: "boom", stack: "s" });
  });

  test("a game_update message still reaches the start() callback", async () => {
    const { worker, callback } = await initializedClient();
    const gameUpdate = { tick: 1, updates: {} };

    worker.dispatch("message", { data: { type: "game_update", gameUpdate } });

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(gameUpdate);
  });

  test("a post-init worker error event reaches the start() callback", async () => {
    const { worker, callback } = await initializedClient();

    worker.dispatch("error", { message: "x" });

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith({ errMsg: "Worker crashed: x" });
  });

  test("a pre-init worker error event still rejects initialize()", async () => {
    const client = new WorkerClient(gameStartInfo, "client-1");
    const worker = FakeWorker.latest!;
    const initPromise = client.initialize();

    worker.dispatch("error", { message: "x" });

    await expect(initPromise).rejects.toThrow("Worker crashed: x");
  });

  test("after cleanup() nothing is delivered", async () => {
    const { client, worker, callback } = await initializedClient();

    client.cleanup();
    worker.dispatch("message", {
      data: { type: "game_error", error: { errMsg: "boom" } },
    });
    worker.dispatch("error", { message: "x" });

    expect(worker.terminated).toBe(true);
    expect(callback).not.toHaveBeenCalled();
  });
});
