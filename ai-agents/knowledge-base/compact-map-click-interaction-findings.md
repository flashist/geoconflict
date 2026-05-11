# Compact Map Click Interaction Bug — Investigation Findings

## Summary

Reported symptom: in compact maps (`GameMapSize.Compact`), some territories cannot be boat-attacked (the boat icon in the radial menu is inactive) even when the territory visually borders water on screen. The bug is not reproducible over the same territories across different games.

**Root cause confirmed by debug logging (2026-05-11):** `targetTransportTile` returns `null` because the compact map binary (`map4x.bin`) lost the `isShore` designation for the target player's border tiles during downsampling. `closestShoreFromPlayer` filters border tiles by `isShore` and finds zero results, so the entire boat-attack check fails before it even reaches the ocean/lake path logic.

---

## Confirmed Failure Branch (Debug Session 2026-05-11)

Debug logging added to `canBuildTransportShip` and `MainRadialMenu` confirmed:

```
[DEBUG] right-click: screen=(821, 504) → world=(505, 282)
[BOAT tile=(505,282)] false — targetTransportTile returned null (target has no reachable shore)
```

The failure always occurs at the **first guard** in `canBuildTransportShip`:

```typescript
const dst = targetTransportTile(game, tile);
if (dst === null) {
  return false;  // ← hits here
}
```

Inside `targetTransportTile`:

```typescript
export function targetTransportTile(gm: Game, tile: TileRef): TileRef | null {
  const dst = gm.playerBySmallID(gm.ownerID(tile));
  if (dst.isPlayer()) {
    dstTile = closestShoreFromPlayer(gm, dst as Player, tile);  // ← returns null
  } else {
    dstTile = closestShoreTN(gm, tile, 50);
  }
  return dstTile;
}
```

Inside `closestShoreFromPlayer`:

```typescript
export function closestShoreFromPlayer(gm, player, target) {
  const shoreTiles = Array.from(player.borderTiles()).filter(t => gm.isShore(t));
  if (shoreTiles.length === 0) return null;  // ← hits here because isShore is false for all border tiles
  ...
}
```

The compact map stripped the `isShore` bit from the target player's border tiles. Those tiles visually touch water but the binary says they don't.

---

## Why the Bug Appears Non-Reproducible Over the Same Territories

The terrain data loss is **static** (same `map4x.bin` always has the same degraded tiles), but whether it surfaces depends on **who owns the affected tiles** in a given game:

- If the affected coastal territory is owned by a player who also has *other* undegraded shore tiles elsewhere → `closestShoreFromPlayer` finds those other tiles → boat works
- If the player's *only* shore tiles are the degraded ones → `closestShoreFromPlayer` returns null → boat disabled
- If the territory is neutral → `closestShoreTN` is used instead (different code path, BFS through unowned tiles) → may succeed even with degraded tiles

Different games place different players in different territories, producing different outcomes from the same underlying static defect. This is why the broken territories appear to vary between games.

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

For compact maps `game.width() = 1000` (vs 2000 for normal). Both rendering and click detection use the **same pivot**, so they agree on which tile every screen pixel corresponds to. The formulas are internally consistent. **Coordinate transformation is not the root cause.**

---

## Root Cause 1: Compact Terrain Loses Shore Tile Designations (PRIMARY BUG)

### Code path

Right-click → `MainRadialMenu` → `game.myPlayer().actions(tile)` → worker → `playerActions()` → `player.buildableUnits(tile)` → `canBuild(UnitType.TransportShip, tile)` → `canBuildTransportShip(game, player, tile)` → `targetTransportTile(game, tile)` → `closestShoreFromPlayer(game, targetPlayer, tile)` → **returns null** → boat disabled.

### Why it fails in compact mode

The compact map uses `map4x.bin` (1000×500 for World) instead of the full-resolution binary (2000×1000). At half resolution, narrow coastal features — thin peninsulas, narrow bays, 1-tile-wide water channels — can be merged into land by the downsampling process. A territory that clearly borders water in the normal map may have no shore-neighbour tiles at all in the compact map. When that happens, `isShore` returns false for all of that player's border tiles, `closestShoreFromPlayer` returns null, and the boat icon is disabled.

`isOceanShore` (`src/core/game/GameMap.ts`):

```typescript
isOceanShore(ref: TileRef): boolean {
  return this.isLand(ref) && this.neighbors(ref).some((tr) => this.isOcean(tr));
}
```

`neighbors()` returns only 4-directional neighbors (N/S/E/W), which makes the check more sensitive to downsampling artifacts.

### Affected maps

All 30 maps with compact binaries are potentially affected. The binaries are:

```
resources/maps/achiran/map4x.bin
resources/maps/deglaciatedantarctica/map4x.bin
resources/maps/falklandislands/map4x.bin
resources/maps/baikal/map4x.bin
resources/maps/britannia/map4x.bin
resources/maps/oceania/map4x.bin
resources/maps/baikalnukewars/map4x.bin
resources/maps/australia/map4x.bin
resources/maps/montreal/map4x.bin
resources/maps/northamerica/map4x.bin
resources/maps/pluto/map4x.bin
resources/maps/asia/map4x.bin
resources/maps/world/map4x.bin          ← confirmed broken (debug session 2026-05-11)
resources/maps/eastasia/map4x.bin
resources/maps/faroeislands/map4x.bin
resources/maps/japan/map4x.bin
resources/maps/yenisei/map4x.bin
resources/maps/europeclassic/map4x.bin
resources/maps/europe/map4x.bin
resources/maps/gatewaytotheatlantic/map4x.bin
resources/maps/blacksea/map4x.bin
resources/maps/mena/map4x.bin
resources/maps/betweentwoseas/map4x.bin
resources/maps/halkidiki/map4x.bin
resources/maps/southamerica/map4x.bin
resources/maps/mars/map4x.bin
resources/maps/pangaea/map4x.bin
resources/maps/africa/map4x.bin
resources/maps/italia/map4x.bin
resources/maps/giantworldmap/map4x.bin
```

