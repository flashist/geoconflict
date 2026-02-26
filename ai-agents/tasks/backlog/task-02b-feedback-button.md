# Task 2b — In-Game Feedback Button

## Context

Currently the only way for players to send feedback is through Yandex's built-in review mechanism. This is slow, designed for post-session star ratings, and not suitable for reporting specific bugs or problems mid-experience. By the time a player reaches that flow, they have already left the game and the emotional context of the problem has faded.

We are about to make a significant number of changes to the game. Getting a direct feedback channel live as early as possible means we can hear from players about each change as it lands, rather than discovering problems weeks later through analytics or platform reviews.

## Goal

Add a feedback button in two places in the game — the start screen and the battle screen — that allows players to send a short report at any point. Reports should arrive with enough automatic context attached that they are actionable without requiring the player to provide technical details themselves.

## Placement

**Start screen:** place the button in the bottom bar, next to the existing settings gear icon in the bottom right corner. The bottom bar is already established as the place for utility/meta actions and the feedback button belongs in the same category. It should not compete visually with the primary actions (join game, play mission, singleplayer).

**Battle screen:** place the button in the top right corner, next to the existing settings and exit icons. This area already contains utility controls so the placement is consistent with the existing UI language.

The button must use the same icon and color in both locations — a player who discovers it in one place should immediately recognize it in the other. **Use the existing `FeedbackIconWhite.svg` speech bubble icon.** **Do not use red** as the button color — red signals errors or alerts in game UI and would send the wrong message.

**Note on visual distinction:** the game already has chat-related UI elements. Make sure the feedback button is visually distinct enough from any existing chat icons — if needed, consider adding a small distinguishing detail (such as a small pencil or exclamation mark overlaid on the bubble) to avoid players confusing it with in-game chat.

## What Happens When the Button Is Tapped

A lightweight overlay appears — not a full-screen form. It must be instantly dismissible so players in the middle of a match are not disrupted. The form contains:

- A category selector: **Bug / Suggestion / Other**
- A free-text field (optional — not mandatory)
- A send button
- A brief confirmation message after sending: *"Thanks, we read every report"*
- An optional contact field for players who want a response (not mandatory)

## Automatic Context Attached to Every Submission

The following should be attached automatically — the player should never need to provide this themselves:

- Platform (mobile / desktop)
- Yandex login status (logged in / anonymous)
- Current game version
- Last match ID (if the player just finished or is currently in a match)
- Timestamp
- Which screen the button was opened from (start screen or battle screen)

## Admin Side

Submissions must be readable by the team. A simple list view is sufficient for V1 — category, free text, attached context, timestamp. No complex tooling required, but the submissions must land somewhere accessible.

## Analytics

Two events should be tracked as part of this task:

- **Feedback button opened** — player tapped the button and the form appeared. Tracks visibility and discoverability of the button across both placements.
- **Feedback submitted** — player completed and sent a report. The ratio between opened and submitted reveals whether the form itself is causing drop-off.

Both events should include which screen the button was opened from (start screen or battle screen).

## Dependencies and Notes

- If the analytics infrastructure from Task 1 is already live, the automatic context attachment can reuse the same session data. If not, context should be collected and attached directly to the feedback submission independently — this task should not be blocked by Task 1.
- This task has no dependencies on any other task in the plan and can be shipped immediately after Task 2a.
