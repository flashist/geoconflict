# Plan — 0056 restore worker crash recovery (capped) + survivable scheduling gate

**Approval record.** Plan produced by a spawned `fkit-coder` (plan-only) on 2026-08-26 and
**approved by the owner via `AskUserQuestion` in the `fkit lead` session on 2026-08-27**, driver
`fkit-sprint-ship-loop`. The text from "## Plan — 0056" onward is the coder's return, copied verbatim
by the driver at approval. Owner rulings on the three plan-time decisions, folded in at approval:

- **D1 — file boundary: (A)** the readiness/restart units live in a **new pure file
  `src/server/WorkerSupervisor.ts`**; `Master.ts` builds and exports the single instance
  (`workerSupervisor`) that `0192` will read. The brief's literal "Master.ts plus tests" scope is crossed
  by exactly this one new file, by ruling.
- **D2 — backoff exponent: (A)** `k` = restarts of that index in the current rolling 10-minute window.
  Live sequence 1 s, 2 s, 4 s, 8 s, 16 s, then give-up on the 6th death; the 30 s ceiling is enforced in
  `backoffDelayMs` and unit-tested at k ≥ 5 but is never reached live inside one capped window.
- **D3 — OTEL environment for verification 4a: (A)** local dev run with the prod OTLP endpoint + auth
  header exported in the shell from the gitignored `.env.prod` (values never written to any artifact),
  `GAME_ENV=dev` so records are tagged `environment=dev`; kill a worker locally; the coder returns the
  exact Uptrace filter and the owner checks it (VPN `/32` bypass). If the values cannot be exported in
  the build spawn, 4a is recorded NOT passed and left open for the owner — never marked passed.
- Standing rulings restated: quorum **18 of 20, 90 s deadline** (2026-08-22, confirmed 2026-08-26 on the
  0057 findings); restart cap **5 per worker index per 10-min window, backoff 1 s → 30 s, then give up
  and log at error**; the cap ships in the same change; routing untouched (ADR-109 / `0192`);
  `0193` lands first and this task rebases its one-line interval.

---

## Plan — 0056 restore worker crash recovery (capped) + survivable scheduling gate

**Code state read:** `dev` HEAD `282655c` **plus uncommitted `0193` edits** in `src/server/Master.ts` / `tests/server/Master.test.ts`. Node v24.13.0 local; Jest 30; `@opentelemetry/winston-transport` 0.11.0; undici 8.

### Line corrections (post-0193 tree, supersede the brief and the 0057 §1 table)

| Item | Brief / 0057 says | Tree now |
|---|---|---|
| `readyWorkers` | `:20` | `:20` (untyped `new Set()`) |
| Gate | `:119` | `:121` — `if (readyWorkers.size === config.numWorkers())` |
| Interval block | `:128-136` | **one line `:130`** — `setInterval(() => void lobbyPollTick(scheduleLobbies), 100);` (0193) |
| Exit handler / `env` read | `:142-173` / `:143` | `:136-167` / `:137` |
| `lobbyPollTick` export, `publicLobbyIDs` export | — | `:429-438`, `:90` (0193) |
| `schedulePublicGame` | `:508-535` | `:515-542` |

`0055`'s `clusterId/pid/code/signal` failure-branch fields, `moduleFilename/moduleDir`, and `export const app` are present — verified, kept.

### Design in one paragraph

All state that the brief wants tested moves into a **pure class `WorkerSupervisor`** in a new file `src/server/WorkerSupervisor.ts` (no `cluster`, `express`, or `Logger` imports). It owns the `Map<clusterId, workerIndex>`, the ready `Set<number>`, the per-index restart timestamps, the abandoned set, and the `started` flag; every side effect is an injected dependency (`fork`, `setTimer`, `now`, `log`, `onSchedulingStart`). `Master.ts` builds one module-level instance (`export const workerSupervisor`) with the real `cluster.fork` / `setTimeout` / `Date.now` / `log`, and its `cluster.on("message"|"exit")` handlers become one-line delegations. `0192` reads `workerSupervisor.readyIndices()` from `schedulePublicGame` in the same module — no re-plumbing.

### Step 0 — Constants and pure helpers (`src/server/WorkerSupervisor.ts`)

```ts
export const READY_QUORUM_NUMERATOR = 9, READY_QUORUM_DENOMINATOR = 10; // 18 of 20 as ruled
export const READY_DEADLINE_MS = 90_000;
export const RESTART_CAP = 5;
export const RESTART_WINDOW_MS = 10 * 60_000;
export const BACKOFF_BASE_MS = 1_000;
export const BACKOFF_CEILING_MS = 30_000;
export function quorumFor(numWorkers: number): number   // Math.max(1, Math.ceil(numWorkers * 9 / 10)) → 20→18, 2→2, 10→9
export function backoffDelayMs(priorRestartsInWindow: number): number // Math.min(30_000, 1_000 * 2 ** k)
```

