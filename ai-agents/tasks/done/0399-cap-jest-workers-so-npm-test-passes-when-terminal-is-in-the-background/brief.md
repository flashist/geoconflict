# Cap jest workers so `npm test` passes when Terminal is in the background

## ID
0399

> ℹ️ **ID allocation, checked 2026-10-06 before filing.** Highest ID across `backlog/`, `done/` and `cancelled/`
> (folder names and `## ID` fields agree) is `0398`, so this is `0399`. `grep -rn 0399 ai-agents .claude`: no hits
> before this filing.

## Sprint
Sprint 7

📌 **Filed 2026-10-06 on OWNER RULINGS** given live via `AskUserQuestion` in the `fkit lead` session, relayed by
`fkit-lead` (driving `/fkit-sprint-ship-loop`) to a spawned `fkit-producer` with no owner channel (ADR-021; ADR-037 §3).
⛔ Not producer precedent. Verbatim, in order:
- first *"File it in the Backlog (Recommended)"* — a task for "shell harnesses time out under host load";
- then, **superseding it**, *"Sprint 7, small task now (Recommended)"* — option text: file it in Sprint 7 and drive it
  next: plan, owner approval, a one-line change, review; the exact limit is chosen using the 4-worker run's result;
  every agent test run benefits right away.

It was never written to the Backlog board — the second ruling arrived before filing.

## Priority
47

⚠️ Priority 47 is append rank, NOT a merit ranking — flagged for owner confirmation. The owner named the sprint, not a
rank, so it is appended after the board's highest (46, `0397`), per ADR-035. **On merit this belongs directly below
`0397`**, because the 4-worker `npm test` run that sets this task's exact limit is being done under `0397`'s verify, and
the owner ruled it is driven next. Appending already lands it there.

## Status
✅ Done (agent-closed — not owner-verified)

## Owner
fkit-coder

## Context

### In plain terms

When another app is in front of Terminal, macOS slows down everything Terminal started — including `npm test`. Jest
then starts 13 test workers that all fight over a few slow CPU cores, and the slowest parts of the suite (the shell
harnesses, and some `supertest` suites) run out of time. The owner chose to cap how many workers jest starts, so a full
`npm test` passes even when Terminal is not the front window.

### Diagnosis — from a coder's investigation on 2026-10-06 (numbers as measured, relayed by `fkit-lead`)

- **Mechanism.** macOS puts the whole Terminal process tree (Terminal → login → zsh → herdr → claude → npm/jest →
  harnesses) into a background scheduling class (`darwinBG`, throttled) when another app is frontmost. That class runs
  only on the 4 efficiency cores.
- **Proven — the clamp exists and is large:**
  - Single-thread benchmark: **6.1–6.8 s** from the shell vs **1.17 s** from a launchd job.
  - 12 in parallel: **22–24 s** vs **1.4–1.8 s** each.
- **Harness times, clamped vs unclamped:**
  - `tests/scripts/profile-deploy-hardening.test.sh`: **63 s vs 17.6 s**.
  - `tests/profile-checks.sh`: **80 s vs 17.8 s**.
- **Jest default.** `npm test` is plain `jest`. No `maxWorkers` is set in `jest.config.ts` or `package.json`, so jest
  uses cores − 1 = **13 workers**. Those 13 workers plus the harnesses contend for the 4 slow cores.
- **What fails.** The **150 s `spawnSync` deadline** in `tests/scripts/ShellHarnesses.test.ts` and jest's **5 s**
  timeout on `supertest` suites trip.
  - Confidence that this clamp **causes** the timeouts: **likely, not proven.**
  - Confidence that the clamp follows "Terminal not frontmost": **likely, not proven.**
- 🚨 **Kernel panic — cause UNPROVEN.** The owner's Mac panicked and rebooted at **18:17:25** on 2026-10-06 during an
  earlier full run: `panic-full-2026-10-06-181725.0002.panic`, a WindowServer watchdog timeout. The suspected cause is a
  **guess**: a process-spawn storm (~470 spawns/s) under throttling, with `runningboardd` blocked. **Nothing links the
  panic to `npm test` beyond timing.** Do not record it as caused by this, and do not record it as fixed by this task.

### Fits an earlier, unexplained measurement (likely, not investigated)

