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

  // Kill switch (task 0236): no profile-server POST while the citizenship
  // surfaces are switched off. Gated here rather than at the FlashistFacade
  // call site because this is the single choke point in front of the only
  // profile-server call in this module, so every caller is covered. Past the
  // init gate, so the flags are settled and this can be a real await.
  //
  // Known, owner-accepted consequence: this also suspends CONSUMING purchases
  // the server already granted. Nothing is lost — an unconsumed purchase
  // resurfaces in the next session's getPurchases(), which is this module's own
  // retry — but the moderation-compliance pass above is dormant while off.
  if (!(await FlashistFacade.instance.isCitizenshipSurfacesEnabled())) {
    return;
  }

  const facade = FlashistFacade.instance;
  if (facade.getPaymentsCatalogStatus() !== "ready") {
    return;
  }
  const signed = await facade.getSignedPurchases();
  if (signed === null) {
    return; // No purchases pending (or payments unavailable) — nothing to do.
  }
  const reconciled = await reconcilePurchases(signed.signature);
  if (reconciled.kind !== "ok" || reconciled.processedTokens.length === 0) {
    return;
  }
  const tokens = reconciled.processedTokens;
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

/**
 * - `processed`: the server granted ≥1 pending purchase (the profile is stale).
 * - `none`: verifiably nothing pending.
 * - `pending_ungranted`: the server reported a pending purchase it failed to
 *   grant (task 0492's `failedCount`) — no purchase may go on (OQ-1).
 * - `failed`: could not tell — an automatic purchase must not go on (spec F5).
 * - `timeout`: no answer in time; a late finish still signals and consumes.
 */
export type ReconcileNowResult =
  | "processed"
  | "none"
  | "pending_ungranted"
  | "failed"
  | "timeout";

/**
 * Task 0495: reconcile right now, for a guest who just logged in to buy — so a
 * paid-but-ungranted purchase is granted before a second payment window opens.
 * Ignores the once-per-session latch; never waits on the init gate (a player
 * tapping is long past it). Never throws.
 */
export async function reconcilePurchasesNow(
  timeoutMs: number,
): Promise<ReconcileNowResult> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timedOut = new Promise<"timeout">((resolve) => {
    timer = setTimeout(() => resolve("timeout"), timeoutMs);
  });
  const reconciled = runReconcileNow().catch(
    (): ReconcileNowResult => "failed",
  );
  try {
    return await Promise.race([reconciled, timedOut]);
  } finally {
    clearTimeout(timer);
  }
}

async function runReconcileNow(): Promise<ReconcileNowResult> {
  const facade = FlashistFacade.instance;
  // Fail closed: the popup that starts this flow does not open while off.
  if (!(await facade.isCitizenshipSurfacesEnabled())) {
    return "failed";
  }
  const signed = await facade.getSignedPurchasesResult();
  if (signed.kind !== "signed") {
    return signed.kind;
  }
  const reconciled = await reconcilePurchases(signed.signature);
  if (reconciled.kind !== "ok") {
    return "failed";
  }
  const tokens = reconciled.processedTokens;
  if (tokens.length > 0) {
    // Signal before consuming, as the boot pass does (review R3 there).
    window.dispatchEvent(new CustomEvent(PURCHASES_RECONCILED_EVENT));
    void consumeAll(facade, tokens);
  }
  if (reconciled.failedCount > 0) {
    return "pending_ungranted";
  }
  return tokens.length > 0 ? "processed" : "none";
}

async function consumeAll(
  facade: FlashistFacade,
  tokens: readonly string[],
): Promise<void> {
  for (const token of tokens) {
    try {
      await facade.consumePurchase(token);
    } catch {
      // A failed consume resurfaces in next session's getPurchases().
    }
  }
}
