// Schemas -> CosmeticSchemas uses `jose` at runtime (untransformed ESM under jest); mock it
// the same way Archive.test.ts does.
jest.mock("jose", () => ({
  base64url: { decode: jest.fn() },
}));

// Master.ts -> Logger.ts pulls in winston + the OpenTelemetry SDK. Stub it so the test
// stays isolated to the HTTP contract. One shared child object (not a fresh one per
// child() call) so the master's `log.error` calls are countable from the tests.
jest.mock("../../src/server/Logger", () => {
  const child = {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  };
  return {
    logger: { child: () => child },
    formatError: (error: unknown) => String(error),
  };
});

// Master.ts polls the workers through undici's fetch. Mocked so the lobby-poll tests
// control when (and whether) each per-ID request settles.
jest.mock("undici", () => ({
  fetch: jest.fn(),
  ProxyAgent: jest.fn(),
}));

import request from "supertest";
import { fetch } from "undici";
import { DevServerConfig } from "../../src/core/configuration/DevConfig";
import { generateID, simpleHash } from "../../src/core/Util";
import { logger } from "../../src/server/Logger";
import type { MapPlaylist } from "../../src/server/MapPlaylist";
import {
  app,
  CREATE_GAME_TIMEOUT_MS,
  lobbyPollTick,
  PICK_GAME_ID_MAX_ATTEMPTS,
  pickGameID,
  publicLobbyIDs,
  schedulePublicGame,
  type ScheduleDeps,
  workerSupervisor,
} from "../../src/server/Master";
import {
  backoffDelayMs,
  quorumFor,
  READY_DEADLINE_MS,
  WorkerSupervisor,
  type WorkerSupervisorDeps,
} from "../../src/server/WorkerSupervisor";

// Importing Master.ts registers its routes but starts nothing: startMaster() is never
// called here, so no worker is forked and the lobby-fetch interval that assigns
// publicLobbiesJsonStr never installs. That is precisely the 2026-08-22 outage state,
// reproduced deterministically — see
// ai-agents/knowledge-base/incidents/2026-08-22-prod-public-lobbies-empty-outage.md
describe("GET /api/public_lobbies before any lobby fetch has run", () => {
  it("responds 200 with a non-empty body", async () => {
    const response = await request(app).get("/api/public_lobbies");

    expect(response.status).toBe(200);
    expect(response.text.length).toBeGreaterThan(0);
  });

  // Regression guard for incident defect #5. Before the fix this body was "", and the
  // client's response.json() (src/client/PublicLobby.ts:138) threw on it.
  it("responds with a body that JSON.parse accepts", async () => {
    const response = await request(app).get("/api/public_lobbies");

    expect(() => JSON.parse(response.text)).not.toThrow();
  });

  // Pins the placeholder to { lobbies: [] }, which is the shape fetchLobbies() assigns
  // today (JSON.stringify({ lobbies: lobbyInfos })).
  // This does NOT detect drift in fetchLobbies() itself: the test never reads that
  // function, so changing the real top-level key would leave this green. Genuine parity
  // coverage needs fetchLobbies exported, which is out of 0055's scope — carried to 0056.
  it("responds with the same top-level shape as a real lobbies response", async () => {
    const response = await request(app).get("/api/public_lobbies");
    const body = JSON.parse(response.text);

    expect(Object.keys(body)).toEqual(["lobbies"]);
    expect(Array.isArray(body.lobbies)).toBe(true);
    expect(body.lobbies).toHaveLength(0);
  });
});

