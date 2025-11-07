export declare const AdvAdapterModuleInitialState: {
    advAdapter: {
        isPrerollAllowed: boolean;
        banner: {
            shown: boolean;
            rect: {
                x: number;
                y: number;
                width: number;
                height: number;
            };
        };
        interstitial: {
            minInterval: number;
            minIntervalToAnyOtherAdv: number;
            midLevelMinInterval: number;
            midLevelMinAppLaunchesCount: number;
        };
    };
};
export type AdvAdapterModuleState = typeof AdvAdapterModuleInitialState;
