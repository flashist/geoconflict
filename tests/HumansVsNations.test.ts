import {
  ColoredTeams,
  Difficulty,
  Game,
  GameMapSize,
  GameMapType,
  GameMode,
  GameType,
  HumansVsNations,
  PlayerType,
} from "../src/core/game/Game";
import { DefaultConfig } from "../src/core/configuration/DefaultConfig";
import {
  normalizeHumansVsNationsConfig,
} from "../src/core/GameRunner";
import { GameConfig } from "../src/core/Schemas";
import { playerInfo, setup } from "./util/Setup";
import { UserSettings } from "../src/core/game/UserSettings";
import { TestServerConfig } from "./util/TestServerConfig";

let game: Game;

function makeHvNConfig(overrides: Partial<GameConfig> = {}): GameConfig {
  return {
    gameMap: GameMapType.Asia,
    gameMapSize: GameMapSize.Normal,
    gameMode: GameMode.Team,
    gameType: GameType.Public,
    difficulty: Difficulty.Medium,
    disableNPCs: false,
    donateGold: false,
    donateTroops: false,
    bots: 10,
    infiniteGold: false,
    infiniteTroops: false,
    instantBuild: false,
    playerTeams: HumansVsNations,
    ...overrides,
  };
}

describe("HumansVsNations", () => {
  test("humans are assigned to Humans team", async () => {
    game = await setup(
      "plains",
      {
        gameMode: GameMode.Team,
        playerTeams: HumansVsNations,
        disableNPCs: false,
      },
      [
        playerInfo("human1", PlayerType.Human),
        playerInfo("human2", PlayerType.Human),
      ],
    );

    const p1 = game.player("human1");
    const p2 = game.player("human2");
    expect(p1.team()).toBe(ColoredTeams.Humans);
    expect(p2.team()).toBe(ColoredTeams.Humans);
    expect(p1.isOnSameTeam(p2)).toBe(true);
  });

  test("normalizer balances nations against all human-side players", () => {
    const config = makeHvNConfig({ bots: 10 });

    expect(normalizeHumansVsNationsConfig(config, 5, 99)).toMatchObject({
      nationCount: 5,
      botCountOverride: 5,
    });
  });

  test("normalizer caps nations by available bot places", () => {
    const config = makeHvNConfig({ bots: 5 });

    expect(normalizeHumansVsNationsConfig(config, 100, 99)).toMatchObject({
      nationCount: 5,
      botCountOverride: 0,
    });
  });

  test("normalizer also caps by available named nations on the map", () => {
    const config = makeHvNConfig({ bots: 10 });

    expect(normalizeHumansVsNationsConfig(config, 8, 3)).toMatchObject({
      nationCount: 3,
      botCountOverride: 7,
    });
  });

  test("non-HvN configs should bypass the normalizer at the call site", () => {
    const config = makeHvNConfig({ gameMode: GameMode.FFA, playerTeams: undefined });
    expect(config.gameMode).toBe(GameMode.FFA);
    expect(config.playerTeams).toBeUndefined();
  });

  test("default config uses botCountOverride when present", () => {
    const config = new DefaultConfig(
      new TestServerConfig(),
      makeHvNConfig({ bots: 10, botCountOverride: 4 }),
      new UserSettings(),
      false,
    );

    expect(config.bots()).toBe(4);
    expect(config.numBots()).toBe(4);
  });
});
