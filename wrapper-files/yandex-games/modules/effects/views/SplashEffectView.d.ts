import { Graphics } from "@flashist/flibs";
import { SplashEffectConfigVO } from "./SplashEffectConfigVO";
import { BaseAppView } from "@flashist/appframework/base/views/BaseAppView";
export declare class SplashEffectView extends BaseAppView {
    protected config: SplashEffectConfigVO;
    protected bg: Graphics;
    constructor(config?: Partial<SplashEffectConfigVO>);
    protected construction(config?: SplashEffectConfigVO, ...args: any[]): void;
    protected addListeners(): void;
    protected arrange(): void;
    show(): Promise<void>;
    hide(): Promise<void>;
}
