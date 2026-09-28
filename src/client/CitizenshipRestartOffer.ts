// "Restart to apply" offer after a mid-session citizenship grant (task 0303,
// owner ruling 2026-09-28: option B). Lives outside the modal and Main.ts, like
// GameRestart.ts, so the decision ("show now? later? never? reload?") is
// unit-testable without a browser.
//
// WHY a restart: much of the start screen reads citizenship once, at load (the
// bell dot, the ★ lookup, perks to come). A fresh page load catches all of them
// up at once. The card and the private-lobby lock already update live, which is
// what a player who taps "Later" keeps.
//
// WHY NOT requestGameRestart (GameRestart.ts): its events are the LOGIN restart
// funnel, and it refuses to reload without sessionStorage. Its latch stops an
// AUTOMATIC reload loop; this reload only ever follows the player's own tap, and
// the offer cannot recur after it (a purchase grant does not repeat, and
// session-start reconciliation never fires this signal).

import {
  flashist_logEventAnalytics,
  flashistConstants,
} from "./flashist/FlashistFacade";

/**
 * Fired on `window` when the player became a citizen during this page load:
 * a server-confirmed purchase, or the tenure gift that crossed the threshold.
 * NOT fired by session-start reconciliation (decided in the 0303 plan).
 */
export const CITIZENSHIP_GRANTED_MID_SESSION_EVENT =
  "geoconflict-citizenship-granted-mid-session";

export type CitizenshipGrantSource = "purchase" | "tenure";

export interface CitizenshipGrantedMidSessionDetail {
  source: CitizenshipGrantSource;
}

export function dispatchCitizenshipGrantedMidSession(
  source: CitizenshipGrantSource,
): void {
  window.dispatchEvent(
    new CustomEvent<CitizenshipGrantedMidSessionDetail>(
      CITIZENSHIP_GRANTED_MID_SESSION_EVENT,
      { detail: { source } },
    ),
  );
}

export interface CitizenshipRestartOfferDeps {
  /** True in a lobby or a match (`Client.gameStop !== null`). */
  isAwayFromStartScreen: () => boolean;
  /** The citizenship kill switch (task 0236). */
  isSurfacesEnabled: () => Promise<boolean>;
  showPrompt: () => void;
  reload: () => void;
}

export interface CitizenshipRestartOffer {
  onGranted: () => Promise<void>;
  onBackOnStartScreen: () => void;
  onMatchStarting: () => void;
  /**
   * Returns true when the page is reloading, false when it was refused (away
   * from the start screen) — a refusal re-arms the offer as pending.
   */
  restart: () => boolean;
}

export function createCitizenshipRestartOffer(
  deps: CitizenshipRestartOfferDeps,
): CitizenshipRestartOffer {
  // In memory on purpose: at most once per page load, and a reload resets it.
  let shown = false;
  let pending = false;

  const showOnce = (): void => {
    if (shown) {
      return;
    }
    shown = true;
    deps.showPrompt();
  };

  return {
    async onGranted(): Promise<void> {
      if (shown) {
        return;
      }
      if (!(await deps.isSurfacesEnabled())) {
        return;
      }
      if (deps.isAwayFromStartScreen()) {
        // Shown when the player is back on the start screen, unless a match
        // starts first — the page reloads after a match anyway.
        pending = true;
        return;
      }
      showOnce();
    },

    onBackOnStartScreen(): void {
      if (!pending) {
        return;
      }
      pending = false;
      // Not showOnce(): pending is set only before the first show, or by a
      // refused restart() re-arming the offer — which must show again.
      shown = true;
      deps.showPrompt();
    },

    onMatchStarting(): void {
      pending = false;
    },

    restart(): boolean {
      if (deps.isAwayFromStartScreen()) {
        // A lobby or match is never interrupted. Reachable when the grant
        // landed while a join from the start screen was still awaiting its
        // setup (handleJoinLobby sets gameStop only after that), so the popup
        // showed just as the player entered the lobby (review R3). Keep the
        // offer waiting for the start screen instead of losing it; a match
        // starting still drops it.
        pending = true;
        return false;
      }
      flashist_logEventAnalytics(
        flashistConstants.analyticEvents.CITIZENSHIP_RESTART_PROMPT_RESTART,
      );
      deps.reload();
      return true;
    },
  };
}
