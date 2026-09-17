// HTTP routes for the profile backend, wired as a factory so the app can be built
// with a real or mocked repository and WITHOUT binding a port (Server.ts owns
// listen()). This is the testable seam — route tests import createApp, never Server.

import express, {
  type ErrorRequestHandler,
  type Express,
  type Request,
  type RequestHandler,
  type Response,
} from "express";
import rateLimit from "express-rate-limit";
import {
  CreditBatchRequestSchema,
  PlayerResolveRequestSchema,
} from "../core/profile/CreditContract";
import type {
  CreditResult,
  PlayerResolveResponse,
} from "../core/profile/CreditContract";
import {
  MarkReadRequestSchema,
  SendMessageRequestSchema,
} from "../core/profile/InboxContract";
import {
  LoginRequestSchema,
  type LoginResponse,
  type SessionErrorCode,
} from "../core/profile/LoginContract";
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
import {
  ALERT_WEBHOOK_PATH,
  createAlertRelay,
  type AlertRelayConfig,
} from "./AlertRelay";
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
  type Platform,
  type ResolveSource,
  type ResolvedPlayer,
} from "./PlayerIdentityRepository";
import type { CreditOutcome, XpGrantKind } from "./PlayerProfileRepository";
import {
  isUsableSessionSecret,
  signSessionToken,
  verifySessionToken,
} from "./SessionToken";
import {
  metricPlatform,
  noopProfileMetrics,
  statusClassOf,
  type LoginOutcome,
  type MetricPlatform,
  type ProfileMetrics,
  type SessionRejectedReason,
} from "./Telemetry";
import { verifySignedPayload, type VerifiedPurchase } from "./YandexSignature";

const log = logger.child({ comp: "routes" });

/**
 * The repository surface the routes depend on (structural — eases mocking).
 * Server.ts binds it over PlayerProfileRepository + PlayerIdentityRepository.
 * Everything is keyed by the INTERNAL player id (task 0270, ADR-113) except the
 * two identity lookups, which are the only way in from a platform id.
 *
 * ⚠️ `findPlayerByIdentity` is no longer called by ANY route since task 0273 (S4)
 * removed the legacy fallback — `POST /v1/login` and the internal resolve route both
 * use `resolveOrCreatePlayer`. Task 0274 (S5)'s creation switch turned out to need a
 * find-only lookup that also returns the PROFILE, which is `resolveExistingPlayer`
 * below, not this id-only one. It stays declared because the route tests assert it is
 * never called (the regression guard for the removal).
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
  /**
   * Find-only, profile included (task 0274). `POST /v1/login` uses this INSTEAD of
   * resolveOrCreatePlayer while the creation switch is off, so the switch cannot be
   * defeated by the route. It must never insert.
   */
  resolveExistingPlayer(
    platform: Platform,
    platformUserId: string,
  ): Promise<ResolvedPlayer | null>;
  resolveOrCreatePlayer(
    platform: Platform,
    platformUserId: string,
    source: ResolveSource,
  ): Promise<ResolvedPlayer>;
  /** Whether a one-off XP grant of `kind` exists for the player (task 0271). */
  hasXpGrant(playerId: string, kind: XpGrantKind): Promise<boolean>;
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

/**
 * Login-session wiring for createApp (task 0271). Omitted, or a secret that
 * `isUsableSessionSecret` refuses ⇒ POST /v1/login and every Bearer request answer
 * 503 `session_unavailable`. Since task 0273 (S4) there is no fallback behind it:
 * without a usable secret, no player-facing route can identify anyone.
 */
export interface SessionConfig {
  secret: string;
}

/**
 * Everything task 0274 (S5) adds to the app, both optional so every existing caller
 * and every existing test keeps its behaviour unchanged.
 *
 * `loginCreateEnabled` defaults to TRUE — fail-open by owner ruling D3: pausing
 * creation is an operator's deliberate act during an incident, never a default and
 * never the consequence of a typo.
 */
export interface AppOptions {
  loginCreateEnabled?: boolean;
  metrics?: ProfileMetrics;
  /** Task 0277. Absent ⇒ the alert webhook route is not mounted at all. */
  alertRelay?: AlertRelayConfig;
}

const BEARER_PREFIX = "Bearer ";

