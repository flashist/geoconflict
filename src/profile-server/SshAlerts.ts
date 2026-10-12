// Task 0443 — SSH security alerts: each box's agent (ssh-alerts.sh) → this route → the
// operator's Alerts topic.
//
// Every box (game prod/dev, profile, telemetry) runs the agent. It POSTs one JSON event per
// thing worth knowing: a SUCCESSFUL ssh login, fail2ban down/back, a daily count, a test, or
// "N alerts dropped". This box is the only one that talks to Telegram (ADR-114: the profile box
// is the admin box, and alert logic lives here), so no new Telegram sender and no proxy
// allow-list change is needed for any of the others.
//
// ⚠️ ORDINARY STATUS CODES — deliberately NOT AlertRelay.ts's never-401 contract. That contract
// exists because Uptrace disables its channel on a 401/403/404. The agent is our own script and
// treats every non-2xx except 400 as "keep it and retry", so a plain verdict is the right
// answer here:
//   202 accepted · 400 malformed (the agent drops it — it can never succeed) · 401 bad token ·
//   429 the limiter · 500 a daily report that could not be stored · 503 no token configured.
//
// ⛔ PRIVACY: the agent masks the source address on the box (first two parts only) — the full
// address never reaches this server. Even the masked one goes into the Telegram message only:
// never into a log line and never into a response body.
//
// Logins are GROUPED (owner ruling Q3, "first now + one follow-up"): the key is
// box + source + method. The first login of a group is sent at once; matching logins in the
// next SSH_LOGIN_GROUP_WINDOW_MS become ONE follow-up message listing the users. Users are
// listed, not part of the key, so a game deploy's `openfront` and `root` logins share a group —
// but a PASSWORD login never hides inside a key group. Groups live in memory: a restart loses
// at most one follow-up (accepted, architect).

import type { RequestHandler } from "express";
import rateLimit from "express-rate-limit";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { z } from "zod";
import {
  escapeTelegramHtml,
  sendTelegramMessage,
  type TelegramConfig,
  type TelegramSendOutcome,
} from "../core/notifications/TelegramNotifier";
import { tokensMatch } from "./InternalAuth";
import { formatError, logger } from "./Logger";

const log = logger.child({ comp: "ssh-alerts" });

/** Mounted under `/internal/` to inherit nginx's IP allow list, like the alert webhook. */
export const SSH_ALERTS_PATH = "/internal/v1/ssh-alerts/events";

/** The fixed list of box names an event may carry (and the daily file names they become). */
export const SSH_ALERT_BOXES = [
  "game-prod",
  "game-dev",
  "game-staging",
  "profile",
  "telemetry",
] as const;
export type SshAlertBox = (typeof SSH_ALERT_BOXES)[number];

/**
 * The agent version this build expects. ⚠️ MUST equal `SSH_ALERTS_AGENT_VERSION` in
 * ssh-alerts.sh — the hardening harness asserts the two agree. The daily digest flags a box
 * whose last report came from an older agent (a box restored from a backup and not yet
 * redeployed, for example).
 */
export const SSH_ALERTS_AGENT_VERSION = 1;

/**
 * Where the daily reports (and the digest's marker) live INSIDE the container. setup-profile.sh
 * bind-mounts this directory from the host; the harness asserts the two agree. A compiled-in
 * constant plus test seams, not an environment variable (the 0284 D1 reasoning).
 */
export const SSH_ALERTS_STATE_DIR = "/var/lib/profile/ssh-alerts";

/** The grouping window: the first login now, everything matching within it as ONE follow-up. */
export const SSH_LOGIN_GROUP_WINDOW_MS = 2 * 60 * 1000;

export function dailyReportPath(dir: string, box: SshAlertBox): string {
  return join(dir, `daily-${box}.json`);
}

/**
 * ADR-114 Decision 6 (0443 review R1, owner ruling "Fix it"): a Telegram send that still fails
 * after TelegramNotifier's one retry must be made VISIBLE, not only logged. The agent cannot
 * help — the route already answered 202 — so every such failure bumps a running total in this
 * file, and the next daily SSH digest shows how many were lost since the digest before it.
 * A running total (never reset here) because the digest runs as a separate process: it keeps
 * the total it last reported in its own marker and shows the difference.
 */
export function failedSendsPath(dir: string): string {
  return join(dir, "failed-sends.json");
}

/** The running total of failed sends; 0 when the file is missing or unreadable. Never throws. */
export function readFailedSendsTotal(
  path: string,
  readFile: (path: string) => string = (p) => readFileSync(p, "utf8"),
): number {
  try {
    const total = (JSON.parse(readFile(path)) as { total?: unknown }).total;
    return typeof total === "number" &&
      Number.isSafeInteger(total) &&
      total >= 0
      ? total
      : 0;
  } catch {
    return 0;
  }
}

