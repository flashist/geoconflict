// Client → profile-server payments calls (task 0019). Same degrade-gracefully
// contract as PlayerProfileView's profile fetch: empty/unset profileApiUrl ⇒
// no-op, bounded timeout, Zod-validated responses, NEVER throws — every failure
// path resolves to a failure value and the caller decides the UX (0018) or
// silently skips (session reconciliation).

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

async function postJson(
  path: string,
  body: unknown,
  headers: Record<string, string> = {},
): Promise<unknown | null> {
  const base = await resolveApiBase();
  if (base === null) {
    return null;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PAYMENTS_FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(`${base}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
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

export type CreateIntentResult =
  | { kind: "ok"; intentId: string }
  | { kind: "already_owned" }
  | { kind: "failed" };

export type ReconcileResult =
  | {
      kind: "ok";
      processedTokens: string[];
      /** null = a box older than task 0506, which cannot say what was fresh. */
      grantedTokens: string[] | null;
      consumeTokens: string[];
      heldElsewhere: PaymentProductId[];
      failedCount: number;
    }
  | { kind: "failed" };

const ALREADY_OWNED_STATUS = 409;

/**
 * Create a server-side purchase intent; its id becomes the developerPayload of
 * the Yandex purchase. The caller is the login session (task 0273, S4) — no id
 * is sent. `already_owned` only for a 409 whose body says so (a durable item
 * the verified caller owns, task 0496); every other failure, including no
 * session, is `failed` and the caller aborts the flow.
 *
 * This is the only payments call that REQUIRES a Bearer token. `complete` never
 * sends one and `reconcile` only adds one it already holds: reconciliation must
 * recover an interrupted purchase without being logged in, and the grant is
 * bound to the Yandex-signed payload rather than to the caller.
 */
export async function createPurchaseIntent(
  productId: PaymentProductId,
): Promise<CreateIntentResult> {
  const result = await profileFetch("/v1/payments/yandex/intent", {
    method: "POST",
    body: JSON.stringify({ productId }),
    timeoutMs: PAYMENTS_FETCH_TIMEOUT_MS,
  });
  if (result.kind !== "response") {
    return { kind: "failed" };
  }
  const response = result.response;
  if (!response.ok && response.status !== ALREADY_OWNED_STATUS) {
    return { kind: "failed" };
  }
  const json: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    return isAlreadyOwnedBody(json)
      ? { kind: "already_owned" }
      : { kind: "failed" };
  }
  const parsed = PurchaseIntentResponseSchema.safeParse(json);
  return parsed.success
    ? { kind: "ok", intentId: parsed.data.intentId }
    : { kind: "failed" };
}

function isAlreadyOwnedBody(json: unknown): boolean {
  return (
    typeof json === "object" &&
    json !== null &&
    (json as { error?: unknown }).error === "already_owned"
  );
}

/**
 * Post the signed purchase payload for verification + grant. On success the
 * server returns the purchaseToken (signed-mode purchase() never exposes it
 * client-side) and whether it may be consumed. Null on any failure — the next
 * session's reconciliation recovers the purchase.
 */
export async function completePurchase(
  signature: string,
): Promise<PurchaseCompleteResponse | null> {
  const json = await postJson("/v1/payments/yandex/complete", { signature });
  const parsed = PurchaseCompleteResponseSchema.safeParse(json);
  return parsed.success ? parsed.data : null;
}

/**
 * Post the signed getPurchases() output. Only `consumeTokens` may be consumed
 * (ADR-126); a box older than task 0506 sends none, so nothing is. The Bearer,
 * when given, only lets the server answer `heldElsewhere` for a verified caller.
 * Never logs in (no profileFetch): a missing or rejected session must not block
 * the recovery. A box older than task 0492 never sends `failedCount` (reads as 0).
 */
export async function reconcilePurchases(
  signature: string,
  sessionToken: string | null,
): Promise<ReconcileResult> {
  const json = await postJson(
    "/v1/payments/yandex/reconcile",
    { signature },
    sessionToken === null ? {} : { Authorization: `Bearer ${sessionToken}` },
  );
  const parsed = PurchaseReconcileResponseSchema.safeParse(json);
  return parsed.success
    ? {
        kind: "ok",
        processedTokens: parsed.data.processedTokens,
        grantedTokens: parsed.data.grantedTokens ?? null,
        consumeTokens: parsed.data.consumeTokens ?? [],
        heldElsewhere: parsed.data.heldElsewhere ?? [],
        failedCount: parsed.data.failedCount ?? 0,
      }
    : { kind: "failed" };
}
