# Tutorial Feature

**Status**: active
**Source files**: `src/client/graphics/layers/TutorialLayer.ts`, `src/client/Main.ts`, `src/client/LocalServer.ts`, `src/client/TutorialStorage.ts`

## Summary

Guided singleplayer bot match auto-launched for first-time players. Gated behind a Yandex A/B experiment flag (`tutorial = enabled`) and `localStorage.tutorialCompleted`. Runs on Iceland map with all-Easy bots. 7-step tooltip sequence teaches territory control, attacking, and building.

Source: `ai-agents/knowledge-base/tutorial-technical-description.md`

## Implementation

**Entry point:** `src/client/Main.ts` — checked early in initialization before normal lobby. Requires experiment flag active AND `localStorage.tutorialCompleted` not set. Calls `startTutorial()` → dispatches `join-lobby` event with `config.isTutorial = true`.

**Map setup:** `LocalServer.ts` detects `isTutorial` in `buildMissionConfigIfNeeded()` → sets Iceland map, all nations to `Difficulty.Easy`.

**TutorialLayer:** Plain class implementing `Layer` interface (not LitElement). Instantiated by `GameRenderer` when `game.config().gameConfig().isTutorial` is true.

On `init()`:
- Hides `#game-top-right` DOM element (settings/sidebar) to avoid overlap
- Injects a persistent "Skip tutorial" button into `document.body` (fixed, top-right, `z-index: 10001`)
- Registers `ContextMenuEvent` listener to detect radial menu open over own territory (gates tooltip 5)

**Tooltip rendering:** Full-screen semi-transparent backdrop (`z-index: 10000`) + centered modal. While active: game near-paused via `ReplaySpeedChangeEvent(100)` (100× interval). Speed restored on dismiss or skip.

## Tooltip Sequence (7 steps)

| # | Trigger | Content |
|---|---|---|
| 1 | Player has spawned | Choose starting position |
| 2 | Spawn phase ended | Tap neighbor to attack (mobile shows radial menu image) |
| 3 | Player gold ≥ 125,000 | Enough gold to build City |
| 4 | Immediately after tooltip 3 dismissed | Right-click / tap your territory |
| 5 | Player opens radial menu over own territory | Open build menu → select City (shows build menu images) |
| 6 | Player's first City built (`GameUpdateType.Unit` + `UnitType.City`) | Cities increase max population |
| 7 | Immediately after tooltip 6 dismissed | Ready for real matches |

Tooltip 4 resets `radialMenuOpened` flag so tooltip 5 only fires after tooltip 4's instruction is followed.

## Completion Paths

| Path | Outcome |
|---|---|
| Player wins the match | `WinModal.handleMissionProgress()` → `tutorialCompleted`, fires `Tutorial:Completed` |
| Player closes tooltip 7 | `TutorialLayer.dismissTooltip()` → `tutorialCompleted`, fires `Tutorial:Completed` |
| Player clicks Skip | `TutorialLayer.skipTutorial()` → `tutorialCompleted`, fires `Tutorial:Skipped` + `Tutorial:Duration`, navigates to root |

## Analytics Events

| Event | When |
|---|---|
| `Tutorial:Started` | Tutorial match begins. **Value:** lifetime attempt count (persisted in `localStorage.tutorialAttemptCount`) |
| `Tutorial:TooltipShown:N` | Tooltip N appears (N = 1–7, built at runtime) |
| `Tutorial:TooltipClosed:N` | Tooltip N dismissed |
| `Tutorial:Skipped` | Skip button clicked |
| `Tutorial:Completed` | Tutorial finishes |
| `Tutorial:Duration` | Fired alongside Skipped/Completed; value = seconds elapsed |

## Gotchas / Known Issues

- **Historical note:** Before `Experiment:Tutorial:Enabled` shipped, `Tutorial:Started` was used as an imperfect cohort proxy. Use it as anchor for historical comparisons, not `Experiment:Tutorial:*`.
- **Double-reload (pre-HF-9):** `Tutorial:Started` could fire twice per session. Fixed in HF-9. See [[decisions/double-reload-fix]].
- **tutorialAttemptCount NaN guard:** Added in PR #45 — `TutorialStorage.ts` guards against `parseInt` returning `NaN` on corrupted localStorage.

## Related

- [[systems/analytics]] — analytics infrastructure and event conventions
- [[decisions/sprint-1]] — analytics baseline and Sentry shipped to support tutorial measurement
- [[decisions/sprint-2]] — sprint where tutorial was built and shipped
- [[decisions/hotfix-post-sprint2]] — HF-1/2/3 tightened tutorial analytics and skip UX
- [[decisions/autospawn-late-join-fix]] — auto-spawn bug was especially damaging in tutorial context
- [[decisions/double-reload-fix]] — caused `Tutorial:Started` double-fire before HF-9
- [[tasks/session-start-sequence]] — `Player:New` segmentation is primary mechanism for measuring tutorial impact
