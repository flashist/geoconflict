/**
 * Tests for scripts/check-config-parity.mjs — the deploy-time config parity guard (task 0064).
 *
 * Two kinds of test live here and they are deliberately different:
 *
 *   SYNTHETIC FIXTURES build a tiny fake repo root and seed a specific defect. They are
 *   fast, deterministic, and they do not go red every time someone adds a real variable.
 *   These discharge the brief's verification steps 1 (parity half), 5 and 6.
 *
 *   REAL-TREE tests run the checker against this repository. They discharge verification
 *   step 4 and the owner's ruling R4 baseline gate: an unforwarded setting fails a TEST
 *   RUN at a developer's keyboard rather than reaching production.
 *
 * The no-leak tests (canary + static) are the ones that matter most: the guard's entire
 * safety story is that it prints variable NAMES and never VALUES.
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const CHECKER = path.join(REPO_ROOT, "scripts", "check-config-parity.mjs");
const REAL_ALLOWLIST = path.join(
  REPO_ROOT,
  "scripts",
  "config-parity-allowlist.json",
);

type Finding = { name: string; detail: string };
type PipelineResult = {
  required: Finding[];
  info: Finding[];
  allowed: { name: string }[];
  checked: boolean;
};
type CheckerResult = {
  pipelines: Record<"game" | "profile" | "client", PipelineResult>;
  parseFailures: string[];
  dynamicReads: string[];
  skips: string[];
  inertAllowlist: { name: string; phase: number }[];
  requiredTotal: number;
  mode: string;
};

function run(
  args: string[],
  env?: NodeJS.ProcessEnv,
): { status: number; stdout: string; stderr: string } {
  const result = spawnSync(process.execPath, [CHECKER, ...args], {
    encoding: "utf8",
    env: env ?? process.env,
  });
  return {
    status: result.status ?? -1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

function runJson(args: string[]): CheckerResult {
  const result = run([...args, "--json"]);
  expect(result.status).toBe(0);
  return JSON.parse(result.stdout) as CheckerResult;
}

function names(findings: { name: string }[]): string[] {
  return findings.map((f) => f.name).sort();
}

// ── Synthetic fixture repo ────────────────────────────────────────────────────

const CLEAN_ALLOWLIST = {
  allow: [
    {
      name: "GAME_RUNTIME",
      pipeline: "game",
      class: "runtime-supplied",
      phase: 1,
      reason: "Fixture: supplied by the runtime, never a deploy input.",
    },
  ],
};

/**
 * Writes a small but structurally faithful fake repo and returns its root.
 * Clean by construction: every read is supplied, one forwarded key is dead.
 */
