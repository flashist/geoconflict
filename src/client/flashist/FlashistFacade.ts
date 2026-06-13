import type { LangSelector } from "../LangSelector";
import { GameAnalytics } from "gameanalytics";
import { setOtelUser } from "../OtelBrowserInit";
import { isMobileDevice } from "../Utils";
import version from "../../version";
import { logDaysPlayedAnalytics } from "../DaysPlayedAnalytics";
import { canUseGuestProfileForState } from "./guestProfileEligibility";
import {
  consumePendingSessionEnd,
  startSessionMatchTracking,
} from "../SessionMatchAnalytics";

export const TELEGRAM_CHANNEL_URL = "https://t.me/gameworldwar";
export const VK_CHANNEL_URL = "https://vk.com/gameworldwar";

export const flashistConstants = {
  analyticEvents: {
    UI_CLICK_MULTIPLAYER: "UI:ClickMultiplayer",
    UI_CLICK_SINGLE_PLAYER: "UI:ClickSinglePlayer",
    UI_CLICK_MISSION: "UI:ClickMission",
    UI_CLICK_STALE_BUILD_REFRESH: "UI:ClickStaleBuildRefresh",
    UI_CLICK_STALE_BUILD_CONTACT: "UI:ClickStaleBuildContact",
    ANNOUNCEMENTS_OPENED: "Announcements:Opened",
    ANNOUNCEMENTS_CLOSED: "Announcements:Closed",

    GAME_START: "Game:Start",
    GAME_MODE_MULTIPLAYER: "Game:Mode:Multiplayer",
    GAME_MODE_SOLO: "Game:Mode:Solo",
    GAME_END: "Game:End",
    GAME_WIN: "Game:Win",
    GAME_LOSS: "Game:Loss",
    GAME_ABANDON: "Game:Abandon",
    PLAYER_ELIMINATED: "Player:Eliminated",

    RECONNECT_PROMPT_SHOWN: "Reconnect:PromptShown",
    RECONNECT_ACCEPTED: "Reconnect:Accepted",
    RECONNECT_DECLINED: "Reconnect:Declined",
    RECONNECT_SUCCEEDED: "Reconnect:Succeeded",
    RECONNECT_FAILED: "Reconnect:Failed",

    FEEDBACK_BUTTON_OPENED: "Feedback:ButtonOpened",
    FEEDBACK_SUBMITTED: "Feedback:Submitted",

    SUBSCRIBE_BUTTON_OPENED: "Subscribe:Opened",
    SUBSCRIBE_SUBMITTED: "Subscribe:Submitted",

    SESSION_START: "Session:Start",
    SESSION_HEARTBEAT: "Session:Heartbeat",
    SESSION_FIRST_ACTION: "Session:FirstAction",
    SESSION_MATCHES_PLAYED: "Session:MatchesPlayed",
    SESSION_PLATFORM_INIT_TIMEOUT: "Session:PlatformInitTimeout",
    MATCH_SPAWN_CHOSEN: "Match:SpawnChosen",
    MATCH_SPAWN_AUTO: "Match:SpawnAuto",
    MATCH_SPAWNED_CONFIRMED: "Match:Spawned",
    MATCH_DURATION: "Match:Duration",
    MATCH_SPAWN_MISSED_TIMING_RACE: "Match:SpawnMissed:TimingRace",
    MATCH_SPAWN_MISSED_NO_ATTEMPT: "Match:SpawnMissed:NoAttempt",
    MATCH_SPAWN_RETRY_AFTER_CATCHUP: "Match:SpawnRetryAfterCatchup",
    MATCH_SPAWN_MISSED_CATCHUP_TOO_LONG: "Match:SpawnMissed:CatchupTooLong",
    MATCH_LOSS_OPPONENT_WON: "Match:Loss:OpponentWon",

    MATCH_PRELOAD_STARTED: "Match:PreloadStarted",
    MATCH_PRELOAD_READY: "Match:PreloadReady",
    MATCH_PRELOAD_HIT_LOADED: "Match:PreloadHitLoaded",
    MATCH_PRELOAD_HIT_NOT_LOADED: "Match:PreloadHitNotLoaded",
    MATCH_PRELOAD_MISS: "Match:PreloadMiss",

    PERFORMANCE_FPS_AVERAGE: "Performance:FPSAverage",
    PERFORMANCE_FPS_ABOVE30: "Performance:FPS:Above30",
    PERFORMANCE_FPS_15TO30: "Performance:FPS:15to30",
    PERFORMANCE_FPS_BELOW15: "Performance:FPS:Below15",
    PERFORMANCE_MEMORY_HIGH: "Performance:Memory:High",
    PERFORMANCE_MEMORY_MEDIUM: "Performance:Memory:Medium",
    PERFORMANCE_MEMORY_LOW: "Performance:Memory:Low",

    DEVICE_MOBILE: "Device:mobile",
    DEVICE_DESKTOP: "Device:desktop",
    DEVICE_TABLET: "Device:tablet",
    DEVICE_TV: "Device:tv",

    PLATFORM_ANDROID: "Platform:android",
    PLATFORM_IOS: "Platform:ios",
    PLATFORM_WINDOWS: "Platform:windows",
    PLATFORM_MACOS: "Platform:macos",
    PLATFORM_LINUX: "Platform:linux",
    PLATFORM_OTHER: "Platform:other",

    PLAYER_NEW: "Player:New",
    PLAYER_RETURNING: "Player:Returning",
    PLAYER_DAYS_PLAYED: "Player:DaysPlayed",
    PLAYER_YANDEX_LOGGED_IN: "Player:YandexLoggedIn",
    PLAYER_YANDEX_GUEST: "Player:YandexGuest",
    PLAYER_YANDEX_UNKNOWN: "Player:YandexUnknown",

    WORKER_INIT_SUCCESS: "Worker:InitSuccess",
    WORKER_INIT_FAILED: "Worker:InitFailed",

    TUTORIAL_STARTED: "Tutorial:Started",
    TUTORIAL_TOOLTIP_SHOWN_FIRST_PART: "Tutorial:TooltipShown:",
    TUTORIAL_TOOLTIP_CLOSED_FIRST_PART: "Tutorial:TooltipClosed:",
    // TUTORIAL_TOOLTIP_SHOWN_1: "Tutorial:TooltipShown:1",
    // TUTORIAL_TOOLTIP_SHOWN_2: "Tutorial:TooltipShown:2",
    // TUTORIAL_TOOLTIP_SHOWN_3: "Tutorial:TooltipShown:3",
    // TUTORIAL_TOOLTIP_SHOWN_4: "Tutorial:TooltipShown:4",
    // TUTORIAL_TOOLTIP_SHOWN_5: "Tutorial:TooltipShown:5",
    // TUTORIAL_TOOLTIP_SHOWN_6: "Tutorial:TooltipShown:6",
    // TUTORIAL_TOOLTIP_SHOWN_7: "Tutorial:TooltipShown:7",
    TUTORIAL_SKIPPED: "Tutorial:Skipped",
    TUTORIAL_COMPLETED: "Tutorial:Completed",
    TUTORIAL_DURATION: "Tutorial:Duration",

    UI_TAP_FIRST_PART: "UI:Tap:",

    CITIZENSHIP_SURFACE_SEEN: "Citizenship:Seen",

    BUILD_STALE_DETECTED: "Build:StaleDetected",
  },

  uiElementIds: {
    announcementsBell: "AnnouncementsBell",
    telegramLinkStartScreen: "TelegramLinkStartScreen",
    telegramLinkGameEnd: "TelegramLinkGameEnd",
    vkLinkStartScreen: "VkLinkStartScreen",
    vkLinkGameEnd: "VkLinkGameEnd",
    tutorialSkipBtnCorner: "TutorialSkipBtnCorner",
    tutorialSkipBtnInline: "TutorialSkipBtnInline",
    multiplayerTab: "MultiplayerTab",
    singleplayerTab: "SingleplayerTab",
    citizenshipLoginToEarn: "CitizenshipLoginToEarn",
  },

  progressionEventStatus: {
    Undefined: 0,
    Start: 1,
    Complete: 2,
    Fail: 3,
  },

  experiments: {
    // Yandex.Games remote flag for testing of showing more ads during interstitial
    // JOIN_MORE_ADS_FLAG_NAME: "join_more_ads",
    // JOIN_MORE_ADS_FLAG_VALUE: "enabled",
    EMAIL_SUBSCRIBE_BUTTON_FLAG_NAME: "email_subscribe_button",
    EMAIL_SUBSCRIBE_BUTTON_ENABLED_VALUE: "enabled",
    TELEGRAM_LINK_FLAG_NAME: "telegram_link",
    TELEGRAM_LINK_ENABLED_VALUE: "enabled",
    VK_LINK_FLAG_NAME: "vk_link",
    VK_LINK_ENABLED_VALUE: "enabled",
    CITIZENSHIP_UI_FLAG_NAME: "citizenship_ui",
    CITIZENSHIP_UI_ENABLED_VALUE: "enabled",
  },

  ads: {
    interstitial: {
      join: {
        minDurationBeforeGameSec: 15,
        minOpenSlotsCount: 3,
      },
    },
  },
};

