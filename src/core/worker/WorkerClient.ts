import {
  Cell,
  PlayerActions,
  PlayerBorderTiles,
  PlayerID,
  PlayerProfile,
} from "../game/Game";
import { TileRef } from "../game/GameMap";
import { ErrorUpdate, GameUpdateViewData } from "../game/GameUpdates";
import { TerrainMapSource } from "../game/TerrainMapLoader";
import { ClientID, GameStartInfo, Turn } from "../Schemas";
import { generateID } from "../Util";
import { WorkerMessage } from "./WorkerMessages";

// Task 0348. Was 5 s. A crash now fails fast (init_failed / error event), so
// this only bounds a start that is slow but alive. Kept at 15 s, not more: the
// multiplayer spawn phase is ~20 s (300 turns × 66.7 ms), and a start that
// ends after it joins too late to place.
export const WORKER_INIT_TIMEOUT_MS = 15000;

export class WorkerInitTimeoutError extends Error {
  constructor() {
    super("Worker initialization timeout");
    this.name = "WorkerInitTimeoutError";
  }
}

export class WorkerClient {
  private worker: Worker;
  private isInitialized = false;
  private messageHandlers: Map<string, (message: WorkerMessage) => void>;
  private gameUpdateCallback?: (
    update: GameUpdateViewData | ErrorUpdate,
  ) => void;
  private initReject?: (err: Error) => void;

  constructor(
    private gameStartInfo: GameStartInfo,
    private clientID: ClientID,
    // Task 0035: the page's already-loaded map, sent in `init` so the worker
    // does not download it again. Copied (structured clone), not transferred:
    // the page's live map and its map cache keep using these bytes.
    private mapSource?: TerrainMapSource,
  ) {
    this.worker = new Worker(new URL("./Worker.worker.ts", import.meta.url));
    this.messageHandlers = new Map();

    // Set up global message handler
    this.worker.addEventListener(
      "message",
      this.handleWorkerMessage.bind(this),
    );

    // Propagate worker crashes immediately instead of waiting for the timeout
    this.worker.addEventListener("error", (event: ErrorEvent) => {
      if (this.initReject) {
        this.initReject(new Error(`Worker crashed: ${event.message}`));
        this.initReject = undefined;
      }
      // Task 0232: after init, an uncaught worker exception used to vanish here.
      this.gameUpdateCallback?.({ errMsg: `Worker crashed: ${event.message}` });
    });
  }

  private handleWorkerMessage(event: MessageEvent<WorkerMessage>) {
    const message = event.data;

    switch (message.type) {
      case "game_update":
        if (this.gameUpdateCallback && message.gameUpdate) {
          this.gameUpdateCallback(message.gameUpdate);
        }
        break;

      case "game_error":
        if (this.gameUpdateCallback && message.error) {
          this.gameUpdateCallback(message.error);
        }
        break;

      case "initialized":
      default:
        if (message.id && this.messageHandlers.has(message.id)) {
          const handler = this.messageHandlers.get(message.id)!;
          handler(message);
          this.messageHandlers.delete(message.id);
        }
        break;
    }
  }

  initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const messageId = generateID();

      const timeoutHandle = setTimeout(() => {
        if (!this.isInitialized) {
          this.initReject = undefined;
          this.messageHandlers.delete(messageId);
          reject(new WorkerInitTimeoutError());
        }
      }, WORKER_INIT_TIMEOUT_MS);

      // Task 0348 — every way the start can end (initialized, init_failed,
      // the error event, the timeout) clears the timer.
      const settleReject = (err: Error) => {
        clearTimeout(timeoutHandle);
        reject(err);
      };
      this.initReject = settleReject;

      this.messageHandlers.set(messageId, (message) => {
        if (message.type === "initialized") {
          clearTimeout(timeoutHandle);
          this.isInitialized = true;
          this.initReject = undefined;
          resolve();
        } else if (message.type === "init_failed") {
          this.initReject = undefined;
          settleReject(
            new Error(`Worker initialization failed: ${message.error}`),
          );
        }
      });

