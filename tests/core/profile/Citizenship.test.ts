import {
  CITIZENSHIP_XP_THRESHOLD,
  XP_PER_MATCH,
  isCitizenFromXp,
} from "../../../src/core/profile/Citizenship";

describe("Citizenship rules", () => {
  test("constants are the agreed values", () => {
    expect(CITIZENSHIP_XP_THRESHOLD).toBe(1000);
    expect(XP_PER_MATCH).toBe(10);
  });

  test("isCitizenFromXp flips exactly at the threshold", () => {
    expect(isCitizenFromXp(0)).toBe(false);
    expect(isCitizenFromXp(999)).toBe(false);
    expect(isCitizenFromXp(1000)).toBe(true);
    expect(isCitizenFromXp(1001)).toBe(true);
  });
});
