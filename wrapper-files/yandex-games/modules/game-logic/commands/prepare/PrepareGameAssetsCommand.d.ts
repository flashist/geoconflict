import { BaseAppCommand } from "@flashist/appframework/base/commands/BaseAppCommand";
import { LocaleManager } from "@flashist/flibs";
export declare class PrepareGameAssetsCommand extends BaseAppCommand {
    protected localeManager: LocaleManager;
    protected deviceState: {
        readonly device: {
            readonly deviceType: import("@flashist/flibs").DeviceType;
            readonly osType: import("@flashist/flibs").OSType;
            readonly pixelRatio: number;
            readonly isFullScreenApiAvailable: boolean;
            readonly mainLocale: string;
            readonly languages: readonly string[];
        };
    };
    protected executeInternal(): Promise<void>;
    protected prepareFonts(): Promise<void>;
}
