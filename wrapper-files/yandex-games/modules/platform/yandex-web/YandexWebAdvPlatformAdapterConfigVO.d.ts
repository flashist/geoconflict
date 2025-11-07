export declare class YandexWebAdvPlatformAdapterConfigVO {
    desktop: IYandexWebAdvDeviceTypeSingleConfigVO;
    mobile: IYandexWebAdvDeviceTypeSingleConfigVO;
}
export interface IYandexWebAdvDeviceTypeSingleConfigVO {
    fullscreen?: IYandexWebAdvSingleConfigVO;
    rewarded?: IYandexWebAdvSingleConfigVO;
    banner?: IYandexWebAdvSingleConfigVO;
}
export interface IYandexWebAdvSingleConfigVO {
    yandexConfig: {
        renderTo?: string;
        blockId?: string;
        type?: string;
        platform?: string;
    };
}
