# Analytics P0: Game Mode Segmentation

**Source**: `ai-agents/tasks/done/analytics-p0-game-mode-segmentation.md`
**Status**: done
**Sprint/Tag**: Sprint 4 / analytics P0

## Goal

Segment match funnels by multiplayer versus solo immediately after the existing `Game:Start` anchor event, so downstream analytics can distinguish public/private multiplayer matches from solo, mission, and tutorial starts.

## Key Changes

- Added `Game:Mode:Multiplayer` and `Game:Mode:Solo` enum entries to `flashistConstants.analyticEvents` in `src/client/flashist/FlashistFacade.ts`.
- Centralized match-start analytics in `src/client/MatchStartAnalytics.ts`, emitting `Game:Start` first and then exactly one `Game:Mode:*` event based on `GameStartInfo.config.gameType`.
- Wired `src/client/ClientGameRunner.ts` to call the helper only for first real match starts, while suppressing reconnect handshakes and archived replay starts.
- Added `tests/client/MatchStartAnalytics.test.ts` coverage for public/private multiplayer, singleplayer, reconnect, same-runner duplicate start, and replay cases.
- Documented the events in `ai-agents/knowledge-base/analytics-event-reference.md` and the wiki analytics system page.

## Outcome

GameAnalytics funnels can now use `Game:Start -> Game:Mode:Multiplayer` and `Game:Start -> Game:Mode:Solo` as mode-specific match-start anchors. Reconnect and replay traffic stays out of these fresh-start funnels, avoiding false starts in retention and monetization analysis.

## Related

- [[systems/analytics]]
- [[decisions/sprint-4]]
