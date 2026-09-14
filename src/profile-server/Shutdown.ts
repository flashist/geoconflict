// Graceful shutdown for the profile backend (task 0221, G8).
//
// On SIGTERM / SIGINT: stop accepting connections (idle keep-alive sockets are closed,
// in-flight requests run to completion), then close the pg pool, then exit 0. ONE deadline
// bounds the whole sequence — the HTTP drain AND the pool close (review 0221 R2: pg-pool's
// end() waits for checked-out clients, so a hung pool must hit this path, not Docker's
// SIGKILL). On expiry every remaining connection is destroyed and the process exits 1
// without waiting on the pool — postgres reaps the connections of a dead process. The
// default deadline (8 s) sits under Docker's default 10 s stop_grace_period, so SIGKILL
// never races it. A second signal during a drain is logged and ignored — the first drain
// keeps going.
//
// Reachable only when node receives the signal: `npm run` does NOT forward SIGTERM to its
// child (0221 probe: with `CMD ["npm","run",…]` the handler never ran, with or without
// --init). That is why Dockerfile.profile runs `node` directly and the compose service sets
// `init: true` (setup-profile.sh). Severity note: a request dropped by a hard stop cannot
// double-credit — the credit ledger's primary key is idempotent — so this is correctness
// hygiene, not a data-integrity fix (brief 0221).

import type { Server } from "http";
import { formatError } from "./Logger";

export interface ShutdownLogger {
  info(message: string): unknown;
  warn(message: string): unknown;
  error(message: string): unknown;
}

export interface ShutdownPool {
  end(): Promise<void>;
}

export interface GracefulShutdownOptions {
  server: Server;
  pool: ShutdownPool;
  log: ShutdownLogger;
  /** Drain deadline in ms. Default 8000 — under Docker's 10 s stop_grace_period. */
  timeoutMs?: number;
  /** Process exit hook; injectable for tests. Default: process.exit. */
  exit?: (code: number) => void;
}

export interface GracefulShutdown {
  /** Begin the drain. Idempotent: a second call is logged and ignored. */
  shutdown(signal: string): void;
  /** Register SIGTERM + SIGINT handlers on the given emitter (process in production). */
  install(proc: NodeJS.EventEmitter): void;
}

export const DEFAULT_SHUTDOWN_TIMEOUT_MS = 8_000;

export function createGracefulShutdown(
  options: GracefulShutdownOptions,
): GracefulShutdown {
  const { server, pool, log } = options;
  const timeoutMs = options.timeoutMs ?? DEFAULT_SHUTDOWN_TIMEOUT_MS;
  const exit = options.exit ?? ((code: number) => process.exit(code));

  let draining = false;
  let timedOut = false;
  let serverClosed = false;
  let poolClosing: Promise<void> | undefined;

  // Closed exactly once, whichever path (drained or deadline) gets there first.
  const closePoolOnce = (): Promise<void> => {
    poolClosing ??= pool.end().then(
      () => {
        log.info("pg pool closed");
      },
      (error: unknown) => {
        log.error(`pg pool close failed: ${formatError(error)}`);
      },
    );
    return poolClosing;
  };

  const shutdown = (signal: string): void => {
    if (draining) {
      log.warn(`${signal} received during drain — ignored (drain in progress)`);
      return;
    }
    draining = true;
    log.info(`${signal} received — draining (deadline ${timeoutMs}ms)`);

    // Armed until exit(0) is reached — it covers the pool close as well as the drain.
    const deadline = setTimeout(() => {
      timedOut = true;
      log.warn(
        serverClosed
          ? `drain deadline (${timeoutMs}ms) exceeded — pg pool did not close in time, exiting`
          : `drain deadline (${timeoutMs}ms) exceeded — destroying remaining connections`,
      );
      server.closeAllConnections();
      // Not awaited: the budget is spent. Started so a pool that CAN close gets the
      // chance the exit hook allows it; a pool that cannot is the case this path is for.
      void closePoolOnce();
      exit(1);
    }, timeoutMs);
    deadline.unref();

    // Node ≥ 19 closes idle keep-alive connections inside close() too; calling it
    // explicitly keeps the behaviour independent of that version detail.
    server.closeIdleConnections();
    server.close((error) => {
      // The deadline path owns the exit once it has fired (close() completes when
      // closeAllConnections() destroys the last socket, so this callback still runs).
      if (timedOut) return;
      serverClosed = true;
      if (error) {
        log.warn(`http server close: ${formatError(error)}`);
      }
      log.info("http server closed — in-flight requests drained");
      void closePoolOnce().then(() => {
        if (timedOut) return;
        clearTimeout(deadline);
        exit(0);
      });
    });
  };

  const install = (proc: NodeJS.EventEmitter): void => {
    proc.on("SIGTERM", () => shutdown("SIGTERM"));
    proc.on("SIGINT", () => shutdown("SIGINT"));
  };

  return { shutdown, install };
}
