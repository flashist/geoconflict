import { spawnSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

// Regression test for setup-profile.sh's deploy rollback. The rollback only recreates
// the previous stack when STACK_RECREATED=1, so that flag MUST flip to 1 *before* the
// destructive `docker compose up -d --force-recreate`. If it flips only after success,
// a partial-failure of that command (under `set -e`) exits with STACK_RECREATED=0 and
// the EXIT trap restores config but never recreates — leaving the live stack partial
// or down. See process-review #9.

const REPO_ROOT = path.join(__dirname, "..", "..");
const SETUP_PROFILE = path.join(REPO_ROOT, "setup-profile.sh");
const lines = fs.readFileSync(SETUP_PROFILE, "utf8").split("\n");

// Top-level (unindented) command lines only — the rollback function's own
// `docker compose up` and `STACK_RECREATED` references are indented inside it.
const firstIndex = (re: RegExp) => lines.findIndex((l) => re.test(l));

describe("setup-profile.sh rollback ordering invariant", () => {
  test("STACK_RECREATED flips to 1 after the API pull and before ANY container-mutating `up`", () => {
    // Finding 1: the routine deploy scopes pull/recreate to profile-api so the data-bearing
    // postgres is never silently re-pulled or force-recreated on a bare API ship.
    // Finding 1 (round 2): the flag MUST precede `docker compose up -d postgres` too — that
    // converge can CREATE the DB on a fresh deploy or RECREATE it on compose-definition drift;
    // a failure there must land in rollback with STACK_RECREATED=1 so the stack is handled
    // (not left half-mutated with only a config-file restore).
    const idxPull = firstIndex(/^docker compose pull profile-api$/);
    const idxStackSet = firstIndex(/^STACK_RECREATED=1$/);
    const idxPgUp = firstIndex(/^docker compose up -d postgres$/);
    const idxRecreate = firstIndex(
      /^docker compose up -d --force-recreate --no-deps profile-api$/,
    );

    expect(idxPull).toBeGreaterThanOrEqual(0);
    expect(idxStackSet).toBeGreaterThanOrEqual(0);
    expect(idxPgUp).toBeGreaterThanOrEqual(0);
    expect(idxRecreate).toBeGreaterThanOrEqual(0);

    // pull < STACK_RECREATED=1 < postgres converge < the destructive API recreate.
    expect(idxPull).toBeLessThan(idxStackSet);
    expect(idxStackSet).toBeLessThan(idxPgUp);
    expect(idxPgUp).toBeLessThan(idxRecreate);
  });

  test("the routine deploy never pulls or force-recreates the whole project (postgres scoped out)", () => {
    // A bare `docker compose pull` / `up -d --force-recreate` (no service arg) would silently
    // re-pull and bounce the data-bearing DB. Those unscoped forms must NOT exist as top-level
    // commands. postgres is converged in place via `docker compose up -d postgres`.
    expect(firstIndex(/^docker compose pull$/)).toBe(-1);
    expect(firstIndex(/^docker compose up -d --force-recreate$/)).toBe(-1);
    expect(
      firstIndex(/^docker compose up -d postgres$/),
    ).toBeGreaterThanOrEqual(0);
  });

  test("the rollback gates the recreate on STACK_RECREATED and the trap is installed before the first config write", () => {
    // The rollback recreate is gated on STACK_RECREATED (now an `if` block that reports
    // success/failure rather than the old silenced `&& ... || true` one-liner).
    expect(
      lines.some((l) => /if \[ "\$STACK_RECREATED" = "1" \]; then/.test(l)),
    ).toBe(true);
    const idxTrap = firstIndex(/^trap rollback_deploy EXIT$/);
    const idxFirstWrite = firstIndex(/> "\$PROFILE_DIR\/profile\.env"/);
    expect(idxTrap).toBeGreaterThanOrEqual(0);
    expect(idxFirstWrite).toBeGreaterThanOrEqual(0);
    expect(idxTrap).toBeLessThan(idxFirstWrite);
  });
});

// Extract the REAL pre-write classification/abort block from setup-profile.sh and run it with
// PROFILE_DIR pointed at a temp dir holding a chosen file combination. A PARTIAL pre-state
// (exactly one of profile.env / docker-compose.yml present) must abort non-zero and write
// nothing; a complete pair or no files must proceed with the correct FRESH_DEPLOY classification.
function runPartialGuard(opts: { env: boolean; compose: boolean }): {
  code: number;
  out: string;
  envExists: boolean;
  composeExists: boolean;
} {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "partial-"));
  if (opts.env) fs.writeFileSync(path.join(dir, "profile.env"), "OLD-ENV\n");
  if (opts.compose)
    fs.writeFileSync(path.join(dir, "docker-compose.yml"), "OLD-COMPOSE\n");
  const src = fs.readFileSync(SETUP_PROFILE, "utf8");
  const m = src.match(/PROFILE_ENV_PRESENT=0;[\s\S]*?&& FRESH_DEPLOY=1/);
  if (!m) throw new Error("could not extract the partial-state guard block");
  // set -e mirrors the real script (line 50). Echo the classification so the non-abort paths
  // are observable; the abort path exits 1 before reaching the echo.
  const script = `set -e\nPROFILE_DIR=${JSON.stringify(dir)}\n${m[0]}\necho "FRESH_DEPLOY=$FRESH_DEPLOY"\n`;
  const res = spawnSync("bash", ["-c", script], { encoding: "utf8" });
  const out = (res.stdout ?? "") + (res.stderr ?? "");
  const envExists = fs.existsSync(path.join(dir, "profile.env"));
  const composeExists = fs.existsSync(path.join(dir, "docker-compose.yml"));
  fs.rmSync(dir, { recursive: true, force: true });
  return { code: res.status ?? -1, out, envExists, composeExists };
}

describe("setup-profile.sh refuses a PARTIAL pre-deploy config state (abort before any write)", () => {
  // STATIC: the guard sits BEFORE the rollback trap and the first config write, and aborts.
  // Because the abort precedes the trap, nothing is rolled back — the partial state is left
  // untouched for the operator. A regression that moved/removed the guard turns this red.
  test("the partial-state guard precedes the rollback trap and the first config write, and exits non-zero", () => {
    const idxGuard = firstIndex(
      /if \[ "\$PROFILE_ENV_PRESENT" != "\$PROFILE_COMPOSE_PRESENT" \]; then/,
    );
    const idxTrap = firstIndex(/^trap rollback_deploy EXIT$/);
    const idxFirstWrite = firstIndex(/> "\$PROFILE_DIR\/profile\.env"/);
    expect(idxGuard).toBeGreaterThanOrEqual(0);
    expect(idxTrap).toBeGreaterThanOrEqual(0);
    expect(idxFirstWrite).toBeGreaterThanOrEqual(0);
    expect(idxGuard).toBeLessThan(idxTrap);
    expect(idxGuard).toBeLessThan(idxFirstWrite);
    // The guard body fails closed.
    expect(lines.slice(idxGuard, idxGuard + 16).join("\n")).toMatch(/exit 1/);
  });

  // BEHAVIORAL (real extracted block): exactly one file present => abort + no writes.
  test.each([
    [
      "profile.env present, docker-compose.yml absent",
      { env: true, compose: false },
    ],
    [
      "docker-compose.yml present, profile.env absent",
      { env: false, compose: true },
    ],
  ] as const)(
    "aborts on a partial state (%s) and writes nothing",
    (_label, cfg) => {
      const r = runPartialGuard(cfg);
      expect(r.code).not.toBe(0);
      expect(r.out).toMatch(/PARTIAL/);
      // The lone pre-existing file is left exactly as-is; the missing one is NOT created.
      expect(r.envExists).toBe(cfg.env);
      expect(r.composeExists).toBe(cfg.compose);
    },
  );

  test("a complete pair is treated as a redeploy (FRESH_DEPLOY=0, no abort)", () => {
    const r = runPartialGuard({ env: true, compose: true });
    expect(r.code).toBe(0);
    expect(r.out).toMatch(/FRESH_DEPLOY=0/);
  });

  test("no config at all is a fresh deploy (FRESH_DEPLOY=1, no abort)", () => {
    const r = runPartialGuard({ env: false, compose: false });
    expect(r.code).toBe(0);
    expect(r.out).toMatch(/FRESH_DEPLOY=1/);
  });
});

