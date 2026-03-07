# Task 4b — Zoom to Territory: Pan & Zoom on Player Name Click + Auto-Zoom on Spawn

## Context

Players are reporting they cannot find themselves on the map. This happens most often when:
- The map is zoomed out far and the player's territory is small — it becomes an invisible dot even after the map pans to it
- The player has just spawned and has minimal territory
- The player returns after a reconnect and loses their visual orientation

There is already logic in the game that pans the map when a player name is clicked in the player table. However it only changes the map position — it does not change the zoom level. If the map is zoomed out, the territory ends up centered but still unreadably small.

Even after Task 4a (auto-spawn) places the player automatically, it is still easy to not notice where you've been placed — especially when the map is zoomed out and the spawn indicator is small.

## Goal

Build a single reusable zoom-to-territory function and use it in three places:
1. When any player name is clicked in the player table
2. When the "find me" button is pressed
3. Automatically, once, when the player is first spawned

## What "Done" Looks Like

**Unified zoom-to-territory behavior (applies to all player name clicks):**
- Clicking any player name in the player table pans the map to their territory AND sets the zoom level
- The zoom level is calculated based on territory size:
  - Small territory (just spawned, early game dot): zoom in to a comfortable close-up level where the territory and surrounding area are clearly visible
  - Medium territory: zoom to fit the territory with some surrounding context
  - Large territory: zoom to fit the territory, but capped at a minimum zoom level — never zoom out so far that names and labels become unreadable
- The transition should be smooth (animated pan + zoom), consistent with how the existing pan animation works
- The maximum zoom-out cap should be determined by the developer based on what keeps territory names legible — a good heuristic is that the player's own name label must be readable at the resulting zoom level

