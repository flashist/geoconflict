import { AppResizableContainer } from "@flashist/appframework";
import { Container, FContainer, Graphics } from "@flashist/flibs";
export declare class ScrollPane<DataType extends object = object> extends AppResizableContainer<DataType> {
    protected contentCont: FContainer;
    protected contentContMask: Graphics;
    protected construction(...args: any[]): void;
    addContent(child: Container): void;
    protected arrange(): void;
}
