import { BaseAppView, SimpleButtonView } from "@flashist/appframework";
import { FContainer, FLabel, Graphics } from "@flashist/flibs";
export declare class StartScrenView extends BaseAppView {
    titleCont: FContainer;
    titleAnimCont: FContainer;
    title1Label: FLabel;
    title2Label: FLabel;
    protected playBtn: SimpleButtonView;
    protected playBtnExternalView: FContainer;
    protected playBtnNormalView: Graphics;
    protected playNextInfo: FLabel;
    protected construction(...args: any[]): void;
    destruction(): void;
    protected addListeners(): void;
    protected stopTitleAnim(): void;
    protected restartTitleAnim(): void;
    protected arrange(): void;
}
