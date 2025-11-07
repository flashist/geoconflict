import { IAnalyticsToolConfig } from "./IAnalyticsToolConfig";
export interface IAnalyticsConfig {
    buildId: string;
    tools: {
        [key in string]: IAnalyticsToolConfig;
    };
}
