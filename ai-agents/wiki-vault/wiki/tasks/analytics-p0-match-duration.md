# Analytics P0: Match Duration

**Source**: `ai-agents/tasks/done/analytics-p0-match-duration.md`
**Status**: done
**Sprint/Tag**: Sprint 4 / analytics P0

## Goal

Add match-duration analytics so GameAnalytics can segment early abandons from full-length matches and validate Sprint 4 qualifying-match assumptions for citizenship XP.

## Key Changes

- Added `Match:Duration` as `MATCH_DURATION` in `flashistConstants.analyticEvents`.
- Centralized match-end analytics in `src/client/MatchStartAnalytics.ts`, preserving `Game:End` and firing `Match:Duration` alongside it when a fresh `Game:Start` timestamp is available.
- Wired `src/client/ClientGameRunner.ts` to store the active fresh-match start timestamp when `Game:Start` logs.
- Updated win/loss paths in `src/client/graphics/layers/WinModal.ts` and active abandon paths in `src/client/Main.ts` so duration is emitted for completed matches and explicit/client unload abandonment.
- Documented the event in `ai-agents/knowledge-base/analytics-event-reference.md`.
- Added `tests/client/MatchStartAnalytics.test.ts` coverage for duration event ordering, missing timestamp behavior, one-shot clearing, and abandon-style `Game:End` calls.

## Outcome

`Match:Duration` now gives the match lifecycle funnel an integer seconds value from fresh `Game:Start` to player match end. It remains additive to `Game:End`; downstream outcome events such as `Game:Win`, `Game:Loss`, and `Game:Abandon` continue to provide the outcome dimension.

## Related

- [[systems/analytics]]
- [[decisions/sprint-4]]
