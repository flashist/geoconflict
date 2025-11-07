import { BaseAppManager, DeepReadonly, LocalStorageManager } from "@flashist/appframework";
import { IapAdapterModuleState } from "../../data/IapAdapterModuleState";
import { IIapAdapterLocalStorageVO } from "../../data/local-storage/IIapAdapterLocalStorageVO";
import { IIapProductVO } from "./IIapProductVO";
import { IPurchaseVO } from "./IPurchaseVO";
export declare class IapAdapter extends BaseAppManager {
    protected iapState: DeepReadonly<IapAdapterModuleState>;
    protected storageManager: LocalStorageManager;
    protected lastRetrievedCatalog: IIapProductVO[];
    protected construction(...args: any[]): void;
    protected applyStorageData(data: IIapAdapterLocalStorageVO): void;
    protected updateStorageData(): void;
    protected generateStorageData(): IIapAdapterLocalStorageVO;
    addCompleteIap(iapId: string): void;
    checkIfNoAdsIapActivated(): boolean;
    checkIfIapAvailable(): Promise<boolean>;
    getCatalog(): Promise<IIapProductVO[]>;
    getIapById(iapId: string): IIapProductVO;
    getUnconsumedPurchases(): Promise<IPurchaseVO[]>;
    purchase(id: string, data?: any): Promise<IPurchaseVO>;
    consume(consumeToken: string): Promise<boolean>;
}
