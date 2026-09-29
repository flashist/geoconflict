import type { LangSelector } from "../LangSelector";
import { GameAnalytics } from "gameanalytics";
import { setOtelUser } from "../OtelBrowserInit";
import { isMobileDevice } from "../Utils";
import version from "../../version";
import { logDaysPlayedAnalytics } from "../DaysPlayedAnalytics";
import {
  consumePendingSessionEnd,
  startSessionMatchTracking,
} from "../SessionMatchAnalytics";
import {
  classifyPlatformDegradedCause,
  consumeMatchExitMarker,
  markMatchExit,
} from "../PlatformDegradedAnalytics";
import {
  reinsertSdkLoaderScript,
  runSdkLoaderRetries,
  SDK_LOADER_BACKGROUND_RETRY_DELAYS_MS,
  SDK_LOADER_IN_DEADLINE_RETRY_DELAYS_MS,
  type SdkLoaderAttemptResult,
  type SdkLoaderRetryOutcome,
} from "../SdkLoaderRetry";

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
    // Personal inbox (task 0012): Opened = the citizen selected the Personal
    // tab; LoadFailed = the inbox fetch failed (network/5xx/timeout/bad body),
    // never a 403 (that is the ordinary non-citizen answer).
    INBOX_OPENED: "Inbox:Opened",
    INBOX_LOAD_FAILED: "Inbox:LoadFailed",

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
    // Why the Yandex platform is degraded on this page load — SDK, player or
    // flags missing (task 0328). Only missing flags hide the citizenship card,
    // so this is not a count of hidden cards. The suffix is a PlatformDegradedCause from the closed list in
    // PlatformDegradedAnalytics.ts, appended at the call site. Value 1 = this
    // load follows a match exit, 0 otherwise. Recovered = the flags arrived
    // late after a degraded-without-flags check (what 0329 would rescue).
    SESSION_PLATFORM_DEGRADED_FIRST_PART: "Session:PlatformDegraded:",
    SESSION_PLATFORM_RECOVERED: "Session:PlatformRecovered",
    // What the SDK loader download retry did (task 0330). Fires at most once
    // per page, only when the first loader download failed. The suffix is a
    // SdkLoaderRetryOutcome from the closed list in SdkLoaderRetry.ts, appended
    // at the call site. Value = number of re-downloads made.
    SESSION_SDK_LOADER_RETRY_FIRST_PART: "Session:SdkLoaderRetry:",
    MATCH_SPAWN_CHOSEN: "Match:SpawnChosen",
    MATCH_SPAWN_AUTO: "Match:SpawnAuto",
    MATCH_SPAWNED_CONFIRMED: "Match:Spawned",
    MATCH_DURATION: "Match:Duration",
    MATCH_SPAWN_MISSED_TIMING_RACE: "Match:SpawnMissed:TimingRace",
    MATCH_SPAWN_MISSED_NO_ATTEMPT: "Match:SpawnMissed:NoAttempt",
    MATCH_SPAWN_RETRY_AFTER_CATCHUP: "Match:SpawnRetryAfterCatchup",
    MATCH_SPAWN_MISSED_CATCHUP_TOO_LONG: "Match:SpawnMissed:CatchupTooLong",
    MATCH_LOSS_OPPONENT_WON: "Match:Loss:OpponentWon",
    MATCH_WIN_CONDITION: "Match:WinCondition",
    MATCH_LEADERBOARD_AWARD: "Match:Leaderboard:Award",

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

    // Tap on a feature shown LOCKED to a non-citizen (task 0302). The suffix is
    // a lockedFeatureIds value, e.g. LockedFeature:Tap:PrivateLobby.
    LOCKED_FEATURE_TAP_FIRST_PART: "LockedFeature:Tap:",

    CITIZENSHIP_SURFACE_SEEN: "Citizenship:Seen",
    // Fired client-side when a re-fetched profile first shows the server-side
    // earned-citizenship grant (citizenship_earned_at set) — task 0017, spec
    // 0021 §6. Server write is authoritative; this reports its first observation.
    CITIZENSHIP_EARNED_XP: "Citizenship:Earned:XP",

    // One-time tenure XP grant (task 0253; ADR-112 as amended 2026-09-15).
    // Claimed fires only after the SERVER granted (value = XP). Rejected takes a
    // suffix at the call site — :BelowMinimum | :Duplicate. ClaimFailed = no
    // usable server answer: retried next load if the server wrote nothing; if
    // the answer was lost after the server committed, never (and no popup).
    CITIZENSHIP_TENURE_GRANT_CLAIMED: "Citizenship:TenureGrant:Claimed",
    CITIZENSHIP_TENURE_GRANT_REJECTED: "Citizenship:TenureGrant:Rejected",
    CITIZENSHIP_TENURE_GRANT_CLAIM_FAILED:
      "Citizenship:TenureGrant:ClaimFailed",

    // "Restart to apply" popup after a mid-session grant (task 0303): a
    // confirmed purchase, or the tenure gift that made the player a citizen.
    // Not split by source — gift count = Shown − Purchase:Completed:Citizenship.
    // Shown fires when the popup actually appears (not while it waits for the
    // player to leave a lobby); Restart right before the reload; Later = dismiss.
    CITIZENSHIP_RESTART_PROMPT_SHOWN: "Citizenship:RestartPrompt:Shown",
    CITIZENSHIP_RESTART_PROMPT_RESTART: "Citizenship:RestartPrompt:Restart",
    CITIZENSHIP_RESTART_PROMPT_LATER: "Citizenship:RestartPrompt:Later",

    // Paid-citizenship purchase funnel (task 0018; spec 0021 §3–5). Started
    // fires as the Yandex payment frame is opened (last client-controlled
    // moment); Completed only after the SERVER confirmed the grant (never on
    // the client-side callback alone); Abandoned when a started flow ends
    // without a Completed — dialog closed, SDK error, or a failed /complete.
    PURCHASE_STARTED_CITIZENSHIP: "Purchase:Started:Citizenship",
    PURCHASE_COMPLETED_CITIZENSHIP: "Purchase:Completed:Citizenship",
    PURCHASE_ABANDONED_CITIZENSHIP: "Purchase:Abandoned:Citizenship",

    // Ad impressions (task 0020). Fired on a real impression (onClose
    // wasShown === true), not per attempt; no tier dimension — the tiered
    // variants are task 0299. No banner events: our code never shows one.
    AD_INTERSTITIAL: "Ad:Interstitial",

    BUILD_STALE_DETECTED: "Build:StaleDetected",

    // Profile login session (task 0273, S4). One login per logged-in page load,
    // fired even while the citizenship card is hidden — nothing else is visible,
    // so these are the only signal that the session path works. Never fired for a
    // guest or with the profile API unconfigured.
    PROFILE_LOGIN_SUCCEEDED: "Profile:Login:Succeeded",
    // Additional to Succeeded, when the server created the player row.
    PROFILE_LOGIN_CREATED: "Profile:Login:Created",
    PROFILE_LOGIN_FAILED_TIMEOUT: "Profile:Login:Failed:Timeout",
    // Any 503: today `session_unavailable`, later S5's `creation_paused`.
    PROFILE_LOGIN_FAILED_UNAVAILABLE: "Profile:Login:Failed:Unavailable",
    // Network error, any other non-2xx, or a body that fails the schema.
    PROFILE_LOGIN_FAILED_ERROR: "Profile:Login:Failed:Error",
    // A held token was rejected (401) and a fresh login was started for it.
    PROFILE_SESSION_RELOGIN: "Profile:Session:Relogin",

    // Restart-after-login (task 0273, owner ruling D3). Requested fires when the
    // auth dialog reported success; exactly one of Performed / Suppressed:* follows.
    PROFILE_LOGIN_RESTART_REQUESTED: "Profile:Login:Restart:Requested",
    PROFILE_LOGIN_RESTART_PERFORMED: "Profile:Login:Restart:Performed",
    // The player closed the dialog / it failed — no reload, card stays guest.
    PROFILE_LOGIN_RESTART_CANCELLED: "Profile:Login:Restart:Cancelled",
    PROFILE_LOGIN_RESTART_SUPPRESSED_IN_MATCH:
      "Profile:Login:Restart:Suppressed:InMatch",
    PROFILE_LOGIN_RESTART_SUPPRESSED_LATCHED:
      "Profile:Login:Restart:Suppressed:Latched",
    // sessionStorage is null or throws, so the once-per-load cap cannot be held
    // and no reload happens. Owner-approved sixth event (review round 1, R4) —
    // the approved plan §3.6 named five; without it these two paths leave a
    // Requested with no outcome at all.
    PROFILE_LOGIN_RESTART_SUPPRESSED_NO_STORAGE:
      "Profile:Login:Restart:Suppressed:NoStorage",
  },

  uiElementIds: {
    announcementsBell: "AnnouncementsBell",
    // Tab strip inside the announcements popup — rendered only for citizens
    // (task 0012), so non-citizens/guests never fire these.
    announcementsTabGlobal: "AnnouncementsTabGlobal",
    announcementsTabPersonal: "AnnouncementsTabPersonal",
    telegramLinkStartScreen: "TelegramLinkStartScreen",
    telegramLinkGameEnd: "TelegramLinkGameEnd",
    vkLinkStartScreen: "VkLinkStartScreen",
    vkLinkGameEnd: "VkLinkGameEnd",
    tutorialSkipBtnCorner: "TutorialSkipBtnCorner",
    tutorialSkipBtnInline: "TutorialSkipBtnInline",
    multiplayerTab: "MultiplayerTab",
    singleplayerTab: "SingleplayerTab",
    citizenshipLoginToEarn: "CitizenshipLoginToEarn",
    // Fired by 0018's "Buy Citizenship" CTA (via logUiTapEvent) — no UI in 0019.
    purchaseCitizenship: "PurchaseCitizenship",
  },

  // Citizen perks shown locked to everyone else (task 0302). One id per perk;
  // later perks (0249, 0030, ...) add theirs here.
  lockedFeatureIds: {
    privateLobby: "PrivateLobby",
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
    // Remote on/off switch for the private-lobby row (task 0302). Separate from
    // citizenship_ui. It only decides whether the row is VISIBLE — the server
    // never sees Yandex flags, so security is the server's citizens-only start
    // check, which runs whether this is on or off.
    PRIVATE_LOBBIES_FLAG_NAME: "private_lobbies",
    PRIVATE_LOBBIES_ENABLED_VALUE: "enabled",
  },

  // Tester marker (task 0302). When this localStorage key equals "1", getFlags()
  // is sent the client feature tester=1, so a Yandex console condition can turn
  // a flag on for testers only. Not a secret and carries no id or personal data.
  testerMarker: {
    STORAGE_KEY: "geoconflict_tester",
    STORAGE_VALUE: "1",
    CLIENT_FEATURE_NAME: "tester",
    CLIENT_FEATURE_VALUE: "1",
  },

  features: {
    // Local compile-time gate for the start-screen citizenship card (task 0054).
    // ON since the citizenship launch (0065 §6, owner ruling 2026-09-26). The
    // remote "citizenship_ui" Yandex experiment flag above is the runtime kill
    // switch; setting this back to false is the code-level rollback. This local
    // flag is checked first and absolutely, including in dev (no GAME_ENV
    // bypass — owner-ruled 2026-08-21).
    CITIZENSHIP_CARD_ENABLED: true,
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

/**
 * The client features to send with getFlags(), or null to call it with no
 * parameters exactly as before (task 0302). Only the tester marker is ever sent.
 * Never throws: storage that is blocked or throws (private mode, iframe policy)
 * just means "not a tester".
 */
export function readTesterClientFeatures(): Array<{
  name: string;
  value: string;
}> | null {
  const marker = flashistConstants.testerMarker;
  try {
    if (localStorage.getItem(marker.STORAGE_KEY) !== marker.STORAGE_VALUE) {
      return null;
    }
  } catch {
    return null;
  }
  return [
    { name: marker.CLIENT_FEATURE_NAME, value: marker.CLIENT_FEATURE_VALUE },
  ];
}

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
const sleepMs = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));
type YandexLoginStatus = "logged-in" | "guest" | "unknown";

