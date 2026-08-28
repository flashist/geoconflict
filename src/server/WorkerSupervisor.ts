// Worker readiness, crash recovery and the scheduling gate, as a pure unit.
//
// Deliberately imports nothing from `cluster`, `express` or `./Logger`: every side
// effect (forking, timers, the clock, logging, starting the scheduler) is injected, so
// the whole policy is unit-testable without forking a process. Master.ts builds the one
// live instance and delegates its cluster event handlers to it. 0192 reads
// `readyIndices()` from that instance to place games onto live workers.
//
// Owner rulings this file implements (0056 brief, decisions (a) and (b), 2026-08-22):
//   - scheduling starts at a quorum of 18 of 20 ready workers, or 90 s after start,
//     whichever comes first — expressed as a ratio so DevConfig's 2 workers still boot;
//   - a dead worker is re-forked with exponential backoff 1 s → 30 s, at most 5 restarts
//     per worker index per rolling 10-minute window, then the index is given up on and
//     an error is logged.
// Background: ai-agents/knowledge-base/incidents/2026-08-22-prod-public-lobbies-empty-outage.md

export const READY_QUORUM_NUMERATOR = 9;
export const READY_QUORUM_DENOMINATOR = 10;
export const READY_DEADLINE_MS = 90_000;
export const RESTART_CAP = 5;
export const RESTART_WINDOW_MS = 10 * 60_000;
export const BACKOFF_BASE_MS = 1_000;
export const BACKOFF_CEILING_MS = 30_000;

// 20 → 18, 10 → 9, 2 → 2, 1 → 1. Integer arithmetic on purpose: `0.9 * n` is a float.
export function quorumFor(numWorkers: number): number {
  return Math.max(
    1,
    Math.ceil((numWorkers * READY_QUORUM_NUMERATOR) / READY_QUORUM_DENOMINATOR),
  );
}

// k = restarts of this index already issued in the current window: 1 s, 2 s, 4 s, 8 s,
// 16 s, then the 30 s ceiling. With RESTART_CAP = 5 the ceiling is never reached live
// inside one window (the 6th death gives up instead); it is still enforced here.
export function backoffDelayMs(priorRestartsInWindow: number): number {
  return Math.min(BACKOFF_CEILING_MS, BACKOFF_BASE_MS * 2 ** priorRestartsInWindow);
}

export interface ForkedWorker {
  clusterId: number;
  pid: number | undefined;
}

export interface WorkerExit {
  clusterId: number;
  pid: number | undefined;
  code: number | null;
  signal: string | null;
  exitedAfterDisconnect: boolean;
  // Set when the process never started: Node reports EAGAIN / EMFILE / ENFILE / EACCES /
  // ENOENT from spawn asynchronously as an 'error' event with no 'exit' (verified on
  // v24.13.0). Master.ts routes that event here so it counts as a death of the index.
  spawnError?: string;
}

export interface SupervisorLog {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

export interface WorkerSupervisorDeps {
  numWorkers: number;
  fork(index: number): ForkedWorker;
  setTimer(fn: () => void, ms: number): void;
  now(): number;
  log: SupervisorLog;
  onSchedulingStart(): void;
}

export class WorkerSupervisor {
  // cluster worker.id → WORKER_ID index. Populated at fork time and on every restart;
  // the exit handler reads it instead of `worker.process.env`, which does not exist.
  private readonly indexByClusterId = new Map<number, number>();
  private readonly ready = new Set<number>();
  // Per index, the times (deps.now()) at which a restart was issued. Pruned to the
  // rolling window on every death.
  private readonly restartsByIndex = new Map<number, number[]>();
  private readonly abandoned = new Set<number>();
  // The `schedulingStarted` flag: onSchedulingStart() runs exactly once.
  private started = false;

  constructor(private readonly deps: WorkerSupervisorDeps) {}

