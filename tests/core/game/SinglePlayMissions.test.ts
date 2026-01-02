import { Difficulty, GameMapType } from "../../../src/core/game/Game";
import {
  assignNationDifficulties,
  computeTierCounts,
  deriveMissionSeed,
  selectMissionMap,
} from "../../../src/core/game/SinglePlayMissions";
import { PseudoRandom } from "../../../src/core/PseudoRandom";

describe("SinglePlayMissions", () => {
  test("computeTierCounts clamps to nation count", () => {
    const counts = computeTierCounts(100, 2);
    expect(counts.impossible + counts.hard + counts.medium + counts.easy).toBe(
      2,
    );
  });

  test("assignNationDifficulties is deterministic per seed", () => {
    const seed = deriveMissionSeed(GameMapType.World, 7);
    const counts = computeTierCounts(7, 5);
    const first = assignNationDifficulties(5, counts, new PseudoRandom(seed));
    const second = assignNationDifficulties(5, counts, new PseudoRandom(seed));
    expect(first).toEqual(second);
  });

  test("selectMissionMap orders by maxPlayers then id", () => {
    const maps = [GameMapType.Oceania, GameMapType.Asia, GameMapType.Africa];
    const selected = selectMissionMap(1, maps);
    expect(selected).toBe(GameMapType.Oceania);
  });

  test("assignNationDifficulties defaults to Easy when counts are zero", () => {
    const counts = { easy: 3, medium: 0, hard: 0, impossible: 0 };
    const difficulties = assignNationDifficulties(
      3,
      counts,
      new PseudoRandom(123),
    );
    expect(difficulties).toEqual([
      Difficulty.Easy,
      Difficulty.Easy,
      Difficulty.Easy,
    ]);
  });
});
