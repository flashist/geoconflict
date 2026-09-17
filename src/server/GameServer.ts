import { context, trace } from "@opentelemetry/api";
import ipAnonymize from "ip-anonymize";
import { Logger } from "winston";
import WebSocket from "ws";
import { z } from "zod";
import { GameEnv, ServerConfig } from "../core/configuration/Config";
import { GameType } from "../core/game/Game";
import {
  ClientID,
  ClientMessageSchema,
  ClientParticipationMessage,
  ClientSendWinnerMessage,
  GameConfig,
  GameInfo,
  GameStartInfo,
  GameStartInfoSchema,
  Intent,
  PlayerParticipation,
  PlayerRecord,
  ServerDesyncSchema,
  ServerErrorMessage,
  ServerPrestartMessageSchema,
  ServerStartGameMessage,
  ServerTurnMessage,
  Turn,
} from "../core/Schemas";
import { createPartialGameRecord, getClanTag, simpleHash } from "../core/Util";
import { PseudoRandom } from "../core/PseudoRandom";
import {
  ClientCreditState,
  selectMatchCredits,
  selectUnresolvedCreditClients,
} from "../core/profile/MatchQualification";
import { archive, finalizeGameRecord } from "./Archive";
import { Client } from "./Client";
import { ProfileApiClient } from "./ProfileApiClient";

export enum GamePhase {
  Lobby = "LOBBY",
  Active = "ACTIVE",
  Finished = "FINISHED",
}

type AiLobbyPlayer = {
  clientID: ClientID;
  username: string;
  joinIndex: number;
  joinedAt: number;
};

type PendingAiJoin = {
  joinIndex: number;
  dueAt: number;
};

export class GameServer {
  private sentDesyncMessageClients = new Set<ClientID>();

  private maxGameDuration = 3 * 60 * 60 * 1000; // 3 hours

  private disconnectedTimeout = 1 * 60 * 1000; // 60 seconds

  private turns: Turn[] = [];
  private intents: Intent[] = [];
  public activeClients: Client[] = [];
  private LobbyCreatorID: string | undefined;
  private allClients: Map<ClientID, Client> = new Map();
  private clientsDisconnectedStatus: Map<ClientID, boolean> = new Map();
  private _hasStarted = false;
  private _isEnded = false;
  private _startTime: number | null = null;

  private endTurnIntervalID: ReturnType<typeof setInterval> | undefined;

  private lastPingUpdate = 0;

  private winner: ClientSendWinnerMessage | null = null;

  // Note: This can be undefined if accessed before the game starts.
  private gameStartInfo!: GameStartInfo;

  private log: Logger;

  private _hasPrestarted = false;

  private kickedClients: Set<ClientID> = new Set();
  private outOfSyncClients: Set<ClientID> = new Set();

  // Task 0211. Server-observed spawns: the clientID of every authenticated `spawn`
  // intent that passed through this relay. Spawn is the one participation gate the
  // server can corroborate FIRST-HAND, so a `participation` self-report from a
  // client that never committed to the match is never paid.
  private spawnedClients: Set<ClientID> = new Set();

  // Task 0211. The last participation self-report per client, retained so a credit
  // dropped for a null Yandex id can be re-attempted when a late `update_identity`
  // resolves it. Moving the trigger mid-match makes that race materially likelier:
  // a player can now be credited seconds after joining.
  private participationClaims: Map<ClientID, ClientParticipationMessage> =
    new Map();

  // Task 0211. Clients we have already issued a credit call for from a self-report.
  // ⚠️ This is an EFFICIENCY latch — it stops N reports becoming N HTTP round-trips.
  // It is NOT the double-credit guard: that is the profile server's
  // `(game_id, player_id)` primary key, and it must not be described as anything
  // else. Set only when a call was actually made or scheduled (task 0272: a
  // resolve-then-credit counts), so a report dropped for a null Yandex id stays
  // retryable.
  private participationCredited: Set<ClientID> = new Set();

  // Task 0272. The one in-flight profile resolve per Client OBJECT, so a join, a
  // late identity and a credit never resolve the same client twice at once. Keyed by
  // the object, not the clientID: a reconnect's new socket never picks up the old
  // socket's in-flight result. The entry is removed once settled, so a failed
  // resolve can be retried.
  private profileResolves = new WeakMap<Client, Promise<string | null>>();

  public bytesSent: number = 0;
  public bytesReceived: number = 0;

  private websockets: Set<WebSocket> = new Set();
  private aiPlayers: AiLobbyPlayer[] = [];
  private pendingAiJoins: PendingAiJoin[] = [];
  private aiPlayerJoinSequence = 0;
  private aiNameOrder: number[] | null = null;
  private aiLobbyIntervalID: ReturnType<typeof setInterval> | undefined;

  private winnerVotes: Map<
    string,
    { winner: ClientSendWinnerMessage; ips: Set<string> }
  > = new Map();

  constructor(
    public readonly id: string,
    readonly log_: Logger,
    public readonly createdAt: number,
    private config: ServerConfig,
    public gameConfig: GameConfig,
    private profileApiClient: ProfileApiClient,
    lobbyCreatorID?: string,
  ) {
    this.log = log_.child({ gameID: id });
    this.LobbyCreatorID = lobbyCreatorID ?? undefined;
    const aiConfig = this.config.aiPlayersConfig();
    if (this.gameConfig.gameType === GameType.Public && aiConfig.enabled) {
      this.aiLobbyIntervalID = setInterval(
        () => this.tickAiLobby(),
        aiConfig.tickMs,
      );
    }
  }

  public updateGameConfig(gameConfig: Partial<GameConfig>): void {
    if (gameConfig.gameMap !== undefined) {
      this.gameConfig.gameMap = gameConfig.gameMap;
    }
    if (gameConfig.gameMapSize !== undefined) {
      this.gameConfig.gameMapSize = gameConfig.gameMapSize;
    }
    if (gameConfig.difficulty !== undefined) {
      this.gameConfig.difficulty = gameConfig.difficulty;
    }
    if (gameConfig.disableNPCs !== undefined) {
      this.gameConfig.disableNPCs = gameConfig.disableNPCs;
    }
    if (gameConfig.bots !== undefined) {
      this.gameConfig.bots = gameConfig.bots;
    }
    if (gameConfig.infiniteGold !== undefined) {
      this.gameConfig.infiniteGold = gameConfig.infiniteGold;
    }
    if (gameConfig.startGold !== undefined) {
      this.gameConfig.startGold = gameConfig.startGold;
    }
    if (gameConfig.donateGold !== undefined) {
      this.gameConfig.donateGold = gameConfig.donateGold;
    }
    if (gameConfig.infiniteTroops !== undefined) {
      this.gameConfig.infiniteTroops = gameConfig.infiniteTroops;
    }
    if (gameConfig.donateTroops !== undefined) {
      this.gameConfig.donateTroops = gameConfig.donateTroops;
    }
    if (gameConfig.maxTimerValue !== undefined) {
      this.gameConfig.maxTimerValue = gameConfig.maxTimerValue;
    }
    if (gameConfig.instantBuild !== undefined) {
      this.gameConfig.instantBuild = gameConfig.instantBuild;
    }
    if (gameConfig.gameMode !== undefined) {
      this.gameConfig.gameMode = gameConfig.gameMode;
    }

    if (gameConfig.disabledUnits !== undefined) {
      this.gameConfig.disabledUnits = gameConfig.disabledUnits;
    }

    if (gameConfig.playerTeams !== undefined) {
      this.gameConfig.playerTeams = gameConfig.playerTeams;
    }
  }

