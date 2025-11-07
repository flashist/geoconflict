import { BasePageView } from "@flashist/appframework/pages/views/BasePageView";
import { ViewLazyCreationServiceLocatorStack } from "@flashist/appframework";
import { GameScreenId } from "./GameScreenId";
export declare class GamePageView extends BasePageView {
    protected screenViewStack: ViewLazyCreationServiceLocatorStack;
    protected construction(...args: any[]): void;
    destruction(): void;
    protected arrange(): void;
    changeScreen(screenId: GameScreenId): void;
}