[`0371`](../../done/0371-make-the-profile-deploy-hardening-shell-harness-finish-inside-its-150-s-deadline/brief.md)
(closed 2026-10-02) found `profile-deploy-hardening.test.sh` running standalone at **about 7 % CPU — mostly waiting, not
computing** — and took 3–5 min. That pattern fits a throttled process. It was not tested against the clamp then, and is
not proven to be the same cause now.

### ⚠️ Conflicts and prior findings the plan must face — flagged, not planned around

1. **An earlier owner ruling declined a worker cap.** Task
   [`0197`](../../done/0197-test-suite-reliability-investigation/brief.md), amendment **A2**: *no `--maxWorkers` cap,
   no `workerIdleMemoryLimit`* — buying a permanent slowdown on every run to soften an intermittent jest-worker
   `SIGSEGV` was declined (findings report `2026-08-29-0197-test-suite-reliability-findings.md` §3; wiki page
   *test-suite-reliability-investigation*). Today's ruling chose a cap for a **different reason** (timeouts under
   background throttling), and it is the newer, explicit ruling. ⚠️ **It is not known whether the owner had A2 in view
   when ruling today** — flagged for owner confirmation (see *Notes*). The plan must state the run-time cost of the cap
   with Terminal in front, since that cost is exactly what A2 declined.
2. **A worker cap is NOT a `supertest` flake fix.** Task
   [`0200`](../../done/0200-supertest-profile-server-flake-confirm-and-fix/brief.md) measured the flake at **4.0 % at
   `--maxWorkers=4`**, **4.0 % at 13 workers**, and **7.0 % at `--runInBand`** (report
   `2026-09-01-0200-supertest-flake-findings.md` §4), and refuted worker contention as its cause. So after this cap a
   single `Exceeded timeout of 5000 ms` can still happen, and is expected. This task can only claim to remove the
   **throttling-amplified** extra failures, if any. CLAUDE.md's rule stands: no retry, no timeout raise, re-run and say
   so.
3. **A worker cap is NOT a segfault fix.** It makes no claim about `0197`'s `SIGSEGV`; do not write one.

### Fixes considered (none applied) — the owner chose #2

1. Run with Terminal frontmost or unclamped — habit, no code. Not chosen as the fix; still useful advice.
2. **Cap `maxWorkers` in `jest.config.ts` (e.g. `4` or `50%`) — a one-line change. ← CHOSEN DIRECTION.**
3. Raise the 150/180 s timeouts — hides the problem; CLAUDE.md lists raising the timeout as refuted for the supertest
   flake. Not chosen.
4. Run `ShellHarnesses` in a separate `--runInBand` step — changes `npm test`'s shape, which `0201`'s owner ruling
   governs; would need a new owner ruling. Not chosen.
5. A Terminal App Nap setting — unverified. Not chosen.

### Evidence still to come — PLACEHOLDER