  public addClient(client: Client, lastTurn: number) {
    this.websockets.add(client.ws);
    if (this.kickedClients.has(client.clientID)) {
      this.log.warn(`cannot add client, already kicked`, {
        clientID: client.clientID,
      });
      return;
    }
    // Log when lobby creator joins private game
    if (client.clientID === this.LobbyCreatorID) {
      this.log.info("Lobby creator joined", {
        gameID: this.id,
        creatorID: this.LobbyCreatorID,
      });
    }
    this.log.info("client (re)joining game", {
      clientID: client.clientID,
      persistentID: client.persistentID,
      clientIP: ipAnonymize(client.ip),
      isRejoin: lastTurn > 0,
    });

    if (
      this.gameConfig.gameType === GameType.Public &&
      this.activeClients.filter(
        (c) => c.ip === client.ip && c.clientID !== client.clientID,
      ).length >= 3
    ) {
      this.log.warn("cannot add client, already have 3 ips", {
        clientID: client.clientID,
        clientIP: ipAnonymize(client.ip),
      });
      return;
    }

    if (this.config.env() === GameEnv.Prod) {
      // Prevent multiple clients from using the same account in prod
      const conflicting = this.activeClients.find(
        (c) =>
          c.persistentID === client.persistentID &&
          c.clientID !== client.clientID,
      );
      if (conflicting !== undefined) {
        this.log.error("client ids do not match", {
          clientID: client.clientID,
          clientIP: ipAnonymize(client.ip),
          clientPersistentID: client.persistentID,
          existingIP: ipAnonymize(conflicting.ip),
          existingPersistentID: conflicting.persistentID,
        });
        // Kick the existing client instead of the new one, because this was causing issues when
        // a client wanted to replay the game afterwards.
        this.kickClient(conflicting.clientID);
      }
    }

    // Remove stale client if this is a reconnect
    const existing = this.activeClients.find(
      (c) => c.clientID === client.clientID,
    );
    if (existing !== undefined) {
      if (client.persistentID !== existing.persistentID) {
        this.log.error("persistent ids do not match", {
          clientID: client.clientID,
          clientIP: ipAnonymize(client.ip),
          clientPersistentID: client.persistentID,
          existingIP: ipAnonymize(existing.ip),
          existingPersistentID: existing.persistentID,
        });
        return;
      }

      client.lastPing = existing.lastPing;
      client.reportedWinner = existing.reportedWinner;
      // Carry the already-resolved citizen flag across a reconnect so the icon does
      // not blank out while the fresh resolve below is still in flight (0068).
      client.isCitizen = existing.isCitizen;
      // Task 0272. Carry the resolved player id too — but ONLY when the rejoining
      // socket presents the very same creditable identity. Carrying it across a
      // different or missing identity would credit the wrong player.
      const creditableId = this.getCreditableYandexId(client);
      if (
        creditableId !== null &&
        creditableId === this.getCreditableYandexId(existing)
      ) {
        client.profilePlayerId = existing.profilePlayerId;
      }

      this.activeClients = this.activeClients.filter((c) => c !== existing);
    }

    // Client connection accepted
    this.activeClients.push(client);

    if (
      existing === undefined &&
      this.isPublic() &&
      this.aiPlayers.length > 0 &&
      this.config.aiPlayersConfig().humanPriority
    ) {
      const capacity = this.gameConfig.maxPlayers ?? 0;
      if (
        capacity > 0 &&
        this.activeClients.length + this.aiPlayers.length >= capacity
      ) {
        this.removeAiPlayers(1);
      }
    }
    client.lastPing = Date.now();

    this.markClientDisconnected(client.clientID, false);

    this.allClients.set(client.clientID, client);

    // Resolve an authenticated player's internal profile id as early as join, so it
    // is ready before match-end crediting and before the Citizenship UI reads it.
    this.resolveProfileForClient(client);
    // Task 0211. A reconnect is the OTHER way a Yandex id goes null -> value: the
    // rejoining socket carries a freshly-resolved id and replaces the allClients
    // entry, with no `update_identity` message ever sent. Without this, a retained
    // claim from a null-id report is stranded on an in-place socket reconnect (a
    // page reload heals itself, because the client replays turns and re-reports).
    // A no-op unless a retained, uncredited claim exists.
    this.retryParticipationAfterIdentityRefresh(client);

    client.ws.removeAllListeners("message");
    client.ws.on("message", async (message: string) => {
      // Buffer.byteLength is correct for both Buffer and string (handles multi-byte chars)
      this.bytesReceived += Buffer.byteLength(message);
      try {
        const parsed = ClientMessageSchema.safeParse(JSON.parse(message));
        if (!parsed.success) {
          const error = z.prettifyError(parsed.error);
          this.log.error(
            `Failed to parse client message (clientID: ${client.clientID}): ${error}`,
          );
          client.ws.send(
            JSON.stringify({
              type: "error",
              error,
              message,
            } satisfies ServerErrorMessage),
          );
          client.ws.close(1002, "ClientMessageSchema");
          return;
        }
        const clientMsg = parsed.data;
        switch (clientMsg.type) {
          case "intent": {
            if (clientMsg.intent.clientID !== client.clientID) {
              this.log.warn(
                `client id mismatch, client: ${client.clientID}, intent: ${clientMsg.intent.clientID}`,
              );
              return;
            }
            switch (clientMsg.intent.type) {
              case "mark_disconnected": {
                this.log.warn(
                  `Should not receive mark_disconnected intent from client`,
                );
                return;
              }

              // Handle kick_player intent via WebSocket
              case "kick_player": {
                const authenticatedClientID = client.clientID;

                // Check if the authenticated client is the lobby creator
                if (authenticatedClientID !== this.LobbyCreatorID) {
                  this.log.warn(`Only lobby creator can kick players`, {
                    clientID: authenticatedClientID,
                    creatorID: this.LobbyCreatorID,
                    target: clientMsg.intent.target,
                    gameID: this.id,
                  });
                  return;
                }

                // Don't allow lobby creator to kick themselves
                if (authenticatedClientID === clientMsg.intent.target) {
                  this.log.warn(`Cannot kick yourself`, {
                    clientID: authenticatedClientID,
                  });
                  return;
                }

                // Log and execute the kick
                this.log.info(`Lobby creator initiated kick of player`, {
                  creatorID: authenticatedClientID,
                  target: clientMsg.intent.target,
                  gameID: this.id,
                  kickMethod: "websocket",
                });

                this.kickClient(clientMsg.intent.target);
                return;
              }
              default: {
                this.addIntent(clientMsg.intent);
                break;
              }
            }
            break;
          }
          case "ping": {
            this.lastPingUpdate = Date.now();
            client.lastPing = Date.now();
            break;
          }
          case "hash": {
            client.hashes.set(clientMsg.turnNumber, clientMsg.hash);
            break;
          }
          case "winner": {
            this.handleWinner(client, clientMsg);
            break;
          }
          case "participation": {
            this.handleParticipation(client, clientMsg);
            break;
          }
          case "update_identity": {
            // Late Yandex-id resolution for an authorized user who joined while the
            // SDK was still initializing. Apply null→value only (cannot hijack a
            // known id), and resolve the profile player now that we finally know it.
            if (client.setYandexPlayerIdIfUnset(clientMsg.yandexPlayerId)) {
              this.log.info("client Yandex identity resolved post-join", {
                clientID: client.clientID,
              });
              this.resolveProfileForClient(client);
              // Task 0211. A mid-match participation report that arrived before the
              // id resolved was dropped; retry it now that we can credit.
              this.retryParticipationAfterIdentityRefresh(client);
            }
            break;
          }
          default: {
            this.log.warn(`Unknown message type: ${(clientMsg as any).type}`, {
              clientID: client.clientID,
            });
            break;
          }
        }
      } catch (error) {
        this.log.info(
          `error handline websocket request in game server: ${error}`,
          {
            clientID: client.clientID,
          },
        );
      }
    });
    client.ws.on("close", () => {
      this.log.info("client disconnected", {
        clientID: client.clientID,
        persistentID: client.persistentID,
      });
      // Remove only THIS socket's client instance, not every client sharing the
      // clientID. A reconnect replaces the instance (addClient); a stale old-socket
      // close arriving after that must not evict the new, live client — otherwise a
      // legitimately reconnected player drops out of activeClients and the match-end
      // credit gate denies them their XP.
      this.activeClients = this.activeClients.filter((c) => c !== client);
    });
    client.ws.on("error", (error: Error) => {
      if ((error as any).code === "WS_ERR_UNEXPECTED_RSV_1") {
        client.ws.close(1002, "WS_ERR_UNEXPECTED_RSV_1");
      }
    });

    // In case a client joined the game late and missed the start message.
    if (this._hasStarted) {
      this.sendStartGameMsg(client.ws, lastTurn);
    }
  }

