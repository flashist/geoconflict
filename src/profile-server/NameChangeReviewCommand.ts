// The operator's name-change walk-through command (task 0350) — the pure logic behind
// `npm run name-change:review`, which src/profile-server/reviewNameChanges.ts runs.
//
// How it is used: the operator SSHes to the profile box and runs ONE command (with a
// terminal — no `-T`). It shows the waiting requests one at a time, oldest first, and
// asks approve / reject / skip / quit for each. No line is copied, pasted or built by
// hand, and no name is typed as `\uXXXX` codes.
//
// There is NO second decision path: every decision goes through the same code the
// `name-change:decide` command uses (parseDecideInput → postNameChangeDecision →
// describeDecideResponse, in NameChangeDecideCommand.ts), to the real decide route on
// 127.0.0.1, with the internal token read from the container's own environment —
// never typed, never printed. `expectedName` is the name exactly as read from the
// database just before it was shown, so a name changed in between is still refused
// by the route (409 name_mismatch, owner ruling 0067 option A).
//
// Kept pure, with every dependency injected (pool reader, fetch, prompt, clock), so
// it is tested with no database, network or terminal. It must never import ./Server
// (which listens at load), ./Routes, ./Telemetry or ./Db — see reviewNameChanges.ts.
// Runbook: ai-agents/knowledge-base/name-change-digest-runbook.md.

import type { Pool } from "pg";
import { MAX_REJECTION_REASON_LENGTH } from "../core/profile/NameChangeContract";
import {
  DECIDE_REQUEST_TIMEOUT_MS,
  EXIT_BAD_INPUT,
  EXIT_OK,
  EXIT_REFUSED,
  PROFILE_API_SERVICE,
  PROFILE_COMPOSE_FILE,
  REASON_PLACEHOLDER,
  checkInternalToken,
  describeDecideResponse,
  describeNoAnswer,
  escapeForTerminal,
  parseDecideInput,
  postNameChangeDecision,
  type DecideFetch,
} from "./NameChangeDecideCommand";
import { formatWaitingTime } from "./NameChangeDigest";
import {
  visibleRequestedName,
  wouldMatchFilterHideName,
} from "./NameChangeRepository";

/** The package.json script that runs reviewNameChanges.ts. */
export const REVIEW_NPM_SCRIPT = "name-change:review";

/** Exit code after Ctrl-C (128 + SIGINT), the shell's own convention. */
export const EXIT_INTERRUPTED = 130;

/**
 * The command the operator runs on the profile box. NO `-T`: the command asks
 * questions, so it needs a terminal. One source for the refusal text, the runbook
 * check and the tests.
 */
export function reviewCommandLine(): string {
  return `docker compose -f ${PROFILE_COMPOSE_FILE} exec ${PROFILE_API_SERVICE} npm run -s ${REVIEW_NPM_SCRIPT}`;
}

/**
 * The oldest waiting request not skipped in this run, plus how many such requests
 * are waiting. Modelled on PENDING_LIST_SQL (NameChangeDigest.ts).
 *
 * Skips are by HISTORY ROW id, not player id: if a skipped player withdraws and asks
 * again, the new request is a new row and does show. `count(*) OVER ()` is computed
 * before LIMIT, so `total` counts every waiting, not-skipped request. ⛔ No join to
 * `players`: only the internal `player_id` is read, so a Yandex id cannot be selected.
 */
export const NEXT_PENDING_SQL = `
SELECT id, player_id, new_display_name, changed_at, count(*) OVER ()::int AS total
FROM player_name_history
WHERE moderation_status = 'pending' AND NOT (id = ANY($1::bigint[]))
ORDER BY changed_at, id
LIMIT 1
`;

/** One waiting request, as the walk-through shows it. */
export interface PendingReviewRequest {
  /** player_name_history.id (bigserial, as text) — what a skip remembers. */
  historyId: string;
  /** Internal player id (uuid) — what the decide route's `playerId` takes. */
  playerId: string;
  /** The name exactly as stored — what `expectedName` carries. */
  requestedName: string;
  requestedAt: Date;
  /** Waiting, not-skipped requests at the moment of the read, this one included. */
  waitingTotal: number;
}

