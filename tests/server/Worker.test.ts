// 0194: unit cover for the departed-requester guard in Worker.ts.
//
// Importing Worker.ts runs its module scope only (config load, logger.child, MapPlaylist)
// — startWorker() is never called, so no port is bound. The import is NOT side-effect
// free, though: through Logger.ts it builds a winston logger, constructs an OTEL
// LoggerProvider, and globally replaces console.warn (src/server/Logger.ts:69-76). In
// this dev test env otelEnabled() is false, so the provider is built with no processors
// and starts no timer — asserted by Step 0b of the build before these tests were written,
// and re-confirmed by --detectOpenHandles (suite exits clean). That last part is
// env-conditional: with OTEL enabled the same import constructs a BatchLogRecordProcessor,
// i.e. a live timer / open handle. Recorded as an accepted residual in review.md — it is
// a property of Logger.ts, not of 0194.
//
// The race itself (a create buffered in a SIGSTOPped worker's socket, aborted by the
// master, then drained on SIGCONT) cannot be reproduced in-process: it needs the socket
// to die after the body is buffered and before the handler dispatches. It is covered by
// the Step 0 probe at predicate level (90/90) and by the live wedge run end-to-end.
import { EventEmitter } from "events";
import {
  REQUESTER_SETTLE_MS,
  awaitRequesterSettled,
  requesterGone,
} from "../../src/server/Worker";

const liveSocket = () => ({ destroyed: false });
const deadSocket = () => ({ destroyed: true });

const healthyReq = () => ({ socket: liveSocket() });
const healthyRes = () => ({
  destroyed: false,
  socket: liveSocket(),
  once: () => undefined,
  removeListener: () => undefined,
});

describe("requesterGone", () => {
  it("is false for a healthy request", () => {
    expect(requesterGone(healthyReq(), healthyRes())).toBe(false);
  });

  it("is true when res.destroyed", () => {
    expect(
      requesterGone(healthyReq(), { ...healthyRes(), destroyed: true }),
    ).toBe(true);
  });

  it("is true when req.socket.destroyed", () => {
    expect(requesterGone({ socket: deadSocket() }, healthyRes())).toBe(true);
  });

  it("is true when res.socket.destroyed", () => {
    expect(
      requesterGone(healthyReq(), { ...healthyRes(), socket: deadSocket() }),
    ).toBe(true);
  });

  it("is true when res.socket is null", () => {
    expect(requesterGone(healthyReq(), { ...healthyRes(), socket: null })).toBe(
      true,
    );
  });

  it("is true when req.socket is null", () => {
    expect(requesterGone({ socket: null }, healthyRes())).toBe(true);
  });

  // Regression guard for the Step 0 finding. A healthy create's request object really
  // does carry destroyed=true / closed=true / complete=true once express.json() has read
  // the body, and req.aborted stays false even for a requester that HAS gone away
  // (measured 0/90 aborted, 15/15 healthy for req.destroyed). A predicate that consulted
  // req.destroyed or req.aborted would reject 100% of healthy creates, or fire never.
  //
  // What this test does and does not guard: it FAILS if `req.destroyed` is reintroduced
  // into the predicate — the fixture sets destroyed=true, so a predicate widened with
  // `|| req.destroyed` would return true here. It does NOT catch `req.aborted`: the
  // fixture sets aborted=false, so `|| req.aborted` still returns false and this test
  // still passes. That half is guarded at the type level instead — `RequestLike` in
  // Worker.ts declares only `socket`, so reading either `req.aborted` or `req.destroyed`
  // in the predicate is a tsc error, and `npx tsc --noEmit` is in the check set.
  it("stays false for a fully-read healthy request carrying destroyed/closed/complete", () => {
    const req = {
      socket: liveSocket(),
      destroyed: true,
      aborted: false,
      closed: true,
      complete: true,
    };
    expect(requesterGone(req, healthyRes())).toBe(false);
  });
});

describe("awaitRequesterSettled", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it("returns true immediately and arms no timer when the requester is already gone", async () => {
    jest.useFakeTimers();
    const res = Object.assign(new EventEmitter(), {
      destroyed: true,
      socket: liveSocket(),
    });

    await expect(awaitRequesterSettled(healthyReq(), res)).resolves.toBe(true);
    expect(jest.getTimerCount()).toBe(0);
    expect(res.listenerCount("close")).toBe(0);
  });

  it("waits the full window for a live requester, then returns false", async () => {
    jest.useFakeTimers();
    const res = Object.assign(new EventEmitter(), {
      destroyed: false,
      socket: liveSocket(),
    });

    let settled: boolean | undefined;
    const pending = awaitRequesterSettled(healthyReq(), res).then(
      (v) => (settled = v),
    );

    await jest.advanceTimersByTimeAsync(REQUESTER_SETTLE_MS - 1);
    expect(settled).toBeUndefined();

    await jest.advanceTimersByTimeAsync(1);
    await pending;

    expect(settled).toBe(false);
    expect(res.listenerCount("close")).toBe(0);
    expect(jest.getTimerCount()).toBe(0);
  });

  it("returns true as soon as the requester departs mid-window, without waiting it out", async () => {
    jest.useFakeTimers();
    const res = Object.assign(new EventEmitter(), {
      destroyed: false,
      socket: liveSocket(),
    });

    const pending = awaitRequesterSettled(healthyReq(), res);

    await jest.advanceTimersByTimeAsync(1);
    res.destroyed = true;
    res.emit("close");

    await expect(pending).resolves.toBe(true);
    expect(jest.getTimerCount()).toBe(0);
    expect(res.listenerCount("close")).toBe(0);
  });
});

describe("REQUESTER_SETTLE_MS", () => {
  it("is 10 ms — 2x the 5 ms by which the departure was observable for 90/90 probed requests", () => {
    expect(REQUESTER_SETTLE_MS).toBe(10);
  });

  // Master.ts:521 CREATE_GAME_TIMEOUT_MS = 5_000. The settle window must stay orders of
  // magnitude below the master's own abort deadline, or the guard would delay a create
  // past the point the master gives up on it.
  it("is three orders of magnitude below the master's create timeout", () => {
    const CREATE_GAME_TIMEOUT_MS = 5_000;
    expect(REQUESTER_SETTLE_MS).toBeLessThan(CREATE_GAME_TIMEOUT_MS / 100);
  });
});
