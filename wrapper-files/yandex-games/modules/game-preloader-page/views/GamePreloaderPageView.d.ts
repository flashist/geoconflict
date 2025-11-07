import { FContainer, FLabel, Graphics, Sprite } from "@flashist/flibs";
import { BasePageView } from "@flashist/appframework/pages/views/BasePageView";
export declare class GamePreloaderPageView extends BasePageView {
    protected subtitleLabel: FLabel;
    protected progressLabel: FLabel;
    protected _loadingProgress: number;
    private _viewProgress;
    protected logoCont: FContainer;
    protected logo: Sprite;
    protected logoBgCont: FContainer;
    protected logoBg: Graphics;
    protected logoBgBaseRadius: number;
    protected construction(...args: any[]): void;
    get loadingProgress(): number;
    set loadingProgress(value: number);
    protected startAnim(): void;
    endAnim(): Promise<void>;
    get viewProgress(): number;
    set viewProgress(value: number);
    protected commitData(): void;
    protected arrange(): void;
}