function makeFixture(overrides: Record<string, string | null> = {}): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "config-parity-"));
  const files: Record<string, string | null> = {
    // process.env is written via a helper so this file's own text stays unambiguous
    // for the static no-leak test that scans the CHECKER (not this file).
    "src/server/Server.ts": [
      "const token = process.env.GAME_TOKEN;",
      "const runtime = process.env.GAME_RUNTIME;",
      "export { token, runtime };",
    ].join("\n"),
    "src/core/Config.ts": [
      "const host = process.env.GAME_HOST;",
      "const build = process.env.GAME_BUILD;",
      "export { host, build };",
    ].join("\n"),
    "src/profile-server/Api.ts": [
      "const db = process.env.PROFILE_DB_URL;",
      "const secret = process.env.PROFILE_SECRET;",
      "export { db, secret };",
    ].join("\n"),
    "src/client/App.ts": [
      "const mode = process.env.CLIENT_MODE;",
      "export { mode };",
    ].join("\n"),

    "deploy.sh": [
      "#!/bin/bash",
      "set -e",
      "cat > ${ENV_FILE} << 'EOL'",
      "GAME_TOKEN=${GAME_TOKEN}",
      "GAME_HOST=${GAME_HOST}",
      "ENVIRONMENT=${ENV}",
      "DEAD_ONE=${DEAD_ONE}",
      "EOL",
      "echo done",
    ].join("\n"),
    // ENVIRONMENT is consumed here, so the reverse check must NOT call it dead.
    "update.sh": 'echo "running in $ENVIRONMENT"',
    "nginx.conf": "server { listen 80; }",
    "startup.sh": "#!/bin/bash\nexec node server.js",
    Dockerfile: 'FROM node:24-slim\nENV GAME_BUILD="$GAME_BUILD"',
    "Dockerfile.profile": "FROM node:24-slim\nENV HUSKY=0",

    "setup-profile.sh": [
      "#!/bin/bash",
      '( umask 077; cat > "$PROFILE_DIR/profile.env" << EOF',
      "PROFILE_DB_URL=${PROFILE_DB_URL}",
      "PROFILE_SECRET=${PROFILE_SECRET}",
      "PROFILE_TUNING=${PROFILE_TUNING}",
      "EOF",
      ")",
      "# PROFILE_TUNING is consumed right here, outside the heredoc.",
      'echo "tuning: $PROFILE_TUNING"',
    ].join("\n"),
    "build-deploy-profile.sh": [
      "#!/bin/bash",
      "{",
      '    printf "export PROFILE_DB_URL=%q\\n" "${PROFILE_DB_URL:-}"',
      '    printf "export PROFILE_SECRET=%q\\n" "${PROFILE_SECRET:-}"',
      '    printf "export PROFILE_TUNING=%q\\n" "${PROFILE_TUNING:-}"',
      '} > "$LOCAL_TMPENV"',
    ].join("\n"),

    "webpack.config.js": [
      "new webpack.DefinePlugin({",
      '  "process.env.CLIENT_MODE": JSON.stringify("dev"),',
      "});",
    ].join("\n"),

    "scripts/config-parity-allowlist.json": JSON.stringify(
      CLEAN_ALLOWLIST,
      null,
      2,
    ),
    ...overrides,
  };

  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(root, rel);
    if (content === null) continue; // an explicit null omits the file entirely
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content + "\n");
  }
  return root;
}

const fixtures: string[] = [];
function fixture(overrides: Record<string, string | null> = {}): string {
  const root = makeFixture(overrides);
  fixtures.push(root);
  return root;
}

afterAll(() => {
  for (const root of fixtures)
    fs.rmSync(root, { recursive: true, force: true });
});

// ── The clean baseline ────────────────────────────────────────────────────────

describe("synthetic fixture — clean configuration", () => {
  it("reports zero required findings on every pipeline (verification step 4)", () => {
    const root = fixture();
    const result = runJson([`--repo-root=${root}`, "--pipeline=all"]);
    expect(result.requiredTotal).toBe(0);
    expect(result.parseFailures).toEqual([]);
    expect(result.dynamicReads).toEqual([]);
    expect(result.skips).toEqual([]);
  });

  it("names the genuinely dead forwarded key, and only that one", () => {
    const root = fixture();
    const result = runJson([`--repo-root=${root}`, "--pipeline=game"]);
    // DEAD_ONE has no reader and no deploy-side consumer.
    // ENVIRONMENT is read by nothing either, but update.sh consumes it — so treating
    // it as dead would be a false positive, which is what this assertion pins.
    expect(names(result.pipelines.game.info)).toEqual(["DEAD_ONE"]);
  });

  it("reports a DefinePlugin key that nothing reads, and only that one", () => {
    // The client reverse (dead-config) check. Until it existed, render() printed
    // `INFO 0` for the client unconditionally, with no check behind the line, and the
    // test that pinned it could not fail (review 0064 finding R2 / owner disposition D3).
    const root = fixture({
      "webpack.config.js": [
        "new webpack.DefinePlugin({",
        '  "process.env.CLIENT_MODE": JSON.stringify("dev"),',
        '  "process.env.CLIENT_ORPHAN": JSON.stringify("nobody-reads-me"),',
        "});",
      ].join("\n"),
    });
    const result = runJson([`--repo-root=${root}`, "--pipeline=client"]);
    // CLIENT_MODE is read by src/client/App.ts, so calling it dead would be a false
    // positive — that is the half of this assertion that constrains the check.
    expect(names(result.pipelines.client.info)).toEqual(["CLIENT_ORPHAN"]);
    expect(result.pipelines.client.info[0].detail).toContain(
      "substituted by DefinePlugin, no reader found",
    );
  });

  it("counts a read anywhere under src/ as a DefinePlugin consumer, not just src/client", () => {
    // DefinePlugin substitutes textually into whatever webpack bundles, and the browser
    // bundle pulls in src/core/**. GAME_HOST is read by the fixture's src/core/Config.ts,
    // so scoping the reverse check to src/client/** alone would call it dead.
    const root = fixture({
      "webpack.config.js": [
        "new webpack.DefinePlugin({",
        '  "process.env.CLIENT_MODE": JSON.stringify("dev"),',
        '  "process.env.GAME_HOST": JSON.stringify("host"),',
        "});",
      ].join("\n"),
    });
    const result = runJson([`--repo-root=${root}`, "--pipeline=client"]);
    expect(names(result.pipelines.client.info)).toEqual([]);
  });

  it("does not let a profile.env key count as its own consumer", () => {
    // PROFILE_TUNING is written in the heredoc AND used outside it. Remove the outside
    // use and it must become dead — proving the reverse check is not vacuous.
    const root = fixture({
      "setup-profile.sh": [
        "#!/bin/bash",
        '( umask 077; cat > "$PROFILE_DIR/profile.env" << EOF',
        "PROFILE_DB_URL=${PROFILE_DB_URL}",
        "PROFILE_SECRET=${PROFILE_SECRET}",
        "PROFILE_TUNING=${PROFILE_TUNING}",
        "EOF",
        ")",
      ].join("\n"),
    });
    const result = runJson([`--repo-root=${root}`, "--pipeline=profile"]);
    expect(names(result.pipelines.profile.info)).toEqual(["PROFILE_TUNING"]);
  });
});

