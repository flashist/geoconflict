import { z } from "zod";

/**
 * Shared client↔profile-server WIRE contracts for the Yandex payments endpoints
 * (`POST /v1/payments/yandex/{intent,complete,reconcile}`) — the payments sibling
 * of CreditContract.ts. Defined here so the client's `PaymentsApiClient` serializes
 * the exact same schemas the profile server validates — no drift.
 *
 * Trust model (task 0019, ADR-103; task 0273 S4): `/intent` identifies its caller by
 * the login session's Bearer token. A token may be `vfy:true` since task 0340, but
 * the route reads `verified` only to refuse a durable item the caller already owns
 * (task 0496); for citizenship it is still the same trust level the credit path
 * accepted (anyone can mint a `vfy:false` token for an id they assert). The paid
 * GRANT itself is bound to the Yandex-HMAC-signed payload via `developerPayload` →
 * intent row → player id, so a forged caller can only ever direct an attacker's own
 * real payment at an id he chose himself.
 *
 * See ai-agents/tasks/backlog/0019-yandex-payments-impl/brief.md.
 */

/** Product ids sellable through Yandex payments. Extend here (one place) only. */
export const PAYMENT_PRODUCT_IDS = ["citizenship"] as const;
export const PaymentProductIdSchema = z.enum(PAYMENT_PRODUCT_IDS);
export type PaymentProductId = z.infer<typeof PaymentProductIdSchema>;

export type ProductKind = "citizenship" | "durable_item";

/**
 * Permanent products are never consumed (ADR-126): a consumed purchase is gone from
 * Yandex for good, and the unconsumed one is the buyer's proof if our record is lost.
 * The `never` default makes a new kind fail to compile until it is classified.
 */
export function isPermanentProductKind(kind: ProductKind): boolean {
  switch (kind) {
    case "citizenship":
    case "durable_item":
      return true;
    default: {
      const unclassified: never = kind;
      throw new Error(`unclassified product kind: ${String(unclassified)}`);
    }
  }
}

/** Keyed by the id union, so a product added above without a definition fails to compile. */
export const PRODUCT_DEFINITIONS: Record<
  PaymentProductId,
  { kind: ProductKind }
> = {
  citizenship: { kind: "citizenship" },
};

/**
 * Create a purchase intent BEFORE the client opens the Yandex payment frame.
 *
 * The caller is the Bearer token and nothing else (task 0273, S4 — the legacy
 * `yandexPlayerId` field is GONE). zod strips unknown keys, so an old client still
 * sending it parses fine and then gets 401 `session_invalid` for having no token.
 */
export const PurchaseIntentRequestSchema = z.object({
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
  // Present only on a fresh grant: a replay cannot know whether that earlier
  // grant is what made the buyer paid. false = they were already paid.
  becamePaidCitizen: z.boolean().optional(),
  // Task 0506 (ADR-126): whether the client may consume purchaseToken. Absent =
  // a box from before 0506, so a new client consumes nothing.
  consume: z.boolean().optional(),
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
 * `processedTokens` keeps its pre-0506 meaning for clients that predate it: every
 * token granted now or already in the ledger, which those clients consume. A client
 * built for 0506 (ADR-126) reads the three optional lists instead; each is absent
 * from a box older than 0506.
 */
export const PurchaseReconcileResponseSchema = z.object({
  processedTokens: z.array(z.string().min(1)),
  // Entries that threw and were skipped: a 200 with fewer tokens must not read
  // as "nothing pending", or the client could open a second payment window.
  failedCount: z.number().int().nonnegative().optional(),
  /** Fresh grants in THIS call only — the one "something was granted" signal. */
  grantedTokens: z.array(z.string().min(1)).optional(),
  /** The only tokens a new client may consume. */
  consumeTokens: z.array(z.string().min(1)).optional(),
  /**
   * Products held by a different profile than the VERIFIED caller. Product ids only,
   * never a token or a player id; an unknown id fails the whole parse, so the box
   * only ever sends catalogue ids.
   */
  heldElsewhere: z.array(PaymentProductIdSchema).optional(),
});
export type PurchaseReconcileResponse = z.infer<
  typeof PurchaseReconcileResponseSchema
>;
