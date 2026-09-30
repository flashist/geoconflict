# Plan — 0348: worker start failures report the real error, wait longer, stop the left-over worker

Planning-only. Nothing written. Builds on 0347's uncommitted working tree (`ClientGameRunner.ts`, `ReconnectSession.ts`, `tests/client/JoinLobbyReconnectSession.test.ts`).

## Summary
- **Root cause confirmed in code.** `Worker.worker.ts:42-58` wraps `createGameRunner(...).then(...)` in a `try` that only catches errors thrown straight away. A failure inside the async start (map download, config, runner build) is never sent back. `WorkerClient.ts:37-44`'s `error` listener doesn't see it either (a rejected promise is not a worker `error` event). So the page waits the full 5 s and says "Worker initialization timeout".
- **Fix:** the worker sends a new `init_failed` message with the real reason → `WorkerClient.initialize()` rejects right away. The time limit goes from 5 s to **15 s**. The failure path in `createClientGame` calls `worker.cleanup()`. Analytics can now tell a timeout from a crash.
- **0347 hand-off honoured:** the failure path gets `worker.cleanup()` and **no** `clearReconnectSession`. A test pins this.
- **The player sees the same heading as today** (`error_modal.worker_init_failed`). Only the technical `Error:` line changes, and it now shows the real reason. No new translation keys, so no `en.json`/`ru.json` change.

## Decisions made in this plan (the brief left them to the plan)
1. **Time limit = 15 s** (named constant `WORKER_INIT_TIMEOUT_MS = 15000`). I re-checked 0035's regression points against the current code:
   - Crashes now fail fast in *both* cases: errors thrown straight away (`error` event, already true) and async ones (this task). 0035's point 1 becomes true.
   - No test pins `5000`. The only mention is a comment at `tests/core/worker/WorkerClient.test.ts:66`, which I'll update.
   - Server disconnect window is 60 s (`GameServer.ts:62`, checked at `:1116`). 15 s is well inside it.
   - Starting late loses no turns: `start()` calls `joinGame(turnsSeen)` (`ClientGameRunner.ts:751`), and the catch-up mode takes over above 30 queued turns (`:793`).
   - The connection watchdog starts only in `start()`, 20 s after start (`:577-586`). It can't overlap the start window.
   - **New point, not in 0035: the spawn phase.** Multiplayer lasts 300 turns × 66.7 ms ≈ **20 s** (`DefaultConfig.ts:722`, `:244`). A start that takes longer than ~20 s after the server's `start` joins after spawning has closed, so the player can't place. 15 s leaves a margin, although a slow page map load uses up part of the same 20 s. So I'm not going above 15 s. That is why 15, not 20 or 30.
2. **Analytics shape: keep `Worker:InitFailed` exactly as today, and add one new event next to it:** `Worker:InitFailedCause:{Cause}`, with `{Cause}` ∈ `Timeout` | `Crash`.
   - New enum key `WORKER_INIT_FAILED_CAUSE_FIRST_PART: "Worker:InitFailedCause:"`, with the cause added at the call site. This follows the existing `SESSION_PLATFORM_DEGRADED_FIRST_PART` pattern.
   - **Value:** whole seconds from the worker start to the failure, the same style as `Match:PreloadReady`. This shows "crashed at once" apart from "crashed after 12 s of slow download", which is what 0035 needs.
   - Why not `Worker:InitFailed:Timeout`? GameAnalytics event names are hierarchical. A 3-part child under the old 2-part name would likely be double-counted in the `Worker:InitFailed` roll-up, and replacing the old event would break its trend line. Why not a numeric code in the value? Values get summed and averaged, so a code is unreadable.
   - `Crash` covers: the worker script failed to load, an error thrown straight away (`error` event), the new async `init_failed`, and `new WorkerClient` itself throwing.

## Changes, by file

### 1. `src/core/worker/WorkerMessages.ts`
- Add `"init_failed"` to `WorkerMessageType`.
- Add `export interface InitFailedMessage extends BaseWorkerMessage { type: "init_failed"; error: string; }` with a one-line Task 0348 comment.
- Add it to the `WorkerMessage` union.

