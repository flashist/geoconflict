#!/usr/bin/env node
// check-config-values.mjs — deploy-time config VALUE guard, Phase 2 (task 0064).
//
// WHAT IT DOES
//   Judges the VALUES the game deploy (deploy.sh) is about to forward through its
//   heredoc — the exact values, after every default and override deploy.sh applies —
//   and names, by NAME only, every key whose value breaks a rule:
//     • non-empty   a forwarded key must not be blank, unless the allowlist records a
//                   game `phase: 2` `optional` entry for it (blank by recorded decision)
//     • format      PUBLIC_PROTOCOL must be `https`; API_BASE_URL, JWT_ISSUER and
//                   PROFILE_API_URL must be https URLs whose host is not a bare IP
//   Both rules apply to PRODUCTION deploys only (--deploy-env=prod; owner ruling
//   2026-09-23). Under dev/staging no value is judged; wiring faults are still reported.
//   Keys the parity guard calls dead (forwarded, no consumer) are not checked: a key
//   nothing reads cannot be required.
//
// WHY IT IS A SEPARATE FILE
//   check-config-parity.mjs promises it never reads a value, and a static test holds it
//   to that. This file DOES see values, so it lives apart, with its own contract below,
//   and borrows only the parity file's parsers through a library import.
//
// ITS NO-LEAK CONTRACT — values in on stdin, names out
//   It never opens a .env file and never reads the process environment (the static
//   tests over this file are the same ones the parity checker carries). deploy.sh
//   streams `name NUL value NUL` records into stdin, because most heredoc sources are
//   computed shell variables that are never exported. Nothing it prints is taken from a
//   value: no value, no excerpt of one (scheme, host, prefix), no length. Every verdict
//   is fixed wording. A malformed stream is reported in fixed wording too — its bytes
//   are never echoed, because a value can sit where a name was expected.
//
// PROFILE VALUES are not checked here. A blank staged profile value can legitimately
//   mean "reuse the value persisted on the box", so they are judged ON the box after
//   persist-or-reuse: setup-profile.sh report_config_values (task 0220).
//
// MODES
//   --list-sources  print the heredoc's value-source names, one per line, sorted and
//                   de-duplicated, and nothing else on stdout. On a parse failure or a
//                   missing deploy.sh: exit 1, message on stderr, stdout empty.
//   --values-stdin  read the records from stdin and judge them. stdin is read only when
//                   this flag is given, so an interactive run never blocks.
//
// EXIT CONTRACT (mirrors the parity guard's)
//   --report-only  exits 0 for every analysis outcome.
//   --enforce      exits 1 on any REQUIRED, VALUE-UNKNOWN, PARSE-FAILURE or SKIP. Built
//                  and tested, but wired to nothing — arming it is task 0298.
//   Bad or missing arguments (including --deploy-env, one of dev|staging|prod) exit 2.
//   THE ABSOLUTE "this cannot fail a deploy" is guaranteed by the CALL SITE's `|| true`
//   in deploy.sh, not by this file.
//
// Zero dependencies: Node stdlib only.

import { isIP } from "node:net";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

// Import the parity checker as a library. The flag stops its main() from running; if
// the flag is ever lost, that main() rejects this checker's arguments and its
// `config-parity guard: unknown argument …` usage error lands in this output — loud,
// never silent (review 0064 R22).
globalThis.CONFIG_PARITY_AS_LIBRARY = true;
const {
  INPUT_DEFAULTS,
  GAME_HEREDOC,
  parseHeredocKeys,
  loadAllowlist,
  analyse,
} = await import("./check-config-parity.mjs");

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_REPO_ROOT = path.resolve(HERE, "..");
const DEPLOY_ENVS = ["dev", "staging", "prod"];
const ALLOWLIST_LABEL = "scripts/config-parity-allowlist.json";

// A heredoc body line this checker can judge: `KEY=${SOURCE}` or `KEY=$SOURCE`.
const HEREDOC_LINE = /^([A-Z_][A-Z0-9_]*)=(.*)$/;
const PLAIN_SOURCE =
  /^\$(?:\{([A-Za-z_][A-Za-z0-9_]*)\}|([A-Za-z_][A-Za-z0-9_]*))$/;
const SHELL_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;

// Format rules — exactly the owner's list (0064 Q5). Each verdict is fixed wording.
const PROTOCOL_KEYS = new Set(["PUBLIC_PROTOCOL"]);
const URL_KEYS = new Set(["API_BASE_URL", "JWT_ISSUER", "PROFILE_API_URL"]);
const RULE_TEXT = {
  empty: "forwarded but EMPTY",
  "protocol-not-https": "must be https — it is not",
  "not-https": "must be an https URL — it is not",
  "not-a-url": "must be a URL — it does not parse",
  "bare-ip": "must not be a bare IP address — its host is an IP literal",
};