      this.worker.postMessage({
        type: "init",
        id: messageId,
        gameStartInfo: this.gameStartInfo,
        clientID: this.clientID,
        mapSource: this.mapSource,
      });
    });
  }

  start(gameUpdate: (gu: GameUpdateViewData | ErrorUpdate) => void) {
    if (!this.isInitialized) {
      throw new Error("Failed to initialize pathfinder");
    }
    this.gameUpdateCallback = gameUpdate;
  }

  sendTurn(turn: Turn) {
    if (!this.isInitialized) {
      throw new Error("Worker not initialized");
    }

    this.worker.postMessage({
      type: "turn",
      turn,
    });
  }

  sendHeartbeat() {
    this.worker.postMessage({
      type: "heartbeat",
    });
  }

  playerProfile(playerID: number): Promise<PlayerProfile> {
    return new Promise((resolve, reject) => {
      if (!this.isInitialized) {
        reject(new Error("Worker not initialized"));
        return;
      }

      const messageId = generateID();

      this.messageHandlers.set(messageId, (message) => {
        if (
          message.type === "player_profile_result" &&
          message.result !== undefined
        ) {
          resolve(message.result);
        }
      });

      this.worker.postMessage({
        type: "player_profile",
        id: messageId,
        playerID: playerID,
      });
    });
  }

  playerBorderTiles(playerID: PlayerID): Promise<PlayerBorderTiles> {
    return new Promise((resolve, reject) => {
      if (!this.isInitialized) {
        reject(new Error("Worker not initialized"));
        return;
      }

      const messageId = generateID();

      this.messageHandlers.set(messageId, (message) => {
        if (
          message.type === "player_border_tiles_result" &&
          message.result !== undefined
        ) {
          resolve(message.result);
        }
      });

      this.worker.postMessage({
        type: "player_border_tiles",
        id: messageId,
        playerID: playerID,
      });
    });
  }

  playerInteraction(
    playerID: PlayerID,
    x?: number,
    y?: number,
  ): Promise<PlayerActions> {
    return new Promise((resolve, reject) => {
      if (!this.isInitialized) {
        reject(new Error("Worker not initialized"));
        return;
      }

      const messageId = generateID();

      this.messageHandlers.set(messageId, (message) => {
        if (
          message.type === "player_actions_result" &&
          message.result !== undefined
        ) {
          resolve(message.result);
        }
      });

      this.worker.postMessage({
        type: "player_actions",
        id: messageId,
        playerID: playerID,
        x: x,
        y: y,
      });
    });
  }

  attackAveragePosition(
    playerID: number,
    attackID: string,
  ): Promise<Cell | null> {
    return new Promise((resolve, reject) => {
      if (!this.isInitialized) {
        reject(new Error("Worker not initialized"));
        return;
      }

      const messageId = generateID();

      this.messageHandlers.set(messageId, (message) => {
        if (
          message.type === "attack_average_position_result" &&
          message.x !== undefined &&
          message.y !== undefined
        ) {
          if (message.x === null || message.y === null) {
            resolve(null);
          } else {
            resolve(new Cell(message.x, message.y));
          }
        }
      });

      this.worker.postMessage({
        type: "attack_average_position",
        id: messageId,
        playerID: playerID,
        attackID: attackID,
      });
    });
  }

  transportShipSpawn(
    playerID: PlayerID,
    targetTile: TileRef,
  ): Promise<TileRef | false> {
    return new Promise((resolve, reject) => {
      if (!this.isInitialized) {
        reject(new Error("Worker not initialized"));
        return;
      }

      const messageId = generateID();

      this.messageHandlers.set(messageId, (message) => {
        if (
          message.type === "transport_ship_spawn_result" &&
          message.result !== undefined
        ) {
          resolve(message.result);
        }
      });

      this.worker.postMessage({
        type: "transport_ship_spawn",
        id: messageId,
        playerID: playerID,
        targetTile: targetTile,
      });
    });
  }

  cleanup() {
    // Task 0035: a start still pending fails now instead of waiting out the
    // 15 s timer (settleReject clears it). Taken first, so the reject runs
    // after the worker is stopped and cannot run twice.
    const pendingInitReject = this.initReject;
    this.initReject = undefined;
    this.worker.terminate();
    this.messageHandlers.clear();
    this.gameUpdateCallback = undefined;
    pendingInitReject?.(
      new Error("Worker stopped before it finished starting"),
    );
  }
}
