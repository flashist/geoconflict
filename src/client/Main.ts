import "./OtelBrowserInit"; // Must be first — initializes OTEL error tracking before any other module
import { translateText } from "../client/Utils";
import { UserMeResponse } from "../core/ApiSchemas";
import { EventBus } from "../core/EventBus";
import { GameRecord, GameStartInfo } from "../core/Schemas";
import { generateID } from "../core/Util";
import { getServerConfigFromClient } from "../core/configuration/ConfigLoader";
import {
  Difficulty,
  GameMapSize,
  GameMapType,
  GameMode,
  GameType,
} from "../core/game/Game";
import { UserSettings } from "../core/game/UserSettings";
import version from "../version";
import "./AccountModal";
import { startBuildVersionChecker } from "./BuildVersionChecker";
import "./CitizenshipCard";
import "./CitizenshipExplainerModal";
import "./CitizenshipHelpSection";
import "./CitizenshipRestartModal";
import { CitizenshipRestartModal } from "./CitizenshipRestartModal";
import {
  CITIZENSHIP_GRANTED_MID_SESSION_EVENT,
  createCitizenshipRestartOffer,
  type CitizenshipRestartOffer,
} from "./CitizenshipRestartOffer";
import "./TenureGrantModal";
import {
  CITIZENSHIP_LOGIN_SUCCEEDED_EVENT,
  type CitizenshipLoginSucceededDetail,
} from "./CitizenshipCard";
import "./StaleBuildModal";
import { joinLobby } from "./ClientGameRunner";
import { fetchCosmetics } from "./Cosmetics";
import "./DarkModeButton";
import { DarkModeButton } from "./DarkModeButton";
import { toggleDevMode } from "./DevMode";
import { requestGameRestart } from "./GameRestart";
import "./FeedbackModal";
import { FeedbackModalScreenSource, showFeedbackModal } from "./FeedbackModal";
import "./FlagInput";
import { FlagInput } from "./FlagInput";
import { FlagInputModal } from "./FlagInputModal";
import { GameStartingModal } from "./GameStartingModal";
import "./GoogleAdElement";
import { GutterAds } from "./GutterAds";
import { HelpModal } from "./HelpModal";
import { HostLobbyModal as HostPrivateLobbyModal } from "./HostLobbyModal";
import { openHostLobbyFromStartScreen } from "./HostLobbyOpen";
import {
  openInviteFromPayload,
  shouldAutoLaunchTutorial,
} from "./InvitePayload";
import { JoinPrivateLobbyModal } from "./JoinPrivateLobbyModal";
import "./LangSelector";
import { LanguageModal } from "./LanguageModal";
import { JoinTicket, LobbyJoinSequence } from "./LobbyJoinSequence";
import {
  isLongSessionRefreshShowing,
  startLongSessionRefreshChecker,
} from "./LongSessionRefresh";
import "./Matchmaking";
import { MatchmakingModal } from "./Matchmaking";
import { logMatchEndAnalytics } from "./MatchStartAnalytics";
import { NewsModal } from "./NewsModal";
import { PrivateLobbyAccess } from "./PrivateLobbyAccess";
import { lobbyIdFromJoinHash } from "./PrivateLobbyInvite";
import { startPerformanceMonitor } from "./PerformanceMonitor";
import { startProfileSession } from "./ProfileSession";
import { closePreStartModals } from "./PreStartModals";
import "./PublicLobby";
import { PublicLobby } from "./PublicLobby";
import { ReconnectModal } from "./ReconnectModal";
import {
  checkReconnectSession,
  clearReconnectSession,
  ReconnectSession,
} from "./ReconnectSession";
import {
  getNextMissionLevel,
  setNextMissionLevel,
} from "./SinglePlayMissionStorage";
import { setStartScreenControlsHidden } from "./StartScreenControls";
import {
  beginJoiningLobby,
  isOnStartScreen,
  reportBackOnStartScreen,
  setStartScreenPresenceSource,
} from "./StartScreenPresence";
import "./StartScreenTabs";
import { SinglePlayerModal } from "./SinglePlayerModal";
import { TerritoryPatternsModal } from "./TerritoryPatternsModal";
import { TokenLoginModal } from "./TokenLoginModal";
import { SendKickPlayerIntentEvent, SendWinnerEvent } from "./Transport";
import {
  incrementAndGetTutorialAttemptCount,
  TUTORIAL_COMPLETED_KEY,
} from "./TutorialStorage";
import { UserSettingModal } from "./UserSettingModal";
import "./UsernameInput";
import { UsernameInput } from "./UsernameInput";
import {
  generateCryptoRandomUUID,
  incrementGamesPlayed,
  isInIframe,
} from "./Utils";
import "./components/NewsButton";
import { NewsButton } from "./components/NewsButton";
import "./components/baseComponents/Button";
import "./components/baseComponents/Modal";
import {
  flashist_getLangSelector,
  flashist_logEventAnalytics,
  flashistConstants,
  FlashistFacade,
} from "./flashist/FlashistFacade";
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
  singlePlayGameStartInfo?: GameStartInfo;
  // GameRecord exists when replaying an archived game.
  gameRecord?: GameRecord;
  isReconnect?: boolean;

  preloadMapData?: PreloadMapConfig;
}

