# Plan — 0232 worker tick error never reaches the main thread

> **Approval record.** Plan produced by a spawned `fkit-coder` (plan-only step) and **approved by the
> owner via `AskUserQuestion` in the lead session on 2026-09-13**, driven by `/fkit-sprint-ship-loop`.
> The owner was shown a condensed presentation of this plan by the driver; the text below is the
> coder's returned plan, copied by the driver at approval (transport HTML escaping decoded, nothing
> else changed). The gate is prose-enforced, not a structural write-wall (ADR-031 honesty clause).
>
> **Owner rulings folded in at approval (2026-09-13):**
> - **D4 — post-init worker `error` event forwarding:** **INCLUDE** (the ~3 lines in `WorkerClient.ts:37-42`).
> - **D1 / D2 / D3:** **confirmed** — separate `game_error` message type; non-`Error` throws reported;
>   `isExecuting` latch kept.
> - **Follow-up briefs at close (producer):** **F2** (async message-handler throws in the worker stay dark)
>   — file it. **F4** (crash modal UX) — **not** filed; flagged in the worklog only.
> - **Multiplayer coverage of step 8:** not separately ruled — run as the plan says (singleplayer plus one
>   dev-lobby multiplayer game if port 3001 is free; if not free, say so and record singleplayer only).
> - **Working tree:** carries uncommitted 0219/0241 changes (shell scripts, docs, `tests/scripts/`,
>   `CLAUDE.md`, knowledge-base). **Do not touch them and do not include them in the change surface.**

## 0232 — implementation plan (plan-only; 2026-09-13; working tree = `dev` at `fd2c88e` + uncommitted 0219/0241 files, none of which this task touches)

### 0. Line-number re-verification (working tree, today — supersedes the brief's `c910452` frame)

| Brief cite | Today | Content check |
|---|---|---|
| `GameRunner.ts:171-183` | **`:170-183`** unchanged | try at `:170`, `Error` branch `:173-179` → `callBack({errMsg, stack} as ErrorUpdate)`, non-`Error` `:180-182` log only, `return` `:183` |
| `Worker.worker.ts:20-28` | **`:20-29`** unchanged | `if (!("updates" in gu)) return;` at `:22-24`; handed to `createGameRunner` at `:44-48` |
| `WorkerMessages.ts:55-58` | **`:55-58`** unchanged | `gameUpdate: GameUpdateViewData`; `WorkerMessageType` `:11-26`; `WorkerMessage` union `:127-134` |
| `WorkerClient.ts:44-51` | **`:49-53`** (`handleWorkerMessage` `:45-64`) — brief's range was loose, content identical | `default` branch `:55-62` only dispatches when `message.id` matches a handler |
| `WorkerClient.ts:36-43` error listener | **`:37-42`** | body fully inside `if (this.initReject)` |
| `ClientGameRunner.ts:517` guard / `:518` modal / `:525` stop | **`:526` / `:527-532` / `:534`** (+9) | `77fbc98` (0211) added +50 lines to this file after `c910452` — `src/core/` untouched since `c910452` (`git diff --stat` = only `ClientGameRunner.ts`) |
| `ClientGameRunner.ts:779-794` `stop()`, `:793` `onGameEnd()` | **`:829-844`, `:843`** | `isActive` guard `:831`, `worker.cleanup()` `:835`, `transport.leaveGame()` `:836`, `clearInterval` `:837-840` |
| `Main.ts:786-799` seam | **`:786-799`** unchanged | generation guard `:793-795`; `monitorGeneration` claimed `:769` |

