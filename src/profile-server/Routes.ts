// HTTP routes for the profile backend, wired as a factory so the app can be built
// with a real or mocked repository and WITHOUT binding a port (Server.ts owns
// listen()). This is the testable seam — route tests import createApp, never Server.

import express, { type Express } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import {
  CreditBatchRequestSchema,
  ProfileUpsertRequestSchema,
} from "../core/profile/CreditContract";
import type { CreditResult } from "../core/profile/CreditContract";
import type { PlayerProfile } from "../core/profile/PlayerProfile";
import { internalAuth } from "./InternalAuth";
import { formatError, logger } from "./Logger";
import {
  PersistentIdConflictError,
  type CreditStatus,
} from "./PlayerProfileRepository";
import { hashYandexId } from "./YandexIdHash";

const log = logger.child({ comp: "routes" });

// 152-ФЗ: the public read carries the raw Yandex ID in a request HEADER, not the
// URL query string — a query param would land in nginx access logs / browser
// history at rest. The header is hashed on receipt (below) and never logged.
const YANDEX_ID_HEADER = "x-yandex-player-id";

/**
 * The repository surface the routes depend on (structural — eases mocking).
 * 152-ФЗ: the repo only ever sees the irreversible HASH of the Yandex ID — the
 * routes hash the raw ID at the boundary before any repo/DB call.
 */
export interface ProfileRepo {
  ping(): Promise<void>;
  getProfile(yandexPlayerIdHash: string): Promise<PlayerProfile | null>;
  upsertProfile(
    yandexPlayerIdHash: string,
    persistentId: string,
  ): Promise<PlayerProfile>;
  creditMatchXp(
    gameId: string,
    yandexPlayerIdHash: string,
    xpAwarded: number,
  ): Promise<CreditStatus>;
}

const YandexIdHeaderSchema = z.string().min(1).max(128);

/**
 * Public projection of a profile. Sprint 4: this read is unauthenticated (no
 * Yandex signature verification yet — deferred to the Payments task), so omit
 * fields a caller shouldn't be able to resolve by guessing a (non-secret)
 * yandexPlayerId:
 *  - paid state (`is_paid_citizen`, `citizenship_purchased_at`) — leaking "who paid".
 *  - `persistent_id` — the internal cross-device identity-linkage token.
 *  - `yandex_player_id_hash` — the at-rest identity key. The caller already supplied
 *    the id it's reading, so echoing its hash gains nothing and only widens surface.
 * TODO(payments): once Yandex-signature auth lands, these can be returned to the
 * verified owner of the profile.
 */
function toPublicProfile(
  profile: PlayerProfile,
): Omit<
  PlayerProfile,
  | "is_paid_citizen"
  | "citizenship_purchased_at"
  | "persistent_id"
  | "yandex_player_id_hash"
> {
  const {
    is_paid_citizen,
    citizenship_purchased_at,
    persistent_id,
    yandex_player_id_hash,
    ...rest
  } = profile;
  void is_paid_citizen;
  void citizenship_purchased_at;
  void persistent_id;
  void yandex_player_id_hash;
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
    // 152-ФЗ: the raw id arrives in the X-Yandex-Player-Id header (not the URL),
    // so it never reaches an access log. Hash it on receipt; the repo/DB only see
    // the hash, and the raw value is discarded with this request scope.
    const parsed = YandexIdHeaderSchema.safeParse(req.get(YANDEX_ID_HEADER));
    if (!parsed.success) {
      res.status(400).json({ error: "bad_request" });
      return;
    }
    try {
      const profile = await repo.getProfile(hashYandexId(parsed.data));
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

  // Internal, service-authenticated profile create/relink. The game server calls
  // this on a player's first authenticated join so a profile row exists before any
  // crediting (creditMatchXp returns "no_profile" otherwise). Never sets xp,
  // citizenship, or paid flags. Returns the public projection of the live row.
  app.post("/internal/v1/profile/upsert", internalAuth, async (req, res) => {
    const parsed = ProfileUpsertRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "bad_request" });
      return;
    }
    try {
      // 152-ФЗ: hash the raw id at the boundary; the repo/DB only see the hash.
      const profile = await repo.upsertProfile(
        hashYandexId(parsed.data.yandexPlayerId),
        parsed.data.persistentId,
      );
      res.status(200).json(toPublicProfile(profile));
    } catch (error) {
      if (error instanceof PersistentIdConflictError) {
        // persistentId already linked to another Yandex account. 409 (not 500)
        // so the caller (T6) can react; the relink/transfer policy is T6's call.
        // Log only the hashed account (an expected, handled condition — no stack
        // dump, never the raw persistentId, and never the raw Yandex id).
        log.warn(
          `upsert conflict for yandex_player_id_hash=${error.yandexPlayerIdHash}`,
        );
        res.status(409).json({ error: "persistent_id_conflict" });
        return;
      }
      log.error(
        `POST /internal/v1/profile/upsert failed: ${formatError(error)}`,
      );
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
        // 152-ФЗ: hash the raw id at the boundary; the repo/DB only see the hash.
        const status = await repo.creditMatchXp(
          item.gameId,
          hashYandexId(item.yandexPlayerId),
          item.xpAwarded,
        );
        // The raw id stays in the HTTP RESPONSE only (transit, TLS-OK) so the
        // caller (T6) can correlate per-item results — never written at rest.
        results.push({
          gameId: item.gameId,
          yandexPlayerId: item.yandexPlayerId,
          status,
        });
      } catch (error) {
        // Log only gameId — never the raw Yandex id (152-ФЗ: no raw id at rest).
        log.error(
          `credit failed for game ${item.gameId}: ${formatError(error)}`,
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