// Working with analytics logs
export const flashist_logEventAnalytics = (event: string, value?: number) => {
  if (process.env.DEPLOY_ENV !== "prod") {
    console.log(
      "flashist_logEventAnalytics | logEvent __ event: ",
      event,
      " | value: ",
      value,
    );
    return;
  }

  try {
    let isNeedToSendValue: boolean = false;
    if (value !== undefined) {
      isNeedToSendValue = true;
    }
    GameAnalytics.addDesignEvent(event, value, isNeedToSendValue);
  } catch (error) {
    flashist_logErrorToAnalytics(
      "ERROR! flashist_logEventAnalytics | logEvent __ error: ",
      error,
    );
  }
};
//
// export const logProgressionEvent = (status, id1, id2?, id3?) => {
//     try {
//         GameAnalytics.addProgressionEvent(status, id1, id2, id3);

//     } catch (error) {
//         flashist_logErrorToAnalytics("ERROR! logProgressionEvent | addProgressionEvent __ error: ", error);
//     }
// }

// Working iwth unhendled errors
export const flashist_logErrorTypes = {
  UNDEFINED: "Undefined",
  ERROR: "Error",
  DEBUG: "Debug",
  INFO: "Info",
  WARNING: "Warning",
  CRITICAL: "Critical",
};
export const flashist_logErrorToAnalytics = (
  errorText: string,
  severity?: string,
) => {
  console.log(
    "flashist_logErrorToAnalytics __ errorText: ",
    errorText,
    " | severity: ",
    severity,
  );

  if (process.env.DEPLOY_ENV !== "prod") {
    return;
  }

  severity ??= flashist_logErrorTypes.ERROR;

  // Available strings for severity
  // "Undefined", "Debug", "Info", "Warning", "Error", "Critical"
  // GameAnalytics.addErrorEvent("Error", errorText);
  GameAnalytics.addErrorEvent(severity, errorText);

  //     EGAErrorSeverity[EGAErrorSeverity[] = 0] = "Undefined";
  //     EGAErrorSeverity[EGAErrorSeverity[] = 1] = "Debug";
  //     EGAErrorSeverity[EGAErrorSeverity[] = 2] = "Info";
  //     EGAErrorSeverity[EGAErrorSeverity[] = 3] = "Warning";
  //     EGAErrorSeverity[EGAErrorSeverity[] = 4] = "Error";
  //     EGAErrorSeverity[EGAErrorSeverity[] = 5] = "Critical";
};
window.onerror = function (msg, url, line, col, error) {
  // Note that col & error are new to the HTML 5 spec and may not be
  // supported in every browser.  It worked for me in Chrome.
  let extra = !col ? "" : "\ncolumn: " + col;
  extra += !error ? "" : "\nerror: " + error;

  // You can view the information in an alert to see things working like this:
  // alert("Error: " + msg + "\nurl: " + url + "\nline: " + line + extra);
  const errorText =
    "Error: " + msg + "\nurl: " + url + "\nline: " + line + extra;

  // TODO: Report this error via ajax so you can keep track
  //       of what pages have JS issues

  // var suppressErrorAlert = true;
  // // If you return true, then error alerts (like in older versions of
  // // Internet Explorer) will be suppressed.
  // return suppressErrorAlert;

  // GameIframeCommunicationManager.sendErrorAnalyticsEvent(errorText, ErrorEventSeverity.ERROR);
  flashist_logErrorToAnalytics(errorText, flashist_logErrorTypes.ERROR);

  return false;
};
window.addEventListener("unhandledrejection", (event) => {
  // console.error('Unhandled rejection (promise: ', event.promise, ', reason: ', event.reason, ').');
  let errorText =
    "Unhandled rejection:\npromise: " +
    event.promise +
    ",\nreason: " +
    event.reason;
  if (event.reason?.stack) {
    errorText += ",\nstack: " + event.reason?.stack;
  }
  errorText += "\n).";

  // GameIframeCommunicationManager.sendErrorAnalyticsEvent(errorText, ErrorEventSeverity.ERROR);
  flashist_logErrorToAnalytics(errorText, flashist_logErrorTypes.DEBUG);
});