export interface PreloadMapConfig {
  mapType: GameMapType;
  mapSize: GameMapSize;
}

class Client {
  // Task 0228: owns the connected join's stopper and the join still being set
  // up, so a leave or a second join during the setup awaits is not lost.
  private readonly lobbyJoins = new LobbyJoinSequence();
  // Read-only view of the connected join's stopper: null on the start screen
  // and while a join is still being set up.
  private get gameStop(): (() => void) | null {
    return this.lobbyJoins.currentStopper();
  }
  private gameHasStarted = false;
  private gameHasEnded = false;
  private perfMonitorStop: (() => void) | null = null;
  // The join-mint counter: incremented right before every joinLobby call, so
  // each join carries its own number. It does NOT say which game owns the live
  // monitor — monitorGeneration below does, and teardown guards key on that.
  private joinGeneration = 0;
  // The generation that actually owns the live monitor — set where the monitor
  // is started (onJoin, when the server's start message arrives), not where
  // the join was minted, so the last to mint is not taken to be the one whose
  // monitor is running. The Yandex-id await (now in loadJoinSetup) once sat
  // between the mint and the start; since task 0228 it runs before the mint.
  private monitorGeneration = 0;
  // "Restart to apply" after a mid-session citizenship grant (task 0303).
  private readonly citizenshipRestartOffer: CitizenshipRestartOffer =
    createCitizenshipRestartOffer({
      isAwayFromStartScreen: () => this.gameStop !== null,
      isSurfacesEnabled: () =>
        FlashistFacade.instance.isCitizenshipSurfacesEnabled(),
      showPrompt: () => {
        const modal = document.querySelector("citizenship-restart-modal");
        if (modal instanceof CitizenshipRestartModal) {
          modal.show(() => this.citizenshipRestartOffer.restart());
        }
      },
      reload: () => FlashistFacade.instance.reloadApp(),
    });
  private eventBus: EventBus = new EventBus();
  private firstActionFired = false;

  private fireFirstAction() {
    if (this.firstActionFired) return;
    this.firstActionFired = true;
    flashist_logEventAnalytics(
      flashistConstants.analyticEvents.SESSION_FIRST_ACTION,
    );
  }

  private usernameInput: UsernameInput | null = null;
  private flagInput: FlagInput | null = null;
  private darkModeButton: DarkModeButton | null = null;

  private joinModal: JoinPrivateLobbyModal;
  // Task 0382: the Yandex invite payload opened the Join window at startup —
  // the first-time tutorial then does not auto-launch on this page load.
  public openedInviteAtStartup = false;
  // Task 0382 review R1: the auto-launched tutorial awaits cosmetics before it
  // sends `join-lobby`, so nothing else marks that window as busy.
  private tutorialStarting = false;
  private publicLobby: PublicLobby;
  private userSettings: UserSettings = new UserSettings();
  private patternsModal: TerritoryPatternsModal;
  private tokenLoginModal: TokenLoginModal;
  private matchmakingModal: MatchmakingModal;

  private gutterAds: GutterAds;

