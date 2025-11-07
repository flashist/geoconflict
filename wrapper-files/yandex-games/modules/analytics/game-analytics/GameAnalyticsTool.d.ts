import { AbstractAnalyticsTool } from "../abstract/AbstractAnalyticsTool";
import { IAnalyticsToolConfig } from "../abstract/IAnalyticsToolConfig";
import { IAnalyticsConfig } from "../abstract/IAnalyticsConfig";
import { ProgressionEventStatus } from "../abstract/ProgressionEventStatus";
export declare class GameAnalyticsTool extends AbstractAnalyticsTool {
    protected construction(toolConfig: IAnalyticsToolConfig, analyticsConfig: IAnalyticsConfig, ...args: any[]): void;
    logGoal(name: string): void;
    logEvent(eventName: string, value?: number): void;
    logProgressionEvent(status: ProgressionEventStatus, id1: string, id2?: string, id3?: string): void;
    logBusinessEvent(iapId: string, iapPrice: number, currencyCode: string): void;
    logError(severity: string, message: string): void;
}
