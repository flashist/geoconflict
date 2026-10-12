// Daily SSH security digest (task 0443) — ONE message a day in the Alerts topic.
//
// Each box's agent (ssh-alerts.sh) posts its daily counts to the SSH alert route
// (SshAlerts.ts), which stores the LATEST one per box as daily-<box>.json. This module reads
// them and sends a single message with one line per box: failed logins, unknown-user tries and
// fail2ban bans over the 24 h before that box's report, plus fail2ban's state.
//
// ⛔ A MISSING NUMBER MUST NEVER LOOK LIKE "0 ATTACKS" (the brief's hard rule):
//   - a box with no report in SSH_DAILY_STALE_MS reads "NO REPORT since …", never a count;
//   - a box that has NEVER reported — an expected box (SSH_ALERTS_EXPECTED_BOXES) with no file —
//     reads "NO REPORT — never reported", so a box whose agent was never installed is visible;
//   - a count the box could not read is spelled UNREADABLE; a ban log that does not reach back
//     a full 24 h is marked; an outdated agent is flagged;
//   - a report older than SSH_DAILY_FRESH_MS (so not today's) is marked OLD, with its time —
//     yesterday's numbers never pass for today's (0443 review R7).
//
// It also says how many SSH alert messages the relay could NOT get to Telegram since the last
// digest (ADR-114 Decision 6, 0443 review R1): the route keeps a running total in
// failed-sends.json, the marker below keeps the total this digest last reported.
//
// ⛔ What its arrival proves: Telegram delivery from the profile box works, and each fresh box
// line proves that box → profile delivery works. It proves NOTHING about the Uptrace alert
// webhook route (ADR-114 A3.3) — that is the 0284 probe's job.
//
// On a successful send it writes the marker last-ssh-digest.json (owner ruling Q8: the marker
// now, a check that pages on its age later, after 0219). Nothing reads it yet.

import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  escapeTelegramHtml,
  sendTelegramMessage,
  type TelegramConfig,
  type TelegramSendOutcome,
} from "../core/notifications/TelegramNotifier";
import { formatError, logger } from "./Logger";
import {
  DailyEventSchema,
  dailyReportPath,
  failedSendsPath,
  formatUtc,
  readFailedSendsTotal,
  SSH_ALERT_BOXES,
  SSH_ALERTS_AGENT_VERSION,
  SSH_ALERTS_STATE_DIR,
  type DailyEvent,
  type Fail2banStatus,
  type SshAlertBox,
} from "./SshAlerts";

const log = logger.child({ comp: "ssh-security-digest" });

/** Boxes that are expected to report — shown as NO REPORT even if they never have. */
export const SSH_ALERTS_EXPECTED_BOXES: readonly SshAlertBox[] = [
  "game-prod",
  "game-dev",
  "profile",
  "telemetry",
];

/** A report older than this is shown as NO REPORT (a day plus slack for a late tick). */
export const SSH_DAILY_STALE_MS = 26 * 60 * 60 * 1000;

/**
 * A report older than this is not today's and is marked OLD. Boxes report at the first tick at
 * or after 08:00 UTC and the digest runs at 08:10 UTC, so today's report is minutes old; one that
 * arrives late (spooled through a relay hiccup) leaves yesterday's — about 24 h old — in place.
 */
export const SSH_DAILY_FRESH_MS = 12 * 60 * 60 * 1000;

export const SSH_DIGEST_MARKER_PATH = join(
  SSH_ALERTS_STATE_DIR,
  "last-ssh-digest.json",
);

export type StoredDaily =
  | { kind: "missing" }
  | { kind: "unreadable" }
  | { kind: "ok"; receivedAt: string; report: DailyEvent };

