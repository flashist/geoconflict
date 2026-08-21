// Client → profile-server payments calls (task 0019). Same degrade-gracefully
// contract as PlayerProfileView's profile fetch: empty/unset profileApiUrl ⇒
// no-op, bounded timeout, Zod-validated responses, NEVER throws — every failure
// path resolves to null and the caller decides the UX (0018) or silently skips
// (session reconciliation).

import { getServerConfigFromClient } from "../core/configuration/ConfigLoader";
import {
  PurchaseCompleteResponseSchema,
  PurchaseIntentResponseSchema,
  PurchaseReconcileResponseSchema,
  type PaymentProductId,
  type PurchaseCompleteResponse,
} from "../core/profile/PaymentsContract";

const PAYMENTS_FETCH_TIMEOUT_MS = 10_000;

/**
 * Resolve the profile-API base URL, or null when unconfigured (e.g. local dev
 * without PROFILE_API_URL) or when the config fetch itself fails.
 */
async function resolveApiBase(): Promise<string | null> {
  let base: string;
  try {
    base = (await getServerConfigFromClient())
      .profileApiUrl()
      .replace(/\/+$/, "");
  } catch {
    return null;
  }
  return base.length > 0 ? base : null;
}

async function postJson(path: string, body: unknown): Promise<unknown | null> {
  const base = await resolveApiBase();
  if (base === null) {
    return null;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PAYMENTS_FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(`${base}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok) {
      return null;
    }
    return await response.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Create a server-side purchase intent; its id becomes the developerPayload of
 * the Yandex purchase. Null on any failure (caller aborts the purchase flow).
 */
export async function createPurchaseIntent(
  yandexPlayerId: string,
  productId: PaymentProductId,
): Promise<string | null> {
  const json = await postJson("/v1/payments/yandex/intent", {
    yandexPlayerId,
    productId,
  });
  const parsed = PurchaseIntentResponseSchema.safeParse(json);
  return parsed.success ? parsed.data.intentId : null;
}

/**
 * Post the signed purchase payload for verification + grant. On success the
 * server returns the purchaseToken to consume (signed-mode purchase() never
 * exposes it client-side). Null on any failure — the purchase stays
 * unconsumed and the next session's reconciliation recovers it.
 */
export async function completePurchase(
  signature: string,
): Promise<PurchaseCompleteResponse | null> {
  const json = await postJson("/v1/payments/yandex/complete", { signature });
  const parsed = PurchaseCompleteResponseSchema.safeParse(json);
  return parsed.success ? parsed.data : null;
}

/**
 * Post the signed getPurchases() output; returns every token now safe to
 * consume (including already-processed strays), or null on any failure.
 */
export async function reconcilePurchases(
  signature: string,
): Promise<string[] | null> {
  const json = await postJson("/v1/payments/yandex/reconcile", { signature });
  const parsed = PurchaseReconcileResponseSchema.safeParse(json);
  return parsed.success ? parsed.data.processedTokens : null;
}
