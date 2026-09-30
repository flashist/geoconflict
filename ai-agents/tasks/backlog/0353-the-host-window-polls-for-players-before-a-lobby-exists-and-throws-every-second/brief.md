# The host window polls for players before a lobby exists, and throws an uncaught error every second

## ID
0353

## Sprint
Backlog

## Priority
Unscheduled

## Status
🔲 Backlog

## Owner
fkit-coder

## Context

**Filed 2026-09-30 by a spawned `fkit-producer` with no owner channel (ADR-021/037), on an OWNER RULING given live
in the `fkit lead` session via `AskUserQuestion` on 2026-09-30, relayed by `fkit-lead`** (driving
`/fkit-sprint-ship-loop`). ⛔ Not producer precedent. The owner's answer: *"File a follow-up"*.

**What was seen.** Found live during [`0333`](../../done/0333-closing-the-host-window-before-the-private-lobby-exists-leaves-the-player-in-a-public-lobby/brief.md)'s
Verify step on 2026-09-30 (local dev, headless browser; evidence: `0333` `worklog.md` § *Verify*, "Observed —
pre-existing, not caused by 0333, not fixed").

- While the host **Create lobby** window is open and **no lobby exists yet**, `HostLobbyModal` polls for the
  lobby's players once a second (`pollPlayers()`, started by `open()`). With no lobby, the lobby id is an empty
  string, so the request goes to `/w0/api/game/` with nothing after it.
- The dev server answers that with the HTML page; `response.json()` fails (`SyntaxError: Unexpected token '<'`),
  and the poll's promise chain has **no catch** → one `Uncaught (in promise) SyntaxError` per poll.
- **Players do not see it.** The cost is console noise, uncaught-rejection reports (the browser's global
  `unhandledrejection` handlers forward these to GA/OTEL), and one wasted request a second.
- ⚠️ Only the dev server's reply was observed. What production answers to the empty-id request was **not
  checked** — confirm it in step 1 rather than assume HTML.

**Pre-existing — not caused by `0333`.** A control run (player not in any lobby, create forced to fail with 500,
window open 4.2 s) produced 4 polls and 4 identical errors, on the path `0333` did not change.

**What `0333` changed.** Before `0333`, a player in a public lobby whose private-lobby create failed was pulled
into the public match, which closed the host window and stopped the poll. `0333` fixed that (the player now leaves
the public lobby at the Create tap), so after a **failed create** the window stays open and the errors now keep
coming **until the player closes the window**. The same errors also occur, more briefly, during every normal
create round-trip before the lobby id arrives.

**Same file as [`0334`](../../done/0334-host-start-still-sends-start-game-after-the-window-closed-during-the-settings-save/brief.md)**
(`src/client/HostLobbyModal.ts`), which is on Sprint 7. No logical dependency, but **sequence the edits** — do not
build both at once. Note `0333` added a catch on `createLobby`'s chain in `HostLobbyModal.open()` (owner-ruled);
build on it, do not remove it (see `0333`'s worklog note for `0334`'s planner).

## What to build

1. **Confirm it first.** Locally, open the host window and make the create slow or fail; record in the worklog how
   many uncaught errors appear and which request each one comes from. If it does not reproduce, say so plainly and
   stop.
2. **Fix:** while no lobby exists, the host window must not throw uncaught errors from its player poll. The plan
   decides how — for example, skip or do not start the poll until a lobby id exists, and/or handle the poll's
   errors. Keep it minimal.
3. **Keep:** once the lobby exists, the player list still refreshes every second as today; closing the window
   still stops the poll; `0327`'s leave behaviour and `0333`'s Create-tap leave are unchanged.
4. **Tests** that fail on today's code and pass after: no uncaught error and no empty-id request while no lobby
   exists (both a slow create and a failed create); the player list still updates once the lobby exists.

**Out of scope:** the private lobby left orphaned on an early close (`0335` case 3); `0334`'s Start-during-save
bug; `src/client/Transport.ts` (`0252`'s).

## Verification steps

1. Worklog records step 1's before-fix count of uncaught errors (slow create, failed create) and the after-fix
   count (zero).
2. New tests fail on the current code and pass with the fix; both runs recorded.
3. Live, local dev: open the host window with create failing, wait ≥ 5 s → no `Uncaught (in promise)` errors and
   no `/api/game/` requests with an empty id. Then a normal create → the player list fills and refreshes.
4. `0327`/`0333` tests (`tests/client/HostLobbyModalLeave.test.ts`, `tests/client/HostLobbyOpen.test.ts`,
   `tests/client/JoinPrivateLobbyModalLeave.test.ts`) still pass.
5. `npm test` and `npm run lint` green (known `supertest` flake: re-run and say so, per `CLAUDE.md`).

## Notes

- **Depends on:** 0333
- **Blocks:** nothing.
- **Related:** `0333` (where it was found; made it last longer after a failed create), `0334` (same file — sequence
  with it), `0327` (host-window leave behaviour to keep), `0335` (other early-close leftovers).
- **Size:** small, one client file expected (`src/client/HostLobbyModal.ts`). No `src/core/` change expected.
- **Commit rule:** nothing is committed or pushed without the owner's explicit ask.
