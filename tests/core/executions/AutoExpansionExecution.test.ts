import {
  AUTO_EXPANSION_INTERVAL_TICKS,
  AUTO_EXPANSION_MAX_COUNT,
  AUTO_EXPANSION_WINDOW_TICKS,
  AutoExpansionExecution,
} from "../../../src/core/execution/AutoExpansionExecution";
import { Game, GameType, Player, PlayerInfo, PlayerType } from "../../../src/core/game/Game";
import { setup } from "../../util/Setup";
import { executeTicks } from "../../util/utils";

let game: Game;
let player: Player;

async function setupGame(gameType: GameType = GameType.Public): Promise<void> {
  game = await setup("big_plains", { gameType });

  while (game.inSpawnPhase()) {
    game.executeNextTick();
  }

  const info = new PlayerInfo("player", PlayerType.Human, "client1", "player_id");
  player = game.addPlayer(info);

  // Give player some land to have border tiles
  game.map().forEachTile((tile) => {
    if (game.map().isLand(tile) && player.numTilesOwned() < 5) {
      player.conquer(tile);
    }
  });
}

describe("AutoExpansionExecution", () => {
  test("fires an attack at the first interval tick", async () => {
    await setupGame();

    const exec = new AutoExpansionExecution(player);
    game.addExecution(exec);

    // Tick once to init — spawnTick is set here, elapsed=0, no attack yet
    game.executeNextTick();
    expect(player.outgoingAttacks()).toHaveLength(0);

    // One tick before the interval — still no attack
    executeTicks(game, AUTO_EXPANSION_INTERVAL_TICKS - 1);
    expect(player.outgoingAttacks()).toHaveLength(0);

    // One more tick → elapsed=INTERVAL → attack fires
    game.executeNextTick();
    expect(player.outgoingAttacks()).toHaveLength(1);
  });

  test("stops after MAX_COUNT expansions", async () => {
    await setupGame();

    const exec = new AutoExpansionExecution(player);
    game.addExecution(exec);
    game.executeNextTick(); // init

    // Run past max count — (MAX_COUNT + 1) intervals is sufficient
    executeTicks(game, AUTO_EXPANSION_INTERVAL_TICKS * (AUTO_EXPANSION_MAX_COUNT + 1));
    expect(exec.isActive()).toBe(false);
  });

  test("stops immediately when player has acted", async () => {
    await setupGame();

    const exec = new AutoExpansionExecution(player);
    game.addExecution(exec);
    game.executeNextTick(); // init

    // Simulate player action before first interval
    player.setHasActed(true);

    executeTicks(game, AUTO_EXPANSION_INTERVAL_TICKS);

    expect(exec.isActive()).toBe(false);
    expect(player.outgoingAttacks()).toHaveLength(0);
  });

  test("stops after window expires", async () => {
    await setupGame();

    const exec = new AutoExpansionExecution(player);
    game.addExecution(exec);
    game.executeNextTick(); // init

    executeTicks(game, AUTO_EXPANSION_WINDOW_TICKS);

    expect(exec.isActive()).toBe(false);
  });

  test("does not fire when all neighbors are player-owned", async () => {
    await setupGame();

    // Surround the player's territory completely with another player's tiles
    const other = game.addPlayer(
      new PlayerInfo("other", PlayerType.Human, "client2", "other_id"),
    );
    // Give other player all remaining land
    game.map().forEachTile((tile) => {
      if (game.map().isLand(tile) && game.owner(tile) !== player) {
        other.conquer(tile);
      }
    });

    const exec = new AutoExpansionExecution(player);
    game.addExecution(exec);
    game.executeNextTick(); // init

    executeTicks(game, AUTO_EXPANSION_INTERVAL_TICKS);

    // No terra nullius neighbors — exec should deactivate without firing
    expect(exec.isActive()).toBe(false);
    expect(player.outgoingAttacks()).toHaveLength(0);
  });
});
