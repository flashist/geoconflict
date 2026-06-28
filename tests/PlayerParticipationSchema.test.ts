import {
  ClientMessageSchema,
  ClientSendWinnerSchema,
  ClientUpdateIdentitySchema,
} from "../src/core/Schemas";

describe("ClientSendWinnerSchema playerParticipation", () => {
  function baseWinner(): Record<string, unknown> {
    return { type: "winner", winner: undefined, allPlayersStats: {} };
  }

  test("accepts a winner message without participation (older clients)", () => {
    const result = ClientSendWinnerSchema.safeParse(baseWinner());
    expect(result.success).toBe(true);
  });

  test("accepts and preserves a participation array", () => {
    const result = ClientSendWinnerSchema.safeParse({
      ...baseWinner(),
      playerParticipation: [
        {
          clientID: "abcd1234",
          hasSpawned: true,
          isAliveAtEnd: false,
          killedAt: 17,
        },
        { clientID: "efgh5678", hasSpawned: false, isAliveAtEnd: false },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.playerParticipation).toHaveLength(2);
      expect(result.data.playerParticipation?.[0].killedAt).toBe(17);
      expect(result.data.playerParticipation?.[1].killedAt).toBeUndefined();
    }
  });

  test("rejects a participation entry missing required booleans", () => {
    const result = ClientSendWinnerSchema.safeParse({
      ...baseWinner(),
      playerParticipation: [{ clientID: "abcd1234", hasSpawned: true }],
    });
    expect(result.success).toBe(false);
  });
});

describe("ClientUpdateIdentitySchema", () => {
  test("is a member of the client message union", () => {
    const result = ClientMessageSchema.safeParse({
      type: "update_identity",
      yandexPlayerId: "yandex-unique-id-123",
    });
    expect(result.success).toBe(true);
  });

  test("rejects an empty yandexPlayerId", () => {
    const result = ClientUpdateIdentitySchema.safeParse({
      type: "update_identity",
      yandexPlayerId: "",
    });
    expect(result.success).toBe(false);
  });
});
