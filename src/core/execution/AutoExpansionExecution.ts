import { Execution, Game, Player } from "../game/Game";
import { AttackExecution } from "./AttackExecution";

// Constants — adjust here if tuning is needed
export const AUTO_EXPANSION_INTERVAL_TICKS = 50;
export const AUTO_EXPANSION_MAX_COUNT = 6; // at most 6 expansions (~1 minute)
export const AUTO_EXPANSION_WINDOW_TICKS = 900; // ~1 minute at ~15 ticks/s

export class AutoExpansionExecution implements Execution {
  private active = true;
  private mg: Game | null = null;
  private spawnTick: number = 0;
  private expansionCount = 0;

  constructor(private readonly player: Player) { }

  init(mg: Game, ticks: number) {
    this.mg = mg;
    this.spawnTick = ticks;
  }

  tick(ticks: number) {
    if (!this.active || this.mg === null) return;

    // Deactivation conditions
    if (
      !this.player.isAlive() ||
      this.player.hasActed() ||
      ticks >= this.spawnTick + AUTO_EXPANSION_WINDOW_TICKS ||
      this.expansionCount >= AUTO_EXPANSION_MAX_COUNT
    ) {
      this.active = false;
      return;
    }

    // Fire once per interval
    const elapsed = ticks - this.spawnTick;
    if (elapsed === 0 || elapsed % AUTO_EXPANSION_INTERVAL_TICKS !== 0) return;

    // Find adjacent unoccupied land tiles (terra nullius only)
    const seen = new Set<number>();
    const candidates: number[] = [];
    for (const borderTile of this.player.borderTiles()) {
      for (const neighbor of this.mg.map().neighbors(borderTile)) {
        if (seen.has(neighbor)) continue;
        seen.add(neighbor);
        const owner = this.mg.owner(neighbor);
        if (!owner.isPlayer() && this.mg.map().isLand(neighbor)) {
          candidates.push(neighbor);
        }
      }
    }

    if (candidates.length === 0) {
      this.active = false;
      return;
    }

    this.mg.addExecution(
      new AttackExecution(null, this.player, this.mg.terraNullius().id()),
    );
    this.expansionCount++;
  }

  isActive(): boolean {
    return this.active;
  }

  activeDuringSpawnPhase(): boolean {
    return false;
  }
}
