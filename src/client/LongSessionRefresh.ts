// The forced "please refresh the game" popup after 23 hours on one page (task
// 0404). Shown only on the start screen — never in a lobby, a join being set
// up, or a match — and never over a Yandex payment or login dialog. Unlike the
// stale-build popup (BuildVersionChecker.ts, task 0113), which shows at once
// even mid-match, this one waits.
//
// The decision is a pure function and every dependency can be injected, so it
// is unit-tested with a fake clock (the ProfileReadRestart.ts / GameRestart.ts
// pattern). No reload latch is needed: a reload restarts the page age at 0, so
// no loop is possible.

import { PAGE_LOAD_TIMESTAMP } from "./BuildVersionChecker";
import {
  flashist_logEventAnalytics,
  flashistConstants,
} from "./flashist/FlashistFacade";
import {
  isPlatformDialogOpen,
  whenNoPlatformDialogOpen,
} from "./PlatformDialogPresence";
import type { StaleBuildModal } from "./StaleBuildModal";
import { isOnStartScreen, whenOnStartScreen } from "./StartScreenPresence";

/**
 * 23 hours — owner ruling 1, 2026-10-07. One hour under the profile login
 * token's 24 h lifetime (`SESSION_TTL_SECONDS = 86_400` in
 * src/profile-server/SessionToken.ts, which the client cannot import), so a
 * player who obeys the popup never joins a match with an expired token. The
 * page loads before the login, so page age ≥ token age: the safe direction.
 */
export const LONG_SESSION_REFRESH_AFTER_MS = 23 * 60 * 60 * 1000;

// Timers do not run while a laptop sleeps, hence the visibility check as well.
const CHECK_INTERVAL_MS = 60_000;

const MS_PER_MINUTE = 60_000;

export type LongSessionRefreshStep =
  | "not-yet"
  | "wait-until-visible"
  | "wait-for-start-screen"
  | "wait-for-dialog"
  | "show";

export interface LongSessionRefreshInputs {
  pageAgeMs: number;
  isTabVisible: boolean;
  isOnStartScreen: boolean;
  isPlatformDialogOpen: boolean;
}

/** What to do now. Checked in this order; the first that applies wins. */
export function decideLongSessionRefresh(
  inputs: LongSessionRefreshInputs,
): LongSessionRefreshStep {
  if (inputs.pageAgeMs < LONG_SESSION_REFRESH_AFTER_MS) return "not-yet";
  if (!inputs.isTabVisible) return "wait-until-visible";
  if (!inputs.isOnStartScreen) return "wait-for-start-screen";
  if (inputs.isPlatformDialogOpen) return "wait-for-dialog";
  return "show";
}

export interface LongSessionRefreshDeps {
  now: () => number;
  pageLoadedAt: number;
  isTabVisible: () => boolean;
  /** Calls `listener` on every visibility change; returns its remover. */
  addVisibilityListener: (listener: () => void) => () => void;
  setInterval: (callback: () => void, ms: number) => unknown;
  clearInterval: (handle: unknown) => void;
  isOnStartScreen: () => boolean;
  whenOnStartScreen: () => Promise<void>;
  isPlatformDialogOpen: () => boolean;
  whenNoPlatformDialogOpen: () => Promise<void>;
  /** False when nothing was shown (the stale-build popup is already up). */
  showPopup: () => boolean;
  logEvent: (event: string, value?: number) => void;
}

function defaultDeps(): LongSessionRefreshDeps {
  return {
    now: () => Date.now(),
    pageLoadedAt: PAGE_LOAD_TIMESTAMP,
    isTabVisible: () => document.visibilityState === "visible",
    addVisibilityListener: (listener) => {
      document.addEventListener("visibilitychange", listener);
      return () => document.removeEventListener("visibilitychange", listener);
    },
    setInterval: (callback, ms) => setInterval(callback, ms),
    clearInterval: (handle) =>
      clearInterval(handle as ReturnType<typeof setInterval>),
    isOnStartScreen,
    whenOnStartScreen,
    isPlatformDialogOpen,
    whenNoPlatformDialogOpen,
    showPopup: () => {
      const modal = document.querySelector(
        "stale-build-modal",
      ) as StaleBuildModal | null;
      return modal?.showLongSession() ?? false;
    },
    logEvent: (event, value) => flashist_logEventAnalytics(event, value),
  };
}