// ── The wire shape ────────────────────────────────────────────────────────────
// Non-strict objects: a field a NEWER agent adds is stripped, not rejected — a 400 would make
// the agent drop the event for good.

const IsoInstant = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/);

export const FAIL2BAN_STATUSES = [
  "up",
  "down",
  "jail-missing",
  "not-installed",
] as const;
export type Fail2banStatus = (typeof FAIL2BAN_STATUSES)[number];

const common = {
  box: z.enum(SSH_ALERT_BOXES),
  agentVersion: z.number().int().min(0).max(1_000_000),
  at: IsoInstant,
};

const LoginEventSchema = z.object({
  type: z.literal("login"),
  ...common,
  user: z.string().regex(/^[A-Za-z0-9_.@-]{1,64}$/),
  method: z.enum(["key", "password", "other"]),
  // ONLY the agent's masked forms — `203.0.*.*`, `2001:db8::*` — or `unknown`. A full address
  // is refused (400), so a buggy or old agent cannot push one into the Telegram history.
  source: z
    .string()
    .regex(
      /^(unknown|\d{1,3}\.\d{1,3}\.\*\.\*|[0-9a-f]{1,4}:[0-9a-f]{1,4}::\*)$/,
    ),
  provider: z.string().regex(/^[a-z0-9.-]{1,80}$/),
});

const Fail2banEventSchema = z.object({
  type: z.literal("fail2ban"),
  ...common,
  event: z.enum(["down", "back", "reminder"]),
  status: z.enum(FAIL2BAN_STATUSES),
  since: IsoInstant.optional(),
});

/** A count, or null when the box could not read it — never a silent 0. */
const Count = z.number().int().min(0).max(1_000_000_000).nullable();

export const DailyEventSchema = z.object({
  type: z.literal("daily"),
  ...common,
  failed: Count,
  invalid: Count,
  bans: Count,
  journal: z.enum(["ok", "unreadable"]),
  banLog: z.enum(["ok", "partial", "unreadable"]),
  fail2ban: z.enum(FAIL2BAN_STATUSES),
});
export type DailyEvent = z.infer<typeof DailyEventSchema>;

const TestEventSchema = z.object({ type: z.literal("test"), ...common });

const DroppedEventSchema = z.object({
  type: z.literal("dropped"),
  ...common,
  count: z.number().int().min(1).max(1_000_000),
});

export const SshAlertEventSchema = z.discriminatedUnion("type", [
  LoginEventSchema,
  Fail2banEventSchema,
  DailyEventSchema,
  TestEventSchema,
  DroppedEventSchema,
]);
export type SshAlertEvent = z.infer<typeof SshAlertEventSchema>;
type LoginEvent = z.infer<typeof LoginEventSchema>;

// ── Messages ──────────────────────────────────────────────────────────────────
// Every interpolated field is HTML-escaped (parse_mode HTML rejects a message with stray
// markup, which would lose the alert), even though the schema already narrows them.

/** `2026-10-12T10:00:05Z` → `2026-10-12 10:00 UTC`. */
export function formatUtc(iso: string): string {
  return `${iso.slice(0, 16).replace("T", " ")} UTC`;
}

const METHOD_WORDS: Record<LoginEvent["method"], string> = {
  key: "by key",
  password: "by PASSWORD",
  other: "by another method",
};

function fromLine(event: LoginEvent): string {
  return `From: ${escapeTelegramHtml(event.source)} (${escapeTelegramHtml(event.provider)})`;
}

export function formatLoginMessage(event: LoginEvent): string {
  const heading =
    event.method === "password"
      ? `⚠️ SSH login by PASSWORD · ${escapeTelegramHtml(event.box)}`
      : `🔑 SSH login · ${escapeTelegramHtml(event.box)}`;
  return [
    heading,
    `User: ${escapeTelegramHtml(event.user)} · ${METHOD_WORDS[event.method]}`,
    fromLine(event),
    `Time: ${formatUtc(event.at)}`,
  ].join("\n");
}

export function formatLoginFollowUp(
  first: LoginEvent,
  extra: number,
  users: readonly string[],
): string {
  const noun = extra === 1 ? "login" : "logins";
  return [
    `🔑 +${extra} more SSH ${noun} · ${escapeTelegramHtml(first.box)}`,
    `Users: ${users.map(escapeTelegramHtml).join(", ")} · ${METHOD_WORDS[first.method]}`,
    fromLine(first),
    `Within ${SSH_LOGIN_GROUP_WINDOW_MS / 60_000} min of the login above (${formatUtc(first.at)})`,
  ].join("\n");
}

