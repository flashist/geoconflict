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
  PLATFORM_YANDEX_GAMES,
  type Platform,
  type ResolveSource,
  type ResolvedPlayer,
} from "./PlayerIdentityRepository";
import type { CreditOutcome } from "./PlayerProfileRepository";
import { verifySignedPayload, type VerifiedPurchase } from "./YandexSignature";

const log = logger.child({ comp: "routes" });

/**
 * The repository surface the routes depend on (structural — eases mocking).
 * Server.ts binds it over PlayerProfileRepository + PlayerIdentityRepository.
 * Everything is keyed by the INTERNAL player id (task 0270, ADR-113) except the
 * two identity lookups, which are the only way in from a platform id.
 */
export interface ProfileRepo {
  ping(): Promise<void>;
  getProfile(playerId: string): Promise<PlayerProfile | null>;
  creditMatchXp(
    gameId: string,
    playerId: string,
    xpAwarded: number,
  ): Promise<CreditOutcome>;
  findPlayerByIdentity(
    platform: Platform,
    platformUserId: string,
  ): Promise<string | null>;
  resolveOrCreatePlayer(
    platform: Platform,
    platformUserId: string,
    source: ResolveSource,
  ): Promise<ResolvedPlayer>;
}

/** The payments-repository surface the routes depend on (structural — eases mocking). */
export interface PaymentsRepo {
  createIntent(playerId: string, productId: string): Promise<string>;
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
  listMessages(playerId: string): Promise<ListOutcome>;
  markRead(playerId: string, ids?: readonly number[]): Promise<MarkReadOutcome>;
  sendMessage(input: SendMessageInput): Promise<SendOutcome>;
}

// The legacy caller shape every player-facing route still accepts (task 0270
// keeps request shapes): the client-asserted Yandex id, on the query for GET and
// in the body otherwise.
const CallerSchema = z.object({
  yandexPlayerId: z.string().min(1).max(128),
});

/** The name-change-repository surface the routes depend on (structural — eases mocking). */
export interface NameChangeRepo {
  requestNameChange(
    playerId: string,
    requestedName: string,
  ): Promise<RequestOutcome>;
  cancelNameChange(playerId: string): Promise<CancelOutcome>;
  decideNameChange(
    playerId: string,
    decision: "approve" | "reject",
    reason?: string,
    expectedName?: string,
  ): Promise<DecideOutcome>;
  getLatestState(playerId: string): Promise<NameChangeState | null>;
}

