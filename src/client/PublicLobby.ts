import { LitElement, html } from "lit";
import { customElement, state } from "lit/decorators.js";
import { renderDuration, translateText } from "../client/Utils";
import { GameMapType, GameMode } from "../core/game/Game";
import { GameID, GameInfo } from "../core/Schemas";
import { generateID } from "../core/Util";
import { JoinLobbyEvent } from "./Main";
import { terrainMapFileLoader } from "./TerrainMapFileLoader";
import { flashist_logEventAnalytics, flashist_waitGameInitComplete, flashistConstants } from "./flashist/FlashistFacade";
import { FlashistFacade } from "./flashist/FlashistFacade";
import { isDevModeEnabled, onDevModeChange } from "./DevMode";

@customElement("public-lobby")
export class PublicLobby extends LitElement {
  @state() private lobbies: GameInfo[] = [];
  @state() public isLobbyHighlighted: boolean = false;
  @state() private isButtonDebounced: boolean = false;
  @state() private mapImages: Map<GameID, string> = new Map();
  private lobbiesInterval: number | null = null;
  private currLobby: GameInfo | null = null;
  private debounceDelay: number = 750;
  private lobbyIDToStart = new Map<GameID, number>();
  private lobbiesFetchInFlight: Promise<GameInfo[]> | null = null;
  private devModeUnsubscribe: (() => void) | null = null;

  createRenderRoot() {
    return this;
  }