/** The route label for a request that matched no route. Bounded on purpose. */
const UNMATCHED_ROUTE = "unmatched";

// Chromium caps a cached preflight at 7200 s; Firefox allows more, so this is the
// largest value every target browser honours.
const CORS_MAX_AGE_SECONDS = 7200;

// Postgres `foreign_key_violation`: a Bearer token names a player that no longer
// exists (e.g. after a DB restore without rotating the session key) — token routes
// skip the DB lookup, so the insert is the first thing to notice.
const PG_FOREIGN_KEY_VIOLATION = "23503";

function isForeignKeyViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: string }).code === PG_FOREIGN_KEY_VIOLATION
  );
}

/**
 * The ONE CORS shape for every public (player-facing) route. The game runs on a
 * different origin (geoconflict.ru / the Yandex Games iframe) than this API, so the
 * browser needs these headers to read any response — including a 401/429/503, which
 * is why callers mount this BEFORE the limiter and before any auth answer.
 * `Authorization` makes every Bearer request preflighted: OPTIONS is answered 204
 * right here, before a limiter can spend budget on it or a repository is touched,
 * and `Max-Age` keeps a session's preflights to one per route per cache window.
 * `*` grants nothing a server-side request couldn't already get: no cookies, and
 * the token travels in a header the page itself sets. NEVER mounted on /internal/*.
 */
function publicCors(methods: string): RequestHandler {
  return (req, res, next) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", methods);
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.set("Access-Control-Max-Age", String(CORS_MAX_AGE_SECONDS));
    if (req.method === "OPTIONS") {
      res.status(204).end();
      return;
    }
    next();
  };
}

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

/**
 * Who is asking, as far as a player-facing route can tell. Since task 0273 (S4)
 * there is exactly ONE way to be `ok`: a valid session token. The `via`
 * discriminator that recorded which path resolved the caller went with the legacy
 * fallback — there is nothing left to distinguish, and task 0274 (S5) must NOT
 * implement a `legacy_fallback_used` metric reason against it.
 *
 * ⚠️ `ok` is NOT a proven owner: the token is `vfy:false` (anyone asserting an id
 * gets one), so paid state (0250) must never trust it.
 */
type CallerResolution = { status: "ok"; playerId: string } | CallerFailure;

type CallerFailure =
  | {
      status: "unauthorized";
      error: Extract<SessionErrorCode, "session_expired" | "session_invalid">;
    }
  | { status: "session_unavailable" };

/**
 * Answers the session failures every route shares (401 / 503) and reports whether
 * it did. When it reports false the caller is `ok`, so each route goes straight to
 * its own work; a token whose player is gone or not a citizen still gets that
 * route's own answer (404 profile & intent, 403 inbox & name change).
 */
function sendCallerFailure(
  res: Response,
  caller: CallerResolution,
): caller is CallerFailure {
  if (caller.status === "unauthorized") {
    res.status(401).json({ error: caller.error });
    return true;
  }
  if (caller.status === "session_unavailable") {
    res.status(503).json({ error: "session_unavailable" });
    return true;
  }
  return false;
}

// purchase_intents.id is a Postgres uuid; validate the client-supplied
// developerPayload BEFORE it reaches a query, so a garbage value is a clean 409
// instead of a pg 22P02 error (which would surface as a 500).
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Public projection of a profile. Sprint 4: this read needs a session token but the
 * token is `vfy:false` (no Yandex signature verification yet — deferred to 0267), so
 * anyone can still mint one for an id they merely assert. Keep omitting the fields a
 * caller shouldn't be able to resolve that way:
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

