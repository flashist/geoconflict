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
| `0231` (open) | the **whole runner + worker + 1 s interval + 5 listeners**, on ~~the NORMAL leave path~~ **EVERY path** *(reframed 2026-09-08)* | **Accumulating — ⚠️ REASONED, NOT OBSERVED. The reframe widened the SCOPE, not the EVIDENCE** |

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
