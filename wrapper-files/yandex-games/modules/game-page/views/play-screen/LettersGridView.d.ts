import { BaseAppView } from "@flashist/appframework";
import { SingleGridLetterView } from "./SingleGridLetterView";
import { FContainer, ServiceLocatorObjectsPool } from "@flashist/flibs";
export declare class LettersGridView extends BaseAppView {
    protected letters: string[][];
    protected lettersCont: FContainer;
    protected gridLettersList: SingleGridLetterView[];
    protected gridLettersPool: ServiceLocatorObjectsPool;
    protected gridColumns: number;
    protected gridSize: {
        x: number;
        y: number;
    };
    protected cellSize: {
        x: number;
        y: number;
    };
    protected cellsPadding: {
        x: number;
        y: number;
    };
    protected construction(...args: any[]): void;
    setLetters(letters: string[][]): void;
    protected clearAllLetters(): void;
    protected updateLettersView(): void;
}
