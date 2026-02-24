import { LangSelector } from "../LangSelector";
import { GameAnalytics } from "gameanalytics";
import { GameEnv } from "../../core/configuration/Config";

//
export const flashistConstants = {
    analyticEvents: {
        UI_CLICK_MULTIPLAYER_BUTTON: "UI_CLICK_MULTIPLAYER_BUTTON",
        UI_CLICK_SINGLE_PLAYER_BUTTON: "UI_CLICK_SINGLE_PLAYER_BUTTON",
        UI_CLICK_SINGLE_MISSION_BUTTON: "UI_CLICK_SINGLE_MISSION_BUTTON",

        GAME_START: "GAME_START",
        GAME_END: "GAME_END",
        GAME_WIN: "GAME_WIN",
        GAME_LOSS: "GAME_LOSS",
        GAME_ABANDON: "GAME_ABANDON",
        PLAYER_ELIMINATED: "PLAYER_ELIMINATED"
    },

    progressionEventStatus: {
        Undefined: 0,
        Start: 1,
        Complete: 2,
        Fail: 3
    }
};

// Working with analytics logs
export const flashist_logEventAnalytics = (event: string, value?: number) => {
    try {
        GameAnalytics.addDesignEvent(event, value);

    } catch (error) {
        flashist_logErrorToAnalytics("ERROR! flashist_logEventAnalytics | logEvent __ error: ", error);
    }
}
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
    CRITICAL: "Critical"
}
export const flashist_logErrorToAnalytics = (errorText: string, severity?: string) => {
    console.log("flashist_logErrorToAnalytics __ errorText: ", errorText, " | severity: ", severity);

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
}
window.onerror = function (msg, url, line, col, error) {
    // Note that col & error are new to the HTML 5 spec and may not be 
    // supported in every browser.  It worked for me in Chrome.
    var extra = !col ? '' : '\ncolumn: ' + col;
    extra += !error ? '' : '\nerror: ' + error;

    // You can view the information in an alert to see things working like this:
    // alert("Error: " + msg + "\nurl: " + url + "\nline: " + line + extra);
    const errorText = "Error: " + msg + "\nurl: " + url + "\nline: " + line + extra;

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
window.addEventListener(
    'unhandledrejection',
    (event) => {
        if (GameEnv.Dev) {

        }

        // console.error('Unhandled rejection (promise: ', event.promise, ', reason: ', event.reason, ').');
        let errorText = 'Unhandled rejection:\npromise: ' + event.promise + ',\nreason: ' + event.reason;
        if (event.reason?.stack) {
            errorText += ",\nstack: " + event.reason?.stack;
        }
        errorText += '\n).';

        // GameIframeCommunicationManager.sendErrorAnalyticsEvent(errorText, ErrorEventSeverity.ERROR);
        flashist_logErrorToAnalytics(errorText, flashist_logErrorTypes.DEBUG);
    }
);


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
    public windowOrigin: string = window.location.origin + window.location.pathname;
    public rootPathname: string = window.location.pathname;

    public yaGamesAvailable: boolean = false;

    public yandexGamesSDK: any;

    constructor() {
        if (typeof (window as any).YaGames !== 'undefined') {
            this.yaGamesAvailable = true;
        }

        this.yandexInitPromise = this.yandexSdkInit();
        this.yandexSdkInitPlayerPromise = this.initPlayer();
        this.initExperimentFlags();

        // Setting up Game Analytics
        GameAnalytics.setEnabledInfoLog(true);
        GameAnalytics.setEnabledVerboseLog(true);

        // Platform custom dimensions
        const isMobile = window.matchMedia("(pointer: coarse)").matches || /Android|iPhone|iPad/i.test(navigator.userAgent);
        const isYandex = this.yaGamesAvailable;
        GameAnalytics.setCustomDimension01(isMobile ? "mobile" : "desktop");
        GameAnalytics.setCustomDimension02(isYandex ? "yandex" : "web");

        // GameAnalytics.configureBuild(this.analyticsConfig.buildId);
        GameAnalytics.initialize("a1f0fb4335fe32696c3b76eb49612ead", "ba57db678bc9a1181bde9430bad83c6fa3b71862");
    }

    // Single place for working with URLS
    public changeHref(value) {
        // window.location.href = value;
        window.location.href = value;
    }

    public yandexInitPromise: Promise<any>;
    private async yandexSdkInit() {
        if (this.yaGamesAvailable) {
            await (window as any).YaGames
                .init()
                .then(
                    (sdk) => {
                        console.log("FlashistFacade | Main | yandexInit > then __ sdk: ", sdk);

                        this.yandexGamesSDK = sdk;
                    }
                )
        }
    }

    public yandexGamesReadyCallback() {
        console.log("FlashistFacade | yandexGamesReadyCallback | yandexGamesSDK: ", this.yandexGamesSDK);

        if (this.yandexGamesSDK) {
            console.log("FlashistFacade | yandexGamesReadyCallback | ready callback __ BEFORE");
            this.yandexGamesSDK.features?.LoadingAPI?.ready();
            console.log("FlashistFacade | yandexGamesReadyCallback | ready callback __ AFTER");
        }

        // TEST
        console.log("FlashistFacade | yandexGamesReadyCallback __ yandexGamesReadyCallback __ COMPLETE _ 2");
    };

    // FLAGS (Experiments)
    protected yandexInitExperimentsPromise: Promise<any>;
    protected yandexExperimentFlags: any;
    protected async initExperimentFlags(): Promise<void> {
        await this.yandexInitPromise;

        if (!this.yandexInitExperimentsPromise) {
            this.yandexInitExperimentsPromise = new Promise<void>(
                async (resolve) => {
                    let experiments: any;

                    if (this.yandexGamesSDK) {
                        try {
                            experiments = await this.yandexGamesSDK.getFlags();
                            if (!experiments) {
                                experiments = {};
                            }
                        } catch (error) {
                            flashist_logErrorToAnalytics(`ERROR! FlashistFacade | initExperimentFlags __ error: ${error}`, flashist_logErrorTypes.DEBUG);
                        }
                    }

                    this.yandexExperimentFlags = experiments;

                    resolve();
                }
            );
        }

        return this.yandexInitExperimentsPromise;
    }

    // public async getExperimentFlags(): Promise<any> {
    //     await this.initExperimentFlags();

    //     return this.yandexExperimentFlags;
    // }

    public async checkExperimentFlag(name: string, value: string): Promise<boolean> {
        await this.initExperimentFlags();

        let result: boolean = false;

        if (this.yandexExperimentFlags) {
            if (this.yandexExperimentFlags[name] == value) {
                result = true;
            }
        }

        return result;
    }

    // PLAYER
    protected yandexSdkInitPlayerPromise: Promise<void>;
    protected yandexSdkPlayerObject: any;
    protected async initPlayer() {
        return new Promise<void>(
            async (resolve, reject) => {
                await this.yandexInitPromise;

                if (this.yandexGamesSDK) {
                    try {
                        await this.yandexGamesSDK.getPlayer()
                            .then(
                                (player) => {
                                    this.yandexSdkPlayerObject = player;

                                    resolve();
                                }
                            );

                    } catch (error) {
                        flashist_logErrorToAnalytics(`ERROR! FlashistFacade | initPlayer __ error: ${error}`, flashist_logErrorTypes.DEBUG);

                        reject();
                    }
                }
            }
        );
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
                flashist_logErrorToAnalytics(`ERROR! FlashistFacade | getCurPlayerName __ error: ${error}`, flashist_logErrorTypes.DEBUG);
            }
        }

        return result;
    }


    // ADV

    public async showInterstitial() {
        console.log("FlashistFacade | Main | showInterstitial");

        if (!this.yandexGamesSDK) {
            console.log("FlashistFacade | Main | showInterstitial __ ERROR! No yandexGamesSDK: ", this.yandexGamesSDK);
            return;
        }

        return new Promise(
            (resolve: Function, reject: Function) => {
                try {
                    console.log("FlashistFacade | Main | showInterstitial __ showFullscreenAdv __ BEFORE");
                    this.yandexGamesSDK.adv.showFullscreenAdv({
                        callbacks: {
                            onClose: (wasShown) => {
                                console.log("FlashistFacade | Main | showInterstitial __ showFullscreenAdv __ onClose __ wasShown: ", wasShown);
                                // some action after close
                                resolve(wasShown);
                            },
                            onError: (error) => {
                                console.log("FlashistFacade | Main | showInterstitial __ showFullscreenAdv __ onError __ error: ", error);
                                // some action on error
                                // reject(error);
                                resolve(false);
                            }
                        }
                    });

                } catch (error) {
                    console.log("FlashistFacade | Main | showInterstitial __ showFullscreenAdv __ catch __ error: ", error);
                    // reject(error);
                    resolve(false);
                }
            }
        );
    }

    public async getLanguageCode(): Promise<string> {

        // Waiting for the init to complete first
        await this.yandexInitPromise;

        let result: string = "";

        if (this.yandexGamesSDK) {
            console.log("FlashistFacade | Main | getLanguageCode __ this.yandexGamesSDK?.environment?.i18n?.lang: ", this.yandexGamesSDK?.environment?.i18n?.lang);
            let tempLocale = "";
            if (this.yandexGamesSDK?.environment?.i18n?.lang) {
                tempLocale = this.yandexGamesSDK.environment.i18n.lang;
            }

            const supportedLocales = {
                // English
                "default": "en",

                // Russian
                "ru": "ru",
                "be": "ru",
                "kk": "ru",
                "uk": "ru",
                "uz": "ru"
            };
            if (supportedLocales[tempLocale]) {
                result = supportedLocales[tempLocale];
            } else {
                result = supportedLocales.default;
            }

        } else {
            console.log("FlashistFacade | Main | getLanguageCode __ ERROR! No yandexGamesSDK: ", this.yandexGamesSDK);
        }

        return result;
    }

    // CHECK AVAILABLE METHODS
    protected sdkMethodsStatusCacheMap: { [method: string]: { isAvailable: boolean } } = {};
    protected async checkIfSdkMethodAvailable(sdkMethod: string): Promise<boolean> {
        let result: boolean = false;

        await this.yandexInitPromise;

        if (this.yandexGamesSDK) {
            if (this.sdkMethodsStatusCacheMap[sdkMethod]) {
                result = this.sdkMethodsStatusCacheMap[sdkMethod].isAvailable;
            } else {
                let isAvailable: boolean = await this.yandexGamesSDK.isAvailableMethod(sdkMethod);
                this.sdkMethodsStatusCacheMap[sdkMethod] = {
                    isAvailable: isAvailable
                }

                result = isAvailable;
            }
        }

        return result;
    }

    // LEADERBOARD
    protected defaultLeaderboardId: string = "default";
    protected async getCurPlayerLeaderboardScore(leaderboardId?: string): Promise<number> {
        if (!leaderboardId) {
            leaderboardId = this.defaultLeaderboardId;
        }

        await this.yandexInitPromise;

        return new Promise(
            async (resolve, reject) => {
                let result: number = 0;

                if (this.yandexGamesSDK) {
                    let isAvailable: boolean = await this.checkIfSdkMethodAvailable("leaderboards.getPlayerEntry");
                    if (isAvailable) {
                        this.yandexGamesSDK.leaderboards.getPlayerEntry(leaderboardId)
                            .then(
                                (data) => {
                                    // console.log(res);
                                    if (data) {
                                        result = data.score;
                                    } else {
                                        flashist_logErrorToAnalytics("ERROR! Flashist Facade | getCurPlayerLeaderboardScore __ then __ no data!", flashist_logErrorTypes.DEBUG);
                                    }

                                    resolve(result);
                                })
                            .catch(
                                (error) => {
                                    flashist_logErrorToAnalytics("ERROR! Flashist Facade | getCurPlayerLeaderboardScore __ error.code: " + error.code, flashist_logErrorTypes.DEBUG);

                                    reject(error);
                                    // if (err.code === 'LEADERBOARD_PLAYER_NOT_PRESENT') {
                                    //     // Срабатывает, если у игрока нет записи в лидерборде.
                                    // }
                                }
                            );

                    } else {
                        resolve(result);
                    }

                } else {
                    resolve(result);
                }
            }
        );
    }

    public async setCurPlayerLeaderboardScore(score: number, leaderboardId?: string): Promise<boolean> {
        let result: boolean = false;

        if (!leaderboardId) {
            leaderboardId = this.defaultLeaderboardId;
        }

        await this.yandexInitPromise;

        if (this.yandexGamesSDK) {
            let isAvailable: boolean = await this.checkIfSdkMethodAvailable("leaderboards.setScore");
            if (isAvailable) {
                result = await this.yandexGamesSDK.leaderboards.setScore(leaderboardId, score)
            }
        }

        return result;
    }

    public async increaseCurPlayerLeaderboardScore(increase: number, leaderboardId?: string): Promise<boolean> {

        let result: boolean = false;

        if (!leaderboardId) {
            leaderboardId = this.defaultLeaderboardId;
        }

        let playerPrevMaxScore: number = 0;
        try {
            let isAvailable: boolean = await this.checkIfSdkMethodAvailable("leaderboards.getPlayerEntry");
            if (isAvailable) {
                const curPlayerLeaderboardScore: number = await this.getCurPlayerLeaderboardScore();
                playerPrevMaxScore = curPlayerLeaderboardScore;
            }

        } catch (error) {
            console.error("YandexGamesPlatformAdapter | setLeaderboardScore __ error: ", error);
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
}

export const flashist_waitGameInitComplete = async (): Promise<void> => {
    await FlashistFacade.instance.yandexInitPromise;
    //
    const langSelector = flashist_getLangSelector();
    await langSelector.langReadyPromise;
}
(window as any).flashist_waitGameInitComplete = flashist_waitGameInitComplete;

(window as any).FlashistFacade = FlashistFacade;
