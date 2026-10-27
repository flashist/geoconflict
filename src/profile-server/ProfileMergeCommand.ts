// SSH-only owner-run profile merge (task 0503, ADR-128) — the logic behind
// `npm run merge-profiles`, which src/profile-server/mergeProfiles.ts runs INSIDE the
// profile-api container on the box:
//
//   dry-run --into <keep-id> --from <source-id> [--from <source-id> …]
//   commit  --into <keep-id> --from <source-id> [--from …] --expect <fingerprint>
//
// No route and no endpoint: the command talks to Postgres directly. Never automatic —
// the owner runs it by hand, per case, on evidence (0424). Runbook:
// ai-agents/knowledge-base/profile-merge-runbook.md.
//
// Guard order, asserted by tests: parse the arguments; for `commit`, require a terminal;
// re-inspect read-only and refuse unless it matches `--expect`; ask for a typed MERGE;
// only then the write transaction (which re-checks everything under its locks).
//
// Output names records "into", "from #1", … and never prints an id.
// Kept free of ./Server, ./Routes and ./Telemetry (the 0283 trap — Server.ts binds the
// port at load); asserted in tests/profile-server/ProfileMergeCommand.test.ts.

import type { HolderSightingRow } from "./PaymentsRepository";
import {
  INTO_LABEL,
  MAX_MERGE_SOURCES,
  ledgerXp,
  sourceLabel,
  xpRuleHolds,
  type CommitOutcome,
  type MergeInspection,
  type MergePlan,
  type MergeRecordState,
  type MergeRefusalCode,
  type MovedCounts,
  type ProfileMergeStore,
  type SourcePlan,
} from "./ProfileMergeRepository";

/** The package.json script that runs mergeProfiles.ts. */
export const MERGE_NPM_SCRIPT = "merge-profiles";
/** Who ran it, self-reported by the runbook command (`-e PROFILE_MERGE_OPERATOR=…`). */
export const MERGE_OPERATOR_ENV = "PROFILE_MERGE_OPERATOR";
/** The word a real run must be confirmed with. */
export const CONFIRM_WORD = "MERGE";

/** Exit codes (the tester-role convention). */
export const EXIT_OK = 0;
/** Refused, or a database error. Nothing was written. */
export const EXIT_REFUSED = 1;
/** Bad input. Nothing was written. */
export const EXIT_BAD_INPUT = 2;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const FINGERPRINT_PATTERN = /^[0-9a-f]{32}$/;

// ── Arguments ──────────────────────────────────────────────────────────────

export type MergeMode = "dry-run" | "commit";

export interface MergeArgs {
  mode: MergeMode;
  into: string;
  sources: string[];
  expect: string | null;
}

export type ParsedMergeArgs =
  | { ok: true; args: MergeArgs }
  | { ok: false; error: string; mode: MergeMode | null };

export const USAGE = [
  "Usage:",
  `  npm run -s ${MERGE_NPM_SCRIPT} -- dry-run --into <keep-internal-id> --from <source-internal-id> [--from <source-internal-id> ...]`,
  `  npm run -s ${MERGE_NPM_SCRIPT} -- commit --into <keep-internal-id> --from <source-internal-id> [...] --expect <fingerprint>`,
  `Ids are internal player ids (UUIDs), never Yandex ids. 1 to ${MAX_MERGE_SOURCES} sources, all different, none equal to --into.`,
].join("\n");

