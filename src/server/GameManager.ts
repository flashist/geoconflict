import { Logger } from "winston";
import { ServerConfig } from "../core/configuration/Config";
import {
  Difficulty,
  GameMapSize,
  GameMapType,
  GameMode,
  GameType,
} from "../core/game/Game";
import { GameConfig, GameID, GameInfo } from "../core/Schemas";
import { Client } from "./Client";
import { GamePhase, GameServer } from "./GameServer";

export class GameManager {
  private games: Map<GameID, GameServer> = new Map();

  constructor(
    private config: ServerConfig,
    private log: Logger,
  ) {
    setInterval(() => this.tick(), 1000);
  }

  public game(id: GameID): GameServer | null {
    return this.games.get(id) ?? null;
  }

  addClient(client: Client, gameID: GameID, lastTurn: number): boolean {
    const game = this.games.get(gameID);
    if (game) {
      game.addClient(client, lastTurn);
      return true;
    }
    return false;
  }

  createGame(
    id: GameID,
    gameConfig: GameConfig | undefined,
    creatorClientID?: string,
  ) {
    const game = new GameServer(
      id,
      this.log,
      Date.now(),
      this.config,
      {
        donateGold: false,
        donateTroops: false,
        gameMap: GameMapType.World,
        gameType: GameType.Private,
        gameMapSize: GameMapSize.Normal,
        difficulty: Difficulty.Medium,
        disableNPCs: false,
        infiniteGold: false,
        infiniteTroops: false,
        maxTimerValue: undefined,
        instantBuild: false,
        gameMode: GameMode.FFA,
        bots: 400,
        disabledUnits: [],
        ...gameConfig,
      },
      creatorClientID,
    );
    this.games.set(id, game);
    return game;
  }

  activeGames(): number {
    return this.games.size;
  }

  activeClients(): number {
    let totalClients = 0;
    this.games.forEach((game: GameServer) => {
      totalClients += game.activeClients.length;
    });
    return totalClients;
  }

  publicActiveGames(limit: number): GameInfo[] {
    const sanitizedLimit = Math.max(1, Math.min(limit, 20));
    return Array.from(this.games.values())
      .filter(
        (game) =>
          game.isPublic() &&
          game.hasStarted() &&
          game.phase() === GamePhase.Active,
      )
      .map((game) => ({
        gameID: game.id,
        numClients: game.numClients(),
        gameConfig: game.gameConfig,
        startedAt: game.startTime(),
        createdAt: game.createdAt,
        hasStarted: game.hasStarted(),
      }))
      .sort((a, b) => {
        const aStart = a.startedAt ?? a.createdAt ?? 0;
        const bStart = b.startedAt ?? b.createdAt ?? 0;
        return bStart - aStart;
      })
      .slice(0, sanitizedLimit);
  }

  tick() {
    const active = new Map<GameID, GameServer>();
    for (const [id, game] of this.games) {
      const phase = game.phase();
      if (phase === GamePhase.Active) {
        if (!game.hasStarted()) {
          // Prestart tells clients to start loading the game.
          game.prestart();
          // Start game on delay to allow time for clients to connect.
          setTimeout(() => {
            try {
              game.start();
            } catch (error) {
              this.log.error(`error starting game ${id}: ${error}`);
            }
          }, 2000);
        }
      }

      if (phase === GamePhase.Finished) {
        try {
          game.end();
        } catch (error) {
          this.log.error(`error ending game ${id}: ${error}`);
        }
      } else {
        active.set(id, game);
      }
    }
    this.games = active;
  }
}
