// Task 0333: Create is tapped from the start screen. A player still holding a
// lobby connection (a public lobby) leaves it for real here — clearing only the
// card highlight left the connection live whenever the private lobby was never
// joined (window closed before create answered, or create failed). Lives
// outside Main.ts so the order of steps is unit-testable without a browser.
export interface HostLobbyOpenDependencies {
  /** Main: in a lobby, or a join still being set up (task 0228). */
  isInLobby: () => boolean;
  /** Main.handleLeaveLobby: stops the connection and resets the start screen. */
  leaveLobby: () => void;
  /** PublicLobby.leaveLobby(): the card highlight only. */
  clearPublicLobbyHighlight: () => void;
  openHostModal: () => void;
}

export function openHostLobbyFromStartScreen(
  deps: HostLobbyOpenDependencies,
): void {
  // Leave before opening, so no create request is sent while the public
  // connection is live.
  if (deps.isInLobby()) {
    deps.leaveLobby();
  }
  // Still cleared when nothing was left; idempotent after leaveLobby(). Since
  // task 0228 a public join still being set up counts as in the lobby, and the
  // leave cancels it.
  deps.clearPublicLobbyHighlight();
  deps.openHostModal();
}
