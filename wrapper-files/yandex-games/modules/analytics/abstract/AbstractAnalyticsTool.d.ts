import { BaseObject } from "@flashist/fcore";
import { IAnalyticsToolConfig } from "./IAnalyticsToolConfig";
import { IAnalyticsConfig } from "./IAnalyticsConfig";
import { ProgressionEventStatus } from "./ProgressionEventStatus";
export declare abstract class AbstractAnalyticsTool extends BaseObject {
    protected toolConfig: IAnalyticsToolConfig;
    protected analyticsConfig: IAnalyticsConfig;
    constructor(toolConfig: IAnalyticsToolConfig, analyticsConfig: IAnalyticsConfig, ...args: any[]);
    protected construction(toolConfig: IAnalyticsToolConfig, analyticsConfig: IAnalyticsConfig, ...args: any[]): void;
    abstract logGoal(name: string): void;
    abstract logEvent(eventName: string, value?: number): void;
    abstract logProgressionEvent(status: ProgressionEventStatus, id1: string, id2?: string, id3?: string): void;
    abstract logError(severity: string, message: string): void;
    abstract logBusinessEvent(iapId: string, iapPrice: number, currencyCode: string): void;
}
