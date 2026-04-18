# Task — Tutorial: Reduce Bot Count from 400 to 100

## Sprint
Sprint 4

## Priority
Low effort, meaningful impact on tutorial clarity. 400 bots makes the Iceland map extremely crowded — a new player has difficulty understanding what is happening and who they are fighting.

## Context

The tutorial match currently spawns 400 bot players. This is the same order of magnitude as a full multiplayer match and creates a chaotic, overwhelming experience for a first-time player who is still learning the basic controls.

Reducing to 100 bots makes the map less crowded, gives the player more room to expand, and makes it easier to follow the tooltip instructions without being immediately surrounded and eliminated.

This change is part of a set of tutorial difficulty reductions in Sprint 4:
- Remove nations (s4-tutorial-no-nations.md)
- Reduce bot count from 400 to 100 (this task)
- Lock build menu to City during tooltip 5 (s4-tutorial-build-menu-lock.md)

## Implementation

In `LocalServer.ts`, in `buildMissionConfigIfNeeded()` where the tutorial mission config is assembled, find the configuration value that sets the bot/player count and change it from 400 to 100.

This should be a single config value change. Confirm there is no other place where the bot count is set or overridden for tutorial matches.

## Verification

1. Start the tutorial — confirm approximately 100 bots are present on the Iceland map (not 400)
2. Play through the tutorial — confirm the match is completable and the win condition still fires correctly with fewer bots
3. Confirm non-tutorial matches are unaffected — bot count in normal matches unchanged

## Notes

- Combined with removing nations, the tutorial map should feel significantly more open and manageable for new players
- If 100 proves too few (map feels too empty), this is easy to tune — the value should be a named constant, not an inline number
