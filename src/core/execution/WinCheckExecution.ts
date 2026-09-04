import { GameEvent } from "../EventBus";
import {
  ColoredTeams,
  Execution,
  Game,
  GameMode,
  GameType,
  Player,
  PlayerType,
  Team,
} from "../game/Game";
import {
  GameUpdateType,
  WinConditionBranch,
  WinConditionLeaderKind,
  WinConditionLobbyType,
  WinConditionMode,
} from "../game/GameUpdates";

export class WinEvent implements GameEvent {
  constructor(public readonly winner: Player) {}
}

// Task 0208. The leader kinds an FFA leader can have. Bot and FakeHuman are the
// two clientless kinds the guard below turns away; AiPlayer carries a real
// clientID and may legitimately win (ADR-110).
const FFA_LEADER_KIND: Record<PlayerType, WinConditionLeaderKind> = {
  [PlayerType.Bot]: "Bot",
  [PlayerType.FakeHuman]: "Nation",
  [PlayerType.AiPlayer]: "AiPlayer",
  [PlayerType.Human]: "Human",
};

// Task 0208. The leader kinds a team leader can have. ColoredTeams.Nations is
// its own leaf, not HumanTeam: the HumansVsNations mode puts every clientless
// FakeHuman nation on that team (GameImpl.addPlayers) and nothing else, so a
// Nations win is the clientless case this task measures. That mode is live in
// the public rotation (MapPlaylist.ts, with NPCs deliberately enabled) and
// host-selectable in private lobbies. Every other team configuration mixes
// nations into the coloured teams via assignTeams, where HumanTeam is fair.
function teamLeaderKind(team: Team): WinConditionLeaderKind {
  if (team === ColoredTeams.Bot) {
    return "BotTeam";
  }
  if (team === ColoredTeams.Nations) {
    return "NationsTeam";
  }
  return "HumanTeam";
}

/**
 * Task 0208. The reported integer share, with the divide-by-zero cases pinned.
 *
 * A map whose every land tile carries fallout makes numTilesWithoutFallout 0.
 * The ordinary shape of that is Infinity — the leader still holds tiles — and
 * the honest report is 100, not 0: the leader holds all the land there is left.
 * NaN (the leader holds no tiles either) has no honest value, so it reports 0.
 * Both are very hard to reach: fallout is only ever set on land, so the
 * denominator can never go negative.
 */
function reportedSharePercent(leaderSharePercent: number): number {
  if (Number.isFinite(leaderSharePercent)) {
    return Math.round(leaderSharePercent);
  }
  return leaderSharePercent === Infinity ? 100 : 0;
}

const WIN_CONDITION_LOBBY_TYPE: Record<GameType, WinConditionLobbyType> = {
  [GameType.Public]: "Public",
  [GameType.Private]: "Private",
  [GameType.Singleplayer]: "Singleplayer",
};

export class WinCheckExecution implements Execution {
  private active = true;

  // Task 0208, hazard A. The win condition is re-tested every 10 ticks and a
  // clientless leader makes the guard below return without deactivating the
  // execution, so an unlatched emission would produce ~10^4 events per stalled
  // match. Execution-private bookkeeping like this never enters the state hash
  // (GameImpl.hash() sums PlayerImpl.hash() over the players and nothing else),
  // exactly like `active` and `mg` above.
  private reportedWinCondition = false;

  private mg: Game | null = null;

  constructor() {}

  init(mg: Game, ticks: number) {
    this.mg = mg;
  }

  tick(ticks: number) {
    if (ticks % 10 !== 0) {
      return;
    }
    if (this.mg === null) throw new Error("Not initialized");

    if (this.mg.config().gameConfig().gameMode === GameMode.FFA) {
      this.checkWinnerFFA();
    } else {
      this.checkWinnerTeam();
    }
  }

  checkWinnerFFA(): void {
    if (this.mg === null) throw new Error("Not initialized");
    const sorted = this.mg
      .players()
      .sort((a, b) => b.numTilesOwned() - a.numTilesOwned());
    if (sorted.length === 0) {
      return;
    }
    const max = sorted[0];
    const timeElapsed =
      (this.mg.ticks() - this.mg.config().numSpawnPhaseTurns()) / 10;
    const numTilesWithoutFallout =
      this.mg.numLandTiles() - this.mg.numTilesWithFallout();
    const leaderSharePercent =
      (max.numTilesOwned() / numTilesWithoutFallout) * 100;
    const thresholdMet =
      leaderSharePercent > this.mg.config().percentageTilesOwnedToWin();
    const timerMet =
      this.mg.config().gameConfig().maxTimerValue !== undefined &&
      timeElapsed - this.mg.config().gameConfig().maxTimerValue! * 60 >= 0;
    if (thresholdMet || timerMet) {
      // Task 0208: instrument here, at the decision point, *above* the guard —
      // not at the guard's early return. See reportWinConditionCheck().
      this.reportWinConditionCheck(
        "Ffa",
        thresholdMet,
        FFA_LEADER_KIND[max.type()],
        leaderSharePercent,
      );

      // FFA and Team share one policy: a clientless leader (a Bot *or* a
      // FakeHuman nation) is never declared the winner outside a non-tutorial
      // singleplayer game. Mirrors GameImpl.makeWinner()'s condition, which
      // would otherwise return an undefined winner and silently end nothing.
      // Returning *before* `this.active = false` keeps the check alive so a
      // human can still win the match later. See task 0022.

      // Note the guard is about being *clientless*, not about being AI: a
      // PlayerType.AiPlayer carries a real clientID, so it never enters this
      // branch and may legitimately be declared the winner (ADR-110).
      if (max.clientID() === null) {
        const gameConfig = this.mg.config().gameConfig();
        if (
          gameConfig.gameType !== GameType.Singleplayer ||
          gameConfig.isTutorial === true
        ) {
          return;
        }
      }
      this.mg.setWinner(max, this.mg.stats().stats());
      console.log(`${max.name()} has won the game`);
      this.active = false;
    }
  }

