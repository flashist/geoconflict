# Worklog — 0231 orphaned ClientGameRunner: stop() now runs on every exit route

Build worker: `fkit-coder`, spawned by `/fkit-sprint-ship-loop` under the declared-approval marker
(plan approved by the owner via `AskUserQuestion` in the lead session, 2026-09-13). Plan executed as
written in `plan.md` (blob `96461629…`, 17783 bytes, verified before starting). No commits, no wiki
writes, no task-file moves. The uncommitted 0219/0241 files and 0232's `src/core/` + `tests/core/`
files were not touched: `git diff --stat src/core/` is byte-for-byte the pre-task baseline
(4 files, 45 insertions, 16 deletions). `grep -rn TEMP-0231 src tests` is empty.

Environment for every browser step: `dev` at `fd2c88e` + working tree; dev game server
(`GAME_ENV=dev … src/server/Server.ts`) and `webpack serve --node-env development` as two
background processes (0232's recipe, minus `--open`); master quorum 2/2. Browser: the Playwright
MCP (Chromium, 1200×629). Multiplayer (MP): the dev public lobby "Join next Game" card. Singleplayer
(SP): Custom Game, Faroe Islands, defaults. Times below are the page's `performance.now()` in ms,
rounded. **No frequency or severity figures anywhere in this log — none were measured.**

## The instrument (one instrument, before and after)

An init script injected before the app loads (`page.addInitScript`, never in `src/`) wrapped
`setInterval`/`clearInterval` (live set keyed by period), the `Worker` constructor and
`Worker.prototype.terminate` (live set), the `WebSocket` constructor (count + URL), and captured the
key console lines (`No message from server for … reconnecting`, `Connected to game server!`,
`starting game!`, `starting client game`, `leaving game`, `on stop: leaving game`,
`local server ending game`, `leaving lobby, cancelling game`). Listener counts on `Main`'s bus came
from a temporary `TEMP-0231` line in `EventBus.on` that exposed each bus instance to the page
(removed; `EventBus.ts` restored from HEAD). The "five-class" count is the total of listeners for
`MouseUpEvent`, `MouseMoveEvent`, `AutoUpgradeEvent`, `DoBoatAttackEvent`, `DoGroundAttackEvent`;
**the runner's own share is exactly 5** — `MouseUpEvent`/`MouseMoveEvent` each have 3 other
subscribers per renderer, so a healthy single game reads 11, and a torn-down runner reads 6.
"Live workers" always includes one unrelated `blob:` worker that exists from game start (0232 saw
the same one); the game worker is the `Worker.worker.ts` chunk.

Menu baseline on a fresh page: 1 bus, 0 five-class listeners, 1 bus listener, 0 workers, 1 WebSocket
(webpack HMR `/ws`), one app-level 1000 ms interval (not the runner's — it is cleared on join).
In-game +26 s baseline (every route, before and after): runner interval created at start+20.0 s,
2 live workers, five-class 11, 70 bus listeners (MP) / 72 (SP), 2 game sockets (`joinLobby`'s +
the runner's own `connect`), 0 reconnect lines.

## §1 — MEASURE FIRST (pre-fix numbers, by route)

### 1a — real sidebar exit → menu → rejoin, MP, 3 cycles. **Exit is a full page navigation.**

`performance.timeOrigin` changed on every exit (1789296493967 → …575442 → …610008 → …644044); the
probe state reset each time. After each exit: 0 workers, 0 five-class listeners, 1 bus listener —
the menu baseline. In-game +26 s each cycle: 1 interval / 2 workers / 11 / 70 / 0 reconnects.
**Accumulation across the brief's "normal leave" is impossible through the shipped UI: the
sidebar exit is `FlashistFacade.changeHref` = `window.location.href = …`, and the leave runs in
`beforeunload`.** The premise correction in the plan stands, browser-observed.

### 1b — in-page leave via `location.hash = "#x"` (real `hashchange` → `handleLeaveLobby`), MP

| sample | runner intervals | live workers | five-class | bus listeners | sockets opened | reconnect lines |
|---|---|---|---|---|---|---|
| c1 in-game +26 s | 1 | 2 | 11 | 70 | 3 | 0 |
| **c1 after hash-leave +9 s** | **1** | **2** | **11** | 70 | 4 | **1** |
| c2 in-game | 2 | 4 | 21 | 134 | 6 | 2 |
| c2 after leave | 2 | 6 | 31 | 174 | 8 | 4 |
| c3 in-game | 7 | 18 | 91 | 438 | 24 | 19 |
| **c3 after leave** | **11** | **29** | **146** | **658** | **40** | **35** |

Cycle 1 is the clean per-leave number: `leaving lobby, cancelling game` → `leaving game` →
`on stop: leaving game` (the old closure's `transport.leaveGame()`), then at +5.9 s
`No message from server for 5885 ms, reconnecting` → new WebSocket → `Connected to game server!`
×2 → `starting game!` — the orphaned runner rejoined the server game on its own handlers. Nothing
was torn down: interval alive, worker alive, listeners in place. Canvas count stayed 1 (never
removed). **Cycles 2–3 show the leak multiplying, not adding**, but part of that multiplication is a
dev-environment confound I did not fully trace: after an in-page leave the public-lobby poll is
never restarted (`Main.ts:750/771` call `publicLobby.stop()`; only `connectedCallback` starts it),
so the card is stale, and my rejoins hit already-started / already-ended dev games (the server log
shows every unattended dev game ending at ~414 turns ≈ 28 s), which produced single-line
`Connected` + `starting client game` sequences — `joinLobby`-style connects building new runners
whose exact trigger I did not pin down. The totals in the table are exact as sampled; treat the
per-cycle increments beyond c1 as "grows fast on a polluted page", not as a clean formula. The
server log for this window also shows `Invalid message before join: {"type":"hash",…}` warnings —
the stale runners' hashes arriving on reconnected sockets.

### 1c — synthetic `document.dispatchEvent(new CustomEvent("leave-lobby"))`, MP

c1 after leave +9 s: interval 1 (alive), workers 2 (not terminated), five-class 11 (not removed),
1 reconnect line at +5.6 s, ghost `Connected` ×2 + `starting game!`. **Same shape as 1b c1 — the
listener (`handleLeaveLobby`) is the route, not the hash handler.** c2/c3 are not clean cycles: the
rejoin clicks connected (`Connected` once, +1 socket, +24 bus listeners = Transport's 24) but no
game ever started within 34 s (the stale-card confound above), so 1c yields **one** clean
observation, not three.

### 1d — 1b in SP (hash leave), 3 cycles — **the `isLocal` answer**

| sample | runner intervals | live workers | five-class | bus listeners | reconnect lines |
|---|---|---|---|---|---|
| c1 in-game +30 s | 1 | 2 | 11 | 72 | 0 |
| c1 after leave | 1 | 2 | 11 | 72 | 0 |
| c2 after leave | 2 | 3 | 16 | 117 | 0 |
| c3 after leave | **3** | **4** | **21** | **162** | **0** |

Clean and monotonic: **+1 interval, +1 worker, +5 listeners per leave; 0 reconnects.** The
non-reconnect half of the leak applies to local games; the reconnect half does not
(`onConnectionCheck` returns on `transport.isLocal`). Each SP leave logged `leaving game` →
`local server ending game`. The +45/game on the bus is the wider leak (renderer/layers/Transport).

### 1e — crash before the 20 s arm, MP — **the `setTimeout(…, 20000)` answer, observed**

Temp throw at tick 150 in `GameRunner.executeNextTick` (`TEMP-0231`, removed). Game start 10758;
fault 20826 (~10.1 s in), `#error-modal` up, game worker terminated, `on stop: leaving game`;
**0 runner intervals at crash+1.5 s**. Then at 30760 (= start + 20.0 s) the interval was created
anyway — `stop()` had already run and had nothing to clear — and at 31760
`No message from server for 10945 ms, reconnecting` → **a 4th WebSocket** → `Connected` ×2 →
`starting game!`: the crashed client rejoined the match with a terminated worker. Interval alive
at start+28 s; five-class still 11 (never removed). This is 0232 §4.5 reproduced with the probes.

**Outcome (plan §1 table, first row):** 1b/1c/1d accumulate and 1e reproduces → §2 applied. The
accumulation is reachable **only** through hash navigation / Back-after-`pushState` / synthetic
dispatch — not through the shipped exit buttons — and 1e is the observed user-facing consequence.

## §2 — Change surface (`src/client/ClientGameRunner.ts` only; +62/−19)

| | Change |
|---|---|
| D1 | `joinLobby`: `let runner = null; let left = false;` — `.then` stores `runner = r` before `r.start()`, or `r.stop()`s a runner built after the player left; the returned closure sets `left = true` and calls `runner.stop()` (which calls `transport.leaveGame()` itself) or, with no runner yet, `transport.leaveGame()` exactly as before. |
| D2 | `connectionCheckTimeout` field; `start()` stores the 20 s handle; the callback nulls it and returns `if (!this.isActive)` before creating the interval; `stop()` clears it. |
| D3 | `onConnectionCheck`: `if (!this.isActive \|\| this.transport.isLocal) return;` |
| D4 | Five `private readonly bound…` fields bound once at field init; `start()` registers them; `stop()` calls `EventBus.off()` with the same references (`EventBus.off` is an `indexOf` on the reference — unchanged, `src/core/EventBus.ts:32-43`). |
| D5 | `stop()` = latch (`isStopped`) → `stopBackgroundMusic()` → overlay/`catchingUp` → `isActive=false` → `clearTimeout`/`clearInterval` → `off()` ×5 → `worker.cleanup()` → `transport.leaveGame()` → `onGameEnd()`. |

**Seam answer (criterion 5):** 0227's `onGameEnd` seam is reused as-is — it fires last from `stop()`,
and in `Main` it is generation-guarded and idempotent (`Main.ts:786-799`). No new seam.
**`Main.gameStop` is not re-driven from the runner** (0227's bar): direction is `Main.gameStop`
(the closure `joinLobby` returns) → `runner.stop()`; nothing in the runner touches `Main`. All four
`gameStop` callers (`beforeunload`, `onHashUpdate`, `handleJoinLobby`, `handleLeaveLobby`) reach D1
unchanged; `handleLeaveLobby`'s trailing `stopPerformanceMonitor()` is idempotent after `onGameEnd`.

**D5 choices (owner ruled both yes):** (i) the `isActive` guard became an `isStopped` latch so a
runner that was built but never started (D1's `left` case — worker already initialized) is torn down
too; the sole pre-existing caller (the crash branch) is post-start, so no existing behaviour changes.
(ii) `SoundManager.stopBackgroundMusic()` moved behind the latch: before, it ran on every call, so a
stale closure's second call (0228's un-nulled `gameStop`) would have silenced the *next* game's music.

**F5 disappearance (observed):** SP crash → exit printed `local server ending game` exactly once
(at `stop()`), and nothing at unload (`Browser is closing` → `leaving game` only). 0232 §4.4 saw it
twice. In MP the second call was `socket === null → return`, so its absence is not log-visible.

## §3 — Verification

### Jest — `tests/client/ClientGameRunnerTeardown.test.ts` (new, 6 tests)

Every browser-facing import of `ClientGameRunner.ts` is replaced by a `jest.mock` factory (`Main`,
`OtelBrowserInit`, `Utils`, `TerrainMapFileLoader`, `GameRenderer`, `layers/Leaderboard`,
`SoundManager`, `Transport`, `LocalPersistantStats`, `MatchStartAnalytics`, `PlayerElimination`,
`ReconnectSession`, `WinConditionAnalytics`, `LeaderboardReporter`, `FlashistGameSettings`,
`FlashistFacade`); the runner, `EventBus` and the `InputHandler` event classes are real; fake timers;
`requestAnimationFrame` stubbed. The import graph did **not** resist — well inside the 1 h bound.

- New code: **6/6 pass.** T2-control (start, 21 s, no messages → `reconnect` called once) proves
  the instrument. T1 (stop before the arm → no 1000 ms interval, no reconnect), T2 (stop after the
  arm → reconnect count frozen), T3 (five listener arrays empty after stop; a `MouseUpEvent` no
  longer reaches `inputEvent`), T4 (two `stop()`s → `cleanup`/`leaveGame`/`onGameEnd`/`stopBackgroundMusic`
  once each), T5 (stop on a never-started runner → worker cleaned up).
- **Old-code proof:** with `ClientGameRunner.ts` swapped to HEAD, **4 failed / 2 passed** — T1, T3,
  T4, T5 fail. T2 passes on old code too (old `stop()` did clear an already-live interval), so T2 is a
  regression guard, not a defect proof. File restored, byte-identical.
- `joinLobby`'s closure (D1) needs a real `Transport`/WebSocket → browser-verified only (below).
- `src/core/` untouched → no core test obligation. No `EventBus.off` test added (unchanged code).

### Browser — after numbers, same instrument

**1b after (MP hash leave; the lobby poll re-armed from the harness between cycles — a 1001 ms
interval so the counter tells it apart; this is a harness workaround for the pre-existing stale-card
behaviour, stated plainly):** c1 after leave: **0 intervals, game worker terminated, five-class 6
(runner's 5 gone), 65 bus listeners, 0 reconnects, no ghost lines.** c2 (rejoin worked): in-game
canvases 2 / five-class 17 (a second renderer's subscribers) → after leave **0 / terminated / 12 /
0 reconnects**. c3 is **not clean and not the runner's fault**: the 3rd same-page game's
`start()` threw `TypeError: Cannot read properties of null (reading 'id')` at
`TerritoryLayer.paintTerritory ← TerritoryLayer.init ← GameRenderer.initialize ← ClientGameRunner.start`
(stale in-page renderer state), so `transport.connect` was never reached; the armed 20 s timer
then reconnected on `joinLobby`'s handlers and `joinLobby` built a new runner every ~5 s (each
rejected the same way). After the leave, D1 stopped the runner it owned and the `left` branch
stopped every late-built one (`on stop: leaving game` ×3, terminations 3→6), but two earlier
cascade runners stayed unreachable (2 game workers, 1 interval, reconnects 2→4) — the plan's
"overwritten `runner`" residual, now observed on the unsupported route. An earlier after-1b attempt
without the poll re-arm gave c1 clean and c2/c3 never starting (the confound), same as pre-fix 1c.

**1c after (synthetic dispatch ×3, poll re-armed):** all three clean — after each leave **0
intervals, game worker terminated (2→3→4 terminations), runner's five gone (6/12/18 = other
renderers' subscribers), 0 reconnects, no page errors.** Canvases 1→2→3 (wider leak).

**1d after (SP hash leave ×3):** after each leave **0 intervals, worker terminated (2→3→4), five-class
6, 0 reconnects**; bus listeners 67→107→147 (wider leak).

**1e after (crash at start+10.1 s):** the five listeners already removed at crash time; at start+23 s
and start+30 s **0 intervals, 0 reconnect lines, sockets stayed at 3 (no 4th), no ghost
`Connected`/`starting game!`.** Crash-path ghost rejoin gone.

**Criterion 6 (real join → play → exit → rejoin):** MP game 1 (timer 38s at +26 s) → sidebar exit →
menu → MP game 2 played (interval armed at 20 s, timer 40s at +27 s, no modal, no errors, 0
reconnects) → exit. SP game 1 (21s) → exit → SP game 2 (17s → 21s) → exit. Crash shape: MP crash →
0 intervals/0 reconnects at start+23.6 s → exit behind the modal → rejoin → game 2 played to the same
forced crash → exit; SP crash → exit (F5 above). No page errors on any of these runs.

### Gates

`npm test`: **120 suites / 1252 tests, all passed, none skipped** (Docker up; 119/1246 before this
task — +1 suite, +6 tests). `npm run lint`: 0 problems. `npx tsc --noEmit`: clean. Prettier: clean on
`ClientGameRunner.ts` and the new test. `grep -rn TEMP-0231 src tests`: empty. `git diff --stat
src/core/`: unchanged from the baseline. **No analytics event was added, renamed or removed.**

## Decision log (ADR-019 audit; ADR-032 A4)

Fixes applied without asking that were **outside** the approved plan: **none**. Source changes are
D1–D5 exactly, in the one file the plan names. Obvious-winner calls within the plan's intent, all
instrumentation/harness, so they are findable:

1. Listener counting via a one-line `TEMP-0231` bus tap in `EventBus.on` (the plan's stated
   method); the file was restored from HEAD afterwards (it carried no 0232 change).
2. The 1e temp throw placed in `GameRunner.executeNextTick` (0232's file, uncommitted) on
   `game.ticks() === 150`; inserted three times (pre-fix 1e, post-fix 1e, criterion-6 crash runs)
   and removed each time; `git diff --stat src/core/` verified identical to the baseline at the end.
3. Fixed 34 s waits after a join instead of waiting on `starting client game`, because on the
   polluted pre-fix page ghost runners also print that line.
4. Re-arming the public-lobby poll from the harness (`pl.lobbiesInterval = setInterval(…, 1001)`)
   between MP cycles, after establishing that `Main` stops the poll at join and never restarts it.
5. The jest suite mocks every browser-facing module by factory rather than extracting anything.

### Process-review round 1 (2026-09-13, `fkit-coder` as the sprint loop's Process-review worker, same standing approval)

Ledger: `review.md`, reviewer verdict ✅ Ready to merge, 5 notes. Fixes applied **without asking**,
each verified `CORRECT`, mechanical/localized, and inside D5's "`stop()` is the one idempotent
teardown" territory — obvious winners within the plan's intent, not new design:

6. **R3** — `start()` now returns at the top `if (this.isStopped)` (`ClientGameRunner.ts:528-530`).
   Why it qualified: one line; `start()`'s only caller (`.then`, `:241-242`) runs only when `!left`,
   and no `stop()` caller can precede it (closure needs `runner !== null`, assigned one line before
   `r.start()`; crash branch needs the `worker.start` callback wired inside `start()`), so no reachable
   path changes. Test T6 added; fails with the hunk reverted, passes with it.
7. **R4** — `stopBackgroundMusic()` in `stop()` guarded by `this.isActive` (`:868-872`), i.e. only a
   runner that ran `start()` stops the music. Why it qualified: one guard; `isActive` is written only
   at `:534` (true, in `start()`) and `:875` (false, in `stop()`); the crash branch and a started
   runner's `Main.gameStop` are unchanged; the never-started `left` runner skips a call that is a
   no-op today (`SoundManager.backgroundMusic` is `[]` since 0066) and that would otherwise silence a
   join-over's already-started next game — D5(ii)'s own intent. T5 now asserts it; fails with the
   hunk reverted, passes with it.
8. **R5** — test header comment corrected (T1, T3, T4, T5 fail on HEAD; T2 passes; T6 / T5-music
   named). Comment only.

**Not applied, recorded as accepted residuals in `review.md`:** R1 (pre-existing local-only window;
fix seat is `Main.ts`/`LocalServer.ts`, outside the plan; the in-file alternative trades one leak
for another) and R2 (both `leaveGame()` calls are load-bearing; idempotence seat is
`LocalServer.endGame()`, outside the plan; neutral while `archiveEnabled()` is hard-false). Neither
is a judgment call that changes scope — both are the plan's own scope line — so no `NEEDS-DECISION`
was returned.

Gates after the round: teardown suite 7/7 · `npm test` 120 suites / 1253 tests, all passed · lint 0 ·
`tsc --noEmit` clean · prettier clean · `src/core/` diff still the 0232 baseline · `Main.ts` untouched.

## Residuals (for the record and for the producer's follow-up brief)

- **(Review R1, for the follow-up brief.)** On a **local** game (tutorial / mission SP, where
  `LocalServer.start()` awaits `buildMissionConfigIfNeeded()` before emitting `start`), a hash/Back
  leave inside that await still fires Main's `onPrestart()`/`onJoin()` (`ClientGameRunner.ts:210-217`)
  before `.then` sees `left`; the runner is torn down (worker, 5 ms turn interval via `endGame()`),
  but Main's UI hide / performance-monitor restart run once more. Remote games are unreachable
  (`killExistingSocket()` nulls `onmessage`, `Transport.ts:753`). Pre-existing on HEAD (which
  `r.start()`ed the ghost game). Fix seat: `Main.ts` (`onPrestart`/`onJoin`) or `LocalServer.start()`
  — not this task's file. Same brief as the wider in-page-leave leak below.

- **Wider per-game leak on in-page routes (owner ruled: separate brief at close, Q3).** Observed
  after this fix: the canvas node is never removed (canvases 1→2→3 across same-page games), the
  render rAF loop keeps running, Transport's 24 bus listeners per `joinLobby` stay (+24 per join,
  seen directly), `GameRenderer`/layer listeners stay (five-class 6/12/18 = 3 per renderer on
  `MouseUpEvent` and `MouseMoveEvent`), net bus growth +40–64 listeners per game. The 3rd same-page
  game can fail at `TerritoryLayer.init` (`null.id`) — the in-page leave is an unsupported route
  today, not merely a leaky one.
- **Public-lobby poll not restarted after an in-page leave** (`Main.ts:750/771` `publicLobby.stop()`;
  only `connectedCallback` starts it): the card goes stale and rejoins target dead games. Same
  brief.
- **Multiple `start` messages on one `joinLobby` transport build multiple runners; only the last is
  reachable from the closure** (plan's 0229 residual, now observed in after-1b c3 under the
  `TerritoryLayer` failure). Not fixed here.
- **0229's double-`onJoin`** unchanged, same shape as above.
- **0228's stale closure** now no-ops on the second call (latch) — behaviour-neutral, noted.
- The three `#error-modal`/desync/connection-error sites (0233) untouched.
- `Game:Abandon` still fires on exit after a crash (0232 residual), unchanged.
- The dev-lobby cascade in pre-fix 1b c2/c3 (single-line `Connected` + `starting client game`
  after reconnects) was not traced to its trigger; it is a pre-fix, polluted-page observation and
  does not recur on the fixed code except via the `TerritoryLayer` failure above.
