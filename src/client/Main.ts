import "./SentryInit"; // Must be first — initializes Sentry before any other module
import version from "../version";
import { translateText } from "../client/Utils";
import { UserMeResponse } from "../core/ApiSchemas";
import { EventBus } from "../core/EventBus";
import { GameRecord, GameStartInfo, ID } from "../core/Schemas";
import { getServerConfigFromClient } from "../core/configuration/ConfigLoader";
import {
  Difficulty,
  GameMapSize,
  GameMapType,
  GameMode,
  GameType,
  UnitType,
} from "../core/game/Game";
import { UserSettings } from "../core/game/UserSettings";
import "./AccountModal";
import "./FeedbackModal";
import { FeedbackModal } from "./FeedbackModal";
import { joinLobby } from "./ClientGameRunner";
import {
  checkReconnectSession,
  clearReconnectSession,
  ReconnectSession,
} from "./ReconnectSession";
import { fetchCosmetics } from "./Cosmetics";
import "./DarkModeButton";
import { DarkModeButton } from "./DarkModeButton";
import "./FlagInput";
import { FlagInput } from "./FlagInput";
import { FlagInputModal } from "./FlagInputModal";
import { flashist_getLangSelector, flashist_logEventAnalytics, flashist_waitGameInitComplete, flashistConstants, FlashistFacade } from "./flashist/FlashistFacade";
import { startPerformanceMonitor } from "./PerformanceMonitor";
import { GameStartingModal } from "./GameStartingModal";
import "./GoogleAdElement";
import { GutterAds } from "./GutterAds";
import { HelpModal } from "./HelpModal";
import { HostLobbyModal as HostPrivateLobbyModal } from "./HostLobbyModal";
import { JoinPrivateLobbyModal } from "./JoinPrivateLobbyModal";
import "./LangSelector";
import { LangSelector } from "./LangSelector";
import { LanguageModal } from "./LanguageModal";
import "./Matchmaking";
import { MatchmakingModal } from "./Matchmaking";
import { NewsModal } from "./NewsModal";
import "./PublicLobby";
import { PublicLobby } from "./PublicLobby";
import { SinglePlayerModal } from "./SinglePlayerModal";
import { TerritoryPatternsModal } from "./TerritoryPatternsModal";
import { TokenLoginModal } from "./TokenLoginModal";
import { SendKickPlayerIntentEvent, SendWinnerEvent } from "./Transport";
import { UserSettingModal } from "./UserSettingModal";
import "./UsernameInput";
import { UsernameInput } from "./UsernameInput";
import { ReconnectModal } from "./ReconnectModal";
import { toggleDevMode } from "./DevMode";
import {
  generateCryptoRandomUUID,
  incrementGamesPlayed,
  isInIframe,
} from "./Utils";
import {
  getNextMissionLevel,
  setNextMissionLevel,
} from "./SinglePlayMissionStorage";
import { generateID } from "../core/Util";
import "./components/NewsButton";
import { NewsButton } from "./components/NewsButton";
import "./components/baseComponents/Button";
import "./components/baseComponents/Modal";
import { getUserMe, isLoggedIn } from "./jwt";
import "./styles.css";

declare global {
  interface Window {
    enableAds: boolean;
    PageOS: {
      session: {
        newPageView: () => void;
      };
    };
    fusetag: {
      registerZone: (id: string) => void;
      destroyZone: (id: string) => void;
      pageInit: (options?: any) => void;
      que: Array<() => void>;
      destroySticky: () => void;
    };
    ramp: {
      que: Array<() => void>;
      passiveMode: boolean;
      spaAddAds: (ads: Array<{ type: string; selectorId: string }>) => void;
      destroyUnits: (adType: string) => void;
      settings?: {
        slots?: any;
      };
      spaNewPage: (url: string) => void;
    };
  }

  // Extend the global interfaces to include your custom events
  interface DocumentEventMap {
    "join-lobby": CustomEvent<JoinLobbyEvent>;
    "kick-player": CustomEvent;
  }
}

