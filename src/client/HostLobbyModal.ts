import { LitElement, html } from "lit";
import { customElement, query, state } from "lit/decorators.js";
import randomMap from "../../resources/images/RandomMap.webp";
import { translateText } from "../client/Utils";
import { getServerConfigFromClient } from "../core/configuration/ConfigLoader";
import {
  Difficulty,
  Duos,
  GameMapSize,
  GameMapType,
  GameMode,
  HumansVsNations,
  Quads,
  Trios,
  UnitType,
  mapCategories,
} from "../core/game/Game";
import { UserSettings } from "../core/game/UserSettings";
import {
  ClientInfo,
  GameConfig,
  GameInfo,
  TeamCountConfig,
} from "../core/Schemas";
import {
  formatLobbyCodeForDisplay,
  generatePrivateLobbyCode,
} from "../core/PrivateLobbyCode";
import { generateID } from "../core/Util";
import { renderCitizenBadge } from "./CitizenBadge";
import "./components/baseComponents/Modal";
import "./components/Difficulties";
import "./components/Maps";
import { JoinLobbyEvent } from "./Main";
import { inviteCopyText } from "./PrivateLobbyInvite";
import { beginJoiningLobby } from "./StartScreenPresence";
import { renderUnitTypeOptions } from "./utilities/RenderUnitTypeOptions";
import { FlashistFacade } from "./flashist/FlashistFacade";

@customElement("host-lobby-modal")
export class HostLobbyModal extends LitElement {
  @query("o-modal") private modalEl!: HTMLElement & {
    open: () => void;
    close: () => void;
    isModalOpen: boolean;
  };
  @state() private selectedMap: GameMapType = GameMapType.World;
  @state() private selectedDifficulty: Difficulty = Difficulty.Medium;
  @state() private disableNPCs = false;
  @state() private gameMode: GameMode = GameMode.FFA;
  @state() private teamCount: TeamCountConfig = 2;
  @state() private bots: number = 400;
  @state() private infiniteGold: boolean = false;
  @state() private donateGold: boolean = false;
  @state() private infiniteTroops: boolean = false;
  @state() private donateTroops: boolean = false;
  @state() private maxTimer: boolean = false;
  @state() private maxTimerValue: number | undefined = undefined;
  @state() private instantBuild: boolean = false;
  @state() private compactMap: boolean = false;
  @state() private lobbyId = "";
  @state() private copySuccess = false;
  // Task 0380: both the Yandex SDK copy and the browser copy failed.
  @state() private copyFailed = false;
  @state() private clients: ClientInfo[] = [];
  @state() private useRandomMap: boolean = false;
  @state() private disabledUnits: UnitType[] = [];
  @state() private lobbyCreatorClientID: string = "";
  @state() private lobbyIdVisible: boolean = true;
  // Task 0302: the last Start attempt was refused or failed. Shown inline so the
  // host stays in the lobby with their friends and can retry.
  @state() private startFailed = false;
  // Task 0302, review R3: a Start is in flight (ad, config save, up to ~5 s of
  // server wait). A second tap is ignored and the button is disabled meanwhile.
  @state() private isStarting = false;
  // Review R7: bumped by open(). A Start begun in an earlier opening (e.g. an ad
  // call that never answered) must neither clear the new opening's in-flight
  // flag nor go on to start the new lobby.
  // Task 0327: also bumped by every close, so neither a Start nor a lobby still
  // being created acts on a lobby whose window has closed.
  private openGeneration = 0;
  // Task 0327: this opening has dispatched `join-lobby`, so a close the host
  // makes must leave the lobby.
  private hasJoinedLobby = false;
  // Task 0374: joining marks this window still holds, so a close ends them
  // instead of leaving them to a request that may hang.
  private joiningMarkEnds = new Set<() => void>();

