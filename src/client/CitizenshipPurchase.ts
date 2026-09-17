// Paid-citizenship purchase flow (task 0018) — the client orchestration over
// 0019's payments seam: server intent → Yandex payment frame → server-verified
// /complete → consume. Separate from the card (PaymentsReconciliation style)
// so the sequencing and its analytics contract are unit-testable in isolation.
//
// Analytics contract (0021 §3–5): Started fires as the payment frame is
// opened; exactly one of Completed/Abandoned follows for every started flow;
// nothing fires when the flow dies before the frame (no id / intent failure).

import {
  FlashistFacade,
  flashist_logEventAnalytics,
  flashistConstants,
} from "./flashist/FlashistFacade";
import { completePurchase, createPurchaseIntent } from "./PaymentsApiClient";

/**
 * "granted" == the SERVER confirmed the grant (is_paid_citizen committed) —
 * the caller must stop offering the purchase even if its profile re-fetch
 * fails, or a stale buy button invites a second real charge. "error" covers
 * every failure; all of them are retryable from the caller's point of view
 * (an interrupted-but-paid purchase is re-granted idempotently, and next
 * session's reconciliation recovers the stray token).
 */
export type CitizenshipPurchaseResult = "granted" | "error";

export async function runCitizenshipPurchase(): Promise<CitizenshipPurchaseResult> {
  const facade = FlashistFacade.instance;

  // Since S4 (task 0273) the identity is the login session's Bearer token, so
  // this flow reads no Yandex id: a guest, a failed login and a failed /intent
  // all arrive as a null intentId, and without an intent nothing can be bound to
  // a player.
  const intentId = await createPurchaseIntent("citizenship");
  if (intentId === null) {
    // The payment frame never opened — deliberately no Started/Abandoned.
    return "error";
  }

  flashist_logEventAnalytics(
    flashistConstants.analyticEvents.PURCHASE_STARTED_CITIZENSHIP,
  );
  let signature: string;
  try {
    const purchased = await facade.purchaseCatalogItem(
      "citizenship",
      intentId,
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
    flashist_logEventAnalytics(
      flashistConstants.analyticEvents.PURCHASE_ABANDONED_CITIZENSHIP,
    );
    return "error";
  }

  const completed = await completePurchase(signature);
  if (completed === null) {
    // Money may be captured with the grant deferred: the purchase stays
    // unconsumed, so next session's reconciliation re-grants and consumes it.
    // Funnel-wise this is still Abandoned (0021 §5 — no Completed this flow).
    flashist_logEventAnalytics(
      flashistConstants.analyticEvents.PURCHASE_ABANDONED_CITIZENSHIP,
    );
    return "error";
  }

  // Server-confirmed grant — the authoritative Completed signal (0021 §4).
  flashist_logEventAnalytics(
    flashistConstants.analyticEvents.PURCHASE_COMPLETED_CITIZENSHIP,
  );
  // Consume only AFTER the server confirmed the grant (consuming earlier can
  // lose purchases) — but deliberately NOT awaited (review R2): the grant is
  // committed, so a hung or failed SDK consume must never freeze the flow and
  // hold the card's latch post-grant. A stray unconsumed token is recovered
  // by next session's reconciliation either way.
  void facade.consumePurchase(completed.purchaseToken).catch(() => {
    // Deliberately swallowed — see above.
  });
  return "granted";
}
