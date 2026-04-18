# Task — Tutorial: Remove Nations, Keep Only Bots

## Sprint
Sprint 4

## Priority
Low effort, high impact on new player experience. Makes the tutorial trivially winnable, reducing frustration for first-time players who are still learning the controls.

## Context

The tutorial currently runs on the Iceland map with all opponents set to `Difficulty.Easy`. However, "all nations" are included — nation bots behave like AI players controlling large territories and can be aggressive even on Easy difficulty.

The fix: configure the tutorial match to use **only regular bot players** (no nation bots). This means the tutorial opponents are small, simple bots that are easy to defeat, making it almost impossible for a new player to lose the tutorial match.

The goal is not challenge — it is teaching. A player who loses the tutorial learns nothing useful except frustration. A player who wins easily learns the mechanics and feels confident.

---

## Implementation

In `LocalServer.ts`, in `buildMissionConfigIfNeeded()` where the tutorial config is assembled:

Find where nations are added to the tutorial match config and either:
- Set nation count to 0 for tutorial matches, or
- Pass a flag that excludes nations from the lobby when `config.isTutorial = true`

The current setup sets all nations to `Difficulty.Easy` — the change is to not add them at all.

**Confirm:** are "nations" and "bot players" configured separately in the mission config? The specialist should check what the current tutorial config looks like and identify the minimal change to exclude nations while keeping regular bot players.

---

## Verification

1. Start the tutorial — confirm no nation territories appear on the Iceland map
2. Play through the tutorial — confirm only small bot players are opponents
3. Confirm the tutorial is completable (win condition still works without nations present)
4. Confirm skip still works normally
5. Confirm no regression for non-tutorial matches — nations should still appear in normal games

## Notes

- This is a config-only change — no game logic changes required
- If "bot players" and "nations" are the same underlying system in the tutorial context, clarify with the specialist before implementing
- Combined with the action-pause task, the tutorial becomes significantly more accessible: game pauses during required actions AND opponents are trivially easy
