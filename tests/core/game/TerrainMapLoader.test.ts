import { GameMapSize, GameMapType } from "../../../src/core/game/Game";
import { GameMapLoader } from "../../../src/core/game/GameMapLoader";
import {
  MapManifest,
  Nation,
  clearTerrainMapCache,
  genTerrainFromBin,
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

  test("caches completed load — second call returns same object, loader called once", async () => {
    const { loader, mapData } = makeMockLoader(W, H);
    const first = await loadTerrainMap(MAP, GameMapSize.Normal, loader);
    const second = await loadTerrainMap(MAP, GameMapSize.Normal, loader);
    expect(mapData.manifest).toHaveBeenCalledTimes(1);
    expect(first).toBe(second);
  });

  test("deduplicates concurrent in-flight loads — loader called once for two parallel calls", async () => {
    const { loader, mapData } = makeMockLoader(W, H);
    const [first, second] = await Promise.all([
      loadTerrainMap(MAP, GameMapSize.Normal, loader),
      loadTerrainMap(MAP, GameMapSize.Normal, loader),
    ]);
    expect(mapData.manifest).toHaveBeenCalledTimes(1);
    expect(first).toBe(second);
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
