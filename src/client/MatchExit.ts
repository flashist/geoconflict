import { ExitConfirmModal } from "./ExitConfirmModal";
import { FlashistFacade } from "./flashist/FlashistFacade";
import { clearReconnectSession } from "./ReconnectSession";

/**
 * Leaving a match from the in-match exit buttons (task 0437): the sidebar's
 * and the settings window's exit both ask first, then behave the same.
 */

/** Ad → clear the reconnect session → back to the start screen. */
export async function leaveMatch(): Promise<void> {
  // Flashist Adaptation: interstitial
  await FlashistFacade.instance.showInterstitial();

  clearReconnectSession();

  // Flashist Adaptation
  // window.location.href = "/";
  FlashistFacade.instance.changeHref(FlashistFacade.instance.rootPathname);
}

/**
 * Opens the exit question; Leave runs leaveMatch() (once — the popup guards
 * it). A missing popup is a template bug: leave at once, as before task 0437,
 * rather than leave the player with an exit button that does nothing.
 */
export function askToLeaveMatch(): void {
  const modal = document.querySelector("exit-confirm-modal");
  if (!(modal instanceof ExitConfirmModal)) {
    console.error("exit-confirm-modal not found, leaving without asking");
    void leaveMatch();
    return;
  }
  modal.show(() => void leaveMatch());
}
