# Cap Jest Workers at 4 So `npm test` Passes When Terminal Is in the Background (task 0399)

**Source**: `ai-agents/tasks/done/0399-cap-jest-workers-so-npm-test-passes-when-terminal-is-in-the-background/brief.md` (its `plan.md`, `worklog.md` and `review.md` read as supporting evidence) + the committed `CLAUDE.md` § Testing subsection *"`npm test` runs at most 4 jest workers (task `0399`)"*
**Status**: done (agent-closed — not owner-verified) — committed in `036a5c8`; test config only, nothing ships in a deploy
**Sprint/Tag**: Sprint 7, rank 47 (append rank, not a merit rank) / task `0399`

> ✅ Closed 2026-10-06 by a spawned `fkit-producer` via `/fkit-task-done`, at `fkit-lead`'s instruction under
> `/fkit-sprint-ship-loop`, on the owner-approved `plan.md` and owner rulings of 2026-10-06, verbatim: *"Yes, replace
> A2"*, *"Run once, last, on my go"*, *"Approve the note"*, *"Enough, go to review"*, *"Amend it"*, *"Yes, fix them
> too"*. Filed the same day on *"Sprint 7, small task now (Recommended)"*, which superseded an earlier *"File it in the
> Backlog"* before anything was filed.

## Goal

During [[tasks/session-verified-status-line]]'s verify, two full default `npm test` runs went red on timeouts outside
that task's code. The diagnosis (2026-10-06): when some other app is in front, macOS appears to move the whole
Terminal process tree into a throttled background class that runs only on the 4 efficiency cores. Jest's default is
cores − 1 = **13 workers**; 13 workers plus the shell harnesses then fight over those cores, and the harnesses hit
their **150 s** `spawnSync` deadline (and supertest suites their 5 s timeout).

Measured in the diagnosis: a single-thread benchmark took 6.1–6.8 s from the shell vs 1.17 s from a launchd job;
`profile-deploy-hardening.test.sh` 63 s vs 17.6 s; `profile-checks.sh` 80 s vs 17.8 s. ⚠️ That the throttling
**causes** the timeouts, and which apps **trigger** it, are both **likely, not proven**.

The owner chose fix #2 of five considered: cap `maxWorkers`. Not chosen: running with Terminal in front (habit only —
still useful advice), raising the timeouts (refuted for the supertest flake), splitting the harnesses into their own
`--runInBand` step (changes `npm test`'s shape, which `0201`'s owner ruling governs), an App Nap setting (unverified).

## Key Changes

- `jest.config.ts` — `maxWorkers: 4` in `unitConfig`, with a comment. Applies to `npm test` and `npm run
  test:coverage` (same config). `npm run test:integration` is unaffected (still `--runInBand`). No timeout, deadline
  or `npm test` shape changed.
- `CLAUDE.md` § Testing — new subsection. Points it carries: why; the measured cost; how to override; not a flake
  fix, not a segfault fix; and **A2 superseded for this reason only**.
- **Override for one run:** `npm test -- --maxWorkers=N`. `--runInBand` also wins over the config, but jest
  **refuses to start** if `--runInBand` and `--maxWorkers` are both given (checked by both reviewers).

### 🔁 Supersedes `0197`'s amendment A2 — for this reason only

[[tasks/test-suite-reliability-investigation]] (`0197`) recorded owner ruling **A2**: no `--maxWorkers` cap, no
`workerIdleMemoryLimit`. A2 declined a cap **on cost** — a permanent slowdown on every run, to soften an intermittent
jest-worker `SIGSEGV`. The owner ruled 2026-10-06, verbatim *"Yes, replace A2 (Recommended)"*: the cap is now set,
**for background-throttling timeouts only**. ⛔ This makes **no claim** about whether a cap affects `0197`'s
`SIGSEGV` — an earlier draft that said "it does nothing for the segfault" was struck in review as an unmeasured
negative that also misstated A2.

## Outcome

| Run (2026-10-06) | Workers | Front app | Result | Wall clock |
|---|---|---|---|---|
| `0397` verify, two runs | 13 (default) | **not recorded** | red both (one supertest timeout + one harness killed at 150 s, each run) | 297 s, 291 s |
| `0397` verify | 4 (CLI) | a game | **green** — the only run under real throttling | 99 s |
| `0399` step 3, back-to-back | 4 vs 13 | Terminal | green both | **42 s vs 44 s** |
| `0399` step 5 | 4 (config) | Telegram, then Safari | green, but **no throttling occurred** (harnesses at unthrottled speed: 22.3 s, 17.3 s) | 42 s |

- **Cost of the cap when nothing is throttled: none measured** (42 s vs 44 s, one run each).
- 🚩 **The evidence that the cap fixes the throttled case is ONE sample** — the game-in-front 99 s run. The owner ruled
  it enough. The red baseline runs did not record the front app, so the comparison is **not like-for-like**. "Any other
  app in front" is evidently **not** sufficient to trigger the throttling (Telegram / Safari did not); why is not known
  and was not investigated.
- The Docker-gated harness was **skipped, not passed**, in every run (Docker down).
- **Not a supertest flake fix:** `0200` measured that flake at the same rate at 4 and 13 workers
  ([[tasks/supertest-profile-server-flake]]). A single `Exceeded timeout of 5000 ms` is still judged by the flake rule —
  rule out `0197`'s segfault, re-run, say so.
- **Fits, not proven:** `0371` found `profile-deploy-hardening.test.sh` at ~7 % CPU, mostly waiting
  ([[tasks/hardening-harness-speedup]]) — the pattern of a throttled process. Never tested against the clamp.
- 🚨 **Kernel panic, cause UNPROVEN.** The owner's Mac panicked and rebooted at 18:17:25 on 2026-10-06 during an
  earlier full run (a WindowServer watchdog timeout). The suspected process-spawn storm under throttling is a guess.
  ⛔ Do not record it as caused by `npm test`, nor as fixed by this task. No task investigates it; a recurrence would
  be a new task.
- **Review:** stateful round 1 *closed-out*, both reviewers measured (`--showConfig`); R1–R4 were all wording defects
  (trigger stated as fact; baseline mis-described; the `--runInBand` override; A2 misstated), fixed per owner rulings.
  No full `npm test` after those doc/comment fixes.

## Related

- [[tasks/test-suite-reliability-investigation]] — task `0197`, whose amendment A2 this supersedes for this reason only
- [[tasks/supertest-profile-server-flake]] — task `0200`: worker contention refuted as the flake's cause
- [[tasks/hardening-harness-speedup]] — task `0371`: the ~7 % CPU harness that fits this pattern
- [[tasks/session-verified-status-line]] — task `0397`, whose red verify runs started this
- [[decisions/sprint-7]] — the board (rank 47)
