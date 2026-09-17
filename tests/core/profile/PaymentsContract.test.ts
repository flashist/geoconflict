import {
  PAYMENT_PRODUCT_IDS,
  PurchaseCompleteRequestSchema,
  PurchaseCompleteResponseSchema,
  PurchaseIntentRequestSchema,
  PurchaseIntentResponseSchema,
  PurchaseReconcileRequestSchema,
  PurchaseReconcileResponseSchema,
} from "../../../src/core/profile/PaymentsContract";

describe("PaymentsContract schemas", () => {
  describe("PurchaseIntentRequestSchema", () => {
    // Task 0273 (S4): the caller is the Bearer token; the body is the product only.
    it("accepts a known product on its own", () => {
      expect(
        PurchaseIntentRequestSchema.safeParse({ productId: "citizenship" })
          .success,
      ).toBe(true);
    });

    it("rejects an unknown product id", () => {
      expect(
        PurchaseIntentRequestSchema.safeParse({ productId: "mega_tank_skin" })
          .success,
      ).toBe(false);
    });

    // Task 0273 (S4), owner ruling D1: the legacy field is gone from the schema.
    // zod strips unknown keys, so an old client's body still PARSES — and then the
    // route 401s it for having no token. What must never happen is the id reaching
    // the parsed output, where a future route could read it again.
    it("strips a legacy yandexPlayerId instead of accepting it as a caller", () => {
      const parsed = PurchaseIntentRequestSchema.safeParse({
        yandexPlayerId: "yandex-1",
        productId: "citizenship",
      });
      expect(parsed.success).toBe(true);
      expect(parsed.data).toEqual({ productId: "citizenship" });
      expect(parsed.data).not.toHaveProperty("yandexPlayerId");
    });

    it("keeps citizenship in the sellable-product list", () => {
      expect(PAYMENT_PRODUCT_IDS).toContain("citizenship");
    });
  });

  describe("intent response", () => {
    it("round-trips { intentId }", () => {
      expect(
        PurchaseIntentResponseSchema.safeParse({ intentId: "abc" }).success,
      ).toBe(true);
      expect(PurchaseIntentResponseSchema.safeParse({}).success).toBe(false);
    });
  });

  describe("PurchaseCompleteRequestSchema", () => {
    it("accepts a signature within bounds and rejects empty/oversized", () => {
      expect(
        PurchaseCompleteRequestSchema.safeParse({ signature: "sig.payload" })
          .success,
      ).toBe(true);
      expect(
        PurchaseCompleteRequestSchema.safeParse({ signature: "" }).success,
      ).toBe(false);
      expect(
        PurchaseCompleteRequestSchema.safeParse({
          signature: "x".repeat(16_385),
        }).success,
      ).toBe(false);
    });
  });

  describe("PurchaseCompleteResponseSchema", () => {
    it("requires success:true AND a purchaseToken", () => {
      expect(
        PurchaseCompleteResponseSchema.safeParse({
          success: true,
          purchaseToken: "tok-1",
        }).success,
      ).toBe(true);
      expect(
        PurchaseCompleteResponseSchema.safeParse({ success: true }).success,
      ).toBe(false);
      expect(
        PurchaseCompleteResponseSchema.safeParse({
          success: false,
          purchaseToken: "tok-1",
        }).success,
      ).toBe(false);
    });
  });

  describe("reconcile schemas", () => {
    it("allows a larger signature bound than /complete (array payloads)", () => {
      expect(
        PurchaseReconcileRequestSchema.safeParse({
          signature: "x".repeat(65_536),
        }).success,
      ).toBe(true);
      expect(
        PurchaseReconcileRequestSchema.safeParse({
          signature: "x".repeat(65_537),
        }).success,
      ).toBe(false);
    });

    it("accepts an empty processedTokens list, rejects empty tokens", () => {
      expect(
        PurchaseReconcileResponseSchema.safeParse({ processedTokens: [] })
          .success,
      ).toBe(true);
      expect(
        PurchaseReconcileResponseSchema.safeParse({ processedTokens: [""] })
          .success,
      ).toBe(false);
    });
  });
});
