// Player-profile backend API — skeleton (Sprint 4, T4a).
//
// This is the ops-foundation slice: a minimal Express service exposing only a
// liveness /health endpoint. The DB-backed readiness check (/ready), the real
// profile endpoints (GET /v1/profile, internal POST /internal/v1/credit) and the
// Postgres-backed (pg) repository all land in T5 — see
// ai-agents/tasks/backlog/s4-profile-05-backend-db-api.md. Runs as TypeScript via
// ts-node ESM, the same way src/server/Server.ts does.
//
// Deployment: its own Docker image (Dockerfile.profile) on a dedicated reg.ru
// VPS, behind host nginx that terminates TLS for api.geoconflict.ru and proxies
// to PROFILE_PORT on 127.0.0.1. See setup-profile.sh / build-deploy-profile.sh.

import * as dotenv from "dotenv";
import express from "express";
import http from "http";
import { logger } from "./Logger";
import { profileHttpPort } from "./ProfileEndpoints";

dotenv.config();

const log = logger.child({ comp: "profile" });

const app = express();
const server = http.createServer(app);

app.use(express.json());

// Liveness check used by the container healthcheck, nginx, and uptime probes.
// Kept dependency-free on purpose — a DB-backed readiness check (/ready) is added
// in T5.
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

const port = profileHttpPort();
server.listen(port, () => {
  log.info(`Profile API server listening on port ${port}`);
});

export { app, server };
