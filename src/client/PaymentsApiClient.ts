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
import { profileFetch } from "./ProfileSession";

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
 * the Yandex purchase. The caller is the login session (task 0273, S4) — no id
 * is sent. Null on any failure, including no session (caller aborts the flow).
 *
 * This is the ONLY payments call that carries a Bearer token. `complete` and
 * `reconcile` must NOT: reconciliation runs at session start to recover an
 * interrupted purchase and must never depend on being logged in, and the grant
 * is bound to the Yandex-signed payload rather than to the caller.
 */
export async function createPurchaseIntent(
  productId: PaymentProductId,
): Promise<string | null> {
  const result = await profileFetch("/v1/payments/yandex/intent", {
    method: "POST",
    body: JSON.stringify({ productId }),
    timeoutMs: PAYMENTS_FETCH_TIMEOUT_MS,
  });
  if (result.kind !== "response" || !result.response.ok) {
    return null;
  }
  const json: unknown = await result.response.json().catch(() => null);
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
