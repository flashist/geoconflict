# The Host Window Polled for Players Before a Lobby Existed, Throwing an Uncaught Error Every Second (task 0353)

**Source**: `ai-agents/tasks/done/0353-the-host-window-polls-for-players-before-a-lobby-exists-and-throws-every-second/brief.md` (`plan.md`, `worklog.md`, `review.md` in the same folder read as supporting evidence)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 7, rank 40 (append rank; moved in from the Backlog board 2026-10-04) / task `0353`

> 🆕 **2026-10-10 sync — checked live, and an *after* case found.** In `0376`'s run on `0.0.161`
> ([[tasks/private-lobby-production-test]]) the host window showed **no repeating errors** while a lobby was created —
> this fix holds live. `0390` ([[tasks/private-lobby-idle-end-live]]) found the mirror case: once a lobby has **ended**,
> the host window keeps polling it once a second (404 each time, 2 h 44 min+). Filed as `0434` (Backlog, low).

> ✅ Done (agent-closed — not owner-verified), closed 2026-10-05; committed in `8d74090` (2026-10-05). ⚠️ **Not
> deployed** (client-only; no game deploy since `0.0.156`). 📌 *2026-10-08 lint: deployed since — game `0.0.157`, 2026-10-08 (✔️ `8d74090` is an ancestor of tag `0.0.157`; `0396` worklog).*

## Goal

Found live during `0333`'s verify step (2026-09-30). While the host **Create lobby** window was open and **no lobby
existed yet**, `HostLobbyModal`'s once-a-second player poll requested the lobby with an empty id; the reply was an HTML
page, `json()` threw, and the poll had no catch — one `Uncaught (in promise) SyntaxError` per second. **Players did not
see it**; the cost was console noise, uncaught-rejection reports forwarded to analytics/telemetry, and one wasted
request a second. After `0333`, a **failed create** left the window open, so the errors kept coming until the player
closed it.

## Key Changes

- **Reproduced first:** production also answers the empty-id request with an HTML 404 (read-only GET), so `json()`
  throws there too. Locally (headless browser), 5.5 s with a slow or failed create gave 5 empty-id requests and 5
  uncaught errors each.
- **Fix in `pollPlayers()` only** (`src/client/HostLobbyModal.ts`): no empty-id request and no uncaught error while no
  lobby exists. Live count **5 → 0**. Once the lobby exists the list still refreshes every second.
- **Review R1 (medium, a regression from this task's own gate) — fixed under a live owner ruling** (*"Allow it, fix
  now"*): `open()` now clears the player list, so a reopen whose create fails or hangs no longer shows the previous
  lobby's players with Start enabled. Two older tests that depended on the bug were re-seeded, no assertion loosened.
  R2 added the test that catches it.
- Left out of scope by the ruling: out-of-order poll replies; the old lobby code still showing on reopen.

## Outcome

- `npm test` 192/192 suites green on the first run after the fix. Not re-run live in a browser after the R1 fix (jsdom
  test only).

## Related

- [[tasks/private-lobby-close-leaves-lobby]] — task `0327` and its follow-ups `0333`/`0334`/`0335`, where this was found
- [[tasks/lobby-window-joining-mark]] — task `0374`, the other `HostLobbyModal.ts` fix in the same batch (built after this one)
- [[tasks/private-lobby-citizen-perk]] — the private-lobby feature
- [[systems/networking]] — worker-routed lobby requests
- [[decisions/sprint-7]] — the board (rank 40)
- [[tasks/private-lobby-idle-end]] — task `0377`, the server-side private-lobby fix in the same batch
- [[tasks/private-lobby-production-test]] — task `0376`, where this fix was checked live
- [[tasks/private-lobby-idle-end-live]] — task `0390`, which found the *after* case (`0434`)
- [[tasks/join-lobby-race-fix]] — task `0228`, the other host-window join-setup fix
