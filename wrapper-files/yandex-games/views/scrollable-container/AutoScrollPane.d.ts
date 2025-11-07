import { ScrollPaneConfigVO } from "./ScrollPaneConfigVO";
import { ScrollPane } from "./ScrollPane";
export declare class AutoScrollPane<DataType extends object = object> extends ScrollPane<DataType> {
    protected config: ScrollPaneConfigVO;
    constructor(config?: Partial<ScrollPaneConfigVO>);
    protected construction(config?: Partial<ScrollPaneConfigVO>, ...args: any[]): void;
    protected arrange(): void;
    destruction(): void;
    protected startScroll(): void;
    protected stopScroll(): void;
}
