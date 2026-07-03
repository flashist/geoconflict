# Analytics P0: Spawn Confirmation

**Source**: `ai-agents/tasks/done/analytics-p0-spawn-confirmation.md`
**Status**: done
**Sprint/Tag**: Sprint 4 / analytics P0

## Goal

Add a server-confirmed spawn event so GameAnalytics can measure actual time-to-spawn and identify ghost sessions where a player reaches `Game:Start` but never receives confirmed territory.

## Key Changes

- Added `Match:Spawned` as `MATCH_SPAWNED_CONFIRMED` in `flashistConstants.analyticEvents`.
- Defined the event as a client-observed server confirmation, not an intent-send event: it fires when client game state first reflects that the local player owns territory.
- Records a positive integer value in seconds from `Game:Start` to confirmed spawn.
- Keeps the event one-shot per fresh match; sessions with `Game:Start` and no `Match:Spawned` remain measurable as ghosts.
- Documented the event in `ai-agents/knowledge-base/analytics-event-reference.md` and the wiki analytics system page.

## Outcome

Spawn analytics now distinguishes spawn intent (`Match:SpawnChosen` or `Match:SpawnAuto`) from confirmed placement (`Match:Spawned`). This gives Sprint 4 citizenship and XP-crediting work a cleaner baseline for ghost-rate and qualifying-match decisions.

## Related

- [[systems/analytics]]
