# Task — Fix Compact Map Boat-Attack Button (Runtime Fallback)

## Sprint
Sprint 4c — Stabilization

## Priority
Medium — affects all 30 compact-map games in the Sprint 4b public rotation. Players on coastal territories cannot initiate boat attacks even when visually bordered by water. Regression directly caused by the compact-map feature shipped in Sprint 4b.

---

## Context

On compact maps (`map4x.bin`), the boat-attack icon in the radial menu is incorrectly disabled for territories that visually border water. Root cause confirmed by debug logging on 2026-05-11:

The compact binary loses `isShore` designations for coastal tiles during downsampling (half-resolution). When `canBuildTransportShip` calls `targetTransportTile`, which calls `closestShoreFromPlayer`, the function filters the target player's border tiles by `isShore` and finds zero results — so it returns `null` and the boat check fails immediately, regardless of actual proximity to water.

The failure is intermittent-seeming because it depends on who owns the affected tiles in a given game, not on the tiles themselves. The underlying data defect is static.

Full investigation: `ai-agents/knowledge-base/compact-map-click-interaction-findings.md`

---

## What to Build

Add a fallback in `targetTransportTile` (`src/core/game/TransportShipUtils.ts`): when `closestShoreFromPlayer` returns null for a player-owned tile, search for the nearest shore tile within a bounded radius regardless of ownership — the same approach `closestShoreTN` already uses for neutral-territory targets.

### Implementation

In `src/core/game/TransportShipUtils.ts`, modify `targetTransportTile`:

```typescript
export function targetTransportTile(gm: Game, tile: TileRef): TileRef | null {
  const dst = gm.playerBySmallID(gm.ownerID(tile));
  let dstTile: TileRef | null = null;
  if (dst.isPlayer()) {
    dstTile = closestShoreFromPlayer(gm, dst as Player, tile);
    if (dstTile === null) {
      // Compact map may have stripped isShore from this player's border tiles during downsampling.
      // Fall back to the nearest shore tile in the vicinity regardless of ownership.
      dstTile = closestShoreTN(gm, tile, 50);
    }
  } else {
    dstTile = closestShoreTN(gm, tile, 50);
  }
  return dstTile;
}
```

- `closestShoreTN` already exists in `TransportShipUtils.ts` and uses BFS over unowned tiles — reuse it directly for the fallback.
- The search radius of `50` matches the existing neutral-territory call. Verify this covers typical compact-map coastal distances before shipping; adjust if needed.
- Do not alter `closestShoreFromPlayer` itself — its semantics are correct for full-resolution maps.

---

## Verification

1. Start a compact-map game (e.g. World compact). Right-click a coastal territory owned by another player — confirm the boat-attack icon is active.
2. Confirm the boat-attack icon still works correctly on full-resolution maps (no regression).
3. Confirm the boat-attack icon correctly remains inactive when no shore tile exists within the search radius (genuinely landlocked target).
4. Existing transport-ship tests pass.

---

## Notes

- This is a runtime workaround. The underlying data defect — compact binaries missing `isShore` bits — is tracked separately in `s5-fix-compact-map-shore-generation.md` and requires a map generator fix plus full map regeneration.
- Do not attempt to fix the map generator or regenerate binaries in this task.
- The secondary issue (`bestShoreDeploymentSource` diagonal miss) is low-severity, does not affect boat icon visibility, and is deferred. No work needed here for that.
