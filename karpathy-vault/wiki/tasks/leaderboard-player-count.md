# Leaderboard Human Player Count

**Source**: `ai-agents/tasks/done/s4c-leaderboard-player-count.md`
**Status**: done
**Sprint/Tag**: Sprint 4c / stabilization quick win

## Goal

Show the current human-like player count directly in the leaderboard's "Players only" checkbox label so players can see how many real/AI-player participants remain without toggling the filter.

## Key Changes

- `src/client/graphics/layers/Leaderboard.ts` computes `humanPlayerCount` once in `render()` from the current `GameView.playerViews()`.
- The count is appended to `leaderboard.real_players_only`, yielding labels like `Players only (N)` and `Только игроки (N)` without adding localization keys.
- The count uses the same human-like player semantics as the existing filter in this code path: alive `PlayerType.Human` plus `PlayerType.AiPlayer`.
- The checkbox filter behaviour, sort order, row rendering, and top-five/show-all toggle are unchanged.

## Outcome

The completed task moved from backlog to done on 2026-06-02. The visible count updates from current game state while the leaderboard renders and remains visible whether the checkbox is checked or unchecked.

One detail differs from the original brief wording: the brief referenced `PlayerType.FakeHuman`, but the current leaderboard filter uses `PlayerType.AiPlayer`, matching the live AI-player system documented in [[features/ai-players]].

## Related

- [[decisions/sprint-4c]]
- [[systems/rendering]]
- [[features/ai-players]]
