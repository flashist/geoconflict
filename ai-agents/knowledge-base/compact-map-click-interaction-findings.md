# Compact Map Click Interaction Bug — Investigation Findings

## Summary

Reported symptom: in compact maps (`GameMapSize.Compact`), some territories cannot be clicked or interacted with (e.g., the boat attack icon is inactive for certain territories that visually appear to border water).

The coordinate transformation formula is **not** the root cause. The actual bug is a **terrain data fidelity problem**: the compact map binary (`map4x.bin`) loses some ocean-shore tile designations that exist in the full-resolution map, causing boat-attack logic to fail for affected territories.

---

## Coordinate System Analysis

### TransformHandler pivot point

`handleTransform()` and `screenToWorldCoordinates()` both use `game.width() / 2` as the canvas pivot:

```typescript
// handleTransform — rendering
context.setTransform(scale, 0, 0, scale,
  game.width() / 2 - offsetX * scale,
  game.height() / 2 - offsetY * scale,
);

// screenToWorldCoordinates — click detection
const centerX = (canvasX - game.width() / 2) / scale + offsetX;
const gameX   = centerX + game.width() / 2;
return new Cell(Math.floor(gameX), Math.floor(gameY));
```

For compact maps `game.width() = 1000` (vs 2000 for normal). Both rendering and click detection use the **same pivot**, so they agree on which tile every screen pixel corresponds to. The formulas are internally consistent.

### Click-valid area vs. visible area

At any camera offset, the set of screen pixels that produce valid tile coordinates matches the set of pixels where the map is actually rendered. Clicks outside the visible map (in the grey margin) correctly produce out-of-bounds coordinates and are silently dropped via `isValidCoord`. This is expected behavior.

### Why normal maps "feel" fine but the mismatch exists for compact

For normal maps: `game.width()/2 = 1000 ≈ canvas.width/2 = 960` — very close, so the camera centering error is small.  
For compact maps: `game.width()/2 = 500` vs `canvas.width/2 = 960` — larger offset, which is fully compensated by `offsetX` after `zoomToPlayer()` centers the camera. No systematic click-area mismatch.

---

## Root Cause 1: Compact Terrain Loses Ocean Shore Tiles (PRIMARY BUG)

### Code path

Right-click → `MainRadialMenu` → `game.myPlayer().actions(tile)` → worker → `playerActions()` → `player.buildableUnits(tile)` → `canBuild(UnitType.TransportShip, tile)` → `canBuildTransportShip(game, player, tile)`.

Inside `canBuildTransportShip` (`src/core/game/TransportShipUtils.ts`):

```typescript
const dst = targetTransportTile(game, tile);   // closest shore of target territory
if (game.isOceanShore(dst)) {                  // ← fails in compact mode for some territories
  // check player also borders ocean
  if (myPlayerBordersOcean && otherPlayerBordersOcean) {
    return transportShipSpawn(game, player, dst);
  }
}
```

`isOceanShore` (`src/core/game/GameMap.ts:153`):

```typescript
isOceanShore(ref: TileRef): boolean {
  return this.isLand(ref) && this.neighbors(ref).some((tr) => this.isOcean(tr));
}
```

`neighbors()` (`GameMap.ts:262`) returns only 4-directional neighbors (N/S/E/W).

### Why it fails in compact mode

The compact map uses `map4x.bin` (1000×500 for World) instead of the full-resolution binary (2000×1000). At half resolution, narrow coastal features — thin peninsulas, narrow bays, 1-tile-wide water channels — can be merged into land by the downsampling process. A territory that clearly borders ocean in the normal map may have no ocean-neighbor tiles at all in the compact map. When that happens:

- `isOceanShore(dst) → false`
- `canBuildTransportShip → false`
- `buildableUnits` does not include `TransportShip` for that target tile
- The boat icon in the radial menu is inactive

This explains the "sometimes fails" pattern: only territories whose coastal tiles were lost in the downsampling are affected.

### Maps most at risk

From `sprint4b-mini-mode-findings.md`, six maps have compact nation coordinates that land on water, indicating coastline degradation at compact resolution: **Asia, Black Sea, Europe, Mena, North America, Pangaea**.