// declare let YaGames: any;

const YANDEX_SDK_INIT_TIMEOUT_MS = 1000;
// Hard deadline for the blocking part of platform init (SDK init, player data,
// experiment flags). On expiry the app continues in degraded mode instead of
// hanging on the loading screen.
const PLATFORM_INIT_DEADLINE_MS = 5000;
type YandexLoginStatus = "logged-in" | "guest" | "unknown";

export class FlashistFacade {
  private static _instance: FlashistFacade;
  public static get instance(): FlashistFacade {
    if (!FlashistFacade._instance) {
      FlashistFacade._instance = new FlashistFacade();
    }

    return FlashistFacade._instance;
  }

  // CONSTANTS
  public windowOrigin: string =
    window.location.origin + window.location.pathname;
  public rootPathname: string = window.location.pathname;

  public yaGamesAvailable: boolean = false;
  private hasLoggedYandexLoginStatus = false;
  private hasLoggedExperimentEvents = false;

  public yandexGamesSDK: any;

  constructor() {
    // Platform detection. The production iframe template sets
    // window.flashist_isYandexPlatform before the (async) SDK script tag, so
    // this is reliable even before sdk.js has loaded. The YaGames check is a
    // fallback for HTML that loads sdk.js synchronously.
    if (
      (window as any).flashist_isYandexPlatform === true ||
      typeof (window as any).YaGames !== "undefined"
    ) {
      this.yaGamesAvailable = true;
    }

    // Deferred promises: created here so every internal
    // `await this.yandexInitPromise` contract holds regardless of when
    // initializePlatform() is called. Resolved during platform init — they
    // always resolve (never reject), even on SDK failure or timeout.
    this.yandexInitPromise = new Promise((resolve) => {
      this.yandexInitPromiseResolve = resolve;
    });
    this.yandexSdkInitPlayerPromise = new Promise((resolve) => {
      this.yandexSdkInitPlayerPromiseResolve = resolve;
    });
    this.initializationPromise = new Promise((resolve) => {
      this.initializationPromiseResolve = resolve;
    });
  }