// ── Arguments ─────────────────────────────────────────────────────────────────
class UsageError extends Error {}

function parseArgs(argv) {
  const inputs = { ...INPUT_DEFAULTS };
  let repoRoot = DEFAULT_REPO_ROOT;
  let mode = null;
  let enforce = false;
  let json = false;
  let deployEnv = null;
  const setMode = (next) => {
    if (mode !== null && mode !== next)
      throw new UsageError("--list-sources and --values-stdin are exclusive");
    mode = next;
  };
  for (const arg of argv) {
    if (arg === "--list-sources") setMode("list-sources");
    else if (arg === "--values-stdin") setMode("values-stdin");
    else if (arg === "--report-only") enforce = false;
    else if (arg === "--enforce") enforce = true;
    else if (arg === "--json") json = true;
    else if (arg.startsWith("--repo-root=")) repoRoot = arg.slice(12);
    else if (arg.startsWith("--deploy-env=")) {
      deployEnv = arg.slice(13);
      if (!DEPLOY_ENVS.includes(deployEnv))
        throw new UsageError("--deploy-env must be one of dev|staging|prod");
    } else {
      const match = /^--([a-z-]+)=/.exec(arg);
      if (match && Object.prototype.hasOwnProperty.call(inputs, match[1]))
        inputs[match[1]] = arg.slice(match[0].length);
      else
        throw new UsageError(
          `unknown argument '${match ? `--${match[1]}=` : arg.split("=")[0]}'`,
        );
    }
  }
  if (mode === null)
    throw new UsageError("one of --list-sources or --values-stdin is required");
  if (mode === "values-stdin" && deployEnv === null)
    throw new UsageError("--values-stdin needs --deploy-env=dev|staging|prod");
  return {
    inputs,
    repoRoot: path.resolve(repoRoot),
    mode,
    enforce,
    json,
    deployEnv,
  };
}

// ── The heredoc: which key is fed by which source ─────────────────────────────
/**
 * Every judgeable heredoc line as { key, line, source }, where source is null when the
 * right-hand side is not a plain ${NAME}. Carries line numbers and names only — never a
 * line's text, which could hold a literal value.
 */
function readHeredoc(options) {
  const label = options.inputs["deploy-sh"];
  let text;
  try {
    text = fs.readFileSync(
      path.resolve(options.repoRoot, options.inputs["deploy-sh"]),
      "utf8",
    );
  } catch {
    return { lines: [], skip: `${label} not found`, failure: null };
  }
  const heredoc = parseHeredocKeys(
    text,
    GAME_HEREDOC.anchor,
    GAME_HEREDOC.delimiter,
    label,
  );
  if (heredoc.failure)
    return { lines: [], skip: null, failure: heredoc.failure };

  // heredoc.body runs from the opening line to the delimiter line, inclusive. Its first
  // line's number is recovered so the messages can cite deploy.sh lines.
  const bodyLines = heredoc.body.split("\n");
  const firstLine =
    text.split("\n").findIndex((l) => GAME_HEREDOC.anchor.test(l)) + 1;
  const lines = [];
  for (let i = 1; i < bodyLines.length - 1; i++) {
    const match = HEREDOC_LINE.exec(bodyLines[i]);
    if (!match) continue; // blank / comment: parseHeredocKeys already vetted the rest
    const plain = PLAIN_SOURCE.exec(match[2]);
    lines.push({
      key: match[1],
      line: firstLine + i,
      source: plain ? (plain[1] ?? plain[2]) : null,
    });
  }
  return { lines, skip: null, failure: null };
}

function sourcesOf(lines) {
  return [
    ...new Set(lines.filter((l) => l.source !== null).map((l) => l.source)),
  ].sort();
}

// ── The value stream ──────────────────────────────────────────────────────────
async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

/** `name NUL value NUL …` → { values: Map } or { malformed: fixed-wording reason }. */
function parseStream(raw) {
  if (raw === "") return { values: new Map(), malformed: null };
  const parts = raw.split("\0");
  if (parts[parts.length - 1] !== "")
    return { values: null, malformed: "its last record is not NUL-terminated" };
  parts.pop();
  if (parts.length % 2 !== 0)
    return { values: null, malformed: "it holds an odd number of fields" };
  const values = new Map();
  for (let i = 0; i < parts.length; i += 2) {
    if (!SHELL_NAME.test(parts[i]))
      return { values: null, malformed: "a record's name is not a shell name" };
    if (values.has(parts[i]))
      return { values: null, malformed: "a name appears twice" };
    values.set(parts[i], parts[i + 1]);
  }
  return { values, malformed: null };
}

