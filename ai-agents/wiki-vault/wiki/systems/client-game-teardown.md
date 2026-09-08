# Client Game Teardown — Who Stops What When a Game Ends

**Layer**: client
**Key files**: `src/client/Main.ts`, `src/client/ClientGameRunner.ts`, `src/client/PerformanceMonitor.ts`, `src/core/worker/Worker.worker.ts`, `src/core/worker/WorkerClient.ts`, `src/core/GameRunner.ts`

## Summary

A client match owns three long-lived things: the **`ClientGameRunner`** (plus its Web Worker, a 1-second reconnect interval and five `EventBus` listeners), the **`PerformanceMonitor`** (a `setInterval`, a `requestAnimationFrame` loop and a `visibilitychange` listener), and **`Main.gameStop`**. **Ending a game does not reliably stop any of them**, and which ones survive depends on *how* the game ended.

This page exists because the audit that found these holes ran across seven tasks in three days (2026-09-07) and the findings are easy to confuse with each other. **The single most misread thing in this area is the difference between "bounded" and "accumulating."** They are not the same defect class and they were ranked differently on purpose.

⛔ **Everything on this page is repository state as of `HEAD` = `c910452`, 2026-09-07. NOTHING IS DEPLOYED.** The owner deploys at the next weekend slot.

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
| `handleLeaveLobby()` | ✅ stops and nulls | ❌ **runner, worker, 1 s interval and 5 listeners all survive** | monitor fixed by `0225`; runner is **`0231`, open** |
| `onHashUpdate` (popstate / hashchange) | ✅ indirectly, via `handleLeaveLobby()` | ❌ | same as above |
| `handleJoinLobby()` — joining while a game runs | ✅ **fixed by `0225`** (was the accumulating leak) | ❌ | `gameStop` half is **`0228`, open** |
| worker `ErrorUpdate` → `stop()` (**site A**) | ⚠️ **seam wired, but UNREACHABLE** | ⚠️ same | **`0232`, open** |
| worker-init failure → bare `return` (**site B**) | ✅ fixed by `0227` | n/a — no runner exists | done |
| `createClientGame` rejects, no `.catch` (**site C**) | ✅ fixed by `0227` | n/a — no runner exists | done |
| mid-game server `error` — the tab kick | ❌ | ❌ | **`0233`, open** |
| desync modal | ❌ | ❌ | **`0233`, open** |
| lobby error, pre-runner | ❌ | ❌ | **`0233`, open — and whether a monitor is even running here is UNSETTLED** |

### Bounded vs accumulating — the distinction that drove every rank

| Task | What it covers | Class |
|---|---|---|
| `0225` (done) | the `PerformanceMonitor` on mid-game lobby join | **Accumulating** — one permanently unstoppable monitor per join; **observed, with a negative control** |
| `0227` (done) | the monitor on the three crash / init-failure paths | **Bounded** — at most one dead game's monitor, cleared by the next leave or join |
| `0228` (open) | `handleJoinLobby()`'s stale `gameStop` across three awaits | **Bounded** — ⚠️ and **reachability UNPROVEN**; "unreachable, closed" is a legitimate outcome |
| `0233` (open) | the tab-kick, desync and lobby-error modals | **Bounded** — cleared by a later leave or join |
| `0231` (open) | the **whole runner + worker + 1 s interval + 5 listeners**, on the NORMAL leave path | **Accumulating — ⚠️ REASONED, NOT OBSERVED** |

## Gotchas / Known Issues

### 🚨 A worker game-tick crash reaches nothing — the crash branch is dead code (`0232`, open)

The chain, read from code at `c910452`:

1. `src/core/GameRunner.ts:171-183` wraps `executeNextTick()` in `try/catch` and, on an `Error`, calls back with `{errMsg, stack}` as an `ErrorUpdate`. ⚠️ A **non-`Error`** throw is logged only — **no callback at all**, a second narrower drop in the same `catch`.
2. `src/core/worker/Worker.worker.ts:20-28` — `gameUpdate` opens `if (!("updates" in gu)) { return; }`. An `ErrorUpdate` has no `updates` key, so it is **never `postMessage`'d**.
3. The wire format cannot carry it: `GameUpdateMessage.gameUpdate` is typed `GameUpdateViewData` (`WorkerMessages.ts:55-58`). **There is no worker→main error message type.**
4. `WorkerClient.ts:44-51` forwards only `game_update`.
5. ⇒ `ClientGameRunner`'s `if ("errMsg" in gu)` guard **can never be true**. The `showErrorModal` and the `this.stop()` behind it **never run**.
6. **Why it typechecks:** `WorkerClient.start()`'s parameter is typed `(gu: GameUpdateViewData | ErrorUpdate) => void` — **the type is wider than anything the code can deliver**, which is exactly why a dead branch compiled clean and sat unnoticed.

⚠️ **A second silent-drop path in the same area, recorded and NOT assumed:** `WorkerClient.ts:36-43` adds a `worker.addEventListener("error", …)` whose whole body is guarded by `if (this.initReject)`, and `initReject` is cleared the moment init succeeds or times out. ⇒ read from code, **a worker-level `error` event after initialization does nothing at all.** Not exercised; confirm or refute it.

🔴 **THE CONSEQUENCE IS REASONED FROM CODE, NOT OBSERVED.** What the code says is: no modal, no teardown, no error surface — the game appears to freeze while the page stays alive. **Nobody has watched a tick fault happen.** ⛔ **Whether the game freezes, wedges, recovers on the next heartbeat, or diverges is UNKNOWN**, and settling it is `0232`'s first step. **No frequency, severity or player-impact figure may be written anywhere** until then.

✅ **`0227`'s `stop()` seam stays regardless — owner ruling.** It is **dormant-but-correct** and goes live the moment the worker drop is fixed. It is not dead weight and must not be removed.

### 🚨 The runner survives every abandoned multiplayer game (`0231`, open)

`ClientGameRunner.stop()` has **exactly one caller** — the worker error branch, i.e. the crash path, which per `0232` is itself unreachable. On a normal leave, the runner, its Web Worker, a **1-second `connectionCheckInterval`** and **five `EventBus` listeners** all survive for the lifetime of the page. That interval calls `reconnect()` on the game the player already left, if no server message has arrived for >5000 ms. `EventBus` **does** expose `off()` — removal is available and simply not used.

⚠️ **THE ACCUMULATION IS REASONED FROM CODE, NOT OBSERVED.** No browser session was watched, no interval count taken, no worker count taken, no memory figure exists. 🚨 **Do not assert a user-visible impact** — battery drain, reconnect storms, added server load and memory growth are **things to check, not findings.** ⛔ No figure, rate or severity may be written for any of them until measured.

### The analytics tie — and its honest limit

Every leaked `PerformanceMonitor` keeps emitting `Performance:*` events, which is why this cluster surfaced during the GameAnalytics per-user-limit work. 🚨 **None of these tasks explains the 3–4 Sep spike and none of them closes `0224`.** That breach was **session-start** events (`Player` ~34×, `Experiment` ~45×); `Performance` barely moved across it (~1.6×). See [[tasks/gameanalytics-per-user-event-limit]].

### Line numbers in this area go stale within hours

`0225`, `0227`, `0231`, `0232` and `0233` were all written on 2026-09-07 against **different commits** (`35afc64`, `702a8ea`, `c910452`) while a concurrent session edited the same two files. `0227` alone shifted every `ClientGameRunner.ts` citation below its insertion point by **+26**. **Re-verify every `file:line` against the commit you are reading.**

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