New facts found on the read that the brief does not carry:
- **F1 — the runner latches after one fault.** `GameRunner.ts:161` sets `isExecuting = true`; the catch `return`s at `:183` without resetting it (reset only on the success path, `:216`). Every later heartbeat early-returns at `:155-157`. Code-read prediction for step 1: the *simulation halts permanently* after one fault, "Game tick error:" logs **exactly once**, no recovery on the next heartbeat. Still not observed — step 1 confirms.
- **F2 — the worker's message listener is `async`** (`Worker.worker.ts:35`), so every `throw error` in its `case` handlers (`:58,:72,:94,:111,:130,:151`) becomes an `unhandledrejection` *inside the worker* (`:183-185` logs it), which by spec never propagates to the parent `Worker`'s `error` event. That is a **third** dark path, separate from the post-init `error`-event question the brief asks about.
- **F3 — `PerformanceMonitor` samples every 300 s** (`PerformanceMonitor.ts:6`). Verification criterion 3 ("no `Performance:*` events after the modal") needs either a >5 min wait or a temporary local reduction of `SAMPLE_INTERVAL_MS` (uncommitted, same rule as the temp throw). Events print to console in non-prod (`FlashistFacade.ts:199-207`).
- **F4 — the crash modal is non-closable by default** (`showErrorModal` `:1169-1176`: `closable = false`, `showDiscord = true`); the branch at `:527-532` passes neither. It is `position: fixed`, centered, `z-index: 9999` (`styles.css:459-467`), not a full-screen overlay. Whether the player can still reach "leave" behind it is a step-5 observation.
- **F5 — `Main.gameStop` stays set after a crash** (0227's deliberate choice, `Main.ts:796-797`), so a later leave calls `transport.leaveGame()` a second time. `Transport.leaveGame()` `:459-473` is socket-null/state guarded — should be harmless; observe in step 5.

### 1. Reproduce first — real browser, before any fix (brief step 1; nothing may be asserted until this runs)

Environment: `npm run dev` (client :9000 + dev server; port 3001 must be free — see memory note on Remotion). Browser driven via the Playwright MCP or claude-in-chrome for console/DOM reads; owner can watch too.

Temporary instrumentation (all marked `TEMP-0232`, grep-cleaned before finishing, never committed):
- **T-a, the tick fault:** in `src/core/execution/WinCheckExecution.ts` `tick()` (registered for every game at `GameRunner.ts:147`): `if (mg.ticks() === 300) throw new Error("TEMP-0232 forced tick fault");` — deterministic, ~20 s after start at 66.7 ms/tick, game visibly running first.
- **T-b, post-init worker `error` event:** in `Worker.worker.ts` `case "heartbeat"`, once: `setTimeout(() => { throw new Error("TEMP-0232 uncaught"); }, 0)` — a genuinely uncaught sync throw → worker `error` event → parent `Worker` `error` event.
- **T-c, async handler throw:** a throw inside `case "turn"` → exercises F2.
- **T-d, monitor cadence:** `SAMPLE_INTERVAL_MS = 3_000` in `PerformanceMonitor.ts:6`.

Record, OBSERVED separately from REASONED, for a **singleplayer** game (and one multiplayer dev-lobby game if 3001 is free):
1. Modal? (`document.querySelector("#error-modal")`) Console lines (worker "Game tick error:" — once or repeating? that settles F1)? Page responsive?
2. Does the map/timer keep advancing, freeze, recover, or diverge after tick 300?
3. What keeps running: rAF heartbeat, WebSocket/LocalServer, the 1 s connection check, `Performance:*` events (T-d), the worker thread (DevTools → Sources → threads).
4. T-b: does the main thread do anything at all post-init (prediction: `WorkerClient.ts:37-42` no-ops; nothing shown)? T-c: same (prediction: worker-only log).
Outcome is written into the task worklog as the step-1 observation. No frequency/severity figure anywhere.

### 2. Code changes — `src/core/` only, ~25 lines across 4 files; **zero `src/client/` edits**

**D1 — the error gets its own message type, `game_error`** (not a widening of `game_update`). Reasons: `game_update` is the hot per-tick payload and its type stays narrow; the error can't be mistaken for a view update by any future consumer; it is greppable on the wire; and `WorkerClient`'s `default` branch (`:55-62`) drops id-less unknown types silently, so an explicit `case` is required anyway. Cost is ~10 lines vs ~2 — accepted for the explicitness.

**(a) `src/core/worker/WorkerMessages.ts`**
- `:8` — import `ErrorUpdate` alongside `GameUpdateViewData`.
- `:16` — add `| "game_error"` to `WorkerMessageType` after `"game_update"`.
- after `:58` — new interface:
  ```ts
  // Worker → main thread: a game tick threw (task 0232). Its own type, not a
  // widening of game_update, so the per-tick payload stays narrow.
  export interface GameErrorMessage extends BaseWorkerMessage {
    type: "game_error";
    error: ErrorUpdate;
  }
  ```
- `:127-134` — add `| GameErrorMessage` to the `WorkerMessage` union.

**(b) `src/core/worker/Worker.worker.ts:20-29`** — replace the drop:
```ts
function gameUpdate(gu: GameUpdateViewData | ErrorUpdate) {
  if ("updates" in gu) {
    sendMessage({ type: "game_update", gameUpdate: gu });
    return;
  }
  // Task 0232: a tick fault used to be dropped here, so the main thread's
  // crash branch in ClientGameRunner could never run.
  sendMessage({ type: "game_error", error: gu });
}
```
(`ErrorUpdate` is two strings — structured-clone safe.)

**(c) `src/core/worker/WorkerClient.ts:49-53`** — add before `case "initialized":`:
```ts
case "game_error":
  if (this.gameUpdateCallback) {
    this.gameUpdateCallback(message.error);
  }
  break;
```
Same guard shape as `game_update`; `cleanup()` (`:271-275`) nulls the callback and `terminate()` drops anything queued.

**(d) `src/core/GameRunner.ts:172-183` — D2, the non-`Error` throw is reported too:**
```ts
} catch (error: unknown) {
  console.error("Game tick error:", error);
  // Task 0232: report non-Error throws too — returning silently leaves the
  // runner latched (isExecuting stays true) with no surface at all.
  this.callBack({
    errMsg: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });
  // isExecuting is deliberately left true: a faulted simulation must not
  // keep advancing; the main thread tears the worker down on this update.
  return;
}
```
Decision D2 written down: yes, report it — a `throw "x"` is the same silent freeze (F1 latch) with even less trace. Decision **D3** written down: keep the `isExecuting` latch — with the fix, the main thread calls `stop()` → `worker.cleanup()` → `terminate()` on that very message, so the latch only matters for the window between fault and teardown, where halting is the safe behaviour.

**(e) OPTIONAL, owner's call — D4, post-init worker `error` event (`WorkerClient.ts:37-42`).** If step 1 confirms it is dark, add after the `initReject` block:
```ts
// Task 0232: after init, an uncaught worker exception used to vanish here.
this.gameUpdateCallback?.({ errMsg: `Worker crashed: ${event.message}` });
```
~3 lines, same seam, same crash branch. Recommend **in**, because the brief says a fix that leaves it dark is incomplete. F2 (async-handler throws → worker-internal `unhandledrejection`) is **out of scope** regardless — it needs a worker-side bridge and is a follow-up brief candidate.

`ClientGameRunner.ts` needs **no change**: `start()`'s callback type (`:522`) and `WorkerClient.start()` (`:98`) already accept `ErrorUpdate`; the branch at `:526-535` becomes live as-is.

### 3. Tests (`src/core/` rule applies in full; all new files under `tests/core/`)

- **T1 `tests/core/GameRunner.test.ts`** — `new GameRunner(fakeGame, fakeExecutor, [], cb)` with `fakeExecutor.createExecs = () => []`, `fakeGame.addExecution` no-op, `fakeGame.executeNextTick` scripted; `addTurn({turnNumber: 0, intents: []})`.
  (a) throws `Error("boom")` → `cb` once with `{errMsg: "boom", stack: containing "boom"}`.
  (b) throws the string `"bad"` → `cb` once with `{errMsg: "bad", stack: undefined}` — **fails on old code**.
  (c) after a fault, a second queued turn + `executeNextTick()` neither calls `game.executeNextTick` nor `cb` — documents D3.
  (d) control: a normal tick (`ticks() = 5`, `inSpawnPhase() = false`, updates with `[GameUpdateType.Tile]: []`) delivers a `GameUpdateViewData` with `tick: 5`.
- **T2 `tests/core/worker/WorkerClient.test.ts`** — stub `globalThis.Worker` with a class that records listeners and `postMessage`; construct `WorkerClient`, complete `initialize()` by replying `initialized` with the posted `init` id; `start(cb)`; dispatch `{type: "game_error", error: {errMsg: "boom", stack: "s"}}` → `cb` receives it — **fails on old code** (unknown type falls to `default`, no `id`, dropped); dispatch a `game_update` → still delivered (regression guard). If D4 is in: post-init `error` event → `cb` gets `{errMsg: "Worker crashed: x"}`; pre-init `error` event → `initialize()` rejects (unchanged behaviour). Feasibility checked: `@swc/core` rewrites `import.meta.url` (`WorkerClient.ts:27`) to `pathToFileURL(__filename)` under CJS — verified by a programmatic probe today, so the module imports under jest.
- **T3 `tests/core/worker/WorkerWorker.test.ts`** — the "would have caught the drop" test on the real worker file: `jest.mock` `../GameRunner` so `createGameRunner` captures the callback and resolves a stub; set `globalThis.self = {postMessage: jest.fn(), addEventListener: capture}` **before** `await import(".../Worker.worker")`; dispatch `init`; invoke the captured callback with an `ErrorUpdate` → `self.postMessage` called with `{type: "game_error", error: …}` — **old code: never called**; invoke with view data → `game_update`. Module-level hazards read and judged benign (`self as any` `:16`, `new FetchGameMapLoader` `:18` — constructor only stores fields). **Fallback if the module still refuses to load under jest:** extract the mapping into an exported pure `toWorkerMessage(gu)` in `WorkerMessages.ts`, call it from the worker, test that, and say so loudly.
- **T4 `stop()` → `onGameEnd()`: no jest test — browser-verified only, and here is why.** `ClientGameRunner.ts` imports `./Main` (`:61`), `GameRenderer` (`:73`), `SoundManager` (`:74`); 0227 recorded the same blocker (`worklog.md:226`) and verified in-browser. Even a `ClientGameRunner.prototype.stop.call(stub)` needs the module imported. Step 4 below is the proof.
- Also: `npm test` (expect ~22–25 s, 116+ suites), `npm run lint`, `npx tsc --noEmit`.

### 4. Browser verification after the fix (T-a and T-d re-applied temporarily)

1. Forced fault → modal shows `Game crashed!` / `Error: TEMP-0232 forced tick fault` / stack; console: worker "Game tick error:" once, main-thread `console.error(stack)`.
2. `stop()` ran: worker thread gone from DevTools, leave logged (`LocalServer.endGame` / "on stop: leaving game"), no further heartbeats.
3. **`onGameEnd()` fired and the monitor stopped**: with T-d, `Performance:FPS*` lines every 3 s before the crash, **none after** (watch ≥30 s). Tested on a **first, current join — no interleaved rejoin** — recorded explicitly because of the generation guard (`Main.ts:793-795`). If the seam does not fire → reported as a finding against 0227 as landed; 0227's folder untouched.
4. Player can exit (F4): can "leave" be reached behind the modal, does `handleLeaveLobby` (`Main.ts:949-960`) run cleanly, second `leaveGame()` harmless (F5). Then a fresh join plays normally.
5. Crash **before** the 20 s `setTimeout` (`ClientGameRunner.ts:501-506`, handle never stored — 0231's fact): observe whether `connectionCheckInterval` starts after `stop()` and what `onConnectionCheck` does then. **Observe and report to 0231; do not fix here** (its file, its scope).
6. D4/F2 observations post-fix (T-b, T-c).
7. Temp code removed (`grep -rn TEMP-0232 src tests` empty); normal singleplayer game join→play→leave, and a multiplayer dev-lobby game, with **no** error modal — this change sits on the every-tick path.
8. `git diff --stat` shows only: 4 `src/core/` files + 3 new test files + the task folder's `plan.md`/`worklog.md`/`review.md` (the loop's artifacts). The 0219/0241 working-tree files stay untouched.

### 5. Edge cases considered
- Catch-up batches (`CATCHUP_BATCH_SIZE` heartbeats) after a fault: latch makes every later heartbeat a no-op → exactly one `game_error`.
- Existing `#error-modal` (desync/connection) dedups the crash modal (`:1179-1181`) — `stop()` still runs; modal text would be the earlier one. Recorded, not changed.
- Multiplayer: the crashed client leaves; others carry on; its hashes stop — same as today's freeze, now explicit.
- Only `WorkerClient` consumes `WorkerMessage`; no other exhaustive switch to update.

### 6. 0231 / 0233 collision check
No `src/client/` edit → no textual collision with either. Design choice that touches their *premise*: this task makes `stop()` reachable on the crash path (0231's brief already records this), and D4 would add a second reachable route — both widen 0231's "stop runs on N paths" reasoning without touching its files. Nothing here pre-empts 0233's modal-site work. The non-closable/Discord-worded crash modal is a product question, flagged, not changed.

## Open questions (returned by the coder; answered by the owner — see the approval record at the top)

1. **D4 scope** — include the ~3-line post-init worker `error` forwarding in `WorkerClient.ts:37-42` (recommended, in), or file it as a follow-up with F2? Both stay reported either way. → **Owner ruled: include.**
2. **D1/D2/D3 confirmation** — separate `game_error` message type; non-`Error` throws reported; `isExecuting` latch kept. Stated with reasons above; say if any should go the other way. → **Owner confirmed all three.**
3. **Crash modal UX** (F4) — it is non-closable and asks the player to paste into Discord (`en.json:790`, `ru.json:814`), on a Yandex Games audience. Out of this task's scope; does the owner want a brief filed? → **Owner: no brief; flag in worklog only.**
4. **Multiplayer coverage of step 8** — plan runs one dev-lobby game in addition to singleplayer; acceptable, or singleplayer-only? → **Not separately ruled; run as planned, record what was actually run.**
5. **F2 follow-up** — async message-handler throws in the worker (`Worker.worker.ts:58,:72,:94,:111,:130,:151`) stay dark after this task; file a brief? → **Owner ruled: yes, producer files at close.**
