import { BaseAppManager } from "@flashist/appframework/base/managers/BaseAppManager";
import { TutorialStepController } from "../controllers/TutorialStepController";
import { EventListenerHelper } from "@flashist/fcore";
import { TutorialStepFactory } from "../factories/TutorialStepFactory";
import { LocalStorageManager } from "@flashist/appframework";
export declare class TutorialManager extends BaseAppManager {
    protected tutorialState: {
        readonly tutorial: {
            readonly activeStepIds: readonly string[];
            readonly completeStepIds: readonly string[];
        };
    };
    protected tutorialStepCofnigsState: {
        readonly tutorialStepConfigs: {
            readonly configs: {
                readonly [x: string]: {
                    readonly id: string;
                    readonly viewId: string;
                    readonly completeSaveStepId?: string;
                    readonly textId?: string;
                    readonly requiredCompleteStepIds?: readonly string[];
                    readonly blocking?: boolean;
                    readonly blockingHole?: boolean;
                    readonly align?: import("@flashist/flibs").Align;
                    readonly valign?: import("@flashist/flibs").VAlign;
                    readonly labelAlign?: import("pixi.js").TextStyleAlign;
                    readonly labelValign?: import("@flashist/flibs").VAlign;
                    readonly minTimeToDisplayMs?: number;
                    readonly completeByStageDown?: boolean;
                    readonly globalEventToComplete?: string;
                    readonly startAnalyticsEvent?: string;
                    readonly completeAnalyticsEvent?: string;
                };
            };
        };
    };
    protected tutorialStepsFactory: TutorialStepFactory;
    protected storageManager: LocalStorageManager;
    protected stepsEventListenerHelper: EventListenerHelper;
    protected activeStepControllers: TutorialStepController[];
    destruction(): void;
    protected updateSaveData(): void;
    startStep(id: string): Promise<void>;
    protected processControllerComplete(stepController: TutorialStepController): void;
    protected addStepListeners(stepController: TutorialStepController): void;
    protected removeStepListeners(stepController: TutorialStepController): void;
    checkIfStepCanBeStarted(id: string): boolean;
    checkIfStepComplete(id: string): boolean;
    checkIfStepActive(id: string): boolean;
}