describe("setup-profile.sh fresh-deploy failure handling (never auto-deletes the volume)", () => {
  test("computes FRESH_DEPLOY and gives the fresh-failure recovery branch", () => {
    expect(lines.some((l) => /^FRESH_DEPLOY=/.test(l))).toBe(true);
    // Finding 2: the fresh-failure branch fires on FRESH_DEPLOY ALONE (not gated on
    // STACK_RECREATED), so a failure before the stack recreate still cleans up. The stack-stop
    // is nested under STACK_RECREATED inside the branch.
    expect(
      lines.some((l) => /elif \[ "\$FRESH_DEPLOY" = "1" \]; then/.test(l)),
    ).toBe(true);
    // It ALWAYS removes the never-validated config so the next run can't treat it as a
    // rollback target (keeps the invariant: on-disk config ⇒ validated).
    expect(
      lines.some((l) =>
        /rm -f "\$PROFILE_DIR\/profile\.env" "\$PROFILE_DIR\/docker-compose\.yml"/.test(
          l,
        ),
      ),
    ).toBe(true);
  });

  test("never EXECUTES `docker compose down -v` — every reference is an echoed hint or a comment", () => {
    const downVLines = lines.filter((l) => /docker compose down -v/.test(l));
    // The recovery hints must exist...
    expect(downVLines.length).toBeGreaterThan(0);
    // ...but `down -v` must never be an executed command (deleting a data volume): every
    // occurrence is inside an `echo` (a hint) or a `#` comment, never a bare command.
    for (const l of downVLines) {
      expect(l).toMatch(/^\s*(#|echo )/);
    }
  });

  test("the fresh-failure branch STOPS the stack with `docker compose down` (no -v, preserving the volume)", () => {
    // An executed `docker compose down` that is NOT `down -v` and NOT an echo/comment.
    // Now wrapped in `if docker compose down; then` (observability), so allow a leading `if`.
    const stopLines = lines.filter(
      (l) =>
        /^\s*(if )?docker compose down\b/.test(l) &&
        !/down -v/.test(l) &&
        !/^\s*(#|echo )/.test(l),
    );
    expect(stopLines.length).toBeGreaterThan(0);
  });

  test("the rollback nginx block restores a previous site OR removes a freshly-created one", () => {
    // Restore branch (previous site existed).
    expect(
      lines.some((l) =>
        /mv -f "\$SITE_BAK" \/etc\/nginx\/sites-available\/profile/.test(l),
      ),
    ).toBe(true);
    // Remove branch (no previous site — tear down the freshly-created public proxy).
    expect(
      lines.some((l) =>
        /rm -f \/etc\/nginx\/sites-available\/profile \/etc\/nginx\/sites-enabled\/profile/.test(
          l,
        ),
      ),
    ).toBe(true);
  });
});

// Behavioral harness: replicate the control flow (set -e + EXIT trap + STACK_RECREATED
// gate + FRESH_DEPLOY branch + nginx restore/remove) with stubbed docker/systemctl.
// `down` and `down -v` are recorded separately so we can assert the rollback STOPS a
// fresh stack but NEVER auto-deletes its volume.
//   failAt "compose-up": the destructive `compose up` itself fails (partial recreate).
//   failAt "late":       `compose up` succeeds, the nginx site is created, then a later
//                        step (systemd/cron) fails — the case this finding is about.
function lexists(p: string): boolean {
  try {
    fs.lstatSync(p);
    return true;
  } catch {
    return false;
  }
}

function runHarness(opts: {
  order: "before" | "after";
  fresh?: boolean;
  failAt?: "compose-up" | "late";
}): {
  calls: string[];
  env: string;
  stdout: string;
  siteExists: boolean;
  symlinkExists: boolean;
} {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rollback-"));
  const failAt = opts.failAt ?? "compose-up";
  const setFlagBefore = opts.order === "before" ? "STACK_RECREATED=1" : "";
  const setFlagAfter = opts.order === "after" ? "STACK_RECREATED=1" : "";
  // Fresh deploy => no predeploy backups exist; FRESH_DEPLOY=1.
  const baksSetup = opts.fresh
    ? ""
    : 'echo OLD-ENV > "$PROFILE_ENV_BAK"\necho OLD-COMPOSE > "$COMPOSE_BAK"';
  const freshFlag = opts.fresh ? "1" : "0";
  const failFirstUp = failAt === "compose-up" ? "1" : "0";
  // "late" failure: stand up a fresh nginx site (no previous => no .bak), then fail.
  const lateSection =
    failAt === "late"
      ? `
SITE_BAK="$SITE.bak.$$"
[ -f "$SITE" ] && cp -f "$SITE" "$SITE_BAK"
echo "server{}" > "$SITE"
ln -sf "$SITE" "$SITE_ENABLED"
systemctl restart nginx
false   # simulate a systemd/cron failure AFTER nginx is live
`
      : "";
  const script = `
set -e
WORK="${dir}"
PROFILE_DIR="$WORK"
PROFILE_ENV_BAK="$WORK/env.bak"
COMPOSE_BAK="$WORK/compose.bak"
SITE="$WORK/site"
SITE_ENABLED="$WORK/site-enabled"
${baksSetup}
echo NEW-ENV > "$WORK/profile.env"
echo NEW-COMPOSE > "$WORK/compose.yml"
: > "$WORK/calls.log"
DEPLOY_VALIDATED=0
STACK_RECREATED=0
FRESH_DEPLOY=${freshFlag}
FAIL_FIRST_UP=${failFirstUp}
SITE_BAK=""

# Stub docker/systemctl. 'compose up' optionally fails on the first call; 'down' and
# 'down -v' are logged distinctly so we can assert the volume is never auto-deleted.
docker() {
  if [ "$1" = compose ] && [ "$2" = up ]; then
    cnt=$(cat "$WORK/upcount" 2>/dev/null || echo 0)
    cnt=$((cnt + 1)); echo "$cnt" > "$WORK/upcount"
    echo "up-attempt-$cnt" >> "$WORK/calls.log"
    [ "$FAIL_FIRST_UP" = "1" ] && [ "$cnt" = 1 ] && return 1
    return 0
  fi
  if [ "$1" = compose ] && [ "$2" = down ]; then
    shift 2
    if [ "\${1:-}" = "-v" ]; then echo "down-v" >> "$WORK/calls.log"; else echo "down-no-v" >> "$WORK/calls.log"; fi
    return 0
  fi
  echo "docker $*" >> "$WORK/calls.log"
  return 0
}
systemctl() { echo "systemctl $*" >> "$WORK/calls.log"; return 0; }

restore_previous_config() {
  [ -f "$PROFILE_ENV_BAK" ] && mv -f "$PROFILE_ENV_BAK" "$WORK/profile.env"
  [ -f "$COMPOSE_BAK" ] && mv -f "$COMPOSE_BAK" "$WORK/compose.yml"
  return 0
}
rollback_deploy() {
  [ "$DEPLOY_VALIDATED" = "1" ] && return 0
  if [ -n "\${SITE_BAK:-}" ] && [ -f "\${SITE_BAK:-}" ]; then
    mv -f "$SITE_BAK" "$SITE"
    systemctl restart nginx 2>/dev/null || systemctl start nginx 2>/dev/null || true
  elif [ -n "\${SITE_BAK:-}" ]; then
    rm -f "$SITE" "$SITE_ENABLED"
    # Bring nginx back up (the real script gates this on NGINX_WAS_ACTIVE — see the
    # dedicated Finding-2 behavioral test below; this model just mirrors the up direction).
    systemctl restart nginx 2>/dev/null || systemctl start nginx 2>/dev/null || true
  fi
  if [ -f "$PROFILE_ENV_BAK" ] || [ -f "$COMPOSE_BAK" ]; then
    restore_previous_config
    [ "$STACK_RECREATED" = "1" ] && docker compose up -d --force-recreate || true
  elif [ "$FRESH_DEPLOY" = "1" ]; then
    # Mirrors the real script (Finding 2): fires on FRESH_DEPLOY alone; the stack-stop is nested
    # under STACK_RECREATED. (Config-removal is exercised by the dedicated real-function test.)
    [ "$STACK_RECREATED" = "1" ] && docker compose down 2>/dev/null || true
    echo "FRESH-HINT: cd /opt/profile && docker compose down -v"
  fi
}
trap rollback_deploy EXIT

docker compose pull
${setFlagBefore}
docker compose up -d --force-recreate
${setFlagAfter}
${lateSection}
`;
  const res = spawnSync("bash", ["-c", script], { encoding: "utf8" });
  const calls = fs
    .readFileSync(path.join(dir, "calls.log"), "utf8")
    .trim()
    .split("\n");
  const env = fs.readFileSync(path.join(dir, "profile.env"), "utf8").trim();
  const siteExists = lexists(path.join(dir, "site"));
  const symlinkExists = lexists(path.join(dir, "site-enabled"));
  fs.rmSync(dir, { recursive: true, force: true });
  return { calls, env, stdout: res.stdout ?? "", siteExists, symlinkExists };
}

describe("setup-profile.sh rollback behavior on a partial compose-up failure", () => {
  test("redeploy, flag set BEFORE the recreate: restores config AND recreates the previous stack", () => {
    const { calls, env } = runHarness({ order: "before" });
    expect(calls).toContain("up-attempt-1"); // destructive recreate attempted (and failed)
    expect(calls).toContain("up-attempt-2"); // rollback recreated the previous stack
    expect(env).toBe("OLD-ENV"); // previous config restored
  });

  test("redeploy, flag set AFTER the recreate (the old bug): restores config but SKIPS recreate", () => {
    const { calls, env } = runHarness({ order: "after" });
    expect(calls).toContain("up-attempt-1"); // destructive recreate attempted (and failed)
    expect(calls).not.toContain("up-attempt-2"); // recreate skipped — stack left partial
    expect(env).toBe("OLD-ENV"); // config still restored, but the stack is not back up
  });

  test("fresh deploy, compose-up failure: stops the stack (down, no -v), preserves the volume, prints the hint", () => {
    const { calls, stdout } = runHarness({
      order: "before",
      fresh: true,
      failAt: "compose-up",
    });
    expect(calls).toContain("up-attempt-1"); // destructive recreate attempted (and failed)
    expect(calls).not.toContain("up-attempt-2"); // no previous stack to recreate
    expect(calls).toContain("down-no-v"); // stack stopped...
    expect(calls).not.toContain("down-v"); // ...volume preserved (no auto-delete)
    expect(stdout).toMatch(/docker compose down -v/); // operator gets the recovery command
  });

  test("fresh deploy, LATE failure after nginx: removes the new site, stops the stack, preserves the volume", () => {
    const { calls, stdout, siteExists, symlinkExists } = runHarness({
      order: "before",
      fresh: true,
      failAt: "late",
    });
    expect(calls).toContain("up-attempt-1"); // compose up succeeded (only one attempt)
    expect(calls).not.toContain("up-attempt-2");
    expect(siteExists).toBe(false); // freshly-created nginx site removed
    expect(symlinkExists).toBe(false); // sites-enabled symlink removed
    expect(calls).toContain("down-no-v"); // unvalidated stack stopped...
    expect(calls).not.toContain("down-v"); // ...volume preserved
    expect(stdout).toMatch(/docker compose down -v/); // recovery hint still printed
  });
});

// Process review #12 (finding #1): the rollback must never SILENCE its recovery actions.
// The recreate of the previous stack used `... 2>/dev/null || true`, so a rollback that
// itself failed left the API down with only a generic banner. Rollback is exactly when
// visibility matters most. These tests lock observability for the whole class.
describe("setup-profile.sh rollback observability (no silenced recovery)", () => {
  test("the rollback recreate is not silenced with 2>/dev/null || true", () => {
    expect(
      lines.some((l) =>
        /docker compose up -d --force-recreate 2>\/dev\/null/.test(l),
      ),
    ).toBe(false);
  });

  test("the rollback reports failure with an explicit banner plus ps + logs", () => {
    expect(lines.some((l) => /ROLLBACK FAILED/.test(l))).toBe(true);
    // On a failed recreate the operator must get the stack state and recent logs.
    expect(lines.some((l) => /docker compose ps/.test(l))).toBe(true);
    expect(lines.some((l) => /docker compose logs --tail/.test(l))).toBe(true);
  });
});

// Behavioral: run the REAL restore_previous_config + rollback_deploy extracted from the
// script (not a replica) under a stubbed docker, driven by the EXIT trap exactly as in
// production. Proves a FAILED rollback-recreate is surfaced (banner + ps + logs) AND that
// the original deploy-failure exit code is preserved (the rollback never masks it as 0).
function runRealRollback(opts: { recreateFails: boolean }): {
  code: number;
  stdout: string;
  calls: string;
} {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "real-rollback-"));
  const script = fs.readFileSync(SETUP_PROFILE, "utf8");
  const restoreFn =
    script.match(/restore_previous_config\(\) \{[\s\S]*?\n\}/)?.[0] ?? "";
  const rollbackFn =
    script.match(/rollback_deploy\(\) \{[\s\S]*?\n\}/)?.[0] ?? "";
  // The recreate-success path now WAITS for health (all_services_running_healthy) before
  // reporting restored, so the harness must provide those functions + a docker stub that
  // answers `ps -q`/`inspect` as healthy, and a no-op sleep.
  const svcFn =
    script.match(/service_running_healthy\(\) \{[\s\S]*?\n\}/)?.[0] ?? "";
  const allFn =
    script.match(/all_services_running_healthy\(\) \{[\s\S]*?\n\}/)?.[0] ?? "";
  const callsLog = path.join(dir, "calls");
  const dockerStub = [
    "docker() {",
    `  echo "docker $*" >> "${callsLog}"`,
    '  if [ "$1 $2" = "compose up" ]; then [ "$FAILUP" = "1" ] && return 1; return 0; fi',
    '  if [ "$1 $2 $3" = "compose ps -q" ]; then echo "cid-$4"; return 0; fi',
    '  if [ "$1" = inspect ]; then',
    '    case "$3" in *State.Status*) echo running ;; *State.Health*) echo healthy ;; esac',
    "    return 0",
    "  fi",
    "  return 0",
    "}",
  ].join("\n");
  const harness = [
    "set -e",
    "sleep() { :; }",
    restoreFn,
    rollbackFn,
    svcFn,
    allFn,
    'EXPECTED_SERVICES="postgres profile-api"',
    `FAILUP=${opts.recreateFails ? "1" : "0"}`,
    dockerStub,
    `systemctl() { return 0; }`,
    `PROFILE_DIR="${dir}"; PROFILE_ENV_BAK="${dir}/e.bak"; COMPOSE_BAK="${dir}/c.bak"`,
    // The previous compose must be @sha256-pinned so the F3 digest gate lets the recreate
    // run (a non-digest COMPOSE_BAK would correctly HALT at break-glass — covered separately
    // in profileDeployClassSweep.test.ts). These cases exercise the recreate fail/succeed arm.
    `echo old > "$PROFILE_ENV_BAK"`,
    `printf 'services:\\n  profile-api:\\n    image: repo/img@sha256:OLDOLD\\n' > "$COMPOSE_BAK"`,
    `DEPLOY_VALIDATED=0; STACK_RECREATED=1; FRESH_DEPLOY=0; SITE_BAK=""`,
    "trap rollback_deploy EXIT",
    "( exit 7 )", // set -e => script exits 7 => EXIT trap runs rollback_deploy with rc=7
  ].join("\n");
  const res = spawnSync("/bin/bash", ["-c", harness], { encoding: "utf8" });
  const calls = fs.existsSync(callsLog)
    ? fs.readFileSync(callsLog, "utf8")
    : "";
  fs.rmSync(dir, { recursive: true, force: true });
  return { code: res.status ?? -1, stdout: res.stdout ?? "", calls };
}

describe("setup-profile.sh real rollback_deploy behavior (extracted, EXIT-trap driven)", () => {
  test("the extracted functions were found", () => {
    // Guards against a silent regex miss that would make the cases below vacuous.
    const script = fs.readFileSync(SETUP_PROFILE, "utf8");
    expect(script).toMatch(/rollback_deploy\(\) \{/);
    expect(script).toMatch(/restore_previous_config\(\) \{/);
  });

  test("recreate FAILS => prints ROLLBACK FAILED + ps + logs, and preserves the exit code", () => {
    const { code, stdout, calls } = runRealRollback({ recreateFails: true });
    expect(stdout).toMatch(/ROLLBACK FAILED/);
    expect(calls).toMatch(/docker compose ps/);
    expect(calls).toMatch(/docker compose logs --tail=50/);
    expect(code).toBe(7); // original deploy-failure code preserved, NOT masked to 0
  });

  test("recreate SUCCEEDS => reports restored, still exits with the original failure code", () => {
    const { code, stdout, calls } = runRealRollback({ recreateFails: false });
    expect(stdout).toMatch(/ROLLBACK: previous stack restored/);
    expect(calls).not.toMatch(/docker compose logs/); // no failure diagnostics on success
    expect(code).toBe(7);
  });
});

// Class C live gap (doctrine appendix): the deploy removes nginx's default site
// (sites-enabled/default) when pointing the box at the profile vhost, but rollback never
// restored it — a failed deploy left the box without its original default vhost. These
// tests lock the capture-before-remove + restore-on-rollback behavior.
describe("setup-profile.sh restores the nginx default site on rollback (static)", () => {
  test("captures the default site before removing it and marks it removed", () => {
    expect(
      lines.some((l) =>
        /cp -Pf \/etc\/nginx\/sites-enabled\/default "\$DEFAULT_SITE_BAK"/.test(
          l,
        ),
      ),
    ).toBe(true);
    expect(lines.some((l) => /^\s*DEFAULT_SITE_REMOVED=1$/.test(l))).toBe(true);
    // capture must precede the rm of the default site.
    const idxCap = firstIndex(
      /cp -Pf \/etc\/nginx\/sites-enabled\/default "\$DEFAULT_SITE_BAK"/,
    );
    const idxRm = firstIndex(/^\s*rm -f \/etc\/nginx\/sites-enabled\/default$/);
    expect(idxCap).toBeGreaterThanOrEqual(0);
    expect(idxRm).toBeGreaterThan(idxCap);
  });

  test("rollback_deploy restores the default site (guarded by DEFAULT_SITE_REMOVED)", () => {
    expect(
      lines.some((l) =>
        /cp -Pf "\$DEFAULT_SITE_BAK" \/etc\/nginx\/sites-enabled\/default/.test(
          l,
        ),
      ),
    ).toBe(true);
    expect(lines.some((l) => /DEFAULT_SITE_REMOVED:-0/.test(l))).toBe(true);
  });

  test("the success cleanup drops the default-site backup", () => {
    expect(
      lines.some((l) =>
        /rm -f "\$PROFILE_ENV_BAK" "\$COMPOSE_BAK" "\$DEFAULT_SITE_BAK"/.test(
          l,
        ),
      ),
    ).toBe(true);
  });
});

// Behavioral: run the REAL restore_previous_config + rollback_deploy with the default-site
// state set, a stubbed cp/systemctl/docker, driven by the EXIT trap. Proves the restore is
// invoked (and reported), is skipped when nothing was removed, and reports a FAILED restore
// without silencing — all while preserving the original deploy-failure exit code.
function runDefaultSiteRollback(opts: {
  removed: boolean;
  cpFails?: boolean;
}): {
  code: number;
  stdout: string;
  calls: string;
} {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "default-site-"));
  const script = fs.readFileSync(SETUP_PROFILE, "utf8");
  const restoreFn =
    script.match(/restore_previous_config\(\) \{[\s\S]*?\n\}/)?.[0] ?? "";
  const rollbackFn =
    script.match(/rollback_deploy\(\) \{[\s\S]*?\n\}/)?.[0] ?? "";
  const callsLog = path.join(dir, "calls");
  const bak = path.join(dir, "default.bak");
  if (opts.removed) fs.writeFileSync(bak, "server{}\n");
  const harness = [
    "set -e",
    restoreFn,
    rollbackFn,
    `cp() { echo "cp $*" >> "${callsLog}"; ${opts.cpFails ? "return 1" : "return 0"}; }`,
    `systemctl() { return 0; }`,
    `docker() { return 0; }`,
    `PROFILE_DIR="${dir}"; PROFILE_ENV_BAK="${dir}/e.bak"; COMPOSE_BAK="${dir}/c.bak"`,
    `DEFAULT_SITE_BAK="${bak}"; DEFAULT_SITE_REMOVED=${opts.removed ? "1" : "0"}`,
    `DEPLOY_VALIDATED=0; STACK_RECREATED=0; FRESH_DEPLOY=0; SITE_BAK=""`,
    "trap rollback_deploy EXIT",
    "( exit 5 )",
  ].join("\n");
  const res = spawnSync("/bin/bash", ["-c", harness], { encoding: "utf8" });
  const calls = fs.existsSync(callsLog)
    ? fs.readFileSync(callsLog, "utf8")
    : "";
  fs.rmSync(dir, { recursive: true, force: true });
  return { code: res.status ?? -1, stdout: res.stdout ?? "", calls };
}

describe("setup-profile.sh real default-site rollback behavior (extracted, EXIT-trap driven)", () => {
  test("default site WAS removed => rollback restores it; exit code preserved", () => {
    const { code, stdout, calls } = runDefaultSiteRollback({ removed: true });
    expect(stdout).toMatch(/restored the nginx default site/);
    expect(calls).toMatch(/cp .*\/etc\/nginx\/sites-enabled\/default/);
    expect(code).toBe(5);
  });

  test("default site NOT removed => rollback never touches it", () => {
    const { stdout, calls } = runDefaultSiteRollback({ removed: false });
    expect(stdout).not.toMatch(/nginx default site/);
    expect(calls).not.toMatch(/sites-enabled\/default/);
  });

  test("restore FAILS => reports the failure (no silent loss); exit code preserved", () => {
    const { code, stdout } = runDefaultSiteRollback({
      removed: true,
      cpFails: true,
    });
    expect(stdout).toMatch(/failed to restore the nginx default site/);
    expect(code).toBe(5);
  });
});

// ── Finding 2: a fresh first-TLS deploy whose certbot step fails must not leave nginx down ──
// certbot --standalone stops nginx; the OLD rollback case (b) ran `reload || stop`, but
// `reload` cannot start a stopped unit, so a previously-RUNNING nginx was left DOWN (and a
// misleading ✅ printed). Fix: capture NGINX_WAS_ACTIVE before the stop, and on rollback case
// (b) restore exactly that state (restart/start when it was up; leave it down otherwise).
describe("setup-profile.sh restores nginx to its prior run-state on a fresh certbot failure (Finding 2)", () => {
  const fullScript = fs.readFileSync(SETUP_PROFILE, "utf8");
  const rollbackFn =
    fullScript.match(/rollback_deploy\(\) \{[\s\S]*?\n\}/)?.[0] ?? "";

  test("captures NGINX_WAS_ACTIVE BEFORE the SITE_BAK backup AND before stopping nginx", () => {
    const idxCapture = firstIndex(
      /systemctl is-active --quiet nginx && NGINX_WAS_ACTIVE=1/,
    );
    // Must precede SITE_BAK's assignment: rollback case (b) keys off SITE_BAK and reads
    // NGINX_WAS_ACTIVE, so a failure between the two must not leave the flag unset.
    const idxSiteBak = firstIndex(/^\s*SITE_BAK="\$\{SITE_FILE\}\.bak\.\$\$"$/);
    const idxStop = firstIndex(/^\s*systemctl stop nginx \|\| true$/);
    expect(idxCapture).toBeGreaterThanOrEqual(0);
    expect(idxSiteBak).toBeGreaterThan(idxCapture);
    expect(idxStop).toBeGreaterThan(idxCapture);
  });

  test("rollback case (b) restores prior run-state (no `reload || stop` that leaves nginx down)", () => {
    expect(rollbackFn).toMatch(/^rollback_deploy\(\) \{/); // guard against a regex miss
    // case (b) brings nginx back up gated on the captured prior state...
    expect(rollbackFn).toMatch(/NGINX_WAS_ACTIVE:-0/);
    expect(rollbackFn).toMatch(
      /systemctl restart nginx \|\| systemctl start nginx/,
    );
    // ...and the buggy reload-or-stop fallback is gone from the whole rollback fn.
    expect(rollbackFn).not.toMatch(
      /systemctl reload nginx \|\| systemctl stop nginx/,
    );
  });

  // BEHAVIORAL: run the REAL rollback_deploy under a STATEFUL systemctl where `reload` fails
  // on a stopped unit (the actual systemd behavior the bug hinges on). Shape the
  // fresh-certbot-failure state: nginx was running, we stopped it for certbot, and there is
  // no prior profile site (SITE_BAK set, .bak absent => case b). Assert nginx ends RUNNING and
  // the original failure code is preserved.
  function runCertbotFailNginx(opts: { wasActive: boolean }): {
    state: string;
    stdout: string;
    code: number;
  } {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "certbot-nginx-"));
    const script = fs.readFileSync(SETUP_PROFILE, "utf8");
    const restoreFn =
      script.match(/restore_previous_config\(\) \{[\s\S]*?\n\}/)?.[0] ?? "";
    const rbFn = script.match(/rollback_deploy\(\) \{[\s\S]*?\n\}/)?.[0] ?? "";
    const stateFile = path.join(dir, "nginx.state");
    const systemctlStub = [
      "systemctl() {",
      '  case "$1" in',
      '    stop) echo stopped > "$STATE"; return 0 ;;',
      '    start|restart) echo running > "$STATE"; return 0 ;;',
      '    reload) [ "$(cat "$STATE")" = running ] && return 0 || return 1 ;;',
      '    is-active) [ "$(cat "$STATE")" = running ] && return 0 || return 1 ;;',
      "    *) return 0 ;;",
      "  esac",
      "}",
    ].join("\n");
    const harness = [
      "set -e",
      restoreFn,
      rbFn,
      `STATE="${stateFile}"`,
      `echo ${opts.wasActive ? "running" : "stopped"} > "$STATE"`,
      systemctlStub,
      "docker() { return 0; }",
      "rm() { return 0; }",
      "cp() { return 0; }",
      `PROFILE_DIR="${dir}"; PROFILE_ENV_BAK="${dir}/noenv"; COMPOSE_BAK="${dir}/nocompose"`,
      `DEFAULT_SITE_BAK="${dir}/nodefault"; DEFAULT_SITE_REMOVED=0`,
      // fresh first-TLS shape: no prior profile site => rollback case (b)
      `SITE_BAK="${dir}/profile.bak.absent"`,
      `NGINX_WAS_ACTIVE=${opts.wasActive ? "1" : "0"}`,
      "DEPLOY_VALIDATED=0; STACK_RECREATED=0; FRESH_DEPLOY=0",
      // mimic certbot prep: nginx is stopped right before the (failing) certbot step
      "systemctl stop nginx",
      "trap rollback_deploy EXIT",
      "( exit 7 )",
    ].join("\n");
    const res = spawnSync("/bin/bash", ["-c", harness], { encoding: "utf8" });
    const state = fs.existsSync(stateFile)
      ? fs.readFileSync(stateFile, "utf8").trim()
      : "";
    fs.rmSync(dir, { recursive: true, force: true });
    return { state, stdout: res.stdout ?? "", code: res.status ?? -1 };
  }

  test("nginx was running => rollback brings it back UP (the regression left it stopped); code preserved", () => {
    const { state, stdout, code } = runCertbotFailNginx({ wasActive: true });
    expect(state).toBe("running"); // the old `reload || stop` left this 'stopped'
    expect(stdout).toMatch(/nginx restored to running/);
    expect(code).toBe(7); // original deploy-failure code preserved, not masked
  });

  test("nginx was NOT running before => rollback leaves it stopped (no gratuitous start)", () => {
    const { state, stdout, code } = runCertbotFailNginx({ wasActive: false });
    expect(state).toBe("stopped");
    expect(stdout).toMatch(/left stopped/);
    expect(code).toBe(7);
  });
});