  connectedCallback() {
    super.connectedCallback();

    // Flashist Adaptation
    flashist_waitGameInitComplete()
      .then(
        () => {
          this.fetchAndUpdateLobbies();
          this.lobbiesInterval = window.setInterval(
            () => this.fetchAndUpdateLobbies(),
            1000,
          );
        }
      );

    this.devModeUnsubscribe = onDevModeChange(() => {
      this.requestUpdate();
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.lobbiesInterval !== null) {
      clearInterval(this.lobbiesInterval);
      this.lobbiesInterval = null;
    }
    if (this.devModeUnsubscribe) {
      this.devModeUnsubscribe();
      this.devModeUnsubscribe = null;
    }
  }

  private async fetchAndUpdateLobbies(): Promise<void> {
    try {
      this.lobbies = await this.fetchLobbies();
      this.lobbies.forEach((l) => {
        // Store the start time on first fetch because endpoint is cached, causing
        // the time to appear irregular.
        if (!this.lobbyIDToStart.has(l.gameID)) {
          const msUntilStart = l.msUntilStart ?? 0;
          this.lobbyIDToStart.set(l.gameID, msUntilStart + Date.now());
        }

        // Load map image if not already loaded
        if (l.gameConfig && !this.mapImages.has(l.gameID)) {
          this.loadMapImage(l.gameID, l.gameConfig.gameMap);
        }
      });
    } catch (error) {
      console.error("Error fetching lobbies:", error);
    }
  }

  private async loadMapImage(gameID: GameID, gameMap: string) {
    try {
      // Convert string to GameMapType enum value
      const mapType = gameMap as GameMapType;
      const data = terrainMapFileLoader.getMapData(mapType);
      this.mapImages.set(gameID, await data.webpPath());
      this.requestUpdate();
    } catch (error) {
      console.error("Failed to load map image:", error);
    }
  }

  async fetchLobbies(): Promise<GameInfo[]> {
    if (this.lobbiesFetchInFlight) {
      return this.lobbiesFetchInFlight;
    }

    this.lobbiesFetchInFlight = (async () => {
      try {
        const response = await fetch(`/api/public_lobbies`);
        if (!response.ok)
          throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        return data.lobbies as GameInfo[];
      } catch (error) {
        console.error("Error fetching lobbies:", error);
        throw error;
      } finally {
        this.lobbiesFetchInFlight = null;
      }
    })();

    return this.lobbiesFetchInFlight;
  }

  public stop() {
    if (this.lobbiesInterval !== null) {
      this.isLobbyHighlighted = false;
      clearInterval(this.lobbiesInterval);
      this.lobbiesInterval = null;
    }
  }

  render() {
    if (this.lobbies.length === 0) return html``;

    const lobby = this.lobbies[0];
    if (!lobby?.gameConfig) {
      return;
    }
    const start = this.lobbyIDToStart.get(lobby.gameID) ?? 0;
    const timeRemaining = Math.max(0, Math.floor((start - Date.now()) / 1000));

    // Format time to show minutes and seconds
    const timeDisplay = renderDuration(timeRemaining);

    const teamCount =
      lobby.gameConfig.gameMode === GameMode.Team
        ? (lobby.gameConfig.playerTeams ?? 0)
        : null;

    const mapImageSrc = this.mapImages.get(lobby.gameID);
    const aiPlayersCount = lobby.aiPlayersCount ?? 0;
    const playerCountDisplay = isDevModeEnabled()
      ? `${lobby.numClients} / ${lobby.gameConfig.maxPlayers} (${aiPlayersCount})`
      : `${lobby.numClients} / ${lobby.gameConfig.maxPlayers}`;

    return html`
      <button
        @click=${() => this.lobbyClicked(lobby)}
        ?disabled=${this.isButtonDebounced}
        class="isolate grid h-40 grid-cols-[100%] grid-rows-[100%] place-content-stretch w-full overflow-hidden ${this
        .isLobbyHighlighted
        ? "bg-gradient-to-r from-green-600 to-green-500"
        : "bg-gradient-to-r from-blue-600 to-blue-500"} text-white font-medium rounded-xl transition-opacity duration-200 hover:opacity-90 ${this
          .isButtonDebounced
          ? "opacity-70 cursor-not-allowed"
          : ""}"
      >
        ${mapImageSrc
        ? html`<img
              src="${mapImageSrc}"
              alt="${lobby.gameConfig.gameMap}"
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
            <div class="text-lg md:text-2xl font-semibold">
              ${translateText("public_lobby.join")}
            </div>
            <div class="text-md font-medium text-blue-100">
              <span
                class="text-sm ${this.isLobbyHighlighted
        ? "text-green-600"
        : "text-blue-600"} bg-white rounded-sm px-1"
              >
                ${lobby.gameConfig.gameMode === GameMode.Team
        ? typeof teamCount === "string"
          ? translateText(`public_lobby.teams_${teamCount}`)
          : translateText("public_lobby.teams", {
            num: teamCount ?? 0,
          })
        : translateText("game_mode.ffa")}</span
              >
              <span
                >${translateText(
          `map.${lobby.gameConfig.gameMap.toLowerCase().replace(/\s+/g, "")}`,
        )}</span
              >
            </div>
          </div>

          <div>
            <div class="text-md font-medium text-blue-100">
              ${playerCountDisplay}
            </div>
            <div class="text-md font-medium text-blue-100">${timeDisplay}</div>
          </div>
        </div>
      </button>
    `;
  }

  leaveLobby() {
    this.isLobbyHighlighted = false;
    this.currLobby = null;
  }

  // Flashist Adaptation
  // private lobbyClicked(lobby: GameInfo) {
  private async lobbyClicked(lobby: GameInfo) {
    if (this.isButtonDebounced) {
      return;
    }

    //
    flashist_logEventAnalytics(
      flashistConstants.analyticEvents.UI_CLICK_MULTIPLAYER_BUTTON
    );

    // Set debounce state
    this.isButtonDebounced = true;

    // Reset debounce after delay
    setTimeout(() => {
      this.isButtonDebounced = false;
    }, this.debounceDelay);

    if (this.currLobby === null) {
      this.isLobbyHighlighted = true;
      this.currLobby = lobby;

      this.dispatchEvent(
        new CustomEvent("join-lobby", {
          detail: {
            gameID: lobby.gameID,
            clientID: generateID(),
          } as JoinLobbyEvent,
          bubbles: true,
          composed: true,
        }),
      );

      // Flashist Adaptation: show interstitial ad when enough time and slots remain before game start
      // IMPORTANT: showing the adv AFTER we sent command to join the lobby
      // to make sure that the adv is not disrupting anything from the joining process
      // and the current user "reserves" a seat for them to play
      const startTime = this.lobbyIDToStart.get(lobby.gameID) ?? 0;
      const timeRemaining = Math.max(
        0,
        Math.floor((startTime - Date.now()) / 1000),
      );
      const maxPlayers = lobby.gameConfig?.maxPlayers ?? 0;
      const currentPlayers = lobby.numClients ?? lobby.clients?.length ?? 0;
      const openSlots = Math.max(0, maxPlayers - currentPlayers);
      // Flashist Adaptation: Show interstitial ads only for the cases when there is enough time for it
      // and when there are still some avaialble slots for other people to join
      // (otherwise, the game would start earielr, than should)
      if (timeRemaining >= 30 && openSlots >= 5) {
        try {
          await FlashistFacade.instance.showInterstitial();
        } catch (error) {
          console.error("Failed to show interstitial:", error);
        }
      }

    } else {
      this.dispatchEvent(
        new CustomEvent("leave-lobby", {
          detail: { lobby: this.currLobby },
          bubbles: true,
          composed: true,
        }),
      );
      this.leaveLobby();
    }
  }
}
