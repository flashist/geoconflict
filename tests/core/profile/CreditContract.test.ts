import { z } from "zod";
import {
  CreditBatchRequestSchema,
  CreditItemSchema,
  CreditResultSchema,
  PlayerResolveRequestSchema,
  PlayerResolveResponseSchema,
} from "../../../src/core/profile/CreditContract";
import { InternalPlayerIdSchema } from "../../../src/core/profile/InboxContract";

const PLAYER_ID = "0b6f8a52-3c1e-4d7a-9f10-2a4b6c8d0e1f";

function validItem() {
  return { gameId: "game-1", playerId: PLAYER_ID, xpAwarded: 10 };
}

describe("CreditContract", () => {
  test("accepts a well-formed batch", () => {
    const parsed = CreditBatchRequestSchema.parse({ credits: [validItem()] });
    expect(parsed.credits).toHaveLength(1);
    expect(parsed.credits[0].playerId).toBe(PLAYER_ID);
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
      CreditItemSchema.parse({ gameId: "g", playerId: PLAYER_ID }),
    ).toThrow();
  });

  // Task 0272 (S3): the credit wire is keyed by the INTERNAL player id. A body in
  // the retired Yandex-keyed shape is not a credit any more.
  test("rejects a legacy yandexPlayerId-keyed item", () => {
    expect(() =>
      CreditItemSchema.parse({
        gameId: "g",
        yandexPlayerId: "yandex-1",
        xpAwarded: 10,
      }),
    ).toThrow();
  });

  test("rejects a playerId that is not a UUID", () => {
    expect(() =>
      CreditItemSchema.parse({ ...validItem(), playerId: "yandex-1" }),
    ).toThrow();
    expect(() =>
      CreditItemSchema.parse({ ...validItem(), playerId: "" }),
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

  test("rejects empty/oversized game ids", () => {
    expect(() =>
      CreditItemSchema.parse({ ...validItem(), gameId: "" }),
    ).toThrow();
    expect(() =>
      CreditItemSchema.parse({ ...validItem(), gameId: "g".repeat(129) }),
    ).toThrow();
  });

  test("a result carries the playerId and keeps the no_profile status", () => {
    const parsed = CreditResultSchema.parse({
      gameId: "game-1",
      playerId: PLAYER_ID,
      status: "no_profile",
    });
    expect(parsed.status).toBe("no_profile");
  });
});

describe("PlayerResolveRequestSchema", () => {
  test("accepts a yandex_games platform id", () => {
    const parsed = PlayerResolveRequestSchema.parse({
      platform: "yandex_games",
      platformUserId: "yandex-1",
    });
    expect(parsed).toEqual({
      platform: "yandex_games",
      platformUserId: "yandex-1",
    });
  });

  test("rejects any platform other than yandex_games", () => {
    expect(() =>
      PlayerResolveRequestSchema.parse({
        platform: "steam",
        platformUserId: "yandex-1",
      }),
    ).toThrow();
    expect(() =>
      PlayerResolveRequestSchema.parse({ platformUserId: "yandex-1" }),
    ).toThrow();
  });

  test("platformUserId length boundaries: 0 and 129 rejected, 1 and 128 accepted", () => {
    const at = (length: number) => ({
      platform: "yandex_games",
      platformUserId: "y".repeat(length),
    });
    expect(() => PlayerResolveRequestSchema.parse(at(0))).toThrow();
    expect(PlayerResolveRequestSchema.parse(at(1)).platformUserId).toHaveLength(
      1,
    );
    expect(
      PlayerResolveRequestSchema.parse(at(128)).platformUserId,
    ).toHaveLength(128);
    expect(() => PlayerResolveRequestSchema.parse(at(129))).toThrow();
  });
});

describe("PlayerResolveResponseSchema", () => {
  test("accepts a UUID playerId and a boolean isCitizen", () => {
    expect(
      PlayerResolveResponseSchema.parse({
        playerId: PLAYER_ID,
        isCitizen: true,
      }),
    ).toEqual({ playerId: PLAYER_ID, isCitizen: true });
  });

  test("rejects a non-UUID playerId and a non-boolean isCitizen", () => {
    expect(() =>
      PlayerResolveResponseSchema.parse({
        playerId: "yandex-1",
        isCitizen: false,
      }),
    ).toThrow();
    expect(() =>
      PlayerResolveResponseSchema.parse({
        playerId: PLAYER_ID,
        isCitizen: "true",
      }),
    ).toThrow();
  });
});

// Task 0322: the approved display name rides on the same resolve reply. Absent,
// null and a string are three different answers; a malformed value must never
// cost the player the rest of the reply (the XP credit id and the ★).
describe("PlayerResolveResponseSchema — displayName (task 0322)", () => {
  const base = { playerId: PLAYER_ID, isCitizen: true };

  test("an old reply without displayName parses, with the field absent", () => {
    const parsed = PlayerResolveResponseSchema.parse(base);
    expect(parsed.displayName).toBeUndefined();
    expect(parsed.playerId).toBe(PLAYER_ID);
    expect(parsed.isCitizen).toBe(true);
  });

  test("null parses as null (no approved name, or cleared)", () => {
    expect(
      PlayerResolveResponseSchema.parse({ ...base, displayName: null })
        .displayName,
    ).toBeNull();
  });

  test("a string parses as that string", () => {
    expect(
      PlayerResolveResponseSchema.parse({ ...base, displayName: "Name_1" })
        .displayName,
    ).toBe("Name_1");
  });

  test.each([[42], [{ nested: "x" }], [["a"]], [true]])(
    "a malformed displayName (%p) reads as absent while playerId and isCitizen still parse",
    (displayName) => {
      const result = PlayerResolveResponseSchema.safeParse({
        ...base,
        displayName,
      });
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.displayName).toBeUndefined();
      expect(result.data.playerId).toBe(PLAYER_ID);
      expect(result.data.isCitizen).toBe(true);
    },
  );

  test("the old parser (no displayName) accepts the new reply", () => {
    // A verbatim copy of the pre-0322 schema: an old game server reading a new
    // profile server's reply.
    const OldPlayerResolveResponseSchema = z.object({
      playerId: InternalPlayerIdSchema,
      isCitizen: z.boolean(),
    });
    const parsed = OldPlayerResolveResponseSchema.parse({
      ...base,
      displayName: "Name_1",
    });
    expect(parsed).toEqual(base);
  });

  test("a bad displayName does not rescue a bad playerId", () => {
    expect(() =>
      PlayerResolveResponseSchema.parse({
        playerId: "not-a-uuid",
        isCitizen: true,
        displayName: 42,
      }),
    ).toThrow();
  });
});
