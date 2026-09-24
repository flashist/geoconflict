/**
 * Tests for scripts/check-config-values.mjs — the deploy-time config VALUE guard, task 0064
 * Phase 2 — and for its wiring into deploy.sh.
 *
 * Kept apart from ConfigParity.test.ts on purpose: that file tests the name-only parity
 * checker, whose whole safety story is that it never sees a value. This checker DOES see
 * values (on stdin), so its no-leak tests are different in kind: every value fed to it
 * here is a distinct canary, and the tests assert no canary ever reaches its output.
 *
 * Every value in this file is fake: `*.example.test` hosts, the token `x`, and a
 * canary-ish private IP. Nothing here reads a real .env file.
 *
 * Owner rulings baked in (2026-09-23, amendments to plan-phase2.md):
 *   - a blank PROFILE_INTERNAL_TOKEN is REQUIRED — it has no `optional` value entry;
 *   - the non-empty rule, like the format rules, applies to PROD deploys only.
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const VALUES_CHECKER = path.join(
  REPO_ROOT,
  "scripts",
  "check-config-values.mjs",
);
const REAL_DEPLOY_SH = path.join(REPO_ROOT, "deploy.sh");
const REAL_ALLOWLIST = path.join(
  REPO_ROOT,
  "scripts",
  "config-parity-allowlist.json",
);

type Required = { name: string; rules: string[]; detail: string };
type ValueResult = {
  mode: string;
  deployEnv: string;
  required: Required[];
  optional: { name: string; reason: string }[];
  ok: string[];
  unchecked: string[];
  notJudged: string[];
  valueUnknown: string[];
  parseFailures: string[];
  skips: string[];
  info: string[];
  deadKeyExemption: { applied: boolean; reason: string | null };
  requiredTotal: number;
};
type Run = { status: number; stdout: string; stderr: string };

/** `name NUL value NUL …` — exactly what deploy.sh's printf loop writes. */
function stream(values: Record<string, string>): string {
  return Object.entries(values)
    .map(([name, value]) => `${name}\0${value}\0`)
    .join("");
}