  // Part 1 of initialization — everything that must NOT wait on external SDKs:
  // analytics bootstrap, device/platform info, session tracking. Called by
  // Bootstrap.ts at the very start, before the platform init gate blocks.
  private hasInitializedImmediate = false;
  public initializeImmediate(): void {
    if (this.hasInitializedImmediate) return;
    this.hasInitializedImmediate = true;

    consumePendingSessionEnd((matchesPlayed) => {
      flashist_logEventAnalytics(
        flashistConstants.analyticEvents.SESSION_MATCHES_PLAYED,
        matchesPlayed,
      );
    });

    // Setting up Game Analytics — disabled for dev and staging builds to avoid
    // polluting production analytics data with non-production sessions.
    if (process.env.DEPLOY_ENV === "prod") {
      GameAnalytics.setEnabledInfoLog(true);
      GameAnalytics.setEnabledVerboseLog(true);

      // Platform custom dimensions
      const isMobile = isMobileDevice();
      const isYandex = this.yaGamesAvailable;
      GameAnalytics.setCustomDimension01(isMobile ? "mobile" : "desktop");
      GameAnalytics.setCustomDimension02(isYandex ? "yandex" : "web");

      GameAnalytics.configureBuild(version);
      GameAnalytics.initialize(
        "a1f0fb4335fe32696c3b76eb49612ead",
        "ba57db678bc9a1181bde9430bad83c6fa3b71862",
      );
      flashist_logEventAnalytics(
        flashistConstants.analyticEvents.SESSION_START,
      );
    }

    startSessionMatchTracking();

    // Device:Type — fired once per session after Session:Start
    const ua = navigator.userAgent;
    let deviceType: string;
    if (
      /SmartTV|SMART-TV|HbbTV|Tizen|WebOS|VIDAA|PlayStation|Xbox|Nintendo/i.test(
        ua,
      )
    ) {
      deviceType = flashistConstants.analyticEvents.DEVICE_TV;
    } else if (/iPad|Android(?!.*Mobile)/i.test(ua)) {
      deviceType = flashistConstants.analyticEvents.DEVICE_TABLET;
    } else if (
      window.matchMedia("(pointer: coarse)").matches ||
      /Android|iPhone/i.test(ua)
    ) {
      deviceType = flashistConstants.analyticEvents.DEVICE_MOBILE;
    } else {
      deviceType = flashistConstants.analyticEvents.DEVICE_DESKTOP;
    }
    flashist_logEventAnalytics(deviceType);

    // Platform:OS — fired once per session after Device:Type
    let osType: string;
    if (/Android/i.test(ua)) {
      osType = flashistConstants.analyticEvents.PLATFORM_ANDROID;
    } else if (/iPhone|iPad|iPod/i.test(ua)) {
      osType = flashistConstants.analyticEvents.PLATFORM_IOS;
    } else if (/Windows/i.test(ua)) {
      osType = flashistConstants.analyticEvents.PLATFORM_WINDOWS;
    } else if (/Mac OS X/i.test(ua)) {
      osType = flashistConstants.analyticEvents.PLATFORM_MACOS;
    } else if (/CrOS/i.test(ua)) {
      osType = flashistConstants.analyticEvents.PLATFORM_OTHER; // Chrome OS → other
    } else if (/Linux/i.test(ua)) {
      osType = flashistConstants.analyticEvents.PLATFORM_LINUX;
    } else {
      osType = flashistConstants.analyticEvents.PLATFORM_OTHER;
    }
    flashist_logEventAnalytics(osType);

    // Player:New — fired once ever (first visit); Player:Returning — fired every subsequent session start
    const FIRST_SEEN_KEY = "geoconflict.player.firstSeen";
    try {
      if (localStorage.getItem(FIRST_SEEN_KEY) === null) {
        localStorage.setItem(FIRST_SEEN_KEY, String(Date.now()));
        flashist_logEventAnalytics(flashistConstants.analyticEvents.PLAYER_NEW);
      } else {
        flashist_logEventAnalytics(
          flashistConstants.analyticEvents.PLAYER_RETURNING,
        );
      }
    } catch {
      // silently skip if storage is unavailable (e.g. sandboxed iframe)
    }

    logDaysPlayedAnalytics();
  }

  public readonly initializationPromise: Promise<void>;
  private initializationPromiseResolve!: () => void;

  // Part 2 of initialization — everything that depends on waiting: Yandex SDK
  // init, player data, experiment flags, language. Bounded by
  // PLATFORM_INIT_DEADLINE_MS; on timeout or SDK failure the app continues in
  // degraded mode (default flags, localStorage username, browser language, no ads).
  private hasStartedPlatformInit = false;
  public initializePlatform(): Promise<void> {
    if (!this.hasStartedPlatformInit) {
      this.hasStartedPlatformInit = true;
      this.runPlatformInit()
        .catch((error) => {
          flashist_logErrorToAnalytics(
            `ERROR! FlashistFacade | initializePlatform __ error: ${error}`,
          );
        })
        .finally(() => {
          // Whatever happened above, unblock everything: the gate must never hang.
          this.yandexInitPromiseResolve();
          this.yandexSdkInitPlayerPromiseResolve();
          this.initializationPromiseResolve();
        });
    }
    return this.initializationPromise;
  }

