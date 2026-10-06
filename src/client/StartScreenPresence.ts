// Whether the player is on the start screen or away in a lobby / match (task
// 0329, review R1). Main.ts owns the truth (`Client.gameStop`, the same test the
// 0303 restart offer uses); it registers a reader here and reports each return
// to the start screen, so start-screen UI can wait instead of interrupting a
// lobby or match.
//
// Task 0336: a join also counts as away from its first line. Main.ts awaits
// server config, cosmetics and the Yandex id before it sets `gameStop`, so it
// marks the join here (beginJoiningLobby) for that window too — and so do the
// host window while it creates the private lobby and the join window while it
// looks the lobby up.
//
// Unregistered (unit tests, or before Main.ts initializes) reads as "on the
// start screen", which is exactly the behavior before this module existed.

let isAwayFromStartScreen: () => boolean = () => false;
let backOnStartScreenWaiters: Array<() => void> = [];
let joinsBeingSetUp = 0;

const isAwayOrJoining = () => joinsBeingSetUp > 0 || isAwayFromStartScreen();

/** Main.ts: `() => this.gameStop !== null` — true in a lobby or a match. */
export function setStartScreenPresenceSource(isAway: () => boolean): void {
  isAwayFromStartScreen = isAway;
}

/**
 * True on the start screen: not in a lobby or match, and no join being set up
 * (task 0397 — the read-failed Restart game button never interrupts any of them).
 */
export function isOnStartScreen(): boolean {
  return !isAwayOrJoining();
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
 * A join has started but Main has not set gameStop yet (task 0336). Counts as
 * away. Call the returned function once the join has set up or given up; if the
 * player is then on the start screen (the join failed), waiters are woken.
 */
export function beginJoiningLobby(): () => void {
  joinsBeingSetUp++;
  let ended = false;
  return () => {
    if (ended) {
      return;
    }
    ended = true;
    joinsBeingSetUp--;
    if (!isAwayOrJoining()) {
      reportBackOnStartScreen();
    }
  };
}

/**
 * Resolves now when the player is on the start screen, else on the next return
 * to it (leaving a lobby, or a join that failed before it got there). A match is
 * usually left by loading the page again (`changeHref`), so after a match starts
 * this may never resolve; an in-page Back/hash leave does not reload, and
 * resolves it like any other leave.
 */
export async function whenOnStartScreen(): Promise<void> {
  while (isAwayOrJoining()) {
    await new Promise<void>((resolve) => {
      backOnStartScreenWaiters.push(resolve);
    });
  }
}

export function resetStartScreenPresenceForTests(): void {
  isAwayFromStartScreen = () => false;
  backOnStartScreenWaiters = [];
  joinsBeingSetUp = 0;
}
