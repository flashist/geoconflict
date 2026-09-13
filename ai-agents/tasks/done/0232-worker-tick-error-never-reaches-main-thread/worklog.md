# Worklog — 0232 worker tick error never reaches the main thread

Build worker: `fkit-coder`, spawned by `/fkit-sprint-ship-loop` under the declared-approval marker
(plan approved by the owner via `AskUserQuestion` in the lead session, 2026-09-13). Plan executed
as written in `plan.md` (blob `3f8809f0…`, verified before starting). No commits, no wiki writes,
no task-file moves. The uncommitted 0219/0241 working-tree files were not touched.

Environment for every browser step: `dev` at `fd2c88e` + working tree; dev game server
(`GAME_ENV=dev … src/server/Server.ts`) and `webpack serve --node-env development` run as two
background processes — the same two processes `npm run dev` runs, minus `--open`. Ports 3000/3001/
3002/9000 were free before start; the master reached quorum 2/2. Browser: the Playwright MCP
(Chromium, 1200×629 viewport). Singleplayer games: Custom Game, map Faroe Islands, defaults.
Multiplayer games: the dev public lobby ("Join next Game"), which starts ~5 s after joining
(`DevConfig.gameCreationRate` = 5 s) with AI fill. Turn interval 66.7 ms.

Every timing below is `performance.now()` of the page in question, rounded. **No frequency or
severity figures anywhere in this log — none were measured.**

## Step 1 — reproduction on the OLD code (before any `src/core/` change)

Temporary instrumentation, all tagged `TEMP-0232` and removed at the end (`grep -rn TEMP-0232 src
tests` is empty; `WinCheckExecution.ts` and `PerformanceMonitor.ts` are byte-identical to HEAD):

| Tag | What | Where |
|---|---|---|
| T-a | `throw new Error("TEMP-0232 forced tick fault")` when `ticks === 300` (singleplayer run), later `=== 400` (both modes) | `WinCheckExecution.tick()` |
| T-b | on the 150th heartbeat, `setTimeout(() => { throw … }, 0)` — a genuinely uncaught worker throw | `Worker.worker.ts` `case "heartbeat"` |
| T-c | `throw` after `addTurn` when `turnNumber === 150` — an async message-handler throw | `Worker.worker.ts` `case "turn"` |
| T-d | `SAMPLE_INTERVAL_MS = 3_000` | `PerformanceMonitor.ts` |

T-a moved from 300 to 400 because multiplayer's spawn phase is 300 turns and `WinCheckExecution`
is inactive during spawn (`activeDuringSpawnPhase()` is `false`), so a tick-300 fault would never
fire there. In-page probes patched `Worker.prototype.postMessage/terminate/addEventListener` to
count heartbeats/turns/`game_update`s and catch the parent-side `error` event, and a
`MutationObserver` timestamped `#error-modal`.

### 1.1 Singleplayer, T-a at tick 300 + T-d — OBSERVED

- Console: `Game tick error: TEMP-0232 forced tick fault` **exactly once** (worker). No other
  error line. No `#error-modal` at any point (checked repeatedly over ~100 s after the fault).
- `game_update`s stop at the fault. HUD text (troops/gold line) identical across samples 3 s apart:
  the map/timer **froze**; no recovery, no divergence, no second "Game tick error".
- What kept running after the fault: heartbeats to the worker at ~60/s (181 in a 3 s window,
  last one 4 ms before sampling); the game worker thread (still listed by `page.workers()`,
  `terminate()` never called); `Performance:FPS:*` / `Performance:FPSAverage` /
  `Performance:Memory:*` every 3 s, without interruption, right up to the page leaving (~40
  samples after the fault).
- Turns from `LocalServer` **stopped** (113 → 113 over 3 s).
- Leave: the sidebar exit button is a full page navigation (`changeHref(rootPathname)`,
  `GameRightSidebar.ts:118-137`); the leave ran in the `unload` handler ("Browser is closing" →
  `Game:End`, `Match:Duration 111`, `Game:Abandon`, "leaving game", "local server ending game").
  Page was responsive throughout.

