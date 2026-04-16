# Hotfix Release — Post-Sprint 2

**Date**: 2026 (completed)
**Status**: accepted

## Context

Small hotfix release between Sprint 2 and Sprint 3. Tutorial was live and generating data — time-sensitive fixes to analytics and UX.

Source: `ai-agents/sprints/done/hotfix-post-sprint2.md`

## What Was Shipped

| HF | Description | Status |
|---|---|---|
| HF-1 | Experiment flag analytics — `Experiment:Tutorial:Enabled/Disabled` at flag eval point | ✅ Done |
| HF-2 | Tutorial skip button — inline "Skip tutorial" link in each tooltip modal | ✅ Done |
| HF-3 | UI:Tap analytics — `UI:Tap:TutorialSkipCorner` + `UI:Tap:TutorialSkipInline` convention | ✅ Done |
| HF-4 | Mobile control panel hit area bug — transparent container blocked right half of map | ✅ Done |
| HF-5 | Win condition detection bug | ⛔ Cancelled & reverted |
| HF-6 | Auto-spawn failure on late join (catch-up window bug) | ✅ Done |
| HF-7 | Build number tracking via GameAnalytics Custom Dimension 01 | ✅ Done |
| HF-8 | Tutorial attempt count on `Tutorial:Started` event value | ✅ Done |
| HF-9 | Remove `#refresh` history push for all game types (double-reload fix) | ✅ Done |
| HF-10 | Cache busting & build freshness guarantee | ⏳ Pending |
| PR #45 | Double-reload fix for tutorial games + NaN guard on attempt counter | ✅ Done |

## Key Decisions

**HF-3 convention established:** `UI:Tap:{ElementId}` is opt-in tracking for specific UI elements. ElementIds are PascalCase, registered in `flashistConstants.uiElementIds`. Fire via `logUiTapEvent()`. This convention applies to all future UI instrumentation.

**HF-5 cancelled:** ghost-bot logic in `WinCheckExecution.ts` too entangled. Reverted. See [[decisions/cancelled-tasks]] for details and re-attempt guidance.

**HF-6 (auto-spawn late join):** fix ships `Match:SpawnRetryAfterCatchup` event as the key signal. `Match:SpawnMissed:CatchupTooLong` (Problem 2) still unfixed — tracked as separate follow-up.

**HF-9 (double-reload):** one-line change — delete `history.pushState` block in `handleJoinLobby()`. Completed the fix for all game types after PR #45 fixed tutorial only.

## Consequences

- `Experiment:Tutorial:*` events now exist — control group funnels unblocked
- Build number segmentation enables per-deploy metric attribution
- HF-10 still pending — stale build sessions still possible until cache busting ships

## Related

- [[decisions/sprint-2]] — sprint this hotfix follows
- [[decisions/sprint-3]] — next sprint
- [[decisions/autospawn-late-join-fix]] — HF-6 detail
- [[decisions/double-reload-fix]] — HF-9 + PR #45 detail
- [[decisions/cancelled-tasks]] — HF-5 cancellation detail
- [[systems/analytics]] — event conventions established here
- [[features/tutorial]] — tutorial context for HF-1/2/3
- [[features/feedback-button]] — HF-3 established UI:Tap convention used by feedback button's analytics
