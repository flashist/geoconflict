import { spawnSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

// Regression + class guard for the profile deploy's "fail closed" invariants. Process
// review #11 found the flock-unavailable path WARNED AND CONTINUED instead of aborting,
// silently violating the serialization guarantee the fixed-name rollback backups depend
// on (setup-profile.sh:241-243). Every prior round (#7-10) fixed one such fail-open
// instance and the next round found another. These tests lock the WHOLE class:
//   1. flock is fail-closed (no warn-and-continue path; aborts before any write).
//   2. the ONLY sanctioned warn-and-continue branch is the swap cushion (an OOM
//      cushion, deliberately non-fatal) — any NEW fail-open branch fails this test.
//   3. the rollback-protected section ends at the cron write; nothing fallible runs
//      after it, which is WHY the systemd/cron writes need no rollback entry. If a
//      future edit adds a fallible step in that tail, this test forces extending the
//      rollback.
//   4. build-deploy never builds an image from an empty version tag.

const REPO_ROOT = path.join(__dirname, "..", "..");
const SETUP_PROFILE = path.join(REPO_ROOT, "setup-profile.sh");
const BUILD_DEPLOY_PROFILE = path.join(REPO_ROOT, "build-deploy-profile.sh");

const setupLines = fs.readFileSync(SETUP_PROFILE, "utf8").split("\n");
const buildLines = fs.readFileSync(BUILD_DEPLOY_PROFILE, "utf8").split("\n");

const firstIndex = (lines: string[], re: RegExp) =>
  lines.findIndex((l) => re.test(l));

describe("setup-profile.sh — flock serialization is fail-closed", () => {
  test("a missing flock ABORTS (exit 1) and has no warn-and-continue fall-through", () => {
    // The lock gate has two checks: an install attempt, then a fail-closed guard.
    const flockChecks = setupLines
      .map((l, i) => ({ l, i }))
      .filter(({ l }) =>
        /if ! command -v flock >\/dev\/null 2>&1; then/.test(l),
      );
    expect(flockChecks.length).toBeGreaterThanOrEqual(2);

    // The fail-closed guard (the second check) must reach `exit 1` within its block,
    // before the lock is ever acquired.
    const guardIdx = flockChecks[1].i;
    const idxExec = firstIndex(
      setupLines,
      /^exec 9>\/var\/lock\/profile-deploy\.lock$/,
    );
    expect(idxExec).toBeGreaterThan(guardIdx);
    const guardBlock = setupLines.slice(guardIdx, idxExec).join("\n");
    expect(guardBlock).toMatch(/flock \(util-linux\) is required/);
    expect(guardBlock).toMatch(/\bexit 1\b/);

    // The old fail-open wording must be gone for good.
    expect(
      setupLines.some((l) => /proceeding WITHOUT deploy serialization/.test(l)),
    ).toBe(false);
  });

  test("the flock check runs before the rollback trap and the first config write", () => {
    const idxFlock = firstIndex(
      setupLines,
      /if ! command -v flock >\/dev\/null 2>&1; then/,
    );
    const idxTrap = firstIndex(setupLines, /^trap rollback_deploy EXIT$/);
    const idxFirstWrite = firstIndex(
      setupLines,
      /> "\$PROFILE_DIR\/profile\.env"/,
    );

    expect(idxFlock).toBeGreaterThanOrEqual(0);
    expect(idxTrap).toBeGreaterThanOrEqual(0);
    expect(idxFirstWrite).toBeGreaterThanOrEqual(0);

    // flock gate < trap install < first destructive write.
    expect(idxFlock).toBeLessThan(idxTrap);
    expect(idxTrap).toBeLessThan(idxFirstWrite);
  });
});

describe("setup-profile.sh — fail-open allow-list (the class guard)", () => {
  test("the ONLY sanctioned warn-and-continue branch is the swap cushion", () => {
    // A warn-and-continue branch = a warning marker (⚠️) paired with continue-semantics.
    // (The rollback announcement also uses ⚠️ but has no continue-semantics, so it is
    // correctly excluded.) Swap is the deliberate exception: an OOM cushion, not a
    // correctness invariant — see the product decision recorded in this round.
    const failOpenLines = setupLines.filter((l) =>
      /⚠️.*(continuing|WITHOUT|proceeding)/.test(l),
    );
    // The swap warning must exist (proves the signature is matching something)...
    expect(failOpenLines.length).toBeGreaterThanOrEqual(1);
    // ...and EVERY warn-and-continue line must be the swap cushion. A new fail-open
    // branch added by a future edit lands here and fails the test until it is either
    // made fail-closed or explicitly justified by widening this allow-list under review.
    for (const l of failOpenLines) {
      expect(l).toMatch(/swap/i);
    }
  });
});

describe("setup-profile.sh — the rollback-protected tail ends at the cron write", () => {
  test("no fallible command runs between the cron write and DEPLOY_VALIDATED=1", () => {
    // systemd (610) and cron (640) are the last host-state writes, and the EXIT rollback
    // intentionally does NOT revert them. That is only safe because nothing fallible runs
    // after them: the realistic late failures (health gate / nginx -t / certbot) all occur
    // earlier and ARE covered by the trap. Lock that fact: the cron section's final write
    // (chmod) must be followed only by echoes/assignments until validation.
    const idxCronChmod = firstIndex(setupLines, /^chmod 644 "\$CRON_FILE"$/);
    const idxValidated = firstIndex(setupLines, /^DEPLOY_VALIDATED=1$/);
    expect(idxCronChmod).toBeGreaterThanOrEqual(0);
    expect(idxValidated).toBeGreaterThan(idxCronChmod);

    const FALLIBLE =
      /^(cat|cp|mv|rm|docker|systemctl|certbot|nginx|ufw|apt-get|ln|chmod|curl|mkswap|swapon|fallocate|dd|getent|openssl|sysctl)\b/;
    const offenders: string[] = [];
    for (let i = idxCronChmod + 1; i < idxValidated; i++) {
      const trimmed = setupLines[i].replace(/^\s+/, "");
      if (FALLIBLE.test(trimmed)) offenders.push(`${i + 1}: ${setupLines[i]}`);
    }
    // If this fails, a fallible step was added after the rollback-protected section —
    // extend rollback_deploy to revert it (or move it before the trap region).
    expect(offenders).toEqual([]);
  });
});

describe("build-deploy-profile.sh — never build from an empty version tag", () => {
  test("VERSION_TAG is validated non-empty before docker build", () => {
    const idxVersionTag = firstIndex(buildLines, /^VERSION_TAG=/);
    const idxValidation = firstIndex(buildLines, /if \[ -z "\$VERSION_TAG" \]/);
    // Anchor on the actual top-level command (column 0), not a comment that mentions it.
    const idxDockerBuild = firstIndex(buildLines, /^docker build\b/);

    expect(idxVersionTag).toBeGreaterThanOrEqual(0);
    expect(idxValidation).toBeGreaterThanOrEqual(0);
    expect(idxDockerBuild).toBeGreaterThanOrEqual(0);

    // assignment < non-empty guard < first build.
    expect(idxVersionTag).toBeLessThan(idxValidation);
    expect(idxValidation).toBeLessThan(idxDockerBuild);
  });
});

// Behavioral harness: replicate setup-profile.sh's fail-closed lock gate exactly, with
// flock made absent (PATH restricted to a stub dir) and apt-get stubbed to fail. A
// sentinel "config write" stands in for the first real write (profile.env) and must NOT
// run when flock is unavailable. The static tests above guarantee the real script keeps
// this shape; this proves the shape actually fails closed.
function runFlockGate(opts: { flockAvailable: boolean }): {
  code: number;
  configWritten: boolean;
} {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "flock-gate-"));
  const binDir = path.join(dir, "bin");
  fs.mkdirSync(binDir);

  // apt-get stub: always fails (simulates "util-linux cannot be installed").
  fs.writeFileSync(path.join(binDir, "apt-get"), "#!/bin/sh\nexit 1\n");
  fs.chmodSync(path.join(binDir, "apt-get"), 0o755);

  if (opts.flockAvailable) {
    // flock stub: lock acquisition succeeds.
    fs.writeFileSync(path.join(binDir, "flock"), "#!/bin/sh\nexit 0\n");
    fs.chmodSync(path.join(binDir, "flock"), 0o755);
  }

  const script = `
set -e
WORK="${dir}"
if ! command -v flock >/dev/null 2>&1; then
    apt-get update -y >/dev/null 2>&1 && apt-get install -y util-linux >/dev/null 2>&1 || true
fi
if ! command -v flock >/dev/null 2>&1; then
    echo "Error: flock required; aborting before any write" >&2
    exit 1
fi
exec 9>"$WORK/profile-deploy.lock"
flock -n 9 || { echo "Error: lock held" >&2; exit 1; }
echo CONFIG-WRITTEN > "$WORK/profile.env"
`;
  // PATH is restricted to the stub dir so the host's real flock (present on Linux CI,
  // absent on macOS) is invisible and the test is deterministic on both. command/echo/
  // exec/[ are bash builtins and need no PATH entry; the absolute interpreter path keeps
  // bash itself reachable despite the restricted PATH.
  const res = spawnSync("/bin/bash", ["-c", script], {
    encoding: "utf8",
    env: { PATH: binDir, HOME: dir },
  });
  const configWritten = fs.existsSync(path.join(dir, "profile.env"));
  fs.rmSync(dir, { recursive: true, force: true });
  return { code: res.status ?? -1, configWritten };
}

