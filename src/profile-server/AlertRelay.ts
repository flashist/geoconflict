// Task 0277 — the alert relay: Uptrace's webhook → the operator's Alerts topic.
//
// Everything about this route lives here so Routes.ts gains three small regions and
// no new blocks. ADR-114 put the relay on THIS box (not the game server) because
// Uptrace 2.0.2 cannot target a Telegram forum topic by itself.
//
// 🚨 THE ONE RULE THAT SHAPES EVERY RESPONSE (plan AMENDMENT 1, verified by
// disassembly of the shipped uptrace/uptrace:2.0.2 binary): a 401, 403 or 404 reply
// makes Uptrace call NotifChannelGateway.Disable, after which notifyChannel refuses
// to send unless the channel state is "delivering". ONE such reply permanently and
// silently kills alerting — no retry, ever, for any later alert.
//
// So this relay is fail-closed on DELIVERY, never on the HTTP STATUS. A bad secret
// delivers nothing and still answers 2xx. The status is not a verdict we render; it
// is an instruction Uptrace obeys:
//   2xx  → "stop retrying, I own this event"
//   non-2xx → "try again" (MaxRetries 32, 60 s → 1 h backoff ⇒ ~26 hours)
// Assigning a status for any other reason is a bug. 5xx is correct for exactly one
// case: a transient internal failure detected BEFORE responding, which is worth
// retrying. 429 from the limiter is correct too — transient by definition.
//
// 🚫 The response body echoes NOTHING from the request. Uptrace persists the first
// 100 bytes of our response into its ClickHouse notification history, per attempt,
// alongside the full outbound JSON (secret included). Anything this relay says is
// written to disk on the telemetry box.
//
// ⚠️ THE ACCEPTED TRAP (owner ruling B, 2026-09-17): this route is mounted under
// /internal/ to inherit nginx's IP allowlist — and that allowlist answers 403 on a
// source-IP miss, which disables the channel by the mechanism above. The risk is
// accepted WITH DOCUMENTATION; see the runbook. A mechanical guard (a scheduled
// synthetic probe from the telemetry box + a marker-age check) is a follow-up task,
// NOT this one. Note carefully what does not cover it: profile-checks.sh would
// compare the allowlist with the value the same deploy just wrote — a value compared
// with itself — and 0283's daily digest never traverses this route at all, so it
// would keep reporting "the bot works" while every alert was dead.

import type { RequestHandler } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import {
  escapeTelegramHtml,
  sendTelegramMessage,
  type TelegramConfig,
  type TelegramSendOutcome,
} from "../core/notifications/TelegramNotifier";
import { tokensMatch } from "./InternalAuth";
import { formatError, logger } from "./Logger";
import type {
  AlertRelayKeyed,
  AlertRelayResult,
  ProfileMetrics,
} from "./Telemetry";

const log = logger.child({ comp: "alert-relay" });

/**
 * All lowercase, and deliberately NOT `/uptrace`: ADR-114's own naming caution says
 * the box may be renamed and the vendor may change, and a vendor name baked into a
 * URL is that same mistake one layer down. Mounted under `/internal/` SOLELY to
 * inherit nginx's existing allowlist.
 */
export const ALERT_WEBHOOK_PATH = "/internal/v1/alerts/webhook";

/**
 * The box role in the rendered message. A module constant, not a config variable:
 * a fourth environment variable would cost the owner an edit for a single word.
 * ADR-114's naming caution applies — if this box is ever renamed, change it here.
 */
const BOX_ROLE = "profile";

/** Named in the out-of-band alarm. The NAME only — never any value. */
export const ALERT_WEBHOOK_SECRET_ENV = "PROFILE_ALERT_WEBHOOK_TOKEN";

/**
 * Dedupe bound. ⚠️ The TTL is deliberately LONGER than Uptrace's verified retry
 * budget (32 attempts, 60 s → 1 h backoff ⇒ ~26 hours). A 24 h TTL — what the plan
 * assumed before the budget was known — would let the tail of a retry sequence fall
 * out of the window and deliver a duplicate.
 */
export const DEDUPE_MAX_ENTRIES = 500;
const DEDUPE_TTL_MS = 48 * 60 * 60 * 1000;

/** At most one out-of-band notice per process per hour. */
const ALARM_MIN_INTERVAL_MS = 60 * 60 * 1000;

/** Marks a message this module sent about ITSELF rather than about an alert. */
const ALARM_PREFIX = "⚙️";

