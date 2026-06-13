import { ClientJoinMessageSchema } from "../src/core/Schemas";

// A minimal join message whose other fields satisfy their schemas:
// - clientID / gameID: 8-char alphanumeric (ID schema)
// - token: a UUID literal (TokenSchema accepts a UUID via PersistentIdSchema)
// - username: a plain SafeString
function baseJoinMessage(): Record<string, unknown> {
  return {
    type: "join",
    clientID: "abcd1234",
    token: "123e4567-e89b-12d3-a456-426614174000",
    gameID: "game5678",
    lastTurn: 0,
    username: "player",
  };
}

describe("ClientJoinMessageSchema yandexPlayerId", () => {
  test("accepts a string yandexPlayerId and preserves it", () => {
    const result = ClientJoinMessageSchema.safeParse({
      ...baseJoinMessage(),
      yandexPlayerId: "yandex-unique-id-123",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.yandexPlayerId).toBe("yandex-unique-id-123");
    }
  });

  test("accepts a null yandexPlayerId (guest)", () => {
    const result = ClientJoinMessageSchema.safeParse({
      ...baseJoinMessage(),
      yandexPlayerId: null,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.yandexPlayerId).toBeNull();
    }
  });

  test("accepts an omitted yandexPlayerId (backwards compatible)", () => {
    const result = ClientJoinMessageSchema.safeParse(baseJoinMessage());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.yandexPlayerId).toBeUndefined();
    }
  });

  test("rejects a non-string, non-null yandexPlayerId", () => {
    const result = ClientJoinMessageSchema.safeParse({
      ...baseJoinMessage(),
      yandexPlayerId: 12345,
    });
    expect(result.success).toBe(false);
  });

  test("accepts a yandexPlayerId at the max length boundary (256)", () => {
    const result = ClientJoinMessageSchema.safeParse({
      ...baseJoinMessage(),
      yandexPlayerId: "x".repeat(256),
    });
    expect(result.success).toBe(true);
  });

  test("rejects an oversize yandexPlayerId (257)", () => {
    const result = ClientJoinMessageSchema.safeParse({
      ...baseJoinMessage(),
      yandexPlayerId: "x".repeat(257),
    });
    expect(result.success).toBe(false);
  });
});