describe("setup-profile.sh — flock gate behavior (replicated harness)", () => {
  test("flock unavailable + install fails => aborts (exit 1) BEFORE writing config", () => {
    const { code, configWritten } = runFlockGate({ flockAvailable: false });
    expect(code).toBe(1);
    expect(configWritten).toBe(false);
  });

  test("flock available => acquires the lock and proceeds to write config", () => {
    const { code, configWritten } = runFlockGate({ flockAvailable: true });
    expect(code).toBe(0);
    expect(configWritten).toBe(true);
  });
});

// Process review #12 (finding #2): the T4/T5 contract says the box provides DATABASE_URL.
// Synthesizing it by raw interpolation of POSTGRES_PASSWORD is unsafe — a password with
// URL-special characters (/ # ? @ : % & = space, or UTF-8) yields a malformed/misparsed
// postgresql:// URL. The script must URL-ENCODE each component via urlencode(). These tests
// run the REAL urlencode() extracted from the script and prove every component round-trips
// back to its literal value through a URL parser's decodeURIComponent (how pg/Node decodes).
const setupScript = fs.readFileSync(SETUP_PROFILE, "utf8");
const urlencodeFn =
  setupScript.match(/urlencode\(\) \{[\s\S]*?\n\}/)?.[0] ?? "";

