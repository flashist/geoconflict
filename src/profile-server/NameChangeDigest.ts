// Daily digest of pending name-change reviews (task 0283).
//
// WHAT IT IS: one Telegram message per day into the Name Changes topic, carrying the
// number of players waiting for a name review — THE HEARTBEAT. The entry point that runs
// it is sendNameChangeDigest.ts; a host cron line on the profile box fires it once a day.
//
// Task 0315 adds a SECOND message after it, on days with at least one request waiting:
// the list (up to PENDING_LIST_CAP requests, oldest first — id, requested name, how long
// it has waited). Owner ruling 2026-09-27: "Always send the short message as it works
// today. And the next message with more text". So the heartbeat below is byte-identical
// to before and is STILL the only thing that decides the marker, check 12 and the exit
// code; the list is extra, is sent only after the heartbeat arrived, and a failed list
// changes none of those three (it shows only in the digest log — nothing pages for it).
//
// ⛔ IT SENDS EVEN WHEN THE COUNT IS ZERO — owner ruling, 2026-09-17. This is NOT a
// nuisance to optimise away: the daily arrival is the heartbeat for Telegram delivery
// from this box, so the message's ABSENCE is the signal. A digest that spoke only when
// there was something to report would be indistinguishable from a digest whose delivery
// had broken — the exact silent-failure class task 0061 documents. Adding a
// "skip when empty" branch here (or a flag, or an env var that enables one) REMOVES A
// LIVENESS CHECK. The hardening harness greps this file to make that turn `npm test`
// red rather than silently delete the heartbeat.
//
// ⛔ WHAT ITS ARRIVAL PROVES, and only this: Telegram delivery from the profile box is
// alive. It proves NOTHING about Uptrace alert delivery — it never touches the
// monitoring stack, never crosses nginx's /internal/ allowlist, and never arrives from
// the monitoring box's egress address. A 403 could have permanently disabled the alert
// channel while this digest kept arriving daily. Task 0284's probe guards that path;
// neither substitutes for the other.

