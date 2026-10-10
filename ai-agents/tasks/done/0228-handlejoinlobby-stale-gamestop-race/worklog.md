# 0228 — worklog

**Coder:** fkit-coder, spawned as the **Build worker** of `fkit-sprint-ship-loop` (driver: `fkit-lead`, Sprint 8).
**Date:** 2026-10-09
**Approved plan:** `plan.md` in this folder (blob `9ada7d7e5bd25dda515fe6703cbdd00b4596aa02`), approved by the
owner live via `AskUserQuestion` in the driver session. **Owner ruling on the plan's open question 1 (same day):**
a repro with normal, real UI clicks on a browser-slowed network counts as the real repro the 2026-10-03 rule asks
for; a console-dispatched event (S4) does not count on its own.
**Committed?** No. Nothing committed, nothing pushed, no task file moved, no wiki write.
**Working tree at start:** uncommitted edits from closed tasks `0415` / `0423` / `0425` (incl. `0415` hunks in
`src/client/Main.ts`). Left untouched.

---

## §1 — Comment fix R6 / R6b (done)

`src/client/Main.ts`, the comments above the `joinGeneration` and `monitorGeneration` fields:

- **R6:** `joinGeneration` is now described as the join-mint counter, and the comment says it does NOT say who
  owns the live monitor — `monitorGeneration` does.
- **R6b:** the stale `(Main.ts:707)` citation is replaced by a name (see the phase-2 section for where that
  await ended up).
- No field, guard or behaviour change in this step.

---

## §2 — Phase 1: reproduction. **Outcome: REPRODUCED** (written before any phase-2 source change)

### Setup

- `npm run dev`'s two halves started by hand **without `--open`** (`webpack serve --node-env development` +
  `npm run start:server-dev`, `GAME_ENV=dev`). Ports 9000 / 3001 / 3002 were free first.
- Browser: **headless Chromium driven by the repo's own `playwright` package** (a Node script in the session
  scratchpad, not committed). Nothing opened on the owner's screen.
- Each player is a fresh browser context with `localStorage.tutorialCompleted` set (otherwise a first-time
  player is auto-sent into the tutorial). Private-lobby host = a second, separate context.
- **Every player action is a real UI click or key press** through Playwright's input pipeline
  (`locator.click()`, `keyboard.press("Escape")`). The lobby code is typed into the Join window's box. **No
  `join-lobby` / `leave-lobby` event was dispatched by script. S4 was not needed and not run.**
- **Network slowdown:** Chrome's own emulation over CDP, `Network.emulateNetworkConditions`, DevTools
  "Slow 3G" preset values (2000 ms latency, ~400 kbit/s each way), switched on **only on the acting player's
  page, just before the first click**, and off again afterwards. One variant also tried "Fast 3G".
- Evidence read per try: the page's console (`joining lobby …`, `leaving lobby, cancelling game`,
  `joining lobby, stopping existing game`, `joining lobby: gameID …, clientID …` from `ClientGameRunner`,
  `Joined game lobby …`), game WebSocket open/close and the `join` frame sent on it (with its clientID), the
  server's own lobby list (`GET /api/game/<id>` on the worker, `clients[].clientID`), and the host window's
  player list. Screenshots kept in the scratchpad.

### The one finding that decides the window size — the `/cosmetics.json` browser cache

- The first try runs (Slow 3G, page freshly loaded) did **not** reproduce: `fetchCosmetics()` was answered
  from the **browser's HTTP cache** (the start screen fetched it at load), so the second of the three awaits
  took a few ms and the window was tiny — slowing the network does not slow a cache hit.
- `/cosmetics.json` is served with `Cache-Control: public, max-age=300` (`src/server/Master.ts:726-730`, seen
  on the dev response). In production nginx's `location /` (`nginx.conf`) passes it through without its own
  cache header, so **the same 5-minute lifetime very likely applies in production** (read from the config,
  not checked against a live response).
- ⇒ **A player who has been on the start screen for more than 5 minutes** has a stale copy; the next join
  must re-check it over the network (one full round trip), and **that is when the window is wide.**