const FAIL2BAN_WORDS: Record<Fail2banStatus, string> = {
  up: "running",
  down: "not running",
  "jail-missing": "running, but its sshd jail is missing or not answering",
  "not-installed": "not installed",
};

export function formatEventMessage(event: SshAlertEvent): string | undefined {
  const box = escapeTelegramHtml(event.box);
  switch (event.type) {
    case "login":
      return formatLoginMessage(event);
    case "fail2ban": {
      const since =
        event.since === undefined ? [] : [`Since: ${formatUtc(event.since)}`];
      if (event.event === "back") {
        return `✅ fail2ban back · ${box}\nIt is running again; failed logins are banned again.`;
      }
      const heading =
        event.event === "down"
          ? `🚨 fail2ban DOWN · ${box}`
          : `🚨 fail2ban STILL DOWN · ${box} (reminder every 12 h)`;
      return [
        heading,
        `State: ${FAIL2BAN_WORDS[event.status]}`,
        ...since,
        "Password guessers are NOT being banned on this box.",
      ].join("\n");
    }
    case "test":
      return `🧪 SSH alerts test · ${box}\nThe path box → profile box → Telegram works.`;
    case "dropped":
      return (
        `⚠️ SSH alerts · ${box}: ${event.count} alert(s) could not be delivered within 24 h ` +
        "and were dropped. Check that box's /var/log/geoconflict-ssh-alerts.log."
      );
    case "daily":
      // Stored, never messaged one by one — the profile box sends ONE digest a day.
      return undefined;
  }
}

// ── The route ─────────────────────────────────────────────────────────────────

export interface SshAlertsConfig {
  /** PROFILE_SSH_ALERT_TOKEN. Blank ⇒ every call answers 503 (nothing is accepted). */
  token: string;
  /** Bot credentials, with `threadId` set to the Alerts topic. */
  telegram: TelegramConfig;
  /** Test seam only; production uses sendTelegramMessage. */
  send?: (config: TelegramConfig, text: string) => Promise<TelegramSendOutcome>;
  /** Test seam only; production uses Date.now. */
  now?: () => number;
  /** Test seam only; production uses SSH_ALERTS_STATE_DIR. */
  stateDir?: string;
  /** Test seam only; production writes atomically (temp file + rename). */
  writeFile?: (path: string, contents: string) => void;
  /** Test seam only; production reads the file. */
  readFile?: (path: string) => string;
  /** Test seam only; production uses an unref'd setTimeout. */
  setTimer?: (fn: () => void, ms: number) => unknown;
}

function writeFileAtomically(path: string, contents: string): void {
  mkdirSync(dirname(path), { recursive: true });
  const temp = `${path}.tmp`;
  writeFileSync(temp, contents, { mode: 0o600 });
  renameSync(temp, path);
}

function defaultSetTimer(fn: () => void, ms: number): unknown {
  const timer = setTimeout(fn, ms);
  timer.unref?.();
  return timer;
}

interface LoginGroup {
  first: LoginEvent;
  /** When the relay RECEIVED the first login — paces the follow-up timer. */
  openedAt: number;
  /** When the first login HAPPENED on the box (its `at`) — decides who joins (0443 review R4). */
  firstAt: number;
  extra: number;
  users: Set<string>;
  timerSet: boolean;
  flushed: boolean;
}

const BEARER_PREFIX = "Bearer ";