  private async runPlatformInit(): Promise<void> {
    // ONE shared deadline for the whole blocking part of platform init: SDK
    // script + YaGames.init() + player/flags together may consume at most
    // PLATFORM_INIT_DEADLINE_MS before the app continues in degraded mode.
    const deadlinePromise = new Promise<"deadline">((resolve) =>
      setTimeout(() => resolve("deadline"), PLATFORM_INIT_DEADLINE_MS),
    );
    let deadlineEventLogged = false;
    const logDeadlineEvent = () => {
      if (deadlineEventLogged) return;
      deadlineEventLogged = true;
      flashist_logEventAnalytics(
        flashistConstants.analyticEvents.SESSION_PLATFORM_INIT_TIMEOUT,
      );
    };

    const sdkInitDone = this.yandexSdkInit();
    // The 1s login-status window starts only once the SDK script itself is
    // ready: before the async-script change the tag was synchronous (fully
    // downloaded before any bundle code ran), so the window measured
    // YaGames.init() latency only — preserved here. A never-loading script is
    // covered by the deadline race further down.
    const sdkReadyForSessionPromise = this.waitForSdkScript().then(() =>
      this.waitForYandexSdkForSession(),
    );

    const sdkOutcome = await Promise.race([
      sdkInitDone.then(() => "done" as const),
      deadlinePromise,
    ]);
    if (sdkOutcome === "deadline") {
      logDeadlineEvent();
    }
    // SDK is ready, or we are committed to degraded mode — either way the
    // internal `await this.yandexInitPromise` consumers can proceed. If the
    // SDK arrives after the deadline, yandexGamesSDK is still assigned, so
    // runtime-only features (e.g. interstitials) recover late.
    this.yandexInitPromiseResolve();

    const sdkReady = await Promise.race([
      sdkReadyForSessionPromise,
      deadlinePromise.then(() => false as const),
    ]);
    if (!sdkReady) {
      // SDK timed out — yaGamesAvailable distinguishes "slow Yandex" from "no Yandex"
      this.logYandexLoginStatusEvent(
        this.yaGamesAvailable ? "unknown" : "guest",
      );
    } else if (!this.yandexGamesSDK) {
      // Init settled but produced no SDK object. On the Yandex platform this
      // means a failed script load or a rejected YaGames.init() — ambiguous,
      // not a real guest; only standalone/non-Yandex contexts are guests.
      this.logYandexLoginStatusEvent(
        this.yaGamesAvailable ? "unknown" : "guest",
      );
    } else {
      // SDK ready in time — schedule deferred status after player auth resolves
      this.scheduleYandexLoginStatusEvent();
    }

    // Player data and experiment flags in parallel, sharing the same overall
    // deadline — a hung getPlayer()/getFlags() call must not block app start.
    const playerInitResultPromise = this.initPlayer();
    this.playerInitResultPromise = playerInitResultPromise;
    const settledPromise = Promise.allSettled([
      playerInitResultPromise,
      this.loadExperimentFlags(),
    ]);
    const settledResults = await Promise.race([
      settledPromise,
      deadlinePromise.then(() => null),
    ]);
    this.yandexSdkInitPlayerPromiseResolve();
    // Experiment cohort events fire when the flags actually settle — possibly
    // after the deadline; logExperimentEvents latches only once flags exist.
    void settledPromise.then(() => this.logExperimentEvents());

    if (settledResults === null) {
      logDeadlineEvent();
    } else {
      const [playerResult, flagsResult] = settledResults;
      if (playerResult.status === "rejected") {
        console.warn("Init step failed: player init", playerResult.reason);
      }
      if (flagsResult.status === "rejected") {
        console.warn("Init step failed: experiment flags", flagsResult.reason);
      }
    }

    // Language code resolved here (after SDK settle) so LangSelector can read
    // it synchronously at upgrade time, before its first render.
    this.resolvedLanguageCode = await this.getLanguageCode().catch(() => "");

    // Apply experiment-driven config mutations — guaranteed to be after flags are loaded
    // const joinMoreAdsEnabled = await this.checkExperimentFlag(
    //     flashistConstants.experiments.JOIN_MORE_ADS_FLAG_NAME,
    //     flashistConstants.experiments.JOIN_MORE_ADS_FLAG_VALUE,
    // );
    // if (joinMoreAdsEnabled) {
    //     flashistConstants.ads.interstitial.join = flashistConstants.ads.interstitial.joinMoreAds;
    // }

    // OTEL user context (best-effort)
    const name = await this.getCurPlayerName().catch(() => undefined);
    if (name) setOtelUser(name);
  }

  private waitForYandexSdkForSession(): Promise<boolean> {
    const timeout = new Promise<false>((resolve) =>
      setTimeout(() => resolve(false), YANDEX_SDK_INIT_TIMEOUT_MS),
    );
    return Promise.race([
      this.yandexInitPromise.then(() => true as const),
      timeout,
    ]);
  }

  // The real initPlayer() promise (unlike yandexSdkInitPlayerPromise, which is
  // a deferred force-resolved at the deadline). Used by the late-SDK recovery
  // in yandexSdkInit: the field is only assigned once stage 2 of platform init
  // has run, so the recovery chain can tell a degraded boot (field set, no
  // player) from the normal path (field still unset at SDK-arrival time).
  private playerInitResultPromise: Promise<void> | undefined;

  private async resolveYandexLoginStatus(): Promise<YandexLoginStatus> {
    // Resolves at the latest when the platform deadline force-resolves the
    // deferred — the status event must fire exactly once per session even if
    // getPlayer() never settles.
    await this.yandexSdkInitPlayerPromise.catch(() => {});
    if (!this.yandexSdkPlayerObject) {
      // getPlayer() still pending past the deadline, or settled without a
      // player object — auth state undetermined.
      return "unknown";
    }
    return this.isYandexLoggedIn() ? "logged-in" : "guest";
  }

  private logYandexLoginStatusEvent(status: YandexLoginStatus): void {
    if (this.hasLoggedYandexLoginStatus) return;
    this.hasLoggedYandexLoginStatus = true;
    if (status === "logged-in") {
      flashist_logEventAnalytics(
        flashistConstants.analyticEvents.PLAYER_YANDEX_LOGGED_IN,
      );
    } else if (status === "guest") {
      flashist_logEventAnalytics(
        flashistConstants.analyticEvents.PLAYER_YANDEX_GUEST,
      );
    } else {
      flashist_logEventAnalytics(
        flashistConstants.analyticEvents.PLAYER_YANDEX_UNKNOWN,
      );
    }
  }

  private scheduleYandexLoginStatusEvent(): void {
    this.resolveYandexLoginStatus().then((status) => {
      this.logYandexLoginStatusEvent(status);
    });
  }

  // Single place for working with URLS
  public changeHref(value) {
    // window.location.href = value;
    window.location.href = value;
  }

  public readonly yandexInitPromise: Promise<void>;
  private yandexInitPromiseResolve!: () => void;

  private async waitForSdkScript(): Promise<void> {
    // Resolves when the async sdk.js script tag has loaded or failed (see
    // yandex-games_iframe.html, which loads it with `async` so a slow CDN
    // cannot stall HTML parsing); resolves instantly on templates without the
    // SDK script, where the global is undefined.
    await (window as any).flashist_sdkScriptReadyPromise;
  }

