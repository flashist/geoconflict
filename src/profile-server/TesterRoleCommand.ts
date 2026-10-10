// SSH-only tester roles (task 0425) — the logic behind `npm run tester-role`, which
// src/profile-server/testerRole.ts runs INSIDE the profile-api container on the box:
//
//   apply   <tester-internal-id> <role-id>   write a fixed role (TesterRoles.ts)
//   restore <tester-internal-id>             put back the values saved before the first apply
//   show    <tester-internal-id>             read-only: role, XP, flags, tenure, snapshot
//
// No route and no endpoint: the command talks to Postgres directly, so nothing outside
// an SSH session on the box can reach it. Runbook:
// ai-agents/knowledge-base/profile-tester-roles-runbook.md.
//
// The guard order is load-bearing and asserted by tests: parse the arguments, then open
// the run log, then read and check the allowlist, then check the role id, then touch
// the DB. Every refusal writes nothing to the DB, and every run (refusals included)
// appends one line to the run log.
//
// ⚠️ Honest limit: the allowlist protects against MISTAKES (a wrong id, an agent-driven
// run aimed at a real player). Anyone with root on the box can edit the list or run
// psql directly; this does not protect against root.
//
// Kept free of ./Server, ./Routes and ./Telemetry (the 0283 trap — Server.ts binds the
// port at load); asserted in tests/profile-server/TesterRoleCommand.test.ts.

import * as fs from "fs";
import type { TesterRoleState, TesterRoleStore } from "./TesterRoleRepository";
import {
  TESTER_ROLES,
  TESTER_ROLE_IDS,
  isTesterRoleId,
  type TesterRoleId,
} from "./TesterRoles";

// ── Where things live on the box ───────────────────────────────────────────
// The container directory. MUST equal the target of setup-profile.sh's
// `./tester-roles:` bind mount (host: /opt/profile/tester-roles, 0700) — the hardening
// harness asserts the two agree. A DIRECTORY mount on purpose: a FILE mount whose host
// file does not exist yet makes Docker create a directory in its place.
export const TESTER_ROLE_DIR = "/var/lib/profile/tester-roles";
/** Created and edited by hand by the owner (root:root 0600). Nothing in the repo writes it. */
export const TESTER_ROLE_ALLOWLIST_PATH = `${TESTER_ROLE_DIR}/allowlist`;
/** One JSON line per run. Stays on the box. */
export const TESTER_ROLE_LOG_PATH = `${TESTER_ROLE_DIR}/runs.log`;
/** The package.json script that runs testerRole.ts. */
export const TESTER_ROLE_NPM_SCRIPT = "tester-role";
/** Who ran it, self-reported by the runbook command (`-e TESTER_ROLE_OPERATOR=…`). */
export const TESTER_ROLE_OPERATOR_ENV = "TESTER_ROLE_OPERATOR";

/** Exit codes (the 0312 convention, extended). */
export const EXIT_OK = 0;
/** Refused (allowlist, unknown player, no snapshot) or a DB error. Nothing was written. */
export const EXIT_REFUSED = 1;
/** Bad input (arguments, unknown subcommand or role). Nothing was written. */
export const EXIT_BAD_INPUT = 2;
/** The run succeeded (a write may have COMMITTED) but its log line could not be written. */
export const EXIT_NOT_LOGGED = 3;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
/** Same shape, unanchored and case-insensitive — what "contains an id" means for output checks. */
export const UUID_SHAPED =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

function normalizeId(value: string): string {
  return value.trim().toLowerCase();
}

function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

// ── Arguments ──────────────────────────────────────────────────────────────

export type TesterRoleSubcommand = "apply" | "restore" | "show";

export type TesterRoleArgs =
  | { subcommand: "apply"; tester: string; role: string }
  | { subcommand: "restore" | "show"; tester: string };

export type ParsedTesterRoleArgs =
  | { ok: true; args: TesterRoleArgs }
  | {
      ok: false;
      error: string;
      /** Only a KNOWN subcommand — never echoes what was typed. */
      subcommand: TesterRoleSubcommand | null;
      /** Normalized, only if it is a UUID. */
      tester: string | null;
    };

export const USAGE = [
  "Usage:",
  `  npm run -s ${TESTER_ROLE_NPM_SCRIPT} -- apply <tester-internal-id> <role-id>`,
  `  npm run -s ${TESTER_ROLE_NPM_SCRIPT} -- restore <tester-internal-id>`,
  `  npm run -s ${TESTER_ROLE_NPM_SCRIPT} -- show <tester-internal-id>`,
  `Roles: ${TESTER_ROLE_IDS.join(", ")}`,
].join("\n");

