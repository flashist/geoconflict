# Client Game Teardown — Who Stops What When a Game Ends

**Layer**: client
**Key files**: `src/client/Main.ts`, `src/client/ClientGameRunner.ts`, `src/client/PerformanceMonitor.ts`, `src/core/worker/Worker.worker.ts`, `src/core/worker/WorkerClient.ts`, `src/core/GameRunner.ts`

## Summary

A client match owns three long-lived things: the **`ClientGameRunner`** (plus its Web Worker, a 1-second reconnect interval and five `EventBus` listeners), the **`PerformanceMonitor`** (a `setInterval`, a `requestAnimationFrame` loop and a `visibilitychange` listener), and **`Main.gameStop`**. **Ending a game does not reliably stop any of them**, and which ones survive depends on *how* the game ended.

This page exists because the audit that found these holes ran across seven tasks in three days (2026-09-07) and the findings are easy to confuse with each other. **The single most misread thing in this area is the difference between "bounded" and "accumulating."** They are not the same defect class and they were ranked differently on purpose.

⛔ **Everything on this page is repository state as of `HEAD` = `c910452`, 2026-09-07. NOTHING IS DEPLOYED.** The owner deploys at the next weekend slot. 📌 *2026-10-10 lint: true when written. `0225`/`0227` ship from `0.0.142`; `0231`/`0232`/`0233` from `0.0.152` (2026-09-26); `0228` is still not deployed.*

> 🆕 **2026-10-10 sync — `0228` REPRODUCED AND FIXED** ([[tasks/join-lobby-race-fix]]), closed
> `(agent-closed — not owner-verified)`. Phase 1 reproduced the race **9/9 with real clicks** on a slowed network after
> >5 min on the start screen (public leave dropped; double-tap Join lists the joiner twice; Escape during a join leaves
> the joiner listed). The fix is a new `src/client/LobbyJoinSequence.ts` (latest join wins, a leave cancels a join still
> being set up); `Main.gameStop` is now a read-only getter over it. **`0227`'s generation mint and `onGameEnd` guard are
> kept intact.** It closes the `Main`-level window only. Committed `bcc9bf0`; **no tag contains it — not deployed**
> (2026-10-10); live check `0433` open. Side finding `0432`: a stopped `Transport` keeps its `EventBus` listeners.
> The `0228` rows below are kept as written (true when written).
>
> ~~⚠️ **Stale on this page, flagged — not re-ingested by this sync:** the site map and the class table below still mark
> **`0231`, `0232` and `0233` "open"**, but all three briefs sit in `ai-agents/tasks/done/` with status
> `✅ Done (agent-closed — not owner-verified)` (first committed under `done/` in `6822210` / `a953271`, 2026-09-13/14). Their outcomes are **not** recorded in the vault —
> no task page exists for any of them. This sync saw only link repoints in them, so it does not invent their results;
> a dedicated ingest of their briefs and worklogs is needed.~~ ✅ *Resolved by the 2026-10-10 lint — see the next block.*
>
> 📌 **2026-10-10 lint — `0231`, `0232` and `0233` are DONE; outcomes from their briefs + worklogs.** All three
> `✅ Done (agent-closed — not owner-verified)`, built 2026-09-13/14 by the Sprint 4 ship loop, code in `6822210`
> (`0231`, `0232`) and `a953271` (`0233`); ✔️ both commits are in every production-deploy tag from `0.0.152`
> (2026-09-26) on (`git tag --contains`). ⚠️ **Not owner-verified, and no production check of these fixes is recorded.**
> Still no task page for any of the three — the rows and sections below are kept as written and marked in place.
> - **`0232` — the tick crash now reaches the main thread.** New worker→main message `game_error`
>   (`WorkerMessages.ts`, `Worker.worker.ts`, `WorkerClient.ts`); non-`Error` throws are reported too
>   (`GameRunner.ts`); a post-init worker `error` event now also reaches the callback. ⇒ **site A is reachable**: the
>   crash modal shows, `stop()` runs, `onGameEnd()` fires. Before the fix, **observed** in a browser (single- and
>   multiplayer): one `Game tick error` line, the map froze, no modal, worker and `Performance:*` events kept running.
>   Left open: async throws inside the worker's message handlers stay silent → `0251` (Backlog).
> - **`0231` — `stop()` now runs on every exit route.** `joinLobby`'s closure calls `runner.stop()`; the 20 s
>   connection-check `setTimeout` handle is stored and cleared; `stop()` is a latch (`isStopped`), removes the five
>   `EventBus` listeners and is idempotent. **Measured first, in a browser** (dev): the shipped exit buttons are a
>   **full page navigation**, so the leak **cannot accumulate through them**; it accumulated only on in-page routes
>   (hash / Back / a synthetic `leave-lobby`) — +1 interval, +1 worker, +5 listeners per leave in singleplayer, and in
>   multiplayer the left runner reconnected and rejoined the match. The crash-before-20 s ghost rejoin (`0232` §4.5)
>   was also observed and is gone after the fix. Left open: the wider in-page per-game leak (canvas, rAF loop,
>   `Transport` listeners, lobby poll) → `0252` (Backlog); several runners on one transport (`0229`, Backlog).
> - **`0233` — kick and pre-runner lobby error now tear down.** Site 1 (mid-game server `error`, the tab kick) calls
>   `this.stop()` after the modal; site 3 (lobby `error` before a runner exists) runs `left = true;
>   transport.leaveGame(); onGameEnd();`. **Site 2 (desync) deliberately NOT changed** — owner ruling, and measured: the
>   game keeps running after a desync, so the monitor should keep running too. Before/after browser numbers: site 1
>   went from 66 `Performance:*` lines and 11 reconnect sockets in 60 s to 0 and 0. Left open: a kick leaves the
>   reconnect session in storage → `0256` (Backlog).
> - Both worklogs say plainly: **no frequency or severity figure was measured** — the "do not write a figure" rule
>   below still holds.

