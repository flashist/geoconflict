/**
 * ShellHarnesses.test.ts — the `npm test` gate over the repository's shell test
 * harnesses (task 0201, Phase 2).
 *
 * WHY THIS FILE EXISTS. Several deploy/backup behaviours are covered only by hand-written
 * `.sh` harnesses. Nothing ran them: `jest.config.ts`'s `testRegex` is TS/TSX-only, and the
 * husky pre-commit hook is inert. A test nobody runs rots silently, which is exactly what
 * task 0201 was filed to stop. This file is the thinnest thing that makes `npm test` run
 * them.
 *
 * SHAPE. One `it` per harness, each shelling out via `spawnSync` and asserting BOTH exit 0 AND
 * the harness's own success marker. This mirrors `tests/scripts/ConfigParity.test.ts`, which
 * already shells out to `scripts/check-config-parity.mjs` from this same directory.
 *
 * WHY THE SUCCESS MARKER, NOT JUST EXIT 0. Exit-0-only is the weakest check available, and it
 * fails in exactly this task's own failure mode: a harness that regresses into asserting nothing
 * — an inserted early `exit 0`, an internal self-skip, a deleted trailing section — still exits 0
 * and would still report green. Each harness prints a positive marker only after it has actually
 * run its assertions, so the marker is what proves the run happened.
 *
 * WHY NOT A `posttest` NPM SCRIPT. `posttest` fires on `npm test -- tests/Attack.test.ts`
 * too, so the single-file workflow CLAUDE.md documents would pay the full shell cost on
 * every run. As a jest suite, a single-file run pays nothing.
 *
 * WHICH HARNESSES ARE HERE, AND WHICH IS NOT — see the CLAUDE.md Testing section for the
 * full rationale and the owner's rulings. In short: the three below are in;
 * `tests/profile-backup-dryrun.sh` is deliberately OUT (it hard-fails without Docker plus
 * `age`, `age-keygen`, `rclone`, `curl` and `jq`) and is exposed as
 * `npm run test:scripts:docker` instead.
 */

import { spawnSync } from "node:child_process";
import path from "node:path";

const REPO_ROOT = path.resolve(__dirname, "..", "..");

/**
 * Jest's default per-test timeout is 5000 ms. The hardening harness alone runs for ~16 s,
 * so without an explicit override it would fail with the literal string
 * "Exceeded timeout of 5000 ms" — which CLAUDE.md documents as the signature of the known
 * supertest flake. A gate whose normal failure mode impersonates a known flake is worse than
 * no gate, so the timeouts below are load-bearing, not defensive padding.
 */
const JEST_TIMEOUT_MS = 180_000;

/**
 * `spawnSync` blocks the jest worker thread, so jest's own timeout cannot interrupt it. The
 * effective deadline is therefore this one, and it is deliberately below JEST_TIMEOUT_MS so a
 * hung harness is reported by us — with a message that names the harness — rather than by
 * jest failing to fire.
 */
const HARNESS_TIMEOUT_MS = 150_000;

const MAX_HARNESS_OUTPUT_BYTES = 10 * 1024 * 1024;

/**
 * `scripts/test-check-docker-secret-boundary.sh` prints this and exits 0 when it finds no
 * usable Docker daemon. That is a legitimate self-skip inside the harness — but it means the
 * harness asserted nothing, so the wrapper must never let it read as a pass.
 */
const DOCKER_HARNESS_SELF_SKIP_MARKER = "SKIP: Docker is not available";

interface HarnessSpec {
  /** Path relative to the repository root. */
  relativePath: string;
  /**
   * Printed by the harness only after it has actually run its assertions and all of them
   * passed. Absent output means the harness asserted nothing, whatever its exit status says.
   */
  successMarker: RegExp;
  /** Human-readable form of `successMarker`, for the failure message. */
  successMarkerDescription: string;
}

/**
 * Run one harness and return its exit status plus combined stdout+stderr.
 *
 * Invoked as `bash <path>`, never `./<path>`: `tests/scripts/profile-deploy-hardening.test.sh`
 * is mode 644 and is not executable, unlike the other harnesses.
 */
function runShellHarness(relativePath: string): {
  status: number | null;
  output: string;
  timedOut: boolean;
} {
  const result = spawnSync("bash", [path.join(REPO_ROOT, relativePath)], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    maxBuffer: MAX_HARNESS_OUTPUT_BYTES,
    timeout: HARNESS_TIMEOUT_MS,
  });

  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;

  /**
   * Test the error code, not `signal === "SIGTERM"`. Node raises SIGTERM for an output
   * overflow too (`ENOBUFS`), so the looser check reported a 10 MB overflow as "this harness
   * is hanging" — a false diagnosis stated emphatically. Measured on this host, Node
   * v24.13.0: timeout → `ETIMEDOUT`, overflow → `ENOBUFS`, both with `signal: "SIGTERM"`.
   *
   * This also catches the case where the deadline fires while the direct child has already
   * exited 0 (a backgrounded grandchild still holding stdio): measured as
   * `{ status: 0, signal: null, error: ETIMEDOUT }`, which the old check missed entirely and
   * would have reported as a green pass on a truncated run.
   */
  const spawnError = result.error as NodeJS.ErrnoException | undefined;
  const timedOut = spawnError?.code === "ETIMEDOUT";

  return { status: result.status, output, timedOut };
}

