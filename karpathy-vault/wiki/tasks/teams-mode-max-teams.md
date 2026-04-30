# Teams Mode Max Teams

**Source**: `ai-agents/tasks/done/s4-teams-mode-max-teams.md`
**Status**: done
**Sprint/Tag**: Sprint 4

## Goal

Keep auto-generated public teams-mode lobbies fillable by capping regular team counts at 2, 3, or 4 teams instead of allowing 5+ fragmented teams.

## Key Changes

- Updated `src/server/MapPlaylist.ts` so regular public team counts are defined by `REGULAR_TEAM_COUNTS = [2, 3, 4]`.
- Kept `HumansVsNations` in the public teams rotation through `TEAM_COUNTS`, separate from the regular numeric team cap.
- Routed random team selection through `randomTeamCount()`, making the allowed set explicit and testable.
- Added `tests/server/MapPlaylist.test.ts` coverage that rejects 5-, 6-, and 7-team regular lobbies, confirms all allowed team modes are reachable, and verifies FFA configs are unaffected.

## Outcome

Server-generated public team lobbies no longer create 5+ regular teams. The cap preserves the existing Humans vs Nations rotation while making normal teams lobbies less fragmented for the current player base.

## Related

- [[decisions/sprint-4]]
- [[systems/game-overview]]