### 1.1 — REASONED (from code, consistent with the above)

- **F1 confirmed**: `isExecuting` stays `true` after the `catch` returns (`GameRunner.ts:183`), so
  every later heartbeat early-returns; exactly one log line, permanent halt.
- Turns stopped because `LocalServer.start()`'s interval only issues the next turn when
  `turnsExecuted === turns.length`, and `turnsExecuted` only advances via `turnComplete()` from the
  main thread's `game_update` callback — which never ran.
- The heartbeat is the rAF loop in `ClientGameRunner` (`:668`), gated on `isActive`, which
  nothing reset.

### 1.2 Singleplayer, T-b + T-c + T-a(300) — OBSERVED

- T-b: the parent `Worker` fired an `error` event (`Uncaught Error: TEMP-0232 uncaught`), and
  `window` got a global `error` event with the same message. `WorkerClient`'s listener did
  nothing (init long done): **no modal, no stop, game carried on** — the game ran to the T-a fault
  afterwards (300 `game_update`s, then T-a as in 1.1). Worker-side console: `Worker error:
  ErrorEvent`.
- T-c: worker console `Failed to process turn: Error: TEMP-0232 async handler throw` then
  `Unhandled promise rejection in worker: PromiseRejectionEvent`. **Nothing** on the main thread
  (no `error` event on the `Worker`, no window error, no modal); the game carried on (turns 301,
  updates 300). This is the F2 dark path, observed.
- One unrelated `terminate()` call was seen at game start on a *different* `Worker` (a `blob:`
  worker also listed by `page.workers()`); the game worker stayed alive.

### 1.3 Multiplayer dev lobby, T-a at 400 + T-b + T-c — OBSERVED

- Same shape: 400 `game_update`s (last `tick` 400), then none (0 in a 2 s window); the server
  kept sending turns (872 posted to the worker vs 400 executed); heartbeats ~60/s continued;
  no modal; game worker alive; HUD frozen. T-b/T-c exactly as in 1.2. Server log for that game
  shows only the later "client disconnected" from the page reload.

Step-1 verdict: the brief's claim is reproduced in both modes. Three dark paths: the dropped
`ErrorUpdate` (the task), the post-init `Worker` `error` event (D4), and async handler throws
(F2, out of scope).

## Change surface (D1–D4, all `src/core/`; zero `src/client/` edits)

| File | Change |
|---|---|
| `src/core/worker/WorkerMessages.ts` | import `ErrorUpdate`; `"game_error"` added to `WorkerMessageType`; new `GameErrorMessage { type: "game_error"; error: ErrorUpdate }`; added to the `WorkerMessage` union (D1) |
| `src/core/worker/Worker.worker.ts` | `gameUpdate()` sends `{ type: "game_update", gameUpdate }` for view data and `{ type: "game_error", error }` for an `ErrorUpdate` instead of dropping it |
| `src/core/worker/WorkerClient.ts` | new `case "game_error"` → `gameUpdateCallback(message.error)`; the constructor's `error` listener now also does `this.gameUpdateCallback?.({ errMsg: \`Worker crashed: ${event.message}\` })` after the `initReject` block (D4, owner-ruled in) |
| `src/core/GameRunner.ts` | catch block reports non-`Error` throws too (`errMsg: String(error)`, `stack: undefined`) and logs the raw error (D2); `isExecuting` latch kept, with a comment (D3) |

New tests (all under `tests/core/`): `GameRunner.test.ts`, `worker/WorkerClient.test.ts`,
`worker/WorkerWorker.test.ts`. `ClientGameRunner.ts` needed no change; its `"errMsg" in gu`
branch (`:526-535`) is now reachable.

`git diff --stat` = the 4 `src/core/` files + 3 untracked test files + this task folder. The
0219/0241 files show in the same working tree and were not touched. `.playwright-mcp/` (Playwright's
log dir, 3.6 MB) sits in the repo root and is gitignored (`.gitignore:18`).

## Verification — tests

