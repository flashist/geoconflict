import { PlatformAdapter } from "../abstract/PlatformAdapter";
export declare class YandexGamesPlatformAdapter extends PlatformAdapter {
    sdk: any;
    protected _playerSdk: any;
    get playerSdk(): any;
    protected _iapSdk: any;
    get iapSdk(): any;
    getExperimentFlags(): Promise<any | null>;
    protected internalInit(params?: any): Promise<void>;
    gameIsReadyCallback(): Promise<void>;
    checkIfLeaderboardAvailable(): Promise<boolean>;
    protected setLeaderboardScore(score: number, leaderboardId?: string, extraData?: any, checkForPrevMaxScore?: boolean): Promise<boolean>;
    checkIfAskToReviewAvailable(): Promise<boolean>;
    protected internalAskToReview(): Promise<boolean>;
    checkIfAskToInstallAvailable(): Promise<boolean>;
    internalAskToInstall(): Promise<boolean>;
    protected initPlayer(): Promise<void>;
    protected initIap(): Promise<unknown>;
    protected getSdkPlayerData(): Promise<any>;
    protected setSdkPlayerData(data: any): Promise<boolean>;
}
