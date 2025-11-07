import { DragHelper } from "@flashist/flibs";
import { IScrollDragHelperConfigVO } from "./IScrollDragHelperConfigVO";
export declare class ScrollDragHelper extends DragHelper {
    config: IScrollDragHelperConfigVO;
    constructor(config?: Partial<IScrollDragHelperConfigVO>);
    protected updateDrag(): void;
}
