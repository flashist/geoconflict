import {
  CITIZENSHIP_XP_THRESHOLD,
  TENURE_MIN_DAYS,
  TENURE_XP_CAP,
  TENURE_XP_PER_DAY,
  XP_PER_MATCH,
  isCitizenFromXp,
} from "../../../src/core/profile/Citizenship";

describe("Citizenship rules", () => {
  // ADR-111 / task 0211: rescaled 1,000 → 100 and 10 → 1, divided by EXACTLY 10 so
  // the number of qualifying matches a player must play is unchanged. `1` is a
  // deliberate floor: awards move UP, never down, without reopening ADR-111.
  test("constants are the agreed values", () => {
    expect(CITIZENSHIP_XP_THRESHOLD).toBe(100);
    expect(XP_PER_MATCH).toBe(1);
  });

  test("the rescale kept the number of qualifying matches unchanged", () => {
    expect(CITIZENSHIP_XP_THRESHOLD / XP_PER_MATCH).toBe(100);
  });

  // Task 0253 / ADR-112 (amended 2026-09-15): 1 XP per day, cap 50, minimum 3.
  test("tenure grant constants are the ruled values", () => {
    expect(TENURE_XP_PER_DAY).toBe(1);
    expect(TENURE_XP_CAP).toBe(50);
    expect(TENURE_MIN_DAYS).toBe(3);
  });

  test("a tenure grant alone can never reach the citizenship threshold", () => {
    expect(TENURE_XP_CAP).toBeLessThan(CITIZENSHIP_XP_THRESHOLD);
  });

  test("isCitizenFromXp flips exactly at the threshold", () => {
    expect(isCitizenFromXp(0)).toBe(false);
    expect(isCitizenFromXp(99)).toBe(false);
    expect(isCitizenFromXp(100)).toBe(true);
    expect(isCitizenFromXp(101)).toBe(true);
  });
});
