// Entry point for the daily name-change digest (task 0283) — the migrate.ts shape.
//
// Run on the box by a host cron line, once a day at 04:00 UTC (07:00 MSK):
//   docker compose exec -T profile-api npm run digest:name-changes
//
// Exit 0 iff the message reached Telegram (`sent` or `sent_after_retry`), 1 otherwise —
// including `not_configured`, i.e. the bot is not set up. The non-zero exit is what puts
// the failure into the cron log, and the failure is also what WITHHOLDS the freshness
// marker so profile-checks.sh's check 12 pages through the dead-man's switch.
//
// 🚨 THE ONE TRAP IN THIS FILE: this module must NEVER import ./Server (which calls
// server.listen() at module load), ./Routes, or ./Telemetry (which would start an
// exporter). A one-shot CLI that binds a port or opens an exporter would fight the
// running container for the port, or hang the cron job. Its import surface is exactly
// dotenv, Db, Logger and NameChangeDigest. This also keeps the ts-node compile cheap on
// a low-RAM box with an OOM history.
//
// ⚠️ The honest stakes, corrected (review R7): this is NOT silent. A port clash exits
// EADDRINUSE and non-zero, which withholds the freshness marker, which check 12 turns
// into a page within 26 h. It is asserted statically in
// tests/scripts/profile-deploy-hardening.test.sh because the failure would otherwise
// only ever appear on the box — a day late, wearing the costume of a broken Telegram
// path — not because nothing would say so.

import * as dotenv from "dotenv";
import { createPool } from "./Db";
import { formatError, logger } from "./Logger";
import { runNameChangeDigest } from "./NameChangeDigest";

dotenv.config();

const log = logger.child({ comp: "name-change-digest" });

async function run(): Promise<number> {
  // LITERAL process.env reads. scripts/check-config-parity.mjs is static analysis over
  // src/profile-server/**, and it reports a DYNAMIC-READ blind spot for anything
  // computed. All four names already exist in the box's 0600 profile.env and are already
  // exported by build-deploy-profile.sh — this task introduces NO new variable.
  const telegram = {
    token: process.env.FEEDBACK_TELEGRAM_TOKEN ?? "",
    chatId: process.env.FEEDBACK_TELEGRAM_CHAT_ID ?? "",
    proxyUrl: process.env.TELEGRAM_PROXY_URL ?? "",
    threadId: process.env.TELEGRAM_TOPIC_NAME_CHANGES ?? "",
  };

  const pool = createPool();
  try {
    const result = await runNameChangeDigest({ pool, telegram });
    return result === "sent" ? 0 : 1;
  } finally {
    // Always — an open pool keeps the process alive and the cron job never returns.
    await pool.end();
  }
}

run()
  .then((code) => process.exit(code))
  .catch((error) => {
    log.error(`name-change digest runner failed: ${formatError(error)}`);
    process.exit(1);
  });
