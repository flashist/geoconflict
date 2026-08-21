import { z } from "zod";

/**
 * Shared client↔profile-server WIRE contracts for the Yandex payments endpoints
 * (`POST /v1/payments/yandex/{intent,complete,reconcile}`) — the payments sibling
 * of CreditContract.ts. Defined here so the client's `PaymentsApiClient` serializes
 * the exact same schemas the profile server validates — no drift.
 *
 * Trust model (task 0019, ADR-103): `/intent` accepts the CLIENT-asserted
 * yandexPlayerId (same trust level the credit path accepted for now); the paid
 * GRANT itself is bound to the Yandex-HMAC-signed payload via
 * `developerPayload` → intent row → player id, so a forged id can only ever
 * direct an attacker's own real payment at an id he chose himself.
 *
 * See ai-agents/tasks/backlog/0019-yandex-payments-impl/brief.md.
 */

/** Product ids sellable through Yandex payments. Extend here (one place) only. */
export const PAYMENT_PRODUCT_IDS = ["citizenship"] as const;
export const PaymentProductIdSchema = z.enum(PAYMENT_PRODUCT_IDS);
export type PaymentProductId = z.infer<typeof PaymentProductIdSchema>;

/** Create a purchase intent BEFORE the client opens the Yandex payment frame. */
export const PurchaseIntentRequestSchema = z.object({
  yandexPlayerId: z.string().min(1).max(128),
  productId: PaymentProductIdSchema,
});
export type PurchaseIntentRequest = z.infer<typeof PurchaseIntentRequestSchema>;

export const PurchaseIntentResponseSchema = z.object({
  intentId: z.string().min(1),
});
export type PurchaseIntentResponse = z.infer<
  typeof PurchaseIntentResponseSchema
>;

/**
 * Complete a purchase: the raw signed payload from `purchase()` (signed mode).
 * The documented Yandex format is `<signature>.<purchase-json>`, both base64 —
 * bounded so garbage can't balloon the body, generous enough for a real payload.
 */
export const PurchaseCompleteRequestSchema = z.object({
  signature: z.string().min(1).max(16_384),
});
export type PurchaseCompleteRequest = z.infer<
  typeof PurchaseCompleteRequestSchema
>;

/**
 * Success carries the purchaseToken back to the client: in signed mode
 * `purchase()` returns only `{ signature }`, so the SERVER (which parsed the
 * verified payload) is the one that knows the token the client must consume.
 */
export const PurchaseCompleteResponseSchema = z.object({
  success: z.literal(true),
  purchaseToken: z.string().min(1),
});
export type PurchaseCompleteResponse = z.infer<
  typeof PurchaseCompleteResponseSchema
>;

/**
 * Session-start reconciliation: the raw signed output of `getPurchases()`.
 * Larger bound than `/complete` — the signed JSON carries an ARRAY of purchases.
 */
export const PurchaseReconcileRequestSchema = z.object({
  signature: z.string().min(1).max(65_536),
});
export type PurchaseReconcileRequest = z.infer<
  typeof PurchaseReconcileRequestSchema
>;

/**
 * Every token now safe to consume — including ones that were ALREADY processed
 * server-side, so the client can consume strays from interrupted sessions.
 */
export const PurchaseReconcileResponseSchema = z.object({
  processedTokens: z.array(z.string().min(1)),
});
export type PurchaseReconcileResponse = z.infer<
  typeof PurchaseReconcileResponseSchema
>;
