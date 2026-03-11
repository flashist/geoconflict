import { Execution, Game, GameType, Player, PlayerInfo, PlayerType } from "../game/Game";
import { TileRef } from "../game/GameMap";
import { AutoExpansionExecution } from "./AutoExpansionExecution";
import { BotExecution } from "./BotExecution";
import { PlayerExecution } from "./PlayerExecution";
import { getSpawnTiles } from "./Util";

export class SpawnExecution implements Execution {
  active: boolean = true;
  private mg: Game;

  constructor(
    private playerInfo: PlayerInfo,
    public readonly tile: TileRef,
  ) { }

  init(mg: Game, ticks: number) {
    this.mg = mg;
  }

  tick(ticks: number) {
    this.active = false;

    if (!this.mg.isValidRef(this.tile)) {
      console.warn(`SpawnExecution: tile ${this.tile} not valid`);
      return;
    }

    // NORMAL BEHAVIOUR
    if (!this.mg.inSpawnPhase()) {
      this.active = false;
      return;
    }
    // BROKEN AUTO-SPAWN TESTS
    // TEST MODE B — Timing race (Failure Mode 1)
    // if (true || !this.mg.inSpawnPhase()) {
    //   console.warn(`[spawn] REJECTED - not in spawn phase, ticks=${ticks}, tile=${this.tile}, player=${this.playerInfo.id}`);
    //   this.active = false;
    //   return;
    // }

    let player: Player | null = null;
    if (this.mg.hasPlayer(this.playerInfo.id)) {
      player = this.mg.player(this.playerInfo.id);
    } else {
      player = this.mg.addPlayer(this.playerInfo);
    }

    player.tiles().forEach((t) => player.relinquish(t));

    // NORMAL BEHAVIOUR
    const spawnTiles = getSpawnTiles(this.mg, this.tile);
    // BROKEN AUTO-SPAWN TESTS
    // TEST MODE A: force empty spawn cluster
    // const spawnTiles: TileRef[] = []; // was: getSpawnTiles(this.mg, this.tile);

    console.log(`[spawn] cluster size ${spawnTiles.length}, validRef=${this.mg.isValidRef(this.tile)}, inSpawnPhase=${this.mg.inSpawnPhase()}, ticks=${ticks}, player=${this.playerInfo.id}`);
    spawnTiles.forEach((t) => {
      player.conquer(t);
    });

    if (!player.hasSpawned()) {
      this.mg.addExecution(new PlayerExecution(player));
      if (player.type() === PlayerType.Bot) {
        this.mg.addExecution(new BotExecution(player));
      }
      // Auto-expansion for human players in multiplayer only
      const gameType = this.mg.config().gameConfig().gameType;
      if (
        player.type() === PlayerType.Human &&
        (gameType === GameType.Public || gameType === GameType.Private)
      ) {
        this.mg.addExecution(new AutoExpansionExecution(player));
      }
    }
    player.setHasSpawned(true);
  }

  isActive(): boolean {
    return this.active;
  }

  activeDuringSpawnPhase(): boolean {
    return true;
  }
}