// ── Verification step 1 (parity half) — task 0062's shape ─────────────────────

describe("catches task 0062's shape — a read that is never forwarded", () => {
  it("names the variable dropped from the deploy heredoc", () => {
    const root = fixture({
      "deploy.sh": [
        "#!/bin/bash",
        "cat > ${ENV_FILE} << 'EOL'",
        "GAME_HOST=${GAME_HOST}",
        "ENVIRONMENT=${ENV}",
        "DEAD_ONE=${DEAD_ONE}",
        "EOL",
      ].join("\n"),
    });
    const result = runJson([`--repo-root=${root}`, "--pipeline=game"]);
    expect(names(result.pipelines.game.required)).toEqual(["GAME_TOKEN"]);
    expect(result.pipelines.game.required[0].detail).toContain(
      "read but never forwarded",
    );
  });
});

// ── Task 0195's shape — the two-hop profile gap ───────────────────────────────

describe("catches task 0195's shape — hop 2 has the key, hop 1 never exports it", () => {
  it("flags a profile.env key missing from the build-deploy export block", () => {
    const root = fixture({
      "build-deploy-profile.sh": [
        "#!/bin/bash",
        "{",
        '    printf "export PROFILE_DB_URL=%q\\n" "${PROFILE_DB_URL:-}"',
        '    printf "export PROFILE_TUNING=%q\\n" "${PROFILE_TUNING:-}"',
        '} > "$LOCAL_TMPENV"',
      ].join("\n"),
    });
    const result = runJson([`--repo-root=${root}`, "--pipeline=profile"]);
    expect(names(result.pipelines.profile.required)).toEqual([
      "PROFILE_SECRET",
    ]);
    expect(result.pipelines.profile.required[0].detail).toContain(
      "lands EMPTY",
    );
  });

  it("still catches a profile-server read absent from profile.env entirely", () => {
    const root = fixture({
      "setup-profile.sh": [
        "#!/bin/bash",
        '( umask 077; cat > "$PROFILE_DIR/profile.env" << EOF',
        "PROFILE_DB_URL=${PROFILE_DB_URL}",
        "EOF",
        ")",
      ].join("\n"),
    });
    const result = runJson([`--repo-root=${root}`, "--pipeline=profile"]);
    expect(names(result.pipelines.profile.required)).toContain(
      "PROFILE_SECRET",
    );
  });
});

// ── Verification step 5 — allowlist semantics ─────────────────────────────────

