import { IapAdapter } from "../abstract/iap/IapAdapter";
import { YandexGamesPlatformAdapter } from "./YandexGamesPlatformAdapter";
import { IPurchaseVO } from "../abstract/iap/IPurchaseVO";
import { IIapProductVO } from "../abstract/iap/IIapProductVO";
export declare class YandexGamesIapAdapter extends IapAdapter {
    protected platformAdapter: YandexGamesPlatformAdapter;
    protected convertYandexIapIntoGameIap(source: any): IIapProductVO;
    protected convertYandexPurchaseIntoGamePurchase(source: any): IPurchaseVO;
    getCatalog(): Promise<IIapProductVO[]>;
    getUnconsumedPurchases(): Promise<IPurchaseVO[]>;
    purchase(id: string, data?: any): Promise<IPurchaseVO>;
    consume(consumeToken: string): Promise<boolean>;
}
