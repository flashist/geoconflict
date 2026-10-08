# Tapping Create Leaves the Public Lobby First (task 0333)

**Source**: `ai-agents/tasks/done/0333-closing-the-host-window-before-the-private-lobby-exists-leaves-the-player-in-a-public-lobby/brief.md` (evidence read from the same folder's `worklog.md` and `review.md`)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 7, rank 10 (append rank) / task `0333`

> ✅ Done (agent-closed — not owner-verified), 2026-09-30. Committed in `9cb8ee4`; **not in any deploy yet**
> (latest game tag `0.0.155`). 📌 *2026-10-08 lint: released since — game `0.0.156`, 2026-10-03 (✔️ `9cb8ee4` is an ancestor of tag `0.0.156`).* Reproduced and fixed on local dev; production reach is small (only citizens can
> create a lobby, and the private-lobby row is believed tester-only — see
> [[tasks/lobby-close-leftovers-investigation]]).

## Goal

`0327`'s review finding **R2**, an owner-ruled known bug (*"Record as a known bug, put it to the end of the next
sprint. Create a brief for that."*). A player waiting in a **public** lobby taps **Create lobby**, then closes the
host window before the private lobby exists (or the create fails). The start screen showed them out of the public
lobby, but the connection stayed live, so they could be **pulled into that public match** unexpectedly.

Why: `Main.ts`'s Create handler only cleared the public-lobby **highlight** (`PublicLobby.leaveLobby()` is a UI
clear). Before `0327`, the private `join-lobby` that followed is what stopped the public connection; `0327`'s new
"do not join a lobby nobody is looking at" guard removed that join on an early close, leaving **no join and no
leave**. A failed `createLobby` reached the same state even before `0327`.

## Key Changes

- **New `src/client/HostLobbyOpen.ts`** — `openHostLobbyFromStartScreen(deps)`: if in a lobby, leave it (the
  normal `handleLeaveLobby()`, owner ruling Q1 = A); then clear the highlight; then open the host window. So the
  public leave now happens **at the Create tap**, before the create outcome is known.
- **`src/client/Main.ts`** — the Create handler only, wired to the new module.
- **`src/client/HostLobbyModal.ts`** — owner ruling D4, *"Add the one-line catch"*: `open()` keeps the create
  chain and adds `joined.catch(() => {})`, so a failed create is no longer an unhandled rejection (it crashed the
  jest process). Review R1: the config read moved **inside** `createLobby()`'s `try`, so every create failure is
  logged before it is swallowed.
- **Not touched:** `Transport.ts` (`0252`'s), `src/core/`, server, text, analytics.

## Outcome

- **Live check (local dev, Playwright), before and after:** route 1 (✕ before create answers) and route 2
  (create fails with 500, then ✕) **both reproduced** before the fix — the player was pulled into the public
  match — and **both PASS** after (public socket closed at the tap, no prestart/start). Route 3 (create fails,
  window left open) **PASS** at Verify. `0327`'s happy path **PASS** — two leaves total, one per lobby.
- **Tests:** new `tests/client/HostLobbyOpen.test.ts`, red 5 failed / 3 passed before, green 8/8 after (red run is
  against an extraction of the old handler, not `Main` itself). Full `npm test` 184/184 suites, 3269 tests, first
  run.
- **Accepted residual (owner, *"Keep it (Recommended)"*):** a failed create no longer fires the global
  `unhandledrejection` reports — GA gets nothing for it; it still reaches OTEL/Uptrace through `createLobby()`'s
  `console.error`.
- **Other residuals:** `0228`'s sub-second window (a Create tap while a public join is still setting up cannot
  leave) — **reproduced live by accident**; the orphan private lobby → `0335` case 3; popups at the tap → tenure
  part fixed by [[tasks/tenure-popup-never-over-match]].
- **Found while verifying, pre-existing:** `HostLobbyModal.pollPlayers()` polls with an empty lobby id and throws
  an uncaught error **every second** while no lobby exists → filed as **`0353`** (Backlog board).

## Related

- [[tasks/private-lobby-close-leaves-lobby]] — task `0327`, whose review R2 this fixes
- [[tasks/host-start-stops-after-window-close]] — task `0334`, the sibling R1 fix in the same file
- [[tasks/lobby-close-leftovers-investigation]] — task `0335`, the four leftovers (case 3 shares this window)
- [[tasks/private-lobby-citizen-perk]] — task `0302`: only citizens can create
- [[decisions/sprint-7]] — the board; [[decisions/sprint-backlog]] carries `0353`
