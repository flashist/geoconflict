# Analytics P0: Player Days Played

**Source**: `ai-agents/tasks/done/analytics-p0-player-days-played.md`
**Status**: done
**Sprint/Tag**: Sprint 4 / analytics P0

## Goal

Add a loyalty-depth analytics event so GameAnalytics can distinguish day-2 returners from long-running players and support citizenship-threshold analysis around the `100` qualifying-match target.

## Key Changes

- Added `Player:DaysPlayed` as `PLAYER_DAYS_PLAYED` in `flashistConstants.analyticEvents`.
- Added `src/client/DaysPlayedAnalytics.ts` to persist cumulative unique local calendar days under `geoconflict.player.daysPlayed` and `geoconflict.player.lastPlayedDate`.
- Wired `FlashistFacade` to fire `Player:DaysPlayed` immediately after `Player:New` or `Player:Returning` in the session-start baseline.
- Treated same-day sessions as the same value and a later session after any gap as a single-day increment, not a gap-size increment.
- Wrapped storage reads and writes so unavailable `localStorage` silently skips the event instead of breaking session startup.
- Documented the event in `ai-agents/knowledge-base/analytics-event-reference.md`.
- Added `tests/client/DaysPlayedAnalytics.test.ts` coverage for first session, same-day repeats, next-day increment, gap handling, corrupted storage, and unavailable storage.

## Outcome

`Player:DaysPlayed` now records the number of distinct local calendar days on which the player opened the game. This gives Sprint 4 monetization work a loyalty-depth axis that `Player:New` and `Player:Returning` cannot provide on their own.

## Related

- [[systems/analytics]]
- [[decisions/sprint-4]]