  private playersInterval: NodeJS.Timeout | null = null;
  // Add a new timer for debouncing bot changes
  private botsUpdateTimer: number | null = null;
  private userSettings: UserSettings = new UserSettings();

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener("keydown", this.handleKeyDown);
  }

  disconnectedCallback() {
    window.removeEventListener("keydown", this.handleKeyDown);
    super.disconnectedCallback();
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (e.code === "Escape") {
      e.preventDefault();
      // Task 0327: a window-wide listener, so it also fires while the window is
      // hidden — including in a match, where a leave would end the match.
      if (this.modalEl?.isModalOpen) {
        this.modalEl.close();
      }
    }
  };

  render() {
    return html`
      <o-modal
        title=${translateText("host_modal.title")}
        @modal-close=${this.handleModalClose}
      >
        <div class="lobby-id-box">
          <button class="lobby-id-button">
            <!-- Visibility toggle icon on the left -->
            ${
              this.lobbyIdVisible
                ? html`<svg
                    class="visibility-icon"
                    @click=${() => {
                      this.lobbyIdVisible = !this.lobbyIdVisible;
                      this.requestUpdate();
                    }}
                    style="margin-right: 8px; cursor: pointer;"
                    stroke="currentColor"
                    fill="currentColor"
                    stroke-width="0"
                    viewBox="0 0 512 512"
                    height="18px"
                    width="18px"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M256 105c-101.8 0-188.4 62.7-224 151 35.6 88.3 122.2 151 224 151s188.4-62.7 224-151c-35.6-88.3-122.2-151-224-151zm0 251.7c-56 0-101.7-45.7-101.7-101.7S200 153.3 256 153.3 357.7 199 357.7 255 312 356.7 256 356.7zm0-161.1c-33 0-59.4 26.4-59.4 59.4s26.4 59.4 59.4 59.4 59.4-26.4 59.4-59.4-26.4-59.4-59.4-59.4z"
                    ></path>
                  </svg>`
                : html`<svg
                    class="visibility-icon"
                    @click=${() => {
                      this.lobbyIdVisible = !this.lobbyIdVisible;
                      this.requestUpdate();
                    }}
                    style="margin-right: 8px; cursor: pointer;"
                    stroke="currentColor"
                    fill="currentColor"
                    stroke-width="0"
                    viewBox="0 0 512 512"
                    height="18px"
                    width="18px"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M448 256s-64-128-192-128S64 256 64 256c32 64 96 128 192 128s160-64 192-128z"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="32"
                    ></path>
                    <path
                      d="M144 256l224 0"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="32"
                      stroke-linecap="round"
                    ></path>
                  </svg>`
            }
            <!-- Lobby ID (conditionally shown) -->
            <span class="lobby-id" @click=${this.copyToClipboard} style="cursor: pointer;">
              ${
                this.lobbyIdVisible
                  ? // Task 0389: `?? ""` — the create answer is not validated,
                    // and a missing gameID must not throw in render.
                    formatLobbyCodeForDisplay(this.lobbyId ?? "")
                  : "••••••••"
              }
            </span>

            <!-- Copy icon/success indicator -->
            <div @click=${this.copyToClipboard} style="margin-left: 8px; cursor: pointer;">
              ${
                this.copySuccess
                  ? html`<span class="copy-success-icon">✓</span>`
                  : html`
                      <svg
                        class="clipboard-icon"
                        stroke="currentColor"
                        fill="currentColor"
                        stroke-width="0"
                        viewBox="0 0 512 512"
                        height="18px"
                        width="18px"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M296 48H176.5C154.4 48 136 65.4 136 87.5V96h-7.5C106.4 96 88 113.4 88 135.5v288c0 22.1 18.4 40.5 40.5 40.5h208c22.1 0 39.5-18.4 39.5-40.5V416h8.5c22.1 0 39.5-18.4 39.5-40.5V176L296 48zm0 44.6l83.4 83.4H296V92.6zm48 330.9c0 4.7-3.4 8.5-7.5 8.5h-208c-4.4 0-8.5-4.1-8.5-8.5v-288c0-4.1 3.8-7.5 8.5-7.5h7.5v255.5c0 22.1 10.4 32.5 32.5 32.5H344v7.5zm48-48c0 4.7-3.4 8.5-7.5 8.5h-208c-4.4 0-8.5-4.1-8.5-8.5v-288c0-4.1 3.8-7.5 8.5-7.5H264v128h128v167.5z"
                        ></path>
                      </svg>
                    `
              }
            </div>
          </button>
        </div>
        ${
          FlashistFacade.instance.yaGamesAvailable
            ? html`<div
                id="host-lobby-invite-code-hint"
                class="text-sm text-center mt-2 opacity-80"
              >
                ${translateText("host_modal.invite_code_hint")}
              </div>`
            : ""
        }
        ${
          this.copyFailed
            ? html`<div
                id="host-lobby-copy-failed"
                class="text-red-400 text-sm text-center mt-2"
              >
                ${this.lobbyIdVisible
                  ? translateText("host_modal.copy_failed")
                  : translateText("host_modal.copy_failed_hidden")}
              </div>`
            : ""
        }
        <div class="options-layout">
          <!-- Map Selection -->
          <div class="options-section">
            <div class="option-title">${translateText("map.map")}</div>
            <div class="option-cards flex-col">
              <!-- Use the imported mapCategories -->
              ${Object.entries(mapCategories).map(
                ([categoryKey, maps]) => html`
                  <div class="w-full mb-4">
                    <h3
                      class="text-lg font-semibold mb-2 text-center text-gray-300"
                    >
                      ${translateText(`map_categories.${categoryKey}`)}
                    </h3>
                    <div class="flex flex-row flex-wrap justify-center gap-4">
                      ${maps.map((mapValue) => {
                        const mapKey = Object.keys(GameMapType).find(
                          (key) =>
                            GameMapType[key as keyof typeof GameMapType] ===
                            mapValue,
                        );
                        return html`
                          <div
                            @click=${() => this.handleMapSelection(mapValue)}
                          >
                            <map-display
                              .mapKey=${mapKey}
                              .selected=${!this.useRandomMap &&
                              this.selectedMap === mapValue}
                              .translation=${translateText(
                                `map.${mapKey?.toLowerCase()}`,
                              )}
                            ></map-display>
                          </div>
                        `;
                      })}
                    </div>
                  </div>
                `,
              )}
              <div
                class="option-card random-map ${
                  this.useRandomMap ? "selected" : ""
                }"
                @click=${this.handleRandomMapToggle}
              >
                <div class="option-image">
                  <img
                    src=${randomMap}
                    alt="Random Map"
                    style="width:100%; aspect-ratio: 4/2; object-fit:cover; border-radius:8px;"
                  />
                </div>
                <div class="option-card-title">
                  ${translateText("map.random")}
                </div>
              </div>
            </div>
          </div>

          <!-- Difficulty Selection -->
          <div class="options-section">
            <div class="option-title">${translateText("difficulty.difficulty")}</div>
            <div class="option-cards">
              ${Object.entries(Difficulty)
                .filter(([key]) => isNaN(Number(key)))
                .map(
                  ([key, value]) => html`
                    <div
                      class="option-card ${this.selectedDifficulty === value
                        ? "selected"
                        : ""}"
                      @click=${() => this.handleDifficultySelection(value)}
                    >
                      <difficulty-display
                        .difficultyKey=${key}
                      ></difficulty-display>
                      <p class="option-card-title">
                        ${translateText(`difficulty.${key}`)}
                      </p>
                    </div>
                  `,
                )}
            </div>
          </div>

          <!-- Game Mode Selection -->
          <div class="options-section">
            <div class="option-title">${translateText("host_modal.mode")}</div>
            <div class="option-cards">
              <div
                class="option-card ${this.gameMode === GameMode.FFA ? "selected" : ""}"
                @click=${() => this.handleGameModeSelection(GameMode.FFA)}
              >
                <div class="option-card-title">
                  ${translateText("game_mode.ffa")}
                </div>
              </div>
              <div
                class="option-card ${this.gameMode === GameMode.Team ? "selected" : ""}"
                @click=${() => this.handleGameModeSelection(GameMode.Team)}
              >
                <div class="option-card-title">
                  ${translateText("game_mode.teams")}
                </div>
              </div>
            </div>
          </div>

          ${
            this.gameMode === GameMode.FFA
              ? ""
              : html`
                  <!-- Team Count Selection -->
                  <div class="options-section">
                    <div class="option-title">
                      ${translateText("host_modal.team_count")}
                    </div>
                    <div class="option-cards">
                      ${[
                        2,
                        3,
                        4,
                        5,
                        6,
                        7,
                        Quads,
                        Trios,
                        Duos,
                        HumansVsNations,
                      ].map(
                        (o) => html`
                          <div
                            class="option-card ${this.teamCount === o
                              ? "selected"
                              : ""}"
                            @click=${() => this.handleTeamCountSelection(o)}
                          >
                            <div class="option-card-title">
                              ${typeof o === "string"
                                ? o === HumansVsNations
                                  ? translateText("public_lobby.teams_hvn")
                                  : translateText(`public_lobby.teams_${o}`)
                                : translateText("public_lobby.teams", {
                                    num: o,
                                  })}
                            </div>
                          </div>
                        `,
                      )}
                    </div>
                  </div>
                `
          }

          <!-- Game Options -->
          <div class="options-section">
            <div class="option-title">
              ${translateText("host_modal.options_title")}
            </div>
            <div class="option-cards">
                <label for="bots-count" class="option-card">
                  <input
                    type="range"
                    id="bots-count"
                    min="0"
                    max="400"
                    step="1"
                    @input=${this.handleBotsChange}
                    @change=${this.handleBotsChange}
                    .value="${String(this.bots)}"
                  />
                  <div class="option-card-title">
                    <span>${translateText("host_modal.bots")}</span>${
                      this.bots === 0
                        ? translateText("host_modal.bots_disabled")
                        : this.bots
                    }
                  </div>
                </label>

                ${
                  !(
                    this.gameMode === GameMode.Team &&
                    this.teamCount === HumansVsNations
                  )
                    ? html`
                        <label
                          for="disable-npcs"
                          class="option-card ${this.disableNPCs
                            ? "selected"
                            : ""}"
                        >
                          <div class="checkbox-icon"></div>
                          <input
                            type="checkbox"
                            id="disable-npcs"
                            @change=${this.handleDisableNPCsChange}
                            .checked=${this.disableNPCs}
                          />
                          <div class="option-card-title">
                            ${translateText("host_modal.disable_nations")}
                          </div>
                        </label>
                      `
                    : ""
                }

                <label
                  for="instant-build"
                  class="option-card ${this.instantBuild ? "selected" : ""}"
                >
                  <div class="checkbox-icon"></div>
                  <input
                    type="checkbox"
                    id="instant-build"
                    @change=${this.handleInstantBuildChange}
                    .checked=${this.instantBuild}
                  />
                  <div class="option-card-title">
                    ${translateText("host_modal.instant_build")}
                  </div>
                </label>

                <label
                  for="donate-gold"
                  class="option-card ${this.donateGold ? "selected" : ""}"
                >
                  <div class="checkbox-icon"></div>
                  <input
                    type="checkbox"
                    id="donate-gold"
                    @change=${this.handleDonateGoldChange}
                    .checked=${this.donateGold}
                  />
                  <div class="option-card-title">
                    ${translateText("host_modal.donate_gold")}
                  </div>
                </label>

                <label
                  for="donate-troops"
                  class="option-card ${this.donateTroops ? "selected" : ""}"
                >
                  <div class="checkbox-icon"></div>
                  <input
                    type="checkbox"
                    id="donate-troops"
                    @change=${this.handleDonateTroopsChange}
                    .checked=${this.donateTroops}
                  />
                  <div class="option-card-title">
                    ${translateText("host_modal.donate_troops")}
                  </div>
                </label>

                <label
                  for="infinite-gold"
                  class="option-card ${this.infiniteGold ? "selected" : ""}"
                >
                  <div class="checkbox-icon"></div>
                  <input
                    type="checkbox"
                    id="infinite-gold"
                    @change=${this.handleInfiniteGoldChange}
                    .checked=${this.infiniteGold}
                  />
                  <div class="option-card-title">
                    ${translateText("host_modal.infinite_gold")}
                  </div>
                </label>

                <label
                  for="infinite-troops"
                  class="option-card ${this.infiniteTroops ? "selected" : ""}"
                >
                  <div class="checkbox-icon"></div>
                  <input
                    type="checkbox"
                    id="infinite-troops"
                    @change=${this.handleInfiniteTroopsChange}
                    .checked=${this.infiniteTroops}
                  />
                  <div class="option-card-title">
                    ${translateText("host_modal.infinite_troops")}
                  </div>
                </label>
                <label
                for="host-modal-compact-map"
                class="option-card ${this.compactMap ? "selected" : ""}"
              >
                <div class="checkbox-icon"></div>
                <input
                  type="checkbox"
                  id="host-modal-compact-map"
                  @change=${this.handleCompactMapChange}
                  .checked=${this.compactMap}
                />
                <div class="option-card-title">
                  ${translateText("host_modal.compact_map")}
                </div>
              </label>

                <label
                  for="max-timer"
                class="option-card ${this.maxTimer ? "selected" : ""}"
                >
                  <div class="checkbox-icon"></div>
                  <input
                    type="checkbox"
                    id="max-timer"
                    @change=${(e: Event) => {
                      const checked = (e.target as HTMLInputElement).checked;
                      if (!checked) {
                        this.maxTimerValue = undefined;
                      }
                      this.maxTimer = checked;
                      this.putGameConfig();
                    }}
                    .checked=${this.maxTimer}
                  />
                    ${
                      this.maxTimer === false
                        ? ""
                        : html`<input
                            type="number"
                            id="end-timer-value"
                            min="1"
                            max="120"
                            .value=${String(this.maxTimerValue ?? "")}
                            style="width: 60px; color: black; text-align: right; border-radius: 8px;"
                            @input=${this.handleMaxTimerValueChanges}
                            @keydown=${this.handleMaxTimerValueKeyDown}
                          />`
                    }
                  <div class="option-card-title">
                    ${translateText("host_modal.max_timer")}
                  </div>
                </label>
                <hr style="width: 100%; border-top: 1px solid #444; margin: 16px 0;" />

                <!-- Individual disables for structures/weapons -->
                <div
                  style="margin: 8px 0 12px 0; font-weight: bold; color: #ccc; text-align: center;"
                >
                  ${translateText("host_modal.enables_title")}
                </div>
                <div
                  style="display: flex; flex-wrap: wrap; justify-content: center; gap: 12px;"
                >
                   ${renderUnitTypeOptions({
                     disabledUnits: this.disabledUnits,
                     toggleUnit: this.toggleUnit.bind(this),
                   })}
                  </div>
                </div>
              </div>
            </div>
          </div>

        <!-- Lobby Selection -->
        <div class="options-section">
          <div class="option-title">
            ${this.clients.length}
            ${
              this.clients.length === 1
                ? translateText("host_modal.player")
                : translateText("host_modal.players")
            }
          </div>

          <div class="players-list">
            ${this.clients.map(
              (client) => html`
                <span class="player-tag">
                  ${client.isCitizen ? renderCitizenBadge() : ""}
                  ${client.username}
                  ${client.clientID === this.lobbyCreatorClientID
                    ? html`<span class="host-badge"
                        >(${translateText("host_modal.host_badge")})</span
                      >`
                    : html`
                        <button
                          class="remove-player-btn"
                          @click=${() => this.kickPlayer(client.clientID)}
                          title="Remove ${client.username}"
                        >
                          ×
                        </button>
                      `}
                </span>
              `,
            )}
        </div>

        <div class="start-game-button-container">
          <button
            @click=${this.startGame}
            ?disabled=${this.clients.length < 2 || this.isStarting}
            class="start-game-button"
          >
            ${
              this.clients.length === 1
                ? translateText("host_modal.waiting")
                : translateText("host_modal.start")
            }
          </button>
          ${
            this.startFailed
              ? html`<div
                  id="host-lobby-start-failed"
                  class="text-red-400 text-sm text-center mt-2"
                >
                  ${translateText("host_modal.start_failed")}
                </div>`
              : ""
          }
        </div>

      </div>
    </o-modal>
    `;
  }

  createRenderRoot() {
    return this;
  }

  public open() {
    this.startFailed = false;
    // Review R7: a Start left hanging in an earlier opening must not keep this
    // one's Start disabled until a page reload.
    this.isStarting = false;
    // Task 0353 review R1: the poll waits for this opening's lobby, so an
    // earlier opening's players would otherwise stay listed (and Start enabled)
    // until it exists — for good, if the create fails.
    this.clients = [];
    this.openGeneration++;
    const generation = this.openGeneration;
    this.requestUpdate();
    this.lobbyCreatorClientID = generateID();
    this.lobbyIdVisible = this.userSettings.get(
      "settings.lobbyIdVisibility",
      true,
    );

    // Task 0336: creating the private lobby counts as joining one, so a waiting
    // tenure popup does not open over this window (0333's Create-tap leave wakes
    // it). Main's join-lobby handler begins its own mark before this one ends.
    // Task 0374: the mark ends when create settles or when the window closes,
    // whichever comes first.
    const endJoining = this.beginJoiningMark();
    const joined = createLobby(this.lobbyCreatorClientID).then((lobby) => {
      // Task 0327: the window closed (or reopened) while the lobby was being
      // created — do not join a lobby nobody is looking at.
      if (generation !== this.openGeneration) {
        return;
      }
      this.lobbyId = lobby.gameID;
      // join lobby
      this.hasJoinedLobby = true;
      this.dispatchEvent(
        new CustomEvent("join-lobby", {
          detail: {
            gameID: this.lobbyId,
            clientID: this.lobbyCreatorClientID,
          } as JoinLobbyEvent,
          bubbles: true,
          composed: true,
        }),
      );
    });
    // Task 0333: a failed create is already logged in createLobby(); nothing
    // else waits on this chain, so stop the rejection going unhandled.
    // Task 0336: however create settles, this window's join mark ends (a no-op
    // if a close already ended it, task 0374).
    joined.catch(() => {}).finally(endJoining);
    this.modalEl?.open();
    this.playersInterval = setInterval(() => this.pollPlayers(), 1000);
  }

  // Programmatic close (a successful Start, the match-start close list): never
  // leaves the lobby.
  public close() {
    this.reset();
    this.modalEl?.close();
  }

  // Task 0327 (owner ruling 2026-09-28, Q1 "Host leaves cleanly"): every close
  // the host makes (✕, a click outside, Escape) ends in o-modal's
  // `modal-close`. A joined host leaves the lobby exactly once; after a
  // programmatic close, reset() has already cleared `hasJoinedLobby`.
  private handleModalClose() {
    const wasJoined = this.hasJoinedLobby;
    const lobbyId = this.lobbyId;
    this.reset();
    if (!wasJoined) {
      return;
    }
    this.dispatchEvent(
      new CustomEvent("leave-lobby", {
        detail: { lobby: lobbyId },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private reset() {
    this.hasJoinedLobby = false;
    this.openGeneration++;
    // Task 0374: a closed window no longer counts as joining, even if its
    // create request is still running. Safe to run twice (o-modal's close()
    // fires modal-close after a programmatic close).
    this.endJoiningMarks();
    this.copySuccess = false;
    this.copyFailed = false;
    if (this.playersInterval) {
      clearInterval(this.playersInterval);
      this.playersInterval = null;
    }
    // Clear any pending bot updates
    if (this.botsUpdateTimer !== null) {
      clearTimeout(this.botsUpdateTimer);
      this.botsUpdateTimer = null;
    }
    this.requestUpdate();
  }

  // Task 0374: begin a joining mark this window can also end on close. The
  // returned end function is one-shot, so a late settle after a close does
  // nothing.
  private beginJoiningMark(): () => void {
    const end = beginJoiningLobby();
    const endThisMark = () => {
      this.joiningMarkEnds.delete(endThisMark);
      end(); // already one-shot in StartScreenPresence
    };
    this.joiningMarkEnds.add(endThisMark);
    return endThisMark;
  }

  private endJoiningMarks(): void {
    for (const end of [...this.joiningMarkEnds]) end();
  }

  private async handleRandomMapToggle() {
    this.useRandomMap = true;
    this.putGameConfig();
  }

  private async handleMapSelection(value: GameMapType) {
    this.selectedMap = value;
    this.useRandomMap = false;
    this.putGameConfig();
  }

  private async handleDifficultySelection(value: Difficulty) {
    this.selectedDifficulty = value;
    this.putGameConfig();
  }

  // Modified to include debouncing
  private handleBotsChange(e: Event) {
    const value = parseInt((e.target as HTMLInputElement).value);
    if (isNaN(value) || value < 0 || value > 400) {
      return;
    }

    // Update the display value immediately
    this.bots = value;

    // Clear any existing timer
    if (this.botsUpdateTimer !== null) {
      clearTimeout(this.botsUpdateTimer);
    }

    // Set a new timer to call putGameConfig after 300ms of inactivity
    this.botsUpdateTimer = window.setTimeout(() => {
      this.putGameConfig();
      this.botsUpdateTimer = null;
    }, 300);
  }

  private handleInstantBuildChange(e: Event) {
    this.instantBuild = Boolean((e.target as HTMLInputElement).checked);
    this.putGameConfig();
  }

  private handleInfiniteGoldChange(e: Event) {
    this.infiniteGold = Boolean((e.target as HTMLInputElement).checked);
    this.putGameConfig();
  }

  private handleDonateGoldChange(e: Event) {
    this.donateGold = Boolean((e.target as HTMLInputElement).checked);
    this.putGameConfig();
  }

  private handleInfiniteTroopsChange(e: Event) {
    this.infiniteTroops = Boolean((e.target as HTMLInputElement).checked);
    this.putGameConfig();
  }

  private handleCompactMapChange(e: Event) {
    this.compactMap = Boolean((e.target as HTMLInputElement).checked);
    this.putGameConfig();
  }

  private handleDonateTroopsChange(e: Event) {
    this.donateTroops = Boolean((e.target as HTMLInputElement).checked);
    this.putGameConfig();
  }

  private handleMaxTimerValueKeyDown(e: KeyboardEvent) {
    if (["-", "+", "e"].includes(e.key)) {
      e.preventDefault();
    }
  }

  private handleMaxTimerValueChanges(e: Event) {
    (e.target as HTMLInputElement).value = (
      e.target as HTMLInputElement
    ).value.replace(/[e+-]/gi, "");
    const value = parseInt((e.target as HTMLInputElement).value);

    // Review R6: 1..120, matching `maxTimerValue`'s `min(1)` in Schemas.ts. A 0
    // would make the settings save answer 400, which now blocks Start (R4).
    if (isNaN(value) || value < 1 || value > 120) {
      return;
    }
    this.maxTimerValue = value;
    this.putGameConfig();
  }

  private async handleDisableNPCsChange(e: Event) {
    this.disableNPCs = Boolean((e.target as HTMLInputElement).checked);
    console.log(`updating disable npcs to ${this.disableNPCs}`);
    this.putGameConfig();
  }

  private async handleGameModeSelection(value: GameMode) {
    this.gameMode = value;
    this.putGameConfig();
  }

  private async handleTeamCountSelection(value: TeamCountConfig) {
    this.teamCount = value;
    this.putGameConfig();
  }

  private async putGameConfig() {
    const config = await getServerConfigFromClient();
    const response = await fetch(
      // Flashist Adaptation: root-absolute, NOT `FlashistFacade.instance.windowOrigin`.
      // windowOrigin is origin + document pathname, but the worker API is mounted at
      // the host root (nginx `^/w(\d+)`, webpack proxy context `/w<N>`), so joining
      // onto it prefixes the document path and misses the worker route entirely.
      `/${config.workerPath(this.lobbyId)}/api/game/${this.lobbyId}`,

      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          gameMap: this.selectedMap,
          gameMapSize: this.compactMap
            ? GameMapSize.Compact
            : GameMapSize.Normal,
          difficulty: this.selectedDifficulty,
          bots: this.bots,
          infiniteGold: this.infiniteGold,
          startGold: 0,
          donateGold: this.donateGold,
          infiniteTroops: this.infiniteTroops,
          donateTroops: this.donateTroops,
          instantBuild: this.instantBuild,
          gameMode: this.gameMode,
          disabledUnits: this.disabledUnits,
          playerTeams: this.teamCount,

          ...(this.gameMode === GameMode.Team &&
          this.teamCount === HumansVsNations
            ? {
                disableNPCs: false,
              }
            : {
                disableNPCs: this.disableNPCs,
              }),
          maxTimerValue:
            this.maxTimer === true ? this.maxTimerValue : undefined,
        } satisfies Partial<GameConfig>),
      },
    );
    if (!response.ok) {
      console.error(
        `Failed to push lobby config: ${response.status} ${response.statusText}`,
      );
    }
    return response;
  }

  private toggleUnit(unit: UnitType, checked: boolean): void {
    console.log(`Toggling unit type: ${unit} to ${checked}`);
    this.disabledUnits = checked
      ? [...this.disabledUnits, unit]
      : this.disabledUnits.filter((u) => u !== unit);

    this.putGameConfig();
  }

  private getRandomMap(): GameMapType {
    const maps = Object.values(GameMapType);
    const randIdx = Math.floor(Math.random() * maps.length);
    return maps[randIdx] as GameMapType;
  }

  private async startGame(): Promise<Response | null> {
    // Review R3: one Start at a time. A double tap would replay the ad, roll a
    // new random map and send a second start.
    if (this.isStarting) {
      return null;
    }
    this.isStarting = true;
    this.startFailed = false;
    // Explicit, as elsewhere: the decorator transform does not reliably schedule
    // updates under the test build.
    this.requestUpdate();
    const generation = this.openGeneration;
    try {
      return await this.attemptStart(generation);
    } finally {
      if (generation === this.openGeneration) {
        this.isStarting = false;
        this.requestUpdate();
      }
    }
  }

  private async attemptStart(generation: number): Promise<Response | null> {
    // Flashist Adaptation: interstitial adv
    await FlashistFacade.instance.showInterstitial();
    // Review R7: the modal was reopened on a new lobby while the ad was up.
    if (generation !== this.openGeneration) {
      return null;
    }

    if (this.useRandomMap) {
      this.selectedMap = this.getRandomMap();
    }

    let response: Response;
    try {
      // Review R4 (owner ruling 2026-09-27, "Fix in 0302"): a failed or throwing
      // settings save shows the same line and does NOT start — before, it was
      // silent and the match started with the old settings.
      const configResponse = await this.putGameConfig();
      // Task 0334 (0327 review R1): the window closed (or reopened) during the
      // settings save (its PUT or its own config read) — send no `start_game`.
      if (generation !== this.openGeneration) {
        return null;
      }
      if (!configResponse.ok) {
        this.showStartFailed();
        return configResponse;
      }
      console.log(
        `Starting private game with map: ${GameMapType[this.selectedMap as keyof typeof GameMapType]} ${this.useRandomMap ? " (Randomly selected)" : ""}`,
      );
      const config = await getServerConfigFromClient();
      // Task 0334: same, for a close during this Start's own config read.
      if (generation !== this.openGeneration) {
        return null;
      }
      response = await fetch(
        // Flashist Adaptation: root-absolute, NOT `FlashistFacade.instance.windowOrigin`.
        // windowOrigin is origin + document pathname, but the worker API is mounted at
        // the host root (nginx `^/w(\d+)`, webpack proxy context `/w<N>`), so joining
        // onto it prefixes the document path and misses the worker route entirely.
        `/${config.workerPath(this.lobbyId)}/api/start_game/${this.lobbyId}`,

        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
    } catch (error) {
      console.error(`Failed to start private game: ${error}`);
      // Task 0334: a throw from the save, the config read or an in-flight
      // `start_game` (a sent one cannot be recalled) must not touch a window
      // closed or reopened meanwhile.
      if (generation !== this.openGeneration) {
        return null;
      }
      this.showStartFailed();
      return null;
    }
    if (generation !== this.openGeneration) {
      return response;
    }
    if (!response.ok) {
      // Task 0302: a 403 `citizens_only` (creator not a citizen, or the profile
      // could not be read in time) or any other failure. A generic line, not the
      // citizens-only popup (owner ruling 2026-09-27, Q1); the modal stays open.
      console.error(
        `Failed to start private game: ${response.status} ${response.statusText}`,
      );
      this.showStartFailed();
      return response;
    }
    // Closed only after a SUCCESSFUL start (task 0302) — before, it closed first
    // and every failure was silent.
    this.close();
    return response;
  }

  private showStartFailed(): void {
    this.startFailed = true;
    this.requestUpdate();
  }

  // Task 0380: on the Yandex build this copies the bare lobby code, never a
  // link; standalone keeps today's `#join=` link (see PrivateLobbyInvite.ts).
  // copyText() is the first call, with nothing awaited before it: the Yandex
  // SDK clipboard only works inside the click. Copying never changes
  // lobbyIdVisible — a hidden code stays hidden.
  private async copyToClipboard() {
    const facade = FlashistFacade.instance;
    const generation = this.openGeneration;
    const copied = await facade.copyText(
      inviteCopyText(
        this.lobbyId,
        facade.yaGamesAvailable,
        facade.windowOrigin,
      ),
    );
    // Review R1: the window closed (or reopened) while the copy settled — its
    // tick or failure line belongs to that earlier opening, not this one.
    if (generation !== this.openGeneration) {
      return;
    }
    if (!copied) {
      this.copySuccess = false;
      this.copyFailed = true;
      this.requestUpdate();
      return;
    }
    this.copyFailed = false;
    this.copySuccess = true;
    this.requestUpdate();
    setTimeout(() => {
      if (generation !== this.openGeneration) {
        return;
      }
      this.copySuccess = false;
      this.requestUpdate();
    }, 2000);
  }

  private async pollPlayers() {
    // Task 0353: no lobby for this opening yet (create pending or failed, or
    // `lobbyId` still holds an earlier opening's) — nothing to ask about.
    if (!this.hasJoinedLobby) {
      return;
    }
    const lobbyId = this.lobbyId;
    const generation = this.openGeneration;
    try {
      const config = await getServerConfigFromClient();
      const response = await fetch(
        `/${config.workerPath(lobbyId)}/api/game/${lobbyId}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
      const data: GameInfo = await response.json();
      // The window closed (or reopened) while this poll was in flight.
      if (generation !== this.openGeneration) {
        return;
      }
      console.log(`got game info response: ${JSON.stringify(data)}`);

      this.clients = data.clients ?? [];
    } catch (error) {
      // console.warn, not console.error: OtelBrowserInit forwards every
      // console.error to telemetry, and this can fail once a second.
      console.warn("Failed to poll lobby players:", error);
    }
  }

  private kickPlayer(clientID: string) {
    // Dispatch event to be handled by WebSocket instead of HTTP
    this.dispatchEvent(
      new CustomEvent("kick-player", {
        detail: { target: clientID },
        bubbles: true,
        composed: true,
      }),
    );
  }
}

async function createLobby(creatorClientID: string): Promise<GameInfo> {
  try {
    // Task 0333 review R1: inside the try, so a config failure is logged too
    // — open() swallows this function's rejection.
    const config = await getServerConfigFromClient();
    // Task 0389: a private-lobby code, not generateID() — easy to read and type.
    const id = generatePrivateLobbyCode();
    const response = await fetch(
      `/${config.workerPath(id)}/api/create_game/${id}?creatorClientID=${encodeURIComponent(creatorClientID)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        // body: JSON.stringify(data), // Include this if you need to send data
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Server error response:", errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("Success:", data);

    return data as GameInfo;
  } catch (error) {
    console.error("Error creating lobby:", error);
    throw error;
  }
}
