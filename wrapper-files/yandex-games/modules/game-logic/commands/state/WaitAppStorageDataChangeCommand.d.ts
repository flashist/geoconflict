import { BaseAppCommand } from "@flashist/appframework/base/commands/BaseAppCommand";
export declare class WaitAppStorageDataChageCommand extends BaseAppCommand {
    protected deepKey: string;
    protected value: any;
    constructor(deepKey: string, value: any);
    guard(): boolean;
    protected getAppStorageValue(): any;
    protected executeInternal(): void;
}
