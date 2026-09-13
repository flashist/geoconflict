# Plan — 0231 orphaned ClientGameRunner: stop() never runs on any path

> **Approval record.** Plan produced by a spawned `fkit-coder` (plan-only step) and **approved by the
> owner via `AskUserQuestion` in the lead session on 2026-09-13**, driven by `/fkit-sprint-ship-loop`.
> The owner was shown a condensed presentation of this plan by the driver; the text below is the
> coder's returned plan, copied by the driver at approval (transport HTML escaping decoded, nothing
> else changed). The gate is prose-enforced, not a structural write-wall (ADR-031 honesty clause).
>
> **Owner rulings folded in at approval (2026-09-13):**
> - **Q1 — scope, given the premise correction:** **approve the fix as designed** (D1–D5, `ClientGameRunner.ts`
>   only). The premise correction — shipped exits are page navigations; accumulation is reachable only via
>   hash / Back-after-`pushState` / synthetic routes; the crash-path ghost-rejoin is observed and real — is
>   accepted and must be stated plainly in the worklog.
> - **Q2 — measurement:** run the **full before/after instrument, 1a–1e**.
> - **Q4 — D5 judgment items:** **both yes** — (i) `isStopped` latch so a never-started runner can be torn
>   down; (ii) `stopBackgroundMusic()` moved behind the guard.
> - **Q3 — the wider per-game leak on in-page routes** (rAF loop, canvas node, Transport's 24 listeners,
>   renderer/window listeners): **out of scope; the producer files a separate brief at close.**
> - **Q5 — jest:** **attempt** the bounded suite (~1 h); fall back to browser-only evidence and say so plainly.
> - **Working tree:** carries uncommitted 0219/0241 changes (shell scripts, docs, `tests/scripts/`,
>   `CLAUDE.md`, knowledge-base) and 0232's `src/core/` + `tests/core/` changes. **Touch none of them.**
>   `git diff --stat src/core/` must be unchanged by this task.

## Plan — 0231

All paths under `/Users/mark.dolbyrev/Workspace/geoconflict/`. Line numbers re-verified this turn against the working tree (`fd2c88e` + uncommitted 0232 `src/core/` changes; 0219/0241 files untouched and not mine).

### 0. Facts the plan rests on (re-verified now)

| Fact | Where |
|---|---|
| `joinLobby` closure = `console.log("leaving game"); transport.leaveGame()` — never `stop()` | `src/client/ClientGameRunner.ts:254-257` |
| 20 s `setTimeout` handle not stored; interval created inside | `:501-506` |
| Five `eventBus.on(..., x.bind(this))` — bound refs not stored | `:508-518` |
| Crash branch → `this.stop()` — reachable since 0232 | `:526-536` |
| `stop()`: `stopBackgroundMusic()` **before** the `isActive` guard; then overlay, `isActive=false`, `worker.cleanup()`, `transport.leaveGame()`, clear interval, `onGameEnd()` | `:829-844` |
| `onConnectionCheck`: returns on `isLocal`; no `isActive` guard; `reconnect()` after >5000 ms | `:1153-1166` |
| `EventBus.off()` — `indexOf` on the same reference | `src/core/EventBus.ts:32-43` |
| `Transport.leaveGame()`: local → `localServer.endGame()`; remote → `stopPing`, `socket===null → return`, else `killExistingSocket()` | `src/client/Transport.ts:459-477` |
| `reconnect()` = `connect(this.onconnect, this.onmessage)`; remote `connectRemote` opens a new WebSocket and `onconnect` → `joinGame(turnsSeen)` | `:381-383`, `:310-341`; `ClientGameRunner.ts:675-678` |
| `Transport` registers **24** listeners on the same long-lived bus per `joinLobby` — also never removed | `Transport.ts:203-265` |
| `Main.gameStop` callers: `beforeunload` `:255-262`, `onHashUpdate` `:503-512`, `handleJoinLobby` `:683-687`, `handleLeaveLobby` `:949-962`; `onGameEnd` = generation-guarded `stopPerformanceMonitor()` `:786-799` | `src/client/Main.ts` |
| `WorkerClient.cleanup()` = `terminate()` + clear handlers/callback (double-call safe) | `src/core/worker/WorkerClient.ts:279-283` |
| 0227's bar: runner must not null/re-drive `Main.gameStop` | `ai-agents/tasks/done/0227-…/brief.md:304-306` |

