import {
  ColoredTeams,
  Game,
  GameMode,
  HumansVsNations,
  PlayerType,
} from "../src/core/game/Game";
import { playerInfo, setup } from "./util/Setup";

let game: Game;

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
});