  private async yandexSdkInit(): Promise<void> {
    await this.waitForSdkScript();

    if (typeof (window as any).YaGames === "undefined") {
      // Not on the Yandex platform, or the SDK script failed to load
      return;
    }
    this.yaGamesAvailable = true;

    try {
      const sdk = await (window as any).YaGames.init();
      console.log("FlashistFacade | Main | yandexInit > then __ sdk: ", sdk);
      this.yandexGamesSDK = sdk;
      // If the SDK arrived only after the gate (degraded boot that recovered
      // late), the template's one-shot reveal handler has already run without
      // an SDK and Yandex never got its LoadingAPI.ready() signal — deliver it
      // now. The latch in yandexGamesReadyCallback keeps ready() single-shot
      // on the normal path where the reveal handler also calls it.
      flashist_waitGameInitComplete().then(() => {
        this.yandexGamesReadyCallback();
      });
      // Same recovery for experiment flags: the boot-time fetch ran without an
      // SDK and was deliberately not memoized — fetch for real now so flag
      // checks later in the session work and cohort events fire (the latch in
      // logExperimentEvents dedupes). No-op on the normal path (memo present).
      void this.initExperimentFlags();
      // Player recovery, same pattern: chained on the boot-time initPlayer()
      // attempt, whose promise is only assigned once stage 2 has run — on the
      // normal path (SDK arrives mid-stage-1) the field is still unset here,
      // so this skips entirely and never duplicates getPlayer(). The
      // Player:Yandex* status event is NOT re-logged (latched); late state is
      // for callers that ask after recovery.
      void this.playerInitResultPromise
        ?.catch(() => {})
        .then(async () => {
          if (this.yandexSdkPlayerObject || !this.yandexGamesSDK) {
            return;
          }
          try {
            this.yandexSdkPlayerObject = await this.yandexGamesSDK.getPlayer();
            // Best-effort OTEL user context, mirroring the boot path
            const name = await this.getCurPlayerName().catch(() => undefined);
            if (name) setOtelUser(name);
          } catch {
            // Recovery is best-effort — the session stays in guest state
          }
        });
    } catch (error) {
      // A rejected YaGames.init() must not kill app start — degrade instead.
      flashist_logErrorToAnalytics(
        `ERROR! FlashistFacade | yandexSdkInit __ error: ${error}`,
      );
    }
  }

  // ready() must reach Yandex exactly once per session; callable both from the
  // template's reveal handler and from the late-SDK recovery in yandexSdkInit.
  private hasCalledYandexLoadingReady = false;
  public yandexGamesReadyCallback() {
    console.log(
      "FlashistFacade | yandexGamesReadyCallback | yandexGamesSDK: ",
      this.yandexGamesSDK,
    );

    if (this.yandexGamesSDK && !this.hasCalledYandexLoadingReady) {
      this.hasCalledYandexLoadingReady = true;
      console.log(
        "FlashistFacade | yandexGamesReadyCallback | ready callback __ BEFORE",
      );
      this.yandexGamesSDK.features?.LoadingAPI?.ready();
      console.log(
        "FlashistFacade | yandexGamesReadyCallback | ready callback __ AFTER",
      );
    }

    // TEST
    console.log(
      "FlashistFacade | yandexGamesReadyCallback __ yandexGamesReadyCallback __ COMPLETE _ 2",
    );
  }

  // FLAGS (Experiments)
  protected yandexInitExperimentsPromise: Promise<any>;
  protected yandexExperimentFlags: any;

  protected async loadExperimentFlags(): Promise<void> {
    await this.yandexInitPromise;

    if (!this.yandexGamesSDK) {
      // No SDK (yet — possibly a degraded boot whose SDK recovers late):
      // don't memoize a no-SDK result, so a later call can still fetch.
      return;
    }

    this.yandexInitExperimentsPromise ??= this.fetchExperimentFlags();

    return this.yandexInitExperimentsPromise;
  }

  private async fetchExperimentFlags(): Promise<void> {
    let experiments: any;

    if (this.yandexGamesSDK) {
      try {
        // Bounded: a hung getFlags() must not leave the memoized promise
        // pending forever — flag checks made later in the session await it.
        // One attempt; on timeout the session keeps default (absent) flags,
        // same as a failed fetch. No refetch.
        experiments = await Promise.race([
          this.yandexGamesSDK.getFlags(),
          new Promise((_, reject) =>
            setTimeout(
              () => reject(new Error("getFlags timed out")),
              PLATFORM_INIT_DEADLINE_MS,
            ),
          ),
        ]);
        experiments ??= {};
      } catch (error) {
        flashist_logErrorToAnalytics(
          `ERROR! FlashistFacade | loadExperimentFlags __ error: ${error}`,
          flashist_logErrorTypes.DEBUG,
        );
      }
    }

    this.yandexExperimentFlags = experiments;
  }

  protected logExperimentEvents(): void {
    if (this.hasLoggedExperimentEvents) return;
    if (!this.yandexExperimentFlags) {
      // Flags not loaded (yet, or no SDK) — don't latch, so flags that settle
      // after the init deadline still produce cohort events on arrival.
      return;
    }
    this.hasLoggedExperimentEvents = true;
    for (const [name, value] of Object.entries(this.yandexExperimentFlags)) {
      this.logExperimentEvent(name, String(value));
    }
  }

  protected async initExperimentFlags(): Promise<void> {
    await this.loadExperimentFlags();
    this.logExperimentEvents();
  }

  // public async getExperimentFlags(): Promise<any> {
  //     await this.initExperimentFlags();

  //     return this.yandexExperimentFlags;
  // }

  public async checkExperimentFlag(
    name: string,
    value: string,
  ): Promise<boolean> {
    if (process.env.GAME_ENV === "dev") {
      return true;
    }

    await this.initExperimentFlags();

    let result: boolean = false;

    if (this.yandexExperimentFlags) {
      if (this.yandexExperimentFlags[name] === value) {
        result = true;
      }
    }

    return result;
  }

  public async isEmailSubscribeButtonEnabled(): Promise<boolean> {
    return this.checkExperimentFlag(
      flashistConstants.experiments.EMAIL_SUBSCRIBE_BUTTON_FLAG_NAME,
      flashistConstants.experiments.EMAIL_SUBSCRIBE_BUTTON_ENABLED_VALUE,
    );
  }

