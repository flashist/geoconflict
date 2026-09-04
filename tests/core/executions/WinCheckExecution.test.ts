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
  Team,
} from "../../../src/core/game/Game";
import {
  GameUpdateType,
  WinConditionCheckUpdate,
} from "../../../src/core/game/GameUpdates";
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
      type: jest.fn(() => PlayerType.Human),
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
      type: jest.fn(() => PlayerType.Human),
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

// Task 0208 — the win-condition check is instrumented at the decision point,
// inside the `if (thresholdMet || timerMet)` block and ABOVE the clientless
// guard, so the measurement keeps working once the guard is removed (0205/0211)
// and so a clientless leader that never gets declared is still counted.
describe("WinCheckExecution win-condition instrumentation (task 0208)", () => {
  it("reports a clientless Bot leader over the FFA threshold, and still declares nobody", async () => {
    const { winConditionUpdates, winUpdates, execution } =
      await ffaWinConditionCheck(GameType.Public, {
        type: PlayerType.Bot,
        clientID: null,
      });

    expect(winConditionUpdates).toHaveLength(1);
    expect(winConditionUpdates[0]).toEqual({
      type: GameUpdateType.WinConditionCheck,
      mode: "Ffa",
      lobbyType: "Public",
      branch: "Threshold",
      leaderKind: "Bot",
      leaderSharePercent: expect.any(Number),
      isTutorial: false,
    });
    // Behaviour is unchanged: the guard still turns the leader away.
    expect(winUpdates).toHaveLength(0);
    expect(execution.isActive()).toBe(true);
  });

  // The brief flags the Nation case as INFERRED from the shared
  // `clientID === null` guard and never observed. This is where it stops being
  // an inference.
  it("reports a clientless FakeHuman nation leader over the FFA threshold", async () => {
    const { winConditionUpdates, winUpdates, execution } =
      await ffaWinConditionCheck(GameType.Public, {
        type: PlayerType.FakeHuman,
        clientID: null,
      });

    expect(winConditionUpdates).toHaveLength(1);
    expect(winConditionUpdates[0].leaderKind).toBe("Nation");
    expect(winConditionUpdates[0].branch).toBe("Threshold");
    expect(winUpdates).toHaveLength(0);
    expect(execution.isActive()).toBe(true);
  });

  // Control: the leader kind carries its own denominator, so the human case
  // must be reported too — and its behaviour must be untouched.
  it("reports a human FFA leader and still declares the win", async () => {
    const { winConditionUpdates, winUpdates, execution } =
      await ffaWinConditionCheck(GameType.Public, {
        type: PlayerType.Human,
        clientID: "human001",
      });

    expect(winConditionUpdates).toHaveLength(1);
    expect(winConditionUpdates[0].leaderKind).toBe("Human");
    expect(winUpdates).toHaveLength(1);
    expect(execution.isActive()).toBe(false);
  });

  // ADR-110: a PlayerType.AiPlayer carries a real clientID, never enters the
  // clientless guard, and may legitimately be declared the winner. This leaf is
  // ADR-110's re-raise-trigger measurement.
  it("reports an AiPlayer leader and still declares the win", async () => {
    const { winConditionUpdates, winUpdates } = await ffaWinConditionCheck(
      GameType.Public,
      { type: PlayerType.AiPlayer, clientID: "ai001" },
    );

    expect(winConditionUpdates).toHaveLength(1);
    expect(winConditionUpdates[0].leaderKind).toBe("AiPlayer");
    expect(winUpdates).toHaveLength(1);
  });

  it("distinguishes a private lobby from a public one", async () => {
    const { winConditionUpdates } = await ffaWinConditionCheck(
      GameType.Private,
      { type: PlayerType.Bot, clientID: null },
    );

    expect(winConditionUpdates[0].lobbyType).toBe("Private");
  });

  // Singleplayer and tutorial paths are unchanged: the FFA guard's carve-out
  // still behaves as today, and the update carries the dimensions the client
  // uses to drop them from the multiplayer measurement.
  it("marks singleplayer and tutorial matches so the client can drop them", async () => {
    const solo = await ffaWinConditionCheck(GameType.Singleplayer, {
      type: PlayerType.FakeHuman,
      clientID: null,
    });
    const tutorial = await ffaWinConditionCheck(
      GameType.Singleplayer,
      { type: PlayerType.FakeHuman, clientID: null },
      true,
    );

    expect(solo.winConditionUpdates[0].lobbyType).toBe("Singleplayer");
    expect(solo.winConditionUpdates[0].isTutorial).toBe(false);
    // Unchanged behaviour: non-tutorial singleplayer still declares the winner.
    expect(solo.winUpdates).toHaveLength(1);

    expect(tutorial.winConditionUpdates[0].isTutorial).toBe(true);
    // Unchanged behaviour: a tutorial still declares nobody.
    expect(tutorial.winUpdates).toHaveLength(0);
    expect(tutorial.execution.isActive()).toBe(true);
  });

  it("reports the leader share as an integer percent", async () => {
    const { winConditionUpdates } = await ffaWinConditionCheck(
      GameType.Public,
      {
        type: PlayerType.Bot,
        clientID: null,
      },
    );

    const share = winConditionUpdates[0].leaderSharePercent;
    expect(Number.isInteger(share)).toBe(true);
    expect(share).toBeGreaterThanOrEqual(80);
    expect(share).toBeLessThanOrEqual(100);
  });

  // Hazard A. A clientless leader makes the guard return WITHOUT deactivating
  // the execution, so the check re-fires every 10 ticks for the rest of the
  // match — potentially ~10^4 times. Running a handful of ticks would pass
  // vacuously, so this runs far past the first crossing.
  it("emits exactly one update however many times the check re-fires", async () => {
    const { game, execution, winConditionUpdates } = await ffaWinConditionCheck(
      GameType.Public,
      {
        type: PlayerType.Bot,
        clientID: null,
      },
    );

    // The first crossing, from the helper's direct call.
    expect(winConditionUpdates).toHaveLength(1);

    const reCheck = jest.spyOn(execution, "checkWinnerFFA");
    game.addExecution(execution);
    let laterUpdateCount = 0;
    for (let i = 0; i < 500; i++) {
      const updates = game.executeNextTick();
      laterUpdateCount += updates[GameUpdateType.WinConditionCheck].length;
    }

    // The guard really did re-fire many times, so the assertion below is not
    // vacuous: the execution is still active and still being ticked.
    expect(execution.isActive()).toBe(true);
    expect(reCheck.mock.calls.length).toBeGreaterThan(20);
    expect(laterUpdateCount).toBe(0);
  });

  it("reports a Bot team leader over the team threshold", async () => {
    const { mg, winCheck } = await mockTeamThreshold(
      ColoredTeams.Bot,
      GameType.Public,
    );

    winCheck.checkWinnerTeam();

    const updates = (mg as any).updates[GameUpdateType.WinConditionCheck];
    expect(updates).toHaveLength(1);
    expect(updates[0].mode).toBe("Team");
    expect(updates[0].leaderKind).toBe("BotTeam");
    expect(updates[0].branch).toBe("Threshold");
    // Unchanged behaviour: a Bot team is still not declared outside singleplayer.
    expect(mg.setWinner).not.toHaveBeenCalled();
  });

  // HumansVsNations puts every clientless nation on ColoredTeams.Nations and
  // nothing else, so a leading Nations team is 100 % clientless — the very
  // population this task measures. It must not be labelled HumanTeam.
  it("reports a clientless Nations team leader as its own leaf", async () => {
    const { mg, winCheck } = await mockTeamThreshold(
      ColoredTeams.Nations,
      GameType.Public,
    );

    winCheck.checkWinnerTeam();

    const updates = (mg as any).updates[GameUpdateType.WinConditionCheck];
    expect(updates).toHaveLength(1);
    expect(updates[0].mode).toBe("Team");
    expect(updates[0].leaderKind).toBe("NationsTeam");
    expect(updates[0].branch).toBe("Threshold");
    // Unchanged behaviour: the team guard turns away ColoredTeams.Bot only, so
    // a Nations team is still declared the winner exactly as it was at HEAD.
    expect(mg.setWinner).toHaveBeenCalled();
  });

  it("reports a human team leader over the team threshold", async () => {
    const { mg, winCheck } = await mockTeamThreshold(
      ColoredTeams.Red,
      GameType.Public,
    );

    winCheck.checkWinnerTeam();

    const updates = (mg as any).updates[GameUpdateType.WinConditionCheck];
    expect(updates[0].leaderKind).toBe("HumanTeam");
    expect(mg.setWinner).toHaveBeenCalled();
  });

  // The timer branch is private-lobby-only by construction (public lobbies
  // carry no maxTimerValue), so unit tests are the only coverage it will ever
  // get. It is never pooled with the threshold branch.
  it("reports the timer branch separately in FFA", async () => {
    const mg = await setupTimerGame();
    const winCheck = new WinCheckExecution();
    winCheck.init(mg, 0);
    mockTimerExpiredFfa(mg, null);

    winCheck.checkWinnerFFA();

    const updates = (mg as any).updates[GameUpdateType.WinConditionCheck];
    expect(updates).toHaveLength(1);
    expect(updates[0]).toEqual(
      expect.objectContaining({
        mode: "Ffa",
        lobbyType: "Private",
        branch: "Timer",
        leaderKind: "Nation",
        leaderSharePercent: 10,
      }),
    );
  });

  it("reports the timer branch separately in team mode", async () => {
    const mg = await setupTimerGame();
    const winCheck = new WinCheckExecution();
    winCheck.init(mg, 0);
    mockTimerExpiredTeam(mg);

    winCheck.checkWinnerTeam();

    const updates = (mg as any).updates[GameUpdateType.WinConditionCheck];
    expect(updates).toHaveLength(1);
    expect(updates[0]).toEqual(
      expect.objectContaining({
        mode: "Team",
        lobbyType: "Private",
        branch: "Timer",
        leaderKind: "BotTeam",
      }),
    );
  });

  // A map whose every land tile carries fallout makes the share a division by
  // zero. The ordinary shape is Infinity — the leader still holds tiles — and
  // the honest report is 100: the leader holds all the land there is left.
  it("reports 100 when the leader holds every non-fallout tile of an all-fallout map", async () => {
    const { mg, winCheck } = await mockTeamThreshold(
      ColoredTeams.Red,
      GameType.Public,
    );
    mg.numTilesWithFallout = jest.fn(() => 100);

    winCheck.checkWinnerTeam();

    const updates = (mg as any).updates[GameUpdateType.WinConditionCheck];
    expect(updates).toHaveLength(1);
    expect(updates[0].leaderSharePercent).toBe(100);
  });

  // NaN — the leader holds no tiles either — has no honest value, so it stays
  // 0. Only the timer branch can reach it: NaN > threshold is false.
  it("reports 0 when the share is NaN", async () => {
    const mg = await setupTimerGame();
    const winCheck = new WinCheckExecution();
    winCheck.init(mg, 0);
    mockTimerExpiredTeam(mg);
    mg.numTilesWithFallout = jest.fn(() => 100);
    mg.players = jest.fn(() => [
      {
        numTilesOwned: jest.fn(() => 0),
        team: jest.fn(() => ColoredTeams.Bot),
      },
    ]);

    winCheck.checkWinnerTeam();

    const updates = (mg as any).updates[GameUpdateType.WinConditionCheck];
    expect(updates).toHaveLength(1);
    expect(updates[0].branch).toBe("Timer");
    expect(updates[0].leaderSharePercent).toBe(0);
  });

  it("prefers the threshold branch when both are met in the same check", async () => {
    const mg = await setupTimerGame();
    const winCheck = new WinCheckExecution();
    winCheck.init(mg, 0);
    const leader = mockTimerExpiredFfa(mg, null);
    leader.numTilesOwned.mockReturnValue(90);

    winCheck.checkWinnerFFA();

    const updates = (mg as any).updates[GameUpdateType.WinConditionCheck];
    expect(updates[0].branch).toBe("Threshold");
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
    // Task 0208 reads the leader's PlayerType for its leader-kind dimension.
    // A clientless leader here stands for a FakeHuman nation.
    type: jest.fn(() =>
      clientID === null ? PlayerType.FakeHuman : PlayerType.Human,
    ),
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

/**
 * Task 0208 helper: a real game whose leader is over the territory threshold,
 * with the leader's PlayerType chosen by the caller so every leader-kind leaf
 * of the event can be exercised. Returns the win-condition updates alongside
 * the win updates, so each case can assert the instrumentation AND that the
 * pre-existing behaviour around it is unchanged.
 */
async function ffaWinConditionCheck(
  gameType: GameType,
  leader: { type: PlayerType; clientID: string | null },
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

  let leaderId = humanInfo.id;
  if (leader.type !== PlayerType.Human) {
    const leaderInfo = new PlayerInfo(
      "leader",
      leader.type,
      leader.clientID,
      "leader_id",
    );
    game.addPlayer(leaderInfo);
    leaderId = leaderInfo.id;
  }

  while (game.inSpawnPhase()) {
    game.executeNextTick();
  }

  const leaderPlayer = game.player(leaderId);
  const targetTiles = Math.floor(game.numLandTiles() * 0.82);
  let conqueredTiles = 0;
  game.forEachTile((tile) => {
    if (
      conqueredTiles < targetTiles &&
      game.map().isLand(tile) &&
      !game.map().hasOwner(tile)
    ) {
      leaderPlayer.conquer(tile);
      conqueredTiles++;
    }
  });

  const execution = new WinCheckExecution();
  execution.init(game, game.ticks());
  execution.checkWinnerFFA();

  return {
    game,
    execution,
    winUpdates: (game as any).updates[GameUpdateType.Win],
    winConditionUpdates: (game as any).updates[
      GameUpdateType.WinConditionCheck
    ] as WinConditionCheckUpdate[],
  };
}

/** Task 0208 helper: a real game to hold the updates map, for the mocked cases. */
async function setupTimerGame() {
  const mg: any = await setup("big_plains", {
    gameMode: GameMode.FFA,
    maxTimerValue: 5,
  });
  mg.setWinner = jest.fn();
  return mg;
}

/**
 * Task 0208 helper: mock a team game whose leading team is over the territory
 * threshold with the timer unset, so only the threshold branch can fire.
 */
async function mockTeamThreshold(team: Team, gameType: GameType) {
  const mg = await setupTimerGame();
  const teamPlayer = {
    numTilesOwned: jest.fn(() => 81),
    team: jest.fn(() => team),
  };
  mg.players = jest.fn(() => [teamPlayer]);
  mg.numLandTiles = jest.fn(() => 100);
  mg.numTilesWithFallout = jest.fn(() => 0);
  mg.stats = jest.fn(() => ({ stats: () => ({ mocked: true }) }));
  mg.config = jest.fn(() => ({
    gameConfig: jest.fn(() => ({
      gameMode: GameMode.Team,
      gameType,
    })),
    percentageTilesOwnedToWin: jest.fn(() => 80),
    numSpawnPhaseTurns: jest.fn(() => 0),
  }));

  const winCheck = new WinCheckExecution();
  winCheck.init(mg, 0);
  return { mg, winCheck };
}

/**
 * Task 0208 helper: mock a team game whose timer has expired but whose leading
 * team is far below the territory threshold, so only the timer branch can fire.
 */
function mockTimerExpiredTeam(mg: any) {
  const botTeamPlayer = {
    numTilesOwned: jest.fn(() => 10),
    team: jest.fn(() => ColoredTeams.Bot),
  };
  mg.players = jest.fn(() => [botTeamPlayer]);
  mg.numLandTiles = jest.fn(() => 100);
  mg.numTilesWithFallout = jest.fn(() => 0);
  mg.stats = jest.fn(() => ({ stats: () => ({ mocked: true }) }));
  mg.ticks = jest.fn(() => 100000);
  mg.config = jest.fn(() => ({
    gameConfig: jest.fn(() => ({
      gameMode: GameMode.Team,
      gameType: GameType.Private,
      maxTimerValue: 1,
    })),
    percentageTilesOwnedToWin: jest.fn(() => 80),
    numSpawnPhaseTurns: jest.fn(() => 0),
  }));
  return botTeamPlayer;
}

async function clientlessFfaWinUpdates(gameType: GameType, isTutorial = false) {
  return ffaWinUpdates(gameType, isTutorial, true);
}

async function humanFfaWinUpdates(gameType: GameType, isTutorial = false) {
  return ffaWinUpdates(gameType, isTutorial, false);
}