**Premise correction, code-verified (not browser-observed):** every ordinary mid-game exit is a **full page navigation** — `FlashistFacade.changeHref` is `window.location.href = value` (`FlashistFacade.ts:679-682`), used by the sidebar exit (`GameRightSidebar.ts:136`), WinModal exit (`:346`), SettingsModal (`:160`), TutorialLayer (`:318`), `#refresh` (`Main.ts:669`). 0232 already *observed* the sidebar exit running in `unload`. So the brief's "N normal leaves in one page session" is **not reachable through the shipped UI**. The two `leave-lobby` dispatchers (`PublicLobby.ts:345-352`, `JoinPrivateLobbyModal.ts:133-143`) fire **pre-start** (no runner exists yet). In-page teardown of a live runner exists on only three routes: `hashchange`/`popstate` → `onHashUpdate` → `handleLeaveLobby` (`Main.ts:503-517`; standalone site URL edit, or Back after `AccountModal.ts:103`'s `pushState`); a join-over in `handleJoinLobby` (`Main.ts:683-687`); and synthetic `leave-lobby`/`join-lobby` dispatch. On all three, nothing removes the canvas or stops the render rAF loop either (no `canvas.remove()` anywhere; `GameRenderer.renderGame` re-schedules unconditionally at `:403`) — the in-page leave is an unsupported path today, not just a leaky one. **The one OBSERVED defect in this file stands and is the strongest reason to proceed:** 0232 §4.5 — crash before the 20 s arm → interval installed after `stop()` → `reconnect()` → ghost rejoin into a terminated worker.

### 1. MEASURE FIRST (build step; browser; no source edits except tagged temp instrumentation)

Environment: 0232's recipe — dev game server + `webpack serve` as two background processes, Playwright MCP, dev public lobby for multiplayer, Custom Game (Faroe Islands) for singleplayer. Probes injected into the page **before the app loads** (init script), no source change: wrap `window.setInterval`/`clearInterval` (live set, keyed by period+creation stack), `Worker` ctor + `Worker.prototype.terminate` (live set; cross-check with `page.workers()`), `WebSocket` ctor (count + URL), and capture `console.log` lines `No message from server for … reconnecting`, `Connected to game server!`, `starting game!`, `leaving game`, `reconnect-failed`. Listener count on `Main`'s bus is **not** reachable from page context — use a **temporary** `TEMP-0231` log in `EventBus.on/off` (removed before finishing; `grep -rn TEMP-0231 src tests` empty as the gate; 0232 precedent).

Runs, numbers recorded per run (intervals / workers / WebSockets opened / reconnect lines / bus listener count for the five event classes), N = 3 cycles, each game left ≥ 25 s after start so the 20 s arm has fired:

