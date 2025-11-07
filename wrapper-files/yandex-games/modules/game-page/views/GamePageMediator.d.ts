import { BaseAppMediator } from "@flashist/appframework/base/mediators/BaseAppMediator";
import { GamePageView } from "./GamePageView";
import { GameScreenId } from "./GameScreenId";
export declare class GamePageMediator extends BaseAppMediator<GamePageView> {
    protected gamePageState: {
        readonly gamePage: {
            readonly screen: GameScreenId;
            readonly state: import("../data/state/GamePhase").GamePhase;
            readonly letters: readonly (readonly string[])[];
            readonly foundWords: readonly string[];
        };
    };
    onActivatorStart(activator: GamePageView): void;
    protected commitActivatorData(): void;
}
