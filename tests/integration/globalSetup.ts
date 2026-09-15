// Global setup for the DB-backed integration run. Wired into `integrationConfig`
// in jest.config.ts as jest's `globalSetup`, so it is the single choke point every
// `npm run test:integration` invocation passes through. Three steps, in order:
//
// 1. ENV GUARD. Without it, an unset TEST_DATABASE_URL produces a fast,
//    plausible-looking red (every suite fails on connection) that reads like a code
//    regression instead of a missing variable. Trimmed before the check: a
//    whitespace-only value is truthy, so it slipped past an earlier
//    `!process.env...` version of this guard. Deliberately NOT a validity check —
//    pg is the right thing to fail on a garbage connection string.
//
// 2. HOST GUARD (task 0270, owner ruling D1). Step 3 DROPS the whole `public`
//    schema, so the run refuses unless the database is on this machine
//    (localhost / 127.0.0.1 / ::1). The error never echoes the connection string.
//
// 3. RESET + REAL RUNNER (task 0270). `DROP SCHEMA public CASCADE; CREATE SCHEMA
//    public;`, then the production apply loop (src/profile-server/Migrations.ts)
//    over migrations/. Suites no longer apply migration files one by one — a
//    guarded, table-dropping 006 cannot be re-applied that way. Runs once per
//    `npm run test:integration`; suites truncate between tests
//    (tests/integration/support/db.ts).
//
// See the "Integration tests (real Postgres)" subsection in CLAUDE.md.

import { join } from "path";
import { Pool } from "pg";
import { applyMigrations } from "../../src/profile-server/Migrations";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

/** The connection string's host, or null when it cannot be read as a URL. */
export function databaseHost(connectionString: string): string | null {
  try {
    const url = new URL(connectionString);
    if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
      return null;
    }
    // A socket path or host override in the query string would silently point
    // the destructive reset somewhere the hostname does not say — refuse.
    if (url.searchParams.has("host")) {
      return null;
    }
    return url.hostname.length > 0 ? url.hostname.toLowerCase() : null;
  } catch {
    return null;
  }
}

export function isLocalDatabase(connectionString: string): boolean {
  const host = databaseHost(connectionString);
  return host !== null && LOCAL_HOSTS.has(host);
}

export default async function prepareIntegrationDatabase(): Promise<void> {
  const connectionString = process.env.TEST_DATABASE_URL?.trim();
  if (!connectionString) {
    throw new Error(
      "TEST_DATABASE_URL is not set — the integration suite needs a real Postgres.\n" +
        "These tests connect to a live database; without that variable every suite\n" +
        "fails on connection and the run looks like a code regression.\n" +
        "See the 'Integration tests' subsection under ## Testing in CLAUDE.md for\n" +
        "the command, the variables, and where the value belongs.",
    );
  }

  if (!isLocalDatabase(connectionString)) {
    throw new Error(
      "TEST_DATABASE_URL does not point at a local database — refusing to run.\n" +
        "The integration run DROPS AND RECREATES the `public` schema of that database\n" +
        "on every run, so it only accepts a postgres:// URL whose host is localhost,\n" +
        "127.0.0.1 or ::1 (no `host=` query override). Point it at the throwaway\n" +
        "local test container. See the 'Integration tests' subsection in CLAUDE.md.",
    );
  }

  const pool = new Pool({ connectionString });
  try {
    await pool.query("DROP SCHEMA public CASCADE");
    await pool.query("CREATE SCHEMA public");
    await applyMigrations(pool, join(process.cwd(), "migrations"));
  } finally {
    await pool.end();
  }
}