  start(): void {
    for (let index = 0; index < this.deps.numWorkers; index++) {
      this.forkIndex(index, "start");
    }
    this.deps.setTimer(() => this.deadline(), READY_DEADLINE_MS);
  }

  // `clusterId`, when given, is the sender: a WORKER_READY drained from the IPC channel
  // after that process's exit (or carrying a payload that is not its own index) must not
  // re-add a dead index for the length of a backoff.
  markReady(index: number, clusterId?: number): void {
    const n = this.deps.numWorkers;
    if (
      clusterId !== undefined &&
      this.indexByClusterId.get(clusterId) !== index
    ) {
      this.deps.log.warn(
        `Ignoring WORKER_READY for worker ${index} from cluster worker ${clusterId}: not the live process for that index`,
        { workerIndex: index, clusterId },
      );
      return;
    }
    this.ready.add(index);
    this.deps.log.info(
      `Worker ${index} is ready. (${this.ready.size}/${n} ready)`,
      { workerIndex: index, readyCount: this.ready.size, numWorkers: n },
    );
    if (this.ready.size === n) {
      this.deps.log.info("All workers ready", {
        readyCount: this.ready.size,
        numWorkers: n,
      });
    }
    this.maybeStart();
  }

  handleExit(exit: WorkerExit): void {
    const { clusterId, pid, code, signal, exitedAfterDisconnect, spawnError } =
      exit;
    const index = this.indexByClusterId.get(clusterId);
    this.indexByClusterId.delete(clusterId);

    // Strict `=== undefined`: index 0 is a valid worker. Reaching this branch now means
    // a bookkeeping bug, not the normal path. Message text unchanged for log greps.
    if (index === undefined) {
      this.deps.log.error(`worker crashed could not find id`, {
        clusterId,
        pid,
        code,
        signal,
      });
      return;
    }

    this.ready.delete(index);

    if (spawnError !== undefined) {
      // No process ever ran, so nothing else will report this index: same cap, same
      // backoff, so a persistent resource failure ends in `giving up`, not silence.
      this.deps.log.error(
        `Worker ${index} failed to spawn: ${spawnError}`,
        { workerIndex: index, clusterId, pid, spawnError },
      );
      this.scheduleRestart(index, null, null);
      return;
    }

    this.deps.log.warn(
      `Worker ${index} (PID: ${pid}) died with code: ${code} and signal: ${signal}`,
      { workerIndex: index, clusterId, pid, code, signal },
    );

    if (exitedAfterDisconnect) {
      // Nothing calls worker.disconnect() today; defensive, the idiomatic cluster check.
      this.deps.log.info(
        `Worker ${index} (PID: ${pid}) exited after disconnect; not restarting`,
        { workerIndex: index, clusterId, pid, code, signal },
      );
      return;
    }

    this.scheduleRestart(index, code, signal);
  }

  // Fired by the timer armed in start(). Names, at error level, every index that never
  // reported ready; starts scheduling if the quorum never did.
  deadline(): void {
    const missing = this.missingIndices();
    const n = this.deps.numWorkers;
    if (missing.length > 0) {
      this.deps.log.error(
        `${READY_DEADLINE_MS / 1000}s readiness deadline: workers [${missing.join(", ")}] never reported ready (${this.ready.size}/${n})`,
        {
          missingWorkerIndices: missing,
          readyCount: this.ready.size,
          numWorkers: n,
        },
      );
    }
    if (!this.started) {
      this.started = true;
      this.deps.log.info(
        `Readiness deadline reached (${this.ready.size}/${n} ready), starting game scheduling`,
        { readyCount: this.ready.size, numWorkers: n },
      );
      this.deps.onSchedulingStart();
    }
  }

  readyIndices(): number[] {
    return [...this.ready].sort((a, b) => a - b);
  }

  missingIndices(): number[] {
    const missing: number[] = [];
    for (let index = 0; index < this.deps.numWorkers; index++) {
      if (!this.ready.has(index)) missing.push(index);
    }
    return missing;
  }

