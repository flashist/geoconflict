import { spawnSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

// Class D / F4: build-deploy-profile.sh used to write the deploy record as TWO unsynchronized
// appends with NO lock — a `{ body } | tee -a record` up front, then a separate
// `echo validation_result >> record` from the EXIT trap. Two concurrent deploys could
// interleave (a body landing without its matching result) and there was no serialization
// against the remote `--force-recreate` / fixed-name backups. The fix:
//   1. a fail-closed local lock (atomic mkdir mutex — portable; the host may be macOS, which
//      has no flock), acquired BEFORE the first record write and held across the SSH call;
//   2. the record written ATOMICALLY — body accumulated into a private temp, the single
//      result line appended to that SAME temp, then ONE `cat tmp >> record` under the lock.
// These tests lock that shape (static) and prove it (behavioral), with the OLD two-step
// pattern as the load-bearing control.

const REPO_ROOT = path.join(__dirname, "..", "..");
const BUILD_DEPLOY_PROFILE = path.join(REPO_ROOT, "build-deploy-profile.sh");
const buildLines = fs.readFileSync(BUILD_DEPLOY_PROFILE, "utf8").split("\n");
const firstIndex = (re: RegExp) => buildLines.findIndex((l) => re.test(l));

// Group a record file into blocks delimited by a leading "----" line.
function recordBlocks(record: string): string[][] {
  const out: string[][] = [];
  let cur: string[] | null = null;
  for (const line of record.split("\n")) {
    if (line === "----") {
      if (cur) out.push(cur);
      cur = [line];
    } else if (cur) {
      cur.push(line);
    }
  }
  if (cur) out.push(cur);
  return out;
}

const resultCount = (block: string[]) =>
  block.filter((l) => /^validation_result=/.test(l)).length;

describe("build-deploy-profile.sh deploy-record write is locked + atomic (static shape)", () => {
  test("the mkdir lock is acquired before the first record write", () => {
    const idxLock = firstIndex(
      /if ! mkdir "\$DEPLOY_LOCK" 2>\/dev\/null; then/,
    );
    const idxStage = firstIndex(/^DEPLOY_RECORD_TMP=\$\(mktemp\)$/);
    expect(idxLock).toBeGreaterThanOrEqual(0);
    expect(idxStage).toBeGreaterThan(idxLock);
  });

  test("a held lock is fail-closed (exit 1), not warn-and-continue", () => {
    const idxLock = firstIndex(
      /if ! mkdir "\$DEPLOY_LOCK" 2>\/dev\/null; then/,
    );
    const block = buildLines.slice(idxLock, idxLock + 6).join("\n");
    expect(block).toMatch(/another profile deploy is already running/);
    expect(block).toMatch(/\bexit 1\b/);
  });

  test("the old two-step `tee -a record` body write is gone", () => {
    expect(buildLines.some((l) => /tee -a "\$DEPLOY_RECORD"/.test(l))).toBe(
      false,
    );
    // the body is staged to the private temp instead.
    expect(buildLines.some((l) => /\| tee "\$DEPLOY_RECORD_TMP"/.test(l))).toBe(
      true,
    );
  });

  test("finalize appends the result to the temp, then writes the whole block in one append, then releases the lock", () => {
    expect(
      buildLines.some((l) =>
        /echo "validation_result=.*" >> "\$DEPLOY_RECORD_TMP"/.test(l),
      ),
    ).toBe(true);
    expect(
      buildLines.some((l) =>
        /cat "\$DEPLOY_RECORD_TMP" >> "\$DEPLOY_RECORD"/.test(l),
      ),
    ).toBe(true);
    expect(buildLines.some((l) => /rmdir "\$DEPLOY_LOCK"/.test(l))).toBe(true);
  });
});

// Behavioral: replicate the two mechanisms and run N writers concurrently.
function runConcurrent(mechanism: "new" | "old", n: number): string[][] {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "deploy-record-"));
  const rec = path.join(dir, "record");
  fs.writeFileSync(rec, "");
  const body =
    'echo "----"; echo "id=$ID"; for i in 1 2 3 4 5; do echo "body-$ID-$i"; done';
  const writer =
    mechanism === "new"
      ? `
new_writer() {
  local ID="$1" TMP
  TMP=$(mktemp)
  # acquire the atomic mkdir lock (spin to serialize for the test), held until release below
  while ! mkdir "$LOCK" 2>/dev/null; do sleep 0.003; done
  { ${body}; } > "$TMP"
  sleep 0.02                                  # widen any interleave window
  echo "validation_result=passed digest=sha256:$ID" >> "$TMP"
  cat "$TMP" >> "$REC"                         # ONE atomic append of the complete block
  rm -f "$TMP"
  rmdir "$LOCK" 2>/dev/null || true
}
for i in $(seq 1 ${n}); do ( new_writer "$i" ) & done
wait
`
      : `
old_writer() {
  local ID="$1"
  { ${body}; } >> "$REC"                       # step 1: body (no lock)
  sleep 0.15                                    # the EXIT-trap result lands much later
  echo "validation_result=passed digest=sha256:$ID" >> "$REC"   # step 2: result (separate append)
}
for i in $(seq 1 ${n}); do ( old_writer "$i" ) & done
wait
`;
  const harness = `set -e\nREC="${rec}"\nLOCK="${dir}/lock"\n${writer}`;
  spawnSync("/bin/bash", ["-c", harness], { encoding: "utf8" });
  const blocks = recordBlocks(fs.readFileSync(rec, "utf8"));
  fs.rmSync(dir, { recursive: true, force: true });
  return blocks;
}

