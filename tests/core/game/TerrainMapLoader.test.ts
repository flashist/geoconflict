import { GameMapSize, GameMapType } from "../../../src/core/game/Game";
import { GameMapLoader } from "../../../src/core/game/GameMapLoader";
import {
  MapManifest,
  Nation,
  clearTerrainMapCache,
  genTerrainFromBin,
  getCachedMap,
  loadTerrainMap,
} from "../../../src/core/game/TerrainMapLoader";

const W = 8;
const H = 8;
const MAP = GameMapType.World;

function makeMockLoader(
  w: number,
  h: number,
  nations: Nation[] = [],
): { loader: GameMapLoader; mapData: ReturnType<typeof makeMapData> } {
  const manifest: MapManifest = {
    name: "test",
    map: { width: w, height: h, num_land_tiles: 0 },
    map4x: { width: w / 2, height: h / 2, num_land_tiles: 0 },
    map16x: { width: w / 4, height: h / 4, num_land_tiles: 0 },
    nations,
  };
  const mapData = makeMapData(w, h, manifest);
  return { loader: { getMapData: jest.fn().mockReturnValue(mapData) }, mapData };
}

function makeMapData(w: number, h: number, manifest: MapManifest) {
  return {
    manifest: jest.fn().mockResolvedValue(manifest),
    mapBin: jest.fn().mockResolvedValue(new Uint8Array(w * h)),
    map4xBin: jest.fn().mockResolvedValue(new Uint8Array((w / 2) * (h / 2))),
    map16xBin: jest.fn().mockResolvedValue(new Uint8Array((w / 4) * (h / 4))),
    webpPath: jest.fn().mockResolvedValue(""),
  };
}

function makeFailingLoader(): GameMapLoader {
  return {
    getMapData: jest.fn().mockReturnValue({
      manifest: jest.fn().mockRejectedValue(new Error("network error")),
      mapBin: jest.fn(),
      map4xBin: jest.fn(),
      map16xBin: jest.fn(),
      webpPath: jest.fn(),
    }),
  };
}

describe("genTerrainFromBin", () => {
  test("returns GameMap with correct dimensions for a valid buffer", async () => {
    const metadata = { width: W, height: H, num_land_tiles: 0 };
    const buf = new Uint8Array(W * H);
    const result = await genTerrainFromBin(metadata, buf);
    expect(result.width()).toBe(W);
    expect(result.height()).toBe(H);
  });

  test("throws when buffer size does not match width * height", async () => {
    const metadata = { width: 4, height: 4, num_land_tiles: 0 };
    const wrongBuf = new Uint8Array(10);
    await expect(genTerrainFromBin(metadata, wrongBuf)).rejects.toThrow();
  });
});