  abandonedIndices(): number[] {
    return [...this.abandoned].sort((a, b) => a - b);
  }

  schedulingStarted(): boolean {
    return this.started;
  }

  private maybeStart(): void {
    if (this.started) return;
    const n = this.deps.numWorkers;
    const quorum = quorumFor(n);
    if (this.ready.size < quorum) return;

    this.started = true;
    const missing = this.missingIndices();
    // Missing indices at quorum time are info, not error: every healthy 20-worker boot
    // passes through 18/20 with two workers still booting. The 90 s deadline is the
    // error-level audit of whoever is still missing.
    this.deps.log.info(
      `Quorum reached (${this.ready.size}/${n}, quorum ${quorum}), starting game scheduling` +
        (missing.length > 0
          ? `; still waiting for workers [${missing.join(", ")}]`
          : ""),
      {
        readyCount: this.ready.size,
        numWorkers: n,
        quorum,
        missingWorkerIndices: missing,
      },
    );
    this.deps.onSchedulingStart();
  }

  private forkIndex(index: number, reason: "start" | "restart"): void {
    let forked: ForkedWorker;
    try {
      forked = this.deps.fork(index);
    } catch (error) {
      // Synchronous throws only (e.g. EPERM from a uid/gid option, invalid arguments).
      // EAGAIN / EMFILE / ENFILE / EACCES / ENOENT do NOT throw — they arrive later as
      // `handleExit` with `spawnError`. Both are counted against the same cap so a
      // failing fork can neither silently lose the index nor loop.
      const message = error instanceof Error ? error.message : String(error);
      this.deps.log.error(
        `Failed to fork worker ${index}: ${message}`,
        { workerIndex: index, reason },
      );
      this.scheduleRestart(index, null, null);
      return;
    }
    this.indexByClusterId.set(forked.clusterId, index);
    if (reason === "start") {
      this.deps.log.info(`Started worker ${index} (PID: ${forked.pid})`, {
        workerIndex: index,
        clusterId: forked.clusterId,
        pid: forked.pid,
      });
    } else {
      this.deps.log.info(
        `Restarted worker ${index} (New PID: ${forked.pid})`,
        { workerIndex: index, clusterId: forked.clusterId, pid: forked.pid },
      );
    }
  }

  private scheduleRestart(
    index: number,
    code: number | null,
    signal: string | null,
  ): void {
    const now = this.deps.now();
    const windowStart = now - RESTART_WINDOW_MS;
    const restarts = (this.restartsByIndex.get(index) ?? []).filter(
      (issuedAt) => issuedAt > windowStart,
    );
    this.restartsByIndex.set(index, restarts);
    const priorRestartsInWindow = restarts.length;

    if (priorRestartsInWindow >= RESTART_CAP) {
      // The fork-loop guard: no timer, no fork. Loud, because behind a quorum gate a
      // permanently missing worker is no longer visible as an outage.
      this.abandoned.add(index);
      this.deps.log.error(
        `Worker ${index} died again after ${RESTART_CAP} restarts in the last ${RESTART_WINDOW_MS / 60_000} minutes; giving up on this index (code: ${code}, signal: ${signal})`,
        {
          workerIndex: index,
          restartsInWindow: priorRestartsInWindow,
          windowMs: RESTART_WINDOW_MS,
          code,
          signal,
        },
      );
      return;
    }

    const delay = backoffDelayMs(priorRestartsInWindow);
    restarts.push(now);
    this.deps.log.info(
      `Restarting worker ${index} in ${delay} ms (restart ${priorRestartsInWindow + 1}/${RESTART_CAP} in window)`,
      {
        workerIndex: index,
        delayMs: delay,
        restartsInWindow: priorRestartsInWindow + 1,
        windowMs: RESTART_WINDOW_MS,
      },
    );
    this.deps.setTimer(() => this.forkIndex(index, "restart"), delay);
  }
}