/** True for text this relay emitted as its own alarm, not as a relayed alert. */
export function isAlarmText(text: string): boolean {
  return text.startsWith(ALARM_PREFIX);
}

// ── The webhook body, in the VERIFIED 2.0.2 shape ────────────────────────────
//
// The custom payload is MERGED, nested under a top-level `payload` key — it does NOT
// replace the body. Uptrace's own fields stay top-level, so collision is impossible
// and we read both: the display fields from Uptrace, the secret from our payload.
//
// ⚠️ Traps, each verified and each fatal if got wrong — every one of them rejects
// EVERY real alert while a hand-built fixture of the wrong shape passes:
//   • `id` and `alert.id` are JSON STRINGS, not numbers (`json:"...,string"`).
//   • Read `alert.status`, NOT `alert.state` — same value, `state` is a legacy alias.
//   • `log` is absent ENTIRELY for metric monitors, and A1–A6 are all metric
//     monitors. It is not modelled here at all.
//   • `payload` has no `omitempty`: always present, and `null` when unset.
//
// Tolerant by design: every display field is optional, because a cosmetic gap must
// degrade the message, never drop the alert.
const AlertWebhookSchema = z.object({
  id: z.string().optional(),
  eventName: z.string().optional(),
  createdAt: z.string().optional(),
  payload: z
    .object({
      secret: z.string().optional(),
      title: z.string().optional(),
      value: z.string().optional(),
      threshold: z.string().optional(),
      window: z.string().optional(),
    })
    .nullable()
    .optional(),
  alert: z
    .object({
      id: z.string().optional(),
      name: z.string().optional(),
      status: z.string().optional(),
      createdAt: z.string().optional(),
    })
    .optional(),
});

/**
 * Statuses that mean "no longer firing". ⚠️ UNVERIFIED vocabulary: the architect
 * confirmed WHICH FIELD to read (`alert.status`) but not its full value set. An
 * unknown value therefore renders as firing, which is the safe direction — a
 * recovery shown as an alert is noise; an alert shown as a recovery is a missed
 * incident.
 */
const RESOLVED_STATUSES: ReadonlySet<string> = new Set(["closed", "resolved"]);

/** What the formatter needs, already extracted and independent of the wire shape. */
export interface AlertView {
  title: string;
  resolved: boolean;
  value?: string;
  threshold?: string;
  window?: string;
  since?: string;
}

/** `2026-09-17T14:02:00Z` → `2026-09-17 14:02 UTC`; anything unparseable is kept. */
function formatSince(raw: string): string {
  const parsed = Date.parse(raw);
  if (Number.isNaN(parsed)) {
    return escapeTelegramHtml(raw);
  }
  return `${new Date(parsed).toISOString().slice(0, 16).replace("T", " ")} UTC`;
}

/**
 * The operator's message: WHAT is wrong and WHERE. ⛔ Never which tool noticed — the
 * owner asked for that twice, so the words `uptrace` and `fkit` appear nowhere in
 * anything this function authors, and a test asserts it.
 *
 * Every interpolated field is HTML-escaped: `parse_mode: "HTML"` makes Telegram
 * REJECT a message containing stray markup, so an unescaped `<` loses the alert
 * outright rather than merely making it ugly.
 */
export function formatAlertMessage(view: AlertView): string {
  const title = escapeTelegramHtml(view.title);
  const heading = view.resolved
    ? `✅ Geoconflict · ${BOX_ROLE} · ${title} — resolved`
    : `🚨 Geoconflict · ${BOX_ROLE} · ${title}`;
  const lines = [heading];

  if (view.value !== undefined && view.value.length > 0) {
    // A number alone is not actionable — the threshold and window are what make it
    // mean anything, so they ride on the same line whenever they exist.
    const threshold =
      view.threshold !== undefined && view.threshold.length > 0
        ? ` (threshold ${escapeTelegramHtml(view.threshold)})`
        : "";
    const window =
      view.window !== undefined && view.window.length > 0
        ? `, over ${escapeTelegramHtml(view.window)}`
        : "";
    lines.push(`Value: ${escapeTelegramHtml(view.value)}${threshold}${window}`);
  }
  if (view.since !== undefined && view.since.length > 0) {
    lines.push(`Since: ${formatSince(view.since)}`);
  }
  return lines.join("\n");
}

