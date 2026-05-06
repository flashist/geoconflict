import {
  Difficulty,
  Duos,
  GameMapSize,
  GameMapType,
  GameMode,
  GameType,
  HumansVsNations,
  Quads,
  Trios,
} from "../../src/core/game/Game";
import { GameConfig } from "../../src/core/Schemas";
import {
  applyMatchModifier,
  MATCH_MODIFIERS,
  MapPlaylist,
  MODIFIED_MATCH_RATE,
  REGULAR_TEAM_COUNTS,
  TEAM_COUNTS,
  randomTeamCount,
} from "../../src/server/MapPlaylist";

function testGameConfig(): GameConfig {
  return {
    donateGold: false,
    donateTroops: false,
    gameMap: GameMapType.World,
    maxPlayers: 50,
    gameType: GameType.Public,
    gameMapSize: GameMapSize.Normal,
    difficulty: Difficulty.Medium,
    infiniteGold: false,
    infiniteTroops: false,
    maxTimerValue: undefined,
    instantBuild: false,
    disableNPCs: false,
    gameMode: GameMode.FFA,
    playerTeams: undefined,
    bots: 400,
    disabledUnits: [],
  };
}

describe("MapPlaylist", () => {
  test("regular public team counts are capped at 4", () => {
    expect(REGULAR_TEAM_COUNTS).toEqual([2, 3, 4]);
    expect(TEAM_COUNTS).toEqual([2, 3, 4, HumansVsNations, Duos, Trios, Quads]);
    expect(TEAM_COUNTS).not.toContain(5);
    expect(TEAM_COUNTS).not.toContain(6);
    expect(TEAM_COUNTS).not.toContain(7);
  });

  test("random team count can select every allowed public team mode", () => {
    TEAM_COUNTS.forEach((teamCount, index) => {
      expect(randomTeamCount(() => (index + 0.1) / TEAM_COUNTS.length)).toBe(
        teamCount,
      );
    });
  });

  test("generated public configs keep FFA untouched and cap regular team counts", () => {
    const playlist = new MapPlaylist(false);

    for (let i = 0; i < 100; i++) {
      const gameConfig = playlist.gameConfig();

      if (gameConfig.gameMode === GameMode.FFA) {
        expect(gameConfig.playerTeams).toBeUndefined();
        continue;
      }

      expect(gameConfig.playerTeams).toBeDefined();
      expect(TEAM_COUNTS).toContain(gameConfig.playerTeams);
      expect([5, 6, 7]).not.toContain(gameConfig.playerTeams);
    }
  });

  test("modified match rate is isolated and configurable", () => {
    expect(MODIFIED_MATCH_RATE).toBe(0.2);
  });

  test("compact map modifier is registered for public rotation", () => {
    expect(MATCH_MODIFIERS).toEqual([
      expect.objectContaining({ id: "mini_map" }),
    ]);
    expect(MATCH_MODIFIERS[0].apply()).toEqual({
      gameMapSize: GameMapSize.Compact,
    });
  });

  test("modifier application leaves normal configs unchanged outside the rate", () => {
    const gameConfig = testGameConfig();

    applyMatchModifier(gameConfig, () => MODIFIED_MATCH_RATE);

    expect(gameConfig.gameMapSize).toBe(GameMapSize.Normal);
  });

  test("modifier application can select compact maps", () => {
    const gameConfig = testGameConfig();
    const randomValues = [0, 0];

    applyMatchModifier(gameConfig, () => randomValues.shift() ?? 0);

    expect(gameConfig.gameMapSize).toBe(GameMapSize.Compact);
  });
});
