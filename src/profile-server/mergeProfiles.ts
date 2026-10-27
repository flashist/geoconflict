// Entry point for the owner-run profile merge (task 0503, ADR-128) — the testerRole.ts
// shape: one pool, pool.end() in finally.
//
// Run on the profile box only, by the owner (a real run is a production write):
//   docker compose -f /opt/profile/docker-compose.yml exec -T \
//     profile-api npm run -s merge-profiles -- dry-run --into <keep-id> --from <source-id>
//   docker compose -f /opt/profile/docker-compose.yml exec \
//     -e PROFILE_MERGE_OPERATOR="$(logname 2>/dev/null || whoami)" \
//     profile-api npm run -s merge-profiles -- commit --into <keep-id> --from <source-id> --expect <fingerprint>
// (commit WITHOUT -T: it asks for a typed MERGE). Logic, guard order, messages and exit
// codes: ./ProfileMergeCommand.ts. Runbook: ai-agents/knowledge-base/profile-merge-runbook.md.
//
// 🚨 This module must NEVER import ./Server (which calls server.listen() at module load),
// ./Routes, or ./Telemetry (the 0283 trap). Asserted in
// tests/profile-server/ProfileMergeCommand.test.ts.

import * as dotenv from "dotenv";
import * as readline from "readline";
import { createPool } from "./Db";
import { EXIT_REFUSED, runMergeProfiles } from "./ProfileMergeCommand";
import { ProfileMergeRepository } from "./ProfileMergeRepository";

dotenv.config();

function ask(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    let answered = false;
    rl.question(question, (answer) => {
      answered = true;
      rl.close();
      resolve(answer);
    });
    // Ctrl-D / a closed stdin is a "no", never a hang.
    rl.on("close", () => {
      if (!answered) {
        resolve("");
      }
    });
  });
}

async function run(): Promise<number> {
  const pool = createPool();
  try {
    return await runMergeProfiles({
      argv: process.argv.slice(2),
      // LITERAL process.env read: scripts/check-config-parity.mjs is static analysis
      // over src/profile-server/**. Set per run by the runbook's `docker compose exec
      // -e`, never by a deploy — allowlisted as runtime-supplied. Self-reported.
      operator: process.env.PROFILE_MERGE_OPERATOR,
      interactive: process.stdin.isTTY === true,
      prompt: ask,
      store: new ProfileMergeRepository(pool),
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
    // Never reached by design (runMergeProfiles catches its own failures).
    const message = error instanceof Error ? error.message : "unknown error";
    process.stderr.write(`merge-profiles failed: ${message}\n`);
    process.exit(EXIT_REFUSED);
  });
