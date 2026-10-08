# Lobby Windows End Their "Joining a Lobby" Mark When They Close, Not Only When Their Request Settles (task 0374)

**Source**: `ai-agents/tasks/done/0374-lobby-windows-end-their-joining-mark-on-close-not-only-when-the-request-settles/brief.md` (`plan.md`, `worklog.md`, `review.md` in the same folder read as supporting evidence)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 7, rank 41 (append rank; moved in from the Backlog board 2026-10-04) / task `0374`

> ✅ Done (agent-closed — not owner-verified), closed 2026-10-05; committed in `8d74090` (2026-10-05). ⚠️ **Not
> deployed** (client-only; no game deploy since `0.0.156`). 📌 *2026-10-08 lint: deployed since — game `0.0.157`, 2026-10-08 (✔️ `8d74090` is an ancestor of tag `0.0.157`; `0396` worklog).* **Unit-tested only** — the owner's live check was optional
> (the hang is hard to produce by hand and the impact is a delay).

## Goal

Findings R1 and R2 of the 2026-10-02 deploy-readiness review (Codex second opinion, verified CORRECT, low), filed as one
task on owner ruling *"File one small task (Recommended)"*. `0336` stopped the one-time tenure gift popup opening over a
lobby or a match: the popup waits while a "joining a lobby" mark is held. The **host** window (creating the private
lobby) and the **join** window (looking a lobby up) each took a mark and ended it only when their request **settled**.
If the request hung and the player closed the window, they were back on the start screen but the mark stayed held — so
the tenure popup could be delayed.

## Key Changes

- Both `src/client/HostLobbyModal.ts` and `src/client/JoinPrivateLobbyModal.ts` now end their mark **on any close**
  (✕, click outside, Escape, programmatic); a late settle of the old request does nothing (the end function stays
  one-shot). No timeout was added — a timeout alone could let the popup open **over an open lobby window**, which
  `0336` stopped.
- `0336`'s intent kept: on a successful create or lookup, Main's own join mark is held before the window's mark ends.
- **Tests:** a reopen race (two waiters: the first resolves at the first close; a fresh one stays pending through the
  first create's late answer) and a probe that the count never goes negative — both test-shape choices recorded in the
  worklog as within the plan's intent.
- **Review:** ready to merge, no findings; Codex's `disconnectedCallback` claims disproven (both windows are static in
  both HTML templates).

## Outcome

- Closed 2026-10-05 `(agent-closed — not owner-verified)`; committed in `8d74090`. Deployed in game `0.0.157`
  (2026-10-08; `8d74090` is an ancestor of tag `0.0.157`).
- **Proof is unit tests only:** both new test files pass (17/17 and 19/19); a mutation check (the two
  `endJoiningMarks()` calls in `reset()` commented out) fails 9 tests; full `npm test` passed, lint clean
  (worklog). **No live check** — the brief makes it optional (hard to produce by hand; the impact is a delay),
  and none is recorded.
- Review: ready to merge, no findings, no accepted residuals.
- *(Section added 2026-10-08 by lint — the page was missing the template's `## Outcome`; content from the
  task's `worklog.md` and `brief.md`.)*

## Related

- [[tasks/tenure-popup-never-over-match]] — task `0336`, the popup gate this protects
- [[tasks/host-window-poll-before-lobby]] — task `0353`, the other `HostLobbyModal.ts` fix in the same batch
- [[tasks/private-lobby-citizen-perk]] — the private-lobby windows
- [[decisions/sprint-7]] — the board (rank 41)
