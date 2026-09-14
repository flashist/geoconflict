# Worklog — 0233: the three `showErrorModal` sites that stop nothing

Build step of `/fkit-sprint-ship-loop`, 2026-09-13, by a spawned `fkit-coder` under the driver's
declared-approval marker (plan approved by the owner via `AskUserQuestion` in the lead session,
`plan.md` blob `ab8d60f`). No commits, no wiki writes, no task-file moves.

## Result in one line

**Sites 1 and 3 fixed** (`src/client/ClientGameRunner.ts`, +13 lines, two call sites of the
existing teardown); **site 2 dropped** by owner ruling Q2 and measurement (the game keeps running);
jest T7–T9 added; every number below was observed in a real browser, before and after.

## Environment (same recipe as 0231/0232)

Dev game server (`GAME_ENV=dev node --loader ts-node/esm … src/server/Server.ts`) + `webpack serve
--node-env development`, both as background processes; ports 3000/3001/3002/9000 were free before
start. Browser: Playwright MCP (Chromium, 1200×629). MP = dev public lobby "Join next Game"
(AI fill, starts a few seconds after joining). Kick trigger: `POST /api/kick_player/<gameID>/<clientID>`
on the master (`:3000`) with the dev admin header — the second-tab kick is prod-only
(`GameServer.ts:231-248`), the message and client path are identical.

**Instrument** (Playwright `addInitScript`, never in `src/`): wraps `setInterval`/`clearInterval`
(live set keyed by period), the `WebSocket` and `Worker` constructors (count + timestamp), and
captures matching console lines (`Performance:*`, `No message from server for`, `Connected to game
server!`, `WebSocket closed. Code:`, `on stop: leaving game`, `joining lobby:`, `starting game!`).
**One temporary source edit, 0227 precedent:** `PerformanceMonitor.SAMPLE_INTERVAL_MS` 300 s → 3 s,
tagged `TEMP-0233`; for 3b a `TEMP-0233` 10 s delay before `worker.initialize()`. **Both reverted**:
`git diff --stat src/client/PerformanceMonitor.ts` empty, `git diff --stat src/core/` empty,
`grep -rn TEMP-0233 src tests` empty.

