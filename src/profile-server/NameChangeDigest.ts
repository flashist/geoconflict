// Daily digest of pending name-change reviews (task 0283).
//
// WHAT IT IS: one Telegram message per day into the Name Changes topic, carrying the
// number of players waiting for a name review. The entry point that runs it is
// sendNameChangeDigest.ts; a host cron line on the profile box fires it once a day.
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
  sendTelegramMessage,
  type TelegramConfig,
  type TelegramSendOutcome,
} from "../core/notifications/TelegramNotifier";
import { formatError, logger } from "./Logger";

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
 * AlertRelay.ts:129 rather than imported — importing that module would pull express,
 * express-rate-limit and zod into a one-shot CLI, and the CLI must stay tiny (see the
 * import-surface note in sendNameChangeDigest.ts). A TORN write would leave an
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

/**
 * The operator's message. HTML parse mode, matching every other operator message.
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
  return "sent";
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
