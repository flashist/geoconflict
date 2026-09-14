// Graceful shutdown (task 0221, G8). Raw `http` on port 0, no supertest — the supertest
// suites carry a known flake (CLAUDE.md), and this suite must never look like one.

import { EventEmitter } from "events";
import http from "http";
import type { AddressInfo } from "net";
import {
  createGracefulShutdown,
  DEFAULT_SHUTDOWN_TIMEOUT_MS,
  type ShutdownLogger,
} from "../../src/profile-server/Shutdown";

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

function fakeLogger(): ShutdownLogger & { lines: string[] } {
  const lines: string[] = [];
  return {
    lines,
    info: (m: string) => lines.push(`info ${m}`),
    warn: (m: string) => lines.push(`warn ${m}`),
    error: (m: string) => lines.push(`error ${m}`),
  };
}

interface Harness {
  server: http.Server;
  port: number;
  /** Responses parked by the handler, in arrival order. */
  parked: http.ServerResponse[];
  /** Resolves each time the handler parks a request. */
  arrived: () => Promise<void>;
  events: string[];
  pool: { end: jest.Mock<Promise<void>, []> };
  log: ShutdownLogger & { lines: string[] };
  exit: jest.Mock<void, [number]>;
  exited: Promise<number>;
}

async function startHarness(opts: {
  timeoutMs: number;
  poolEnd?: () => Promise<void>;
}): Promise<Harness> {
  const parked: http.ServerResponse[] = [];
  const events: string[] = [];
  let arrivalWaiter: Deferred<void> | undefined;
  const server = http.createServer((_req, res) => {
    parked.push(res);
    arrivalWaiter?.resolve();
    arrivalWaiter = undefined;
  });
  server.on("close", () => events.push("server.close"));
  await new Promise<void>((resolve) =>
    server.listen(0, "127.0.0.1", () => resolve()),
  );
  const port = (server.address() as AddressInfo).port;
  const pool = {
    end: jest.fn(async () => {
      events.push("pool.end");
      if (opts.poolEnd) await opts.poolEnd();
    }),
  };
  const exitDeferred = deferred<number>();
  const exit = jest.fn((code: number) => exitDeferred.resolve(code));
  return {
    server,
    port,
    parked,
    arrived: () => {
      arrivalWaiter = deferred<void>();
      return arrivalWaiter.promise;
    },
    events,
    pool,
    log: fakeLogger(),
    exit,
    exited: exitDeferred.promise,
  };
}

/** Fire a request; resolves with the status code, or rejects with the socket error. */
function request(
  port: number,
  agent: http.Agent | false = false,
): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    const req = http.get(
      { host: "127.0.0.1", port, path: "/", agent },
      (res) => {
        res.resume();
        res.on("end", () => resolve(res.statusCode ?? 0));
      },
    );
    req.on("error", reject);
  });
}

async function stopHarness(h: Harness): Promise<void> {
  h.server.closeAllConnections();
  await new Promise<void>((resolve) => h.server.close(() => resolve()));
}

