// Session-start purchase reconciliation (task 0019) — required for Yandex
// moderation compliance: purchases whose /complete never landed (closed tab,
// dropped network) are re-granted idempotently by the server. Since task 0506
// (ADR-126) a permanent purchase is never consumed, so it shows up in
// getPurchases() on every load: only the tokens the server lists in
// `consumeTokens` are consumed, and only a fresh grant signals the page.
//
// Scheduled by FlashistFacade once the payments catalog reaches 'ready' (via
// dynamic import — see fetchPaymentsCatalog); waits for the game-init gate so
// it never competes with boot. Best-effort end to end: every failure is
// swallowed and simply retried on the next session.

import type { PaymentProductId } from "../core/profile/PaymentsContract";
import {
  FlashistFacade,
  flashist_logEventAnalytics,
  flashist_waitGameInitComplete,
} from "./flashist/FlashistFacade";
import { reconcilePurchases, type ReconcileResult } from "./PaymentsApiClient";
import { getProductClientConfig } from "./ProductClientConfig";
import { ensureSession } from "./ProfileSession";
import { PURCHASE_OFFER_CHANGED_EVENT } from "./PurchaseOffer";

/**
 * Fired on `window` after reconciliation GRANTED ≥1 purchase in this call — the
 * profile fetch predates it, so profile consumers (the citizenship card, task
 * 0018) must re-fetch. A kept purchase that was granted long ago does not fire
 * it, so a reload stays quiet. Fired before any consume.
 */
export const PURCHASES_RECONCILED_EVENT = "geoconflict-purchases-reconciled";

let hasScheduled = false;

// Products this verified login paid for on another profile (ADR-126). Only
// grows within a page: the server's answer cannot change without a merge.
const heldElsewhereProducts = new Set<PaymentProductId>();

/** Test seam — reset the once-per-session latch and the held-elsewhere store. */
export function resetPaymentsReconciliationForTests(): void {
  hasScheduled = false;
  heldElsewhereProducts.clear();
}

/** What the reconcile said is held by another profile, this page load. */
export function getHeldElsewhereProducts(): ReadonlySet<PaymentProductId> {
  return heldElsewhereProducts;
}

function recordHeldElsewhere(productIds: readonly PaymentProductId[]): void {
  let isChanged = false;
  for (const productId of productIds) {
    if (heldElsewhereProducts.has(productId)) {
      continue;
    }
    heldElsewhereProducts.add(productId);
    isChanged = true;
    flashist_logEventAnalytics(
      getProductClientConfig(productId).analytics.heldOnOtherProfile,
    );
  }
  if (isChanged) {
    window.dispatchEvent(new CustomEvent(PURCHASE_OFFER_CHANGED_EVENT));
  }
}

type ReconcileOk = Extract<ReconcileResult, { kind: "ok" }>;

// A box older than 0506 cannot say what was fresh: fall back to the old rule,
// which re-fires on every load until that box is upgraded.
function hasFreshGrant(reconciled: ReconcileOk): boolean {
  return reconciled.grantedTokens === null
    ? reconciled.processedTokens.length > 0
    : reconciled.grantedTokens.length > 0;
}

/** Never throws, never retries a failed login (login rule D3). */
async function sessionTokenOrNull(): Promise<string | null> {
  try {
    return await ensureSession();
  } catch {
    return null;
  }
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
  // Only so the server can answer `heldElsewhere`; a guest resolves null at once.
  const sessionToken = await sessionTokenOrNull();
  const reconciled = await reconcilePurchases(signed.signature, sessionToken);
  if (reconciled.kind !== "ok") {
    return;
  }
  recordHeldElsewhere(reconciled.heldElsewhere);
  // The grants are committed the moment /reconcile responds — signal profile
  // consumers BEFORE consuming (review R3): a hung consumePurchase below must
  // not block the card's refresh and leave a live buy CTA on a player the
  // server just granted.
  if (hasFreshGrant(reconciled)) {
    window.dispatchEvent(new CustomEvent(PURCHASES_RECONCILED_EVENT));
  }
  await consumeAll(facade, reconciled.consumeTokens);
}

/**
 * - `processed`: the server granted ≥1 pending purchase in this call (the
 *   profile is stale).
 * - `none`: verifiably nothing pending, or only purchases granted earlier.
 * - `pending_ungranted`: the server reported a pending purchase it failed to
 *   grant (task 0492's `failedCount`) — no purchase may go on (OQ-1).
 * - `held_elsewhere`: a purchase is held by another profile of this verified
 *   login (ADR-126); the store already has it, so the offer says so.
 * - `failed`: could not tell — an automatic purchase must not go on (spec F5).
 * - `timeout`: no answer in time; a late finish still signals and consumes.
 */
export type ReconcileNowResult =
  | "processed"
  | "none"
  | "pending_ungranted"
  | "held_elsewhere"
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
  // The guest flow already resolved the session, so this starts no login.
  const sessionToken = await sessionTokenOrNull();
  const reconciled = await reconcilePurchases(signed.signature, sessionToken);
  if (reconciled.kind !== "ok") {
    return "failed";
  }
  recordHeldElsewhere(reconciled.heldElsewhere);
  const isFreshGrant = hasFreshGrant(reconciled);
  if (isFreshGrant) {
    // Signal before consuming, as the boot pass does (review R3 there).
    window.dispatchEvent(new CustomEvent(PURCHASES_RECONCILED_EVENT));
  }
  void consumeAll(facade, reconciled.consumeTokens);
  if (reconciled.failedCount > 0) {
    return "pending_ungranted";
  }
  if (reconciled.heldElsewhere.length > 0) {
    return "held_elsewhere";
  }
  return isFreshGrant ? "processed" : "none";
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
