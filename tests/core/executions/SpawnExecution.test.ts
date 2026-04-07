import { SpawnExecution } from "../../../src/core/execution/SpawnExecution";
import { Game, PlayerInfo, PlayerType } from "../../../src/core/game/Game";
import { setup } from "../../util/Setup";

describe("SpawnExecution", () => {
  let game: Game;

  beforeEach(async () => {
    game = await setup("big_plains", {}, []);
  });

  test("adds player during spawn phase", async () => {
    expect(game.inSpawnPhase()).toBe(true);

    const tile = game.ref(50, 50);
    const playerInfo = new PlayerInfo(
      "p1",
      PlayerType.Human,
      "client1",
      "pid1",
    );
    const exec = new SpawnExecution(playerInfo, tile);
    exec.init(game, 0);
    exec.tick(0);

    expect(game.hasPlayer("pid1")).toBe(true);
  });

  test("warns and does not add player when spawn phase is over", async () => {
    while (game.inSpawnPhase()) {
      game.executeNextTick();
    }

    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    const tile = game.ref(50, 50);
    const playerInfo = new PlayerInfo(
      "p1",
      PlayerType.Human,
      "client1",
      "pid1",
    );
    const exec = new SpawnExecution(playerInfo, tile);
    exec.init(game, 0);
    exec.tick(0);

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("spawn phase over"),
    );
    expect(game.hasPlayer("pid1")).toBe(false);
    warnSpy.mockRestore();
  });
});