/** Reads the next request to show, or null when none is left. */
export async function fetchNextPending(
  pool: Pool,
  excludedHistoryIds: readonly string[],
): Promise<PendingReviewRequest | null> {
  const result = await pool.query(NEXT_PENDING_SQL, [[...excludedHistoryIds]]);
  const row = result.rows[0] as
    | {
        id: string | number;
        player_id: string;
        new_display_name: string;
        changed_at: Date | string;
        total: number | string;
      }
    | undefined;
  if (row === undefined) {
    return null;
  }
  return {
    historyId: String(row.id),
    playerId: String(row.player_id),
    requestedName: String(row.new_display_name),
    requestedAt: new Date(row.changed_at),
    waitingTotal: Number(row.total),
  };
}

/**
 * The player id as printed. It is a uuid from a uuid column; anything else is
 * escaped like every other server-supplied string, belt and braces.
 */
function printablePlayerId(playerId: string): string {
  return /^[A-Za-z0-9_-]+$/.test(playerId)
    ? playerId
    : escapeForTerminal(playerId);
}

/**
 * The card shown for one request. Plain text for a root terminal: the name goes
 * through visibleRequestedName, so letters (Cyrillic included) read as written and
 * every hidden, control, bidi or line-breaking character shows as a ⟨U+XXXX⟩ code.
 */
export function formatReviewCard(
  entry: PendingReviewRequest,
  position: number,
  now: Date,
): string[] {
  const { text, hasHiddenCharacters } = visibleRequestedName(
    entry.requestedName,
  );
  return [
    "",
    `Request ${position} · ${entry.waitingTotal} waiting`,
    `Player:  ${printablePlayerId(entry.playerId)}`,
    `Name:    «${text}»`,
    ...(hasHiddenCharacters
      ? [
          "⚠️ This name contains hidden or unusual characters (shown as ⟨U+…⟩ codes). Check it carefully before approving.",
        ]
      : []),
    ...(wouldMatchFilterHideName(entry.requestedName)
      ? [
          "⚠️ The match's rude-name filter would hide this name: other players would see a stand-in name. Consider rejecting.",
        ]
      : []),
    `Waiting: ${formatWaitingTime(now.getTime() - entry.requestedAt.getTime())}`,
  ];
}

export const CHOICE_PROMPT = "[a] approve  [r] reject  [s] skip  [q] quit > ";
export const REASON_PROMPT =
  "Reason the player will read (empty line = back to the choice) > ";

/** The confirm question after `a` (owner ruling 2026-10-15: approve asks y/N first). */
export function approveConfirmPrompt(requestedName: string): string {
  return `Approve «${visibleRequestedName(requestedName).text}»? y/N > `;
}

/**
 * The token refusal, worded for the walk-through (review 0350 R2, owner ruling
 * 2026-10-15): the shared text says "exactly as pasted", and nothing is pasted here.
 * The same check as the decide command; only the missing-token wording differs.
 */
export function walkThroughTokenRefusal(
  token: string | undefined,
): string | null {
  const refusal = checkInternalToken(token);
  if (refusal === null) {
    return null;
  }
  return (token ?? "").trim() === ""
    ? "Refused: PROFILE_INTERNAL_TOKEN is not set in this container. Run the walk-through on the profile box, in the profile-api container (see the runbook). Nothing was sent."
    : refusal;
}

/**
 * The decide route's answer, worded for the walk-through (review 0350 R2, owner
 * ruling 2026-10-15). Same meaning and exit code as describeDecideResponse, whose
 * output the decide command keeps unchanged; only the lines that assume a pasted
 * command differ: 409 name_mismatch (no "this command", no \uXXXX codes — the new
 * name comes up as its own card, readable), 400 (no "copy the command again") and
 * 401 (no "exactly as pasted").
 */
export function describeReviewResponse(
  status: number,
  body: unknown,
  decision: "approve" | "reject",
): { exitCode: number; message: string } {
  const answer = describeDecideResponse(status, body, decision);
  const code =
    typeof body === "object" && body !== null
      ? (body as Record<string, unknown>).error
      : undefined;
  if (status === 409 && code === "name_mismatch") {
    return {
      exitCode: answer.exitCode,
      message:
        "HTTP 409 name_mismatch: the player changed the name after it was shown. Nothing was changed. The new name comes up as its own card.",
    };
  }
  if (status === 400) {
    return {
      exitCode: answer.exitCode,
      message:
        "HTTP 400 bad_request: the server refused the request's shape (player id, decision or reason). Nothing was changed. Check the profile-api logs.",
    };
  }
  if (status === 401) {
    return {
      exitCode: answer.exitCode,
      message:
        "HTTP 401 unauthorized: the server did not accept this container's internal token. Nothing was changed. Run the walk-through on the profile box, in the profile-api container.",
    };
  }
  return answer;
}

