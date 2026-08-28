// HTTP routes for the profile backend, wired as a factory so the app can be built
// with a real or mocked repository and WITHOUT binding a port (Server.ts owns
// listen()). This is the testable seam — route tests import createApp, never Server.

import express, {
  type Express,
  type Request,
  type RequestHandler,
} from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import {
  CreditBatchRequestSchema,
  ProfileUpsertRequestSchema,
} from "../core/profile/CreditContract";
import type { CreditResult } from "../core/profile/CreditContract";
import {
  MarkReadRequestSchema,
  SendMessageRequestSchema,
} from "../core/profile/InboxContract";
import {
  NameChangeCancelRequestSchema,
  NameChangeDecisionRequestSchema,
  NameChangeRequestSchema,
  type NameChangeState,
} from "../core/profile/NameChangeContract";
import {
  PurchaseCompleteRequestSchema,
  PurchaseIntentRequestSchema,
  PurchaseReconcileRequestSchema,
} from "../core/profile/PaymentsContract";
import type {
  PlayerProfile,
  PublicPlayerProfile,
} from "../core/profile/PlayerProfile";
import type {
  ListOutcome,
  MarkReadOutcome,
  SendMessageInput,
  SendOutcome,
} from "./InboxRepository";
import { internalAuth } from "./InternalAuth";
import { formatError, logger } from "./Logger";
import type {
  CancelOutcome,
  DecideOutcome,
  RequestOutcome,
} from "./NameChangeRepository";
import type {
  GrantStatus,
  PaidPurchaseGrant,
  ProcessedPurchase,
  PurchaseIntent,
} from "./PaymentsRepository";
import {
  PersistentIdConflictError,
  type CreditOutcome,
} from "./PlayerProfileRepository";
import { verifySignedPayload, type VerifiedPurchase } from "./YandexSignature";

const log = logger.child({ comp: "routes" });

/** The repository surface the routes depend on (structural — eases mocking). */
export interface ProfileRepo {
  ping(): Promise<void>;
  getProfile(yandexPlayerId: string): Promise<PlayerProfile | null>;
  upsertProfile(
    yandexPlayerId: string,
    persistentId: string,
  ): Promise<PlayerProfile>;
  creditMatchXp(
    gameId: string,
    yandexPlayerId: string,
    xpAwarded: number,
  ): Promise<CreditOutcome>;
}

const ProfileQuerySchema = z.object({
  yandexPlayerId: z.string().min(1).max(128),
});

/** The payments-repository surface the routes depend on (structural — eases mocking). */
export interface PaymentsRepo {
  createIntent(yandexPlayerId: string, productId: string): Promise<string>;
  findIntent(intentId: string): Promise<PurchaseIntent | null>;
  getProcessedPurchase(
    purchaseToken: string,
  ): Promise<ProcessedPurchase | null>;
  grantPaidPurchase(grant: PaidPurchaseGrant): Promise<GrantStatus>;
}

/** Payments wiring for createApp. Omitted (or an empty secret) ⇒ payments routes fail closed with 503. */
export interface PaymentsConfig {
  paymentsRepo: PaymentsRepo;
  yandexPaymentsSecret: string;
}

/** The inbox-repository surface the routes depend on (structural — eases mocking). */
export interface InboxRepo {
  listMessages(yandexPlayerId: string): Promise<ListOutcome>;
  markRead(
    yandexPlayerId: string,
    ids?: readonly number[],
  ): Promise<MarkReadOutcome>;
  sendMessage(input: SendMessageInput): Promise<SendOutcome>;
}

const InboxQuerySchema = z.object({
  yandexPlayerId: z.string().min(1).max(128),
});

/** The name-change-repository surface the routes depend on (structural — eases mocking). */
export interface NameChangeRepo {
  requestNameChange(
    yandexPlayerId: string,
    requestedName: string,
  ): Promise<RequestOutcome>;
  cancelNameChange(yandexPlayerId: string): Promise<CancelOutcome>;
  decideNameChange(
    yandexPlayerId: string,
    decision: "approve" | "reject",
    reason?: string,
    expectedName?: string,
  ): Promise<DecideOutcome>;
  getLatestState(yandexPlayerId: string): Promise<NameChangeState | null>;
}

