import { BaseAppCommand } from "@flashist/appframework/base/commands/BaseAppCommand";
import { SoundsManager } from "@flashist/flibs";
export declare class StartBackgroundMusicCommand extends BaseAppCommand {
    protected soundsManager: SoundsManager;
    protected executeInternal(): void;
}
