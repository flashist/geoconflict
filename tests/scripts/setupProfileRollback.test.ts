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
  test("STACK_RECREATED flips to 1 after `docker compose pull` and before the destructive recreate", () => {
    const idxPull = firstIndex(/^docker compose pull$/);
    const idxStackSet = firstIndex(/^STACK_RECREATED=1$/);
    const idxRecreate = firstIndex(/^docker compose up -d --force-recreate$/);

    expect(idxPull).toBeGreaterThanOrEqual(0);
    expect(idxStackSet).toBeGreaterThanOrEqual(0);
    expect(idxRecreate).toBeGreaterThanOrEqual(0);

    // pull < STACK_RECREATED=1 < the destructive recreate.
    expect(idxPull).toBeLessThan(idxStackSet);
    expect(idxStackSet).toBeLessThan(idxRecreate);
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

describe("setup-profile.sh fresh-deploy failure handling (never auto-deletes the volume)", () => {
  test("computes FRESH_DEPLOY and gives the fresh-failure recovery branch", () => {
    expect(lines.some((l) => /^FRESH_DEPLOY=/.test(l))).toBe(true);
    expect(
      lines.some((l) =>
        /elif \[ "\$FRESH_DEPLOY" = "1" \] && \[ "\$STACK_RECREATED" = "1" \]/.test(
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
    systemctl reload nginx 2>/dev/null || systemctl stop nginx 2>/dev/null || true
  fi
  if [ -f "$PROFILE_ENV_BAK" ] || [ -f "$COMPOSE_BAK" ]; then
    restore_previous_config
    [ "$STACK_RECREATED" = "1" ] && docker compose up -d --force-recreate || true
  elif [ "$FRESH_DEPLOY" = "1" ] && [ "$STACK_RECREATED" = "1" ]; then
    docker compose down 2>/dev/null || true
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
  const callsLog = path.join(dir, "calls");
  const harness = [
    "set -e",
    restoreFn,
    rollbackFn,
    `FAILUP=${opts.recreateFails ? "1" : "0"}`,
    `docker() { echo "docker $*" >> "${callsLog}"; if [ "$1 $2" = "compose up" ] && [ "$FAILUP" = "1" ]; then return 1; fi; return 0; }`,
    `systemctl() { return 0; }`,
    `PROFILE_DIR="${dir}"; PROFILE_ENV_BAK="${dir}/e.bak"; COMPOSE_BAK="${dir}/c.bak"`,
    `echo old > "$PROFILE_ENV_BAK"; echo old > "$COMPOSE_BAK"`,
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