- So the counted runs below idle on the start screen for **310 s** first (no network change during the
  idle), then switch on Slow 3G and click. **The cache state is the natural one; only the network is
  slowed.** I did **not** use DevTools' "Disable cache" for the counted runs (it was tried once as a side
  variant, see the table at the end; it reproduces S2 3/3 too, but it is a further artificial step).

### Counted results — **slowed network (Slow 3G), normal clicks, natural cache state** — 9 of 9 reproduced

| # | Steps (exact) | Tries | Reproduced? | What was seen |
|---|---|---|---|---|
| **S1** public card join, then leave | Load page, idle 310 s on the Multiplayer tab. Slow 3G on. **Click the "Join next Game" card**, wait 1000 ms (past its 750 ms debounce), **click the card again** (leave). Wait 12 s. Slow 3G off. | 3 | **3 / 3** | The leave click was **silently dropped**: no `leaving lobby, cancelling game` line. ~1 s after the leave click, `joining lobby: gameID …` ran, a game WebSocket opened and sent `join` with our clientID, then `lobby: game started` — **the player who had clicked "leave" was put into the match.** The card showed "not joined" (`isLobbyHighlighted=false`, `currLobby=null`); the server's lobby listed our clientID. |
| **S2** private Join, double-tap | Host (2nd context) opens the Private tab and clicks **Create**. Joiner: idle 310 s, open the Private tab, click **Join lobby**, type the code, Slow 3G on, **tap Join, tap Join again 150 ms later** (a human double-tap). Wait 12 s. | 3 | **3 / 3** | Two `Joining lobby with ID` lookups; then **two `joining lobby <id>` from `Main`, ~2 s apart, the second arriving while the first was still in its awaits** — neither logged `stopping existing game`. Both reached `joinLobby()`: **two game WebSockets, two `join` frames with two different clientIDs. The server's lobby and the host's window list the joiner TWICE** (3 players: host + joiner × 2). The first join's stopper was overwritten, so that transport is never closed by the client. |
| **S3** private Join, then close | Same host setup. Joiner: idle 310 s, open Join window, type code, Slow 3G on, **tap Join**, and as soon as the window shows "joined, waiting" **press Escape**. Wait 12 s. | 3 | **3 / 3** | The window closed (`o-modal` reports closed), and its `leave-lobby` was dropped (no `leaving lobby` line). ~2 s later the join completed anyway: WebSocket opened, `join` sent. **The joiner is in the host's player list with the window closed** — `0335` case 1, now observed, not just reasoned. |

Raw per-try logs (all nine): S1 joined lobbies `DACY1NB7`, `A5bGGo1F` (×2); S2 lobbies `HDBQZ5C3`,
`SXEQP8RY`, `FNR7XAA4`; S3 lobbies `J4HQR4V4`, `VJJ94E6S`, `X9A483B9`. (Dev lobby codes, throwaway.)

### Not counted — context runs (all real clicks)

| Variant | S | Result | Note |
|---|---|---|---|
| No slowdown, fresh page | S1 ×1 | not reproduced | Normal join + leave, WS closed. Baseline. |
| Slow 3G, fresh page (cache hit) | S1 ×3 | not reproduced | Window too small (cache hit); leave worked. |
| No slowdown, human double-tap 150 ms | S2 ×3 | not reproduced | First lookup finished (~40 ms) before tap 2; the Join button was already gone. |
| No slowdown, **machine-speed** double-click (Playwright `dblclick`, ~0 ms apart) | S2 ×1 | reproduced | Joiner listed twice. **Not human-realistic timing — not counted.** |
| Slow 3G, fresh page (cache hit), tap gap 150 ms | S2 ×3 | not reproduced | Second join came after the first had set `gameStop` → normal join-over, clean. |
| Fast 3G, fresh page (cache hit), tap gap 150 ms | S2 ×3 | not reproduced | Same as above. |
| Slow 3G **+ DevTools "Disable cache"**, tap gap 150 ms | S2 ×3 | reproduced 3/3 | Same signature as the counted S2. Extra artificial step — not counted. |

### What this does and does not show

- **Reachable, demonstrated, with real clicks.** All three plausible paths from the plan reproduce, under one
  emulated condition (Slow 3G) plus one natural one (>5 min on the start screen).