describe("allowlist semantics (verification step 5)", () => {
  it("an allowlisted variable does not fire", () => {
    const root = fixture();
    const result = runJson([`--repo-root=${root}`, "--pipeline=game"]);
    expect(names(result.pipelines.game.allowed)).toEqual(["GAME_RUNTIME"]);
    expect(names(result.pipelines.game.required)).toEqual([]);
  });

  it("an UNLISTED variable does fire — this is the default", () => {
    const root = fixture({
      "scripts/config-parity-allowlist.json": JSON.stringify({ allow: [] }),
    });
    const result = runJson([`--repo-root=${root}`, "--pipeline=game"]);
    expect(names(result.pipelines.game.required)).toEqual(["GAME_RUNTIME"]);
  });

  it("an allowlist entry only applies to its own pipeline", () => {
    const root = fixture({
      "scripts/config-parity-allowlist.json": JSON.stringify({
        allow: [
          {
            name: "GAME_RUNTIME",
            pipeline: "profile",
            class: "runtime-supplied",
            phase: 1,
            reason: "Fixture: right name, wrong pipeline.",
          },
        ],
      }),
    });
    const result = runJson([`--repo-root=${root}`, "--pipeline=game"]);
    expect(names(result.pipelines.game.required)).toEqual(["GAME_RUNTIME"]);
  });

  it("a phase-2 entry is INERT and must not suppress a Phase 1 finding", () => {
    const root = fixture({
      "scripts/config-parity-allowlist.json": JSON.stringify({
        allow: [
          {
            name: "GAME_RUNTIME",
            pipeline: "game",
            class: "optional",
            phase: 2,
            reason:
              "Fixture: recorded for phase 2, must not mask anything today.",
          },
        ],
      }),
    });
    const result = runJson([`--repo-root=${root}`, "--pipeline=game"]);
    expect(names(result.pipelines.game.required)).toEqual(["GAME_RUNTIME"]);
    expect(names(result.inertAllowlist)).toEqual(["GAME_RUNTIME"]);
  });

  it("rejects an allowlist entry with an empty reason", () => {
    const root = fixture({
      "scripts/config-parity-allowlist.json": JSON.stringify({
        allow: [
          {
            name: "GAME_RUNTIME",
            pipeline: "game",
            class: "optional",
            phase: 1,
            reason: "   ",
          },
        ],
      }),
    });
    const result = runJson([`--repo-root=${root}`, "--pipeline=game"]);
    expect(result.parseFailures.join("\n")).toContain("empty reason");
  });

  it("rejects an unknown class and an unknown pipeline", () => {
    for (const [field, value] of [
      ["class", "made-up"],
      ["pipeline", "made-up"],
    ] as const) {
      const entry = {
        name: "GAME_RUNTIME",
        pipeline: "game",
        class: "optional",
        phase: 1,
        reason: "Fixture.",
        [field]: value,
      };
      const root = fixture({
        "scripts/config-parity-allowlist.json": JSON.stringify({
          allow: [entry],
        }),
      });
      const result = runJson([`--repo-root=${root}`, "--pipeline=game"]);
      expect(result.parseFailures.join("\n")).toContain(`unknown ${field}`);
    }
  });
});

// ── Verification step 6 — the exit contract ───────────────────────────────────

