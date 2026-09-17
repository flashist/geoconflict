// Full-restart-after-login (task 0273, S4; owner ruling D3, 2026-09-16). Lives
// outside the citizenship card, like CitizenshipPurchase.ts / NameChangeRequest.ts,
// so the decision ("reload? suppress? why?") is unit-testable without a browser.
//
// WHY a page load and not a re-run of Bootstrap: `initializeImmediate` /
// `initializePlatform` are one-shot (memoized deferreds, latched analytics, a
// one-shot init gate, custom elements already registered). Making them re-entrant
// is a rewrite of the init architecture; a fresh document gives the owner's stated
// goal — "to be sure the start sequence is done the right way" — for free. A reload
// is also the established answer elsewhere: Bootstrap.ts's pre-gate recovery,
// StaleBuildModal's REFRESH, and the post-match navigation.
//
// This can only ever run from the player's OWN press of the card's login button,
// after the Yandex auth dialog reported success. It never fires on its own.

import {
  flashist_logEventAnalytics,
  flashistConstants,
} from "./flashist/FlashistFacade";

/**
 * sessionStorage latch capping the automatic reload at ONE per page load —
 * mirrors Bootstrap.ts's `geoconflict.bootstrapReloadAttempted`. Cleared by
 * ProfileSession once a login succeeds, so a later in-page login can restart again.
 */
export const PROFILE_LOGIN_RESTART_LATCH_KEY =
  "geoconflict.profileLoginRestartAttempted";

/** Only the two methods used, so a test can pass a plain object. */
type LatchStorage = Pick<Storage, "getItem" | "setItem">;

export interface GameRestartRequest {
  /** True while a match is running (`Client.gameStop !== null`). */
  matchActive: boolean;
  reload: () => void;
  /**
   * Where the latch lives. `null` (or a storage that throws) means the cap cannot
   * be enforced, so no reload happens at all — see the comment on the catch.
   */
  storage: LatchStorage | null;
  /** What to do instead of reloading: today the card's own profile re-read. */
  fallback: () => void;
}

/**
 * Restart the page so the whole start sequence re-runs with the player logged in —
 * unless a match is live or this page load already did it once.
 *
 * Order is load-bearing: the match guard runs FIRST, so a tap during a match costs
 * no latch and the player can still restart from the start screen afterwards.
 */
export function requestGameRestart({
  matchActive,
  reload,
  storage,
  fallback,
}: GameRestartRequest): void {
  if (matchActive) {
    // A live match is never interrupted. The card is not reachable during one
    // (a fixed, full-viewport canvas covers it), but that rests on CSS stacking,
    // so this guard does not depend on it.
    report(
      flashistConstants.analyticEvents
        .PROFILE_LOGIN_RESTART_SUPPRESSED_IN_MATCH,
    );
    runFallback(fallback);
    return;
  }

  if (storage === null) {
    reportNoStorage(fallback);
    return;
  }
  try {
    if (storage.getItem(PROFILE_LOGIN_RESTART_LATCH_KEY) !== null) {
      report(
        flashistConstants.analyticEvents
          .PROFILE_LOGIN_RESTART_SUPPRESSED_LATCHED,
      );
      runFallback(fallback);
      return;
    }
    storage.setItem(PROFILE_LOGIN_RESTART_LATCH_KEY, "1");
  } catch {
    // Private mode / iframe storage policy: with no latch the "at most once" cap
    // cannot hold, and an unbounded reload loop is far worse than no restart. So
    // degrade to the fallback — same posture as Bootstrap.ts:83-90.
    reportNoStorage(fallback);
    return;
  }

  report(flashistConstants.analyticEvents.PROFILE_LOGIN_RESTART_PERFORMED);
  reload();
}

/**
 * The storage-less outcome, shared by a null storage and one that throws.
 *
 * ⚠️ Owner-approved deviation from plan §3.6 (2026-09-16, review round 1 R4):
 * the plan names FIVE restart events, and this is a sixth. Without it a
 * `Restart:Requested` on these two paths has no outcome event at all, which
 * 0274's monitoring could not explain — and the population it would hide
 * (private mode / iframe storage policy) is exactly the one worth seeing.
 */
function reportNoStorage(fallback: () => void): void {
  report(
    flashistConstants.analyticEvents
      .PROFILE_LOGIN_RESTART_SUPPRESSED_NO_STORAGE,
  );
  runFallback(fallback);
}

function report(event: string): void {
  flashist_logEventAnalytics(event);
}

/** A broken fallback must not take the click handler down with it. */
function runFallback(fallback: () => void): void {
  try {
    fallback();
  } catch {
    // Nothing useful to do — the player can still tap again.
  }
}