  public async isTelegramLinkEnabled(): Promise<boolean> {
    return this.checkExperimentFlag(
      flashistConstants.experiments.TELEGRAM_LINK_FLAG_NAME,
      flashistConstants.experiments.TELEGRAM_LINK_ENABLED_VALUE,
    );
  }

  public async isVkLinkEnabled(): Promise<boolean> {
    return this.checkExperimentFlag(
      flashistConstants.experiments.VK_LINK_FLAG_NAME,
      flashistConstants.experiments.VK_LINK_ENABLED_VALUE,
    );
  }

  public async isCitizenshipUiEnabled(): Promise<boolean> {
    return this.checkExperimentFlag(
      flashistConstants.experiments.CITIZENSHIP_UI_FLAG_NAME,
      flashistConstants.experiments.CITIZENSHIP_UI_ENABLED_VALUE,
    );
  }

  public logExperimentEvent(name: string, value: string): void {
    flashist_logEventAnalytics(`Experiment:${name}:${value}`);
  }

  public logUiTapEvent(elementId: string): void {
    flashist_logEventAnalytics(
      flashistConstants.analyticEvents.UI_TAP_FIRST_PART + elementId,
    );
  }

  // PLAYER
  protected readonly yandexSdkInitPlayerPromise: Promise<void>;
  private yandexSdkInitPlayerPromiseResolve!: () => void;
  protected yandexSdkPlayerObject: any;
  protected async initPlayer(): Promise<void> {
    await this.yandexInitPromise;

    if (!this.yandexGamesSDK) {
      return; // No SDK available — nothing to initialize
    }

    try {
      this.yandexSdkPlayerObject = await this.yandexGamesSDK.getPlayer();
    } catch (error) {
      flashist_logErrorToAnalytics(
        `ERROR! FlashistFacade | initPlayer __ error: ${error}`,
        flashist_logErrorTypes.DEBUG,
      );

      throw error;
    }
  }

  private isYandexLoggedIn(): boolean {
    try {
      return !!this.yandexSdkPlayerObject?.isAuthorized();
    } catch {
      return false;
    }
  }

  public async isYandexAuthorized(): Promise<boolean> {
    await this.yandexSdkInitPlayerPromise.catch(() => {});
    return this.isYandexLoggedIn();
  }

  /**
   * Whether this session may use the client-local guest profile (S4 Profile T2).
   * Unlike `isYandexAuthorized()`, this does NOT treat an undetermined Yandex auth
   * state as a guest — see `canUseGuestProfileForState`. Resolves once platform
   * init has settled (bounded), so the auth state is final by the time callers
   * (app-init, match-end crediting) consult it.
   */
  public async canUseGuestProfile(): Promise<boolean> {
    await this.yandexSdkInitPlayerPromise.catch(() => {});
    return canUseGuestProfileForState({
      yaGamesAvailable: this.yaGamesAvailable,
      hasYandexPlayer: !!this.yandexSdkPlayerObject,
      isYandexAuthorized: this.isYandexLoggedIn(),
    });
  }

  public async openYandexAuthDialog(): Promise<boolean> {
    if (!this.yandexGamesSDK) {
      return false;
    }
    try {
      await this.yandexGamesSDK.auth.openAuthDialog();
      // Per Yandex SDK docs the player object must be re-fetched after the
      // auth dialog resolves to reflect the new authorization state.
      this.yandexSdkPlayerObject = await this.yandexGamesSDK.getPlayer();
    } catch {
      // Player closed the dialog or authorization failed — remains a guest.
      return false;
    }
    return this.isYandexLoggedIn();
  }

  public async getCurPlayerName(): Promise<string> {
    await this.yandexSdkInitPlayerPromise.catch(() => {});

    let result: string = "";

    if (this.yandexSdkPlayerObject) {
      try {
        if (this.yandexSdkPlayerObject.isAuthorized()) {
          result = this.yandexSdkPlayerObject.getName();
        }
      } catch (error) {
        flashist_logErrorToAnalytics(
          `ERROR! FlashistFacade | getCurPlayerName __ error: ${error}`,
          flashist_logErrorTypes.DEBUG,
        );
      }
    }

    return result;
  }

  // ADV

  public async showInterstitial() {
    console.log("FlashistFacade | Main | showInterstitial");

    if (!this.yandexGamesSDK) {
      console.log(
        "FlashistFacade | Main | showInterstitial __ ERROR! No yandexGamesSDK: ",
        this.yandexGamesSDK,
      );
      return;
    }

    return new Promise<boolean>((resolve) => {
      try {
        console.log(
          "FlashistFacade | Main | showInterstitial __ showFullscreenAdv __ BEFORE",
        );
        this.yandexGamesSDK.adv.showFullscreenAdv({
          callbacks: {
            onClose: (wasShown) => {
              console.log(
                "FlashistFacade | Main | showInterstitial __ showFullscreenAdv __ onClose __ wasShown: ",
                wasShown,
              );
              // some action after close
              resolve(wasShown);
            },
            onError: (error) => {
              console.log(
                "FlashistFacade | Main | showInterstitial __ showFullscreenAdv __ onError __ error: ",
                error,
              );
              // some action on error
              // reject(error);
              resolve(false);
            },
          },
        });
      } catch (error) {
        console.log(
          "FlashistFacade | Main | showInterstitial __ showFullscreenAdv __ catch __ error: ",
          error,
        );
        // reject(error);
        resolve(false);
      }
    });
  }

  // Set during platform init (see runPlatformInit) so components can read the
  // resolved language synchronously at upgrade time, before their first render.
  public resolvedLanguageCode: string = "";

