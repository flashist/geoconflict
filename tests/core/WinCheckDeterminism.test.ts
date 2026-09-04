jest.mock("jose", () => ({
  base64url: {
    decode: jest.fn(),
  },
}));

import { WinCheckExecution } from "../../src/core/execution/WinCheckExecution";
import {
  GameMode,
  GameType,
  PlayerInfo,
  PlayerType,
} from "../../src/core/game/Game";
import {
  GameUpdateType,
  HashUpdate,
  WinConditionCheckUpdate,
} from "../../src/core/game/GameUpdates";
import { setup } from "../util/Setup";

const TICKS = 200;

/**
 * Task 0208. The win-condition instrumentation adds an execution-private latch
 * and a view-stream update to WinCheckExecution. Neither may perturb the
 * simulation: the state hash is what every client votes on for desync
 * detection.
 *
 * ⚠️ WHAT THIS FILE CANNOT PROVE, stated plainly: it runs one game instance per
 * comparison, so it demonstrates that the added code is inert with respect to
 * the hash — NOT that two different clients compose the same event. That
 * property is secured by design, not by test: the emitted payload is derived
 * purely from game state and config and carries no clientID and no per-client
 * data. A future edit that makes the payload client-dependent would NOT be
 * caught here. See the comment on WinCheckExecution.reportWinConditionCheck().
 */
describe("win-condition instrumentation determinism (task 0208)", () => {
  it("produces an identical hash sequence across two independent runs", async () => {
    const first = await runGame();
    const second = await runGame();

    // Not vacuous: the game really did hash, on every tenth tick of the run.
    expect(first.hashes).toHaveLength(TICKS / 10);
    expect(first.hashes.every((hash) => hash !== 0)).toBe(true);
    expect(second.hashes).toEqual(first.hashes);
  });

  it("produces an identical win-condition update across two independent runs", async () => {
    const first = await runGame();
    const second = await runGame();

    expect(first.winConditionUpdates).toHaveLength(1);
    expect(second.winConditionUpdates).toEqual(first.winConditionUpdates);
  });

  it("carries no identifiers of any kind in the payload", async () => {
    const { winConditionUpdates } = await runGame();

    expect(Object.keys(winConditionUpdates[0]).sort()).toEqual([
      "branch",
      "isTutorial",
      "leaderKind",
      "leaderSharePercent",
      "lobbyType",
      "mode",
      "type",
    ]);
  });
});

async function runGame() {
  const humanInfo = new PlayerInfo(
    "human",
    PlayerType.Human,
    "human001",
    "human_id",
  );
  const game = await setup(
    "big_plains",
    {
      gameMode: GameMode.FFA,
      gameType: GameType.Public,
      disableNPCs: true,
      bots: 0,
      maxTimerValue: undefined,
    },
    [humanInfo],
  );
  const botInfo = new PlayerInfo("bot", PlayerType.Bot, null, "bot_id");
  game.addPlayer(botInfo);

  while (game.inSpawnPhase()) {
    game.executeNextTick();
  }

  // Deterministic territory: the bot leads past the win threshold, so the
  // clientless guard fires and the execution stays active for the whole run.
  const bot = game.player(botInfo.id);
  const targetTiles = Math.floor(game.numLandTiles() * 0.82);
  let conqueredTiles = 0;
  game.forEachTile((tile) => {
    if (
      conqueredTiles < targetTiles &&
      game.map().isLand(tile) &&
      !game.map().hasOwner(tile)
    ) {
      bot.conquer(tile);
      conqueredTiles++;
    }
  });

  game.addExecution(new WinCheckExecution());

  const hashes: number[] = [];
  const winConditionUpdates: WinConditionCheckUpdate[] = [];
  for (let i = 0; i < TICKS; i++) {
    const updates = game.executeNextTick();
    updates[GameUpdateType.Hash].forEach((hashUpdate: HashUpdate) => {
      hashes.push(hashUpdate.hash);
    });
    winConditionUpdates.push(...updates[GameUpdateType.WinConditionCheck]);
  }

  return { hashes, winConditionUpdates };
}