export interface JoinLobbyEvent {
  clientID: string;
  // Multiplayer games only have gameID, gameConfig is not known until game starts.
  gameID: string;
  // GameConfig only exists when playing a singleplayer game.
  gameStartInfo?: GameStartInfo;
  // GameRecord exists when replaying an archived game.
  gameRecord?: GameRecord;
}

class Client {
  private gameStop: (() => void) | null = null;
  private gameHasStarted = false;
  private gameHasEnded = false;
  private perfMonitorStop: (() => void) | null = null;
  private eventBus: EventBus = new EventBus();
  private firstActionFired = false;

  private fireFirstAction() {
    if (this.firstActionFired) return;
    this.firstActionFired = true;
    flashist_logEventAnalytics(flashistConstants.analyticEvents.SESSION_FIRST_ACTION);
  }

  private usernameInput: UsernameInput | null = null;
  private flagInput: FlagInput | null = null;
  private darkModeButton: DarkModeButton | null = null;

  private joinModal: JoinPrivateLobbyModal;
  private publicLobby: PublicLobby;
  private userSettings: UserSettings = new UserSettings();
  private patternsModal: TerritoryPatternsModal;
  private tokenLoginModal: TokenLoginModal;
  private matchmakingModal: MatchmakingModal;

  private gutterAds: GutterAds;

  constructor() { }