/**
 * Exact arity: apply takes exactly 2 values, restore and show exactly 1. The tester
 * must be an internal player id (a UUID) — a Yandex id typed by mistake is refused
 * here and never logged. The role id is NOT checked here: that comes after the
 * allowlist (the guard order above).
 */
export function parseTesterRoleArgs(
  argv: readonly string[],
): ParsedTesterRoleArgs {
  const [subcommand, ...values] = argv;
  const known =
    subcommand === "apply" || subcommand === "restore" || subcommand === "show"
      ? subcommand
      : null;
  const firstValue = values[0] === undefined ? null : normalizeId(values[0]);
  const tester = firstValue !== null && isUuid(firstValue) ? firstValue : null;
  const fail = (error: string): ParsedTesterRoleArgs => ({
    ok: false,
    error,
    subcommand: known,
    tester,
  });

  if (subcommand === undefined) {
    return fail("No subcommand given.");
  }
  if (known === null) {
    return fail("Unknown subcommand (expected apply, restore or show).");
  }
  const expected = known === "apply" ? 2 : 1;
  if (values.length !== expected) {
    return fail(
      known === "apply"
        ? `apply takes exactly 2 values (tester id, role id); got ${values.length}.`
        : `${known} takes exactly 1 value (tester id); got ${values.length}.`,
    );
  }
  if (tester === null) {
    return fail(
      "The tester must be an internal player id (a UUID). Never type a Yandex id here.",
    );
  }
  if (known === "apply") {
    return { ok: true, args: { subcommand: "apply", tester, role: values[1] } };
  }
  return { ok: true, args: { subcommand: known, tester } };
}

// ── Allowlist ──────────────────────────────────────────────────────────────

export type AllowlistRefusal =
  | "allowlist_missing"
  | "allowlist_unreadable"
  | "allowlist_empty"
  | "allowlist_malformed";

export type AllowlistResult =
  | { ok: true; ids: ReadonlySet<string> }
  | { ok: false; reason: AllowlistRefusal; message: string };

/**
 * One internal player id (UUID) per line; blank lines and lines starting with `#` are
 * ignored; each line is trimmed (CR and a leading BOM too) and lower-cased.
 * FAIL CLOSED: no ids left, or ANY other line that is not a UUID, refuses everything —
 * a malformed line means the list is not what the owner thinks it is. The bad line is
 * named by its number only, never echoed (it may hold a Yandex id).
 */
export function parseAllowlist(text: string): AllowlistResult {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/);
  const ids = new Set<string>();
  for (let index = 0; index < lines.length; index++) {
    const line = normalizeId(lines[index]);
    if (line === "" || line.startsWith("#")) {
      continue;
    }
    if (!isUuid(line)) {
      return {
        ok: false,
        reason: "allowlist_malformed",
        message: `the tester allowlist has a line that is not an internal player id (line ${index + 1}). Fix the file: one id per line, comments on their own line starting with #.`,
      };
    }
    ids.add(line);
  }
  if (ids.size === 0) {
    return {
      ok: false,
      reason: "allowlist_empty",
      message: "the tester allowlist holds no ids.",
    };
  }
  return { ok: true, ids };
}

/** Reads the allowlist with the injected reader; a read failure refuses (fail closed). */
export function readAllowlist(readFile: () => string): AllowlistResult {
  let text: string;
  try {
    text = readFile();
  } catch (error) {
    const code = (error as { code?: unknown } | null)?.code;
    return code === "ENOENT"
      ? {
          ok: false,
          reason: "allowlist_missing",
          message: `the tester allowlist does not exist (${TESTER_ROLE_ALLOWLIST_PATH} in the container).`,
        }
      : {
          ok: false,
          reason: "allowlist_unreadable",
          message: `the tester allowlist could not be read (${typeof code === "string" ? code : "unknown error"}).`,
        };
  }
  return parseAllowlist(text);
}

/** The real reader: the whole file, as UTF-8, read fresh on every run. */
export function fileAllowlistReader(path: string): () => string {
  return () => fs.readFileSync(path, "utf8");
}

// ── Run log ────────────────────────────────────────────────────────────────

export interface RunLog {
  /** Appends one line. Throws on failure. */
  append(line: string): void;
  close(): void;
}

/**
 * Opens the run log for append (creating it 0600). Throws if it cannot be opened —
 * the command then refuses BEFORE any DB work.
 */