### 2. `src/core/worker/Worker.worker.ts` (`init` case)
- Keep `gameRunner = createGameRunner(...).then(post "initialized")`. Then attach a separate branch: `gameRunner.catch((error) => { console.error("Failed to initialize game runner:", error); sendMessage({ type: "init_failed", id: message.id, error: error instanceof Error ? error.message : String(error) } as InitFailedMessage); })`.
- `gameRunner` stays the rejected promise on purpose, so a later `await gameRunner` fails loudly instead of acting on a half-built game. The attached `.catch` means the rejection is handled, so there's no stray `unhandledrejection`.
- Keep the existing sync `try/catch` around the call. Comment: *Task 0348 — the try only sees errors thrown straight away; an async start failure used to vanish and read as a timeout.*
- Send a string, not an `Error` object: it keeps the message simple, and the reason text is all we need.

### 3. `src/core/worker/WorkerClient.ts`
- `export const WORKER_INIT_TIMEOUT_MS = 15000;` with a comment giving the spawn-phase reason and the task number.
- `export class WorkerInitTimeoutError extends Error { constructor() { super("Worker initialization timeout"); this.name = "WorkerInitTimeoutError"; } }`. The message text stays the same as today (continuity for greps, reports and the modal).
- `initialize()`:
  - Keep the timer handle. Wrap `reject` so every way the start can end (initialized, `init_failed`, the `error` event, the timeout) clears the timer. That is one small `settle` helper, and `this.initReject` becomes the wrapped reject.
  - In the id handler, add a branch: `message.type === "init_failed"` → reject with `new Error(\`Worker initialization failed: ${message.error}\`)`.
  - The timeout rejects with `new WorkerInitTimeoutError()` after `WORKER_INIT_TIMEOUT_MS`.
- No other changes. `handleWorkerMessage`'s `default` branch already sends id-tagged messages to their handler, so `init_failed` needs no new `case`.
- Easy for 0035 to build on: 0035 will add map buffers to the `init` post. This touches only the reply side and the timer.

### 4. `src/client/ClientGameRunner.ts` (`createClientGame` failure path, currently `:372-390`)
- `let worker: WorkerClient | undefined;` and `const workerStartTime = Date.now();` before the `try`.
- In the `catch`:
  - `worker?.cleanup()` first. The `?.` covers the case where `new WorkerClient` itself threw. Comment: *Task 0348 — stop the left-over worker. Deliberately NO clearReconnectSession here: a worker start failure must keep the Rejoin session (task 0347).*
  - Keep the existing `Worker:InitFailed` event unchanged.
  - Add `flashist_logEventAnalytics(WORKER_INIT_FAILED_CAUSE_FIRST_PART + (err instanceof WorkerInitTimeoutError ? "Timeout" : "Crash"), Math.floor((Date.now() - workerStartTime) / 1000))`.
  - `showErrorModal` stays as is. It already shows `err.message`, which is now the real reason.
- After the `try/catch`, `worker` narrows to `WorkerClient` (the `catch` always returns). If `tsc` doesn't narrow it, use a local `const` inside the `try`. The implementer checks this with the build.
- `joinLobby`'s `.then(r === undefined → onGameEnd())` is unchanged.

### 5. `src/client/flashist/FlashistFacade.ts`
- Add `WORKER_INIT_FAILED_CAUSE_FIRST_PART: "Worker:InitFailedCause:"` next to the two `WORKER_INIT_*` keys.

### 6. `ai-agents/knowledge-base/analytics-event-reference.md` (§ *Worker Initialization Events*)
- Add a row for `Worker:InitFailedCause:{Cause}` covering the closed cause list, its meaning, the seconds value, and "fires right after `Worker:InitFailed`, once per failure".
- Note that `Worker:InitFailed` count = failures and cause totals add up to it.
- ⚠️ History note: before 0348, an async start crash was reported only after the 5 s limit, as a timeout. So older `Worker:InitFailed` data can't be split into crash and timeout.
- 0347 already has uncommitted edits in this file. Add to them; don't overwrite.

## Tests (core changes must be tested)
**`tests/core/worker/WorkerClient.test.ts`** (fake timers, existing `FakeWorker`):
- W1: `init_failed` with the init id → `initialize()` rejects at once with a message containing the worker's reason. Not a `WorkerInitTimeoutError`.
- W2: no reply → still pending at `WORKER_INIT_TIMEOUT_MS - 1`, rejects with `WorkerInitTimeoutError` ("Worker initialization timeout") at `WORKER_INIT_TIMEOUT_MS`.
- W3: after `initialized`, and W4: after an `init_failed` or `error` rejection → `jest.getTimerCount() === 0` (the timer is cleared).
- W5: an `init_failed` that arrives after the timeout does nothing (no throw, no second rejection).
- Update the "5 s" comment. The existing "pre-init error event rejects" test stays.

