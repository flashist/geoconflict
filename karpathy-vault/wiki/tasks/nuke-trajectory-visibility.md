# Nuke Pre-Launch Trajectory Visibility

**Source**: `ai-agents/tasks/done/s4-nuke-trajectory-visibility.md`
**Status**: done
**Sprint/Tag**: Sprint 4

## Goal

Make the nuke pre-launch targeting arc easier to see while keeping the first iteration limited to thickness only. Color, opacity, glow, and animation changes remain deferred until explicitly requested.

## Key Changes

- Updated `src/client/graphics/layers/NukePlanningLayer.ts`, the client canvas layer that draws the nuke targeting preview.
- Increased the trajectory from a single-pixel path to a 3px local brush.
- Kept the existing player-color/self-color behavior and alpha value unchanged.
- Deduplicated painted preview pixels so overlapping path samples do not compound opacity.

## Outcome

The nuke targeting preview is visibly bolder and Mark confirmed the path looks fine. Build, focused lint, and the targeted nuke execution test passed.

## Related

- [[systems/rendering]]
