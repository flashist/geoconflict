// "Restart game" after a profile read that failed (task 0397, owner ruling Q3,
// 2026-10-06). A sibling of CitizenshipRestartOffer.ts (task 0303): a reload
// that only ever follows the player's own press, decided outside the card so it
// is unit-testable without a browser.
//
// WHY NOT requestGameRestart (GameRestart.ts) — owner ruling, 2026-10-06: its
// events are the LOGIN restart funnel (`Profile:Login:Restart:*`, task 0274),
// it refuses to reload without sessionStorage, and its cross-reload latch would
// make this button look dead after a failed login. This button has its own
// event and needs no latch: it never fires on its own, so no loop is possible.
//
// This widens ruling D3 (2026-09-16, task 0273) by exactly this one button.

import {
  flashist_logEventAnalytics,
  flashistConstants,
} from "./flashist/FlashistFacade";

/**
 * Session marker carrying "the player pressed Restart game" across the reload,
 * so the next load can say "still not working" instead of repeating itself.
 * Read once and removed at once on the next load, so it can never carry further.
 */
export const PROFILE_READ_RESTART_MARKER_KEY =
  "geoconflict.profileReadRestartAttempted";

/** Only the methods used, so a test can pass a plain object. */
type MarkerStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export interface ProfileReadRestartRequest {
  /** False in a lobby, a join being set up, or a match. */
  isOnStartScreen: () => boolean;
  reload: () => void;
  /** `null` (or a storage that throws) only loses the "still not working" text. */
  storage: MarkerStorage | null;
}

/**
 * Reload the page — only on the start screen. Returns true when the page is
 * reloading, false when the press was refused (lobby, join or match): a refused
 * press reloads nothing, logs nothing and writes no marker.
 */
export function restartAfterProfileReadFailure(
  request: ProfileReadRestartRequest,
): boolean {
  if (!request.isOnStartScreen()) {
    return false;
  }
  try {
    request.storage?.setItem(PROFILE_READ_RESTART_MARKER_KEY, "1");
  } catch {
    // Private mode / iframe policy: the reload still happens; only the
    // "still not working" variant is lost.
  }
  // Right before the reload, never on a refused press.
  flashist_logEventAnalytics(
    flashistConstants.analyticEvents.CITIZENSHIP_STATUS_RESTART,
  );
  request.reload();
  return true;
}

// Memoized per page load: the marker is removed on the first read, so later
// reads must still see what that first read found.
let wasRestarted: boolean | null = null;

/**
 * True when this page load follows a press of the Restart game button. Reads the
 * marker once per page and removes it at once. Any storage error reads false.
 */
export function wasRestartedAfterProfileReadFailure(
  storage: MarkerStorage | null,
): boolean {
  if (wasRestarted !== null) {
    return wasRestarted;
  }
  wasRestarted = false;
  try {
    if (storage === null) {
      return wasRestarted;
    }
    const marker = storage.getItem(PROFILE_READ_RESTART_MARKER_KEY);
    if (marker !== null) {
      storage.removeItem(PROFILE_READ_RESTART_MARKER_KEY);
      wasRestarted = true;
    }
  } catch {
    // Unreadable storage: treat as no restart.
  }
  return wasRestarted;
}

export function resetProfileReadRestartForTests(): void {
  wasRestarted = null;
}
