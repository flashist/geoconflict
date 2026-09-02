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
//   client   src/client/**                →  webpack DefinePlugin
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
const INPUT_DEFAULTS = {
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
];

// Directory → pipeline partition. Verified exhaustive against the tree: the only
// top-level directories under src/ that contain an env read are these four.
// A jest drift test asserts src/profile-server/** never imports src/core/configuration/**,
// so "core counts as game" cannot rot silently.
//
// ⚠️⚠️ KNOWN, OWNER-ACKNOWLEDGED GAP — READ THIS BEFORE TRUSTING A GREEN CLIENT LINE.
// This map sends src/core/** to the GAME pipeline ONLY. But src/core/configuration/**
// is bundled into the BROWSER too (13 files under src/client/** import it), so a core
// env read that the browser genuinely needs is checked against the deploy heredoc and
// NEVER against DefinePlugin. Reproduced during review: deleting the
// STRIPE_PUBLISHABLE_KEY DefinePlugin entry — read at src/core/configuration/
// DefaultConfig.ts and reachable from src/client/Main.ts — still prints REQUIRED 0 and
// exits 0 under --enforce. A broken client supply channel can therefore print green.
//
// This is FINDING R1 of the 0064 review, severity HIGH. It is deliberately NOT fixed in
// this pass: the owner ruled (disposition D1, 2026-09-02) that report-only ships first
// and R1 is fixed BEFORE the guard is ever armed. It misleads only someone who trusts a
// green client line, and nobody should until then.
//
// THE AGREED FIX, for whoever does the pre-arming pass (disposition D2): classify every
// src/core/configuration/** read against BOTH channels — the deploy heredoc AND
// DefinePlugin — because the browser genuinely reads them. Do not re-decide this.
const DIR_PIPELINE = {
  client: "client",
  core: "game",
  server: "game",
  "profile-server": "profile",
};

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
const DEFINE_PLUGIN_KEY = /"process\.env\.([A-Za-z_]\w*)"\s*:/g;
const DOCKER_ENV = /^ENV\s+([A-Z_][A-Z0-9_]*)=/;
const PROFILE_EXPORT = /^\s*printf\s+"export\s+([A-Z_][A-Z0-9_]*)=/;
// Anchored at column 0 ON PURPOSE — a heredoc assignment only forwards a key when it
// starts the line. An INDENTED assignment is caught separately and reported as a hard
// PARSE-FAILURE (see parseHeredocKeys); it must never be silently dropped.
const HEREDOC_ASSIGN = /^([A-Z_][A-Z0-9_]*)=/;
const HEREDOC_ASSIGN_INDENTED = /^[ \t]+([A-Z_][A-Z0-9_]*)=/;

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

// ── Parsers — every one of them fails LOUD ────────────────────────────────────
// A parser that quietly returns an empty set is the worst outcome available here:
// forward, it would report every variable as missing; in reverse, it would report
// nothing at all and print a green check. So an unfound anchor or an empty block is
// a hard PARSE-FAILURE, never an empty set silently compared.

