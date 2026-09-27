// The operator's name-change decide command (task 0312) — the pure logic behind
// `npm run name-change:decide`, which src/profile-server/decideNameChange.ts runs.
//
// How it is used: every per-request Telegram message carries two ready-to-paste
// lines, Approve and Reject (NameChangeRepository.decideCommandLines). The operator
// SSHes to the profile box and pastes one. It runs this command INSIDE the running
// profile-api container, which reads the internal token from its own environment —
// so the token is never typed, printed, or put in a chat message. The decision then
// goes to the real decide route on 127.0.0.1, so there is no second decision path.
// Runbook: ai-agents/knowledge-base/name-change-digest-runbook.md.
//
// Kept pure and dependency-light on purpose: the entry file must never pull in
// ./Server (which listens at load), ./Routes or ./Telemetry — see decideNameChange.ts.

import {
  MAX_REJECTION_REASON_LENGTH,
  NameChangeDecisionRequestSchema,
  type NameChangeDecisionRequest,
} from "../core/profile/NameChangeContract";

// ── The command's shape, shared with the Telegram message ──────────────────
// One source for both, so the message and the command it names cannot drift. Both
// ship in the same image, so a rollback moves them together too.

/** Where the profile stack lives on the box. MUST equal setup-profile.sh's PROFILE_DIR. */
export const PROFILE_COMPOSE_FILE = "/opt/profile/docker-compose.yml";
/** The compose service the command runs in (setup-profile.sh's compose file). */
export const PROFILE_API_SERVICE = "profile-api";
/** The package.json script that runs decideNameChange.ts. */
export const DECIDE_NPM_SCRIPT = "name-change:decide";
/** The decision JSON: `{ playerId, decision, expectedName }`. */
export const DECISION_ENV = "NAME_CHANGE_DECISION";
/** The rejection reason — its own variable, typed by the operator. */
export const REASON_ENV = "NAME_CHANGE_REASON";
/** What the Reject line carries until the operator replaces it. Refused as a reason. */
export const REASON_PLACEHOLDER = "REPLACE-WITH-REASON";

export const DECIDE_REQUEST_TIMEOUT_MS = 10_000;

/** Exit codes. 2 means nothing was sent at all. */
export const EXIT_OK = 0;
export const EXIT_REFUSED = 1;
export const EXIT_BAD_INPUT = 2;

export type ParsedDecideInput =
  | { ok: true; request: NameChangeDecisionRequest }
  | { ok: false; error: string };

/**
 * Turns the two environment values into a decision request, or a plain-language
 * reason why not. Never echoes the input back: it came from a chat message and may
 * hold anything.
 */
export function parseDecideInput(
  decisionJson: string | undefined,
  reason: string | undefined,
): ParsedDecideInput {
  if (decisionJson === undefined || decisionJson.trim() === "") {
    return {
      ok: false,
      error: `${DECISION_ENV} is not set. Paste the whole command from the Telegram message.`,
    };
  }
  let value: unknown;
  try {
    value = JSON.parse(decisionJson);
  } catch {
    return {
      ok: false,
      error: `${DECISION_ENV} is not valid JSON. The command was probably cut short or edited; copy it again from the Telegram message.`,
    };
  }
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {
      ok: false,
      error: `${DECISION_ENV} is not a JSON object. Copy the command again from the Telegram message.`,
    };
  }
  const fields = value as Record<string, unknown>;

  // Always a BOUND decision (owner ruling 0067, option A): without expectedName the
  // route would decide on whatever is pending now, which may be a name nobody saw.
  if (typeof fields.expectedName !== "string") {
    return {
      ok: false,
      error: `${DECISION_ENV} has no expectedName. This command only decides on the exact name the Telegram message showed.`,
    };
  }

  const hasReason = reason !== undefined && reason.trim() !== "";
  if (fields.decision === "reject") {
    if (!hasReason) {
      return {
        ok: false,
        error: `A rejection needs a reason: set ${REASON_ENV} to the text the player will read.`,
      };
    }
    if (reason.trim() === REASON_PLACEHOLDER) {
      return {
        ok: false,
        error: `${REASON_ENV} is still the placeholder ${REASON_PLACEHOLDER}. Replace it with the text the player will read.`,
      };
    }
    if (reason.length > MAX_REJECTION_REASON_LENGTH) {
      return {
        ok: false,
        error: `The reason is ${reason.length} characters long; the limit is ${MAX_REJECTION_REASON_LENGTH}. Shorten it.`,
      };
    }
  } else if (fields.decision === "approve" && hasReason) {
    return {
      ok: false,
      error: `${REASON_ENV} is set, but this is an approval. Use the Reject command to reject, or drop the reason.`,
    };
  }

  // The reason comes ONLY from its own variable, never from the JSON, so what is
  // sent is always what the operator typed.
  const parsed = NameChangeDecisionRequestSchema.safeParse({
    ...fields,
    reason: fields.decision === "reject" ? reason : undefined,
  });
  if (!parsed.success) {
    const where = parsed.error.issues
      .map((issue) => issue.path.join(".") || "(whole value)")
      .join(", ");
    return {
      ok: false,
      error: `${DECISION_ENV} does not have the expected shape (check: ${where}). Copy the command again from the Telegram message.`,
    };
  }
  return { ok: true, request: parsed.data };
}