  initialize(): void {
    const gameVersion = document.getElementById(
      "game-version",
    ) as HTMLDivElement;
    if (!gameVersion) {
      console.warn("Game version element not found");
    } else {
      gameVersion.innerText = version;

      // Flashist Adaptation: showing the name of the game instead of version
      gameVersion.innerText = translateText("main.title") ?? document.title;
    }

    // Flashist Adaptation: bottom bar
    const licenseCredits = document.getElementById(
      "license-credits",
    ) as HTMLDivElement;
    if (!licenseCredits) {
      console.warn("License Credits element not found");

    } else {
      // Flashist Adaptation: showing the name of the game instead of version
      licenseCredits.title = version;
      licenseCredits.innerText = translateText("main.license_text");
    }

    const newsModal = document.querySelector("news-modal") as NewsModal;
    if (!newsModal || !(newsModal instanceof NewsModal)) {
      console.warn("News modal element not found");
    }
    const newsButton = document.querySelector("news-button") as NewsButton;
    if (!newsButton) {
      console.warn("News button element not found");
    } else {
      console.log("News button element found");
    }

    // Comment out to show news button.
    // newsButton.hidden = true;

    // Flashist Adaptation
    // const langSelector = document.querySelector(
    //   "lang-selector",
    // ) as LangSelector;
    const langSelector = flashist_getLangSelector();

    const languageModal = document.querySelector(
      "language-modal",
    ) as LanguageModal;
    if (!langSelector) {
      console.warn("Lang selector element not found");
    }
    if (!languageModal) {
      console.warn("Language modal element not found");
    }

    this.flagInput = document.querySelector("flag-input") as FlagInput;
    if (!this.flagInput) {
      console.warn("Flag input element not found");
    }

    this.darkModeButton = document.querySelector(
      "dark-mode-button",
    ) as DarkModeButton;
    if (!this.darkModeButton) {
      console.warn("Dark mode button element not found");
    }

    this.usernameInput = document.querySelector(
      "username-input",
    ) as UsernameInput;
    if (!this.usernameInput) {
      console.warn("Username input element not found");
    }

    this.publicLobby = document.querySelector("public-lobby") as PublicLobby;

    window.addEventListener("beforeunload", () => {
      console.log("Browser is closing");
      this.perfMonitorStop?.();
      if (this.gameStop !== null) {
        if (this.gameHasStarted && !this.gameHasEnded) {
          flashist_logEventAnalytics(flashistConstants.analyticEvents.GAME_ABANDON);
        }
        this.gameStop();
      }
    });
    window.addEventListener("keydown", (event: KeyboardEvent) => {
      if (
        event.code === "KeyD" &&
        event.shiftKey &&
        !event.altKey &&
        !event.ctrlKey &&
        !event.metaKey
      ) {
        event.preventDefault();
        toggleDevMode();
      }
    });

    const gutterAds = document.querySelector("gutter-ads");
    if (!(gutterAds instanceof GutterAds))
      throw new Error("Missing gutter-ads");
    this.gutterAds = gutterAds;

    this.eventBus.on(SendWinnerEvent, () => {
      this.gameHasEnded = true;
      this.perfMonitorStop?.();
      this.perfMonitorStop = null;
    });

    document.addEventListener("join-lobby", this.handleJoinLobby.bind(this));
    document.addEventListener("leave-lobby", this.handleLeaveLobby.bind(this));
    document.addEventListener("kick-player", this.handleKickPlayer.bind(this));

    const spModal = document.querySelector(
      "single-player-modal",
    ) as SinglePlayerModal;
    if (!spModal || !(spModal instanceof SinglePlayerModal)) {
      console.warn("Singleplayer modal element not found");
    }

    const missionButton = document.getElementById(
      "single-play-mission",
    ) as (HTMLElement & { title: string; disable: boolean }) | null;
    if (!missionButton) {
      console.warn("Single play mission button element not found");
    } else {
      const updateMissionButtonLabel = () => {
        const level = getNextMissionLevel();
        missionButton.title = translateText("main.play_mission", { level });
        missionButton.disable = Object.values(GameMapType).length === 0;
      };
      updateMissionButtonLabel();
      missionButton.addEventListener("click", async () => {
        this.fireFirstAction();
        if (!this.usernameInput?.isValid()) {
          return;
        }

        if (missionButton.disable) {
          return;
        }

        await this.startSinglePlayMission();
        updateMissionButtonLabel();
      });
    }

    const singlePlayer = document.getElementById("single-player");
    if (singlePlayer === null) throw new Error("Missing single-player");
    singlePlayer.addEventListener("click", () => {
      this.fireFirstAction();
      flashist_logEventAnalytics(
        flashistConstants.analyticEvents.UI_CLICK_SINGLE_PLAYER_BUTTON
      );

      if (this.usernameInput?.isValid()) {
        spModal.open();
      }
    });

    const hlpModal = document.querySelector("help-modal") as HelpModal;
    if (!hlpModal || !(hlpModal instanceof HelpModal)) {
      console.warn("Help modal element not found");
    }
    const helpButton = document.getElementById("help-button");
    if (helpButton === null) throw new Error("Missing help-button");
    helpButton.addEventListener("click", () => {
      this.fireFirstAction();
      hlpModal.open();
    });

    const flagInputModal = document.querySelector(
      "flag-input-modal",
    ) as FlagInputModal;
    if (!flagInputModal || !(flagInputModal instanceof FlagInputModal)) {
      console.warn("Flag input modal element not found");
    }

    const flgInput = document.getElementById("flag-input_");
    if (flgInput === null) throw new Error("Missing flag-input_");
    flgInput.addEventListener("click", () => {
      flagInputModal.open();
    });

    this.patternsModal = document.querySelector(
      "territory-patterns-modal",
    ) as TerritoryPatternsModal;
    if (
      !this.patternsModal ||
      !(this.patternsModal instanceof TerritoryPatternsModal)
    ) {
      console.warn("Territory patterns modal element not found");
    }
    const patternButton = document.getElementById(
      "territory-patterns-input-preview-button",
    );
    if (isInIframe() && patternButton) {
      patternButton.style.display = "none";
    }

    if (
      !this.patternsModal ||
      !(this.patternsModal instanceof TerritoryPatternsModal)
    ) {
      console.warn("Territory patterns modal element not found");
    }
    if (patternButton === null)
      throw new Error("territory-patterns-input-preview-button");
    this.patternsModal.previewButton = patternButton;
    this.patternsModal.refresh();
    patternButton.addEventListener("click", () => {
      this.patternsModal.open();
    });

    this.tokenLoginModal = document.querySelector(
      "token-login",
    ) as TokenLoginModal;
    if (
      !this.tokenLoginModal ||
      !(this.tokenLoginModal instanceof TokenLoginModal)
    ) {
      console.warn("Token login modal element not found");
    }

    this.matchmakingModal = document.querySelector(
      "matchmaking-modal",
    ) as MatchmakingModal;
    if (
      !this.matchmakingModal ||
      !(this.matchmakingModal instanceof MatchmakingModal)
    ) {
      console.warn("Matchmaking modal element not found");
    }

    const onUserMe = async (userMeResponse: UserMeResponse | false) => {
      document.dispatchEvent(
        new CustomEvent("userMeResponse", {
          detail: userMeResponse,
          bubbles: true,
          cancelable: true,
        }),
      );

      if (userMeResponse !== false) {
        // Authorized
        console.log(
          `Your player ID is ${userMeResponse.player.publicId}\n` +
          "Sharing this ID will allow others to view your game history and stats.",
        );
      }
    };

    if (isLoggedIn() === false) {
      // Not logged in
      onUserMe(false);
    } else {
      // JWT appears to be valid
      // TODO: Add caching
      getUserMe().then(onUserMe);
    }

    const settingsModal = document.querySelector(
      "user-setting",
    ) as UserSettingModal;
    if (!settingsModal || !(settingsModal instanceof UserSettingModal)) {
      console.warn("User settings modal element not found");
    }
    document
      .getElementById("settings-button")
      ?.addEventListener("click", () => {
        settingsModal.open();
      });

    const feedbackModal = document.querySelector(
      "feedback-modal",
    ) as FeedbackModal;
    if (!feedbackModal || !(feedbackModal instanceof FeedbackModal)) {
      console.warn("Feedback modal element not found");
    } else {
      document.getElementById("feedback-button")?.addEventListener("click", () => {
        feedbackModal.show("start");
      });
      window.addEventListener("show-feedback-modal", (e: Event) => {
        const detail = (e as CustomEvent<{ matchId?: string }>).detail;
        feedbackModal.show("battle", detail?.matchId);
      });
    }

    const hostModal = document.querySelector(
      "host-lobby-modal",
    ) as HostPrivateLobbyModal;
    if (!hostModal || !(hostModal instanceof HostPrivateLobbyModal)) {
      console.warn("Host private lobby modal element not found");
    }
    const hostLobbyButton = document.getElementById("host-lobby-button");
    if (hostLobbyButton === null) throw new Error("Missing host-lobby-button");
    hostLobbyButton.addEventListener("click", () => {
      this.fireFirstAction();
      if (this.usernameInput?.isValid()) {
        hostModal.open();
        this.publicLobby.leaveLobby();
      }
    });

    this.joinModal = document.querySelector(
      "join-private-lobby-modal",
    ) as JoinPrivateLobbyModal;
    if (!this.joinModal || !(this.joinModal instanceof JoinPrivateLobbyModal)) {
      console.warn("Join private lobby modal element not found");
    }
    const joinPrivateLobbyButton = document.getElementById(
      "join-private-lobby-button",
    );
    if (joinPrivateLobbyButton === null)
      throw new Error("Missing join-private-lobby-button");
    joinPrivateLobbyButton.addEventListener("click", () => {
      this.fireFirstAction();
      if (this.usernameInput?.isValid()) {
        this.joinModal.open();
      }
    });

    if (this.userSettings.darkMode()) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    // Attempt to join lobby
    this.handleHash();

    const onHashUpdate = () => {
      // Reset the UI to its initial state
      this.joinModal.close();
      if (this.gameStop !== null) {
        this.handleLeaveLobby();
      }

      // Attempt to join lobby
      this.handleHash();
    };

    // Handle browser navigation & manual hash edits
    window.addEventListener("popstate", onHashUpdate);
    window.addEventListener("hashchange", onHashUpdate);

    function updateSliderProgress(slider: HTMLInputElement) {
      const percent =
        ((Number(slider.value) - Number(slider.min)) /
          (Number(slider.max) - Number(slider.min))) *
        100;
      slider.style.setProperty("--progress", `${percent}%`);
    }

    document
      .querySelectorAll<HTMLInputElement>(
        "#bots-count, #private-lobby-bots-count",
      )
      .forEach((slider) => {
        updateSliderProgress(slider);
        slider.addEventListener("input", () => updateSliderProgress(slider));
      });

    FlashistFacade.instance
      .checkExperimentFlag(
        flashistConstants.experiments.RECONNECT_FLAG_NAME,
        flashistConstants.experiments.RECONNECT_FLAG_VALUE,
      )
      .then((enabled) => {
        if (!enabled) return;
        checkReconnectSession().then((session) => {
          if (session) this.showReconnectBanner(session);
        });
      });

    this.initializeFuseTag();

    // Session:Heartbeat — fires every 5 real-clock minutes, skipped when tab is hidden
    let hbMinutes = 0;
    const hbInterval = window.setInterval(() => {
      hbMinutes += 5;
      if (hbMinutes > 60) {
        clearInterval(hbInterval);
        return;
      }
      if (document.visibilityState === "hidden") return;
      const label = String(hbMinutes).padStart(2, "0");
      flashist_logEventAnalytics(
        `${flashistConstants.analyticEvents.SESSION_HEARTBEAT}:${label}`
      );
    }, 5 * 60 * 1000);
  }