/**
 * Bounded, in-process dedupe. ⚠️ HONEST RESIDUAL: a process restart empties it, so a
 * retry straddling a restart delivers a duplicate. That is the correct way round — a
 * duplicate alert beats a lost one — and it is in the runbook.
 *
 * A Map iterates in insertion order, which gives oldest-first eviction for free.
 */
export class DedupeCache {
  private readonly entries = new Map<string, number>();

  /** True when this id was already delivered inside the TTL window. */
  seen(id: string, now: number): boolean {
    const expiresAt = this.entries.get(id);
    if (expiresAt !== undefined && expiresAt > now) {
      return true;
    }
    this.entries.delete(id);
    this.entries.set(id, now + DEDUPE_TTL_MS);
    while (this.entries.size > DEDUPE_MAX_ENTRIES) {
      const oldest = this.entries.keys().next();
      if (oldest.done === true) {
        break;
      }
      this.entries.delete(oldest.value);
    }
    return false;
  }

  /**
   * Un-mark an id (review R3). A dedupe entry is written BEFORE delivery is attempted,
   * so an entry for a message that never arrived would suppress the sender's retry and
   * LOSE the alert — the exact opposite of this module's rule that a duplicate beats a
   * loss. Called only when delivery failed.
   */
  forget(id: string): void {
    this.entries.delete(id);
  }
}

export interface AlertRelayConfig {
  /** Blank ⇒ nothing is ever delivered (fail closed on delivery, not on status). */
  secret: string;
  /** Bot credentials, with `threadId` set to the Alerts topic. */
  telegram: TelegramConfig;
  /** Test seam only; production uses sendTelegramMessage. */
  send?: (config: TelegramConfig, text: string) => Promise<TelegramSendOutcome>;
  /** Test seam only; production uses Date.now. */
  now?: () => number;
}

/** What the pre-response phase decided. Nothing here touches the network. */
type Decision =
  | { kind: "deliver"; text: string; keyed: AlertRelayKeyed; id: string }
  | { kind: "drop"; reason: AlertRelayResult; keyed: AlertRelayKeyed };

