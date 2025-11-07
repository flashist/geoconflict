import { BaseAppCommand } from "@flashist/appframework/base/commands/BaseAppCommand";
export declare class StartGameCommand extends BaseAppCommand {
    protected gameLogicState: {
        readonly gameLogic: {
            readonly score: number;
            readonly stars: number;
            readonly openCombinations: readonly string[];
        };
    };
    protected executeInternal(): Promise<void>;
}
