# Double Page Reload Fix

**Date**: 2026-04-15
**Status**: accepted

## Context

On certain browser refreshes, the game page loaded **twice in quick succession** — two separate JavaScript contexts, two `DOMContentLoaded` events, two sets of analytics. Discovered while investigating why `tutorialAttemptCount` incremented by +2 instead of +1.

The root cause was `#refresh` being pushed into the URL history after any game started, then `handleHash()` in `Main.ts` triggering a `window.location.href` redirect — which queued a navigation but let JS execution continue, causing both the original page and the new clean page to run initialization.

Source: `ai-agents/knowledge-base/double-reload-findings.md`

## Decision

**PR #45:** Skip `#refresh` history push for tutorial games (first partial fix).

**HF-9:** Remove the entire `#refresh` history push for all game types. The `#refresh` push was part of a two-step history pattern (`#refresh → #join=gameID`), but `#join=gameID` is disabled for all game types (Flashist Adaptation), making `#refresh` a no-op that only caused the double-reload.

```ts
// Removed: #refresh history push.
// Originally part of a two-step history pattern (#refresh → #join=gameID).
// #join=gameID is disabled for all game types (Flashist Adaptation),
// making #refresh a no-op that caused double page reloads on browser refresh.
```

**PR #45 (also):** Added NaN guard in `TutorialStorage.ts` for `tutorialAttemptCount` — prevents corrupted localStorage from permanently breaking the counter.

## Consequences

**Fixed:** All known double-reload causes resolved as of HF-9.

**Analytics impact (historical, pre-fix):** The following events fired twice per affected session:
- `Session:Start`, `Device:*`, `Platform:*` — all doubled
- `Player:New` + `Player:Returning` fired for the same new user (first load writes key, second load finds it)
- `Experiment:*` — doubled for all flags
- `Tutorial:Started` — fixed in PR #45 (before HF-9 for tutorial specifically)

**Still unknown (at time of investigation):**
- Actual frequency of double-reload in production (only affects sessions after ≥1 game was started)
- Whether GameAnalytics SDK deduplicates rapid identical events
- Magnitude of funnel denominator inflation from doubled `Session:Start`

## Related

- [[systems/game-overview]] — `#join=gameID` disable context (Flashist Adaptation)
- [[decisions/hotfix-post-sprint2]] — HF-9 + PR #45 shipped here
- [[systems/analytics]] — events affected by the double-fire
- [[features/tutorial]] — `Tutorial:Started` was the symptom that revealed this bug
- [[decisions/stale-build-zombie-tabs]] — separate but related browser/tab lifecycle issue
