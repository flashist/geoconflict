# Compact Map Click Interaction Bug

**Source**: `ai-agents/knowledge-base/compact-map-click-interaction-findings.md`
**Status**: investigated
**Sprint/Tag**: Sprint 4c / Sprint 4b regression

## Goal

Explain why compact-map territories sometimes cannot be interacted with through the radial menu, especially when right-clicking a coastal target to send transport boats and seeing the boat icon disabled.

## Key Changes

No runtime fix shipped with the investigation. Debug logging in `src/client/graphics/layers/MainRadialMenu.ts` and `src/core/game/TransportShipUtils.ts` traced the failing branch for compact matches:

Right-click selects an integer tile through `TransformHandler.screenToWorldCoordinates()`, `MainRadialMenu` asks `game.myPlayer().actions(tile)`, the worker computes `player.buildableUnits(tile)`, and `canBuildTransportShip()` calls `targetTransportTile()`. The confirmed failure is that `targetTransportTile()` returns `null` because `closestShoreFromPlayer()` finds no player border tiles where `gm.isShore(t)` is true.

The investigation rules out the earlier non-integer-coordinate theory. `TransformHandler.handleTransform()` and `screenToWorldCoordinates()` use the same `game.width() / 2` and `game.height() / 2` pivot, and click detection floors the computed world coordinate before creating a tile ref. Rendering and hit detection therefore agree on the selected compact-map tile.

## Outcome

The primary root cause is compact terrain data quality: compact binaries under `resources/maps/*/map4x.bin` can lose shore designations during downsampling. A territory may visually border water, but if the compact binary has no `isShore` border tiles for the target player, `closestShoreFromPlayer()` returns `null` and the boat icon is disabled before ocean/lake pathfinding starts. The World compact map was confirmed broken by debug logs, and all compact binaries are potentially affected by narrow coastline downsampling.

The apparent non-determinism comes from ownership, not from random click coordinates. The same degraded compact coastline can work when its owner also has other valid shore tiles, fail when those degraded tiles are the owner's only shore, and behave differently for neutral land because `closestShoreTN()` uses a separate BFS path.

The originally recommended Sprint 4c workaround was a runtime fallback in `targetTransportTile()`: when `closestShoreFromPlayer()` returns `null` for a player-owned compact target, search near the clicked tile for any shore tile and use that as the destination approximation. That fallback was implemented on an unmerged branch and rejected after live testing because it can select unrelated surviving shore tiles, sending boats to the wrong coastline or enabling attacks against landlocked territory. The runtime workaround is now recorded as cancelled in [[decisions/cancelled-tasks]].

The long-term fix is to preserve shore/ocean-shore bits in `map-generator/map_generator.go` when generating `resources/maps/*/map4x.bin`, then regenerate compact map binaries. A secondary low-severity issue remains in `bestShoreDeploymentSource()`: it checks only 4-directional neighbors after mini-A* upscaling, so a diagonally adjacent valid shore tile can be missed, degrading spawn-point quality without disabling the boat icon.

Sprint 4c mitigates the player-facing impact by disabling compact maps in public matchmaking while leaving private lobby and singleplayer compact as explicit opt-in paths. That mitigation is tracked in [[tasks/disable-compact-public-maps]].

## Related

- [[systems/rendering]] — coordinate conversion path ruled out by the investigation
- [[tasks/sprint4b-compact-map-rotation]] — public compact-map rollout that exposed the issue more often
- [[tasks/sprint4b-mini-mode-investigation]] — earlier compact terrain audit; not exhaustive for shore-bit loss
- [[decisions/sprint-4c]] — stabilization sprint that cancelled the runtime fallback and disabled compact public maps
- [[decisions/cancelled-tasks]] — records the rejected runtime fallback and root-cause retry guidance
- [[tasks/disable-compact-public-maps]] — public-rotation mitigation while compact binary regeneration is deferred
