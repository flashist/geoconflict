import { Rectangle } from "@flashist/flibs";
import { AdvAdapter } from "../abstract/AdvAdapter";
import { IYandexWebAdvDeviceTypeSingleConfigVO, YandexWebAdvPlatformAdapterConfigVO } from "./YandexWebAdvPlatformAdapterConfigVO";
import { YandexWebPlatformAdapter } from "./YandexWebPlatformAdapter";
import { DeepReadonly, DeviceModuleState } from "@flashist/appframework";
export declare class YandexWebAdvPlatformAdapter extends AdvAdapter {
    protected deviceState: DeepReadonly<DeviceModuleState>;
    protected platformAdapter: YandexWebPlatformAdapter;
    protected config: YandexWebAdvPlatformAdapterConfigVO;
    protected deviceConfig: IYandexWebAdvDeviceTypeSingleConfigVO;
    protected construction(...args: any[]): void;
    internalShowInterstitialAdv(): Promise<any>;
    internalShowRewardedAdv(): Promise<any>;
    protected internalShowBannerAdv(): Promise<any>;
    protected updateBannerData(): void;
    protected getBannerRect(): Rectangle;
}
