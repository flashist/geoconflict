import { BaseAppView, SimpleButtonView } from "@flashist/appframework";
import { FLabel, Graphics } from "@flashist/flibs";
import { ILevelConfigVO } from "../../data/levels/TestLevelConfigVO";
import { LettersGridView } from "./LettersGridView";
export declare class PlayScrenView extends BaseAppView {
    protected topBarBg: Graphics;
    protected backBtn: SimpleButtonView;
    protected titleLabel: FLabel;
    protected themeLabel: FLabel;
    protected settingsBtn: SimpleButtonView;
    protected lettersGridView: LettersGridView;
    protected testLevelConfig: ILevelConfigVO;
    protected construction(...args: any[]): void;
    protected addListeners(): void;
    protected arrange(): void;
}
