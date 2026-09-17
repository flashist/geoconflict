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

// ── R1 (task 0203) — src/core/configuration/** is checked against BOTH channels ──

describe("R1 — core configuration reads reach the browser, so DefinePlugin must supply them", () => {
  // Owner disposition D2: src/core/configuration/** is bundled into the browser as well as
  // the game server, so its reads are classified against the deploy heredoc AND
  // DefinePlugin. Scope is exactly configuration/** — the rest of src/core/** stays game-only.
  const withCoreConfigRead = (definePluginKeys: string[]) => ({
    "src/core/configuration/Cfg.ts":
      "const shared = process.env.CORE_SHARED_KEY;\nexport { shared };",
    "deploy.sh": [
      "#!/bin/bash",
      "cat > ${ENV_FILE} << 'EOL'",
      "GAME_TOKEN=${GAME_TOKEN}",
      "GAME_HOST=${GAME_HOST}",
      "CORE_SHARED_KEY=${CORE_SHARED_KEY}",
      "ENVIRONMENT=${ENV}",
      "DEAD_ONE=${DEAD_ONE}",
      "EOL",
    ].join("\n"),
    "webpack.config.js": [
      "new webpack.DefinePlugin({",
      ...definePluginKeys.map(
        (k) => `  "process.env.${k}": JSON.stringify("v"),`,
      ),
      "});",
    ].join("\n"),
  });

  it("a core/configuration read forwarded by the heredoc but absent from DefinePlugin is client REQUIRED", () => {
    const root = fixture(withCoreConfigRead(["CLIENT_MODE"]));
    const result = runJson([`--repo-root=${root}`, "--pipeline=all"]);
    // The game channel is satisfied — the heredoc forwards it …
    expect(names(result.pipelines.game.required)).toEqual([]);
    // … and the browser channel is not.
    expect(names(result.pipelines.client.required)).toEqual([
      "CORE_SHARED_KEY",
    ]);
    const detail = result.pipelines.client.required[0].detail;
    expect(detail).toContain("core/configuration/Cfg.ts:1");
    // The guardrail: the fix for a server-only key is the allowlist, never DefinePlugin.
    expect(detail).toContain(
      "never substitute a server secret into the browser bundle",
    );

    // Supplying it through DefinePlugin clears the finding.
    const supplied = fixture(
      withCoreConfigRead(["CLIENT_MODE", "CORE_SHARED_KEY"]),
    );
    const suppliedResult = runJson([
      `--repo-root=${supplied}`,
      "--pipeline=client",
    ]);
    expect(suppliedResult.pipelines.client.required).toEqual([]);
  });

  it("a read elsewhere under src/core/** stays game-only", () => {
    const root = fixture({
      "src/core/other/X.ts":
        "const other = process.env.CORE_OTHER_KEY;\nexport { other };",
    });
    const result = runJson([`--repo-root=${root}`, "--pipeline=all"]);
    expect(names(result.pipelines.game.required)).toEqual(["CORE_OTHER_KEY"]);
    expect(names(result.pipelines.client.required)).toEqual([]);
  });

  it("the ledger's reproduction, on real-tree data: dropping STRIPE_PUBLISHABLE_KEY from DefinePlugin fires", () => {
    // Review 0064 R1: deleting this DefinePlugin entry used to leave `REQUIRED 0` and
    // `--enforce` exit 0. Every input is the real tree's except the webpack config, which
    // is the real file with that one entry removed.
    const real = fs.readFileSync(
      path.join(REPO_ROOT, "webpack.config.js"),
      "utf8",
    );
    const entry =
      /\s*"process\.env\.STRIPE_PUBLISHABLE_KEY":\s*JSON\.stringify\([^)]*\),/;
    expect(real).toMatch(entry);
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "config-parity-r1-"));
    fixtures.push(dir);
    const edited = path.join(dir, "webpack.config.js");
    fs.writeFileSync(edited, real.replace(entry, ""));

    const result = runJson(["--pipeline=all", `--webpack-config=${edited}`]);
    expect(result.parseFailures).toEqual([]);
    expect(names(result.pipelines.client.required)).toEqual([
      "STRIPE_PUBLISHABLE_KEY",
    ]);
    expect(
      run(["--pipeline=all", `--webpack-config=${edited}`, "--enforce"]).status,
    ).toBe(1);
  });

  it("R10: a finding cites only its own pipeline's read sites", () => {
    // Review 0064 R10: `sites` was one array shared across pipelines, so a game finding
    // cited src/profile-server/InternalAuth.ts first — the wrong pipeline's file.
    const root = fixture({
      "src/profile-server/InternalAuth.ts":
        "const token = process.env.PROFILE_INTERNAL_TOKEN;\nexport { token };",
      "src/server/ProfileApiClient.ts":
        "const token = process.env.PROFILE_INTERNAL_TOKEN;\nexport { token };",
    });
    const result = runJson([`--repo-root=${root}`, "--pipeline=all"]);
    const game = result.pipelines.game.required.find(
      (f) => f.name === "PROFILE_INTERNAL_TOKEN",
    );
    expect(game?.detail).toContain("server/ProfileApiClient.ts:1");
    expect(game?.detail).not.toContain("profile-server/");
    const profile = result.pipelines.profile.required.find(
      (f) => f.name === "PROFILE_INTERNAL_TOKEN",
    );
    expect(profile?.detail).toContain("profile-server/InternalAuth.ts:1");
    expect(profile?.detail).not.toMatch(/(^|[^-])server\/ProfileApiClient/);
  });
});

