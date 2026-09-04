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
      clientID: jest.fn(() => "client1"),
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
      clientID: jest.fn(() => "client1"),
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

  // Task 0022 — risk 1. A clientless leader (Bot *or* FakeHuman nation) used to
  // be declared the winner, which made GameImpl.makeWinner() return undefined
  // and permanently deactivated the win check. The timer branch is the likelier
  // live trigger (private lobbies set maxTimerValue), so it gets its own case.
  it("does not declare a clientless FFA leader on the timer branch and keeps the check alive", () => {
    mockTimerExpiredFfa(mg, null);

    winCheck.checkWinnerFFA();

    expect(mg.setWinner).not.toHaveBeenCalled();
    expect(winCheck.isActive()).toBe(true);
  });

  // Control for the case above: identical situation, human leader. Proves the
  // timer branch really does fire here, so the absence assertion is not vacuous.
  it("still declares a human FFA leader on the timer branch", () => {
    const leader = mockTimerExpiredFfa(mg, "client1");

    winCheck.checkWinnerFFA();

    expect(mg.setWinner).toHaveBeenCalledWith(leader, expect.anything());
    expect(winCheck.isActive()).toBe(false);
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

  // Task 0022 — risk 1, territory branch. This case previously asserted the
  // opposite ("keeps public FFA clientless winners on the pre-existing
  // undefined winner path"): a Win update carrying winner === undefined, which
  // the client silently discards and which costs the whole match its XP credit.
  // Now no Win update is emitted at all and the check stays active.
  it("emits no win update for a public FFA clientless winner and keeps the check alive", async () => {
    const { winUpdates, execution } = await clientlessFfaWinUpdates(
      GameType.Public,
    );

    expect(winUpdates).toHaveLength(0);
    expect(execution.isActive()).toBe(true);
  });

  it("emits no win update for a private FFA clientless winner and keeps the check alive", async () => {
    const { winUpdates, execution } = await clientlessFfaWinUpdates(
      GameType.Private,
    );

    expect(winUpdates).toHaveLength(0);
    expect(execution.isActive()).toBe(true);
  });

  // Control for the two cases above: same real-game setup, but the leader is
  // the human. Proves the threshold really is crossed, so the absence
  // assertions above are not vacuous.
  it("still declares a human public FFA winner over the threshold", async () => {
    const { winUpdates, execution, humanClientId } = await humanFfaWinUpdates(
      GameType.Public,
    );

    expect(winUpdates).toHaveLength(1);
    expect(winUpdates[0].winner).toEqual(["player", humanClientId]);
    expect(execution.isActive()).toBe(false);
  });

  // Behaviour change called out for review: the guard mirrors
  // GameImpl.makeWinner()'s condition, which excludes tutorials. Previously a
  // tutorial emitted a Win update with winner === undefined and killed its own
  // win check; now it emits nothing and the check stays alive.
  it("does not emit an explicit opponent winner for tutorial clientless winners", async () => {
    const { winUpdates, execution } = await clientlessFfaWinUpdates(
      GameType.Singleplayer,
      true,
    );

    expect(winUpdates).toHaveLength(0);
    expect(execution.isActive()).toBe(true);
  });

  it("should return false for activeDuringSpawnPhase", () => {
    expect(winCheck.activeDuringSpawnPhase()).toBe(false);
  });
});

/**
 * Task 0022 helper: mock an FFA game whose timer has expired but whose leader
 * is far below the territory threshold, so only the timer branch can fire.
 * Pass a clientID of null for a Bot / FakeHuman leader.
 */
function mockTimerExpiredFfa(mg: any, clientID: string | null) {
  const leader = {
    numTilesOwned: jest.fn(() => 10),
    name: jest.fn(() => "leader"),
    clientID: jest.fn(() => clientID),
  };
  mg.players = jest.fn(() => [leader]);
  mg.numLandTiles = jest.fn(() => 100);
  mg.numTilesWithFallout = jest.fn(() => 0);
  mg.stats = jest.fn(() => ({ stats: () => ({ mocked: true }) }));
  mg.ticks = jest.fn(() => 100000);
  mg.config = jest.fn(() => ({
    gameConfig: jest.fn(() => ({
      gameMode: GameMode.FFA,
      gameType: GameType.Private,
      maxTimerValue: 1,
    })),
    percentageTilesOwnedToWin: jest.fn(() => 80),
    numSpawnPhaseTurns: jest.fn(() => 0),
  }));
  return leader;
}

async function ffaWinUpdates(
  gameType: GameType,
  isTutorial: boolean,
  winnerIsClientless: boolean,
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

  const winner = winnerIsClientless
    ? game.player(fakeHumanInfo.id)
    : game.player(humanInfo.id);
  const targetTiles = Math.floor(game.numLandTiles() * 0.82);
  let conqueredTiles = 0;
  game.forEachTile((tile) => {
    if (
      conqueredTiles < targetTiles &&
      game.map().isLand(tile) &&
      !game.map().hasOwner(tile)
    ) {
      winner.conquer(tile);
      conqueredTiles++;
    }
  });

  const execution = new WinCheckExecution();
  execution.init(game, game.ticks());
  execution.checkWinnerFFA();

  return {
    game,
    execution,
    humanClientId: humanInfo.clientID,
    winUpdates: (game as any).updates[GameUpdateType.Win],
  };
}

async function clientlessFfaWinUpdates(gameType: GameType, isTutorial = false) {
  return ffaWinUpdates(gameType, isTutorial, true);
}

async function humanFfaWinUpdates(gameType: GameType, isTutorial = false) {
  return ffaWinUpdates(gameType, isTutorial, false);
}