## Architecture

### The seam — added by task `0227`, and dormant at its headline site

Before `0227` there was **no callback from `ClientGameRunner` back to `Main` at all**. `joinLobby()` carried `onPrestart` and `onJoin` — **both pointing forward, into the game starting** — and returned the stopper `Main` keeps as `gameStop`. The wiring ran `Main → runner` only.

`0227` added **`onGameEnd: () => void`** to `joinLobby`'s parameter list, called **last and behind the `isActive` guard** inside `ClientGameRunner.stop()`, plus two extra call sites for paths where no runner is ever constructed. On `Main`'s side a **generation token** guards it: `joinGeneration` increments per join, `monitorGeneration` is claimed **beside the monitor start** rather than at mint time (because `handleJoinLobby` awaits between the two), and the teardown callback stops the monitor **only when the two match**. Without that, a superseded game's late teardown could stop the *current* game's monitor.

### 🚨 `Main.gameStop` is NOT the runner's stopper

This is the fact most likely to mislead a reader of `Main.ts`. `gameStop` is the closure `joinLobby()` returns, and its **entire body** is `console.log("leaving game"); transport.leaveGame();`. **It never calls `runner.stop()`.**

`stop()` is what actually tears down: `isActive = false`, `this.worker.cleanup()`, `this.transport.leaveGame()`, and `clearInterval(this.connectionCheckInterval)`. ⇒ **On a normal leave-lobby, none of that runs.** (Task `0231`.)

### The site map

