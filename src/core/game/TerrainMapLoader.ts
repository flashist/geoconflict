import { GameMapSize, GameMapType } from "./Game";
import { GameMap, GameMapImpl } from "./GameMap";
import { GameMapLoader } from "./GameMapLoader";

export type TerrainMapData = {
  nations: Nation[];
  gameMap: GameMap;
  miniGameMap: GameMap;
};

type TerrainCacheKey = `${GameMapType}:${GameMapSize}`;

function terrainCacheKey(map: GameMapType, mapSize: GameMapSize): TerrainCacheKey {
  return `${map}:${mapSize}`;
}

const loadedMaps = new Map<TerrainCacheKey, TerrainMapData>();
const inFlightLoads = new Map<TerrainCacheKey, Promise<TerrainMapData>>();

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
  map: GameMapType,
  mapSize: GameMapSize,
  terrainMapFileLoader: GameMapLoader,
): Promise<TerrainMapData> {
  const key = terrainCacheKey(map, mapSize);

  const cached = loadedMaps.get(key);
  if (cached !== undefined) return cached;

  const inFlight = inFlightLoads.get(key);
  if (inFlight !== undefined) return inFlight;

  const promise = (async () => {
    try {
      const mapFiles = terrainMapFileLoader.getMapData(map);
      const manifest = await mapFiles.manifest();

      const gameMap =
        mapSize === GameMapSize.Normal
          ? await genTerrainFromBin(manifest.map, await mapFiles.mapBin())
          : await genTerrainFromBin(manifest.map4x, await mapFiles.map4xBin());

      const miniMap =
        mapSize === GameMapSize.Normal
          ? await genTerrainFromBin(
              mapSize === GameMapSize.Normal ? manifest.map4x : manifest.map16x,
              await mapFiles.map4xBin(),
            )
          : await genTerrainFromBin(manifest.map16x, await mapFiles.map16xBin());

      if (mapSize === GameMapSize.Compact) {
        manifest.nations.forEach((nation) => {
          nation.coordinates = [
            Math.floor(nation.coordinates[0] / 2),
            Math.floor(nation.coordinates[1] / 2),
          ];
        });
      }

      const result = {
        nations: manifest.nations,
        gameMap: gameMap,
        miniGameMap: miniMap,
      };
      loadedMaps.set(key, result);
      return result;
    } finally {
      inFlightLoads.delete(key);
    }
  })();

  inFlightLoads.set(key, promise);
  return promise;
}

export function isMapCached(map: GameMapType, mapSize: GameMapSize): boolean {
  return loadedMaps.has(terrainCacheKey(map, mapSize));
}

export function clearPreloadedMap(map: GameMapType, mapSize: GameMapSize): void {
  const key = terrainCacheKey(map, mapSize);
  loadedMaps.delete(key);
  inFlightLoads.delete(key);
}

export async function genTerrainFromBin(
  mapData: MapMetadata,
  data: Uint8Array,
): Promise<GameMap> {
  if (data.length !== mapData.width * mapData.height) {
    throw new Error(
      `Invalid data: buffer size ${data.length} incorrect for ${mapData.width}x${mapData.height} terrain plus 4 bytes for dimensions.`,
    );
  }

  return new GameMapImpl(
    mapData.width,
    mapData.height,
    data,
    mapData.num_land_tiles,
  );
}
