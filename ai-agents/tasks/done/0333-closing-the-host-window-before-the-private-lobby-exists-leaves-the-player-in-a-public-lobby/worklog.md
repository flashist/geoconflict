# 0333 — worklog

Build worker, spawned by `fkit-sprint-ship-loop` (driver `fkit-lead`), 2026-09-30. Approved plan:
`plan.md` in this folder (blob `dea5373f7dfe5acc7adfcf72b716bb9219d778dc`, re-hashed at start — matched).
Owner rulings carried: **Q1 = A** (normal leave — reuse `handleLeaveLobby()` as-is), **Q2 = A** (tooling
failure → "not run" and proceed). Nothing committed.

> **Status: built.** The one NEEDS-DECISION raised (D1: route-2 tests need a `.catch` in
> `HostLobbyModal.ts`) was answered by the owner — **add the one-line catch** (D4). All 8 new tests run.

## Step-1 code trace (plan §0) — re-confirmed on the current tree

All seven points of plan §0 hold, found by name:
- `Main.ts` Create handler: `hostModal.open(); this.publicLobby.leaveLobby();` — UI clear only.
- `PublicLobby.leaveLobby()`: sets `isLobbyHighlighted = false; currLobby = null` — no event, no stop.
- `HostLobbyModal.open()`: 0327's `generation !== this.openGeneration` guard returns before `join-lobby`;
  `createLobby(...).then(...)` has no `.catch`.
- `handleModalClose()`: `hasJoinedLobby` false ⇒ no `leave-lobby`.
- Net: Main's `gameStop` stays set; the public socket stays open.

## Live check (plan §4) — RUN, both routes, before and after