| Path | Stops the monitor? | Stops the runner? | Status |
|---|---|---|---|
| `beforeunload` | ✅ | — (page is going) | fixed by `0225` |
| `SendWinnerEvent` — game won/ended | ✅ stops and nulls | ❌ | fixed by `0225` |
| `handleLeaveLobby()` | ✅ stops and nulls | ❌ **runner, worker, 1 s interval and 5 listeners all survive** | monitor fixed by `0225`; runner is **`0231`, ~~open~~** — 📌 *2026-10-10 lint: runner now stopped, `0231` done* |
| `onHashUpdate` (popstate / hashchange) | ✅ indirectly, via `handleLeaveLobby()` | ❌ | same as above |
| `handleJoinLobby()` — joining while a game runs | ✅ **fixed by `0225`** (was the accumulating leak) | ❌ | `gameStop` half is **`0228`, open** |
| worker `ErrorUpdate` → `stop()` (**site A**) | ⚠️ **seam wired, but UNREACHABLE** | ⚠️ same | **`0232`, ~~open~~** — 📌 *2026-10-10 lint: reachable since `0232` (done); `stop()` and `onGameEnd()` run* |
| worker-init failure → bare `return` (**site B**) | ✅ fixed by `0227` | n/a — no runner exists | done |
| `createClientGame` rejects, no `.catch` (**site C**) | ✅ fixed by `0227` | n/a — no runner exists | done |
| mid-game server `error` — the tab kick | ❌ | ❌ | **`0233`, ~~open~~** — 📌 *2026-10-10 lint: fixed by `0233` (`this.stop()` after the modal)* |
| desync modal | ❌ | ❌ | **`0233`, ~~open~~** — 📌 *2026-10-10 lint: deliberately left running (owner ruling; the game continues after a desync)* |
| lobby error, pre-runner | ❌ | ❌ | **`0233`, ~~open — and whether a monitor is even running here is UNSETTLED~~** — 📌 *2026-10-10 lint: fixed by `0233`; measured — a monitor IS live when the kick lands in the build window* |

> 🆕 **2026-09-30 — site B grew, and the start can now be stopped** (committed `9cb8ee4`, not yet released) 📌 *2026-10-08 lint: released since — game `0.0.156`, 2026-10-03 (✔️ `9cb8ee4` is an ancestor of tag `0.0.156`).*.
> `0348` ([[tasks/worker-start-failure-reporting]]): the worker-init failure path now calls `worker?.cleanup()`, so a
> failed start no longer leaves a worker running. `0035` ([[tasks/worker-reuses-page-map]]): `joinLobby` aborts on
> leave and on a lobby `error`, which stops a **still-starting** worker and silences the failure popup and telemetry
> for a join already left. Neither task touched the rows above for a runner that **did** start (`0231` etc.).

### Bounded vs accumulating — the distinction that drove every rank

| Task | What it covers | Class |
|---|---|---|
| `0225` (done) | the `PerformanceMonitor` on mid-game lobby join | **Accumulating** — one permanently unstoppable monitor per join; **observed, with a negative control** |
| `0227` (done) | the monitor on the three crash / init-failure paths | **Bounded** — at most one dead game's monitor, cleared by the next leave or join |
| `0228` (open) | `handleJoinLobby()`'s stale `gameStop` across three awaits | **Bounded** — ⚠️ and **reachability UNPROVEN**; "unreachable, closed" is a legitimate outcome |
| `0233` (~~open~~ done — 📌 *2026-10-10 lint*) | the tab-kick, desync and lobby-error modals | **Bounded** — cleared by a later leave or join |
| `0231` (~~open~~ done — 📌 *2026-10-10 lint; accumulation then MEASURED, in-page routes only*) | the **whole runner + worker + 1 s interval + 5 listeners**, on ~~the NORMAL leave path~~ **EVERY path** *(reframed 2026-09-08)* | **Accumulating — ⚠️ REASONED, NOT OBSERVED. The reframe widened the SCOPE, not the EVIDENCE** |

## Gotchas / Known Issues

### 🚨 A worker game-tick crash reaches nothing — the crash branch is dead code (`0232`, open)