  public numClients(): number {
    return this.activeClients.length + this.aiPlayers.length;
  }

  public startTime(): number {
    if (this._startTime !== null && this._startTime > 0) {
      return this._startTime;
    } else {
      //game hasn't started yet, only works for public games
      return this.createdAt + this.config.gameCreationRate();
    }
  }

  public prestart() {
    if (this.hasStarted()) {
      return;
    }
    this._hasPrestarted = true;

    const prestartMsg = ServerPrestartMessageSchema.safeParse({
      type: "prestart",
      gameMap: this.gameConfig.gameMap,
      gameMapSize: this.gameConfig.gameMapSize,
    });

    if (!prestartMsg.success) {
      console.error(
        `error creating prestart message for game ${this.id}, ${prestartMsg.error}`.substring(
          0,
          250,
        ),
      );
      return;
    }

    const msg = JSON.stringify(prestartMsg.data);
    this.activeClients.forEach((c) => {
      this.log.info("sending prestart message", {
        clientID: c.clientID,
        persistentID: c.persistentID,
      });
      c.ws.send(msg);
    });
  }

  public start() {
    if (this._hasStarted) {
      return;
    }
    this._hasStarted = true;
    this._startTime = Date.now();
    this.stopAiLobbyInterval();
    // Set last ping to start so we don't immediately stop the game
    // if no client connects/pings.
    this.lastPingUpdate = Date.now();

    const result = GameStartInfoSchema.safeParse({
      gameID: this.id,
      config: this.gameConfig,
      players: this.activeClients.map((c) => ({
        username: c.username,
        clientID: c.clientID,
        cosmetics: c.cosmetics,
        // The single point where the citizen flag is frozen for the whole match:
        // one object, broadcast identically to every client (late joiners included).
        isCitizen: c.isCitizen,
      })),
      aiPlayers: this.aiPlayers.map((ai) => ({
        username: ai.username,
        clientID: ai.clientID,
      })),
    });
    if (!result.success) {
      const error = z.prettifyError(result.error);
      this.log.error("Error parsing game start info", { message: error });
      return;
    }
    this.gameStartInfo = result.data satisfies GameStartInfo;

    this.endTurnIntervalID = setInterval(
      () => this.endTurn(),
      this.config.turnIntervalMs(),
    );
    this.activeClients.forEach((c) => {
      this.log.info("sending start message", {
        clientID: c.clientID,
        persistentID: c.persistentID,
      });
      this.sendStartGameMsg(c.ws, 0);
    });
  }

  private tickAiLobby() {
    const aiConfig = this.config.aiPlayersConfig();
    if (!aiConfig.enabled || !this.isPublic() || this.hasStarted()) {
      return;
    }

    const capacity = this.gameConfig.maxPlayers ?? 0;
    if (capacity <= 0) {
      return;
    }

    const now = Date.now();
    this.processPendingAiJoins(now);

    const humans = this.activeClients.length;
    const timeoutSec =
      aiConfig.timeoutSec ?? this.config.gameCreationRate() / 1000;
    if (timeoutSec <= 0) {
      return;
    }

    const tPassed = Math.max(0, (now - this.createdAt) / 1000);
    const coef = Math.min(1, Math.max(0, tPassed / timeoutSec));
    const targetTotal = Math.floor(
      Math.min(capacity, aiConfig.targetTotalByTimeout) * coef,
    );

    const reservedForHumans = aiConfig.humanPriority
      ? aiConfig.minHumanSlots
      : 0;
    const maxAiAllowedNow = Math.max(
      0,
      Math.min(aiConfig.aiPlayersMax, capacity - humans - reservedForHumans),
    );

    const total = humans + this.aiPlayers.length;
    if (total > capacity) {
      this.removeAiPlayers(total - capacity);
    }

    if (this.aiPlayers.length > maxAiAllowedNow) {
      this.removeAiPlayers(this.aiPlayers.length - maxAiAllowedNow);
    }

    const requiredTotal = Math.max(humans, targetTotal);
    const desiredAi = Math.max(
      0,
      Math.min(maxAiAllowedNow, requiredTotal - humans),
    );

    this.trimPendingAiJoins(desiredAi);

    const pendingCount = this.pendingAiJoins.length;
    if (this.aiPlayers.length + pendingCount < desiredAi) {
      const needed = desiredAi - (this.aiPlayers.length + pendingCount);
      this.scheduleAiJoins(needed, now);
    }
  }

