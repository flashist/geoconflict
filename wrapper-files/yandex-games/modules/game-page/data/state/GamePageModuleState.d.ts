import { GameScreenId } from "../../views/GameScreenId";
import { GamePhase } from "./GamePhase";
export declare const GamePageModuleInitialState: {
    gamePage: {
        screen: GameScreenId;
        state: GamePhase;
        letters: string[][];
        foundWords: string[];
    };
};
export type GamePageModuleState = typeof GamePageModuleInitialState;
