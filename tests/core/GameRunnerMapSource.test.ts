// Task 0035: the worker builds its game from the map the page already loaded
// (TerrainMapSource in the init message) and downloads nothing; with no source
// it still downloads the map through its loader, as before.

jest.mock("../../src/core/configuration/ConfigLoader", () => ({
  getConfig: jest.fn(),
}));

import fs from "fs";
import path from "path";
import { getConfig } from "../../src/core/configuration/ConfigLoader";
import {
  Difficulty,
  GameMapSize,
  GameMapType,
  GameMode,
  GameType,
} from "../../src/core/game/Game";
import { GameMapLoader } from "../../src/core/game/GameMapLoader";
import {
  clearTerrainMapCache,
  MapManifest,
  TerrainMapSource,
} from "../../src/core/game/TerrainMapLoader";
import { UserSettings } from "../../src/core/game/UserSettings";
import { createGameRunner } from "../../src/core/GameRunner";
import { GameConfig, GameStartInfo } from "../../src/core/Schemas";
import { TestConfig } from "../util/TestConfig";
import { TestServerConfig } from "../util/TestServerConfig";

const mapDir = path.join(__dirname, "../testdata/maps/plains");
const readBin = (name: string) =>
  new Uint8Array(fs.readFileSync(path.join(mapDir, name)));
const manifest: MapManifest = {
  ...JSON.parse(fs.readFileSync(path.join(mapDir, "manifest.json"), "utf8")),
  nations: [],
};

const gameConfig: GameConfig = {
  gameMap: GameMapType.World,
  gameMapSize: GameMapSize.Normal,
  gameMode: GameMode.FFA,
  gameType: GameType.Singleplayer,
  difficulty: Difficulty.Medium,
  disableNPCs: true,
  donateGold: false,
  donateTroops: false,
  bots: 0,
  infiniteGold: false,
  startGold: 0,
  infiniteTroops: false,
  instantBuild: false,
};

const gameStart = {
  gameID: "game-0035",
  config: gameConfig,
  players: [],
} as unknown as GameStartInfo;

function makeLoader(): GameMapLoader {
  return {
    getMapData: jest.fn(() => ({
      manifest: jest.fn(() => Promise.resolve(manifest)),
      mapBin: jest.fn(() => Promise.resolve(readBin("map.bin"))),
      map4xBin: jest.fn(() => Promise.resolve(readBin("map4x.bin"))),
      map16xBin: jest.fn(() => Promise.resolve(readBin("map16x.bin"))),
      webpPath: jest.fn(() => Promise.resolve("")),
    })),
  };
}

function makeSource(): TerrainMapSource {
  return {
    nations: [],
    map: { metadata: manifest.map, bin: readBin("map.bin") },
    miniMap: { metadata: manifest.map4x, bin: readBin("map4x.bin") },
  };
}

describe("createGameRunner map source (task 0035)", () => {
  beforeEach(() => {
    console.debug = () => {};
    clearTerrainMapCache();
    (getConfig as jest.Mock).mockImplementation((config: GameConfig) =>
      Promise.resolve(
        new TestConfig(
          new TestServerConfig(),
          config,
          new UserSettings(),
          false,
        ),
      ),
    );
  });

  test("with a source, the map loader is never called and the map is the source's", async () => {
    const loader = makeLoader();
    const source = makeSource();

    const runner = await createGameRunner(
      gameStart,
      "client-1",
      loader,
      jest.fn(),
      source,
    );

    expect(loader.getMapData).not.toHaveBeenCalled();
    expect(runner.game.width()).toBe(source.map.metadata.width);
    expect(runner.game.height()).toBe(source.map.metadata.height);
  });

  test("without a source, the worker downloads the map through its loader (fallback)", async () => {
    const loader = makeLoader();

    const runner = await createGameRunner(
      gameStart,
      "client-1",
      loader,
      jest.fn(),
    );

    expect(loader.getMapData).toHaveBeenCalledTimes(1);
    expect(loader.getMapData).toHaveBeenCalledWith(GameMapType.World);
    expect(runner.game.width()).toBe(manifest.map.width);
  });
});