import { mkdirSync, renameSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { Pool } from "pg";
import {
  escapeTelegramHtml,
  sendTelegramMessage,
  type TelegramConfig,
  type TelegramSendOutcome,
} from "../core/notifications/TelegramNotifier";
import { formatError, logger } from "./Logger";
import {
  describeRequestedNameForModerator,
  wouldMatchFilterHideName,
} from "./NameChangeRepository";

const log = logger.child({ comp: "name-change-digest" });

/**
 * The count query.
 *
 * WHY ONE NUMBER SUFFICES, and why this must not be "improved" into a grouped query:
 * `player_name_history_one_pending_uq` (migrations/006_player_identity.sql:144) is
 * `unique (player_id) where moderation_status = 'pending'`, so at most ONE pending row
 * can exist per player. The count of pending ROWS therefore IS the count of waiting
 * PLAYERS. ⛔ No DISTINCT, no GROUP BY — they would be noise, and a reader who adds one
 * is asserting a duplicate the schema forbids.
 */
export const PENDING_COUNT_SQL = `
SELECT count(*)::int AS pending
FROM player_name_history
WHERE moderation_status = 'pending'
`;

/**
 * Where the marker is written INSIDE the container (task 0283 §8). setup-profile.sh
 * bind-mounts this directory so profile-checks.sh can read the file on the HOST.
 *
 * ⛔ Its own directory, a SIBLING of alerts/ — never the same one. Two different signals
 * (Telegram-delivery heartbeat vs alert-path reachability) that a future reader must not
 * be able to confuse. ⛔ And never backups/, which would expose every encrypted dump to
 * the app container.
 *
 * A compiled-in constant, not an environment variable: the bind mount and this string
 * must agree, and the hardening harness asserts exactly that.
 */
export const NAME_CHANGE_DIGEST_MARKER_PATH =
  "/var/lib/profile/digest/last-name-change-digest.json";

/** What one digest run did. `failed` is anything that did not reach Telegram. */
export type NameChangeDigestResult = "sent" | "failed";

/**
 * Atomic marker write: a temp file in the same directory, then rename. Lifted from
 * AlertRelay.ts:129 rather than imported — importing that module would pull express and
 * express-rate-limit into a one-shot CLI, and the CLI must stay small (see the
 * import-surface note in sendNameChangeDigest.ts). ⚠️ Since task 0315 the CLI DOES load
 * zod, through ./NameChangeRepository (the list reuses 0307's name display) — a known,
 * accepted cost: decideNameChange.ts already loads zod on the same box, and nothing on
 * that path reaches ./Server, ./Routes or ./Telemetry. Since task 0322 it also loads
 * `obscenity` (the match's rude-name matcher, for the list's warning) the same way — a
 * small, accepted memory cost on the low-RAM box, again nowhere near those three
 * modules. A TORN write would leave an
 * unparseable `finished_at`, which profile-checks.sh reads as a FAIL — the safe
 * direction, but a page for no reason.
 */
function writeMarkerFileAtomically(path: string, contents: string): void {
  mkdirSync(dirname(path), { recursive: true });
  const temp = `${path}.tmp`;
  writeFileSync(temp, contents, { mode: 0o600 });
  renameSync(temp, path);
}

/**
 * How many players are waiting for a name review. One SELECT, no transaction — the
 * number is a snapshot and nothing acts on it but a human.
 */
export async function countPendingNameChanges(pool: Pool): Promise<number> {
  const result = await pool.query(PENDING_COUNT_SQL);
  return Number(result.rows[0]?.pending ?? 0);
}

/** How many requests the list message names at most (task 0315, owner ruling Q1). */
export const PENDING_LIST_CAP = 20;

/**
 * The list query (task 0315). Oldest request first; `id` breaks a tie.
 *
 * `total` is `count(*) OVER ()`: Postgres computes the window BEFORE `LIMIT`, so every
 * returned row carries the number of pending requests in THIS statement's snapshot —
 * the capped rows and the total that the "…and M more" line needs, read together (review
 * R1/R3). The heartbeat's own count is read earlier, before its send and any retry, so it
 * can be stale in either direction by the time this runs; M never uses it.
 *
 * `changed_at` IS the request time: the insert leaves it at its default, and nothing
 * updates it while the row is pending. ⛔ No DISTINCT or GROUP BY, for the same reason as
 * PENDING_COUNT_SQL — the partial unique index already allows one pending row per player.
 * ⛔ No join to `players`: the list carries the internal `player_id` only, so a Yandex id
 * cannot be selected here, let alone reach Telegram.
 */
export const PENDING_LIST_SQL = `
SELECT player_id, new_display_name, changed_at, count(*) OVER ()::int AS total
FROM player_name_history
WHERE moderation_status = 'pending'
ORDER BY changed_at, id
LIMIT $1
`;

/** One waiting request, as the list message shows it. */
export interface PendingNameChange {
  /** Internal player id (uuid) — what the decide command's `playerId` takes. */
  playerId: string;
  requestedName: string;
  requestedAt: Date;
}

/** What the list query read: up to `limit` requests, and how many are waiting in all. */
export interface PendingNameChangeList {
  /** Every pending request at the moment the list was read — not just those returned. */
  total: number;
  entries: PendingNameChange[];
}

/**
 * Up to `limit` waiting requests, oldest first, plus the total they were cut from. One
 * SELECT, no transaction — the total and the rows come from the same statement. No rows
 * means no total to read, and then nothing is waiting: `total` is 0.
 */
export async function listPendingNameChanges(
  pool: Pool,
  limit: number,
): Promise<PendingNameChangeList> {
  const result = await pool.query(PENDING_LIST_SQL, [limit]);
  const rows = result.rows as {
    player_id: string;
    new_display_name: string;
    changed_at: Date | string;
    total: number | string;
  }[];
  return {
    total: Number(rows[0]?.total ?? 0),
    entries: rows.map((row) => ({
      playerId: String(row.player_id),
      requestedName: String(row.new_display_name),
      requestedAt: new Date(row.changed_at),
    })),
  };
}

/**
 * The operator's message — the HEARTBEAT. HTML parse mode, matching every other
 * operator message. ⛔ Unchanged by task 0315: the list is a separate, second message
 * (formatPendingNameChangeList), never lines appended here.
 *
 * No escapeTelegramHtml call, and that is deliberate rather than an omission: the only
 * interpolated values are an integer this process produced and a timestamp this process
 * produced, neither of which can carry markup. The trap being avoided is the one
 * AlertRelay.ts:310 records — with `parse_mode: "HTML"` a stray `<` makes Telegram
 * REJECT the whole message, so an unescaped value loses the message rather than merely
 * making it ugly. Nothing here can produce one.
 */
export function formatNameChangeDigest(count: number, at: Date): string {
  return [
    "<b>[Name change] Daily digest</b>",
    `Waiting for review: ${String(count)}`,
    `${at.toISOString().slice(0, 16).replace("T", " ")} UTC`,
  ].join("\n");
}

/**
 * The list message's length budget, in JS string length (UTF-16 units). Telegram's limit
 * is 4096 characters AFTER it parses the HTML; the raw markup counted here is always at
 * least that long, so staying under 4000 raw is conservative with room to spare. It binds
 * even within the name rule: 20 names that are all hidden characters would run to about
 * 6,600 characters once each is shown as a ⟨U+XXXX⟩ code.
 */
export const PENDING_LIST_MAX_LENGTH = 4000;

/**
 * How long a request has waited: `N min` under an hour, `N h M min` under a day,
 * `N d M h` after that. A negative age (clock skew between the box and the database)
 * reads `0 min` rather than a nonsense negative.
 */
export function formatWaitingTime(milliseconds: number): string {
  const minutes = Math.floor(Math.max(0, milliseconds) / 60_000);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ${minutes % 60} min`;
  return `${Math.floor(hours / 24)} d ${hours % 24} h`;
}

/**
 * The list message (task 0315): the SECOND message, sent only on days with a request
 * waiting. HTML parse mode.
 *
 * Unlike the heartbeat, this one interpolates text a PLAYER chose, so it escapes: the
 * name goes through 0307's describeRequestedNameForModerator (HTML-escaped, and every
 * character that is not a letter, digit, `_`, `[`, `]` or plain space shown as a visible
 * ⟨U+XXXX⟩ code — so a newline in a name cannot fake a line of this list), and the id is
 * escaped too although it is a uuid from the database. An unescaped `<` would make
 * Telegram reject the whole message (AlertRelay.ts:310).
 *
 * `total` is the list query's own total (PENDING_LIST_SQL's `count(*) OVER ()`), read in
 * the same statement as `entries` — NEVER the heartbeat's count, which is read before the
 * heartbeat's send and can be stale in either direction by now (review R1: a phantom
 * "more" after a decide; R3: the "more" line vanishing at the cap after new requests).
 * The "…and M more" line counts everything not shown — requests past the cap AND any the
 * length budget dropped. The floor at `entries.length` is defensive only: from one
 * statement the total can never be smaller than the rows it returned.
 */
export function formatPendingNameChangeList(
  total: number,
  at: Date,
  entries: PendingNameChange[],
): string {
  const header = "<b>[Name change] Waiting for review — list</b>";
  const stamp = `${at.toISOString().slice(0, 16).replace("T", " ")} UTC`;
  const known = Math.max(total, entries.length);
  const moreLine = (remaining: number) =>
    `…and ${remaining} more waiting (oldest shown first)`;
  // Room for the "more" line at its longest possible value, so adding it at the end can
  // never push the message past the budget.
  const reserved = moreLine(known).length + 1;

  const lines: string[] = [];
  let length = header.length + 1 + stamp.length;
  for (const [index, entry] of entries.entries()) {
    const { html, hasHiddenCharacters } = describeRequestedNameForModerator(
      entry.requestedName,
    );
    const line =
      `${index + 1}. <code>${escapeTelegramHtml(entry.playerId)}</code>` +
      ` · ${html}` +
      ` · waiting ${formatWaitingTime(at.getTime() - entry.requestedAt.getTime())}` +
      (hasHiddenCharacters ? " ⚠️ hidden characters" : "") +
      // Task 0322. Needed here, not only in the per-request message: the per-player
      // notification cooldown means some requests never get a message of their own,
      // so this list is the only place they are flagged. Counted in the budget below.
      (wouldMatchFilterHideName(entry.requestedName)
        ? " ⚠️ rude-name filter"
        : "");
    if (length + line.length + 1 + reserved > PENDING_LIST_MAX_LENGTH) break;
    lines.push(line);
    length += line.length + 1;
  }

  const remaining = Math.max(0, known - lines.length);
  return [
    header,
    ...lines,
    ...(remaining > 0 ? [moreLine(remaining)] : []),
    stamp,
  ].join("\n");
}

export interface NameChangeDigestDeps {
  pool: Pool;
  /** Bot credentials, with `threadId` set to the Name Changes topic. */
  telegram: TelegramConfig;
  /** Test seam only; production uses sendTelegramMessage. */
  send?: (config: TelegramConfig, text: string) => Promise<TelegramSendOutcome>;
  /** Test seam only; production uses () => new Date(). */
  now?: () => Date;
  /** Test seam only; production uses NAME_CHANGE_DIGEST_MARKER_PATH. */
  markerPath?: string;
  /** Test seam only; production writes the marker atomically. */
  writeMarkerFile?: (path: string, contents: string) => void;
}

/**
 * Count, format, send, and — ONLY on a successful send — stamp the freshness marker.
 *
 * The marker is success-only on purpose: a failed send leaves it to AGE, and
 * profile-checks.sh's check 12 turns that age into a dead-man's-switch page. Stamping it
 * on every run would make the check say "the digest ran" when what an operator needs to
 * know is "the digest ARRIVED".
 *
 * Task 0315: after a successful heartbeat it also sends the list message (see
 * sendPendingList). The return value is still the heartbeat's result, and only that.
 */
export async function runNameChangeDigest(
  deps: NameChangeDigestDeps,
): Promise<NameChangeDigestResult> {
  const send = deps.send ?? sendTelegramMessage;
  const now = deps.now ?? (() => new Date());
  const markerPath = deps.markerPath ?? NAME_CHANGE_DIGEST_MARKER_PATH;
  const writeMarker = deps.writeMarkerFile ?? writeMarkerFileAtomically;

  const startedAt = now();
  const count = await countPendingNameChanges(deps.pool);
  const text = formatNameChangeDigest(count, startedAt);
  const outcome = await send(deps.telegram, text);

  // `sent_after_retry` is a SUCCESS (task 0277, the lesson recorded at
  // NameChangeRepository.ts:545-551): the message arrived on the second attempt.
  // Treating it as a failure would log an error for every message the 0061 retry
  // rescued — the opposite of the signal wanted.
  if (outcome.result !== "sent" && outcome.result !== "sent_after_retry") {
    // Bounded fields ONLY. `result`, `status` and `code` are non-free-text by
    // construction (TelegramNotifier.ts), so no token, URL, chat id or topic id can
    // reach a log line through them.
    log.error(
      `name-change digest NOT sent: result=${outcome.result}` +
        `${outcome.status === undefined ? "" : ` status=${outcome.status}`}` +
        `${outcome.code === undefined ? "" : ` code=${outcome.code}`}`,
    );
    return "failed";
  }

  // `now()` AGAIN, not the `startedAt` above (review R8): the marker's field is called
  // `finished_at` and profile-checks.sh turns it into "how long since a digest arrived",
  // so it must be the moment the SEND completed, not the moment the run began. The gap
  // is small against a 26 h threshold — this is a contract name that has to be true, in
  // a marker whose whole shape is a contract with a shell reader.
  writeDigestMarker(markerPath, writeMarker, now());
  log.info(`name-change digest sent (${count} waiting)`);

  // Task 0315: the list, AFTER the heartbeat arrived and AFTER the marker — never before
  // and never instead. It cannot change the result returned below: the heartbeat alone
  // is the liveness proof, so a failed list must not page, withhold the marker or turn
  // the exit code red. (Not attempted when the heartbeat failed: Telegram is most likely
  // unreachable then, and a list arriving without its heartbeat would show a working
  // Telegram at the very moment check 12 is paging for a broken one.)
  await sendPendingList(deps.pool, deps.telegram, send, startedAt);
  return "sent";
}

/**
 * Send the list message, if anything is waiting. Never throws; logs what went wrong.
 *
 * Whether to send is decided by the list itself being empty — a fresh read — not by the
 * heartbeat's count, so a request decided between the two queries cannot produce a list
 * message with nothing in it. For the same reason the "…and M more" line uses the list's
 * own total, not the heartbeat's count.
 */
async function sendPendingList(
  pool: Pool,
  telegram: TelegramConfig,
  send: (config: TelegramConfig, text: string) => Promise<TelegramSendOutcome>,
  at: Date,
): Promise<void> {
  try {
    const { total, entries } = await listPendingNameChanges(
      pool,
      PENDING_LIST_CAP,
    );
    if (entries.length === 0) return;
    const outcome = await send(
      telegram,
      formatPendingNameChangeList(total, at, entries),
    );
    if (outcome.result !== "sent" && outcome.result !== "sent_after_retry") {
      // Bounded fields ONLY, exactly as for the heartbeat above.
      log.error(
        `name-change digest list NOT sent: result=${outcome.result}` +
          `${outcome.status === undefined ? "" : ` status=${outcome.status}`}` +
          `${outcome.code === undefined ? "" : ` code=${outcome.code}`}`,
      );
    }
  } catch (error) {
    log.error(`name-change digest list NOT sent: ${formatError(error)}`);
  }
}

/**
 * The freshness marker (task 0283 §8). Shaped for its READER, not for elegance:
 * `JSON.stringify(…, null, 2)` puts one key per line with the key at the line start,
 * which is what profile-checks.sh's `json_field` sed requires, and `finished_at` is
 * seconds-precision ISO with a trailing `Z`, which is what its `iso_to_epoch` parses.
 * `at` is the time the SEND finished — the caller re-reads the clock for it (R8).
 *
 * A write failure is logged and the run still reports success: the message DID arrive,
 * and lying about that would be worse than an aged marker — which the checker pages on
 * anyway, in the safe direction.
 */
function writeDigestMarker(
  path: string,
  writeMarker: (path: string, contents: string) => void,
  at: Date,
): void {
  try {
    writeMarker(
      path,
      `${JSON.stringify(
        {
          schema: 1,
          finished_at: `${at.toISOString().slice(0, 19)}Z`,
          source: "name-change-digest",
        },
        null,
        2,
      )}\n`,
    );
  } catch (error) {
    log.error(
      `name-change digest: could not write the freshness marker: ${formatError(error)}`,
    );
  }
}