function runValues(args: string[], stdin = ""): Run {
  const result = spawnSync(process.execPath, [VALUES_CHECKER, ...args], {
    encoding: "utf8",
    input: stdin,
  });
  return {
    status: result.status ?? -1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

function check(
  values: Record<string, string>,
  deployEnv = "prod",
  extra: string[] = [],
): ValueResult {
  const result = runValues(
    ["--values-stdin", `--deploy-env=${deployEnv}`, "--json", ...extra],
    stream(values),
  );
  expect(result.status).toBe(0);
  return JSON.parse(result.stdout) as ValueResult;
}

function requiredNames(result: ValueResult): string[] {
  return result.required.map((r) => r.name).sort();
}

function rulesOf(result: ValueResult, name: string): string[] | undefined {
  return result.required.find((r) => r.name === name)?.rules;
}

/** The 29 value sources of the real deploy.sh heredoc, set to a clean prod shape. */
const CLEAN_PROD: Record<string, string> = {
  ENV: "prod",
  DEPLOYMENT_ID: "prod",
  DOCKER_IMAGE: "example/game:v1",
  DOCKER_TOKEN: "",
  ADMIN_TOKEN: "x",
  API_KEY: "x",
  PUBLIC_HOST: "play.example.test",
  PUBLIC_PROTOCOL: "https",
  PUBLIC_PORT: "443",
  API_BASE_URL: "https://api.example.test",
  PROFILE_API_URL: "https://profile.example.test",
  PROFILE_INTERNAL_TOKEN: "x",
  JWT_ISSUER: "https://api.example.test",
  JWT_AUDIENCE: "example.test",
  STORAGE_ENDPOINT: "",
  STORAGE_ACCESS_KEY: "",
  STORAGE_SECRET_KEY: "",
  STORAGE_BUCKET: "",
  OTEL_USERNAME: "",
  OTEL_PASSWORD: "",
  OTEL_ENDPOINT: "",
  OTEL_EXPORTER_OTLP_ENDPOINT: "https://otel.example.test",
  OTEL_AUTH_HEADER: "x",
  BASIC_AUTH_USER: "",
  BASIC_AUTH_PASS: "",
  FEEDBACK_WEBHOOK_URL: "",
  FEEDBACK_TELEGRAM_TOKEN: "x",
  FEEDBACK_TELEGRAM_CHAT_ID: "x",
  TELEGRAM_PROXY_URL: "https://proxy.example.test",
};

const DEAD_KEYS = [
  "BASIC_AUTH_PASS",
  "BASIC_AUTH_USER",
  "DOCKER_TOKEN",
  "OTEL_ENDPOINT",
  "OTEL_PASSWORD",
  "OTEL_USERNAME",
];
const SHIPPED_OPTIONAL = [
  "FEEDBACK_WEBHOOK_URL",
  "STORAGE_ACCESS_KEY",
  "STORAGE_BUCKET",
  "STORAGE_ENDPOINT",
  "STORAGE_SECRET_KEY",
];
const URL_KEYS = ["API_BASE_URL", "JWT_ISSUER", "PROFILE_API_URL"];

// ── Temp dirs ─────────────────────────────────────────────────────────────────
const temps: string[] = [];
function tempDir(prefix = "config-values-"): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  temps.push(dir);
  return dir;
}
afterAll(() => {
  for (const dir of temps) fs.rmSync(dir, { recursive: true, force: true });
});

/** The shipped allowlist plus extra entries, written to a temp file. */
function allowlistWith(extra: object[]): string {
  const parsed = JSON.parse(fs.readFileSync(REAL_ALLOWLIST, "utf8")) as {
    allow: object[];
  };
  const file = path.join(tempDir(), "allowlist.json");
  fs.writeFileSync(
    file,
    JSON.stringify({ allow: [...parsed.allow, ...extra] }, null, 2),
  );
  return file;
}

// ── A small synthetic repo (for the heredoc-shape and allowlist-semantics tests) ──
const FIXTURE_ALLOWLIST = {
  allow: [
    {
      name: "OPT_KEY",
      pipeline: "game",
      class: "optional",
      phase: 2,
      reason: "Fixture: blank allowed by recorded decision.",
    },
  ],
};

function fixture(
  overrides: Record<string, string | null> = {},
  allowlist: object = FIXTURE_ALLOWLIST,
): string {
  const root = tempDir("config-values-fixture-");
  const files: Record<string, string | null> = {
    "src/server/Server.ts": [
      "const env = process.env.GAME_ENV;",
      "const token = process.env.GAME_TOKEN;",
      "const host = process.env.GAME_HOST;",
      "const opt = process.env.OPT_KEY;",
      "export { env, token, host, opt };",
    ].join("\n"),
    "deploy.sh": [
      "#!/bin/bash",
      "cat > ${ENV_FILE} << 'EOL'",
      "GAME_ENV=${ENV}",
      "GAME_TOKEN=${GAME_TOKEN}",
      "GAME_HOST=$GAME_HOST",
      "OPT_KEY=${OPT_KEY}",
      "DEAD_ONE=${DEAD_ONE}",
      "EOL",
    ].join("\n"),
    "update.sh": "echo updating",
    Dockerfile: "FROM node:24-slim",
    "scripts/config-parity-allowlist.json": JSON.stringify(allowlist, null, 2),
    ...overrides,
  };
  for (const [rel, content] of Object.entries(files)) {
    if (content === null) continue;
    const full = path.join(root, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content + "\n");
  }
  return root;
}

const FIXTURE_CLEAN: Record<string, string> = {
  ENV: "prod",
  GAME_TOKEN: "x",
  GAME_HOST: "h.example.test",
  OPT_KEY: "x",
  DEAD_ONE: "x",
};

// If the library flag in check-config-values.mjs is ever lost, the parity checker's main()
// runs too. It rejects the value checker's arguments with a usage error on stdout spelled
// `config-parity guard: …`; had it accepted them, its report header would read
// `config parity guard`. Match both (review 0064 R22: the header-only check never fired).
const PARITY_OUTPUT = /config[- ]parity guard/;

// ── A. --list-sources ─────────────────────────────────────────────────────────
describe("A — --list-sources", () => {
  it("lists exactly the real deploy.sh heredoc's 29 value sources, sorted", () => {
    const result = runValues(["--list-sources"]);
    expect(result.status).toBe(0);
    expect(result.stdout.trim().split("\n")).toEqual(
      Object.keys(CLEAN_PROD).sort(),
    );
    expect(result.stdout).not.toMatch(PARITY_OUTPUT);
  });

  it("accepts $NAME and ${NAME}; a non-plain right-hand side is excluded, then VALUE-UNKNOWN", () => {
    const root = fixture({
      "deploy.sh": [
        "cat > ${ENV_FILE} << 'EOL'",
        "GAME_ENV=${ENV}",
        "GAME_TOKEN=${GAME_TOKEN:-fallback}",
        "GAME_HOST=$GAME_HOST",
        "EOL",
      ].join("\n"),
    });
    const listed = runValues(["--list-sources", `--repo-root=${root}`]);
    expect(listed.status).toBe(0);
    expect(listed.stdout).toBe("ENV\nGAME_HOST\n");

    const result = check(FIXTURE_CLEAN, "prod", [`--repo-root=${root}`]);
    expect(result.valueUnknown).toHaveLength(1);
    expect(result.valueUnknown[0]).toContain("GAME_TOKEN");
    expect(result.valueUnknown[0]).toContain("not a plain ${NAME}");
    // Never the line's text: the default could be a literal value.
    expect(result.valueUnknown[0]).not.toContain("fallback");
  });

  it("a heredoc parse failure exits 1 with an EMPTY stdout", () => {
    const root = fixture({
      "deploy.sh": [
        "cat > ${ENV_FILE} << 'EOL'",
        "GAME_ENV=${ENV}",
        "  GAME_TOKEN=${GAME_TOKEN}",
        "EOL",
      ].join("\n"),
    });
    const result = runValues(["--list-sources", `--repo-root=${root}`]);
    expect(result.status).toBe(1);
    expect(result.stdout).toBe("");
    expect(result.stderr).toContain("GAME_TOKEN");

    const missing = runValues(["--list-sources", "--deploy-sh=nope.sh"]);
    expect(missing.status).toBe(1);
    expect(missing.stdout).toBe("");
  });
});

// ── B. Verification step 2 — task 0063's shape ────────────────────────────────
describe("B — prod format rules (verification step 2, 0063's shape)", () => {
  it("JWT_ISSUER=http://10.1.2.3 is REQUIRED on both rules", () => {
    const result = check({ ...CLEAN_PROD, JWT_ISSUER: "http://10.1.2.3" });
    expect(requiredNames(result)).toEqual(["JWT_ISSUER"]);
    expect(rulesOf(result, "JWT_ISSUER")).toEqual(["not-https", "bare-ip"]);
    expect(result.required[0].detail).toBe(
      "must be an https URL — it is not; must not be a bare IP address — its host is an IP literal",
    );
  });

  it("PUBLIC_PROTOCOL=http is REQUIRED; so is a case variant", () => {
    for (const value of ["http", "HTTPS"]) {
      const result = check({ ...CLEAN_PROD, PUBLIC_PROTOCOL: value });
      expect(requiredNames(result)).toEqual(["PUBLIC_PROTOCOL"]);
      expect(rulesOf(result, "PUBLIC_PROTOCOL")).toEqual([
        "protocol-not-https",
      ]);
    }
    // Trimmed first, like the application.
    expect(
      requiredNames(check({ ...CLEAN_PROD, PUBLIC_PROTOCOL: " https " })),
    ).toEqual([]);
  });

  it.each([
    ["https://1.2.3", ["bare-ip"]],
    ["https://2130706433", ["bare-ip"]],
    ["https://[::1]", ["bare-ip"]],
    ["https://10.1.2.3:8443/path", ["bare-ip"]],
    ["HTTPS://api.example.test", ["not-https"]],
    ["http://api.example.test", ["not-https"]],
    ["not a url", ["not-https", "not-a-url"]],
  ])("each URL key: %s → %j", (value, rules) => {
    const values = { ...CLEAN_PROD };
    for (const key of URL_KEYS) values[key] = value;
    const result = check(values);
    expect(requiredNames(result)).toEqual([...URL_KEYS].sort());
    for (const key of URL_KEYS) expect(rulesOf(result, key)).toEqual(rules);
  });

  it("an https URL with a DNS host is OK", () => {
    const result = check(CLEAN_PROD);
    for (const key of [...URL_KEYS, "PUBLIC_PROTOCOL"])
      expect(result.ok).toContain(key);
  });

  it("the same http / bare-IP values under staging and dev raise no finding", () => {
    const values = { ...CLEAN_PROD, PUBLIC_PROTOCOL: "http" };
    for (const key of URL_KEYS) values[key] = "http://10.1.2.3";
    for (const env of ["staging", "dev"]) {
      const result = check({ ...values, ENV: env }, env);
      expect(result.required).toEqual([]);
      expect(result.notJudged).toContain("JWT_ISSUER");
    }
  });
});

// ── C. Verification steps 1 (non-empty half) and 3 ────────────────────────────
describe("C — non-empty rule (verification steps 1 and 3)", () => {
  it("a generic empty value is REQUIRED — forwarded but EMPTY; whitespace-only counts as empty", () => {
    for (const value of ["", "  \t "]) {
      const result = check({ ...CLEAN_PROD, API_KEY: value });
      expect(requiredNames(result)).toEqual(["API_KEY"]);
      expect(result.required[0]).toEqual({
        name: "API_KEY",
        rules: ["empty"],
        detail: "forwarded but EMPTY",
      });
    }
  });

  it("an empty required key gets only the EMPTY finding, not a format one too", () => {
    const result = check({ ...CLEAN_PROD, JWT_ISSUER: "" });
    expect(rulesOf(result, "JWT_ISSUER")).toEqual(["empty"]);
  });

  it("owner ruling 2026-09-23: a blank PROFILE_INTERNAL_TOKEN is REQUIRED with the SHIPPED allowlist", () => {
    const result = check({ ...CLEAN_PROD, PROFILE_INTERNAL_TOKEN: "" });
    expect(requiredNames(result)).toEqual(["PROFILE_INTERNAL_TOKEN"]);
    expect(rulesOf(result, "PROFILE_INTERNAL_TOKEN")).toEqual(["empty"]);
    const text = runValues(
      ["--values-stdin", "--deploy-env=prod"],
      stream({ ...CLEAN_PROD, PROFILE_INTERNAL_TOKEN: "" }),
    );
    expect(text.stdout).toContain(
      "PROFILE_INTERNAL_TOKEN — forwarded but EMPTY",
    );
  });

  it("an `optional` value entry WOULD suppress it — the mechanism works, the entry is just absent", () => {
    const allowlist = allowlistWith([
      {
        name: "PROFILE_INTERNAL_TOKEN",
        pipeline: "game",
        class: "optional",
        phase: 2,
        reason:
          "Fixture: prove an optional value entry turns a blank into OPTIONAL.",
      },
    ]);
    const values = { ...CLEAN_PROD, PROFILE_INTERNAL_TOKEN: "" };
    const result = check(values, "prod", [`--allowlist=${allowlist}`]);
    expect(result.required).toEqual([]);
    expect(result.optional.map((o) => o.name)).toContain(
      "PROFILE_INTERNAL_TOKEN",
    );
    const enforced = runValues(
      [
        "--values-stdin",
        "--deploy-env=prod",
        "--enforce",
        `--allowlist=${allowlist}`,
      ],
      stream(values),
    );
    expect(enforced.status).toBe(0);
    expect(enforced.stdout).toMatch(
      /OPTIONAL {2}\d+\n(?: {10}.*\n)* {10}PROFILE_INTERNAL_TOKEN — blank by recorded decision/,
    );
  });

  it("owner ruling 2026-09-23: under staging and dev an empty required value raises no finding", () => {
    for (const env of ["staging", "dev"]) {
      const values = {
        ...CLEAN_PROD,
        ENV: env,
        API_KEY: "",
        PROFILE_INTERNAL_TOKEN: "",
      };
      const result = check(values, env);
      expect(result.required).toEqual([]);
      expect(result.notJudged).toEqual(
        expect.arrayContaining(["API_KEY", "PROFILE_INTERNAL_TOKEN"]),
      );
      const enforced = runValues(
        ["--values-stdin", `--deploy-env=${env}`, "--enforce"],
        stream(values),
      );
      expect(enforced.status).toBe(0);
      expect(enforced.stdout).toContain(
        "value rules apply to prod deploys only",
      );
    }
    // The same values under prod DO fire — the rule is prod-scoped, not absent.
    const prod = check({
      ...CLEAN_PROD,
      API_KEY: "",
      PROFILE_INTERNAL_TOKEN: "",
    });
    expect(requiredNames(prod)).toEqual(["API_KEY", "PROFILE_INTERNAL_TOKEN"]);
  });
});

// ── D. Verification step 4 — a clean configuration is clean ────────────────────
describe("D — clean prod-shaped configuration (verification step 4)", () => {
  it("REQUIRED 0, nothing unknown, and --enforce exits 0", () => {
    const result = check(CLEAN_PROD);
    expect(result.required).toEqual([]);
    expect(result.valueUnknown).toEqual([]);
    expect(result.parseFailures).toEqual([]);
    expect(result.skips).toEqual([]);
    expect(result.deadKeyExemption.applied).toBe(true);
    expect(result.optional.map((o) => o.name).sort()).toEqual(SHIPPED_OPTIONAL);
    expect([...result.unchecked].sort()).toEqual(DEAD_KEYS);
    // 30 heredoc keys = 19 OK + 5 OPTIONAL + 6 UNCHECKED.
    expect(result.ok).toHaveLength(19);

    const enforced = runValues(
      ["--values-stdin", "--deploy-env=prod", "--enforce"],
      stream(CLEAN_PROD),
    );
    expect(enforced.status).toBe(0);
    expect(enforced.stdout).toContain("REQUIRED  0");
    expect(enforced.stdout).toContain("enforce — no required findings");
  });
});

// ── E. Verification step 5 — allowlist semantics for values ───────────────────
describe("E — allowlist semantics for values (verification step 5)", () => {
  it("a blank optional key does not fire; a blank unlisted key does", () => {
    const root = fixture();
    const result = check(
      { ...FIXTURE_CLEAN, OPT_KEY: "", GAME_TOKEN: "" },
      "prod",
      [`--repo-root=${root}`],
    );
    expect(requiredNames(result)).toEqual(["GAME_TOKEN"]);
    expect(result.optional).toEqual([
      { name: "OPT_KEY", reason: "blank by recorded decision" },
    ]);
  });

  it("an optional entry allows BLANK only — a non-empty value still meets the format rules", () => {
    const root = fixture(
      {
        "deploy.sh": [
          "cat > ${ENV_FILE} << 'EOL'",
          "JWT_ISSUER=${JWT_ISSUER}",
          "EOL",
        ].join("\n"),
        "src/server/Server.ts":
          "const i = process.env.JWT_ISSUER;\nexport { i };",
      },
      {
        allow: [
          {
            name: "JWT_ISSUER",
            pipeline: "game",
            class: "optional",
            phase: 2,
            reason: "Fixture.",
          },
        ],
      },
    );
    const blank = check({ JWT_ISSUER: "" }, "prod", [`--repo-root=${root}`]);
    expect(blank.required).toEqual([]);
    const bad = check({ JWT_ISSUER: "http://10.1.2.3" }, "prod", [
      `--repo-root=${root}`,
    ]);
    expect(requiredNames(bad)).toEqual(["JWT_ISSUER"]);
  });

  it("a phase-1 entry and a PROFILE phase-2 entry do not exempt a game value", () => {
    for (const entry of [
      { pipeline: "game", class: "optional", phase: 1 },
      { pipeline: "profile", class: "optional", phase: 2 },
    ]) {
      const root = fixture(
        {},
        {
          allow: [
            ...FIXTURE_ALLOWLIST.allow,
            { name: "GAME_TOKEN", reason: "Fixture.", ...entry },
          ],
        },
      );
      const result = check({ ...FIXTURE_CLEAN, GAME_TOKEN: "" }, "prod", [
        `--repo-root=${root}`,
      ]);
      expect(requiredNames(result)).toEqual(["GAME_TOKEN"]);
    }
  });

  it("a dead key (the parity guard's INFO) is UNCHECKED, even when blank", () => {
    const root = fixture();
    const result = check({ ...FIXTURE_CLEAN, DEAD_ONE: "" }, "prod", [
      `--repo-root=${root}`,
    ]);
    expect(result.unchecked).toEqual(["DEAD_ONE"]);
    expect(result.required).toEqual([]);
  });

  it("an incomplete parity analysis (DYNAMIC-READ) turns the dead-key exemption OFF, and says so", () => {
    const root = fixture({
      "src/server/Dyn.ts":
        "const k = 'A';\nconst v = process.env[k];\nexport { v };",
    });
    const values = { ...FIXTURE_CLEAN, DEAD_ONE: "" };
    const result = check(values, "prod", [`--repo-root=${root}`]);
    expect(result.deadKeyExemption.applied).toBe(false);
    expect(result.unchecked).toEqual([]);
    expect(requiredNames(result)).toEqual(["DEAD_ONE"]);
    const text = runValues(
      ["--values-stdin", "--deploy-env=prod", `--repo-root=${root}`],
      stream(values),
    );
    expect(text.stdout).toContain(
      "NOTE  the parity analysis is incomplete (0 parse failure(s), 1 blind spot(s), 0 skip(s))",
    );
  });

  it("a game phase-2 entry whose class is not `optional` is a PARSE-FAILURE", () => {
    const root = fixture(
      {},
      {
        allow: [
          {
            name: "OPT_KEY",
            pipeline: "game",
            class: "dead-config",
            phase: 2,
            reason: "Fixture.",
          },
        ],
      },
    );
    const result = check({ ...FIXTURE_CLEAN, OPT_KEY: "" }, "prod", [
      `--repo-root=${root}`,
    ]);
    expect(result.parseFailures.join("\n")).toContain(
      "OPT_KEY is a game phase-2 entry of class 'dead-config'",
    );
    // And it exempts nothing.
    expect(requiredNames(result)).toEqual(["OPT_KEY"]);
  });

  it("a stale game phase-2 entry (key not forwarded) is INFO", () => {
    const root = fixture(
      {},
      {
        allow: [
          ...FIXTURE_ALLOWLIST.allow,
          {
            name: "NOT_FORWARDED",
            pipeline: "game",
            class: "optional",
            phase: 2,
            reason: "Fixture.",
          },
        ],
      },
    );
    const result = check(FIXTURE_CLEAN, "prod", [`--repo-root=${root}`]);
    expect(result.info).toHaveLength(1);
    expect(result.info[0]).toContain("NOT_FORWARDED");
    expect(result.info[0]).toContain("stale entry");
  });

  it("invalid allowlist JSON is a PARSE-FAILURE; a missing one is a SKIP", () => {
    const bad = fixture({
      "scripts/config-parity-allowlist.json": "{ not json",
    });
    expect(
      check(FIXTURE_CLEAN, "prod", [`--repo-root=${bad}`]).parseFailures.join(
        "\n",
      ),
    ).toContain("allowlist: invalid JSON");
    const missing = fixture({ "scripts/config-parity-allowlist.json": null });
    expect(
      check(FIXTURE_CLEAN, "prod", [`--repo-root=${missing}`]).skips,
    ).toContain("scripts/config-parity-allowlist.json not found");
  });
});

// ── F. Verification step 6 — the enforce half of the exit contract ─────────────
describe("F — exit contract (verification step 6, enforce half)", () => {
  const cases: [string, string[], string][] = [
    ["a REQUIRED finding", [], stream({ ...CLEAN_PROD, API_KEY: "" })],
    [
      "a source missing from stdin (VALUE-UNKNOWN)",
      [],
      stream(
        Object.fromEntries(
          Object.entries(CLEAN_PROD).filter(([k]) => k !== "API_KEY"),
        ),
      ),
    ],
    ["an odd-field stream", [], "ENV\0prod\0API_KEY\0"],
    ["a duplicate name", [], stream(CLEAN_PROD) + "API_KEY\0x\0"],
    ["an unterminated stream", [], stream(CLEAN_PROD) + "API_KEY\0x"],
    [
      "a missing deploy.sh (SKIP)",
      ["--deploy-sh=does-not-exist.sh"],
      stream(CLEAN_PROD),
    ],
  ];

  it.each(cases)(
    "%s: report-only exits 0, --enforce exits 1, footers agree",
    (_label, extra, input) => {
      const reportOnly = runValues(
        ["--values-stdin", "--deploy-env=prod", "--report-only", ...extra],
        input,
      );
      expect(reportOnly.status).toBe(0);
      expect(reportOnly.stdout).toContain(
        "report-only — exit 0, this cannot fail a deploy",
      );
      const enforced = runValues(
        ["--values-stdin", "--deploy-env=prod", "--enforce", ...extra],
        input,
      );
      expect(enforced.status).toBe(1);
      expect(enforced.stdout).toContain(
        "enforce — failing on the findings above",
      );
    },
  );

  it("a malformed stream judges nothing and says so in fixed wording", () => {
    const result = check({}, "prod");
    // An empty stream is well formed: every one of the 30 heredoc lines then names a
    // missing source (GAME_ENV and ENVIRONMENT both read ENV, so 30 lines, 29 sources).
    expect(result.valueUnknown).toHaveLength(30);
    const malformed = runValues(
      ["--values-stdin", "--deploy-env=prod", "--json"],
      "ENV\0prod\0API_KEY\0",
    );
    const parsed = JSON.parse(malformed.stdout) as ValueResult;
    expect(parsed.valueUnknown).toEqual([
      "the value stream on stdin is malformed (it holds an odd number of fields) — no value was judged",
    ]);
    expect(parsed.ok).toEqual([]);
    expect(parsed.required).toEqual([]);
  });

  it("a clean input exits 0 under --enforce, and the footer says so", () => {
    const enforced = runValues(
      ["--values-stdin", "--deploy-env=prod", "--enforce"],
      stream(CLEAN_PROD),
    );
    expect(enforced.status).toBe(0);
    expect(enforced.stdout).toContain("enforce — no required findings");
    expect(enforced.stdout).not.toContain("failing");
  });

  it.each([
    [["--values-stdin"]],
    [["--values-stdin", "--deploy-env=production"]],
    [["--values-stdin", "--deploy-env="]],
    [["--deploy-env=prod"]],
    [["--list-sources", "--values-stdin", "--deploy-env=prod"]],
    [["--values-stdin", "--deploy-env=prod", "--bogus"]],
  ])("bad or missing arguments exit 2: %j", (args) => {
    const result = runValues(args, stream(CLEAN_PROD));
    expect(result.status).toBe(2);
    expect(result.stderr).toContain("usage:");
  });
});

// ── G. Verification step 7 — the no-leak guarantee ────────────────────────────
describe("G — no value ever reaches the output (verification step 7)", () => {
  const LEAK_IP = "10.93.71.44";
  const URLISH = new Set([
    ...URL_KEYS,
    "OTEL_EXPORTER_OTLP_ENDPOINT",
    "TELEGRAM_PROXY_URL",
    "FEEDBACK_WEBHOOK_URL",
    "STORAGE_ENDPOINT",
  ]);

  function canaries(): { values: Record<string, string>; all: string[] } {
    const salt = `${Math.random().toString(16).slice(2)}${Date.now()}`;
    const values: Record<string, string> = {};
    const all: string[] = [];
    Object.keys(CLEAN_PROD).forEach((name, i) => {
      const canary = `cnry${i}z${salt}`;
      all.push(canary);
      // A URL canary sits in the userinfo AND the path, on a canary-ish IP, so every
      // format rule fires and every excerpt a careless message might take is poisoned.
      values[name] = URLISH.has(name)
        ? `http://u${canary}:p${canary}@${LEAK_IP}/${canary}?q=${canary}`
        : canary;
    });
    return { values, all };
  }

  function expectClean(run: Run, all: string[]): void {
    for (const canary of all) {
      expect(run.stdout).not.toContain(canary);
      expect(run.stderr).not.toContain(canary);
    }
    expect(run.stdout).not.toContain(LEAK_IP);
    expect(run.stderr).not.toContain(LEAK_IP);
    expect(run.stdout).not.toMatch(PARITY_OUTPUT);
    expect(run.stderr).not.toMatch(PARITY_OUTPUT);
  }

  it("text and JSON, prod and staging: no canary, no IP, but a real report", () => {
    const { values, all } = canaries();
    for (const env of ["prod", "staging"]) {
      for (const format of [[], ["--json"]]) {
        const run = runValues(
          ["--values-stdin", `--deploy-env=${env}`, ...format],
          stream(values),
        );
        expect(run.status).toBe(0);
        expectClean(run, all);
        // Not vacuous: the findings really were produced.
        if (env === "prod") expect(run.stdout).toContain("JWT_ISSUER");
      }
    }
  });

  it("the malformed-stream and duplicate-name paths never echo the stream", () => {
    const { values, all } = canaries();
    const good = stream(values);
    const [first] = all;
    for (const input of [
      good + `API_KEY\0${first}\0`, // duplicate name
      good + `${first}`, // unterminated
      `ENV\0${first}\0${first}\0`, // odd field count, canary in a name slot
      `bad-${first}\0${first}\0`, // a value where a name belongs
    ]) {
      for (const format of [[], ["--json"]]) {
        const run = runValues(
          ["--values-stdin", "--deploy-env=prod", ...format],
          input,
        );
        expect(run.status).toBe(0);
        expectClean(run, all);
        expect(run.stdout).toContain("malformed");
      }
    }
  });

  it("STATIC: the value checker never performs an environment member read", () => {
    const source = fs.readFileSync(VALUES_CHECKER, "utf8");
    expect(source).not.toMatch(/process\.env/);
  });

  it("STATIC: the value checker references no dotfile env path", () => {
    const source = fs.readFileSync(VALUES_CHECKER, "utf8");
    expect(source).not.toMatch(/["'`]\.env\b/);
    expect(source).not.toMatch(/\.env\.secret/);
    expect(source).not.toMatch(/\.env\.profile/);
  });
});

// ── H. deploy.sh wiring — the real function, under the owner's /bin/bash ───────
describe("H — deploy.sh run_config_value_guard, extracted and run under /bin/bash", () => {
  const BASH = "/bin/bash";
  // awk takes the function from its `name() {` line to the first `}` at column 0 (the
  // tests/profile-backup-redeploy.sh precedent). $1 is the file to extract from; $0 is
  // what the function sees as the deploy script's own path.
  const EXTRACT = [
    `eval "$(awk '/^run_config_value_guard\\(\\) \\{/,/^\\}/' "$1")"`,
    "declare -F run_config_value_guard >/dev/null || { echo EXTRACT-FAILED; exit 97; }",
  ].join("\n");

  function shellAssignments(values: Record<string, string>): string {
    // Plain assignments: NOT exported — the reason values travel on stdin.
    return Object.entries(values)
      .map(([name, value]) => `${name}='${value.replace(/'/g, "'\\''")}'`)
      .join("\n");
  }

  function runGuard(scriptPath: string, body: string, cwd: string): Run {
    const result = spawnSync(
      BASH,
      ["-c", `${EXTRACT}\n${body}`, scriptPath, REAL_DEPLOY_SH],
      {
        encoding: "utf8",
        cwd,
        // A minimal environment: nothing the test sets is exported.
        env: {
          PATH: `${path.dirname(process.execPath)}:/usr/bin:/bin`,
          HOME: os.homedir(),
        },
      },
    );
    return {
      status: result.status ?? -1,
      stdout: result.stdout ?? "",
      stderr: result.stderr ?? "",
    };
  }

  const bashAvailable = fs.existsSync(BASH);
  const maybe = bashAvailable ? it : it.skip;

  maybe(
    "a prod-shaped run with NON-exported variables names the findings and exits 0",
    () => {
      const canary = `cnryH${Math.random().toString(16).slice(2)}`;
      const values = {
        ...CLEAN_PROD,
        ADMIN_TOKEN: canary,
        JWT_ISSUER: "http://10.1.2.3",
        PROFILE_INTERNAL_TOKEN: "",
      };
      const run = runGuard(
        REAL_DEPLOY_SH,
        `${shellAssignments(values)}\nrun_config_value_guard\necho "guard-exit=$?"`,
        tempDir(),
      );
      expect(run.stdout).not.toContain("EXTRACT-FAILED");
      expect(run.stdout).toContain(
        "config value guard (report-only) · deploy env: prod",
      );
      expect(run.stdout).toMatch(
        /REQUIRED {2}2\n {10}PROFILE_INTERNAL_TOKEN — forwarded but EMPTY\n {10}JWT_ISSUER — must be an https URL — it is not; must not be a bare IP address — its host is an IP literal\n/,
      );
      expect(run.stdout).toContain("OPTIONAL  5");
      expect(run.stdout).not.toContain("VALUE-UNKNOWN");
      expect(run.stdout).toContain("guard-exit=0");
      expect(run.stdout + run.stderr).not.toContain(canary);
      expect(run.stdout + run.stderr).not.toContain("10.1.2.3");
    },
  );

  maybe("with the checker absent it skips silently and returns 0", () => {
    const dir = tempDir();
    const run = runGuard(
      path.join(dir, "deploy.sh"),
      'run_config_value_guard\necho "guard-exit=$?"',
      dir,
    );
    expect(run.stdout).toBe("guard-exit=0\n");
    expect(run.stderr).toBe("");
  });

  maybe("a hostile source name from --list-sources is never evaluated", () => {
    // ${!name} on `a[$(cmd)]` evaluates the subscript and RUNS cmd under bash 3.2. The
    // name regex in deploy.sh is what stops it; this proves it (mutation-checked).
    const dir = tempDir();
    fs.mkdirSync(path.join(dir, "scripts"));
    fs.writeFileSync(
      path.join(dir, "scripts", "check-config-values.mjs"),
      [
        'import fs from "node:fs";',
        'if (process.argv.includes("--list-sources")) {',
        '  process.stdout.write("a[$(touch PWNED)]\\nFOO\\n");',
        "} else {",
        "  const chunks = [];",
        "  for await (const c of process.stdin) chunks.push(c);",
        '  fs.writeFileSync("received.bin", Buffer.concat(chunks));',
        "}",
      ].join("\n"),
    );
    const run = runGuard(
      path.join(dir, "deploy.sh"),
      'FOO=bar\nrun_config_value_guard\necho "guard-exit=$?"',
      dir,
    );
    expect(run.stdout).toContain("guard-exit=0");
    expect(fs.existsSync(path.join(dir, "PWNED"))).toBe(false);
    // Not vacuous: the loop really ran, and only the valid name went through.
    expect(fs.readFileSync(path.join(dir, "received.bin"), "utf8")).toBe(
      "FOO\0bar\0",
    );
  });

  it("deploy.sh calls the guard once, right before the ssh", () => {
    const text = fs.readFileSync(REAL_DEPLOY_SH, "utf8");
    const calls = text.match(/^run_config_value_guard \|\| true$/gm) ?? [];
    expect(calls).toHaveLength(1);
    const call = text.indexOf("\nrun_config_value_guard || true\n");
    const ssh = text.indexOf(
      'print_header "EXECUTING UPDATE SCRIPT ON SERVER"',
    );
    const lastLoad = text.lastIndexOf('load_env_file ".env.');
    expect(call).toBeGreaterThan(lastLoad);
    expect(call).toBeLessThan(ssh);
    expect(text.slice(call, ssh).trim()).toBe("run_config_value_guard || true");
  });
});

// ── I. Real tree ──────────────────────────────────────────────────────────────
describe("I — real tree", () => {
  it("every game phase-2 entry names a forwarded heredoc key, and every heredoc line is judgeable", () => {
    const result = check(CLEAN_PROD);
    expect(result.info).toEqual([]);
    expect(result.valueUnknown).toEqual([]);
    expect(result.parseFailures).toEqual([]);
    expect(result.skips).toEqual([]);
  });

  it("the shipped game value entries are exactly the five approved ones — no PROFILE_INTERNAL_TOKEN", () => {
    const parsed = JSON.parse(fs.readFileSync(REAL_ALLOWLIST, "utf8")) as {
      allow: {
        name: string;
        pipeline: string;
        class: string;
        phase?: number;
      }[];
    };
    const valueEntries = parsed.allow.filter(
      (e) => e.pipeline === "game" && e.phase === 2,
    );
    expect(valueEntries.map((e) => e.name).sort()).toEqual(SHIPPED_OPTIONAL);
    for (const entry of valueEntries) expect(entry.class).toBe("optional");
  });
});
