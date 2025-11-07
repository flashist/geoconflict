import { BaseAppCommand } from "@flashist/appframework";
export declare class StartLevelCommand extends BaseAppCommand {
    protected levelId: string;
    constructor(levelId: string);
    protected executeInternal(): void;
}
