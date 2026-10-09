# Project-wide lock so only one full jest run happens at a time, plus `--detectOpenHandles --forceExit` on the unit run

## ID
0427

> ℹ️ **ID allocation, checked 2026-10-09 before filing.** Highest ID across `backlog/`, `done/` and `cancelled/`
> (folder names and `## ID` fields agree) is `0426`, so this is `0427`. No folder named `0427-*` existed.

## Sprint
Sprint 8

📌 **Filed 2026-10-09 on an OWNER REQUEST plus two OWNER RULINGS**, given in the coordinating Claude Code session and
relayed to a spawned `fkit-producer` with no owner channel (ADR-021/037). ⛔ Not producer precedent. Verbatim:
- Request (the owner's own message): *"Brief a task and add it to Sprint 8, and start working on this task - we should
  implement this fix for JEST the first thing (it's frustrating that the crashes keep happening). I still want to use the
  "jest --detectOpenHandles --forceExit" thing, just in case."*
- Ruling 1 (live `AskUserQuestion`): a second full run **waits for its turn** — *"Can you do #2, but with clear message
  that it's waiting for its turn?"*
- Ruling 2 (live `AskUserQuestion`): `--detectOpenHandles --forceExit` on the **normal unit run only** —
  *"Normal tests only (Recommended)"*.

The coordinating session is implementing this in parallel with the filing.

## Priority
26

⚠️ Priority 26 is append rank, NOT a merit ranking — flagged for owner confirmation.
**On merit this belongs at the very top of this board, directly beside `0370`**, because the owner asked for it *"the
first thing"*: every full test run on the owner's Mac today risks another crash, and it slows or blocks every other
task's verification. Not inserted there: closed rows sit below the top (`0373`, `0363`, `0358`, `0392`–`0404`, `0422`),
and ADR-035 never renumbers them — a new row always appends. Appended after the highest (25, `0213`). **Read it as the
top group** — the coordinating session is already working it.

## Status
✅ Done (agent-closed — not owner-verified)

## Owner
fkit-coder

## Context

**The problem.** The owner's Mac keeps crashing or overloading during full jest runs:
- kernel panics on **2026-10-06** and **2026-10-08** (WindowServer watchdog), both during full `npm test` runs — the
  second with several agents each running a full run at once (task `0399`; CLAUDE.md "`npm test` runs 1 jest worker");
- **2026-10-09 ~16:00 MSK**, a session died from "CPU overflow" while a forgotten background full run was still going.

**What already exists, and why it is not enough.** `jest.config.ts` sets `maxWorkers: 1` (owner ruling 2026-10-08), so one
run uses one worker — the same as `--runInBand`. But that cap is **per run**. Five agents each starting `npm test` still
give five full runs side by side, plus each run's shell harnesses. Nothing project-wide stops that. **Cause of the panics
is still unproven** (`0399`); this task removes the most likely load, it does not prove the cause.

**What the owner wants.**
1. Only **one full test run at a time** across the whole project — every worktree included.
2. A second full run **waits its turn**, says so clearly, and starts by itself when the first ends (Ruling 1).
3. `--detectOpenHandles --forceExit` on the **normal unit run** (`npm test`) and the coverage run, *"just in case"*
   (request + Ruling 2). The integration suite keeps its no-`--forceExit` rule.

**Prior decisions this touches — read before planning.**
- ⚠️ **`0197` deliberately REMOVED `--forceExit` from the integration run** so a real handle leak shows up as a visible
  hang (wiki: `wiki/tasks/test-suite-reliability-investigation.md`; CLAUDE.md "There is deliberately no `--forceExit`").
  That rule is about the **integration** suite and **stays in force** — Ruling 2 keeps `--forceExit` off it. Adding
  `--forceExit` to the **unit** run is a new owner decision, not a reversal of `0197` — but the same reasoning applies
  to it: it can hide a real handle leak in the unit suite. **Accepted by the owner** ("just in case").
- ⚠️ **The `supertest` flake (`0200`) has a confirmed shape "`Jest did not exit one second after…`".** With `--forceExit`
  on, that message changes or disappears from unit runs. CLAUDE.md's flake table must say so, or the next person reading a
  run will mis-classify it.
- `0399` / the 2026-10-08 ruling: `maxWorkers: 1` stays. This task does not change worker count.
- CLAUDE.md "Shell harnesses are part of `npm test`" (`0201`): harness timeouts are 180 s jest / 150 s `spawnSync`.
  `--detectOpenHandles` adds overhead — a harness that was near its deadline could tip over. Watch for it.

## What to build

**1. One shared lock for full runs.** Covers `npm test`, `npm run test:coverage` and `npm run test:integration` — **one
lock, shared by all three**.
- **Where:** a lock file inside git's shared directory (`git rev-parse --git-common-dir`), so every worktree of this
  project uses the same lock. It is never committed because of where it lives (the git directory is not tracked).
- **What it stores:** the holder's process ID and start time (plus which command, if cheap — it makes the wait message
  clearer).
- **Stale lock:** a lock whose process is no longer alive is stale and is **taken over automatically**, with a one-line
  note saying so. The start time is there to catch process-ID reuse: a live process with the same ID but a different
  start time is not the holder.
- **Taking the lock must be atomic** — two runs waiting for the same freed lock must not both get it. Same for two runs
  taking over the same stale lock.
- **Released** when the run ends: normal exit, test failure, crash, Ctrl-C, or the terminal closing. A hard kill
  (`kill -9`) cannot run cleanup — that case is covered by the stale-lock rule above.
- **Targeted runs are NOT locked:** `npm test -- <path or pattern>` and `--watch`. The coder's plan states exactly how a
  "full run" is told apart from a targeted one (for example: no test path or pattern given, and not watch mode), and how
  `--watchAll`, `-t <name>` and `--testPathPattern` are treated — and says it to the owner at the plan gate.
- **No timeout on the wait** unless the plan argues for one — the owner asked for "wait", not "give up". Ctrl-C while
  waiting exits cleanly and leaves the other run's lock alone.
- **Scope of the lock vs `pretest`:** `npm test` runs `pretest` (`generate-map-nation-counts`) first. The plan says
  whether the lock also covers `pretest` and why.
- **Machines without git** (no `.git` directory — e.g. a copied tree or a build context): the plan says what happens. The
  safe default is to run without the lock and print a one-line warning, never to fail the test run.

**2. The wait message (Ruling 1).** When a full run finds the lock held, it prints a clear message before waiting —
something like *"Another full test run is in progress (pid N, started HH:MM, `npm test`). Waiting for its turn — this run
starts automatically when that one finishes."* Then it waits quietly (an occasional "still waiting" line is fine) and
prints one line when it gets the lock and starts. Wording is the coder's; it must name **who holds the lock and since
when**, and say that it will **start by itself**.

**3. `--detectOpenHandles --forceExit` (Ruling 2).** On `npm test` and `npm run test:coverage` only.
`npm run test:integration` gets the lock but **no** `--forceExit` (and no `--detectOpenHandles` added by this task).
- ⚠️ **Check before relying on it:** Jest's documentation says `--detectOpenHandles` makes the run go one test file at a
  time (it implies `--runInBand`). With `maxWorkers: 1` that changes little — but CLAUDE.md documents
  `npm test -- --maxWorkers=N` as the one-run override, and that override may no longer work. Verify it, and update
  CLAUDE.md to say what is true.
- Measure the cost: one full `npm test` before and after, wall-clock time recorded in the worklog. One run each is enough;
  say it is one run.

**4. CLAUDE.md "Testing" section updated** (the coder edits it as part of this task):
- the lock — what it covers, where it lives, the wait message, stale takeover, targeted runs are not locked;
- **always run tests through the npm scripts.** `npx jest` (or `node_modules/.bin/jest`) directly **skips the lock** —
  that is a known gap, stated plainly;
- `--detectOpenHandles --forceExit` on the unit and coverage runs: owner ruling 2026-10-09, *"just in case"*; the
  trade-offs (slower runs; can hide a real handle leak in the unit suite);
- the integration subsection's no-`--forceExit` rule **unchanged**, with one line saying the unit run now differs on
  purpose;
- the `supertest` flake table: what the "`Jest did not exit…`" shape looks like now under `--forceExit`;
- the `--maxWorkers=N` override line corrected if step 3's check shows it changed.

**Out of scope:** changing `maxWorkers`; a cross-machine lock; locking the shell harnesses run on their own
(`npm run test:scripts:docker`); fixing the `supertest` flake; proving the cause of the kernel panics.

## Verification steps

1. **Unit tests for the lock** (new test file under `tests/`, runnable on its own as a targeted run — so it does not take
   the lock itself), each a separate case:
   - no lock → a full run takes it and records its process ID and start time;
   - a lock whose process is dead → taken over automatically, with the takeover note;
   - a lock whose process ID is alive but whose start time does not match → treated as stale (process-ID reuse);
   - a lock held by a live process → the second run waits, prints the wait message naming the holder and its start time,
     and starts once the lock is released;
   - two waiters on one freed lock → exactly one gets it;
   - targeted run (`<path>`) and `--watch` → never touch the lock;
   - lock released on normal exit, on a failing test run (non-zero exit), on an uncaught crash, and on Ctrl-C (SIGINT) —
     and SIGTERM;
   - Ctrl-C while **waiting** → exits and leaves the holder's lock untouched;
   - no git directory → runs without the lock and warns, does not fail.
2. **Real two-terminal check**, recorded in the worklog with the printed output: start `npm test` in terminal A; while it
   runs, start `npm test` in terminal B. B prints the wait message (who, since when) and starts by itself when A ends.
   Repeat once with A in a second worktree if one exists, or say none was available.
3. **Stale lock by hand:** kill a running full test run with `kill -9`; the next `npm test` takes over the stale lock and
   says so.
4. **Integration run** (`npm run test:integration`, with the test database up): takes the same lock (shown by running it
   while an `npm test` holds the lock — it waits); its command line has **no** `--forceExit`.
5. **Flags present:** the effective jest command for `npm test` and `npm run test:coverage` includes
   `--detectOpenHandles --forceExit`; for `npm run test:integration` it does not.
6. **Full `npm test` is green** under the new setup, and the before/after wall-clock times are in the worklog. If a known
   `supertest` flake appears, classify it by CLAUDE.md's flake rule and say that you re-ran.
7. **`--maxWorkers=N` override checked** (step 3 of *What to build*); CLAUDE.md says what is true.
8. **CLAUDE.md "Testing" section updated** as listed in *What to build* §4; `npm run lint` clean.

## Notes

- **Depends on:** nothing.
- **Blocks:** nothing formally — but every later Sprint 8 task that runs the full suite benefits, which is why the owner
  wants it first.
- **Known trade-offs, accepted by the owner 2026-10-09:**
  - `--detectOpenHandles` adds overhead — full unit runs get slower (measured in verification step 6).
  - `--forceExit` can hide a real handle leak in the **unit** suite (the integration suite keeps its guard, `0197`).
  - The lock does not cover anyone calling `npx jest` directly; CLAUDE.md tells agents to always use the npm scripts.
  - The lock serializes runs; it does not reduce what one run costs. Several agents still queue up full runs one after
    another — slower overall, by design.
- **Not a crash fix with proof.** Cause of the 2026-10-06 / 2026-10-08 panics is unproven (`0399`). If the Mac crashes
  again with only one full run going, that is new evidence — record it; do not read this task as having fixed it.
- **Wiki follow-up at close:** `wiki/tasks/test-suite-reliability-investigation.md` and `wiki/tasks/jest-worker-cap.md`
  describe the current flag and worker setup; route an ingest of this brief to `fkit-wiki` after close.
- Related: `0197` (test-suite reliability, removed `--forceExit` from integration), `0200` (`supertest` flake), `0201`
  (shell harnesses in `npm test`), `0399` (jest worker cap).
