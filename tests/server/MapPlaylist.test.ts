import { GameMode, HumansVsNations } from "../../src/core/game/Game";
import {
  MapPlaylist,
  REGULAR_TEAM_COUNTS,
  TEAM_COUNTS,
  randomTeamCount,
} from "../../src/server/MapPlaylist";

describe("MapPlaylist", () => {
  test("regular public team counts are capped at 4", () => {
    expect(REGULAR_TEAM_COUNTS).toEqual([2, 3, 4]);
    expect(TEAM_COUNTS).toEqual([2, 3, 4, HumansVsNations]);
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
});
