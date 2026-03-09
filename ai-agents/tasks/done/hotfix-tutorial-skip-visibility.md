# Hotfix — Tutorial Skip Button Visibility

## Priority
Hotfix release between Sprint 2 and Sprint 3. Tutorial is live now — ship alongside the experiment analytics events fix (task-experiment-analytics.md).

## Context

The current "Skip tutorial" button is fixed in the top-right corner of the screen. When a tooltip modal is active, the player's attention is on the modal center — reading the tooltip text and the "Got it" button. The skip option in the corner is spatially disconnected from this focus area and easy to miss, particularly on large desktop screens where the distance between the modal and the corner button is significant.

Players who don't notice the skip option and feel stuck or uninterested may close the tab entirely instead of skipping to the lobby. A silent tab close is a worse outcome than a conscious skip — the skip leads to the lobby and a potential first real match, the tab close is a lost player.

## What "Done" Looks Like

Add a secondary skip link directly inside each tooltip modal, below the "Got it" button:

- **Text:** "Skip tutorial"
- **Style:** small, plain white text with underline — visually subordinate to the "Got it" button, similar to an old-school HTML link. Not a button, not styled with a border or background.
- **Position:** centered below the "Got it" button, with a small gap between them
- **Behavior:** identical to the existing top-right skip button — sets `tutorialCompleted = true`, fires `Tutorial:Skipped` + `Tutorial:Duration`, navigates to the lobby

The existing top-right corner skip button should **remain in place** — do not remove it. The inline link is an addition, not a replacement. Players who notice the corner button can still use it; the inline link serves players whose attention stays on the modal.

## Implementation Notes

The change is purely in `TutorialLayer.ts` — the tooltip modal rendering. Add the underlined text link below the "Got it" button in the modal HTML, wired to the same `skipTutorial()` method already called by the corner button.

No new analytics events needed in this task — skip button analytics are handled separately in HF-3 (UI Tap Analytics). The `skipTutorial()` method should not be modified here.

## Verification

1. Open the tutorial — the skip link appears below "Got it" in every tooltip modal
2. Click the inline skip link — `tutorialCompleted` is set, `Tutorial:Skipped` fires, player lands in the lobby
3. The corner skip button still works independently
4. On mobile — the inline link is readable and tappable without being too prominent
5. The link is visually subordinate to "Got it" — it should not compete with the primary action

## Notes

- "Skip tutorial" is the correct label — not just "Skip". A player should know what they're skipping, and "Skip" alone could be interpreted as "skip this tooltip only."
- Keep the styling minimal — this should feel like an escape hatch, not a second primary button. If it's too prominent it undermines the tutorial by making skipping feel like the recommended action.