**Dedicated "find me" button:**
- A button is added to the game UI (position: somewhere accessible during gameplay — near the leaderboard or as part of the player's own row in the player table)
- Pressing it calls the exact same zoom-to-territory function targeting the local player's own territory
- On mobile, this button should be easily tappable — minimum 44×44px touch target
- The button should be visible at all times during a match, not hidden behind menus

**Auto-zoom on spawn:**
- The moment the player is placed on the map — either via auto-spawn (Task 4a) or by manually choosing a location — the map automatically zooms to their territory using the same zoom-to-territory function
- This happens once per spawn event, not repeatedly
- After the initial auto-zoom, the player is free to pan and zoom normally — the view does not re-center or lock
- Applies to both auto-spawn and manual spawn placement

## Implementation Notes

**Single function, three call sites:** implement zoom-to-territory as one reusable function. The three uses — name click, find-me button, spawn auto-zoom — all call the same function with the same logic. Do not implement three separate versions.

**Reuse existing pan logic:** the current click-on-name behavior already moves the map. This task modifies that same code path to also set zoom, rather than building a new system. The developer should identify where the existing pan is triggered and extend it.

**Zoom calculation approach:** a reasonable starting formula is to calculate the bounding box of the player's territory tiles and zoom to fit that bounding box with a padding factor. Cap the result between a minimum zoom (close-up) and maximum zoom (readable labels). The exact values should be tuned visually — the verification step below covers this.

**TransformHandler:** based on the codebase documentation, `TransformHandler` handles world↔screen coordinate transforms for zoom/pan. This is the right place to look for implementing the zoom change alongside the existing pan.

**Spawn trigger timing:** the auto-zoom on spawn should fire when the spawn position is confirmed on the client — i.e. when the player's territory first appears on the map, not at match start. For auto-spawned players this is immediate on join; for manual spawn it fires when the player taps their chosen location.

## Verification

1. **Auto-zoom on spawn:** join a new match — the map should automatically zoom to your spawn location the moment you are placed, regardless of the current zoom level
2. **Manual spawn:** zoom out fully, then tap a spawn location — the map should zoom in to that location immediately after placement
3. **Small territory:** spawn in a new match, immediately click your own name in the player table — the map should zoom in to show your starting territory clearly
4. **Large territory:** in a late-game session with a large empire, click a player name — the map should zoom to fit their territory without zooming out so far that names become unreadable
5. **"Find me" button:** press the button at various zoom levels — should always result in the same comfortable zoom-to-own-territory view
6. **Free pan after spawn:** after the auto-zoom on spawn fires, verify the player can immediately pan and zoom freely — the view should not re-center or interfere with normal navigation
7. **Mobile:** test the "find me" button and spawn auto-zoom on a mobile device — tap target should be easy to hit, zoom behavior correct on touch

## Notes

- This is a pure client-side change — no server changes, no intent pipeline, no determinism concerns
- The "find me" button is the highest-priority deliverable. Auto-zoom on spawn and improved zoom on name clicks follow from the same underlying function.
- Do not hardcode a single fixed zoom level for all cases — the territory size must influence the zoom level
- Task 4e (spawn indicator visibility) should ship immediately after this task — together they fully solve the "can't find myself on spawn" problem

## Context

Players are reporting they cannot find themselves on the map. This happens most often when:
- The map is zoomed out far and the player's territory is small — it becomes an invisible dot even after the map pans to it
- The player has just spawned and has minimal territory
- The player returns after a reconnect and loses their visual orientation

There is already logic in the game that pans the map when a player name is clicked in the player table. However it only changes the map position — it does not change the zoom level. If the map is zoomed out, the territory ends up centered but still unreadably small.

## Goal

When a player name is clicked in the player table, the map should both pan to that territory AND zoom to a level where the territory is comfortably visible and readable. Additionally, a dedicated "find me" button should be added so players can locate their own territory in one tap without needing to find their name in the table.

## What "Done" Looks Like

**Unified zoom-to-territory behavior (applies to all player name clicks):**
- Clicking any player name in the player table pans the map to their territory AND sets the zoom level
- The zoom level is calculated based on territory size:
  - Small territory (just spawned, early game dot): zoom in to a comfortable close-up level where the territory and surrounding area are clearly visible
  - Medium territory: zoom to fit the territory with some surrounding context
  - Large territory: zoom to fit the territory, but capped at a minimum zoom level — never zoom out so far that names and labels become unreadable
- The transition should be smooth (animated pan + zoom), consistent with how the existing pan animation works
- The maximum zoom-out cap should be determined by the developer based on what keeps territory names legible — a good heuristic is that the player's own name label must be readable at the resulting zoom level

**Dedicated "find me" button:**
- A button is added to the game UI (position: somewhere accessible during gameplay — near the leaderboard or as part of the player's own row in the player table)
- Pressing it calls the exact same zoom-to-territory logic as clicking a player name, targeting the local player's own territory
- On mobile, this button should be easily tappable — minimum 44×44px touch target
- The button should be visible at all times during a match, not hidden behind menus

## Implementation Notes

**Reuse existing pan logic:** the current click-on-name behavior already moves the map. This task modifies that same code path to also set zoom, rather than building a new system. The developer should identify where the existing pan is triggered and extend it.

**Zoom calculation approach:** a reasonable starting formula is to calculate the bounding box of the player's territory tiles and zoom to fit that bounding box with a padding factor. Cap the result between a minimum zoom (close-up) and maximum zoom (readable labels). The exact values should be tuned visually — the verification step below covers this.

**TransformHandler:** based on the codebase documentation, `TransformHandler` handles world↔screen coordinate transforms for zoom/pan. This is the right place to look for implementing the zoom change alongside the existing pan.

## Verification

1. **Small territory:** spawn in a new match, immediately click your own name in the player table — the map should zoom in to show your starting territory clearly, not remain zoomed out
2. **Large territory:** in a late-game session with a large empire, click a player name — the map should zoom to fit their territory without zooming out so far that names become unreadable
3. **"Find me" button:** press the button at various zoom levels — should always result in the same comfortable zoom-to-own-territory view
4. **Mobile:** test the "find me" button on a mobile device — tap target should be easy to hit, and the zoom behavior should work correctly on touch
5. **Other players:** click several different players in the table with varying territory sizes — zoom level should adjust appropriately for each

## Notes

- This is a pure client-side change — no server changes, no intent pipeline, no determinism concerns
- The "find me" button is the higher-priority deliverable since it directly addresses the player feedback. The improved zoom on all name clicks is the underlying fix that makes it work correctly.
- Do not hardcode a single fixed zoom level for all cases — the territory size must influence the zoom level, otherwise large-empire players will get an unhelpfully close-up view
