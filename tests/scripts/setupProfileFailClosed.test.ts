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
  test("the ONLY fallible step between the cron write and DEPLOY_VALIDATED=1 is the rollback-covered token persist", () => {
    // The systemd unit + cron file are the last host-state writes, captured/reverted by
    // rollback_deploy. After the cron chmod, the ONLY sanctioned fallible work before
    // DEPLOY_VALIDATED=1 is the atomic token persist (round-7 C7-2): it must run on the success
    // path yet BEFORE the validated mark, so a persist failure aborts under set -e and the rollback
    // trap restores the previous token/stack (a post-validation warn-on-failure would instead leave
    // .internal_token stale → silent T6-token rotation). It is rollback-covered: the atomic temp+mv
    // leaves the previous token in place on failure, and rollback_deploy reverts everything else.
    // Outside that one block, the cron→validated window must stay echo-only.
    const idxCronChmod = firstIndex(setupLines, /^chmod 644 "\$CRON_FILE"$/);
    const idxValidated = firstIndex(setupLines, /^DEPLOY_VALIDATED=1$/);
    expect(idxCronChmod).toBeGreaterThanOrEqual(0);
    expect(idxValidated).toBeGreaterThan(idxCronChmod);

    // Locate the sanctioned token-persist block (anchor -> its `if` -> column-0 `fi`).
    const persAnchor = firstIndex(
      setupLines,
      /Persist the resolved service-to-service token/,
    );
    expect(persAnchor).toBeGreaterThan(idxCronChmod);
    expect(persAnchor).toBeLessThan(idxValidated);
    let persIf = -1;
    for (let i = persAnchor + 1; i < idxValidated; i++) {
      if (
        /^if \[ -n "\$\{PROFILE_INTERNAL_TOKEN:-\}" \]; then$/.test(
          setupLines[i],
        )
      ) {
        persIf = i;
        break;
      }
    }
    expect(persIf).toBeGreaterThan(persAnchor);
    let persFi = -1;
    for (let i = persIf + 1; i < setupLines.length; i++) {
      if (setupLines[i] === "fi") {
        persFi = i;
        break;
      }
    }
    expect(persFi).toBeGreaterThan(persIf);
    expect(persFi).toBeLessThan(idxValidated); // the persist closes BEFORE the validated mark

    const FALLIBLE =
      /^(cat|cp|mv|rm|docker|systemctl|certbot|nginx|ufw|apt-get|ln|chmod|curl|mkswap|swapon|fallocate|dd|getent|openssl|sysctl)\b/;
    const offenders: string[] = [];
    for (let i = idxCronChmod + 1; i < idxValidated; i++) {
      if (i >= persAnchor && i <= persFi) continue; // skip the sanctioned persist block
      const trimmed = setupLines[i].replace(/^\s+/, "");
      if (FALLIBLE.test(trimmed)) offenders.push(`${i + 1}: ${setupLines[i]}`);
    }
    // Any OTHER fallible step here must move before the trap region OR get its own rollback undo.
    expect(offenders).toEqual([]);
  });

  // Adversarial review (round 8, C8-1): DEPLOY_VALIDATED=1 is the LAST fallible-state transition.
  // The deploy has SHIPPED and the rollback trap is now a no-op, so EVERY command after it must be
  // NON-FATAL (echo-only or `|| …`-guarded). An unguarded fallible command (e.g. the backup-cleanup
  // rm) failing here exits the script non-zero while the new stack stays live — and build-deploy
  // records DEPLOY_OUTCOME=passed only when this remote script exits 0, so it would brand an
  // actually-deployed digest `failed`, poisoning the provenance record.
  test("no unguarded fallible command runs after DEPLOY_VALIDATED=1 (a post-commit failure must not brand a shipped deploy failed)", () => {
    const idxValidated = firstIndex(setupLines, /^DEPLOY_VALIDATED=1$/);
    expect(idxValidated).toBeGreaterThanOrEqual(0);
    // Join backslash continuations so a `|| …` guard on a continuation line counts.
    const tail = setupLines.slice(idxValidated + 1);
    const joined: string[] = [];
    for (let i = 0; i < tail.length; i++) {
      let cur = tail[i];
      while (/\\\s*$/.test(cur) && i + 1 < tail.length) {
        cur = cur.replace(/\\\s*$/, " ") + tail[++i];
      }
      joined.push(cur);
    }
    const FALLIBLE =
      /^(cat|cp|mv|rm|docker|systemctl|certbot|nginx|ufw|apt-get|ln|chmod|curl|mkswap|swapon|fallocate|dd|getent|openssl|sysctl)\b/;
    const unguarded = joined
      .map((l) => l.trim())
      .filter((t) => FALLIBLE.test(t) && !/\|\|/.test(t));
    expect(unguarded).toEqual([]);
  });
});