// 0193: at most one fetchLobbies() outstanding. Each tick below calls lobbyPollTick()
// directly (the 100 ms setInterval in startMaster() is never installed here), with
// undici's fetch mocked per game ID and the master's 5 s abort timer under fake timers.
// See ai-agents/knowledge-base/reports/2026-08-26-0057-worker-routing-dead-worker-findings.md §2.2.
describe("lobbyPollTick in-flight guard", () => {
  const fetchMock = fetch as unknown as jest.Mock;
  const log = logger.child({ comp: "m" }) as unknown as { error: jest.Mock };

  type FetchInit = { signal: AbortSignal };
  type FetchBehaviour = (gameID: string, init: FetchInit) => Promise<unknown>;

  // Mirrors Worker.ts `game.gameInfo()` for a lobby that must stay listed: msUntilStart
  // > 250 and maxPlayers > human clients, or fetchLobbies() drops the ID. Date.now() is
  // read at call time so it follows the fake clock.
  const healthy: FetchBehaviour = async (gameID) => ({
    json: async () => ({
      gameID,
      numClients: 0,
      clients: [],
      gameConfig: { maxPlayers: 8 },
      msUntilStart: Date.now() + 60_000,
    }),
  });

  // FIXTURES MUST SETTLE. A fetch promise still pending when a test ends keeps the
  // module's in-flight flag set, and then the guarded reset tick in afterEach is a no-op
  // and every later test in this file goes order-dependent. So every fixture promise
  // that can outlive its test is built through trackedPromise(): afterEach settles any
  // straggler (a no-op for one that already settled) before it resets the module.
  const settleStragglers: Array<() => void> = [];
  function trackedPromise(
    executor: (resolve: (value: unknown) => void, reject: (reason: unknown) => void) => void,
  ): Promise<unknown> {
    return new Promise<unknown>((resolve, reject) => {
      settleStragglers.push(() =>
        resolve(healthy("settled-by-afterEach", { signal: new AbortController().signal })),
      );
      executor(resolve, reject);
    });
  }

  // Rejects the way undici does once the master's 5 s AbortController fires.
  const abortsOnSignal: FetchBehaviour = (_gameID, init) =>
    trackedPromise((_resolve, reject) => {
      init.signal.addEventListener("abort", () =>
        reject(Object.assign(new Error("aborted"), { name: "AbortError" })),
      );
    });

  // Pending until the test releases it (or afterEach does — see trackedPromise).
  function pendingUntilReleased(): {
    behaviour: FetchBehaviour;
    release: () => void;
  } {
    let release: () => void = () => {};
    const promise = trackedPromise((resolve) => {
      release = () =>
        resolve(healthy("released", { signal: new AbortController().signal }));
    });
    return { behaviour: () => promise, release };
  }

  // Routes each fetch to the behaviour registered for the game ID at the end of its URL.
  function routeFetch(byGameID: Record<string, FetchBehaviour>) {
    fetchMock.mockImplementation((url: string, init: FetchInit) => {
      const gameID = url.split("/").pop() ?? "";
      const behaviour = byGameID[gameID];
      if (behaviour === undefined) {
        throw new Error(`unexpected fetch for ${gameID}`);
      }
      return behaviour(gameID, init);
    });
  }

  const fetchedGameIDs = () =>
    fetchMock.mock.calls.map(([url]: [string]) => url.split("/").pop());

  // supertest needs real sockets, so real timers for the request; fake timers again
  // afterwards so a later tick's 5 s abort timer stays under test control.
  async function publishedLobbyIDs(): Promise<string[]> {
    jest.useRealTimers();
    const response = await request(app).get("/api/public_lobbies");
    jest.useFakeTimers();
    return JSON.parse(response.text).lobbies.map(
      (lobby: { gameID: string }) => lobby.gameID,
    );
  }

  beforeEach(() => {
    jest.useFakeTimers();
    fetchMock.mockReset();
    log.error.mockClear();
  });

  // Module state (publicLobbyIDs, publicLobbiesJsonStr, the in-flight flag) persists
  // across tests in this file. Put it back to the freshly-imported shape so the three
  // placeholder tests above stay order-independent. The reset tick is unconditional:
  // stragglers are settled first (real timers, so the settle chain drains on a real
  // setImmediate), and the tick must observably run — a skipped tick fails here, by name.
  afterEach(async () => {
    jest.useRealTimers();
    for (const settle of settleStragglers.splice(0)) settle();
    await new Promise((resolve) => setImmediate(resolve));
    publicLobbyIDs.clear();
    fetchMock.mockReset();
    const resetTick = jest.fn();
    await lobbyPollTick(resetTick);
    expect(resetTick).toHaveBeenCalledTimes(1);
    const response = await request(app).get("/api/public_lobbies");
    expect(response.text).toBe(JSON.stringify({ lobbies: [] }));
  });

  it("skips ticks while a poll is in flight: one request per ID, not one per tick", async () => {
    publicLobbyIDs.add("stuck");
    const pending = pendingUntilReleased();
    routeFetch({ stuck: pending.behaviour });
    const onEmpty = jest.fn();

    const tickA = lobbyPollTick(onEmpty);
    const tickB = lobbyPollTick(onEmpty);
    const tickC = lobbyPollTick(onEmpty);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(onEmpty).not.toHaveBeenCalled();

    pending.release();
    await Promise.all([tickA, tickB, tickC]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("lets a late abort settle without overwriting a live lobby, then releases the flag", async () => {
    publicLobbyIDs.add("stuck");
    publicLobbyIDs.add("live");
    routeFetch({ stuck: abortsOnSignal, live: healthy });
    const onEmpty = jest.fn();

    const tickA = lobbyPollTick(onEmpty);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await lobbyPollTick(onEmpty); // tick B: skipped, A still pending on `stuck`
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await jest.advanceTimersByTimeAsync(5000); // the master's abort fires
    await tickA;

    expect(log.error).toHaveBeenCalledTimes(1);
    expect(log.error.mock.calls[0][0]).toContain("Error fetching game stuck");
    expect(publicLobbyIDs.has("stuck")).toBe(false);
    expect(publicLobbyIDs.has("live")).toBe(true);
    expect(onEmpty).not.toHaveBeenCalled();
    expect(await publishedLobbyIDs()).toEqual(["live"]);

    // Tick C runs: the flag was released when A settled, and only `live` remains.
    await lobbyPollTick(onEmpty);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchedGameIDs()[2]).toBe("live");
  });

  it("reschedules exactly once when the sole lobby aborts", async () => {
    publicLobbyIDs.add("stuck");
    routeFetch({ stuck: abortsOnSignal });
    const onEmpty = jest.fn();

    const tickA = lobbyPollTick(onEmpty);
    await lobbyPollTick(onEmpty);
    await lobbyPollTick(onEmpty);
    await lobbyPollTick(onEmpty);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(5000);
    await tickA;

    expect(log.error).toHaveBeenCalledTimes(1);
    expect(onEmpty).toHaveBeenCalledTimes(1);
    expect(publicLobbyIDs.size).toBe(0);
    expect(await publishedLobbyIDs()).toEqual([]);
  });

  it("keeps the healthy cadence: one fetch per tick per ID, scheduling on an empty set", async () => {
    publicLobbyIDs.add("live");
    routeFetch({ live: healthy });
    const onEmpty = jest.fn();

    await lobbyPollTick(onEmpty);
    await lobbyPollTick(onEmpty);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchedGameIDs()).toEqual(["live", "live"]);
    expect(onEmpty).not.toHaveBeenCalled();
    expect(log.error).not.toHaveBeenCalled();

    publicLobbyIDs.clear();
    await lobbyPollTick(onEmpty);
    await lobbyPollTick(onEmpty);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(onEmpty).toHaveBeenCalledTimes(2);
  });

  it("releases the flag when onEmpty throws", async () => {
    const boom = () => {
      throw new Error("boom");
    };
    await expect(lobbyPollTick(boom)).rejects.toThrow("boom");

    const onEmpty = jest.fn();
    await lobbyPollTick(onEmpty);
    expect(onEmpty).toHaveBeenCalledTimes(1);
  });
});

// 0056: readiness gate + crash recovery, tested on the pure WorkerSupervisor with every
// side effect injected — no cluster.fork, no jest fake timers (0193's describe above
// installs those in its own beforeEach; this suite's timers are a plain array and its
// clock a number the test advances, so the two cannot interfere). See
// ai-agents/tasks/backlog/0056-restore-worker-crash-recovery-and-survivable-scheduling-gate/plan.md
describe("WorkerSupervisor", () => {
  type Timer = { fn: () => void; ms: number; fired: boolean };

  function harness(numWorkers: number) {
    let clock = 0;
    let nextClusterId = 1;
    const timers: Timer[] = [];
    const log = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };
    const fork = jest.fn((index: number) => ({
      clusterId: nextClusterId++,
      pid: 1000 + index,
    }));
    const onSchedulingStart = jest.fn();
    const deps: WorkerSupervisorDeps = {
      numWorkers,
      fork,
      setTimer: (fn, ms) => {
        timers.push({ fn, ms, fired: false });
      },
      now: () => clock,
      log,
      onSchedulingStart,
    };
    const supervisor = new WorkerSupervisor(deps);

    // clusterId of the most recent fork of `index` (from the fork mock's results).
    const clusterIdOf = (index: number): number => {
      for (let i = fork.mock.calls.length - 1; i >= 0; i--) {
        if (fork.mock.calls[i][0] === index) {
          return (fork.mock.results[i].value as { clusterId: number }).clusterId;
        }
      }
      throw new Error(`index ${index} was never forked`);
    };
    const restartTimers = () => timers.filter((t) => t.ms !== READY_DEADLINE_MS);
    const deadlineTimer = (): Timer => {
      const found = timers.find((t) => t.ms === READY_DEADLINE_MS);
      if (found === undefined) throw new Error("deadline timer not armed");
      return found;
    };
    const fire = (timer: Timer) => {
      expect(timer.fired).toBe(false);
      timer.fired = true;
      timer.fn();
    };
    const fireNewestRestart = () => {
      const pending = restartTimers().filter((t) => !t.fired);
      expect(pending.length).toBeGreaterThan(0);
      fire(pending[pending.length - 1]);
    };
    const exitOf = (index: number, overrides: Partial<Parameters<typeof supervisor.handleExit>[0]> = {}) =>
      supervisor.handleExit({
        clusterId: clusterIdOf(index),
        pid: 1000 + index,
        code: null,
        signal: "SIGKILL",
        exitedAfterDisconnect: false,
        ...overrides,
      });
    const readyAll = (indices: number[]) => {
      for (const index of indices) supervisor.markReady(index);
    };
    const range = (from: number, toExclusive: number) =>
      Array.from({ length: toExclusive - from }, (_, i) => from + i);
    const advance = (ms: number) => {
      clock += ms;
    };
    const errorMessages = () => log.error.mock.calls.map(([message]) => String(message));

    return {
      supervisor, fork, log, onSchedulingStart, timers,
      clusterIdOf, restartTimers, deadlineTimer, fire, fireNewestRestart,
      exitOf, readyAll, range, advance, errorMessages,
    };
  }

  // #1
  it("quorumFor: 9/10 rounded up, never below 1", () => {
    expect(quorumFor(20)).toBe(18);
    expect(quorumFor(2)).toBe(2);
    expect(quorumFor(10)).toBe(9);
    expect(quorumFor(1)).toBe(1);
  });

  // #2
  it("backoffDelayMs: doubles from 1 s and stops at the 30 s ceiling", () => {
    expect([0, 1, 2, 3, 4, 5, 6].map(backoffDelayMs)).toEqual([
      1000, 2000, 4000, 8000, 16000, 30000, 30000,
    ]);
  });

  // #3 — defect #2: `0` is falsy; the lookup must be `=== undefined`.
  it("identifies and restarts worker index 0 instead of dropping it", () => {
    const h = harness(2);
    h.supervisor.start();
    h.readyAll([0, 1]);
    expect(h.fork).toHaveBeenCalledTimes(2);

    expect(h.log.info).toHaveBeenCalledWith("Started worker 0 (PID: 1000)", {
      workerIndex: 0, clusterId: 1, pid: 1000,
    });

    h.exitOf(0, { code: 1, signal: null });

    expect(h.errorMessages()).not.toContain("worker crashed could not find id");
    expect(h.supervisor.readyIndices()).toEqual([1]);
    expect(h.log.warn).toHaveBeenCalledWith(
      "Worker 0 (PID: 1000) died with code: 1 and signal: null",
      { workerIndex: 0, clusterId: 1, pid: 1000, code: 1, signal: null },
    );
    expect(h.restartTimers().map((t) => t.ms)).toEqual([1000]);

    h.fireNewestRestart();
    expect(h.fork).toHaveBeenCalledTimes(3);
    expect(h.fork).toHaveBeenLastCalledWith(0);
  });

  // #4
  it("logs the bookkeeping-bug branch with all four fields for an unknown clusterId", () => {
    const h = harness(2);
    h.supervisor.start();

    h.supervisor.handleExit({
      clusterId: 999, pid: 4242, code: null, signal: "SIGSEGV", exitedAfterDisconnect: false,
    });

    expect(h.log.error).toHaveBeenCalledTimes(1);
    expect(h.log.error).toHaveBeenCalledWith("worker crashed could not find id", {
      clusterId: 999, pid: 4242, code: null, signal: "SIGSEGV",
    });
    expect(h.restartTimers()).toHaveLength(0);
    expect(h.fork).toHaveBeenCalledTimes(2);
  });

  // #5
  it("removes a dead worker from the ready set and re-forks it under the same index", () => {
    const h = harness(20);
    h.supervisor.start();
    h.readyAll(h.range(0, 20));
    expect(h.supervisor.readyIndices()).toEqual(h.range(0, 20));

    h.exitOf(7);
    expect(h.supervisor.readyIndices()).toEqual(h.range(0, 20).filter((i) => i !== 7));

    h.fireNewestRestart();
    expect(h.fork).toHaveBeenLastCalledWith(7);
    expect(h.log.info).toHaveBeenCalledWith(
      "Restarted worker 7 (New PID: 1007)",
      { workerIndex: 7, clusterId: 21, pid: 1007 },
    );

    h.supervisor.markReady(7);
    expect(h.supervisor.readyIndices()).toEqual(h.range(0, 20));
    // The re-registered map entry is live: a second death of the new process is found.
    h.exitOf(7);
    expect(h.errorMessages()).not.toContain("worker crashed could not find id");
  });

  // #6 — defect #4: the interval installs exactly once, quorum-then-deadline included.
  it("starts scheduling exactly once across quorum, full strength, a restart, and the deadline", () => {
    const h = harness(20);
    h.supervisor.start();

    h.readyAll(h.range(0, 18));
    expect(h.onSchedulingStart).toHaveBeenCalledTimes(1);

    h.readyAll([18, 19]);
    expect(h.onSchedulingStart).toHaveBeenCalledTimes(1);

    h.exitOf(3);
    h.fireNewestRestart();
    h.supervisor.markReady(3);
    expect(h.onSchedulingStart).toHaveBeenCalledTimes(1);

    h.fire(h.deadlineTimer());
    expect(h.onSchedulingStart).toHaveBeenCalledTimes(1);
    expect(h.supervisor.schedulingStarted()).toBe(true);
  });

  // #7
  it("quorum at exactly 18 of 20 starts scheduling; 17 does not", () => {
    const h = harness(20);
    h.supervisor.start();

    h.readyAll(h.range(0, 17));
    expect(h.onSchedulingStart).not.toHaveBeenCalled();
    expect(h.supervisor.schedulingStarted()).toBe(false);

    h.supervisor.markReady(17);
    expect(h.onSchedulingStart).toHaveBeenCalledTimes(1);
    expect(h.log.info).toHaveBeenCalledWith(
      "Quorum reached (18/20, quorum 18), starting game scheduling; still waiting for workers [18, 19]",
      { readyCount: 18, numWorkers: 20, quorum: 18, missingWorkerIndices: [18, 19] },
    );
  });

  // #8
  it("the 90 s deadline starts scheduling below quorum and names every missing index", () => {
    const h = harness(20);
    h.supervisor.start();
    h.readyAll(h.range(0, 5));
    expect(h.onSchedulingStart).not.toHaveBeenCalled();

    const deadline = h.deadlineTimer();
    expect(deadline.ms).toBe(90_000);
    h.fire(deadline);

    expect(h.onSchedulingStart).toHaveBeenCalledTimes(1);
    expect(h.log.error).toHaveBeenCalledTimes(1);
    expect(h.log.error).toHaveBeenCalledWith(
      "90s readiness deadline: workers [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19] never reported ready (5/20)",
      { missingWorkerIndices: h.range(5, 20), readyCount: 5, numWorkers: 20 },
    );
  });

  // #9
  it("the deadline is silent on a healthy boot that reached full strength first", () => {
    const h = harness(20);
    h.supervisor.start();
    h.readyAll(h.range(0, 20));
    expect(h.onSchedulingStart).toHaveBeenCalledTimes(1);

    h.fire(h.deadlineTimer());

    expect(h.log.error).not.toHaveBeenCalled();
    expect(h.onSchedulingStart).toHaveBeenCalledTimes(1);
  });

  // #10
  it("scales to DevConfig's 2 workers: both ready starts, one ready plus the deadline starts", () => {
    const both = harness(2);
    both.supervisor.start();
    both.supervisor.markReady(0);
    expect(both.onSchedulingStart).not.toHaveBeenCalled();
    both.supervisor.markReady(1);
    expect(both.onSchedulingStart).toHaveBeenCalledTimes(1);
    expect(both.log.error).not.toHaveBeenCalled();

    const one = harness(2);
    one.supervisor.start();
    one.supervisor.markReady(1);
    one.fire(one.deadlineTimer());
    expect(one.onSchedulingStart).toHaveBeenCalledTimes(1);
    expect(one.log.error).toHaveBeenCalledWith(
      "90s readiness deadline: workers [0] never reported ready (1/2)",
      { missingWorkerIndices: [0], readyCount: 1, numWorkers: 2 },
    );
    // Deadline-then-quorum: the late worker reaching quorum must not start it again.
    one.supervisor.markReady(0);
    expect(one.onSchedulingStart).toHaveBeenCalledTimes(1);
    expect(one.log.info).toHaveBeenCalledWith("All workers ready", {
      readyCount: 2, numWorkers: 2,
    });
  });

  // #11
  it("reports missing workers by index, in the message and in the meta", () => {
    const h = harness(20);
    h.supervisor.start();
    h.readyAll(h.range(0, 20).filter((i) => i !== 2 && i !== 7));
    expect(h.supervisor.missingIndices()).toEqual([2, 7]);

    h.fire(h.deadlineTimer());

    const [message, meta] = h.log.error.mock.calls[0];
    expect(String(message)).toContain("[2, 7]");
    expect(meta).toMatchObject({ missingWorkerIndices: [2, 7] });
  });

  // #12 — the fork-loop guard.
  it("gives up on an index after 5 restarts in the window: no timer, no fork, an error", () => {
    const h = harness(20);
    h.supervisor.start();
    h.readyAll(h.range(0, 20));

    for (let death = 1; death <= 5; death++) {
      h.exitOf(4);
      expect(h.restartTimers()).toHaveLength(death);
      h.fireNewestRestart();
      h.supervisor.markReady(4);
      h.advance(10_000);
    }
    expect(h.restartTimers().map((t) => t.ms)).toEqual([1000, 2000, 4000, 8000, 16000]);
    expect(h.fork).toHaveBeenCalledTimes(25);
    expect(h.log.error).not.toHaveBeenCalled();

    h.exitOf(4); // 6th death, at clock 50 s: inside the 10-min window

    expect(h.restartTimers()).toHaveLength(5);
    expect(h.fork).toHaveBeenCalledTimes(25);
    expect(h.supervisor.abandonedIndices()).toEqual([4]);
    expect(h.supervisor.readyIndices()).not.toContain(4);
    expect(h.log.error).toHaveBeenCalledTimes(1);
    expect(h.log.error).toHaveBeenCalledWith(
      "Worker 4 died again after 5 restarts in the last 10 minutes; giving up on this index (code: null, signal: SIGKILL)",
      { workerIndex: 4, restartsInWindow: 5, windowMs: 600_000, code: null, signal: "SIGKILL" },
    );
  });

  // #13
  it("backoff grows 1, 2, 4, 8, 16 s across one index's restarts in a window", () => {
    const h = harness(2);
    h.supervisor.start();
    const delays: number[] = [];
    for (let death = 1; death <= 5; death++) {
      h.exitOf(1);
      const newest = h.restartTimers()[h.restartTimers().length - 1];
      delays.push(newest.ms);
      h.fireNewestRestart();
      h.advance(newest.ms);
    }
    expect(delays).toEqual([1000, 2000, 4000, 8000, 16000]);
    expect(h.log.info).toHaveBeenCalledWith(
      "Restarting worker 1 in 16000 ms (restart 5/5 in window)",
      { workerIndex: 1, delayMs: 16000, restartsInWindow: 5, windowMs: 600_000 },
    );
  });

  // #14
  it("counts the window per index: worker 3's restarts do not touch worker 7", () => {
    const h = harness(20);
    h.supervisor.start();
    for (let death = 1; death <= 5; death++) {
      h.exitOf(3);
      h.fireNewestRestart();
      h.advance(1000);
    }
    expect(h.restartTimers()).toHaveLength(5);

    h.exitOf(7);

    expect(h.restartTimers()).toHaveLength(6);
    expect(h.restartTimers()[5].ms).toBe(1000);
    expect(h.supervisor.abandonedIndices()).toEqual([]);
    expect(h.log.error).not.toHaveBeenCalled();
  });

  // #15
  it("the window rolls: spread-out deaths stay restartable, and a pruned window resets the backoff", () => {
    const spread = harness(20);
    spread.supervisor.start();
    for (let death = 1; death <= 5; death++) {
      spread.exitOf(9);
      spread.fireNewestRestart();
      spread.advance(7.5 * 60_000);
    }
    expect(spread.restartTimers()).toHaveLength(5);
    expect(spread.supervisor.abandonedIndices()).toEqual([]);
    expect(spread.log.error).not.toHaveBeenCalled();

    const burst = harness(20);
    burst.supervisor.start();
    for (let death = 1; death <= 5; death++) {
      burst.exitOf(9);
      burst.fireNewestRestart();
      burst.advance(10_000);
    }
    burst.advance(11 * 60_000 - 5 * 10_000);
    burst.exitOf(9); // 6th death at 11 min: the first five are outside the window

    expect(burst.restartTimers()).toHaveLength(6);
    expect(burst.restartTimers()[5].ms).toBe(1000);
    expect(burst.supervisor.abandonedIndices()).toEqual([]);
    expect(burst.log.error).not.toHaveBeenCalled();
  });

  // #16
  it("does not restart a worker that exited after disconnect, and does not log an error", () => {
    const h = harness(2);
    h.supervisor.start();
    h.readyAll([0, 1]);

    h.exitOf(1, { code: 0, signal: null, exitedAfterDisconnect: true });

    expect(h.supervisor.readyIndices()).toEqual([0]);
    expect(h.restartTimers()).toHaveLength(0);
    expect(h.fork).toHaveBeenCalledTimes(2);
    expect(h.log.error).not.toHaveBeenCalled();
  });

  // #17 — the SYNCHRONOUS throw (e.g. EPERM from a uid/gid option, invalid arguments).
  // EAGAIN & co. do not take this path on Node v24 — see #19.
  it("a fork that throws synchronously on restart is logged, retried with backoff, and counts toward the cap", () => {
    const h = harness(2);
    h.supervisor.start();
    h.exitOf(1);
    expect(h.restartTimers().map((t) => t.ms)).toEqual([1000]);

    h.fork.mockImplementationOnce(() => {
      throw new Error("spawn EPERM");
    });
    h.fireNewestRestart();

    expect(h.log.error).toHaveBeenCalledWith("Failed to fork worker 1: spawn EPERM", {
      workerIndex: 1,
      reason: "restart",
    });
    expect(h.restartTimers().map((t) => t.ms)).toEqual([1000, 2000]);

    h.fireNewestRestart();
    expect(h.fork).toHaveBeenCalledTimes(4);
    // The successful retry re-registered the map entry.
    h.exitOf(1);
    expect(h.errorMessages()).not.toContain("worker crashed could not find id");
    expect(h.restartTimers().map((t) => t.ms)).toEqual([1000, 2000, 4000]);
  });

  // #18 — the Master.ts seam. startMaster() is never called here, so nothing is forked.
  it("Master.ts exports the live supervisor with an empty ready set before startMaster()", () => {
    expect(workerSupervisor).toBeInstanceOf(WorkerSupervisor);
    expect(workerSupervisor.readyIndices()).toEqual([]);
    expect(workerSupervisor.schedulingStarted()).toBe(false);
  });

  // #19 (review R1) — the ASYNCHRONOUS spawn failure: EAGAIN / EMFILE / ENFILE / EACCES /
  // ENOENT arrive as a Worker 'error' event with no 'exit' and no pid (verified on Node
  // v24.13.0). Master.ts routes it here as handleExit({ spawnError }); it must count
  // against the same cap and end in `giving up`, never in silence.
  it("an async spawn failure is a death of the index: restarted with backoff, then given up", () => {
    const h = harness(2);
    h.supervisor.start();
    h.readyAll([0, 1]);
    const spawnFailure = (index: number) =>
      h.supervisor.handleExit({
        clusterId: h.clusterIdOf(index),
        pid: undefined,
        code: null,
        signal: null,
        exitedAfterDisconnect: false,
        spawnError: "spawn node EAGAIN",
      });

    spawnFailure(1);
    expect(h.supervisor.readyIndices()).toEqual([0]);
    expect(h.log.error).toHaveBeenCalledWith("Worker 1 failed to spawn: spawn node EAGAIN", {
      workerIndex: 1, clusterId: 2, pid: undefined, spawnError: "spawn node EAGAIN",
    });
    expect(h.log.warn).not.toHaveBeenCalled();
    expect(h.restartTimers().map((t) => t.ms)).toEqual([1000]);

    // Every restart fails the same way: 5 restarts, then the cap.
    for (let attempt = 1; attempt <= 5; attempt++) {
      h.fireNewestRestart();
      if (attempt < 5) spawnFailure(1);
    }
    expect(h.restartTimers().map((t) => t.ms)).toEqual([1000, 2000, 4000, 8000, 16000]);
    expect(h.fork).toHaveBeenCalledTimes(7);

    spawnFailure(1); // 6th failure inside the window
    expect(h.restartTimers()).toHaveLength(5);
    expect(h.fork).toHaveBeenCalledTimes(7);
    expect(h.supervisor.abandonedIndices()).toEqual([1]);
    expect(h.errorMessages()).toContain(
      "Worker 1 died again after 5 restarts in the last 10 minutes; giving up on this index (code: null, signal: null)",
    );
  });

  // #20 (review R2) — WORKER_READY is cross-checked against the sending cluster worker.
  it("ignores a WORKER_READY from a stale or mismatched cluster worker", () => {
    const h = harness(2);
    h.supervisor.start();
    const staleClusterId = h.clusterIdOf(1);
    h.exitOf(1);
    h.fireNewestRestart();
    const liveClusterId = h.clusterIdOf(1);
    expect(liveClusterId).not.toBe(staleClusterId);

    h.supervisor.markReady(1, staleClusterId); // drained from the dead process's channel
    expect(h.supervisor.readyIndices()).toEqual([]);
    expect(h.log.warn).toHaveBeenLastCalledWith(
      `Ignoring WORKER_READY for worker 1 from cluster worker ${staleClusterId}: not the live process for that index`,
      { workerIndex: 1, clusterId: staleClusterId },
    );

    h.supervisor.markReady(7, liveClusterId); // payload is not the sender's index
    expect(h.supervisor.readyIndices()).toEqual([]);

    h.supervisor.markReady(1, liveClusterId);
    expect(h.supervisor.readyIndices()).toEqual([1]);
    expect(h.log.info).toHaveBeenCalledWith("Worker 1 is ready. (1/2 ready)", {
      workerIndex: 1, readyCount: 1, numWorkers: 2,
    });
  });
});