From `sprint4b-mini-mode-findings.md`, six maps have compact nation coordinates that land on water (Asia, Black Sea, Europe, Mena, North America, Pangaea), indicating the worst coastline degradation. World is confirmed broken by live debugging despite not appearing in the earlier audit — the audit list is not exhaustive.

---

## Root Cause 2: `bestShoreDeploymentSource` Diagonal Miss (SECONDARY)

`bestShoreDeploymentSource` (`TransportShipUtils.ts`) runs A* on the mini map (2× downscaled relative to compact), then upscales the path. It then looks for a player-owned shore tile in the **4-directional neighbors** of `path[0]`:

```typescript
const neighbors = gm.neighbors(potential)
  .filter((n) => gm.isShore(n) && gm.owner(n) === player);
if (neighbors.length === 0) return false;
```

If the actual shore tile is diagonally adjacent, `neighbors()` misses it and `bestShoreDeploymentSource` returns `false`.

**Impact**: affects `bestTransportShipSpawn` (called from `sendBoatAttackIntent` to find the spawn point). The attack intent is still sent with `spawn = null` even if this fails, so this does **not** cause the boat icon to be inactive — it only degrades spawn-point quality. Low-severity secondary issue.

---

## Fix Options

### Option 1 — Map generation fix (correct long-term fix, high effort)

Fix the Go map generator (`map-generator/map_generator.go`) so that when generating `map4x.bin`, any compact tile whose corresponding 2×2 block in the full-resolution map contains at least one water-adjacent land tile preserves the shore/ocean-shore bit. Then regenerate all 30 `map4x.bin` files via `npm run gen-maps`.

**Scope:** map generator code change + regenerating 30 binary files.  
**Result:** terrain data is correct; no runtime workaround needed.

### Option 2 — Runtime fallback in `targetTransportTile` (workaround, low effort)

When `closestShoreFromPlayer` returns null for a player-owned tile, fall back to a BFS around the clicked tile that searches all tiles (owned and unowned) for the nearest shore tile, ignoring ownership. This approximates what the full-resolution map would have found.

Change location: `src/core/game/TransportShipUtils.ts`, function `targetTransportTile` (~5 lines).

```typescript
export function targetTransportTile(gm: Game, tile: TileRef): TileRef | null {
  const dst = gm.playerBySmallID(gm.ownerID(tile));
  let dstTile: TileRef | null = null;
  if (dst.isPlayer()) {
    dstTile = closestShoreFromPlayer(gm, dst as Player, tile);
    if (dstTile === null) {
      // Fallback: compact map may have stripped isShore from this player's border tiles.
      // Search any shore tile near the target regardless of ownership.
      dstTile = closestShoreFallback(gm, tile, 50);
    }
  } else {
    dstTile = closestShoreTN(gm, tile, 50);
  }
  return dstTile;
}

function closestShoreFallback(gm: GameMap, tile: TileRef, searchDist: number): TileRef | null {
  const results = Array.from(gm.bfs(tile, manhattanDistFN(tile, searchDist)))
    .filter(t => gm.isShore(t))
    .sort((a, b) => gm.manhattanDist(tile, a) - gm.manhattanDist(tile, b));
  return results.length > 0 ? results[0] : null;
}
```

**Scope:** ~15 lines of TypeScript, no map regeneration.  
**Result:** fixes the boat icon activation for compact maps without touching map data. Does not fix the underlying data defect.

### Option 3 — Fix `bestShoreDeploymentSource` diagonal miss (for Root Cause 2)

Change `neighbors()` to an 8-directional neighbor check, or scan all candidate shore tiles within a small Manhattan distance of `path[0]`.

**Scope:** small change in `TransportShipUtils.ts`.  
**Priority:** low — does not affect boat icon visibility, only spawn-point quality.

---

## Files Referenced

| File | Relevance |
|---|---|
| `src/client/graphics/TransformHandler.ts` | Coordinate pivot, `screenToWorldCoordinates` |
| `src/client/graphics/layers/MainRadialMenu.ts` | Right-click handler, debug logging added |
| `src/core/game/TransportShipUtils.ts` | `canBuildTransportShip`, `targetTransportTile`, `closestShoreFromPlayer`, debug logging added |
| `src/core/game/GameMap.ts` | `isOceanShore`, `isShore`, `neighbors` (4-directional only) |
| `src/core/game/PlayerImpl.ts` | `buildableUnits`, `canBuild`, `portSpawn`, `warshipSpawn` |
| `src/core/pathfinding/MiniAStar.ts` | `upscalePath`, floating-point rounding |
| `src/core/game/TerrainMapLoader.ts` | Compact map loading (`map4x` binary) |
| `src/server/MapPlaylist.ts` | Compact map rotation (`mini_map` modifier) |
| `map-generator/map_generator.go` | Go map generator — target for Option 1 fix |
| `ai-agents/knowledge-base/sprint4b-mini-mode-findings.md` | Compact terrain quality audit (partial — World not listed but confirmed broken) |