  public async getLanguageCode(): Promise<string> {
    // Waiting for the init to complete first
    await this.yandexInitPromise;

    let result: string = "";

    if (this.yandexGamesSDK) {
      console.log(
        "FlashistFacade | Main | getLanguageCode __ this.yandexGamesSDK?.environment?.i18n?.lang: ",
        this.yandexGamesSDK?.environment?.i18n?.lang,
      );
      let tempLocale = "";
      if (this.yandexGamesSDK?.environment?.i18n?.lang) {
        tempLocale = this.yandexGamesSDK.environment.i18n.lang;
      }

      const supportedLocales = {
        // English
        default: "en",

        // Russian
        ru: "ru",
        be: "ru",
        kk: "ru",
        uk: "ru",
        uz: "ru",
      };
      if (supportedLocales[tempLocale]) {
        result = supportedLocales[tempLocale];
      } else {
        result = supportedLocales.default;
      }
    } else {
      console.log(
        "FlashistFacade | Main | getLanguageCode __ ERROR! No yandexGamesSDK: ",
        this.yandexGamesSDK,
      );
    }

    return result;
  }

  // CHECK AVAILABLE METHODS
  protected sdkMethodsStatusCacheMap: {
    [method: string]: { isAvailable: boolean };
  } = {};
  protected async checkIfSdkMethodAvailable(
    sdkMethod: string,
  ): Promise<boolean> {
    let result: boolean = false;

    await this.yandexInitPromise;

    if (this.yandexGamesSDK) {
      if (this.sdkMethodsStatusCacheMap[sdkMethod]) {
        result = this.sdkMethodsStatusCacheMap[sdkMethod].isAvailable;
      } else {
        const isAvailable: boolean =
          await this.yandexGamesSDK.isAvailableMethod(sdkMethod);
        this.sdkMethodsStatusCacheMap[sdkMethod] = {
          isAvailable: isAvailable,
        };

        result = isAvailable;
      }
    }

    return result;
  }

  // LEADERBOARD
  protected defaultLeaderboardId: string = "default";
  protected async getCurPlayerLeaderboardScore(
    leaderboardId?: string,
  ): Promise<number> {
    leaderboardId ??= this.defaultLeaderboardId;

    await this.yandexInitPromise;

    let result: number = 0;

    if (this.yandexGamesSDK) {
      const isAvailable: boolean = await this.checkIfSdkMethodAvailable(
        "leaderboards.getPlayerEntry",
      );
      if (isAvailable) {
        try {
          const data =
            await this.yandexGamesSDK.leaderboards.getPlayerEntry(
              leaderboardId,
            );
          // console.log(res);
          if (data) {
            result = data.score;
          } else {
            flashist_logErrorToAnalytics(
              "ERROR! Flashist Facade | getCurPlayerLeaderboardScore __ then __ no data!",
              flashist_logErrorTypes.DEBUG,
            );
          }
        } catch (error) {
          flashist_logErrorToAnalytics(
            "ERROR! Flashist Facade | getCurPlayerLeaderboardScore __ error.code: " +
              error.code,
            flashist_logErrorTypes.DEBUG,
          );

          throw error;
          // if (err.code === 'LEADERBOARD_PLAYER_NOT_PRESENT') {
          //     // Срабатывает, если у игрока нет записи в лидерборде.
          // }
        }
      }
    }

    return result;
  }

  public async setCurPlayerLeaderboardScore(
    score: number,
    leaderboardId?: string,
  ): Promise<boolean> {
    let result: boolean = false;

    leaderboardId ??= this.defaultLeaderboardId;

    await this.yandexInitPromise;

    if (this.yandexGamesSDK) {
      const isAvailable: boolean = await this.checkIfSdkMethodAvailable(
        "leaderboards.setScore",
      );
      if (isAvailable) {
        result = await this.yandexGamesSDK.leaderboards.setScore(
          leaderboardId,
          score,
        );
      }
    }

    return result;
  }

  public async increaseCurPlayerLeaderboardScore(
    increase: number,
    leaderboardId?: string,
  ): Promise<boolean> {
    let result: boolean = false;

    leaderboardId ??= this.defaultLeaderboardId;

    let playerPrevMaxScore: number = 0;
    try {
      const isAvailable: boolean = await this.checkIfSdkMethodAvailable(
        "leaderboards.getPlayerEntry",
      );
      if (isAvailable) {
        const curPlayerLeaderboardScore: number =
          await this.getCurPlayerLeaderboardScore();
        playerPrevMaxScore = curPlayerLeaderboardScore;
      }
    } catch (error) {
      console.error(
        "YandexGamesPlatformAdapter | setLeaderboardScore __ error: ",
        error,
      );
    }

    const newScore: number = playerPrevMaxScore + increase;
    result = await this.setCurPlayerLeaderboardScore(newScore, leaderboardId);

    return result;
  }
}

export const flashist_getLangSelector = (): LangSelector => {
  const result: LangSelector = document.querySelector(
    "lang-selector",
  ) as LangSelector;

  return result;
};

// The single "game is fully initialized" gate: resolved by Bootstrap.ts after
// platform init has settled, the application chunk is loaded, and the Client
// is wired. The window global is consumed by the inline load handler in
// yandex-games_iframe.html (it reveals the UI and calls LoadingAPI.ready()).
let flashist_gameInitCompleteResolve!: () => void;
const flashist_gameInitCompletePromise = new Promise<void>((resolve) => {
  flashist_gameInitCompleteResolve = resolve;
});
export const flashist_markGameInitComplete = (): void => {
  flashist_gameInitCompleteResolve();
};
export const flashist_waitGameInitComplete = (): Promise<void> =>
  flashist_gameInitCompletePromise;
(window as any).flashist_waitGameInitComplete = flashist_waitGameInitComplete;

(window as any).FlashistFacade = FlashistFacade;