  private processPendingAiJoins(now: number) {
    if (this.pendingAiJoins.length === 0) {
      return;
    }
    const due = this.pendingAiJoins.filter((p) => p.dueAt <= now);
    if (due.length === 0) {
      return;
    }

    this.pendingAiJoins = this.pendingAiJoins.filter((p) => p.dueAt > now);
    due.sort((a, b) => a.joinIndex - b.joinIndex);
    for (const join of due) {
      this.addAiPlayer(join.joinIndex, now);
    }
  }

  private scheduleAiJoins(count: number, now: number) {
    const aiConfig = this.config.aiPlayersConfig();
    for (let i = 0; i < count; i++) {
      const joinIndex = this.aiPlayerJoinSequence++;
      const delay = this.aiJoinDelayMs(joinIndex, aiConfig.joinJitterMs);
      this.pendingAiJoins.push({ joinIndex, dueAt: now + delay });
    }
    this.pendingAiJoins.sort(
      (a, b) => a.dueAt - b.dueAt || a.joinIndex - b.joinIndex,
    );
  }

  private aiJoinDelayMs(
    joinIndex: number,
    jitter: { min: number; max: number },
  ): number {
    const min = Math.max(0, Math.min(jitter.min, jitter.max));
    const max = Math.max(jitter.min, jitter.max);
    const random = new PseudoRandom(simpleHash(this.id) + joinIndex * 17);
    return random.nextInt(min, max + 1);
  }

  private addAiPlayer(joinIndex: number, now: number) {
    const ai = this.buildAiPlayer(joinIndex, now);
    this.aiPlayers.push(ai);
  }

  private buildAiPlayer(joinIndex: number, now: number): AiLobbyPlayer {
    const name = this.aiNameForJoin(joinIndex);
    const clientID = this.aiClientIdForJoin(joinIndex);
    return {
      clientID,
      username: name,
      joinIndex,
      joinedAt: now,
    };
  }

  private aiNameForJoin(joinIndex: number): string {
    this.ensureAiNameOrder();
    const aiConfig = this.config.aiPlayersConfig();
    const order = this.aiNameOrder!;
    const slot = order[joinIndex % order.length];
    const width = Math.max(
      4,
      String(aiConfig.name.start + aiConfig.name.reserve - 1).length,
    );
    return `${aiConfig.name.prefix}${String(slot).padStart(width, "0")}`;
  }

  private aiClientIdForJoin(joinIndex: number): ClientID {
    const baseSeed = simpleHash(this.id) + joinIndex;
    for (let attempt = 0; attempt < 5; attempt++) {
      const random = new PseudoRandom(baseSeed + attempt * 101);
      const id = random.nextID() as ClientID;
      if (!this.isClientIdTaken(id)) {
        return id;
      }
    }
    return new PseudoRandom(baseSeed + 999).nextID() as ClientID;
  }

  private isClientIdTaken(id: ClientID): boolean {
    if (this.activeClients.some((c) => c.clientID === id)) {
      return true;
    }
    if (this.aiPlayers.some((ai) => ai.clientID === id)) {
      return true;
    }
    return false;
  }

  private ensureAiNameOrder() {
    if (this.aiNameOrder !== null) {
      return;
    }
    const aiConfig = this.config.aiPlayersConfig();
    const ids = Array.from(
      { length: aiConfig.name.reserve },
      (_, i) => aiConfig.name.start + i,
    );
    const random = new PseudoRandom(simpleHash(this.id));
    this.aiNameOrder = random.shuffleArray(ids);
  }

  private removeAiPlayers(count: number) {
    if (count <= 0) {
      return;
    }
    const toRemove = Math.min(count, this.aiPlayers.length);
    this.aiPlayers.splice(-toRemove, toRemove);
  }

  private trimPendingAiJoins(desiredAi: number) {
    const overflow =
      this.aiPlayers.length + this.pendingAiJoins.length - desiredAi;
    if (overflow <= 0) {
      return;
    }
    this.pendingAiJoins.splice(-overflow, overflow);
  }

  private stopAiLobbyInterval() {
    if (this.aiLobbyIntervalID) {
      clearInterval(this.aiLobbyIntervalID);
      this.aiLobbyIntervalID = undefined;
    }
  }

  private addIntent(intent: Intent) {
    // Task 0211. Note the spawn first-hand. Every client intent that reaches here
    // has already passed the `intent.clientID !== client.clientID` guard above, so
    // this set is authenticated: a client cannot record a spawn for anyone else.
    // The only other caller of addIntent is markClientDisconnected, which never
    // sends a spawn.
    if (intent.type === "spawn") {
      this.spawnedClients.add(intent.clientID);
    }
    this.intents.push(intent);
  }

  private sendStartGameMsg(ws: WebSocket, lastTurn: number) {
    try {
      ws.send(
        JSON.stringify({
          type: "start",
          turns: this.turns.slice(lastTurn),
          gameStartInfo: this.gameStartInfo,
        } satisfies ServerStartGameMessage),
      );
    } catch (error) {
      throw new Error(
        `error sending start message for game ${this.id}, ${error}`.substring(
          0,
          250,
        ),
      );
    }
  }

  // Emit OTEL spans for turns that exceed this budget (in ms).
  private static readonly SLOW_TURN_THRESHOLD_MS = 100;

