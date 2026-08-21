import { Game, PlayerType } from "../../../src/core/game/Game";
import { playerInfo, setup } from "../../util/Setup";

describe("StartGold", () => {
  test("startGold grants starting gold to humans and AI players only", async () => {
    const game: Game = await setup("plains", { startGold: 5_000_000 });

    const human = game.addPlayer(playerInfo("human", PlayerType.Human));
    const aiPlayer = game.addPlayer(playerInfo("ai", PlayerType.AiPlayer));
    const nation = game.addPlayer(playerInfo("nation", PlayerType.FakeHuman));
    const bot = game.addPlayer(playerInfo("bot", PlayerType.Bot));

    expect(human.gold()).toBe(5_000_000n);
    expect(aiPlayer.gold()).toBe(5_000_000n);
    expect(nation.gold()).toBe(0n);
    expect(bot.gold()).toBe(0n);
  });

  test("default config starts all player types with zero gold", async () => {
    const game: Game = await setup("plains", { startGold: 0 });

    const human = game.addPlayer(playerInfo("human", PlayerType.Human));
    const aiPlayer = game.addPlayer(playerInfo("ai", PlayerType.AiPlayer));
    const nation = game.addPlayer(playerInfo("nation", PlayerType.FakeHuman));
    const bot = game.addPlayer(playerInfo("bot", PlayerType.Bot));

    expect(human.gold()).toBe(0n);
    expect(aiPlayer.gold()).toBe(0n);
    expect(nation.gold()).toBe(0n);
    expect(bot.gold()).toBe(0n);
  });
});