**New `tests/core/worker/WorkerWorkerInitFailure.test.ts`** (a separate file because the worker module keeps module-level state):
- `createGameRunner` mocked to reject → the worker posts `{ type: "init_failed", id: "init-1", error: "<reason>" }` and **never** posts `initialized`.
- A process `unhandledRejection` listener sees nothing during the test.

**`tests/client/JoinLobbyReconnectSession.test.ts`** (extend 0347's setup):
- The `WorkerClient` mock gains `WorkerInitTimeoutError: jest.requireActual(...).WorkerInitTimeoutError`. Without it, `instanceof` against a mocked-away export throws inside the catch, a real trap. The `FlashistFacade` mock's `analyticEvents` gains the three `WORKER_INIT_*` keys.
- J2 (extended): worker start fails → `cleanup` called once, **`clearReconnectSession` never called**, `onGameEnd` once. This pins the 0347 hand-off.
- J6: a timeout error → `Worker:InitFailed` + `Worker:InitFailedCause:Timeout`. A plain error → `…:Crash`. Each with a numeric value.
- J7: `new WorkerClient` throws → no crash on cleanup, `Crash` event, `onGameEnd` once, session kept.

**Then:** `npm test` (full; slow, the shell harnesses run too) and `npm run lint`. If a known supertest flake hits, re-run and say so.

## Verification (live, for the Verify step)
- **Forced crash:** the map URL must be blocked **only after** `Match:PreloadReady`. Blocking it earlier also breaks the page's own map preload, and then `createClientGame` rejects before any worker exists (0347's plan noted the same trap). Use Playwright `page.route` on `**/maps/**`, switched on at that console line, or DevTools request blocking added at that moment. Expect: the modal within about 1 s (the loader retries for 0.3 s + 0.6 s), `Error: Worker initialization failed: Failed to fetch /maps/…`, and `Worker:InitFailedCause:Crash`. Simpler second crash check: block the worker bundle, as 0347 did.
- **Slow but working:** "Disable cache" + throttling so the worker's map load takes 5–15 s → the match starts.
- **Real timeout:** a route that never answers the worker's map requests → the modal at ~15 s, `Worker:InitFailedCause:Timeout`.
- **No left-over worker:** after each failure, `page.workers()` is empty and the worker's `close` event fired.
- Port 3001 must be free (known local-dev trap).
- ⚠️ 0347's repro B (slow network → failure) will now need more than 15 s of slowness, or a forced worker error.

## Edge cases / risks
- **Timeout vs crash race:** whichever comes first wins. The other is a no-op (the promise has settled and the timer is cleared or the handler removed).
- **Leaving during a slow start:** the worker keeps going until the start ends (now up to 15 s instead of 5 s). After that it is stopped either way: success → `r.stop()` via `left`, failure → the new cleanup. This is limited and not new. 0035 shortens it. Not fixed here (out of scope).
- **The reason text in the modal** is a map URL plus a browser error string, with a version cache-buster. No secrets.
- **Player-facing wording is unchanged.** Arguing for a different heading for "crash" isn't worth it: in both cases the only advice is "refresh" (and Rejoin is offered, since 0347).
- **The GameAnalytics hierarchy assumption** is why the new event has a separate name. It isn't verified against the GA dashboard.

## Out of scope
- Giving the worker the page's map (0035, Option A).
- Stopping a still-starting worker the moment the player leaves.
- Any change to the reconnect-session logic.

## After done
- Wiki: `wiki/systems/client-game-teardown.md` (the "site B" row says "n/a", which misses the worker leak) and `features/reconnection.md` → route to `fkit-wiki` (`/fkit-wiki-ingest` of the done brief).

---

## Owner decisions at approval — appended by `fkit-lead` (driver), 2026-09-30

*Not part of the coder's plan text above; recorded here by the driver. Given live via `AskUserQuestion` in the `fkit lead` session. ⚠️ The owner was shown a condensed rendering of the plan above (declared as condensed at the time), not the byte-full text; the two plan-made calls (15 s limit; new separate `Worker:InitFailedCause:{Timeout|Crash}` event, old `Worker:InitFailed` unchanged) were named explicitly in the approval question.*

- **Plan:** APPROVED, including the 15 s limit and the separate-event analytics shape.
- **Open question — send the real crash reason to Uptrace too:** **YES — add one warning line with the reason** (via the existing `logOtelWarn` helper in the same file) **plus a test assertion.** This is an owner-approved in-scope addition to the plan above.
- *(Unrelated to this plan, recorded for traceability: the owner declined a production-verify task for `0347` — local proof is enough.)*