// ── Rollback reverts the systemd unit + cron file (resurrect-on-reboot fix) ──
// The EXIT trap is live through the systemd + cron sections, and the cron `cat`/`chmod` run
// AFTER `systemctl enable profile`. A failure there on a FRESH deploy used to leave
// profile.service ENABLED with compose/env preserved → a reboot resurrected the unvalidated
// stack. Fix: capture each file's pre-deploy state before writing, and on rollback restore the
// previous content (redeploy) or disable+remove (fresh).
describe("setup-profile.sh reverts the systemd unit + cron file on rollback (no resurrect-on-reboot)", () => {
  const fullScript = fs.readFileSync(SETUP_PROFILE, "utf8");
  const rollbackFn =
    fullScript.match(/rollback_deploy\(\) \{[\s\S]*?\n\}/)?.[0] ?? "";

  test("captures state, then marks WRITTEN BEFORE the heredoc (covers a mid-write failure)", () => {
    // Order: capture (cp + EXISTED) < WRITTEN=1 < the `cat` heredoc. The flag must precede the
    // write so a mid-write `cat` failure (e.g. disk full) still triggers the rollback
    // restore-or-remove — otherwise a redeploy would leave a truncated unit/cron unrestored.
    const idxUnitCap = firstIndex(
      /cp -f "\$SYSTEMD_UNIT" "\$SYSTEMD_UNIT_BAK"/,
    );
    const idxUnitFlag = firstIndex(/^SYSTEMD_WRITTEN=1$/);
    const idxUnitWrite = firstIndex(/^cat > "\$SYSTEMD_UNIT" << 'EOF'$/);
    expect(idxUnitCap).toBeGreaterThanOrEqual(0);
    expect(idxUnitFlag).toBeGreaterThan(idxUnitCap);
    expect(idxUnitWrite).toBeGreaterThan(idxUnitFlag);

    const idxCronCap = firstIndex(/cp -f "\$CRON_FILE" "\$CRON_FILE_BAK"/);
    const idxCronFlag = firstIndex(/^CRON_WRITTEN=1$/);
    const idxCronWrite = firstIndex(/^cat > "\$CRON_FILE" << EOF$/);
    expect(idxCronCap).toBeGreaterThanOrEqual(0);
    expect(idxCronFlag).toBeGreaterThan(idxCronCap);
    expect(idxCronWrite).toBeGreaterThan(idxCronFlag);
  });

  test("the success cleanup drops the new unit + cron backups", () => {
    expect(
      lines.some((l) =>
        /rm -f .*"\$SYSTEMD_UNIT_BAK" "\$CRON_FILE_BAK"/.test(l),
      ),
    ).toBe(true);
  });

  test("rollback disables+removes a fresh unit but restores a prior one (static)", () => {
    expect(rollbackFn).toMatch(/^rollback_deploy\(\) \{/); // guard against a regex miss
    expect(rollbackFn).toMatch(/SYSTEMD_WRITTEN:-0/);
    expect(rollbackFn).toMatch(/CRON_WRITTEN:-0/);
    expect(rollbackFn).toMatch(/systemctl disable profile/); // fresh path
    expect(rollbackFn).toMatch(/mv -f "\$SYSTEMD_UNIT_BAK" "\$SYSTEMD_UNIT"/); // redeploy restore
    expect(rollbackFn).toMatch(/systemctl daemon-reload/);
  });

  // BEHAVIORAL: run the REAL rollback_deploy with the systemd/cron written-flags set, real temp
  // files for the unit + cron, and a recording systemctl stub (mv/rm/cp run for real so file
  // effects are observable). Fresh => disable+remove (+ daemon-reload); redeploy => restore prior
  // content and do NOT disable. Exit code preserved in both.
  function runServiceRollback(opts: { existed: boolean }): {
    code: number;
    stdout: string;
    calls: string;
    unitContent: string | null;
    cronContent: string | null;
  } {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "svc-rollback-"));
    const script = fs.readFileSync(SETUP_PROFILE, "utf8");
    const restoreFn =
      script.match(/restore_previous_config\(\) \{[\s\S]*?\n\}/)?.[0] ?? "";
    const rbFn = script.match(/rollback_deploy\(\) \{[\s\S]*?\n\}/)?.[0] ?? "";
    const callsLog = path.join(dir, "calls");
    const unit = path.join(dir, "profile.service");
    const unitBak = path.join(dir, "profile.service.bak");
    const cron = path.join(dir, "profile-backups");
    const cronBak = path.join(dir, "profile-backups.bak");
    // The deploy just wrote the NEW unit + cron (always present at rollback time).
    fs.writeFileSync(unit, "NEW-UNIT\n");
    fs.writeFileSync(cron, "NEW-CRON\n");
    if (opts.existed) {
      // Redeploy: a prior unit + cron were backed up before the overwrite.
      fs.writeFileSync(unitBak, "OLD-UNIT\n");
      fs.writeFileSync(cronBak, "OLD-CRON\n");
    }
    const harness = [
      "set -e",
      restoreFn,
      rbFn,
      `systemctl() { echo "systemctl $*" >> "${callsLog}"; return 0; }`,
      `docker() { echo "docker $*" >> "${callsLog}"; return 0; }`,
      `SYSTEMD_UNIT="${unit}"; SYSTEMD_UNIT_BAK="${unitBak}"`,
      `CRON_FILE="${cron}"; CRON_FILE_BAK="${cronBak}"`,
      `PROFILE_SERVICE_EXISTED=${opts.existed ? "1" : "0"}; SYSTEMD_WRITTEN=1`,
      `CRON_EXISTED=${opts.existed ? "1" : "0"}; CRON_WRITTEN=1`,
      // keep the other rollback branches inert (no nginx, no stack work).
      `PROFILE_DIR="${dir}"; PROFILE_ENV_BAK="${dir}/noenv"; COMPOSE_BAK="${dir}/nocompose"`,
      `DEFAULT_SITE_BAK="${dir}/nodefault"; DEFAULT_SITE_REMOVED=0`,
      `DEPLOY_VALIDATED=0; STACK_RECREATED=0; FRESH_DEPLOY=0; SITE_BAK=""`,
      "trap rollback_deploy EXIT",
      "( exit 7 )",
    ].join("\n");
    const res = spawnSync("/bin/bash", ["-c", harness], { encoding: "utf8" });
    const read = (p: string) =>
      fs.existsSync(p) ? fs.readFileSync(p, "utf8").trim() : null;
    const out = {
      code: res.status ?? -1,
      stdout: res.stdout ?? "",
      calls: fs.existsSync(callsLog) ? fs.readFileSync(callsLog, "utf8") : "",
      unitContent: read(unit),
      cronContent: read(cron),
    };
    fs.rmSync(dir, { recursive: true, force: true });
    return out;
  }

  test("FRESH deploy: rollback disables + removes the service and removes the cron file", () => {
    const r = runServiceRollback({ existed: false });
    expect(r.calls).toMatch(/systemctl disable profile/);
    expect(r.calls).toMatch(/systemctl daemon-reload/);
    expect(r.unitContent).toBeNull(); // profile.service removed
    expect(r.cronContent).toBeNull(); // cron file removed
    expect(r.stdout).toMatch(
      /disabled and removed the newly-created profile\.service/,
    );
    expect(r.stdout).toMatch(/removed the newly-created cron file/);
    expect(r.code).toBe(7); // original failure code preserved
  });

  test("REDEPLOY: rollback restores the previous unit + cron content (does NOT disable)", () => {
    const r = runServiceRollback({ existed: true });
    expect(r.unitContent).toBe("OLD-UNIT"); // previous unit restored from backup
    expect(r.cronContent).toBe("OLD-CRON"); // previous cron restored from backup
    expect(r.calls).toMatch(/systemctl daemon-reload/);
    expect(r.calls).not.toMatch(/systemctl disable profile/); // was enabled before — keep it
    expect(r.stdout).toMatch(/restored the previous profile\.service/);
    expect(r.stdout).toMatch(/restored the previous cron file/);
    expect(r.code).toBe(7);
  });
});

