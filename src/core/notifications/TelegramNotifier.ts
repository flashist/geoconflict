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
// ⚠️ DELIBERATE, OWNER-CONFIRMED SCOPE BOUNDARY (plan amendment 3): Master.ts's
// two existing inline call sites are NOT migrated onto this helper. Those routes
// have zero test coverage, feedback delivery is already failing in production
// (task 0061), and task 0033 explicitly owns that consolidation. The cost —
// three copies of the send logic co-existing until 0033 lands — was accepted
// knowingly. Do not "tidy" this by migrating them here.
//
// TELEGRAM_PROXY_URL is load-bearing, not optional polish: api.telegram.org is
// blocked from Russian IPs, and every VPS in this project is reg.ru / Moscow.
//
// SECURITY: the bot token is embedded in the request URL. It is NEVER logged,
// never returned, and never included in an error value — this module logs
// nothing at all; callers log the returned result instead.

import { fetch, ProxyAgent } from "undici";

/** Bot credentials + egress route. A blank token or chat id disables sending. */
export interface TelegramConfig {
  token: string;
  chatId: string;
  /** Proxy for egress; required in practice from Russian IPs. */
  proxyUrl?: string | null;
}

/**
 * Outcome of one send. Deliberately a value, not an exception, and deliberately
 * free of any token/URL detail so a caller cannot accidentally log the secret.
 */
export type TelegramSendResult =
  | "sent"
  | "not_configured"
  | "http_error"
  | "network_error";

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

/**
 * Send one message to the configured chat. NEVER throws and never rejects — every
 * failure resolves to a result value, because every caller is a best-effort
 * notification path that must not fail the operation it is reporting on.
 */
export async function sendTelegramMessage(
  config: TelegramConfig,
  text: string,
): Promise<TelegramSendResult> {
  if (config.token.length === 0 || config.chatId.length === 0) {
    return "not_configured";
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TELEGRAM_TIMEOUT_MS);
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${config.token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: config.chatId,
          text,
          parse_mode: "HTML",
        }),
        signal: controller.signal,
        dispatcher: config.proxyUrl
          ? proxyAgentFor(config.proxyUrl)
          : undefined,
      },
    );
    return response.ok ? "sent" : "http_error";
  } catch {
    // Network failure, blocked egress, or the timeout above. Swallowed on
    // purpose — and the caught value is discarded rather than inspected, since
    // an undici error can carry the request URL (and therefore the token).
    return "network_error";
  } finally {
    clearTimeout(timer);
  }
}