export interface ReviewRunOptions {
  /** stdin AND stdout are a terminal. Piped answers are refused on purpose. */
  isInteractive: boolean;
  token: string | undefined;
  port: number;
  fetch: DecideFetch;
  /** The next request to show, skipping the given history row ids. */
  nextPending: (
    excludedHistoryIds: readonly string[],
  ) => Promise<PendingReviewRequest | null>;
  /** One answer from the operator; null on end of input (Ctrl-D) or Ctrl-C. */
  ask: (prompt: string) => Promise<string | null>;
  /** Set by Ctrl-C. A decision already being sent finishes; then the run stops. */
  stop: { requested: boolean };
  out: (line: string) => void;
  err: (line: string) => void;
  now: () => Date;
  timeoutMs?: number;
}

/** A server-supplied or error string made safe for a root terminal. */
function printableError(error: unknown): string {
  const text =
    error instanceof Error
      ? `${error.name}: ${error.message}`
      : "unknown error";
  return text.replace(/[^\x20-\x7E]/g, "?");
}

/** What the operator chose for one card. */
type Choice =
  | { kind: "decide"; decision: "approve" | "reject"; reason?: string }
  | { kind: "skip" }
  | { kind: "quit" }
  | { kind: "ended" };

/**
 * Asks until there is a usable answer for this request. Nothing is sent from here:
 * `ended` means end of input or Ctrl-C (the caller tells them apart by stop).
 */
async function askChoice(
  options: ReviewRunOptions,
  entry: PendingReviewRequest,
): Promise<Choice> {
  for (;;) {
    const answer = await options.ask(CHOICE_PROMPT);
    if (answer === null) {
      return { kind: "ended" };
    }
    const key = answer.trim().toLowerCase();
    if (key === "s") {
      return { kind: "skip" };
    }
    if (key === "q") {
      return { kind: "quit" };
    }
    if (key === "a") {
      // Owner ruling 2026-10-15: approve asks y/N first; only y sends.
      const confirm = await options.ask(
        approveConfirmPrompt(entry.requestedName),
      );
      if (confirm === null) {
        return { kind: "ended" };
      }
      if (confirm.trim() === "y" || confirm.trim() === "Y") {
        return { kind: "decide", decision: "approve" };
      }
      options.out("Not approved. Nothing was sent.");
      continue;
    }
    if (key === "r") {
      const reason = await askReason(options);
      if (reason === null) {
        return { kind: "ended" };
      }
      if (reason === "") {
        continue;
      }
      return { kind: "decide", decision: "reject", reason };
    }
    options.out("Type a, r, s or q.");
  }
}

/**
 * The rejection reason, checked by the same limits as the decide command BEFORE
 * anything is sent. "" means an empty line: back to the choice. null: input ended.
 */
async function askReason(options: ReviewRunOptions): Promise<string | null> {
  for (;;) {
    const reason = await options.ask(REASON_PROMPT);
    if (reason === null) {
      return null;
    }
    if (reason.trim() === "") {
      return "";
    }
    if (reason.trim() === REASON_PLACEHOLDER) {
      options.out(
        `That is the placeholder ${REASON_PLACEHOLDER}. Type the text the player will read. Nothing was sent.`,
      );
      continue;
    }
    if (reason.length > MAX_REJECTION_REASON_LENGTH) {
      options.out(
        `The reason is ${reason.length} characters long; the limit is ${MAX_REJECTION_REASON_LENGTH}. Shorten it. Nothing was sent.`,
      );
      continue;
    }
    return reason;
  }
}

/**
 * Walks the operator through every waiting request. Exit 0 when the queue is done or
 * the operator quits (q or Ctrl-D); 130 after Ctrl-C; 1 when a system-level problem
 * stopped the run — also when Ctrl-C was pressed while that decision was being sent
 * (the error stop wins: exit 1, no summary); 2 when it refused to start and NOTHING
 * was read or sent.
 */
