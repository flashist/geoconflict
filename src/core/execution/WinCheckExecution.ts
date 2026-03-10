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
      console.log(`${max.name()} has won the game`);
      this.active = false;
      return;
    }

    // Last-standing: if only one player who has taken meaningful action (hasActed)
    // still holds tiles, declare them the winner. Prevents ghost bots from
    // blocking the win screen when they hold spawn tiles but never played.
    const meaningfulPlayers = sorted.filter(
      (p) => p.numTilesOwned() > 0 && p.hasActed(),
    );
    if (meaningfulPlayers.length === 1) {
      this.mg.setWinner(
        meaningfulPlayers[0],
        this.mg.stats().stats(),
        "last_standing",
      );
      console.log(`${meaningfulPlayers[0].name()} has won the game`);
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
    const timerExpired =
      this.mg.config().gameConfig().maxTimerValue !== undefined &&
      timeElapsed - this.mg.config().gameConfig().maxTimerValue! * 60 >= 0;
    const tileThresholdMet =
      percentage > this.mg.config().percentageTilesOwnedToWin();
    if (tileThresholdMet || timerExpired) {
      if (max[0] === ColoredTeams.Bot) return;
      this.mg.setWinner(max[0], this.mg.stats().stats(), timerExpired ? "timer" : "tile_percentage");
      console.log(`${max[0]} has won the game`);
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
