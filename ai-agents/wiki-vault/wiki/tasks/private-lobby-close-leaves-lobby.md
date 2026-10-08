# Closing a Joined Private-Lobby Window Leaves the Lobby (task 0327)

**Source**: `ai-agents/tasks/done/0327-closing-a-joined-private-lobby-window-does-not-leave-the-lobby/brief.md`
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 6, rank 39 / task `0327`

> ✅ Done (agent-closed — not owner-verified). Committed in `68303d5`. 🚨 **The live two-window check was NOT
> RUN, before or after the fix** — code reading and unit tests only.

## Goal

Found by `0303`'s review (R1, owner: *"Accept in 0303, file bug"*). A player who joined a friend's private
lobby and closed the window (✕, Escape, click outside) **stayed in the lobby**: `JoinPrivateLobbyModal.close()`
sent no `leave-lobby`, and `closeAndLeave()` — the only method that did — had **no caller** anywhere. So
`Main.handleLeaveLobby()` never ran: the player could be pulled into the host's match, `0303`'s restart popup
never showed, and start-screen cleanup was skipped.

## Key Changes

- **Step 1 findings (code-read):** ✕ and click-outside ran only the modal element's close, never the
  component's; Escape cleared the input and poll but sent no leave, and fired even with the window hidden (in
  a match too). Extra bug: after join + close, `hasJoined` stayed true, so the Join button never came back
  without a reload. The host window had the same shape (its 1 s poll kept running).
- **Owner ruling Q1 (verbatim):** **"Host leaves cleanly (Recommended)"** — *"Friends see the host drop and
  stay in a lobby that can't start — same as today, just visible."*
- **Fix:** every user close of the join window funnels through one handler that sends **exactly one**
  `leave-lobby` if joined; programmatic closes stay silent; Escape only closes an open window; the dead
  `closeAndLeave()` is **deleted**. Host window: same pattern, and a `createLobby` result that lands after the
  window closed skips the join. A close during "checking…" is guarded too.

## Outcome

- **Owner-ruled known bugs, each with its own brief on [[decisions/sprint-7]]:** `0333` (closing the host
  window before the lobby exists leaves the player in a public lobby — review R2) and `0334` (host Start still
  sends `start_game` after the window closed during the settings save — R1); the four plan leftovers → `0335`
  (investigate). Leftovers named: the `0228` join race window; `0252`'s Transport listener leak now reachable
  here too; an orphan unstarted private lobby if the host closes before `createLobby` answers.
- 🆕 **2026-09-30 — all three follow-ups CLOSED `(agent-closed — not owner-verified)`** (committed, not yet
  released) 📌 *2026-10-08 lint: released since — game `0.0.156`, 2026-10-03 (✔️ `9cb8ee4` is an ancestor of tag `0.0.156`).*: `0333` → [[tasks/host-create-leaves-public-lobby]] (the public leave now happens at the Create tap);
  `0334` → [[tasks/host-start-stops-after-window-close]] (no `start_game` after the window closes); `0335` →
  [[tasks/lobby-close-leftovers-investigation]] (all four leftovers real, none serious — case 1 folded into `0228`,
  case 2 noted on `0252`, cases 3 and 4 accepted as known).
- `0252`'s route table wrongly listed this route as already shipped — struck at source by owner ruling
  *"Fix it now"*.
- **Evidence:** built test-first (recorded as "red 13/4, then green"); full `npm test` 170 suites / 2966
  tests, run twice.
- **Owner-run checks still owed:** the two-window check — the pull-in before the fix, the player dropping off
  the host's list after it, the Join button coming back, and the restart popup. It is the only live evidence
  for the `Main.ts` glue.

## Related

- [[tasks/citizenship-restart-prompt]] — task `0303`, whose review found this; its popup now works on this path
- [[tasks/private-lobby-citizen-perk]] — task `0302`: only citizens can host
- [[tasks/private-lobby-start-url]] — task `0198`, the earlier private-lobby fix on Yandex
- [[decisions/sprint-7]] — follow-ups `0333`, `0334`, `0335`
- [[tasks/host-create-leaves-public-lobby]] — task `0333`, review R2 fixed
- [[tasks/host-start-stops-after-window-close]] — task `0334`, review R1 fixed
- [[tasks/lobby-close-leftovers-investigation]] — task `0335`, the four plan leftovers investigated and ruled
- [[decisions/sprint-6]] — the board carrying this task
- [[decisions/sprint-backlog]] — the Backlog board, where this task was filed before an owner ruling moved it to Sprint 6
- [[tasks/host-window-poll-before-lobby]] — task `0353`, found during `0333`'s verify step (done 2026-10-05)
