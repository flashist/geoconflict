import {
  flashist_logEventAnalytics,
  flashistConstants,
} from "./flashist/FlashistFacade";

// Task 0451: the private-lobby usage funnel. Every bucket maps to its event
// through a fixed table — no name is ever built from a string — so no lobby
// code, link or id can reach GameAnalytics. Values are numbers only (an HTTP
// status, match seconds).

export type PrivateLobbyRole = "Host" | "Guest";
export type PrivateLobbyInviteKind = "Link" | "Code";
export type PrivateLobbyJoinFailure = "NotFound" | "Error";

type AnalyticEventKey = keyof typeof flashistConstants.analyticEvents;

// Enum KEYS, read at call time, so a mocked registry in a test still resolves.
const INVITE_COPIED_EVENTS: Record<PrivateLobbyInviteKind, AnalyticEventKey> = {
  Link: "PRIVATE_LOBBY_INVITE_COPIED_LINK",
  Code: "PRIVATE_LOBBY_INVITE_COPIED_CODE",
};

const JOINED_EVENTS: Record<PrivateLobbyInviteKind, AnalyticEventKey> = {
  Link: "PRIVATE_LOBBY_JOINED_LINK",
  Code: "PRIVATE_LOBBY_JOINED_CODE",
};

const JOIN_FAILED_EVENTS: Record<PrivateLobbyJoinFailure, AnalyticEventKey> = {
  NotFound: "PRIVATE_LOBBY_JOIN_FAILED_NOT_FOUND",
  Error: "PRIVATE_LOBBY_JOIN_FAILED_ERROR",
};

const LEFT_EVENTS: Record<PrivateLobbyRole, AnalyticEventKey> = {
  Host: "PRIVATE_LOBBY_LEFT_HOST",
  Guest: "PRIVATE_LOBBY_LEFT_GUEST",
};

const MATCH_STARTED_EVENTS: Record<PrivateLobbyRole, AnalyticEventKey> = {
  Host: "PRIVATE_LOBBY_MATCH_STARTED_HOST",
  Guest: "PRIVATE_LOBBY_MATCH_STARTED_GUEST",
};

function logEvent(key: AnalyticEventKey, value?: number): void {
  const event = flashistConstants.analyticEvents[key];
  if (value === undefined) {
    flashist_logEventAnalytics(event);
  } else {
    flashist_logEventAnalytics(event, value);
  }
}

// The clientID the host window last created a lobby with. Overwritten by each
// create; the page reloads after a match, so one is enough. Never sent anywhere.
let hostClientID: string | null = null;

export function rememberPrivateLobbyHostClientID(clientID: string): void {
  hostClientID = clientID;
}

/** Host when this client created the lobby in the host window, else Guest. */
export function privateLobbyRole(clientID: string): PrivateLobbyRole {
  return hostClientID !== null && clientID === hostClientID ? "Host" : "Guest";
}

export function resetPrivateLobbyAnalyticsForTests(): void {
  hostClientID = null;
}

export function logPrivateLobbyCreated(): void {
  logEvent("PRIVATE_LOBBY_CREATED");
}

export function logPrivateLobbyCreateFailed(): void {
  logEvent("PRIVATE_LOBBY_CREATE_FAILED");
}

export function logPrivateLobbyInviteCopied(
  kind: PrivateLobbyInviteKind,
): void {
  logEvent(INVITE_COPIED_EVENTS[kind]);
}

export function logPrivateLobbyInviteCopyFailed(): void {
  logEvent("PRIVATE_LOBBY_INVITE_COPY_FAILED");
}

export function logPrivateLobbyStartTapped(): void {
  logEvent("PRIVATE_LOBBY_START_TAPPED");
}

/** `status` is the failed response's HTTP status, or 0 when a request threw. */
export function logPrivateLobbyStartFailed(status: number): void {
  logEvent("PRIVATE_LOBBY_START_FAILED", status);
}

export function logPrivateLobbyJoined(via: PrivateLobbyInviteKind): void {
  logEvent(JOINED_EVENTS[via]);
}

export function logPrivateLobbyJoinFailed(
  reason: PrivateLobbyJoinFailure,
): void {
  logEvent(JOIN_FAILED_EVENTS[reason]);
}

export function logPrivateLobbyLeft(role: PrivateLobbyRole): void {
  logEvent(LEFT_EVENTS[role]);
}

export function logPrivateLobbyMatchStarted(role: PrivateLobbyRole): void {
  logEvent(MATCH_STARTED_EVENTS[role]);
}

/** `durationSeconds` is the same number Match:Duration gets. */
export function logPrivateLobbyMatchEnded(durationSeconds: number): void {
  logEvent("PRIVATE_LOBBY_MATCH_ENDED", durationSeconds);
}
