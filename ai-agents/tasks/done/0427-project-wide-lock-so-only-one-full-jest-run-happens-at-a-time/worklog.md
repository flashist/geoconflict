# Worklog — 0427 Project-wide lock so only one full jest run happens at a time

## 2026-10-09 — built in the coordinating session

Started at the owner's request: *"start working on this task - we should implement this fix for JEST the first
thing"*. Rulings used (both via `AskUserQuestion`, 2026-10-09, quoted in the brief): a second full run **waits for its
turn with a clear message**; `--detectOpenHandles --forceExit` on the **normal unit run only**.

### What changed
- **`scripts/run-jest-with-project-lock.mjs`** (new) — wraps jest. Full runs take a lock in git's common dir
  (`geoconflict-jest-full-run.lock`, shared by every worktree); a second full run prints
  `[test lock] Waiting for its turn: another full test run (pid …, started at …)`, a reminder every minute, and starts
  by itself when the lock frees. Targeted runs (test path/pattern, `--watch`, `--watchAll`, `--findRelatedTests`,
  `--onlyChanged`, `--testPathPatterns`, …) never lock. Option values (`--maxWorkers 2`, `-t name`) are not mistaken
  for paths. Stale lock (holder pid dead) → taken over; unreadable lock → taken over only after 5 s. Signals forwarded
  to jest; the lock is released on exit; a waiting run cancelled holds nothing. No-git fallback: a git-ignored lock
  file in the repo root (the brief's default was "run unlocked with a warning" — a lock is the safer choice; flag).
- **`package.json`** — `test`: wrapper + `--detectOpenHandles --forceExit`; `test:coverage`: wrapper + `--coverage
  --detectOpenHandles --forceExit`; `test:integration`: wrapper + `--runInBand` (no `--forceExit`, CLAUDE.md rule).
- **`tests/scripts/RunJestWithProjectLock.test.ts`** (new) — 15 black-box tests with a temp lock and a stub runner.
- **`eslint.config.js`** — the wrapper joins the untyped `.mjs` block (allowDefaultProject is at its cap of 8).
- **`.gitignore`** — the no-git fallback lock file.
- **`CLAUDE.md`** — new "Only one full test run at a time" subsection; the `--maxWorkers=N` override is struck (no
  effect now); the supertest "did not exit" shape note.
- **`jest.config.ts`** — comment updated.

### Brief's open points, answered
1. **`--maxWorkers=N` override:** jest's own code (`@jest/core`: *"detectOpenHandles makes no sense without
   runInBand"*) forces in-band whenever `--detectOpenHandles` is on, so the override has **no effect** on `npm test`
   now. Jest does not refuse it (`npm test -- --maxWorkers=2 tests/Censor.test.ts` ran, 25/25). CLAUDE.md corrected.
2. **supertest "did not exit" shape:** noted in CLAUDE.md's flake table.
3. **Harness 150 s deadline / timing:** **not measured yet** — needs one full `npm test` run (see below).
4. **Full vs targeted:** as above; `-t <name>` alone stays a full run. **`pretest`** runs before the lock (tiny).
   **No git:** fallback lock file (see above). **No wait timeout.**
5. **Atomic acquire:** `writeFile` with `wx` (create-only). PID reuse: the lock stores pid + start time; the start
   time is shown, not checked — residual, documented.
6. Not a proven fix for the panics — stated in CLAUDE.md.

### Checks run (all targeted — no full run yet)
- `npm test -- tests/scripts/RunJestWithProjectLock.test.ts` → **15/15 passed** (targeted run, no lock).
- Real lock path, stub runner: a live holder made the run print the waiting message; killing the holder → "leftover
  lock … taking it over" → "It's our turn now" → stub ran with `--detectOpenHandles --forceExit` → lock released.
- `npm test -- --maxWorkers=2 tests/Censor.test.ts` → 25/25 (flag combo accepted).
- `npx eslint` on the touched files → clean. `npx tsc --noEmit -p .` → exit 0.

### Still to do
- One **full** `npm test` run through the wrapper: record wall time vs the 292 s baseline (2026-10-08) and that the
  shell harnesses stay under their 150 s deadline. Owner's OK asked first (CPU concerns).
- The owner's real two-terminal check (second full run waits, then starts).

### Full run through the wrapper — 2026-10-09 ~13:50Z (owner's OK: *"Yes, run it now (Recommended)"*)
- One full `npm test`, foreground, nothing else running alongside: **exit 0, wall 74 s** (jest `Time: 72.7 s`).
  **216/216 suites, 4400 passed, 1 skipped, 0 failed.** No flake this run; no open-handle report printed.
- The 1 skip is the Docker-probed `docker-secret-boundary` harness (Docker daemon down) — **skipped, not passed**, as
  designed. `ShellHarnesses.test.ts` took 34.6 s in total, well under each harness's 150 s deadline.
- vs the 2026-10-08 baseline (292 s, 1 worker, no flags): **not like-for-like** — front app and other load were not
  recorded either time. It does show the new flags did not make the run slow enough to threaten the harness deadlines.
- Not yet run: the owner's two-terminal check (second full run waits, then starts).

### Closed 2026-10-09 — `✅ Done (agent-closed — not owner-verified)`
- **Authority:** OWNER RULING 2026-10-09, typed live in the coordinating session: *"Commit, then close task"*. Closed by
  a spawned `fkit-producer` with no owner channel (ADR-021/037); ⛔ not producer precedent. Work committed in `1926f4c`.
- **Proof at close:** the 15 lock tests (15/15), the real-lock-path check with a stub runner, lint/tsc clean, and one
  full `npm test` through the wrapper (exit 0, 74 s, 216/216 suites, 4400 passed, 1 skipped — the Docker-probed
  harness, Docker down: skipped, not passed).
- **NOT done:** the owner's own two-terminal check (brief verification step 2 — second full run waits, then starts).
  The waiting behaviour is proven only by the automated tests and the stub check. Also not run by hand: verification
  steps 3 (`kill -9` stale lock) and 4 (`test:integration` waiting on the lock) as real runs — covered by the
  automated tests only, as far as this worklog records.
- **Timing caveat:** 74 s vs the 292 s baseline (2026-10-08) is **not like-for-like** (front app and other load not
  recorded either time).
- **Differs from the brief:** the no-git fallback takes a git-ignored lock file instead of the brief's default (run
  unlocked with a warning) — the coder's choice, recorded above.