describe("loadTerrainMap", () => {
  beforeEach(() => {
    clearTerrainMapCache();
  });

  test("caches completed load — loader called once, but the second call gets fresh maps", async () => {
    const { loader, mapData } = makeMockLoader(W, H);
    const first = await loadTerrainMap(MAP, GameMapSize.Normal, loader);
    const second = await loadTerrainMap(MAP, GameMapSize.Normal, loader);
    expect(mapData.manifest).toHaveBeenCalledTimes(1);
    expect(mapData.mapBin).toHaveBeenCalledTimes(1);
    expect(second.gameMap).not.toBe(first.gameMap);
    expect(second.miniGameMap).not.toBe(first.miniGameMap);
    expect(second.nations).toBe(first.nations);
  });

  // Task 0032: the cache used to hand the same GameMapImpl to every game on that
  // map/size, so the previous game's tile ownership leaked into the next game's
  // GameView (which knows none of those players) and TerritoryLayer threw `.id`
  // on null at init.
  test("tile state written by one game does not leak into the next load of the same map (task 0032)", async () => {
    const { loader, mapData } = makeMockLoader(W, H);
    const first = await loadTerrainMap(MAP, GameMapSize.Normal, loader);
    const tile = first.gameMap.ref(1, 1);
    first.gameMap.setOwnerID(tile, 7);
    first.gameMap.setFallout(first.gameMap.ref(2, 2), true);
    expect(first.gameMap.hasOwner(tile)).toBe(true);

    const second = await loadTerrainMap(MAP, GameMapSize.Normal, loader);
    expect(mapData.manifest).toHaveBeenCalledTimes(1);
    expect(second.gameMap.hasOwner(tile)).toBe(false);
    expect(second.gameMap.ownerID(tile)).toBe(0);
    expect(second.gameMap.numTilesWithFallout()).toBe(0);
    // The first game's map is untouched by the second load.
    expect(first.gameMap.ownerID(tile)).toBe(7);
  });

  test("getCachedMap reports a completed load without building a map", async () => {
    const { loader } = makeMockLoader(W, H);
    expect(getCachedMap(MAP, GameMapSize.Normal)).toBeUndefined();
    await loadTerrainMap(MAP, GameMapSize.Normal, loader);
    expect(getCachedMap(MAP, GameMapSize.Normal)).toBeDefined();
    expect(getCachedMap(MAP, GameMapSize.Compact)).toBeUndefined();
  });

  test("deduplicates concurrent in-flight loads — loader called once, each caller gets its own maps", async () => {
    const { loader, mapData } = makeMockLoader(W, H);
    const [first, second] = await Promise.all([
      loadTerrainMap(MAP, GameMapSize.Normal, loader),
      loadTerrainMap(MAP, GameMapSize.Normal, loader),
    ]);
    expect(mapData.manifest).toHaveBeenCalledTimes(1);
    expect(second.gameMap).not.toBe(first.gameMap);
  });

  test("error recovery — failed load is cleared from cache, allowing a successful retry", async () => {
    const failingLoader = makeFailingLoader();
    await expect(
      loadTerrainMap(MAP, GameMapSize.Normal, failingLoader),
    ).rejects.toThrow("network error");

    const { loader: successLoader } = makeMockLoader(W, H);
    const result = await loadTerrainMap(MAP, GameMapSize.Normal, successLoader);
    expect(result).toBeDefined();
  });

  // Task 0032 (review R4): the bin length is checked inside the cached promise,
  // so a bad asset is never cached and the next call re-fetches.
  test("error recovery — a short bin rejects, is not cached, and a retry re-fetches", async () => {
    const { loader: shortLoader, mapData: shortMapData } = makeMockLoader(W, H);
    shortMapData.mapBin.mockResolvedValue(new Uint8Array(W * H - 1));
    await expect(
      loadTerrainMap(MAP, GameMapSize.Normal, shortLoader),
    ).rejects.toThrow("Invalid data");
    expect(getCachedMap(MAP, GameMapSize.Normal)).toBeUndefined();

    const { loader: successLoader, mapData: successMapData } = makeMockLoader(
      W,
      H,
    );
    const result = await loadTerrainMap(MAP, GameMapSize.Normal, successLoader);
    expect(successMapData.mapBin).toHaveBeenCalledTimes(1);
    expect(result.gameMap.width()).toBe(W);
  });

  test("Normal and Compact sizes are cached independently", async () => {
    const { loader: normalLoader } = makeMockLoader(W, H);
    const { loader: compactLoader } = makeMockLoader(W, H);
    const normal = await loadTerrainMap(MAP, GameMapSize.Normal, normalLoader);
    const compact = await loadTerrainMap(MAP, GameMapSize.Compact, compactLoader);
    expect(normal).not.toBe(compact);
  });

  test("Compact size halves nation coordinates", async () => {
    const nations: Nation[] = [
      { coordinates: [4, 6], flag: "🏳️", name: "Testland", strength: 1 },
    ];
    const { loader } = makeMockLoader(W, H, nations);
    const result = await loadTerrainMap(MAP, GameMapSize.Compact, loader);
    expect(result.nations[0].coordinates).toEqual([2, 3]);
  });

  test("Normal uses mapBin for main map; Compact uses map4xBin for main map", async () => {
    const { loader: normalLoader, mapData: normalMapData } = makeMockLoader(W, H);
    await loadTerrainMap(MAP, GameMapSize.Normal, normalLoader);
    expect(normalMapData.mapBin).toHaveBeenCalled();

    clearTerrainMapCache();

    const { loader: compactLoader, mapData: compactMapData } = makeMockLoader(W, H);
    await loadTerrainMap(MAP, GameMapSize.Compact, compactLoader);
    expect(compactMapData.mapBin).not.toHaveBeenCalled();
    expect(compactMapData.map4xBin).toHaveBeenCalled();
    expect(compactMapData.map16xBin).toHaveBeenCalled();
  });
});
