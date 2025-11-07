import { HTMLManager } from "@flashist/appframework";
import { IframeAppManager } from "../../iframe-app/managers/IframeAppManager";
export declare class GameHTMLManager extends HTMLManager {
    protected iframeAppManager: IframeAppManager;
    protected iframeFocusWorkaroundInterval: any;
    protected lastFocus: boolean;
    protected addListeners(): void;
    protected workaraundCheckOfFocus(): void;
    protected removeListeners(): void;
    protected onBlur(event?: any): void;
}