| # | Route | Mode | What it settles |
|---|---|---|---|
| 1a | Real sidebar exit → menu → rejoin | MP | Confirms exit is a full navigation (probe state resets; `performance.timeOrigin` changes). Expected: no accumulation possible. **This is the brief's "normal leave" — record it as such.** |
| 1b | In-page leave: `location.hash = "#x"` from console (real `hashchange` → `handleLeaveLobby`), then real rejoin ×3 | MP | Accumulation per cycle: expected +1 interval, +1 worker, +5 listeners, +1 reconnect and a ghost `Connected to game server!`/`starting game!` per stale runner (0232 §4.5 shape), or a `reconnect-failed` event if the server refuses. Also note: canvas stays in DOM, render loop keeps running. |
| 1c | Same via synthetic `document.dispatchEvent(new CustomEvent("leave-lobby"))` — real listener, synthetic trigger | MP | Same numbers; proves 1b is the listener, not the hash handler. |
| 1d | 1b in singleplayer | SP | Settles the `isLocal` question: intervals/workers/listeners expected to accumulate; reconnects expected 0. |
| 1e | Crash before the 20 s arm (0232's temp throw at tick 150 in `GameRunner.executeNextTick`, `TEMP-0231`-tagged, removed after) | MP | Re-observes 0232 §4.5 with the probes as the crash-path **before** number (expect 1 extra WebSocket at ~20.8 s, interval alive, worker terminated). |

Outcomes and what each means (state which one occurred, plainly):
- **1b/1c/1d accumulate (expected from code):** proceed to §2. The report must say the accumulation is reachable **only** through hash navigation / Back-after-pushState / synthetic dispatch — not through the shipped exit buttons — and that 1e is the observed user-facing consequence.
- **1b/1c/1d do not accumulate:** the accumulation is refuted; return the numbers to the owner. **§2 still applies to the crash path (1e)** unless 1e also fails to reproduce.
- **1e does not reproduce:** stop, report; the 0232 observation would need re-examination before any fix.

### 2. Design — `src/client/ClientGameRunner.ts` only; `Main.ts` untouched; `src/core/` untouched

**Seam answer:** 0227's `onGameEnd` is reused as-is (it fires from `stop()`, is generation-guarded and idempotent in `Main`). No new seam. **0227's bar** ("do not null or re-drive `Main.gameStop` from the runner") is respected by *direction*: `Main.gameStop` (the closure `joinLobby` returns) drives the runner, never the reverse; nothing in the runner touches `Main`.

- **D1 — the closure stops the runner.** In `joinLobby`: `let runner: ClientGameRunner | null = null; let left = false;` In `.then`: after the `r === undefined` branch, `if (left) { r.stop(); return; }` (player left while the game was still being built — worker already initialized, must be terminated), else `runner = r; r.start();`. Returned closure: `left = true; if (runner !== null) { runner.stop(); } else { transport.leaveGame(); }` (`stop()` already calls `transport.leaveGame()`; the `else` keeps today's pre-runner behaviour byte-for-byte). Textually adjacent to 0233's site 3 (`:241-251`) — merge-conflict risk, no design conflict.
- **D2 — store the 20 s timeout; guard the arm.** `private connectionCheckTimeout: ReturnType<typeof setTimeout> | null = null;` `start()` stores it; the callback nulls it and `if (!this.isActive) return;` before creating the interval. `stop()` clears it.
- **D3 — `onConnectionCheck` guard:** `if (!this.isActive || this.transport.isLocal) return;` — belt-and-braces (D2 already prevents the interval; this covers any interval that exists when `stop()` races it).
- **D4 — removable listeners.** Five `private readonly` fields holding the bound handlers, created once (in the constructor or at field init: `private readonly boundInputEvent = this.inputEvent.bind(this)` …). `start()` uses them in `on()`; `stop()` calls `off()` for all five. `EventBus.off` needs no change (same-reference `indexOf`, `:38`).
- **D5 — `stop()` becomes the one idempotent full-teardown primitive.** Order: latch → `hideCatchUpOverlay`/`catchingUp=false` → `isActive=false` → `clearTimeout`/`clearInterval` → `off()` ×5 → `worker.cleanup()` → `transport.leaveGame()` → `onGameEnd()`. Two judgment items, put to the owner (Q4): (i) replace the `if (!this.isActive) return;` guard with a `private isStopped` latch so a **never-started** runner (D1's `left` case) is torn down too — today's sole caller (crash branch) is post-start, so no existing behaviour changes; (ii) move `SoundManager.stopBackgroundMusic()` **behind** the guard — today it runs on every call, so a stale closure's second call (0228's un-nulled `gameStop`) would silence the *next* game's music. Minimal alternative for both: keep the guard as is and record the pre-start window as a residual. → **Owner ruled both (i) and (ii) YES.**
- **Not changed, deliberately:** `Main.ts` (all four `gameStop` callers already reach D1; `handleLeaveLobby`'s trailing `stopPerformanceMonitor()` is idempotent after `onGameEnd`); `src/core/EventBus.ts`; `Transport`, `GameRenderer`, `InputHandler`, canvas removal (see Q3); 0233's three modal sites; 0228/0229's `Main.ts` race sites.

**Crash path after the fix (0232 made it live):** crash → `stop()` clears the pending timeout (or the live interval) → no reconnect, no ghost rejoin. Then exit via sidebar → page navigation → `beforeunload` → `gameStop()` → `runner.stop()` → latch returns → **F5's second `leaveGame()` disappears** (behaviour-neutral: it was `socket===null → return` in MP and a second `clearInterval` in SP). F5 on refresh: same. Join-over (`handleJoinLobby`): `gameStop()` → `stop()` tears the old runner down fully before the new join; a stale second call (0228) is a no-op. 0229's double-`onJoin` is unchanged: a second `.then` would overwrite `runner`, so the first runner would be unstoppable from the closure — recorded as a residual, not fixed here.

**What still outlives an in-page leave after this fix (honest scope line):** Transport's 24 bus listeners, `GameRenderer`'s `RedrawGraphicsEvent` + layer listeners, `window` resize/pointer/key listeners from `GameRenderer.initialize`/`InputHandler.initialize`, the render rAF loop, and the canvas node. The brief's criterion 2 ("objects going to zero") is met for its four named objects (interval, worker, five listeners, reconnects) — not for those. Q3.

### 3. Tests

- **Jest (attempt, bounded — 1 h; fallback = browser-only, said plainly):** `tests/client/ClientGameRunnerTeardown.test.ts`, `jest.mock` factories for `../../src/client/Main` (`getPersistentID`), `OtelBrowserInit`, `graphics/GameRenderer`, `graphics/layers/Leaderboard` (`GoToPlayerEvent` — a Lit component file, must not load under node), `sound/SoundManager`, `Utils`, `TerrainMapFileLoader`, and `flashist/FlashistFacade` if it does not load under `testEnvironment: node` (`tests/LocalServer.test.ts:1-13` is the working mock pattern; `tests/client/FlashistFacade.test.ts` exists). Construct `new ClientGameRunner(lobbyStub, new EventBus(), rendererStub, inputStub, transportStub{isLocal:false, connect, leaveGame, reconnect, joinGame, turnComplete}, workerStub{start, sendHeartbeat, cleanup}, gameViewStub, onGameEndSpy)` with fake timers. Non-tautological assertions: (T1) `start(); stop();` advance 21 s → `transport.reconnect` never called, no interval created; (T2) `start()`, advance 21 s (interval live), set `lastMessageTime` stale, `stop()`, advance 10 s → `reconnect` not called; (T3) after `stop()`, `(bus as any).listeners.get(X).length === 0` for all five classes, and `bus.emit(new MouseUpEvent(...))` reaches nothing; (T4) `worker.cleanup`, `transport.leaveGame`, `onGameEnd` each exactly once across two `stop()` calls; (T5, only if D5-i approved) `stop()` on a never-started runner terminates the worker. `joinLobby`'s closure (D1) needs a real `Transport`/WebSocket → browser only.
- **`src/core/` untouched** → no core test obligation. (Optional, cheap: `tests/core/EventBus.test.ts` for `off()` with a stored bound ref, if none exists — build worker checks.)
- **Browser, same instrument as §1 (after numbers):** 1b/1c/1d ×3 → intervals 0, workers 0, five-class listener count 0, reconnect lines 0 after each leave; 1e → no reconnect line, WebSockets opened = 2 (initial + game join), worker terminated; **criterion 6**: real join → play → sidebar exit → rejoin, MP, plays normally; SP join → exit → rejoin; crash → exit → rejoin (0232 §4.7 shape). `npm test` (~22–25 s, harnesses included), `npm run lint`, `npx tsc --noEmit`, prettier on the touched file. Temp instrumentation gate: `grep -rn TEMP-0231 src tests` empty; `git diff --stat src/core/` empty.

### 4. Build-worker obligations
Record in `worklog.md`: which route each number came from; the exit-is-navigation finding with the 1a evidence; the seam answer (§2 first paragraph, in writing); the `setTimeout` answer (1e + 0232 §4.5); the `isLocal` answer (1d); D5 choices with reasons; F5 disappearance; residuals list (§2 last paragraph, 0229). No analytics event added/renamed/removed (state it). No commits, no wiki writes, no task-file moves.

## Open questions (returned by the coder; answered by the owner — see the approval record at the top)

1. **Scope reframe.** The shipped exit buttons are full page navigations, so "N normal leaves accumulate" cannot happen through the UI; the accumulation is reachable only via hash navigation / Back-after-`pushState` / synthetic dispatch, while the crash-path ghost-rejoin is observed and real. Proceed with the fix as designed (**Rec: yes** — small, localized, fixes an observed defect and hardens the real in-page routes), or narrow this task to the crash path only, or close it on the reframe? → **Owner ruled: proceed with the fix as designed.**
2. **Measurement scope.** Run §1 in full (1a–1e, ~30–45 min with the dev server) (**Rec: yes** — criteria 1/2 demand before/after numbers by one instrument), or accept 0232 §4.5 + code reading and measure only 1e before/after? → **Owner ruled: full 1a–1e.**
3. **Widen to the rest of the per-game leak on in-page routes** (render rAF loop, canvas node, Transport's 24 listeners, renderer/layer/window listeners)? **Rec: no** — separate brief; it needs a `GameRenderer`/`Transport` dispose design and is outside this task's four named objects. The report will state what remains. → **Owner ruled: no; producer files a separate brief at close.**
4. **D5 judgment items:** (i) `isStopped` latch so a never-started runner can be torn down when the player leaves mid-construction; (ii) `stopBackgroundMusic()` behind the guard. **Rec: both yes** — each is one line, no existing caller's behaviour changes, and (ii) closes a real cross-game side effect. Alternative: keep the `isActive` guard, record the pre-start window as a residual. → **Owner ruled: both yes.**
5. **Jest attempt** with the bounded mock list, falling back to browser-only evidence if the import graph resists within ~1 h (0227/0232 precedent)? **Rec: attempt** — T1–T4 are non-tautological and would fail on today's code. → **Owner ruled: attempt.**
