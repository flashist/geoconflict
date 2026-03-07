# Task 4c — Auto-Expansion for Inactive Players (Multiplayer Only)

## Context

After a player spawns — either manually or via the auto-spawn mechanic (Task 4a) — some players make no further input at all. They joined the match but are not actively playing. Currently these ghost players sit as a static dot on the map, accumulating troops but never expanding. They get swallowed by neighbors quickly, leave a dead zone on the map, and contribute nothing to match dynamics.

This task adds a short-lived automatic expansion behavior that activates only for inactive players in the early game, giving them a minimal territorial foothold without requiring any input. The moment a player makes any action themselves, the auto-expansion stops permanently.

## Design

**Trigger conditions — all must be true for auto-expansion to activate:**
- The match is multiplayer (`GameType.Public` or `GameType.Private`) — not singleplayer missions
- The player has not made any input since spawning (no clicks, no taps, no intents sent)
- The current time is within 1 minute of the player's spawn moment
- There is at least one unoccupied tile (terra nullius) adjacent to the player's territory

**Expansion behavior:**
- One auto-expansion click is emitted every 10 seconds
- Maximum 6 auto-expansions total (10s × 6 = 60 seconds)
- Each auto-expansion targets an adjacent unoccupied tile — never an opponent's or bot's territory, never a tile belonging to any other player
- The expansion uses the same intent pipeline as a normal player attack (`AttackExecution`) — it is not a special case, just an automatically triggered intent
- The troop send amount should follow the same default as a normal player expansion click (approximately 30% of current troops, consistent with `boatAttackAmount` / default send ratio for humans) — do not send 100% of troops

**Cancellation — auto-expansion stops immediately and permanently when:**
- The player makes any input (click, tap, any intent is sent by the player)
- 1 minute has elapsed since spawn
- There are no adjacent unoccupied tiles to expand into
- The player is eliminated

Once cancelled, auto-expansion never re-engages for that player in that session, even if they go idle again later.

## Implementation Notes

**Intent pipeline:** auto-expansion should go through the normal `AttackExecution` intent pipeline — do not bypass it. This ensures determinism across all clients, which is critical in this codebase. The auto-expansion logic should emit the same intent a player would emit by clicking an adjacent tile, with the same validation.

**Determinism:** any timing or tile selection logic must use `PseudoRandom` (seeded) rather than `Math.random()`. The auto-expansion behavior must produce identical results on all clients given the same game state. Do not introduce any nondeterministic code in `src/core/`.

**Tile selection:** when multiple adjacent unoccupied tiles are available, select consistently — for example the tile with the lowest `TileRef` value, or the first in a deterministic sort order. Do not select randomly unless using `PseudoRandom`.

**Player activity detection:** the simplest reliable signal is whether the player has sent any intent since spawning. A boolean flag per player, set to `true` on first intent received, is sufficient. Check this flag before each scheduled auto-expansion tick.

**Scope:** multiplayer only. Check `GameType` before activating — if the match is `Singleplayer`, this feature should never activate.

**No UI needed:** auto-expansion is silent. The player does not see a notification that it is happening. The territory simply grows slightly, same as if they had clicked.

## What "Done" Looks Like

- In a multiplayer match, a player who spawns and makes no input will have their territory slowly expand into adjacent unoccupied tiles, one expansion every 10 seconds, for up to 1 minute
- After 1 minute, auto-expansion stops completely regardless of player activity
- If the player makes any click or action before 1 minute is up, auto-expansion stops immediately and does not resume
- Auto-expansion never targets another player's or bot's territory under any circumstances
- In singleplayer missions, this feature does not activate at all
- The behavior is deterministic — all clients see the same auto-expansion without desync

## Verification

1. **Ghost player test:** join a multiplayer match and make no input after spawning — territory should expand into adjacent unoccupied tiles roughly every 10 seconds for up to 1 minute, then stop
2. **Cancellation test:** join a multiplayer match, wait 20 seconds (2 auto-expansions), then make a click — auto-expansion should stop immediately after the manual input
3. **No-attack test:** in a situation where all adjacent tiles are occupied by other players, auto-expansion should not fire at all — verify no unintended attacks occur
4. **Singleplayer test:** start a singleplayer mission and make no input — auto-expansion must not activate
5. **Desync test:** run a multiplayer match with multiple clients and verify no desync errors are triggered by the auto-expansion behavior

## Dependencies

- Task 4a (auto-spawn) should ship before or alongside this task — auto-expansion is most valuable when combined with auto-spawn, since a player who was auto-spawned is more likely to be inactive
- No dependency on Task 4 (tutorial) — these are independent

## Notes

- At most 6 auto-expansion clicks over 1 minute, the territorial gain is minimal — roughly equivalent to a player who joined, made a few early clicks, and then went idle. This is intentional. The goal is not to make ghost players competitive, but to prevent them from being instant zero-territory dots.
- The 1-minute duration and 10-second interval are the V1 values. They should be defined as named constants, not hardcoded inline, so they can be easily adjusted later without searching the codebase.
- If the 1-minute window proves too long after observing match data, it can be reduced to 40 seconds by changing a single constant.
