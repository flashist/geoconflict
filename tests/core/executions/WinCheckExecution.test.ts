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

  // Task 0206 (T2) — timer branch. A clientless leader no longer stalls the
  // match when a clientful player is still alive: the win is awarded to the
  // top-ranked clientful player instead, so the match ends and its XP credits.
  it("awards a timer expiry with a clientless leader to the top clientful player", () => {
    const human = mockFfaPlayer({
      clientID: "client2",
      numTilesOwned: 5,
      smallID: 1,
      name: "human",
    });
    mockTimerExpiredFfa(mg, null, [human]);

    winCheck.checkWinnerFFA();

    expect(mg.setWinner).toHaveBeenCalledWith(human, expect.anything());
    expect(winCheck.isActive()).toBe(false);
  });

  // Task 0206 (T3, threshold half) — the fallback must never manufacture a
  // winner out of nothing. Every alive player is clientless, so nothing is
  // awarded and the check stays alive, exactly as before 0206. (The timer half
  // of T3 is the pre-existing clientless-leader timer test above, unchanged.)
  it("awards nothing on the threshold branch when no clientful player is alive", () => {
    const bot = mockFfaPlayer({
      clientID: null,
      numTilesOwned: 81,
      smallID: 0,
      name: "bot",
    });
    const nation = mockFfaPlayer({
      clientID: null,
      numTilesOwned: 5,
      smallID: 1,
      name: "nation",
    });
    mockThresholdReachedFfa(mg, [bot, nation]);

    winCheck.checkWinnerFFA();

    expect(mg.setWinner).not.toHaveBeenCalled();
    expect(winCheck.isActive()).toBe(true);
  });

  // Task 0206 (T6) — ADR-110: the predicate is clientID() !== null with NO
  // PlayerType.AiPlayer exclusion, so an AI player is an eligible fallback
  // winner. Asserted explicitly so nobody "tightens" the predicate later.
  it("awards the fallback win to an AI player, which is not excluded", () => {
    const nationLeader = mockFfaPlayer({
      clientID: null,
      numTilesOwned: 81,
      smallID: 0,
      name: "nation",
      type: PlayerType.FakeHuman,
    });
    const aiPlayer = mockFfaPlayer({
      clientID: "ai-client",
      numTilesOwned: 7,
      smallID: 1,
      name: "ai",
      type: PlayerType.AiPlayer,
    });
    mockThresholdReachedFfa(mg, [nationLeader, aiPlayer]);

    winCheck.checkWinnerFFA();

    expect(aiPlayer.type()).toBe(PlayerType.AiPlayer);
    expect(mg.setWinner).toHaveBeenCalledWith(aiPlayer, expect.anything());
    expect(winCheck.isActive()).toBe(false);
  });

  // Task 0206 (T7) — the tie-break must be deterministic, or clients disagree
  // on the winner and the game desyncs. Listed highest-smallID-first so only
  // the explicit tie-break, not array order, can produce the expected result.
  it("breaks a fallback tie on the lowest smallID", () => {
    const nationLeader = mockFfaPlayer({
      clientID: null,
      numTilesOwned: 81,
      smallID: 0,
      name: "nation",
    });
    const higherSmallId = mockFfaPlayer({
      clientID: "client-high",
      numTilesOwned: 6,
      smallID: 5,
      name: "high",
    });
    const lowerSmallId = mockFfaPlayer({
      clientID: "client-low",
      numTilesOwned: 6,
      smallID: 2,
      name: "low",
    });
    mockThresholdReachedFfa(mg, [nationLeader, higherSmallId, lowerSmallId]);

    winCheck.checkWinnerFFA();

    expect(mg.setWinner).toHaveBeenCalledWith(lowerSmallId, expect.anything());
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

  // Task 0206 (T1) — territory branch, the one that actually fires in public
  // FFA. These two cases previously asserted the 0022 stall (no Win update at
  // all, check kept alive), which cost the whole match its XP credit. The
  // clientless leader is still never the winner; the top clientful player is
  // awarded instead, so a Win update IS emitted and the match ends.
  it("awards a public FFA clientless-leader threshold win to the top clientful player", async () => {
    const { winUpdates, execution, humanClientId } =
      await clientlessFfaWinUpdates(GameType.Public);

    expect(winUpdates).toHaveLength(1);
    expect(winUpdates[0].winner).toEqual(["player", humanClientId]);
    expect(execution.isActive()).toBe(false);
  });

  it("awards a private FFA clientless-leader threshold win to the top clientful player", async () => {
    const { winUpdates, execution, humanClientId } =
      await clientlessFfaWinUpdates(GameType.Private);

    expect(winUpdates).toHaveLength(1);
    expect(winUpdates[0].winner).toEqual(["player", humanClientId]);
    expect(execution.isActive()).toBe(false);
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
  //
  // Task 0206 (T4) keeps this case exactly as it is — the 0206 fallback is
  // gated on gameType !== Singleplayer precisely so a tutorial still emits
  // nothing. Awarding the tutorial's single Human the win for LOSING to a bot
  // would hand them first-place platform-leaderboard points via
  // ClientGameRunner.reportPlacements(), which is the bug 0022 fixed. The
  // second assertion below is added only to make that intent legible.
  it("does not emit an explicit opponent winner for tutorial clientless winners", async () => {
    const { winUpdates, execution, humanClientId } =
      await clientlessFfaWinUpdates(GameType.Singleplayer, true);

    expect(winUpdates).toHaveLength(0);
    expect(execution.isActive()).toBe(true);
    expect(
      winUpdates.some(
        (update: any) =>
          update.winner?.[0] === "player" &&
          update.winner?.[1] === humanClientId,
      ),
    ).toBe(false);
  });

  it("should return false for activeDuringSpawnPhase", () => {
    expect(winCheck.activeDuringSpawnPhase()).toBe(false);
  });
});

/** Task 0206 helper: one mocked FFA player, for the mock-based cases below. */
function mockFfaPlayer(player: {
  clientID: string | null;
  numTilesOwned: number;
  smallID: number;
  name: string;
  type?: PlayerType;
}) {
  return {
    numTilesOwned: jest.fn(() => player.numTilesOwned),
    name: jest.fn(() => player.name),
    clientID: jest.fn(() => player.clientID),
    smallID: jest.fn(() => player.smallID),
    type: jest.fn(() => player.type ?? PlayerType.Human),
  };
}

/**
 * Task 0022 helper: mock an FFA game whose timer has expired but whose leader
 * is far below the territory threshold, so only the timer branch can fire.
 * Pass a clientID of null for a Bot / FakeHuman leader. Task 0206 added
 * `others` — further players ranked below the leader.
 */
function mockTimerExpiredFfa(
  mg: any,
  clientID: string | null,
  others: ReturnType<typeof mockFfaPlayer>[] = [],
) {
  const leader = {
    numTilesOwned: jest.fn(() => 10),
    name: jest.fn(() => "leader"),
    clientID: jest.fn(() => clientID),
    smallID: jest.fn(() => 0),
  };
  mg.players = jest.fn(() => [leader, ...others]);
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

/**
 * Task 0206 helper: mock a public FFA game with no timer, where the first
 * player given is over the 80 % territory threshold — so only the threshold
 * branch can fire.
 */
function mockThresholdReachedFfa(
  mg: any,
  players: ReturnType<typeof mockFfaPlayer>[],
) {
  mg.players = jest.fn(() => players);
  mg.numLandTiles = jest.fn(() => 100);
  mg.numTilesWithFallout = jest.fn(() => 0);
  mg.stats = jest.fn(() => ({ stats: () => ({ mocked: true }) }));
  mg.ticks = jest.fn(() => 1000);
  mg.config = jest.fn(() => ({
    gameConfig: jest.fn(() => ({
      gameMode: GameMode.FFA,
      gameType: GameType.Public,
      maxTimerValue: undefined,
    })),
    percentageTilesOwnedToWin: jest.fn(() => 80),
    numSpawnPhaseTurns: jest.fn(() => 0),
  }));
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
  const runnerUp = winnerIsClientless
    ? game.player(humanInfo.id)
    : game.player(fakeHumanInfo.id);
  const targetTiles = Math.floor(game.numLandTiles() * 0.82);
  // Task 0206: the runner-up must own land too. players() filters on isAlive(),
  // so a landless runner-up is not even a candidate and the clientless-leader
  // cases would pass vacuously.
  const runnerUpTiles = 10;
  let conqueredTiles = 0;
  game.forEachTile((tile) => {
    if (!game.map().isLand(tile) || game.map().hasOwner(tile)) {
      return;
    }
    if (conqueredTiles < runnerUpTiles) {
      runnerUp.conquer(tile);
      conqueredTiles++;
    } else if (conqueredTiles < runnerUpTiles + targetTiles) {
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