/** Never echoes what was typed: a mistyped value may be a Yandex id. */
export function parseMergeArgs(argv: readonly string[]): ParsedMergeArgs {
  const [first, ...rest] = argv;
  const mode: MergeMode | null =
    first === "dry-run" || first === "commit" ? first : null;
  const fail = (error: string): ParsedMergeArgs => ({ ok: false, error, mode });
  if (first === undefined) {
    return fail("No subcommand given.");
  }
  if (mode === null) {
    return fail("Unknown subcommand (expected dry-run or commit).");
  }
  let into: string | null = null;
  const sources: string[] = [];
  let expect: string | null = null;
  for (let index = 0; index < rest.length; index += 2) {
    const flag = rest[index];
    const value = rest[index + 1];
    if (flag !== "--into" && flag !== "--from" && flag !== "--expect") {
      return fail(
        `Unknown argument at position ${index + 2} (expected --into, --from or --expect).`,
      );
    }
    if (value === undefined || value.startsWith("--")) {
      return fail(`${flag} needs a value.`);
    }
    const normalized = value.trim().toLowerCase();
    if (flag === "--expect") {
      if (expect !== null) {
        return fail("--expect given more than once.");
      }
      if (!FINGERPRINT_PATTERN.test(normalized)) {
        return fail(
          "--expect must be the 32-character fingerprint the dry run printed.",
        );
      }
      expect = normalized;
      continue;
    }
    if (!UUID_PATTERN.test(normalized)) {
      return fail(
        `${flag} must be an internal player id (a UUID). Never type a Yandex id here.`,
      );
    }
    if (flag === "--into") {
      if (into !== null) {
        return fail("--into given more than once.");
      }
      into = normalized;
    } else {
      sources.push(normalized);
    }
  }
  if (into === null) {
    return fail("--into is required.");
  }
  if (sources.length === 0) {
    return fail("At least one --from is required.");
  }
  if (sources.length > MAX_MERGE_SOURCES) {
    return fail(`At most ${MAX_MERGE_SOURCES} --from values.`);
  }
  if (new Set(sources).size !== sources.length) {
    return fail("The --from values must all be different.");
  }
  if (sources.includes(into)) {
    return fail("--into must not also be a --from.");
  }
  if (mode === "commit" && expect === null) {
    return fail(
      "commit needs --expect <fingerprint> from a dry run of the same records.",
    );
  }
  if (mode === "dry-run" && expect !== null) {
    return fail("--expect is for commit only.");
  }
  return { ok: true, args: { mode, into, sources, expect } };
}

// ── Output ─────────────────────────────────────────────────────────────────

