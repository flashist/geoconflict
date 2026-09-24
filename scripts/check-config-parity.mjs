#!/usr/bin/env node
// check-config-parity.mjs — deploy-time config parity guard, Phase 1 (task 0064).
//
// WHAT IT DOES
//   Compares, by NAME ONLY, the environment variables the application reads against
//   the ones each deploy pipeline actually forwards. It is pure static analysis over
//   git-tracked files.
//
// WHAT IT DELIBERATELY DOES NOT DO — this is the task's entire safety story
//   It never opens a .env file, never reads the process environment, and never prints
//   a VALUE.
//   Every token it prints comes from an enumerated NAME set. Two tests enforce this:
//   a behavioural canary test (poisoned environment, canary must not appear in the
//   output) and a static test over this very file. See tests/scripts/ConfigParity.test.ts.
//
// PIPELINES
//   game     src/server/** + src/core/**  →  deploy.sh heredoc ∪ Dockerfile ENV
//   profile  src/profile-server/**        →  setup-profile.sh profile.env ∪ Dockerfile.profile ENV
//            and, second hop, every profile.env key must be exported by
//            build-deploy-profile.sh — a key present at hop 2 but missing at hop 1 is
//            GUARANTEED to land empty (the `:-` default fires). That is task 0195's
//            exact defect, caught structurally with no values.
//   client   src/client/** + src/core/configuration/**  →  webpack DefinePlugin
//            (core/configuration/** is bundled into BOTH the server and the browser, so
//            its reads are checked against both channels — owner disposition D2)
//
// EXIT CONTRACT — stated precisely, because an overclaim here is the exact kind of
// false confidence this task exists to stop (review 0064 finding R5).
//   --report-only  exits 0 for every ANALYSIS outcome: findings, PARSE-FAILURE,
//                  DYNAMIC-READ, missing inputs, and an internal throw inside
//                  analyse(). It is NOT unconditional: an unparseable argument exits 2
//                  (before the mode is even consulted), and a throw while rendering or
//                  writing the report is uncaught and exits 1.
//   THE ABSOLUTE   "this cannot fail a deploy" is guaranteed by the CALL SITES, not by
//                  this file: deploy.sh and build-deploy-profile.sh append `|| true`,
//                  which absorbs exit 2, exit 1, an uncaught stack trace, a signal, a
//                  missing node, and an import-time syntax error alike.
//   --enforce      fails closed: exits 1 on any REQUIRED finding, PARSE-FAILURE,
//                  DYNAMIC-READ blind spot, or missing input. Built and tested, but
//                  wired to nothing (owner ruling R3) — no script passes it today.
//
// Zero dependencies: Node stdlib only, so it runs from a checkout with no node_modules.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_REPO_ROOT = path.resolve(HERE, "..");

// ── Inputs ────────────────────────────────────────────────────────────────────
// Every input is git-tracked and value-free. Each is overridable by a
// `--<key>=<path>` flag so tests can point the checker at synthetic fixtures.
export const INPUT_DEFAULTS = {
  "src-dir": "src",
  "deploy-sh": "deploy.sh",
  "update-sh": "update.sh",
  "startup-sh": "startup.sh",
  "nginx-conf": "nginx.conf",
  dockerfile: "Dockerfile",
  "dockerfile-profile": "Dockerfile.profile",
  "build-deploy-profile-sh": "build-deploy-profile.sh",
  "setup-profile-sh": "setup-profile.sh",
  "webpack-config": "webpack.config.js",
  allowlist: "scripts/config-parity-allowlist.json",
};

const PIPELINES = ["game", "profile", "client"];
const ALLOWLIST_CLASSES = [
  "runtime-supplied",
  "build-time",
  "optional",
  "dead-config",
  // Read in a file the browser bundles, but only ever CALLED on the server. The fix for
  // such a key is this allowlist, never DefinePlugin — substituting a server secret into
  // the browser bundle would publish it. Enforced: a server-only key that DefinePlugin
  // substitutes is a REQUIRED finding the allowlist cannot suppress (review 0203 R2).
  "server-only",
];

// Directory → pipeline partition. Verified exhaustive against the tree: the only
// top-level directories under src/ that contain an env read are these four.
// A jest drift test asserts src/profile-server/** never imports src/core/configuration/**,
// so "core counts as game" cannot rot silently.
//
// ONE sub-directory is mapped to TWO pipelines: src/core/configuration/** (see
// pipelinesFor). It is bundled into the BROWSER as well as the server — many
// src/client/** files import it — so a read there must be checked against DefinePlugin
// AND the deploy heredoc. Before this, a broken browser supply channel printed green:
// deleting the STRIPE_PUBLISHABLE_KEY DefinePlugin entry still gave REQUIRED 0 and
// `--enforce` exit 0 (review 0064 finding R1, fixed by owner disposition D2 in task 0203).
//
// The scope is exactly configuration/**, not all of src/core/**, because D2 ruled that
// scope and because configuration/** is where every core environment read lives; the
// rest of src/core/** stays game-only. Do not replace this with an import-graph walk —
// that is settled by ruling R2.
const DIR_PIPELINE = {
  client: "client",
  core: "game",
  server: "game",
  "profile-server": "profile",
};
const CORE_CONFIGURATION_PIPELINES = ["game", "client"];

// The game pipeline's forwarding heredoc in deploy.sh: its opening line and delimiter.
// Exported because the Phase 2 value checker (check-config-values.mjs) reads the SAME
// heredoc, and two copies of this anchor would drift apart.
export const GAME_HEREDOC = {
  anchor: /^\s*cat\s*>.*<<\s*'?EOL'?\s*$/,
  delimiter: "EOL",
};

