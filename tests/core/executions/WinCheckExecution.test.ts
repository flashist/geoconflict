jest.mock("jose", () => ({
  base64url: {
    decode: jest.fn(),
  },
}));

import { WinCheckExecution } from "../../../src/core/execution/WinCheckExecution";
import { PartialGameRecordSchema, Winner } from "../../../src/core/Schemas";
import { createPartialGameRecord } from "../../../src/core/Util";
import {
  ColoredTeams,
  GameMode,
  GameType,
  PlayerInfo,
  PlayerType,
} from "../../../src/core/game/Game";
import { GameUpdateType } from "../../../src/core/game/GameUpdates";
import { setup } from "../../util/Setup";

describe("WinCheckExecution", () => {
  let mg: any;
  let winCheck: WinCheckExecution;

  beforeEach(async () => {
    mg = await setup("big_plains", {
      infiniteGold: true,
      gameMode: GameMode.FFA,
      maxTimerValue: 5,
      instantBuild: true,
    });
    mg.setWinner = jest.fn();
    winCheck = new WinCheckExecution();
    winCheck.init(mg, 0);
  });

  it("should call checkWinnerFFA in FFA mode", () => {
    const spy = jest.spyOn(winCheck as any, "checkWinnerFFA");
    winCheck.tick(10);
    expect(spy).toHaveBeenCalled();
  });

  it("should call checkWinnerTeam in non-FFA mode", () => {
    mg.config = jest.fn(() => ({
      gameConfig: jest.fn(() => ({
        maxTimerValue: 5,
        gameMode: GameMode.Team,
      })),
      percentageTilesOwnedToWin: jest.fn(() => 50),
    }));
    winCheck.init(mg, 0);
    const spy = jest.spyOn(winCheck as any, "checkWinnerTeam");
    winCheck.tick(10);
    expect(spy).toHaveBeenCalled();
  });

  it("should set winner in FFA if percentage is reached", () => {
    const player = {
      numTilesOwned: jest.fn(() => 81),
      name: jest.fn(() => "P1"),
    };
    mg.players = jest.fn(() => [player]);
    mg.numLandTiles = jest.fn(() => 100);
    mg.numTilesWithFallout = jest.fn(() => 0);
    winCheck.checkWinnerFFA();
    expect(mg.setWinner).toHaveBeenCalledWith(player, expect.anything());
  });

  it("should set winner in FFA if timer is 0", () => {
    const player = {
      numTilesOwned: jest.fn(() => 10),
      name: jest.fn(() => "P1"),
    };
    mg.players = jest.fn(() => [player]);
    mg.numLandTiles = jest.fn(() => 100);
    mg.numTilesWithFallout = jest.fn(() => 0);
    mg.stats = jest.fn(() => ({ stats: () => ({ mocked: true }) }));
    // Advance ticks until timeElapsed (in seconds) >= maxTimerValue * 60
    // timeElapsed = (ticks - numSpawnPhaseTurns) / 10  =>
    // ticks >= numSpawnPhaseTurns + maxTimerValue * 600
    const threshold =
      mg.config().numSpawnPhaseTurns() +
      (mg.config().gameConfig().maxTimerValue ?? 0) * 600;
    while (mg.ticks() < threshold) {
      mg.executeNextTick();
    }
    winCheck.checkWinnerFFA();
    expect(mg.setWinner).toHaveBeenCalledWith(player, expect.any(Object));
  });

  it("should not set winner if no players", () => {
    mg.players = jest.fn(() => []);
    winCheck.checkWinnerFFA();
    expect(mg.setWinner).not.toHaveBeenCalled();
  });

  it("sets a Bot team winner in singleplayer so the client can show a solo loss", () => {
    const botTeamPlayer = {
      numTilesOwned: jest.fn(() => 81),
      team: jest.fn(() => ColoredTeams.Bot),
    };
    mg.players = jest.fn(() => [botTeamPlayer]);
    mg.numLandTiles = jest.fn(() => 100);
    mg.numTilesWithFallout = jest.fn(() => 0);
    mg.stats = jest.fn(() => ({ stats: () => ({ mocked: true }) }));
    mg.config = jest.fn(() => ({
      gameConfig: jest.fn(() => ({
        gameMode: GameMode.Team,
        gameType: GameType.Singleplayer,
      })),
      percentageTilesOwnedToWin: jest.fn(() => 80),
      numSpawnPhaseTurns: jest.fn(() => 0),
    }));

    winCheck.checkWinnerTeam();

    expect(mg.setWinner).toHaveBeenCalledWith(
      ColoredTeams.Bot,
      expect.anything(),
    );
  });

  it("keeps Bot team wins ignored outside singleplayer", () => {
    const botTeamPlayer = {
      numTilesOwned: jest.fn(() => 81),
      team: jest.fn(() => ColoredTeams.Bot),
    };
    mg.players = jest.fn(() => [botTeamPlayer]);
    mg.numLandTiles = jest.fn(() => 100);
    mg.numTilesWithFallout = jest.fn(() => 0);
    mg.config = jest.fn(() => ({
      gameConfig: jest.fn(() => ({
        gameMode: GameMode.Team,
        gameType: GameType.Public,
      })),
      percentageTilesOwnedToWin: jest.fn(() => 80),
      numSpawnPhaseTurns: jest.fn(() => 0),
    }));

    winCheck.checkWinnerTeam();

    expect(mg.setWinner).not.toHaveBeenCalled();
  });

  it("emits an explicit opponent winner for a clientless FFA nation that reaches the threshold", async () => {
    const { game, winUpdates } = await clientlessFfaWinUpdates(
      GameType.Singleplayer,
    );

    expect(winUpdates).toHaveLength(1);
    expect(winUpdates[0].winner).toEqual(["opponent", "winner_fakehuman"]);

    const record = createPartialGameRecord(
      "game0001",
      game.config().gameConfig(),
      [],
      [],
      0,
      1000,
      winUpdates[0].winner as Winner,
    );
    const result = PartialGameRecordSchema.safeParse(record);
    expect(result.success).toBe(true);
    expect(result.data?.info.winner).toEqual(["opponent", "winner_fakehuman"]);
  });

  it("keeps public FFA clientless winners on the pre-existing undefined winner path", async () => {
    const { winUpdates } = await clientlessFfaWinUpdates(GameType.Public);

    expect(winUpdates).toHaveLength(1);
    expect(winUpdates[0].winner).toBeUndefined();
  });

  it("does not emit an explicit opponent winner for tutorial clientless winners", async () => {
    const { winUpdates } = await clientlessFfaWinUpdates(
      GameType.Singleplayer,
      true,
    );

    expect(winUpdates).toHaveLength(1);
    expect(winUpdates[0].winner).toBeUndefined();
  });

  it("should return false for activeDuringSpawnPhase", () => {
    expect(winCheck.activeDuringSpawnPhase()).toBe(false);
  });
});

async function clientlessFfaWinUpdates(
  gameType: GameType,
  isTutorial = false,
) {
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
      gameType,
      isTutorial,
      maxTimerValue: undefined,
    },
    [humanInfo],
  );
  const fakeHumanInfo = new PlayerInfo(
    "winner_fakehuman",
    PlayerType.FakeHuman,
    null,
    "fake_id",
  );
  game.addPlayer(fakeHumanInfo);

  while (game.inSpawnPhase()) {
    game.executeNextTick();
  }

  const fakeHuman = game.player(fakeHumanInfo.id);
  const targetTiles = Math.floor(game.numLandTiles() * 0.82);
  let conqueredTiles = 0;
  game.forEachTile((tile) => {
    if (
      conqueredTiles < targetTiles &&
      game.map().isLand(tile) &&
      !game.map().hasOwner(tile)
    ) {
      fakeHuman.conquer(tile);
      conqueredTiles++;
    }
  });

  const execution = new WinCheckExecution();
  execution.init(game, game.ticks());
  execution.checkWinnerFFA();

  return {
    game,
    winUpdates: (game as any).updates[GameUpdateType.Win],
  };
}
