// The windows closed when a match is about to start (Main.ts's `onPrestart`).
// Lives outside Main.ts so the list can be unit-tested without a browser
// (task 0336, the same idiom as 0333's HostLobbyOpen.ts).
export const PRE_START_MODAL_TAGS: readonly string[] = [
  "single-player-modal",
  "host-lobby-modal",
  "join-private-lobby-modal",
  "game-starting-modal",
  "game-top-bar",
  "help-modal",
  "user-setting",
  "territory-patterns-modal",
  "language-modal",
  "news-modal",
  "flag-input-modal",
  "account-button",
  "token-login",
  "matchmaking-modal",
  "citizenship-restart-modal",
  // Task 0336: the tenure gift popup never stays over a match.
  "tenure-grant-modal",
  // Task 0301: nor does the citizenship explainer.
  "citizenship-explainer-modal",
];

export function closePreStartModals(): void {
  PRE_START_MODAL_TAGS.forEach((tag) => {
    const modal = document.querySelector(tag) as HTMLElement & {
      close?: () => void;
      isModalOpen?: boolean;
    };
    if (modal?.close) {
      modal.close();
    } else if (modal && "isModalOpen" in modal) {
      modal.isModalOpen = false;
    }
  });
}
