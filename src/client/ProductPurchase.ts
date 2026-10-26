// One product's paid purchase (task 0494; generalizes task 0018's citizenship
// flow): server intent → Yandex payment frame → server-verified /complete →
// consume, only when the server says so (ADR-126: permanent products are kept).
// Separate from any surface so the sequencing and its analytics contract are
// unit-testable in isolation.
//
// Analytics contract (0021 §3–5): Started fires as the payment frame is
// opened; exactly one of Completed/Abandoned follows for every started flow;
// nothing fires when the flow dies before the frame (no intent, already owned).

import type { PaymentProductId } from "../core/profile/PaymentsContract";
import { dispatchCitizenshipGrantedMidSession } from "./CitizenshipRestartOffer";
import {
  FlashistFacade,
  flashist_logEventAnalytics,
} from "./flashist/FlashistFacade";
import { completePurchase, createPurchaseIntent } from "./PaymentsApiClient";
import { beginPlatformDialog } from "./PlatformDialogPresence";
import { getProductClientConfig } from "./ProductClientConfig";

/**
 * "granted" == the SERVER confirmed the grant — the caller must stop offering
 * the purchase even if its profile re-fetch fails, or a stale buy button
 * invites a second real charge. "already_owned" == /intent refused it. "error"
 * covers every other failure; all are retryable (an interrupted-but-paid
 * purchase is re-granted idempotently, and next session's reconciliation
 * recovers the stray token). "not_opened" == `mayOpenPaymentWindow` said no
 * after the intent: no frame, no Started (task 0495).
 */
export type ProductPurchaseResult =
  | "granted"
  | "already_owned"
  | "not_opened"
  | "error";

export interface ProductPurchaseOptions {
  /** Asked right before the payment frame opens (task 0495's deadline). */
  mayOpenPaymentWindow?: () => boolean;
}

export async function runProductPurchase(
  productId: PaymentProductId,
  options: ProductPurchaseOptions = {},
): Promise<ProductPurchaseResult> {
  // Task 0404: the whole flow counts as a platform dialog, intent through the
  // server's /complete, so the forced "please refresh" popup can never cut off
  // the server-confirm step after the player has paid.
  const endPlatformDialog = beginPlatformDialog();
  try {
    return await purchaseProduct(productId, options);
  } finally {
    endPlatformDialog();
  }
}

async function purchaseProduct(
  productId: PaymentProductId,
  options: ProductPurchaseOptions,
): Promise<ProductPurchaseResult> {
  const facade = FlashistFacade.instance;
  const analytics = getProductClientConfig(productId).analytics;

  // Since S4 (task 0273) the identity is the login session's Bearer token, so
  // this flow reads no Yandex id: a guest, a failed login and a failed /intent
  // all arrive as `failed`, and without an intent nothing can be bound to a
  // player.
  const intent = await createPurchaseIntent(productId);
  if (intent.kind === "already_owned") {
    return "already_owned";
  }
  if (intent.kind !== "ok") {
    // The payment frame never opened — deliberately no Started/Abandoned.
    return "error";
  }
  if (
    options.mayOpenPaymentWindow !== undefined &&
    !options.mayOpenPaymentWindow()
  ) {
    // The unused intent row is harmless: nothing is ever bound to it.
    return "not_opened";
  }

  flashist_logEventAnalytics(analytics.started);
  let signature: string;
  try {
    const purchased = await facade.purchaseCatalogItem(
      productId,
      intent.intentId,
    );
    const signedValue: unknown = purchased?.signature;
    if (typeof signedValue !== "string" || signedValue.length === 0) {
      // Defensive: a resolved purchase() without a signed payload cannot be
      // completed server-side — treat like any other frame failure.
      throw new Error("missing_signature");
    }
    signature = signedValue;
  } catch {
    // Player closed the frame, SDK error, or payments not ready — Yandex does
    // not distinguish cancel from failure, and 0021 §5 counts both as abandoned.
    flashist_logEventAnalytics(analytics.abandoned);
    return "error";
  }

  const completed = await completePurchase(signature);
  if (completed === null) {
    // Money may be captured with the grant deferred: the purchase stays
    // unconsumed, so next session's reconciliation re-grants it.
    // Funnel-wise this is still Abandoned (0021 §5 — no Completed this flow).
    flashist_logEventAnalytics(analytics.abandoned);
    return "error";
  }

  // Server-confirmed grant — the authoritative Completed signal (0021 §4).
  flashist_logEventAnalytics(analytics.completed);
  // Absent `consume` = a box older than 0506: keeping the purchase is the safe
  // side (ADR-126). Not awaited (review R2): a hung SDK consume must never
  // hold the purchase latch after a committed grant.
  if (completed.consume === true) {
    void facade.consumePurchase(completed.purchaseToken).catch(() => {
      // Deliberately swallowed — see above.
    });
  }
  // ADR-125: every completed purchase offers the "restart to apply" popup, so
  // this is its only purchase dispatch site and every caller of this flow gets it.
  dispatchCitizenshipGrantedMidSession("purchase", {
    productId,
    becamePaidCitizen: completed.becamePaidCitizen ?? null,
  });
  return "granted";
}