describe("createGracefulShutdown", () => {
  const harnesses: Harness[] = [];
  afterEach(async () => {
    for (const h of harnesses.splice(0)) {
      await stopHarness(h);
    }
  });

  test("drains an in-flight request, closes the pool AFTER the server, exits 0", async () => {
    const h = await startHarness({ timeoutMs: 2_000 });
    harnesses.push(h);
    const arrival = h.arrived();
    const inflight = request(h.port);
    await arrival;

    const gs = createGracefulShutdown({
      server: h.server,
      pool: h.pool,
      log: h.log,
      timeoutMs: 2_000,
      exit: h.exit,
    });
    gs.shutdown("SIGTERM");
    // Still draining: nothing has exited and the pool is untouched while the request is open.
    await new Promise((r) => setImmediate(r));
    expect(h.exit).not.toHaveBeenCalled();
    expect(h.pool.end).not.toHaveBeenCalled();

    h.parked[0].writeHead(200).end("ok");
    await expect(inflight).resolves.toBe(200);
    await expect(h.exited).resolves.toBe(0);
    expect(h.pool.end).toHaveBeenCalledTimes(1);
    expect(h.events).toEqual(["server.close", "pool.end"]);
    expect(h.log.lines).toEqual([
      "info SIGTERM received — draining (deadline 2000ms)",
      "info http server closed — in-flight requests drained",
      "info pg pool closed",
    ]);
  });

  test("refuses new connections once the drain has begun", async () => {
    const h = await startHarness({ timeoutMs: 2_000 });
    harnesses.push(h);
    const arrival = h.arrived();
    const inflight = request(h.port);
    await arrival;
    createGracefulShutdown({
      server: h.server,
      pool: h.pool,
      log: h.log,
      timeoutMs: 2_000,
      exit: h.exit,
    }).shutdown("SIGTERM");
    await new Promise((r) => setImmediate(r));

    await expect(request(h.port)).rejects.toMatchObject({
      code: "ECONNREFUSED",
    });

    h.parked[0].writeHead(204).end();
    await expect(inflight).resolves.toBe(204);
    await expect(h.exited).resolves.toBe(0);
  });

  test("closes an idle keep-alive connection so the drain does not wait on it", async () => {
    const h = await startHarness({ timeoutMs: 2_000 });
    harnesses.push(h);
    const agent = new http.Agent({ keepAlive: true });
    const arrival = h.arrived();
    const first = request(h.port, agent);
    await arrival;
    h.parked[0].writeHead(200).end("ok");
    await expect(first).resolves.toBe(200);
    // The socket now sits idle in the agent's pool, still open on the server side.
    await new Promise((r) => setImmediate(r));

    createGracefulShutdown({
      server: h.server,
      pool: h.pool,
      log: h.log,
      timeoutMs: 2_000,
      exit: h.exit,
    }).shutdown("SIGTERM");
    await expect(h.exited).resolves.toBe(0);
    expect(h.log.lines).not.toContainEqual(
      expect.stringContaining("deadline (2000ms) exceeded"),
    );
    agent.destroy();
  });

  test("deadline: a request that never completes → connections destroyed, pool still closed, exit 1", async () => {
    const h = await startHarness({ timeoutMs: 200 });
    harnesses.push(h);
    const arrival = h.arrived();
    const inflight = request(h.port);
    await arrival;
    createGracefulShutdown({
      server: h.server,
      pool: h.pool,
      log: h.log,
      timeoutMs: 200,
      exit: h.exit,
    }).shutdown("SIGTERM");

    await expect(h.exited).resolves.toBe(1);
    // The parked client saw its socket destroyed, not a response. (Not `toBeInstanceOf(Error)`:
    // the client error is built in node's realm, and jest compares against its own `Error`.)
    await expect(inflight).rejects.toMatchObject({
      message: expect.stringMatching(/socket hang up|ECONNRESET/),
    });
    // The pool close is STARTED (best-effort) but the exit is not gated on it settling.
    expect(h.pool.end).toHaveBeenCalledTimes(1);
    expect(h.exit).toHaveBeenCalledTimes(1);
    expect(h.log.lines).toContain(
      "warn drain deadline (200ms) exceeded — destroying remaining connections",
    );
  });

  test("deadline covers the pool close too: a pool.end that never settles → exit 1, not a hang (R2)", async () => {
    // pg-pool's end() waits for checked-out clients; if one never comes back the old
    // code cleared the deadline on server close and then waited forever → Docker SIGKILL.
    const h = await startHarness({
      timeoutMs: 200,
      poolEnd: () => new Promise<void>(() => {}),
    });
    harnesses.push(h);
    createGracefulShutdown({
      server: h.server,
      pool: h.pool,
      log: h.log,
      timeoutMs: 200,
      exit: h.exit,
    }).shutdown("SIGTERM");

    await expect(h.exited).resolves.toBe(1);
    expect(h.exit).toHaveBeenCalledTimes(1);
    expect(h.pool.end).toHaveBeenCalledTimes(1);
    expect(h.log.lines).toEqual([
      "info SIGTERM received — draining (deadline 200ms)",
      "info http server closed — in-flight requests drained",
      "warn drain deadline (200ms) exceeded — pg pool did not close in time, exiting",
    ]);
  });

  test("a second signal during the drain is logged and ignored — pool closed once, one exit", async () => {
    const h = await startHarness({ timeoutMs: 2_000 });
    harnesses.push(h);
    const arrival = h.arrived();
    const inflight = request(h.port);
    await arrival;
    const gs = createGracefulShutdown({
      server: h.server,
      pool: h.pool,
      log: h.log,
      timeoutMs: 2_000,
      exit: h.exit,
    });
    gs.shutdown("SIGTERM");
    gs.shutdown("SIGINT");
    expect(h.log.lines).toContain(
      "warn SIGINT received during drain — ignored (drain in progress)",
    );

    h.parked[0].writeHead(200).end("ok");
    await expect(inflight).resolves.toBe(200);
    await expect(h.exited).resolves.toBe(0);
    expect(h.pool.end).toHaveBeenCalledTimes(1);
    expect(h.exit).toHaveBeenCalledTimes(1);
  });

  test("a failing pool.end is logged and still exits 0 (the drain itself succeeded)", async () => {
    const h = await startHarness({
      timeoutMs: 2_000,
      poolEnd: () => Promise.reject(new Error("pool boom")),
    });
    harnesses.push(h);
    createGracefulShutdown({
      server: h.server,
      pool: h.pool,
      log: h.log,
      timeoutMs: 2_000,
      exit: h.exit,
    }).shutdown("SIGTERM");
    await expect(h.exited).resolves.toBe(0);
    expect(h.log.lines).toContainEqual(
      expect.stringMatching(/^error pg pool close failed: Error: pool boom/),
    );
  });

  test("install() wires SIGTERM and SIGINT; the default deadline is under Docker's 10 s grace", async () => {
    const h = await startHarness({ timeoutMs: 2_000 });
    harnesses.push(h);
    const proc = new EventEmitter();
    createGracefulShutdown({
      server: h.server,
      pool: h.pool,
      log: h.log,
      exit: h.exit,
    }).install(proc);
    expect(proc.listenerCount("SIGTERM")).toBe(1);
    expect(proc.listenerCount("SIGINT")).toBe(1);
    expect(DEFAULT_SHUTDOWN_TIMEOUT_MS).toBeLessThan(10_000);

    proc.emit("SIGTERM");
    expect(h.log.lines[0]).toBe(
      `info SIGTERM received — draining (deadline ${DEFAULT_SHUTDOWN_TIMEOUT_MS}ms)`,
    );
    await expect(h.exited).resolves.toBe(0);
  });
});