- The three new suites: **12/12 pass** on the new code.
- **Old-code proof**: with only my `src/core` changes stashed, the same suites give **4 failed / 8
  passed**, exactly the four the plan predicted — T1 "non-Error throw is reported", T2
  "game_error reaches the callback", T2 "post-init worker error event reaches the callback", T3
  "ErrorUpdate leaves the worker as game_error". The other eight (Error-throw report, latch, control
  tick, `game_update` delivery, pre-init reject, cleanup, init handshake, `game_update` bridge) pass
  on both, as regression guards. Stash popped; diff verified restored.
- T3 loads the real `Worker.worker.ts` under jest via a stubbed `globalThis.self` and a
  `jest.mock`ed `createGameRunner` — the plan's fallback (extracting a pure mapper) was **not**
  needed. T2 imports the real `WorkerClient` (swc rewrites `import.meta.url`); it uses fake timers
  so `initialize()`'s 5 s timeout never runs on the real clock.
- T4 (`stop()` → `onGameEnd()`) has **no jest test**, as planned — `ClientGameRunner.ts` imports
  `Main`/`GameRenderer`/`SoundManager`; browser-verified below.
- `npm test`: **119 suites / 1245 tests, all passed**, none skipped (Docker was up, so the
  secret-boundary harness ran). `npm run lint`: 0 problems. `npx tsc --noEmit`: clean.
- Prettier: clean on all seven files I touched. `GameRunner.ts` was already prettier-dirty at HEAD
  (lines 75–97, 129, 141–144 — nation-difficulty and constructor lines); I did **not** reformat
  them, and my hunk (`:172-183`) is clean.
- Intermediate note, so nobody re-chases it: while the TEMP throw was still in
  `WinCheckExecution.ts`, `npm test` showed `WinCheckDeterminism` and `WinCheckExecution` failing
  (4 tests) — every failure named `TEMP-0232 forced tick fault`; they pass on the clean tree.

## Verification — browser, after the fix (T-a, T-c, T-d re-applied; T-b in for 4.6 only)

### 4.1 Forced tick fault → modal (singleplayer, T-a at 400)

`game_error` received at 65874.9 → `#error-modal` at 65876. Modal text: "Please paste the
following in your bug report in Discord: Game crashed! game id: … client id: … Error: TEMP-0232
forced tick fault Message: Error: TEMP-0232 forced tick fault at WinCheckExecution.tick (…)".
`position: fixed`, `z-index 9999`. Console: worker `Game tick error: Error: TEMP-0232 forced tick
fault` once; main-thread `console.error(stack)` once.

### 4.2 `stop()` ran

`terminate()` on the game worker at 65875.7; the game worker no longer listed by `page.workers()`
(only the unrelated `blob:` worker remains); "local server ending game" at 65876; heartbeats:
last at 65874, **0 in the following 2 s**.

### 4.3 `onGameEnd()` fired, monitor stopped — first join, no rejoin

`Performance:FPSAverage` at 40586, 43585, …, 64585 (every 3 s, T-d) and **none** between the
crash (65876) and the sample at 104569 (~39 s). This was the page's first and only join, so the
generation guard (`Main.ts:793-795`) was not in play. The 0227 seam fires. (Multiplayer run in 4.5
agrees: samples at 8510/11506/14507, none after the crash at 15629.)

### 4.4 Exiting behind the modal (F4/F5)

In this 1200×629 viewport the exit button (20×20 at 1140,28) lies outside the modal's box
(77,89 → 1114×541); `elementFromPoint` at its centre hit the exit `<img>`. Clicking it navigated
to `/`, modal gone, menu shown. The leave ran at `unload`: `Game:End`, `Match:Duration 125`,
`Game:Abandon`, "leaving game", "local server ending game" — i.e. **`transport.leaveGame()` did run
a second time** (F5): `Main.gameStop` is the closure returned by `joinLobby`
(`ClientGameRunner.ts:254-257`), which calls `transport.leaveGame()` directly, not `stop()`. In
singleplayer the second `LocalServer.endGame()` is a `clearInterval` on an already-cleared interval
— harmless. In multiplayer, `stop()` already killed the socket, so the second call takes the
socket-null/state-guarded branches (`Transport.ts:459-473`); not separately exercised. A fresh
join after the crash played normally (4.7).