---

## Root Cause 2: `bestShoreDeploymentSource` Diagonal Miss (SECONDARY)

`bestShoreDeploymentSource` (`TransportShipUtils.ts:142`) runs A* on the mini map (which is 2× downscaled relative to the compact map), then upscales the path by 2. It then looks for a player-owned shore tile in the **4-directional neighbors** of `path[0]`:

```typescript
const potential = path[0];
const neighbors = gm.neighbors(potential)
  .filter((n) => gm.isShore(n) && gm.owner(n) === player);
if (neighbors.length === 0) return false;
```

If the actual shore tile is at an odd offset in both x and y relative to `potential` (i.e., diagonally adjacent), `neighbors()` misses it and `bestShoreDeploymentSource` returns `false`.

**Impact**: this affects `bestTransportShipSpawn`, called from `sendBoatAttackIntent` to find the ship spawn point. However, the attack intent is still sent with `spawn = null` even if this fails. So this does **not** cause the boat icon to be inactive — it only affects the spawn point quality. Low-severity secondary issue.

---

## The "Non-Integer Coordinates" Connection

The `upscalePath` function in `MiniAStar.ts:128` uses floating-point arithmetic for intermediate path interpolation:

```typescript
Math.round(current.x + (dx * step) / steps)  // (dx*step)/steps is a float
```

When `dx` is not divisible by `steps`, intermediate points round to the nearest integer. This can produce duplicate consecutive tiles (e.g., dx=3, steps=4 gives x-series: 0, 1, 2, 2, 6). The output is always integers, but the rounding can introduce small path artifacts near map edges.

This is **not** the cause of the click or boat-icon failures. It's a minor pathfinding aesthetic issue at most.

---

## Fix Recommendations

### Fix for Root Cause 1 (terrain data)

**Option A — Map generation fix (preferred):** When generating `map4x.bin`, preserve the `OCEAN_BIT` for any compact tile whose corresponding 2×2 block in the full-resolution map contains at least one ocean tile. This ensures no ocean-adjacency information is lost in downsampling.

**Option B — Runtime fallback:** In `canBuildTransportShip`, if `isOceanShore(dst)` is false in compact mode, do a small BFS (radius ~3 tiles) around `dst` to check if any tile within the expanded neighborhood has an ocean neighbor. If found, treat it as an ocean shore. This is a workaround that doesn't require regenerating map binaries.

**Option C — Accept as known limitation:** Document that certain territories in compact maps lose boat-attack accessibility due to terrain resolution. Lower severity since compact maps are only 20% of public matches and the issue only affects specific coastlines.

### Fix for Root Cause 2 (diagonal neighbor miss)

Change `bestShoreDeploymentSource` to also check 8-directional neighbors (include diagonals) when looking for the player's shore tile near `path[0]`. Or include the original source candidates within a small Manhattan distance of `path[0]`.

---

## Files Referenced

| File | Relevance |
|---|---|
| `src/client/graphics/TransformHandler.ts` | Coordinate pivot, `screenToWorldCoordinates` |
| `src/client/graphics/layers/TerritoryLayer.ts` | Canvas draw at `(-game.width()/2, ...)` |
| `src/client/graphics/layers/MainRadialMenu.ts` | Right-click handler, `isValidCoord` guard |
| `src/client/ClientGameRunner.ts` | Left-click handler, `isValidCoord` guard |
| `src/core/game/TransportShipUtils.ts` | `canBuildTransportShip`, `bestShoreDeploymentSource` |
| `src/core/game/GameMap.ts` | `isOceanShore`, `neighbors` (4-directional only) |
| `src/core/pathfinding/MiniAStar.ts` | `upscalePath`, floating-point rounding |
| `src/core/game/TerrainMapLoader.ts` | Compact map loading (`map4x` binary) |
| `src/server/MapPlaylist.ts` | Compact map rotation (`mini_map` modifier) |
| `ai-agents/knowledge-base/sprint4b-mini-mode-findings.md` | Compact terrain quality audit |
