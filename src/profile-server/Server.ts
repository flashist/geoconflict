// Player-profile backend API — entrypoint (Sprint 4, T5).
//
// Thin wiring only: load env, build the pg pool + repository, build the Express app
// (routes live in Routes.ts / createApp), and listen. The route logic and the DB
// layer are in their own modules so they're unit/integration testable without
// binding a port — this file is intentionally hard to test and kept minimal.
//
// Deployment: its own Docker image (Dockerfile.profile) on a dedicated reg.ru VPS,
// behind host nginx that terminates TLS for api.geoconflict.ru and proxies to
// PROFILE_PORT on 127.0.0.1. See setup-profile.sh / build-deploy-profile.sh.
// DB migrations run at deploy time via `npm run migrate` (migrate.ts).

import * as dotenv from "dotenv";
import http from "http";
import { createPool } from "./Db";
import { InboxRepository } from "./InboxRepository";
import { logger } from "./Logger";
import { NameChangeRepository } from "./NameChangeRepository";
import { PaymentsRepository } from "./PaymentsRepository";
import { PlayerProfileRepository } from "./PlayerProfileRepository";
import { profileHttpPort } from "./ProfileEndpoints";
import { createApp } from "./Routes";

dotenv.config();

const log = logger.child({ comp: "profile" });

const pool = createPool();
// Personal inbox (task 0012): one repository serves the player routes AND the
// post-commit citizenship seams in both repositories below.
const inbox = new InboxRepository(pool);
const repo = new PlayerProfileRepository(pool, inbox);
// Yandex per-game payments secret (HMAC key). Unset/empty ⇒ the payments routes
// fail closed with 503 (see Routes.ts). Never logged, never committed.
const yandexPaymentsSecret = process.env.YANDEX_PAYMENTS_SECRET ?? "";
if (yandexPaymentsSecret.length === 0) {
  log.warn(
    "YANDEX_PAYMENTS_SECRET is not set — payments endpoints disabled (503)",
  );
}
// Operator Telegram notifications for pending name-change requests (task 0067).
// SAME bot, SAME chat, SAME proxy and SAME env var names as the game server's
// feedback/subscribe sends (owner ruling (a): reuse the existing pipeline).
// TELEGRAM_PROXY_URL is load-bearing, not optional: api.telegram.org is blocked
// from Russian IPs and every VPS in this project is reg.ru / Moscow. Unset
// token/chat ⇒ requests still work, the operator just isn't pinged. Never logged.
const telegramToken = process.env.FEEDBACK_TELEGRAM_TOKEN ?? "";
const telegramChatId = process.env.FEEDBACK_TELEGRAM_CHAT_ID ?? "";
const telegramProxyUrl = process.env.TELEGRAM_PROXY_URL ?? "";
if (telegramToken.length === 0 || telegramChatId.length === 0) {
  log.warn(
    "FEEDBACK_TELEGRAM_TOKEN / FEEDBACK_TELEGRAM_CHAT_ID not set — " +
      "operator name-change notifications disabled (requests still work)",
  );
} else if (telegramProxyUrl.length === 0) {
  log.warn(
    "TELEGRAM_PROXY_URL is not set — Telegram is unreachable from a Russian IP, " +
      "so operator name-change notifications will fail",
  );
}
const nameChange = new NameChangeRepository(pool, inbox, {
  token: telegramToken,
  chatId: telegramChatId,
  proxyUrl: telegramProxyUrl,
});
const app = createApp(
  repo,
  {
    paymentsRepo: new PaymentsRepository(pool, inbox),
    yandexPaymentsSecret,
  },
  inbox,
  nameChange,
);
const server = http.createServer(app);

const port = profileHttpPort();
server.listen(port, () => {
  log.info(`Profile API server listening on port ${port}`);
});

export { app, server };
