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
import { logger } from "./Logger";
import { PaymentsRepository } from "./PaymentsRepository";
import { PlayerProfileRepository } from "./PlayerProfileRepository";
import { profileHttpPort } from "./ProfileEndpoints";
import { createApp } from "./Routes";

dotenv.config();

const log = logger.child({ comp: "profile" });

const pool = createPool();
const repo = new PlayerProfileRepository(pool);
// Yandex per-game payments secret (HMAC key). Unset/empty ⇒ the payments routes
// fail closed with 503 (see Routes.ts). Never logged, never committed.
const yandexPaymentsSecret = process.env.YANDEX_PAYMENTS_SECRET ?? "";
if (yandexPaymentsSecret.length === 0) {
  log.warn(
    "YANDEX_PAYMENTS_SECRET is not set — payments endpoints disabled (503)",
  );
}
const app = createApp(repo, {
  paymentsRepo: new PaymentsRepository(pool),
  yandexPaymentsSecret,
});
const server = http.createServer(app);

const port = profileHttpPort();
server.listen(port, () => {
  log.info(`Profile API server listening on port ${port}`);
});

export { app, server };
