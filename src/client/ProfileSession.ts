// The client's login session against the profile server (task 0273, S4; ADR-113).
// One `POST /v1/login` per logged-in page load; every other profile call then goes
// out with `Authorization: Bearer <token>` and no Yandex id in the URL or body.
//
// 🔓 The token adds NO security today (`vfy:false` — anyone asserting a platform id
// gets one). It takes Yandex ids out of URLs and logs and gives 0267 one place to
// verify. It must never count as a proven owner (paid state, task 0250).
//
// ⛔ Never log the token, and never persist it. It lives in a module variable for
// the life of the page load only:
//   * the client logs in every load anyway, so storage buys nothing;
//   * cookies are third-party inside the Yandex Games iframe;
//   * localStorage/sessionStorage would keep a credential alive across tabs and
//     after the player logs out of Yandex.
//
// Expiry is handled by the server's 401 alone — `expiresAt` is parsed but never
// used for a decision, so a wrong device clock cannot force a login before every
// call. The 401 path re-logs-in ONCE and retries ONCE.
//
// [D3, owner ruling 2026-09-16] A login that FAILS is final for this page load:
// `ensureSession()` latches and returns null from then on, and never starts a
// second login. The player-visible recovery is a full restart (GameRestart.ts),
// only ever from their own press of the card's login button.

import { getServerConfigFromClient } from "../core/configuration/ConfigLoader";
import {
  LoginResponseSchema,
  type LoginResponse,
} from "../core/profile/LoginContract";
import type { Platform } from "../core/profile/Platform";
import {
  FlashistFacade,
  flashist_logEventAnalytics,
  flashistConstants,
} from "./flashist/FlashistFacade";
import { PROFILE_LOGIN_RESTART_LATCH_KEY } from "./GameRestart";

/** Matches PlayerProfileView's PROFILE_FETCH_TIMEOUT_MS — one bounded wait shape. */
const LOGIN_TIMEOUT_MS = 5000;

const PLATFORM: Platform = "yandex_games";

/** What `getLoginOutcome()` exposes — task 0253's seam. Never the token. */
export type LoginOutcome = Pick<LoginResponse, "created" | "grantChecks">;

export type ProfileFetchResult =
  /** Empty profileApiUrl, or the config read threw — caller's "no backend" path. */
  | { kind: "unconfigured" }
  /** Guest, no Yandex id, or the login failed (D3 latch) — caller's failure path. */
  | { kind: "no_session" }
  | { kind: "response"; response: Response }
  | { kind: "network_error" };

export interface ProfileFetchOptions {
  method?: string;
  /** Already-serialized JSON body. `Content-Type` is set automatically. */
  body?: string;
  timeoutMs: number;
}

interface Session {
  token: string;
  /** The account the token was minted for; a changed id discards it. */
  yandexId: string;
}

let session: Session | null = null;
/** [D3] Set by the first failed login; only a fresh page load clears it. */
let loginFailed = false;
let inflight: Promise<string | null> | null = null;
/**
 * The last successful login's outcome. Written and cleared together with
 * `session`, so it can never describe an account we no longer hold a token for —
 * `getLoginOutcome()`'s "null when there is no session" depends on that pairing.
 */
let outcome: LoginOutcome | null = null;

/** Test seam — forget the token, the failure latch, the in-flight login and the outcome. */
export function resetProfileSessionForTests(): void {
  session = null;
  loginFailed = false;
  inflight = null;
  outcome = null;
}

/**
 * Kick the login off at start-up (called fire-and-forget from `startClient()`).
 * Never awaited by the caller and never rejects; guests, degraded boots and an
 * unconfigured API make no call at all.
 */
export async function startProfileSession(): Promise<void> {
  try {
    await ensureSession();
  } catch {
    // ensureSession already fails soft; this is belt-and-braces so a boot can
    // never be taken down by the profile backend.
  }
}

/**
 * The session token for the current player, or null for a guest / an unconfigured
 * API / a failed login. Concurrent callers share ONE login.
 */
export function ensureSession(): Promise<string | null> {
  if (inflight !== null) {
    return inflight;
  }
  const pending = resolveSession().finally(() => {
    if (inflight === pending) {
      inflight = null;
    }
  });
  inflight = pending;
  return pending;
}

async function resolveSession(): Promise<string | null> {
  if (!(await FlashistFacade.instance.isYandexAuthorized())) {
    return null;
  }
  const yandexId = await FlashistFacade.instance.getYandexUniqueId();
  if (yandexId === null) {
    return null;
  }
  if (session !== null) {
    if (session.yandexId === yandexId) {
      return session.token;
    }
    // A different account than the one this token names — it is not ours to send.
    session = null;
    outcome = null;
  }
  if (loginFailed) {
    return null;
  }
  const base = await resolveApiBase();
  if (base === null) {
    return null;
  }
  return await login(base, yandexId);
}

/** The profile-API base, or null when unconfigured / the config read throws. */
async function resolveApiBase(): Promise<string | null> {
  let base: string;
  try {
    base = (await getServerConfigFromClient())
      .profileApiUrl()
      .replace(/\/+$/, "");
  } catch {
    return null;
  }
  return base.length > 0 ? base : null;
}

type LoginAttempt =
  | { kind: "ok"; data: LoginResponse }
  | { kind: "timeout" }
  | { kind: "unavailable" }
  | { kind: "error" };

