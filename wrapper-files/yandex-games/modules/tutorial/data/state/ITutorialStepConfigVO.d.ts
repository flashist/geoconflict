import { Align, VAlign } from "@flashist/flibs";
import { TextStyleAlign } from "pixi.js";
export interface ITutorialStepConfigVO {
    id: string;
    viewId: string;
    completeSaveStepId?: string;
    textId?: string;
    requiredCompleteStepIds?: string[];
    blocking?: boolean;
    blockingHole?: boolean;
    align?: Align;
    valign?: VAlign;
    labelAlign?: TextStyleAlign;
    labelValign?: VAlign;
    minTimeToDisplayMs?: number;
    completeByStageDown?: boolean;
    globalEventToComplete?: string;
    startAnalyticsEvent?: string;
    completeAnalyticsEvent?: string;
}