export function createAlertRelay(
  config: AlertRelayConfig,
  metrics: ProfileMetrics,
): { limiter: RequestHandler; handler: RequestHandler } {
  const send = config.send ?? sendTelegramMessage;
  const now = config.now ?? (() => Date.now());
  const dedupe = new DedupeCache();
  let lastAlarmAt = 0;

  // ⚠️ Mounted BEFORE the secret check on purpose: a rejection loop must not be able
  // to spend unbounded CPU on constant-time compares.
  const limiter = rateLimit({
    windowMs: 60_000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
  });

  /**
   * Tell the operator the relay itself is misconfigured — by a path that does NOT
   * depend on Uptrace, because Uptrace is what is misconfigured. Rate-limited to at
   * most one notice per process per hour: Uptrace keeps posting for ~26 hours while
   * the secret stays wrong, and an un-rate-limited alarm turns that into a flood.
   *
   * ⛔ Names the ENVIRONMENT VARIABLE only. Never a value, never the body, never the
   * bot credentials.
   */
  function raiseAlarm(reason: "rejected" | "malformed", at: number): void {
    if (at - lastAlarmAt < ALARM_MIN_INTERVAL_MS && lastAlarmAt !== 0) {
      return;
    }
    lastAlarmAt = at;
    const what =
      reason === "rejected"
        ? "an alert webhook call failed its secret check"
        : "an alert webhook call could not be parsed";
    void deliver(
      `${ALARM_PREFIX} Geoconflict · ${BOX_ROLE} · ${what}.\n` +
        `Alerts are being DROPPED. Check ${ALERT_WEBHOOK_SECRET_ENV} matches on both sides.`,
      "alarm",
    );
  }

  /** The post-response half. Never throws; failures are counted and logged. */
  async function deliver(
    text: string,
    keyed: AlertRelayKeyed | "alarm",
    id = "",
  ): Promise<void> {
    try {
      const outcome = await send(config.telegram, text);
      if (keyed === "alarm") {
        if (
          outcome.result !== "sent" &&
          outcome.result !== "sent_after_retry"
        ) {
          // Nothing else can report this: the alarm IS the escalation path.
          log.error(
            `alert relay: out-of-band alarm not delivered (${outcome.result}` +
              `${outcome.code === undefined ? "" : `/${outcome.code}`})`,
          );
        }
        return;
      }
      if (outcome.result === "sent" || outcome.result === "sent_after_retry") {
        metrics.alertRelay(outcome.result, keyed);
        return;
      }
      metrics.alertRelay("failed", keyed);
      // Review R3: nothing arrived, so release the id and let a retry through.
      dedupe.forget(id);
      // log.error, not warn: this is an ALERT that did not reach anyone. ⚠️ Nothing
      // automatically reads this line — see the runbook; a rule on the failed counter
      // is circular, and only 0283's ruled daily beat proves sustained delivery.
      log.error(
        `alert relay: delivery failed (${outcome.result}` +
          `${outcome.code === undefined ? "" : `/${outcome.code}`}` +
          `${outcome.status === undefined ? "" : `/${outcome.status}`})`,
      );
    } catch (error) {
      metrics.alertRelay("failed", keyed === "alarm" ? "unkeyed" : keyed);
      dedupe.forget(id);
      log.error(`alert relay: delivery threw: ${formatError(error)}`);
    }
  }

  /**
   * Everything decided before the response: parse → secret → dedupe → render.
   * Deliberately synchronous and network-free, so the only thing that can throw here
   * is a genuine internal failure — which is the one case 5xx is correct for.
   */
  function decide(body: unknown, at: number): Decision {
    const parsed = AlertWebhookSchema.safeParse(body);
    if (!parsed.success) {
      // Nothing was parsed, so nothing could be keyed.
      return { kind: "drop", reason: "malformed", keyed: "unkeyed" };
    }
    const data = parsed.data;
    const provided = data.payload?.secret ?? "";
    // ⚠️ NOT `if (provided && !match)`: a MISSING secret must be treated exactly like
    // a wrong one. That truthiness check is the classic fail-OPEN inversion.
    if (!tokensMatch(provided, config.secret)) {
      // The id is not read before the secret check: an unauthenticated caller must
      // not be able to write into the dedupe map.
      return { kind: "drop", reason: "rejected", keyed: "unkeyed" };
    }
    const id = data.id ?? "";
    // An alert with no usable id is DELIVERED, never dropped — dropping it would
    // silently lose exactly the alerts whose shape we guessed wrong.
    const keyed: AlertRelayKeyed = id.length > 0 ? "keyed" : "unkeyed";
    if (keyed === "keyed" && dedupe.seen(id, at)) {
      // A dedupe hit is keyed BY DEFINITION — it is the id that matched.
      return { kind: "drop", reason: "deduped", keyed };
    }
    const status = data.alert?.status ?? "";
    const text = formatAlertMessage({
      title: data.alert?.name ?? data.payload?.title ?? "Unnamed alert",
      resolved: RESOLVED_STATUSES.has(status.trim().toLowerCase()),
      value: data.payload?.value,
      threshold: data.payload?.threshold,
      window: data.payload?.window,
      since: data.alert?.createdAt ?? data.createdAt,
    });
    return { kind: "deliver", text, keyed, id };
  }

  const handler: RequestHandler = (req, res) => {
    let at: number;
    let decision: Decision;
    try {
      at = now();
      decision = decide(req.body, at);
    } catch (error) {
      metrics.alertRelay("failed", "unkeyed");
      log.error(
        `alert relay: internal failure before responding: ${formatError(error)}`,
      );
      // The ONE correct 5xx: transient, and worth Uptrace's retry budget.
      res.status(500).json({ status: "error" });
      return;
    }

    if (decision.kind === "drop") {
      metrics.alertRelay(decision.reason, decision.keyed);
      // ⛔ 200, not 401/403/404 — see the header. A wrong secret is a CONFIGURATION
      // error: wrong on retry 2 and on retry 32, so retrying buys nothing and each
      // attempt re-persists the wrong secret into Uptrace's notification history.
      res.status(200).json({ status: "accepted" });
      if (decision.reason === "rejected" || decision.reason === "malformed") {
        log.error(`alert relay: dropped a webhook call (${decision.reason})`);
        raiseAlarm(decision.reason, at);
      }
      return;
    }

    // Respond FIRST, deliver second (ADR-114 Decision 4): holding the response for a
    // slow Telegram earns a duplicate, not a delay. The consequence, deliberate: a
    // send failure happens after the response and can never be signalled by status —
    // the retry in TelegramNotifier and the counters here are the whole answer to it.
    res.status(202).json({ status: "accepted" });
    void deliver(decision.text, decision.keyed, decision.id);
  };

  return { limiter, handler };
}