/** Reads one box's stored report. Never throws. */
export function readStoredDaily(
  path: string,
  readFile: (path: string) => string = (p) => readFileSync(p, "utf8"),
): StoredDaily {
  let raw: string;
  try {
    raw = readFile(path);
  } catch (error) {
    return (error as NodeJS.ErrnoException)?.code === "ENOENT"
      ? { kind: "missing" }
      : { kind: "unreadable" };
  }
  try {
    const parsed = JSON.parse(raw) as {
      receivedAt?: unknown;
      report?: unknown;
    };
    const report = DailyEventSchema.safeParse(parsed.report);
    if (
      typeof parsed.receivedAt !== "string" ||
      Number.isNaN(Date.parse(parsed.receivedAt)) ||
      !report.success
    ) {
      return { kind: "unreadable" };
    }
    return { kind: "ok", receivedAt: parsed.receivedAt, report: report.data };
  } catch {
    return { kind: "unreadable" };
  }
}

const FAIL2BAN_SHORT: Record<Fail2banStatus, string> = {
  up: "fail2ban up",
  down: "fail2ban DOWN",
  "jail-missing": "fail2ban jail MISSING",
  "not-installed": "fail2ban NOT INSTALLED",
};

function countText(value: number | null, noun: string): string {
  return value === null ? `${noun} UNREADABLE` : `${value} ${noun}`;
}

/** One box's line. Exported for the tests. */
export function formatBoxLine(
  box: SshAlertBox,
  stored: StoredDaily,
  at: Date,
): string {
  const name = escapeTelegramHtml(box);
  if (stored.kind === "missing") {
    return `${name}: NO REPORT — never reported (is its agent installed?)`;
  }
  if (stored.kind === "unreadable") {
    return `${name}: NO REPORT — its stored report is unreadable`;
  }
  const age = at.getTime() - Date.parse(stored.receivedAt);
  if (age > SSH_DAILY_STALE_MS) {
    return `${name}: NO REPORT since ${formatUtc(stored.receivedAt)}`;
  }
  const old =
    age > SSH_DAILY_FRESH_MS
      ? `⚠️ OLD numbers from ${formatUtc(stored.receivedAt)}, today's report has not arrived · `
      : "";
  const r = stored.report;
  const bans =
    r.bans !== null && r.banLog === "partial"
      ? `${r.bans} bans (ban log covers less than 24 h)`
      : countText(r.bans, "bans");
  const parts = [
    countText(r.failed, "failed logins"),
    countText(r.invalid, "unknown-user tries"),
    bans,
    FAIL2BAN_SHORT[r.fail2ban],
  ];
  const outdated =
    r.agentVersion < SSH_ALERTS_AGENT_VERSION
      ? ` · ⚠️ agent v${r.agentVersion} is outdated (current v${SSH_ALERTS_AGENT_VERSION}) — redeploy this box`
      : "";
  return `${name}: ${old}${parts.join(" · ")}${outdated}`;
}

/** The boxes to show: every expected one, then any other box that has ever reported. */
export function digestBoxes(
  exists: (box: SshAlertBox) => boolean,
): SshAlertBox[] {
  const extra = SSH_ALERT_BOXES.filter(
    (box) => !SSH_ALERTS_EXPECTED_BOXES.includes(box) && exists(box),
  );
  return [...SSH_ALERTS_EXPECTED_BOXES, ...extra];
}

/** The R1 line, or nothing when every SSH alert since the last digest reached Telegram. */
export function formatFailedSendsLine(count: number): string | undefined {
  if (count <= 0) {
    return undefined;
  }
  return (
    `⚠️ ${count} SSH alert message${count === 1 ? "" : "s"} could not be sent to Telegram ` +
    "since the last digest — they are lost; the profile box's container log has each one."
  );
}

export function formatSshSecurityDigest(
  lines: readonly string[],
  at: Date,
  failedSends = 0,
): string {
  const failedLine = formatFailedSendsLine(failedSends);
  return [
    `🛡 SSH security · daily · ${at.toISOString().slice(0, 10)}`,
    ...lines,
    ...(failedLine === undefined ? [] : [failedLine]),
    "Counts cover the 24 h before each box's report. NO REPORT means the numbers are " +
      "unknown — not zero. An unknown-user try that also sent a password counts in both " +
      "failed logins and unknown-user tries.",
  ].join("\n");
}