Reasoned, not observed: whether the modal covers the exit button depends on viewport size.

### 4.5 Crash before the 20 s connection-check arm — OBSERVED, multiplayer → **handoff to 0231**

Temp throw in `GameRunner.executeNextTick` at tick 150 (WinCheck can't fire in multiplayer's
spawn phase). Game started at 5882; fault at 15629 (~9.7 s in); modal 15631; worker terminated
15630; "on stop: leaving game" 15630 (socket killed). Then at **26658** (= start + 20 s + ~1 s of
interval) `onConnectionCheck` logged "No message from server for 11037 ms, reconnecting", opened a
**new WebSocket** (constructor-hooked: 295, 5835, **26658**), and the console showed "Connected to
game server!" ×2 and "starting game!" again. From then on the server fed the client turns
(1063 posted by t≈77 s) into a **terminated** worker (`postMessage` on a terminated worker is a
silent no-op); heartbeats stayed at 0; the crashed client sat in the match as a connected, non-
simulating ghost until the page was left. Only one reconnect line appeared, because after the
rejoin `lastMessageTime` is refreshed by incoming messages. Not fixed here — `ClientGameRunner.ts`
is 0231's file.

### 4.6 D4 and F2 after the fix

- D4 (T-b, singleplayer): parent `error` event at 3158 → modal at 3159 with "Error: Worker
  crashed: Uncaught Error: TEMP-0232 uncaught / Message: missing"; worker terminated at 3158 and
  gone; "local server ending game"; heartbeats stopped at exactly 150. **Now surfaced.**
- F2 (T-c, both modes): still `Failed to process turn` + `Unhandled promise rejection in worker`,
  worker-side only; no modal; game continues. **Still dark, as expected — see the producer note.**

### 4.7 Clean games with all TEMP code removed

`grep -rn TEMP-0232 src tests` empty. Singleplayer: 568 `game_update`s, 0 `game_error`, 0 tick
errors, no modal, exit → menu. Multiplayer dev lobby: 662 `game_update`s, 0 `game_error`, 0 tick
errors, no modal, game worker present, exit → menu.

### 4.8 Change surface — see above; matches the plan.

## Decision log (ADR-019 audit; ADR-032 A4)

Fixes applied without asking that were **outside** the approved plan: **none**. Obvious-winner
calls **within** the plan's intent, so they are findable:

1. T-a fault tick moved 300 → 400 (instrumentation only) so the same probe works in multiplayer.
2. A second temporary throw placed in `GameRunner.executeNextTick` (tick 150) for step 4.5,
   because `WinCheckExecution` cannot fault inside multiplayer's spawn phase. Removed.
3. D4 applied exactly as the plan's snippet (a `return;` I had first added inside the
   `initReject` branch was reverted to match the plan; behaviour is identical either way since
   `start()` cannot have run before `initialize()` resolved).
4. `GameRunner.ts`'s pre-existing prettier drift left alone (minimal diff); my hunk is clean.
5. Dev server run as its two constituent processes without `--open` (same as `npm run dev`
   otherwise).

### Review round 1 (2026-09-13) — fixes applied without asking, under the sprint loop's standing approval (ADR-032 Process-review worker; ADR-019 discipline)