  private showReconnectBanner(session: ReconnectSession): void {
    const modal = document.querySelector("reconnect-modal");
    if (modal instanceof ReconnectModal) {
      modal.show(session);
    }
  }

  private handleHash() {
    const strip = () =>
      history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search,
      );

    const alertAndStrip = (message: string) => {
      // alert(message);
      console.log("ERROR! alertAndStrip __ message: ", message);
      strip();
    };

    const hash = window.location.hash;

    // Decode the hash first to handle encoded characters
    const decodedHash = decodeURIComponent(hash);
    const params = new URLSearchParams(decodedHash.split("?")[1] || "");

    // Handle different hash sections
    if (decodedHash.startsWith("#purchase-completed")) {
      // Parse params after the ?
      const status = params.get("status");

      if (status !== "true") {
        alertAndStrip("purchase failed");
        return;
      }

      const patternName = params.get("pattern");
      if (!patternName) {
        // alert("Something went wrong. Please contact support.");
        console.log("ERROR! Something went wrong. Please contact support. if (!patternName) {");
        console.error("purchase-completed but no pattern name");
        return;
      }

      this.userSettings.setSelectedPatternName(patternName);
      const token = params.get("login-token");

      if (token) {
        strip();
        window.addEventListener("beforeunload", () => {
          // The page reloads after token login, so we need to save the pattern name
          // in case it is unset during reload.
          this.userSettings.setSelectedPatternName(patternName);
        });
        this.tokenLoginModal.open(token);
      } else {
        alertAndStrip(`purchase succeeded: ${patternName}`);
        this.patternsModal.refresh();
      }
      return;
    }

