// Task 0451. A test helper, not a test.
//
// The private-lobby event names, for FlashistFacade mocks in suites that cannot
// load the real facade (it pulls in the SDK and telemetry). Kept honest by
// tests/client/PrivateLobbyAnalyticsNames.test.ts, which checks this map equals
// the real registry's PRIVATE_LOBBY_* entries.
export const PRIVATE_LOBBY_EVENTS = {
  PRIVATE_LOBBY_CREATED: "PrivateLobby:Created",
  PRIVATE_LOBBY_CREATE_FAILED: "PrivateLobby:CreateFailed",
  PRIVATE_LOBBY_INVITE_COPIED_LINK: "PrivateLobby:InviteCopied:Link",
  PRIVATE_LOBBY_INVITE_COPIED_CODE: "PrivateLobby:InviteCopied:Code",
  PRIVATE_LOBBY_INVITE_COPY_FAILED: "PrivateLobby:InviteCopyFailed",
  PRIVATE_LOBBY_START_TAPPED: "PrivateLobby:Start:Tapped",
  PRIVATE_LOBBY_START_FAILED: "PrivateLobby:Start:Failed",
  PRIVATE_LOBBY_MATCH_STARTED_HOST: "PrivateLobby:MatchStarted:Host",
  PRIVATE_LOBBY_MATCH_STARTED_GUEST: "PrivateLobby:MatchStarted:Guest",
  PRIVATE_LOBBY_MATCH_ENDED: "PrivateLobby:MatchEnded",
  PRIVATE_LOBBY_LEFT_HOST: "PrivateLobby:Left:Host",
  PRIVATE_LOBBY_LEFT_GUEST: "PrivateLobby:Left:Guest",
  PRIVATE_LOBBY_JOINED_LINK: "PrivateLobby:Joined:Link",
  PRIVATE_LOBBY_JOINED_CODE: "PrivateLobby:Joined:Code",
  PRIVATE_LOBBY_JOIN_FAILED_NOT_FOUND: "PrivateLobby:JoinFailed:NotFound",
  PRIVATE_LOBBY_JOIN_FAILED_ERROR: "PrivateLobby:JoinFailed:Error",
} as const;