describe("build-deploy-profile.sh — never build from an empty version tag", () => {
  test("VERSION_TAG is validated non-empty before docker build", () => {
    const idxVersionTag = firstIndex(buildLines, /^VERSION_TAG=/);
    const idxValidation = firstIndex(buildLines, /if \[ -z "\$VERSION_TAG" \]/);
    // Anchor on the actual top-level command (column 0), not a comment that mentions it.
    // The build is now platform-pinned (`docker buildx build --platform linux/amd64 --load`).
    const idxDockerBuild = firstIndex(buildLines, /^docker buildx build\b/);

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
  goodUrl?: string; // override the stub's expected url_no_pw (so a custom-shaped URL is load-bearing)
  resolvesTo?: string; // what the in-container `getent ahosts <host>` stub returns (space-sep)
  stubAlwaysConnects?: boolean; // psql stub returns 0 regardless of URL — pins pre-psql reject guards
}): number {
  const scheme = opts.scheme ?? "postgresql";
  const host = opts.host ?? "postgres:5432";
  const db = opts.db ?? "profile";
  const query = opts.query ?? "";
  const goodHost = opts.goodHost ?? host;
  const goodDb = opts.goodDb ?? db;
  const goodPw = opts.goodPassword ?? opts.rawPassword;
  const goodUrl =
    opts.goodUrl ?? `${scheme}://profile@${goodHost}/${goodDb}${query}`;
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
    `RESOLVED_ADDRS=${shq(opts.resolvesTo ?? "")}`,
    `STUB_ALWAYS_CONNECTS=${opts.stubAlwaysConnects ? "1" : "0"}`,
    `docker() {
       if [ "$1" = compose ] && [ "$2" = exec ]; then
         case "$*" in
           *getent*)
             # The resolution probe: echo the configured resolved address(es). Empty by
             # default, so existing (non-resolvesTo) tests emit nothing and the gate falls
             # back exactly as before — the getent call is a no-op for them.
             [ -n "\${RESOLVED_ADDRS:-}" ] && printf '%s\\n' $RESOLVED_ADDRS
             return 0
             ;;
         esac
         IFS= read -r pw
         # STUB_ALWAYS_CONNECTS: the psql probe ALWAYS succeeds regardless of the URL. Used by the
         # reject tests so the probe can only return non-zero via a pre-psql reject guard, making
         # the guard itself load-bearing (not an incidental url_no_pw-vs-GOOD_URL mismatch, which a
         # stripped param would trigger and pass the test for the wrong reason).
         [ "\${STUB_ALWAYS_CONNECTS:-0}" = "1" ] && return 0
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
    // ...PLUS a resolution-based check that RESOLVES the host (getent in the postgres
    // container) and rejects any loopback ADDRESS — closing obfuscated IPv4 spellings
    // (octal/hex/decimal) and the hex IPv4-mapped IPv6 form that no literal pattern catches.
    expect(probeUrlFn).toMatch(/getent ahosts/);
    expect(probeUrlFn).toMatch(/grep -Eq/);
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

  // Adversarial review: the literal/normalized enumeration above is inherently INCOMPLETE —
  // obfuscated IPv4 spellings (single-integer 2130706433, hex 0x7f000001 / 0x7f.0.0.1, octal
  // 017700000001) and the hex IPv4-mapped IPv6 form (::ffff:7f00:1) all RESOLVE to 127.0.0.1 yet
  // match no pattern, so each passed from the postgres container while the API hits its own
  // loopback at runtime (a recorded false pass). The resolution-based check resolves the host and
  // rejects any loopback ADDRESS. Each case sets the resolver to a loopback addr AND host==goodHost
  // (so the psql stub WOULD connect) — the failure can ONLY come from the resolution check:
  // load-bearing.
  const obfuscatedLoopback: Array<[string, string, string]> = [
    ["single-integer 2130706433", "2130706433:5432", "127.0.0.1"],
    ["hex 0x7f000001", "0x7f000001:5432", "127.0.0.1"],
    ["dotted-hex 0x7f.0.0.1", "0x7f.0.0.1:5432", "127.0.0.1"],
    ["octal 017700000001", "017700000001:5432", "127.0.0.1"],
    [
      "hex IPv4-mapped IPv6 [::ffff:7f00:1]",
      "[::ffff:7f00:1]:5432",
      "::ffff:127.0.0.1",
    ],
  ];
  test.each(obfuscatedLoopback)(
    "obfuscated loopback spelling resolving to loopback FAILS fail-closed: %s",
    (_desc, host, resolvesTo) => {
      expect(
        runProbe({ rawPassword: "pw", host, goodHost: host, resolvesTo }),
      ).not.toBe(0);
    },
  );

  test("a real host that RESOLVES to a non-loopback address still PASSES (resolution is loopback-specific)", () => {
    expect(
      runProbe({
        rawPassword: "pw",
        host: "db.internal:5432",
        goodHost: "db.internal:5432",
        resolvesTo: "10.1.2.3",
      }),
    ).toBe(0);
  });

  test("a real global IPv6 host ([2001:db8::1]) is NOT rejected (resolves to itself, non-loopback)", () => {
    // An IP literal is IP-like, so the resolution check now REQUIRES it to resolve (getent
    // returns the literal itself for a valid IP). Non-loopback → accepted.
    expect(
      runProbe({
        rawPassword: "pw",
        host: "[2001:db8::1]:5432",
        goodHost: "[2001:db8::1]:5432",
        resolvesTo: "2001:db8::1",
      }),
    ).toBe(0);
  });

  // Adversarial review (Codex round 2): the resolution check must FAIL CLOSED for the obfuscated-
  // numeric class, not be best-effort. If getent is absent/empty, an obfuscated numeric loopback
  // (which no literal pattern catches) would otherwise fall through to the psql probe and false-
  // pass from the postgres container. An IP-literal-like host that does NOT resolve is rejected.
  const ipLikeUnresolvable: Array<[string, string]> = [
    ["single-integer 2130706433", "2130706433:5432"],
    ["hex 0x7f000001", "0x7f000001:5432"],
    ["octal 017700000001", "017700000001:5432"],
    ["IPv6 literal [::ffff:7f00:1]", "[::ffff:7f00:1]:5432"],
  ];
  test.each(ipLikeUnresolvable)(
    "an IP-literal host that the resolver CANNOT resolve FAILS closed (no best-effort fall-through): %s",
    (_desc, host) => {
      // resolvesTo unset => the getent stub emits nothing => unresolvable. host==goodHost so the
      // psql stub WOULD connect — the rejection is solely the fail-closed numeric-literal guard.
      expect(runProbe({ rawPassword: "pw", host, goodHost: host })).not.toBe(0);
    },
  );

  test("a normal DNS host that does not resolve still falls through (not IP-like → real SELECT 1 decides)", () => {
    // `db.internal` is NOT IP-like, so an empty resolver result does NOT fail it closed here; it
    // proceeds to the psql probe. host==goodHost so the stub connects → exit 0 (the connection
    // test, not the resolver, is authoritative for DNS names).
    expect(
      runProbe({
        rawPassword: "pw",
        host: "db.internal:5432",
        goodHost: "db.internal:5432",
      }),
    ).toBe(0);
  });

  // Adversarial review (Workflow round 2): an EMPTY authority host (postgres:///db, user@/db) is a
  // false-pass vector — libpq uses the local Unix socket, which the in-postgres-container probe
  // satisfies (default `local all all trust`, even with a wrong password) while the API container
  // cannot. Must fail closed.
  // Each case sets goodUrl == the rebuilt url_no_pw (and a matching password), so WITHOUT the
  // empty-host guard the psql stub WOULD connect (exit 0, the Unix-socket false pass). The
  // rejection can therefore only come from the guard: load-bearing.
  const emptyHostUrls: Array<[string, string, string, string]> = [
    [
      "userinfo + empty host (user:pass@/db)",
      "postgresql://profile:secret@/profile",
      "postgresql://profile@/profile",
      "secret",
    ],
    [
      "no userinfo, empty host (postgres:///db)",
      "postgres:///profile",
      "postgres:///profile",
      "",
    ],
  ];
  test.each(emptyHostUrls)(
    "an empty authority host FAILS closed (Unix-socket false pass): %s",
    (_desc, rawUrl, goodUrl, rawPassword) => {
      expect(runProbe({ rawPassword, rawUrl, goodUrl })).not.toBe(0);
    },
  );

  // Adversarial review (round 3): libpq percent-DECODES the authority host before resolving and
  // splitting it, so a percent-escape evades the literal-loopback, multi-host, and IP-like checks
  // (which run on the raw host) — `h1%2Clocalhost` decodes to a `h1,localhost` host LIST,
  // `%6cocalhost` to `localhost`, `127%2e0%2e0%2e1` to `127.0.0.1`. The gate must reject `%` in the
  // authority host. Each case sets goodUrl == the (raw, still-encoded) url_no_pw so WITHOUT the
  // reject the psql stub WOULD connect (exit 0) — the rejection is solely the new guard.
  const encodedHostUrls: Array<[string, string, string]> = [
    [
      "encoded comma -> multi-host h1,localhost",
      "postgresql://profile:pw@h1%2Clocalhost:5432/profile",
      "postgresql://profile@h1%2Clocalhost:5432/profile",
    ],
    [
      "encoded 'l' -> localhost (%6cocalhost)",
      "postgresql://profile:pw@%6cocalhost:5432/profile",
      "postgresql://profile@%6cocalhost:5432/profile",
    ],
    [
      "encoded dots -> 127.0.0.1 (127%2e0%2e0%2e1)",
      "postgresql://profile:pw@127%2e0%2e0%2e1:5432/profile",
      "postgresql://profile@127%2e0%2e0%2e1:5432/profile",
    ],
  ];
  test.each(encodedHostUrls)(
    "a percent-encoded authority host FAILS closed (libpq decodes it past the host checks): %s",
    (_desc, rawUrl, goodUrl) => {
      expect(runProbe({ rawPassword: "pw", rawUrl, goodUrl })).not.toBe(0);
    },
  );

  // Adversarial review (round 4): a `dbname=` query param OVERRIDES the URI path's database for
  // libpq (the gate's psql), but the Node pg client IGNORES it and uses the path — so the gate
  // would validate a DIFFERENT database than the API consumes (the same gate-vs-runtime divergence
  // the host/hostaddr param is rejected for). Use stubAlwaysConnects (round-5 hardening): the psql
  // probe always succeeds, so the probe returns non-zero ONLY via the dbname reject. This pins the
  // WHOLE guard — deleting the `dbname)` arm (param survives into url_no_pw → psql validates
  // otherdb) OR the post-loop `return 1` both let the always-connecting stub return 0 → RED.
  test("a dbname= query param FAILS closed (libpq path-override vs Node pg path-only divergence)", () => {
    expect(
      runProbe({
        rawPassword: "pw",
        rawUrl: "postgresql://profile:pw@postgres:5432/profile?dbname=otherdb",
        stubAlwaysConnects: true,
      }),
    ).not.toBe(0);
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

// Process review: the authority-host loopback check is bypassable by carrying the host in a
// channel it never inspects — a `?host=`/`?hostaddr=` query parameter (libpq honors these and
// they OVERRIDE the authority host), or a comma-separated MULTI-HOST authority (libpq tries each
// in turn, so a localhost member passes from inside the postgres container but fails from the
// API). Both let the in-postgres-container probe validate a target the API can't use. Fail closed.
describe("setup-profile.sh probe_database_url rejects host redirection via query params / multi-host", () => {
  test("guard: the probe function extracted", () => {
    expect(probeUrlFn).toMatch(/^probe_database_url\(\) \{/);
  });

  // SINGLE-HOST ?host=/?hostaddr= redirection: the param-walk arm STRIPS the param from url_no_pw,
  // so pinning a param-PRESENT GOOD_URL would pass on a stub MISMATCH even with the reject deleted
  // (false-green — the round-5 finding). Instead use stubAlwaysConnects so the psql probe always
  // succeeds: the probe can return non-zero ONLY via the `has_host_param` reject. Deleting that
  // reject lets the always-connecting stub return 0 → these go RED. (The API consumes the ORIGINAL
  // URL with ?host=, so a gate that strips-and-validates the authority is a true false-pass.)
  const singleHostRedirects: Array<[string, string]> = [
    ["?host=localhost", "?host=localhost"],
    ["?hostaddr=127.0.0.1", "?hostaddr=127.0.0.1"],
    ["?HOST=localhost (case-insensitive)", "?HOST=localhost"],
    [
      "?host=otherbox (any host param is a redirection channel)",
      "?host=otherbox",
    ],
  ];
  test.each(singleHostRedirects)(
    "single-host redirection param FAILS fail-closed (psql stub always connects; only the reject fails it): %s",
    (_desc, query) => {
      expect(
        runProbe({
          rawPassword: "pw",
          host: "postgres",
          goodHost: "postgres",
          query,
          stubAlwaysConnects: true,
        }),
      ).not.toBe(0);
    },
  );

  // MULTI-HOST authority (comma host-list): the comma rides the AUTHORITY (not a stripped query
  // param), so url_no_pw == GOOD_URL and the stub WOULD connect without the `*,*` reject — these
  // are load-bearing as-is (no stubAlwaysConnects needed).
  const multiHostCases: Array<[string, { host: string; goodHost: string }]> = [
    [
      "multi-host authority",
      { host: "h1,localhost", goodHost: "h1,localhost" },
    ],
    [
      "multi-host authority with ports",
      { host: "h1:5432,localhost:5432", goodHost: "h1:5432,localhost:5432" },
    ],
  ];
  test.each(multiHostCases)(
    "multi-host authority FAILS fail-closed (stub would otherwise connect): %s",
    (_desc, opts) => {
      expect(runProbe({ rawPassword: "pw", ...opts })).not.toBe(0);
    },
  );

  test("a benign query param (sslmode=require) on a correct host still PASSES", () => {
    expect(
      runProbe({
        rawPassword: "pw",
        host: "postgres:5432",
        goodHost: "postgres:5432",
        query: "?sslmode=require",
      }),
    ).toBe(0);
  });

  test("a non-host connection param (application_name) is NOT rejected (only host/hostaddr redirect)", () => {
    expect(
      runProbe({
        rawPassword: "pw",
        host: "postgres:5432",
        goodHost: "postgres:5432",
        query: "?application_name=profile",
      }),
    ).toBe(0);
  });
});

describe("setup-profile.sh probe_database_url rejects percent-encoded query KEYS (channel/argv evasion)", () => {
  // Process review #13. libpq percent-DECODES the query keyword and THEN matches it
  // (fe-connect.c conninfo_uri_parse_params: `keyword = conninfo_uri_decode(keyword, ...)`), so
  // an encoded key decodes to a real connection parameter: pass%77ord -> "password" (a LIVE
  // credential channel), h%6fst -> "host" (an authority override). Left in the pass-through
  // query that value would BOTH reach the API as a working param AND land in psql's argv,
  // dodging the password/sslpassword/host classification. We reject any '%' in a query KEY
  // fail-closed: no real libpq keyword name contains '%', and the script never encodes key
  // names itself, so this refuses only a hand-crafted evasion, never a valid URL.
  test("guard: the probe rejects a '%' in a query key BEFORE it classifies the key", () => {
    // %-reject must run before the lowercase classification (`case $kv_key_lc in`); otherwise an
    // encoded key could be (mis)classified or fall through to the pass-through arm first.
    const rejectIdx = probeUrlFn.search(/case \$kv_key in[\s\S]*?\*%\*\)/);
    const classifyIdx = probeUrlFn.search(/case \$kv_key_lc in/);
    expect(rejectIdx).toBeGreaterThanOrEqual(0);
    expect(classifyIdx).toBeGreaterThanOrEqual(0);
    expect(rejectIdx).toBeLessThan(classifyIdx);
  });

  // Each case is built so the stub WOULD connect without the guard (url_no_pw == GOOD_URL): the
  // authority host/db/password are all correct and the ONLY anomaly is the encoded key — so the
  // rejection can come ONLY from the new key guard, not a stub mismatch. Load-bearing.
  const encodedKeyCases: Array<[string, { query: string }]> = [
    // %77 -> 'w': pass%77ord decodes to the literal keyword `password`
    ["?pass%77ord= (encoded password key)", { query: "?pass%77ord=SECRET" }],
    // encoded sslpassword — the client-key passphrase channel
    [
      "?sslpass%77ord= (encoded sslpassword key)",
      { query: "?sslpass%77ord=SECRET" },
    ],
    // mixed-case encoded key — the '%' check is case-independent
    ["?PASS%77ORD= (mixed-case encoded key)", { query: "?PASS%77ORD=SECRET" }],
    // %6f -> 'o': h%6fst decodes to `host` — would also dodge the host-redirect guard
    ["?h%6fst=localhost (encoded host key)", { query: "?h%6fst=localhost" }],
  ];
  test.each(encodedKeyCases)(
    "encoded query key FAILS fail-closed (stub would otherwise connect): %s",
    (_desc, opts) => {
      expect(
        runProbe({
          rawPassword: "pw",
          host: "postgres:5432",
          goodHost: "postgres:5432",
          ...opts,
        }),
      ).not.toBe(0);
    },
  );

  test("an encoded VALUE on a literal key is preserved and still PASSES (key-only check, not over-broad)", () => {
    // application_name (no '%' in the KEY) with a percent-encoded VALUE must survive verbatim —
    // proves the guard inspects the key only. A whole-`kv` '%' check would wrongly reject this.
    expect(
      runProbe({
        rawPassword: "pw",
        host: "postgres:5432",
        goodHost: "postgres:5432",
        query: "?application_name=my%20app",
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

// ── Finding 2: the /internal/ nginx allow-list must not be silently widened to the public net ──
// PROFILE_INTERNAL_ALLOW_IPS tokens are interpolated into `allow <token>;` before `deny all;`.
// nginx allow/deny is FIRST-MATCH, so `all` / `*/0` would make the service-to-service endpoint
// public — and nginx -t ACCEPTS those. The deploy validates each token fail-closed; a token with
// non-IP chars is rejected (nginx-directive-injection guard); a deliberate public widening needs
// PROFILE_INTERNAL_ALLOW_PUBLIC=1 (loud).
describe("setup-profile.sh validates the /internal/ allow-list (no silent public widening)", () => {
  const isTruthyFn =
    setupScript.match(/is_truthy\(\) \{[\s\S]*?\n\}/)?.[0] ?? "";
  const allowBlock =
    setupScript.match(
      /if \[ -n "\$PROFILE_INTERNAL_ALLOW_IPS" \]; then[\s\S]*?\n {4}fi/,
    )?.[0] ?? "";

  test("the validation + break-glass exist (static)", () => {
    expect(isTruthyFn).toMatch(/^is_truthy\(\) \{/); // guard against a regex miss
    expect(allowBlock).toMatch(
      /if \[ -n "\$PROFILE_INTERNAL_ALLOW_IPS" \]; then/,
    );
    expect(allowBlock).toMatch(/all\) is_public=1/); // reject `all`
    // reject any /0 prefix in ANY spelling (/0, /00, /000) via zero-stripping normalization
    expect(allowBlock).toMatch(/ip_prefix=\$\{ip_lc##\*\/\}/);
    expect(allowBlock).toMatch(/\$\{ip_prefix\/\/0\/\}/);
    expect(allowBlock).toMatch(/\*\[!0-9a-fA-F:\.\/\]\*\)/); // reject non-IP chars (injection)
    expect(allowBlock).toMatch(/PROFILE_INTERNAL_ALLOW_PUBLIC/); // break-glass
    // build-deploy passes the break-glass flag through to the box.
    expect(
      buildLines.some((l) => /export PROFILE_INTERNAL_ALLOW_PUBLIC=%q/.test(l)),
    ).toBe(true);
  });

  // Behavioral: run the REAL extracted validation loop (+ is_truthy) over a token set.
  function runAllowList(
    ips: string,
    allowPublic: string,
  ): { code: number; stdout: string } {
    const harness = [
      "set -e",
      isTruthyFn,
      'ALLOW_DIRECTIVES=""',
      `PROFILE_INTERNAL_ALLOW_IPS=${shq(ips)}`,
      `PROFILE_INTERNAL_ALLOW_PUBLIC=${shq(allowPublic)}`,
      allowBlock,
      'printf "BEGIN\\n%sEND\\n" "$ALLOW_DIRECTIVES"',
    ].join("\n");
    const res = spawnSync("/bin/bash", ["-c", harness], { encoding: "utf8" });
    return { code: res.status ?? -1, stdout: res.stdout ?? "" };
  }

  test("valid IPv4/IPv6/CIDR tokens are accepted and become allow directives", () => {
    const r = runAllowList("1.2.3.4, 10.0.0.0/8 2001:db8::1,::1", "");
    expect(r.code).toBe(0);
    expect(r.stdout).toMatch(/allow 1\.2\.3\.4;/);
    expect(r.stdout).toMatch(/allow 10\.0\.0\.0\/8;/);
    expect(r.stdout).toMatch(/allow 2001:db8::1;/);
    expect(r.stdout).toMatch(/allow ::1;/);
  });

  test.each([
    ["all", "all (lowercase)"],
    ["ALL", "ALL (uppercase)"],
    ["0.0.0.0/0", "IPv4 default route"],
    ["::/0", "IPv6 default route"],
    ["10.0.0.0/0", "any /0 prefix matches everyone"],
    ["0.0.0.0/00", "leading-zero /00 == /0 (the adversarial bypass)"],
    ["::/00", "IPv6 /00 == /0"],
    ["0.0.0.0/000", "/000 == /0"],
  ])("public token '%s' is REJECTED fail-closed (%s)", (token) => {
    expect(runAllowList(token, "").code).not.toBe(0);
  });

  test("a real CIDR with a non-zero prefix written with a leading zero (/08 == /8) is ACCEPTED", () => {
    // Normalization must reject ONLY all-zero prefixes; /08 (=/8) is a real bound, not /0.
    const r = runAllowList("10.0.0.0/08", "");
    expect(r.code).toBe(0);
    expect(r.stdout).toMatch(/allow 10\.0\.0\.0\/08;/);
  });

  test("an nginx-directive injection token is rejected fail-closed", () => {
    expect(runAllowList("1.2.3.4; return 200", "").code).not.toBe(0);
  });

  test("break-glass PROFILE_INTERNAL_ALLOW_PUBLIC=1 permits `all` with a loud warning", () => {
    const r = runAllowList("all", "1");
    expect(r.code).toBe(0);
    expect(r.stdout).toMatch(/allow all;/); // the directive is emitted...
    expect(r.stdout).toMatch(/PUBLIC/); // ...behind the loud ⚠️ warning
  });
});
