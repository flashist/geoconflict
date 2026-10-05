# Worklog — 0353

## Build

Build worker (`fkit-coder`), spawned by `fkit-sprint-ship-loop` (driver `fkit-lead`), 2026-10-04, under the
owner-approved `plan.md` (blob `5e24814c…`, checked unaltered before starting). Built on top of the uncommitted
`0354` / `0380` / `0377` edits in the tree (none reverted). Node `v24.13.0`. Nothing committed.

**Result: DONE.** Bug reproduced live, fixed in `pollPlayers()` only, live count 5 → 0.

## Step 1 — reproduction (before the fix)

### Production (read-only `curl` GET, no body, no auth)
| Request | Status | Content-Type | Body |
|---|---|---|---|
| `GET /w0/api/game/` (empty id) on the production game domain | **404** | `text/html; charset=utf-8` | Express default page, `<pre>Cannot GET /api/game/</pre>` (148 bytes) |
| `GET /w1/api/game/` | **404** | `text/html; charset=utf-8` | same |
| control: `GET /w0/api/game/<unknown 8-char id>` | 404 | `application/json` | (the route's own `{error}`) |

So production answers the empty-id poll with **HTML**, same as dev: `json()` throws there too. Plan's reading
of the code confirmed.

### Local dev (Playwright, headless Chromium)
Setup: `GAME_ENV=dev` game server on 3000–3002 (all free) and `webpack serve --port 9010`. Port 9000 belongs to
another project's dev server (PID 57856, `pixel-dungeon`) — not touched, still running at the end. Fresh
browser context per run, `tutorialCompleted` preset. Uncaught rejections tracked two ways: Playwright
`pageerror` and an in-page `unhandledrejection` listener — both proven to fire with a probe
`Promise.reject` before each run.

⚠️ **How the window was opened:** since `0302`, Create is a locked citizen perk for a non-citizen, and the local
player is not a citizen, so the script calls `document.querySelector("host-lobby-modal").open()` directly. This
is exactly the `open()` the Create tap ends in; the Create-tap path itself (`PrivateLobbyAccess`,
`openHostLobbyFromStartScreen`) was not driven.

Window held open 5.5 s after `open()`:

| Run | `/api/game/` GETs | URLs | Uncaught (`pageerror`) | in-page listener |
|---|---|---|---|---|
| **slow create** (create request held, never answered) | **5** | `/w0/api/game/` (empty id) | **5** × `Uncaught (in promise) SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON` | 0 |
| **failed create** (create answered 500) | **5** | `/w0/api/game/` (empty id) | **5** × same | 0 |
| normal create (3.5 s, then a 2nd client faked into the reply for 2.2 s) | 3, then 5 | `/w1/api/game/<real id>` only | 0 | 0 |

Every uncaught error came from the empty-id player poll — one per tick. Normal create: 1 player, then 2 after
the faked join (list refreshes).

Note on the in-page listener reading 0 while `pageerror` reads 5: it caught the probe, but not the poll's
rejections. Not investigated (likely the app's promise/zone instrumentation reporting them as uncaught errors
rather than `unhandledrejection` events). `pageerror` is the count of record; it matches the console's
`Uncaught (in promise)` lines.

## Step 2 — new tests, red on today's code

New `tests/client/HostLobbyPoll.test.ts` (harness of `HostLobbyModalLeave.test.ts`: real o-modal, fake
timers, `workerPath` → `w1`, the `jose` stub; the empty-id GET answers a `json()` that rejects with a
`SyntaxError`, like the server's HTML).

`npx jest tests/client/HostLobbyPoll.test.ts` on unchanged code → **4 failed, 2 passed**:
- ✕ slow create — 5 GETs to `/w1/api/game/` (plus unhandled `SyntaxError`s).
- ✕ failed create — 5 GETs to `/w1/api/game/`.
- ✓ once the lobby exists, the list fills and refreshes every second (guard; passes by nature).
- ✕ a failed poll after the lobby exists — the `SyntaxError` is unhandled.
- ✕ reopen during a slow create — 3 GETs for the old `/w1/api/game/HOSTLOBBY`.
- ✓ closing the window stops the poll (repeat of 0327's assertion; passes by nature).

**Plan's risk (detecting the unhandled rejection under jsdom + fake timers) — resolved:** detection works.
Jest 30 itself reports the poll's unhandled rejection as an error on the test, which is what turned the
"failed poll" test red. The test's own `process.on("unhandledRejection")` collector stays as a second net; I
did not separately prove it receives the rejection (Jest's handler may take it first). Either way the test
is red on today's code and green after.

## Step 3 — the change (`src/client/HostLobbyModal.ts`, `pollPlayers()` only)

- Returns at once when `!this.hasJoinedLobby` (no lobby for this opening: create pending, failed, or a stale
  `lobbyId` from an earlier opening).
- Body is async/await in one `try`/`catch`; `lobbyId` and `openGeneration` read once at the start; a reply
  arriving after a close/reopen (generation changed) writes nothing.
- The catch logs with `console.warn` (not `console.error`, which `OtelBrowserInit` forwards to telemetry).
  The per-reply `console.log` is unchanged.
- Not touched: `open()`, `close()`, `reset()`, `handleModalClose()`, `createLobby`, the interval's start/stop,
  0380's copy code, `Transport.ts`, `src/core/`.

## Step 4 — tests green

- `npx jest tests/client/HostLobbyPoll.test.ts` → **6 passed, 6 total**.
- `npx jest tests/client/HostLobbyModalLeave.test.ts tests/client/HostLobbyOpen.test.ts
  tests/client/JoinPrivateLobbyModalLeave.test.ts tests/client/HostLobbyModalUrl.test.ts` → **4 suites,
  72/72 passed**.

## Step 5 — live recheck (after the fix)

Same script, same servers, after webpack recompiled the edit:

| Run | `/api/game/` GETs | Uncaught (`pageerror`) | in-page listener |
|---|---|---|---|
| **slow create**, 5.5 s | **0** | **0** | 0 |
| **failed create**, 5.5 s | **0** | **0** | 0 |
| normal create | 3, then 5 — all `/w1/api/game/<real id>` | 0 | 0 |

Normal create: player list 1 → 2 after the faked second client — fills and refreshes. **After-fix count: 0.**
All processes I started (game server, webpack on 9010) were stopped; ports 3000–3002 and 9010 free afterwards.
Scripts left only in my scratchpad.

## Step 6 — full suite and lint

- **`npm test` run 1: 1 failed / 3510 passed** — `tests/profile-server/TenureGrantRoutes.test.ts`, "has no rate
  limiter…", got **401** where 200 was expected (a supertest suite). No `SIGSEGV`; newest
  `DiagnosticReports/node-*.ips` is dated 2026-10-01, before this run → **not `0197`**. Suite re-run alone 3×:
  37/37 each time.
- **`npm test` run 2 (re-run): 1 failed / 3510 passed** — `tests/profile-server/AlertRoutes.test.ts`,
  **`socket hang up`** (a different supertest suite). Again no new `.ips`. Suite alone: 94/94.
- **`npm test` run 3 (re-run): 191/191 suites, 3511/3511 tests passed, exit 0** (49.8 s).
- I re-ran twice. Both failures are in supertest suites this change cannot reach (client-only edit); they match
  the known-flake family in `CLAUDE.md` (`socket hang up` = seen, untraced; `401` = seen historically, mechanism
  unknown). Neither is the confirmed timeout shape, so "flake" is likely, not proven.
- `npm run lint` → exit 0. `npx tsc --noEmit -p tsconfig.json` → exit 0. `prettier --check` on the two touched
  files → clean.

## Not verified / gaps
- The Create-tap path (citizen) was not driven live; `open()` was called directly (reason above).
- No dedicated test for "a poll in flight during close/reopen writes nothing" (the generation guard). The plan
  lists it as an edge case covered by the guard, not as a test; I kept to the plan's test list.
- Production was only probed (GET); the fix is not deployed.

## Decision log

Fixes applied without asking and obvious-winner calls: **none.** Everything built is the approved plan as
written. Two small mechanics, both inside the plan's own steps, recorded so they are findable:
- Live check opened the window via `open()` directly instead of the locked Create tap (the plan's step 1 said
  "open the host window"; this is how to do that as a non-citizen). Disclosed above.
- Test helper `playerNames()` strips the host's "remove player" `×` from each tag's text (first red run showed
  it in the names; a test-side fix, no source change).

### Process-review, round 1 (2026-10-05)

Process-review worker (`fkit-coder`), spawned by `fkit-sprint-ship-loop` (driver `fkit-lead`), under the
approved `plan.md` (blob `5e24814c…`, 6149 bytes, checked unaltered) plus the owner's R1 scope ruling. Ledger:
`review.md` → **Status: closed-out**. Nothing committed.

Fixes applied without a per-fix owner ask (the loop's standing approval) — each recorded so a wrong one is findable:

- **R1 (medium, regression from this task's gate) — fix applied.**
  - *What changed:* `src/client/HostLobbyModal.ts` `open()` — one line, `this.clients = [];`, placed beside the
    existing `this.isStarting = false;` (with a comment citing R1). `endJoining`, `reset()`, `lobbyId` untouched.
  - *Why it qualified:* verified `CORRECT` (reproduced by the new R2 test on the pre-fix tree: after a reopen
    with a failed create the list still read `["Host","Friend"]`); mechanical/localized. It is **outside** the
    plan's "`pollPlayers()` only" line, so it does **not** qualify as in-plan on its own — it was applied
    **only under the owner's live ruling of 2026-10-05** ("Allow it, fix now", relayed by the driver), which
    allowed exactly this: clearing `clients` when a new opening starts, nothing further into `open()`.
  - *Knock-on, same ruling ("anything strictly needed"):* two 0302-era Review-R7 tests in
    `tests/client/HostLobbyModalUrl.test.ts` ("reopening re-enables Start, and a late ad…", "a stale Start
    finishing late does not clear…") seeded `clients = [{}, {}]` **before** `open()` and depended on that list
    surviving the reopen — i.e. on R1's bug. They went red with the fix. Each now re-seeds `clients` right
    after `open()` (stands in for the new lobby's poll). Their assertions and intent (`open()` clears a stale
    `isStarting`) are unchanged; no assertion was removed or loosened.
- **R2 (low, test gap) — test added.**
  - *What changed:* `tests/client/HostLobbyPoll.test.ts` — new `it.each(["fail", "hang"])` "a reopen whose create
    does not answer (%s) shows no earlier players and keeps Start disabled": fills `[Host, Friend]`, checks Start
    enabled, closes, reopens with create failing / hanging, advances 3 s → list `[]`, Start `disabled`, no
    unhandled rejection. Helper `startButton()` added.
  - *Why it qualified:* verified `CORRECT`; test-only; the spawn required it to fail on the current code —
    **it did: 2 failed (list `["Host","Friend"]`), 6 passed**, then all 8 green after the R1 line.
- Obvious-winner calls: **none.** Choice of `open()` over `reset()` for the line: the ruling named either; `open()`
  is the point "a new opening starts" and sits beside the matching `isStarting` reset — not treated as a
  judgment call.
- Left out of scope per the ruling: out-of-order poll replies; the old lobby code still showing (`lobbyId` not
  cleared).

Checks after the fix:
- 5 host-window suites (`HostLobbyPoll`, `HostLobbyModalLeave`, `HostLobbyOpen`, `JoinPrivateLobbyModalLeave`,
  `HostLobbyModalUrl`) → **80/80 passed**.
- `npm run lint` → exit 0. `npx tsc --noEmit -p tsconfig.json` → exit 0. `prettier --check` on the three touched
  files → clean.
- `npm test` → **192/192 suites, 3514/3514 tests, exit 0**, first run (no flake, no re-run).
- Not re-run live in a browser for this round (the fix is a list reset covered by the jsdom test above).
