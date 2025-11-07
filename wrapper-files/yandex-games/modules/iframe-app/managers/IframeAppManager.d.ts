import { BaseAppManager, DeepReadonly, LocalStorageManager } from "@flashist/appframework";
import { Lock } from "@flashist/fcore";
import { IframeAppModuleState } from "../state/IframeAppModuleState";
export declare class IframeAppManager extends BaseAppManager {
    protected pauseLock: Lock;
    protected iframeAppState: DeepReadonly<IframeAppModuleState>;
    protected localStorageManager: LocalStorageManager;
    protected updateLocalStorageInterval: any;
    protected construction(...args: any[]): void;
    protected addListeners(): void;
    protected _iframeAppElement: HTMLIFrameElement;
    get iframeAppElement(): HTMLIFrameElement;
    createIframeApp(iframeElementHTMLText: string, parentElement: Node): HTMLIFrameElement;
    hideIframeApp(): void;
    showIframeApp(): void;
    updateStorageData(): void;
    addPauseLock(lock: any): void;
    removePauseLock(lock: any): void;
    commitPauseChangeData(): void;
    protected muteLock: Lock;
    addMuteLock(lock: any): void;
    removeMuteLock(lock: any): void;
    commitMuteChangeData(): void;
}
