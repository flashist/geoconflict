// Entry point for the operator's name-change decide command (task 0312) — the
// sendNameChangeDigest.ts shape.
//
// Run on the profile box, pasted from the per-request Telegram message:
//   docker compose -f <profile dir>/docker-compose.yml exec -T \
//     -e NAME_CHANGE_DECISION='{…}' [-e NAME_CHANGE_REASON='…'] \
//     profile-api npm run -s name-change:decide
// It posts the decision to the running server's own decide route on 127.0.0.1, with
// the internal token read from THIS container's environment — never typed, never
// printed. Logic, messages and exit codes: ./NameChangeDecideCommand.ts. Runbook:
// ai-agents/knowledge-base/name-change-digest-runbook.md.
//
// 🚨 THE ONE TRAP IN THIS FILE (same as the digest's): this module must NEVER import
// ./Server (which calls server.listen() at module load), ./Routes, or ./Telemetry
// (which would start an exporter). A one-shot command that binds a port would fight
// the running container for it. Its import surface is exactly NameChangeDecideCommand
// and ProfileEndpoints — not even the Logger: output is plain stdout/stderr, for a
// person at a terminal. Asserted in tests/profile-server/NameChangeDecideCommand.test.ts.

import { runNameChangeDecide } from "./NameChangeDecideCommand";
import { profileHttpPort } from "./ProfileEndpoints";

// LITERAL process.env reads: scripts/check-config-parity.mjs is static analysis over
// src/profile-server/**. NAME_CHANGE_DECISION and NAME_CHANGE_REASON are set per run by
// the operator's `docker compose exec -e`, never by a deploy — allowlisted as
// runtime-supplied in scripts/config-parity-allowlist.json. PROFILE_INTERNAL_TOKEN (and
// PROFILE_PORT, via profileHttpPort) are the container's own, from profile.env.
runNameChangeDecide({
  decisionJson: process.env.NAME_CHANGE_DECISION,
  reason: process.env.NAME_CHANGE_REASON,
  token: process.env.PROFILE_INTERNAL_TOKEN,
  port: profileHttpPort(),
  fetch: (url, init) => fetch(url, init),
  out: (line) => process.stdout.write(`${line}\n`),
  err: (line) => process.stderr.write(`${line}\n`),
})
  .then((code) => process.exit(code))
  .catch((error: unknown) => {
    // Never reached by design (runNameChangeDecide catches its own failures); the
    // error's message only — the token is never part of it.
    const message = error instanceof Error ? error.message : "unknown error";
    process.stderr.write(`name-change decide failed: ${message}\n`);
    process.exit(1);
  });
