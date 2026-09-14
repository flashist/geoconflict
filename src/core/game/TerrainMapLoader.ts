import { GameMapSize, GameMapType } from "./Game";
import { GameMap, GameMapImpl } from "./GameMap";
import { GameMapLoader } from "./GameMapLoader";

export type TerrainMapData = {
  nations: Nation[];
  gameMap: GameMap;
  miniGameMap: GameMap;
};

// Task 0032: what the cache holds — only the immutable inputs (manifest metadata
// plus the raw terrain bytes), never a built GameMap. GameMapImpl carries mutable
// per-game state (tile ownership, fallout), so caching the built map handed the
// same instance to the next game on that map/size started without a page reload
// (the in-page rejoin routes: hash change / Back, or a `join-lobby` while a game
// is still running — the normal exits are full navigations): the previous
// game's ownership was still in the tiles while the new GameView knew none of
// those players, `owner(tile)` returned null for an owned tile, and
// TerritoryLayer threw `.id` on null at init. Every loadTerrainMap call now
// builds fresh maps from these bytes; only the fetch is deduplicated/cached.
// The bytes are length-checked before caching, so a bad asset is never cached
// and the next call re-fetches.
export type TerrainMapSource = {
  nations: Nation[];
  map: { metadata: MapMetadata; bin: Uint8Array };
  miniMap: { metadata: MapMetadata; bin: Uint8Array };
};

const getMapTypeSizeKey = (mapType: GameMapType, mapSize: GameMapSize): string => {
  return `${mapType}:${mapSize}`;
}

const loadingInProgressMapsPromises = new Map<
  string,
  Promise<TerrainMapSource>
>();
const loadedMaps = new Map<string, TerrainMapSource>();

export function clearTerrainMapCache(): void {
  loadedMaps.clear();
  loadingInProgressMapsPromises.clear();
}

// Callers use this only to check whether a preload has completed; the value is
// the cached source, deliberately not a built map (see TerrainMapSource).
export function getCachedMap(
  mapType: GameMapType,
  mapSize: GameMapSize,
): TerrainMapSource | undefined {
  const mapTypeSizeId = getMapTypeSizeKey(mapType, mapSize);

  const result: TerrainMapSource | undefined = loadedMaps.get(mapTypeSizeId);
  return result;
}

export interface MapMetadata {
  width: number;
  height: number;
  num_land_tiles: number;
}

export interface MapManifest {
  name: string;
  map: MapMetadata;
  map4x: MapMetadata;
  map16x: MapMetadata;
  nations: Nation[];
}

export interface Nation {
  coordinates: [number, number];
  flag: string;
  name: string;
  strength: number;
}

export async function loadTerrainMap(
  mapType: GameMapType,
  mapSize: GameMapSize,
  terrainMapFileLoader: GameMapLoader,
): Promise<TerrainMapData> {
  const source = await loadTerrainMapSource(
    mapType,
    mapSize,
    terrainMapFileLoader,
  );
  return buildTerrainMapData(source);
}

async function buildTerrainMapData(
  source: TerrainMapSource,
): Promise<TerrainMapData> {
  return {
    nations: source.nations,
    gameMap: await genTerrainFromBin(source.map.metadata, source.map.bin),
    miniGameMap: await genTerrainFromBin(
      source.miniMap.metadata,
      source.miniMap.bin,
    ),
  };
}

async function loadTerrainMapSource(
  mapType: GameMapType,
  mapSize: GameMapSize,
  terrainMapFileLoader: GameMapLoader,
): Promise<TerrainMapSource> {

  const mapTypeSizeId = getMapTypeSizeKey(mapType, mapSize);

  const cached = getCachedMap(mapType, mapSize);
  if (cached !== undefined) return cached;

  const loadingInProgressSingleMapPromise = loadingInProgressMapsPromises.get(mapTypeSizeId);
  if (loadingInProgressSingleMapPromise) {
    return loadingInProgressSingleMapPromise;
  }

  const loadingSinglePromise = (async (): Promise<TerrainMapSource> => {

    const mapFiles = terrainMapFileLoader.getMapData(mapType);
    const manifest = await mapFiles.manifest();

    const map =
      mapSize === GameMapSize.Normal
        ? { metadata: manifest.map, bin: await mapFiles.mapBin() }
        : { metadata: manifest.map4x, bin: await mapFiles.map4xBin() };

    const miniMap =
      mapSize === GameMapSize.Normal
        ? {
            // It looks like the double condition for the GameMapSize.Normal is reduntant,
            // because it's already checked just above
            metadata:
              mapSize === GameMapSize.Normal ? manifest.map4x : manifest.map16x,
            bin: await mapFiles.map4xBin(),
          }
        : { metadata: manifest.map16x, bin: await mapFiles.map16xBin() };

    if (mapSize === GameMapSize.Compact) {
      manifest.nations.forEach((nation) => {
        nation.coordinates = [
          Math.floor(nation.coordinates[0] / 2),
          Math.floor(nation.coordinates[1] / 2),
        ];
      });
    }

    // Task 0032: validate here, inside the cached promise, so a short/long bin
    // rejects before anything is cached and the next call re-fetches.
    assertTerrainBinLength(map.metadata, map.bin);
    assertTerrainBinLength(miniMap.metadata, miniMap.bin);

    const result: TerrainMapSource = {
      nations: manifest.nations,
      map: map,
      miniMap: miniMap,
    };
    loadedMaps.set(mapTypeSizeId, result);

    // Remove the map from the loading promises, because it's just loaded
    loadingInProgressMapsPromises.delete(mapTypeSizeId);

    return result;
  })();

  // Save information about the "in progress loading"
  loadingInProgressMapsPromises.set(mapTypeSizeId, loadingSinglePromise);
  // Process error during the loading process
  loadingSinglePromise.catch(
    (error: unknown) => {
      console.error(
        `TerrainMapLoader: failed to load map "${mapTypeSizeId}":`,
        error instanceof Error ? error : new Error(String(error))
      );

      // Remove the map from the loading promises, because loading failed
      loadingInProgressMapsPromises.delete(mapTypeSizeId);
    }
  );

  return loadingSinglePromise;
}

function assertTerrainBinLength(mapData: MapMetadata, data: Uint8Array): void {
  if (data.length !== mapData.width * mapData.height) {
    throw new Error(
      `Invalid data: buffer size ${data.length} incorrect for ${mapData.width}x${mapData.height} terrain plus 4 bytes for dimensions.`,
    );
  }
}

export async function genTerrainFromBin(
  mapData: MapMetadata,
  data: Uint8Array,
): Promise<GameMap> {
  assertTerrainBinLength(mapData, data);

  return new GameMapImpl(
    mapData.width,
    mapData.height,
    data,
    mapData.num_land_tiles,
  );
}
