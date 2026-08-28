# Worklog — 0056 restore worker crash recovery (capped) + survivable scheduling gate

Build unit executed 2026-08-27 by a spawned `fkit-coder` (driver `fkit-sprint-ship-loop`, Sprint 4),
under the declared-approval marker: `plan.md` (blob `2bda1396a798346340608eb561f1008aca25faeb`,
21536 bytes — re-hashed this turn, matched the driver's paste) was owner-approved via
`AskUserQuestion` in the lead session on 2026-08-27, D1–D3 ruled (A)/(A)/(A). `plan.md` was **not
re-authored**. Nothing committed. Code state at build: `dev` HEAD `282655c` plus the uncommitted `0193`
edits to `Master.ts` / `Master.test.ts` (built on top of them; the one `setInterval` line rebased per
Step 3) and the unrelated uncommitted `0012` inbox files (untouched). `ai-agents/wiki-vault/`, the
sprint plan, the brief status, the incident record and the `0057` report were not modified.

## Change surface

- **New `src/server/WorkerSupervisor.ts`** (276 lines, D1 = (A)). Pure — imports nothing. Exports the
  constants (`READY_QUORUM_NUMERATOR/DENOMINATOR = 9/10`, `READY_DEADLINE_MS = 90_000`,
  `RESTART_CAP = 5`, `RESTART_WINDOW_MS = 600_000`, `BACKOFF_BASE_MS = 1_000`,
  `BACKOFF_CEILING_MS = 30_000`), `quorumFor(n)` (`max(1, ceil(n*9/10))`), `backoffDelayMs(k)`
  (`min(30_000, 1_000 * 2^k)`), the `ForkedWorker` / `WorkerExit` / `SupervisorLog` /
  `WorkerSupervisorDeps` interfaces and the `WorkerSupervisor` class: `start()`, `markReady(index)`,
  `handleExit(exit)`, `deadline()`, `readyIndices()`, `missingIndices()`, `abandonedIndices()`,
  `schedulingStarted()`; private `maybeStart()`, `forkIndex(index, reason)`, `scheduleRestart()`.
  Owns the `clusterId → index` map (set at fork and on every restart; `=== undefined` lookup), the
  ready set (shrinks on death — `markDead`), per-index restart timestamps (rolling window, pruned on
  every death; `k` = restarts issued in window, D2 = (A)), the abandoned set and the `started` flag.
  Every log line carries its values both in the message text and as single-object meta (Step 3a
  belt-and-braces).
- **`src/server/Master.ts`** (`git diff --numstat` vs HEAD: `+56 / −66`; that figure includes 0193's
  uncommitted `+17 / −10`, so this task's own delta is ≈ `+39 / −56`):
  - `import { WorkerSupervisor }`; `const readyWorkers = new Set()` (`:20`) deleted.
  - `export const workerSupervisor = new WorkerSupervisor({...})` built after `log` with the real
    `cluster.fork({ WORKER_ID })` → `{ clusterId: worker.id, pid: worker.process.pid }`,
    `setTimeout`, `Date.now`, `log`, and `startScheduling` as `onSchedulingStart`. Comment marks it
    test-only + the `0192` seam. Importing the module still forks nothing.
  - `startMaster()`: fork loop, `message` handler body, gate block and exit handler replaced by
    `workerSupervisor.markReady(message.workerId)`, `workerSupervisor.handleExit({ clusterId:
    worker.id, pid: worker.process?.pid, code, signal, exitedAfterDisconnect })` and
    `workerSupervisor.start()` (handlers registered before the forks). The
    `(worker as any).process?.env` read is gone.
  - New module function `startScheduling()` holding `scheduleLobbies` + 0193's
    `setInterval(() => void lobbyPollTick(scheduleLobbies), 100);` line unchanged.
  - Everything from `/api/env` down is byte-unchanged.
- **`tests/server/Master.test.ts`** (`+652 / −11` vs HEAD, of which 0193's uncommitted part is
  `+235 / −11`): import list gains `workerSupervisor` (Master) and `backoffDelayMs, quorumFor,
  READY_DEADLINE_MS, WorkerSupervisor, type WorkerSupervisorDeps` (new module); a new
  `describe("WorkerSupervisor")` with the plan's 18 cases appended at the end. The 0055 and 0193
  describes are untouched (0193's `trackedPromise`/`settleStragglers` `afterEach` is not referenced;
  the new suite uses an injected timer array and a numeric clock — no jest fake timers, no shared
  module state except the `#18` read of the exported instance, which it does not mutate).
- **This file.**
- **Not touched:** `Worker.ts`, `DevConfig.ts` (both carried temporary Step 5.3 hacks, reverted —
  proof below), configs, `Dockerfile`, client, wiki, incident record, sprint plan, brief status.

## Verification evidence

### Unit tests, lint, types — run this turn on the final source

```
$ npm test -- tests/server/Master.test.ts
PASS tests/server/Master.test.ts
  GET /api/public_lobbies before any lobby fetch has run            (3 ✓, 0055)
  lobbyPollTick in-flight guard                                      (5 ✓, 0193)
  WorkerSupervisor
    ✓ quorumFor: 9/10 rounded up, never below 1
    ✓ backoffDelayMs: doubles from 1 s and stops at the 30 s ceiling
    ✓ identifies and restarts worker index 0 instead of dropping it
    ✓ logs the bookkeeping-bug branch with all four fields for an unknown clusterId
    ✓ removes a dead worker from the ready set and re-forks it under the same index
    ✓ starts scheduling exactly once across quorum, full strength, a restart, and the deadline
    ✓ quorum at exactly 18 of 20 starts scheduling; 17 does not
    ✓ the 90 s deadline starts scheduling below quorum and names every missing index
    ✓ the deadline is silent on a healthy boot that reached full strength first
    ✓ scales to DevConfig's 2 workers: both ready starts, one ready plus the deadline starts
    ✓ reports missing workers by index, in the message and in the meta
    ✓ gives up on an index after 5 restarts in the window: no timer, no fork, an error
    ✓ backoff grows 1, 2, 4, 8, 16 s across one index's restarts in a window
    ✓ counts the window per index: worker 3's restarts do not touch worker 7
    ✓ the window rolls: spread-out deaths stay restartable, and a pruned window resets the backoff
    ✓ does not restart a worker that exited after disconnect, and does not log an error
    ✓ a fork that throws on restart is logged, retried with backoff, and counts toward the cap
    ✓ Master.ts exports the live supervisor with an empty ready set before startMaster()
Tests: 26 passed, 26 total

$ npm test                          → Test Suites: 96 passed, 96 total; Tests: 846 passed, 846 total
$ npm run lint                      → exit 0, no output
$ npx tsc --noEmit -p tsconfig.json → exit 0, no output
```

Cases #6–#9, #11, #12, #14, #15 run at n = 20 (brief verification step 7). Not unit-tested, as the
plan says: the two one-line `cluster.on(...)` delegations in `startMaster()` — covered by the live
runs below only.

### Step 5 — local verification (dev, `npm run start:server-dev`, no nginx)

Pre-flight before every run: `lsof -nP -iTCP:3000-3020 -sTCP:LISTEN` → `ports free`. Every process
started here was stopped (`pgrep -f 'src/server/Server.ts'` empty, ports free again after each run).
Log excerpts are the master's JSON lines from stdout, `persistentID` filtered (none occurred in the
`comp:"m"` lines quoted), trimmed to the relevant keys.

**5.1 — kill one worker (2 workers), run 1, 12:30 UTC.** `kill -9 25777` (worker 1):

```
warn  Worker 1 (PID: 25777) died with code: null and signal: SIGKILL   {clusterId:2, code:null, pid:25777, signal:"SIGKILL", workerIndex:1}
info  Restarting worker 1 in 1000 ms (restart 1/5 in window)           {delayMs:1000, restartsInWindow:1, windowMs:600000, workerIndex:1}
info  Restarted worker 1 (New PID: 25964)                              {clusterId:3, pid:25964, workerIndex:1}   (+1.002 s)
info  Worker 1 is ready. (2/2 ready)
```
PASS.

**5.2 — worker 0 specifically, same run.** `kill -9 25776` (worker 0):

```
warn  Worker 0 (PID: 25776) died with code: null and signal: SIGKILL   {clusterId:1, code:null, pid:25776, signal:"SIGKILL", workerIndex:0}
info  Restarting worker 0 in 1000 ms (restart 1/5 in window)
info  Restarted worker 0 (New PID: 25995)                              {clusterId:4, pid:25995, workerIndex:0}
info  Worker 0 is ready. (2/2 ready)
```
`grep -c 'could not find id' run1.log` → `0`. PASS (defect #2 observable and fixed).

**5.3 — outage simulation at prod shape, run 2, 12:32 UTC.** Temporary uncommitted hacks:
`DevConfig.numWorkers()` → `20`; `Worker.ts` top:
`if (process.env.FORCE_CRASH_WORKER_INDEX !== undefined && process.env.WORKER_ID === process.env.FORCE_CRASH_WORKER_INDEX) process.exit(1);`
(the `!== undefined` guard is needed because the master also imports `Worker.ts` with neither var
set). Run with `FORCE_CRASH_WORKER_INDEX=16`. Boot `12:32:19.46Z`.

```
info  Started worker 16 (PID: 26768)                                                          12:32:19.471
info  Quorum reached (18/20, quorum 18), starting game scheduling; still waiting for workers [12, 16]
      {missingWorkerIndices:[12,16], numWorkers:20, quorum:18, readyCount:18}                12:32:31.433  (+12 s)
warn  Worker 16 (PID: 26768) died with code: 1 and signal: null  {clusterId:17, code:1, signal:null}  12:32:31.545
info  Restarting worker 16 in 1000 ms (restart 1/5 in window)                                12:32:31.545
info  Restarted worker 16 (New PID: 26836)                                                    12:32:32.547
warn  Worker 16 (PID: 26836) died with code: 1 and signal: null                               12:32:34.322
info  Restarting worker 16 in 2000 ms (restart 2/5 in window)
info  Restarted worker 16 (New PID: 26856)                                                    12:32:36.325
warn  Worker 16 (PID: 26856) died ...
info  Restarting worker 16 in 4000 ms (restart 3/5 in window)
info  Restarted worker 16 (New PID: 27045)                                                    12:32:42.230
warn  Worker 16 (PID: 27045) died ...
info  Restarting worker 16 in 8000 ms (restart 4/5 in window)
info  Restarted worker 16 (New PID: 27094)                                                    12:32:51.798
warn  Worker 16 (PID: 27094) died ...
info  Restarting worker 16 in 16000 ms (restart 5/5 in window)
info  Restarted worker 16 (New PID: 27339)                                                    12:33:09.674
warn  Worker 16 (PID: 27339) died with code: 1 and signal: null                               12:33:11.556
error Worker 16 died again after 5 restarts in the last 10 minutes; giving up on this index (code: 1, signal: null)
      {code:1, restartsInWindow:5, signal:null, windowMs:600000, workerIndex:16}
error 90s readiness deadline: workers [16] never reported ready (19/20)
      {missingWorkerIndices:[16], numWorkers:20, readyCount:19}                              12:33:49  (+90 s)
```

Process count (`pgrep -f 'src/server/Server.ts' | wc -l`; **includes the `cross-env` wrapper**, so
the plan's expected 20 reads as 21 here): +20 s → 22 (worker 16 alive mid-restart), then
+40 s / +60 s / +80 s / +100 s / +130 s / +160 s → **21** (master + 19 workers + wrapper), stable
≥ 2 min. `Restarted worker 16` count stayed at 5 from +60 s on. Counts over the run: `Quorum
reached` 1, `starting game scheduling` 1, `giving up` 1, `could not find id` 0, `All workers ready`
0. `curl localhost:3000/api/public_lobbies` → `{"lobbies":[{"gameID":"ULVA9kQa",...` (real lobby).
Outcomes (i)–(v) of brief step 4: PASS.

Then hacks reverted with `git checkout -- src/core/configuration/DevConfig.ts src/server/Worker.ts`
and a healthy 20-worker boot (run 3, no `FORCE_CRASH_WORKER_INDEX`, hack in `DevConfig` still in for
this one run): `ready=20`, `All workers ready=1`, `Quorum reached=1` (`18/20 … still waiting for
workers [12, 13]` at +~11 s, then `All workers ready` at 12:35:32Z), `died=0`, error-level lines
`0`, real lobby served. Step 5 item 6 (healthy path) PASS.

**5.4 — exactly one interval.** Run 1 (boot + 2 restarts that re-satisfied 2/2): `Quorum reached` 1,
`starting game scheduling` 1. Run 2: 1 and 1 (quorum-then-deadline). Lobby cadence: not separately
instrumented beyond the counts; the unit test #6 is the exact-once proof. PASS.

**5.5 — prod-shaped gate at 20:** unit tests #6–#9, #12 at n = 20 (above). PASS.

**Hack-revert proof (this turn, after all runs):**

```
$ git diff --stat -- src/core/configuration/DevConfig.ts src/server/Worker.ts
(no output)
$ grep -n "TEMP 0056\|FORCE_CRASH" src/server/Worker.ts src/core/configuration/DevConfig.ts
no hack remnants
$ git status --short src/server src/core/configuration tests/server
 M src/server/Master.ts
 M tests/server/Master.test.ts
?? src/server/WorkerSupervisor.ts
```

### Step 3a / 4a — OTEL delivery of the log fields (D3 = (A))

**Status: 4a NOT passed. Left open for the owner.** Reason: the OTLP **endpoint** was exportable from
the gitignored `.env.prod` (key present, non-empty); the **auth header** was not — `OTEL_AUTH_HEADER`
is absent from `.env.prod`, present-but-empty in `.env`, and in no other readable env file
(`.env.prod.secret` holds only `ALLOW_SSH_PASSWORD_FALLBACK`, `VPS_PASSWORD`, `UPTRACE_SOURCEMAP_DSN`;
prod's `setup.sh:11` expects `OTEL_AUTH_HEADER` pre-exported in the deploy shell, so it lives nowhere
in the tree). No value was written anywhere; the run logs were grepped for the endpoint value → `0`
occurrences.

What was done anyway, so the owner's check is a filter away:
- Probe: an unauthenticated `POST $ENDPOINT/v1/logs` with an empty `resourceLogs` returned HTTP
  **200** (host resolves to the telemetry box). That suggests the collector accepts unauthenticated
  OTLP, but it is a probe on an empty body — **not** proof the real records were accepted or stored.
- **Run 5** (2 workers, `GAME_ENV=dev`, `OTEL_EXPORTER_OTLP_ENDPOINT` exported, no auth header):
  Logger printed `OTEL enabled` ×3 (master + 2 workers), no exporter error lines on stdout (the
  OTLP exporter reports failures through the OTEL diag logger, which is not wired to stdout here —
  so "no error lines" is weak evidence). Worker 1 was `kill -9`'d six times → 5 restarts
  (1/2/4/8/16 s) → `giving up` error at `12:43:46.821Z` → `90s readiness deadline: workers [1] never
  reported ready (1/2)` at `12:44:34.190Z`. Process kept alive 20 s past the last line for the
  `BatchLogRecordProcessor` to flush, then stopped at 12:44:58Z. (Run 4, 12:38–12:42Z, same setup,
  exported a healthy boot only — the kill loop's PID pattern had failed; harmless, recorded for
  completeness.)
- Records to look for, all `comp = m`, `openfront.component = Master`, `environment = dev`, window
  **2026-08-27 12:43:00 – 12:45:00 UTC**:

  | Line | Level | Attributes to confirm |
  |---|---|---|
  | `Worker 1 (PID: …) died with code: null and signal: SIGKILL` (×6) | warn | `workerIndex=1`, `clusterId` (2…7), `pid`, `code` (**null** — display unobserved), `signal="SIGKILL"` |
  | `Restarting worker 1 in N ms (restart k/5 in window)` (×5) | info | `workerIndex`, `delayMs`, `restartsInWindow`, `windowMs` |
  | `Restarted worker 1 (New PID: …)` (×5) | info | `workerIndex`, `clusterId`, `pid` |
  | `Worker 1 died again after 5 restarts … giving up on this index (code: null, signal: SIGKILL)` | error | `workerIndex=1`, `restartsInWindow=5`, `windowMs=600000`, `code` null, `signal` |
  | `90s readiness deadline: workers [1] never reported ready (1/2)` | error | `missingWorkerIndices=[1]` (array), `readyCount=1`, `numWorkers=2` |
  | `Quorum reached (2/2, quorum 2), starting game scheduling` | info | `readyCount`, `numWorkers`, `quorum`, `missingWorkerIndices=[]` |

- **Exact Uptrace filter (Logs view, VPN `/32` bypass per memory note):**
  `where environment = "dev" AND openfront.component = "Master" AND _log_severity IN ("WARN","ERROR")`
  with time range `2026-08-27T12:43:00Z – 2026-08-27T12:45:00Z`; then narrow by body text
  `died with code`, `giving up`, `readiness deadline`. Open a record and check the attribute panel
  for the names in the table. If the attributes are absent while the body text carries the values,
  the code already satisfies the brief's fallback (values are in the message text — Step 3a
  belt-and-braces) and only this record + the `telemetry.md:152` gotcha flag for `fkit-wiki` change.
- Hypothesis on record, unchanged: `winston-transport` spreads single-object meta keys into
  attributes (symbol keys skipped), `sdk-logs` accepts `null` attribute values; whether Uptrace
  *displays* a null attribute is unobserved. Nothing here settles the wiki gotcha; not flagged to
  `fkit-wiki` yet.

## Decision log

- **Fixes applied without asking: `none`** (build unit — no review findings processed here).
- **Obvious-winner calls within the plan's intent** (recorded for the reviewer, each reversible):
  1. `deadline()` logs an `info` line `Readiness deadline reached (x/n ready), starting game
     scheduling` when it is the path that starts scheduling. The plan only said `started = true;
     onSchedulingStart()`; a scheduling start with no log line would be invisible in `docker logs`.
     The plan's `Quorum reached` line is unchanged.
  2. `forkIndex` failure log carries `{ workerIndex, reason: "start" | "restart" }` meta; the
     message text is `Failed to fork worker <i>: <error.message>`. Plan said "log at error and route
     back through `scheduleRestart`" without specifying fields.
  3. Cluster event handlers are registered **before** `workerSupervisor.start()` forks (old code
     forked first). No behavioural difference — events are dispatched asynchronously — but it
     removes a reader's doubt.
- **Observation, plan-literal kept, flagged for the reviewer:** `All workers ready` is logged every
  time the ready set returns to `n` (plan Step 3 wording), so in run 1 it appeared **3** times (boot
  + two restarts back to 2/2). On a healthy boot (run 3) it appears exactly once, which is what
  verification step 8 counts. If "exactly once per boot" is wanted regardless of restarts, a
  first-time-only guard is a two-line change — not made, as it changes the plan's stated behaviour.
- **Interpretation carried from the plan, implemented as written:** missing indices at quorum time
  → `info`; the 90 s deadline audit → `error` naming them; the capped-out index → `error` at the
  moment of give-up. Confirmed live in run 2 (`still waiting for workers [12, 16]` at info, `[16]`
  at error 90 s later).
- Counting semantic as planned: window counts **restarts issued**, timestamped at the death that
  scheduled them; 6th death inside the window gives up; a pruned window resets the backoff to 1 s
  (test #15).

## Open for the owner (not decided here)

- 4a: check the Uptrace filter above; record the outcome (attributes present / absent / null
  display) so this task can be closed with 4a settled or with the message-text fallback accepted.
- Whether `OTEL_AUTH_HEADER` should live in a readable gitignored file for future local OTEL runs
  (out of scope; noted because D3 assumed it was in `.env.prod`).
- Brief verification step 8 (post-deploy on the real box) stays open by design; deployment of
  `0055`/this change to prod is **UNKNOWN**.

## Review round 1 — 2026-08-27 (Process-review worker, standing approval + owner rulings)

Ledger: `review.md` (reviewer findings R1–R5; Coder response rows written this pass). Owner rulings
relayed by the driver: R1 → (b) scope extension; R2, R3, R5 → apply; R4 → (A) no code. Nothing was
applied that the owner did not rule on; each row below states why it qualified.

### Change surface after round 1

- `src/server/WorkerSupervisor.ts` — 316 lines (was 276): `WorkerExit.spawnError?: string`;
  `handleExit` spawn-failure branch (error log + `scheduleRestart`); `markReady(index, clusterId?)`
  sender cross-check; meta on `Started worker` / `Worker N is ready` / `All workers ready`; corrected
  comment on the sync-throw `catch`.
- `src/server/Master.ts` — `git diff --numstat` vs HEAD `+74 / −66` (was `+56 / −66`; 0193's
  `+17 / −10` still included): `fork` dep attaches `worker.once("error", …)` → `handleExit({…,
  spawnError })`; `message` handler passes `worker.id` to `markReady`.
- `tests/server/Master.test.ts` — `+733 / −11` (was `+652 / −11`): #3 asserts `Started worker` meta;
  #10 gains the deadline-then-quorum assertion (R5); #17 re-described as the synchronous throw
  (`spawn EPERM`); new #19 (async spawn failure → cap, R1) and #20 (stale/mismatched
  `WORKER_READY`, R2). 28 cases in the `WorkerSupervisor` describe. 0055 + 0193 describes untouched.
- `review.md` — Coder response rows R1–R5 + one accepted residual (R4). Reviewer rows untouched.

### Evidence (run this pass, after the fixes)

```
$ npx jest tests/server/Master.test.ts --randomize  → Seed 1277313514; Tests: 28 passed, 28 total
$ npm test                                          → Test Suites: 96 passed; Tests: 848 passed
$ npm run lint                                      → exit 0
$ npx tsc --noEmit -p tsconfig.json                 → exit 0
```

Node v24.13.0 behaviour probe for R1 (scratchpad script, `cluster.setupPrimary` + `cluster.fork`):
`cwd: "/nonexistent/dir"` → `spawn <execPath> ENOENT` delivered as `Worker 'error'`, **no
`'exit'`** on the worker or `cluster`, `pid` undefined, `exitedAfterDisconnect` false,
`cluster.workers` emptied, `isDead()` true; with a listener on `worker.process` only → still
`uncaught exception` and the listener never runs (cluster's forwarder throws first); with
`worker.once("error")` → caught, no uncaught. `uid: 0` as non-root → synchronous `spawn EPERM`
throw from `cluster.fork`. (The first probe attempt used `execPath`, which cluster's primary does not
pass to `fork` — the child ran real node; discarded.)

Step 5.1 live re-run (run 6, 2 workers, R1 touches the live fork path), 13:28–13:29 UTC:

```
info  Worker 0 is ready. (1/2 ready)   {numWorkers:2, readyCount:1, workerIndex:0}
info  Worker 1 is ready. (2/2 ready)   {numWorkers:2, readyCount:2, workerIndex:1}
info  Quorum reached (2/2, quorum 2), starting game scheduling
warn  Worker 1 (PID: 54092) died with code: null and signal: SIGKILL   {clusterId:2, code:null, pid:54092, signal:"SIGKILL", workerIndex:1}
info  Restarting worker 1 in 1000 ms (restart 1/5 in window)
info  Restarted worker 1 (New PID: 2819)   {clusterId:3, pid:2819, workerIndex:1}   (+1.004 s)
info  Worker 1 is ready. (2/2 ready)   {numWorkers:2, readyCount:2, workerIndex:1}
```
Counts: `Quorum reached` 1, `could not find id` 0, `Ignoring WORKER_READY` 0, `uncaught exception`
0; real lobby served; process stopped, ports 3000–3020 free before and after. No `persistentID`
in the quoted lines. 4a unchanged — NOT PASSED, owner checking Uptrace.

### Decision log — round 1 (one entry per fix applied without a per-fix owner prompt)

- **R1** — answers: async spawn failure silently loses the index. Changed: `Master.ts` fork dep
  `worker.once("error")` → `handleExit({ spawnError })`; supervisor spawn-failure branch; comment;
  tests #17/#19. Qualified: owner-ruled (b) explicitly; verified `CORRECT` by the Node probe;
  localized (one listener + one branch, same cap/backoff). **Deviation from the ruling's wording,
  on evidence:** listener attached to the cluster `Worker`, not `worker.process` — the probe showed
  the latter never runs (forwarder throws first). Same intent, working attach point.
- **R2** — answers: `WORKER_READY` trusted without sender check. Changed: `markReady(index,
  clusterId?)` guard + warn; `Master.ts` passes `worker.id`; test #20. Qualified: owner-ruled apply;
  verified `PARTIALLY CORRECT` (mechanism real, unreachable with today's sender); mechanical.
- **R3** — answers: three relocated lines without meta. Changed: meta objects only, texts unchanged;
  asserted in #3/#10/#20. Qualified: owner-ruled apply; cosmetic, mechanical.
- **R4** — no fix (owner ruled (A)); accepted residual recorded in `review.md`; brief step 8 grep
  adjustment is the producer's at close.
- **R5** — answers: deadline-then-quorum untested. Changed: two assertions in #10. Qualified:
  owner-ruled apply; test-only.
- Obvious-winner calls this round: `none` beyond the R1 attach-point correction above.

## 4a outcome (2026-08-27, checked in Uptrace by lead on owner's behalf)

Owner ruled **close now** (`AskUserQuestion`, lead session, 2026-08-27) after having the run-5 filter
above checked in Uptrace. Facts as relayed by the lead, verbatim:

- All 4a logs arrived: env `dev`, 2026-08-27T12:43–12:45Z, attribute stored as
  `openfront_component = "Master"` (Uptrace normalizes dots to underscores).
- `Worker 1 (PID: 34191) died with code: null and signal: SIGKILL` (WARN): `workerIndex=1`,
  `clusterId=7`, `pid` stored as `process_pid=34191`, `signal=SIGKILL`; **`code` ABSENT** — the null
  value was dropped by the winston OTEL transport (body text still carries `code: null`).
- `Worker 1 died again after 5 restarts in the last 10 minutes; giving up on this index (code: null,
  signal: SIGKILL)` (ERROR): `workerIndex=1`, `signal=SIGKILL`, `restartsInWindow=5`,
  `windowMs=600000`; `code` absent (same drop).
- `90s readiness deadline: workers [1] never reported ready (1/2)` (ERROR): `missingWorkerIndices=1`,
  `readyCount=1`, `numWorkers=2`.
- `Restarting worker 1 in N ms (restart k/5 in window)` ×5 (1000/2000/4000/8000/16000 ms) and
  `Restarted worker 1 (New PID …)` ×5 — present.
- `Quorum reached (2/2, quorum 2), starting game scheduling` ×2 (INFO) — present.
- **Verdict: 4a PASSED** with caveat: null-valued attributes are dropped (confirms the gotcha at
  `ai-agents/knowledge-base/telemetry.md:152`); Uptrace free-text search did not match these lines,
  attribute filters (`restartsInWindow >= 0` etc.) did.
  *(Producer note at close: that path as relayed does not exist in the tree; the gotcha line is
  `ai-agents/wiki-vault/wiki/systems/telemetry.md:152` — verified by grep 2026-08-27.)*

Consequence for Step 3a: the fields DO reach Uptrace as attributes (hypothesis confirmed by
observation), except that a `null` value is dropped from the attribute set — the message text carries
it, so the brief's fallback is already satisfied by the belt-and-braces logging. The wiki gotcha at
`wiki/systems/telemetry.md` (Gotchas) is now **partly** settled: single-object meta survives; null
values do not. **Wiki page not edited** (ADR-005) — flagged for `fkit-wiki` to amend.
