import { AdvAdapter } from "../abstract/AdvAdapter";
import { YandexGamesPlatformAdapter } from "./YandexGamesPlatformAdapter";
export declare class YandexGamesAdvAdapter extends AdvAdapter {
    protected platformAdapter: YandexGamesPlatformAdapter;
    internalShowInterstitialAdv(): Promise<any>;
    internalShowRewardedAdv(): Promise<boolean>;
}