// ── Finding 2: a failed FIRST deploy must not leave unvalidated config as a future rollback target ──
// FRESH_DEPLOY is computed from config-file presence. A fresh deploy that fails BEFORE the stack
// recreate (e.g. `docker compose pull profile-api` fails) used to leave profile.env +
// docker-compose.yml on disk; the NEXT run treated them as an existing deploy, backed them up, and a
// later failure could recreate that never-validated config as "previous" (it is @sha256-pinned, so
// the digest gate passes). Fix: the fresh-failure rollback ALWAYS removes the unvalidated config.
describe("setup-profile.sh removes unvalidated config on a fresh-deploy failure (Finding 2)", () => {
  // Run the REAL rollback_deploy with FRESH_DEPLOY=1, NO backups, and real temp profile.env +
  // docker-compose.yml present. Assert both are removed and the original exit code is preserved.
  function runFreshFail(opts: { stackRecreated: boolean }): {
    code: number;
    stdout: string;
    envExists: boolean;
    composeExists: boolean;
    downCalled: boolean;
  } {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fresh-fail-"));
    const script = fs.readFileSync(SETUP_PROFILE, "utf8");
    const restoreFn =
      script.match(/restore_previous_config\(\) \{[\s\S]*?\n\}/)?.[0] ?? "";
    const rbFn = script.match(/rollback_deploy\(\) \{[\s\S]*?\n\}/)?.[0] ?? "";
    const callsLog = path.join(dir, "calls");
    const env = path.join(dir, "profile.env");
    const compose = path.join(dir, "docker-compose.yml");
    fs.writeFileSync(env, "UNVALIDATED-ENV\n");
    fs.writeFileSync(
      compose,
      "services:\n  profile-api:\n    image: repo/img@sha256:NEW\n",
    );
    const harness = [
      "set -e",
      restoreFn,
      rbFn,
      `docker() { echo "docker $*" >> "${callsLog}"; return 0; }`,
      "systemctl() { return 0; }",
      `PROFILE_DIR="${dir}"`,
      // No backups => fresh. Keep nginx/systemd/cron/default-site branches inert.
      `PROFILE_ENV_BAK="${dir}/noenv"; COMPOSE_BAK="${dir}/nocompose"`,
      `DEFAULT_SITE_BAK="${dir}/nodefault"; DEFAULT_SITE_REMOVED=0; SITE_BAK=""`,
      `DEPLOY_VALIDATED=0; FRESH_DEPLOY=1; STACK_RECREATED=${opts.stackRecreated ? "1" : "0"}`,
      "trap rollback_deploy EXIT",
      "( exit 7 )",
    ].join("\n");
    const res = spawnSync("/bin/bash", ["-c", harness], { encoding: "utf8" });
    const calls = fs.existsSync(callsLog)
      ? fs.readFileSync(callsLog, "utf8")
      : "";
    const out = {
      code: res.status ?? -1,
      stdout: res.stdout ?? "",
      envExists: fs.existsSync(env),
      composeExists: fs.existsSync(compose),
      downCalled: /docker compose down\b/.test(calls),
    };
    fs.rmSync(dir, { recursive: true, force: true });
    return out;
  }

  test("fresh fail BEFORE the stack recreate (pull failed): removes config, no stack stop", () => {
    const r = runFreshFail({ stackRecreated: false });
    expect(r.envExists).toBe(false); // unvalidated profile.env removed
    expect(r.composeExists).toBe(false); // unvalidated docker-compose.yml removed
    expect(r.downCalled).toBe(false); // no stack was created → nothing to stop
    expect(r.stdout).toMatch(
      /removed the unvalidated profile\.env \+ docker-compose\.yml/,
    );
    expect(r.code).toBe(7); // original failure code preserved
  });

  test("fresh fail AFTER the stack recreate: stops the stack AND removes config; volume hint", () => {
    const r = runFreshFail({ stackRecreated: true });
    expect(r.downCalled).toBe(true); // unvalidated stack stopped...
    expect(r.envExists).toBe(false); // ...and config removed
    expect(r.composeExists).toBe(false);
    // The reset hint is compose-file-free (the compose file was just removed).
    expect(r.stdout).toMatch(/docker volume rm profile_postgres_data/);
    expect(r.code).toBe(7);
  });
});