/**
 * The ONE place the player-facing inbox routes learn who is asking (task 0012,
 * owner-ruled D1 2026-08-26). Today it returns the CLIENT-asserted
 * `yandexPlayerId` (query on GET, body otherwise) — the same trust level ADR-103
 * accepted for `/v1/profile` and crediting. Re-raise: when ADR-103 exits (the
 * Yandex secret lands with 0014 and signed-player verification exists), the
 * signature check drops in HERE and nowhere else. The citizen gate stays in
 * SQL regardless (InboxRepository), so a forged id only ever reaches a
 * citizen's low-sensitivity system notices.
 */
function resolvePlayerId(req: Request): string | null {
  const source = req.method === "GET" ? req.query : req.body;
  const parsed = InboxQuerySchema.safeParse(source);
  return parsed.success ? parsed.data.yandexPlayerId : null;
}

// purchase_intents.id is a Postgres uuid; validate the client-supplied
// developerPayload BEFORE it reaches a query, so a garbage value is a clean 409
// instead of a pg 22P02 error (which would surface as a 500).
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Public projection of a profile. Sprint 4: this read is unauthenticated (no
 * Yandex signature verification yet — deferred to the Payments task), so omit
 * fields a caller shouldn't be able to resolve by guessing a (non-secret)
 * yandexPlayerId:
 *  - paid state (`is_paid_citizen`, `citizenship_purchased_at`) — leaking "who paid".
 *  - `persistent_id` — the internal cross-device identity-linkage token.
 * TODO(payments): once Yandex-signature auth lands, these can be returned to the
 * verified owner of the profile.
 *
 * `nameChange` (task 0067) is merged in when the caller has one. It carries only
 * {status, requested_name, decided_at} — never the operator's rejection reason,
 * which would otherwise be readable by anyone who can guess a player id; that
 * text reaches the player through the citizen-gated inbox message instead.
 */
function toPublicProfile(
  profile: PlayerProfile,
  nameChange?: NameChangeState | null,
): PublicPlayerProfile {
  const { is_paid_citizen, citizenship_purchased_at, persistent_id, ...rest } =
    profile;
  void is_paid_citizen;
  void citizenship_purchased_at;
  void persistent_id;
  // Omit the key entirely (rather than sending null) when there is no request —
  // the field is `.optional()` on the shared schema, not nullable.
  return nameChange ? { ...rest, name_change: nameChange } : rest;
}

