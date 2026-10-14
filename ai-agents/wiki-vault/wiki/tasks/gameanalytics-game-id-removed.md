# Remove the GameAnalytics Game ID From Tracked Task Files (task 0459)

**Source**: `ai-agents/tasks/done/0459-remove-the-gameanalytics-game-id-from-tracked-task-files/brief.md` (`worklog.md` in the same folder read as supporting evidence)
**Status**: done (agent-closed — not owner-verified)
**Sprint/Tag**: Sprint 8, rank 51 (ADR-035 append rank; on merit its rank barely matters) / task `0459`

> ✅ Done (agent-closed — not owner-verified), closed 2026-10-14. Done by a spawned `fkit-producer` on the owner ruling
> *"Do 0459 now, then stop (Recommended)"*. Docs only — nothing to deploy, no verify task.
>
> ⚠️ **Git history still holds the old copies — not rewritten.** The repository is public, so the value stays
> retrievable from history. Rewriting history happens only if the owner asks separately.

## Goal

The project rule is no keys, secrets or dashboard/game IDs in any artifact. `0456`'s reviewer found the **numeric
GameAnalytics game ID** written in three tracked files of a public repo ([[tasks/gameanalytics-event-limit-recurring-spikes]]).
Owner ruling 2026-10-14: *"File in Sprint 8"*.

## Key Changes

- One occurrence in each of three files, replaced outright with neutral wording — **not struck through**, because a
  strike-through would keep the value in the file (the one place the project's strike-don't-delete habit does not apply):
  - `ai-agents/sprints/backlog.md` — the `0212` row now says *"the game's GameAnalytics dashboard"*;
  - the `0212` brief's *Source:* line — likewise ([[tasks/tutorial-abandonment-platform-segmentation]]);
  - the `0439` brief's ID-allocation note — *"the GameAnalytics game number (removed by `0459`)"*.
- **Method:** the value was never typed, echoed or printed — read by pattern into a scratch file, compared with
  `grep -F -f`, and the scratch file deleted.

## Outcome

- Before: 3 files, 3 occurrences (tracked tree and working tree agree). After: `git grep -F` → 0 files; working-tree
  `grep -rF` (excluding `node_modules/`, `.git/`) → 0. The vault had none.
- `git log --all -S` finds 2 commits that touch the value — history unchanged.
- **Out of scope by design:** the GameAnalytics game key and secret key in `src/client/flashist/FlashistFacade.ts` — client
  keys ship in the bundle.
- For the vault: never write that number here either. Future GameAnalytics reads (e.g. `0458`) carry the same rule.

## Related

- [[tasks/gameanalytics-event-limit-recurring-spikes]] — task `0456`, where it was found
- [[tasks/tutorial-abandonment-platform-segmentation]] — task `0212`, one of the edited briefs
- [[systems/analytics]] — the GameAnalytics integration
- [[decisions/sprint-8]] — the board (rank 51)
- [[decisions/sprint-backlog]] — the edited `0212` row; `0458` (monitoring)
