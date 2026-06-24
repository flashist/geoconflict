// Postgres connection pool for the profile backend.
//
// This is the FIRST real consumer of the box-synthesized DATABASE_URL (T4
// deliberately deferred connection-correctness here — "hardening follows the
// consumer"). No URL parsing/validation: `pg` IS the validator — a malformed or
// unreachable URL fails a real query (surfaced by /ready and migrate.ts), which is
// exactly the T5 acceptance.

import { Pool } from "pg";
import { formatError, logger } from "./Logger";

const log = logger.child({ comp: "db" });

// `max` stays well under the box's Postgres `max_connections=25` cap.
// `connectionTimeoutMillis` is load-bearing: it makes /ready (SELECT 1) FAIL FAST
// on a bad/unreachable URL instead of hanging the readiness probe.
export function createPool(): Pool {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });

  // CRITICAL: pg.Pool emits 'error' when an IDLE client fails (e.g. Postgres
  // restarts or the box drops the connection). Without a listener Node treats it
  // as an unhandled 'error' event and CRASHES the process — which would take down
  // liveness (/health) the moment the DB blips. Log and swallow: the pool reconnects
  // on the next query, and /ready already reports DB health on demand.
  pool.on("error", (error) => {
    log.error(`idle client error: ${formatError(error)}`);
  });

  return pool;
}
