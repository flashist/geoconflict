// The SQL migration apply loop, callable on its own (task 0270).
//
// Extracted from migrate.ts so the integration tests can run the REAL runner
// against a reset database instead of applying migration files one by one.
// migrate.ts cannot be imported for that: importing it runs `run()` and then
// `process.exit`.
//
// Behavior is unchanged from the original loop: create `schema_migrations`, walk
// migrations/*.sql in lexical order, skip any filename already recorded, and apply
// each remaining file inside its own transaction together with its bookkeeping
// row. A failure rolls that file back and throws `migration failed: <file>`.
// (Single process — no concurrent-runner race; if that ever changes, wrap the
// apply loop in SELECT pg_advisory_lock(<const>).)

import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import type { Pool } from "pg";
import { formatError, logger } from "./Logger";

const log = logger.child({ comp: "migrate" });

export interface ApplyMigrationsOptions {
  /**
   * Only consider files for which this returns true. Exists for tests that need
   * a database at an older schema (e.g. 001–004); production passes nothing.
   */
  filter?: (filename: string) => boolean;
}

/** Apply every pending migration in `migrationsDir`. Returns the files applied. */
export async function applyMigrations(
  pool: Pool,
  migrationsDir: string,
  options: ApplyMigrationsOptions = {},
): Promise<string[]> {
  await pool.query(
    `create table if not exists schema_migrations (
       filename   text primary key,
       applied_at timestamptz not null default now()
     )`,
  );

  const filter = options.filter ?? (() => true);
  const files = readdirSync(migrationsDir)
    .filter((name) => name.endsWith(".sql"))
    .filter(filter)
    .sort();

  if (files.length === 0) {
    log.warn(`No .sql migrations found in ${migrationsDir}`);
  }

  const applied: string[] = [];
  for (const filename of files) {
    const already = await pool.query(
      "select 1 from schema_migrations where filename = $1",
      [filename],
    );
    if ((already.rowCount ?? 0) > 0) {
      log.info(`skip (already applied): ${filename}`);
      continue;
    }

    const sql = readFileSync(join(migrationsDir, filename), "utf8");
    const client = await pool.connect();
    try {
      await client.query("begin");
      await client.query(sql);
      await client.query(
        "insert into schema_migrations (filename) values ($1)",
        [filename],
      );
      await client.query("commit");
      log.info(`applied: ${filename}`);
      applied.push(filename);
    } catch (error) {
      try {
        await client.query("rollback");
      } catch {
        // ROLLBACK failed (connection gone) — surface the original migration
        // error below rather than the ROLLBACK error.
      }
      throw new Error(`migration failed: ${filename}: ${formatError(error)}`);
    } finally {
      client.release();
    }
  }

  log.info("migrations up to date");
  return applied;
}
