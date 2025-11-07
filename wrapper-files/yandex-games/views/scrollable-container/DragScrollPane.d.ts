import { ScrollPaneConfigVO } from "./ScrollPaneConfigVO";
import { ScrollPane } from "./ScrollPane";
import { ScrollDragHelper } from "./ScrollDragHelper";
export declare class DragScrollPane<DataType extends object = object> extends ScrollPane<DataType> {
    dragHelper: ScrollDragHelper;
    protected construction(config?: Partial<ScrollPaneConfigVO>, ...args: any[]): void;
    destruction(): void;
    protected arrange(): void;
    resetScroll(): void;
}
