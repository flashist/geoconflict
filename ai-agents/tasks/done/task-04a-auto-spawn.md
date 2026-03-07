# Task 4a — Auto-Spawn: Automatic Starting Location on Join

## Context

A significant number of players — particularly new ones — never choose a spawn location during the spawn phase. The current flow requires a player to click or tap the map to select their starting position. A text prompt exists, but it is easy to miss, especially on mobile where the UI is dense and the prompt may not be prominent enough.

The result is a player who sits through the entire spawn phase without a territory and either enters the match as a ghost with no position, or misses the spawn window entirely and cannot join the active match.

**Spawn phase durations (at Flashist 1.5× speed):**
- Multiplayer: 300 ticks ≈ 20 seconds
- Singleplayer: 100 ticks ≈ 6.7 seconds

20 seconds is a short window for a new player who is still orienting themselves to the map, reading the UI, and figuring out what they're supposed to do. Auto-spawn removes this as a point of failure entirely.

**Analytics baseline:** Task 2j (spawn behavior anomaly investigation) is now resolved and deployed. The `Match:SpawnChosen` event was previously only firing on touch events — mouse clicks on desktop were not captured. After the fix, Funnel 7 shows a real ghost rate of approximately 20% on both desktop and mobile. This is the confirmed baseline to measure against after Task 4a ships. The ghost rate is platform-agnostic — not a mobile crash problem — confirming that auto-spawn is the right intervention for both platforms.

## Goal

Place every player automatically at a valid spawn location the moment they join the match. Players retain the full ability to reposition by tapping or clicking any valid location at any point during the remaining spawn phase. Auto-spawn is a default starting point, not a lock.

## What "Done" Looks Like

- Every player is automatically placed at a valid spawn location instantly on join, before any input is required
- A brief contextual message appears near the placed location: *"You've been placed here — tap anywhere to choose a different starting point"*
- The message is clearly visible on both desktop and mobile
- The player can reposition freely at any point during the remaining spawn phase by clicking or tapping any valid location — this overrides the auto-placement exactly as a normal spawn click would
- After the spawn phase ends, the auto-placed position is locked in if the player made no repositioning choice
- This applies to all game types: `GameType.Public`, `GameType.Private`, and `GameType.Singleplayer`

## Implementation Notes

**Intent pipeline:** auto-spawn must go through the existing `SpawnExecution` intent pipeline — the same path as a normal player spawn click. Do not bypass it. This preserves determinism across all clients.

**Determinism:** spawn location selection must use `PseudoRandom` (seeded), never `Math.random()`. The selected tile must be identical on all clients given the same game state. This is a hard requirement — any nondeterministic code in `src/core/` will cause desyncs.

**Spawn location quality:** purely random placement can put a new player in a poor strategic position — surrounded by strong opponents with no room to expand — leading to early elimination before they've understood the game. The developer should check whether placement can be biased toward lower-competition areas: map edges, zones with fewer nearby opponents, or tiles with more adjacent unoccupied land. If this is straightforward to implement deterministically, it should be included. If it adds significant complexity, random valid placement is acceptable for V1 and can be refined in a later pass.

**Repositioning:** the auto-placed spawn must be fully overridable. When a player clicks or taps a valid spawn location after being auto-placed, the new location replaces the auto-placement — using the same `SpawnExecution` flow. No special handling needed; this should work naturally if auto-spawn uses the standard pipeline.

**Contextual message:** the message *"You've been placed here — tap anywhere to choose a different starting point"* should appear near the player's placed territory, not as a generic overlay. It should auto-dismiss after a few seconds or on any player input. It must be readable on mobile screens — minimum font size, high contrast. This is a Lit component addition or an extension of an existing overlay (see `HeadsUpMessage` or `SpawnTimer` in `GameRenderer.ts`).

**Tutorial note:** the tutorial (Task 4) includes a tooltip during the spawn phase. That tooltip should be updated to reflect auto-spawn: instead of *"Click the map to choose your starting location"*, use *"You've been placed automatically — tap anywhere to choose a different spot."* Coordinate with Task 4 implementation to avoid conflicting messages.

## How Impact Will Be Measured

All measurement infrastructure is already in place. After this task ships, watch:

- **Funnel 7 (Spawn Behavior)** — `Game:Start` → `Match:SpawnChosen` OR `Match:SpawnAuto`. Before this task ships, `Match:SpawnAuto` volume should be zero. After it ships, `Match:SpawnAuto` volume shows how many players are being caught by the auto-placement that were previously missing the spawn phase entirely.
- **Ghost rate (Funnel 3)** — `Session:Start` → `Game:Start` → `Player:Eliminated`. The drop-off between steps 2 and 3 should decrease as fewer players enter matches with no territory.
- **`Match:SpawnAuto` vs `Match:SpawnChosen` ratio over time** — as players become familiar with the game, `Match:SpawnChosen` should increase relative to `Match:SpawnAuto`. A high and persistent `SpawnAuto` rate means players are consistently not engaging with spawn selection, which may inform tutorial design.

Establish all baselines from Funnel 7 and Funnel 3 before this task ships.

## Dependencies

- **Task 2j (spawn anomaly investigation) — resolved ✅** — the touch-only event listener bug has been fixed and deployed. Desktop spawn data is now valid. This dependency is cleared and auto-spawn can proceed immediately.
- Task 4 (tutorial) can ship before or after this task independently, but the tutorial's spawn tooltip must be updated to reflect auto-spawn behavior.
- Task 4c (auto-expansion for inactive players) depends on this task — auto-expansion is most effective when combined with auto-spawn, since auto-spawned players are more likely to be the inactive players auto-expansion targets.

## Verification

1. **New player simulation — multiplayer:** join a public match and make no input during the spawn phase — auto-placement should occur immediately on join, and the contextual message should appear
2. **Reposition test:** after being auto-placed, click or tap a different valid location — the spawn should move to the new location correctly
3. **Singleplayer test:** start a singleplayer mission and make no input during the spawn phase — auto-placement should occur (singleplayer spawn window is ~6.7 seconds, so this is particularly important)
4. **Mobile test:** verify the contextual message is readable and the repositioning tap works correctly on a mobile device
5. **Desync test:** run a multiplayer match with multiple clients — auto-spawn must not cause desync errors
6. **TypeScript:** `npx tsc --noEmit` — no new errors