describe("exit contract (verification step 6)", () => {
  const seeded = () =>
    fixture({
      "scripts/config-parity-allowlist.json": JSON.stringify({ allow: [] }),
    });

  it("report-only names the gap and still exits 0 — it cannot fail a deploy", () => {
    const result = run([
      `--repo-root=${seeded()}`,
      "--pipeline=game",
      "--report-only",
    ]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("GAME_RUNTIME");
    expect(result.stdout).toContain(
      "report-only — exit 0, this cannot fail a deploy",
    );
  });

  it("--enforce exits non-zero on the same gap", () => {
    const result = run([
      `--repo-root=${seeded()}`,
      "--pipeline=game",
      "--enforce",
    ]);
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("GAME_RUNTIME");
  });

  it("--enforce exits 0 on a clean fixture", () => {
    const result = run([
      `--repo-root=${fixture()}`,
      "--pipeline=all",
      "--enforce",
    ]);
    expect(result.status).toBe(0);
  });

  it("report-only exits 0 even when every parser fails", () => {
    const result = run([
      `--repo-root=${fixture({ "deploy.sh": "#!/bin/bash\necho nothing here" })}`,
      "--pipeline=game",
      "--report-only",
    ]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("PARSE-FAILURE");
  });

  it("an unknown argument exits 2 with a usage line rather than crashing", () => {
    const result = run(["--not-a-real-flag"]);
    expect(result.status).toBe(2);
    expect(result.stdout).toContain("usage:");
  });
});

// ── Fail-loud parsing ─────────────────────────────────────────────────────────

describe("parsers fail loud rather than comparing an empty set", () => {
  it("PARSE-FAILURE when the deploy heredoc anchor is gone", () => {
    const root = fixture({ "deploy.sh": "#!/bin/bash\necho no heredoc here" });
    const result = runJson([`--repo-root=${root}`, "--pipeline=game"]);
    expect(result.parseFailures.join("\n")).toContain(
      "heredoc anchor not found",
    );
  });

  it("PARSE-FAILURE when the heredoc body has no assignments", () => {
    const root = fixture({
      "deploy.sh": ["#!/bin/bash", "cat > ${ENV_FILE} << 'EOL'", "EOL"].join(
        "\n",
      ),
    });
    const result = runJson([`--repo-root=${root}`, "--pipeline=game"]);
    expect(result.parseFailures.join("\n")).toContain("yielded 0 keys");
  });

  it("PARSE-FAILURE when the heredoc is never closed", () => {
    const root = fixture({
      "deploy.sh": ["#!/bin/bash", "cat > ${ENV_FILE} << 'EOL'", "A=1"].join(
        "\n",
      ),
    });
    const result = runJson([`--repo-root=${root}`, "--pipeline=game"]);
    expect(result.parseFailures.join("\n")).toContain("never closed it");
  });

  it("PARSE-FAILURE when a deploy heredoc key is indented", () => {
    // An indented assignment does not forward a key, and dropping it silently is the
    // worst outcome available (review 0064 finding R9).
    const root = fixture({
      "deploy.sh": [
        "#!/bin/bash",
        "cat > ${ENV_FILE} << 'EOL'",
        "GAME_TOKEN=${GAME_TOKEN}",
        "    GAME_HOST=${GAME_HOST}",
        "EOL",
      ].join("\n"),
    });
    const result = runJson([`--repo-root=${root}`, "--pipeline=game"]);
    expect(result.parseFailures.join("\n")).toContain("indents 'GAME_HOST='");
  });

  it("an indented profile.env key fails loud instead of silencing a hop-1 finding", () => {
    // This is the shape that matters most. Indenting PROFILE_SECRET shrinks hop 2, so a
    // silent drop would SUPPRESS the B2 'lands EMPTY' finding for it — a false negative
    // in task 0195's exact shape, inside the guard built to catch task 0195.
    const root = fixture({
      "setup-profile.sh": [
        "#!/bin/bash",
        '( umask 077; cat > "$PROFILE_DIR/profile.env" << EOF',
        "PROFILE_DB_URL=${PROFILE_DB_URL}",
        "  PROFILE_SECRET=${PROFILE_SECRET}",
        "EOF",
        ")",
      ].join("\n"),
      "build-deploy-profile.sh": [
        "#!/bin/bash",
        "{",
        '    printf "export PROFILE_DB_URL=%q\\n" "${PROFILE_DB_URL:-}"',
        '} > "$LOCAL_TMPENV"',
      ].join("\n"),
    });
    const result = runJson([`--repo-root=${root}`, "--pipeline=profile"]);
    expect(result.parseFailures.join("\n")).toContain(
      "indents 'PROFILE_SECRET='",
    );
  });

  it("PARSE-FAILURE when the profile export block yields nothing", () => {
    const root = fixture({ "build-deploy-profile.sh": "#!/bin/bash\necho hi" });
    const result = runJson([`--repo-root=${root}`, "--pipeline=profile"]);
    expect(result.parseFailures.join("\n")).toContain("printf");
  });

  it("PARSE-FAILURE when DefinePlugin yields no keys", () => {
    const root = fixture({ "webpack.config.js": "module.exports = {};" });
    const result = runJson([`--repo-root=${root}`, "--pipeline=client"]);
    expect(result.parseFailures.join("\n")).toContain("DefinePlugin");
  });

  it("SKIP, not a crash, when an input file is missing", () => {
    const root = fixture({ "deploy.sh": null });
    const result = run([
      `--repo-root=${root}`,
      "--pipeline=game",
      "--report-only",
    ]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("SKIP  deploy.sh not found");
  });
});

// ── Blind-spot announcement ───────────────────────────────────────────────────

describe("announces its own blind spots instead of printing a green check", () => {
  it("DYNAMIC-READ on a computed bracket index", () => {
    const root = fixture({
      "src/server/Dyn.ts":
        "const key = 'A';\nconst v = process.env[key];\nexport { v };",
    });
    const result = runJson([`--repo-root=${root}`, "--pipeline=game"]);
    expect(result.dynamicReads.join("\n")).toContain("computed");
  });

  it("still enumerates a string-literal bracket read", () => {
    const root = fixture({
      "src/server/Lit.ts":
        'const v = process.env["GAME_LITERAL"];\nexport { v };',
    });
    const result = runJson([`--repo-root=${root}`, "--pipeline=game"]);
    expect(result.dynamicReads).toEqual([]);
    expect(names(result.pipelines.game.required)).toContain("GAME_LITERAL");
  });

  it("enumerates an optional-chained read rather than missing it", () => {
    // src/client/jwt.ts reads API_DOMAIN as `process?.env?.API_DOMAIN`. Missing that
    // spelling would make the client reverse check report a genuinely-read DefinePlugin
    // key as dead — a false positive introduced by the fix for R2.
    const root = fixture({
      "src/server/Opt.ts":
        "const v = process?.env?.GAME_OPTIONAL;\nexport { v };",
    });
    const result = runJson([`--repo-root=${root}`, "--pipeline=game"]);
    expect(result.dynamicReads).toEqual([]);
    expect(names(result.pipelines.game.required)).toContain("GAME_OPTIONAL");
  });

  it("DYNAMIC-READ when the environment object is aliased", () => {
    const root = fixture({
      "src/server/Alias.ts": "const all = process.env;\nexport { all };",
    });
    const result = runJson([`--repo-root=${root}`, "--pipeline=game"]);
    expect(result.dynamicReads.join("\n")).toContain("aliased or destructured");
  });

  it("DYNAMIC-READ when a src file maps to no pipeline", () => {
    const root = fixture({
      "src/stray.ts": "const v = process.env.STRAY_ONE;\nexport { v };",
    });
    const result = runJson([`--repo-root=${root}`, "--pipeline=all"]);
    expect(result.dynamicReads.join("\n")).toContain("maps to no pipeline");
  });

  it("--enforce fails closed on a blind spot", () => {
    const root = fixture({
      "src/server/Dyn.ts":
        "const key = 'A';\nconst v = process.env[key];\nexport { v };",
    });
    expect(
      run([`--repo-root=${root}`, "--pipeline=game", "--enforce"]).status,
    ).toBe(1);
  });
});

// ── Verification step 7 — the no-leak guarantee ───────────────────────────────

describe("no-leak guarantee (verification step 7)", () => {
  it("BEHAVIOURAL: a poisoned environment never reaches the output", () => {
    // Canary generated per run, so this cannot pass by a stale-string accident.
    const canary = `canary-${Math.random().toString(16).slice(2)}-${Date.now()}`;
    const poisoned: NodeJS.ProcessEnv = {
      ...process.env,
      GC_CANARY: canary,
      PROFILE_INTERNAL_TOKEN: canary,
      ADMIN_TOKEN: canary,
      POSTGRES_PASSWORD: canary,
      DATABASE_URL: canary,
      STORAGE_SECRET_KEY: canary,
      YANDEX_PAYMENTS_SECRET: canary,
    };
    // Run against the REAL tree: these names are genuinely forwarded here, so if the
    // checker ever resolved a name to its value this is where it would show.
    const result = run(["--pipeline=all", "--report-only"], poisoned);
    expect(result.status).toBe(0);
    expect(result.stdout).not.toContain(canary);
    expect(result.stderr).not.toContain(canary);
    // Sanity: the run really did produce a report, so the assertion above is not vacuous.
    expect(result.stdout).toContain("config parity guard");
  });

  it("STATIC: the checker never performs an environment member read", () => {
    const source = fs.readFileSync(CHECKER, "utf8");
    // Deliberately a plain text search over the WHOLE file, comments included, rather
    // than a parse that tries to tell code from prose. Every pattern in the checker
    // escapes the dot, so the un-escaped spelling should appear nowhere at all — an
    // absolute property that anyone can re-check with one grep. A cleverer test that
    // stripped comments could itself be wrong; this one cannot be.
    expect(source).not.toMatch(/process\.env/);
  });

  it("STATIC: the checker references no dotfile env path", () => {
    const source = fs.readFileSync(CHECKER, "utf8");
    expect(source).not.toMatch(/["'`]\.env\b/);
    expect(source).not.toMatch(/\.env\.secret/);
    expect(source).not.toMatch(/\.env\.profile/);
  });

  it("STATIC: the deploy scripts do not trace-echo their environment", () => {
    for (const script of [
      "deploy.sh",
      "build-deploy-profile.sh",
      "setup-profile.sh",
      "update.sh",
    ]) {
      const text = fs.readFileSync(path.join(REPO_ROOT, script), "utf8");
      expect(text).not.toMatch(/^\s*set\s+-x\s*$/m);
      expect(text).not.toMatch(/^\s*set\s+-[a-z]*x[a-z]*\s*$/m);
    }
  });
});

// ── The directory-partition drift test (owner ruling R2 / plan Q1) ────────────

describe("pipeline partition assumption", () => {
  it("no file under src/profile-server imports src/core/configuration", () => {
    // The checker treats src/core/** as game-pipeline. That is only sound while the
    // profile server never pulls in core's configuration layer, which is where every
    // core environment read lives. This test makes the assumption fail loudly if it drifts.
    const profileDir = path.join(REPO_ROOT, "src", "profile-server");
    const offenders: string[] = [];

    const walk = (dir: string): void => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (entry.name.endsWith(".ts")) {
          const text = fs.readFileSync(full, "utf8");
          for (const match of text.matchAll(/from\s+"([^"]+)"/g)) {
            const spec = match[1];
            if (!spec.startsWith(".")) continue;
            const resolved = path.resolve(path.dirname(full), spec);
            const rel = path.relative(REPO_ROOT, resolved);
            if (rel.startsWith(path.join("src", "core", "configuration"))) {
              offenders.push(`${path.relative(REPO_ROOT, full)} -> ${spec}`);
            }
          }
        }
      }
    };
    walk(profileDir);
    expect(offenders).toEqual([]);
  });
});

// ── Real-tree baseline gate (owner ruling R4) ─────────────────────────────────

describe("real tree", () => {
  it("has zero REQUIRED parity violations", () => {
    // R4's gate. This fails a TEST RUN, never a deploy: it catches an unforwarded
    // setting at a developer's keyboard instead of in production.
    //
    // IF THIS GOES RED: you added a `process.env.X` read without forwarding X through
    // the pipeline that runs that code. Either forward it (deploy.sh heredoc for
    // game, setup-profile.sh + build-deploy-profile.sh for profile, DefinePlugin for
    // client), or add it to scripts/config-parity-allowlist.json WITH A REAL REASON.
    const result = runJson(["--pipeline=all"]);
    expect(result.pipelines.game.required).toEqual([]);
    expect(result.pipelines.profile.required).toEqual([]);
    expect(result.pipelines.client.required).toEqual([]);
    expect(result.requiredTotal).toBe(0);
  });

  it("parses every input — no PARSE-FAILURE, no SKIP, no blind spot", () => {
    const result = runJson(["--pipeline=all"]);
    expect(result.parseFailures).toEqual([]);
    expect(result.skips).toEqual([]);
    expect(result.dynamicReads).toEqual([]);
  });

  it("reports exactly the known dead forwarded keys", () => {
    // Drift signal, not a correctness gate. These six appear ONLY in deploy.sh in the
    // whole repository: nothing reads them and no deploy-side script consumes them.
    // They are reported as INFO, deliberately NOT pre-allowlisted — the owner declined
    // to record an "intentionally dead" judgment nobody had verified. Deleting them is
    // a separate brief; if you do, update this list.
    const result = runJson(["--pipeline=all"]);
    expect(names(result.pipelines.game.info)).toEqual([
      "BASIC_AUTH_PASS",
      "BASIC_AUTH_USER",
      "DOCKER_TOKEN",
      "OTEL_ENDPOINT",
      "OTEL_PASSWORD",
      "OTEL_USERNAME",
    ]);
    expect(result.pipelines.profile.info).toEqual([]);
  });

  it("reports the one dead DefinePlugin substitution on the client", () => {
    // WEBSOCKET_URL is substituted by webpack.config.js and read by nothing in the whole
    // repository. Before the client reverse check existed this pipeline printed INFO 0
    // with no check behind it, and the assertion that pinned it could not fail.
    // IF THIS GOES RED: either a reader for WEBSOCKET_URL appeared (good — drop it from
    // this list) or a new DefinePlugin key was added with nothing reading it.
    const result = runJson(["--pipeline=all"]);
    expect(names(result.pipelines.client.info)).toEqual(["WEBSOCKET_URL"]);
  });

  it("carries task 0195's hand-off as an inert phase-2 entry", () => {
    const result = runJson(["--pipeline=all"]);
    expect(names(result.inertAllowlist)).toEqual(["YANDEX_PAYMENTS_SECRET"]);
  });

  it("the shipped allowlist is well formed", () => {
    const parsed = JSON.parse(fs.readFileSync(REAL_ALLOWLIST, "utf8")) as {
      allow: {
        name: string;
        pipeline: string;
        class: string;
        reason: string;
      }[];
    };
    const seen = new Set<string>();
    for (const entry of parsed.allow) {
      const key = `${entry.pipeline}:${entry.name}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
      expect(entry.reason.trim().length).toBeGreaterThan(0);
      expect(["game", "profile", "client"]).toContain(entry.pipeline);
      expect([
        "runtime-supplied",
        "build-time",
        "optional",
        "dead-config",
      ]).toContain(entry.class);
    }
    expect(parsed.allow.length).toBeGreaterThan(0);
  });

  it("every source path cited in an allowlist reason actually resolves", () => {
    // A reason is only worth requiring if it is true. The shipped HOSTNAME entry cited
    // src/core/telemetry/OtelResource.ts, which has never existed (the read is at
    // src/server/OtelResource.ts) — a fresh instance of exactly the rot the allowlist
    // exists to prevent, and invisible to a non-empty-reason check (review 0064 R6).
    const parsed = JSON.parse(fs.readFileSync(REAL_ALLOWLIST, "utf8")) as {
      allow: { name: string; reason: string }[];
    };
    const unresolved: string[] = [];
    for (const entry of parsed.allow) {
      for (const match of entry.reason.matchAll(
        /\bsrc\/[A-Za-z0-9_./-]+\.tsx?\b/g,
      )) {
        if (!fs.existsSync(path.join(REPO_ROOT, match[0]))) {
          unresolved.push(`${entry.name} -> ${match[0]}`);
        }
      }
    }
    expect(unresolved).toEqual([]);
  });

  it("prints the report-only output contract", () => {
    const result = run(["--pipeline=all", "--report-only"]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("config parity guard (report-only)");
    expect(result.stdout).toContain("pipeline: game");
    expect(result.stdout).toContain("REQUIRED  0");
    expect(result.stdout).toContain(
      "report-only — exit 0, this cannot fail a deploy",
    );
  });

  it("prints the R1 caveat inside the client section, and nowhere else", () => {
    // Both deploy call sites now run --pipeline=all (review 0064 R3), so every deploy
    // prints `client REQUIRED 0` — a green line for a forward check R1 proves
    // incomplete. Owner ruling 2026-09-02 (finding R14): the caveat must be in the
    // OUTPUT, not only in a source comment and the review ledger.
    const all = run(["--pipeline=all", "--report-only"]);
    expect(all.status).toBe(0);
    const lines = all.stdout.split("\n");
    const caveatLines = lines.filter((l) => l.startsWith("CAVEAT"));
    expect(caveatLines).toHaveLength(1);

    const caveat = caveatLines[0];
    expect(caveat).toContain("INCOMPLETE");
    expect(caveat).toContain("src/core/configuration/**");
    expect(caveat).toContain("DefinePlugin");

    // It sits inside the client section: after `pipeline: client`, before its INFO line.
    const caveatAt = lines.indexOf(caveat);
    const clientAt = lines.indexOf("pipeline: client");
    expect(clientAt).toBeGreaterThan(-1);
    expect(caveatAt).toBeGreaterThan(clientAt);
    expect(lines[caveatAt + 1]).toMatch(/^INFO {6}\d/);

    // The game and profile sections must not gain a line — they are byte-pinned.
    expect(run(["--pipeline=game", "--report-only"]).stdout).not.toContain(
      "CAVEAT",
    );
    expect(run(["--pipeline=profile", "--report-only"]).stdout).not.toContain(
      "CAVEAT",
    );
  });
});
