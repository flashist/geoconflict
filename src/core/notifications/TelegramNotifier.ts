// Shared Telegram send helper (task 0067).
//
// WHY THIS EXISTS: the owner ruled that operator notifications must go through
// the EXISTING bot pipeline (same bot, same chat, same proxy, same env var
// names) rather than a new one. There was no reusable function to call — the
// send is written inline, twice, inside src/server/Master.ts (the feedback and
// subscribe routes), on the GAME server. The profile server is a separate image
// on a separate VPS and cannot import Master.ts (it constructs the express app
// and the WorkerSupervisor at module load). So the send logic is extracted here.
//
// ⚠️ THAT SCOPE BOUNDARY IS GONE — superseded by an OWNER RULING, 2026-09-17
// (task 0277, ND-2): "do all three now, but the game server will be deployed later".
// This header used to say Master.ts's two inline call sites were deliberately NOT
// migrated and that task 0033 owned the consolidation. Both /api/feedback and
// /api/subscribe are now ON this helper, and their characterization tests live in
// tests/server/MasterFeedbackRoutes.test.ts — written against the OLD code first, so
// they prove the behaviour did not move rather than merely agreeing with the new code.
//
// ⚠️ FIXED IN THE TREE, NOT SHIPPED: the game server deploys later, with task 0273.
// Until then the running feedback path is still the old one. Do not read "0061 is
// fixed" off this file. Task 0033's brief needs a producer update — its consolidation
// work has shrunk to approximately nothing.
//
// TELEGRAM_PROXY_URL is load-bearing, not optional polish: api.telegram.org is
// blocked from Russian IPs, and every VPS in this project is reg.ru / Moscow.
//
// SECURITY: the bot token is embedded in the request URL. It is NEVER logged,
// never returned, and never included in an error value — this module logs
// nothing at all; callers log the returned result instead.
//
// ⚠️ ONE BOUNDED RELAXATION (task 0277, for task 0061 step 1): the caught error is
// no longer discarded WHOLE. Exactly one field, `error.cause.code`, is read, and
// only when it matches CAUSE_CODE_PATTERN below — a short symbolic constant that
// cannot hold a URL or a token within that charset. Anything else becomes
// "unknown". The error object, its `message` and its `stack` are still never read
// and never returned. Do not widen this without widening the guard's tests.
//
// WHY THE DISCARD EXISTS AT ALL, stated accurately (a stronger earlier claim was
// retracted — no token was ever observed in a log): undici DOES interpolate a whole
// input URL into a TypeError message in at least one construction
// (lib/web/fetch/request.js:136, "Failed to parse URL from " + input), and this
// module's URL carries the bot token in its path. Every fetch failure actually seen
// is `TypeError: fetch failed` with internal frames only, so the exposure is not
// reachable today — which makes this a GUARD, not a proof, and exactly the reason to
// keep it rather than to relax it.

import { fetch, ProxyAgent } from "undici";

/** Bot credentials + egress route. A blank token or chat id disables sending. */
export interface TelegramConfig {
  token: string;
  chatId: string;
  /** Proxy for egress; required in practice from Russian IPs. */
  proxyUrl?: string | null;
  /**
   * Forum topic to post into (task 0277). The operator chat is a forum group, so
   * a message with no topic lands in General — which is exactly today's behaviour
   * and is proven working. Blank, null or absent ⇒ the `message_thread_id` key is
   * OMITTED from the body entirely. ⚠️ NOT sent as an empty string: Telegram
   * rejects an empty thread id, so a present-but-empty key would break every
   * notification rather than merely mis-routing it.
   */
  threadId?: string | null;
}

/**
 * Outcome of one send. Deliberately a value, not an exception, and deliberately
 * free of any token/URL detail so a caller cannot accidentally log the secret.
 *
 * `sent_after_retry` (task 0277/0061) is a SUCCESS: the message arrived, on the
 * second attempt. Callers deciding success must accept both it and `sent`.
 */
export type TelegramSendResult =
  | "sent"
  | "sent_after_retry"
  | "not_configured"
  | "http_error"
  | "network_error";

/**
 * What one send reports back. An object rather than a bare string because task
 * 0061's stated blocker is *which* failure happened — without that "everything
 * below is guesswork". Every field is bounded and non-free-text by construction,
 * so no field can carry the bot token or the request URL.
 */
export interface TelegramSendOutcome {
  readonly result: TelegramSendResult;
  /** HTTP status, `http_error` only. A number; never a body or a URL. */
  readonly status?: number;
  /**
   * Transport cause, connection-level failures only. Either a symbolic constant
   * matching CAUSE_CODE_PATTERN (`ECONNRESET`, `UND_ERR_SOCKET`, …) or the literal
   * `"unknown"`. Never free text — see boundedCauseCode.
   */
  readonly code?: string;
}

/**
 * The ONE field of a caught error this module is allowed to read, and the charset
 * that bounds it (task 0277 §1a(iv), reconciling task 0061 step 1 with this
 * module's total-discard rule).
 *
 * ⚠️ THE TRADE, NAMED: the discard stops being total. `code` is a short symbolic
 * constant — it cannot hold a URL or a bot token within this charset, and anything
 * that fails the guard collapses to "unknown". That is a GUARD, not a proof: a
 * future undici could put something non-symbolic in `.code`, and the guard is what
 * bounds that. The error itself, its `message` and its `stack` are still never read.
 */
