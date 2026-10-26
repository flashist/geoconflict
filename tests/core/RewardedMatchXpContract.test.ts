// The rewarded-ad match-XP grant's wire contract (task 0491, server part of 0488).

import { CreditItemSchema } from "../../src/core/profile/CreditContract";
import {
  REWARDED_MATCH_XP_STATUSES,
  RewardedMatchXpRequestSchema,
  RewardedMatchXpResponseSchema,
} from "../../src/core/profile/RewardedMatchXpContract";

describe("RewardedMatchXpRequestSchema", () => {
  test("accepts a game id of 1 and of 128 characters", () => {
    expect(RewardedMatchXpRequestSchema.parse({ gameId: "a" })).toEqual({
      gameId: "a",
    });
    const long = "g".repeat(128);
    expect(RewardedMatchXpRequestSchema.parse({ gameId: long })).toEqual({
      gameId: long,
    });
  });

  test.each([
    ["an empty body", {}],
    ["an empty game id", { gameId: "" }],
    ["a 129-character game id", { gameId: "g".repeat(129) }],
    ["a numeric game id", { gameId: 42 }],
    ["a null game id", { gameId: null }],
  ])("rejects %s", (_label, body) => {
    expect(RewardedMatchXpRequestSchema.safeParse(body).success).toBe(false);
  });

  test("the bound matches the base credit's, so every credited game id fits", () => {
    const playerId = "0b6f8a52-3c1e-4d7a-9f10-2a4b6c8d0e1f";
    for (const gameId of ["", "g".repeat(128), "g".repeat(129)]) {
      expect(RewardedMatchXpRequestSchema.safeParse({ gameId }).success).toBe(
        CreditItemSchema.safeParse({ gameId, playerId, xpAwarded: 1 }).success,
      );
    }
  });

  test("strips a client-sent amount and player id", () => {
    expect(
      RewardedMatchXpRequestSchema.parse({
        gameId: "game-1",
        xpAwarded: 999,
        playerId: "11111111-1111-4111-8111-111111111111",
      }),
    ).toEqual({ gameId: "game-1" });
  });
});

describe("RewardedMatchXpResponseSchema", () => {
  test("the statuses are exactly granted, duplicate and not_credited", () => {
    expect([...REWARDED_MATCH_XP_STATUSES]).toEqual([
      "granted",
      "duplicate",
      "not_credited",
    ]);
  });

  test.each(REWARDED_MATCH_XP_STATUSES)("accepts status %s", (status) => {
    expect(
      RewardedMatchXpResponseSchema.safeParse({ status, xpAwarded: 1, xp: 2 })
        .success,
    ).toBe(true);
  });

  test("accepts zero amounts", () => {
    expect(
      RewardedMatchXpResponseSchema.safeParse({
        status: "not_credited",
        xpAwarded: 0,
        xp: 0,
      }).success,
    ).toBe(true);
  });

  test.each([
    ["an unknown status", { status: "not_found", xpAwarded: 0, xp: 0 }],
    ["a negative xpAwarded", { status: "granted", xpAwarded: -1, xp: 0 }],
    ["a fractional xpAwarded", { status: "granted", xpAwarded: 1.5, xp: 2 }],
    ["a negative xp", { status: "granted", xpAwarded: 1, xp: -1 }],
    ["a fractional xp", { status: "granted", xpAwarded: 1, xp: 2.5 }],
    ["a missing xp", { status: "granted", xpAwarded: 1 }],
  ])("rejects %s", (_label, body) => {
    expect(RewardedMatchXpResponseSchema.safeParse(body).success).toBe(false);
  });
});
