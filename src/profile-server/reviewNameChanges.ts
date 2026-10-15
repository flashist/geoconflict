// Entry point for the operator's name-change walk-through command (task 0350) — the
// testerRole.ts shape: one pool, pool.end() in finally.
//
// Run on the profile box, after SSHing in — WITH a terminal, so NO `-T`:
//   docker compose -f <profile dir>/docker-compose.yml exec profile-api \
//     npm run -s name-change:review
// It shows each waiting request and asks approve / reject / skip / quit. Each decision
// goes to the running server's own decide route on 127.0.0.1, with the internal token
// read from THIS container's environment — never typed, never printed. Logic,
// messages and exit codes: ./NameChangeReviewCommand.ts. Runbook:
// ai-agents/knowledge-base/name-change-digest-runbook.md.
//
// 🚨 THE ONE TRAP IN THIS FILE (the 0283 one): this module must NEVER import ./Server
// (which calls server.listen() at module load), ./Routes, or ./Telemetry (which would
// start an exporter). A one-shot command that binds a port would fight the running
// container for it. Its import surface is dotenv, node:readline, Db, Logger (through
// Db), ProfileEndpoints and NameChangeReviewCommand. Asserted in
// tests/profile-server/NameChangeReviewCommand.test.ts.

import * as dotenv from "dotenv";
import * as readline from "node:readline";
import { createPool } from "./Db";
import { EXIT_REFUSED } from "./NameChangeDecideCommand";
import {
  fetchNextPending,
  runNameChangeReview,
} from "./NameChangeReviewCommand";
import { profileHttpPort } from "./ProfileEndpoints";

dotenv.config();

async function run(): Promise<number> {
  const pool = createPool();
  // terminal: true puts stdin in raw mode, so Ctrl-C arrives here as a keypress
  // (the "SIGINT" event below), not as a signal that kills the process mid-POST.
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
  });
  const stop = { requested: false };
  let closed = false;
  let openPrompt: ((answer: string | null) => void) | null = null;
  const answerOpenPrompt = (answer: string | null) => {
    const resolve = openPrompt;
    openPrompt = null;
    resolve?.(answer);
  };
  rl.on("close", () => {
    closed = true;
    answerOpenPrompt(null);
  });
  rl.on("SIGINT", () => {
    stop.requested = true;
    answerOpenPrompt(null);
  });
  try {
    return await runNameChangeReview({
      isInteractive:
        process.stdin.isTTY === true && process.stdout.isTTY === true,
      // LITERAL process.env read: scripts/check-config-parity.mjs is static analysis
      // over src/profile-server/**. The container's own, from profile.env.
      token: process.env.PROFILE_INTERNAL_TOKEN,
      port: profileHttpPort(),
      fetch: (url, init) => fetch(url, init),
      nextPending: (excludedHistoryIds) =>
        fetchNextPending(pool, excludedHistoryIds),
      ask: (prompt) =>
        new Promise((resolve) => {
          if (closed || stop.requested) {
            resolve(null);
            return;
          }
          openPrompt = resolve;
          rl.question(prompt, (answer) => answerOpenPrompt(answer));
        }),
      stop,
      out: (line) => process.stdout.write(`${line}\n`),
      err: (line) => process.stderr.write(`${line}\n`),
      now: () => new Date(),
    });
  } finally {
    rl.close();
    // Always — an open pool keeps the process alive.
    await pool.end();
  }
}

run()
  .then((code) => process.exit(code))
  .catch((error: unknown) => {
    // Never reached by design (runNameChangeReview catches its own failures); the
    // error's message only — the token is never part of it.
    const message = error instanceof Error ? error.message : "unknown error";
    process.stderr.write(`name-change review failed: ${message}\n`);
    process.exit(EXIT_REFUSED);
  });
