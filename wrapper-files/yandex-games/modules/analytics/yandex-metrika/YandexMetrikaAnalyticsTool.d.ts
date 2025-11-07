import { AbstractAnalyticsTool } from "../abstract/AbstractAnalyticsTool";
import { IAnalyticsConfig } from "../abstract/IAnalyticsConfig";
import { IAnalyticsToolConfig } from "../abstract/IAnalyticsToolConfig";
import { ProgressionEventStatus } from "../abstract/ProgressionEventStatus";
export declare class YandexMetrikaAnalyticsTool extends AbstractAnalyticsTool {
    protected construction(toolConfig: IAnalyticsToolConfig, analyticsConfig: IAnalyticsConfig, ...args: any[]): void;
    logGoal(name: string): void;
    logProgressionEvent(status: ProgressionEventStatus, id1: string, id2?: string, id3?: string): void;
    logEvent(name: string, value?: any): void;
    logBusinessEvent(iapId: string, iapPrice: number, currencyCode: string): void;
    logError(severity: string, message: string): void;
}
