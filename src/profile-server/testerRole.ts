// Entry point for SSH-only tester roles (task 0425) — the migrate.ts /
// sendNameChangeDigest.ts shape: one pool, SQL, pool.end() in finally.
//
// Run on the profile box only, by the owner (each apply/restore on the live box is a
// production write and needs the owner's OK in-session):
//   docker compose -f /opt/profile/docker-compose.yml exec -T \
//     -e TESTER_ROLE_OPERATOR="$(logname 2>/dev/null || whoami)" \
//     profile-api npm run -s tester-role -- apply <tester-internal-id> <role-id>
// (and `restore <tester-internal-id>`, `show <tester-internal-id>`). Logic, guard
// order, messages and exit codes: ./TesterRoleCommand.ts. Runbook:
// ai-agents/knowledge-base/profile-tester-roles-runbook.md.
//
// 🚨 THE ONE TRAP IN THIS FILE (the 0283 one): this module must NEVER import ./Server
// (which calls server.listen() at module load), ./Routes, or ./Telemetry (which would
// start an exporter). A one-shot command that binds a port would fight the running
// container for it. Its import surface is dotenv, fs (inside TesterRoleCommand), Db,
// Logger (through Db), TesterRoleCommand, TesterRoleRepository and TesterRoles.
// Asserted in tests/profile-server/TesterRoleCommand.test.ts.

import * as dotenv from "dotenv";
import { createPool } from "./Db";
import {
  EXIT_REFUSED,
  TESTER_ROLE_ALLOWLIST_PATH,
  TESTER_ROLE_LOG_PATH,
  fileAllowlistReader,
  fileRunLog,
  runTesterRole,
} from "./TesterRoleCommand";
import { TesterRoleRepository } from "./TesterRoleRepository";

dotenv.config();

async function run(): Promise<number> {
  const pool = createPool();
  try {
    return await runTesterRole({
      argv: process.argv.slice(2),
      // LITERAL process.env read: scripts/check-config-parity.mjs is static analysis
      // over src/profile-server/**. Set per run by the runbook's `docker compose exec
      // -e`, never by a deploy — allowlisted as runtime-supplied in
      // scripts/config-parity-allowlist.json. Self-reported: the container cannot see
      // the SSH user.
      operator: process.env.TESTER_ROLE_OPERATOR,
      readAllowlistFile: fileAllowlistReader(TESTER_ROLE_ALLOWLIST_PATH),
      openLog: () => fileRunLog(TESTER_ROLE_LOG_PATH),
      repo: new TesterRoleRepository(pool),
      out: (line) => process.stdout.write(`${line}\n`),
      err: (line) => process.stderr.write(`${line}\n`),
      now: () => new Date(),
    });
  } finally {
    // Always — an open pool keeps the process alive.
    await pool.end();
  }
}

run()
  .then((code) => process.exit(code))
  .catch((error: unknown) => {
    // Never reached by design (runTesterRole catches its own failures).
    const message = error instanceof Error ? error.message : "unknown error";
    process.stderr.write(`tester-role failed: ${message}\n`);
    process.exit(EXIT_REFUSED);
  });
