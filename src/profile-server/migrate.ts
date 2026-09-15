// Hand-rolled SQL migration runner for the profile backend — the entry point.
//
// No migration library: the profile image ships only src/ + the SQL files and runs
// via ts-node ESM, so a dependency-light runner is the right fit. The apply loop
// itself lives in Migrations.ts (task 0270) so tests can call it; this file only
// loads env, builds the pool, runs the loop, and sets the exit code.
//
// Run at deploy time on the box via:
//   docker compose exec -T profile-api npm run migrate

import * as dotenv from "dotenv";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { createPool } from "./Db";
import { formatError, logger } from "./Logger";
import { applyMigrations } from "./Migrations";

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
    await applyMigrations(pool, MIGRATIONS_DIR);
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
