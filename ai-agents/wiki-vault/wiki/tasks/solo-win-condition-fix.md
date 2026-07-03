# Solo Opponent Win Condition Fix

**Source**: `ai-agents/tasks/done/s4-solo-win-condition-fix.md`
**Status**: done
**Sprint/Tag**: Sprint 4

## Goal

Fix solo missions and singleplayer/custom games so the match ends when an opponent reaches the win threshold. The player should see a distinct loss state because an opponent won, not the existing elimination/death screen, and the player must not be able to win after that opponent victory has already ended the match.

## Key Changes

- Updated `src/core/execution/WinCheckExecution.ts` so a Bot-team winner is accepted in `GameType.Singleplayer`, while Bot-team wins are still ignored outside singleplayer.
- Preserved clientless FFA opponent winners as explicit opponent winners so the client can distinguish "opponent won" from "player was eliminated".
- Updated `src/client/graphics/layers/WinModal.ts` to detect non-tutorial singleplayer win updates where the winner is an opponent, another team, or another player while the local player is still alive.
- Added a distinct opponent-win loss modal using `win_modal.opponent_won_title` and `win_modal.opponent_won_body` in `resources/lang/en.json` and `resources/lang/ru.json`.
- Added `Match:Loss:OpponentWon` to `flashistConstants.analyticEvents` and the analytics reference. The modal also logs `Game:End` and `Game:Loss` before the reason-specific loss event.
- Added tests in `tests/core/executions/WinCheckExecution.test.ts` and `tests/client/WinModal.test.ts` covering singleplayer Bot-team wins, non-singleplayer Bot-team suppression, clientless FFA opponent winners, the distinct loss modal, tutorial exclusion, and elimination-modal preservation.

## Outcome

Solo modes now have a clear game-end path when a nation, bot team, or other opponent wins before the human player. The fix is intentionally scoped away from tutorial behavior and multiplayer behavior. The loss state is tracked once with `Match:Loss:OpponentWon`, and the winner is still sent through the existing `SendWinnerEvent`/archive path so match-end recording remains consistent.

## Related

- [[decisions/sprint-4]] — Sprint 4 bug-fix context
- [[systems/execution-pipeline]] — win checks emit `Win` updates through the core execution path
- [[systems/game-loop]] — schedules `WinCheckExecution` in deterministic replay
- [[systems/analytics]] — `Match:Loss:OpponentWon` event reference
- [[systems/match-logging]] — archived winners can include solo opponent winners
