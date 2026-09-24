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
import { parseLoginCreateEnabled } from "./LoginCreationSwitch";
import { NameChangeRepository } from "./NameChangeRepository";
import { PaymentsRepository } from "./PaymentsRepository";
import { PlayerIdentityRepository } from "./PlayerIdentityRepository";
import { PlayerProfileRepository } from "./PlayerProfileRepository";
import { profileHttpPort } from "./ProfileEndpoints";
import { createApp, type ProfileRepo } from "./Routes";
import { loadSessionSecret } from "./SessionToken";
import { createGracefulShutdown } from "./Shutdown";
import {
  metricPlatform,
  noopProfileMetrics,
  startProfileTelemetry,
  type ProfileMetrics,
} from "./Telemetry";

dotenv.config();

const log = logger.child({ comp: "profile" });

const pool = createPool();

// ── Monitoring + the creation switch (task 0274, S5) ─────────────────────────
// The switch is read BEFORE the app is built (it is a boot-time constant, not a
// per-request lookup) and its effective state is logged and exported as a gauge —
// a lever nobody can see the position of is not a lever. A LITERAL process.env
// read, so the config-parity checker can see it.
const loginCreateEnabled = parseLoginCreateEnabled(
  process.env.PROFILE_LOGIN_CREATE_ENABLED,
  log,
);
log.info(
  `login creation ${loginCreateEnabled ? "ENABLED" : "PAUSED"} (PROFILE_LOGIN_CREATE_ENABLED)`,
);

// Approximate player count from the planner's statistics: no count(*) on the box's
// only database every export cycle. reltuples is -1 until the table is ANALYZEd,
// which Telemetry.ts treats as "no value" rather than reporting a fake number.
async function countPlayersEstimate(): Promise<number> {
  const res = await pool.query(
    "SELECT reltuples::bigint AS estimate FROM pg_class WHERE oid = 'players'::regclass",
  );
  return res.rows.length > 0 ? Number(res.rows[0].estimate) : -1;
}

let metrics: ProfileMetrics = noopProfileMetrics;
try {
  metrics = startProfileTelemetry(log, {
    pool,
    countPlayersEstimate,
    loginCreateEnabled,
  });
} catch (error) {
  // Monitoring must never be the reason the service will not boot. Names the error
  // type only — the endpoint is a host and never goes in a log line.
  log.warn(
    `profile metrics could not start (${error instanceof Error ? error.name : typeof error}) — continuing without them`,
  );
}

// Personal inbox (task 0012): one repository serves the player routes AND the
// post-commit citizenship seams in both repositories below.
const inbox = new InboxRepository(pool);
const profiles = new PlayerProfileRepository(pool, inbox);
// Task 0270: the platform id → internal player id mapping lives in its own
// repository; the routes see both through one structural ProfileRepo.
// Task 0274: the post-commit hook is the ONLY honest place to count a creation —
// the route cannot tell a committed insert from a rolled-back lost race.
const identities = new PlayerIdentityRepository(pool, {
  onPlayerCreated: (platform, source) =>
    metrics.playerCreated(metricPlatform(platform), source),
});
const repo: ProfileRepo = {
  ping: () => profiles.ping(),
  getProfile: (playerId) => profiles.getProfile(playerId),
  creditMatchXp: (gameId, playerId, xpAwarded) =>
    profiles.creditMatchXp(gameId, playerId, xpAwarded),
  findPlayerByIdentity: (platform, platformUserId) =>
    identities.findPlayerByIdentity(platform, platformUserId),
  resolveExistingPlayer: (platform, platformUserId) =>
    identities.resolveExistingPlayer(platform, platformUserId),
  resolveOrCreatePlayer: (platform, platformUserId, source) =>
    identities.resolveOrCreatePlayer(platform, platformUserId, source),
  hasXpGrant: (playerId, kind) => profiles.hasXpGrant(playerId, kind),
};
// Login session HMAC key (task 0271). Unset or shorter than 32 characters ⇒
// POST /v1/login and every Bearer request fail closed with 503 — and that is now the
// WHOLE story: task 0273 (ruling D1) deleted the legacy Yandex-id fallback, so there
// is nothing left behind the 503 and no player-facing route can identify anyone.
// (This comment used to claim the fallback "keeps working" — 0273's residue, corrected
// here because it asserted a deleted path still existed.) Box-generated and persisted by
// setup-profile.sh. Not shared with the game server. Never logged — the warn
// names the variable only. A LITERAL process.env read, so the config-parity
// checker can see it.
const sessionSecret = loadSessionSecret(
  process.env.PROFILE_SESSION_SECRET,
  log,
);
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
// Forum topics (task 0277). The operator chat is a forum group; a BLANK topic means
// General, which is exactly today's behaviour and the behaviour the owner verified on
// the real group — so an unset variable degrades to "works, in the wrong room", never
// to "fails". LITERAL process.env reads so scripts/check-config-parity.mjs sees them.
// ⛔ TELEGRAM_TOPIC_FEEDBACK is deliberately NOT read here: feedback is sent by the
// GAME server, so forwarding it onto this box would be dead config.
const telegramTopicAlerts = process.env.TELEGRAM_TOPIC_ALERTS ?? "";
const telegramTopicNameChanges = process.env.TELEGRAM_TOPIC_NAME_CHANGES ?? "";
// Shared secret for the alert webhook, carried in the request BODY because Uptrace
// 2.0.2 cannot send a custom header. 🚨 NEVER box-generated: a value only this box
// knows is a value the alert sender does not, so every call would fail its secret
// check and every alert would be dropped — silently, forever. Blank ⇒ the relay
// delivers nothing. The warn names the VARIABLE only.
const alertWebhookToken = process.env.PROFILE_ALERT_WEBHOOK_TOKEN ?? "";
if (alertWebhookToken.length === 0) {
  log.warn(
    "PROFILE_ALERT_WEBHOOK_TOKEN is not set — the alert webhook relays nothing " +
      "(alerts will be dropped)",
  );
}
const nameChange = new NameChangeRepository(pool, inbox, {
  token: telegramToken,
  chatId: telegramChatId,
  proxyUrl: telegramProxyUrl,
  threadId: telegramTopicNameChanges,
});
const app = createApp(
  repo,
  {
    paymentsRepo: new PaymentsRepository(pool, inbox),
    yandexPaymentsSecret,
  },
  inbox,
  nameChange,
  { secret: sessionSecret },
  {
    loginCreateEnabled,
    metrics,
    // Tenure XP grant (task 0253): the profile repository owns the transaction.
    tenureGrant: profiles,
    alertRelay: {
      secret: alertWebhookToken,
      telegram: {
        token: telegramToken,
        chatId: telegramChatId,
        proxyUrl: telegramProxyUrl,
        threadId: telegramTopicAlerts,
      },
    },
  },
);
const server = http.createServer(app);

const port = profileHttpPort();
server.listen(port, () => {
  log.info(`Profile API server listening on port ${port}`);
});
// Graceful shutdown (task 0221, G8): SIGTERM/SIGINT → stop accepting, drain in-flight
// requests, close the pool, exit. Only reachable because Dockerfile.profile runs `node`
// directly (exec form) and the compose service sets `init: true` — `npm run` swallows
// the signal.
createGracefulShutdown({ server, pool, log }).install(process);

export { app, server };
