import { GameEvent } from "../EventBus";
import {
  ColoredTeams,
  Execution,
  Game,
  GameMode,
  Player,
  Team,
} from "../game/Game";

export class WinEvent implements GameEvent {
  constructor(public readonly winner: Player) {}
}

export class WinCheckExecution implements Execution {
  private active = true;

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
    const timerExpired =
      this.mg.config().gameConfig().maxTimerValue !== undefined &&
      timeElapsed - this.mg.config().gameConfig().maxTimerValue! * 60 >= 0;
    const tileThresholdMet =
      (max.numTilesOwned() / numTilesWithoutFallout) * 100 >
      this.mg.config().percentageTilesOwnedToWin();
    if (tileThresholdMet || timerExpired) {
      this.mg.setWinner(max, this.mg.stats().stats(), timerExpired ? "timer" : "tile_percentage");
      this.active = false;
      return;
    }

    // Last-standing: if only one player who has taken meaningful action
    // (hasActed === true) remains, declare them the winner. This prevents ghost
    // bots — spawned but never acted — from holding spawn tiles and blocking the
    // tile% threshold from being reached.
    // Note: intentionally uses hasActed rather than type() !== Bot, so an AFK
    // human who joined but never moved also doesn't block or claim the win.
    // mg.players() returns only alive players, so the numTilesOwned() > 0 guard
    // is not needed here.
    const meaningfulPlayers = sorted.filter((p) => p.hasActed());
    // meaningfulPlayers.length === 0 means all remaining alive players are ghosts.
    // No winner is declared this tick; the timer win condition is the only escape
    // hatch. If maxTimerValue is undefined, such a game could run indefinitely —
    // acceptable since singleplayer missions always have a timer configured.
    if (meaningfulPlayers.length === 1) {
      this.mg.setWinner(
        meaningfulPlayers[0],
        this.mg.stats().stats(),
        "last_standing",
      );
      console.log(`${meaningfulPlayers[0].name()} has won the game`);
      this.active = false;
      return;
    }
  }

  // Note: last_standing is not implemented for team mode. Ghost bots in team
  // games aggregate into teamToTiles by team, so a team of ghost bots holding
  // spawn tiles could in theory delay detection — but team mode always has
  // real players per team, making this a non-issue in practice today.
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
    const timerExpired =
      this.mg.config().gameConfig().maxTimerValue !== undefined &&
      timeElapsed - this.mg.config().gameConfig().maxTimerValue! * 60 >= 0;
    const tileThresholdMet =
      percentage > this.mg.config().percentageTilesOwnedToWin();
    if (tileThresholdMet || timerExpired) {
      if (max[0] === ColoredTeams.Bot) return;
      this.mg.setWinner(max[0], this.mg.stats().stats(), timerExpired ? "timer" : "tile_percentage");
      this.active = false;
    }
  }

  isActive(): boolean {
    return this.active;
  }

  activeDuringSpawnPhase(): boolean {
    return false;
  }
}
