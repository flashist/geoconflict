export declare const TutorialModuleInitialState: {
    tutorial: {
        activeStepIds: string[];
        completeStepIds: string[];
    };
};
export interface TutorialModuleSaveState {
    tutorial: {
        completeStepIds: string[];
    };
}
export type TutorialModuleState = typeof TutorialModuleInitialState & TutorialModuleSaveState;
