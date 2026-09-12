import {
  ClientMessageSchema,
  ClientParticipationSchema,
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

// Task 0211. The mid-match participation self-report.
describe("ClientParticipationSchema", () => {
  test("is a member of the client message union", () => {
    const result = ClientMessageSchema.safeParse({
      type: "participation",
      hasSpawned: true,
      isAliveNow: false,
      killedAt: 1234,
    });
    expect(result.success).toBe(true);
  });

  test("accepts a survivor report with no killedAt", () => {
    const result = ClientParticipationSchema.safeParse({
      type: "participation",
      hasSpawned: true,
      isAliveNow: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.killedAt).toBeUndefined();
    }
  });

  /**
   * 🔴 The security property, asserted rather than asserted-in-prose: a client can
   * only ever report ITSELF, because there is no field on the wire to name anyone
   * else. The server uses the authenticated socket's clientID.
   *
   * ⚠️ Read the assertion precisely. Zod's `z.object` STRIPS unknown keys; it does
   * not reject them. That is deliberate and matches every other client message here
   * (a rejection would close the socket on any forward-compatible field a newer
   * client adds). So the property is "an injected clientID is unreachable
   * server-side", not "the message is rejected" — and stripping is what this test
   * pins. If this schema is ever made `.strict()`, that is a wire-compatibility
   * decision, not a tightening of this property.
   */
  test("strips an injected clientID so it can never reach the server", () => {
    const result = ClientParticipationSchema.safeParse({
      type: "participation",
      hasSpawned: true,
      isAliveNow: false,
      killedAt: 5,
      clientID: "victim12",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty("clientID");
      expect(Object.keys(result.data).sort()).toEqual([
        "hasSpawned",
        "isAliveNow",
        "killedAt",
        "type",
      ]);
    }
  });

  test("rejects a report missing a required boolean", () => {
    const result = ClientParticipationSchema.safeParse({
      type: "participation",
      hasSpawned: true,
    });
    expect(result.success).toBe(false);
  });

  test("rejects a negative or fractional killedAt", () => {
    for (const killedAt of [-1, 1.5]) {
      const result = ClientParticipationSchema.safeParse({
        type: "participation",
        hasSpawned: true,
        isAliveNow: false,
        killedAt,
      });
      expect(result.success).toBe(false);
    }
  });
});