> 📌 *2026-10-10 lint: history. `0232` is done (code in `6822210`): the `ErrorUpdate` now crosses as `game_error`
> and the crash branch is reachable. The freeze below was then **observed** before the fix. See the 2026-10-10 lint
> block at the top of this page.*

The chain, read from code at `c910452`:

1. `src/core/GameRunner.ts:171-183` wraps `executeNextTick()` in `try/catch` and, on an `Error`, calls back with `{errMsg, stack}` as an `ErrorUpdate`. ⚠️ A **non-`Error`** throw is logged only — **no callback at all**, a second narrower drop in the same `catch`.
2. `src/core/worker/Worker.worker.ts:20-28` — `gameUpdate` opens `if (!("updates" in gu)) { return; }`. An `ErrorUpdate` has no `updates` key, so it is **never `postMessage`'d**.
3. The wire format cannot carry it: `GameUpdateMessage.gameUpdate` is typed `GameUpdateViewData` (`WorkerMessages.ts:55-58`). **There is no worker→main error message type.**
4. `WorkerClient.ts:44-51` forwards only `game_update`.
5. ⇒ `ClientGameRunner`'s `if ("errMsg" in gu)` guard **can never be true**. The `showErrorModal` and the `this.stop()` behind it **never run**.
6. **Why it typechecks:** `WorkerClient.start()`'s parameter is typed `(gu: GameUpdateViewData | ErrorUpdate) => void` — **the type is wider than anything the code can deliver**, which is exactly why a dead branch compiled clean and sat unnoticed.

🆕 **2026-09-30 — point 3 is now true only for game ticks.** `0348` added one worker→main error message,
`init_failed`, used **only during the start** (an async start failure used to vanish and read as a timeout). The
tick-time `ErrorUpdate` path above is not in `0348`'s change list, so nothing here says `0232` changed.

⚠️ **A second silent-drop path in the same area, recorded and NOT assumed:** `WorkerClient.ts:36-43` adds a `worker.addEventListener("error", …)` whose whole body is guarded by `if (this.initReject)`, and `initReject` is cleared the moment init succeeds or times out. ⇒ read from code, **a worker-level `error` event after initialization does nothing at all.** Not exercised; confirm or refute it.

🔴 **THE CONSEQUENCE IS REASONED FROM CODE, NOT OBSERVED.** What the code says is: no modal, no teardown, no error surface — the game appears to freeze while the page stays alive. **Nobody has watched a tick fault happen.** ⛔ **Whether the game freezes, wedges, recovers on the next heartbeat, or diverges is UNKNOWN**, and settling it is `0232`'s first step. **No frequency, severity or player-impact figure may be written anywhere** until then.

✅ **`0227`'s `stop()` seam stays regardless — owner ruling.** It is **dormant-but-correct** and goes live the moment the worker drop is fixed. It is not dead weight and must not be removed.

#### 🚨 The seam is GENERATION-GUARDED — and that is a trap for `0232`'s acceptance test

**Recorded 2026-09-08. `0232`'s brief did not know this when it was filed, and it changes how the task must be verified.**

The callback `Main` passes as `onGameEnd` is **not** an unconditional "stop the monitor". Its body (`Main.ts:786-799`) is:

```
if (joinGeneration !== this.monitorGeneration) {
  return;
}
this.stopPerformanceMonitor();
```

⇒ **`onGameEnd()` stops the monitor ONLY IF the game that is ending still OWNS the live monitor.** That guard is **correct and deliberate** — it is the fix for review finding `R4`, where keying on the most recent join instead let an interleaved pair invert.

⛔ **But it is a trap for the acceptance test: crash a game that has ALREADY BEEN SUPERSEDED by a newer join and the seam CORRECTLY DOES NOTHING** — which a naive test reads as *"the seam failed."* ✅ **Verify on a game that is still the current one, and record which case you tested.**

⚠️ **Also note what the seam is NOT:** the callback stops the **monitor only**. `Main.ts:796-797` says `gameStop` is deliberately left alone. **It is not a general teardown** — do not expect it to undo anything else.