**Quorum form chosen: ratio 9/10 with integer arithmetic and `ceil`**, not `numWorkers − 2`. Reason: `n − 2` gives `0` at `DevConfig`/`PreprodConfig`'s 2 workers (scheduling would start with nobody listening); the ratio gives 18 at 20 exactly and 2 at 2, and the 90 s deadline still covers a dead dev worker. Integer `n*9/10` avoids `0.9*n` float edge cases.

### Step 1 — Crash recovery + diagnostics (defects #1, #2)

`WorkerSupervisor`:
- `start()`: forks indices `0..n−1` via `deps.fork(i)` (returns `{clusterId, pid}`), records `map.set(clusterId, i)`, logs `Started worker i (PID: …)` (existing text), then arms `deps.setTimer(() => this.deadline(), READY_DEADLINE_MS)`.
- `handleExit({clusterId, pid, code, signal, exitedAfterDisconnect})`:
  1. `index = map.get(clusterId)`; `map.delete(clusterId)`.
  2. **`if (index === undefined)`** (strict, so index 0 survives) → `log.error("worker crashed could not find id", {clusterId, pid, code, signal})` — message text unchanged for grep continuity; return. This is now a genuine bookkeeping-bug branch, not the normal path.
  3. `ready.delete(index)` — **`markDead`**; the ready set finally shrinks.
  4. `log.warn("Worker <i> (PID: <pid>) died with code: <code> and signal: <signal>", {workerIndex, clusterId, pid, code, signal})` — the **four fields on both branches**, and the values also in the message text (see Step 3a).
  5. `if (exitedAfterDisconnect)` → `log.info`, no restart (nothing calls `disconnect()` today; defensive, idiomatic for `cluster`).
  6. Otherwise → Step 2 policy.
- `Master.ts` exit handler shrinks to `workerSupervisor.handleExit({ clusterId: worker.id, pid: worker.process?.pid, code, signal, exitedAfterDisconnect: worker.exitedAfterDisconnect })`. The `(worker as any).process?.env` read is deleted.

### Step 2 — Restart cap + backoff (decision (b), exact numbers)

`scheduleRestart(index)` inside the supervisor:
1. Prune `restarts[index]` to timestamps `> now − RESTART_WINDOW_MS` (rolling, **per index**).
2. `k = restarts[index].length`. **If `k >= RESTART_CAP` (5)** → `abandoned.add(index)`; `log.error("Worker <i> died again after 5 restarts in the last 10 minutes; giving up on this index", {workerIndex, restartsInWindow, windowMs, code, signal})`; **return — no timer, no fork.** This is the fork-loop guard.
3. Else `delay = backoffDelayMs(k)` (1 s, 2 s, 4 s, 8 s, 16 s for k = 0..4), `restarts[index].push(now)`, `log.info("Restarting worker <i> in <delay> ms (restart <k+1>/5 in window)")`, `deps.setTimer(() => this.forkIndex(index, "restart"), delay)`.
4. `forkIndex` on restart logs `Restarted worker <i> (New PID: …)` (existing text) and re-registers the map entry — "populated at fork time **and on every restart**". If `deps.fork` **throws** (e.g. `EAGAIN`), log at error and route back through `scheduleRestart(index)` so a fork failure is counted against the same cap instead of silently losing the index or looping.

Counting semantic, stated: the window counts **restarts issued**, timestamped when scheduled. Death #1–#5 inside 10 min → restarted with 1/2/4/8/16 s; death #6 inside the window → give up. An index whose deaths are spread so no 10-min window holds 5 stays restartable forever (brief's "4 over 30 min" case).

### Step 3 — Survivable gate (defects #3, #4; decision (a))