function bashUrlencode(input: string): string {
  const res = spawnSync(
    "/bin/bash",
    ["-c", `${urlencodeFn}\nurlencode "$1"`, "bash", input],
    { encoding: "utf8" },
  );
  if (res.status !== 0) throw new Error(`urlencode failed: ${res.stderr}`);
  return res.stdout;
}

describe("setup-profile.sh — DATABASE_URL is synthesized URL-encoded (contract + correctness)", () => {
  test("the script defines a urlencode() helper", () => {
    expect(urlencodeFn).toMatch(/^urlencode\(\) \{/);
  });

  test("DATABASE_URL synthesis URL-encodes the password (not raw interpolation)", () => {
    // The synthesized default must pass POSTGRES_PASSWORD through urlencode, never inline it.
    const synth = setupLines.find((l) =>
      /^DATABASE_URL="\$\{DATABASE_URL:-postgresql:\/\//.test(l),
    );
    expect(synth).toBeDefined();
    expect(synth).toMatch(/urlencode "\$POSTGRES_PASSWORD"/);
    expect(synth).not.toMatch(/:\$\{?POSTGRES_PASSWORD\}?@/); // no raw password in the URL
  });

  test("profile.env always emits a DATABASE_URL line (contract: box provides it)", () => {
    expect(
      setupLines.some((l) => /^DATABASE_URL=\$\{DATABASE_URL\}$/.test(l)),
    ).toBe(true);
  });

  test("urlencode round-trips adversarial passwords through a URL parser", () => {
    const passwords = [
      "p@ss/w#rd?%x",
      "a:b@c/d?e#f&g=h+i j",
      "üñîçødé✓",
      "quote'and\"dq",
      "$pec!al~tilde",
      "Ω≈ç√∫˜µ",
    ];
    for (const pw of passwords) {
      const encoded = bashUrlencode(pw);
      // 1. The raw URL-breaking characters must not survive unescaped in the password slot.
      expect(encoded).not.toMatch(/[/#?@]/);
      // 2. It must decode back to the exact original (this is what pg's parser does).
      expect(decodeURIComponent(encoded)).toBe(pw);
      // 3. And the full synthesized URL must parse, recovering the password.
      const url = new URL(`postgresql://user:${encoded}@postgres:5432/db`);
      expect(decodeURIComponent(url.password)).toBe(pw);
    }
  });
});

// Process review #12 / F12 (Class A authoritative gate). The deploy now validates the EXACT
// DATABASE_URL with a real connection (probe_database_url). To keep the password out of any
// argv it splits the password out of the URL and decodes it with urldecode() — the exact
// inverse of urlencode(). These tests run the REAL helpers extracted from the script.
const urldecodeFn =
  setupScript.match(/urldecode\(\) \{[\s\S]*?\n\}/)?.[0] ?? "";
const probeUrlFn =
  setupScript.match(/probe_database_url\(\) \{[\s\S]*?\n\}/)?.[0] ?? "";

const shq = (s: string) => `'${s.replace(/'/g, `'\\''`)}'`;

function bashUrldecode(input: string): string {
  const res = spawnSync(
    "/bin/bash",
    ["-c", `${urldecodeFn}\nurldecode "$1"`, "bash", input],
    { encoding: "utf8" },
  );
  if (res.status !== 0) throw new Error(`urldecode failed: ${res.stderr}`);
  return res.stdout;
}

// Run the REAL probe_database_url (+ urlencode/urldecode) with a stubbed `docker compose
// exec` standing in for psql: the stub reads the piped password and the trailing url_no_pw
// arg, and "connects" (exit 0) ONLY when BOTH match the expected good connection. Proves the
// gate FAILS on a malformed/misdirected/wrong-credential URL, while the secret is split out
// and never lands in psql's argv (the stub asserts it arrives via stdin).
function runProbe(opts: {
  rawPassword: string;
  scheme?: string;
  host?: string;
  db?: string;
  query?: string;
  goodHost?: string;
  goodDb?: string;
  goodPassword?: string;
  rawUrl?: string;
}): number {
  const scheme = opts.scheme ?? "postgresql";
  const host = opts.host ?? "postgres:5432";
  const db = opts.db ?? "profile";
  const query = opts.query ?? "";
  const goodHost = opts.goodHost ?? host;
  const goodDb = opts.goodDb ?? db;
  const goodPw = opts.goodPassword ?? opts.rawPassword;
  const goodUrl = `${scheme}://profile@${goodHost}/${goodDb}${query}`;
  const buildUrl = opts.rawUrl
    ? `URL=${shq(opts.rawUrl)}`
    : `URL="${scheme}://profile:$(urlencode ${shq(opts.rawPassword)})@${host}/${db}${query}"`;
  const harness = [
    "set -e",
    urlencodeFn,
    urldecodeFn,
    probeUrlFn,
    `GOOD_URL=${shq(goodUrl)}`,
    `GOOD_PW=${shq(goodPw)}`,
    `docker() {
       if [ "$1" = compose ] && [ "$2" = exec ]; then
         IFS= read -r pw
         u=\${!#}
         [ "$u" = "$GOOD_URL" ] && [ "$pw" = "$GOOD_PW" ]
         return $?
       fi
       return 0
     }`,
    buildUrl,
    `probe_database_url "$URL"`,
  ].join("\n");
  const res = spawnSync("/bin/bash", ["-c", harness], { encoding: "utf8" });
  return res.status ?? -1;
}

describe("setup-profile.sh urldecode is the exact inverse of urlencode (fail-closed)", () => {
  test("the script defines a urldecode() helper", () => {
    expect(urldecodeFn).toMatch(/^urldecode\(\) \{/);
  });

  test("urldecode(urlencode(x)) === x for adversarial passwords", () => {
    const passwords = [
      "p@ss/w#rd?%x",
      "a:b@c/d?e#f&g=h+i j",
      "üñîçødé✓",
      "quote'and\"dq",
      "$pec!al~tilde",
      "Ω≈ç√∫˜µ",
    ];
    for (const pw of passwords) {
      expect(bashUrldecode(bashUrlencode(pw))).toBe(pw);
    }
  });

  test("urldecode rejects a malformed percent-escape (fail closed)", () => {
    expect(() => bashUrldecode("ab%zz")).toThrow();
    expect(() => bashUrldecode("tail%")).toThrow();
  });
});

describe("setup-profile.sh probe_database_url validates the EXACT DATABASE_URL", () => {
  test("correct config (encoded special-char password) → connects (exit 0)", () => {
    expect(runProbe({ rawPassword: "p@ss/w#rd?x" })).toBe(0);
  });

  test("operator override pointing at the WRONG database → FAILS the deploy", () => {
    expect(
      runProbe({ rawPassword: "pw", db: "wrongdb", goodDb: "profile" }),
    ).not.toBe(0);
  });

  test("operator override pointing at the WRONG host → FAILS the deploy", () => {
    expect(
      runProbe({
        rawPassword: "pw",
        host: "evil:5432",
        goodHost: "postgres:5432",
      }),
    ).not.toBe(0);
  });

  test("operator override carrying a DIFFERENT password → FAILS the deploy", () => {
    expect(
      runProbe({ rawPassword: "wrongpw", goodPassword: "rightpw" }),
    ).not.toBe(0);
  });

  test("postgres:// and postgresql:// are BOTH accepted (scheme aliases agree with libpq)", () => {
    expect(runProbe({ rawPassword: "pw", scheme: "postgresql" })).toBe(0);
    expect(runProbe({ rawPassword: "pw", scheme: "postgres" })).toBe(0);
  });

  test("a non-postgres scheme is rejected fail-closed", () => {
    expect(
      runProbe({ rawPassword: "pw", rawUrl: "mysql://u:p@h:3306/db" }),
    ).not.toBe(0);
  });

  test("?sslmode=require is preserved in the password-free URL handed to libpq", () => {
    expect(runProbe({ rawPassword: "pw", query: "?sslmode=require" })).toBe(0);
  });
});

// Process review (round 2 / Finding 2): probe_database_url runs psql INSIDE the postgres
// container, but the URL is consumed by the profile-api container. A container-local loopback
// host (localhost / 127.0.0.0-8 / ::1 / 0.0.0.0) connects fine from postgres (FALSE pass) yet
// points the API at its OWN loopback (no DB) at runtime. In this single-host compose topology
// the API reaches Postgres only via the compose service name `postgres`, so a loopback host is
// always wrong for the API and the in-postgres-container probe cannot faithfully test it: the
// gate must reject it fail-closed.
describe("setup-profile.sh probe_database_url rejects container-local loopback hosts (Finding 2)", () => {
  test("the rejection lives in the function (static guard against silent removal)", () => {
    expect(probeUrlFn).toMatch(/^probe_database_url\(\) \{/); // guard against a regex miss
    // literal-form IPv4 / unspecified / IPv4-mapped loopback set...
    expect(probeUrlFn).toMatch(
      /localhost \| 0\.0\.0\.0 \| 127\.\* \| ::ffff:127\.\*/,
    );
    // ...a trailing-FQDN-dot strip (localhost. -> localhost)...
    expect(probeUrlFn).toMatch(/host_lc=\$\{host_lc%\.\}/);
    // ...and IPv6 normalization that catches ::1 in ANY spelling (not an enumerated list).
    expect(probeUrlFn).toMatch(/is_ipv6/);
    expect(probeUrlFn).toMatch(/v6=\$\{v6\/\/0\/\}/);
    expect(probeUrlFn).toMatch(/service name/);
  });

  // Use `host` (NOT a rawUrl) so the stub's good-URL EQUALS this host — i.e. WITHOUT the
  // rejection the probe would reach the stub, match, and return 0 (the false pass). The
  // rejection is therefore the sole cause of the failure here: load-bearing, not an artifact
  // of a stub host-mismatch.
  const loopbackCases: Array<[string, { scheme?: string; host: string }]> = [
    ["localhost host+port", { host: "localhost:5432" }],
    ["localhost no port", { host: "localhost" }],
    ["127.0.0.1", { host: "127.0.0.1:5432" }],
    ["127.0.0.0/8 range (127.0.0.5)", { host: "127.0.0.5" }],
    ["IPv6 ::1", { scheme: "postgres", host: "[::1]:5432" }],
    ["0.0.0.0", { host: "0.0.0.0:5432" }],
    ["case-insensitive LOCALHOST", { host: "LOCALHOST:5432" }],
  ];
  test.each(loopbackCases)(
    "loopback host FAILS fail-closed (stub would otherwise connect): %s",
    (_desc, opts) => {
      expect(runProbe({ rawPassword: "pw", ...opts })).not.toBe(0);
    },
  );

  // Bypass variants found by adversarial review — each WOULD connect from inside the postgres
  // container (so the stub matches and would pass), but points the API at its own loopback.
  // All must fail closed. Locks the IPv6-any-spelling + trailing-dot normalization.
  const loopbackBypassCases: Array<
    [string, { scheme?: string; host: string }]
  > = [
    ["expanded ::1 (0:0:0:0:0:0:0:1)", { host: "[0:0:0:0:0:0:0:1]:5432" }],
    [
      "fully zero-padded ::1",
      { host: "[0000:0000:0000:0000:0000:0000:0000:0001]:5432" },
    ],
    ["compressed 0::1", { host: "[0::1]:5432" }],
    ["IPv4-mapped ::ffff:127.0.0.1", { host: "[::ffff:127.0.0.1]:5432" }],
    ["unspecified ::", { host: "[::]:5432" }],
    ["trailing-dot localhost.", { host: "localhost.:5432" }],
    ["trailing-dot 127.0.0.1.", { host: "127.0.0.1.:5432" }],
  ];
  test.each(loopbackBypassCases)(
    "loopback BYPASS variant FAILS fail-closed (stub would otherwise connect): %s",
    (_desc, opts) => {
      expect(runProbe({ rawPassword: "pw", ...opts })).not.toBe(0);
    },
  );

  test("a real global IPv6 host ([2001:db8::1]) is NOT rejected (normalization is loopback-specific)", () => {
    expect(
      runProbe({
        rawPassword: "pw",
        host: "[2001:db8::1]:5432",
        goodHost: "[2001:db8::1]:5432",
      }),
    ).toBe(0);
  });

  test("a host that merely CONTAINS 'localhost' is NOT rejected (exact match, no over-block)", () => {
    expect(
      runProbe({
        rawPassword: "pw",
        host: "localhostdb.internal:5432",
        goodHost: "localhostdb.internal:5432",
      }),
    ).toBe(0);
  });

  test("the compose service name `postgres` (what the API actually uses) still PASSES", () => {
    expect(
      runProbe({
        rawPassword: "pw",
        host: "postgres:5432",
        goodHost: "postgres:5432",
      }),
    ).toBe(0);
  });
});

// Class E: the deploy must declare, where the reviewer reads it, what validation_result=passed
// certifies NOW versus what is deferred to T5 — citing T5 by stable quoted text, never a
// fabricated numeric "#N" criterion.
describe("setup-profile.sh declares its validation scope + the deferred readiness check", () => {
  test("the header scope block names what passed certifies and what is deferred to T5", () => {
    expect(setupScript).toMatch(/Validation scope/);
    expect(setupScript).toMatch(/DELIBERATELY OUT OF SCOPE/);
    expect(setupScript).toMatch(/s4-profile-05-backend-db-api\.md/);
    // The quoted T5 anchor (the deferral cites it by resolvable text); the phrase may wrap
    // across comment lines, so assert its parts rather than one contiguous string.
    expect(setupScript).toMatch(/Scope item 5/);
    expect(setupScript).toMatch(/"DB connection \+ readiness check"/);
  });

  test("the /health healthcheck carries a deferral token pointing /ready at T5", () => {
    expect(setupScript).toMatch(
      /\/health is deliberately liveness-only \(dependency-free\)/,
    );
    expect(setupScript).toMatch(/\(\/ready\) is deferred; owned by T5/);
  });

  test("no fabricated numeric criterion reference (e.g. #55) is cited", () => {
    const numericCriterion = setupScript.match(/criterion #\d+|#55\b/gi) ?? [];
    expect(numericCriterion).toEqual([]);
  });
});
