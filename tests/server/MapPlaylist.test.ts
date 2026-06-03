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
  UnitType,
} from "../../src/core/game/Game";
import { GameConfig } from "../../src/core/Schemas";
import {
  applyMatchModifier,
  MATCH_MODIFIERS,
  MINI_MAP_MODIFIER,
  MapPlaylist,
  MODIFIED_MATCH_RATE,
  REGULAR_TEAM_COUNTS,
  TEAM_COUNTS,
  WEIRD_SETTING_OPTIONS,
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

  test("public rotation registers only the weird-setting modifier", () => {
    // mini_map is disabled in the public rotation (s4c) until the compact map4x.bin
    // binaries are regenerated in s5-fix-compact-map-shore-generation.md.
    expect(MATCH_MODIFIERS).toEqual([
      expect.objectContaining({ id: "weird_setting" }),
    ]);
    expect(MATCH_MODIFIERS.some((modifier) => modifier.id === "mini_map")).toBe(
      false,
    );
  });

  test("disabled mini_map definition is retained for re-enabling after s5", () => {
    // The definition stays in the file so re-enabling is a one-line change. It must
    // still produce a compact map config so adding it back to MATCH_MODIFIERS works.
    expect(MINI_MAP_MODIFIER.id).toBe("mini_map");
    expect(MINI_MAP_MODIFIER.apply()).toEqual({
      gameMapSize: GameMapSize.Compact,
    });
  });

  test("weird setting options cover the expected public variants", () => {
    expect(WEIRD_SETTING_OPTIONS.map((option) => option())).toEqual([
      { infiniteGold: true },
      { infiniteTroops: true },
      { disabledUnits: [UnitType.MissileSilo] },
      { disabledUnits: [UnitType.SAMLauncher] },
    ]);
  });

  test("modifier application leaves normal configs unchanged outside the rate", () => {
    const gameConfig = testGameConfig();

    applyMatchModifier(gameConfig, () => MODIFIED_MATCH_RATE);

    expect(gameConfig.gameMapSize).toBe(GameMapSize.Normal);
  });

  test("no public config is ever assigned a compact map", () => {
    const playlist = new MapPlaylist(false);

    for (let i = 0; i < 200; i++) {
      expect(playlist.gameConfig().gameMapSize).toBe(GameMapSize.Normal);
    }
  });

  test("weird_setting is the only modifier selected within the modified rate", () => {
    // Drive the modifier selection across the full random range with a rate-passing
    // gate; it must always apply a weird setting and never switch to a compact map.
    for (const selector of [0, 0.25, 0.5, 0.75, 0.999]) {
      const gameConfig = testGameConfig();
      const randomValues = [0, selector]; // 0 -> passes the modified-match rate gate

      applyMatchModifier(gameConfig, () => randomValues.shift() ?? 0);

      expect(gameConfig.gameMapSize).toBe(GameMapSize.Normal);
    }
  });

  test("modifier application applies the weird setting within the rate", () => {
    const gameConfig = testGameConfig();
    const randomValues = [0, 0.75];
    const mathRandomSpy = jest.spyOn(Math, "random").mockReturnValue(0.5);

    try {
      applyMatchModifier(gameConfig, () => randomValues.shift() ?? 0);
    } finally {
      mathRandomSpy.mockRestore();
    }

    expect(gameConfig.gameMapSize).toBe(GameMapSize.Normal);
    expect(gameConfig.infiniteGold).toBe(false);
    expect(gameConfig.infiniteTroops).toBe(false);
    expect(gameConfig.disabledUnits).toEqual([UnitType.MissileSilo]);
  });
});
