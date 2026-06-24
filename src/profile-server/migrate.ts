// Hand-rolled SQL migration runner for the profile backend.
//
// No migration library: the profile image ships only src/ + the SQL files and runs
// via ts-node ESM, so a dependency-light runner is the right fit. It applies every
// migrations/*.sql once, in lexical order, inside a transaction, and records the
// applied filename in a `schema_migrations` table so re-runs are no-ops.
//
// Run at deploy time on the box via:
//   docker compose exec -T profile-api npm run migrate
// (single process — no concurrent-runner race; if that ever changes, wrap the
// apply loop in SELECT pg_advisory_lock(<const>).)

import * as dotenv from "dotenv";
import { readdirSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { createPool } from "./Db";
import { formatError, logger } from "./Logger";

dotenv.config();

const log = logger.child({ comp: "migrate" });

// Resolve migrations/ relative to this file (repo-root/migrations, and
// /usr/src/app/migrations in the container), NOT process.cwd().
const MIGRATIONS_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "migrations",
);

async function run(): Promise<void> {
  const pool = createPool();

  try {
    await pool.query(
      `create table if not exists schema_migrations (
         filename   text primary key,
         applied_at timestamptz not null default now()
       )`,
    );

    const files = readdirSync(MIGRATIONS_DIR)
      .filter((name) => name.endsWith(".sql"))
      .sort();

    if (files.length === 0) {
      log.warn(`No .sql migrations found in ${MIGRATIONS_DIR}`);
    }

    for (const filename of files) {
      const already = await pool.query(
        "select 1 from schema_migrations where filename = $1",
        [filename],
      );
      if ((already.rowCount ?? 0) > 0) {
        log.info(`skip (already applied): ${filename}`);
        continue;
      }

      const sql = readFileSync(join(MIGRATIONS_DIR, filename), "utf8");
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
  } finally {
    await pool.end();
  }
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    log.error(`migration runner failed: ${formatError(error)}`);
    process.exit(1);
  });
