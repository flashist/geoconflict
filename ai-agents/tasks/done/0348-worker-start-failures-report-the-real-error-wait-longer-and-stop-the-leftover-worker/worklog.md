# Worklog — 0348: worker start failures report the real error, wait longer, stop the left-over worker

## 2026-09-30 — BUILD (`fkit-coder`, spawned by `fkit-sprint-ship-loop` as the Build worker)

Built against the approved `plan.md` (blob `702a9309c5cbeda34d131be19d89ca81b11f9f4c`, checked with
`git hash-object` before starting — matched the pasted plan) plus the owner-approved addition recorded
at its bottom (one Uptrace warning line with the real reason, via `logOtelWarn`, plus a test).
`plan.md`, the brief's `## Status` and the sprint board were not touched. Built on top of 0347's
uncommitted working tree (its `ClientGameRunner.ts` / test edits are left as they were).

### What changed

- **`src/core/worker/WorkerMessages.ts`** — new `"init_failed"` message type,
  `InitFailedMessage { type: "init_failed"; error: string }`, added to the `WorkerMessage` union.
- **`src/core/worker/Worker.worker.ts`** (`init` case) — after `gameRunner = createGameRunner(…).then(…)`,
  a separate `gameRunner.catch(…)` logs and posts `{ type: "init_failed", id, error: <message> }`.
  `gameRunner` stays the rejected promise; the sync `try/catch` is kept; Task 0348 comment added.
