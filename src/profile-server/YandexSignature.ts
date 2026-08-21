// HMAC verification + normalization for Yandex Games signed purchase payloads.
//
// Documented format (yandex.ru/dev/games/doc/ru/sdk/sdk-purchases, re-checked
// 2026-08-14): two base64 strings joined by a period — `<signature>.<json>` —
// where the signature is an HMAC-SHA256 over the payload, keyed by the per-game
// secret. The docs do NOT pin down whether the HMAC message is the base64
// payload string as transmitted or the decoded JSON text, so BOTH deterministic
// constructions are accepted (same key either way — no security loss, and the
// live integration works under either; the live-verification checklist in the
// task folder confirms which one Yandex actually uses once the secret exists).
//
// Payload shapes normalized (the docs' example wraps the purchase in an
// envelope; the SDK interface list documents a flat IPurchase — accept both):
//   * envelope: { algorithm, issuedAt, data: <purchase | purchase[]> }
//   * flat:     { productID | productId | product.id, purchaseToken | token,
//                 developerPayload? }
//   * arrays (signed getPurchases()): at the root, under `data`, or `purchases`.
//
// Fails CLOSED: any structural, decoding, or HMAC failure returns null — this
// module never throws.

import { createHmac, timingSafeEqual } from "crypto";

/** One purchase, normalized out of whatever field spelling Yandex sent. */
export interface VerifiedPurchase {
  purchaseToken: string;
  productId: string;
  developerPayload: string | null;
}

export interface VerifiedPayload {
  /** All purchases the signed payload carried (1 for purchase(), 0..n for getPurchases()). */
  purchases: VerifiedPurchase[];
  /** The decoded JSON text, for the processed_purchases receipt ledger. */
  rawPayload: string;
}

function asNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function normalizePurchase(value: unknown): VerifiedPurchase | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const purchaseToken =
    asNonEmptyString(record.purchaseToken) ?? asNonEmptyString(record.token);
  const product = record.product as Record<string, unknown> | undefined;
  const productId =
    asNonEmptyString(record.productID) ??
    asNonEmptyString(record.productId) ??
    (typeof product === "object" && product !== null
      ? asNonEmptyString(product.id)
      : null);
  if (purchaseToken === null || productId === null) {
    return null;
  }
  return {
    purchaseToken,
    productId,
    developerPayload: asNonEmptyString(record.developerPayload),
  };
}

/**
 * Extract the purchase list from the parsed JSON. Returns null when the payload
 * has no recognizable purchase shape at all; an empty ARRAY payload (a signed
 * getPurchases() with nothing pending) normalizes to [] — that is a valid,
 * verified "nothing to do".
 */
function normalizePurchases(parsed: unknown): VerifiedPurchase[] | null {
  if (typeof parsed !== "object" || parsed === null) {
    return null;
  }
  // Unwrap the documented envelope ({ algorithm, issuedAt, data: ... }).
  const record = parsed as Record<string, unknown>;
  const body = "data" in record ? record.data : record;

  const list = Array.isArray(body)
    ? body
    : typeof body === "object" &&
        body !== null &&
        Array.isArray((body as Record<string, unknown>).purchases)
      ? ((body as Record<string, unknown>).purchases as unknown[])
      : null;
  if (list !== null) {
    // Array form: skip entries that don't normalize (HMAC already proved the
    // payload authentic; an unparseable entry is a shape we don't know — the
    // route logs a skip, never a grant).
    return list
      .map(normalizePurchase)
      .filter((p): p is VerifiedPurchase => p !== null);
  }

  const single = normalizePurchase(body);
  return single === null ? null : [single];
}

/**
 * Verify a `<signature>.<payload>` signed string against the per-game secret
 * and normalize its purchase(s). Returns null on ANY failure — bad structure,
 * bad base64/JSON, HMAC mismatch, empty secret. Never throws.
 */
export function verifySignedPayload(
  signed: string,
  secret: string,
): VerifiedPayload | null {
  if (secret.length === 0) {
    return null; // Fail closed — never verify against an empty key.
  }
  const dotIndex = signed.indexOf(".");
  if (dotIndex <= 0 || dotIndex === signed.length - 1) {
    return null;
  }
  const signaturePart = signed.slice(0, dotIndex);
  const payloadPart = signed.slice(dotIndex + 1);

  const providedSignature = Buffer.from(signaturePart, "base64");
  if (providedSignature.length === 0) {
    return null;
  }
  const decodedPayload = Buffer.from(payloadPart, "base64").toString("utf8");
  if (decodedPayload.length === 0) {
    return null;
  }

  // Accept HMAC over either the transmitted base64 payload or the decoded JSON
  // (see header comment). timingSafeEqual on equal-length buffers only.
  const messageCandidates = [payloadPart, decodedPayload];
  const signatureMatches = messageCandidates.some((message) => {
    const expected = createHmac("sha256", secret).update(message).digest();
    return (
      expected.length === providedSignature.length &&
      timingSafeEqual(expected, providedSignature)
    );
  });
  if (!signatureMatches) {
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(decodedPayload);
  } catch {
    return null;
  }
  const purchases = normalizePurchases(parsed);
  if (purchases === null) {
    return null;
  }
  return { purchases, rawPayload: decodedPayload };
}