// ── R2 (review 0203) — a server-only key must never be substituted into the browser ──

describe("R2 (review 0203) — a server-only key that DefinePlugin substitutes is a hard finding", () => {
  // A `server-only` allowlist entry records that the browser never needs the key. If
  // DefinePlugin substitutes it anyway, its value is published in the browser bundle — so
  // the allowlist must not turn that green.
  const SERVER_ONLY_DETAIL =
    "server-only key substituted into the browser bundle";
  const serverOnlyFixture = (substituted: boolean) =>
    fixture({
      "src/core/configuration/Cfg.ts":
        "const secret = process.env.CORE_SERVER_SECRET;\nexport { secret };",
      "webpack.config.js": [
        "new webpack.DefinePlugin({",
        '  "process.env.CLIENT_MODE": JSON.stringify("dev"),',
        ...(substituted
          ? ['  "process.env.CORE_SERVER_SECRET": JSON.stringify("v"),']
          : []),
        "});",
      ].join("\n"),
      "scripts/config-parity-allowlist.json": JSON.stringify({
        allow: [
          ...CLEAN_ALLOWLIST.allow,
          {
            name: "CORE_SERVER_SECRET",
            pipeline: "client",
            class: "server-only",
            phase: 1,
            reason:
              "Fixture: bundled into the browser, only ever called on the server.",
          },
        ],
      }),
    });

  it("control: an unsubstituted server-only key is ALLOWED and passes --enforce", () => {
    const root = serverOnlyFixture(false);
    const result = runJson([`--repo-root=${root}`, "--pipeline=client"]);
    expect(result.pipelines.client.required).toEqual([]);
    expect(names(result.pipelines.client.allowed)).toEqual([
      "CORE_SERVER_SECRET",
    ]);
    expect(
      run([`--repo-root=${root}`, "--pipeline=client", "--enforce"]).status,
    ).toBe(0);
  });

  it("a substituted server-only key is REQUIRED and fails --enforce", () => {
    const root = serverOnlyFixture(true);
    const result = runJson([`--repo-root=${root}`, "--pipeline=client"]);
    expect(names(result.pipelines.client.required)).toEqual([
      "CORE_SERVER_SECRET",
    ]);
    expect(result.pipelines.client.required[0].detail).toContain(
      SERVER_ONLY_DETAIL,
    );
    expect(result.pipelines.client.allowed).toEqual([]);
    const enforced = run([
      `--repo-root=${root}`,
      "--pipeline=client",
      "--enforce",
    ]);
    expect(enforced.status).toBe(1);
    expect(enforced.stdout).toContain(
      "enforce — failing on the findings above",
    );
  });

  it("the reviewer's reproduction, on real-tree data: substituting STORAGE_SECRET_KEY fires", () => {
    // Every input is the real tree's except the webpack config, which is the real file
    // with one DefinePlugin entry added for a key the allowlist marks server-only.
    const real = fs.readFileSync(
      path.join(REPO_ROOT, "webpack.config.js"),
      "utf8",
    );
    const anchor = '"process.env.STRIPE_PUBLISHABLE_KEY":';
    expect(real).toContain(anchor);
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "config-parity-r2-"));
    fixtures.push(dir);
    const edited = path.join(dir, "webpack.config.js");
    fs.writeFileSync(
      edited,
      real.replace(
        anchor,
        `"process.env.STORAGE_SECRET_KEY": JSON.stringify(process.env.STORAGE_SECRET_KEY),\n      ${anchor}`,
      ),
    );

    const result = runJson(["--pipeline=client", `--webpack-config=${edited}`]);
    expect(result.parseFailures).toEqual([]);
    expect(names(result.pipelines.client.required)).toEqual([
      "STORAGE_SECRET_KEY",
    ]);
    expect(result.pipelines.client.required[0].detail).toContain(
      SERVER_ONLY_DETAIL,
    );
    expect(
      run(["--pipeline=client", `--webpack-config=${edited}`, "--enforce"])
        .status,
    ).toBe(1);
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

// ── R16 (task 0203) — the enforce footer never contradicts the exit code ──────

describe("R16 — the --enforce footer says exactly what the exit code does", () => {
  const FAILING = "enforce — failing on the findings above";
  const PASSING = "enforce — no required findings";
  const dynamicOnly = () =>
    fixture({
      "src/server/Dyn.ts":
        "const key = 'A';\nconst v = process.env[key];\nexport { v };",
    });

  it("a DYNAMIC-READ-only run exits 1 and says it is failing (the ledger's reproduction)", () => {
    const result = run([
      `--repo-root=${dynamicOnly()}`,
      "--pipeline=game",
      "--enforce",
    ]);
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("DYNAMIC-READ");
    expect(result.stdout).toContain(FAILING);
    expect(result.stdout).not.toContain(PASSING);
  });

  it("a SKIP-only run exits 1 and says it is failing", () => {
    const root = fixture({ "Dockerfile.profile": null });
    const result = run([
      `--repo-root=${root}`,
      "--pipeline=profile",
      "--enforce",
    ]);
    expect(result.status).toBe(1);
    expect(result.stdout).toContain("SKIP  Dockerfile.profile not found");
    expect(result.stdout).toContain(FAILING);
  });

  it("across clean / required / parse / dynamic / skip, exit 1 exactly when the footer says failing", () => {
    const cases: [string, string, string][] = [
      ["clean", fixture(), "all"],
      [
        "required",
        fixture({
          "scripts/config-parity-allowlist.json": JSON.stringify({ allow: [] }),
        }),
        "game",
      ],
      [
        "parse",
        fixture({ "deploy.sh": "#!/bin/bash\necho no heredoc" }),
        "game",
      ],
      ["dynamic", dynamicOnly(), "game"],
      ["skip", fixture({ "Dockerfile.profile": null }), "profile"],
    ];
    for (const [label, root, pipeline] of cases) {
      const result = run([
        `--repo-root=${root}`,
        `--pipeline=${pipeline}`,
        "--enforce",
      ]);
      const footer = result.stdout.trim().split("\n").pop();
      const expected =
        label === "clean"
          ? { status: 0, footer: PASSING }
          : { status: 1, footer: FAILING };
      expect({ label, status: result.status, footer }).toEqual({
        label,
        ...expected,
      });
    }
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

  // ── R12 (task 0203): every heredoc line the key parser does not consume fails loud ──
  // Defined by INVERSION, not by another positive pattern: a body line is either a
  // column-0 UPPERCASE= assignment (consumed), blank or a comment (ignorable), or
  // anything else (unconsumed ⇒ PARSE-FAILURE). Both env-file consumers treat every
  // other non-blank, non-comment line as an assignment, so dropping one is silent loss.
  const profileHeredoc = (extra: string[]): string =>
    [
      "#!/bin/bash",
      '( umask 077; cat > "$PROFILE_DIR/profile.env" << EOF',
      "PROFILE_DB_URL=${PROFILE_DB_URL}",
      "PROFILE_SECRET=${PROFILE_SECRET}",
      "PROFILE_TUNING=${PROFILE_TUNING}",
      ...extra,
      "EOF",
      ")",
      'echo "tuning: $PROFILE_TUNING"',
    ].join("\n");
  const deployHeredoc = (extra: string[]): string =>
    [
      "#!/bin/bash",
      "cat > ${ENV_FILE} << 'EOL'",
      "GAME_TOKEN=${GAME_TOKEN}",
      "ENVIRONMENT=${ENV}",
      ...extra,
      "EOL",
    ].join("\n");

  it("R12: an `export KEY=` profile.env line fails loud instead of silencing task 0195's B2 finding", () => {
    // The ledger's reproduction: this exact fixture used to print REQUIRED 0 / INFO 0.
    const root = fixture({
      "setup-profile.sh": profileHeredoc(["export ORPHAN_KEY=${ORPHAN_KEY}"]),
    });
    const result = runJson([`--repo-root=${root}`, "--pipeline=profile"]);
    const failures = result.parseFailures.join("\n");
    expect(failures).toContain("'ORPHAN_KEY='");
    expect(failures).toContain("heredoc line 6");

    // Control: the plain spelling is consumed, so the B2 finding prints as before.
    const control = fixture({
      "setup-profile.sh": profileHeredoc(["ORPHAN_KEY=${ORPHAN_KEY}"]),
    });
    const controlResult = runJson([
      `--repo-root=${control}`,
      "--pipeline=profile",
    ]);
    expect(controlResult.parseFailures).toEqual([]);
    const orphan = controlResult.pipelines.profile.required.find(
      (f) => f.name === "ORPHAN_KEY",
    );
    expect(orphan?.detail).toContain("lands EMPTY");
  });

  it("R12: an indented `export KEY=` deploy heredoc line fails loud", () => {
    const root = fixture({
      "deploy.sh": deployHeredoc(["  export GAME_HOST=${GAME_HOST}"]),
    });
    const result = runJson([`--repo-root=${root}`, "--pipeline=game"]);
    expect(result.parseFailures.join("\n")).toContain("'GAME_HOST='");
  });

  it("R12: lowercase and mixed-case keys each fail loud, by name", () => {
    const root = fixture({
      "deploy.sh": deployHeredoc(["game_host=${GAME_HOST}", "Game_Host=x"]),
    });
    const result = runJson([`--repo-root=${root}`, "--pipeline=game"]);
    const failures = result.parseFailures.join("\n");
    expect(failures).toContain("heredoc line 5 'game_host='");
    expect(failures).toContain("heredoc line 6 'Game_Host='");
  });

  it("R12: a bare `KEY` line (docker forwards it from the host) fails loud", () => {
    const root = fixture({ "deploy.sh": deployHeredoc(["GAME_HOST"]) });
    const result = runJson([`--repo-root=${root}`, "--pipeline=game"]);
    expect(result.parseFailures.join("\n")).toContain("heredoc line 5");
  });

  it("R12: a vertical-tab-indented key fails loud", () => {
    const root = fixture({
      "deploy.sh": deployHeredoc(["\vGAME_HOST=${GAME_HOST}"]),
    });
    const result = runJson([`--repo-root=${root}`, "--pipeline=game"]);
    expect(result.parseFailures.join("\n")).toContain("'GAME_HOST='");
  });

  it("R12: blank lines and comments in a heredoc body are NOT failures", () => {
    // Pins the exemption: both env-file parsers ignore these, so failing on them would
    // be a false hard PARSE-FAILURE once --enforce is armed.
    const root = fixture({
      "deploy.sh": deployHeredoc(["", "# note GAME_X=1", "   # indented note"]),
    });
    const result = runJson([`--repo-root=${root}`, "--pipeline=game"]);
    expect(result.parseFailures).toEqual([]);
  });

  it("R12: the failure message never prints a heredoc line's value", () => {
    // Per-run canaries in three positions: an assignment's value, a lowercase key's
    // value, and a bare line made only of word characters (a naive "first identifier on
    // the line" name extractor would print that one whole).
    const hex = Math.random().toString(16).slice(2);
    const canary = `canary${hex}x${Date.now()}`;
    const root = fixture({
      "setup-profile.sh": profileHeredoc([
        `export ORPHAN_KEY=${canary}`,
        `lower_key=${canary}`,
        canary,
      ]),
    });
    const text = run([`--repo-root=${root}`, "--pipeline=profile"]);
    const json = run([`--repo-root=${root}`, "--pipeline=profile", "--json"]);
    // Not vacuous: the failure really was reported.
    expect(text.stdout).toContain("PARSE-FAILURE");
    expect(text.stdout).toContain("'ORPHAN_KEY='");
    expect(text.stdout).not.toContain(canary);
    expect(json.stdout).not.toContain(canary);
    expect(text.stderr + json.stderr).not.toContain(canary);
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

// ── R15 (task 0203) — comments and strings are not code ───────────────────────

describe("R15 — the read scanner separates code from comments and strings", () => {
  const serverFile = (body: string) =>
    runJson([
      `--repo-root=${fixture({ "src/server/Scan.ts": body })}`,
      "--pipeline=game",
    ]);
  const TOKENIZER_FAILURE = "could not separate code from comments/strings";

  it("prose in a line comment is not an aliased read (the ledger's reproduction)", () => {
    const result = serverFile(
      "export const x = 1;\n// legacy default = process.env, replaced in 2024\n",
    );
    expect(result.dynamicReads).toEqual([]);
    expect(result.parseFailures).toEqual([]);
  });

  it("a read mentioned only in a comment does not count as a consumer", () => {
    // The mirror case: a false read would suppress the real dead-config line for DEAD_ONE.
    const result = serverFile("// process.env.DEAD_ONE\nexport const y = 1;\n");
    expect(names(result.pipelines.game.info)).toEqual(["DEAD_ONE"]);
  });

  it("block comments and JSDoc record no read", () => {
    const result = serverFile(
      [
        "/** Reads process.env.GHOST_JSDOC when set. */",
        "/* const all = process.env; process.env.GHOST_BLOCK */",
        "export const z = 1;",
      ].join("\n"),
    );
    expect(result.dynamicReads).toEqual([]);
    expect(names(result.pipelines.game.required)).toEqual([]);
  });

  it("string contents and template text record no read", () => {
    const result = serverFile(
      [
        'const a = "x = process.env";',
        "const b = 'process.env.GHOST_SINGLE';",
        "const c = `process.env.GHOST_TEMPLATE_TEXT`;",
        "export { a, b, c };",
      ].join("\n"),
    );
    expect(result.dynamicReads).toEqual([]);
    expect(names(result.pipelines.game.required)).toEqual([]);
  });

  it("a read inside a template substitution, nested or not, is still code", () => {
    const result = serverFile(
      [
        "const t = `host ${process.env.GAME_TPL} end`;",
        "const u = `a ${`b ${process.env.GAME_TPL_NESTED} c`} d`;",
        "export { t, u };",
      ].join("\n"),
    );
    expect(result.parseFailures).toEqual([]);
    expect(names(result.pipelines.game.required)).toEqual([
      "GAME_TPL",
      "GAME_TPL_NESTED",
    ]);
  });

  it("a regex containing quote characters does not derail the scan", () => {
    const result = serverFile(
      [
        "const re = /[\"'`]/g;",
        "const v = process.env.GAME_AFTER_REGEX;",
        "export { re, v };",
      ].join("\n"),
    );
    expect(result.parseFailures).toEqual([]);
    expect(names(result.pipelines.game.required)).toEqual(["GAME_AFTER_REGEX"]);
  });

  it("division is not mistaken for a regex", () => {
    const result = serverFile(
      [
        "const a = 4, arr = [2];",
        'const h = a / 2; const k = "/";',
        'const m = (a + 1) / arr[0] / 2; const q = "\'";',
        "const w = process.env.GAME_AFTER_DIVISION;",
        "export { h, k, m, q, w };",
      ].join("\n"),
    );
    expect(result.parseFailures).toEqual([]);
    expect(names(result.pipelines.game.required)).toEqual([
      "GAME_AFTER_DIVISION",
    ]);
  });

  it("a `/` after postfix `++`/`--` or a TypeScript non-null `!` is division — no read is lost", () => {
    // Review 0203 R1: these used to open a "regex" running to the next `/` on the line,
    // blanking the read in between with no PARSE-FAILURE — a silent loss.
    const result = serverFile(
      [
        "declare const t: number | null; declare function f(): number | null;",
        "let n = 1;",
        "const a = n++ / Number(process.env.GAME_POSTINC) / 3;",
        "const b = n-- / Number(process.env.GAME_POSTDEC) / 3;",
        "const c = t! / Number(process.env.GAME_NONNULL) / 4;",
        "const d = f()! / Number(process.env.GAME_NONNULL_CALL) / 4;",
        "export { a, b, c, d };",
      ].join("\n"),
    );
    expect(result.parseFailures).toEqual([]);
    expect(names(result.pipelines.game.required)).toEqual([
      "GAME_NONNULL",
      "GAME_NONNULL_CALL",
      "GAME_POSTDEC",
      "GAME_POSTINC",
    ]);
  });

  it("a logical-not `!` before a real regex still starts a regex", () => {
    // The guard for the fix above: only a `!` written directly after a value is a
    // non-null assertion. A `!` after whitespace — here a line break, where TypeScript
    // never reads a non-null assertion — is logical-not, so the regex after it (one
    // containing `//`) must not be read as division plus a line comment.
    const result = serverFile(
      [
        "declare const u: string; declare const x: boolean;",
        "const p = x && !/[\"']/.test(u) && process.env.GAME_AFTER_NOT;",
        "const y = u",
        "!/\\/\\//.test(u) && console.log(process.env.GAME_AFTER_NEWLINE_NOT);",
        "export { p, y };",
      ].join("\n"),
    );
    expect(result.parseFailures).toEqual([]);
    expect(names(result.pipelines.game.required)).toEqual([
      "GAME_AFTER_NEWLINE_NOT",
      "GAME_AFTER_NOT",
    ]);
  });

  it("a regex right after the `)` of an if/while/for head is a regex — no read is lost", () => {
    // Review 0203 R1, reverse case: that `)` ends a statement head, not a value, but was
    // read as a value, so the regex became division and its `//` a line comment that
    // blanked the read after it — silently.
    const result = serverFile(
      [
        "declare const u: string; declare const x: boolean; declare const s: string[];",
        "if (x) /^https?:\\/\\//.test(u) && console.log(process.env.GAME_AFTER_IF);",
        "while (x) /\\/\\//.test(u) && console.log(process.env.GAME_AFTER_WHILE);",
        "for (const c of s) /\\/\\//.test(c) && console.log(process.env.GAME_AFTER_FOR);",
        "async function g() { for await (const c of s) /\\/\\//.test(c) && console.log(process.env.GAME_AFTER_FOR_AWAIT); }",
        "if (x) !/\\/\\//.test(u) && console.log(process.env.GAME_AFTER_IF_NOT);",
        "if (x)!/\\/\\//.test(u) && console.log(process.env.GAME_AFTER_IF_UNSPACED_NOT);",
        "export { g };",
      ].join("\n"),
    );
    expect(result.parseFailures).toEqual([]);
    expect(names(result.pipelines.game.required)).toEqual([
      "GAME_AFTER_FOR",
      "GAME_AFTER_FOR_AWAIT",
      "GAME_AFTER_IF",
      "GAME_AFTER_IF_NOT",
      "GAME_AFTER_IF_UNSPACED_NOT",
      "GAME_AFTER_WHILE",
    ]);
  });

  it("any other `)` — a call, a group, a call inside an if head, a member named if — still ends a value", () => {
    // The guard for the fix above: only the `)` that closes the head itself is special,
    // and a member named like a keyword (`obj.if(…)`) opens no head.
    const result = serverFile(
      [
        "declare function f(n: number): number; declare const a: number;",
        "const r = f(a) / Number(process.env.GAME_CALL_DIVISION) / 2;",
        "const q = (a + 1) / Number(process.env.GAME_GROUP_DIVISION) / 2;",
        "if (f(a) / Number(process.env.GAME_IN_HEAD_DIVISION) / 2) {}",
        "declare const obj: { if(n: number): number };",
        "const m = obj.if(a) / Number(process.env.GAME_MEMBER_IF_DIVISION) / 2;",
        "export { r, q, m };",
      ].join("\n"),
    );
    expect(result.parseFailures).toEqual([]);
    expect(names(result.pipelines.game.required)).toEqual([
      "GAME_CALL_DIVISION",
      "GAME_GROUP_DIVISION",
      "GAME_IN_HEAD_DIVISION",
      "GAME_MEMBER_IF_DIVISION",
    ]);
  });

  it("text it cannot separate is a PARSE-FAILURE, and the file is still scanned raw", () => {
    const result = serverFile(
      "const v = process.env.GAME_UNTERMINATED;\nexport { v };\n/* never closed\n",
    );
    const failures = result.parseFailures.join("\n");
    expect(failures).toContain(TOKENIZER_FAILURE);
    expect(failures).toContain("Scan.ts");
    // The fallback: a DETECTED tokenizer failure never loses a read. An undetected
    // regex/division misread still can — see REGEX_AFTER_PUNCTUATOR in the checker.
    expect(names(result.pipelines.game.required)).toEqual([
      "GAME_UNTERMINATED",
    ]);
  });

  it("a literal bracket read is enumerated, but a bracket inside a string is not", () => {
    const result = serverFile(
      [
        'const v = process.env[ "GAME_BRACKET" ];',
        "const s = 'process.env[key]';",
        "export { v, s };",
      ].join("\n"),
    );
    expect(result.dynamicReads).toEqual([]);
    expect(names(result.pipelines.game.required)).toEqual(["GAME_BRACKET"]);
  });
});

// ── R18 (task 0203) — DefinePlugin keys come from the DefinePlugin block only ──

describe("R18 — DefinePlugin keys are read from the DefinePlugin object literal, not the file's text", () => {
  const clientRun = (webpack: string[], extra: Record<string, string> = {}) =>
    runJson([
      `--repo-root=${fixture({ "webpack.config.js": webpack.join("\n"), ...extra })}`,
      "--pipeline=client",
    ]);

  it("a commented-out key, inside or outside the block, is not a substitution (the ledger's reproduction)", () => {
    const result = clientRun([
      '// legacy: "process.env.OLD_FAKE_KEY": JSON.stringify(x),',
      "new webpack.DefinePlugin({",
      '  // legacy: "process.env.OLD_FAKE_KEY_INSIDE": JSON.stringify(x),',
      '  "process.env.CLIENT_MODE": JSON.stringify("dev"),',
      "});",
    ]);
    expect(result.parseFailures).toEqual([]);
    expect(names(result.pipelines.client.info)).toEqual([]);
  });

  it("a commented-out entry does not count as supplying a key the browser reads", () => {
    // The mirror case, and the worse one: it would hide a genuinely missing substitution.
    const result = clientRun([
      "new webpack.DefinePlugin({",
      '  // "process.env.CLIENT_MODE": JSON.stringify("dev"),',
      '  "process.env.CLIENT_OTHER": JSON.stringify("x"),',
      "});",
    ]);
    expect(names(result.pipelines.client.required)).toEqual(["CLIENT_MODE"]);
  });

  it("the key inside a string elsewhere in the file is not a substitution", () => {
    const result = clientRun([
      "const note = '\"process.env.CLIENT_MODE\": JSON.stringify(x)';",
      "new webpack.DefinePlugin({",
      '  "process.env.CLIENT_OTHER": JSON.stringify("x"),',
      "});",
    ]);
    expect(names(result.pipelines.client.required)).toEqual(["CLIENT_MODE"]);
  });

  it("the key in a different object literal is not a substitution", () => {
    const result = clientRun([
      'const unrelated = { "process.env.CLIENT_MODE": JSON.stringify("dev") };',
      "new webpack.DefinePlugin({",
      '  "process.env.CLIENT_OTHER": JSON.stringify("x"),',
      "});",
    ]);
    expect(names(result.pipelines.client.required)).toEqual(["CLIENT_MODE"]);
  });

  it("single- and double-quoted keys are substitutions", () => {
    // No backtick case: a template literal cannot be an object key (a SyntaxError), so
    // webpack could never load such a config (review 0203 R3).
    const result = clientRun(
      [
        "new webpack.DefinePlugin({",
        "  'process.env.CLIENT_MODE': JSON.stringify(\"dev\"),",
        '  "process.env.CLIENT_TWO": JSON.stringify("two"),',
        "  nested: { deep: [1, 2] },",
        "});",
      ],
      {
        "src/client/Two.ts":
          "const two = process.env.CLIENT_TWO;\nexport { two };",
      },
    );
    expect(result.parseFailures).toEqual([]);
    expect(names(result.pipelines.client.required)).toEqual([]);
    expect(names(result.pipelines.client.info)).toEqual([]);
  });

  it("a computed key, a spread, or a non-literal argument cannot be enumerated — PARSE-FAILURE", () => {
    for (const body of [
      [
        "new webpack.DefinePlugin({",
        '  "process.env.CLIENT_MODE": JSON.stringify("dev"),',
        '  [computed]: JSON.stringify("x"),',
        "});",
      ],
      [
        "new webpack.DefinePlugin({",
        '  "process.env.CLIENT_MODE": JSON.stringify("dev"),',
        "  ...extraDefinitions,",
        "});",
      ],
      ["new webpack.DefinePlugin(definitions);"],
    ]) {
      const result = clientRun(body);
      const failures = result.parseFailures.join("\n");
      expect(failures).toContain("DefinePlugin");
      expect(failures).toContain("cannot enumerate");
    }
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

  it("carries the phase-2 entries as inert — 0195's hand-off, 0220's Telegram trio, 0274's monitoring pair", () => {
    // Deliberately pinned to the exact list: a phase-2 entry never suppresses anything, so
    // one appearing (or vanishing) here is a change someone must have meant. 0220 added the
    // three Telegram variables and 0274 the OTLP endpoint + the login-creation switch —
    // all of whose VALUES are checked on the box, not by this name-only checker.
    const result = runJson(["--pipeline=all"]);
    expect(names(result.inertAllowlist)).toEqual([
      "FEEDBACK_TELEGRAM_CHAT_ID",
      "FEEDBACK_TELEGRAM_TOKEN",
      "OTEL_EXPORTER_OTLP_ENDPOINT",
      "PROFILE_LOGIN_CREATE_ENABLED",
      "TELEGRAM_PROXY_URL",
      "YANDEX_PAYMENTS_SECRET",
    ]);
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
        "server-only",
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

  it("prints no CAVEAT line in any pipeline's output now that R1 is fixed", () => {
    // Owner ruling 2026-09-02 (R14) printed a caveat under the client section while R1
    // was open. R1 is fixed (task 0203), and a caveat that outlives its gap is its own
    // false claim — so it must be gone from every pipeline's output.
    for (const pipeline of ["all", "game", "profile", "client"]) {
      const result = run([`--pipeline=${pipeline}`, "--report-only"]);
      expect(result.status).toBe(0);
      // Not vacuous: the section really was rendered.
      expect(result.stdout).toContain("REQUIRED  0");
      expect(result.stdout).not.toContain("CAVEAT");
    }
  });
});