// Yandex catalog product shape (docs: sdk-purchases, re-checked 2026-08-14).
// Note it's `priceCurrencyCode`, not `currencyCode`.
export interface IProduct {
  id: string;
  title: string;
  description: string;
  imageURI: string;
  price: string;
  priceValue: string;
  priceCurrencyCode: string;
  getPriceCurrencyImage(size: "small" | "medium" | "svg"): string;
}

export type PaymentsCatalogStatus = "idle" | "ready" | "failed" | "unavailable";

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

  // Session:PlatformDegraded:{Cause} state (task 0328), each recorded where it
  // happens. The loader's own failure is read from the template's
  // window.flashist_sdkScriptLoadFailed at check time.
  private bootFollowsMatchExit = false;
  // The SDK loader script has loaded or failed (set in yandexSdkInit).
  private sdkScriptSettled = false;
  // Which part of stage 1 the 5 s deadline caught. Stage-2 (player/flags)
  // deadlines leave it unset — those read as NoPlayer / NoFlags.
  private platformInitTimeoutStage: "script" | "init" | undefined;
  // YaGames.init() itself rejected (not a later step in its then-branch).
  private sdkInitRejected = false;
  private hasCheckedPlatformDegraded = false;
  private platformDegradedWithoutFlags = false;
  private hasLoggedPlatformRecovered = false;

  // SDK loader download retry (task 0330). Lazily created / optional, because
  // tests build facades via Object.create, which skips class-field initializers.
  private sdkLoaderReadyPromise?: Promise<void>;
  // A retry loaded the loader after the template's download failed.
  private sdkLoaderRecoveredByRetry?: boolean;
  // ...and it did so inside the 5 s deadline, so the boot was never degraded
  // by the download. Only this clears the ScriptFailed cause (review R1).
  private sdkLoaderRecoveredInDeadline?: boolean;
  // The loader tag was missing, so there is nothing to retry.
  private sdkLoaderRetryStopped?: boolean;
  private sdkLoaderRetriesMade?: number;
  private hasStartedSdkLoaderBackgroundRetry?: boolean;
  private hasLoggedSdkLoaderRetryOutcome?: boolean;

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

    // Read AND remove on every boot, healthy ones included, so a marker never
    // carries over to a later load (task 0328). Never throws.
    this.bootFollowsMatchExit = consumeMatchExitMarker();

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
      // Checked at the citizenship card's own decision point — the game-init
      // gate, after the same flags wait — so merely slow flags are not counted
      // as missing (task 0328).
      void flashist_waitGameInitComplete().then(() =>
        this.logPlatformDegradedEvent(),
      );
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
    // YaGames.init() latency only — preserved here. "Ready" includes the
    // in-deadline download retries (task 0330), so the window starts from the
    // loader that actually loaded. A never-loading script is covered by the
    // deadline race further down.
    const sdkReadyForSessionPromise = this.waitForSdkLoader().then(() =>
      this.waitForYandexSdkForSession(),
    );

    const sdkOutcome = await Promise.race([
      sdkInitDone.then(() => "done" as const),
      deadlinePromise,
    ]);
    if (sdkOutcome === "deadline") {
      this.platformInitTimeoutStage = this.sdkScriptSettled ? "init" : "script";
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

    // Player data, experiment flags, and the payments catalog in parallel,
    // sharing the same overall deadline — a hung getPlayer()/getFlags()/
    // getPayments() call must not block app start. A catalog that settles after
    // the deadline still flips to 'ready' late (same pattern as the flags).
    const playerInitResultPromise = this.initPlayer();
    this.playerInitResultPromise = playerInitResultPromise;
    const settledPromise = Promise.allSettled([
      playerInitResultPromise,
      this.loadExperimentFlags(),
      this.initPayments(),
    ]);
    const settledResults = await Promise.race([
      settledPromise,
      deadlinePromise.then(() => null),
    ]);
    this.yandexSdkInitPlayerPromiseResolve();
    // Experiment cohort events fire when the flags actually settle — possibly
    // after the deadline; logExperimentEvents latches only once flags exist.
    void settledPromise.then(() => this.logExperimentEvents());
    // Sync flag snapshot for renderCitizenBadge(), which cannot await (0236).
    // Kicked off here, before Bootstrap loads Main.ts, and never awaited — it
    // must not extend the platform-init deadline.
    this.primeCitizenshipSurfacesSnapshot();

    if (settledResults === null) {
      logDeadlineEvent();
    } else {
      const [playerResult, flagsResult, paymentsResult] = settledResults;
      if (playerResult.status === "rejected") {
        console.warn("Init step failed: player init", playerResult.reason);
      }
      if (flagsResult.status === "rejected") {
        console.warn("Init step failed: experiment flags", flagsResult.reason);
      }
      if (paymentsResult.status === "rejected") {
        // initPayments never throws by design — belt and suspenders only.
        console.warn("Init step failed: payments", paymentsResult.reason);
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

  /**
   * Session:PlatformDegraded:{Cause} (task 0328) — at most once per page, at the
   * game-init gate. Awaits the same flags load the citizenship card awaits, so
   * flags that are merely slow do not count as missing. Never throws.
   */
  private async logPlatformDegradedEvent(): Promise<void> {
    try {
      if (this.hasCheckedPlatformDegraded) return;
      this.hasCheckedPlatformDegraded = true;
      if (!this.yaGamesAvailable) return;

      await this.loadExperimentFlags();

      const cause = classifyPlatformDegradedCause({
        // A download a retry recovered inside the 5 s deadline is not why this
        // page is degraded (0330). A later save is: the boot already degraded.
        scriptFailed:
          (window as any).flashist_sdkScriptLoadFailed === true &&
          this.sdkLoaderRecoveredInDeadline !== true,
        scriptTimedOut: this.platformInitTimeoutStage === "script",
        initFailed: this.sdkInitRejected === true,
        initTimedOut: this.platformInitTimeoutStage === "init",
        hasSdk: !!this.yandexGamesSDK,
        hasPlayer: !!this.yandexSdkPlayerObject,
        hasFlags: !!this.yandexExperimentFlags,
      });
      if (cause === null) return;

      this.platformDegradedWithoutFlags = !this.yandexExperimentFlags;
      flashist_logEventAnalytics(
        flashistConstants.analyticEvents.SESSION_PLATFORM_DEGRADED_FIRST_PART +
          cause,
        this.bootFollowsMatchExit ? 1 : 0,
      );
    } catch {
      // Analytics only — must never affect boot
    }
  }

  /**
   * Session:PlatformRecovered (task 0328) — once per page, only when the
   * degraded event fired with the flags missing and the flags have now arrived
   * (late-SDK recovery). Those are the loads 0329 would rescue.
   */
  private logPlatformRecoveredIfDegraded(): void {
    if (this.hasLoggedPlatformRecovered) return;
    if (!this.platformDegradedWithoutFlags) return;
    if (!this.yandexExperimentFlags) return;
    this.hasLoggedPlatformRecovered = true;
    flashist_logEventAnalytics(
      flashistConstants.analyticEvents.SESSION_PLATFORM_RECOVERED,
      this.bootFollowsMatchExit ? 1 : 0,
    );
  }

  // Single place for working with URLS
  public changeHref(value) {
    let href = value;
    // Only the match exits navigate to the root path (the Stripe checkout URL
    // does not): mark the next boot as "follows a match exit" (task 0328).
    // markMatchExit never throws, so navigation always happens.
    if (value === this.rootPathname) {
      markMatchExit();
      // Flashist Adaptation (task 0331): keep the query string the platform
      // gave this iframe — Yandex's loader reads its SDK address from `sdk`.
      // Read now, not at construction. The hash is still dropped, so a
      // #join= / #refresh / #token-login is never replayed.
      href = value + window.location.search;
    }
    // window.location.href = value;
    window.location.href = href;
  }

  /**
   * Reload the CURRENT url, query string and hash included (task 0273, S4).
   * Deliberately not `changeHref(this.rootPathname)`: that drops the hash (and,
   * before task 0331, dropped the query too), and the Yandex Games iframe url is
   * handed to us by the platform — a reload keeps the whole url. Same primitive
   * as Bootstrap.ts's recovery reload and StaleBuildModal's REFRESH.
   */
  public reloadApp() {
    window.location.reload();
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

  /**
   * The template's loader download, plus the quick in-deadline retries when it
   * failed (task 0330). Memoized: yandexSdkInit and the login-status window
   * share one run. Never rejects.
   */
  private waitForSdkLoader(): Promise<void> {
    this.sdkLoaderReadyPromise ??= this.loadSdkLoaderWithQuickRetries();
    return this.sdkLoaderReadyPromise;
  }

  private async loadSdkLoaderWithQuickRetries(): Promise<void> {
    await this.waitForSdkScript();
    if (!this.isSdkLoaderDownloadFailed()) {
      return;
    }
    const result = await runSdkLoaderRetries(
      SDK_LOADER_IN_DEADLINE_RETRY_DELAYS_MS,
      () => this.attemptSdkLoaderDownload(),
      sleepMs,
    );
    this.sdkLoaderRetriesMade = result.retriesMade;
    if (result.outcome === "loaded") {
      this.sdkLoaderRecoveredByRetry = true;
      // An attempt still downloading at the deadline can load after it — the
      // boot has already gone degraded then, so that save counts as late.
      const isLate = this.platformInitTimeoutStage === "script";
      this.sdkLoaderRecoveredInDeadline = !isLate;
      this.logSdkLoaderRetryOutcome(isLate ? "RecoveredLate" : "Recovered");
    } else if (result.outcome === "noTag") {
      this.sdkLoaderRetryStopped = true;
      this.logSdkLoaderRetryOutcome("GaveUp");
    }
  }

  /**
   * The template's onerror ran — nothing executed — and no loader has defined
   * YaGames since. The only state a retry may start from: never after onload.
   */
  private isSdkLoaderDownloadFailed(): boolean {
    return (
      (window as any).flashist_sdkScriptLoadFailed === true &&
      typeof (window as any).YaGames === "undefined" &&
      this.sdkLoaderRecoveredByRetry !== true &&
      this.sdkLoaderRetryStopped !== true
    );
  }

  // One re-download of the loader. A method so tests can stub it.
  private attemptSdkLoaderDownload(): Promise<SdkLoaderAttemptResult> {
    return reinsertSdkLoaderScript(document);
  }

  /**
   * Quiet background retries after the quick ones failed (task 0330), started
   * at most once per page. A success hands off to initLoadedYandexSdk(), which
   * by then takes the existing late-recovery path (0328/0329).
   */
  private startSdkLoaderBackgroundRetry(): void {
    if (this.hasStartedSdkLoaderBackgroundRetry) return;
    this.hasStartedSdkLoaderBackgroundRetry = true;
    void runSdkLoaderRetries(
      SDK_LOADER_BACKGROUND_RETRY_DELAYS_MS,
      () => this.attemptSdkLoaderDownload(),
      sleepMs,
    )
      .then((result) => {
        this.sdkLoaderRetriesMade =
          (this.sdkLoaderRetriesMade ?? 0) + result.retriesMade;
        if (result.outcome !== "loaded") {
          this.logSdkLoaderRetryOutcome("GaveUp");
          return;
        }
        this.sdkLoaderRecoveredByRetry = true;
        this.logSdkLoaderRetryOutcome("RecoveredLate");
        if (typeof (window as any).YaGames !== "undefined") {
          return this.initLoadedYandexSdk();
        }
      })
      .catch(() => {
        // Best-effort recovery — must never surface as an unhandled rejection
      });
  }

  /** Session:SdkLoaderRetry:{Outcome} (task 0330) — at most once per page. */
  private logSdkLoaderRetryOutcome(outcome: SdkLoaderRetryOutcome): void {
    if (this.hasLoggedSdkLoaderRetryOutcome) return;
    this.hasLoggedSdkLoaderRetryOutcome = true;
    flashist_logEventAnalytics(
      flashistConstants.analyticEvents.SESSION_SDK_LOADER_RETRY_FIRST_PART +
        outcome,
      this.sdkLoaderRetriesMade ?? 0,
    );
  }

  private async yandexSdkInit(): Promise<void> {
    await this.waitForSdkLoader();
    // Lets the deadline branch tell "loader still downloading" from "init()
    // hung" (task 0328). Settled = after the quick download retries (0330).
    this.sdkScriptSettled = true;

    if (typeof (window as any).YaGames === "undefined") {
      // Not on the Yandex platform, the loader left no SDK, or its download
      // failed and the quick retries did not recover it. In that last case the
      // boot degrades now and the download keeps retrying quietly (task 0330).
      if (this.isSdkLoaderDownloadFailed()) {
        this.startSdkLoaderBackgroundRetry();
      }
      return;
    }
    await this.initLoadedYandexSdk();
  }

  /**
   * YaGames.init() and everything after it. Reached at most once per page —
   * from yandexSdkInit, or from a background download retry, never both — so
   * init() is never called twice. A rejected or hung init() is never retried.
   */
  private async initLoadedYandexSdk(): Promise<void> {
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
      // Session:PlatformRecovered fires from here if the card's check already
      // ran without flags (task 0328); a no-op otherwise.
      void this.initExperimentFlags().then(() =>
        this.logPlatformRecoveredIfDegraded(),
      );
      // Badge snapshot recovery, same pattern: the boot-time prime resolved
      // against the no-SDK flags above, so re-prime now that the real ones are
      // in — otherwise the async helper reports enabled while the sync snapshot
      // the badge reads stays false for the rest of the session.
      this.primeCitizenshipSurfacesSnapshot();
      // Payments recovery, same pattern: a degraded boot left the catalog
      // status 'idle' (not memoized), so fetch it for real now that the SDK
      // exists. No-op on the normal path (paymentsInitPromise memo present).
      void this.initPayments();
      // Player recovery, same pattern: chained on the boot-time initPlayer()
      // attempt, whose promise is only assigned once stage 2 has run — on the
      // normal path (SDK arrives mid-stage-1) the field is still unset here,
      // so this skips entirely and never duplicates getPlayer(). The
      // Player:Yandex* status event is NOT re-logged (latched); late state is
      // for callers that ask after recovery.
      const playerRecovery = this.playerInitResultPromise
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
      // Task 0329: a degraded boot recovered late — let the citizenship card
      // re-check its gate. Waits for the player too, so the card's profile read
      // is not a false "guest" (bounded by the shared deadline).
      if (playerRecovery !== undefined) {
        void Promise.all([
          // Memoized: joins the re-fetch above, never a second getFlags().
          this.loadExperimentFlags(),
          Promise.race([
            playerRecovery,
            new Promise<void>((resolve) =>
              setTimeout(resolve, PLATFORM_INIT_DEADLINE_MS),
            ),
          ]),
        ])
          .then(() => this.markPlatformRecoveredLate())
          .catch(() => {});
      }
    } catch (error) {
      // No SDK assigned means YaGames.init() itself rejected, not a later step
      // above — only that case is the InitFailed cause (task 0328).
      if (!this.yandexGamesSDK) {
        this.sdkInitRejected = true;
      }
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
        const clientFeatures = readTesterClientFeatures();
        experiments = await Promise.race([
          clientFeatures === null
            ? this.yandexGamesSDK.getFlags()
            : this.yandexGamesSDK.getFlags({ clientFeatures }),
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

  public async isPrivateLobbiesEnabled(): Promise<boolean> {
    return this.checkExperimentFlag(
      flashistConstants.experiments.PRIVATE_LOBBIES_FLAG_NAME,
      flashistConstants.experiments.PRIVATE_LOBBIES_ENABLED_VALUE,
    );
  }

  public async isCitizenshipUiEnabled(): Promise<boolean> {
    return this.checkExperimentFlag(
      flashistConstants.experiments.CITIZENSHIP_UI_FLAG_NAME,
      flashistConstants.experiments.CITIZENSHIP_UI_ENABLED_VALUE,
    );
  }

  /**
   * Layer 1 AND layer 2 — the single combined read behind every citizenship
   * surface (task 0236). `&&` short-circuits, so while the local launch flag is
   * false this never reads the remote flag at all.
   */
  public async isCitizenshipSurfacesEnabled(): Promise<boolean> {
    return (
      flashistConstants.features.CITIZENSHIP_CARD_ENABLED &&
      (await this.isCitizenshipUiEnabled())
    );
  }

  /**
   * Sync snapshot of the above, for renderCitizenBadge() — which is synchronous
   * and cannot await. Primed during platform init, and re-primed on late-SDK
   * recovery from yandexSdkInit().
   *
   * DEFAULT FALSE, deliberately (task 0236): a kill switch fails CLOSED.
   *
   * On the HAPPY path the pre-resolution window is empty: Bootstrap.ts loads
   * Main.ts (which pulls in all four badge call sites) only AFTER
   * initializePlatform() has returned, and the prime is kicked off inside it
   * once the flags have settled. On the DEADLINE, DEGRADED and early-throw
   * paths the window is REAL and the snapshot can still be false when the UI
   * becomes interactive — on a degraded boot that never recovers, for the whole
   * session. That is the fail-closed default doing its job, not a gap: a late
   * snapshot is picked up on the next natural re-render, and a degraded boot
   * that DOES recover re-primes from yandexSdkInit().
   *
   * All four citizenship surfaces now fail closed: the card's degraded-mode
   * fail-OPEN carve-out was withdrawn in task 0291.
   */
  private citizenshipSurfacesSnapshot = false;

  public isCitizenshipSurfacesEnabledSync(): boolean {
    // `=== true` normalizes the type rather than changing behavior: the test
    // suites build facades via Object.create(FlashistFacade.prototype), which
    // skips class-field initializers, so the field is `undefined` there and
    // this keeps the declared `boolean` return honest. (`!undefined` is already
    // truthy, so the only caller behaves the same either way.)
    return this.citizenshipSurfacesSnapshot === true;
  }

  protected primeCitizenshipSurfacesSnapshot(): void {
    void this.isCitizenshipSurfacesEnabled().then((enabled) => {
      this.citizenshipSurfacesSnapshot = enabled;
    });
  }

  // PAYMENTS (task 0019). Same memoized-startup-capability pattern as the
  // experiment flags: never throws, never blocks boot, degrades to an
  // empty/unavailable catalog outside Yandex or on any failure.
  private paymentsObject: any | null = null;
  private paymentsCatalog: IProduct[] = [];
  private paymentsCatalogById = new Map<string, IProduct>();
  private paymentsCatalogStatus: PaymentsCatalogStatus = "idle";
  private paymentsInitPromise?: Promise<void>;

  public getPaymentsCatalogStatus(): PaymentsCatalogStatus {
    return this.paymentsCatalogStatus;
  }

  // Resolvers parked by whenPaymentsCatalogSettled() while the catalog is
  // still 'idle'. Lazily created (`??=`) because tests build facade instances
  // via Object.create, which skips class-field initializers.
  private paymentsCatalogSettledResolvers?: Array<
    (status: PaymentsCatalogStatus) => void
  >;

  /**
   * Resolves once the catalog status leaves 'idle' — immediately when it
   * already has. Platform init races the catalog fetch against the shared
   * deadline, so the catalog can settle AFTER consumers first render; the
   * citizenship card (task 0018) uses this to reveal the buy CTA when a late
   * 'ready' lands. May never resolve (a degraded Yandex boot can stay 'idle'
   * all session) — subscribe with .then(), never block on it.
   */
  public whenPaymentsCatalogSettled(): Promise<PaymentsCatalogStatus> {
    if (this.paymentsCatalogStatus !== "idle") {
      return Promise.resolve(this.paymentsCatalogStatus);
    }
    return new Promise((resolve) => {
      (this.paymentsCatalogSettledResolvers ??= []).push(resolve);
    });
  }

  // Late platform recovery (task 0329). Lazily created, like the catalog
  // resolvers above, because tests build facades via Object.create.
  private hasPlatformRecoveredLate?: boolean;
  private platformRecoveredLateResolvers?: Array<() => void>;

  /**
   * Resolves once a DEGRADED boot has recovered late: YaGames.init() settled
   * only after stage 2 of platform init had run, the experiment flags now
   * exist, and the player recovery settled (or the shared deadline passed).
   * Fires at most once per page; resolves immediately for a waiter that
   * arrives after it fired. Never resolves on a healthy boot, nor when the
   * flags never arrive — subscribe with .then(), never block on it. The
   * citizenship card (task 0329) re-checks its flag gate on it.
   */
  public whenPlatformRecoveredLate(): Promise<void> {
    if (this.hasPlatformRecoveredLate) {
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      (this.platformRecoveredLateResolvers ??= []).push(resolve);
    });
  }

  /** Sole writer of hasPlatformRecoveredLate — fires only with flags present, once. */
  private markPlatformRecoveredLate(): void {
    if (!this.yandexExperimentFlags || this.hasPlatformRecoveredLate) {
      return;
    }
    this.hasPlatformRecoveredLate = true;
    const resolvers = this.platformRecoveredLateResolvers ?? [];
    this.platformRecoveredLateResolvers = [];
    resolvers.forEach((resolve) => resolve());
  }

  /** Sole writer of paymentsCatalogStatus — wakes settle waiters on any non-idle value. */
  private setPaymentsCatalogStatus(status: PaymentsCatalogStatus): void {
    this.paymentsCatalogStatus = status;
    if (status === "idle") {
      return;
    }
    const resolvers = this.paymentsCatalogSettledResolvers ?? [];
    this.paymentsCatalogSettledResolvers = [];
    resolvers.forEach((resolve) => resolve(status));
  }

  private async initPayments(): Promise<void> {
    await this.yandexInitPromise;

    if (!this.yandexGamesSDK) {
      if (!this.yaGamesAvailable) {
        this.setPaymentsCatalogStatus("unavailable");
      }
      // On the Yandex platform with no SDK (yet — possibly a degraded boot
      // whose SDK recovers late): stay 'idle' and don't memoize, so the
      // late-SDK recovery in yandexSdkInit can still init payments for real.
      return;
    }

    this.paymentsInitPromise ??= this.fetchPaymentsCatalog();
    return this.paymentsInitPromise;
  }

  private async fetchPaymentsCatalog(): Promise<void> {
    try {
      this.paymentsObject = await this.yandexGamesSDK.getPayments({
        signed: true,
      });
      const catalog = await this.paymentsObject.getCatalog();
      this.paymentsCatalog = Array.isArray(catalog) ? catalog : [];
      this.paymentsCatalogById.clear();
      this.paymentsCatalog.forEach((product: IProduct) => {
        this.paymentsCatalogById.set(product.id, product);
      });
      this.setPaymentsCatalogStatus("ready");
      // Session-start reconciliation (Yandex moderation compliance): catch
      // purchases whose /complete never landed. Fire-and-forget, gated inside
      // on flashist_waitGameInitComplete(). Dynamic import breaks the static
      // module cycle (the reconciliation module imports this facade).
      void import("../PaymentsReconciliation")
        .then((module) => module.schedulePaymentsReconciliation())
        .catch(() => {
          // Reconciliation is best-effort — never let it surface at boot.
        });
    } catch (error) {
      this.setPaymentsCatalogStatus("failed");
      flashist_logErrorToAnalytics(
        `ERROR! FlashistFacade | initPayments __ error: ${error}`,
        flashist_logErrorTypes.DEBUG,
      );
    }
  }

  /** Sync catalog checks — false/null unless the catalog is 'ready'. */
  public hasCatalogProduct(id: string): boolean {
    return (
      this.paymentsCatalogStatus === "ready" && this.paymentsCatalogById.has(id)
    );
  }

  public getCatalogProduct(id: string): IProduct | null {
    if (this.paymentsCatalogStatus !== "ready") {
      return null;
    }
    return this.paymentsCatalogById.get(id) ?? null;
  }

  /**
   * Open the Yandex payment frame for a catalog item. Rejects when payments
   * aren't ready, and rejects when the player closes the frame or the purchase
   * fails — the caller (0018's purchase flow) owns the UX for both. In signed
   * mode the resolved value is `{ signature }` (no plain purchaseToken).
   */
  public async purchaseCatalogItem(
    id: string,
    developerPayload: string,
  ): Promise<{ signature: string }> {
    if (this.paymentsCatalogStatus !== "ready" || !this.paymentsObject) {
      throw new Error("payments_not_ready");
    }
    return await this.paymentsObject.purchase({ id, developerPayload });
  }

  /**
   * Signed output of getPurchases() for server reconciliation. Null when
   * payments aren't ready, on any SDK failure, or when the purchase list is
   * verifiably empty (nothing to reconcile — skip the network round-trip).
   */
  public async getSignedPurchases(): Promise<{ signature: string } | null> {
    if (this.paymentsCatalogStatus !== "ready" || !this.paymentsObject) {
      return null;
    }
    try {
      const purchases = await this.paymentsObject.getPurchases();
      if (Array.isArray(purchases) && purchases.length === 0) {
        return null;
      }
      const signature = purchases?.signature;
      return typeof signature === "string" && signature.length > 0
        ? { signature }
        : null;
    } catch {
      return null;
    }
  }

  /**
   * Consume a processed purchase. Only call AFTER the server confirmed the
   * grant (consuming earlier can lose purchases). No-op without a payments
   * object; rejections propagate to the caller (reconciliation catches each).
   */
  public async consumePurchase(purchaseToken: string): Promise<void> {
    if (!this.paymentsObject) {
      return;
    }
    await this.paymentsObject.consumePurchase(purchaseToken);
  }

  /**
   * True when this is a Yandex-platform session that never obtained a player
   * object (degraded mode): either `YaGames.init()` failed / missed the
   * platform-init deadline, or init succeeded but the boot-time `getPlayer()`
   * failed or timed out. In both cases the auth dialog cannot complete, so
   * login UI must not be offered. Only meaningful after
   * `flashist_waitGameInitComplete()` resolves; before that, init may simply
   * not have settled yet.
   */
  public isYandexDegraded(): boolean {
    // yandexSdkPlayerObject is only ever assigned from
    // yandexGamesSDK.getPlayer() (every call site requires the SDK), so this
    // check also subsumes the SDK-init-failure case (!yandexGamesSDK).
    return this.yaGamesAvailable && !this.yandexSdkPlayerObject;
  }

  public logExperimentEvent(name: string, value: string): void {
    flashist_logEventAnalytics(`Experiment:${name}:${value}`);
  }

  public logUiTapEvent(elementId: string): void {
    flashist_logEventAnalytics(
      flashistConstants.analyticEvents.UI_TAP_FIRST_PART + elementId,
    );
  }

  public logLockedFeatureTapEvent(featureId: string): void {
    flashist_logEventAnalytics(
      flashistConstants.analyticEvents.LOCKED_FEATURE_TAP_FIRST_PART +
        featureId,
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

  public async getYandexUniqueId(): Promise<string | null> {
    await this.yandexSdkInitPlayerPromise.catch(() => {});

    if (!this.yandexSdkPlayerObject) {
      return null;
    }

    try {
      if (this.yandexSdkPlayerObject.isAuthorized()) {
        return this.yandexSdkPlayerObject.getUniqueID();
      }
    } catch (error) {
      flashist_logErrorToAnalytics(
        `ERROR! FlashistFacade | getYandexUniqueId __ error: ${error}`,
        flashist_logErrorTypes.DEBUG,
      );
    }

    return null;
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
      // Guards Ad:Interstitial against the SDK calling onClose twice.
      let impressionLogged = false;
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
              // Count real impressions only: the SDK reports wasShown=false when
              // it declined (e.g. its own frequency cap). Strict check because
              // the SDK is untyped.
              if (wasShown === true && !impressionLogged) {
                impressionLogged = true;
                // Analytics must never stop resolve() below — a throw here
                // would leave every awaiting call site hanging.
                try {
                  flashist_logEventAnalytics(
                    flashistConstants.analyticEvents.AD_INTERSTITIAL,
                  );
                } catch (error) {
                  console.log(
                    "FlashistFacade | Main | showInterstitial __ Ad:Interstitial logging failed: ",
                    error,
                  );
                }
              }
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
