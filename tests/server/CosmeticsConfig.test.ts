jest.mock("jose", () => ({
  base64url: {
    decode: (value: string) => Buffer.from(value, "base64url"),
  },
}));

import { CosmeticsSchema } from "../../src/core/CosmeticSchemas";
import {
  loadCosmeticsConfig,
  normalizeCosmeticsData,
} from "../../src/server/CosmeticsConfig";

describe("CosmeticsConfig", () => {
  test("normalizes legacy bundled cosmetics into the runtime schema", () => {
    const cosmetics = loadCosmeticsConfig();

    expect(CosmeticsSchema.safeParse(cosmetics).success).toBe(true);
    expect(Object.keys(cosmetics.patterns).length).toBeGreaterThan(0);

    for (const [patternName, pattern] of Object.entries(cosmetics.patterns)) {
      expect(pattern.name).toBe(patternName);
      expect(pattern.product).toBeNull();
      expect(pattern.affiliateCode).toBeNull();
    }
    expect(cosmetics.patterns.w?.pattern).toBe("AHEYAAAAAAAAAkCCQUQiLnQWaA");
  });

  test("preserves already-normalized pattern fields", () => {
    const normalized = normalizeCosmeticsData({
      patterns: {
        stripes: {
          name: "stripes",
          pattern: "AAAAAA",
          product: {
            productId: "product",
            priceId: "price",
            price: "1.00",
          },
          affiliateCode: "creator",
        },
      },
    });

    expect(normalized).toEqual({
      patterns: {
        stripes: {
          name: "stripes",
          pattern: "AAAAAA",
          product: {
            productId: "product",
            priceId: "price",
            price: "1.00",
          },
          affiliateCode: "creator",
        },
      },
    });
  });
});