// ── Judging ───────────────────────────────────────────────────────────────────
/** Every format rule a non-empty value breaks, as rule ids. Prod only. */
function formatRules(key, value) {
  if (PROTOCOL_KEYS.has(key))
    return value === "https" ? [] : ["protocol-not-https"];
  if (!URL_KEYS.has(key)) return [];
  const rules = [];
  // Case-sensitive on purpose: the application compares with startsWith("https://").
  if (!value.startsWith("https://")) rules.push("not-https");
  let url = null;
  try {
    url = new URL(value);
  } catch {
    rules.push("not-a-url");
  }
  // WHATWG URL normalises IPv4 spellings (a bare integer, a short dotted form) to the
  // dotted quad and brackets IPv6, so one isIP() check catches every IP literal.
  if (url !== null && isIP(url.hostname.replace(/^\[|\]$/g, "")) !== 0)
    rules.push("bare-ip");
  return rules;
}

/** Whether the parity analysis saw everything; if not, no key may be called dead. */
function deadKeys(options, lines) {
  let parity;
  try {
    parity = analyse({
      repoRoot: options.repoRoot,
      inputs: options.inputs,
      pipelines: ["game"],
      enforce: false,
    });
  } catch {
    return {
      dead: new Set(),
      exemptionOff:
        "the parity analysis errored, so no key is exempted as dead; every forwarded key is checked",
    };
  }
  const incomplete =
    parity.parseFailures.length +
    parity.dynamicReads.length +
    parity.skips.length;
  if (incomplete > 0) {
    return {
      dead: new Set(),
      exemptionOff: `the parity analysis is incomplete (${parity.parseFailures.length} parse failure(s), ${parity.dynamicReads.length} blind spot(s), ${parity.skips.length} skip(s)), so no key is exempted as dead; every forwarded key is checked`,
    };
  }
  const forwarded = new Set(lines.map((l) => l.key));
  return {
    dead: new Set(
      parity.pipelines.game.info
        .map((f) => f.name)
        .filter((n) => forwarded.has(n)),
    ),
    exemptionOff: null,
  };
}

function check(options, values, malformed) {
  const result = {
    mode: options.enforce ? "enforce" : "report-only",
    deployEnv: options.deployEnv,
    required: [],
    optional: [],
    ok: [],
    unchecked: [],
    notJudged: [],
    valueUnknown: [],
    parseFailures: [],
    skips: [],
    info: [],
    deadKeyExemption: { applied: true, reason: null },
    requiredTotal: 0,
  };

  const heredoc = readHeredoc(options);
  if (heredoc.skip) result.skips.push(heredoc.skip);
  if (heredoc.failure) result.parseFailures.push(heredoc.failure);

  // Game phase-2 allowlist entries: the only thing that may let a value be blank.
  const allowlistFile = path.resolve(
    options.repoRoot,
    options.inputs.allowlist,
  );
  const allowlist = loadAllowlist(allowlistFile);
  if (allowlist.missing)
    result.skips.push(`${options.inputs.allowlist} not found`);
  if (allowlist.failure) result.parseFailures.push(allowlist.failure);
  const optional = new Map();
  for (const entry of allowlist.entries) {
    if (entry.pipeline !== "game" || (entry.phase ?? 1) !== 2) continue;
    if (entry.class !== "optional") {
      result.parseFailures.push(
        `allowlist: ${entry.name} is a game phase-2 entry of class '${entry.class}' — a value entry must be 'optional' (blank allowed)`,
      );
      continue;
    }
    optional.set(entry.name, entry);
  }
  const forwardedKeys = new Set(heredoc.lines.map((l) => l.key));
  for (const name of optional.keys()) {
    if (!forwardedKeys.has(name))
      result.info.push(
        `allowlist: game phase-2 entry ${name} names a key the deploy.sh heredoc does not forward — stale entry`,
      );
  }

  const { dead, exemptionOff } = deadKeys(options, heredoc.lines);
  if (exemptionOff)
    result.deadKeyExemption = { applied: false, reason: exemptionOff };

  if (malformed) {
    result.valueUnknown.push(
      `the value stream on stdin is malformed (${malformed}) — no value was judged`,
    );
  }

  const prod = options.deployEnv === "prod";
  for (const { key, line, source } of heredoc.lines) {
    if (source === null) {
      result.valueUnknown.push(
        `${key} — ${options.inputs["deploy-sh"]} heredoc line ${line} is not a plain \${NAME} reference, so its value cannot be judged`,
      );
      continue;
    }
    if (malformed) continue;
    if (!values.has(source)) {
      result.valueUnknown.push(
        `${key} — its source ${source} was not supplied on stdin (a wiring fault, not an empty value)`,
      );
      continue;
    }
    if (dead.has(key)) {
      result.unchecked.push(key);
      continue;
    }
    if (!prod) {
      result.notJudged.push(key);
      continue;
    }
    // The application trims these values, so whitespace-only is empty.
    const value = values.get(source).trim();
    if (value === "") {
      const entry = optional.get(key);
      if (entry)
        result.optional.push({
          name: key,
          reason: "blank by recorded decision",
        });
      else
        result.required.push({
          name: key,
          rules: ["empty"],
          detail: RULE_TEXT.empty,
        });
      continue;
    }
    const rules = formatRules(key, value);
    if (rules.length > 0)
      result.required.push({
        name: key,
        rules,
        detail: rules.map((r) => RULE_TEXT[r]).join("; "),
      });
    else result.ok.push(key);
  }
  result.requiredTotal = result.required.length;
  return result;
}

