import {
  WORKER_INIT_TIMEOUT_MS,
  WorkerClient,
  WorkerInitTimeoutError,
} from "../../../src/core/worker/WorkerClient";

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
    // initialize() arms a 15 s timeout; keep it off the real clock.
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

describe("WorkerClient initialize() failures (task 0348)", () => {
  const realWorker = (globalThis as { Worker?: unknown }).Worker;

  beforeAll(() => {
    (globalThis as { Worker?: unknown }).Worker = FakeWorker;
  });

  afterAll(() => {
    (globalThis as { Worker?: unknown }).Worker = realWorker;
  });

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function startInit() {
    const client = new WorkerClient(gameStartInfo, "client-1");
    const worker = FakeWorker.latest!;
    const initPromise = client.initialize();
    const init = worker.posted.find((m) => m.type === "init")!;
    return { client, worker, initPromise, initId: init.id };
  }

  test("W1: init_failed rejects at once with the worker's reason, not a timeout", async () => {
    const { worker, initPromise, initId } = startInit();

    worker.dispatch("message", {
      data: { type: "init_failed", id: initId, error: "Failed to fetch map" },
    });

    const err = await initPromise.catch((e: unknown) => e);
    expect(err).toBeInstanceOf(Error);
    expect(err).not.toBeInstanceOf(WorkerInitTimeoutError);
    expect((err as Error).message).toBe(
      "Worker initialization failed: Failed to fetch map",
    );
  });

  test("W2: no reply stays pending until WORKER_INIT_TIMEOUT_MS, then times out", async () => {
    expect(WORKER_INIT_TIMEOUT_MS).toBe(15000);
    const { initPromise } = startInit();
    let settled = false;
    const outcome = initPromise.then(
      () => {
        settled = true;
      },
      (e: unknown) => {
        settled = true;
        return e;
      },
    );

    jest.advanceTimersByTime(WORKER_INIT_TIMEOUT_MS - 1);
    await Promise.resolve();
    expect(settled).toBe(false);

    jest.advanceTimersByTime(1);
    const err = await outcome;
    expect(err).toBeInstanceOf(WorkerInitTimeoutError);
    expect((err as Error).message).toBe("Worker initialization timeout");
  });

  test("W3: a successful start clears the timer", async () => {
    const { worker, initPromise, initId } = startInit();

    worker.dispatch("message", { data: { type: "initialized", id: initId } });
    await initPromise;

    expect(jest.getTimerCount()).toBe(0);
  });

  test("W4a: an init_failed rejection clears the timer", async () => {
    const { worker, initPromise, initId } = startInit();

    worker.dispatch("message", {
      data: { type: "init_failed", id: initId, error: "x" },
    });
    await expect(initPromise).rejects.toThrow("Worker initialization failed");

    expect(jest.getTimerCount()).toBe(0);
  });

  test("W4b: an error-event rejection clears the timer", async () => {
    const { worker, initPromise } = startInit();

    worker.dispatch("error", { message: "x" });
    await expect(initPromise).rejects.toThrow("Worker crashed: x");

    expect(jest.getTimerCount()).toBe(0);
  });

  test("W5: an init_failed after the timeout does nothing", async () => {
    const { worker, initPromise, initId } = startInit();
    const rejections: unknown[] = [];
    const outcome = initPromise.catch((e: unknown) => {
      rejections.push(e);
    });

    jest.advanceTimersByTime(WORKER_INIT_TIMEOUT_MS);
    await outcome;

    expect(() =>
      worker.dispatch("message", {
        data: { type: "init_failed", id: initId, error: "late" },
      }),
    ).not.toThrow();
    worker.dispatch("error", { message: "late" });
    await Promise.resolve();

    expect(rejections).toHaveLength(1);
    expect(rejections[0]).toBeInstanceOf(WorkerInitTimeoutError);
  });
});

describe("WorkerClient map source and cleanup during start (task 0035)", () => {
  const realWorker = (globalThis as { Worker?: unknown }).Worker;

  beforeAll(() => {
    (globalThis as { Worker?: unknown }).Worker = FakeWorker;
  });

  afterAll(() => {
    (globalThis as { Worker?: unknown }).Worker = realWorker;
  });

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("W6: the init message carries the map source; without one it is undefined", () => {
    const mapSource = { marker: "page-map" } as never;
    const withSource = new WorkerClient(gameStartInfo, "client-1", mapSource);
    void withSource.initialize().catch(() => {});
    const initWith = FakeWorker.latest!.posted.find((m) => m.type === "init")!;
    expect(initWith.mapSource).toBe(mapSource);

    const without = new WorkerClient(gameStartInfo, "client-1");
    void without.initialize().catch(() => {});
    const initWithout = FakeWorker.latest!.posted.find(
      (m) => m.type === "init",
    )!;
    expect(initWithout.mapSource).toBeUndefined();
  });

  test("W7: cleanup() during a pending start rejects initialize() at once, leaves no timer and stops the worker", async () => {
    const client = new WorkerClient(gameStartInfo, "client-1");
    const worker = FakeWorker.latest!;
    const initPromise = client.initialize();

    client.cleanup();

    const err = await initPromise.catch((e: unknown) => e);
    expect(err).toBeInstanceOf(Error);
    expect(err).not.toBeInstanceOf(WorkerInitTimeoutError);
    expect((err as Error).message).toBe(
      "Worker stopped before it finished starting",
    );
    expect(jest.getTimerCount()).toBe(0);
    expect(worker.terminated).toBe(true);
  });

  test("W8: cleanup() after a successful start does not throw and rejects nothing", async () => {
    const client = new WorkerClient(gameStartInfo, "client-1");
    const worker = FakeWorker.latest!;
    const outcomes: string[] = [];
    const initPromise = client.initialize().then(
      () => outcomes.push("resolved"),
      () => outcomes.push("rejected"),
    );
    const init = worker.posted.find((m) => m.type === "init")!;
    worker.dispatch("message", { data: { type: "initialized", id: init.id } });
    await initPromise;

    expect(() => client.cleanup()).not.toThrow();
    await Promise.resolve();

    expect(outcomes).toEqual(["resolved"]);
    expect(worker.terminated).toBe(true);
  });
});