- `markReady(index)`: `ready.add`; `log.info("Worker <i> is ready. (<size>/<n> ready)")` (existing text); when `size === n` → `log.info("All workers ready")` (keeps verification step 8's grep working); then `maybeStart("quorum")`.
- `maybeStart`: `if (!started && ready.size >= quorumFor(n))` → `started = true`; `log.info("Quorum reached (<size>/<n>, quorum <q>), starting game scheduling" + (missing.length ? "; still waiting for workers [a, b]" : ""))`; `deps.onSchedulingStart()`. **`started` is the `schedulingStarted` flag** — the interval installs exactly once across repeated ready events, restarts, and quorum-then-deadline.
- `deadline()` (fired by the 90 s timer armed in `start()`): if `missing().length > 0` → **`log.error("90s readiness deadline: workers [a, b] never reported ready (<size>/<n>)", {missingWorkerIndices: [a, b], readyCount, numWorkers})`** — by index. If `!started` → `started = true`, `deps.onSchedulingStart()`. If everything is ready → no log (no spurious noise on a healthy boot).
- **Interpretation, on record:** the brief's "log at error which worker indices *never reported*" is implemented as the **deadline audit**, not at quorum time. Reason: every healthy 20-worker boot passes through 18/20 with two workers still booting for a few hundred ms; an error line there would fire on **every** prod boot and train readers to ignore it. At quorum time the missing indices are logged at `info`; at 90 s anything still missing is an `error` naming them. The capped-out path logs its own `error` at the moment it gives up (Step 2). Owner can override at the gate.
- `Master.ts`: `const readyWorkers = new Set()` (`:20`) is deleted; the `cluster.on("message")` handler becomes `if (message.type === "WORKER_READY") workerSupervisor.markReady(message.workerId)`; the `:121-131` block becomes a module function:
  ```ts
  function startScheduling() {
    const scheduleLobbies = () => { schedulePublicGame(playlist).catch((error) => log.error(`Error scheduling public game: ${formatError(error)}`)); };
    setInterval(() => void lobbyPollTick(scheduleLobbies), 100);   // 0193's line, unchanged
  }
  ```
  passed as `onSchedulingStart`. `startMaster()` calls `workerSupervisor.start()` in place of the fork loop. Exports added to `Master.ts`, marked test-only like `app`/`publicLobbyIDs`: `workerSupervisor` (also `0192`'s seam).

### Step 3a — OTEL delivery of the log fields (carried from 0055)

- **Belt and braces from the start:** every log line this task adds or touches carries the diagnostic values **both** as a single-object meta (second arg) **and** in the message string. So if Uptrace loses the attributes, no re-verify round trip is needed — the text already carries them; the observation then only decides what the worklog records and whether the wiki gotcha needs `fkit-wiki`.
- What the code reading says (recorded as hypothesis, per brief): `winston-transport/build/src/utils.js:55-67` spreads own string keys of the info record into `attributes` (symbol keys like `Symbol(splat)` are skipped by `for…in`), so single-object meta survives; `sdk-logs/utils/validation.js:24-28` **explicitly accepts `null`** attribute values, so `code: null` (signal death) / `signal: null` (exit-code death) reach the exporter — whether Uptrace *displays* a null attribute is one of the things to observe.
- Observation procedure (needs the environment decided in NEEDS-DECISION 3): run the server with `OTEL_EXPORTER_OTLP_ENDPOINT` + `OTEL_AUTH_HEADER` set and `GAME_ENV=dev` (Uptrace `environment=dev`, resource `openfront.component=Master`); `kill -9` one worker; in Uptrace → Logs filter `environment = dev` and body contains `died with code`; check attributes `workerIndex, clusterId, pid, code, signal`; repeat for the deadline line (`missingWorkerIndices`) and the give-up line. Record environment + result in `worklog.md`. If no OTEL environment is available: **leave 4a unmet and say so**, per brief.
- Never edit `ai-agents/wiki-vault/`; flag `telemetry.md:152` for `fkit-wiki` if the observation settles it.

### Step 4 — Tests (`tests/server/Master.test.ts`, extended in place; fork-free)

New `describe("WorkerSupervisor")` importing the pure module directly — no jest fake timers (0193's suite uses them in its own `beforeEach`; the supervisor tests use an injected fake `setTimer` that records `{fn, ms}` and a `clock` the test advances, so the two suites cannot interfere and no module state is shared). Test harness: `deps = { numWorkers, fork: jest.fn(i => ({clusterId: nextId++, pid: 1000+i})), setTimer, now: () => clock, log: {info,warn,error: jest.fn()}, onSchedulingStart: jest.fn() }`.

| # | Case (brief bullet) | Assertion |
|---|---|---|
| 1 | `quorumFor` | 20→18, 2→2, 10→9, 1→1 |
| 2 | `backoffDelayMs` | k=0..6 → 1000, 2000, 4000, 8000, 16000, 30000, 30000 (ceiling) |
| 3 | **Worker index 0** not dropped | exit for index 0's clusterId → no `could not find id`, ready loses 0, timer 1000 ms armed, firing it forks index 0 |
| 4 | Unknown clusterId | `log.error("worker crashed could not find id", {clusterId,pid,code,signal})`, no timer |
| 5 | Dead worker removed from ready **and** re-forked | `readyIndices()` lacks it after exit; fire timer → `fork(idx)`; `markReady` → back in the set |
| 6 | Interval exactly once | n=20: ready 0..17 → 1 call; 18, 19 → 1; exit+refork+ready → 1; `deadline()` → 1 (**quorum-then-deadline**) |
| 7 | Quorum **exactly 18** / **17 does not** | 17 ready → 0 calls; 18th → 1 |
| 8 | **90 s deadline alone** | 5 ready; fire the timer armed with `ms === 90_000` → 1 call; error log names the 15 missing indices by number |
| 9 | Deadline not spurious | 20 ready, fire deadline → no error log, still 1 call |
| 10 | Scales to dev | n=2: both ready → start; n=2: one ready + deadline → start, error names the other index |
| 11 | Missing by index | assert `missingWorkerIndices` equals e.g. `[2, 7]` and message contains `[2, 7]` |
| 12 | **Restart cap — fork-loop guard** | index 4 dies 6× at clock 0..60 s: 5 timers armed (1/2/4/8/16 s), each fired → 5 forks; 6th death → **no timer, no fork**, `giving up` at `error`, `abandonedIndices() = [4]`; total `fork` calls = 20 + 5 |
| 13 | Backoff grows, capped | recorded delays `[1000, 2000, 4000, 8000, 16000]`; ceiling covered by #2 (see NEEDS-DECISION 2) |
| 14 | Per-index window | index 3 dies 5× (all restarted); index 7 then dies once → 1000 ms, not affected |
| 15 | Rolling window | deaths at 0, 7.5, 15, 22.5, 30 min → all restarted; 5 deaths in minute 1 then a 6th at 11 min → restarted (window pruned, k=0 → 1 s) |
| 16 | `exitedAfterDisconnect` | no restart, no error |
| 17 | `fork` throws on restart | error logged, next attempt scheduled with backoff, counts toward the cap |
| 18 | `Master.ts` seam | `workerSupervisor` exported; `readyIndices()` empty before `startMaster()` (fork-free smoke) |

Not unit-tested, said plainly: the `cluster.on(...)` one-line delegations in `startMaster()` — covered only by the local verification below. Also `npm test` (full), `npm run lint`, `npx tsc --noEmit -p tsconfig.json`.

### Step 5 — Local verification (dev, no nginx)

Pre-flight: `lsof -nP -iTCP:3000-3020 -sTCP:LISTEN || echo free` (Remotion squats 3001 — memory note).

1. **Kill one worker (2 workers):** `npm run start:server-dev > run.log 2>&1 &`; `kill -9 <PID of "Started worker 1">` → expect `Worker 1 (PID: …) died with code: null and signal: SIGKILL`, `Restarting worker 1 in 1000 ms`, `Restarted worker 1 (New PID: …)`, `Worker 1 is ready`. This replaces the brief's §5.1 script (that script is standalone and never exercised `Master.ts`; the equivalent proof is the live kill).
2. **Worker 0 specifically:** same with `Started worker 0`'s PID → identified and restarted, zero `could not find id` lines.
3. **Outage simulation at prod shape (temporary, uncommitted local hacks — reverted before review, `git status` checked):** `DevConfig.numWorkers()` → 20; in `Worker.ts` top: `if (process.env.WORKER_ID === process.env.FORCE_CRASH_WORKER_INDEX) process.exit(1);`. Run with `FORCE_CRASH_WORKER_INDEX=16`. Expect, in order: index 16 dies at ~+2 s; restarts at +1/+2/+4/+8/+16 s each dying; **6th death → `giving up` error, no further `Restarted worker 16`**; `pgrep -fc 'src/server/Server.ts'` stabilises at 20 (19 workers + master) and stays there for ≥ 2 min; `Quorum reached (18/20…)` well before 90 s; `curl localhost:3000/api/public_lobbies` serves a real lobby; at 90 s `90s readiness deadline: workers [16] never reported ready`. Then unset the env var → healthy 20-worker boot → `All workers ready` exactly once, one `Quorum reached`, lobbies as before.
4. **Exactly one interval:** with kill #1 above, count `Quorum reached`/`starting game scheduling` lines = 1; lobby turnover cadence unchanged (a doubled interval would show a doubled `Error fetching game` rate under a `SIGSTOP` — sanity check only).
5. **Prod-shaped gate at 20:** unit tests #6–#9 and #12 run at n=20.
6. **OTEL step 4a:** per Step 3a, environment per NEEDS-DECISION 3.
7. **Post-deploy (owner/producer, real box):** `docker logs --since "$(docker inspect --format '{{.State.StartedAt}}' "$CID")"` → 20/20 ready, `All workers ready` once, `Quorum reached` once, no `giving up`, endpoint serving a lobby. Deployment of `0055`/this change to prod is **UNKNOWN** until then; do not assume.

Filter `persistentID` from every excerpt before it lands in `worklog.md`.

### What happens to games on a dead index (not routing — ADR-109 / 0192)

- Lobby on the dead index: dropped by the next poll tick (~32 ms, 0057 §2.4); new games keep hashing onto the index (≈1/20 per draw) and fail fast with 3 error lines until the process is back (≤ 1–16 s with backoff) — `0192` removes even that.
- Joined players: sockets close, client reconnect loop on the same `/w<N>/` path (0057 §2.4); once the restarted process is up the upgrade succeeds but the game state is gone — the match is lost. **Pre-existing behaviour; game-state recovery is out of scope and not designed here.**
- Capped-out index: stays absent until container restart; excluded from placement by `0192` once it lands; visible only via the `giving up` error line and the 90 s audit (if inside the first 90 s). No alert rule exists — follow-up for the owner (0057 §4 row iv).

### Change surface

- **New:** `src/server/WorkerSupervisor.ts` (pending NEEDS-DECISION 1).
- **Edit:** `src/server/Master.ts` — delete `:20`; replace fork loop, `message` handler body, gate block `:121-131`, exit handler `:136-167`; add `startScheduling()` + `workerSupervisor` export.
- **Edit:** `tests/server/Master.test.ts` — append the `WorkerSupervisor` describe; existing 0055 + 0193 tests untouched.
- **Write:** task folder `worklog.md` (decision log: OTEL observation, interpretations above, unattended-fix record or `none`).
- **Not touched:** `Worker.ts` (except the temporary uncommitted crash hack), configs, `Dockerfile`, client, wiki, incident record.

## Risks / edge cases

- **Healthy prod boot now starts scheduling at 18/20** with two workers still booting for a few hundred ms → a draw landing on them costs the 0057-measured ~100 ms + 3 error lines, self-healing. Expected, accepted by the ruling; `0192` removes it. The `All workers ready, starting game scheduling` line is split into `Quorum reached …` + `All workers ready` — greps on the latter keep working.
- **30 s ceiling unreachable within one capped window** (max reached delay 16 s) — NEEDS-DECISION 2.
- **Tree hygiene:** `0193` and the Inbox work are uncommitted in the same tree; the build worker must keep its diff to the three files above. If `0193` were reverted, this plan's Step 3 rebases the single `setInterval` line back to the old block — trivial either way.
- **Wall-clock jumps** (NTP) distort the 10-min window slightly; `Date.now` kept for log readability. Negligible.
- **Master shutdown:** SIGTERM kills the master before exit events are processed; pending backoff timers die with it. No restart storm on container stop.
- **A worker that reports ready then wedges** is still in the ready set (liveness ≠ health) — recorded tradeoff (ADR-109), unchanged here.
- **`fork` failure path (#17)** is my addition beyond the brief's letter; small, same policy, stops an `EAGAIN` from silently losing an index. Reviewer may call it scope — flagged.
- **Fake-timer coexistence:** 0193's describe installs modern fake timers; the supervisor suite never touches `setTimeout` (injected), so ordering cannot leak. Stated so the reviewer does not re-derive it.
- **`Symbol(splat)` gotcha** does not apply to single-object meta by code reading; still a hypothesis until 4a is observed. Nulls are accepted by the SDK (`validation.js:26`); Uptrace's handling of a null attribute is unobserved.
- **Step 4a may be unmeetable from a spawn** (no Uptrace credentials/VPN in a worker context) — then the worklog says so and the step stays open; the code is still shippable because the values are in the message text regardless.

## Decisions raised at plan time (all ruled at approval — see the approval record above)

- **NEEDS-DECISION 1 — file boundary** → (A) new `src/server/WorkerSupervisor.ts`.
- **NEEDS-DECISION 2 — backoff exponent** → (A) `k` = restarts of that index in the current rolling window; 1, 2, 4, 8, 16 s then give-up; 30 s ceiling enforced and unit-tested, never reached live.
- **NEEDS-DECISION 3 — OTEL environment for 4a** → (A) local run with the prod OTLP endpoint + auth header exported in the shell from `.env.prod` (never written to artifacts), `GAME_ENV=dev`; owner checks Uptrace.