  checkWinnerTeam(): void {
    if (this.mg === null) throw new Error("Not initialized");
    const teamToTiles = new Map<Team, number>();
    for (const player of this.mg.players()) {
      const team = player.team();
      // Sanity check, team should not be null here
      if (team === null) continue;
      teamToTiles.set(
        team,
        (teamToTiles.get(team) ?? 0) + player.numTilesOwned(),
      );
    }
    const sorted = Array.from(teamToTiles.entries()).sort(
      (a, b) => b[1] - a[1],
    );
    if (sorted.length === 0) {
      return;
    }
    const max = sorted[0];
    const timeElapsed =
      (this.mg.ticks() - this.mg.config().numSpawnPhaseTurns()) / 10;
    const numTilesWithoutFallout =
      this.mg.numLandTiles() - this.mg.numTilesWithFallout();
    const percentage = (max[1] / numTilesWithoutFallout) * 100;
    const thresholdMet =
      percentage > this.mg.config().percentageTilesOwnedToWin();
    const timerMet =
      this.mg.config().gameConfig().maxTimerValue !== undefined &&
      timeElapsed - this.mg.config().gameConfig().maxTimerValue! * 60 >= 0;
    if (thresholdMet || timerMet) {
      // Task 0208: instrument here, at the decision point, *above* the guard.
      this.reportWinConditionCheck(
        "Team",
        thresholdMet,
        teamLeaderKind(max[0]),
        percentage,
      );

      if (
        max[0] === ColoredTeams.Bot &&
        this.mg.config().gameConfig().gameType !== GameType.Singleplayer
      ) {
        return;
      }
      this.mg.setWinner(max[0], this.mg.stats().stats());
      console.log(`${max[0]} has won the game`);
      this.active = false;
    }
  }

  /**
   * Task 0208. Records that the win condition was met, whoever the leader is.
   *
   * Called from inside the `if (thresholdMet || timerMet)` block and *above*
   * the clientless-leader guard, deliberately: instrumenting the guard's early
   * return instead would make the metric read zero the day the guard is removed
   * (tasks 0205 / 0211) while still drawing a healthy line on a dashboard.
   * Above the guard, the number simply changes meaning — from "how often we
   * stall" to "how often the fallback award fires" — and keeps working.
   *
   * ⚠️ The payload is derived purely from game state and config and carries NO
   * clientID and no per-client data. That, and only that, is why every client
   * simulating the same match composes the same event. This property is secured
   * BY DESIGN, NOT BY TEST: the tests run a single game instance, so a future
   * edit that makes this payload client-dependent would NOT be caught by them.
   * Keep it client-free.
   */
  private reportWinConditionCheck(
    mode: WinConditionMode,
    thresholdMet: boolean,
    leaderKind: WinConditionLeaderKind,
    leaderSharePercent: number,
  ): void {
    if (this.mg === null) throw new Error("Not initialized");
    if (this.reportedWinCondition) {
      return;
    }
    this.reportedWinCondition = true;

    const gameConfig = this.mg.config().gameConfig();
    // Threshold wins when both branches are met in the same check. The two are
    // never merged: public lobbies carry no timer, so a Timer sample is
    // private-lobby-only by construction and pooling them would produce a
    // meaningless denominator.
    const branch: WinConditionBranch = thresholdMet ? "Threshold" : "Timer";
    this.mg.addUpdate({
      type: GameUpdateType.WinConditionCheck,
      mode,
      lobbyType: WIN_CONDITION_LOBBY_TYPE[gameConfig.gameType],
      branch,
      leaderKind,
      leaderSharePercent: reportedSharePercent(leaderSharePercent),
      isTutorial: gameConfig.isTutorial === true,
    });
  }

  isActive(): boolean {
    return this.active;
  }

  activeDuringSpawnPhase(): boolean {
    return false;
  }
}
