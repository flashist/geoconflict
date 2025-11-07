import { IAnalyticsConfig } from "./IAnalyticsConfig";
import { ProgressionEventStatus } from "./ProgressionEventStatus";
export declare class Analytics {
    private static isInitialized;
    private static analyticTools;
    static init(config: IAnalyticsConfig, userProps?: Record<string, any>): void;
    static logGoal(goalName: string): void;
    static logEvent(eventName: string, value?: number): void;
    static logProgressionEvent(status: ProgressionEventStatus, id1: string, id2?: string, id3?: string): void;
    static logBusinessEvent(iapId: string, iapPrice: number, currencyCode: string): void;
    static logErrorEvent(severity: string, message: string): void;
}