export function fileRunLog(path: string): RunLog {
  const fd = fs.openSync(path, "a", 0o600);
  return {
    append: (line) => {
      fs.writeSync(fd, `${line}\n`);
    },
    close: () => fs.closeSync(fd),
  };
}

export type RunOutcome = "applied" | "restored" | "shown" | "refused" | "error";

export type RunReason =
  | AllowlistRefusal
  | "not_allowlisted"
  | "unknown_role"
  | "bad_arguments"
  | "no_such_player"
  | "no_snapshot"
  | "db_error";

export interface RunLogEntry {
  at: string;
  operator: string;
  subcommand: TesterRoleSubcommand | null;
  role: string | null;
  tester: string | null;
  outcome: RunOutcome;
  reason: RunReason | null;
}

/** Placeholders, so nothing that was typed but is not a UUID / known role reaches the log. */
export const LOGGED_NOT_A_UUID = "<not-a-uuid>";
export const LOGGED_UNKNOWN_ROLE = "<unknown-role>";

/**
 * One JSON line. No secrets, no DATABASE_URL, no pg error text: a DB failure is
 * logged as the code `db_error` only (the full message goes to stderr).
 */
export function buildLogLine(entry: RunLogEntry): string {
  return JSON.stringify({
    at: entry.at,
    operator: entry.operator,
    subcommand: entry.subcommand,
    role: entry.role,
    tester: entry.tester,
    outcome: entry.outcome,
    reason: entry.reason,
  });
}

// ── show ───────────────────────────────────────────────────────────────────

function isoOrNull(value: Date | null): string {
  return value === null ? "null" : value.toISOString();
}

/** Plain `key: value` lines. Prints NO ids at all, not even the typed one. */
export function formatShow(state: TesterRoleState): string {
  return [
    `role applied: ${state.appliedRole === null ? "none" : `${state.appliedRole} (applied at ${isoOrNull(state.appliedAt)})`}`,
    `xp: ${state.xp}`,
    `is_citizen: ${state.isCitizen}`,
    `is_paid_citizen: ${state.isPaidCitizen}`,
    `citizenship_earned_at: ${isoOrNull(state.citizenshipEarnedAt)}`,
    `citizenship_purchased_at: ${isoOrNull(state.citizenshipPurchasedAt)}`,
    `tenure grant: ${state.tenureGrant === null ? "absent" : `present, xp_awarded=${state.tenureGrant.xpAwarded}, granted_at=${state.tenureGrant.grantedAt.toISOString()}`}`,
    `snapshot held: ${state.snapshotSavedAt === null ? "no" : `yes, saved_at=${state.snapshotSavedAt.toISOString()}`}`,
  ].join("\n");
}

// ── The run ────────────────────────────────────────────────────────────────

export interface TesterRoleRunOptions {
  argv: readonly string[];
  operator: string | undefined;
  readAllowlistFile: () => string;
  openLog: () => RunLog;
  repo: TesterRoleStore;
  out: (line: string) => void;
  err: (line: string) => void;
  now: () => Date;
}