- **S1 reaches every player today** — the public card is not behind the private-lobby switch. Effect seen: a
  player who pressed "leave" is pulled into the match anyway.
- **Dev ≠ production for S2.** Dev does not kick a second connection with the same `persistentID`; the `Prod`
  config does (`GameServer.ts:311-329`, per the plan). So in production the duplicate-joiner effect probably
  looks different (one of the two connections kicked). **Untraced.**
- **How often real players hit it is unknown.** It needs a slow link (Slow 3G is harsh; Fast 3G with a cache
  hit did not reproduce) AND a stale cosmetics cache. Not measured in the field.
- Side observation, not this task: a leave while the game WebSocket is still CONNECTING logs
  `WebSocket is not open. Current state: 0` (`Transport.leaveGame`); in these runs the server never listed
  that clientID, so no effect was seen. Not investigated further.

### Decision

Per the driver's instructions and the owner's 2026-10-09 ruling (slowed network + normal clicks counts):
**S1, S2 and S3 reproduced ⇒ continue into phase 2.**

---

## §3 — Interruption (2026-10-09 23:22–23:23 MSK)

- The first Build worker was cut off when the owner's Mac **hung and was force-restarted** (power button,
  23:23) while it ran the dev server + headless Chromium (`chrome-headless-shell` crashed at 23:22). Cause of
  the hang not investigated (see `project_kernel_panic_during_jest` memory; no jest run was going).
- Left on disk, **untested and unlogged**: `src/client/LobbyJoinSequence.ts`, `tests/client/LobbyJoinSequence.test.ts`,
  phase-2 edits in `src/client/Main.ts` and `src/client/HostLobbyOpen.ts`. The phase-1 harness lived in
  `/private/tmp`, which the restart wiped.