⚠️ **A related mint sits inside `0228`'s window:** `0227` added `const joinGeneration = ++this.joinGeneration;` at `Main.ts:694`, between `handleJoinLobby`'s guard block and its assignment. It touches `this.joinGeneration`, never `this.gameStop`, so **`0228`'s mechanism is unchanged** — but **any fix to `0228` must leave that mint and its ordering intact.** Inverting it is literally the `R4` defect `0227`'s review round 2 caught. ✅ **Still exactly three awaits in that window; `0227` added none.**

### 🚨 The runner survives every game — not just abandoned ones (`0231`, open, REFRAMED 2026-09-08)

> 📌 *2026-10-10 lint: history. `0231` is done (code in `6822210`): `stop()` now runs on every exit route. Its step 1
> measured the leak before fixing it — reachable only on in-page routes, since the shipped exit buttons reload the
> page. See the 2026-10-10 lint block at the top of this page.*

`ClientGameRunner.stop()` has **exactly one caller** — the worker error branch at `ClientGameRunner.ts:525`, i.e. the crash path, which per `0232` is **unreachable dead code**. ⇒ 🚨 **`stop()` DOES NOT RUN ON ANY PATH AT `c910452`** — not on a normal leave, not on a crash, not on `beforeunload`. **"Orphaned runner on a normal leave" is a SPECIAL CASE of "the runner is never torn down, ever."**

📌 **`0231`'s title was reframed 2026-09-08 on an owner ruling** from *"never runs on a normal leave-lobby … every abandoned multiplayer game"* to *"never runs on ANY path … every game, not just abandoned ones"*. ⛔ **The original was NOT wrong — it was NARROWER than the defect**, written when the crash path was believed to be a working teardown route. **The original is kept in the brief, marked superseded, not deleted.** ⛔ **The ruling was a REFRAME ONLY: priority, dependencies and board position were NOT ruled and are UNCHANGED.**

🚨 **THE TRAP THIS REFRAME MUST NOT SPRING — and it is the single most important line on this page.** ⛔ **A bigger-sounding defect has acquired NO EXTRA CERTAINTY.** *"`stop()` runs on no path"* is **REASONED FROM CODE, exactly like everything else here — it is NOT a measurement**, and it does **not** mean any consequence has been observed. **Nobody has watched a browser. No interval was counted, no worker was counted, no memory figure exists.** **Step 1 is still to MEASURE it, and a refutation is still a valid, complete outcome.** ⛔ **Do not let the bigger scope make it read as better-evidenced. The widening is of the REASONING ONLY.**

On any game end the runner, its Web Worker, a **1-second `connectionCheckInterval`** and **five `EventBus` listeners** survive for the lifetime of the page. That interval calls `reconnect()` on the game the player already left, if no server message has arrived for >5000 ms. `EventBus` **does** expose `off()` — removal is available and simply not used.

🚨 **Do not assert a user-visible impact** — battery drain, reconnect storms, added server load and memory growth are **things to check, not findings.** ⛔ No figure, rate or severity may be written for any of them until measured.

⚠️ **`0231` and `0232` are visibly ENTANGLED, and the merge question is DELIBERATELY LEFT OPEN.** `0232` fixes the drop, which makes the crash branch reachable, which makes `stop()` run on that one path — **changing `0231`'s own premise while it is open.** The owner was offered an architect review of that question on 2026-09-07 and **chose the reframe instead.** ⛔ **Whether the two merge, or run in a fixed order, is NOT decided — it remains the owner's.**

⚠️ **One clause of `0231`'s brief went false and is corrected in place:** it described the crash path as *"the one path where `stop()` does run."* At `c910452` **there is no such path.** The underlying code fact it hangs on — that the 20 s `setTimeout` handle is never stored, so `stop()` cannot cancel it — is **unchanged and still needs confirming or refuting**; only the "the crash path would exercise it" framing is dead, **and it comes back the moment `0232` lands.**

