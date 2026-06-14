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
    expect(lines.some((l) => /\[ "\$STACK_RECREATED" = "1" \] && docker compose up/.test(l))).toBe(
      true,
    );
    const idxTrap = firstIndex(/^trap rollback_deploy EXIT$/);
    const idxFirstWrite = firstIndex(/cat > "\$PROFILE_DIR\/profile\.env"/);
    expect(idxTrap).toBeGreaterThanOrEqual(0);
    expect(idxFirstWrite).toBeGreaterThanOrEqual(0);
    expect(idxTrap).toBeLessThan(idxFirstWrite);
  });
});

// Behavioral harness: replicate the control flow (set -e + EXIT trap + STACK_RECREATED
// gate) with a stubbed `docker` whose FIRST `compose up` fails (simulating a partial
// recreate) and whose later calls succeed. Run it with the flag set BEFORE vs AFTER the
// destructive command to prove the ordering is what makes the rollback recreate fire.
function runHarness(order: "before" | "after"): { calls: string[]; env: string } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rollback-"));
  const setFlagBefore = order === "before" ? "STACK_RECREATED=1" : "";
  const setFlagAfter = order === "after" ? "STACK_RECREATED=1" : "";
  const script = `
set -e
WORK="${dir}"
PROFILE_ENV_BAK="$WORK/env.bak"
COMPOSE_BAK="$WORK/compose.bak"
echo OLD-ENV > "$PROFILE_ENV_BAK"
echo OLD-COMPOSE > "$COMPOSE_BAK"
echo NEW-ENV > "$WORK/profile.env"
echo NEW-COMPOSE > "$WORK/compose.yml"
: > "$WORK/calls.log"
DEPLOY_VALIDATED=0
STACK_RECREATED=0
SITE_BAK=""

# Stub docker: the first 'compose up' (the destructive recreate) fails after partial
# mutation; later 'compose up' calls (the rollback recreate) succeed.
docker() {
  if [ "$1" = compose ] && [ "$2" = up ]; then
    cnt=$(cat "$WORK/upcount" 2>/dev/null || echo 0)
    cnt=$((cnt + 1)); echo "$cnt" > "$WORK/upcount"
    echo "up-attempt-$cnt" >> "$WORK/calls.log"
    [ "$cnt" = 1 ] && return 1
    return 0
  fi
  echo "docker $*" >> "$WORK/calls.log"
  return 0
}

restore_previous_config() {
  [ -f "$PROFILE_ENV_BAK" ] && mv -f "$PROFILE_ENV_BAK" "$WORK/profile.env"
  [ -f "$COMPOSE_BAK" ] && mv -f "$COMPOSE_BAK" "$WORK/compose.yml"
  return 0
}
rollback_deploy() {
  [ "$DEPLOY_VALIDATED" = "1" ] && return 0
  if [ -f "$PROFILE_ENV_BAK" ] || [ -f "$COMPOSE_BAK" ]; then
    restore_previous_config
    [ "$STACK_RECREATED" = "1" ] && docker compose up -d --force-recreate || true
  fi
}
trap rollback_deploy EXIT

docker compose pull
${setFlagBefore}
docker compose up -d --force-recreate
${setFlagAfter}
`;
  spawnSync("bash", ["-c", script], { encoding: "utf8" });
  const calls = fs.readFileSync(path.join(dir, "calls.log"), "utf8").trim().split("\n");
  const env = fs.readFileSync(path.join(dir, "profile.env"), "utf8").trim();
  fs.rmSync(dir, { recursive: true, force: true });
  return { calls, env };
}

describe("setup-profile.sh rollback behavior on a partial compose-up failure", () => {
  test("flag set BEFORE the recreate: rollback restores config AND recreates the previous stack", () => {
    const { calls, env } = runHarness("before");
    expect(calls).toContain("up-attempt-1"); // destructive recreate attempted (and failed)
    expect(calls).toContain("up-attempt-2"); // rollback recreated the previous stack
    expect(env).toBe("OLD-ENV"); // previous config restored
  });

  test("flag set AFTER the recreate (the old bug): rollback restores config but SKIPS recreate", () => {
    const { calls, env } = runHarness("after");
    expect(calls).toContain("up-attempt-1"); // destructive recreate attempted (and failed)
    expect(calls).not.toContain("up-attempt-2"); // recreate skipped — stack left partial
    expect(env).toBe("OLD-ENV"); // config still restored, but the stack is not back up
  });
});
