import { LitElement, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { GameID, GameInfo } from "../core/Schemas";
import { GameMode, GameMapType } from "../core/game/Game";
import { generateID } from "../core/Util";
import { flashist_waitGameInitComplete } from "./FlashistFacade";
import { JoinLobbyEvent } from "./Main";
import { renderDuration, translateText } from "./Utils";
import { terrainMapFileLoader } from "./TerrainMapFileLoader";

@customElement("observe-open-games")
export class ObserveOpenGames extends LitElement {
  @property({ type: Number })
  limit = 2;

  @state()
  private games: GameInfo[] = [];

  @state()
  private isLoading = true;

  @state()
  private error: string | null = null;

  @state()
  private now: number = Date.now();

  @state()
  private mapImages: Map<GameID, string> = new Map();

  private refreshInterval: number | null = null;
  private tickerInterval: number | null = null;
  private isReady = false;

  createRenderRoot() {
    return this;
  }

  connectedCallback() {
    super.connectedCallback();
    flashist_waitGameInitComplete().then(() => {
      this.isReady = true;
      this.fetchGames();
      this.refreshInterval = window.setInterval(
        () => this.fetchGames(),
        5000,
      );
      this.tickerInterval = window.setInterval(() => {
        this.now = Date.now();
      }, 1000);
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.refreshInterval !== null) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
    if (this.tickerInterval !== null) {
      clearInterval(this.tickerInterval);
      this.tickerInterval = null;
    }
  }

  private sanitizeLimit(): number {
    if (!Number.isFinite(this.limit)) {
      return 5;
    }
    return Math.max(1, Math.min(Number(this.limit), 20));
  }

  private async fetchGames(): Promise<void> {
    if (!this.isReady) return;

    try {
      this.error = null;
      const limit = this.sanitizeLimit();
      const response = await fetch(`/api/public_active_games?limit=${limit}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      this.games = Array.isArray(data.games) ? data.games : [];
      this.games.forEach((game) => {
        if (game.gameConfig && !this.mapImages.has(game.gameID)) {
          this.loadMapImage(game.gameID, game.gameConfig.gameMap);
        }
      });
    } catch (error) {
      console.error("Error fetching active games:", error);
      this.error = translateText("observe_games.error");
    } finally {
      this.isLoading = false;
    }
  }

  private async loadMapImage(gameID: GameID, gameMap: string) {
    try {
      const mapType = gameMap as GameMapType;
      const data = terrainMapFileLoader.getMapData(mapType);
      this.mapImages.set(gameID, await data.webpPath());
      this.requestUpdate();
    } catch (error) {
      console.error("Failed to load map image:", error);
    }
  }

  private observe(game: GameInfo): void {
    this.dispatchEvent(
      new CustomEvent("join-lobby", {
        detail: {
          gameID: game.gameID,
          clientID: generateID(),
        } as JoinLobbyEvent,
        bubbles: true,
        composed: true,
      }),
    );
  }

  private renderGame(game: GameInfo) {
    if (!game.gameConfig) {
      return null;
    }
    const playerCount = game.numClients ?? game.clients?.length ?? 0;
    const maxPlayers = game.gameConfig.maxPlayers ?? "?";
    const startReference = game.startedAt ?? game.createdAt ?? Date.now();
    const secondsSinceStart = Math.max(
      0,
      Math.floor((this.now - startReference) / 1000),
    );
    const mapKey = `map.${game.gameConfig.gameMap
      .toLowerCase()
      .replace(/\s+/g, "")}`;
    const isTeamGame = game.gameConfig.gameMode === GameMode.Team;
    const timeDisplay = translateText("observe_games.started", {
      time: renderDuration(secondsSinceStart),
    });
    const playerText = translateText("observe_games.players", {
      current: playerCount,
      max: maxPlayers,
    });
    const mapImageSrc = this.mapImages.get(game.gameID);

    let modeText = translateText("game_mode.ffa");
    if (isTeamGame) {
      const teamCount = game.gameConfig.playerTeams;
      modeText =
        teamCount && typeof teamCount !== "number"
          ? translateText(`public_lobby.teams_${teamCount}`)
          : translateText("public_lobby.teams", {
            num: teamCount ?? 0,
          });
    }

    return html`
      <button
        class="isolate grid h-32 grid-cols-[100%] grid-rows-[100%] place-content-stretch w-full overflow-hidden bg-gradient-to-r from-blue-600 to-blue-500 text-white font-medium rounded-xl transition-opacity duration-200 hover:opacity-90"
        @click=${() => this.observe(game)}
      >
        ${mapImageSrc
        ? html`<img
              src="${mapImageSrc}"
              alt="${game.gameConfig.gameMap}"
              class="place-self-start col-span-full row-span-full h-full -z-10"
              style="mask-image: linear-gradient(to left, transparent, #fff)"
            />`
        : html`<div
              class="place-self-start col-span-full row-span-full h-full -z-10 bg-gray-300"
            ></div>`}
        <div
          class="flex flex-col justify-between h-full col-span-full row-span-full p-4 md:p-6 text-right z-0"
        >
          <div>
            
            <div class="text-sm font-medium text-blue-100">
              <span class="text-sm text-blue-600 bg-white rounded-sm px-1">
                ${modeText}
              </span>
              <span>${translateText(mapKey)}</span>
            </div>
          </div>

          <div>
            <div class="text-sm font-medium text-blue-100">
              ${playerText}
            </div>
            <div class="text-sm font-medium text-blue-100">${timeDisplay}</div>
          </div>
        </div>
      </button>
    `;
  }

  render() {
    if (this.isLoading && this.games.length === 0) {
      return html`
        <div
          class="mt-4 rounded-xl bg-white/80 dark:bg-slate-800/70 p-4 border border-slate-300/80 dark:border-slate-600/60"
        >
          <div class="text-base text-slate-600 dark:text-slate-300">
            ${translateText("observe_games.loading")}
          </div>
        </div>
      `;
    }

    if (this.error) {
      return html`
        <div
          class="mt-4 rounded-xl bg-white/80 dark:bg-slate-800/70 p-4 border border-red-400 text-red-600 dark:text-red-300"
        >
          ${this.error}
        </div>
      `;
    }

    if (this.games.length === 0) {
      return html`
        <div
          class="mt-4 rounded-xl bg-white/80 dark:bg-slate-800/70 p-4 border border-slate-300/80 dark:border-slate-600/60"
        >
          <div class="text-base text-slate-600 dark:text-slate-300">
            ${translateText("observe_games.empty")}
          </div>
        </div>
      `;
    }

    return html`
      <div class="mt-4 flex flex-col gap-3 rounded-xl border border-slate-300/80 bg-white/80 p-4 dark:border-slate-600/60 dark:bg-slate-800/70">
        <div class="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-2">
          ${translateText("observe_games.title")}
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
          ${this.games.map(
      (game) =>
        // html`<div class="w-full">${this.renderGame(game)}</div>`,
        html`${this.renderGame(game)}`,
    )}
        </div>
      </div>
    `;
  }
}