- Owner ruling (live, driver session): *"Resume, full plan"* — finish phase 2 including the browser re-run.
- **Redone by the resumed worker (2026-10-09/10):** read the draft in full against plan §3; one correction
  (below); targeted tests, lint, tsc; **rewrote the browser harness** (same method as §2: headless Chromium via the
  repo's `playwright`, real clicks/keys, CDP Slow 3G, 310 s idle); re-ran S1/S2/S3 × 3; manual checks; one full
  `npm test`. Load discipline: dev server + one browser only while no jest ran; contexts closed per try; dev
  server stopped and ports 9000/3001/3002 freed before the full run. Load average stayed 3.5–9 throughout; no
  starvation signs.

## §4 — Phase 2: the fix (built, tested, re-run)

### What changed

| File | Change |
|---|---|
| `src/client/LobbyJoinSequence.ts` (new) | Pure module, no DOM. Owns the connected join's stopper + a join counter + "which join is being set up". `beginJoin()` stops and clears any connected stopper, bumps the counter, returns a ticket (`isCurrent()`, `connected(stop)`, `abandon()`). `leave()` → `"left"` / `"cancelled-setup"` / `"nothing"`. `isInLobbyOrJoining()`, `hasStopper()`, `currentStopper()`. Stopper cleared **before** it is called, so it runs once even if it re-enters. |
| `src/client/Main.ts` | `gameStop` field → read-only getter over the sequence. `joinLobbyFromEvent`: `beginJoin()` before the first await; the three setup awaits moved into a new `loadJoinSetup()` helper (Yandex-id await hoisted out of `joinLobby`'s arguments); `if (!join.isCurrent()) { log; return; }` after it; then the **unchanged** `const joinGeneration = ++this.joinGeneration;` immediately followed by the synchronous `joinLobby(...)`; `join.connected(stop)` after. `handleLeaveLobby`: null-stopper branch now cancels a join being set up (`"cancelled-setup"` → log + clear the public card highlight, **no** start-screen reset). `onHashUpdate` and `HostLobbyOpen`'s `isInLobby` read `isInLobbyOrJoining()`. R6/R6b comments (§1) reworded for where the Yandex-id await now lives. |
| `src/client/HostLobbyOpen.ts` | Comments only (the `isInLobby` contract text, and the 0228-window note). No behaviour change. |
| `tests/client/LobbyJoinSequence.test.ts` (new) | 9 cases against the real module, in Main's order. |

`0415`'s uncommitted `Main.ts` hunks (license `title`, mission button `label`) untouched. `0227` seam: mint +
`joinLobby` + `onJoin` claim + `onGameEnd` guard byte-identical apart from the hoisted await. `0225` monitor path
untouched. **No analytics event added, renamed or removed.**

### Decision log

1. **`gameStop`: field vs read → read.** It is now a private getter returning `lobbyJoins.currentStopper()`.
   Reason: one source of truth (no field to keep in sync), and every existing `this.gameStop !== null` reader
   (`citizenshipRestartOffer`, `beforeunload`, presence source, login-restart `matchActive`, invite `isBusy`)
   stays byte-identical. Writes go only through the sequence (tsc rejects an assignment to a getter-only
   property, so a missed write site would not compile).
2. **Kept the join-over guard in `joinLobbyFromEvent`** (`if (this.gameStop !== null) { log; lobbyJoins.leave();
   stopPerformanceMonitor(); }`) instead of deleting it in favour of `beginJoin()`'s own stop. Same behaviour
   (plan: "stopPerformanceMonitor() stays where it is"); keeps the `joining lobby, stopping existing game` log and
   the old call order (game stop, then monitor stop). `beginJoin()`'s stop is then a no-op on that path.
3. **Correction to the draft — `abandon()` + `loadJoinSetup()` (applied without asking; verified-CORRECT,
   localized, inside the plan's intent "no flag that can get stuck").** Finding: in the draft, if a setup await
   rejected (`getServerConfigFromClient` throws on a non-OK `/api/env`; `getSelectedPatternName` reads
   `localStorage`, which can throw), the sequence's "being set up" marker stayed set forever, so
   `isInLobbyOrJoining()` read true with nothing happening. Effect would have been mild (the next hash change or
   Create would log a bogus "cancelling a join still being set up" and clear the card highlight) but it broke the
   plan's design promise. Fix: the ticket gained `abandon()` (clears the marker only if this ticket is still the
   one being set up); the three awaits moved into `loadJoinSetup()` so one `.catch` can call `abandon()` and
   rethrow — the join still dies exactly as before. Two tests added for it.
4. **`handleLeaveLobby` "cancelled-setup" also calls `publicLobby.leaveLobby()`** (the draft had it; kept). This is
   the card's own highlight, not the start-screen reset the plan excludes. Needed for the `onHashUpdate` path,
   where nothing else clears it; idempotent for the card-click and Create paths (they already clear it).
5. **Mint order (for the reviewer, per plan §6):** `++this.joinGeneration` now runs after all three awaits
   instead of before the Yandex-id one. Mint is still immediately before the synchronous `joinLobby()` with no
   await between; ownership is still claimed in `onJoin`; the `onGameEnd` guard still keys on
   `monitorGeneration`. A cancelled/replaced join never mints.

### Scope — closes or narrows?

**Closes the `Main`-level window**: the `isCurrent()` check sits synchronously right before `joinLobby()`.
**Does not touch** the Join window's own lookup window (S2's two lookups still both send `join-lobby`; the
second wins now), or anything inside `ClientGameRunner` after `joinLobby()`. The unit suite does **not** cover
the live race — only the ordering module; the live race is covered by the browser re-run below only.

### Evidence

- **Targeted unit tests:** `npm test -- tests/client/LobbyJoinSequence.test.ts tests/client/HostLobbyOpen.test.ts`
  → 2 suites, 32 tests passed.
- **Lint:** `npm run lint` → clean (exit 0). **tsc:** `npx tsc --noEmit -p tsconfig.json` → clean (exit 0).
- **Full `npm test`:** see §5.

### After-fix browser re-run — **slowed network (Slow 3G), normal clicks, natural cache state (310 s idle)** — 9 of 9 clean

Same method and steps as §2's counted runs (harness rewritten, see §3). No event dispatched by script; S4 not run.

| # | Tries | Fixed? | What was seen (every try) |
|---|---|---|---|
| **S1** public card join, then leave | 3 | **3 / 3 clean** | ~1 s after the join click the leave click logs `leaving lobby, cancelling a join still being set up`; ~1 s later the join resumes and logs `joining lobby <id>: replaced or left while setting up, not joining`. **No game WebSocket opened, no `join` frame**, server lobby lists **no** clients, card not highlighted. Lobbies `k9NoBZhh`, `U55kB6EM`, `UQFsT8kf`. |
| **S2** private Join, double-tap (150 ms) | 3 | **3 / 3 clean** | Two lookups, two `joining lobby <id>` from `Main` ~2 s apart; the first logs `replaced or left while setting up, not joining`; **one** game WebSocket, **one** `join` frame; server lobby and host window list the joiner **once** (host + joiner). Join window stays open in the "joined, waiting" state. Lobbies `PMQRBETR`, `BZY9CZDP`, `TXFJ634P`. |
| **S3** private Join, then Escape on "joined, waiting" | 3 | **3 / 3 clean** | Escape logs `leaving lobby, cancelling a join still being set up`; ~2 s later `replaced or left while setting up, not joining`. **No game WebSocket, no `join` frame**; window closed; server lobby and host window list **only the host**. Lobbies `Y6BBFGZD`, `5BGDSDDE`, `ZAMPMN9B`. |

### Manual checks (headless, real clicks, no slowdown, fresh page)

| Check | Result |
|---|---|
| Normal public join, then leave after connect | **OK** — join frame sent; leave logs `leaving lobby, cancelling game`, WS closed, server lobby empty, card not highlighted. |
| Join-over: public card → Mission (Solo tab) 0.9 s later | **OK** — `joining lobby, stopping existing game`, old WS closed, mission started (`lobby: game started`). |
| Private Create (host) + Join (joiner), joiner closes, host closes | **OK** — joiner listed once; joiner Escape → `leaving lobby, cancelling game`, WS closed, host list back to host only; host Escape → WS closed, server lobby empty, start-screen tabs visible again. |
| Reconnect banner rejoin (public match started, page reloaded) | **OK** — banner shown, Rejoin → `joining lobby` with the saved clientID, WS `join` frame, `lobby: game started`, banner gone. |

**Not done:** Tutorial and the Solo-modal single-player start were not exercised (not in the plan's list);
real mobile/Yandex iframe not tried (headless desktop Chromium only); production's duplicate-`persistentID` kick
(S2's prod effect) still untraced — moot for the fixed path, which no longer sends the second join.

### Side observation (pre-existing, not this task, not fixed)

After a join-over (public → Mission) the **stopped** public `Transport` keeps logging `WebSocket is not open …` /
`attempting reconnect` on every hash/intent of the new game: `Transport`'s constructor subscribes to the shared
`EventBus` with anonymous closures (`Transport.ts:250` etc.) and never unsubscribes. Log noise only (those
handlers only log; no reconnect is attempted). Same stopper path as before 0228 (the change only routes the call
through `lobbyJoins.leave()`), so not introduced here — **reasoned from the code, not re-run on the
pre-0228 build**. Worth a backlog note.

## §5 — Full suite

- `npm test` (one run, through the npm script and its project lock, after the dev server and browser were
  stopped): **222 suites passed; 4524 tests passed, 1 skipped; 73 s; exit 0.** The skip is the Docker-probed
  `docker-secret-boundary` shell harness (Docker daemon not running) — **skipped, not passed**. No supertest flake,
  no `SIGSEGV`. `tests/client/LobbyJoinSequence.test.ts` ran in it (PASS).
- **Not committed.** No task file moved, no wiki write.

## §6 — Review round 1 fixes (R1, R2) — process-review worker, sprint-ship-loop

Owner ruling (via driver AskUserQuestion): **"Fix both now"**. Load discipline: no dev server, no browser, no
integration run (owner: no browser re-run needed for these fixes).

**Decision log (fixes applied under the standing approval, no per-fix ask):**
- **R1** — answers the ledger's R1 (`abandon()` covered only the setup awaits). Changed: new
  `LobbyJoinSequence.runJoin(setUpAndConnect)` takes the ticket and runs the body under `try/finally
  join.abandon()`; `Main.joinLobbyFromEvent` calls it, and its setup + connect code moved unchanged into
  `Main.setUpAndConnect`. A throw anywhere before `connected()` (setup await or the synchronous
  mint → `joinLobby(...)` step) no longer leaves the join "being set up". Mint still right before
  `joinLobby(...)`; that block and the `onGameEnd` guard are byte-identical to the round-1 diff.
  Qualified: verified `CORRECT` (sync `JSON.parse` in `LocalPersistantStats.getStats` via `startGame`),
  localized (one module method + one call site), inside the plan's design (the module owns join order).
- **R2** — answers the ledger's R2 (HostLobbyOpen harness copied pre-0228 Main). Changed: harness drives the
  real `LobbyJoinSequence` in Main's order; header comment rewritten; one new test `H4b` (✕ while Main is
  still setting up → join cancelled, never connects). Qualified: verified `CORRECT`, test-only, file named
  in plan §5; owner ruling covers it.
- Obvious-winner calls: **none**.

**Evidence:**
- `npm test -- tests/client/LobbyJoinSequence.test.ts tests/client/HostLobbyOpen.test.ts` → 2 suites, 37 tests
  passed (was 32; +4 `runJoin`, +1 `H4b`).
- Mutation check: `finally` abandon removed → 2 of the 4 `runJoin` tests red; restored (`cmp` identical).
- `npx tsc --noEmit -p tsconfig.json` → exit 0. `npm run lint` → exit 0.
- Full `npm test` (one run, npm script, nothing else running): **222 suites passed; 4529 passed, 1 skipped;
  208 s; exit 0.** The skip is the Docker-probed `docker-secret-boundary` harness (Docker not running) —
  **skipped, not passed**. No supertest flake, no `SIGSEGV`.
- **Not verified:** no browser re-run of S1–S3 after this change (owner ruling: not needed); the R1 path itself
  (corrupt `game-records`) is covered by the module unit test only, not exercised through `Main`.
- Not committed. No task file moved. No wiki write.

## §7 — Review round 2 fix (R3) — process-review worker, sprint-ship-loop

Owner ruling (via driver AskUserQuestion): **"Fix the test now"**. Test-only; no game code. Load discipline: no dev
server, no browser, no integration run.

**Decision log (fixes applied under the standing approval, no per-fix ask):**
- **R3** — answers the ledger's R3 (H4b's final presence check could never fail). Verified: the waiter was taken
  before `tapCreate()`, with no join and no lobby, so `whenOnStartScreen()` (`StartScreenPresence.ts`, the
  `while (isAwayOrJoining())` loop) returned at once. The gap was in my own round-1 R2 test. Changed: in
  `tests/client/HostLobbyOpen.test.ts` H4b only, the waiter is now taken after `answer({ ok: true })`; the test
  asserts it is pending there, still pending after ✕ (a cancelled setup reports nothing — `Main.handleLeaveLobby`
  skips the reset), and settled only after `finishMainSetup()` (Main's 0336 join marker ends). Comment added.
  Qualified: verified `CORRECT`, mechanical/localized (one test), test file named in plan §5, owner ruling covers it.
- Obvious-winner calls: **none**.

**Evidence:**
- `npm test -- tests/client/HostLobbyOpen.test.ts tests/client/LobbyJoinSequence.test.ts` → 2 suites, 37 tests
  passed.
- Mutation A (harness `.finally(endJoining)` removed): H4b **red** at its final `isSettled(waiting)` assert
  (`Expected: true / Received: false`). Restored; `cmp` identical.
- Mutation B (harness leave reports the start screen even on a cancelled setup): H4b stays green. Expected, not a
  gap — `whenOnStartScreen` re-checks `isAwayOrJoining()`, so a report cannot wake it while Main's marker is held.
  Restored; `cmp` identical.
- `npm run lint` → exit 0. `npx tsc --noEmit -p tsconfig.json` → exit 0.
- Full `npm test` (one run, npm script, no other jest running): **222 suites passed; 4529 passed, 1 skipped;
  294 s; exit 0.** The skip is the Docker-probed `docker-secret-boundary` harness (Docker not running) —
  **skipped, not passed**. No supertest flake, no `SIGSEGV`.
- **Not verified:** nothing browser-side (none needed — test-only change).
- Not committed. No task file moved. No wiki write.