// ── Error handler (task 0271) — createApp registers it LAST ───────────────
// Replaces Express's default handler, which (a) prints `err.stack` to stderr —
// and on Node 24 a JSON.parse message quotes part of the request body, so a
// malformed login/legacy body put a fragment of a Yandex id into the container
// log — and (b) answers with an HTML stack page, because the profile image sets
// no NODE_ENV.
//
//  * A CLIENT error keeps its own 4xx (review R1): body-parser tags every error it
//    raises with `status`/`statusCode` — 400 malformed/aborted, 413 too large,
//    415 unsupported charset or Content-Encoding. The caller controls these, so
//    they are answered as JSON and NOT logged (they are not server faults, and S5
//    counts 5xx).
//  * Anything else is a genuine unknown fault: 500, logged by the error's NAME
//    only — no message, no query string, no body.
//  * Headers already sent (review R4/R5): log by NAME and destroy the connection
//    here, so a half-written body can never look complete. NOT next(err): Express's
//    final handler would print `err.stack` (message included) outside `test`.
//    No route reaches this today (each answers in one res.json inside try/catch).
export const profileErrorHandler: ErrorRequestHandler = (
  err,
  req,
  res,
  _next,
) => {
  if (res.headersSent) {
    logUnhandledError(req, err);
    res.destroy();
    return;
  }
  // A public route's error must stay readable cross-origin; /internal/* never gets CORS.
  // Task 0276: req.path keeps the request's ORIGINAL case, so compare lowercased —
  // `/INTERNAL/v1/credit` is an internal path too. `toLowerCase`, never
  // `toLocaleLowerCase`: the latter is locale-dependent (Turkish dotless ı) and
  // would make this check depend on the box's locale.
  // Defensive only since `case sensitive routing` (above) 404s a case variant before
  // the body parser can throw — kept so this stays correct if that is ever reverted.
  const lowerPath = req.path.toLowerCase();
  if (lowerPath !== "/internal" && !lowerPath.startsWith("/internal/")) {
    res.set("Access-Control-Allow-Origin", "*");
  }
  const status = clientErrorStatus(err);
  if (status !== null) {
    res.status(status).json({ error: clientErrorCode(status) });
    return;
  }
  logUnhandledError(req, err);
  res.status(500).json({ error: "internal_error" });
};

/** The one log line for a server fault: method, path and the error's NAME — never its message. */
function logUnhandledError(req: Request, err: unknown): void {
  const name = err instanceof Error ? err.name : typeof err;
  log.error(`unhandled error on ${req.method} ${req.path}: ${name}`);
}

/** The error's own 4xx (`status`, else `statusCode`), or null when it carries none. */
function clientErrorStatus(err: unknown): number | null {
  if (typeof err !== "object" || err === null) {
    return null;
  }
  const { status, statusCode } = err as {
    status?: unknown;
    statusCode?: unknown;
  };
  const candidate = status ?? statusCode;
  return typeof candidate === "number" &&
    Number.isInteger(candidate) &&
    candidate >= 400 &&
    candidate < 500
    ? candidate
    : null;
}

function clientErrorCode(status: number): string {
  if (status === 413) {
    return "payload_too_large";
  }
  if (status === 415) {
    return "unsupported_media_type";
  }
  return "bad_request";
}

