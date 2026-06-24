// HTTP routes for the profile backend, wired as a factory so the app can be built
// with a real or mocked repository and WITHOUT binding a port (Server.ts owns
// listen()). This is the testable seam — route tests import createApp, never Server.

import express, { type Express } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { CreditBatchRequestSchema } from "../core/profile/CreditContract";
import type { CreditResult } from "../core/profile/CreditContract";
import type { PlayerProfile } from "../core/profile/PlayerProfile";
import { internalAuth } from "./InternalAuth";
import { formatError, logger } from "./Logger";
import type { CreditStatus } from "./PlayerProfileRepository";

const log = logger.child({ comp: "routes" });

/** The repository surface the routes depend on (structural — eases mocking). */
export interface ProfileRepo {
  ping(): Promise<void>;
  getProfile(yandexPlayerId: string): Promise<PlayerProfile | null>;
  creditMatchXp(
    gameId: string,
    yandexPlayerId: string,
    xpAwarded: number,
  ): Promise<CreditStatus>;
}

const ProfileQuerySchema = z.object({
  yandexPlayerId: z.string().min(1).max(128),
});

/**
 * Public projection of a profile. Sprint 4: this read is unauthenticated (no
 * Yandex signature verification yet — deferred to the Payments task), so omit the
 * paid-state fields. They have no client use today and leaking "who paid" is the
 * one genuinely sensitive bit.
 */
function toPublicProfile(
  profile: PlayerProfile,
): Omit<PlayerProfile, "is_paid_citizen" | "citizenship_purchased_at"> {
  const { is_paid_citizen, citizenship_purchased_at, ...rest } = profile;
  void is_paid_citizen;
  void citizenship_purchased_at;
  return rest;
}

export function createApp(repo: ProfileRepo): Express {
  const app = express();
  // Exactly one proxy hop (host nginx) — so req.ip is the real client for the
  // rate limiter, not nginx's address.
  app.set("trust proxy", 1);
  app.use(express.json());

  // Liveness — dependency-free, never rate-limited (probes hit it constantly).
  app.get("/health", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  // Readiness — DB-backed. 200 only when Postgres answers a trivial query; 503
  // otherwise. Distinct from /health: this is the first real DATABASE_URL consumer.
  app.get("/ready", async (_req, res) => {
    try {
      await repo.ping();
      res.status(200).json({ status: "ready" });
    } catch (error) {
      log.error(`/ready DB check failed: ${formatError(error)}`);
      res.status(503).json({ status: "not_ready" });
    }
  });

  // Client-facing profile read. Rate-limited per-IP to blunt enumeration of the
  // (non-secret) Yandex player IDs. TODO(payments): verify a Yandex signature so a
  // caller can only read its own profile.
  const profileReadLimiter = rateLimit({
    windowMs: 60_000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.get("/v1/profile", profileReadLimiter, async (req, res) => {
    const parsed = ProfileQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "bad_request" });
      return;
    }
    try {
      const profile = await repo.getProfile(parsed.data.yandexPlayerId);
      if (!profile) {
        res.status(404).json({ error: "not_found" });
        return;
      }
      res.status(200).json(toPublicProfile(profile));
    } catch (error) {
      log.error(`GET /v1/profile failed: ${formatError(error)}`);
      res.status(500).json({ error: "internal_error" });
    }
  });

  // Internal, service-authenticated batch crediting. Each item is credited in its
  // own transaction (in the repo), so one bad item never rolls back the others;
  // per-item status lets the caller (T6) retry safely (idempotent).
  app.post("/internal/v1/credit", internalAuth, async (req, res) => {
    const parsed = CreditBatchRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "bad_request" });
      return;
    }
    const results: CreditResult[] = [];
    for (const item of parsed.data.credits) {
      try {
        const status = await repo.creditMatchXp(
          item.gameId,
          item.yandexPlayerId,
          item.xpAwarded,
        );
        results.push({
          gameId: item.gameId,
          yandexPlayerId: item.yandexPlayerId,
          status,
        });
      } catch (error) {
        log.error(
          `credit failed for ${item.gameId}/${item.yandexPlayerId}: ${formatError(error)}`,
        );
        results.push({
          gameId: item.gameId,
          yandexPlayerId: item.yandexPlayerId,
          status: "error",
        });
      }
    }
    res.status(200).json({ results });
  });

  return app;
}
