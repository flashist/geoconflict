// Whether the player is on the start screen or away in a lobby / match (task
// 0329, review R1). Main.ts owns the truth (`Client.gameStop`, the same test the
// 0303 restart offer uses); it registers a reader here and reports each return
// to the start screen, so start-screen UI can wait instead of interrupting a
// lobby or match.
//
// Unregistered (unit tests, or before Main.ts initializes) reads as "on the
// start screen", which is exactly the behavior before this module existed.

let isAwayFromStartScreen: () => boolean = () => false;
let backOnStartScreenWaiters: Array<() => void> = [];

/** Main.ts: `() => this.gameStop !== null` — true in a lobby or a match. */
export function setStartScreenPresenceSource(isAway: () => boolean): void {
  isAwayFromStartScreen = isAway;
}

/** Main.ts: the player left a lobby or match and is on the start screen again. */
export function reportBackOnStartScreen(): void {
  const waiters = backOnStartScreenWaiters;
  backOnStartScreenWaiters = [];
  for (const wake of waiters) {
    wake();
  }
}

/**
 * Resolves now when the player is on the start screen, else on the next return
 * to it (leaving a lobby). A match is left by loading the page again
 * (`changeHref`), so after a match starts this may never resolve — and nothing
 * on this page is lost by that.
 */
export async function whenOnStartScreen(): Promise<void> {
  while (isAwayFromStartScreen()) {
    await new Promise<void>((resolve) => {
      backOnStartScreenWaiters.push(resolve);
    });
  }
}

export function resetStartScreenPresenceForTests(): void {
  isAwayFromStartScreen = () => false;
  backOnStartScreenWaiters = [];
}
