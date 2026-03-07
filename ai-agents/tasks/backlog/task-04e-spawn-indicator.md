# Task 4e — Spawn Indicator Visibility Improvement

## Context

When a player spawns — either via auto-spawn (Task 4a) or manual placement — their starting territory is shown with a small white glowing animation. This indicator is too small and too subtle to be reliably spotted, especially when the map is zoomed out or when other visual activity is happening around the spawn area.

Even after Task 4b (auto-zoom on spawn) centers and zooms the map to the player's territory, the indicator itself needs to be visually prominent enough to be instantly recognizable. The two tasks work together: 4b brings the map to the player, 4e makes sure the player can actually see where they are once the map gets there.

**Depends on:** Task 4b should ship first — the auto-zoom on spawn makes this indicator visible in context. Task 4e can ship immediately after.

## Goal

Replace the current small white glowing animation with a spawn indicator that is immediately noticeable at the zoom level Task 4b settles on, and clearly communicates "this is you."

## What "Done" Looks Like

The new spawn indicator must be:
- Visibly larger than the current animation
- Distinct enough to stand out against the map background and surrounding territories
- Clearly temporary — it should fade out after a few seconds so it doesn't clutter the screen during play
- Not disruptive to experienced players who already know where they spawned

**Recommended approach — expanding ring pulse:**
A ring that expands outward from the spawn point like a radar pulse, then fades out. Repeats 2–3 times over approximately 3–4 seconds, then disappears. This is universally understood as "this is your location" and is visible even at moderate zoom levels.

The ring should use the player's own territory color rather than white — this reinforces the association between the visual and the player's identity on the map.

**Alternative approach — larger pulsing circle:**
If the expanding ring is complex to implement, a simpler alternative is a pulsing filled circle that is 3–4× larger than the current indicator, in the player's territory color, that scales in and out 2–3 times then fades. Less visually distinctive than the ring but easier to implement.

The developer should choose whichever approach is cleaner to implement given the existing animation system. Both are acceptable — the goal is visibility, not a specific visual effect.

## Implementation Notes

**Duration:** the indicator should be visible for approximately 3–4 seconds after spawn, then fade out completely. It should not persist through the entire spawn phase — that would create visual noise as the player starts expanding.

**Player territory color:** use the same color that will be applied to the player's territory tiles. This is already known at spawn time. Do not use a fixed color like white or yellow.

**Existing animation system:** check how the current spawn glow animation is implemented before building anything new. If there is an existing particle or animation system in the rendering layer, extend it rather than creating a parallel implementation. The `FxLayer` in `GameRenderer.ts` is the likely location.

**No impact on game state:** purely visual. No changes to `src/core/` — this is a rendering-only change with no determinism implications.

**Mobile:** the indicator must be visible on mobile screen sizes. Test on a small screen at the zoom level Task 4b settles on for a freshly spawned player.

## Verification

1. **Visibility at spawn zoom:** spawn in a new match — after Task 4b auto-zooms to your territory, the new indicator should be immediately and clearly visible without needing to search for it
2. **Auto-fade:** the indicator should disappear on its own after 3–4 seconds without any player action
3. **Player color:** the indicator uses the player's own territory color, not a fixed color
4. **Does not reappear:** after fading out, the indicator should not reappear unless the player respawns
5. **Mobile:** indicator is clearly visible on a mobile screen at the spawn zoom level
6. **No performance impact:** verify no frame rate drop during the animation, particularly on mobile

## Notes

- This task is intentionally narrow — improve the spawn indicator only. Do not redesign other map indicators or animations as part of this task.
- If the expanding ring approach is chosen, the ring should expand to a radius that makes it visible at the Task 4b spawn zoom level — the developer should calibrate the ring size after Task 4b is implemented and the spawn zoom level is known.
- Together with Task 4b, this fully resolves the "can't find myself on spawn" problem from both directions: the map comes to the player (4b) and the indicator is unmissable when it gets there (4e).