  constructor() {}

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
      // (task 0415: no `title` here — it made a native browser tooltip, and the
      // version is already in the visible text below)
      licenseCredits.innerText =
        translateText("main.license_text") + "\n" + version;
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
      this.stopPerformanceMonitor();
      if (this.gameStop !== null) {
        this.logActiveMatchAbandon();
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
      this.stopPerformanceMonitor();
    });

    document.addEventListener("join-lobby", this.handleJoinLobby.bind(this));
    document.addEventListener("leave-lobby", this.handleLeaveLobby.bind(this));
    document.addEventListener("kick-player", this.handleKickPlayer.bind(this));
    // Start-screen UI that must not interrupt a lobby or match asks here
    // (task 0329, review R1: the citizenship card's late reveal).
    setStartScreenPresenceSource(() => this.gameStop !== null);
    // A mid-load login (the citizenship card's guest CTA) leaves the page with no
    // session token, so restart it and run the whole start sequence logged in
    // (task 0273, owner ruling D3). Never out of a live match.
    document.addEventListener(CITIZENSHIP_LOGIN_SUCCEEDED_EVENT, (event) => {
      // The requester supplies its own "no restart" behavior (the card re-reads
      // its profile, which is exactly what it did before this task).
      const detail = (event as CustomEvent<CitizenshipLoginSucceededDetail>)
        .detail;
      requestGameRestart({
        matchActive: this.gameStop !== null,
        reload: () => FlashistFacade.instance.reloadApp(),
        storage: readSessionStorage(),
        fallback: detail.fallback,
      });
    });
    // A purchase (or the tenure gift) made the player a citizen mid-session:
    // offer a restart so everything read at load catches up (task 0303).
    window.addEventListener(CITIZENSHIP_GRANTED_MID_SESSION_EVENT, () => {
      this.citizenshipRestartOffer.onGranted().catch((error) => {
        console.warn("Citizenship restart offer failed:", error);
      });
    });

    const spModal = document.querySelector(
      "single-player-modal",
    ) as SinglePlayerModal;
    if (!spModal || !(spModal instanceof SinglePlayerModal)) {
      console.warn("Singleplayer modal element not found");
    }

    const missionButton = document.getElementById("single-play-mission") as
      | (HTMLElement & { label: string; disable: boolean })
      | null;
    if (!missionButton) {
      console.warn("Single play mission button element not found");
    } else {
      const updateMissionButtonLabel = () => {
        const level = getNextMissionLevel();
        missionButton.label = translateText("main.play_mission", { level });
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
        flashistConstants.analyticEvents.UI_CLICK_SINGLE_PLAYER,
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

    document
      .getElementById("feedback-button")
      ?.addEventListener("click", () => {
        showFeedbackModal(FeedbackModalScreenSource.start);
      });
    window.addEventListener("show-feedback-modal", (e: Event) => {
      const detail = (e as CustomEvent<{ matchId?: string }>).detail;
      showFeedbackModal(FeedbackModalScreenSource.battle, detail?.matchId);
    });

    const hostModal = document.querySelector(
      "host-lobby-modal",
    ) as HostPrivateLobbyModal;
    if (!hostModal || !(hostModal instanceof HostPrivateLobbyModal)) {
      console.warn("Host private lobby modal element not found");
    }
    const hostLobbyButton = document.getElementById("host-lobby-button");
    if (hostLobbyButton === null) throw new Error("Missing host-lobby-button");
    // Tasks 0302/0354: the row is shown only when citizenship surfaces are on
    // AND (tester OR private_lobbies_all); Create is a citizen perk (locked for
    // everyone else), Join stays free.
    const privateLobbyAccess = new PrivateLobbyAccess();
    void privateLobbyAccess.start();
    hostLobbyButton.addEventListener("click", () => {
      this.fireFirstAction();
      privateLobbyAccess.onCreateTap(() => {
        if (this.usernameInput?.isValid()) {
          openHostLobbyFromStartScreen({
            // Task 0228: a join still being set up counts, so it is cancelled.
            isInLobby: () => this.lobbyJoins.isInLobbyOrJoining(),
            leaveLobby: () => void this.handleLeaveLobby(),
            clearPublicLobbyHighlight: () => this.publicLobby.leaveLobby(),
            openHostModal: () => hostModal.open(),
          });
        }
      });
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

    // Task 0382 (ADR-119): a Yandex invite link's payload opens the Join window
    // once — at startup, or when a late SDK arrives. Whatever the private-lobby
    // flags say (owner ruling (a)): no flag check here.
    this.openedInviteAtStartup = this.openInviteFromPayload();
    if (!FlashistFacade.instance.yandexGamesSDK) {
      void FlashistFacade.instance
        .whenYandexSdkAvailable()
        .then(() => this.openInviteFromPayload());
    }

    const onHashUpdate = () => {
      // Reset the UI to its initial state
      this.joinModal.close();
      // Task 0228: also cancels a join still being set up.
      if (this.lobbyJoins.isInLobbyOrJoining()) {
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

    checkReconnectSession().then((session) => {
      if (session) {
        this.showReconnectBanner(session);
      }
    });

    // Disabling mobile-rendering experiments, due to bad AB test results
    // FlashistFacade.instance
    //   .checkExperimentFlag(
    //     flashistConstants.experiments.MOBILE_RENDERING_FLAG_NAME,
    //     flashistConstants.experiments.MOBILE_RENDERING_FLAG_VALUE,
    //   )
    //   .then((enabled) => {
    //     if (enabled) enableMobileRenderingOpts();
    //   });

    this.initializeFuseTag();

    // Session:Heartbeat — fires every 5 real-clock minutes, skipped when tab is hidden
    let hbMinutes = 0;
    const hbInterval = window.setInterval(
      () => {
        hbMinutes += 5;
        if (hbMinutes > 60) {
          clearInterval(hbInterval);
          return;
        }
        if (document.visibilityState === "hidden") return;
        const label = String(hbMinutes).padStart(2, "0");
        flashist_logEventAnalytics(
          `${flashistConstants.analyticEvents.SESSION_HEARTBEAT}:${label}`,
        );
      },
      5 * 60 * 1000,
    );
  }

  private showReconnectBanner(session: ReconnectSession): void {
    const modal = document.querySelector("reconnect-modal");
    if (modal instanceof ReconnectModal) {
      modal.show(session);
    }
  }

  private openInviteFromPayload(): boolean {
    return openInviteFromPayload({
      readPayload: () => FlashistFacade.instance.getInvitePayload(),
      // Review R1: a join still being set up (task 0336), or the tutorial
      // before its join, is busy too — opening then would start a second join.
      isBusy: () =>
        this.gameStop !== null || this.tutorialStarting || !isOnStartScreen(),
      openJoinWindow: (code) => this.joinModal.open(code),
    });
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
        console.log(
          "ERROR! Something went wrong. Please contact support. if (!patternName) {",
        );
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
      // Task 0380: ignored on the Yandex build (links off the portal are not
      // allowed there); standalone opens the join window exactly as before.
      const lobbyId = lobbyIdFromJoinHash(
        decodedHash,
        FlashistFacade.instance.yaGamesAvailable,
      );
      if (lobbyId !== null) {
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
    // Task 0404 review R1: the forced refresh popup is up and its only exit is
    // a reload, so a lobby or match started now would be cut off by it. Clicks
    // cannot reach a join (the popup is topmost), but a join already on its way
    // can — a Mission click whose ad ends after the popup appeared, or a key
    // press on a covered window. Drop it; the player refreshes first.
    if (isLongSessionRefreshShowing()) {
      console.log("long-session refresh popup is up, not joining");
      return;
    }
    // Task 0336: away from the first line, not only once gameStop is set. Keep
    // it before any await: the host and join windows end their own markers
    // right after they send `join-lobby` (0336 review R3).
    const endJoining = beginJoiningLobby();
    try {
      await this.joinLobbyFromEvent(event);
    } finally {
      endJoining();
    }
  }

  private async joinLobbyFromEvent(event: CustomEvent<JoinLobbyEvent>) {
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
      // Calls the stopper once and clears it (task 0228).
      this.lobbyJoins.leave();
      this.stopPerformanceMonitor();
    }
    // Task 0228: the latest join wins. The ticket is taken before the first
    // await, so a later join or a leave during setup makes this one stale. A
    // throw before it connects ends the join as before, without leaving it
    // "being set up" (review R1).
    await this.lobbyJoins.runJoin((join) => this.setUpAndConnect(join, event));
  }

  private async setUpAndConnect(
    join: JoinTicket,
    event: CustomEvent<JoinLobbyEvent>,
  ) {
    const lobby = event.detail;
    const { config, pattern, yandexPlayerId } = await this.loadJoinSetup();
    if (!join.isCurrent()) {
      console.log(
        `joining lobby ${lobby.gameID}: replaced or left while setting up, not joining`,
      );
      return;
    }

    const joinGeneration = ++this.joinGeneration;
    const stop = joinLobby(
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
        yandexPlayerId,
        gameStartInfo: lobby.singlePlayGameStartInfo ?? lobby.gameRecord?.info,
        gameRecord: lobby.gameRecord,
        isReconnect: lobby.isReconnect,
        preloadMapData: event.detail.preloadMapData,
      },
      () => {
        console.log("Closing modals");
        setStartScreenControlsHidden(true);
        // The page reloads after the match, so a waiting restart offer is moot.
        this.citizenshipRestartOffer.onMatchStarting();
        document
          .getElementById("username-validation-error")
          ?.classList.add("hidden");
        closePreStartModals();
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
        this.restartPerformanceMonitor();
        // This join now owns the live monitor. Claimed here, beside the start,
        // so ownership follows the monitor rather than the mint order.
        this.monitorGeneration = joinGeneration;
        this.joinModal.close();
        this.publicLobby.stop();
        incrementGamesPlayed();

        document.querySelectorAll(".ad").forEach((ad) => {
          (ad as HTMLElement).style.display = "none";
        });

        // Removed: #refresh history push.
        // Originally part of a two-step history pattern (#refresh → #join=gameID).
        // #join=gameID is disabled for all game types (Flashist Adaptation),
        // making #refresh a no-op that caused double page reloads on browser refresh.

        // Flashist Adaptation: disabling the #join URL, cuz it's not clear how to handle it for now at Yandex Games
        // history.pushState(null, "", `#join=${lobby.gameID}`);
      },
      () => {
        // A superseded game's teardown can settle late — onJoin() starts the
        // monitor before createClientGame() is even called, so game N's chain
        // may still be in flight when game N+1 is already running.
        // Only the join that OWNS the live monitor may stop it: keying on the
        // most recent join instead would let an interleaved pair invert, so the
        // dead game skips its stop and the live game's monitor stays killed.
        if (joinGeneration !== this.monitorGeneration) {
          return;
        }
        // The game died, or never came into existence. Stop the monitor only:
        // gameStop is deliberately left alone here.
        this.stopPerformanceMonitor();
      },
    );
    join.connected(stop);
  }

  // Everything a join awaits before it connects. The Yandex id is awaited here,
  // not inside joinLobby's arguments, so the isCurrent() check after this sees
  // everything that happened during it (task 0228).
  private async loadJoinSetup() {
    const config = await getServerConfigFromClient();
    const pattern = this.userSettings.getSelectedPatternName(
      await fetchCosmetics(),
    );
    const yandexPlayerId = await FlashistFacade.instance.getYandexUniqueId();
    return { config, pattern, yandexPlayerId };
  }

  async startTutorial(): Promise<void> {
    this.tutorialStarting = true;
    try {
      await this.dispatchTutorialJoin();
    } finally {
      // handleJoinLobby marks the join (beginJoiningLobby) before its first
      // await, so the busy window has no gap once `join-lobby` is sent.
      this.tutorialStarting = false;
    }
  }

  private async dispatchTutorialJoin(): Promise<void> {
    const attemptNumber = incrementAndGetTutorialAttemptCount();
    flashist_logEventAnalytics(
      flashistConstants.analyticEvents.TUTORIAL_STARTED,
      attemptNumber,
    );

    const clientID = generateID();
    const gameID = generateID();

    const usernameInput = document.querySelector(
      "username-input",
    ) as UsernameInput;
    const username = usernameInput?.getCurrentUsername() ?? "Player";

    const cosmetics = await fetchCosmetics().catch(() => null);
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
          singlePlayGameStartInfo: {
            gameID,
            players: [
              {
                clientID,
                username,
                cosmetics: {
                  pattern: selectedPattern ?? undefined,
                  color: selectedColor ? { color: selectedColor } : undefined,
                },
                // Singleplayer builds its start info locally and never reaches the
                // profile API, so there is no citizen icon here (0068 residual 3).
                isCitizen: false,
              },
            ],
            config: {
              gameMap: GameMapType.World, // overridden by LocalServer.buildMissionConfigIfNeeded
              gameMapSize: GameMapSize.Compact,
              gameType: GameType.Singleplayer,
              gameMode: GameMode.FFA,
              playerTeams: 2,
              difficulty: Difficulty.Easy,
              bots: 100,
              infiniteGold: false,
              startGold: 0,
              donateGold: true,
              donateTroops: true,
              infiniteTroops: false,
              instantBuild: false,
              disabledUnits: [],
              disableNPCs: false,
              isTutorial: true,
            },
          },
        } satisfies JoinLobbyEvent,
        bubbles: true,
        composed: true,
      }),
    );
  }

  private async startSinglePlayMission() {
    //
    flashist_logEventAnalytics(
      flashistConstants.analyticEvents.UI_CLICK_MISSION,
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
          singlePlayGameStartInfo: {
            gameID,
            players: [
              {
                clientID,
                username,
                cosmetics: {
                  pattern: selectedPattern ?? undefined,
                  color: selectedColor ? { color: selectedColor } : undefined,
                },
                // Singleplayer builds its start info locally and never reaches the
                // profile API, so there is no citizen icon here (0068 residual 3).
                isCitizen: false,
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
              startGold: 0,
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
      // Task 0228: a join still being set up has no stopper yet. Cancel it, so
      // it stops before connecting instead of joining after the player left.
      // No start-screen reset: its onPrestart never ran, and its presence
      // marker (task 0336) ends on its own and wakes the start-screen waiters.
      // Only the public card's own highlight may still say "joined".
      if (this.lobbyJoins.leave() === "cancelled-setup") {
        console.log("leaving lobby, cancelling a join still being set up");
        this.publicLobby.leaveLobby();
      }
      return;
    }
    console.log("leaving lobby, cancelling game");
    this.logActiveMatchAbandon();
    // Calls the stopper once and clears it.
    this.lobbyJoins.leave();
    reportBackOnStartScreen();
    this.stopPerformanceMonitor();
    clearReconnectSession();
    this.gutterAds.hide();
    this.publicLobby.leaveLobby();
    setStartScreenControlsHidden(false);
    // A grant made while in the lobby shows its restart offer now (task 0303).
    this.citizenshipRestartOffer.onBackOnStartScreen();
  }

  private stopPerformanceMonitor(): void {
    this.perfMonitorStop?.();
    this.perfMonitorStop = null;
  }

  // Always stops any predecessor first: this is the only start site, so a
  // teardown path that forgets to stop costs one stale monitor, never a
  // growing pile of them.
  private restartPerformanceMonitor(): void {
    this.stopPerformanceMonitor();
    this.perfMonitorStop = startPerformanceMonitor();
  }

  private logActiveMatchAbandon(): void {
    if (!this.gameHasStarted || this.gameHasEnded) {
      return;
    }

    this.gameHasEnded = true;
    logMatchEndAnalytics();
    flashist_logEventAnalytics(flashistConstants.analyticEvents.GAME_ABANDON);
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

// The application starting point, called by Bootstrap.ts after platform
// initialization (Yandex SDK, experiment flags, player data, language) has
// settled — the DOM is fully parsed and every init guarantee holds here.
// The UI is wired synchronously before the first await; only the first-time
// tutorial auto-launch runs past it.
export async function startClient(): Promise<void> {
  startBuildVersionChecker();

  // Log the player into the profile backend once per page load, fire-and-forget:
  // it never throws, guests and an unconfigured API make no call, and nothing
  // downstream waits for it (task 0273, S4).
  void startProfileSession();

  const client = new Client();
  client.initialize();

  // The forced "please refresh" popup after 23 h, start screen only (task
  // 0404). After initialize(), which registers the start-screen source.
  startLongSessionRefreshChecker();

  // Tutorial: auto-launch for first-time players — not when an invite opened
  // the Join window on this load (task 0382), or its join would replace the
  // friend's.
  if (
    shouldAutoLaunchTutorial(
      Boolean(localStorage.getItem(TUTORIAL_COMPLETED_KEY)),
      client.openedInviteAtStartup,
    )
  ) {
    await client.startTutorial();
  }
}

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

/**
 * sessionStorage, or null when it is unavailable (private mode / iframe policy) —
 * merely TOUCHING the property can throw, so the access itself is guarded.
 */
function readSessionStorage(): Pick<Storage, "getItem" | "setItem"> | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}
