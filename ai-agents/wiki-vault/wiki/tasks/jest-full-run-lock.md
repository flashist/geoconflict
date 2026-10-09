# One Full Jest Run at a Time — a Project-Wide Lock, Plus `--detectOpenHandles --forceExit` on the Unit Run (task 0427)

**Source**: `ai-agents/tasks/done/0427-project-wide-lock-so-only-one-full-jest-run-happens-at-a-time/brief.md` (its `worklog.md` read as supporting evidence) + the committed `CLAUDE.md` § Testing subsection *"Only one full test run at a time — project lock (task `0427`, owner ruling 2026-10-09)"*
**Status**: done (agent-closed — not owner-verified) — committed in `1926f4c`, closed in `b6ca6f6`; test tooling only, nothing ships in a deploy
**Sprint/Tag**: Sprint 8, rank 26 (append rank, not a merit rank — on merit the board puts it in the top group) / task `0427`

> ✅ Closed 2026-10-09 by a spawned `fkit-producer`, on the owner's ruling typed live in the coordinating session,
> verbatim *"Commit, then close task"*. Filed the same day on an owner request — *"we should implement this fix for JEST
> the first thing (it's frustrating that the crashes keep happening). I still want to use the "jest --detectOpenHandles
> --forceExit" thing, just in case."* — plus two owner rulings (below). Built in the coordinating session in parallel
> with the filing.

## Goal

The owner's Mac kept crashing or overloading during full jest runs: kernel panics on **2026-10-06** and **2026-10-08**
(WindowServer watchdog, both during full `npm test` runs — the second with several agents each running a full run at
once), and on **2026-10-09** a session died of "CPU overflow" while a forgotten background full run was still going.

`jest.config.ts` already had `maxWorkers: 1` (owner ruling 2026-10-08 — see [[tasks/jest-worker-cap]]), but that cap is
**per run**: five agents each starting `npm test` still meant five full runs side by side. Nothing project-wide stopped
that. This task removes **the most likely load** — it does **not** prove the panics' cause, which stays unproven.

**Owner rulings (2026-10-09, live `AskUserQuestion`):**
1. A second full run **waits for its turn**, with a clear message — *"Can you do #2, but with clear message that it's
   waiting for its turn?"*
2. `--detectOpenHandles --forceExit` on the **normal unit run only** — *"Normal tests only (Recommended)"*. The
   integration suite keeps [[tasks/test-suite-reliability-investigation]]'s (`0197`) no-`--forceExit` rule.

## Key Changes

- **`scripts/run-jest-with-project-lock.mjs`** (new) — wraps jest for `npm test`, `npm run test:coverage` and
  `npm run test:integration`: **one lock shared by all three**.
  - **Where the lock lives:** `geoconflict-jest-full-run.lock` in git's common directory, so **every worktree of the
    project shares it**, and it is never committed. With no git directory it falls back to a git-ignored
    `.geoconflict-jest-full-run.lock` in the repo root. ⚠️ The brief's default here was "run unlocked with a warning";
    the coder chose a lock instead (recorded as a deviation in the worklog).
  - **Atomic take:** a create-only write (`wx`), so two runs cannot both create it.
  - **Wait message:** `[test lock] Waiting for its turn: another full test run (pid …, started at …) …`, a reminder
    every minute, then `It's our turn now` when the lock frees. **No timeout on the wait.** Ctrl-C while waiting exits
    and leaves the holder's lock alone.
  - **Stale lock:** if the holder's process is gone, the lock is **taken over automatically** with a one-line note, so
    a crashed run never blocks testing. An unreadable lock is taken over only after 5 s. To clear one by hand: delete
    the file.
  - **Targeted runs never lock or wait:** a test path or pattern, `--watch` / `--watchAll`, `--findRelatedTests`,
    `--onlyChanged`, `--testPathPatterns`, and similar. **`-t <name>` alone is still a full run** (it loads every file).
    Option values such as `--maxWorkers 2` are not mistaken for paths.
  - **`pretest`** (the map nation-count step) runs **before** the lock — it is tiny.
- **`package.json`** — `test` and `test:coverage` go through the wrapper **with `--detectOpenHandles --forceExit`**;
  `test:integration` goes through it with `--runInBand` and **no** `--forceExit`.
- **`tests/scripts/RunJestWithProjectLock.test.ts`** (new) — 15 black-box tests with a temporary lock file and a stub
  runner. It runs as a targeted run, so it never takes the real lock.
- `eslint.config.js` (the wrapper joins the untyped `.mjs` block), `.gitignore` (the fallback lock file), and a
  `jest.config.ts` comment.
- **`CLAUDE.md` § Testing** — new subsection for the lock; the `npm test -- --maxWorkers=N` override **struck** (see
  below); a note on the supertest flake's "did not exit" shape.

### What `--detectOpenHandles --forceExit` changes

- **`--maxWorkers=N` no longer does anything on `npm test`.** Jest forces in-band whenever `--detectOpenHandles` is on
  (jest's own code says it "makes no sense without runInBand"). Jest does **not** refuse the flag — a targeted run with
  `--maxWorkers=2` ran green — it just ignores it. `CLAUDE.md` now says so; [[tasks/jest-worker-cap]]'s override line is
  out of date for that reason.
- **`--forceExit` can hide a real handle leak in the unit suite.** Accepted by the owner (*"just in case"*). The
  integration suite keeps its guard — a hang there is still a real regression, per `0197`.
- **The supertest flake's `Jest did not exit one second after…` shape** ([[tasks/supertest-profile-server-flake]]) is
  now cut short on the unit run; `--detectOpenHandles` may print the open handle instead. Judge such a run by its other
  output.
- `--detectOpenHandles` adds some overhead per test.

## Outcome

**Proof at close (all from the worklog):**
- 15/15 lock tests passed (targeted run).
- The real lock path with a stub runner: a live holder made the run print the wait message; killing the holder led to
  the takeover note, then *"It's our turn now"*, then the stub ran with the two flags, then the lock was released.
- `eslint` on the touched files clean; `tsc --noEmit` exit 0.
- **One full `npm test` through the wrapper** (2026-10-09, owner OK *"Yes, run it now (Recommended)"*, nothing else
  running): **exit 0, 74 s wall clock; 216/216 suites, 4,400 passed, 1 skipped, 0 failed.** The skip is the
  Docker-probed harness (Docker down) — **skipped, not passed**. The shell-harness wrapper took 34.6 s, well under each
  harness's 150 s deadline. No flake, no open-handle report.
- ⚠️ **74 s vs the 292 s 1-worker baseline (2026-10-08) is NOT like-for-like** — the front app and other load were not
  recorded either time. It shows the new flags did not make runs slow enough to threaten the harness deadlines; it is
  not a speed-up claim.

**NOT done at close — stated in the worklog:**
- 🚩 **The owner's own two-terminal check** (a second full run waits, then starts by itself) — **not run.** The waiting
  behaviour is proven only by the automated tests and the stub check.
- The hand-run `kill -9` stale-lock check and the `test:integration`-waits-on-the-lock check — covered by automated
  tests only, as far as the worklog records.

**Residuals, accepted (in `CLAUDE.md`):**
- Two waiters that see the **same stale lock at the same instant** can both start (a few-millisecond window).
- **A reused process id** can make a dead run's lock look alive — the lock stores a start time, but it is **shown, not
  checked** (the brief asked for it to be checked; the worklog records it as a residual). Fix by deleting the file.
- ⚠️ **`npx jest` (or the jest binary called directly) bypasses the lock.** Always run tests through the npm scripts.
- The lock serializes runs; it does not make one run cheaper. Several agents still queue full runs one after another —
  slower overall, by design.

🚨 **Not a crash fix with proof.** The cause of the 2026-10-06 / 2026-10-08 panics is unproven. If the Mac crashes again
with only one full run going, that is new evidence — record it; do not read this task as having fixed it.

## Related

- [[tasks/jest-worker-cap]] — task `0399`: the per-run worker cap (4, then 1 by the 2026-10-08 ruling); this task's
  flags made its `--maxWorkers=N` override a no-op on `npm test`
- [[tasks/test-suite-reliability-investigation]] — task `0197`: removed `--forceExit` from the integration run; that rule
  stands, and the unit run now differs on purpose
- [[tasks/supertest-profile-server-flake]] — task `0200`: its "did not exit" shape is cut short on the unit run now
- [[systems/architecture-overview]] — the build/run/test section
- [[decisions/sprint-8]] — the board (rank 26)
