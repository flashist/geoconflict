import {
  CreditBatchRequestSchema,
  CreditItemSchema,
  ProfileUpsertRequestSchema,
} from "../../../src/core/profile/CreditContract";

function validItem() {
  return { gameId: "game-1", yandexPlayerId: "yandex-1", xpAwarded: 10 };
}

describe("CreditContract", () => {
  test("accepts a well-formed batch", () => {
    const parsed = CreditBatchRequestSchema.parse({ credits: [validItem()] });
    expect(parsed.credits).toHaveLength(1);
  });

  test("rejects an empty batch", () => {
    expect(() => CreditBatchRequestSchema.parse({ credits: [] })).toThrow();
  });

  test("rejects a batch over the 500-item cap", () => {
    const credits = Array.from({ length: 501 }, (_, i) => ({
      ...validItem(),
      gameId: `game-${i}`,
    }));
    expect(() => CreditBatchRequestSchema.parse({ credits })).toThrow();
  });

  test("rejects missing fields", () => {
    expect(() =>
      CreditItemSchema.parse({ gameId: "g", xpAwarded: 10 }),
    ).toThrow();
    expect(() =>
      CreditItemSchema.parse({ gameId: "g", yandexPlayerId: "y" }),
    ).toThrow();
  });

  test("rejects non-positive and non-integer xpAwarded", () => {
    expect(() =>
      CreditItemSchema.parse({ ...validItem(), xpAwarded: 0 }),
    ).toThrow();
    expect(() =>
      CreditItemSchema.parse({ ...validItem(), xpAwarded: -10 }),
    ).toThrow();
    expect(() =>
      CreditItemSchema.parse({ ...validItem(), xpAwarded: 1.5 }),
    ).toThrow();
  });

  test("rejects an oversized xpAwarded (ledger int overflow guard)", () => {
    expect(() =>
      CreditItemSchema.parse({ ...validItem(), xpAwarded: 10_001 }),
    ).toThrow();
  });

  test("rejects empty/oversized id strings", () => {
    expect(() =>
      CreditItemSchema.parse({ ...validItem(), gameId: "" }),
    ).toThrow();
    expect(() =>
      CreditItemSchema.parse({
        ...validItem(),
        yandexPlayerId: "x".repeat(129),
      }),
    ).toThrow();
  });
});

describe("ProfileUpsertRequestSchema", () => {
  function validUpsert() {
    return { yandexPlayerId: "yandex-1", persistentId: "pid-1" };
  }

  test("accepts a well-formed upsert payload", () => {
    const parsed = ProfileUpsertRequestSchema.parse(validUpsert());
    expect(parsed.yandexPlayerId).toBe("yandex-1");
    expect(parsed.persistentId).toBe("pid-1");
  });

  test("rejects missing fields", () => {
    expect(() =>
      ProfileUpsertRequestSchema.parse({ yandexPlayerId: "yandex-1" }),
    ).toThrow();
    expect(() =>
      ProfileUpsertRequestSchema.parse({ persistentId: "pid-1" }),
    ).toThrow();
  });

  test("rejects empty-string fields", () => {
    expect(() =>
      ProfileUpsertRequestSchema.parse({
        ...validUpsert(),
        yandexPlayerId: "",
      }),
    ).toThrow();
    expect(() =>
      ProfileUpsertRequestSchema.parse({ ...validUpsert(), persistentId: "" }),
    ).toThrow();
  });

  test("rejects oversized (>128) fields", () => {
    expect(() =>
      ProfileUpsertRequestSchema.parse({
        ...validUpsert(),
        yandexPlayerId: "y".repeat(129),
      }),
    ).toThrow();
    expect(() =>
      ProfileUpsertRequestSchema.parse({
        ...validUpsert(),
        persistentId: "p".repeat(129),
      }),
    ).toThrow();
  });
});