export function createApp(
  repo: ProfileRepo,
  payments?: PaymentsConfig,
  inbox?: InboxRepo,
  nameChange?: NameChangeRepo,
  session?: SessionConfig,
  options?: AppOptions,
): Express {
  // Fail CLOSED: an unset or short secret disables login and every Bearer request.
  const sessionSecret = session?.secret ?? "";
  const sessionEnabled = isUsableSessionSecret(sessionSecret);
  // Task 0274 (S5). Both default to "as before": creation on, nothing recorded.
  const metrics = options?.metrics ?? noopProfileMetrics;
  const loginCreateEnabled = options?.loginCreateEnabled ?? true;
  // Task 0277. Undefined ⇒ no route, which is how every existing test and caller
  // keeps its behaviour unchanged without opting out of anything.
  const alertRelayConfig = options?.alertRelay;

  /**
   * The ONE place every player-facing route learns who is asking (task 0012
   * owner-ruled D1; 0270 moved it onto the internal player id; 0271 put the login
   * session in front; 0273 made it the only path). Any future signature check
   * (0267) drops in HERE and nowhere else — which is why this stays `async`.
   *
   * The `Authorization` header decides, alone. A valid Bearer token is the caller,
   * with NO database read; an expired or invalid one is a 401; no header at all is
   * a 401 too (owner ruling D4).
   *
   * ⚠️ Task 0273 (S4), owner ruling D1: the LEGACY client-asserted `yandexPlayerId`
   * (query on GET, body otherwise) is GONE. It is not read, not parsed and not
   * looked up — a caller still sending one gets the same 401 as a caller sending
   * nothing, and `repo.findPlayerByIdentity` is no longer called by any route. Do
   * NOT reinstate it: the client's `POST /v1/login` is the only way in, and the
   * whole point is that Yandex ids never travel in a URL or a body again.
   */
  // Task 0274: ONE funnel for every 401, so no Bearer route can be added later that
  // refuses a caller without it being counted. ⛔ There are exactly two reasons —
  // `expired` and `invalid`. There is NO `legacy_fallback_used`: task 0273 deleted
  // the branch it would have counted, and S5 must not invent one.
  //
  // The metric REASON and the wire ANSWER are deliberately not the same thing
  // (owner ruling, review R9). On the wire, "no header" and "a header that did not
  // verify" are both `401 session_invalid` — a caller learns nothing either way. In
  // the metric they are `absent` and `invalid`, because folding them together buried
  // the one thing this counter exists to surface: a forged-token spike, invisible
  // inside the benign baseline of clients that have simply not logged in yet.
  // The label set stays bounded at three: absent | invalid | expired.
  const rejectCaller = (
    error: Extract<SessionErrorCode, "session_expired" | "session_invalid">,
    reason: SessionRejectedReason,
  ): CallerFailure => {
    metrics.sessionRejected(reason);
    return { status: "unauthorized", error };
  };

  const resolveCaller = async (req: Request): Promise<CallerResolution> => {
    const authorization = req.get("authorization");
    if (authorization === undefined) {
      // Benign and high-volume: a client that has not logged in yet.
      return rejectCaller("session_invalid", "absent");
    }
    if (!sessionEnabled) {
      return { status: "session_unavailable" };
    }
    if (!authorization.startsWith(BEARER_PREFIX)) {
      // A header WAS sent and it is not a Bearer token — that is `invalid`.
      return rejectCaller("session_invalid", "invalid");
    }
    const verification = verifySessionToken(
      sessionSecret,
      authorization.slice(BEARER_PREFIX.length),
    );
    if (verification.status === "ok") {
      return { status: "ok", playerId: verification.claims.pid };
    }
    return verification.status === "expired"
      ? rejectCaller("session_expired", "expired")
      : rejectCaller("session_invalid", "invalid");
  };

  const app = express();
  // Task 0276. Express 4 routes case-INSENSITIVELY by default; nginx's
  // `location ~* ^/internal/` allowlist in setup-profile.sh is the network half of
  // the pair InternalAuth.ts:3-7 argues for. Before this, `/INTERNAL/v1/credit`
  // missed nginx's then-case-SENSITIVE prefix location, fell through to
  // `location /`, and still routed here — leaving PROFILE_INTERNAL_TOKEN alone
  // against an unthrottled, unlogged guessing oracle. Now every case variant 404s
  // in the app too, whatever reaches it.
  //
  // ⚠️ MUST stay above the first app.use: Express 4 builds its router lazily on the
  // first route registration and reads app settings AT THAT MOMENT. Moved below
  // one, this line silently does nothing and its tests pass for the wrong reason.
  //
  // App-WIDE, and that is the owner-approved trade (2026-09-16): public routes are
  // now exact too, so `GET /HEALTH` and `POST /V1/Login` are 404. Every in-repo
  // caller uses lowercase literals. This is NOT `strict routing` — a trailing slash
  // still matches, unchanged.
  app.set("case sensitive routing", true);
  // Exactly one proxy hop (host nginx) — so req.ip is the real client for the
  // rate limiter, not nginx's address.
  app.set("trust proxy", 1);

  // ── Request timing (task 0274, S5) ─────────────────────────────────────────
  // Mounted FIRST, before express.json(), so the answers the body parser itself
  // produces (400 malformed, 413 too large, 415 unsupported) are timed too — those
  // are exactly the requests a broken or hostile client sends most of.
  //
  // ⛔ `route` is the Express ROUTE PATTERN, never req.path or req.originalUrl. A
  // path label would be unbounded (a scanner mints one time series per URL) and
  // would carry any id a caller put in the URL straight into Uptrace (ADR-113).
  // A request that matched no route is therefore ONE label value, not a thousand.
  //
  // Known nuance, accepted: a CORS preflight answered by an `app.use`-mounted
  // handler has no req.route, so it is labelled `unmatched` alongside genuine 404s.
  // Bounded and harmless; it only means `unmatched` is not by itself a scanner
  // signal.
  //
  // `finish` does NOT fire for a request the client aborted — those go uncounted.
  app.use((req, res, next) => {
    const startedAt = process.hrtime.bigint();
    res.once("finish", () => {
      const route =
        req.route === undefined
          ? UNMATCHED_ROUTE
          : `${req.baseUrl}${(req.route as { path: string }).path}`;
      const elapsedMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
      metrics.httpRequest(
        route,
        req.method,
        statusClassOf(res.statusCode),
        elapsedMs,
      );
    });
    next();
  });

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

  // Client-facing profile read. Rate-limited per-IP: since task 0273 the caller must
  // hold a session token, so there is no id to enumerate here any more, but the cap
  // still bounds abuse of the read itself. TODO(0267): verify a Yandex signature at
  // login so a token can only ever be minted for its real owner.
  const profileReadLimiter = rateLimit({
    windowMs: 60_000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
  });
  // Without the CORS header the cross-origin fetch rejects and the citizenship card
  // silently degrades to a zero-XP state for every authorized player. Runs BEFORE
  // the limiter so even a 429 carries it. A Bearer GET is preflighted, so the exact
  // path also answers OPTIONS — registered on its own so a preflight never reaches
  // profileReadLimiter (and never matches the name-change sub-paths below).
  const profileCors = publicCors("GET");
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
  app.options("/v1/profile", profileCors);
  app.get("/v1/profile", profileCors, profileReadLimiter, async (req, res) => {
    try {
      const caller = await resolveCaller(req);
      if (sendCallerFailure(res, caller)) {
        return;
      }
      // A valid token whose player row is gone (a restore without rotating the
      // session key) is 404 — never a silently created profile.
      const profile = await repo.getProfile(caller.playerId);
      if (!profile) {
        res.status(404).json({ error: "not_found" });
        return;
      }
      res
        .status(200)
        .json(
          toPublicProfile(profile, await readNameChangeState(caller.playerId)),
        );
    } catch (error) {
      log.error(`GET /v1/profile failed: ${formatError(error)}`);
      res.status(500).json({ error: "internal_error" });
    }
  });

  // ── Login (task 0271, S2; ADR-113; design §4) ──────────────────────────────
  // Find-or-create the player for a platform login and hand back a 24 h session
  // token. 🔓 Adds NO security today: anyone asserting an id gets a token for it.
  // NO rate limiter — owner-accepted; S5's monitoring replaces it (junk profile
  // rows are the accepted, monitored risk). ⛔ Never log the platform id, the
  // player id or the token on this path.
  //
  // ── The login-creation switch (task 0274, S5) ──────────────────────────────
  // `loginCreateEnabled === false` makes this route find-only: an existing player
  // still logs in (pausing creation is not an outage), a NEW platform id gets
  // 503 `creation_paused` and NOTHING is written. This is the ONLY place the switch
  // is checked — `POST /internal/v1/players/resolve` always creates, by design: a
  // real match must stay creditable even mid-incident.
  //
  // ⚠️ Accepted, monitored risk that the switch does NOT close: anyone can open a
  // WebSocket join with a made-up Yandex id and create a player through the game
  // server. That path is slow, and alert A1 counts creations from BOTH sources.
  app.use("/v1/login", publicCors("POST"));
  app.post("/v1/login", async (req, res) => {
    // The order below is load-bearing and asserted by tests: unavailable, then
    // malformed, then paused. Each earlier answer means strictly less work and
    // strictly less written.
    const recordLogin = (platform: MetricPlatform, outcome: LoginOutcome) =>
      metrics.loginRequest(platform, outcome);
    // Checked FIRST — before parsing and before any write — so no player is ever
    // created for a caller who cannot be given a token.
    if (!sessionEnabled) {
      // The body is not parsed yet, so the platform is genuinely not known here.
      recordLogin("unknown", "session_unavailable");
      res.status(503).json({ error: "session_unavailable" });
      return;
    }
    const parsed = LoginRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      // metricPlatform() collapses anything that is not the one allowed spelling to
      // "unknown" — the raw body value is NEVER a label (ADR-113 + cardinality).
      recordLogin(
        metricPlatform(
          (req.body as { platform?: unknown } | undefined)?.platform,
        ),
        "bad_request",
      );
      res.status(400).json({ error: "bad_request" });
      return;
    }
    const platformLabel = metricPlatform(parsed.data.platform);
    try {
      const resolved = loginCreateEnabled
        ? await repo.resolveOrCreatePlayer(
            parsed.data.platform,
            parsed.data.platformUserId,
            "login",
          )
        : await repo.resolveExistingPlayer(
            parsed.data.platform,
            parsed.data.platformUserId,
          );
      if (resolved === null) {
        // Switch off + no player for this id. CORS is already on the route, so the
        // client can read this; task 0273's client treats ANY 503 from login as
        // fail-soft with no retry, so nothing on the client side changes for it.
        recordLogin(platformLabel, "creation_paused");
        res.status(503).json({ error: "creation_paused" });
        return;
      }
      // A brand-new player cannot have a grant row yet — no query needed.
      const tenureDone =
        !resolved.created &&
        (await repo.hasXpGrant(resolved.playerId, "tenure"));
      const body: LoginResponse = {
        created: resolved.created,
        profile: toPublicProfile(
          resolved.profile,
          resolved.created
            ? undefined
            : await readNameChangeState(resolved.playerId),
        ),
        grantChecks: { tenure: tenureDone ? "done" : "pending" },
        session: signSessionToken(sessionSecret, {
          playerId: resolved.playerId,
          platform: parsed.data.platform,
        }),
      };
      recordLogin(platformLabel, resolved.created ? "created" : "existing");
      // The body carries a credential: no cache may keep it.
      res.set("Cache-Control", "no-store");
      res.status(200).json(body);
    } catch (error) {
      recordLogin(platformLabel, "error");
      // pg error messages carry no key values (those are in `detail`, not logged),
      // and the repository's give-up message names no ids.
      log.error(`POST /v1/login failed: ${formatError(error)}`);
      res.status(500).json({ error: "internal_error" });
    }
  });

  // Internal, service-authenticated find-or-create (task 0272, S3; ADR-113). The
  // game server calls this when it first learns a creditable identity — join, a
  // late update_identity, a reconnect — and credits by the returned playerId.
  // Replaces /internal/v1/profile/upsert (removed). Source `game_server`: this
  // ALWAYS creates, independent of any login-creation switch. A playerId in this
  // internal response is allowed (ADR-113 point 3); it never reaches a client.
  // Never sets xp, citizenship, or paid flags.
  app.post("/internal/v1/players/resolve", internalAuth, async (req, res) => {
    const parsed = PlayerResolveRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "bad_request" });
      return;
    }
    try {
      const resolved = await repo.resolveOrCreatePlayer(
        parsed.data.platform,
        parsed.data.platformUserId,
        "game_server",
      );
      const body: PlayerResolveResponse = {
        playerId: resolved.playerId,
        isCitizen: resolved.profile.is_citizen,
      };
      res.status(200).json(body);
    } catch (error) {
      // No player or platform id in the line (ADR-113 / design §6).
      log.error(
        `POST /internal/v1/players/resolve failed: ${formatError(error)}`,
      );
      res.status(500).json({ error: "internal_error" });
    }
  });

  // Internal, service-authenticated batch crediting, keyed by `(game_id, player_id)`
  // since task 0272. Each item is credited in its own transaction (in the repo), so
  // one bad item never rolls back the others; per-item status lets the caller retry
  // safely (idempotent). No identity lookup: the game server already holds the id.
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
        // repository's post-commit seam, not here. A player erased in between is
        // the repository's `no_profile` (foreign-key violation).
        const outcome = await repo.creditMatchXp(
          item.gameId,
          item.playerId,
          item.xpAwarded,
        );
        results.push({
          gameId: item.gameId,
          playerId: item.playerId,
          status: outcome.status,
        });
      } catch (error) {
        // No player or platform id in the line (ADR-113 / design §6).
        log.error(`credit failed for ${item.gameId}: ${formatError(error)}`);
        results.push({
          gameId: item.gameId,
          playerId: item.playerId,
          status: "error",
        });
      }
    }
    res.status(200).json({ results });
  });

  // ── Alert relay (task 0277) ────────────────────────────────────────────────
  // ⛔ NOT behind internalAuth: the secret arrives in the JSON BODY, not in an
  // Authorization header, because Uptrace 2.0.2 provably cannot send a custom header
  // (its webhook request carries exactly User-Agent and Content-Type). Everything
  // else — the limiter, the secret compare, the status contract — lives in
  // AlertRelay.ts, which is also where the 401/403/404 channel-disable trap is
  // documented. Two lines here by design.
  if (alertRelayConfig !== undefined) {
    const relay = createAlertRelay(alertRelayConfig, metrics);
    app.post(ALERT_WEBHOOK_PATH, relay.limiter, relay.handler);
  }

  // ── Yandex payments (task 0019) ────────────────────────────────────────────
  // Cross-origin JSON POSTs from the game origin ⇒ preflighted. publicCors is
  // scoped to /v1/payments/* ONLY — never /internal/* — and mounted before the
  // limiter (see publicCors).
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
  app.use("/v1/payments", publicCors("POST"), paymentsLimiter, paymentsEnabled);

  // Handlers are only registered with a live repo; without one the
  // paymentsEnabled middleware above 503s every /v1/payments request.
  if (paymentsRepo !== undefined) {
    // Create a purchase intent BEFORE the payment frame opens. The caller (since
    // task 0273: a session token, and nothing else — same trust level ADR-103
    // accepted for crediting, since the token is `vfy:false`) is only who the intent
    // is FOR; the GRANT is bound to the Yandex-signed payload via developerPayload →
    // intent row, so the worst abuse is paying real money to gift citizenship to a
    // chosen id. A token for a player that no longer exists hits the FK — 404 (0271).
    app.post("/v1/payments/yandex/intent", async (req, res) => {
      const parsed = PurchaseIntentRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "bad_request" });
        return;
      }
      try {
        const caller = await resolveCaller(req);
        if (sendCallerFailure(res, caller)) {
          return;
        }
        const intentId = await paymentsRepo.createIntent(
          caller.playerId,
          parsed.data.productId,
        );
        res.status(200).json({ intentId });
      } catch (error) {
        if (isForeignKeyViolation(error)) {
          res.status(404).json({ error: "not_found" });
          return;
        }
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
  // Player-facing reads/writes are cross-origin (game origin → api.*); PATCH+JSON
  // and any Bearer request are preflighted. publicCors is scoped to /v1/messages
  // ONLY — never /internal/* — and mounted before the limiter (see publicCors).
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
  app.use(
    "/v1/messages",
    publicCors("GET, PATCH"),
    profileReadLimiter,
    inboxEnabled,
  );

  if (inbox !== undefined) {
    // A citizen's messages, newest first. 403 `not_citizen` covers BOTH a
    // non-citizen and a missing profile (the gate runs in SQL on every call,
    // never on client-side citizenship state).
    app.get("/v1/messages", async (req, res) => {
      try {
        const caller = await resolveCaller(req);
        if (sendCallerFailure(res, caller)) {
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
        if (sendCallerFailure(res, caller)) {
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
  // Player-facing JSON POSTs from the game origin ⇒ preflighted. publicCors is
  // scoped to the two /v1/profile/name-change-* paths ONLY — never /internal/*, and
  // mounted per path rather than on /v1/profile (whose exact path has its own).
  const nameChangeCors = publicCors("POST");
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
        if (sendCallerFailure(res, caller)) {
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

    // Withdraw your OWN pending request (owner amendment 2). It was what made the
    // ADR-103 client-asserted-id posture survivable here (anyone who knew a
    // citizen's non-secret id could park a pending request the victim could never
    // clear). Task 0273 removed that id path, so the griefing vector now needs a
    // token minted for the victim's own Yandex id — but the self-service cancel
    // stays: it is still the only way to clear a request you did not want.
    app.post("/v1/profile/name-change-cancel", async (req, res) => {
      const parsed = NameChangeCancelRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "bad_request" });
        return;
      }
      try {
        const caller = await resolveCaller(req);
        if (sendCallerFailure(res, caller)) {
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

  // Registered LAST — see profileErrorHandler.
  app.use(profileErrorHandler);

  return app;
}
