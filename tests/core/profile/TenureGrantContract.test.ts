// The tenure grant's wire contract and amount rule (task 0253; ADR-112 as
// amended by the 2026-09-15 redesign).

import {
  TenureEvidenceSchema,
  TenureGrantRequestSchema,
  TenureGrantResponseSchema,
  tenureGrantForEvidence,
} from "../../../src/core/profile/TenureGrantContract";

describe("tenureGrantForEvidence", () => {
  test("days is the larger of the two counts", () => {
    expect(
      tenureGrantForEvidence({ daysPlayed: 7, gameRecordDays: 12 }),
    ).toEqual({ days: 12, xpAwarded: 12 });
    expect(
      tenureGrantForEvidence({ daysPlayed: 12, gameRecordDays: 7 }),
    ).toEqual({ days: 12, xpAwarded: 12 });
  });

  test.each([
    [0, 0],
    [1, 0],
    [2, 0],
    [3, 3],
    [4, 4],
    [49, 49],
    [50, 50],
    [51, 50],
    [80, 50],
    [100_000, 50],
  ])("%i days → %i XP", (days, xp) => {
    expect(
      tenureGrantForEvidence({ daysPlayed: days, gameRecordDays: 0 }).xpAwarded,
    ).toBe(xp);
    expect(
      tenureGrantForEvidence({ daysPlayed: 0, gameRecordDays: days }).xpAwarded,
    ).toBe(xp);
  });

  test("under the minimum still reports the day count", () => {
    expect(
      tenureGrantForEvidence({ daysPlayed: 2, gameRecordDays: 1 }),
    ).toEqual({
      days: 2,
      xpAwarded: 0,
    });
  });
});

describe("TenureEvidenceSchema / TenureGrantRequestSchema", () => {
  test("accepts zeros and the upper bound", () => {
    expect(
      TenureEvidenceSchema.safeParse({ daysPlayed: 0, gameRecordDays: 0 })
        .success,
    ).toBe(true);
    expect(
      TenureEvidenceSchema.safeParse({
        daysPlayed: 100_000,
        gameRecordDays: 100_000,
      }).success,
    ).toBe(true);
  });

  test.each([
    ["negative", { daysPlayed: -1, gameRecordDays: 0 }],
    ["non-integer", { daysPlayed: 1.5, gameRecordDays: 0 }],
    ["over 100000", { daysPlayed: 0, gameRecordDays: 100_001 }],
    ["a string", { daysPlayed: "5", gameRecordDays: 0 }],
    ["missing a count", { daysPlayed: 5 }],
    ["NaN", { daysPlayed: Number.NaN, gameRecordDays: 0 }],
    ["Infinity", { daysPlayed: Number.POSITIVE_INFINITY, gameRecordDays: 0 }],
  ])("rejects %s", (_label, evidence) => {
    expect(TenureEvidenceSchema.safeParse(evidence).success).toBe(false);
    expect(TenureGrantRequestSchema.safeParse({ evidence }).success).toBe(
      false,
    );
  });

  test("rejects a body with no evidence", () => {
    expect(TenureGrantRequestSchema.safeParse({}).success).toBe(false);
  });

  test("strips a client-sent amount and id, top level and inside evidence", () => {
    const parsed = TenureGrantRequestSchema.parse({
      xpAwarded: 999,
      yandexPlayerId: "yandex-1",
      playerId: "0b6f8a52-3c1e-4d7a-9f10-2a4b6c8d0e1f",
      evidence: { daysPlayed: 5, gameRecordDays: 2, xpAwarded: 999 },
    });
    expect(parsed).toEqual({ evidence: { daysPlayed: 5, gameRecordDays: 2 } });
  });
});

describe("TenureGrantResponseSchema", () => {
  test.each(["granted", "below_minimum", "duplicate"])(
    "accepts status %s",
    (status) => {
      expect(
        TenureGrantResponseSchema.safeParse({ status, xpAwarded: 0, xp: 7 })
          .success,
      ).toBe(true);
    },
  );

  test.each([
    ["an unknown status", { status: "window_closed", xpAwarded: 0, xp: 0 }],
    ["a negative amount", { status: "granted", xpAwarded: -1, xp: 0 }],
    ["a missing total", { status: "granted", xpAwarded: 5 }],
    ["a fractional total", { status: "granted", xpAwarded: 5, xp: 5.5 }],
  ])("rejects %s", (_label, body) => {
    expect(TenureGrantResponseSchema.safeParse(body).success).toBe(false);
  });
});