/** Keys assigned inside a heredoc, located by its opening line and its delimiter. */
function parseHeredocKeys(text, openPattern, delimiter, label) {
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
  const indented = [];
  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i].trim() === delimiter) {
      const body = lines.slice(start, i + 1).join("\n");
      // An indented assignment is NOT a key this parser can honour, and dropping it
      // silently is the worst outcome available: on the profile.env heredoc it shrinks
      // hop 2 and therefore SILENCES a B2 finding — a false negative in task 0195's
      // exact shape, in the very bug this guard was built to catch. So it fails loud.
      // (Review 0064 finding R9.)
      if (indented.length > 0) {
        return {
          keys: [],
          failure: `${label}: heredoc line ${indented[0].line} indents '${indented[0].name}=' — an assignment must start at column 0 to be read as a forwarded key`,
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
    else {
      const indentedMatch = HEREDOC_ASSIGN_INDENTED.exec(lines[i]);
      if (indentedMatch) indented.push({ name: indentedMatch[1], line: i + 1 });
    }
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

/** Build-time substitution keys from webpack's DefinePlugin. */
function parseDefinePlugin(text, label) {
  const keys = [];
  let match;
  DEFINE_PLUGIN_KEY.lastIndex = 0;
  while ((match = DEFINE_PLUGIN_KEY.exec(text)) !== null) keys.push(match[1]);
  if (keys.length === 0) {
    return {
      keys,
      failure: `${label}: found 0 DefinePlugin substitution keys`,
    };
  }
  return { keys, failure: null };
}

/**
 * Every environment name the application reads, partitioned by pipeline, plus any
 * read the scanner CANNOT enumerate. Announcing its own blind spots is mandatory:
 * a guard that silently cannot see something is the exact failure mode this task
 * exists to prevent.
 */
function collectEnvReads(srcDir) {
  const reads = new Map(); // name -> { pipelines:Set, sites:[] }
  const dynamic = [];
  const unpartitioned = new Set();

  for (const file of walkTypeScript(srcDir)) {
    const text = readFileOrNull(file);
    if (text === null) continue;
    const rel = path.relative(srcDir, file);
    const segments = rel.split(path.sep);
    // Only a directory maps to a pipeline. A loose top-level file (src/version.ts)
    // has no owning directory, so it is unpartitioned — but that is only worth
    // announcing if it actually reads the environment, which is checked below.
    const pipeline =
      segments.length > 1 ? DIR_PIPELINE[segments[0]] : undefined;

    const record = (name, index) => {
      if (!reads.has(name))
        reads.set(name, { pipelines: new Set(), sites: [] });
      const entry = reads.get(name);
      if (pipeline) entry.pipelines.add(pipeline);
      else unpartitioned.add(rel);
      entry.sites.push(`${rel}:${lineOf(text, index)}`);
    };

    let match;
    ENV_READ_DOT.lastIndex = 0;
    while ((match = ENV_READ_DOT.exec(text)) !== null)
      record(match[1], match.index);

    const literalBracketAt = new Set();
    ENV_READ_BRACKET_LITERAL.lastIndex = 0;
    while ((match = ENV_READ_BRACKET_LITERAL.exec(text)) !== null) {
      literalBracketAt.add(match.index);
      record(match[2], match.index);
    }

    // A bracket read whose argument is not a string literal cannot be enumerated.
    ENV_BRACKET_ANY.lastIndex = 0;
    while ((match = ENV_BRACKET_ANY.exec(text)) !== null) {
      if (!literalBracketAt.has(match.index)) {
        dynamic.push(
          `${rel}:${lineOf(text, match.index)} — computed index into the environment object`,
        );
      }
    }

    // Aliasing or destructuring the whole object hides every name behind it.
    ENV_ALIAS.lastIndex = 0;
    while ((match = ENV_ALIAS.exec(text)) !== null) {
      dynamic.push(
        `${rel}:${lineOf(text, match.index)} — the environment object is aliased or destructured`,
      );
    }
  }

  return { reads, dynamic, unpartitioned: [...unpartitioned].sort() };
}

// ── Allowlist ─────────────────────────────────────────────────────────────────
// An UNLISTED variable is REQUIRED. That is the brief's step 4 and it is hard.
// A `phase: 2` entry is recorded but INERT: it must never suppress a Phase 1
// finding, or it would mask exactly what this guard is for.
function loadAllowlist(file) {
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

function analyse(options) {
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
    ({ reads, dynamic, unpartitioned } = collectEnvReads(srcDir));
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
      .map(([name, v]) => ({ name, sites: v.sites }));

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
        /^\s*cat\s*>.*<<\s*'?EOL'?\s*$/,
        "EOL",
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
    // ⚠️ This pipeline's forward check is INCOMPLETE by owner ruling — see the R1 gap
    // notice on DIR_PIPELINE above. A green REQUIRED line here does NOT mean the
    // browser's supply channel is sound, because src/core/configuration/** reads that
    // the browser needs are classified game-only and never reach this check.
    const webpackText = load("webpack-config");
    const supplied = new Set();
    if (webpackText !== null) {
      const defined = parseDefinePlugin(
        webpackText,
        options.inputs["webpack-config"],
      );
      if (defined.failure) parseFailures.push(defined.failure);
      for (const key of defined.keys) supplied.add(key);
    }
    const result = results.client;
    result.checked = webpackText !== null;
    for (const { name, sites } of readsFor("client")) {
      if (supplied.has(name)) continue;
      const allowed = allowedFor("client", name);
      if (allowed) result.allowed.push({ name, ...allowed });
      else
        result.required.push({
          name,
          detail: `read in the browser bundle but not substituted by DefinePlugin (${sites.slice(0, 2).join(", ")})`,
        });
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
// The R1 gap recorded on DIR_PIPELINE above is invisible to a deploy operator, who
// sees only this rendered report. Since both call sites moved to --pipeline=all
// (review 0064 finding R3), every deploy prints an unqualified `client REQUIRED 0`
// for a forward check R1 proves incomplete. The owner ruled on 2026-09-02 (finding
// R14) that the caveat must be PRINTED, not left in a source comment and a ledger.
// DELETE THIS LINE WHEN R1 IS FIXED — a stale caveat is its own kind of false claim.
const CLIENT_FORWARD_CAVEAT =
  "the REQUIRED check above is INCOMPLETE — src/core/configuration/** reads are not checked against DefinePlugin";

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
    // Client only, on purpose: the game and profile sections are byte-pinned.
    if (pipeline === "client") out.push(`CAVEAT    ${CLIENT_FORWARD_CAVEAT}`);
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
  } else if (result.requiredTotal > 0 || result.parseFailures.length > 0) {
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
  const failClosed =
    result.requiredTotal > 0 ||
    result.parseFailures.length > 0 ||
    result.dynamicReads.length > 0 ||
    result.skips.length > 0;
  return failClosed ? 1 : 0;
}

process.exitCode = main(process.argv.slice(2));
