import { BaseAppManager, LocalStorageManager } from "@flashist/appframework";
export declare class PlatformAdapter extends BaseAppManager {
    protected localStorageManager: LocalStorageManager;
    protected playerDataAppStorageId: string;
    protected playerDataTimestampStorageId: string;
    protected initPromise: Promise<any>;
    defaultLeaderboardId: string;
    protected lastTimeSdkPlayerDataSetTimestamp: number;
    protected delaySetSdkPlayerDataTimeout: any;
    protected minDelayBetweenSetSdkPlayerData: number;
    protected lastTimeLeaderboardScoreSetTimestamp: number;
    protected delayLeaderboardScoreTimeout: any;
    protected minDelayBetweenSetLeaderboardScore: number;
    construction(params?: any[]): void;
    protected init(params?: any): Promise<void>;
    protected internalInit(params?: any): Promise<void>;
    waitInitPromise(): Promise<any>;
    gameIsReadyCallback(): Promise<void>;
    checkIfLeaderboardAvailable(): Promise<boolean>;
    setLeaderboardScoreWithCheck(score: number, leaderboardId?: string, extraData?: any, checkForPrevMaxScore?: boolean): Promise<void>;
    protected setLeaderboardScore(score: number, leaderboardId?: string, extraData?: any, checkForPrevMaxScore?: boolean): Promise<boolean>;
    checkIfAskToReviewAvailable(): Promise<boolean>;
    askToReview(): Promise<boolean>;
    protected internalAskToReview(): Promise<boolean>;
    checkIfAskToInstallAvailable(): Promise<boolean>;
    askToInstall(): Promise<boolean>;
    internalAskToInstall(): Promise<boolean>;
    getPlayerAppData(): any;
    protected getSdkPlayerData(): Promise<any>;
    protected getLocalPlayerDataTimestamp(): number;
    setPlayerAppData(data: any): void;
    /**
     * The method will apply SDK immediately, if it can (if enough time passed since the last update),
     * or will wait until it can update data
     */
    protected setSdkPlayerDataWithCheck(data: any): void;
    protected setSdkPlayerData(data: any): Promise<boolean>;
    getExperimentFlags(): Promise<any | null>;
}
