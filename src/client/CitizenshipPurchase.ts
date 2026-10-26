// Paid-citizenship purchase (task 0018). The flow itself is the shared one in
// ProductPurchase.ts (task 0494); this keeps citizenship's two-value result
// for its existing callers.

import { runProductPurchase } from "./ProductPurchase";

/**
 * "granted" == the SERVER confirmed the grant (is_paid_citizen committed) —
 * the caller must stop offering the purchase even if its profile re-fetch
 * fails, or a stale buy button invites a second real charge. "error" covers
 * every failure; all of them are retryable from the caller's point of view.
 */
export type CitizenshipPurchaseResult = "granted" | "error";

export async function runCitizenshipPurchase(): Promise<CitizenshipPurchaseResult> {
  // The server never refuses citizenship as already owned (spec §5.3), and
  // "not_opened" needs an option this call does not pass, so neither arrives
  // here; folding them into "error" is fail-safe.
  const result = await runProductPurchase("citizenship");
  return result === "granted" ? "granted" : "error";
}
