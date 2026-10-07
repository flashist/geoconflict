// Whether a Yandex payment or login dialog is in progress (task 0404). The
// "please refresh" popup is forced and covers the whole screen, so it waits
// while one is open: cutting off a payment is worse than a late popup.
//
// Deliberately separate from StartScreenPresence: folding dialogs into
// isOnStartScreen() would change what CitizenshipCard, ProfileReadRestart and
// CitizenshipRestartOffer see.
//
// Marked by runCitizenshipPurchase() (intent → payment frame → server
// /complete) and FlashistFacade.openYandexAuthDialog().

let dialogsOpen = 0;
let noDialogOpenWaiters: Array<() => void> = [];

/**
 * A payment or login dialog has started. Call the returned function once it
 * has finished, on every path; calling it more than once is safe. Waiters are
 * woken when the last open dialog ends.
 */
export function beginPlatformDialog(): () => void {
  dialogsOpen++;
  let ended = false;
  return () => {
    if (ended) {
      return;
    }
    ended = true;
    dialogsOpen--;
    if (dialogsOpen === 0) {
      const waiters = noDialogOpenWaiters;
      noDialogOpenWaiters = [];
      for (const wake of waiters) {
        wake();
      }
    }
  };
}

export function isPlatformDialogOpen(): boolean {
  return dialogsOpen > 0;
}

/** Resolves now when no dialog is open, else when the last open one ends. */
export async function whenNoPlatformDialogOpen(): Promise<void> {
  while (isPlatformDialogOpen()) {
    await new Promise<void>((resolve) => {
      noDialogOpenWaiters.push(resolve);
    });
  }
}

export function resetPlatformDialogPresenceForTests(): void {
  dialogsOpen = 0;
  noDialogOpenWaiters = [];
}
