import { IConstructor } from "@flashist/fcore";
import { TutorialStepController } from "../controllers/TutorialStepController";
export declare class TutorialStepFactory {
    protected tutorialStepIdsToControllerClassesMap: {
        [stepId: string]: IConstructor<TutorialStepController>;
    };
    addTutorialClass(stepId: string, TutorialStepControllerClass: IConstructor<TutorialStepController>): void;
    createStepController(stepId: string): TutorialStepController;
}