> ⏳ **The exact limit is NOT set yet.** A `npm test -- --maxWorkers=4` run is in progress on 2026-10-06, under `0397`'s
> verify. **Its result decides the number.** Record here: date, Terminal frontmost or not, wall clock, pass/fail per
> suite, any harness or supertest timeout. Until then, `4` and `50%` are candidates, not decisions.
>
> *Result:* recorded 2026-10-06, under `0397`'s verify — see
> [`0397` worklog](../../done/0397-show-players-whether-their-session-is-verified/worklog.md), entry
> "Post-review verify (maxWorkers=4)". One run each, same day, **Terminal NOT frontmost** (game "Ultimate General
> Civil War" in front, per `lsappinfo front`):
> - **`--maxWorkers=4`: exit 0, wall clock 99 s** (`time -p` real 98.74 s). Suites 199/199 passed; tests 3863 passed,
>   1 skipped (`scripts/test-check-docker-secret-boundary.sh` — Docker down, **skipped, not passed**). The other three
>   harnesses passed inside `ShellHarnesses.test.ts` (91.3 s for that suite); no 150 s harness kill. No supertest
>   timeout, no `0197` sign (no `SIGSEGV`, no new `node-*.ips`).
> - **Default (13 workers), two earlier runs: exit 1 both, 297 s and 291 s.** Each run: one supertest-family
>   `Exceeded timeout of 5000 ms` (`PaymentsRoutes`, then `Routes`) plus one shell harness killed at its 150 s deadline
>   (`profile-checks.sh`, then `profile-deploy-hardening.test.sh`).
>
> **Limit chosen: `4`** (owner-approved plan, 2026-10-06). One sample, not a proven rule.

## What to build

1. **Plan first, owner-approved** (owner ruling: plan, owner approval, one-line change, review). The plan states:
   - the chosen limit (a fixed number or a percentage), and why — grounded in the 4-worker run above;
   - where it goes in `jest.config.ts` — the default unit run (`npm test`) is the target. `npm run test:integration`
     is already `--runInBand` and must stay so; `npm run test:coverage` uses the same config and will inherit the cap —
     say so;
   - the cost with Terminal **in front**: full `npm test` wall clock before vs after (this is the cost A2 declined);
   - that a command-line `--maxWorkers` still overrides the config (so a developer can opt out for one run).
2. **The change:** set the jest worker cap in `jest.config.ts`. Config value only — no change to timeouts, to
   `ShellHarnesses.test.ts`'s deadlines, or to the shape of `npm test`.
3. **CLAUDE.md § Testing — a note is likely needed.** Flag only; the coder proposes the wording in the plan for owner
   approval. Points it would carry: `npm test` is capped at N workers and why (background throttling); running with
   Terminal in front is still faster; the cap is not a supertest flake fix and not a segfault fix. ⚠️ The current text
   *"This makes `npm test` noticeably slower"* and the 0197 *"no `--maxWorkers` cap"* history (wiki + findings report)
   will read as contradicted — the note should say A2's "no cap" is superseded for this reason, by today's ruling. The
   wiki page is `fkit-wiki`'s to update after close (ingest), not this task's.

## Verification steps

⚠️ **Read before running step 2.** Step 2 deliberately recreates the condition the owner's Mac panicked under
(2026-10-06 18:17:25; cause unproven). Run it only with the owner aware, and with their work saved.

1. **Config check.** `jest.config.ts` carries the cap for the default `npm test` run; `npm run test:integration` still
   runs `--runInBand`; no timeout value and no deadline in `tests/scripts/ShellHarnesses.test.ts` changed.
2. **Full `npm test` passes with another app frontmost** (Terminal in the background for the whole run). Record: date,
   which app was in front, wall clock, and each shell harness's time vs its 150 s deadline. A single supertest
   `Exceeded timeout of 5000 ms` is judged by CLAUDE.md's flake rule (rule out `0197`'s `SIGSEGV` first, then re-run
   and **say that you re-ran**) — it is not, on its own, a failure of this task; a shell harness hitting its deadline
   **is**.
3. **Full `npm test` with Terminal in front** — passes; wall clock recorded and compared with the uncapped run (the
   cost from *What to build* 1).
4. **Opt-out still works.** `npm test -- --maxWorkers=<other>` is honoured (jest's own output shows the worker count, or
   equivalent evidence).
5. **Single-file runs unaffected.** `npm test -- tests/Attack.test.ts` runs as before.
6. **CLAUDE.md note** — either added with owner-approved wording, or the plan records the owner's ruling that none is
   needed.
7. `npm run lint` clean on the changed file.

## Notes

- **Depends on:** nothing
- **Blocks:** nothing. The 4-worker run under `0397`'s verify is **evidence** for the limit, not a task dependency —
  `0397` closing is not a precondition.
- ⚠️ **Open to the owner — A2.** `0197`'s amendment A2 (2026-08) declined a `--maxWorkers` cap on cost grounds. Today's
  ruling picks a cap for a different reason. Confirm at the plan gate that A2 is superseded for this purpose — the
  cheapest-to-reverse step is to confirm before the change, not after.
- ⚠️ **Open to the owner — panic.** The 2026-10-06 kernel panic is recorded here as **unproven**. No task investigates
  it. If it recurs, that is a separate task.
- **Related:** [`0197`](../../done/0197-test-suite-reliability-investigation/brief.md) (segfault; A2 "no cap"),
  [`0200`](../../done/0200-supertest-profile-server-flake-confirm-and-fix/brief.md) (supertest flake; worker contention
  refuted), [`0201`](../../done/0201-gate-the-shell-test-harnesses-so-they-cannot-rot-unrun/brief.md) (shell harnesses
  in `npm test`, unconditional by owner ruling),
  [`0371`](../../done/0371-make-the-profile-deploy-hardening-shell-harness-finish-inside-its-150-s-deadline/brief.md)
  (harness at ~7 % CPU, mostly waiting).
- **Privacy:** no host, IP, URL, token or credential in any artifact.
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.