- **`src/core/worker/WorkerClient.ts`**
  - `export const WORKER_INIT_TIMEOUT_MS = 15000` (comment gives the spawn-phase reason).
  - `export class WorkerInitTimeoutError` — message unchanged: `"Worker initialization timeout"`.
  - `initialize()`: timer handle kept; a `settleReject` wrapper clears it and is stored as
    `this.initReject` (so the constructor's `error` listener clears it too); `initialized` clears it;
    new `init_failed` branch rejects with `Worker initialization failed: <reason>`; the timeout rejects
    with `WorkerInitTimeoutError` after `WORKER_INIT_TIMEOUT_MS`.
- **`src/client/ClientGameRunner.ts`** (`createClientGame` failure path)
  - `let worker: WorkerClient | undefined` + `workerStartTime` before the `try`.
  - `catch`: `worker?.cleanup()` first (comment: deliberately no `clearReconnectSession`, task 0347);
    `Worker:InitFailed` unchanged; new `Worker:InitFailedCause:{Timeout|Crash}` with whole seconds
    since worker start; `logOtelWarn("Worker init failed (<cause>): <reason>")`; modal unchanged (now
    shows the real reason).
  - `tsc` narrows `worker` to `WorkerClient` after the `try/catch` — no local `const` needed.
- **`src/client/flashist/FlashistFacade.ts`** — `WORKER_INIT_FAILED_CAUSE_FIRST_PART: "Worker:InitFailedCause:"`.
- **`ai-agents/knowledge-base/analytics-event-reference.md`** — one new row under *Worker
  Initialization Events* (closed cause list, seconds value, fires right after `Worker:InitFailed`,
  cause totals = `Worker:InitFailed` count, ⚠️ history note). Added next to 0347's edits, which are
  untouched.

### Tests

- **`tests/core/worker/WorkerClient.test.ts`** — new `describe` (task 0348): W1 (`init_failed` →
  immediate reject with the reason, not a `WorkerInitTimeoutError`), W2 (pending at
  `WORKER_INIT_TIMEOUT_MS - 1`, `WorkerInitTimeoutError` at the limit; also pins the constant at
  15000), W3 (timer cleared after `initialized`), W4a/W4b (timer cleared after `init_failed` / `error`
  rejection), W5 (a late `init_failed` / `error` after the timeout is a no-op). "5 s" comment → "15 s".
- **`tests/core/worker/WorkerWorkerInitFailure.test.ts`** (new) — `createGameRunner` rejects → worker
  posts exactly one message, `init_failed` with id `init-1` and the reason; never `initialized`; a
  `process` `unhandledRejection` listener sees nothing.
- **`tests/client/JoinLobbyReconnectSession.test.ts`** — mocks: `WorkerInitTimeoutError` via
  `jest.requireActual`; `FlashistFacade` mock gains the three `WORKER_*` keys. J2 extended
  (`cleanup` once; session still not cleared). New J6a (timeout → `InitFailed` + `…Cause:Timeout`,
  numeric value, Uptrace warning text), J6b (plain error → `…Cause:Crash`, Uptrace warning carries the
  real reason, `cleanup` once), J7 (`new WorkerClient` throws → no cleanup call, `Crash`, Uptrace
  warning, `onGameEnd` once, session saved and not cleared).

**Results (this step):**

- `npx jest tests/core/worker tests/client/JoinLobbyReconnectSession.test.ts tests/client/ClientGameRunnerTeardown.test.ts tests/client/ReconnectSession.test.ts`
  → 6 suites, 41 tests, all pass.
- `npx tsc --noEmit -p tsconfig.json` → exit 0.
- `npx eslint` + `npx prettier --check` on the touched source/test files → clean.
  `analytics-event-reference.md` fails `prettier --check`, but it **already failed at `HEAD`** (checked
  against `git show HEAD:…`); not reformatted, to keep the diff minimal.
- **Mutation checks** (each change reverted afterwards): removing the worker's `.catch` → all 3 tests
  in `WorkerWorkerInitFailure.test.ts` fail (jest also fails the suite on the unhandled rejection);
  removing `worker?.cleanup()` → J2 and J6b fail; removing `clearTimeout` on `initialized` → W3 fails.
- **Not run here** (the Verify step owns them): full `npm test`, full `npm run lint`, live browser
  checks.

### Decision log

Calls the plan did not spell out, made without asking (each within the plan's intent):

1. **Uptrace warning fires on every worker start failure, timeout included**, not only on a crash.
   Why: the owner approved "one warning line with the reason"; one line per failure with the cause
   label is the simplest reading, and the timeout line is still useful ("Worker initialization
   timeout"). Easy to narrow later if unwanted.
2. **Uptrace warning text:** `Worker init failed (<Timeout|Crash>): <err.message>` — cause + the same
   reason text the modal shows. No game/client id added (`logOtelWarn` already attaches `enduser.id`
   when set; the reason is a map URL plus a browser error string — no secrets). The reason is embedded
   in the message string (the body), since extra args would be dropped.
3. **`initialize()` creates the timer first**, before the handler/`postMessage`, so the handle can be
   a `const` (ESLint `prefer-const` rejected the `let` assigned once later). No behaviour change:
   nothing can settle before `postMessage` returns.
4. **`WorkerWorkerInitFailure.test.ts` has `export {};`** — without it the file is a script and its
   `Listener` type clashes with `WorkerWorker.test.ts`'s (`tsc` TS2300).
5. **W4 split into W4a (`init_failed`) and W4b (`error` event)**; the plan listed both under W4.

Fixes applied without asking under the review standing approval: **none** (this is the BUILD step; no
review has run yet).

## Verify — 2026-09-30 (`fkit-coder`, spawned by `fkit-sprint-ship-loop` as the Verify worker; wrote no source/tests)

- **`npm test` (full, first run): GREEN — 182/182 suites, 3244/3244 tests**, shell harnesses included,
  nothing skipped (the Docker-probed harness ran). No supertest flake, no `SIGSEGV`; no re-run needed.
- **`npm run lint`:** exit 0, clean.
- **Live checks.** Local dev on this working tree (0347's uncommitted changes included): game server on
  3000–3002, client via `webpack serve` on port **9010** (9000 belongs to an unrelated project's dev
  server, PID 57856 — left untouched). Headless Chromium driven by a Playwright script (scratchpad only,
  not in the repo), fresh context per run, `context.route` for blocking. To *see* the Uptrace warning,
  the client was built with the OTEL endpoint pointed at a **local fake OTLP sink on 127.0.0.1** that
  just recorded request bodies — nothing was sent anywhere real. Everything I started (game server,
  client, sink) was stopped afterwards; ports 3000–3002 / 9010 free again.
  - **Forced crash (maps blocked only after `Match:PreloadReady`): PASS** (3 runs, same result).
    Worker's `manifest.json` fetch aborted 3× (first try + 0.3 s + 0.6 s retries) → modal ~1.1 s after
    the worker was created. Modal: heading `Failed to start the game — please try refreshing the page.`,
    `Error: Worker initialization failed: Failed to fetch /maps/<map>/manifest.json?v=0.0.155: Failed to fetch`.
    Events `Worker:InitFailed` then `Worker:InitFailedCause:Crash` (value `1`). Sink received one
    `WARN` log: `Worker init failed (Crash): Worker initialization failed: Failed to fetch /maps/…`.
    Worker `close` fired at the failure; `page.workers()` = 0 afterwards.
  - **Worker bundle blocked: PASS.** Modal at once; `Worker:InitFailedCause:Crash` (value `0`); sink
    got `Worker init failed (Crash): Worker crashed: undefined`; `page.workers()` = 0.
    ⚠️ Observation, not a failure: for a script-load failure the "reason" is `Worker crashed: undefined`
    — the browser's `error` event carries no message. That text comes from the pre-existing `error`
    listener in `WorkerClient`, not from this change, and the plan only promised the real reason for
    the async path. Worth knowing when reading Uptrace.
  - **Slow but working: PASS.** Worker map requests held until 9 s after the first held request → the
    worker's start took **~6.3 s** (worker created → `Worker:InitSuccess`), i.e. longer than the old 5 s
    limit. `starting game!` logged, no error modal.
  - **Real timeout (worker map requests never answered): PASS.** Modal **15.0 s** after the worker was
    created, `Error: Worker initialization timeout`; `Worker:InitFailedCause:Timeout` (value `15`);
    sink got `Worker init failed (Timeout): Worker initialization timeout`; worker `close` fired,
    `page.workers()` = 0.
  - **No left-over worker: PASS** in every failure case above (`close` event observed, `page.workers()`
    empty ~1.5 s later).
  - **0347 regression (failed start keeps the session, Rejoin works): PASS.** After a forced crash,
    `reconnect-session` held that game's gameID/clientID. Unblocked + reload → `Reconnect:PromptShown`;
    Rejoin → `Reconnect:Accepted` → `Reconnect:Succeeded` → `Worker:InitSuccess` on the same IDs;
    session still saved. (An earlier run where my script accidentally re-armed the block on Rejoin also
    showed a **second** failure keeping the session and closing its worker.)
- **Not verified live:** the event values are whole seconds (`Math.floor`), so the crash showed `1` s
  — right, but coarse. The Uptrace line was checked at a local sink only, not in a real Uptrace.
- **Fixes applied without asking / obvious-winner calls: none.** This was a Verify step.

## Process review, round 1 — 2026-09-30 (`fkit-coder`, spawned by `fkit-sprint-ship-loop` as the Process-review worker)

Plan checked before starting: `plan.md` blob `702a9309c5cbeda34d131be19d89ca81b11f9f4c` (`git hash-object`),
matches the approved plan. `review.md` *Reviewer findings* not edited. No accepted residuals existed; no
ADR in `ai-agents/knowledge-base/decisions/` covers this path. Round 1 — no prior coder history, so no
regression/oscillation to check.

- **R1** (leave-during-start → stray modal + telemetry): verified CORRECT, pre-existing, low. **No code
  change** — owner ruling 2026-09-30 (relayed by the driver): "Note it on 0035". Row set to
  `won't fix (frontier)`; *Accepted residuals* entry written. The 0035 note is returned to the driver for
  a producer to add — the 0035 brief was not touched.
- **R2** (J2 fixture reads like a timeout but runs the Crash branch): verified CORRECT.

### Decision log

1. **Fix applied without asking — R2.** Finding: J2 in `tests/client/JoinLobbyReconnectSession.test.ts`
   ("J2: a failed worker start keeps the session") rejected with a plain `Error("Worker initialization
   timeout")`, which 0348's code classes as `Crash`. Change: the fixture now rejects with
   `new WorkerInitTimeoutError()`, plus a one-line comment naming R2. Why it qualified: verified
   `CORRECT`; mechanical and localized (one test fixture, no product code); inside the approved plan (the
   plan's J2 extension + tests section). **Obvious-winner call inside it:** of the reviewer's two options
   (the timeout class vs. a crash-like message) I took the timeout class — it keeps the fixture's
   original meaning from 0347 (a timeout-shaped failure) and makes the text and the branch agree; the
   Crash branch is already covered by J6b and J7. Evidence: `npx jest tests/client/JoinLobbyReconnectSession.test.ts tests/core/worker`
   → 4 suites, 29/29 pass; eslint + prettier clean on the file; `npx tsc --noEmit -p tsconfig.json` exit 0;
   `npm run lint` exit 0. Full `npm test` **not** re-run (a test-fixture-only change; the full run is in
   the Verify entry above).
2. No other fixes or obvious-winner calls.