/** Every pipeline a src/-relative file's reads belong to (empty: unpartitioned). */
function pipelinesFor(segments) {
  if (segments.length < 2) return [];
  if (segments[0] === "core" && segments[1] === "configuration")
    return CORE_CONFIGURATION_PIPELINES;
  const pipeline = DIR_PIPELINE[segments[0]];
  return pipeline ? [pipeline] : [];
}

// ── Patterns ──────────────────────────────────────────────────────────────────
// NOTE: every pattern below escapes the dot, so the un-escaped member-access spelling
// appears NOWHERE in this file — not in code, not in a comment, not in a message. The
// static no-leak test asserts exactly that, by plain text search, so anyone can audit it
// with grep. Do not "simplify" the escapes away, and do not spell it out in prose here.
// All four read patterns tolerate optional chaining and whitespace on the way to the
// environment object, so an optional-chained read is seen exactly like a plain one.
// There is one live instance — src/client/jwt.ts reads API_DOMAIN that way — and
// missing it would have made the client reverse check below report a genuinely-read
// key as dead. (The spelling itself is not written out here: the static no-leak test
// asserts the un-escaped form appears nowhere in this file, comments included.)
const ENV_READ_DOT = /process\s*\??\.\s*env\s*\??\.\s*([A-Za-z_]\w*)/g;
const ENV_READ_BRACKET_LITERAL =
  /process\s*\??\.\s*env\s*\??\.?\s*\[\s*(["'`])([^"'`]+)\1\s*\]/g;
const ENV_BRACKET_ANY = /process\s*\??\.\s*env\s*\??\.?\s*\[/g;
const ENV_ALIAS = /=\s*process\s*\??\.\s*env\b(?!\s*\??\s*[.[])/g;
// DefinePlugin keys are read from the object literal passed to the call, never from the
// file's raw text (review 0064 finding R18) — see parseDefinePlugin.
const DEFINE_PLUGIN_CALL = /\bDefinePlugin\s*\(/g;
const DEFINE_PLUGIN_KEY_VALUE = /^process\.env\.([A-Za-z_]\w*)$/;
const DOCKER_ENV = /^ENV\s+([A-Z_][A-Z0-9_]*)=/;
const PROFILE_EXPORT = /^\s*printf\s+"export\s+([A-Z_][A-Z0-9_]*)=/;
// The ONLY heredoc line shape this guard reads as a forwarded key: a column-0
// UPPERCASE= assignment. That is a limit of this parser, NOT of the consumers — Compose
// `env_file` also forwards `export KEY=`, indented and lowercase keys, and
// `docker run --env-file` forwards indented and lowercase ones. So every OTHER non-blank,
// non-comment body line is a key this guard cannot check, and parseHeredocKeys reports it
// as a hard PARSE-FAILURE, found by inversion rather than by another positive pattern
// (review 0064 findings R9, R12). It must never be silently dropped.
const HEREDOC_ASSIGN = /^([A-Z_][A-Z0-9_]*)=/;
// Used ONLY to word the failure message; it decides nothing about what is detected.
const HEREDOC_ASSIGN_INDENTED = /^[ \t]+([A-Z_][A-Z0-9_]*)=/;
// Blank or comment lines: both env-file parsers treat these as nothing.
const HEREDOC_IGNORABLE = /^\s*(?:#|$)/;
// The key name of an unconsumed line — taken ONLY when an `=` follows it, so a line that
// is not an assignment (a bare word, a stray value) contributes a line number and never
// its text.
const HEREDOC_LINE_KEY = /^\s*(?:export\s+)?([A-Za-z_]\w*)\s*=/;

// ── Small helpers ─────────────────────────────────────────────────────────────
function readFileOrNull(file) {
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return null;
  }
}

function lineOf(text, index) {
  let line = 1;
  for (let i = 0; i < index; i++) if (text.charCodeAt(i) === 10) line++;
  return line;
}

function walkTypeScript(dir, out = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkTypeScript(full, out);
    else if (entry.name.endsWith(".ts") && !entry.name.endsWith(".d.ts"))
      out.push(full);
  }
  return out;
}

// ── Code / comment / string separation (review 0064 finding R15) ─────────────
// The read patterns used to run over raw text, so a sentence in a comment could be an
// "aliased" read (a hard --enforce failure caused by prose) and a name in a comment or a
// string could count as a consumer (hiding a real dead-config line). maskNonCode blanks
// everything that is not code before the patterns run. Zero dependencies, on purpose.

// A `/` starts a regex literal after one of these punctuators, after one of these
// keywords, or at the start of the text; anywhere else it is division. Postfix `++`/`--`
// and a TypeScript non-null `!` end a value, so they leave that decision unchanged; the
// `)` that closes an `if`/`while`/`for`/`with` head starts a statement, so a regex may
// follow it (see scanCode; review 0203 finding R1, both directions).
//
// A heuristic, and NOT a guarantee. A misread that leaves an unterminated string, comment
// or regex is caught loudly (below). A misread that happens to balance is NOT caught, and
// can blank a real read silently — and the rules above are not a full JavaScript grammar,
// so an unanticipated placement can still do that.
const REGEX_AFTER_PUNCTUATOR = new Set("(,=:[!&|?{};+-*%<>~^");
const REGEX_AFTER_KEYWORD = new Set([
  "return",
  "typeof",
  "instanceof",
  "in",
  "new",
  "delete",
  "void",
  "throw",
  "case",
  "do",
  "else",
  "yield",
  "await",
]);
// The "previous token" recorded after a string, template or regex: a value, so a `/`
// that follows it is division.
const AFTER_VALUE = ")";
// Keywords whose parenthesised head is followed by a statement, not by an operator.
const CONTROL_HEAD_KEYWORD = new Set(["if", "while", "for", "with"]);
// The "previous token" recorded after the `)` that closes such a head: a statement starts
// there, exactly as after `;`, so a `/` that follows starts a regex.
const AFTER_CONTROL_HEAD = ";";

/** Whether a `/` after this previous token starts a regex literal (else: division). */
function regexMayFollow(previous) {
  return (
    previous === "" ||
    REGEX_AFTER_PUNCTUATOR.has(previous) ||
    REGEX_AFTER_KEYWORD.has(previous)
  );
}

class MaskFailure extends Error {}

function isWhitespaceCode(code) {
  return (
    code === 32 ||
    (code >= 9 && code <= 13) ||
    code === 0xa0 ||
    code === 0xfeff ||
    code === 0x2028 ||
    code === 0x2029
  );
}

function isWordCode(code) {
  return (
    (code >= 48 && code <= 57) || // 0-9
    (code >= 65 && code <= 90) || // A-Z
    (code >= 97 && code <= 122) || // a-z
    code === 95 || // _
    code === 36 || // $
    (code > 127 && !isWhitespaceCode(code))
  );
}

/**
 * Separates code from comments, string contents, template-literal text and regex bodies.
 * Returns { masked, spans, failure }:
 *   masked   the text at the same length, newlines kept, with every character of a
 *            comment, a quoted string's contents, a template's text chunks and a regex
 *            body turned into a space. Quote characters and `${ … }` substitutions stay
 *            code (with nesting), because real reads live inside substitutions.
 *   spans    every quoted string and substitution-free template as { start, end, value }:
 *            start at the opening quote, end one past the closing one.
 *   failure  null, or why the text could not be separated — text ending inside a
 *            string, template, comment or regex, or a raw line break inside a quoted
 *            string or a regex. On failure `masked` is the raw text and `spans` is empty,
 *            so a caller can fall back to raw scanning. Only a DETECTED failure lands
 *            here: a regex/division misread that still balances returns failure null
 *            (see REGEX_AFTER_PUNCTUATOR).
 */
function maskNonCode(text) {
  const n = text.length;
  const out = text.split("");
  const spans = [];
  const blank = (from, to) => {
    for (let k = from; k < to; k++) if (out[k] !== "\n") out[k] = " ";
  };
  const fail = (why, at) => {
    throw new MaskFailure(`${why} at line ${lineOf(text, at)}`);
  };

  function scanQuoted(i) {
    const quote = text[i];
    let j = i + 1;
    for (;;) {
      if (j >= n) fail("unterminated string", i);
      const ch = text[j];
      if (ch === "\\") j += 2;
      else if (ch === "\n") fail("line break inside a string", i);
      else if (ch === quote) break;
      else j++;
    }
    spans.push({ start: i, end: j + 1, value: text.slice(i + 1, j) });
    blank(i + 1, j);
    return j + 1;
  }

  function scanTemplate(i) {
    let j = i + 1;
    let chunk = j;
    let substituted = false;
    for (;;) {
      if (j >= n) fail("unterminated template literal", i);
      const ch = text[j];
      if (ch === "\\") j += 2;
      else if (ch === "`") break;
      else if (ch === "$" && text[j + 1] === "{") {
        blank(chunk, j);
        substituted = true;
        j = scanCode(j + 2, true) + 1; // scanCode returns the closing brace's index
        chunk = j;
      } else j++;
    }
    blank(chunk, j);
    if (!substituted)
      spans.push({ start: i, end: j + 1, value: text.slice(i + 1, j) });
    return j + 1;
  }

  function scanRegex(i) {
    let j = i + 1;
    let inClass = false;
    for (;;) {
      if (j >= n) fail("unterminated regular expression", i);
      const ch = text[j];
      if (ch === "\n") fail("line break inside a regular expression", i);
      if (ch === "\\") {
        j += 2;
        continue;
      }
      if (inClass) {
        if (ch === "]") inClass = false;
      } else if (ch === "[") inClass = true;
      else if (ch === "/") break;
      j++;
    }
    blank(i + 1, j);
    j++;
    while (j < n && isWordCode(text.charCodeAt(j))) j++; // flags
    return j;
  }

  // Code until the end of the text, or — inside a template substitution — until the
  // brace that closes it, whose index is returned.
  function scanCode(i, inSubstitution) {
    let depth = 0;
    let previous = "";
    // One entry per open `(`: whether it opens a control head (CONTROL_HEAD_KEYWORD).
    const parens = [];
    while (i < n) {
      const ch = text[i];
      const code = text.charCodeAt(i);
      if (isWhitespaceCode(code)) {
        i++;
      } else if (ch === "/" && text[i + 1] === "/") {
        let j = i;
        while (j < n && text[j] !== "\n") j++;
        blank(i, j);
        i = j;
      } else if (ch === "/" && text[i + 1] === "*") {
        const end = text.indexOf("*/", i + 2);
        if (end === -1) fail("unterminated block comment", i);
        blank(i, end + 2);
        i = end + 2;
      } else if (ch === "/") {
        if (regexMayFollow(previous)) {
          i = scanRegex(i);
          previous = AFTER_VALUE;
        } else {
          previous = ch;
          i++;
        }
      } else if (ch === "'" || ch === '"') {
        i = scanQuoted(i);
        previous = AFTER_VALUE;
      } else if (ch === "`") {
        i = scanTemplate(i);
        previous = AFTER_VALUE;
      } else if ((ch === "+" || ch === "-") && text[i + 1] === ch) {
        // `++` / `--` never change what a `/` means. Postfix (`n++ / 2`) follows a value
        // and ends one, so division stays division; prefix follows an operator, so a regex
        // stays possible. Leaving `previous` as it is covers both (review 0203 R1).
        i += 2;
      } else if (
        ch === "!" &&
        text[i + 1] !== "=" &&
        !regexMayFollow(previous) &&
        !isWhitespaceCode(text.charCodeAt(i - 1))
      ) {
        // A `!` written directly after a value is a TypeScript non-null assertion
        // (`t! / 4`): it ends the value, so a following `/` is division. A `!` after
        // whitespace is logical-not, and falls through to the punctuator branch below.
        i++;
      } else if (isWordCode(code)) {
        let j = i;
        while (j < n && isWordCode(text.charCodeAt(j))) j++;
        const word = text.slice(i, j);
        if (previous === ".") {
          // A member name (`obj.if(…)`) is never a keyword; mark it so it is not read as one.
          previous = `.${word}`;
        } else if (word === "await" && previous === "for") {
          // `for await (…)` is still a `for` head.
        } else previous = word;
        i = j;
      } else {
        let next = ch;
        if (ch === "{") depth++;
        else if (ch === "}") {
          if (inSubstitution && depth === 0) return i;
          depth--;
        } else if (ch === "(") parens.push(CONTROL_HEAD_KEYWORD.has(previous));
        else if (ch === ")" && parens.pop() === true) next = AFTER_CONTROL_HEAD;
        previous = next;
        i++;
      }
    }
    if (inSubstitution) fail("unterminated template substitution", n);
    return n;
  }

  try {
    scanCode(0, false);
  } catch (error) {
    if (!(error instanceof MaskFailure)) throw error;
    return { masked: text, spans: [], failure: error.message };
  }
  return { masked: out.join(""), spans, failure: null };
}

/** From just after a `[`, the name of a string-literal index closed by `]`, else null. */
function literalIndexName(masked, from, spanAt) {
  let k = from;
  while (k < masked.length && isWhitespaceCode(masked.charCodeAt(k))) k++;
  const span = spanAt.get(k);
  if (!span) return null;
  let p = span.end;
  while (p < masked.length && isWhitespaceCode(masked.charCodeAt(p))) p++;
  if (masked[p] !== "]") return null;
  if (!/^[^"'`]+$/.test(span.value) || span.value.includes("${")) return null;
  return span.value;
}

// ── Parsers — every one of them fails LOUD ────────────────────────────────────
// A parser that quietly returns an empty set is the worst outcome available here:
// forward, it would report every variable as missing; in reverse, it would report
// nothing at all and print a green check. So an unfound anchor or an empty block is
// a hard PARSE-FAILURE, never an empty set silently compared.

/** Keys assigned inside a heredoc, located by its opening line and its delimiter. */
export function parseHeredocKeys(text, openPattern, delimiter, label) {
  const lines = text.split("\n");
  const start = lines.findIndex((l) => openPattern.test(l));
  if (start === -1) {
    return {
      keys: [],
      failure: `${label}: heredoc anchor not found`,
      body: "",
    };
  }
  const keys = [];
  const unconsumed = [];
  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i].trim() === delimiter) {
      const body = lines.slice(start, i + 1).join("\n");
      // A line this parser did not consume is a key it cannot check, and dropping it
      // silently is the worst outcome available: on the profile.env heredoc it shrinks
      // hop 2 and therefore SILENCES a B2 finding — a false negative in task 0195's
      // exact shape, in the very bug this guard was built to catch. So it fails loud.
      // (Review 0064 findings R9, R12.) The message carries line numbers and key names
      // only — never a line's text, which may hold a value.
      if (unconsumed.length > 0) {
        const lineNotes = unconsumed.map(({ line, text }) => {
          const indented = HEREDOC_ASSIGN_INDENTED.exec(text);
          if (indented) return `heredoc line ${line} indents '${indented[1]}='`;
          const named = HEREDOC_LINE_KEY.exec(text);
          if (named)
            return `heredoc line ${line} '${named[1]}=' is not a column-0 UPPERCASE= assignment`;
          return `heredoc line ${line} is not a column-0 UPPERCASE= assignment`;
        });
        return {
          keys: [],
          failure: `${label}: ${lineNotes.join("; ")} — the guard reads only column-0 UPPERCASE= assignments, so ${unconsumed.length === 1 ? "this key" : "these keys"} cannot be checked`,
          body,
        };
      }
      if (keys.length === 0) {
        return {
          keys: [],
          failure: `${label}: heredoc body yielded 0 keys`,
          body,
        };
      }
      return { keys, failure: null, body };
    }
    const match = HEREDOC_ASSIGN.exec(lines[i]);
    if (match) keys.push(match[1]);
    else if (!HEREDOC_IGNORABLE.test(lines[i]))
      unconsumed.push({ line: i + 1, text: lines[i] });
  }
  return {
    keys: [],
    failure: `${label}: heredoc opened but delimiter '${delimiter}' never closed it`,
    body: "",
  };
}

/** Keys from a `{ printf "export X=%q\n" ... }` block. */
function parseProfileExports(text, label) {
  const keys = [];
  for (const line of text.split("\n")) {
    const match = PROFILE_EXPORT.exec(line);
    if (match) keys.push(match[1]);
  }
  if (keys.length === 0) {
    return { keys, failure: `${label}: found 0 'printf "export X="' lines` };
  }
  return { keys, failure: null };
}

/** Image-level `ENV NAME=` supply. An image legitimately declares none. */
function parseDockerEnv(text) {
  const keys = [];
  for (const line of text.split("\n")) {
    const match = DOCKER_ENV.exec(line);
    if (match) keys.push(match[1]);
  }
  return { keys, failure: null };
}

/**
 * Build-time substitution keys from webpack's DefinePlugin. Read from the object literal
 * passed to each `DefinePlugin(` call — not from the file's raw text, where a
 * commented-out or string-embedded key would count as SUPPLIED and hide a genuinely
 * missing substitution (review 0064 finding R18). A key position this cannot enumerate
 * (a computed key, a spread, a non-literal argument) is a PARSE-FAILURE.
 */
function parseDefinePlugin(text, label) {
  const keys = [];
  const failures = [];
  const scan = maskNonCode(text);
  if (scan.failure) {
    failures.push(
      `${label}: could not separate code from comments/strings (${scan.failure}) — cannot enumerate DefinePlugin keys`,
    );
    return { keys, failures };
  }
  const code = scan.masked;
  const spanAt = new Map(scan.spans.map((span) => [span.start, span]));
  const skipSpace = (k) => {
    while (k < code.length && isWhitespaceCode(code.charCodeAt(k))) k++;
    return k;
  };
  const cannotEnumerate = (at, what) =>
    failures.push(
      `${label}: line ${lineOf(text, at)}: DefinePlugin ${what} — cannot enumerate its keys`,
    );

  let match;
  DEFINE_PLUGIN_CALL.lastIndex = 0;
  while ((match = DEFINE_PLUGIN_CALL.exec(code)) !== null) {
    const open = skipSpace(match.index + match[0].length);
    if (code[open] !== "{") {
      cannotEnumerate(open, "argument is not an object literal");
      continue;
    }
    // Walk to the matching `}`, tracking () [] {} depth. At depth 1, the first code
    // character after `{` or a `,` is a property key position.
    let depth = 0;
    let atKey = false;
    let closed = false;
    for (let k = open; k < code.length; k++) {
      if (isWhitespaceCode(code.charCodeAt(k))) continue;
      const ch = code[k];
      if (depth === 1 && atKey) {
        atKey = false;
        const span = spanAt.get(k);
        if (span) {
          const key = DEFINE_PLUGIN_KEY_VALUE.exec(span.value);
          if (key && code[skipSpace(span.end)] === ":") keys.push(key[1]);
          k = span.end - 1;
          continue;
        }
        if (ch === "[") cannotEnumerate(k, "has a computed key");
        else if (code.startsWith("...", k)) cannotEnumerate(k, "has a spread");
        // A bare identifier key is not a substitution of the environment; ignore it.
      }
      if (ch === "{" || ch === "(" || ch === "[") {
        depth++;
        if (depth === 1) atKey = true;
      } else if (ch === "}" || ch === ")" || ch === "]") {
        depth--;
        if (depth === 0) {
          closed = true;
          break;
        }
      } else if (ch === "," && depth === 1) atKey = true;
    }
    if (!closed) cannotEnumerate(open, "object literal is never closed");
  }
  if (keys.length === 0) {
    failures.push(`${label}: found 0 DefinePlugin substitution keys`);
  }
  return { keys, failures };
}

/**
 * Every environment name the application reads, partitioned by pipeline, plus any
 * read the scanner CANNOT enumerate. Announcing its own blind spots is mandatory:
 * a guard that silently cannot see something is the exact failure mode this task
 * exists to prevent.
 */
function collectEnvReads(srcDir, srcLabel) {
  // name -> { pipelines:Set, sites:[{ site, pipelines }] }. Each site keeps the
  // pipelines of the file it is in, so a finding cites only its own pipeline's files
  // (review 0064 finding R10).
  const reads = new Map();
  const dynamic = [];
  const unpartitioned = new Set();
  const failures = [];

  for (const file of walkTypeScript(srcDir)) {
    const text = readFileOrNull(file);
    if (text === null) continue;
    const rel = path.relative(srcDir, file);
    const segments = rel.split(path.sep);
    // Only a directory maps to a pipeline. A loose top-level file (src/version.ts)
    // has no owning directory, so it is unpartitioned — but that is only worth
    // announcing if it actually reads the environment, which is checked below.
    const pipelines = pipelinesFor(segments);

    const record = (name, index) => {
      if (!reads.has(name))
        reads.set(name, { pipelines: new Set(), sites: [] });
      const entry = reads.get(name);
      for (const pipeline of pipelines) entry.pipelines.add(pipeline);
      if (pipelines.length === 0) unpartitioned.add(rel);
      entry.sites.push({ site: `${rel}:${lineOf(text, index)}`, pipelines });
    };

    // Scan CODE only (review 0064 finding R15). If the file cannot be separated, say so
    // loudly and scan its raw text, so a DETECTED tokenizer failure never loses a read.
    // An undetected misread can still lose one silently — see REGEX_AFTER_PUNCTUATOR.
    const scan = maskNonCode(text);
    if (scan.failure) {
      failures.push(
        `${path.join(srcLabel, rel)}: could not separate code from comments/strings (${scan.failure}) — scanned as raw text instead`,
      );
    }
    const code = scan.masked;

    let match;
    ENV_READ_DOT.lastIndex = 0;
    while ((match = ENV_READ_DOT.exec(code)) !== null)
      record(match[1], match.index);

    const literalBracketAt = new Set();
    if (scan.failure) {
      ENV_READ_BRACKET_LITERAL.lastIndex = 0;
      while ((match = ENV_READ_BRACKET_LITERAL.exec(text)) !== null) {
        literalBracketAt.add(match.index);
        record(match[2], match.index);
      }
    } else {
      // A literal index counts only when a string span starts right after the `[`.
      const spanAt = new Map(scan.spans.map((span) => [span.start, span]));
      ENV_BRACKET_ANY.lastIndex = 0;
      while ((match = ENV_BRACKET_ANY.exec(code)) !== null) {
        const name = literalIndexName(
          code,
          match.index + match[0].length,
          spanAt,
        );
        if (name === null) continue;
        literalBracketAt.add(match.index);
        record(name, match.index);
      }
    }

    // A bracket read whose argument is not a string literal cannot be enumerated.
    ENV_BRACKET_ANY.lastIndex = 0;
    while ((match = ENV_BRACKET_ANY.exec(code)) !== null) {
      if (!literalBracketAt.has(match.index)) {
        dynamic.push(
          `${rel}:${lineOf(text, match.index)} — computed index into the environment object`,
        );
      }
    }

    // Aliasing or destructuring the whole object hides every name behind it.
    ENV_ALIAS.lastIndex = 0;
    while ((match = ENV_ALIAS.exec(code)) !== null) {
      dynamic.push(
        `${rel}:${lineOf(text, match.index)} — the environment object is aliased or destructured`,
      );
    }
  }

  return {
    reads,
    dynamic,
    unpartitioned: [...unpartitioned].sort(),
    failures,
  };
}

// ── Allowlist ─────────────────────────────────────────────────────────────────
// An UNLISTED variable is REQUIRED. That is the brief's step 4 and it is hard.
// A `phase: 2` entry is recorded but INERT: it must never suppress a Phase 1
// finding, or it would mask exactly what this guard is for.
export function loadAllowlist(file) {
  const text = readFileOrNull(file);
  if (text === null) return { entries: [], failure: null, missing: true };
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    return {
      entries: [],
      failure: `allowlist: invalid JSON — ${error.message}`,
    };
  }
  const entries = Array.isArray(parsed) ? parsed : parsed.allow;
  if (!Array.isArray(entries)) {
    return { entries: [], failure: "allowlist: expected an 'allow' array" };
  }
  for (const entry of entries) {
    if (!entry || typeof entry.name !== "string" || entry.name === "") {
      return { entries: [], failure: "allowlist: an entry has no name" };
    }
    if (!PIPELINES.includes(entry.pipeline)) {
      return {
        entries: [],
        failure: `allowlist: ${entry.name} has an unknown pipeline '${entry.pipeline}'`,
      };
    }
    if (!ALLOWLIST_CLASSES.includes(entry.class)) {
      return {
        entries: [],
        failure: `allowlist: ${entry.name} has an unknown class '${entry.class}'`,
      };
    }
    if (typeof entry.reason !== "string" || entry.reason.trim() === "") {
      return {
        entries: [],
        failure: `allowlist: ${entry.name} has an empty reason`,
      };
    }
  }
  return { entries, failure: null };
}

// ── The three parity relations ────────────────────────────────────────────────
function isNamedIn(text, name) {
  return new RegExp(`\\b${name}\\b`).test(text);
}

export function analyse(options) {
  const root = options.repoRoot;
  const resolve = (key) => path.resolve(root, options.inputs[key]);

  const skips = [];
  const parseFailures = [];
  const load = (key) => {
    const file = resolve(key);
    const text = readFileOrNull(file);
    if (text === null) skips.push(`${options.inputs[key]} not found`);
    return text;
  };

  const allowlistFile = resolve("allowlist");
  const allowlist = loadAllowlist(allowlistFile);
  if (allowlist.missing) skips.push(`${options.inputs.allowlist} not found`);
  if (allowlist.failure) parseFailures.push(allowlist.failure);

  const allowedFor = (pipeline, name) =>
    allowlist.entries.find(
      (e) => e.name === name && e.pipeline === pipeline && (e.phase ?? 1) === 1,
    );
  const inertEntries = allowlist.entries.filter((e) => (e.phase ?? 1) !== 1);

  const srcDir = resolve("src-dir");
  let reads = new Map();
  let dynamic = [];
  let unpartitioned = [];
  if (fs.existsSync(srcDir)) {
    let failures;
    ({ reads, dynamic, unpartitioned, failures } = collectEnvReads(
      srcDir,
      options.inputs["src-dir"],
    ));
    parseFailures.push(...failures);
    if (reads.size === 0) {
      parseFailures.push(
        `${options.inputs["src-dir"]}: found 0 environment reads`,
      );
    }
  } else {
    skips.push(`${options.inputs["src-dir"]} not found`);
  }
  for (const file of unpartitioned) {
    dynamic.push(`${file} — reads the environment but maps to no pipeline`);
  }

  const allReadNames = new Set(reads.keys());
  const readsFor = (pipeline) =>
    [...reads.entries()]
      .filter(([, v]) => v.pipelines.has(pipeline))
      .map(([name, v]) => ({
        name,
        sites: v.sites
          .filter((s) => s.pipelines.includes(pipeline))
          .map((s) => s.site),
      }));

  const results = {};
  for (const pipeline of PIPELINES) {
    results[pipeline] = { required: [], info: [], allowed: [], checked: false };
  }

  // ── A. Game ─────────────────────────────────────────────────────────────────
  if (options.pipelines.includes("game")) {
    const deployText = load("deploy-sh");
    const dockerText = load("dockerfile");
    let forwarded = [];
    let supplied = new Set();
    if (deployText !== null) {
      const heredoc = parseHeredocKeys(
        deployText,
        GAME_HEREDOC.anchor,
        GAME_HEREDOC.delimiter,
        options.inputs["deploy-sh"],
      );
      if (heredoc.failure) parseFailures.push(heredoc.failure);
      forwarded = heredoc.keys;
      for (const key of forwarded) supplied.add(key);
    }
    if (dockerText !== null) {
      for (const key of parseDockerEnv(dockerText).keys) supplied.add(key);
    }

    const result = results.game;
    result.checked = deployText !== null;
    for (const { name, sites } of readsFor("game")) {
      if (supplied.has(name)) continue;
      const allowed = allowedFor("game", name);
      if (allowed) result.allowed.push({ name, ...allowed });
      else
        result.required.push({
          name,
          detail: `read but never forwarded (${sites.slice(0, 2).join(", ")})`,
        });
    }

    // Reverse: forwarded with no consumer anywhere. Deploy-side scripts count as
    // consumers — without them ENVIRONMENT / DOCKER_IMAGE are false positives.
    const consumerText = ["update-sh", "dockerfile", "nginx-conf", "startup-sh"]
      .map((key) => readFileOrNull(resolve(key)) ?? "")
      .join("\n");
    for (const name of forwarded) {
      if (allReadNames.has(name)) continue;
      if (isNamedIn(consumerText, name)) continue;
      if (allowedFor("game", name)) continue;
      result.info.push({ name, detail: "forwarded, no consumer found" });
    }
  }

  // ── B. Profile — two hops ───────────────────────────────────────────────────
  if (options.pipelines.includes("profile")) {
    const setupText = load("setup-profile-sh");
    const buildText = load("build-deploy-profile-sh");
    const dockerProfileText = load("dockerfile-profile");
    let hop2 = [];
    let hop1 = [];
    let hop2Body = "";
    const supplied = new Set();
    if (setupText !== null) {
      const heredoc = parseHeredocKeys(
        setupText,
        /cat\s*>\s*"\$PROFILE_DIR\/profile\.env"\s*<<\s*'?EOF'?/,
        "EOF",
        options.inputs["setup-profile-sh"],
      );
      if (heredoc.failure) parseFailures.push(heredoc.failure);
      hop2 = heredoc.keys;
      hop2Body = heredoc.body;
      for (const key of hop2) supplied.add(key);
    }
    if (dockerProfileText !== null) {
      for (const key of parseDockerEnv(dockerProfileText).keys)
        supplied.add(key);
    }
    if (buildText !== null) {
      const exports = parseProfileExports(
        buildText,
        options.inputs["build-deploy-profile-sh"],
      );
      if (exports.failure) parseFailures.push(exports.failure);
      hop1 = exports.keys;
    }

    const result = results.profile;
    result.checked = setupText !== null;

    // B1 — the app's reads must reach the container.
    for (const { name, sites } of readsFor("profile")) {
      if (supplied.has(name)) continue;
      const allowed = allowedFor("profile", name);
      if (allowed) result.allowed.push({ name, ...allowed });
      else
        result.required.push({
          name,
          detail: `read but absent from profile.env (${sites.slice(0, 2).join(", ")})`,
        });
    }

    // B2 — task 0195's shape. A key written at hop 2 but never exported at hop 1
    // is not "maybe empty": the `:-` default guarantees it lands empty.
    if (buildText !== null && setupText !== null) {
      const hop1Set = new Set(hop1);
      for (const name of hop2) {
        if (hop1Set.has(name)) continue;
        if (allowedFor("profile", name)) continue;
        result.required.push({
          name,
          detail:
            "in profile.env but never exported by build-deploy-profile.sh — lands EMPTY",
        });
      }
    }

    // Reverse, profile-scoped. The profile.env heredoc LIVES in setup-profile.sh, so
    // its own body must be excised before that file counts as a consumer — otherwise
    // every key trivially matches itself and the whole reverse check is vacuous.
    const consumerText = [
      (readFileOrNull(resolve("setup-profile-sh")) ?? "").replace(hop2Body, ""),
      readFileOrNull(resolve("dockerfile-profile")) ?? "",
    ].join("\n");
    for (const name of hop2) {
      if (allReadNames.has(name)) continue;
      if (isNamedIn(consumerText, name)) continue;
      if (allowedFor("profile", name)) continue;
      result.info.push({ name, detail: "forwarded, no consumer found" });
    }
  }

  // ── C. Client / build-time ──────────────────────────────────────────────────
  if (options.pipelines.includes("client")) {
    // Covers src/client/** AND src/core/configuration/** reads (see DIR_PIPELINE).
    const webpackText = load("webpack-config");
    const supplied = new Set();
    if (webpackText !== null) {
      const defined = parseDefinePlugin(
        webpackText,
        options.inputs["webpack-config"],
      );
      parseFailures.push(...defined.failures);
      for (const key of defined.keys) supplied.add(key);
    }
    const result = results.client;
    result.checked = webpackText !== null;
    const clientReads = readsFor("client");

    // A `server-only` entry records that the browser never needs the key. Substituting it
    // anyway publishes its value in the browser bundle, so this is a hard finding that
    // the allowlist entry itself cannot suppress (review 0203 finding R2).
    for (const name of supplied) {
      if (allowedFor("client", name)?.class !== "server-only") continue;
      const sites = clientReads.find((r) => r.name === name)?.sites ?? [];
      result.required.push({
        name,
        detail: `server-only key substituted into the browser bundle by DefinePlugin — remove the substitution; its allowlist entry says the browser never needs it${sites.length > 0 ? ` (${sites.slice(0, 2).join(", ")})` : ""}`,
      });
    }

    for (const { name, sites } of clientReads) {
      if (supplied.has(name)) continue;
      const allowed = allowedFor("client", name);
      if (allowed) result.allowed.push({ name, ...allowed });
      else {
        // A core/configuration read may be one the browser bundles but never calls. Say
        // how to resolve that before someone "fixes" it by publishing a secret.
        const guardrail = sites.some((site) =>
          site.startsWith(`core${path.sep}configuration${path.sep}`),
        )
          ? " — if the browser never needs it, allowlist it; never substitute a server secret into the browser bundle"
          : "";
        result.required.push({
          name,
          detail: `read in the browser bundle but not substituted by DefinePlugin (${sites.slice(0, 2).join(", ")})${guardrail}`,
        });
      }
    }

    // Reverse: a DefinePlugin substitution that nothing reads is dead build-time config
    // — the client-side twin of the game reverse check. Until this existed, render()
    // printed `INFO 0` for the client with no check behind it (review 0064 finding R2).
    //
    // Consumers are reads ANYWHERE under src/, not just src/client/**: DefinePlugin
    // substitutes textually into whatever webpack bundles, and the browser bundle pulls
    // in src/core/**. Scoping this to client-only reads would call GAME_ENV and
    // GIT_COMMIT dead, which they are not. Under-reporting is the right way for a guard
    // to be wrong; a false "this is dead" costs the reader's trust in every other line.
    for (const name of supplied) {
      if (allReadNames.has(name)) continue;
      if (allowedFor("client", name)) continue;
      result.info.push({
        name,
        detail: "substituted by DefinePlugin, no reader found",
      });
    }
  }

  const requiredTotal = PIPELINES.reduce(
    (n, p) => n + results[p].required.length,
    0,
  );

  return {
    pipelines: results,
    parseFailures,
    dynamicReads: dynamic,
    skips,
    inertAllowlist: inertEntries.map((e) => ({
      name: e.name,
      pipeline: e.pipeline,
      phase: e.phase,
    })),
    requiredTotal,
    mode: options.enforce ? "enforce" : "report-only",
  };
}

// ── Reporting ─────────────────────────────────────────────────────────────────
/**
 * Whether --enforce fails this run. The ONE definition, used by both the exit code and the
 * printed footer, so the output can never tell the reader the opposite of what the process
 * did (review 0064 finding R16).
 */
function failsClosed(result) {
  return (
    result.requiredTotal > 0 ||
    result.parseFailures.length > 0 ||
    result.dynamicReads.length > 0 ||
    result.skips.length > 0
  );
}

function wrap(names, indent) {
  const lines = [];
  let current = "";
  for (const name of names) {
    const candidate = current === "" ? name : `${current}, ${name}`;
    if (candidate.length > 62 && current !== "") {
      lines.push(current + ",");
      current = name;
    } else current = candidate;
  }
  if (current !== "") lines.push(current);
  return lines.map((l, i) => (i === 0 ? l : " ".repeat(indent) + l)).join("\n");
}

function render(result, selected) {
  const out = [];
  const mode = result.mode;
  out.push(
    `── config parity guard (${mode}) ${"─".repeat(Math.max(0, 40 - mode.length))}`,
  );

  for (const skip of result.skips) out.push(`SKIP  ${skip}`);
  for (const failure of result.parseFailures)
    out.push(`PARSE-FAILURE  ${failure}`);
  for (const blindSpot of result.dynamicReads)
    out.push(`DYNAMIC-READ  ${blindSpot} — cannot enumerate`);

  for (const pipeline of selected) {
    const data = result.pipelines[pipeline];
    out.push(`pipeline: ${pipeline}`);
    out.push(`REQUIRED  ${data.required.length}`);
    for (const finding of data.required)
      out.push(`          ${finding.name} — ${finding.detail}`);
    if (data.info.length > 0) {
      // The label comes from the findings themselves: the game and profile pipelines
      // report "forwarded, no consumer found", the client "substituted by DefinePlugin,
      // no reader found". A pipeline emits one detail today; joining the distinct set
      // keeps the line honest if that ever stops being true.
      const label = [...new Set(data.info.map((f) => f.detail))].join("; ");
      out.push(
        `INFO      ${data.info.length}  ${label}: ${wrap(
          data.info.map((f) => f.name),
          13,
        )}`,
      );
    } else {
      out.push("INFO      0");
    }
    out.push(
      `ALLOWED   ${data.allowed.length}  (see scripts/config-parity-allowlist.json)`,
    );
  }

  if (result.inertAllowlist.length > 0) {
    out.push(
      `INERT     ${result.inertAllowlist.length}  allowlist entries recorded for phase 2, not applied: ${result.inertAllowlist
        .map((e) => e.name)
        .join(", ")}`,
    );
  }

  if (mode === "report-only") {
    out.push("report-only — exit 0, this cannot fail a deploy");
  } else if (failsClosed(result)) {
    out.push("enforce — failing on the findings above");
  } else {
    out.push("enforce — no required findings");
  }
  return out.join("\n");
}

// ── Entry point ───────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const inputs = { ...INPUT_DEFAULTS };
  let repoRoot = DEFAULT_REPO_ROOT;
  let pipelines = PIPELINES;
  let enforce = false;
  let json = false;

  for (const arg of argv) {
    if (arg === "--report-only") enforce = false;
    else if (arg === "--enforce") enforce = true;
    else if (arg === "--json") json = true;
    else if (arg.startsWith("--repo-root=")) repoRoot = arg.slice(12);
    else if (arg.startsWith("--pipeline=")) {
      const value = arg.slice(11);
      if (value === "all") pipelines = PIPELINES;
      else {
        pipelines = value.split(",");
        for (const p of pipelines) {
          if (!PIPELINES.includes(p)) {
            throw new Error(`unknown pipeline '${p}'`);
          }
        }
      }
    } else {
      const match = /^--([a-z-]+)=(.*)$/.exec(arg);
      if (match && Object.prototype.hasOwnProperty.call(inputs, match[1])) {
        inputs[match[1]] = match[2];
      } else {
        throw new Error(`unknown argument '${arg}'`);
      }
    }
  }
  return { inputs, repoRoot: path.resolve(repoRoot), pipelines, enforce, json };
}

function main(argv) {
  let options;
  try {
    options = parseArgs(argv);
  } catch (error) {
    process.stdout.write(
      `config-parity guard: ${error.message}\nusage: check-config-parity.mjs [--pipeline=game|profile|client|all] [--report-only|--enforce] [--json] [--repo-root=PATH]\n`,
    );
    return 2;
  }

  let result;
  try {
    result = analyse(options);
  } catch (error) {
    // A crash must never fail a deploy. Under --enforce we fail closed instead.
    process.stdout.write(
      `config-parity guard errored (${options.enforce ? "enforce" : "report-only"}): ${error.message}\n`,
    );
    return options.enforce ? 1 : 0;
  }

  if (options.json) {
    process.stdout.write(JSON.stringify(result, null, 2) + "\n");
  } else {
    process.stdout.write(render(result, options.pipelines) + "\n");
  }

  if (!options.enforce) return 0;
  return failsClosed(result) ? 1 : 0;
}

// Library mode (task 0064 Phase 2): check-config-values.mjs sets this flag and then
// imports this file for the exports above, so main() must not run. The seam fails LOUD:
// if the flag is ever lost, main() runs and prints a whole parity report into the value
// checker's output — visible, never silent.
if (!globalThis.CONFIG_PARITY_AS_LIBRARY)
  process.exitCode = main(process.argv.slice(2));
