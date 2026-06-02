import { PathFindResultType } from "../pathfinding/AStar";
import { MiniAStar } from "../pathfinding/MiniAStar";
import { Game, Player, UnitType } from "./Game";
import { andFN, GameMap, manhattanDistFN, TileRef } from "./GameMap";

export function canBuildTransportShip(
  game: Game,
  player: Player,
  tile: TileRef,
): TileRef | false {
  const tileCell = game.cell(tile);
  const dbg = `[BOAT tile=(${tileCell.x},${tileCell.y})]`;

  if (
    player.unitCount(UnitType.TransportShip) >= game.config().boatMaxNumber()
  ) {
    console.debug(`${dbg} false — at boat cap (${player.unitCount(UnitType.TransportShip)}/${game.config().boatMaxNumber()})`);
    return false;
  }

  const dst = targetTransportTile(game, tile);
  if (dst === null) {
    console.debug(`${dbg} false — targetTransportTile returned null (target has no reachable shore)`);
    return false;
  }
  const dstCell = game.cell(dst);
  console.debug(`${dbg} dst shore=(${dstCell.x},${dstCell.y}) isOceanShore=${game.isOceanShore(dst)}`);

  const other = game.owner(tile);
  if (other === player) {
    console.debug(`${dbg} false — tile is owned by self`);
    return false;
  }
  if (other.isPlayer() && player.isFriendly(other)) {
    console.debug(`${dbg} false — tile owner is friendly`);
    return false;
  }

  if (game.isOceanShore(dst)) {
    let myPlayerBordersOcean = false;
    for (const bt of player.borderTiles()) {
      if (game.isOceanShore(bt)) {
        myPlayerBordersOcean = true;
        break;
      }
    }

    let otherPlayerBordersOcean = false;
    if (!game.hasOwner(tile)) {
      otherPlayerBordersOcean = true;
    } else {
      for (const bt of (other as Player).borderTiles()) {
        if (game.isOceanShore(bt)) {
          otherPlayerBordersOcean = true;
          break;
        }
      }
    }

    console.debug(`${dbg} ocean path — myBordersOcean=${myPlayerBordersOcean} otherBordersOcean=${otherPlayerBordersOcean}`);
    if (myPlayerBordersOcean && otherPlayerBordersOcean) {
      const spawn = transportShipSpawn(game, player, dst);
      console.debug(`${dbg} spawn=${spawn === false ? "false" : `(${game.cell(spawn).x},${game.cell(spawn).y})`}`);
      return spawn;
    } else {
      console.debug(`${dbg} false — ocean check failed`);
      return false;
    }
  }

  // Now we are boating in a lake, so do a bfs from target until we find
  // a border tile owned by the player

  const tiles = game.bfs(
    dst,
    andFN(
      manhattanDistFN(dst, 300),
      (_, t: TileRef) => game.isLake(t) || game.isShore(t),
    ),
  );

  const sorted = Array.from(tiles).sort(
    (a, b) => game.manhattanDist(dst, a) - game.manhattanDist(dst, b),
  );

  console.debug(`${dbg} lake path — searching ${sorted.length} tiles`);
  for (const t of sorted) {
    if (game.owner(t) === player) {
      const spawn = transportShipSpawn(game, player, t);
      console.debug(`${dbg} lake spawn=${spawn === false ? "false" : `(${game.cell(spawn).x},${game.cell(spawn).y})`}`);
      return spawn;
    }
  }
  console.debug(`${dbg} false — no lake shore tile owned by player found`);
  return false;
}

function transportShipSpawn(
  game: Game,
  player: Player,
  targetTile: TileRef,
): TileRef | false {
  if (!game.isShore(targetTile)) {
    return false;
  }
  const spawn = closestShoreFromPlayer(game, player, targetTile);
  if (spawn === null) {
    return false;
  }
  return spawn;
}

export function sourceDstOceanShore(
  gm: Game,
  src: Player,
  tile: TileRef,
): [TileRef | null, TileRef | null] {
  const dst = gm.owner(tile);
  const srcTile = closestShoreFromPlayer(gm, src, tile);
  let dstTile: TileRef | null = null;
  if (dst.isPlayer()) {
    dstTile = closestShoreFromPlayer(gm, dst as Player, tile);
  } else {
    dstTile = closestShoreTN(gm, tile, 50);
  }
  return [srcTile, dstTile];
}

export function targetTransportTile(gm: Game, tile: TileRef): TileRef | null {
  const dst = gm.playerBySmallID(gm.ownerID(tile));
  let dstTile: TileRef | null = null;
  if (dst.isPlayer()) {
    dstTile = closestShoreFromPlayer(gm, dst as Player, tile);
    // Compact maps (map4x.bin) can strip isShore from a player's border tiles
    // during half-resolution downsampling, so closestShoreFromPlayer finds
    // nothing and the boat attack is wrongly disabled. Fall back to the nearest
    // shore tile near the target, regardless of ownership. The `??=` keeps this
    // purely additive: it only runs when the player path yielded null, so it can
    // never change the result of a target that already has a reachable shore.
    // Tracked in s4c-fix-compact-map-boat-attack; the underlying data defect is
    // fixed (and this fallback removed) in s5-fix-compact-map-shore-generation.
    //
    // NOTE: closestShoreTN cannot be reused here — its BFS only traverses
    // unowned tiles (!hasOwner), but this branch runs exactly when the clicked
    // tile is player-owned, so the BFS seed would be rejected and it would
    // always return null.
    dstTile ??= closestShoreFallback(gm, tile, 50);
  } else {
    dstTile = closestShoreTN(gm, tile, 50);
  }
  return dstTile;
}