/**
 * True while the forced long-session popup is up (task 0404 review R1). Main's
 * join handler reads it so no lobby or match can start under the popup — its
 * only exit is a reload, which would end that match.
 */
export function isLongSessionRefreshShowing(
  root: ParentNode = document,
): boolean {
  const modal = root.querySelector(
    "stale-build-modal",
  ) as StaleBuildModal | null;
  return modal?.isShowingLongSession ?? false;
}

/**
 * Start the check: on a timer and whenever the tab becomes visible. Once the
 * threshold has passed with the tab visible it fires once — the timer and the
 * listener are removed — then waits for the start screen and for no open
 * payment/login dialog, and shows the popup.
 */
export function startLongSessionRefreshChecker(
  deps: LongSessionRefreshDeps = defaultDeps(),
): void {
  let isDue = false;
  let intervalHandle: unknown = undefined;
  let removeVisibilityListener: () => void = () => {};

  const check = () => {
    if (isDue) return;
    const step = decideLongSessionRefresh({
      pageAgeMs: deps.now() - deps.pageLoadedAt,
      isTabVisible: deps.isTabVisible(),
      isOnStartScreen: deps.isOnStartScreen(),
      isPlatformDialogOpen: deps.isPlatformDialogOpen(),
    });
    if (step === "not-yet" || step === "wait-until-visible") return;

    // One-shot, the shape of BuildVersionChecker's onStaleBuildDetected.
    isDue = true;
    deps.clearInterval(intervalHandle);
    removeVisibilityListener();
    void showWhenClear(deps).catch(() => {
      // A missing popup element must never break the page
    });
  };

  intervalHandle = deps.setInterval(check, CHECK_INTERVAL_MS);
  removeVisibilityListener = deps.addVisibilityListener(() => {
    if (deps.isTabVisible()) check();
  });
}

async function showWhenClear(deps: LongSessionRefreshDeps): Promise<void> {
  const minutesSince = (startMs: number) =>
    Math.floor((deps.now() - startMs) / MS_PER_MINUTE);

  const dueAt = deps.now();
  deps.logEvent(
    flashistConstants.analyticEvents.LONG_SESSION_REFRESH_DUE,
    minutesSince(deps.pageLoadedAt),
  );

  let hasWaited = false;
  let hasLoggedDialogDeferral = false;
  // Re-check both after every wait: the player may have started a join while a
  // dialog was closing. Visibility is not gated here — every wait ends on a
  // player action, so the tab is visible.
  for (;;) {
    const step = decideLongSessionRefresh({
      pageAgeMs: deps.now() - deps.pageLoadedAt,
      isTabVisible: true,
      isOnStartScreen: deps.isOnStartScreen(),
      isPlatformDialogOpen: deps.isPlatformDialogOpen(),
    });
    if (step === "wait-for-start-screen") {
      hasWaited = true;
      await deps.whenOnStartScreen();
    } else if (step === "wait-for-dialog") {
      hasWaited = true;
      if (!hasLoggedDialogDeferral) {
        hasLoggedDialogDeferral = true;
        deps.logEvent(
          flashistConstants.analyticEvents
            .LONG_SESSION_REFRESH_DEFERRED_BY_DIALOG,
        );
      }
      await deps.whenNoPlatformDialogOpen();
    } else {
      break;
    }
  }

  if (!deps.showPopup()) {
    // The stale-build popup is already up: one popup, the stronger message.
    deps.logEvent(
      flashistConstants.analyticEvents
        .LONG_SESSION_REFRESH_PREEMPTED_BY_STALE_BUILD,
    );
    return;
  }
  deps.logEvent(
    flashistConstants.analyticEvents.LONG_SESSION_REFRESH_SHOWN,
    minutesSince(deps.pageLoadedAt),
  );
  if (hasWaited) {
    deps.logEvent(
      flashistConstants.analyticEvents.LONG_SESSION_REFRESH_WAITED,
      minutesSince(dueAt),
    );
  }
}
