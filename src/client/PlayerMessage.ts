// The one-player message popup (task 0507). The Yandex flag
// `player_message_targets` lists player names, comma-separated; a player whose
// current name is on it sees the popup once per page load, on the start screen
// and never over a Yandex payment or login dialog (the 0404 long-session
// popup's timing). Clearing the flag switches it off from the next page load.
//
// Pure functions plus injectable dependencies, so it is unit-tested without a
// browser (the LongSessionRefresh.ts pattern).

import {
  flashist_logEventAnalytics,
  flashistConstants,
  FlashistFacade,
} from "./flashist/FlashistFacade";
import {
  isPlatformDialogOpen,
  whenNoPlatformDialogOpen,
} from "./PlatformDialogPresence";
import type { PlayerMessageModal } from "./PlayerMessageModal";
import { isOnStartScreen, whenOnStartScreen } from "./StartScreenPresence";
import type { UsernameInput } from "./UsernameInput";

/** Names from the flag value: split on commas, trimmed, empties dropped. */
export function parsePlayerMessageTargets(raw: unknown): string[] {
  if (typeof raw !== "string") return [];
  return raw
    .split(",")
    .map((name) => name.trim())
    .filter((name) => name !== "");
}

/** Exact and case-sensitive: a namesake differing only in case is not shown. */
export function isPlayerMessageTarget(
  name: string,
  targets: readonly string[],
): boolean {
  return targets.includes(name.trim());
}

export interface PlayerMessageDeps {
  readTargetsFlag: () => Promise<unknown>;
  getCurrentUsername: () => string;
  /** Calls `listener` on every username change; returns its remover. */
  addUsernameChangeListener: (listener: () => void) => () => void;
  isOnStartScreen: () => boolean;
  whenOnStartScreen: () => Promise<void>;
  isPlatformDialogOpen: () => boolean;
  whenNoPlatformDialogOpen: () => Promise<void>;
  /** False when nothing was shown (the popup element is missing). */
  showPopup: () => boolean;
  logEvent: (event: string) => void;
}

function defaultDeps(): PlayerMessageDeps {
  return {
    readTargetsFlag: () =>
      FlashistFacade.instance.getPlayerMessageTargetsFlagValue(),
    getCurrentUsername: () =>
      (
        document.querySelector("username-input") as UsernameInput | null
      )?.getCurrentUsername() ?? "",
    addUsernameChangeListener: (listener) => {
      document.addEventListener("username-change", listener);
      return () => document.removeEventListener("username-change", listener);
    },
    isOnStartScreen,
    whenOnStartScreen,
    isPlatformDialogOpen,
    whenNoPlatformDialogOpen,
    showPopup: () => {
      const modal = document.querySelector(
        "player-message-modal",
      ) as PlayerMessageModal | null;
      if (!modal) return false;
      modal.show();
      return true;
    },
    logEvent: (event) => flashist_logEventAnalytics(event),
  };
}

/**
 * Reads the target list once. With none, it stops: no listener, no timer.
 * Otherwise it checks the current name now and on every username change —
 * the stored or approved name can arrive after start — until the first match,
 * then waits for a clear start screen and shows the popup once.
 */
export async function startPlayerMessage(
  deps: PlayerMessageDeps = defaultDeps(),
): Promise<void> {
  try {
    const targets = parsePlayerMessageTargets(await deps.readTargetsFlag());
    if (targets.length === 0) return;

    let hasMatched = false;
    let removeListener: () => void = () => {};
    const check = () => {
      if (hasMatched) return;
      if (!isPlayerMessageTarget(deps.getCurrentUsername(), targets)) return;
      hasMatched = true;
      removeListener();
      void showWhenClear(deps).catch(() => {
        // A missing popup element must never break the page
      });
    };
    removeListener = deps.addUsernameChangeListener(check);
    check();
  } catch {
    // A flag or DOM failure must never break the page; the popup stays off
  }
}

async function showWhenClear(deps: PlayerMessageDeps): Promise<void> {
  // Re-check both after every wait: a dialog may open as a join ends.
  for (;;) {
    if (!deps.isOnStartScreen()) {
      await deps.whenOnStartScreen();
    } else if (deps.isPlatformDialogOpen()) {
      await deps.whenNoPlatformDialogOpen();
    } else {
      break;
    }
  }
  if (!deps.showPopup()) return;
  deps.logEvent(flashistConstants.analyticEvents.PLAYER_MESSAGE_SHOWN);
}
