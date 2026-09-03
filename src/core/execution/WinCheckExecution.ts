import { GameEvent } from "../EventBus";
import {
  ColoredTeams,
  Execution,
  Game,
  GameMode,
  GameType,
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
      // Ties break on ascending smallID so every client picks the same winner.
      // This writes down the behaviour we already had — players() preserves
      // ascending smallID insertion order and Array.prototype.sort is stable —
      // rather than changing it. See task 0206.
      .sort(
        (a, b) =>
          b.numTilesOwned() - a.numTilesOwned() || a.smallID() - b.smallID(),
      );
    if (sorted.length === 0) {
      return;
    }
    const max = sorted[0];
    const timeElapsed =
      (this.mg.ticks() - this.mg.config().numSpawnPhaseTurns()) / 10;
    const numTilesWithoutFallout =
      this.mg.numLandTiles() - this.mg.numTilesWithFallout();
    if (
      (max.numTilesOwned() / numTilesWithoutFallout) * 100 >
        this.mg.config().percentageTilesOwnedToWin() ||
      (this.mg.config().gameConfig().maxTimerValue !== undefined &&
        timeElapsed - this.mg.config().gameConfig().maxTimerValue! * 60 >= 0)
    ) {
      // FFA and Team share one policy: a clientless leader (a Bot *or* a
      // FakeHuman nation) is never declared the winner outside a non-tutorial
      // singleplayer game. Mirrors GameImpl.makeWinner()'s condition, which
      // would otherwise return an undefined winner and silently end nothing.
      // See task 0022. Note the policy is about being *clientless*, not about
      // being AI: a PlayerType.AiPlayer has a real clientID, so it is outside
      // this guard entirely and may be declared the winner (ADR-110).
      if (max.clientID() === null) {
        const gameConfig = this.mg.config().gameConfig();
        if (
          gameConfig.gameType !== GameType.Singleplayer ||
          gameConfig.isTutorial === true
        ) {
          // Task 0206: instead of stalling with no winner (which loses the
          // whole match's XP for every player), award the win to the
          // top-ranked player that HAS a clientID — same tile-count ranking as
          // the leader above. The predicate is clientID() !== null with NO
          // PlayerType.AiPlayer exclusion (ADR-110, accepted 2026-09-03).
          //
          // Multiplayer only. A tutorial (and singleplayer generally) has no
          // server-side XP to rescue, and awarding its single Human the win for
          // LOSING to a bot would hand them first-place platform-leaderboard
          // points via ClientGameRunner.reportPlacements() — the exact bug 0022
          // fixed.
          if (gameConfig.gameType === GameType.Singleplayer) {
            return;
          }
          const fallback = sorted.find((p) => p.clientID() !== null);
          if (fallback === undefined) {
            // No clientful player is alive. Award nothing and stay active,
            // exactly as before this task — never manufacture a winner out of
            // nothing. Returning before `this.active = false` keeps the check
            // alive so a human can still win the match later.
            return;
          }
          this.mg.setWinner(fallback, this.mg.stats().stats());
          console.log(
            `${fallback.name()} has won the game (0206 fallback award)`,
          );
          this.active = false;
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
    if (
      percentage > this.mg.config().percentageTilesOwnedToWin() ||
      (this.mg.config().gameConfig().maxTimerValue !== undefined &&
        timeElapsed - this.mg.config().gameConfig().maxTimerValue! * 60 >= 0)
    ) {
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

  isActive(): boolean {
    return this.active;
  }

  activeDuringSpawnPhase(): boolean {
    return false;
  }
}
