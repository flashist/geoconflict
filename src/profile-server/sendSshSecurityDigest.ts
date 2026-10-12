// Entry point for the daily SSH security digest (task 0443) — the sendNameChangeDigest.ts shape.
//
// Run on the box by a host cron line, once a day at 08:10 UTC (after every box's agent has sent
// its 08:00 UTC report):
//   docker compose exec -T profile-api npm run digest:ssh-security
//
// Exit 0 iff the message reached Telegram (`sent` or `sent_after_retry`), 1 otherwise —
// including `not_configured`. The non-zero exit puts the failure into the cron log, and the
// failure withholds the marker (SshSecurityDigest.ts).
//
// 🚨 This module must NEVER import ./Server (it calls server.listen() at module load), ./Routes,
// or ./Telemetry (it would start an exporter): a one-shot CLI that binds a port would fight the
// running container for it. Its import surface is dotenv, Logger and SshSecurityDigest. It needs
// no database. The hardening harness asserts the forbidden imports stay out.

import * as dotenv from "dotenv";
import { formatError, logger } from "./Logger";
import { runSshSecurityDigest } from "./SshSecurityDigest";

dotenv.config();

const log = logger.child({ comp: "ssh-security-digest" });

async function run(): Promise<number> {
  // LITERAL process.env reads (the config-parity checker is static analysis). All four already
  // exist in the box's 0600 profile.env — this entry point introduces no new variable.
  const telegram = {
    token: process.env.FEEDBACK_TELEGRAM_TOKEN ?? "",
    chatId: process.env.FEEDBACK_TELEGRAM_CHAT_ID ?? "",
    proxyUrl: process.env.TELEGRAM_PROXY_URL ?? "",
    threadId: process.env.TELEGRAM_TOPIC_ALERTS ?? "",
  };
  const result = await runSshSecurityDigest({ telegram });
  return result === "sent" ? 0 : 1;
}

run()
  .then((code) => process.exit(code))
  .catch((error) => {
    log.error(`ssh security digest runner failed: ${formatError(error)}`);
    process.exit(1);
  });
