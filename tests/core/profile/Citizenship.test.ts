import {
  CITIZENSHIP_XP_THRESHOLD,
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

  test("isCitizenFromXp flips exactly at the threshold", () => {
    expect(isCitizenFromXp(0)).toBe(false);
    expect(isCitizenFromXp(99)).toBe(false);
    expect(isCitizenFromXp(100)).toBe(true);
    expect(isCitizenFromXp(101)).toBe(true);
  });
});
