import { LocalStorageManager } from "@flashist/appframework";
import { BaseAppManager } from "@flashist/appframework/base/managers/BaseAppManager";
export declare class GameSaveManager extends BaseAppManager {
    protected storageManager: LocalStorageManager;
    protected addListeners(): void;
    protected updateSaveData(): void;
}
