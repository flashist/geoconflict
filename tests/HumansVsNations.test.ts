import {
  Cell,
  ColoredTeams,
  GameMode,
  HumansVsNations,
  Nation,
  PlayerInfo,
  PlayerType,
} from "../src/core/game/Game";
import { setup, playerInfo } from "./util/Setup";

function nationInfo(name: string): Nation {
  return new Nation(new Cell(0, 0), 1, new PlayerInfo(name, PlayerType.Bot, null, name));
}

describe("HumansVsNations mode", () => {
  test("populateTeams assigns Humans and Nations teams", async () => {
    const human1 = playerInfo("human1", PlayerType.Human);
    const human2 = playerInfo("human2", PlayerType.Human);
    const nation1 = nationInfo("nation1");
    const nation2 = nationInfo("nation2");

    const game = await setup(
      "plains",
      { gameMode: GameMode.Team, playerTeams: HumansVsNations },
      [human1, human2],
      [nation1, nation2],
    );

    expect(game.player("human1").team()).toBe(ColoredTeams.Humans);
    expect(game.player("human2").team()).toBe(ColoredTeams.Humans);
    expect(game.player("nation1").team()).toBe(ColoredTeams.Nations);
    expect(game.player("nation2").team()).toBe(ColoredTeams.Nations);
  });

  test("humans and nations are on opposing teams", async () => {
    const human = playerInfo("human1", PlayerType.Human);
    const nation = nationInfo("nation1");

    const game = await setup(
      "plains",
      { gameMode: GameMode.Team, playerTeams: HumansVsNations },
      [human],
      [nation],
    );

    expect(
      game.player("human1").isOnSameTeam(game.player("nation1")),
    ).toBe(false);
  });

  test("two humans are on the same team", async () => {
    const human1 = playerInfo("human1", PlayerType.Human);
    const human2 = playerInfo("human2", PlayerType.Human);

    const game = await setup(
      "plains",
      { gameMode: GameMode.Team, playerTeams: HumansVsNations },
      [human1, human2],
      [],
    );

    expect(
      game.player("human1").isOnSameTeam(game.player("human2")),
    ).toBe(true);
  });
});