/**
 * A server-supplied string made safe to print in a root terminal: a JSON string
 * literal in pure printable ASCII, the same escaping as the command body (task
 * 0307, F2). A name carrying ESC, a bidi override or a newline cannot move the
 * cursor or fake output, and the result can be pasted straight into expectedName.
 */
export function escapeForTerminal(text: string): string {
  return JSON.stringify(text).replace(
    /[^\x20-\x7E]|'/g,
    (ch) => `\\u${ch.charCodeAt(0).toString(16).padStart(4, "0")}`,
  );
}

function errorCode(body: unknown): string | undefined {
  if (typeof body === "object" && body !== null) {
    const error = (body as Record<string, unknown>).error;
    return typeof error === "string" ? error : undefined;
  }
  return undefined;
}

/** What one HTTP answer from the decide route means, in plain words, plus the exit code. */
export function describeDecideResponse(
  status: number,
  body: unknown,
  decision: "approve" | "reject",
): { exitCode: number; message: string } {
  const code = errorCode(body);
  if (status === 200) {
    return {
      exitCode: EXIT_OK,
      message:
        decision === "approve"
          ? "HTTP 200: approved. The new name is applied and the player gets an inbox message."
          : "HTTP 200: rejected. The player keeps their name and gets an inbox message with your reason.",
    };
  }
  if (status === 404) {
    return {
      exitCode: EXIT_REFUSED,
      message:
        "HTTP 404 no_pending: this player has no pending request. It was already decided, or the player cancelled it. Nothing was changed.",
    };
  }
  if (status === 409 && code === "name_taken") {
    return {
      exitCode: EXIT_REFUSED,
      message:
        "HTTP 409 name_taken: another player got this name first. Nothing was changed and the request is STILL PENDING: reject it with a reason, or retry later.",
    };
  }
  if (status === 409 && code === "name_mismatch") {
    const pending =
      typeof body === "object" && body !== null
        ? (body as Record<string, unknown>).pending_name
        : undefined;
    const shown =
      typeof pending === "string" ? escapeForTerminal(pending) : "(not given)";
    return {
      exitCode: EXIT_REFUSED,
      message: `HTTP 409 name_mismatch: the name pending now is not the one in this command (the player cancelled and asked again). Nothing was changed. Pending now: ${shown}`,
    };
  }
  if (status === 400) {
    return {
      exitCode: EXIT_REFUSED,
      message:
        "HTTP 400 bad_request: the server refused the request's shape (player id, decision or reason). Nothing was changed. Copy the command again from the Telegram message.",
    };
  }
  if (status === 401) {
    return {
      exitCode: EXIT_REFUSED,
      message:
        "HTTP 401 unauthorized: the server did not accept this container's internal token. Nothing was changed. Run the command on the profile box, in the profile-api container, exactly as pasted.",
    };
  }
  if (status === 503) {
    return {
      exitCode: EXIT_REFUSED,
      message:
        "HTTP 503 name_change_unavailable: name changes are switched off on this server. Nothing was changed.",
    };
  }
  if (status === 500) {
    return {
      exitCode: EXIT_REFUSED,
      message:
        "HTTP 500 internal_error: the server failed while deciding. Check the profile-api logs, and run the read-only check in the runbook before retrying.",
    };
  }
  return {
    exitCode: EXIT_REFUSED,
    // The server's error code is escaped like pending_name above: nothing
    // server-supplied reaches a root terminal raw.
    message: `HTTP ${status}${code === undefined ? "" : ` ${escapeForTerminal(code)}`}: unexpected answer. Run the read-only check in the runbook before retrying.`,
  };
}

