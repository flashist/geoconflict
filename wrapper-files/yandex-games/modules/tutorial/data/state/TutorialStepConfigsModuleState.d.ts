import { ITutorialStepConfigVO } from "./ITutorialStepConfigVO";
export declare const TutorialStepConfigsModuleInitialState: {
    tutorialStepConfigs: {
        configs: Record<string, ITutorialStepConfigVO>;
    };
};
export type TutorialStepConfigsModuleState = typeof TutorialStepConfigsModuleInitialState;