/** Runs one command; returns the exit code. Never throws. */
export async function runTesterRole(
  options: TesterRoleRunOptions,
): Promise<number> {
  const parsed = parseTesterRoleArgs(options.argv);

  // 1. The log, before anything else: a run that cannot be logged does not run.
  let log: RunLog;
  try {
    log = options.openLog();
  } catch (error) {
    const code = (error as { code?: unknown } | null)?.code;
    options.err(
      `REFUSED: the run log could not be opened (${typeof code === "string" ? code : "unknown error"}; ${TESTER_ROLE_LOG_PATH} in the container). Is the tester-roles directory mounted? Nothing was done.`,
    );
    return EXIT_REFUSED;
  }

  const operator =
    options.operator !== undefined && options.operator.trim() !== ""
      ? options.operator.trim()
      : "unknown";
  const subcommand = parsed.ok ? parsed.args.subcommand : parsed.subcommand;
  const tester = parsed.ok
    ? parsed.args.tester
    : (parsed.tester ?? (options.argv.length > 1 ? LOGGED_NOT_A_UUID : null));
  const typedRole =
    parsed.ok && parsed.args.subcommand === "apply" ? parsed.args.role : null;
  const loggedRole =
    typedRole === null
      ? null
      : isTesterRoleId(typedRole)
        ? typedRole
        : LOGGED_UNKNOWN_ROLE;

  /** Writes the run's ONE log line and returns the final exit code. */
  const finish = (
    code: number,
    outcome: RunOutcome,
    reason: RunReason | null,
  ): number => {
    try {
      log.append(
        buildLogLine({
          at: options.now().toISOString(),
          operator,
          subcommand,
          role: loggedRole,
          tester,
          outcome,
          reason,
        }),
      );
    } catch {
      if (outcome === "applied" || outcome === "restored") {
        options.err(
          `!!! ${outcome.toUpperCase()} BUT NOT LOGGED: the change IS committed in the database, but its line could not be appended to ${TESTER_ROLE_LOG_PATH}. Record this run by hand.`,
        );
        return EXIT_NOT_LOGGED;
      }
      options.err(
        `!!! NOT LOGGED: this run's line could not be appended to ${TESTER_ROLE_LOG_PATH}. Nothing was written to the database.`,
      );
      return outcome === "shown" ? EXIT_NOT_LOGGED : code;
    }
    return code;
  };

  try {
    // 2. Arguments.
    if (!parsed.ok) {
      options.err(`REFUSED: ${parsed.error} Nothing was done.\n${USAGE}`);
      return finish(EXIT_BAD_INPUT, "refused", "bad_arguments");
    }
    const args = parsed.args;

    // 3. The allowlist — read fresh, fail closed, for EVERY subcommand (show too).
    const allowlist = readAllowlist(options.readAllowlistFile);
    if (!allowlist.ok) {
      options.err(
        `REFUSED: ${allowlist.message} Every subcommand is refused until it is fixed. Nothing was done.`,
      );
      return finish(EXIT_REFUSED, "refused", allowlist.reason);
    }
    if (!allowlist.ids.has(args.tester)) {
      options.err(
        "REFUSED: this player is not on the tester allowlist. Nothing was done.",
      );
      return finish(EXIT_REFUSED, "refused", "not_allowlisted");
    }

    // 4. The role id.
    if (args.subcommand === "apply" && !isTesterRoleId(args.role)) {
      options.err(
        `REFUSED: unknown role. Roles: ${TESTER_ROLE_IDS.join(", ")}. Nothing was done.`,
      );
      return finish(EXIT_BAD_INPUT, "refused", "unknown_role");
    }

    // 5. The database.
    try {
      if (args.subcommand === "show") {
        const result = await options.repo.show(args.tester);
        if (result.status === "no_such_player") {
          options.err("REFUSED: no player with this id. Nothing was done.");
          return finish(EXIT_REFUSED, "refused", "no_such_player");
        }
        options.out(formatShow(result.state));
        return finish(EXIT_OK, "shown", null);
      }
      if (args.subcommand === "apply") {
        const role = TESTER_ROLES[args.role as TesterRoleId];
        const result = await options.repo.apply(args.tester, role);
        if (result.status === "no_such_player") {
          options.err("REFUSED: no player with this id. Nothing was written.");
          return finish(EXIT_REFUSED, "refused", "no_such_player");
        }
        options.out(
          `Applied role ${role.id}: ${role.summary}. ${
            result.snapshotCreated
              ? "The tester's previous values were saved; `restore` puts them back."
              : "A snapshot was already held and was kept as it was; `restore` returns to the values from before the FIRST apply."
          } Reload the game page to see it.`,
        );
        return finish(EXIT_OK, "applied", null);
      }
      const result = await options.repo.restore(args.tester);
      if (result.status === "no_such_player") {
        options.err("REFUSED: no player with this id. Nothing was written.");
        return finish(EXIT_REFUSED, "refused", "no_such_player");
      }
      if (result.status === "no_snapshot") {
        options.err(
          "REFUSED: no snapshot is held for this tester (no role is applied). Nothing was written.",
        );
        return finish(EXIT_REFUSED, "refused", "no_snapshot");
      }
      options.out(
        "Restored: the tester's values from before the first apply are back, and the snapshot is cleared. XP earned while the role was on is discarded. Reload the game page to see it.",
      );
      return finish(EXIT_OK, "restored", null);
    } catch (error) {
      // The pg message goes to the operator's terminal only; the log gets the code.
      const message = error instanceof Error ? error.message : "unknown error";
      options.err(
        `ERROR: database error (${message}). The transaction was rolled back, so nothing was written, unless the failure came at the very commit: run \`show\` to check before retrying.`,
      );
      return finish(EXIT_REFUSED, "error", "db_error");
    }
  } finally {
    try {
      log.close();
    } catch {
      // Closing a log we already wrote to cannot change the outcome.
    }
  }
}