const CAUSE_CODE_PATTERN = /^[A-Z][A-Z0-9_]{1,31}$/;
const UNKNOWN_CAUSE_CODE = "unknown";

function boundedCauseCode(error: unknown): string {
  if (typeof error !== "object" || error === null) {
    return UNKNOWN_CAUSE_CODE;
  }
  const cause = (error as { cause?: unknown }).cause;
  if (typeof cause !== "object" || cause === null) {
    return UNKNOWN_CAUSE_CODE;
  }
  const code = (cause as { code?: unknown }).code;
  if (typeof code !== "string" || !CAUSE_CODE_PATTERN.test(code)) {
    return UNKNOWN_CAUSE_CODE;
  }
  return code;
}

// The inline copies in Master.ts have NO timeout: a hung connection to a blocked
// api.telegram.org holds the request until undici's own ~300s default. This helper
// is called from a post-commit notification path, so it bounds itself.
const TELEGRAM_TIMEOUT_MS = 10_000;

// ONE dispatcher per proxy URL, created lazily and reused for the life of the
// process. Constructing a ProxyAgent per send leaks the dispatcher and its
// keep-alive socket pool; the correct precedent is src/server/Master.ts:213,
// which hoists a single module-level `telegramProxyAgent`. It is keyed by URL
// here rather than hoisted from env because this helper takes its config as a
// parameter — in practice the map holds exactly one entry, since the URL comes
// from the one TELEGRAM_PROXY_URL the process was started with.
const proxyAgents = new Map<string, ProxyAgent>();

function proxyAgentFor(proxyUrl: string): ProxyAgent {
  const existing = proxyAgents.get(proxyUrl);
  if (existing !== undefined) {
    return existing;
  }
  const agent = new ProxyAgent(proxyUrl);
  proxyAgents.set(proxyUrl, agent);
  return agent;
}

/** Escape the subset of HTML Telegram's `parse_mode: "HTML"` treats as markup. */
export function escapeTelegramHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** The request body for one send. `message_thread_id` is present only when routed. */
function buildMessageBody(config: TelegramConfig, text: string): string {
  const body: Record<string, unknown> = {
    chat_id: config.chatId,
    text,
    parse_mode: "HTML",
  };
  const threadId = config.threadId ?? "";
  if (threadId.length > 0) {
    body.message_thread_id = threadId;
  }
  return JSON.stringify(body);
}

/** One attempt. Resolves with a response, or throws whatever the transport threw. */
async function attemptSend(
  config: TelegramConfig,
  body: string,
): Promise<{ ok: boolean; status: number }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TELEGRAM_TIMEOUT_MS);
  try {
    return await fetch(
      `https://api.telegram.org/bot${config.token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        signal: controller.signal,
        dispatcher: config.proxyUrl
          ? proxyAgentFor(config.proxyUrl)
          : undefined,
      },
    );
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Send one message to the configured chat. NEVER throws and never rejects — every
 * failure resolves to an outcome value, because every caller is a best-effort
 * notification path that must not fail the operation it is reporting on.
 *
 * RETRY (task 0277, fixing task 0061): a connection-level failure is retried ONCE,
 * immediately, on the same config. A Telegram REJECTION is not retried.
 *
 * ⚠️ How the two are told apart WITHOUT inspecting the caught error: a rejection is
 * an HTTP response, so `fetch` RESOLVES and never reaches the catch. Everything that
 * reaches the catch is already non-response — a transport failure or our own abort.
 * The classification is structural, not diagnostic.
 *
 * The first failure is what evicts a dead pooled socket, which is the shape 0061's
 * production reproduction showed: fail, then the next one succeeds. ⚠️ A retry is
 * NOT a guarantee — if the egress proxy is down rather than stale, both attempts
 * fail and the message is lost. Worst case is now ~20 s (2 × the 10 s bound above).
 */
export async function sendTelegramMessage(
  config: TelegramConfig,
  text: string,
): Promise<TelegramSendOutcome> {
  if (config.token.length === 0 || config.chatId.length === 0) {
    return { result: "not_configured" };
  }
  const body = buildMessageBody(config, text);
  try {
    const response = await attemptSend(config, body);
    return response.ok
      ? { result: "sent" }
      : { result: "http_error", status: response.status };
  } catch {
    // Non-response: network failure, blocked egress, or our own timeout. The caught
    // value is NOT inspected here — only the retry's failure is, and only through the
    // bounded reader, because undici CAN put a whole input URL into a TypeError message
    // (lib/web/fetch/request.js:136) and this URL carries the bot token in its path.
  }
  try {
    const response = await attemptSend(config, body);
    return response.ok
      ? { result: "sent_after_retry" }
      : { result: "http_error", status: response.status };
  } catch (error) {
    // The LAST attempt's cause is reported: it is the one that decided the outcome.
    return { result: "network_error", code: boundedCauseCode(error) };
  }
}