    if (decodedHash.startsWith("#token-login")) {
      const token = params.get("token-login");

      if (!token) {
        alertAndStrip(
          `login failed! Please try again later or contact support.`,
        );
        return;
      }

      strip();
      this.tokenLoginModal.open(token);
      return;
    }

    if (decodedHash.startsWith("#join=")) {
      const lobbyId = decodedHash.substring(6); // Remove "#join="
      if (lobbyId && ID.safeParse(lobbyId).success) {
        this.joinModal.open(lobbyId);
        console.log(`joining lobby ${lobbyId}`);
      }
    }
    if (decodedHash.startsWith("#affiliate=")) {
      const affiliateCode = decodedHash.replace("#affiliate=", "");
      strip();
      if (affiliateCode) {
        this.patternsModal.open(affiliateCode);
      }
    }
    if (decodedHash.startsWith("#refresh")) {

      // Flashist Adaptation
      // window.location.href = "/";
      FlashistFacade.instance.changeHref(FlashistFacade.instance.rootPathname);
    }
  }

  private async handleJoinLobby(event: CustomEvent<JoinLobbyEvent>) {
    this.fireFirstAction();
    const lobby = event.detail;
    console.log(`joining lobby ${lobby.gameID}`);
    this.gameHasStarted = false;
    this.gameHasEnded = false;
    const reconnectModal = document.querySelector("reconnect-modal");
    if (reconnectModal instanceof ReconnectModal) {
      reconnectModal.hide();
    }
    if (this.gameStop !== null) {
      console.log("joining lobby, stopping existing game");
      this.gameStop();
    }
    const config = await getServerConfigFromClient();

    const pattern = this.userSettings.getSelectedPatternName(
      await fetchCosmetics(),
    );

    this.gameStop = joinLobby(
      this.eventBus,
      {
        gameID: lobby.gameID,
        serverConfig: config,
        cosmetics: {
          color: this.userSettings.getSelectedColor() ?? undefined,
          patternName: pattern?.name ?? undefined,
          patternColorPaletteName: pattern?.colorPalette?.name ?? undefined,
          flag:
            this.flagInput === null || this.flagInput.getCurrentFlag() === "xx"
              ? ""
              : this.flagInput.getCurrentFlag(),
        },
        playerName: this.usernameInput?.getCurrentUsername() ?? "",
        token: getPlayToken(),
        clientID: lobby.clientID,
        gameStartInfo: lobby.gameStartInfo ?? lobby.gameRecord?.info,
        gameRecord: lobby.gameRecord,
      },
      () => {
        console.log("Closing modals");
        document.getElementById("settings-button")?.classList.add("hidden");
        document
          .getElementById("username-validation-error")
          ?.classList.add("hidden");
        [
          "single-player-modal",
          "host-lobby-modal",
          "join-private-lobby-modal",
          "game-starting-modal",
          "game-top-bar",
          "help-modal",
          "user-setting",
          "territory-patterns-modal",
          "language-modal",
          "news-modal",
          "flag-input-modal",
          "account-button",
          "token-login",
          "matchmaking-modal",
        ].forEach((tag) => {
          const modal = document.querySelector(tag) as HTMLElement & {
            close?: () => void;
            isModalOpen?: boolean;
          };
          if (modal?.close) {
            modal.close();
          } else if (modal && "isModalOpen" in modal) {
            modal.isModalOpen = false;
          }
        });
        this.publicLobby.stop();
        document.querySelectorAll(".ad").forEach((ad) => {
          (ad as HTMLElement).style.display = "none";
        });

        // show when the game loads
        const startingModal = document.querySelector(
          "game-starting-modal",
        ) as GameStartingModal;
        if (startingModal && startingModal instanceof GameStartingModal) {
          startingModal.show();
        }
        this.gutterAds.hide();
      },
      () => {
        this.gameHasStarted = true;
        this.perfMonitorStop = startPerformanceMonitor();
        this.joinModal.close();
        this.publicLobby.stop();
        incrementGamesPlayed();

        document.querySelectorAll(".ad").forEach((ad) => {
          (ad as HTMLElement).style.display = "none";
        });

        // Ensure there's a homepage entry in history before adding the lobby entry
        if (window.location.hash === "" || window.location.hash === "#") {

          // Flashist Adaptation
          // history.pushState(null, "", window.location.origin + "#refresh");
          history.pushState(null, "", FlashistFacade.instance.windowOrigin + "#refresh");

        }

        // Flashist Adaptation: disabling the #join URL, cuz it's not clear how to handle it for now at Yandex Games
        // history.pushState(null, "", `#join=${lobby.gameID}`);
      },
    );
  }

  private async startSinglePlayMission() {
    //
    flashist_logEventAnalytics(
      flashistConstants.analyticEvents.UI_CLICK_SINGLE_MISSION_BUTTON
    );

    await FlashistFacade.instance.showInterstitial();

    const clientID = generateID();
    const gameID = generateID();
    const level = getNextMissionLevel();
    setNextMissionLevel(level);

    const usernameInput = document.querySelector(
      "username-input",
    ) as UsernameInput;
    if (!usernameInput) {
      console.warn("Username input element not found");
      return;
    }
    const username = usernameInput.getCurrentUsername();

    const cosmetics = await fetchCosmetics();
    let selectedPattern = this.userSettings.getSelectedPatternName(cosmetics);
    selectedPattern ??= cosmetics
      ? (this.userSettings.getDevOnlyPattern() ?? null)
      : null;

    const selectedColor = this.userSettings.getSelectedColor();

    document.dispatchEvent(
      new CustomEvent("join-lobby", {
        detail: {
          clientID,
          gameID,
          gameStartInfo: {
            gameID,
            players: [
              {
                clientID,
                username,
                cosmetics: {
                  pattern: selectedPattern ?? undefined,
                  color: selectedColor ? { color: selectedColor } : undefined,
                },
              },
            ],
            config: {
              gameMap: GameMapType.World,
              gameMapSize: GameMapSize.Normal,
              gameType: GameType.Singleplayer,
              gameMode: GameMode.FFA,
              playerTeams: 2,
              difficulty: Difficulty.Medium,
              bots: 400,
              infiniteGold: false,
              donateGold: true,
              donateTroops: true,
              infiniteTroops: false,
              instantBuild: false,
              disabledUnits: [],
              disableNPCs: false,
              singlePlayMission: {
                level,
              },
            },
          },
        } satisfies JoinLobbyEvent,
        bubbles: true,
        composed: true,
      }),
    );
  }

  private async handleLeaveLobby(/* event: CustomEvent */) {
    if (this.gameStop === null) {
      return;
    }
    console.log("leaving lobby, cancelling game");
    this.gameStop();
    this.gameStop = null;
    this.perfMonitorStop?.();
    this.perfMonitorStop = null;
    clearReconnectSession();
    this.gutterAds.hide();
    this.publicLobby.leaveLobby();
  }

  private handleKickPlayer(event: CustomEvent) {
    const { target } = event.detail;

    // Forward to eventBus if available
    if (this.eventBus) {
      this.eventBus.emit(new SendKickPlayerIntentEvent(target));
    }
  }

  private initializeFuseTag() {
    const tryInitFuseTag = (): boolean => {
      if (window.fusetag && typeof window.fusetag.pageInit === "function") {
        console.log("initializing fuse tag");
        window.fusetag.que.push(() => {
          window.fusetag.pageInit({
            blockingFuseIds: ["lhs_sticky_vrec", "rhs_sticky_vrec"],
          });
        });
        return true;
      } else {
        return false;
      }
    };

    const interval = setInterval(() => {
      if (tryInitFuseTag()) {
        clearInterval(interval);
      }
    }, 100);
  }
}

