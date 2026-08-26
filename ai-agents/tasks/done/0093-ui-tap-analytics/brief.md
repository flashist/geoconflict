# HF-3 — UI Tap Analytics: UI:Tap:{ElementId}

## ID
0093

## Status
✅ Done

## Owner
fkit-coder

## Context

There is currently no way to track which specific UI elements players interact with beyond the existing high-level UI events (`UI:ClickMultiplayer`, `UI:ClickSinglePlayer`, etc.). As the game adds more interactive elements — skip buttons, find-me button, announcements bell, etc. — ad-hoc per-element events would quickly pollute the event reference with one-off entries.

This task establishes a generic, reusable convention for tracking UI element interactions, and instruments the first two elements immediately as part of the Post-Sprint 2 hotfix.

**Immediate need:** the tutorial has two skip buttons (corner and inline) that both fire `Tutorial:Skipped` via the same `skipTutorial()` method. Without element-level tracking there is no way to distinguish which button was used — making it impossible to measure whether the inline skip link (HF-2) actually improved skip button visibility.

## Convention

**Event format:** `UI:Tap:{ElementId}`

- `UI` — category, consistent with existing UI events
- `Tap` — action, covers both mouse click and touch tap
- `ElementId` — PascalCase identifier for the specific element

**Rules:**
- This is **opt-in instrumentation** — `UI:Tap` events are only added to elements explicitly listed and approved. Do not automatically instrument all clickable elements.
- ElementId should be descriptive enough to identify the element without needing additional context: `TutorialSkipCorner` not `SkipBtn1`
- Each element gets its own enum key in `flashistConstants.analyticEvents`
- Event strings are never written inline — always referenced through the enum

## V1 — Elements to Instrument

Two elements only in this hotfix. Both are in `TutorialLayer.ts`.

| Enum Key | Event String | Element | When Fired |
|---|---|---|---|
| `UI_TAP_TUTORIAL_SKIP_CORNER` | `UI:Tap:TutorialSkipCorner` | Existing top-right corner skip button | Player clicks/taps the corner skip button during tutorial |
| `UI_TAP_TUTORIAL_SKIP_INLINE` | `UI:Tap:TutorialSkipInline` | New inline skip link added in HF-2 | Player clicks/taps the inline skip link during tutorial |

**Firing order:** `UI:Tap:{ElementId}` fires first, then `skipTutorial()` executes. This ensures the tap event is always recorded even if something in the skip flow fails.

**Dependency:** HF-2 must be implemented before HF-3 can instrument `UI:Tap:TutorialSkipInline` — the inline button needs to exist first.

## What This Unlocks

With both events instrumented you can answer:
- What proportion of skips come from the corner button vs the inline link?
- Did adding the inline link (HF-2) meaningfully increase total skip rate, or just shift which button players use?
- At which tooltip number do players most commonly skip — combine with `Tutorial:TooltipShown:N` data

## Update Analytics Event Reference

Add the following to the analytics event reference document (`analytics-event-reference.md`) under the UI Events section:

**New events table entries:**

| Enum Key | Event String | When Fired |
|---|---|---|
| `UI_TAP_TUTORIAL_SKIP_CORNER` | `UI:Tap:TutorialSkipCorner` | Player clicks the corner skip button during tutorial |
| `UI_TAP_TUTORIAL_SKIP_INLINE` | `UI:Tap:TutorialSkipInline` | Player clicks the inline skip link during tutorial |

**New convention note** to add below the UI Events table:

> **UI:Tap convention:** `UI:Tap:{ElementId}` is the standard pattern for tracking specific UI element interactions. ElementId is PascalCase and descriptive. This is opt-in — only elements explicitly listed in this reference are instrumented. Do not add UI:Tap events without updating this document.

## Future Candidates

Do not instrument in this hotfix. Add when the relevant tasks ship:

| Event String | Element | Task |
|---|---|---|
| `UI:Tap:FindMeButton` | Find me button | Task 4b |
| `UI:Tap:AnnouncementsBell` | Announcements bell icon | Task 8d Part A |
| `UI:Tap:SpawnIndicator` | Spawn indicator tap | Task 4e |

## Verification

1. Click the corner skip button during tutorial — `UI:Tap:TutorialSkipCorner` appears in GameAnalytics, followed by `Tutorial:Skipped`
2. Click the inline skip link during tutorial — `UI:Tap:TutorialSkipInline` appears in GameAnalytics, followed by `Tutorial:Skipped`
3. Neither event fires outside of the tutorial context
4. Both enum keys present in `flashistConstants.analyticEvents`
5. Analytics event reference updated with new entries and convention note
