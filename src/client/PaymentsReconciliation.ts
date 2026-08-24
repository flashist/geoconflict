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

/**
 * Fired on `window` after reconciliation processed ≥1 purchase — the server
 * may have granted an entitlement this session's profile fetch predates, so
 * profile consumers (the citizenship card, task 0018) must re-fetch. Fired
 * even when a consume fails: the GRANT is committed server-side either way,
 * and a stale card showing the buy CTA invites a second real charge.
 */
export const PURCHASES_RECONCILED_EVENT = "geoconflict-purchases-reconciled";

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
  if (tokens === null || tokens.length === 0) {
    return;
  }
  // The grants are committed the moment /reconcile responds — signal profile
  // consumers BEFORE consuming (review R3): a hung consumePurchase below must
  // not block the card's refresh and leave a live buy CTA on a player the
  // server just granted. Consume-after-grant ordering is preserved: each
  // consume still starts only after the server listed its token as processed.
  window.dispatchEvent(new CustomEvent(PURCHASES_RECONCILED_EVENT));
  for (const token of tokens) {
    try {
      await facade.consumePurchase(token);
    } catch {
      // A failed consume resurfaces in next session's getPurchases() — retry then.
    }
  }
}