  private endTurn() {
    const t0 = Date.now();

    const pastTurn: Turn = {
      turnNumber: this.turns.length,
      intents: this.intents,
    };
    this.turns.push(pastTurn);
    this.intents = [];

    const t1 = Date.now();

    this.handleSynchronization();
    this.checkDisconnectedStatus();

    const t2 = Date.now();

    const msg = JSON.stringify({
      type: "turn",
      turn: pastTurn,
    } satisfies ServerTurnMessage);
    this.activeClients.forEach((c) => {
      c.ws.send(msg);
    });
    // Approximation: counts bytes for all clients regardless of individual send failures
    this.bytesSent += Buffer.byteLength(msg) * this.activeClients.length;

    const t3 = Date.now();
    const totalMs = t3 - t0;

    if (totalMs > GameServer.SLOW_TURN_THRESHOLD_MS) {
      const tracer = trace.getTracer("server-turns");
      const rootSpan = tracer.startSpan("server.turn.process", {
        startTime: t0,
      });
      rootSpan.setAttribute("game.id", this.id);
      rootSpan.setAttribute("turn.number", pastTurn.turnNumber);
      rootSpan.setAttribute("intents.count", pastTurn.intents.length);
      rootSpan.setAttribute("clients.active", this.activeClients.length);
      rootSpan.setAttribute("message.size_bytes", msg.length);
      rootSpan.setAttribute("turn.duration_ms", totalMs);

      const ctx = trace.setSpan(context.active(), rootSpan);

      const collectSpan = tracer.startSpan(
        "turn.assembly",
        { startTime: t0 },
        ctx,
      );
      collectSpan.end(t1);

      const syncSpan = tracer.startSpan(
        "synchronization",
        { startTime: t1 },
        ctx,
      );
      syncSpan.end(t2);

      const broadcastSpan = tracer.startSpan(
        "turn.broadcast",
        { startTime: t2 },
        ctx,
      );
      broadcastSpan.end(t3);

      rootSpan.end(t3);
    }
  }

