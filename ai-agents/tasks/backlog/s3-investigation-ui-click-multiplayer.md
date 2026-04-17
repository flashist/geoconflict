# Investigation — UI:ClickMultiplayer Event Firing Point

## Context

We want to measure the funnel: "player clicked JOIN on a multiplayer lobby → player successfully spawned and started playing." This would tell us what percentage of players who intend to join a match actually make it into the game — directly relevant for measuring the impact of HF-13 (map preloading) and understanding drop-off in the join flow.

The question is whether `UI:ClickMultiplayer` already gives us the right funnel anchor, or whether a new event is needed.

## What to Investigate

Find the exact call site of `UI:ClickMultiplayer` in the client codebase and answer:

1. **Where does it fire?** Is it on:
   - The multiplayer screen/menu button (opening the lobby browser)
   - The JOIN button on a specific lobby entry
   - Somewhere else entirely

2. **When exactly does it fire relative to the join flow?** For example — does it fire before or after the player selects a specific lobby? Before or after any loading begins?

3. **Is it fired once per join attempt, or can it fire multiple times in a single session** (e.g. if a player browses lobbies and clicks JOIN on several before one succeeds)?

4. **Given the firing point, is this event a reliable anchor for the funnel:**
   ```
   UI:ClickMultiplayer → Game:Start → Match:SpawnChosen/SpawnAuto
   ```
   Does the denominator (UI:ClickMultiplayer) cleanly represent "player intended to join a game"?

## Output Required

A short written answer to the four questions above. If `UI:ClickMultiplayer` fires on the JOIN button and represents a single join attempt, the existing funnel is already valid — no new event needed. If it fires earlier (e.g. on multiplayer screen open), recommend where a more precise `Match:JoinAttempted` event should be added.

## Effort

30 minutes — code search only, no implementation.
