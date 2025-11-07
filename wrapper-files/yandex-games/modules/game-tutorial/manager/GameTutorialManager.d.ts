import { BaseAppManager } from "@flashist/appframework/base/managers/BaseAppManager";
import { TutorialManager } from "../../tutorial/managers/TutorialManager";
export declare class GameTutorialManager extends BaseAppManager {
    protected gamePageState: {
        readonly gamePage: {
            readonly screen: import("../../game-page/views/GameScreenId").GameScreenId;
            readonly state: import("../../game-page/data/state/GamePhase").GamePhase;
            readonly letters: readonly (readonly string[])[];
            readonly foundWords: readonly string[];
        };
    };
    protected gameLogicState: {
        readonly gameLogic: {
            readonly score: number;
            readonly stars: number;
            readonly openCombinations: readonly string[];
        };
    };
    protected tutorialManager: TutorialManager;
    protected addListeners(): void;
}
