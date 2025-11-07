import { PlatformAdapter } from "../abstract/PlatformAdapter";
export declare class VkPlayPlatformAdapter extends PlatformAdapter {
    sdk: any;
    protected placeholderSdkCallbacksMap: any;
    realSdkCallbacksMap: any;
    protected internalInit(params?: any): Promise<void>;
}
