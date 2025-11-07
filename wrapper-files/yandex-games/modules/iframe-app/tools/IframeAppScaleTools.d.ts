import { Align, VAlign } from "@flashist/flibs";
export declare class IframeAppScaleTools {
    scaleIframe(iframe: HTMLIFrameElement, config: IIframeAppScaleConfig): void;
}
export interface IIframeAppScaleConfig {
    type: IframeAppScaleType;
    fitType?: IframeAppScaleFitType;
    targetSizeMin: {
        width: number;
        height: number;
    };
    targetSizeMax: {
        width: number;
        height: number;
    };
    align?: Align;
    valign?: VAlign;
}
export declare enum IframeAppScaleType {
    FILL = "fill",
    FIT = "fit",
    LOCK_WIDTH = "lockWidth",
    LOCK_HEIGHT = "lockHeight"
}
export declare enum IframeAppScaleFitType {
    SCALE_DOWN = "scaleDown",
    SCALE_DOWN_AND_STRETCH_THE_OTHER_SIDE = "scaleDownAndStretchTheOtherSide"
}