export function createSshAlertsRoute(config: SshAlertsConfig): {
  limiter: RequestHandler;
  handler: RequestHandler;
} {
  const send = config.send ?? sendTelegramMessage;
  const now = config.now ?? (() => Date.now());
  const stateDir = config.stateDir ?? SSH_ALERTS_STATE_DIR;
  const writeFile = config.writeFile ?? writeFileAtomically;
  const setTimer = config.setTimer ?? defaultSetTimer;
  const readFile = config.readFile ?? ((p: string) => readFileSync(p, "utf8"));
  const groups = new Map<string, LoginGroup>();

  // Before the token check, so a rejection loop cannot spend unbounded CPU on compares.
  const limiter = rateLimit({
    windowMs: 60_000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
  });

  /** Bumps the failed-send total the daily digest reports (R1). Never throws. */
  function recordFailedSend(): void {
    const path = failedSendsPath(stateDir);
    try {
      const total = readFailedSendsTotal(path, readFile) + 1;
      writeFile(
        path,
        `${JSON.stringify(
          {
            schema: 1,
            total,
            lastAt: `${new Date(now()).toISOString().slice(0, 19)}Z`,
          },
          null,
          2,
        )}\n`,
      );
    } catch (error) {
      log.error(
        `ssh alerts: could not record a failed send for the digest: ${formatError(error)}`,
      );
    }
  }

  /** Never throws. Bounded fields only in the log line — no source, no token, no chat id. */
  async function deliver(text: string, what: string): Promise<void> {
    try {
      const outcome = await send(config.telegram, text);
      if (outcome.result === "sent" || outcome.result === "sent_after_retry") {
        return;
      }
      log.error(
        `ssh alerts: ${what} NOT delivered (${outcome.result}` +
          `${outcome.code === undefined ? "" : `/${outcome.code}`}` +
          `${outcome.status === undefined ? "" : `/${outcome.status}`})`,
      );
    } catch (error) {
      log.error(`ssh alerts: ${what} delivery threw: ${formatError(error)}`);
    }
    recordFailedSend();
  }

  /**
   * Sends a group's follow-up, once. Called by its own timer, or early when a newer login
   * replaces the group — so the timer must flush ITS group, never whichever group now holds
   * the key (0443 review R4b: that lost the old follow-up and deleted the new group).
   */
  function flushGroup(key: string, group: LoginGroup): void {
    if (groups.get(key) === group) {
      groups.delete(key);
    }
    if (group.flushed || group.extra === 0) {
      return;
    }
    group.flushed = true;
    void deliver(
      formatLoginFollowUp(group.first, group.extra, [...group.users].sort()),
      `a login follow-up for ${group.first.box}`,
    );
  }

  function handleLogin(event: LoginEvent): void {
    const at = now();
    const eventAt = Date.parse(event.at);
    const key = `${event.box}|${event.source}|${event.method}`;
    const group = groups.get(key);
    // Joins only if it HAPPENED within the window of the group's first login (its `at`), not
    // merely ARRIVED within it: logins spooled through an outage arrive seconds apart however
    // far apart they happened, and the follow-up says "within 2 min" (0443 review R4a).
    if (
      group !== undefined &&
      at - group.openedAt < SSH_LOGIN_GROUP_WINDOW_MS &&
      Math.abs(eventAt - group.firstAt) < SSH_LOGIN_GROUP_WINDOW_MS
    ) {
      group.extra += 1;
      group.users.add(event.user);
      if (!group.timerSet) {
        group.timerSet = true;
        setTimer(
          () => flushGroup(key, group),
          Math.max(0, group.openedAt + SSH_LOGIN_GROUP_WINDOW_MS - at),
        );
      }
      return;
    }
    // Replaced by a new group. An old one still holding logins sends its follow-up NOW, so no
    // login is ever folded away unreported (0443 review R4b).
    if (group !== undefined) {
      flushGroup(key, group);
    }
    groups.set(key, {
      first: event,
      openedAt: at,
      firstAt: eventAt,
      extra: 0,
      users: new Set<string>(),
      timerSet: false,
      flushed: false,
    });
    void deliver(formatLoginMessage(event), `a login alert for ${event.box}`);
  }

  function storeDaily(event: DailyEvent): void {
    writeFile(
      dailyReportPath(stateDir, event.box),
      `${JSON.stringify(
        {
          schema: 1,
          receivedAt: `${new Date(now()).toISOString().slice(0, 19)}Z`,
          report: event,
        },
        null,
        2,
      )}\n`,
    );
  }

  const handler: RequestHandler = (req, res) => {
    if (config.token.length === 0) {
      res.status(503).json({ error: "not_configured" });
      return;
    }
    const header = req.get("authorization") ?? "";
    const provided = header.startsWith(BEARER_PREFIX)
      ? header.slice(BEARER_PREFIX.length)
      : "";
    if (!tokensMatch(provided, config.token)) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    const parsed = SshAlertEventSchema.safeParse(req.body);
    if (!parsed.success) {
      log.warn("ssh alerts: rejected a malformed event (400)");
      res.status(400).json({ error: "invalid_event" });
      return;
    }
    const event = parsed.data;
    if (event.type === "daily") {
      try {
        storeDaily(event);
      } catch (error) {
        // 500, so the agent keeps the report and retries it.
        log.error(
          `ssh alerts: could not store the daily report for ${event.box}: ${formatError(error)}`,
        );
        res.status(500).json({ error: "store_failed" });
        return;
      }
      res.status(202).json({ status: "accepted" });
      return;
    }
    // Respond first, deliver second (ADR-114 Decision 4): holding the agent for a slow
    // Telegram buys nothing — TelegramNotifier retries once itself.
    res.status(202).json({ status: "accepted" });
    if (event.type === "login") {
      handleLogin(event);
      return;
    }
    const text = formatEventMessage(event);
    if (text !== undefined) {
      void deliver(text, `a ${event.type} alert for ${event.box}`);
    }
  };

  return { limiter, handler };
}