/** Who is asking, as far as a player-facing route can tell. */
type CallerResolution =
  | { status: "bad_request" }
  | { status: "unknown" }
  | { status: "ok"; playerId: string };

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
 * The profile carries no identity at all (task 0270): neither the internal player
 * id nor a platform id can reach a client through it (ADR-113 hard rule).
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
  const { is_paid_citizen, citizenship_purchased_at, ...rest } = profile;
  void is_paid_citizen;
  void citizenship_purchased_at;
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
  /**
   * The ONE place every player-facing route learns who is asking (task 0012
   * owner-ruled D1; task 0270 moved it onto the internal player id). It reads the
   * CLIENT-asserted `yandexPlayerId` (query on GET, body otherwise) — the trust
   * level ADR-103 accepted — and maps it to a player FIND-ONLY: a public request
   * can never create a player. `unknown` lets each route keep the answer it gave
   * an unknown player before (404 / 403). Re-raise: the login token (S2) and any
   * signature check drop in HERE and nowhere else.
   */
  const resolveCaller = async (req: Request): Promise<CallerResolution> => {
    const source = req.method === "GET" ? req.query : req.body;
    const parsed = CallerSchema.safeParse(source);
    if (!parsed.success) {
      return { status: "bad_request" };
    }
    const playerId = await repo.findPlayerByIdentity(
      PLATFORM_YANDEX_GAMES,
      parsed.data.yandexPlayerId,
    );
    return playerId === null
      ? { status: "unknown" }
      : { status: "ok", playerId };
  };

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
    playerId: string,
  ): Promise<NameChangeState | undefined> => {
    if (nameChange === undefined) {
      return undefined;
    }
    try {
      return (await nameChange.getLatestState(playerId)) ?? undefined;
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
      try {
        const caller = await resolveCaller(req);
        if (caller.status === "bad_request") {
          res.status(400).json({ error: "bad_request" });
          return;
        }
        const profile =
          caller.status === "ok"
            ? await repo.getProfile(caller.playerId)
            : null;
        if (caller.status !== "ok" || !profile) {
          res.status(404).json({ error: "not_found" });
          return;
        }
        res
          .status(200)
          .json(
            toPublicProfile(
              profile,
              await readNameChangeState(caller.playerId),
            ),
          );
      } catch (error) {
        log.error(`GET /v1/profile failed: ${formatError(error)}`);
        res.status(500).json({ error: "internal_error" });
      }
    },
  );

  // Internal, service-authenticated find-or-create. The game server calls this on
  // a player's first authenticated join so a player exists before any crediting.
  // The ONLY route that creates a player in S1 (task 0270); S3 replaces it with
  // /internal/v1/players/resolve. `persistentId` is still required by the wire
  // schema (the deployed game server sends it) and is ignored. Never sets xp,
  // citizenship, or paid flags. Returns the public projection of the live row.
  app.post("/internal/v1/profile/upsert", internalAuth, async (req, res) => {
    const parsed = ProfileUpsertRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "bad_request" });
      return;
    }
    try {
      const resolved = await repo.resolveOrCreatePlayer(
        PLATFORM_YANDEX_GAMES,
        parsed.data.yandexPlayerId,
        "game_server",
      );
      res.status(200).json(toPublicProfile(resolved.profile));
    } catch (error) {
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
        // S1 keeps the Yandex-keyed wire shape (S3 moves it to playerId): map the
        // id to a player FIND-ONLY. An unknown identity is `no_profile` with no
        // write — the game server upserts and re-credits on that status.
        const playerId = await repo.findPlayerByIdentity(
          PLATFORM_YANDEX_GAMES,
          item.yandexPlayerId,
        );
        if (playerId === null) {
          results.push({
            gameId: item.gameId,
            yandexPlayerId: item.yandexPlayerId,
            status: "no_profile",
          });
          continue;
        }
        // The wire contract stays status-only: `citizenshipNewlyGranted` has no
        // consumer on the game server (the client detects the grant by re-fetching
        // the profile — task 0017), and the earned-inbox trigger fires inside the
        // repository's post-commit seam, not here.
        const outcome = await repo.creditMatchXp(
          item.gameId,
          playerId,
          item.xpAwarded,
        );
        results.push({
          gameId: item.gameId,
          yandexPlayerId: item.yandexPlayerId,
          status: outcome.status,
        });
      } catch (error) {
        // No player or platform id in the line (ADR-113 / design §6).
        log.error(`credit failed for ${item.gameId}: ${formatError(error)}`);
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
    // The caller is resolved FIND-ONLY (task 0270): an unknown player gets 404
    // `not_found` instead of a silently created profile (design §4 — accepted
    // while the card switch is off; the login token makes the player exist).
    app.post("/v1/payments/yandex/intent", async (req, res) => {
      const parsed = PurchaseIntentRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "bad_request" });
        return;
      }
      try {
        const caller = await resolveCaller(req);
        if (caller.status !== "ok") {
          res.status(404).json({ error: "not_found" });
          return;
        }
        const intentId = await paymentsRepo.createIntent(
          caller.playerId,
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
          playerId: intent.playerId,
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
            playerId: intent.playerId,
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
      try {
        const caller = await resolveCaller(req);
        if (caller.status === "bad_request") {
          res.status(400).json({ error: "bad_request" });
          return;
        }
        if (caller.status === "unknown") {
          res.status(403).json({ error: "not_citizen" });
          return;
        }
        const outcome = await inbox.listMessages(caller.playerId);
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
      if (!parsed.success) {
        res.status(400).json({ error: "bad_request" });
        return;
      }
      try {
        const caller = await resolveCaller(req);
        if (caller.status === "bad_request") {
          res.status(400).json({ error: "bad_request" });
          return;
        }
        if (caller.status === "unknown") {
          res.status(403).json({ error: "not_citizen" });
          return;
        }
        const outcome = await inbox.markRead(caller.playerId, parsed.data.ids);
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
  //   Request (JSON) — addressed by the INTERNAL playerId (a uuid, task 0270), never
  //   a Yandex id. An operator holding only a Yandex id looks the player up first
  //   (player_identities on the box). EITHER a template OR literal content:
  //     { "playerId": "…", "templateKey": "citizenship_earned",
  //       "templateParams": { "name": "…" } }          // rendered client-side, localised
  //     { "playerId": "…", "title": "…", "body": "…" }   // literal, ≤200 / ≤4000 chars
  //   Responses: 200 { "id": <message id> } · 400 bad_request (schema / not a uuid /
  //   neither template nor title+body) · 401 unauthorized · 404 no_profile (no
  //   players row for that id) ·
  //   503 inbox_unavailable · 500 internal_error.
  //   Example:
  //     curl -sS -X POST "$PROFILE_API_URL/internal/v1/messages/send" \
  //       -H "Authorization: Bearer $PROFILE_INTERNAL_TOKEN" \
  //       -H "Content-Type: application/json" \
  //       -d '{"playerId":"<player uuid>","title":"Hello","body":"Welcome aboard."}'
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
        const caller = await resolveCaller(req);
        if (caller.status !== "ok") {
          res.status(403).json({ error: "not_citizen" });
          return;
        }
        const outcome = await nameChange.requestNameChange(
          caller.playerId,
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
        const caller = await resolveCaller(req);
        if (caller.status !== "ok") {
          res.status(403).json({ error: "not_citizen" });
          return;
        }
        const outcome = await nameChange.cancelNameChange(caller.playerId);
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
  //   Request (JSON) — addressed by the INTERNAL playerId (a uuid, task 0270), which
  //   is what the Telegram notification carries; Yandex ids no longer go there:
  //     { "playerId": "…", "decision": "approve", "expectedName": "…" }
  //     { "playerId": "…", "decision": "reject", "reason": "…" }  // reason REQUIRED
  //   `expectedName` is OPTIONAL but is what the Telegram notification's
  //   ready-to-paste command sends, and it is what makes deciding from that
  //   message safe — see NameChangeContract. Omitting it decides on whatever is
  //   pending right now, which is the pre-existing behavior.
  //   Responses: 200 { "status": "ok" } · 400 bad_request (schema, not a uuid, or a
  //   reject with no/blank reason) · 401 unauthorized · 404 no_pending · 409 name_taken
  //   (the name was claimed between request and approval — the request stays
  //   PENDING and can be retried or rejected) · 409 name_mismatch (the pending
  //   name is not the one you passed; nothing was applied, and the response
  //   carries `pending_name` so the command can be re-issued) · 503
  //   name_change_unavailable · 500 internal_error.
  //   Example:
  //     curl -sS -X POST "$PROFILE_API_URL/internal/v1/name-change/decide" \
  //       -H "Authorization: Bearer $PROFILE_INTERNAL_TOKEN" \
  //       -H "Content-Type: application/json" \
  //       -d '{"playerId":"<player uuid>","decision":"approve","expectedName":"<name>"}'
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
          parsed.data.playerId,
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
