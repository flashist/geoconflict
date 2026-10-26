import {
  isPermanentProductKind,
  PAYMENT_PRODUCT_IDS,
  PRODUCT_DEFINITIONS,
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

  // Task 0492: the Record type is the compile-time half; this is the runtime half.
  describe("PRODUCT_DEFINITIONS", () => {
    it("defines exactly the sellable products — no more, no fewer", () => {
      expect(Object.keys(PRODUCT_DEFINITIONS).sort()).toEqual(
        [...PAYMENT_PRODUCT_IDS].sort(),
      );
    });

    it("citizenship is of kind citizenship", () => {
      expect(PRODUCT_DEFINITIONS.citizenship).toEqual({ kind: "citizenship" });
    });
  });

  // Task 0506 (ADR-126). The compile-time half is the `never` default: a new kind
  // fails `tsc` until it is classified (jest/SWC does not type-check).
  describe("isPermanentProductKind", () => {
    it.each(["citizenship", "durable_item"] as const)(
      "%s is permanent",
      (kind) => {
        expect(isPermanentProductKind(kind)).toBe(true);
      },
    );

    it.each([...PAYMENT_PRODUCT_IDS])(
      "sellable product %s is classified, and permanent",
      (productId) => {
        expect(isPermanentProductKind(PRODUCT_DEFINITIONS[productId].kind)).toBe(
          true,
        );
      },
    );
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

    // Task 0492: optional, so a box from before 0492 (no field) still parses.
    it.each([true, false])("keeps becamePaidCitizen: %s", (value) => {
      const parsed = PurchaseCompleteResponseSchema.safeParse({
        success: true,
        purchaseToken: "tok-1",
        becamePaidCitizen: value,
      });
      expect(parsed.success).toBe(true);
      expect(parsed.data?.becamePaidCitizen).toBe(value);
    });

    it("accepts a body without becamePaidCitizen (old box, or a replay)", () => {
      const parsed = PurchaseCompleteResponseSchema.safeParse({
        success: true,
        purchaseToken: "tok-1",
      });
      expect(parsed.success).toBe(true);
      expect(parsed.data).not.toHaveProperty("becamePaidCitizen");
    });

    // Task 0506: optional, so an old box (no field) parses, and a new client then
    // consumes nothing.
    it.each([true, false])("keeps consume: %s", (value) => {
      const parsed = PurchaseCompleteResponseSchema.safeParse({
        success: true,
        purchaseToken: "tok-1",
        consume: value,
      });
      expect(parsed.success).toBe(true);
      expect(parsed.data?.consume).toBe(value);
    });

    it("accepts a body without consume (a box older than 0506)", () => {
      const parsed = PurchaseCompleteResponseSchema.safeParse({
        success: true,
        purchaseToken: "tok-1",
      });
      expect(parsed.success).toBe(true);
      expect(parsed.data).not.toHaveProperty("consume");
    });

    it("rejects a non-boolean consume", () => {
      expect(
        PurchaseCompleteResponseSchema.safeParse({
          success: true,
          purchaseToken: "tok-1",
          consume: "false",
        }).success,
      ).toBe(false);
    });

    it("rejects a non-boolean becamePaidCitizen", () => {
      expect(
        PurchaseCompleteResponseSchema.safeParse({
          success: true,
          purchaseToken: "tok-1",
          becamePaidCitizen: "true",
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

    // Task 0492 (OQ-1): optional, so a box from before 0492 still parses.
    it("accepts a reconcile body with and without failedCount", () => {
      expect(
        PurchaseReconcileResponseSchema.safeParse({ processedTokens: [] }).data,
      ).not.toHaveProperty("failedCount");
      expect(
        PurchaseReconcileResponseSchema.safeParse({
          processedTokens: ["tok-1"],
          failedCount: 2,
        }).data?.failedCount,
      ).toBe(2);
    });

    it.each([-1, 1.5, "1"])("rejects failedCount %p", (value) => {
      expect(
        PurchaseReconcileResponseSchema.safeParse({
          processedTokens: [],
          failedCount: value,
        }).success,
      ).toBe(false);
    });

    // Task 0506: the three new lists are optional, so a box older than 0506 parses.
    it("accepts the old shape with none of the 0506 lists", () => {
      const parsed = PurchaseReconcileResponseSchema.safeParse({
        processedTokens: ["tok-1"],
      });
      expect(parsed.success).toBe(true);
      expect(parsed.data).not.toHaveProperty("grantedTokens");
      expect(parsed.data).not.toHaveProperty("consumeTokens");
      expect(parsed.data).not.toHaveProperty("heldElsewhere");
    });

    it("keeps grantedTokens, consumeTokens and heldElsewhere when present", () => {
      const parsed = PurchaseReconcileResponseSchema.safeParse({
        processedTokens: ["tok-1", "tok-2"],
        grantedTokens: ["tok-2"],
        consumeTokens: [],
        heldElsewhere: ["citizenship"],
      });
      expect(parsed.success).toBe(true);
      expect(parsed.data).toEqual({
        processedTokens: ["tok-1", "tok-2"],
        grantedTokens: ["tok-2"],
        consumeTokens: [],
        heldElsewhere: ["citizenship"],
      });
    });

    it.each([
      ["grantedTokens", [""]],
      ["consumeTokens", [""]],
      ["grantedTokens", "tok-1"],
      ["heldElsewhere", ["not_a_product"]],
      ["heldElsewhere", "citizenship"],
    ])("rejects %s = %p", (field, value) => {
      expect(
        PurchaseReconcileResponseSchema.safeParse({
          processedTokens: [],
          [field]: value,
        }).success,
      ).toBe(false);
    });
  });
});
