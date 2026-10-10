import { LitElement, html } from "lit";
import { customElement, query, state } from "lit/decorators.js";
import { translateText } from "../client/Utils";
import { cleanLobbyCode } from "../core/PrivateLobbyCode";
import {
  ClientInfo,
  GameInfo,
  GameRecordSchema,
  PrivateLobbyCodeSchema,
} from "../core/Schemas";
import { generateID } from "../core/Util";
import { getServerConfigFromClient } from "../core/configuration/ConfigLoader";
import { renderCitizenBadge } from "./CitizenBadge";
import { JoinLobbyEvent } from "./Main";
import { beginJoiningLobby } from "./StartScreenPresence";
import "./components/baseComponents/Button";
import "./components/baseComponents/Modal";
import { getApiBase } from "./jwt";

// Task 0413: a page in a cross-origin iframe (Yandex Games) may not read the
// clipboard. Remembered for this session only, after a press failed with a
// not-allowed error; never stored, so every session guesses afresh.
let clipboardReadBlocked = false;

export function resetClipboardReadMemoryForTests(): void {
  clipboardReadBlocked = false;
}

type PolicyCheck = { allowsFeature?: (feature: string) => boolean };

// Task 0413: by capability, never by "are we inside Yandex". Chromium answers
// the policy check up front; where nothing answers, a failed press is the
// safety net (pasteFromClipboard).
function clipboardReadAvailable(): boolean {
  if (clipboardReadBlocked) return false;
  if (typeof navigator.clipboard?.readText !== "function") return false;
  const policyDocument = document as Document & {
    permissionsPolicy?: PolicyCheck;
    featurePolicy?: PolicyCheck;
  };
  const policy =
    policyDocument.permissionsPolicy ?? policyDocument.featurePolicy;
  if (typeof policy?.allowsFeature === "function") {
    return policy.allowsFeature("clipboard-read");
  }
  return true;
}

function isClipboardPermissionError(error: unknown): boolean {
  const name = (error as { name?: unknown } | null)?.name;
  return name === "NotAllowedError" || name === "SecurityError";
}

@customElement("join-private-lobby-modal")
export class JoinPrivateLobbyModal extends LitElement {
  @query("o-modal") private modalEl!: HTMLElement & {
    open: () => void;
    close: () => void;
    isModalOpen: boolean;
  };
  @query("#lobbyIdInput") private lobbyIdInput!: HTMLInputElement;
  @state() private message: string = "";
  @state() private hasJoined = false;
  // Holds the whole ClientInfo (not just the username) so the lobby list can render
  // the citizen badge alongside the name — task 0068.
  @state() private players: ClientInfo[] = [];
  // Task 0413: no paste button when this page cannot read the clipboard; the
  // hint tells the player how to paste by hand instead.
  @state() private pasteUnavailable = false;
  // Task 0413: a press that failed for some other reason shows the hint but
  // keeps the button, as the failure may be a one-off.
  @state() private pasteHintShown = false;

  private playersInterval: NodeJS.Timeout | null = null;
  // Task 0327: bumped by every close. A lobby check still awaiting its fetch
  // when the window closes must not go on to join with the window gone.
  private closeGeneration = 0;
  // Task 0374: joining marks this window still holds, so a close ends them
  // instead of leaving them to a request that may hang. A set, because the
  // Join button stays enabled during a lookup and two lookups can overlap.
  private joiningMarkEnds = new Set<() => void>();