// 0192 / ADR-109: public games are placed onto ready workers by moving the ID (the
// Worker.ts generateGameIdForWorker pattern), and the create call is bounded. pickGameID
// is pure; schedulePublicGame takes injected deps (ready set + draw), so no worker is
// forked and undici's fetch is the shared mock above. Fake timers are installed in this
// describe's own beforeEach, as 0193's are. See
// ai-agents/tasks/backlog/0192-schedule-public-games-onto-ready-workers-with-bounded-create/plan.md
describe("0192 ready-worker placement + bounded create", () => {
  const fetchMock = fetch as unknown as jest.Mock;
  const log = logger.child({ comp: "m" }) as unknown as {
    error: jest.Mock;
    info: jest.Mock;
    warn: jest.Mock;
  };
  // Master.ts only reads playlist.gameConfig() for the POST body. The real MapPlaylist
  // shuffles maps at random and logs on the shared child (`Generated map playlist` /
  // `Failed to generate a valid map playlist`), which would make the log assertions
  // below order-dependent; a fixed body keeps them deterministic.
  const playlist = {
    gameConfig: () => ({ gameMap: "stub", maxPlayers: 8 }),
  } as unknown as MapPlaylist;
  // Under Jest GAME_ENV is unset, so Master.ts runs on DevServerConfig: 2 workers,
  // ports 3001/3002, admin header x-admin-key.
  const devConfig = new DevServerConfig();

  // Mirrors DefaultConfig.workerIndex (simpleHash(id) % numWorkers); parity is pinned
  // against the real config once, in #1b, so a hash change cannot leave this green.
  const workerIndexAt = (numWorkers: number) => (gameID: string) =>
    simpleHash(gameID) % numWorkers;

  // Deterministic fixture: a real ID that hashes to index k of n.
  function idOnIndex(numWorkers: number, index: number): string {
    for (let attempt = 0; attempt < 100_000; attempt++) {
      const gameID = generateID();
      if (workerIndexAt(numWorkers)(gameID) === index) return gameID;
    }
    throw new Error(`no ID on index ${index} of ${numWorkers} in 100k draws`);
  }

  // A draw stub that returns the given IDs in order, cycling, and counts its calls.
  function cyclingDraw(ids: string[]) {
    let next = 0;
    return jest.fn((): string => ids[next++ % ids.length]);
  }

  const range = (from: number, toExclusive: number) =>
    Array.from({ length: toExclusive - from }, (_, i) => from + i);

  type FetchInit = { method: string; headers: Record<string, string>; signal: AbortSignal };
  type FetchBehaviour = (url: string, init: FetchInit) => Promise<unknown>;

  const created: FetchBehaviour = async () => ({ ok: true, statusText: "OK" });

  // Same rule as 0193's describe: a fixture promise that can outlive its test is
  // settled by afterEach so no rejection or pending fetch leaks into a later test.
  const settleStragglers: Array<() => void> = [];
  const abortsOnSignal: FetchBehaviour = (_url, init) =>
    new Promise((resolve, reject) => {
      settleStragglers.push(() => resolve({ ok: true, statusText: "OK" }));
      init.signal.addEventListener("abort", () =>
        reject(Object.assign(new Error("This operation was aborted"), { name: "AbortError" })),
      );
    });

  const deps = (overrides: Partial<ScheduleDeps>): ScheduleDeps => ({
    readyIndices: () => [0, 1],
    draw: generateID,
    ...overrides,
  });

  const createdURLs = () => fetchMock.mock.calls.map(([url]: [string]) => url);
  const messages = (mock: jest.Mock) => mock.mock.calls.map(([message]) => String(message));
  // R1 (review round 1): the create-failure line carries a single-object meta with no
  // null fields (Uptrace drops nulls), alongside the byte-identical grep text.
  const createFailureMeta = (gameID: string) => ({
    gameID,
    workerIndex: devConfig.workerIndex(gameID),
    workerPath: devConfig.workerPath(gameID),
    timeoutMs: CREATE_GAME_TIMEOUT_MS,
  });

  beforeEach(() => {
    jest.useFakeTimers();
    fetchMock.mockReset();
    log.error.mockClear();
    log.info.mockClear();
    log.warn.mockClear();
  });

  // Module state persists across tests: publicLobbyIDs and the once-per-episode
  // "no ready workers" flag. The reset schedule below is a healthy create against a
  // ready index, which closes any open empty-ready episode (logging the resume line, if
  // one was open) so the flag is false for the next test regardless of order. Then the
  // abort timer must be gone: a create that leaks its 5 s timer fails here, by name.
  afterEach(async () => {
    for (const settle of settleStragglers.splice(0)) settle();
    fetchMock.mockImplementation(created);
    await schedulePublicGame(playlist, deps({ readyIndices: () => [0] }));
    expect(jest.getTimerCount()).toBe(0);
    jest.useRealTimers();
    publicLobbyIDs.clear();
    fetchMock.mockReset();
  });

  // #1 — brief bullet 1, at prod's 20 workers.
  it("never picks an excluded index: 2 of 20 excluded, 2000 real draws", () => {
    const ready = new Set(range(0, 20).filter((i) => i !== 3 && i !== 17));
    const workerIndexOf = workerIndexAt(20);

    for (let draw = 0; draw < 2000; draw++) {
      const pick = pickGameID(ready, workerIndexOf, generateID);
      expect(pick).not.toBeNull();
      expect(ready.has(workerIndexOf(pick!.gameID))).toBe(true);
      expect(pick!.onReadyIndex).toBe(true);
      expect(pick!.attempts).toBeLessThanOrEqual(40);
    }
  });

  // #1b — the test-side hash mirrors the real config's workerIndex.
  it("workerIndexAt mirrors DefaultConfig.workerIndex at 2 workers", () => {
    expect(devConfig.numWorkers()).toBe(2);
    for (let draw = 0; draw < 200; draw++) {
      const gameID = generateID();
      expect(workerIndexAt(2)(gameID)).toBe(devConfig.workerIndex(gameID));
    }
  });

  // #2 — brief bullet 2: with every index ready the filter is a no-op.
  it("returns the first draw when every index is ready, at 20 and at 2 workers", () => {
    for (const n of [20, 2]) {
      const first = generateID();
      const draw = cyclingDraw([first, generateID(), generateID()]);
      const pick = pickGameID(new Set(range(0, n)), workerIndexAt(n), draw);

      expect(pick).toEqual({ gameID: first, attempts: 1, onReadyIndex: true });
      expect(draw).toHaveBeenCalledTimes(1);
    }
  });

  // #3 — D1: cap exhausted → the last, unfiltered draw, flagged.
  it("falls back to the last unfiltered draw after maxAttempts", () => {
    const stuck = idOnIndex(20, 1);
    const draw = cyclingDraw([stuck]);

    const pick = pickGameID(new Set([0]), workerIndexAt(20), draw, 7);

    expect(pick).toEqual({ gameID: stuck, attempts: 7, onReadyIndex: false });
    expect(draw).toHaveBeenCalledTimes(7);
  });

  // #4 — D2: nothing ready → null, and no draw is spent.
  it("returns null without drawing when the ready set is empty", () => {
    const draw = cyclingDraw([generateID()]);

    expect(pickGameID(new Set(), workerIndexAt(20), draw)).toBeNull();
    expect(draw).not.toHaveBeenCalled();
  });

  // #5 — brief bullet 4: DevConfig's 2 workers with one excluded; the prod cap value.
  it("scales to 2 workers with one excluded: 500 real draws all land on index 0", () => {
    const ready = new Set([0]);
    const workerIndexOf = workerIndexAt(2);

    for (let draw = 0; draw < 500; draw++) {
      const pick = pickGameID(ready, workerIndexOf, generateID);
      expect(workerIndexOf(pick!.gameID)).toBe(0);
      expect(pick!.onReadyIndex).toBe(true);
    }
    expect(PICK_GAME_ID_MAX_ATTEMPTS).toBe(1000);
  });

  // #6 — brief bullet 6: through 0056's supervisor, an index that dies leaves the ready
  // set and one that reports ready again rejoins it, with no further action.
  it("an index marked dead then ready again is eligible again (via WorkerSupervisor)", () => {
    const timers: Array<() => void> = [];
    let nextClusterId = 1;
    const supervisor = new WorkerSupervisor({
      numWorkers: 2,
      fork: (index) => ({ clusterId: nextClusterId++, pid: 1000 + index }),
      setTimer: (fn) => {
        timers.push(fn);
      },
      now: () => 0,
      log: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
      onSchedulingStart: jest.fn(),
    });
    supervisor.start();
    supervisor.markReady(0);
    supervisor.markReady(1);
    const onIndex1 = idOnIndex(2, 1);
    const onIndex0 = idOnIndex(2, 0);
    const readySet = () => new Set(supervisor.readyIndices());

    // clusterId 2 is worker 1's first fork (start() forks 0 then 1).
    supervisor.handleExit({ clusterId: 2, pid: 1001, code: null, signal: "SIGKILL", exitedAfterDisconnect: false });
    expect(supervisor.readyIndices()).toEqual([0]);
    expect(pickGameID(readySet(), workerIndexAt(2), cyclingDraw([onIndex1, onIndex0]))).toEqual({
      gameID: onIndex0, attempts: 2, onReadyIndex: true,
    });

    const restart = timers.pop();
    expect(restart).toBeDefined();
    restart!(); // the re-fork
    supervisor.markReady(1);
    expect(supervisor.readyIndices()).toEqual([0, 1]);
    expect(pickGameID(readySet(), workerIndexAt(2), cyclingDraw([onIndex1, onIndex0]))).toEqual({
      gameID: onIndex1, attempts: 1, onReadyIndex: true,
    });
  });

  // #7 — D2 through schedulePublicGame: skip the tick, error once per episode, info on
  // resume.
  it("skips the tick on an empty ready set, logging once per episode and once on resume", async () => {
    fetchMock.mockImplementation(created);
    const empty = deps({ readyIndices: () => [] });

    await schedulePublicGame(playlist, empty);
    await schedulePublicGame(playlist, empty);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(publicLobbyIDs.size).toBe(0);
    expect(log.error).toHaveBeenCalledTimes(1);
    expect(messages(log.error)[0]).toBe(
      "No ready workers (0/2); skipping public game scheduling until a worker reports ready",
    );
    expect(log.error.mock.calls[0][1]).toEqual({ readyCount: 0, numWorkers: 2 });
    expect(log.info).not.toHaveBeenCalled();

    await schedulePublicGame(playlist, deps({ readyIndices: () => [0] }));
    await schedulePublicGame(playlist, deps({ readyIndices: () => [0] }));

    expect(log.info).toHaveBeenCalledTimes(1);
    expect(messages(log.info)[0]).toBe(
      "Ready workers available again ([0]); public game scheduling resumed",
    );
    expect(log.info.mock.calls[0][1]).toEqual({
      readyWorkerIndices: [0], readyCount: 1, numWorkers: 2,
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(publicLobbyIDs.size).toBe(2);
    expect(log.error).toHaveBeenCalledTimes(1);
  });

  // #8 — the live seam: with no deps, the scheduler reads Master.ts's exported
  // supervisor, whose ready set is empty before startMaster().
  it("uses the live supervisor's ready set by default (empty before startMaster)", async () => {
    expect(workerSupervisor.readyIndices()).toEqual([]);
    fetchMock.mockImplementation(created);

    await schedulePublicGame(playlist);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(publicLobbyIDs.size).toBe(0);
    expect(messages(log.error)).toEqual([
      "No ready workers (0/2); skipping public game scheduling until a worker reports ready",
    ]);
  });

  // #9 — D1 through schedulePublicGame: the cap-exhausted fallback still schedules, on
  // the unfiltered index, with a warn.
  it("schedules the unfiltered fallback ID with a warn when the cap is exhausted", async () => {
    const onIndex1 = idOnIndex(2, 1);
    fetchMock.mockImplementation(created);

    await schedulePublicGame(
      playlist,
      deps({ readyIndices: () => [0], draw: cyclingDraw([onIndex1]), maxAttempts: 3 }),
    );

    expect(log.warn).toHaveBeenCalledTimes(1);
    expect(messages(log.warn)[0]).toBe(
      `Public game ID draw hit no ready worker in 3 attempts (ready: [0]); scheduling ${onIndex1} unfiltered on worker w1`,
    );
    expect(log.warn.mock.calls[0][1]).toEqual({
      attempts: 3, readyWorkerIndices: [0], workerIndex: 1, gameID: onIndex1,
    });
    expect(createdURLs()).toEqual([`http://localhost:3002/api/create_game/${onIndex1}`]);
    expect(publicLobbyIDs.has(onIndex1)).toBe(true);
    expect(log.error).not.toHaveBeenCalled();
  });

  // #10 — the healthy create: right worker, abort signal wired, admin header, ID kept,
  // timer cleared.
  it("creates on the ID's own worker with an abort signal and keeps the ID", async () => {
    fetchMock.mockImplementation(created);

    await schedulePublicGame(playlist, deps({}));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, FetchInit];
    const gameID = url.split("/").pop() ?? "";
    expect(url).toBe(
      `http://localhost:${3001 + devConfig.workerIndex(gameID)}/api/create_game/${gameID}`,
    );
    expect(init.method).toBe("POST");
    expect(init.headers[devConfig.adminHeader()]).toBe(devConfig.adminToken());
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(init.signal.aborted).toBe(false);
    expect(publicLobbyIDs.has(gameID)).toBe(true);
    expect(log.error).not.toHaveBeenCalled();
    expect(log.warn).not.toHaveBeenCalled();
    expect(log.info).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
  });

  // #11 — brief bullet 5: the create aborts at CREATE_GAME_TIMEOUT_MS instead of hanging.
  it("aborts a hung create at 5 s, logs it, and drops the ID", async () => {
    fetchMock.mockImplementation(abortsOnSignal);
    let settled = false;

    const scheduled = schedulePublicGame(playlist, deps({}));
    const outcome = scheduled.then(
      () => "resolved",
      (error: unknown) => error,
    );
    void outcome.then(() => {
      settled = true;
    });
    const gameID = (fetchMock.mock.calls[0][0] as string).split("/").pop() ?? "";
    expect(publicLobbyIDs.has(gameID)).toBe(true);
    expect(jest.getTimerCount()).toBe(1);

    await jest.advanceTimersByTimeAsync(CREATE_GAME_TIMEOUT_MS - 1);
    expect(settled).toBe(false);
    expect(publicLobbyIDs.has(gameID)).toBe(true);

    await jest.advanceTimersByTimeAsync(1);
    const error = await outcome;
    expect(settled).toBe(true);
    expect(error).toMatchObject({ name: "AbortError" });
    expect(publicLobbyIDs.has(gameID)).toBe(false);
    expect(messages(log.error)).toEqual([
      `Failed to schedule public game on worker ${devConfig.workerPath(gameID)}: AbortError: This operation was aborted`,
    ]);
    expect(log.error.mock.calls[0][1]).toEqual(createFailureMeta(gameID));
    expect(jest.getTimerCount()).toBe(0);
  });

  // #12 — D3: a fast failure (dead port, or a non-2xx such as the worker's 429) drops
  // the ID at once and still rethrows, so scheduleLobbies logs its own line.
  it("drops the ID and rethrows on a fast failure: rejected fetch, then a non-ok response", async () => {
    fetchMock.mockImplementation(async () => {
      throw new TypeError("fetch failed");
    });

    await expect(schedulePublicGame(playlist, deps({}))).rejects.toThrow("fetch failed");

    const rejectedID = (fetchMock.mock.calls[0][0] as string).split("/").pop() ?? "";
    expect(publicLobbyIDs.has(rejectedID)).toBe(false);
    expect(messages(log.error)).toEqual([
      `Failed to schedule public game on worker ${devConfig.workerPath(rejectedID)}: TypeError: fetch failed`,
    ]);
    expect(log.error.mock.calls[0][1]).toEqual(createFailureMeta(rejectedID));
    expect(jest.getTimerCount()).toBe(0);

    fetchMock.mockImplementation(async () => ({ ok: false, statusText: "Too Many Requests" }));

    await expect(schedulePublicGame(playlist, deps({}))).rejects.toThrow(
      "Failed to schedule public game: Too Many Requests",
    );

    const limitedID = (fetchMock.mock.calls[1][0] as string).split("/").pop() ?? "";
    expect(publicLobbyIDs.has(limitedID)).toBe(false);
    expect(publicLobbyIDs.size).toBe(0);
    expect(messages(log.error)[1]).toBe(
      `Failed to schedule public game on worker ${devConfig.workerPath(limitedID)}: Error: Failed to schedule public game: Too Many Requests`,
    );
    expect(log.error.mock.calls[1][1]).toEqual(createFailureMeta(limitedID));
    expect(jest.getTimerCount()).toBe(0);
  });

  // #13 — D3's value, and the ceiling: the lobby poll aborts at a literal 5000 in
  // fetchLobbies() (Master.ts, `setTimeout(() => controller.abort(), 5000)`); a create
  // timeout above it could only ever produce orphans.
  it("CREATE_GAME_TIMEOUT_MS is 5 s and no longer than the lobby poll's abort", () => {
    expect(CREATE_GAME_TIMEOUT_MS).toBe(5_000);
    expect(CREATE_GAME_TIMEOUT_MS).toBeLessThanOrEqual(5000);
  });
});