  async end() {
    this._isEnded = true;
    // Close all WebSocket connections
    if (this.endTurnIntervalID) {
      clearInterval(this.endTurnIntervalID);
    }
    this.stopAiLobbyInterval();
    this.websockets.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close(1000, "game has ended");
      }
    });
    if (!this._hasPrestarted && !this._hasStarted) {
      this.log.info(`game not started, not archiving game`);
      return;
    }
    this.log.info(`ending game with ${this.turns.length} turns`);
    try {
      if (this.allClients.size === 0) {
        this.log.info("no clients joined, not archiving game", {
          gameID: this.id,
        });
      } else if (this.winner !== null) {
        this.log.info("game already archived", {
          gameID: this.id,
        });
      } else {
        this.archiveGame();
      }
    } catch (error) {
      let errorDetails;
      if (error instanceof Error) {
        errorDetails = {
          message: error.message,
          stack: error.stack,
        };
      } else if (Array.isArray(error)) {
        errorDetails = error; // Now we'll actually see the array contents
      } else {
        try {
          errorDetails = JSON.stringify(error, null, 2);
        } catch (e) {
          errorDetails = String(error);
        }
      }

      this.log.error("Error archiving game record details:", {
        gameId: this.id,
        errorType: typeof error,
        error: errorDetails,
      });
    }
  }

  public isPrivateLobbyCreator(clientID: string): boolean {
    return this.LobbyCreatorID === clientID;
  }

  phase(): GamePhase {
    const now = Date.now();
    const alive: Client[] = [];
    for (const client of this.activeClients) {
      if (now - client.lastPing > 60_000) {
        this.log.info("no pings received, terminating connection", {
          clientID: client.clientID,
          persistentID: client.persistentID,
        });
        if (client.ws.readyState === WebSocket.OPEN) {
          client.ws.close(1000, "no heartbeats received, closing connection");
        }
      } else {
        alive.push(client);
      }
    }
    this.activeClients = alive;
    if (now > this.createdAt + this.maxGameDuration) {
      this.log.warn("game past max duration", {
        gameID: this.id,
      });
      return GamePhase.Finished;
    }

    const noRecentPings = now > this.lastPingUpdate + 20 * 1000;
    const noActive = this.activeClients.length === 0;

    if (this.gameConfig.gameType !== GameType.Public) {
      if (this._hasStarted) {
        if (noActive && noRecentPings) {
          this.log.info("private game complete", {
            gameID: this.id,
          });
          return GamePhase.Finished;
        } else {
          return GamePhase.Active;
        }
      } else {
        return GamePhase.Lobby;
      }
    }

    const msSinceCreation = now - this.createdAt;
    const lessThanLifetime = msSinceCreation < this.config.gameCreationRate();
    const notEnoughPlayers =
      this.gameConfig.gameType === GameType.Public &&
      this.gameConfig.maxPlayers &&
      (this.activeClients.length < this.gameConfig.maxPlayers ||
        this.aiPlayers.length > 0);
    if (lessThanLifetime && notEnoughPlayers) {
      return GamePhase.Lobby;
    }
    const warmupOver =
      now > this.createdAt + this.config.gameCreationRate() + 30 * 1000;
    if (noActive && warmupOver && noRecentPings) {
      return GamePhase.Finished;
    }

    return GamePhase.Active;
  }

  hasStarted(): boolean {
    return this._hasStarted || this._hasPrestarted;
  }

  public gameInfo(): GameInfo {
    return {
      gameID: this.id,
      clients: this.activeClients.map((c) => ({
        username: c.username,
        clientID: c.clientID,
        isCitizen: c.isCitizen,
      })),
      numClients: this.activeClients.length + this.aiPlayers.length,
      aiPlayersCount: this.aiPlayers.length,
      gameConfig: this.gameConfig,
      msUntilStart: this.isPublic()
        ? this.createdAt + this.config.gameCreationRate()
        : undefined,
    };
  }

  public isPublic(): boolean {
    return this.gameConfig.gameType === GameType.Public;
  }

  public isActive(): boolean {
    return this._hasStarted && !this._isEnded;
  }

  public kickClient(clientID: ClientID): void {
    if (this.kickedClients.has(clientID)) {
      this.log.warn(`cannot kick client, already kicked`, {
        clientID,
      });
      return;
    }
    const client = this.activeClients.find((c) => c.clientID === clientID);
    if (client) {
      this.log.info("Kicking client from game", {
        clientID: client.clientID,
        persistentID: client.persistentID,
      });
      client.ws.send(
        JSON.stringify({
          type: "error",
          error: "Kicked from game (you may have been playing on another tab)",
        } satisfies ServerErrorMessage),
      );
      client.ws.close(1000, "Kicked from game");
      this.activeClients = this.activeClients.filter(
        (c) => c.clientID !== clientID,
      );
      this.kickedClients.add(clientID);
    } else {
      this.log.warn(`cannot kick client, not found in game`, {
        clientID,
      });
    }
  }

  private checkDisconnectedStatus() {
    if (this.turns.length % 5 !== 0) {
      return;
    }

    const now = Date.now();
    for (const [clientID, client] of this.allClients) {
      const isDisconnected = this.isClientDisconnected(clientID);
      if (!isDisconnected && now - client.lastPing > this.disconnectedTimeout) {
        this.markClientDisconnected(clientID, true);
      } else if (
        isDisconnected &&
        now - client.lastPing < this.disconnectedTimeout
      ) {
        this.markClientDisconnected(clientID, false);
      }
    }
  }

  public isClientDisconnected(clientID: string): boolean {
    return this.clientsDisconnectedStatus.get(clientID) ?? true;
  }

  private markClientDisconnected(clientID: string, isDisconnected: boolean) {
    this.clientsDisconnectedStatus.set(clientID, isDisconnected);
    this.addIntent({
      type: "mark_disconnected",
      clientID: clientID,
      isDisconnected: isDisconnected,
    });
  }

  private archiveGame() {
    this.log.info("archiving game", {
      gameID: this.id,
      winner: this.winner?.winner,
    });

    // Players must stay in the same order as the game start info.
    const playerRecords: PlayerRecord[] = this.gameStartInfo.players.map(
      (player) => {
        const stats = this.winner?.allPlayersStats[player.clientID];
        if (stats === undefined) {
          this.log.warn(`Unable to find stats for clientID ${player.clientID}`);
        }
        return {
          clientID: player.clientID,
          username: player.username,
          persistentID:
            this.allClients.get(player.clientID)?.persistentID ?? "",
          stats,
          cosmetics: player.cosmetics,
          // From the frozen start roster, not the live client, so the record matches
          // exactly what every client in the match was shown (0068).
          isCitizen: player.isCitizen,
          clanTag: getClanTag(player.username) ?? undefined,
        } satisfies PlayerRecord;
      },
    );
    archive(
      finalizeGameRecord(
        createPartialGameRecord(
          this.id,
          this.gameStartInfo.config,
          playerRecords,
          this.turns,
          this._startTime ?? 0,
          Date.now(),
          this.winner?.winner,
        ),
      ),
    );
  }

  private handleSynchronization() {
    if (this.activeClients.length <= 1) {
      return;
    }
    if (this.turns.length % 10 !== 0 || this.turns.length < 10) {
      // Check hashes every 10 turns
      return;
    }

    const lastHashTurn = this.turns.length - 10;

    const { mostCommonHash, outOfSyncClients } =
      this.findOutOfSyncClients(lastHashTurn);

    if (outOfSyncClients.length === 0) {
      this.turns[lastHashTurn].hash = mostCommonHash;
      return;
    }

    const serverDesync = ServerDesyncSchema.safeParse({
      type: "desync",
      turn: lastHashTurn,
      correctHash: mostCommonHash,
      clientsWithCorrectHash:
        this.activeClients.length - outOfSyncClients.length,
      totalActiveClients: this.activeClients.length,
    });
    if (!serverDesync.success) {
      this.log.warn("failed to create desync message", {
        gameID: this.id,
        error: serverDesync.error,
      });
      return;
    }

    const desyncMsg = JSON.stringify(serverDesync.data);
    for (const c of outOfSyncClients) {
      this.outOfSyncClients.add(c.clientID);
      if (this.sentDesyncMessageClients.has(c.clientID)) {
        continue;
      }
      this.sentDesyncMessageClients.add(c.clientID);
      this.log.info("sending desync to client", {
        gameID: this.id,
        clientID: c.clientID,
        persistentID: c.persistentID,
      });
      c.ws.send(desyncMsg);
    }
  }

  findOutOfSyncClients(turnNumber: number): {
    mostCommonHash: number | null;
    outOfSyncClients: Client[];
  } {
    const counts = new Map<number, number>();

    // Count occurrences of each hash
    for (const client of this.activeClients) {
      if (client.hashes.has(turnNumber)) {
        const clientHash = client.hashes.get(turnNumber)!;
        counts.set(clientHash, (counts.get(clientHash) ?? 0) + 1);
      }
    }

    // Find the most common hash
    let mostCommonHash: number | null = null;
    let maxCount = 0;

    for (const [hash, count] of counts.entries()) {
      if (count > maxCount) {
        mostCommonHash = hash;
        maxCount = count;
      }
    }

    // Create a list of clients whose hash doesn't match the most common one
    let outOfSyncClients: Client[] = [];

    for (const client of this.activeClients) {
      if (client.hashes.has(turnNumber)) {
        const clientHash = client.hashes.get(turnNumber)!;
        if (clientHash !== mostCommonHash) {
          outOfSyncClients.push(client);
        }
      }
    }

    // If half clients out of sync assume all are out of sync.
    if (outOfSyncClients.length >= Math.floor(this.activeClients.length / 2)) {
      outOfSyncClients = this.activeClients;
    }

    return {
      mostCommonHash,
      outOfSyncClients,
    };
  }

  private handleWinner(client: Client, clientMsg: ClientSendWinnerMessage) {
    if (
      this.outOfSyncClients.has(client.clientID) ||
      this.kickedClients.has(client.clientID) ||
      this.winner !== null ||
      client.reportedWinner !== null
    ) {
      return;
    }
    client.reportedWinner = clientMsg.winner;

    // Add client vote
    const winnerKey = JSON.stringify(clientMsg.winner);
    if (!this.winnerVotes.has(winnerKey)) {
      this.winnerVotes.set(winnerKey, { ips: new Set(), winner: clientMsg });
    }
    const potentialWinner = this.winnerVotes.get(winnerKey)!;
    potentialWinner.ips.add(client.ip);

    // Prefer a vote that actually carries participation data. The stored message is
    // the first voter for this winner; if it was a version-skewed client without
    // playerParticipation, a later agreeing voter that has it must be used for
    // crediting instead — otherwise the whole match's XP is silently lost.
    if (
      potentialWinner.winner.playerParticipation === undefined &&
      clientMsg.playerParticipation !== undefined
    ) {
      potentialWinner.winner = clientMsg;
    }

    const activeUniqueIPs = new Set(this.activeClients.map((c) => c.ip));

    const ratio = `${potentialWinner.ips.size}/${activeUniqueIPs.size}`;
    this.log.info(
      `received winner vote ${clientMsg.winner}, ${ratio} votes for this winner`,
      {
        clientID: client.clientID,
      },
    );

    if (potentialWinner.ips.size * 2 < activeUniqueIPs.size) {
      return;
    }

    // Vote succeeded
    this.winner = potentialWinner.winner;
    this.log.info(
      `Winner determined by ${potentialWinner.ips.size}/${activeUniqueIPs.size} active IPs`,
      {
        winnerKey: winnerKey,
      },
    );
    this.archiveGame();
    // Fire-and-forget; must never block or error match cleanup. Runs exactly once
    // because this.winner is now set (re-entry returns at the guard above).
    this.creditMatchXp(potentialWinner.winner);
  }

  /**
   * IDENTITY-TRUST SEAM (s4-profile-06 / Yandex Payments task). The single place
   * that decides which Yandex id is trusted enough to credit/resolve. TODAY it
   * returns the client-asserted id as-is — an epic-accepted risk for *earned* XP
   * only (the id is a stable store key; paid entitlements are verified separately
   * by the Payments task). Server-side `getPlayer({ signed: true })` verification is
   * blocked until the Yandex secret key is issued (after in-app purchases are
   * enabled). When that lands, verify the signed payload HERE and return only the
   * verified id (or null) — the resolve / credit / qualification logic downstream
   * does not change.
   */
  private getCreditableYandexId(client: Client): string | null {
    return client.yandexPlayerId;
  }

  /**
   * Task 0272. Resolve this client's creditable identity to its internal profile
   * player id (fire-and-forget, fail-soft). Called when we first learn the id — at
   * join (a reconnect included) and on a late identity refresh. Unlike
   * `resolveProfilePlayer` it resolves even when an id is already known (e.g.
   * carried across a reconnect), because the response also refreshes the display-only
   * citizen flag (0068) — but it still shares a resolve that is already in flight.
   *
   * The join path awaits nothing: a dead or slow profile API cannot delay a join, it
   * just means the id and the flag are not there yet when `start()` freezes the
   * roster.
   */
  private resolveProfileForClient(client: Client): void {
    void this.startProfileResolve(client);
  }

  /**
   * Task 0272. The client's internal profile player id: the known one, the result of
   * a resolve already in flight, or a fresh resolve (the last one failed or never
   * ran). Resolves to null when there is no creditable identity or the resolve
   * failed. Never rejects.
   */
  private resolveProfilePlayer(client: Client): Promise<string | null> {
    if (this.getCreditableYandexId(client) === null) {
      return Promise.resolve(null);
    }
    if (client.profilePlayerId !== null) {
      return Promise.resolve(client.profilePlayerId);
    }
    return this.startProfileResolve(client);
  }

  /** Share the in-flight resolve for this client object, or start one. Never rejects. */
  private startProfileResolve(client: Client): Promise<string | null> {
    // The ONLY reader of the identity on this path (ADR-103).
    const creditableId = this.getCreditableYandexId(client);
    if (creditableId === null) {
      return Promise.resolve(null);
    }
    const inFlight = this.profileResolves.get(client);
    if (inFlight !== undefined) {
      return inFlight;
    }
    const resolving = this.profileApiClient
      .resolvePlayer(creditableId)
      .then((resolved) => {
        if (resolved === null) {
          return null;
        }
        client.profilePlayerId = resolved.playerId;
        // Only ever set true. A `false` or a failed resolve means "not a citizen OR
        // the lookup failed", so clearing on it would let a transient outage blink a
        // citizen's icon off.
        if (resolved.isCitizen) {
          client.isCitizen = true;
        }
        return resolved.playerId;
      })
      // Belt-and-braces: resolvePlayer is contractually non-throwing, but this is on
      // the join path — a rejection must not become an unhandled rejection here.
      .catch(() => null)
      .finally(() => {
        this.profileResolves.delete(client);
      });
    this.profileResolves.set(client, resolving);
    return resolving;
  }

  /**
   * Credit match-end XP to qualifying authenticated players. Fire-and-forget and
   * fail-soft. The winner message's `playerParticipation` is the authoritative
   * end-of-match snapshot (built by the client, which alone knows spawn/alive state);
   * the server makes the decision and the write, combining participation with its own
   * per-client state (kicked / disconnected / the trusted Yandex id).
   */
  private creditMatchXp(winnerMsg: ClientSendWinnerMessage): void {
    const participation = winnerMsg.playerParticipation;
    if (participation === undefined) {
      // The deciding client sent no participation (e.g. a version-skewed first
      // voter on a rolling deploy). The whole match's crediting is silently lost
      // otherwise, so make it visible.
      this.log.warn(
        "winner message had no playerParticipation; match-end XP crediting skipped",
      );
      return;
    }
    if (participation.length === 0) {
      return;
    }
    if (this.gameStartInfo === undefined) {
      // Defensive: a winner can only be determined after the game started, so this
      // should be unreachable. Without the frozen roster we cannot bound crediting.
      this.log.warn("no gameStartInfo at match end; XP crediting skipped");
      return;
    }
    this.creditParticipation(participation);
  }

  /**
   * Task 0211. Resolve a participation batch into credits and post them
   * (fire-and-forget, fail-soft). Shared by BOTH crediting paths: the whole-roster
   * batch from the winner message, and the one-entry batch built from a single
   * player's mid-match `participation` self-report.
   *
   * ⛔ The game id is read from `this.id` HERE, in the one place, and is deliberately
   * not a parameter: the profile server's `(game_id, player_id)` primary key is what
   * makes a player creditable at most once per match, and it stops working the
   * moment the two paths disagree about the game id. Making that unexpressible is
   * cheaper than testing for it — and it is tested anyway.
   *
   * Task 0272: credits are keyed by the internal player id. A qualifying client whose
   * id is not resolved yet (the join resolve failed or is still in flight) is resolved
   * first and credited after, off the hot path. The gates are judged on the state
   * snapshotted HERE, at trigger time: a client that disconnects during the resolve
   * still gets the credit it qualified for when the report arrived.
   *
   * Returns the number of credits posted or scheduled (0 when nothing qualified), so
   * the self-report path can tell a real credit from one dropped for a null Yandex id.
   */
  private creditParticipation(
    participation: readonly PlayerParticipation[],
  ): number {
    // Only credit players from the frozen start roster — not every connected client.
    // Client-supplied participation could otherwise name a post-start joiner /
    // spectator (present in allClients but not in this match) to mint them XP.
    const eligibleRoster = new Set(
      this.gameStartInfo.players.map((p) => p.clientID),
    );
    // Require a live connection at the moment of crediting — match end on the winner
    // path, the report itself on the self-report path. A client that closed its tab
    // is removed from activeClients immediately (the "close" handler), whereas
    // isClientDisconnected only flips after the 60s ping timeout — so gate on both
    // to exclude last-second leavers without changing the broadcast disconnect timing.
    const activeClientIDs = new Set(this.activeClients.map((c) => c.clientID));
    const clientStateById = new Map<ClientID, ClientCreditState>();
    const clientById = new Map<ClientID, Client>();
    for (const [clientID, client] of this.allClients) {
      clientById.set(clientID, client);
      clientStateById.set(clientID, {
        playerId: client.profilePlayerId,
        identityKnown: this.getCreditableYandexId(client) !== null,
        kicked: this.kickedClients.has(clientID),
        disconnected:
          this.isClientDisconnected(clientID) || !activeClientIDs.has(clientID),
      });
    }
    const credits = selectMatchCredits(
      this.id,
      participation,
      clientStateById,
      eligibleRoster,
    );
    if (credits.length > 0) {
      this.log.info(`crediting ${credits.length} player(s) match XP`);
      void this.profileApiClient.creditMatch(credits);
    }
    const unresolved = selectUnresolvedCreditClients(
      participation,
      clientStateById,
      eligibleRoster,
    );
    if (unresolved.length > 0) {
      void this.resolveThenCredit(
        unresolved.map((clientID) => ({
          clientID,
          // Trigger-time objects: a reconnect during the resolve must not swap in a
          // different socket's id.
          client: clientById.get(clientID)!,
        })),
        participation,
        clientStateById,
        eligibleRoster,
        new Set(credits.map((credit) => credit.playerId)),
      );
    }
    return credits.length + unresolved.length;
  }

  /**
   * Task 0272. Resolve the qualifying clients whose player id was unknown at trigger
   * time, then credit them — sharing any resolve already in flight (e.g. the join's).
   * Posts once, and skips a player the synchronous batch already posted. A client
   * whose resolve fails again is not credited: the same outage class as ADR-101, an
   * owner-accepted loss (no durable queue). Never throws.
   */
  private async resolveThenCredit(
    unresolved: readonly { clientID: ClientID; client: Client }[],
    participation: readonly PlayerParticipation[],
    snapshot: ReadonlyMap<ClientID, ClientCreditState>,
    eligibleRoster: ReadonlySet<ClientID>,
    alreadyPosted: ReadonlySet<string>,
  ): Promise<void> {
    try {
      const resolvedIds = await Promise.all(
        unresolved.map(({ client }) => this.resolveProfilePlayer(client)),
      );
      const resolvedStateById = new Map<ClientID, ClientCreditState>();
      unresolved.forEach(({ clientID }, index) => {
        resolvedStateById.set(clientID, {
          ...snapshot.get(clientID)!,
          playerId: resolvedIds[index],
        });
      });
      const unresolvedIds = new Set(unresolved.map(({ clientID }) => clientID));
      const credits = selectMatchCredits(
        this.id,
        participation.filter((p) => unresolvedIds.has(p.clientID)),
        resolvedStateById,
        eligibleRoster,
      ).filter((credit) => !alreadyPosted.has(credit.playerId));
      // Review R1 / ADR-101 re-raise trigger 2: an award dropped here must be counted
      // like any other dropped award, so warn with the count in the same
      // `N award(s) dropped` wording. Counted per creditable identity, so one account
      // on two connections is one award. Quiet when the client is not configured:
      // with PROFILE_INTERNAL_TOKEN blank every resolve is null and nothing is lost.
      // ⛔ No ids in the line.
      if (this.profileApiClient.isConfigured()) {
        const droppedIdentities = new Set<string>();
        const resolvedIdentities = new Set<string>();
        unresolved.forEach(({ client }, index) => {
          const creditableId = this.getCreditableYandexId(client);
          if (creditableId === null) return;
          if (resolvedIds[index] === null) {
            droppedIdentities.add(creditableId);
          } else {
            resolvedIdentities.add(creditableId);
          }
        });
        // A sibling connection of the same account that DID resolve was credited.
        for (const identity of resolvedIdentities) {
          droppedIdentities.delete(identity);
        }
        if (droppedIdentities.size > 0) {
          this.log.warn(
            `player resolve failed at credit time; ${droppedIdentities.size} award(s) dropped (no durable retry — ADR-101)`,
          );
        }
      }
      if (credits.length === 0) {
        return;
      }
      this.log.info(
        `crediting ${credits.length} player(s) match XP after resolve`,
      );
      await this.profileApiClient.creditMatch(credits);
    } catch (error) {
      // Defensive: fire-and-forget off the match path — must never reject.
      this.log.warn(
        `unexpected error in resolve-then-credit: ${String(error)}`,
      );
    }
  }

  /**
   * Task 0211. A player's own report that THEIR match is over — they were
   * eliminated, or they survived a match the simulation says can never declare a
   * winner. Credits that one player, mid-match, through the same resolution the
   * winner path uses.
   *
   * ⚠️ The alive/dead claim itself is NOT corroborated; everything around it is. A
   * modified client can claim an elimination it did not suffer and collect 1 XP for a
   * match it spawned into — it cannot collect for anyone else (no clientID on the
   * wire), cannot collect without a server-observed spawn, and cannot collect twice
   * (the profile server's primary key). That residual is accepted on ADR-103's
   * reasoning: the identity being credited is itself client-asserted and unverified,
   * so hardening this claim would be hardening the stronger link.
   */
  private handleParticipation(
    client: Client,
    clientMsg: ClientParticipationMessage,
  ): void {
    // Guards mirror handleWinner's, in the same order, plus the two this path adds.
    if (
      this.outOfSyncClients.has(client.clientID) ||
      this.kickedClients.has(client.clientID) ||
      this.participationCredited.has(client.clientID)
    ) {
      return;
    }
    if (this.gameStartInfo === undefined) {
      // No frozen roster yet ⇒ nothing to bound crediting by. A report can only
      // follow a spawn, so this should be unreachable.
      this.log.warn("participation report before game start; ignored", {
        clientID: client.clientID,
      });
      return;
    }
    if (
      !this.gameStartInfo.players.some((p) => p.clientID === client.clientID)
    ) {
      return;
    }
    // First-hand: this relay saw the spawn intent itself.
    if (!this.spawnedClients.has(client.clientID)) {
      return;
    }
    this.participationClaims.set(client.clientID, clientMsg);
    this.creditFromParticipationClaim(client.clientID, clientMsg);
  }

  /**
   * Task 0211. Post the one-entry batch for a retained self-report. Shared by the
   * report itself and by the late-identity retry, so both build the entry the same
   * way.
   */
  private creditFromParticipationClaim(
    clientID: ClientID,
    claim: ClientParticipationMessage,
  ): void {
    const credited = this.creditParticipation([
      {
        // The AUTHENTICATED socket's clientID, never anything off the wire.
        clientID,
        hasSpawned: claim.hasSpawned,
        isAliveAtEnd: claim.isAliveNow,
        killedAt: claim.killedAt,
      },
    ]);
    if (credited > 0) {
      this.participationCredited.add(clientID);
    }
  }

  /**
   * Task 0211. A report that arrived while this client's Yandex id was still null was
   * dropped (fail-soft) but retained. Now that the id resolved, try once more.
   */
  private retryParticipationAfterIdentityRefresh(client: Client): void {
    if (this.participationCredited.has(client.clientID)) {
      return;
    }
    const claim = this.participationClaims.get(client.clientID);
    if (claim === undefined) {
      return;
    }
    this.creditFromParticipationClaim(client.clientID, claim);
  }
}
