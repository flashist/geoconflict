// Session-start purchase reconciliation (task 0019) — required for Yandex
// moderation compliance: purchases whose /complete never landed (closed tab,
// dropped network, failed consume) are re-granted idempotently by the server
// and consumed here so they stop reappearing in getPurchases().
//
// Scheduled by FlashistFacade once the payments catalog reaches 'ready' (via
// dynamic import — see fetchPaymentsCatalog); waits for the game-init gate so
// it never competes with boot. Best-effort end to end: every failure is
// swallowed and simply retried on the next session.

import {
  FlashistFacade,
  flashist_waitGameInitComplete,
} from "./flashist/FlashistFacade";
import { reconcilePurchases } from "./PaymentsApiClient";

let hasScheduled = false;

/** Test seam — reset the once-per-session latch. */
export function resetPaymentsReconciliationForTests(): void {
  hasScheduled = false;
}

/** Fire-and-forget; latched so it runs at most once per session. */
export function schedulePaymentsReconciliation(): void {
  if (hasScheduled) {
    return;
  }
  hasScheduled = true;
  void runPaymentsReconciliation().catch(() => {
    // Best-effort — a failed pass retries next session.
  });
}

async function runPaymentsReconciliation(): Promise<void> {
  await flashist_waitGameInitComplete();

  const facade = FlashistFacade.instance;
  if (facade.getPaymentsCatalogStatus() !== "ready") {
    return;
  }
  const signed = await facade.getSignedPurchases();
  if (signed === null) {
    return; // No purchases pending (or payments unavailable) — nothing to do.
  }
  const tokens = await reconcilePurchases(signed.signature);
  if (tokens === null) {
    return;
  }
  for (const token of tokens) {
    try {
      // Only consumed AFTER the server confirmed the grant (the token is in
      // the reconcile response) — consuming earlier can lose purchases.
      await facade.consumePurchase(token);
    } catch {
      // A failed consume resurfaces in next session's getPurchases() — retry then.
    }
  }
}