### The analytics tie — and its honest limit

Every leaked `PerformanceMonitor` keeps emitting `Performance:*` events, which is why this cluster surfaced during the GameAnalytics per-user-limit work. 🚨 **None of these tasks explains the 3–4 Sep spike and none of them closes `0224`.** That breach was **session-start** events (`Player` ~34×, `Experiment` ~45×); `Performance` barely moved across it (~1.6×). See [[tasks/gameanalytics-per-user-event-limit]].

### Line numbers in this area go stale within hours

`0225`, `0227`, `0231`, `0232` and `0233` were all written on 2026-09-07 against **different commits** (`35afc64`, `702a8ea`, `c910452`) while a concurrent session edited the same two files. **All four open briefs now carry a FRAME DECLARATION naming `c910452`, plus a citation-mapping table preserving every superseded number** — the practice that became project convention 10, see [[systems/agent-conventions]].

🔴 **The offset is NOT a single constant, and this is where a careful reader goes wrong.** Across `0227`, `Main.ts` moves by **+8 / +9 / +12 / +26** depending on which insertion point a line sits below, and `ClientGameRunner.ts` by **+5 / +23 / +24 / +25 / +26 / +29**. ⛔ **Do not apply one offset to a file.** ✅ **`src/core/` citations are unchanged — `0227` touched only `src/client/`.**

🚨 **And renumbering is not enough — the 2026-09-08 semantic pass is the lesson.** `0228`'s `await` citation was **wrong the day the brief was filed** (`Main.ts:702` was `clientID: lobby.clientID,`; the `await` was `:703`). A careful mechanical sweep re-derived it **faithfully** to `:711` — still the wrong line — and it took a **semantic** pass, checking what the code *does*, to correct it to `:712`. ⇒ **Re-verify every `file:line` by CONTENT against the commit you are reading, not by position.**

## Related

- [[tasks/orphaned-performance-monitors-lobby-rejoin]] — task `0225`, the one confirmed accumulating leak, fixed and evidenced with a negative control
- [[tasks/crashed-game-teardown-seam]] — task `0227`, which added the `onGameEnd` seam; site A closed unfixed and unfixable
- [[tasks/gameanalytics-per-user-event-limit]] — task `0224`, the analytics-volume investigation this cluster fell out of
- [[systems/analytics]] — the `Performance` event category and the 500-events-per-user-per-day limit
- [[systems/networking]] — the `Transport` / reconnect layer the surviving 1-second interval keeps poking
- [[features/reconnection]] — the reconnect flow a leaked runner keeps attempting for an abandoned game
- [[systems/game-loop]] — where the dropped `ErrorUpdate` originates: `GameRunner.executeNextTick()`'s `try/catch`
- [[tasks/mobile-quick-wins]] — where `Performance:FPS:*` was originally used as a measurement, now inflated by these leaks
- [[decisions/sprint-4]] — the board carrying `0225`, `0227`, `0231`, `0232`, `0233`
- [[decisions/sprint-backlog]] — the board carrying `0228` and `0229`
- [[tasks/join-lobby-race-fix]] — task `0228`, reproduced and fixed 2026-10-10 (not deployed)
- [[tasks/worker-start-failure-reporting]] — task `0348`: site B stops the worker; `init_failed` for the start only
- [[tasks/worker-reuses-page-map]] — task `0035`: leaving during the start stops the worker
- [[tasks/rejoin-after-failed-match-start]] — task `0347`: the reconnect session is saved before site B can run
- [[tasks/lobby-close-leftovers-investigation]] — task `0335`: `0228` (case 1) shown reachable through `0327`'s close routes; `0252` (case 2) measured at +24 listeners per join
- [[tasks/client-null-id-errors]] — task `0032`: the shared terrain-map cache that made a second in-page game start with stale tile owners (fixed in `a953271`); the routes that reach it are `0252`'s