/**
 * Assert a harness ran and passed — exit 0 AND its own success marker present — embedding its
 * full output in the failure message so the harness's own ❌ / FAIL lines are visible in jest's
 * report rather than swallowed.
 */
function expectHarnessToPass(spec: HarnessSpec): void {
  const { relativePath, successMarker, successMarkerDescription } = spec;
  const { status, output, timedOut } = runShellHarness(relativePath);

  if (timedOut) {
    throw new Error(
      `Shell harness ${relativePath} did not finish within ${HARNESS_TIMEOUT_MS} ms and was killed.\n` +
        `This is NOT the supertest flake documented in CLAUDE.md — it is this harness hanging.\n` +
        `--- harness output so far ---\n${output}`,
    );
  }

  if (status !== 0) {
    throw new Error(
      `Shell harness ${relativePath} failed with exit status ${String(status)}.\n` +
        `--- harness output ---\n${output}`,
    );
  }

  if (output.includes(DOCKER_HARNESS_SELF_SKIP_MARKER)) {
    throw new Error(
      `Shell harness ${relativePath} exited 0 WITHOUT RUNNING: it self-skipped because the Docker ` +
        `daemon was unavailable when it ran, although the daemon answered the probe moments earlier.\n` +
        `This is reported as a FAILURE, not a pass — the harness asserted nothing. It is not a defect ` +
        `in the harness or in this gate.\n` +
        `Had the daemon been down at module load, jest would have reported this test as skipped instead.\n` +
        `Start Docker and re-run.\n` +
        `--- harness output ---\n${output}`,
    );
  }

  if (!successMarker.test(output)) {
    throw new Error(
      `Shell harness ${relativePath} exited 0 but never printed its success marker ` +
        `(${successMarkerDescription}).\n` +
        `Exit 0 alone does not prove it ran: an early exit, an internal self-skip or a deleted ` +
        `trailing section all exit 0 while asserting nothing. Treating that as a pass is the exact ` +
        `failure this gate exists to stop.\n` +
        `--- harness output ---\n${output}`,
    );
  }
}

/**
 * Probe the Docker daemon once, at module load. A harness that needs Docker must report
 * SKIPPED when the daemon is unavailable — never a green pass, which would be a gate that
 * silently stops gating. Docker Desktop on this project's machines cannot be started
 * headlessly, so "unavailable" is a normal state, not an error.
 *
 * ⚠️ This probe is a point in time; the daemon can go away between it and the harness run.
 * Jest has no runtime skip (jest-circus has no `pending()`), so that window cannot be turned
 * into a real `○ skipped`. It is closed in two other ways instead: the Docker test is ordered
 * FIRST in the file, so the window is milliseconds rather than the ~17 s of harness runs that
 * used to precede it; and if the harness self-skips anyway, `expectHarnessToPass` turns that
 * into a loud FAILURE. Either way it is never a green pass.
 */
function dockerDaemonIsAvailable(): boolean {
  const probe = spawnSync("docker", ["info"], {
    encoding: "utf8",
    timeout: 30_000,
  });
  return probe.status === 0;
}

const dockerAvailable = dockerDaemonIsAvailable();

if (!dockerAvailable) {
  console.warn(
    "[ShellHarnesses] Docker daemon unavailable — the docker-secret-boundary harness is SKIPPED, not passed. " +
      "Start Docker and re-run to exercise it.",
  );
}

const itWhenDockerAvailable = dockerAvailable ? it : it.skip;

describe("shell test harnesses", () => {
  // Ordered first, deliberately: it runs milliseconds after the Docker probe above, which is
  // the smallest window this file can give the daemon to disappear between probe and run.
  itWhenDockerAvailable(
    "docker secret boundary harness passes (scripts/test-check-docker-secret-boundary.sh)",
    () => {
      expectHarnessToPass({
        relativePath: "scripts/test-check-docker-secret-boundary.sh",
        // Printed by the harness's last line, "Passed: N   Failed: 0". This proves the harness
        // reached its end with a zero failure counter — NOT that every case ran. Its case 1
        // plants the bytes of a real local secret file and self-skips when the checkout has
        // none, so N varies by host (9 on a fresh clone, 10 with untracked `.env.*` present).
        successMarker: /^Passed: \d+\s+Failed: 0\s*$/m,
        successMarkerDescription: "a line reading `Passed: N   Failed: 0`",
      });
    },
    JEST_TIMEOUT_MS,
  );

  it(
    "profile deploy hardening harness passes (tests/scripts/profile-deploy-hardening.test.sh)",
    () => {
      expectHarnessToPass({
        relativePath: "tests/scripts/profile-deploy-hardening.test.sh",
        // Printed by the harness's final line only when its failure counter is zero.
        successMarker: /^ALL PASS$/m,
        successMarkerDescription: "a line reading `ALL PASS`",
      });
    },
    JEST_TIMEOUT_MS,
  );

  it(
    "profile backup redeploy harness passes (tests/profile-backup-redeploy.sh)",
    () => {
      expectHarnessToPass({
        relativePath: "tests/profile-backup-redeploy.sh",
        // Printed by the harness's final banner: "==== RESULT: N passed, 0 failed ====".
        successMarker: /RESULT: \d+ passed, 0 failed/,
        successMarkerDescription: "`RESULT: N passed, 0 failed`",
      });
    },
    JEST_TIMEOUT_MS,
  );
});
