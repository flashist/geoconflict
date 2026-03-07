# Tutorial — Technical Description

## Overview

The tutorial is a guided singleplayer bot match that auto-launches for first-time players, gated behind a Yandex A/B experiment flag (`tutorial = enabled`). It runs on the **Iceland** map with all-Easy bots. Completion is stored in `localStorage` under the key `tutorialCompleted` and prevents re-triggering on subsequent sessions.

---

## Entry Point & Gating

- Checked in `src/client/Main.ts` early in initialization, before the normal lobby is shown.
- Requires both: experiment flag active **and** `localStorage.tutorialCompleted` not set.
- If conditions are met, `startTutorial()` is called, which dispatches a `join-lobby` event with `config.isTutorial = true` and no interstitial ad.
- `src/client/LocalServer.ts` detects `isTutorial` in `buildMissionConfigIfNeeded()` and sets the map to Iceland with all nations set to `Difficulty.Easy`.

---

## UI Structure (`TutorialLayer`)

**File:** `src/client/graphics/layers/TutorialLayer.ts`
**Type:** Plain class implementing the `Layer` interface (not LitElement). Instantiated directly by `GameRenderer` when `game.config().gameConfig().isTutorial` is true.

On `init()`:
- The `#game-top-right` DOM element (settings/right sidebar) is hidden to avoid overlap with the skip button.
- A persistent **"Skip tutorial"** button is injected into `document.body` (fixed position, top-right corner, `z-index: 10001`).
- A `ContextMenuEvent` listener is registered to track when the player opens the radial menu **over their own territory** (used to gate tooltip 5).

Each tooltip renders a full-screen semi-transparent backdrop (`z-index: 10000`) with a centered modal box containing text and a **"Got it"** dismiss button. While any tooltip is active, the game is **near-paused** by emitting `ReplaySpeedChangeEvent(100)` (100× turn interval). Speed is restored to `ReplaySpeedMultiplier.normal` on dismiss or skip.

---

## Tooltip Sequence (7 steps)

| # | Trigger condition | Desktop text (EN) | Mobile text (EN) | Images |
|---|---|---|---|---|
| 1 | Player has spawned (`myPlayer.hasSpawned()`) | "You are here. Tap any land tile to choose your starting position." | *(same)* | none |
| 2 | Spawn phase has ended (`!game.inSpawnPhase()`) | "Tap a neighboring territory to attack." | "Tap a neighboring territory and select the attack icon to attack." | Mobile only: `/images/helpModal/radialMenu3.webp` (centered, max-width 80%) |
| 3 | Player gold ≥ 125,000 | "You have enough gold to build a City." | *(same)* | none |
| 4 | Immediately after tooltip 3 is dismissed | "Right-click on your territory." | "Tap on your territory." | none |
| 5 | Player opens radial menu over own territory (after tooltip 4) | "Open the build menu and select City." | *(same)* | `/images/helpModal/radialMenu4.webp` + `/images/helpModal/radialMenu5.webp` (side by side, max-width 45% each) |
| 6 | Player's first city is built (`GameUpdateType.Unit` update with `UnitType.City`) | "Cities increase your maximum population." | *(same)* | none |
| 7 | Immediately after tooltip 6 is dismissed | "You're ready for real matches! Find tips and controls in the instructions anytime." | *(same)* | none |

**Notes:**
- Only one tooltip is active at a time. New tooltips only check while `activeTooltip === null`.
- When tooltip 4 triggers, the `radialMenuOpened` flag is **reset** so tooltip 5 only fires after the player responds to tooltip 4's instruction.
- Closing tooltip 7 sets `localStorage.tutorialCompleted = true` and fires `Tutorial:Completed`.

---

## Completion Paths

| Path | What happens |
|---|---|
| Player wins the match | `WinModal.handleMissionProgress()` sets `tutorialCompleted`, fires `Tutorial:Completed` |
| Player closes tooltip 7 (final tooltip) | `TutorialLayer.dismissTooltip()` sets `tutorialCompleted`, fires `Tutorial:Completed` |
| Player clicks "Skip tutorial" | `TutorialLayer.skipTutorial()` sets `tutorialCompleted`, fires `Tutorial:Skipped` + `Tutorial:Duration`, navigates to root |

---

## Analytics Events

All events go through `flashist_logEventAnalytics`. Event strings are built from constants in `flashistConstants.analyticEvents`.

| Event string | When |
|---|---|
| `Tutorial:Started` | Tutorial match begins |
| `Tutorial:TooltipShown:1` – `Tutorial:TooltipShown:7` | Each tooltip appears |
| `Tutorial:TooltipClosed:1` – `Tutorial:TooltipClosed:7` | Each tooltip is dismissed |
| `Tutorial:Skipped` | Skip button clicked |
| `Tutorial:Completed` | Tutorial finishes (win or final tooltip closed) |
| `Tutorial:Duration` | Fired alongside `Tutorial:Skipped` or `Tutorial:Completed`; value = seconds elapsed since tutorial started |