Outside the approved plan: **none**. Obvious-winner calls: **none**. Applied without asking (each
verified `CORRECT` + mechanical/localized + inside the plan's D2 territory "report every throwable"):

6. **R1** — `GameRunner.ts`: the non-`Error` `errMsg` coercion now goes through a new
   `private static describeThrow()` (`try { String(error) } catch { "non-coercible throw" }`).
   Why it qualified: verified at runtime that `String(Object.create(null))` throws while
   `console.error` on it does not, so a null-prototype/throwing-`toString()` throwable escaped the
   `catch` and re-opened the silent freeze D2 promised to close; ~9 lines, one method, no
   behaviour change for any `Error` or coercible throw. Test added to `tests/core/GameRunner.test.ts`
   (`throw Object.create(null)` → callback gets `{ errMsg: "non-coercible throw", stack: undefined }`,
   and `executeNextTick()` itself does not throw); it fails on the pre-fix code.
7. **R2** — `WorkerClient.ts` `case "game_error"`: guard extended with `&& message.error`, the
   exact shape of the `game_update` sibling. Why it qualified: one-token consistency guard;
   unreachable today (`Worker.worker.ts:27` always attaches `error`), so no test added.
8. A `prettier --write` on `GameRunner.ts` during verification reformatted the file's
   **pre-existing** drift (lines 75–97, 129, 141–144); I restored the file from HEAD and re-applied
   only the 0232 hunks so decision 4 (minimal diff) still holds — final `git diff --stat` for that
   file: 22 insertions / 9 deletions, all in the 0232 hunks. The hunks are prettier-clean; the file
   as a whole still is not, exactly as at HEAD.

Re-verification after the round: `npm test -- tests/core` 29 / 239 green; full `npm test`
**119 suites / 1246 tests** green (1245 → 1246, the R1 case), none skipped; `npm run lint` 0
problems; `npx tsc --noEmit` clean; prettier clean on `WorkerClient.ts` and `GameRunner.test.ts`.
`review.md` Status → `closed-out`.

## Residuals

- **F2** — async message-handler throws in the worker (`Worker.worker.ts` `case` handlers) stay
  dark; observed both before and after. Follow-up brief: owner ruled the producer files it at close.
- **0231 handoff** (4.5 above) — a crash before the 20 s arm lets `onConnectionCheck` reconnect and
  rejoin a torn-down game; the interval is never cleared because `stop()` already ran.
- **F5** — the second `transport.leaveGame()` on leave-after-crash is real (observed in
  singleplayer, harmless there); multiplayer branch reasoned only.
- Existing `#error-modal` dedup (`showErrorModal` `:1179-1181`): a prior desync/connection modal
  would keep its own text; `stop()` still runs. Not exercised.
- `Game:Abandon` analytics fires when the player exits a *crashed* game (observed in 4.4) — a
  crash is counted like a voluntary abandon. Not in scope; noted for whoever owns analytics.
- No worker-side change for catch-up batches beyond the latch; exactly one `game_error` was seen
  per fault in every run.

## F4 flag (owner ruled: worklog only, no brief)

The crash modal is non-closable (`closable = false`), asks the player to paste the report into
Discord (`en.json:790`, `ru.json:814`), and is a centred fixed box, not a full-screen overlay. On
this viewport the exit button stayed reachable; on a small viewport it may not be. Yandex Games
audience; product call, not made here.

## Observation to hand to 0231 (step 4.5)

> With 0232 landed, `stop()` is reachable on the crash path (tick fault) and on the post-init
> worker-error path. If the crash happens **before** the 20 s `setTimeout` in `start()`
> (`ClientGameRunner.ts:501-506`, handle never stored) fires, `connectionCheckInterval` is created
> **after** `stop()` cleared nothing, `onConnectionCheck` sees `> 5000 ms` of silence, calls
> `transport.reconnect()`, and the client **re-joins the match** ("Connected to game server!",
> "starting game!") with a terminated worker — turns are posted into the void, no hashes are sent,
> and the interval lives until navigation. Observed in a dev-lobby multiplayer game (fault at ~9.7 s,
> reconnect at ~20.8 s, new WebSocket confirmed by constructor hook). Singleplayer is unaffected
> (`onConnectionCheck` returns on `transport.isLocal`).

## F2 follow-up note for the producer

Async throws inside the worker's `message` handler (`Worker.worker.ts` — `case "init"`, `"turn"`,
`"player_actions"`, `"player_profile"`, `"player_border_tiles"`, `"attack_average_position"`) become
`unhandledrejection` events **inside the worker** and never reach the parent `Worker`'s `error`
event (per spec). Observed before and after this task: worker console shows `Failed to process
turn` + `Unhandled promise rejection in worker`, the main thread sees nothing, the game continues.
A fix needs a worker-side bridge (e.g. the worker's `unhandledrejection` listener posting a
`game_error`), which is a separate design call — `"turn"` failures in particular may be
recoverable, so "crash the game" is not obviously the right response there.