Setup: game server (`GAME_ENV=dev`, ports 3000–3002) + client via `webpack serve --port 9010` (port 9000
belongs to another project's dev server, PID 57856 — left untouched). Driven with Playwright; WebSockets
tracked by wrapping `window.WebSocket` in an init script. Route 1: `page.route` held `/api/create_game/`
for 8 s. Route 2: `page.route` answered it with HTTP 500. Dev public lobbies start ~5 s after creation, so
each run waited for the card to show a fresh lobby (≥ 4 s left), clicked it, tapped Create ~0.4 s later,
closed with ✕ ~0.25 s after that, then watched 8 s. Every process I started was stopped afterwards; the
Playwright scripts were deleted.

| Route | Before fix | After fix |
|---|---|---|
| **1 — ✕ before create answers** | **Reproduced.** Public socket `/w0` still OPEN after ✕; card un-highlighted. Server: client joined at 10:36:02.8, never left, got `prestart` 10:36:07.7 and `start` 10:36:09.7. Page logged `Closing modals` + `game started` with our clientID in `players`; a game canvas appeared. **Still connected: yes. Pulled in: yes.** | **PASS.** `leaving lobby, cancelling game` at the tap; public socket CLOSED (readyState 3) before ✕. Server: joined 10:39:56.8, disconnected 10:39:57.2 — no prestart/start for us. No canvas, no game-starting modal. **Still connected: no. Pulled in: no.** |
| **2 — create fails (500), then ✕** | **Reproduced.** `Server error response` + `Error creating lobby` logged; public socket still OPEN after ✕; server sent us `prestart`/`start` (10:36:31.7 / :33.7); pulled into the match. **Still connected: yes. Pulled in: yes.** | **PASS.** Leave at the tap, socket CLOSED before the create failed. Server: joined 10:40:15.9, disconnected 10:40:16.3. **Still connected: no. Pulled in: no.** |
| **Happy path (0327)** — in public lobby → Create → lobby created → joined → ✕ | not run before (not a bug route) | **PASS.** One public leave at the tap (socket closed); private lobby `vgTTB2Vn` joined on a new socket; ✕ → exactly one more `leaving lobby` and the private socket closed. Two leaves total, one per lobby. |

Not live-checked: route 3 (create fails, window left open) — covered by the logic of route 2 (the leave
happens at the tap, before the create outcome is known) and by jsdom test 3 (parked, D1).

## Build (plan §2)

- **New `src/client/HostLobbyOpen.ts`** — `openHostLobbyFromStartScreen(deps)`: if `isInLobby()` →
  `leaveLobby()`; then `clearPublicLobbyHighlight()`; then `openHostModal()`. As in plan §2a.
- **`src/client/Main.ts`** — Create handler only, plus the import. Wires `isInLobby: gameStop !== null`,
  `leaveLobby: void this.handleLeaveLobby()` (Q1 = A: the normal leave, unchanged), highlight clear,
  `hostModal.open()`. The Q1-option-B quiet variant was **not** built.
- **`src/client/HostLobbyModal.ts`** — per the owner ruling (D4) only: in `open()`, the
  `createLobby(...).then(...)` chain is kept in a `const joined` and followed by
  `joined.catch(() => {});` with a "Task 0333" comment. +4 / −1 lines; the `.then` body is unchanged.
  Nothing else in the file.
- **Not touched:** `Transport.ts`, `src/core/`, server, text, HTML, analytics.

## Tests (plan §3) — red, then green

New `tests/client/HostLobbyOpen.test.ts` (jsdom, REAL `o-modal` + REAL `HostLobbyModal`, a harness copy of
Main's `gameStop` / `handleLeaveLobby` gate / `handleJoinLobby` stop-then-replace — disclosed in the file
header, as 0327's test (h) did).

**First red/green pass (before D4), superseded:** tests 2 and 3 were parked as `it.skip` → red 3 failed /
3 passed / 2 skipped; green 6 passed / 2 skipped. An evidence-only run with a temporary `.catch` (reverted,
byte-identity checked) showed 5 failed → 8 passed. Kept here for the record only.

**Red run (final)** — `.catch` present in `HostLobbyModal.ts`, tests 2 and 3 un-skipped, against the
behaviour-preserving extraction of today's handler (`openHostModal(); clearPublicLobbyHighlight();`, no
leave) swapped into `HostLobbyOpen.ts` for the run and then restored (hash checked). ⚠️ The red run is
against that extraction, **not** against Main itself (Main's `Client` cannot run in jest).
```
✕ 1. in a public lobby, ✕ before create answers …
✕ 2. in a public lobby, create fails, then ✕ …
✕ 3. in a public lobby, create fails and the window stays open …
✓ 4a. not in any lobby, tap then ✕: no leave at all
✓ 4b. not in any lobby, create answers then ✕: only 0327's one private leave
✓ 5. 0327 regression: … one public stop, one private stop, one leave-lobby
✕ 6a. in a lobby: leaves before the host window opens …
✕ 6b. not in a lobby: no leave; highlight still cleared, window opened
Tests: 5 failed, 3 passed, 8 total
```
(6b is red today only on order — today opens the window before clearing the highlight.)

**Green run (final)** — with the fix:
```
✓ 1, ✓ 2, ✓ 3, ✓ 4a, ✓ 4b, ✓ 5, ✓ 6a, ✓ 6b
Tests: 8 passed, 8 total
```

**Other checks:**
- `npx jest tests/client/HostLobbyModalLeave.test.ts tests/client/JoinPrivateLobbyModalLeave.test.ts tests/client/HostLobbyModalUrl.test.ts`
  → 3 suites, 36 tests, all pass (0327's tests unchanged and green; re-run after the D4 catch).
- `npx tsc --noEmit -p tsconfig.json` → exit 0.
- `npm run lint` (eslint) → exit 0. `prettier --check` on the four touched source/test files → clean.
  (All three re-run after D4.)
- Full `npm test` → **not run here**; the driver's separate Verify step runs it.

## Residuals (plan §5) — recorded, not fixed

- **0228's window:** a Create tap while a public join is still in its setup awaits (`gameStop` still null)
  clears the highlight but cannot leave; the join then completes with the card un-highlighted. Sub-second.
- **Orphan private lobby** (created, never joined) — unchanged; `0335` case 3.
- **Unhandled rejection on `createLobby` failure** — pre-existing; **now fixed by the D4 catch** (owner
  ruling). The live check ran before the catch was added. Not re-run live after it; the change only adds a
  handler to a chain whose result nothing reads, and the jsdom failure-route tests exercise it.
- **Popups at the tap** (Q1 = A): a waiting 0303 restart offer or a delayed citizenship-card reveal can now
  fire as the host window opens. Tenure-popup part → `0336`. Not observed in the live runs (nothing was
  pending).

## Decision log

- **D1 — NEEDS-DECISION raised: route-2 jsdom tests cannot run without touching `HostLobbyModal.ts`.**
  Plan §3 said: "the test tolerates it (spy `console.error`). If jest fails on it, the worker returns
  NEEDS-DECISION rather than adding a `.catch` to `HostLobbyModal.ts`." Jest does fail: a failed
  `createLobby` rejects inside `open()`'s `.then` chain, Node treats the unhandled rejection as fatal and
  kills the jest process (`[Error: HTTP error! status: 500]`, whole file dies). A test-side
  `process.on("unhandledRejection")` was tried and does **not** work: in a jest test `process` is jest's
  deep copy (`jest-util/build/createProcessObject.js`), so the listener never reaches the real process.
  (Side note, not acted on and **not verified per file**: the repo's existing
  `process.on("unhandledRejection")` guards in `tests/server/GameServer*.test.ts` and
  `tests/core/worker/WorkerWorkerInitFailure.test.ts` are probably inert as listeners for the same reason —
  a real rejection there would still fail the run, by crashing it.)
  Current state: tests 2 and 3 are written and parked as `it.skip` with a comment naming this decision;
  nothing added to `HostLobbyModal.ts`.
- **D2 — obvious-winner, within plan intent: temporary `.catch` experiment for evidence.** To give the
  decision real numbers, `HostLobbyModal.ts` was edited for two test runs only and restored from a copy;
  byte-identity verified with `git hash-object` before and after. Qualifies because it changes nothing in
  the tree and answers "would tests 2/3 be red before / green after" directly.
- **D3 — live check scripted with DOM `.click()` and an init-script WebSocket wrapper**, not Playwright
  pointer clicks: the 5 s dev lobby lifetime left no room for Playwright's actionability waits (the first
  attempt was pulled into the match before Create could be tapped). Reconnect-session keys were cleared
  between runs (0347 saves one at match start, which otherwise shows the reconnect modal on reload).
- **D4 — OWNER RULING on D1 (2026-09-30, given live via `AskUserQuestion` in the `fkit lead` session,
  relayed by `fkit-lead` / `fkit-sprint-ship-loop`): option 1, "Add the one-line catch".** Owner-approved
  in-scope addition to the approved plan. Applied: `open()` keeps the chain in `const joined` and adds
  `joined.catch(() => {});` with a "Task 0333" comment. **Chose a swallowing catch, not a logging one**:
  `createLobby()` already logs the failure (`console.error("Error creating lobby:", …)`) before it
  rethrows, so a second log would only duplicate it. **Chose the separate-statement form, not a chained
  `.then(...).catch(...)`**: with the chained form Prettier re-indents the whole `.then` body (a ~25-line
  diff in 0334's file); the separate statement is a 4-line diff and leaves the 0327 guard's lines as they
  were. Side effect, accepted: an exception thrown inside the `.then` callback is now swallowed too
  (it only calls `dispatchEvent`, whose listener errors do not propagate into it). Tests 2 and 3 un-skipped;
  the parking comment removed.
- **Note for `0334`'s planner:** `HostLobbyModal.open()` now carries this catch (`const joined = createLobby
  (...).then(...)` + `joined.catch(() => {})`, around the 0327 generation guard). Build on it; do not remove
  it — without it a failed create is an unhandled rejection in the browser, and
  `tests/client/HostLobbyOpen.test.ts` tests 2 and 3 crash the jest process.
- **Fixes applied without per-fix approval:** none (this was a build, not a review round).

## Verify

Verify worker (`fkit-coder`), spawned by `fkit-sprint-ship-loop` (driver `fkit-lead`), 2026-09-30.
Verify only — no source or test edits. Tree as built, **with the D4 catch in place**; `0347`/`0348`/`0035`
also uncommitted in the tree (expected). Node `v24.13.0`. Nothing committed.

**Result: PASS.** One pre-existing defect observed (below) — not caused by this change, not fixed.

### Automated
- **Full `npm test`: 184/184 suites passed, 3269/3269 tests passed, 0 skipped, exit 0** (56.8 s). First
  run — no flake, no re-run. `tests/client/HostLobbyOpen.test.ts`, `HostLobbyModalLeave.test.ts`,
  `HostLobbyModalUrl.test.ts` and `tests/scripts/ShellHarnesses.test.ts` all PASS.
- **`npm run lint`: exit 0**, no output.

### Live (Playwright, headless Chromium, catch in place)
Setup: `GAME_ENV=dev` game server on 3000–3002 and `webpack serve --port 9010` (all three ports checked
free first; port 9000 is another project's dev server, PID 57856 — not touched, still running at the end).
A fresh browser context per run, with `tutorialCompleted` preset (otherwise a new context auto-starts the
solo tutorial). WebSockets tracked by wrapping `window.WebSocket`; uncaught rejections tracked two ways:
an `unhandledrejection` listener **and** Playwright `pageerror` (both proven to fire with a probe
`Promise.reject` first). Create tapped only after Main logged `Joined game lobby <id>` (i.e. `gameStop` is
set), ~0.1 s later. All processes I started were stopped; scripts left only in my scratchpad.

| Check | Result | Evidence |
|---|---|---|
| **(a) route 2** — create answers 500 → ✕ | **PASS** | `leaving lobby, cancelling game` at the tap; public socket `/w0` readyState 3 right after the tap (before ✕). Server: client joined 11:06:50.319, disconnected 11:06:50.468; no prestart/start to us. No `lobby: game started`. **Uncaught rejections: 0 (listener) / 0 (`pageerror`)** — the create failure is only logged (`Error creating lobby: … 500`). |
| **(b) route 3** — create fails, window left open, public lobby starts | **PASS** (not pulled in) | Leave at the tap; public socket closed. Server: joined 11:07:18.899, disconnected 11:07:19.047. Watched ~9 s past the lobby's start: no `game started`, no `Closing modals`; host window still open. ⚠️ See the pre-existing defect below — 9 `Uncaught (in promise)` page errors, **not** from the create failure. |
| **(c) 0327 happy path** — create → joined → ✕ | **PASS** | Public disconnect at 11:08:01.836, **then** private game `yztqAAp1` created at 11:08:01.849 (leave before the create request). Private join logged without `stopping existing game` (nothing left to stop). ✕ → exactly one more `leaving lobby`; private socket closed; server disconnect 11:08:02.395. Two leaves total, one per lobby. 0 page errors. |

### Observed — pre-existing, not caused by 0333, not fixed
- **`HostLobbyModal.pollPlayers()` throws an uncaught rejection every second while the window is open and
  no lobby exists.** It polls `/w0/api/game/` with an empty `lobbyId`; the dev server answers with the
  HTML page; `response.json()` rejects (`SyntaxError: Unexpected token '<'`) and the chain has no catch.
  **Control run** (not in any lobby — the new handler takes the same path as the old one — create 500,
  window open 4.2 s): 4 polls, 4 identical page errors. So it predates this change. What 0333 changes: on
  route 3 the player is no longer pulled into the match (which used to close the window and stop the
  poll), so the errors now continue until the player closes the window. Candidate for a follow-up task
  (next to 0334, which owns `HostLobbyModal.ts`).
- **Residual "0228's window" reproduced live, as recorded in plan §5.** My first route-2 attempt tapped
  Create ~10 ms after the card click, before the public join finished its setup (`gameStop` still null):
  no leave happened, the create failed, and the player was pulled into the public match. That run was a
  timing error in my script, not a failure of the fix — it is exactly the documented sub-second residual,
  now confirmed observable.

### Fixes applied without per-fix approval
none (verify only).

## Process review — round 1

Process-review worker (`fkit-coder`), spawned by `fkit-sprint-ship-loop` (driver `fkit-lead`), 2026-09-30,
under the approved plan + the D4 owner ruling as standing approval. Ledger: `review.md` in this folder. No
ADR in `ai-agents/knowledge-base/decisions/` covers this scope; ledger had no accepted residuals before this
round, so nothing was closeout. Nothing committed.

- **R1** (both passes, low) — **CORRECT**, verified; my severity: low. Fixed; one residual recorded (below).

### Decision log

- **D5 — fix applied without per-fix approval: R1, move the config await inside `createLobby()`'s `try`.**
  Answers R1's defect part: `getServerConfigFromClient()` sat above the `try` in `createLobby()`
  (`src/client/HostLobbyModal.ts`), so a config-fetch failure skipped `console.error("Error creating
  lobby:", …)` and was then swallowed by D4's `joined.catch(() => {})` — logged by nothing, and the catch's
  comment ("already logged in createLobby()") was false for it. Changed: the one `await` line moved inside the
  `try`, with a 2-line "Task 0333 review R1" comment; `open()` and the catch are untouched. Qualifies:
  verified `CORRECT`; mechanical/localized (one line moved, 7+/2− total on the file's diff, `createLobby` has
  one caller); inside the approved plan as extended by the D4 ruling (the spawn named this exact fix as in
  scope). Behaviour change is only that a config failure is now logged before the same rethrow. Chosen over
  a logging catch (would double-log every HTTP failure) and over only fixing the comment (would leave the
  silent path). Test: new `3b` in `tests/client/HostLobbyOpen.test.ts` — config rejects → `console.error`
  called with `"Error creating lobby:"` and the error, no create request, public connection still stopped once.
  Red against the old placement (temporarily restored, hash-checked back: `1 failed, 8 passed`), green after
  (`9 passed`).
- **D6 — obvious-winner call, within intent: R1's telemetry part recorded as a residual, not changed.**
  Any catch — swallow or log, both inside the D4 ruling — ends the global `unhandledrejection` reports (GA
  DEBUG event, OTEL span) for a failed create. That is the ruling's own cost, not a defect in it; restoring a
  GA event would need a new `flashist_logErrorToAnalytics` call nobody asked for. Recorded in `review.md`
  *Accepted residuals* as "create-failure no longer an unhandled rejection". ⚠️ Flagged to the driver for
  the owner to confirm or overturn.

### Checks
- `npx jest tests/client/HostLobbyOpen.test.ts tests/client/HostLobbyModalLeave.test.ts tests/client/JoinPrivateLobbyModalLeave.test.ts tests/client/HostLobbyModalUrl.test.ts`
  → 4 suites, 45/45 pass.
- `npm run lint` → exit 0. `npx tsc --noEmit -p tsconfig.json` → exit 0. `prettier --check` on the four
  touched source/test files → clean (Prettier re-wrapped the new test once).
- Full `npm test` → not run by this worker (the driver's verify step runs it).

### Residuals added this round
- **create-failure no longer an unhandled rejection** — see `review.md` *Accepted residuals*.
- **`pollPlayers()` empty-lobbyId `SyntaxError` spam** (observed in Verify) — owner ruled 2026-09-30: file a
  follow-up task; the closing producer files it. Not fixed here.