export function closestShoreFromPlayer(
  gm: GameMap,
  player: Player,
  target: TileRef,
): TileRef | null {
  const shoreTiles = Array.from(player.borderTiles()).filter((t) =>
    gm.isShore(t),
  );
  if (shoreTiles.length === 0) {
    return null;
  }

  return shoreTiles.reduce((closest, current) => {
    const closestDistance = gm.manhattanDist(target, closest);
    const currentDistance = gm.manhattanDist(target, current);
    return currentDistance < closestDistance ? current : closest;
  });
}

export function bestShoreDeploymentSource(
  gm: Game,
  player: Player,
  target: TileRef,
): TileRef | false {
  const t = targetTransportTile(gm, target);
  if (t === null) return false;

  const candidates = candidateShoreTiles(gm, player, t);
  if (candidates.length === 0) return false;

  const aStar = new MiniAStar(gm, gm.miniMap(), candidates, t, 1_000_000, 1);
  const result = aStar.compute();
  if (result !== PathFindResultType.Completed) {
    console.warn(`bestShoreDeploymentSource: path not found: ${result}`);
    return false;
  }
  const path = aStar.reconstructPath();
  if (path.length === 0) {
    return false;
  }
  const potential = path[0];
  // Since mini a* downscales the map, we need to check the neighbors
  // of the potential tile to find a valid deployment point
  const neighbors = gm
    .neighbors(potential)
    .filter((n) => gm.isShore(n) && gm.owner(n) === player);
  if (neighbors.length === 0) {
    return false;
  }
  return neighbors[0];
}

export function candidateShoreTiles(
  gm: Game,
  player: Player,
  target: TileRef,
): TileRef[] {
  let closestManhattanDistance = Infinity;
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;

  let bestByManhattan: TileRef | null = null;
  const extremumTiles: Record<string, TileRef | null> = {
    minX: null,
    minY: null,
    maxX: null,
    maxY: null,
  };

  const borderShoreTiles = Array.from(player.borderTiles()).filter((t) =>
    gm.isShore(t),
  );

  for (const tile of borderShoreTiles) {
    const distance = gm.manhattanDist(tile, target);
    const cell = gm.cell(tile);

    // Manhattan-closest tile
    if (distance < closestManhattanDistance) {
      closestManhattanDistance = distance;
      bestByManhattan = tile;
    }

    // Extremum tiles
    if (cell.x < minX) {
      minX = cell.x;
      extremumTiles.minX = tile;
    } else if (cell.y < minY) {
      minY = cell.y;
      extremumTiles.minY = tile;
    } else if (cell.x > maxX) {
      maxX = cell.x;
      extremumTiles.maxX = tile;
    } else if (cell.y > maxY) {
      maxY = cell.y;
      extremumTiles.maxY = tile;
    }
  }

  // Calculate sampling interval to ensure we get at most 50 tiles
  const samplingInterval = Math.max(
    10,
    Math.ceil(borderShoreTiles.length / 50),
  );
  const sampledTiles = borderShoreTiles.filter(
    (_, index) => index % samplingInterval === 0,
  );

  const candidates = [
    bestByManhattan,
    extremumTiles.minX,
    extremumTiles.minY,
    extremumTiles.maxX,
    extremumTiles.maxY,
    ...sampledTiles,
  ].filter(Boolean) as number[];

  return candidates;
}

function closestShoreTN(
  gm: GameMap,
  tile: TileRef,
  searchDist: number,
): TileRef | null {
  const tn = Array.from(
    gm.bfs(
      tile,
      andFN((_, t) => !gm.hasOwner(t), manhattanDistFN(tile, searchDist)),
    ),
  )
    .filter((t) => gm.isShore(t))
    .sort((a, b) => gm.manhattanDist(tile, a) - gm.manhattanDist(tile, b));
  if (tn.length === 0) {
    return null;
  }
  return tn[0];
}

// Ownership-agnostic shore search used as a fallback by targetTransportTile when
// a player's own border tiles have lost their isShore designation (compact-map
// downsampling defect). Unlike closestShoreTN, the BFS is bounded only by
// Manhattan distance and traverses tiles regardless of owner, so it works even
// when the search starts from a player-owned tile.
function closestShoreFallback(
  gm: GameMap,
  tile: TileRef,
  searchDist: number,
): TileRef | null {
  const shoreTiles = Array.from(gm.bfs(tile, manhattanDistFN(tile, searchDist)))
    .filter((t) => gm.isShore(t))
    .sort((a, b) => gm.manhattanDist(tile, a) - gm.manhattanDist(tile, b));
  if (shoreTiles.length === 0) {
    return null;
  }
  return shoreTiles[0];
}