// ── Reporting ─────────────────────────────────────────────────────────────────
/** Whether --enforce fails this run: the ONE definition, for exit code and footer. */
function failsClosed(result) {
  return (
    result.requiredTotal > 0 ||
    result.valueUnknown.length > 0 ||
    result.parseFailures.length > 0 ||
    result.skips.length > 0
  );
}

function render(result) {
  const out = [];
  const title = `config value guard (${result.mode}) · deploy env: ${result.deployEnv}`;
  out.push(`── ${title} ${"─".repeat(Math.max(0, 62 - title.length))}`);
  out.push(
    "pipeline: game   (profile values are checked on the box: setup-profile.sh report_config_values, task 0220)",
  );
  for (const skip of result.skips) out.push(`SKIP  ${skip}`);
  for (const failure of result.parseFailures)
    out.push(`PARSE-FAILURE  ${failure}`);
  for (const unknown of result.valueUnknown)
    out.push(`VALUE-UNKNOWN  ${unknown}`);
  if (!result.deadKeyExemption.applied)
    out.push(`NOTE  ${result.deadKeyExemption.reason}`);

  if (result.deployEnv !== "prod") {
    out.push(
      `NOT JUDGED ${result.notJudged.length}  value rules apply to prod deploys only (owner ruling 2026-09-23)`,
    );
  } else {
    out.push(`REQUIRED  ${result.required.length}`);
    for (const finding of result.required)
      out.push(`          ${finding.name} — ${finding.detail}`);
    out.push(`OPTIONAL  ${result.optional.length}`);
    for (const entry of result.optional)
      out.push(
        `          ${entry.name} — ${entry.reason} (${ALLOWLIST_LABEL})`,
      );
    out.push(`OK        ${result.ok.length}`);
  }
  out.push(
    `UNCHECKED ${result.unchecked.length}  no consumer (see the parity guard's INFO line)`,
  );
  for (const note of result.info) out.push(`INFO  ${note}`);

  if (result.mode === "report-only")
    out.push("report-only — exit 0, this cannot fail a deploy");
  else if (failsClosed(result))
    out.push("enforce — failing on the findings above");
  else out.push("enforce — no required findings");
  return out.join("\n");
}

// ── Entry point ───────────────────────────────────────────────────────────────
const USAGE =
  "usage: check-config-values.mjs --list-sources | --values-stdin --deploy-env=dev|staging|prod [--report-only|--enforce] [--json] [--repo-root=PATH]";

async function main(argv) {
  let options;
  try {
    options = parseArgs(argv);
  } catch (error) {
    if (!(error instanceof UsageError)) throw error;
    process.stderr.write(`config value guard: ${error.message}\n${USAGE}\n`);
    return 2;
  }

  if (options.mode === "list-sources") {
    const heredoc = readHeredoc(options);
    const problem = heredoc.skip ?? heredoc.failure;
    if (problem) {
      process.stderr.write(`config value guard: ${problem}\n`);
      return 1;
    }
    const sources = sourcesOf(heredoc.lines);
    process.stdout.write(sources.length > 0 ? sources.join("\n") + "\n" : "");
    return 0;
  }

  // Drain stdin first, whatever happens next, so the writer never meets a closed pipe.
  let parsed;
  try {
    parsed = parseStream(await readStdin());
  } catch {
    parsed = { values: null, malformed: "it could not be read" };
  }

  let result;
  try {
    result = check(options, parsed.values, parsed.malformed);
  } catch (error) {
    // A crash must never fail a deploy; under --enforce it fails closed. Only the error's
    // class is printed — a message could, in principle, carry a value.
    process.stdout.write(
      `config value guard errored (${options.enforce ? "enforce" : "report-only"}): ${error?.name ?? "error"}\n`,
    );
    return options.enforce ? 1 : 0;
  }

  if (options.json)
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  else process.stdout.write(render(result) + "\n");

  if (!options.enforce) return 0;
  return failsClosed(result) ? 1 : 0;
}

process.exitCode = await main(process.argv.slice(2));