All times are the page's `performance.now()` in ms, rounded. "Monitor live" = a 3000 ms interval
in the live set (the monitor's, under the TEMP sample interval). "Runner live" = the runner's
1000 ms connection-check interval (armed 20 s after `start()`). The 60 s window starts at the
kick/modal.

## Step 1 — per-site measurement, BEFORE the fix (observed)

| Site | Game | Modal at | (a) monitor live at modal | (b) `Performance:*` lines in 60 s | (c) sockets opened after modal | (d) runner 1000 ms live | (e) what stopped it |
|---|---|---|---|---|---|---|---|
| **1** kick, MP, 40 s into the game | `4KaxSrwQ` | 51100 (`WebSocket closed. Code: 1000, Reason: Kicked from game`) | **yes** | **66** (22 samples × 3 events, every 3 s; 60 inside a strict 60 s window) | **11** — at 56846, 62846, 68846, 74847, 80843, 85847, 91846, 96847, 102847, 108846, 114846 (`No message from server for ~5–6 s, reconnecting` → `Connected to game server!` each time) | yes | **nothing** in 67 s — including after the server ended the game at 69748 |
| **2** desync, MP, two contexts | `DscHJZ1i` (A `JgmAX6Sf`, B `dpcL9eZG` with 171 rewritten hashes) | modal present at the 124023 / 123791 read (see caveat) | **yes** (both) | **60** (21 samples) in both contexts | **0** (both) | yes (both) | nothing — **the game continued**: no `No message from server` line in 60 s with the check live, no `game has ended` close |
| **3a** kick before `start` | `yCq224SP` | 3473, kick at 3461 (`start` never arrived) | **no** | **0** | **0** | no (runner never built; workers created 0) | n/a — only the lobby transport's 5000 ms ping interval stayed live |
| **3b** kick in the build window (10 s TEMP delay) | `E94ypnMz` | 6992, kick 4 ms after the monitor interval appeared (6984), runner null | **yes** | **60** (20 samples) | **7** — 17297 (the pending runner started and rejoined, refused silently), then 38141, 44141, 50137, 55137, 60141, 66137 (its check armed at 37136) | yes from 37136 | **nothing** in 61 s — including after the server ended the game at 35005 |

Caveats, said plainly:
- **Site 2's modal time is bounded, not pinned.** `showErrorModal` logs nothing for a desync, so the
  modal was detected at the read after the 120 s poll deadline; it appeared somewhere between game
  start (~9 s) and that read. The 60 s window is measured from the read.
- **Two of the plan's code-reasoned expectations were wrong, corrected by observation:**
  (1) at 3a there is **no** socket churn — `startPing` only sends when the socket is `OPEN`
  (`Transport.ts:270`), so the ping loop never reaches `sendMsg`'s reconnect branch; (2) the
  `WebSocket closed. Code: 1000` line does not appear after the fix at site 1 because `stop()`'s
  `killExistingSocket()` nulls `onclose` before the close frame lands (plan edge 1, observed).
- The 1000 ms interval seen at page load (id 12 at 170 ms) is **not** the runner's — the runner's
  is created ≥20 s after `start()`; the table's column (d) uses creation time to tell them apart.

## Seam question — answered (brief step 2)

**0227's `onGameEnd` is reused; no new seam.** Site 1 reaches it through `stop()`
(`ClientGameRunner.ts` `stop()` calls `this.onGameEnd()` last); site 3 has it in scope as
`joinLobby`'s 5th parameter, exactly like 0227's two direct calls in the `.then`/`.catch`.
`Main.gameStop` is neither nulled nor re-driven — the same shape 0227/0231 sanctioned for the
crash branch. A later `handleLeaveLobby`/`handleJoinLobby`/`beforeunload` still calls
`gameStop()` → `runner.stop()` latched no-op / `transport.leaveGame()` idempotent (T9 pins the
site-3 case: `gameStop()` after the error does not throw and calls `leaveGame` a second time).
Generation guard: every measurement was on the current game (the one owning the monitor), so the
guard passed; `Main.stopPerformanceMonitor` is idempotent (`perfMonitorStop?.(); = null`), which
3b relies on (`onGameEnd` fires from the fix and again from the pending runner's `r.stop()`).

## Teardown depth — per site, in writing (brief step 3)

- **Site 1 — full `this.stop()` after the modal** (Q1, plan recommendation). The server closes the
  socket (1000) right after the `error` and refuses a rejoin silently (`GameServer.ts:196-201`), so
  the game cannot continue; monitor-only would have left the observed reconnect-every-5-s loop, which
  the before-numbers show is the larger half (11 sockets vs 22 monitor samples in the same window).
- **Site 2 — no teardown** (owner ruling Q2, and the measurement agrees: turns keep arriving, 0 socket
  churn; monitor lifetime = game lifetime). **Dropped with that reason.** T8 pins it so a later
  "fix" cannot silently tear down a live game.
- **Site 3 — the 3-line fix** `left = true; transport.leaveGame(); onGameEnd();` (owner ruling Q3:
  conditional on step 1 showing a live monitor in the build window — **3b showed exactly that**:
  monitor live, 60 `Performance:*` lines, 7 sockets, nothing stopping it). `runner === null` is an
  invariant here (`r.start()` swaps the transport's `onmessage`), stated in the comment, not
  branched on. For 3a the same lines are a no-op for the monitor (none runs) and additionally clear
  the lobby transport's ping interval.
- **Nothing re-drives `Main.gameStop`**, so 0227's safety argument is not needed.

## Implementation

`src/client/ClientGameRunner.ts` only (+13): D1 in the runner's `onmessage` `error` branch
(`this.stop()` after the modal, modal-then-stop like the crash branch); D3 in `joinLobby`'s
`error` branch. `Main.ts`, `Transport.ts`, `src/core/`, the worker-init `catch`, and 0227's folder
untouched. `git diff --stat src/core/` empty.

## Step 5 — re-measured by the same method, AFTER the fix (observed)

| Site | Game | Kick at | Monitor live at modal (+1.5 s) | `Performance:*` in 60 s | Sockets after | Runner / ping live after 60 s | Other |
|---|---|---|---|---|---|---|---|
| **1** | `k9aaeTVV` | 36330 | **no** (was yes) | **0** (was 66) | **0** (was 11) | no / no (was yes / yes) | `on stop: leaving game` at 36336, 6 ms after the kick; game worker terminated; modal still shown |
| **3a** | `d7oHcvHo` | 3453 | no (never was) | 0 (was 0) | 0 (was 0) | no / **no** (ping was live before) | `on stop: leaving game` at 3456; modal still shown |
| **3b** | `2gveSsdP` | 6561 (monitor had just started) | **no** (was yes) | **0** (was 60) | **0** (was 7) | no / no | the pending runner was built after the delay and torn down by 0231's `left` branch (worker created 1, terminated 1), never started; modal still shown |
| **2** | — | — | not re-measured: no change made (owner ruling Q2) | | | | |

## Verification 6 — a normal game still plays; a recoverable condition does not tear down (observed)

- **MP**: join `RhsnS1fo` → game started at 10546 → played; **~6 s offline via CDP
  (`Network.emulateNetworkConditions`) at ~35.5 s, restored at ~41.5 s** → `No message from server
  for 5685 ms, reconnecting` at 41473 → a burst of `WebSocket closed. Code: 1006` / `reconnecting`
  (21 sockets between 41484 and 41807, while still offline) → `Connected to game server!` +
  `starting game!` at 41810 (rejoin with catch-up). **No `error`, no modal, no `on stop`; monitor
  (id 26) and runner interval still live afterwards.** Then the shipped sidebar exit
  (`game-right-sidebar` exit icon) → full navigation (fresh page, `reconnect-session` cleared, no
  canvas) → "Join next Game" again → `FMCxxQbH` started with a fresh monitor (id 24), no modal.
- **SP**: Singleplayer → Custom Game → Start → `AddXRxoG` started (local server, 1 socket, fresh
  monitor id 100, canvas), played 20 s, sidebar exit → fresh page with "Join next Game" visible.
  ⚠️ **Map caveat:** the picker exposed no "Faroe" text to the script, so this ran on the
  **default custom-game map, not Faroe Islands** as the plan's recipe said.
- **Observation, not this task's:** Transport's reconnect on close code 1006 has no backoff — 21
  sockets in ~330 ms while offline. Pre-existing, `Transport.ts` is 0252 territory; recorded, not
  fixed.

## Tests

`tests/client/ClientGameRunnerTeardown.test.ts`, new `describe("ClientGameRunner server-error
sites (task 0233)")`, file stays on the node environment, `document` stubbed as
`{ querySelector: () => ({}) }` (truthy ⇒ `showErrorModal` returns before touching the DOM);
0231's T1–T6 unchanged. Transport mock now records instances (`__instances`) with `connect`/
`leaveGame`/`joinGame`/`reconnect` fns; the worker mock gained `sendTurn`.
- **T7** (site 1): `error` → `worker.cleanup` ×1, `leaveGame` ×1, `onGameEnd` ×1, five listeners
  gone, no `reconnect` in 60 s; a second `error` → still ×1.
- **T8** (site 2): `start` + `desync` → nothing torn down; a following `turn` reaches
  `worker.sendTurn`.
- **T9** (site 3): `joinLobby` + `error` → `leaveGame` ×1, `onGameEnd` ×1; the returned
  `gameStop()` does not throw and calls `leaveGame` again, `onGameEnd` still ×1.
- **Negative check:** against the HEAD runner, **T7 and T9 fail, T8 passes** (T8 is a guard on the
  ruling, by design). 3b's `left`-flag path is browser-only (`createClientGame` needs
  terrain/worker/renderer) — verified above, not in jest.

Gates: `npm test` 121 suites / 1264 tests green (35.7 s — the shell harnesses ran); `npm run lint`
clean; `npx tsc --noEmit` exit 0; prettier clean on both files.

## Dropped / not fixed, with reasons

- **Site 2 (desync): dropped.** Owner ruling Q2; measured: the game continues (turns keep arriving,
  0 socket churn), so the monitor running is correct. T8 pins it.
- After a kick the **canvas keeps painting the frozen frame and Transport's bus listeners stay** —
  0252's, on every route; not fixed here.

## Residuals (for the producer)

1. **Reconnect-session after a kick** (plan edge 4, **seen for real** during this build): a kicked
   game leaves `reconnect-session` in localStorage, so a reload/return offers "Rejoin" for a game the
   server refuses silently — the `<reconnect-modal>` intercepted the whole page on one attempt here.
   `clearReconnectSession()` is not called on the `error` path. Pre-existing; not in this task's
   plan. Suggest a small follow-up.
2. **1002 `reconnect-failed` after `stop()` at site 1** (plan edge 1): `killExistingSocket()` nulls
   `onclose`, so a malformed-message 1002 close no longer dispatches `reconnect-failed`; matters only
   with an active `ReconnectModal` rejoin. Accepted edge; fixing it touches `Transport` (0252).
3. **No-backoff 1006 reconnect loop while offline** (21 sockets/330 ms) — observed under criterion 6,
   pre-existing, `Transport.ts`.
4. **`beforeunload` still logs `GAME_ABANDON` for a kicked game** — pre-existing, unchanged.
5. Music stops on a kick now (`stop()` behind `isActive`) — new and intended; noted for the reviewer.

## 0252 collision note

This diff shifts `ClientGameRunner.ts` by +10 lines below the lobby `error` branch (`:253`→) and
+3 more below the runner's `error` branch (`:781`→). 0252's citations were declared against an
older frame already; this task adds call sites of the existing `stop()`/`onGameEnd()` inside
`ClientGameRunner.ts` only and touches none of 0252's files (`Main.ts`, `GameRenderer`,
`Transport.ts`).

## Decision log (ADR-019/ADR-032 audit)

- **D1 (site 1 `this.stop()`)** — in the approved plan (Q1 recommendation stood). Applied.
- **D3 (site 3 three-line fix)** — in the approved plan under owner ruling Q3 (b), conditional on
  step 1; 3b's before-numbers (monitor live, 60 lines, 7 sockets) met the condition. Applied.
- **D2 (site 2)** — no change, owner ruling Q2.
- **Jest placement** — Q4 recommendation (new `describe` in the existing file, `document` stub).
- **Fixes applied outside the plan / obvious-winner calls: none.**

### Process-review round 1 (2026-09-14, spawned Process-review worker, standing approval + owner rulings relayed by the driver)
- **R1 → comments only** (owner ruling: accept as residual + fix the comments). D3 comment
  (`ClientGameRunner.ts:263-268`) and D1 comment (`:791-795`) rewritten: a kick (1000) refuses a
  rejoin; a 1002 schema close is treated as terminal *by choice*, pointer to `review.md` R1. Qualified:
  owner-ruled, verified CORRECT (`GameServer.ts:314-327` never adds a 1002 client to `kickedClients`;
  HEAD's runner check rejoined), comment-only. Residual recorded in the ledger. No code widened.
- **R2, R3 → no code**, residuals recorded (owner ruling). Verified: `showErrorModal` dedupe at `:1241`
  is pre-existing; 3b's double `onGameEnd()` is neutral (Main generation guard + idempotent stop).
- **R4 → test fix** (owner ruling: fix title/comment; keep-or-drop `sendTurn`, say which). T8 retitled
  to name the three negatives as the pin; comment explains why `sendTurn` cannot be one (turn branch
  `:796-810` has no stop guard; the mock bypasses `killExistingSocket()`). **Dropped** the `turn` feed,
  the `sendTurn` assertion and the `sendTurn` worker-mock fn: a line that still passes under a wrong
  teardown reads as a pin it is not, and it covered nothing the negatives do not. Qualified:
  owner-ruled, verified CORRECT, test-only, in-plan (§5 T8).
- **Fixes applied without asking outside these rulings / obvious-winner calls: none.**
- Gates after: single file 10/10, lint clean, `tsc --noEmit` exit 0, prettier clean, `src/core/` diff
  empty, `TEMP-0233` grep empty. Full `npm test`: 121 suites / 1264 tests green, 33.7 s (shell harnesses ran; no skip, no SIGSEGV).
- **Deviations from the plan's recipe, recorded not decided:** SP ran on the default custom map
  (Faroe Islands not selectable by the script); site 2's modal time is bounded, not pinned; the plan's
  ping-churn expectation at 3a was refuted by observation (see caveats).

## Working tree

Changed by this task: `src/client/ClientGameRunner.ts` (+17), `tests/client/ClientGameRunnerTeardown.test.ts`
(+132/−9 after the R4 fix). The uncommitted 0220/0221 files and the new Backlog briefs were not touched.
`.playwright-mcp/` (Playwright's log dir) sits in the repo root and is gitignored.
