import { BaseAppManager } from "@flashist/appframework";
import { Rectangle, SoundsManager } from "@flashist/flibs";
export declare class AdvAdapter extends BaseAppManager {
    protected soundsManager: SoundsManager;
    protected appState: {
        readonly app: {
            readonly debug: boolean;
            readonly curLaunchTimestamp: number;
            readonly prevLaunchTimestamp: number;
            readonly appLaunchesCount: number;
            readonly appDaysLaunchesCount: number;
            readonly appDaysLaunchesCount_consequent_withMaxBreaks_Day1: number;
            readonly appDaysLaunchesCount_consequent_withMaxBreaks_Day3: number;
            readonly appDaysLaunchesCount_consequent_withMaxBreaks_Day7: number;
            readonly sessionDuration: number;
            readonly totalUsageDuration: number;
            readonly prevSessionTotalUsageDuration: number;
            readonly config: {
                readonly appName: string;
                readonly appVersion: number;
                readonly files: readonly any[];
                readonly supportedLocales?: readonly string[];
                readonly sizeArea: {
                    readonly x: number;
                    readonly y: number;
                    readonly width: number;
                    readonly height: number;
                };
            };
        };
    };
    protected advAdapterState: {
        readonly advAdapter: {
            readonly isPrerollAllowed: boolean;
            readonly banner: {
                readonly shown: boolean;
                readonly rect: {
                    readonly x: number;
                    readonly y: number;
                    readonly width: number;
                    readonly height: number;
                };
            };
            readonly interstitial: {
                readonly minInterval: number;
                readonly minIntervalToAnyOtherAdv: number;
                readonly midLevelMinInterval: number;
                readonly midLevelMinAppLaunchesCount: number;
            };
        };
    };
    protected muteSoundsDuringAdv: boolean;
    protected anyAdvLastTimeShown: number;
    protected interstitialAdvLastTimeShown: number;
    protected rewardedAdvMinInterval: number;
    protected rewardedAdvLastTimeShown: number;
    setLastTimeShownValuesToCurrentTime(): void;
    checkIfInterstitialAdvAvailable(isMidLevel: boolean): boolean;
    getInterstitialAdvTimeToAvailable(isMidLevel: boolean): number;
    showInterstitialAdv(): Promise<any>;
    protected internalShowInterstitialAdv(): Promise<any>;
    checkIfRewardedAdvAvailable(): boolean;
    showRewardedAdv(): Promise<boolean>;
    protected internalShowRewardedAdv(): Promise<boolean>;
    checkIfBannerAdvAvailable(): boolean;
    showBannerAdv(): Promise<any>;
    protected internalShowBannerAdv(): Promise<any>;
    protected updateBannerData(): void;
    protected getBannerRect(): Rectangle;
    protected addDisableSoundsLock(): void;
    protected removeDisalbeSoundsLock(): void;
}