// Initialize the client when the DOM is loaded
document.addEventListener("DOMContentLoaded", async () => {
  // Flashist Adaptation
  await flashist_waitGameInitComplete();

  new Client().initialize();

  // // Flashist Adaptation
  // await FlashistFacade.instance.yandexInitPromise;
  // FlashistFacade.instance.yandexGamesReadyCallback();
});

// WARNING: DO NOT EXPOSE THIS ID
export function getPlayToken(): string {
  const result = isLoggedIn();
  if (result !== false) return result.token;
  return getPersistentIDFromCookie();
}

// WARNING: DO NOT EXPOSE THIS ID
export function getPersistentID(): string {
  const result = isLoggedIn();
  if (result !== false) return result.claims.sub;
  return getPersistentIDFromCookie();
}

// WARNING: DO NOT EXPOSE THIS ID
function getPersistentIDFromCookie(): string {
  const COOKIE_NAME = "player_persistent_id";

  // Try to get existing cookie
  const cookies = document.cookie.split(";");
  for (const cookie of cookies) {
    const [cookieName, cookieValue] = cookie.split("=").map((c) => c.trim());
    if (cookieName === COOKIE_NAME) {
      return cookieValue;
    }
  }

  // If no cookie exists, create new ID and set cookie
  const newID = generateCryptoRandomUUID();
  document.cookie = [
    `${COOKIE_NAME}=${newID}`,
    `max-age=${5 * 365 * 24 * 60 * 60}`, // 5 years
    "path=/",
    "SameSite=Strict",
    "Secure",
  ].join(";");

  return newID;
}
