import { LangSelector } from "../LangSelector";
import { GameAnalytics } from "gameanalytics";
import { GameEnv } from "../../core/configuration/Config";
import { setOtelUser } from "../OtelBrowserInit";
import { isMobileDevice } from "../Utils";
import version from "../../version";

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
    GAME_END: "Game:End",
    GAME_MODE_MULTIPLAYER: "Game:Mode:Multiplayer",
    GAME_MODE_SOLO: "Game:Mode:Solo",
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
    MATCH_SPAWN_CHOSEN: "Match:SpawnChosen",
    MATCH_SPAWN_AUTO: "Match:SpawnAuto",
    MATCH_SPAWNED_CONFIRMED: "Match:Spawned",
    MATCH_SPAWN_MISSED_TIMING_RACE: "Match:SpawnMissed:TimingRace",
    MATCH_SPAWN_MISSED_NO_ATTEMPT: "Match:SpawnMissed:NoAttempt",
    MATCH_SPAWN_RETRY_AFTER_CATCHUP: "Match:SpawnRetryAfterCatchup",
    MATCH_SPAWN_MISSED_CATCHUP_TOO_LONG: "Match:SpawnMissed:CatchupTooLong",
    MATCH_LOSS_OPPONENT_WON: "Match:Loss:OpponentWon",
    MATCH_DURATION: "Match:Duration",

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

  if (!severity) {
    severity = flashist_logErrorTypes.ERROR;
  }

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
  var extra = !col ? "" : "\ncolumn: " + col;
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

  public yandexGamesSDK: any;

  constructor() {
    if (typeof (window as any).YaGames !== "undefined") {
      this.yaGamesAvailable = true;
    }

    this.yandexInitPromise = this.yandexSdkInit();
    this.yandexSdkInitPlayerPromise = this.initPlayer();

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

    this.initializationPromise = this._initialize();
  }

  public readonly initializationPromise: Promise<void>;

  private async _initialize(): Promise<void> {
    // 1. SDK must be ready first — both initPlayer() and initExperimentFlags() await it
    //    internally, so this explicit gate makes the dependency clear and ensures step 2
    //    starts only after the SDK object is available.
    await this.yandexInitPromise;

    // 2. Player and experiment flags can proceed in parallel
    const [playerResult, flagsResult] = await Promise.allSettled([
      this.yandexSdkInitPlayerPromise,
      this.initExperimentFlags(),
    ]);
    if (playerResult.status === "rejected") {
      console.warn("Init step failed: player init", playerResult.reason);
    }
    if (flagsResult.status === "rejected") {
      console.warn("Init step failed: experiment flags", flagsResult.reason);
    }

    // 3. Apply experiment-driven config mutations — guaranteed to be after flags are loaded
    // const joinMoreAdsEnabled = await this.checkExperimentFlag(
    //     flashistConstants.experiments.JOIN_MORE_ADS_FLAG_NAME,
    //     flashistConstants.experiments.JOIN_MORE_ADS_FLAG_VALUE,
    // );
    // if (joinMoreAdsEnabled) {
    //     flashistConstants.ads.interstitial.join = flashistConstants.ads.interstitial.joinMoreAds;
    // }

    // 4. OTEL user context (best-effort)
    const name = await this.getCurPlayerName().catch(() => undefined);
    if (name) setOtelUser(name);
  }

  // Single place for working with URLS
  public changeHref(value) {
    // window.location.href = value;
    window.location.href = value;
  }

  public yandexInitPromise: Promise<any>;
  private async yandexSdkInit() {
    if (this.yaGamesAvailable) {
      await (window as any).YaGames.init().then((sdk) => {
        console.log("FlashistFacade | Main | yandexInit > then __ sdk: ", sdk);

        this.yandexGamesSDK = sdk;
      });
    }
  }

  public yandexGamesReadyCallback() {
    console.log(
      "FlashistFacade | yandexGamesReadyCallback | yandexGamesSDK: ",
      this.yandexGamesSDK,
    );

    if (this.yandexGamesSDK) {
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
  protected async initExperimentFlags(): Promise<void> {
    await this.yandexInitPromise;

    if (!this.yandexInitExperimentsPromise) {
      this.yandexInitExperimentsPromise = new Promise<void>(async (resolve) => {
        let experiments: any;

        if (this.yandexGamesSDK) {
          try {
            experiments = await this.yandexGamesSDK.getFlags();
            if (!experiments) {
              experiments = {};
            }
          } catch (error) {
            flashist_logErrorToAnalytics(
              `ERROR! FlashistFacade | initExperimentFlags __ error: ${error}`,
              flashist_logErrorTypes.DEBUG,
            );
          }
        }

        this.yandexExperimentFlags = experiments;

        // Fire one analytics event per flag as soon as flags are loaded.
        // Format: "Experiment:{flagName}:{flagValue}"
        if (this.yandexExperimentFlags) {
          for (const [name, value] of Object.entries(
            this.yandexExperimentFlags,
          )) {
            this.logExperimentEvent(name, String(value));
          }
        }

        resolve();
      });
    }

    return this.yandexInitExperimentsPromise;
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
      if (this.yandexExperimentFlags[name] == value) {
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

  public logExperimentEvent(name: string, value: string): void {
    flashist_logEventAnalytics(`Experiment:${name}:${value}`);
  }

  public logUiTapEvent(elementId: string): void {
    flashist_logEventAnalytics(
      flashistConstants.analyticEvents.UI_TAP_FIRST_PART + elementId,
    );
  }

  // PLAYER
  protected yandexSdkInitPlayerPromise: Promise<void>;
  protected yandexSdkPlayerObject: any;
  protected async initPlayer() {
    return new Promise<void>(async (resolve, reject) => {
      await this.yandexInitPromise;

      if (this.yandexGamesSDK) {
        try {
          await this.yandexGamesSDK.getPlayer().then((player) => {
            this.yandexSdkPlayerObject = player;

            resolve();
          });
        } catch (error) {
          flashist_logErrorToAnalytics(
            `ERROR! FlashistFacade | initPlayer __ error: ${error}`,
            flashist_logErrorTypes.DEBUG,
          );

          reject();
        }
      } else {
        resolve(); // No SDK available — nothing to initialize
      }
    });
  }

  public async getCurPlayerName(): Promise<string> {
    await this.yandexSdkInitPlayerPromise;

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

    return new Promise((resolve: Function, reject: Function) => {
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
        let isAvailable: boolean =
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
    if (!leaderboardId) {
      leaderboardId = this.defaultLeaderboardId;
    }

    await this.yandexInitPromise;

    return new Promise(async (resolve, reject) => {
      let result: number = 0;

      if (this.yandexGamesSDK) {
        let isAvailable: boolean = await this.checkIfSdkMethodAvailable(
          "leaderboards.getPlayerEntry",
        );
        if (isAvailable) {
          this.yandexGamesSDK.leaderboards
            .getPlayerEntry(leaderboardId)
            .then((data) => {
              // console.log(res);
              if (data) {
                result = data.score;
              } else {
                flashist_logErrorToAnalytics(
                  "ERROR! Flashist Facade | getCurPlayerLeaderboardScore __ then __ no data!",
                  flashist_logErrorTypes.DEBUG,
                );
              }

              resolve(result);
            })
            .catch((error) => {
              flashist_logErrorToAnalytics(
                "ERROR! Flashist Facade | getCurPlayerLeaderboardScore __ error.code: " +
                error.code,
                flashist_logErrorTypes.DEBUG,
              );

              reject(error);
              // if (err.code === 'LEADERBOARD_PLAYER_NOT_PRESENT') {
              //     // Срабатывает, если у игрока нет записи в лидерборде.
              // }
            });
        } else {
          resolve(result);
        }
      } else {
        resolve(result);
      }
    });
  }

  public async setCurPlayerLeaderboardScore(
    score: number,
    leaderboardId?: string,
  ): Promise<boolean> {
    let result: boolean = false;

    if (!leaderboardId) {
      leaderboardId = this.defaultLeaderboardId;
    }

    await this.yandexInitPromise;

    if (this.yandexGamesSDK) {
      let isAvailable: boolean = await this.checkIfSdkMethodAvailable(
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

    if (!leaderboardId) {
      leaderboardId = this.defaultLeaderboardId;
    }

    let playerPrevMaxScore: number = 0;
    try {
      let isAvailable: boolean = await this.checkIfSdkMethodAvailable(
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

    let newScore: number = playerPrevMaxScore + increase;
    result = await this.setCurPlayerLeaderboardScore(newScore, leaderboardId);

    return result;
  }
}

export const flashist_getLangSelector = (): LangSelector => {
  let result: LangSelector = document.querySelector(
    "lang-selector",
  ) as LangSelector;

  return result;
};

export const flashist_waitGameInitComplete = async (): Promise<void> => {
  await FlashistFacade.instance.initializationPromise;
  const langSelector = flashist_getLangSelector();
  await langSelector.langReadyPromise;
};
(window as any).flashist_waitGameInitComplete = flashist_waitGameInitComplete;

(window as any).FlashistFacade = FlashistFacade;