// ── Rollback must not report success before the restored stack is HEALTHY ──
// On a redeploy rollback the script recreates the previous API with `docker compose up -d`, which
// returns once the container is STARTED, not healthy (no --wait; --no-deps drops the depends_on
// health-wait). The fix waits on the SAME all_services_running_healthy assertion the forward path
// uses before declaring recovery — a started-but-unhealthy old image must read as ROLLBACK FAILED.
describe("setup-profile.sh rollback waits for the restored stack to be healthy", () => {
  // STATIC: the health assertions are defined BEFORE the trap so the rollback can call them (they
  // used to live after the forward recreate, where an early failure would leave them undefined).
  test("the health assertions are defined before the rollback trap", () => {
    const idxAll = firstIndex(/^all_services_running_healthy\(\) \{$/);
    const idxTrap = firstIndex(/^trap rollback_deploy EXIT$/);
    expect(idxAll).toBeGreaterThanOrEqual(0);
    expect(idxTrap).toBeGreaterThan(idxAll);
  });

  // BEHAVIORAL: run the REAL rollback_deploy + the REAL health functions through the
  // redeploy-recreate path. `sleep` is a no-op so the unhealthy case's bounded wait runs instantly;
  // the docker stub reports the restored services as running + $HEALTH.
  function runRedeployRecreate(opts: { healthy: boolean }): {
    code: number;
    stdout: string;
  } {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rb-health-"));
    const script = fs.readFileSync(SETUP_PROFILE, "utf8");
    const restoreFn =
      script.match(/restore_previous_config\(\) \{[\s\S]*?\n\}/)?.[0] ?? "";
    const rbFn = script.match(/rollback_deploy\(\) \{[\s\S]*?\n\}/)?.[0] ?? "";
    const svcFn =
      script.match(/service_running_healthy\(\) \{[\s\S]*?\n\}/)?.[0] ?? "";
    const allFn =
      script.match(/all_services_running_healthy\(\) \{[\s\S]*?\n\}/)?.[0] ??
      "";
    expect(restoreFn).not.toBe("");
    expect(rbFn).not.toBe("");
    expect(svcFn).not.toBe("");
    expect(allFn).not.toBe("");
    const callsLog = path.join(dir, "calls");
    // Backups exist => redeploy branch; the restored compose is @sha256-pinned => digest gate passes.
    fs.writeFileSync(path.join(dir, "envbak"), "OLD-ENV\n");
    fs.writeFileSync(
      path.join(dir, "composebak"),
      "services:\n  profile-api:\n    image: repo/img@sha256:OLDGOOD\n",
    );
    const dockerStub = [
      "docker() {",
      '  if [ "$1" = compose ] && [ "$2" = up ]; then return 0; fi',
      '  if [ "$1" = compose ] && [ "$2" = ps ] && [ "$3" = "-q" ]; then echo "cid-$4"; return 0; fi',
      '  if [ "$1" = inspect ]; then',
      '    case "$3" in',
      "      *State.Status*) echo running ;;",
      '      *State.Health*) echo "$HEALTH" ;;',
      "    esac",
      "    return 0",
      "  fi",
      `  echo "docker $*" >> "${callsLog}"`,
      "  return 0",
      "}",
    ].join("\n");
    const harness = [
      "set -e",
      "sleep() { :; }", // no-op so the bounded health-wait loop runs instantly
      dockerStub,
      svcFn,
      allFn,
      'EXPECTED_SERVICES="postgres profile-api"',
      restoreFn,
      rbFn,
      `PROFILE_DIR="${dir}"`,
      `PROFILE_ENV_BAK="${dir}/envbak"; COMPOSE_BAK="${dir}/composebak"`,
      `DEFAULT_SITE_BAK="${dir}/nodefault"; DEFAULT_SITE_REMOVED=0; SITE_BAK=""`,
      "CRON_WRITTEN=0; SYSTEMD_WRITTEN=0",
      "DEPLOY_VALIDATED=0; FRESH_DEPLOY=0; STACK_RECREATED=1",
      "trap rollback_deploy EXIT",
      "( exit 7 )",
    ].join("\n");
    const res = spawnSync("/bin/bash", ["-c", harness], {
      encoding: "utf8",
      env: { ...process.env, HEALTH: opts.healthy ? "healthy" : "unhealthy" },
    });
    const out = { code: res.status ?? -1, stdout: res.stdout ?? "" };
    fs.rmSync(dir, { recursive: true, force: true });
    return out;
  }

  test("a restored stack that becomes healthy reports success", () => {
    const r = runRedeployRecreate({ healthy: true });
    expect(r.stdout).toMatch(/previous stack restored and healthy/);
    expect(r.stdout).not.toMatch(/ROLLBACK FAILED/);
    expect(r.code).toBe(7); // original failure code preserved
  });

  test("a restored stack that never becomes healthy reports ROLLBACK FAILED (no false success)", () => {
    const r = runRedeployRecreate({ healthy: false });
    expect(r.stdout).toMatch(/ROLLBACK FAILED/);
    expect(r.stdout).toMatch(/did NOT become/);
    expect(r.stdout).not.toMatch(/restored and healthy/);
    expect(r.code).toBe(7);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Process review #14 — on a REDEPLOY (postgres already running), the EXACT DATABASE_URL must be
// validated BEFORE the destructive force-recreate, so a wrong operator override aborts while the
// previous API is still live, instead of replacing it with a DB-broken container that only the
// post-recreate gate would catch (transient outage; persistent if rollback recreation then
// fails). The FRESH-deploy path has no running postgres here, so it keeps its post-recreate gate.
// ─────────────────────────────────────────────────────────────────────────────
const setupScript = lines.join("\n");

describe("setup-profile.sh redeploy preflight validates DATABASE_URL before the recreate", () => {
  test("pre-recreate probe_database_url runs in the redeploy block, after discrete creds, before STACK_RECREATED/recreate", () => {
    const idxPgDetect = firstIndex(
      /if \[ -n "\$\(docker compose ps -q postgres/,
    );
    const idxDiscrete = firstIndex(/if ! probe_db_credentials; then/);
    const idxPreUrl = firstIndex(
      /if ! probe_database_url "\$DATABASE_URL"; then/,
    );
    const idxStackSet = firstIndex(/^STACK_RECREATED=1$/);
    const idxRecreate = firstIndex(
      /^docker compose up -d --force-recreate --no-deps profile-api$/,
    );
    for (const i of [
      idxPgDetect,
      idxDiscrete,
      idxPreUrl,
      idxStackSet,
      idxRecreate,
    ]) {
      expect(i).toBeGreaterThanOrEqual(0);
    }
    expect(idxDiscrete).toBeGreaterThan(idxPgDetect); // inside the redeploy block
    expect(idxPreUrl).toBeGreaterThan(idxDiscrete); // after the discrete-cred check
    expect(idxPreUrl).toBeLessThan(idxStackSet); // BEFORE the stack is marked touched
    expect(idxPreUrl).toBeLessThan(idxRecreate); // BEFORE the destructive recreate
  });

  test("BOTH DATABASE_URL gates exist (pre-recreate redeploy + post-recreate fresh path)", () => {
    const count = lines.filter((l) =>
      /if ! probe_database_url "\$DATABASE_URL"; then/.test(l),
    ).length;
    expect(count).toBe(2);
  });

  // Behavioral: run the REAL redeploy region with stubs. A failing pre-recreate URL probe must
  // abort (restore config) BEFORE any container-mutating `up`. The two `up` commands are
  // sentinels: if either runs, the live stack was touched.
  const redeployRegion =
    setupScript.match(
      /if \[ -n "\$\(docker compose ps -q postgres[\s\S]*?docker compose up -d --force-recreate --no-deps profile-api/,
    )?.[0] ?? "";

  test("guard: the redeploy region was extracted", () => {
    expect(redeployRegion).toMatch(
      /^if \[ -n "\$\(docker compose ps -q postgres/,
    );
    expect(redeployRegion).toMatch(/force-recreate --no-deps profile-api$/);
  });

  function runRedeployPreflight(opts: { urlProbeOk: boolean }): {
    code: number;
    restored: boolean;
    mutated: boolean;
  } {
    const harness = [
      "set -e",
      "PROFILE_DIR=/tmp/does-not-matter",
      'DATABASE_URL="postgresql://profile:pw@postgres:5432/profile"',
      // existing stack → redeploy path; the two `up` commands are FORBIDDEN sentinels.
      `docker() {
         case "$*" in
           "compose ps -q postgres") printf 'pg-cid\\n' ;;
           "compose pull profile-api") : ;;
           "compose up -d postgres") echo "MUTATED: up postgres"; exit 87 ;;
           "compose up -d --force-recreate --no-deps profile-api") echo "MUTATED: recreate"; exit 87 ;;
           *) : ;;
         esac
       }`,
      "probe_db_credentials() { return 0; }",
      `probe_database_url() { ${opts.urlProbeOk ? "return 0" : "return 1"}; }`,
      'restore_previous_config() { echo "RESTORE_CALLED"; }',
      redeployRegion,
      'echo "REACHED_RECREATE"',
    ].join("\n");
    const res = spawnSync("/bin/bash", ["-c", harness], { encoding: "utf8" });
    return {
      code: res.status ?? -1,
      restored: /RESTORE_CALLED/.test(res.stdout),
      mutated: /MUTATED:/.test(res.stdout),
    };
  }

  test("a bad DATABASE_URL on redeploy aborts + restores BEFORE any container is recreated", () => {
    const r = runRedeployPreflight({ urlProbeOk: false });
    expect(r.code).not.toBe(0); // aborted
    expect(r.restored).toBe(true); // previous config restored
    expect(r.mutated).toBe(false); // the live stack was NOT touched
  });

  test("a good DATABASE_URL on redeploy proceeds past the preflight (does not block a valid URL)", () => {
    const r = runRedeployPreflight({ urlProbeOk: true });
    expect(r.restored).toBe(false); // a valid URL is not treated as drift
    expect(r.mutated).toBe(true); // proceeds into the (sentinel) container converge
  });
});
