import { EventListenerHelper } from "@flashist/fcore";
export declare class SelectFilesTools {
    static cachedInput: HTMLInputElement;
    static _eventListenerHelper: EventListenerHelper;
    static get eventListenerHelper(): EventListenerHelper;
    static selectFile(contentType: string, multiple: boolean): Promise<ArrayBuffer | ArrayBuffer[]>;
}