describe("build-deploy-profile.sh record write under concurrency (behavioral)", () => {
  test("NEW mechanism: N concurrent writers => N complete contiguous blocks (each has exactly one result)", () => {
    const blocks = runConcurrent("new", 10);
    expect(blocks.length).toBe(10);
    for (const b of blocks) {
      expect(resultCount(b)).toBe(1); // body + its own result, never split
      const id = (b[1] ?? "").replace("id=", "");
      // body lines belong to the SAME id (no foreign body interleaved into this block)
      const foreign = b.filter(
        (l) =>
          /^body-/.test(l) &&
          l !== `body-${id}-1` &&
          !l.startsWith(`body-${id}-`),
      );
      expect(foreign).toEqual([]);
      expect(b).toContain(`validation_result=passed digest=sha256:${id}`);
    }
  });

  test("OLD two-step pattern (the code being replaced): concurrent writers corrupt the record", () => {
    // Control proving the atomic single-append fix is load-bearing: with body and result as
    // two separate appends and no lock, a block lands without its matching result.
    const blocks = runConcurrent("old", 2);
    const corrupt = blocks.filter((b) => resultCount(b) !== 1);
    expect(corrupt.length).toBeGreaterThan(0);
  });
});

describe("build-deploy-profile.sh local lock is fail-closed (behavioral)", () => {
  test("a second deploy while the lock is held aborts (exit 1) and writes nothing", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "deploy-lock-"));
    const rec = path.join(dir, "record");
    const lock = path.join(dir, "lock");
    fs.writeFileSync(rec, "");
    fs.mkdirSync(lock); // a concurrent deploy already holds the lock
    const harness = [
      "set -e",
      `REC="${rec}"`,
      `DEPLOY_LOCK="${lock}"`,
      'if ! mkdir "$DEPLOY_LOCK" 2>/dev/null; then echo "another profile deploy is already running" >&2; exit 1; fi',
      'echo "should-not-be-written" >> "$REC"',
    ].join("\n");
    const res = spawnSync("/bin/bash", ["-c", harness], { encoding: "utf8" });
    const recordContents = fs.readFileSync(rec, "utf8");
    fs.rmSync(dir, { recursive: true, force: true });
    expect(res.status).toBe(1);
    expect(recordContents).toBe(""); // fail-closed: nothing written
  });
});

// finalize_deploy is the EXIT trap and the SINGLE record writer + lock releaser. A
// record-write failure (disk full, bad path) must NOT abort the trap under set -e before the
// lock is released — a skipped rmdir would leave a stale lock that blocks EVERY future deploy.
// This runs the REAL finalize_deploy extracted from the script, forcing the record append to
// fail, and asserts the lock is still released.
describe("build-deploy-profile.sh finalize_deploy releases the lock even if the record write fails", () => {
  test("a failing record append still reaches the rmdir lock release", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "finalize-"));
    const script = fs.readFileSync(BUILD_DEPLOY_PROFILE, "utf8");
    const finalizeFn =
      script.match(/finalize_deploy\(\) \{[\s\S]*?\n\}/)?.[0] ?? "";
    expect(finalizeFn).toMatch(/finalize_deploy\(\) \{/); // guard against a regex miss

    const tmp = path.join(dir, "body.tmp");
    fs.writeFileSync(tmp, "----\nid=x\n");
    const lock = path.join(dir, "lock");
    fs.mkdirSync(lock); // the lock is held
    const harness = [
      "set -e",
      finalizeFn,
      // Minimal state finalize_deploy reads; the SSH cleanup branch is gated off.
      'LOCAL_TMPENV=""; REMOTE_ENV_STAGED=0; DEPLOY_FINALIZED=0',
      'DEPLOY_OUTCOME="passed"; PROFILE_DIGEST="sha256:abc"',
      `DEPLOY_RECORD_TMP="${tmp}"`,
      // Unwritable record path (parent dir does not exist) => the `cat >> record` fails.
      `DEPLOY_RECORD="${dir}/nope/record"`,
      `DEPLOY_LOCK="${lock}"; DEPLOY_LOCK_HELD=1`,
      "finalize_deploy",
    ].join("\n");
    const res = spawnSync("/bin/bash", ["-c", harness], { encoding: "utf8" });
    const lockStillThere = fs.existsSync(lock);
    fs.rmSync(dir, { recursive: true, force: true });
    expect(res.status).toBe(0); // the trap completed (did not abort on the write failure)
    expect(lockStillThere).toBe(false); // lock released despite the failed record write
    expect(res.stderr ?? "").toMatch(/could not write the deploy record/);
  });
});