/** The failed-send total the last successful digest reported (0 when there is none). */
function readReportedFailedSends(
  path: string,
  readFile: (path: string) => string,
): number {
  try {
    const value = (JSON.parse(readFile(path)) as { failedSendsTotal?: unknown })
      .failedSendsTotal;
    return typeof value === "number" &&
      Number.isSafeInteger(value) &&
      value >= 0
      ? value
      : 0;
  } catch {
    return 0;
  }
}

export interface SshSecurityDigestDeps {
  /** Bot credentials, with `threadId` set to the Alerts topic. */
  telegram: TelegramConfig;
  /** Test seam only; production uses sendTelegramMessage. */
  send?: (config: TelegramConfig, text: string) => Promise<TelegramSendOutcome>;
  /** Test seam only; production uses () => new Date(). */
  now?: () => Date;
  /** Test seam only; production uses SSH_ALERTS_STATE_DIR. */
  stateDir?: string;
  /** Test seam only; production reads the file. */
  readFile?: (path: string) => string;
  /** Test seam only; production uses SSH_DIGEST_MARKER_PATH. */
  markerPath?: string;
  /** Test seam only; production writes the marker atomically. */
  writeMarkerFile?: (path: string, contents: string) => void;
}

function writeMarkerFileAtomically(path: string, contents: string): void {
  mkdirSync(dirname(path), { recursive: true });
  const temp = `${path}.tmp`;
  writeFileSync(temp, contents, { mode: 0o600 });
  renameSync(temp, path);
}

/** Read, format, send — and ONLY on a successful send, stamp the marker. */
export async function runSshSecurityDigest(
  deps: SshSecurityDigestDeps,
): Promise<"sent" | "failed"> {
  const send = deps.send ?? sendTelegramMessage;
  const now = deps.now ?? (() => new Date());
  const stateDir = deps.stateDir ?? SSH_ALERTS_STATE_DIR;
  const markerPath =
    deps.markerPath ??
    (deps.stateDir === undefined
      ? SSH_DIGEST_MARKER_PATH
      : join(stateDir, "last-ssh-digest.json"));
  const writeMarker = deps.writeMarkerFile ?? writeMarkerFileAtomically;
  const readFile = deps.readFile ?? ((p: string) => readFileSync(p, "utf8"));

  const at = now();
  const stored = new Map<SshAlertBox, StoredDaily>();
  for (const box of SSH_ALERT_BOXES) {
    stored.set(
      box,
      readStoredDaily(dailyReportPath(stateDir, box), deps.readFile),
    );
  }
  const boxes = digestBoxes((box) => stored.get(box)?.kind !== "missing");
  const lines = boxes.map((box) =>
    formatBoxLine(box, stored.get(box) ?? { kind: "missing" }, at),
  );
  // R1: the total now minus the total the last digest reported. A total BELOW that means the
  // file was lost or reset — then everything in it is new.
  const failedTotal = readFailedSendsTotal(failedSendsPath(stateDir), readFile);
  const reported = readReportedFailedSends(markerPath, readFile);
  const failedSince =
    failedTotal >= reported ? failedTotal - reported : failedTotal;
  const outcome = await send(
    deps.telegram,
    formatSshSecurityDigest(lines, at, failedSince),
  );
  if (outcome.result !== "sent" && outcome.result !== "sent_after_retry") {
    log.error(
      `ssh security digest NOT sent: result=${outcome.result}` +
        `${outcome.status === undefined ? "" : ` status=${outcome.status}`}` +
        `${outcome.code === undefined ? "" : ` code=${outcome.code}`}`,
    );
    return "failed";
  }
  try {
    writeMarker(
      markerPath,
      `${JSON.stringify(
        {
          schema: 1,
          finished_at: `${now().toISOString().slice(0, 19)}Z`,
          source: "ssh-security-digest",
          failedSendsTotal: failedTotal,
        },
        null,
        2,
      )}\n`,
    );
  } catch (error) {
    // The message DID arrive; an aged marker is the safe direction.
    log.error(
      `ssh security digest: could not write the marker: ${formatError(error)}`,
    );
  }
  log.info(`ssh security digest sent (${boxes.length} boxes)`);
  return "sent";
}