export function createApp(
  repo: ProfileRepo,
  payments?: PaymentsConfig,
  inbox?: InboxRepo,
  nameChange?: NameChangeRepo,
): Express {
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
  // The game runs on a different origin (geoconflict.ru / the Yandex Games iframe)
  // than this API (api.geoconflict.ru), so the browser needs an explicit CORS
  // header to read the response — without it the cross-origin fetch rejects and the
  // citizenship card silently degrades to a zero-XP state for every authorized
  // player. This read is unauthenticated, credential-free, and already public +
  // rate-limited, so `*` grants nothing a server-side request couldn't already get.
  // Runs BEFORE the limiter so even a 429 carries the header (the browser must be
  // allowed to read the status). Scoped to this public route ONLY — never the
  // internalAuth-gated /internal/* routes. Simple GET, so no OPTIONS preflight.
  const allowPublicCors: RequestHandler = (_req, res, next) => {
    res.set("Access-Control-Allow-Origin", "*");
    next();
  };
  /**
   * Name-change state for the profile projection (task 0067), or undefined when
   * the feature is unwired or its lookup fails.
   *
   * The failure is DELIBERATELY swallowed rather than propagated. `GET
   * /v1/profile` drives the whole citizenship card (XP, citizen badge, buy CTA);
   * letting a newly-added secondary subsystem 500 that read would take the card
   * down over a feature the player may not even be using. The cost of degrading
   * instead is small and bounded: the card shows no pending state, and a second
   * request is refused cleanly by the DB's one-pending index (409
   * `pending_exists`) rather than silently double-writing.
   */
  const readNameChangeState = async (
    yandexPlayerId: string,
  ): Promise<NameChangeState | undefined> => {
    if (nameChange === undefined) {
      return undefined;
    }
    try {
      return (await nameChange.getLatestState(yandexPlayerId)) ?? undefined;
    } catch (error) {
      log.error(`name-change state lookup failed: ${formatError(error)}`);
      return undefined;
    }
  };
  app.get(
    "/v1/profile",
    allowPublicCors,
    profileReadLimiter,
    async (req, res) => {
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
        res
          .status(200)
          .json(
            toPublicProfile(
              profile,
              await readNameChangeState(parsed.data.yandexPlayerId),
            ),
          );
      } catch (error) {
        log.error(`GET /v1/profile failed: ${formatError(error)}`);
        res.status(500).json({ error: "internal_error" });
      }
    },
  );

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
      const profile = await repo.upsertProfile(
        parsed.data.yandexPlayerId,
        parsed.data.persistentId,
      );
      res.status(200).json(toPublicProfile(profile));
    } catch (error) {
      if (error instanceof PersistentIdConflictError) {
        // persistentId already linked to another Yandex account. 409 (not 500)
        // so the caller (T6) can react; the relink/transfer policy is T6's call.
        // Log only the account (an expected, handled condition — no stack dump,
        // and never the raw persistentId, which the API also strips).
        log.warn(
          `upsert conflict for yandex_player_id=${error.yandexPlayerId}`,
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
        // The wire contract stays status-only: `citizenshipNewlyGranted` has no
        // consumer on the game server (the client detects the grant by re-fetching
        // the profile — task 0017), and the earned-inbox trigger fires inside the
        // repository's post-commit seam, not here.
        const outcome = await repo.creditMatchXp(
          item.gameId,
          item.yandexPlayerId,
          item.xpAwarded,
        );
        results.push({
          gameId: item.gameId,
          yandexPlayerId: item.yandexPlayerId,
          status: outcome.status,
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

  // ── Yandex payments (task 0019) ────────────────────────────────────────────
  // Cross-origin JSON POSTs from the game origin ⇒ preflighted. Scoped to
  // /v1/payments/* ONLY — never /internal/*. Runs before the limiter so even a
  // 429/503 carries the CORS header (the browser must be allowed to read it),
  // and answers OPTIONS with 204 before the limiter burns budget on preflights.
  const paymentsCors: RequestHandler = (req, res, next) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }
    next();
  };
  // Stricter than the profile read: purchases are rare, enumeration/abuse isn't.
  const paymentsLimiter = rateLimit({
    windowMs: 60_000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
  });
  // Fail CLOSED: without a configured secret nothing can be verified, so every
  // payments route (including /intent, which creates DB rows) is disabled.
  const paymentsSecret = payments?.yandexPaymentsSecret ?? "";
  // Captured once so the handlers below stay free of non-null assertions; the
  // paymentsEnabled middleware guarantees they never run without a config.
  const paymentsRepo = payments?.paymentsRepo;
  const paymentsEnabled: RequestHandler = (_req, res, next) => {
    if (paymentsRepo === undefined || paymentsSecret.length === 0) {
      res.status(503).json({ error: "payments_unavailable" });
      return;
    }
    next();
  };
  app.use("/v1/payments", paymentsCors, paymentsLimiter, paymentsEnabled);

  // Handlers are only registered with a live repo; without one the
  // paymentsEnabled middleware above 503s every /v1/payments request.
  if (paymentsRepo !== undefined) {
    // Create a purchase intent BEFORE the payment frame opens. yandexPlayerId is
    // client-asserted (same trust level ADR-103 accepted for crediting); the GRANT
    // is bound to the Yandex-signed payload via developerPayload → intent row, so
    // the worst abuse is paying real money to gift citizenship to a chosen id.
    app.post("/v1/payments/yandex/intent", async (req, res) => {
      const parsed = PurchaseIntentRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "bad_request" });
        return;
      }
      try {
        const intentId = await paymentsRepo.createIntent(
          parsed.data.yandexPlayerId,
          parsed.data.productId,
        );
        res.status(200).json({ intentId });
      } catch (error) {
        log.error(
          `POST /v1/payments/yandex/intent failed: ${formatError(error)}`,
        );
        res.status(500).json({ error: "internal_error" });
      }
    });

    // Complete a purchase: verify the Yandex HMAC, then grant. The idempotency
    // check runs BEFORE the intent-open check on purpose: an interrupted-consume
    // retry (grant done, intent used, consume failed) must return success + the
    // token again — not "intent_used".
    app.post("/v1/payments/yandex/complete", async (req, res) => {
      const parsed = PurchaseCompleteRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "bad_request" });
        return;
      }
      const verified = verifySignedPayload(
        parsed.data.signature,
        paymentsSecret,
      );
      if (verified === null || verified.purchases.length !== 1) {
        res.status(400).json({ error: "invalid_signature" });
        return;
      }
      const purchase = verified.purchases[0];
      try {
        const processed = await paymentsRepo.getProcessedPurchase(
          purchase.purchaseToken,
        );
        if (processed !== null) {
          res
            .status(200)
            .json({ success: true, purchaseToken: purchase.purchaseToken });
          return;
        }
        const intentId = purchase.developerPayload;
        if (intentId === null || !UUID_RE.test(intentId)) {
          res.status(409).json({ error: "unknown_intent" });
          return;
        }
        const intent = await paymentsRepo.findIntent(intentId);
        if (intent === null) {
          res.status(409).json({ error: "unknown_intent" });
          return;
        }
        if (intent.productId !== purchase.productId) {
          res.status(409).json({ error: "product_mismatch" });
          return;
        }
        if (intent.usedAt !== null) {
          // Same intent, DIFFERENT token (a replayed token returns above):
          // /complete refuses it here, but this is NOT a system-wide
          // guarantee — /reconcile below deliberately grants any-state
          // intents so interrupted purchases still land (accepted residual,
          // see the task's review.md). Each token is still a real paid
          // purchase and flags are idempotent, so no entitlement is gained.
          res.status(409).json({ error: "intent_used" });
          return;
        }
        await paymentsRepo.grantPaidPurchase({
          purchaseToken: purchase.purchaseToken,
          productId: purchase.productId,
          yandexPlayerId: intent.yandexPlayerId,
          intentId: intent.id,
          rawPayload: verified.rawPayload,
        });
        res
          .status(200)
          .json({ success: true, purchaseToken: purchase.purchaseToken });
      } catch (error) {
        log.error(
          `POST /v1/payments/yandex/complete failed: ${formatError(error)}`,
        );
        res.status(500).json({ error: "internal_error" });
      }
    });

    // Session-start reconciliation: verify the signed getPurchases() output and
    // grant anything still unprocessed, idempotently. Returns EVERY token that is
    // now safe to consume — including already-processed strays. Entries whose
    // developerPayload maps to no known intent are logged (token prefix only) and
    // skipped: nothing is ever granted off an unmapped payload.
    app.post("/v1/payments/yandex/reconcile", async (req, res) => {
      const parsed = PurchaseReconcileRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "bad_request" });
        return;
      }
      const verified = verifySignedPayload(
        parsed.data.signature,
        paymentsSecret,
      );
      if (verified === null) {
        res.status(400).json({ error: "invalid_signature" });
        return;
      }
      const processedTokens: string[] = [];
      const skip = (purchase: VerifiedPurchase, reason: string) => {
        log.warn(
          `reconcile skip (${reason}): token=${purchase.purchaseToken.slice(0, 8)}…`,
        );
      };
      try {
        for (const purchase of verified.purchases) {
          const processed = await paymentsRepo.getProcessedPurchase(
            purchase.purchaseToken,
          );
          if (processed !== null) {
            processedTokens.push(purchase.purchaseToken);
            continue;
          }
          const intentId = purchase.developerPayload;
          if (intentId === null || !UUID_RE.test(intentId)) {
            skip(purchase, "unmapped_payload");
            continue;
          }
          const intent = await paymentsRepo.findIntent(intentId);
          if (intent === null) {
            skip(purchase, "unknown_intent");
            continue;
          }
          if (intent.productId !== purchase.productId) {
            skip(purchase, "product_mismatch");
            continue;
          }
          // Any intent state: reconcile exists precisely to land purchases whose
          // /complete never arrived — grantPaidPurchase is idempotent by token.
          await paymentsRepo.grantPaidPurchase({
            purchaseToken: purchase.purchaseToken,
            productId: purchase.productId,
            yandexPlayerId: intent.yandexPlayerId,
            intentId: intent.id,
            rawPayload: verified.rawPayload,
          });
          processedTokens.push(purchase.purchaseToken);
        }
        res.status(200).json({ processedTokens });
      } catch (error) {
        log.error(
          `POST /v1/payments/yandex/reconcile failed: ${formatError(error)}`,
        );
        res.status(500).json({ error: "internal_error" });
      }
    });
  }

  // ── Personal inbox (task 0012) ─────────────────────────────────────────────
  // Player-facing reads/writes are cross-origin (game origin → api.*), so GET
  // is simple but PATCH+JSON is preflighted: answer OPTIONS with 204 before the
  // limiter burns budget, set the CORS headers before the limiter so even a
  // 429/503 is readable. Scoped to /v1/messages ONLY — never /internal/*.
  const inboxCors: RequestHandler = (req, res, next) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, PATCH");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }
    next();
  };
  // Without an inbox repository (tests / tools) the player routes fail closed.
  const inboxEnabled: RequestHandler = (_req, res, next) => {
    if (inbox === undefined) {
      res.status(503).json({ error: "inbox_unavailable" });
      return;
    }
    next();
  };
  // The profile-read limiter is SHARED (owner-ruled D1): the card's profile
  // fetch + the inbox fetch + bell-open refetches sit far under 60/min.
  app.use("/v1/messages", inboxCors, profileReadLimiter, inboxEnabled);

  if (inbox !== undefined) {
    // A citizen's messages, newest first. 403 `not_citizen` covers BOTH a
    // non-citizen and a missing profile (the gate runs in SQL on every call,
    // never on client-side citizenship state).
    app.get("/v1/messages", async (req, res) => {
      const yandexPlayerId = resolvePlayerId(req);
      if (yandexPlayerId === null) {
        res.status(400).json({ error: "bad_request" });
        return;
      }
      try {
        const outcome = await inbox.listMessages(yandexPlayerId);
        if (outcome.status === "not_citizen") {
          res.status(403).json({ error: "not_citizen" });
          return;
        }
        res.status(200).json({ messages: outcome.messages });
      } catch (error) {
        log.error(`GET /v1/messages failed: ${formatError(error)}`);
        res.status(500).json({ error: "internal_error" });
      }
    });

    // Mark all (no `ids`) or specific messages read. Scoped in SQL to the
    // caller's own id; idempotent, so a re-open is a harmless no-op.
    app.patch("/v1/messages/read", async (req, res) => {
      const parsed = MarkReadRequestSchema.safeParse(req.body);
      const yandexPlayerId = parsed.success ? resolvePlayerId(req) : null;
      if (!parsed.success || yandexPlayerId === null) {
        res.status(400).json({ error: "bad_request" });
        return;
      }
      try {
        const outcome = await inbox.markRead(yandexPlayerId, parsed.data.ids);
        if (outcome.status === "not_citizen") {
          res.status(403).json({ error: "not_citizen" });
          return;
        }
        res.status(200).json({ updated: outcome.updated });
      } catch (error) {
        log.error(`PATCH /v1/messages/read failed: ${formatError(error)}`);
        res.status(500).json({ error: "internal_error" });
      }
    });
  }

  // Internal, service-authenticated send — the brief's "POST /admin/player-message"
  // (path per owner-ruled D2). Called by server-side flows (today: the
  // citizenship seams send DIRECTLY through InboxRepository, not over HTTP; the
  // name-change task will call this endpoint or the repo) and for manual /
  // admin sends. Two auth layers: nginx `location /internal/` IP allowlist +
  // this bearer token (InternalAuth.ts). Never CORS-enabled.
  //
  //   Request (JSON) — EITHER a template OR literal content:
  //     { "yandexPlayerId": "…", "templateKey": "citizenship_earned",
  //       "templateParams": { "name": "…" } }          // rendered client-side, localised
  //     { "yandexPlayerId": "…", "title": "…", "body": "…" }   // literal, ≤200 / ≤4000 chars
  //   Responses: 200 { "id": <message id> } · 400 bad_request (schema / neither
  //   template nor title+body) · 401 unauthorized · 404 no_profile (no
  //   player_profiles row — the recipient has never joined authenticated) ·
  //   503 inbox_unavailable · 500 internal_error.
  //   Example:
  //     curl -sS -X POST "$PROFILE_API_URL/internal/v1/messages/send" \
  //       -H "Authorization: Bearer $PROFILE_INTERNAL_TOKEN" \
  //       -H "Content-Type: application/json" \
  //       -d '{"yandexPlayerId":"<id>","title":"Hello","body":"Welcome aboard."}'
  app.post("/internal/v1/messages/send", internalAuth, async (req, res) => {
    if (inbox === undefined) {
      res.status(503).json({ error: "inbox_unavailable" });
      return;
    }
    const parsed = SendMessageRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "bad_request" });
      return;
    }
    try {
      const outcome = await inbox.sendMessage(parsed.data);
      if (outcome.status === "no_profile") {
        res.status(404).json({ error: "no_profile" });
        return;
      }
      res.status(200).json({ id: outcome.id });
    } catch (error) {
      // Never log the message body — only the failure.
      log.error(
        `POST /internal/v1/messages/send failed: ${formatError(error)}`,
      );
      res.status(500).json({ error: "internal_error" });
    }
  });

  // ── Citizen name change (task 0067) ────────────────────────────────────────
  // Player-facing JSON POSTs from the game origin ⇒ preflighted, same shape as
  // inboxCors. Scoped to the two /v1/profile/name-change-* paths ONLY — never
  // /internal/*, and deliberately NOT mounted on /v1/profile itself (that would
  // put a preflight handler in front of the plain GET).
  const nameChangeCors: RequestHandler = (req, res, next) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }
    next();
  };
  // Stricter than the shared 60/min profile-read limiter — a name change is a
  // rare, human-paced action — but deliberately NOT as tight as it first looks
  // like it should be. Two facts set the number:
  //   * This is per-IP, and Russian mobile carriers CGNAT thousands of players
  //     behind one address. Rejected probes (403/400) burn the same budget, so
  //     too low a cap locks real citizens out for a minute over someone else's
  //     traffic.
  //   * Operator Telegram spam is NOT bounded by this limiter anyway — it is
  //     bounded by the one-pending partial unique index: a second request from
  //     the same player 409s WITHOUT inserting or notifying. So the notification
  //     volume is capped by distinct citizen accounts, not by request rate.
  // 30/min therefore stays 2x stricter than the profile read while leaving a
  // shared-IP citizen room to submit, mistype, retry and cancel.
  const nameChangeLimiter = rateLimit({
    windowMs: 60_000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
  });
  // Without a repository (tests / tools) the player routes fail closed — the
  // `inboxEnabled` pattern.
  const nameChangeEnabled: RequestHandler = (_req, res, next) => {
    if (nameChange === undefined) {
      res.status(503).json({ error: "name_change_unavailable" });
      return;
    }
    next();
  };
  for (const path of [
    "/v1/profile/name-change-request",
    "/v1/profile/name-change-cancel",
  ]) {
    app.use(path, nameChangeCors, nameChangeLimiter, nameChangeEnabled);
  }

  if (nameChange !== undefined) {
    // Submit a request. 403 `not_citizen` covers BOTH a non-citizen and a
    // missing profile — the gate runs in SQL on every call, never on
    // client-side citizenship state (brief step 1: a direct POST from a
    // non-citizen must be rejected server-side).
    app.post("/v1/profile/name-change-request", async (req, res) => {
      const parsed = NameChangeRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "bad_request" });
        return;
      }
      try {
        const outcome = await nameChange.requestNameChange(
          parsed.data.yandexPlayerId,
          parsed.data.requestedName,
        );
        switch (outcome.status) {
          case "not_citizen":
            res.status(403).json({ error: "not_citizen" });
            return;
          case "invalid":
            // 400 + the broken rule, so the card can show the SAME message the
            // in-game username input shows for that rule.
            res
              .status(400)
              .json({ error: "invalid", violation: outcome.violation });
            return;
          case "name_taken":
            res.status(409).json({ error: "name_taken" });
            return;
          case "pending_exists":
            res.status(409).json({ error: "pending_exists" });
            return;
          default:
            res.status(200).json({ status: "ok" });
            return;
        }
      } catch (error) {
        log.error(
          `POST /v1/profile/name-change-request failed: ${formatError(error)}`,
        );
        res.status(500).json({ error: "internal_error" });
      }
    });

    // Withdraw your OWN pending request (owner amendment 2). This is what makes
    // the ADR-103 client-asserted-id posture survivable here: without it, anyone
    // who knows a citizen's non-secret id could park a pending request and
    // permanently block that citizen from ever requesting a name change, with no
    // way for the victim to clear it.
    app.post("/v1/profile/name-change-cancel", async (req, res) => {
      const parsed = NameChangeCancelRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "bad_request" });
        return;
      }
      try {
        const outcome = await nameChange.cancelNameChange(
          parsed.data.yandexPlayerId,
        );
        if (outcome.status === "not_citizen") {
          res.status(403).json({ error: "not_citizen" });
          return;
        }
        if (outcome.status === "no_pending") {
          res.status(404).json({ error: "no_pending" });
          return;
        }
        res.status(200).json({ status: "ok" });
      } catch (error) {
        log.error(
          `POST /v1/profile/name-change-cancel failed: ${formatError(error)}`,
        );
        res.status(500).json({ error: "internal_error" });
      }
    });
  }

  // Internal, service-authenticated moderation decision — the brief's "minimal
  // admin endpoint", same PROFILE_INTERNAL_TOKEN posture as /internal/v1/credit.
  // No moderation UI exists by owner ruling (a); the operator is notified of new
  // pending requests over Telegram and decides with a curl. Never CORS-enabled.
  //
  //   Request (JSON):
  //     { "yandexPlayerId": "…", "decision": "approve", "expectedName": "…" }
  //     { "yandexPlayerId": "…", "decision": "reject", "reason": "…" }  // reason REQUIRED
  //   `expectedName` is OPTIONAL but is what the Telegram notification's
  //   ready-to-paste command sends, and it is what makes deciding from that
  //   message safe — see NameChangeContract. Omitting it decides on whatever is
  //   pending right now, which is the pre-existing behavior.
  //   Responses: 200 { "status": "ok" } · 400 bad_request (schema, or a reject
  //   with no/blank reason) · 401 unauthorized · 404 no_pending · 409 name_taken
  //   (the name was claimed between request and approval — the request stays
  //   PENDING and can be retried or rejected) · 409 name_mismatch (the pending
  //   name is not the one you passed; nothing was applied, and the response
  //   carries `pending_name` so the command can be re-issued) · 503
  //   name_change_unavailable · 500 internal_error.
  //   Example:
  //     curl -sS -X POST "$PROFILE_API_URL/internal/v1/name-change/decide" \
  //       -H "Authorization: Bearer $PROFILE_INTERNAL_TOKEN" \
  //       -H "Content-Type: application/json" \
  //       -d '{"yandexPlayerId":"<id>","decision":"approve","expectedName":"<name>"}'
  app.post(
    "/internal/v1/name-change/decide",
    internalAuth,
    async (req, res) => {
      if (nameChange === undefined) {
        res.status(503).json({ error: "name_change_unavailable" });
        return;
      }
      const parsed = NameChangeDecisionRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "bad_request" });
        return;
      }
      try {
        const outcome = await nameChange.decideNameChange(
          parsed.data.yandexPlayerId,
          parsed.data.decision,
          parsed.data.reason,
          parsed.data.expectedName,
        );
        if (outcome.status === "no_pending") {
          res.status(404).json({ error: "no_pending" });
          return;
        }
        if (outcome.status === "name_taken") {
          res.status(409).json({ error: "name_taken" });
          return;
        }
        if (outcome.status === "name_mismatch") {
          // The pending name rides along: this route is internal-auth'd, and the
          // string is already public on GET /v1/profile, so it leaks nothing and
          // saves the operator a second lookup.
          res.status(409).json({
            error: "name_mismatch",
            pending_name: outcome.pendingName,
          });
          return;
        }
        res.status(200).json({ status: "ok" });
      } catch (error) {
        // Never log the operator's reason text — only the failure.
        log.error(
          `POST /internal/v1/name-change/decide failed: ${formatError(error)}`,
        );
        res.status(500).json({ error: "internal_error" });
      }
    },
  );

  return app;
}