  connectedCallback() {
    super.connectedCallback();
    this.pasteUnavailable = !clipboardReadAvailable();
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
        heading=${translateText("private_lobby.title")}
        @modal-close=${this.handleModalClose}
      >
        <div class="lobby-id-box">
          <input
            type="text"
            id="lobbyIdInput"
            placeholder=${translateText("private_lobby.enter_id")}
            @keyup=${this.handleChange}
          />
          ${this.pasteUnavailable
            ? ""
            : html`<button
                @click=${this.pasteFromClipboard}
                class="lobby-id-paste-button"
              >
                <svg
                  class="lobby-id-paste-button-icon"
                  stroke="currentColor"
                  fill="currentColor"
                  stroke-width="0"
                  viewBox="0 0 32 32"
                  height="18px"
                  width="18px"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M 15 3 C 13.742188 3 12.847656 3.890625 12.40625 5 L 5 5 L 5 28 L 13 28 L 13 30 L 27 30 L 27 14 L 25 14 L 25 5 L 17.59375 5 C 17.152344 3.890625 16.257813 3 15 3 Z M 15 5 C 15.554688 5 16 5.445313 16 6 L 16 7 L 19 7 L 19 9 L 11 9 L 11 7 L 14 7 L 14 6 C 14 5.445313 14.445313 5 15 5 Z M 7 7 L 9 7 L 9 11 L 21 11 L 21 7 L 23 7 L 23 14 L 13 14 L 13 26 L 7 26 Z M 15 16 L 25 16 L 25 28 L 15 28 Z"
                  ></path>
                </svg>
              </button>`}
        </div>
        ${this.pasteUnavailable || this.pasteHintShown
          ? html`<div
              id="lobby-id-paste-hint"
              class="mt-2 text-center text-sm text-gray-300"
            >
              ${translateText("private_lobby.paste_hint")}
            </div>`
          : ""}
        <div class="message-area ${this.message ? "show" : ""}">
          ${this.message}
        </div>
        <div class="options-layout">
          ${this.hasJoined && this.players.length > 0
            ? html` <div class="options-section">
                <div class="option-title">
                  ${this.players.length}
                  ${this.players.length === 1
                    ? translateText("private_lobby.player")
                    : translateText("private_lobby.players")}
                </div>

                <div class="players-list">
                  ${this.players.map(
                    (player) =>
                      html`<span class="player-tag"
                        >${player.isCitizen ? renderCitizenBadge() : ""}
                        ${player.username}</span
                      >`,
                  )}
                </div>
              </div>`
            : ""}
        </div>
        <div class="flex justify-center">
          ${!this.hasJoined
            ? html` <o-button
                label=${translateText("private_lobby.join_lobby")}
                block
                @click=${this.joinLobby}
              ></o-button>`
            : ""}
        </div>
      </o-modal>
    `;
  }

  createRenderRoot() {
    return this; // light DOM
  }

  public open(id: string = "") {
    this.pasteUnavailable = !clipboardReadAvailable();
    // Explicit, as in reset(): the decorator transform does not reliably
    // schedule updates under the test build.
    this.requestUpdate();
    this.modalEl?.open();
    if (id) {
      this.setLobbyId(id);
      this.joinLobby();
    }
  }

  // Programmatic close (match start, onJoin, the hash reset): never leaves.
  // Callers that need a leave do it themselves (onHashUpdate -> handleLeaveLobby).
  public close() {
    this.reset();
    this.modalEl?.close();
  }

  // Task 0327: every close the player makes (✕, a click outside, Escape) ends
  // in o-modal's `modal-close`. A joined player leaves the lobby exactly once;
  // after a programmatic close, reset() has already cleared `hasJoined`.
  private handleModalClose() {
    const lobbyId = this.lobbyIdInput?.value ?? "";
    const wasJoined = this.hasJoined;
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
    if (this.lobbyIdInput) {
      this.lobbyIdInput.value = "";
    }
    if (this.playersInterval) {
      clearInterval(this.playersInterval);
      this.playersInterval = null;
    }
    this.hasJoined = false;
    this.message = "";
    this.players = [];
    this.pasteHintShown = false;
    this.closeGeneration++;
    // Task 0374: a closed window no longer counts as joining, even if its
    // lookup is still running. Safe to run twice (o-modal's close() fires
    // modal-close after a programmatic close).
    this.endJoiningMarks();
    // Explicit, as in HostLobbyModal: the decorator transform does not reliably
    // schedule updates under the test build.
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

  private isClosedSince(generation: number): boolean {
    return generation !== this.closeGeneration;
  }

  private extractLobbyIdFromUrl(input: string): string {
    if (input.startsWith("http")) {
      if (input.includes("#join=")) {
        const params = new URLSearchParams(input.split("#")[1]);
        return params.get("join") ?? input;
      } else if (input.includes("join/")) {
        return input.split("join/")[1];
      } else {
        return input;
      }
    } else {
      return input;
    }
  }

  private setLobbyId(id: string) {
    this.lobbyIdInput.value = this.extractLobbyIdFromUrl(id);
  }

  private handleChange(e: Event) {
    const value = (e.target as HTMLInputElement).value.trim();
    this.setLobbyId(value);
  }

  // Task 0413: a failed press never ends in silence — it shows the hint and
  // puts the cursor in the box. A not-allowed failure also hides the button
  // for the rest of the session.
  private async pasteFromClipboard() {
    try {
      const clipText = await navigator.clipboard.readText();
      this.setLobbyId(clipText);
    } catch (err) {
      console.warn(`Clipboard read failed, showing the paste hint: ${err}`);
      if (isClipboardPermissionError(err)) {
        clipboardReadBlocked = true;
        this.pasteUnavailable = true;
      }
      this.pasteHintShown = true;
      this.requestUpdate();
      this.lobbyIdInput?.focus();
    }
  }

  private async joinLobby(): Promise<void> {
    // Task 0389: whatever was typed or pasted becomes the code — spaces and
    // dashes dropped, any case — before the worker path is worked out from it
    // (ADR-109: the path is a case-sensitive hash of the id).
    const lobbyId = cleanLobbyCode(
      this.extractLobbyIdFromUrl(this.lobbyIdInput.value.trim()),
    );
    if (!PrivateLobbyCodeSchema.safeParse(lobbyId).success) {
      this.message = `${translateText("private_lobby.not_found")}`;
      this.requestUpdate();
      return;
    }
    // The player poll and the leave event read the box, so it must hold the
    // same code that joins.
    this.lobbyIdInput.value = lobbyId;
    const generation = this.closeGeneration;
    console.log(`Joining lobby with ID: ${lobbyId}`);
    this.message = `${translateText("private_lobby.checking")}`;
    // Task 0336: the lookup counts as joining, so a waiting tenure popup does
    // not open over this window. On success Main's join handler begins its own
    // marker as `join-lobby` is sent, before this one ends.
    // Task 0374: the mark ends when the lookup settles or when the window
    // closes, whichever comes first.
    const endJoining = this.beginJoiningMark();

    try {
      // First, check if the game exists in active lobbies
      const gameExists = await this.checkActiveLobby(lobbyId, generation);
      if (gameExists || this.isClosedSince(generation)) return;

      // If not active, check archived games
      const archived = await this.checkArchivedGame(lobbyId, generation);
      if (this.isClosedSince(generation)) return;
      switch (archived) {
        case "success":
          return;
        case "not_found":
          this.message = `${translateText("private_lobby.not_found")}`;
          return;
        case "version_mismatch":
          this.message = `${translateText("private_lobby.version_mismatch")}`;
          return;
        case "error":
          this.message = `${translateText("private_lobby.error")}`;
          return;
      }
    } catch (error) {
      console.error("Error checking lobby existence:", error);
      if (this.isClosedSince(generation)) return;
      this.message = `${translateText("private_lobby.error")}`;
    } finally {
      endJoining();
    }
  }

  private async checkActiveLobby(
    lobbyId: string,
    generation: number,
  ): Promise<boolean> {
    const config = await getServerConfigFromClient();
    const url = `/${config.workerPath(lobbyId)}/api/game/${lobbyId}/exists`;

    const response = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    const gameInfo = await response.json();
    // Task 0327: the window was closed while this check was in flight.
    if (this.isClosedSince(generation)) {
      return false;
    }

    if (gameInfo.exists) {
      this.message = translateText("private_lobby.joined_waiting");
      this.hasJoined = true;

      this.dispatchEvent(
        new CustomEvent("join-lobby", {
          detail: {
            gameID: lobbyId,
            clientID: generateID(),
          } as JoinLobbyEvent,
          bubbles: true,
          composed: true,
        }),
      );

      this.playersInterval = setInterval(() => this.pollPlayers(), 1000);
      return true;
    }

    return false;
  }

  private async checkArchivedGame(
    lobbyId: string,
    generation: number,
  ): Promise<"success" | "not_found" | "version_mismatch" | "error"> {
    const archivePromise = fetch(`${getApiBase()}/game/${lobbyId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    const gitCommitPromise = fetch(`/commit.txt`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      cache: "no-cache",
    });

    const [archiveResponse, gitCommitResponse] = await Promise.all([
      archivePromise,
      gitCommitPromise,
    ]);

    if (archiveResponse.status === 404) {
      return "not_found";
    }
    if (archiveResponse.status !== 200) {
      return "error";
    }

    const archiveData = await archiveResponse.json();
    const parsed = GameRecordSchema.safeParse(archiveData);
    if (!parsed.success) {
      return "version_mismatch";
    }

    let myGitCommit = "";
    if (gitCommitResponse.status === 404) {
      // commit.txt is not found when running locally
      myGitCommit = "DEV";
    } else if (gitCommitResponse.status === 200) {
      myGitCommit = (await gitCommitResponse.text()).trim();
    } else {
      console.error("Error getting git commit:", gitCommitResponse.status);
      return "error";
    }

    // Allow DEV to join games created with a different version for debugging.
    if (myGitCommit !== "DEV" && parsed.data.gitCommit !== myGitCommit) {
      console.warn(
        `Git commit hash mismatch for game ${lobbyId}`,
        archiveData.details,
      );
      return "version_mismatch";
    }

    // Task 0327: the window was closed while this check was in flight.
    if (this.isClosedSince(generation)) {
      return "error";
    }
    this.dispatchEvent(
      new CustomEvent("join-lobby", {
        detail: {
          gameID: lobbyId,
          gameRecord: parsed.data,
          clientID: generateID(),
        } as JoinLobbyEvent,
        bubbles: true,
        composed: true,
      }),
    );
    return "success";
  }

  private async pollPlayers() {
    if (!this.lobbyIdInput?.value) return;
    const config = await getServerConfigFromClient();

    fetch(
      `/${config.workerPath(this.lobbyIdInput.value)}/api/game/${this.lobbyIdInput.value}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      },
    )
      .then((response) => response.json())
      .then((data: GameInfo) => {
        this.players = data.clients ?? [];
      })
      .catch((error) => {
        console.error("Error polling players:", error);
      });
  }
}