async function login(base: string, yandexId: string): Promise<string | null> {
  const attempt = await postLogin(base, yandexId);
  if (attempt.kind !== "ok") {
    loginFailed = true;
    // No `outcome = null` here on purpose: login() is only ever reached with
    // `session === null`, and both sites that discard a session clear the
    // outcome with it, so there is nothing stale left to clear.
    flashist_logEventAnalytics(FAILURE_EVENTS[attempt.kind]);
    return null;
  }
  // Written together with `outcome`, with no await between them — that pairing
  // is what makes "no session ⇒ no outcome" hold.
  session = { token: attempt.data.session.token, yandexId };
  outcome = {
    created: attempt.data.created,
    grantChecks: attempt.data.grantChecks,
  };
  clearRestartLatch();
  flashist_logEventAnalytics(
    flashistConstants.analyticEvents.PROFILE_LOGIN_SUCCEEDED,
  );
  if (attempt.data.created) {
    flashist_logEventAnalytics(
      flashistConstants.analyticEvents.PROFILE_LOGIN_CREATED,
    );
  }
  return session.token;
}

const FAILURE_EVENTS: Record<Exclude<LoginAttempt["kind"], "ok">, string> = {
  timeout: flashistConstants.analyticEvents.PROFILE_LOGIN_FAILED_TIMEOUT,
  unavailable:
    flashistConstants.analyticEvents.PROFILE_LOGIN_FAILED_UNAVAILABLE,
  error: flashistConstants.analyticEvents.PROFILE_LOGIN_FAILED_ERROR,
};

/** ⛔ Never log the request body or the response — both carry identity. */
async function postLogin(
  base: string,
  yandexId: string,
): Promise<LoginAttempt> {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, LOGIN_TIMEOUT_MS);
  try {
    const response = await fetch(`${base}/v1/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform: PLATFORM, platformUserId: yandexId }),
      signal: controller.signal,
    });
    // Any 503 is fail-soft and indistinguishable to the client: today
    // `session_unavailable`, later S5's `creation_paused`.
    if (response.status === 503) {
      return { kind: "unavailable" };
    }
    if (!response.ok) {
      return { kind: "error" };
    }
    const parsed = LoginResponseSchema.safeParse(await response.json());
    return parsed.success
      ? { kind: "ok", data: parsed.data }
      : { kind: "error" };
  } catch {
    return timedOut ? { kind: "timeout" } : { kind: "error" };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Re-login because the server rejected a token we actually held. NOT a retry of a
 * failed login (see D3 above) — it is the refresh mechanism the 24 h TTL needs.
 * Concurrent 401s on the same stale token share one login; a caller whose stale
 * token has already been replaced gets the fresh one without a second call.
 *
 * `Profile:Session:Relogin` is fired by the caller that actually DISCARDS the
 * stale token — exactly once per re-login. A later 401 on the same token finds
 * `session` already null and joins the login in flight without counting a second
 * one; N concurrent 401s on one token must read as 1 re-login, not N (0274's
 * monitoring reads this count).
 */
async function relogin(staleToken: string): Promise<string | null> {
  if (session === null) {
    // Another caller's 401 on this same token already discarded it and fired the
    // event; join whatever it started (or its D3 failure) silently.
    return await ensureSession();
  }
  if (session.token !== staleToken) {
    // ⚠️ KNOWN LIMIT, owner-ruled 2026-09-16 (review round 2, ledger AR-9): the
    // replaced token is handed back WITHOUT re-checking it was minted for the
    // same Yandex account. Unreachable today — no in-page authorized-account
    // switch exists (late-SDK recovery only fills an empty slot, `initPlayer` is
    // one-shot, and the auth dialog is reachable only from the guest-only login
    // button, and a guest holds no token so this function is never reached).
    // RE-RAISE if a logout or switch-account surface appears, or if 0267
    // re-binds identity mid-load.
    return session.token;
  }
  session = null;
  outcome = null;
  flashist_logEventAnalytics(
    flashistConstants.analyticEvents.PROFILE_SESSION_RELOGIN,
  );
  return await ensureSession();
}

/**
 * One authenticated profile-server call. Resolves the base URL, attaches the
 * session token as `Bearer <token>` (the exact spelling S2 parses — Routes.ts's
 * BEARER_PREFIX), and on a 401 re-logs-in once and retries once. A second 401 is
 * returned to the caller as-is. Never throws.
 */
export async function profileFetch(
  path: string,
  options: ProfileFetchOptions,
): Promise<ProfileFetchResult> {
  const base = await resolveApiBase();
  if (base === null) {
    return { kind: "unconfigured" };
  }
  let token = await ensureSession();
  if (token === null) {
    return { kind: "no_session" };
  }
  const first = await send(base, path, options, token);
  if (first.kind !== "response" || first.response.status !== 401) {
    return first;
  }
  const refreshed = await relogin(token);
  if (refreshed === null) {
    // Nothing left to retry with — hand the 401 back so the caller degrades the
    // same way it would for any other rejection.
    return first;
  }
  token = refreshed;
  return await send(base, path, options, token);
}

async function send(
  base: string,
  path: string,
  options: ProfileFetchOptions,
  token: string,
): Promise<ProfileFetchResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs);
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  try {
    const response = await fetch(`${base}${path}`, {
      method: options.method ?? "GET",
      headers,
      ...(options.body !== undefined ? { body: options.body } : {}),
      signal: controller.signal,
    });
    return { kind: "response", response };
  } catch {
    return { kind: "network_error" };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * The login's one-off outcome — `created` and the tenure grant check — for task
 * 0253's launch grant. Null when there is no session. Never exposes the token.
 */
export async function getLoginOutcome(): Promise<LoginOutcome | null> {
  await ensureSession();
  return outcome;
}

/** Mirrors Bootstrap.ts:62 — a good boot forgets the latch. Storage may throw. */
function clearRestartLatch(): void {
  try {
    sessionStorage.removeItem(PROFILE_LOGIN_RESTART_LATCH_KEY);
  } catch {
    // Private mode / iframe storage policy — the latch simply stays as it is.
  }
}
