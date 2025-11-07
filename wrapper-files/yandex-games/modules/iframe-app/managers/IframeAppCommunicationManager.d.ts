import { BaseAppManager } from "@flashist/appframework";
import { ProgressionEventStatus } from "../../analytics/abstract/ProgressionEventStatus";
export declare class IframeAppCommunicationManager extends BaseAppManager {
    protected messageIdToCallbackMap: {
        [messageId: string]: IIframeAppCommunicationMessageCallback;
    };
    protected addListeners(): void;
    sendMessageToIframe(messageId: string, data?: any): void;
    addMessageCallback(messageId: string, callback: IIframeAppCommunicationMessageCallback): void;
    removeMessageCallback(messageId: string): void;
}
export interface IIframeAppCommunicationMessageVO<DataType extends any = null> {
    messageId: string;
    data?: DataType;
}
export interface IIframeAppCommunicationMessageProgressData {
    progress: number;
    total: number;
    loadGroup?: string;
}
export interface IIframeAppCommunicationMessageAnalyticsData {
    analyticEventId: string;
    value?: number;
}
export interface IIframeAppCommunicationMessageProgressionAnalyticsData {
    status: ProgressionEventStatus;
    id1: string;
    id2?: string;
    id3?: string;
}
export interface IIframeAppCommunicationMessageErrorAnalyticsData {
    severity: IframeAppCommunicationMessageErrorSeverity;
    message: string;
}
export declare enum IframeAppCommunicationMessageErrorSeverity {
    INFO = "Info",
    DEBUG = "Debug",
    WARNING = "Warning",
    ERROR = "Error",
    CRITICAL = "Critical"
}
export interface IIframeAppCommunicationMessageCallback {
    (messageData: IIframeAppCommunicationMessageVO): any;
}
export interface IWaitApproveMessageDataType {
    approveId: string;
    isMidLevel?: boolean;
}
export interface ISetTotalScoreMessageDataType {
    score: number;
}
export interface IIapDataType {
    iapId: string;
}
export interface IIapConsumeDataType {
    consumeToken: string;
}
