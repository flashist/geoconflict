import { AppMainContainer } from "@flashist/appframework/app/views/AppMainContainer";
import { Graphics } from "@flashist/flibs";
import * as PIXI from "pixi.js";
export declare class GameAppMainContainer extends AppMainContainer {
    protected testTutorialView: Graphics;
    protected resizeSizeArea: Graphics;
    protected patternBg: PIXI.TilingSprite;
    protected construction(...args: any[]): void;
    protected arrange(): void;
}
