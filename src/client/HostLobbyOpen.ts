// Task 0333: Create is tapped from the start screen. A player still holding a
// lobby connection (a public lobby) leaves it for real here — clearing only the
// card highlight left the connection live whenever the private lobby was never
// joined (window closed before create answered, or create failed). Lives
// outside Main.ts so the order of steps is unit-testable without a browser.
export interface HostLobbyOpenDependencies {
  /** Main: `gameStop !== null`. */
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
  // Still cleared when no connection is held yet (a public join still awaiting
  // its setup — 0228's window); idempotent after leaveLobby().
  deps.clearPublicLobbyHighlight();
  deps.openHostModal();
}
