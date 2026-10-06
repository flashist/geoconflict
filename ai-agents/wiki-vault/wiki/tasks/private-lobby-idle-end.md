# End Abandoned, Unstarted Private Lobbies After 30 Idle Minutes — Not After 3 Hours (task 0377)

**Source**: `ai-agents/tasks/done/0377-end-abandoned-unstarted-private-lobbies-after-a-short-idle-time-not-3-hours/brief.md` (`plan.md`, `worklog.md`, `review.md` in the same folder read as supporting evidence)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 7, rank 39 (append rank; moved in from the Backlog board 2026-10-04) / task `0377`

> ✅ Done (agent-closed — not owner-verified), closed 2026-10-04; committed in `8d74090` (2026-10-05). ⚠️ **Not
> deployed** — server-only, needs a game-server deploy, none since `0.0.156`. Its live check is **`0390`** (Sprint 8,
> rank 7): an abandoned private lobby ends after 30 minutes and an occupied one does not.

## Goal

Release-gate item 4 for private lobbies ([[tasks/private-lobby-citizen-perk]]) and `0335` **case 3**
([[tasks/lobby-close-leftovers-investigation]]), which the owner had ruled *"Accept, revisit later"* — *"revisit before
private lobbies open to all players"*. A private lobby created but never started stayed on the game server for **3
hours**, even with nobody in it; only the max game duration ended it. The early-close path (host closes Create before
the server answers) is one case of a wider class: every abandoned unstarted private lobby lived 3 hours.

## Key Changes

**Owner rulings at plan approval (2026-10-04):** grace time **30 minutes** (the owner's own value, typed as "Other" —
not one of the offered 5 / 10 / 15) · the clock runs **from when the last person left**, or from creation if nobody
ever joined.

- `src/server/GameServer.ts` — `privateLobbyIdleTimeout = 30 * 60 * 1000` and `lastClientSeenAt` (set at creation, on
  an accepted join, on a counted socket close, and on each phase tick while anyone is connected). In `phase()`, an
  unstarted private lobby with **no connected client** for more than 30 minutes logs `private lobby ended, no client
  connected` (game id, idle ms, whether anyone ever joined — no player ids) and ends. The 3 h check still runs first;
  public lobbies and started games are unchanged. No client change.
- **Review fix R1:** a late close of a socket already replaced by a reconnect no longer re-arms the clock (the close
  handler moves it only if that client was still active). Side effect, accepted inside the plan's 1 s resolution:
  leaves via kick or missed ping count from the last tick that saw the client.
- **Tests:** `tests/server/PrivateLobbyIdleEnd.test.ts`, 10 tests (real `GameServer`, mock sockets, fake timers), each
  pinned by its own mutant.

## Outcome

- Release-gate item 4 is **built, not deployed and not proven live** — `0390` is the proof.
- A late joiner to a lobby ended this way gets the same result as for any finished or missing game today.

## Related

- [[tasks/lobby-close-leftovers-investigation]] — task `0335`, case 3
- [[tasks/private-lobby-citizen-perk]] — the six-item release gate (item 4)
- [[tasks/private-lobby-tester-default]] — task `0354`, the gate's record
- [[tasks/host-window-poll-before-lobby]] — task `0353`, another private-lobby fix in the same batch
- [[systems/networking]] — game-server lobby lifecycle
- [[decisions/sprint-7]] — the board (rank 39)
- [[decisions/sprint-8]] — `0390`, the live check (rank 7)