function iso(value: Date | null): string {
  return value === null ? "none" : value.toISOString();
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

/** One record's state. No id; the display name is printed (box-local output only). */
export function formatRecord(label: string, state: MergeRecordState): string {
  const credits = sum(state.credits.map((row) => row.xpAwarded));
  const bonuses = sum(state.rewarded.map((row) => row.xpAwarded));
  const receipts =
    state.receipts.length === 0
      ? "0"
      : `${state.receipts.length} (${state.receipts
          .map((r) => `${r.productId} ${r.processedAt.toISOString()}`)
          .join("; ")})`;
  return [
    `[${label}]`,
    `  created: ${iso(state.createdAt)}   last login: ${iso(state.lastLoginAt)}`,
    `  xp: ${state.xp} = match credits ${credits} (${state.credits.length} rows) + ad bonuses ${bonuses} (${state.rewarded.length} rows) + tenure ${state.tenure?.xpAwarded ?? 0} — ${xpRuleHolds(state) ? "rule OK" : `RULE BROKEN (ledgers sum to ${ledgerXp(state)})`}`,
    `  citizen: ${state.isCitizen}   earned at: ${iso(state.citizenshipEarnedAt)}`,
    `  paid: ${state.isPaidCitizen}   purchased at: ${iso(state.citizenshipPurchasedAt)}`,
    `  display name: ${state.displayName === null ? "none" : JSON.stringify(state.displayName)}   latest name request: ${state.latestNameStatus ?? "none"}${state.hasPendingName ? " (PENDING)" : ""}   history rows: ${state.nameHistoryCount}`,
    `  receipts: ${receipts}`,
    `  entitlements: ${state.entitlements.length === 0 ? "0" : `${state.entitlements.length} (${state.entitlements.map((e) => e.productId).join(", ")})`}`,
    `  identities: ${state.identityCount}   first created: ${iso(state.identityFirstCreatedAt)}   last login: ${iso(state.identityLastLoginAt)}`,
    `  tenure row: ${state.tenure === null ? "none" : `${state.tenure.xpAwarded} XP (granted ${state.tenure.grantedAt.toISOString()})`}`,
    `  messages: ${state.messageCount}   intents: ${state.intentCount} (${state.unusedIntentCount} unused)   cosmetics: ${state.cosmetics.length}   tester snapshot: ${state.hasTesterSnapshot ? "YES" : "no"}`,
  ].join("\n");
}

function tenureLine(source: SourcePlan): string {
  switch (source.tenure) {
    case "none":
      return "none on this source";
    case "move":
      return `moves (${source.tenureXpBefore} XP; ${INTO_LABEL} had none)`;
    case "swap":
      return `swap — ${INTO_LABEL} gets this ${source.tenureXpBefore} XP row, ${source.label} keeps the ${source.tenureXpAfter} XP one`;
    case "stay":
      return `stays (${source.tenureXpBefore} XP; ${INTO_LABEL}'s is not smaller)`;
  }
}

function nameLine(source: SourcePlan, state: MergeRecordState): string {
  switch (source.name) {
    case "none":
      return "none on this source";
    case "move":
      return `${JSON.stringify(state.displayName)} moves to ${INTO_LABEL} (cleared here first), with ${source.nameHistoryRows} history rows, plus one new approved row on ${INTO_LABEL}`;
    case "reserved":
      return `${JSON.stringify(state.displayName)} stays reserved here (${INTO_LABEL} already has a name)`;
  }
}

/** "What the real run would change", row by row. */
export function formatPlan(
  plan: MergePlan,
  sources: readonly MergeRecordState[],
): string {
  const lines: string[] = ["What the real run would change:"];
  plan.sources.forEach((source, index) => {
    lines.push(
      `  ${source.label} -> ${INTO_LABEL}:`,
      `    receipts: move ${source.receipts.length}${source.receipts.length === 0 ? "" : ` (${source.receipts.map((r) => `${r.productId}${r.entitlement === "dropped_duplicate" ? ", DOUBLE CHARGE: ownership row removed" : r.entitlement === "moved" ? ", ownership row moves" : ""}`).join("; ")})`}`,
      `    intents: move ${source.intents}`,
      `    identities: move ${source.identities}`,
      `    match credits: move ${source.movedCreditRows} (+${source.movedCreditXp} XP)   ad bonuses: move ${source.movedRewardedRows} (+${source.movedRewardedXp} XP)`,
      `    duplicate games (${INTO_LABEL} already has them; both tables' rows stay here): ${source.duplicateGames} (${source.duplicateXp} XP)`,
      `    tenure row: ${tenureLine(source)}`,
      `    messages: move ${source.messages}`,
      `    cosmetics: move ${source.cosmeticsMoved.length}, ${source.cosmeticsStay} clash and stay`,
      `    name: ${nameLine(source, sources[index])}`,
      `    citizenship: ${source.clearsCitizenship ? "earned date cleared, citizen flag recomputed (to not a citizen)" : "nothing to change"}`,
      `    afterwards: xp ${source.xpBefore} -> ${source.xpAfter}, no identity, no receipt`,
    );
  });
  const keep = plan.keep;
  lines.push(
    `  ${INTO_LABEL} afterwards:`,
    `    xp ${keep.xpBefore} -> ${keep.xpAfter} (never below the highest before: ${keep.highestXpBefore})`,
    `    citizen: ${keep.isCitizenAfter}   earned at: ${iso(keep.earnedAtBefore)} -> ${keep.stampsEarnedNow ? "now (threshold reached)" : iso(keep.earnedAtAfter)}   paid: ${keep.isPaidAfter}`,
    `    display name: ${keep.nameBefore === null ? "none" : JSON.stringify(keep.nameBefore)} -> ${keep.nameAfter === null ? "none" : JSON.stringify(keep.nameAfter)}`,
  );
  return lines.join("\n");
}

/** Sightings by label (no token); "another profile" for one outside this merge. */
export function formatSightings(
  sightings: readonly HolderSightingRow[],
  ids: readonly string[],
): string {
  const labelOf = (id: string) => {
    const index = ids.indexOf(id);
    return index === -1
      ? "another profile"
      : index === 0
        ? INTO_LABEL
        : sourceLabel(index - 1);
  };
  const lines = [
    `Purchase-holder sightings involving these records: ${sightings.length}`,
  ];
  for (const s of sightings) {
    lines.push(
      `  held by ${labelOf(s.holderPlayerId)}, presented by ${labelOf(s.seenPlayerId)}: seen ${s.seenCount} times, first ${s.firstSeenAt.toISOString()}, last ${s.lastSeenAt.toISOString()}, payload issued ${iso(s.payloadIssuedAt)}`,
    );
  }
  return lines.join("\n");
}

export function formatInspection(
  inspection: MergeInspection,
  ids: readonly string[],
): string {
  const [into, ...sources] = inspection.states;
  const parts = [
    formatRecord(INTO_LABEL, into),
    ...sources.map((state, index) => formatRecord(sourceLabel(index), state)),
    "",
    formatPlan(inspection.plan, sources),
    "",
    formatSightings(inspection.sightings, ids),
  ];
  const warnings = inspection.plan.warnings;
  parts.push(
    "",
    warnings.length === 0
      ? "Warnings: none"
      : ["Warnings:", ...warnings.map((w) => `  - ${w}`)].join("\n"),
  );
  return parts.join("\n");
}

// ── Summary line ───────────────────────────────────────────────────────────

export type MergeOutcome =
  | "planned"
  | "nothing_to_move"
  | "merged"
  | "refused"
  | "error";

export type MergeReason =
  | MergeRefusalCode
  | "bad_arguments"
  | "no_terminal"
  | "schema_missing"
  | "no_such_player"
  | "fingerprint_mismatch"
  | "not_confirmed"
  | "invariant_failed"
  | "db_error";

export interface SummaryCounts {
  receipts: number;
  intents: number;
  identities: number;
  credits: number;
  rewarded: number;
  tenureRows: number;
  messages: number;
  cosmetics: number;
  namesMoved: number;
}

export function countsFromPlan(plan: MergePlan): SummaryCounts {
  return {
    receipts: sum(plan.sources.map((s) => s.receipts.length)),
    intents: sum(plan.sources.map((s) => s.intents)),
    identities: sum(plan.sources.map((s) => s.identities)),
    credits: sum(plan.sources.map((s) => s.movedCreditRows)),
    rewarded: sum(plan.sources.map((s) => s.movedRewardedRows)),
    tenureRows: plan.sources.filter(
      (s) => s.tenure === "move" || s.tenure === "swap",
    ).length,
    messages: sum(plan.sources.map((s) => s.messages)),
    cosmetics: sum(plan.sources.map((s) => s.cosmeticsMoved.length)),
    namesMoved: plan.sources.filter((s) => s.name === "move").length,
  };
}

export function countsFromMoved(moved: readonly MovedCounts[]): SummaryCounts {
  return {
    receipts: sum(moved.map((m) => m.receipts)),
    intents: sum(moved.map((m) => m.intents)),
    identities: sum(moved.map((m) => m.identities)),
    credits: sum(moved.map((m) => m.credits)),
    rewarded: sum(moved.map((m) => m.rewarded)),
    tenureRows: moved.filter((m) => m.tenure === "move" || m.tenure === "swap")
      .length,
    messages: sum(moved.map((m) => m.messages)),
    cosmetics: sum(moved.map((m) => m.cosmetics)),
    namesMoved: moved.filter((m) => m.nameMoved).length,
  };
}

/** One line, counts only — no id, no name, no token. */
export function buildSummaryLine(entry: {
  mode: MergeMode | null;
  outcome: MergeOutcome;
  reason: MergeReason | null;
  sources: number | null;
  counts: SummaryCounts | null;
}): string {
  return `merge-profiles summary ${JSON.stringify(entry)}`;
}

// ── The run ────────────────────────────────────────────────────────────────

export interface MergeRunOptions {
  argv: readonly string[];
  operator: string | undefined;
  /** stdin is a terminal — a real run needs one for its typed confirmation. */
  interactive: boolean;
  prompt: (question: string) => Promise<string>;
  store: ProfileMergeStore;
  out: (line: string) => void;
  err: (line: string) => void;
  now: () => Date;
}

/** Runs one command; returns the exit code. Never throws. */
export async function runMergeProfiles(
  options: MergeRunOptions,
): Promise<number> {
  const parsed = parseMergeArgs(options.argv);
  const mode = parsed.ok ? parsed.args.mode : parsed.mode;
  const sourceCount = parsed.ok ? parsed.args.sources.length : null;
  const finish = (
    code: number,
    outcome: MergeOutcome,
    reason: MergeReason | null,
    counts: SummaryCounts | null = null,
  ): number => {
    options.out(
      buildSummaryLine({
        mode,
        outcome,
        reason,
        sources: sourceCount,
        counts,
      }),
    );
    return code;
  };

  if (!parsed.ok) {
    options.err(`REFUSED: ${parsed.error} Nothing was done.\n${USAGE}`);
    return finish(EXIT_BAD_INPUT, "refused", "bad_arguments");
  }
  const args = parsed.args;
  const ids = [args.into, ...args.sources];
  const request = { into: args.into, sources: args.sources };

  if (args.mode === "commit" && !options.interactive) {
    options.err(
      `REFUSED: a real merge needs a terminal for its typed ${CONFIRM_WORD} confirmation. Run \`docker compose exec\` WITHOUT -T. Nothing was written.`,
    );
    return finish(EXIT_REFUSED, "refused", "no_terminal");
  }

  try {
    const inspected = await options.store.inspect(request, options.now());
    if (inspected.status === "schema_missing") {
      options.err(
        "REFUSED: migration 012_player_merges.sql is not applied on this database. Deploy the profile image that carries it first. Nothing was written.",
      );
      return finish(EXIT_REFUSED, "refused", "schema_missing");
    }
    if (inspected.status === "no_such_player") {
      options.err(
        `REFUSED: no player with the id given for ${inspected.labels.join(", ")}. Nothing was written.`,
      );
      return finish(EXIT_REFUSED, "refused", "no_such_player");
    }

    const plan = inspected.plan;
    const blocking = plan.refusals.filter((r) => r.code !== "nothing_to_move");
    const nothingToMove = plan.refusals.some(
      (r) => r.code === "nothing_to_move",
    );

    if (args.mode === "dry-run") {
      options.out(
        `Profile merge — DRY RUN, nothing is written. Records: ${INTO_LABEL} + ${args.sources.length} source${args.sources.length === 1 ? "" : "s"}.\n`,
      );
      options.out(formatInspection(inspected, ids));
      if (blocking.length > 0) {
        options.err(
          [
            "",
            "REFUSED — a real run would refuse:",
            ...blocking.map((r) => `  - ${r.message}`),
            "No fingerprint is printed. Nothing was written.",
          ].join("\n"),
        );
        return finish(EXIT_REFUSED, "refused", blocking[0].code);
      }
      if (nothingToMove) {
        options.out(
          "\nNOTHING TO MOVE: the sources hold nothing a merge would change. No fingerprint is printed.",
        );
        return finish(EXIT_OK, "nothing_to_move", null, countsFromPlan(plan));
      }
      options.out(
        [
          "",
          `Fingerprint: ${inspected.fingerprint}`,
          `Real run (same --into and --from, in the same order): npm run -s ${MERGE_NPM_SCRIPT} -- commit --into <keep-internal-id> --from <source-internal-id> ... --expect ${inspected.fingerprint}`,
        ].join("\n"),
      );
      return finish(EXIT_OK, "planned", null, countsFromPlan(plan));
    }

    // commit — the read-only check, then the confirmation, then the write.
    if (inspected.fingerprint !== args.expect) {
      options.err(
        "REFUSED: these records changed since the dry run (fingerprint mismatch), or --into/--from differ from it. Run the dry run again. Nothing was written.",
      );
      return finish(EXIT_REFUSED, "refused", "fingerprint_mismatch");
    }
    if (blocking.length > 0 || nothingToMove) {
      const refusals = blocking.length > 0 ? blocking : plan.refusals;
      options.err(
        [
          "REFUSED:",
          ...refusals.map((r) => `  - ${r.message}`),
          "Nothing was written.",
        ].join("\n"),
      );
      return finish(EXIT_REFUSED, "refused", refusals[0].code);
    }
    options.out(formatPlan(plan, inspected.states.slice(1)));
    if (plan.warnings.length > 0) {
      options.out(
        ["Warnings:", ...plan.warnings.map((w) => `  - ${w}`)].join("\n"),
      );
    }
    const answer = await options.prompt(
      `Type ${CONFIRM_WORD} to apply this merge (anything else cancels): `,
    );
    if (answer.trim() !== CONFIRM_WORD) {
      options.err("CANCELLED: not confirmed. Nothing was written.");
      return finish(EXIT_REFUSED, "refused", "not_confirmed");
    }

    const operator =
      options.operator !== undefined && options.operator.trim() !== ""
        ? options.operator.trim()
        : "unknown";
    const outcome: CommitOutcome = await options.store.commit(
      { ...request, expectedFingerprint: args.expect, operator },
      options.now(),
    );
    switch (outcome.status) {
      case "schema_missing":
        options.err(
          "REFUSED: migration 012_player_merges.sql is not applied. Nothing was written.",
        );
        return finish(EXIT_REFUSED, "refused", "schema_missing");
      case "no_such_player":
        options.err(
          `REFUSED: no player with the id given for ${outcome.labels.join(", ")}. Nothing was written.`,
        );
        return finish(EXIT_REFUSED, "refused", "no_such_player");
      case "fingerprint_mismatch":
        options.err(
          "REFUSED: the records changed between the check and the write (fingerprint mismatch). Run the dry run again. Nothing was written.",
        );
        return finish(EXIT_REFUSED, "refused", "fingerprint_mismatch");
      case "refused":
        options.err(
          [
            "REFUSED:",
            ...outcome.refusals.map((r) => `  - ${r.message}`),
            "Nothing was written.",
          ].join("\n"),
        );
        return finish(EXIT_REFUSED, "refused", outcome.refusals[0].code);
      case "invariant_failed":
        options.err(
          [
            "REFUSED — the merge broke a check, so it was rolled back:",
            ...outcome.failures.map((f) => `  - ${f}`),
            "Nothing was written. Re-plan before retrying.",
          ].join("\n"),
        );
        return finish(EXIT_REFUSED, "refused", "invariant_failed");
      case "merged":
        options.out(
          `MERGED: ${outcome.moved.length} source${outcome.moved.length === 1 ? "" : "s"} folded into ${INTO_LABEL}; ${INTO_LABEL}'s xp is now ${outcome.keepXpAfter}. One player_merges audit row was written. Operator recorded as ${JSON.stringify(operator)}.\nRequired next step: run the same dry run again in 24 hours; anything it finds is swept by another commit.`,
        );
        return finish(EXIT_OK, "merged", null, countsFromMoved(outcome.moved));
    }
  } catch (error) {
    // The pg message goes to the operator's terminal only; the summary gets the code.
    const message = error instanceof Error ? error.message : "unknown error";
    options.err(
      `ERROR: database error (${message}). The transaction was rolled back, so nothing was written, unless the failure came at the very commit: run the dry run to check before retrying.`,
    );
    return finish(EXIT_REFUSED, "error", "db_error");
  }
}