export async function runNameChangeReview(
  options: ReviewRunOptions,
): Promise<number> {
  if (!options.isInteractive) {
    options.err(
      `Refused: this command asks questions; run it with a terminal (docker compose exec, WITHOUT -T): ${reviewCommandLine()}. Nothing was sent.`,
    );
    return EXIT_BAD_INPUT;
  }
  const tokenRefusal = walkThroughTokenRefusal(options.token);
  if (tokenRefusal !== null) {
    options.err(tokenRefusal);
    return EXIT_BAD_INPUT;
  }
  const token = options.token ?? "";

  const skipped: string[] = [];
  const counts = { approved: 0, rejected: 0 };
  let shown = 0;

  const summary = async (): Promise<void> => {
    let stillWaiting: string;
    try {
      const fresh = await options.nextPending([]);
      stillWaiting = String(fresh?.waitingTotal ?? 0);
    } catch {
      stillWaiting = "unknown (could not read the queue)";
    }
    options.out(
      `Approved ${counts.approved}, rejected ${counts.rejected}, skipped ${skipped.length}. Still waiting: ${stillWaiting}.`,
    );
  };
  const stopped = async (): Promise<number> => {
    options.out("");
    options.out("Stopped (Ctrl-C).");
    await summary();
    return EXIT_INTERRUPTED;
  };

  for (;;) {
    if (options.stop.requested) {
      return stopped();
    }
    let entry: PendingReviewRequest | null;
    try {
      entry = await options.nextPending(skipped);
    } catch (error) {
      options.err(
        `Could not read the waiting requests from the database (${printableError(error)}). Stopped.`,
      );
      return EXIT_REFUSED;
    }
    if (options.stop.requested) {
      return stopped();
    }
    if (entry === null) {
      if (shown === 0 && skipped.length === 0) {
        options.out("No requests waiting.");
        return EXIT_OK;
      }
      options.out("");
      options.out("No more requests to show.");
      await summary();
      return EXIT_OK;
    }

    shown += 1;
    for (const line of formatReviewCard(entry, shown, options.now())) {
      options.out(line);
    }

    const choice = await askChoice(options, entry);
    if (choice.kind === "ended") {
      if (options.stop.requested) {
        return stopped();
      }
      options.out("");
      await summary();
      return EXIT_OK;
    }
    if (choice.kind === "quit") {
      await summary();
      return EXIT_OK;
    }
    if (choice.kind === "skip") {
      skipped.push(entry.historyId);
      continue;
    }

    // The SAME checks as the decide command: a bound decision on exactly the name
    // read from the database moments ago, and the same reason rules.
    const input = parseDecideInput(
      JSON.stringify({
        playerId: entry.playerId,
        decision: choice.decision,
        expectedName: entry.requestedName,
      }),
      choice.reason,
    );
    if (!input.ok) {
      // Not reachable with a row from the database; a system-level problem if it is.
      options.err(`Refused: ${input.error} Nothing was sent. Stopped.`);
      return EXIT_REFUSED;
    }

    const outcome = await postNameChangeDecision(input.request, {
      token,
      port: options.port,
      fetch: options.fetch,
      timeoutMs: options.timeoutMs ?? DECIDE_REQUEST_TIMEOUT_MS,
    });
    if (outcome.kind === "no_answer") {
      options.err(describeNoAnswer(options.port, outcome.detail));
      options.err("Stopped.");
      return EXIT_REFUSED;
    }
    const { exitCode, message } = describeReviewResponse(
      outcome.status,
      outcome.body,
      choice.decision,
    );
    (exitCode === EXIT_OK ? options.out : options.err)(message);
    if (outcome.status === 200) {
      if (choice.decision === "approve") {
        counts.approved += 1;
      } else {
        counts.rejected += 1;
      }
      continue;
    }
    const code =
      typeof outcome.body === "object" && outcome.body !== null
        ? (outcome.body as Record<string, unknown>).error
        : undefined;
    // About this one request only: it was withdrawn or decided elsewhere (404), its
    // name changed after it was shown (409 name_mismatch: NOT skipped, so the new
    // name comes up as its own card, read fresh), or the name was taken (409
    // name_taken: still waiting, so it comes back next). Keep going.
    if (
      outcome.status === 404 ||
      (outcome.status === 409 &&
        (code === "name_mismatch" || code === "name_taken"))
    ) {
      continue;
    }
    // 400, 401, 503, 500 or anything unexpected points at the whole system.
    options.err("Stopped.");
    return EXIT_REFUSED;
  }
}
