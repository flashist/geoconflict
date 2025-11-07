import { IIapProductVO } from "../abstract/iap/IIapProductVO";
export declare const IapAdapterModuleInitialState: {
    iapAdapter: {
        completedIapIds: string[];
        noAdsIapIds: string[];
        debug: {
            catalog: IIapProductVO[];
        };
    };
};
export type IapAdapterModuleState = typeof IapAdapterModuleInitialState;