/** The slice of fetch this command uses — injected so the tests need no network. */
export type DecideFetch = (
  url: string,
  init: {
    method: "POST";
    headers: Record<string, string>;
    body: string;
    signal: AbortSignal;
  },
) => Promise<{ status: number; text(): Promise<string> }>;

export interface DecideRunOptions {
  decisionJson: string | undefined;
  reason: string | undefined;
  token: string | undefined;
  port: number;
  fetch: DecideFetch;
  out: (line: string) => void;
  err: (line: string) => void;
  timeoutMs?: number;
}

function describeNetworkError(error: unknown, token: string): string {
  if (!(error instanceof Error)) {
    return "unknown error";
  }
  // Only the error's name/message and a bare cause code — never the request. The
  // message is NOT trusted to be token-free: Node's fetch quotes a rejected header
  // value in full ("Headers.append: \"Bearer …\" is an invalid header value."), so any
  // occurrence of the token is redacted before printing (review 0312 R1).
  const cause = (error as { cause?: unknown }).cause;
  const causeCode =
    typeof cause === "object" && cause !== null
      ? (cause as { code?: unknown }).code
      : undefined;
  const text = `${error.name}: ${error.message}${typeof causeCode === "string" ? ` (${causeCode})` : ""}`;
  return text.split(token).join("[token redacted]");
}

/**
 * Sends one bound decision to the decide route and reports what happened.
 * Exit 0 only on 200; 1 when the server refused or could not be reached; 2 when the
 * input was bad and NOTHING was sent. The token is never printed.
 */
export async function runNameChangeDecide(
  options: DecideRunOptions,
): Promise<number> {
  const input = parseDecideInput(options.decisionJson, options.reason);
  if (!input.ok) {
    options.err(`Refused: ${input.error} Nothing was sent.`);
    return EXIT_BAD_INPUT;
  }
  const token = options.token ?? "";
  if (token.trim() === "") {
    options.err(
      "Refused: PROFILE_INTERNAL_TOKEN is not set in this container. Run the command on the profile box, in the profile-api container, exactly as pasted. Nothing was sent.",
    );
    return EXIT_BAD_INPUT;
  }
  // A token that is not printable ASCII (a stray line break, NUL or non-ASCII
  // character in profile.env) cannot go in an HTTP header, and Node's error for it
  // would quote the whole header, token included (review 0312 R1). Refuse it here,
  // naming the problem but never the value.
  if (/[^\x20-\x7E]/.test(token)) {
    options.err(
      "Refused: PROFILE_INTERNAL_TOKEN in this container holds a character that cannot go in an HTTP header (a line break, control or non-ASCII character). Check the token in the profile box's env file. Nothing was sent.",
    );
    return EXIT_BAD_INPUT;
  }

  const request = input.request;
  let status: number;
  let body: unknown;
  try {
    const response = await options.fetch(
      `http://127.0.0.1:${options.port}/internal/v1/name-change/decide`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(
          options.timeoutMs ?? DECIDE_REQUEST_TIMEOUT_MS,
        ),
      },
    );
    status = response.status;
    try {
      body = JSON.parse(await response.text());
    } catch {
      body = undefined;
    }
  } catch (error) {
    options.err(
      `No answer from the profile API on 127.0.0.1:${options.port} (${describeNetworkError(error, token)}). The decision may or may not have been applied: run the read-only check in the runbook before retrying.`,
    );
    return EXIT_REFUSED;
  }

  const { exitCode, message } = describeDecideResponse(
    status,
    body,
    request.decision,
  );
  (exitCode === EXIT_OK ? options.out : options.err)(message);
  return exitCode;
}
