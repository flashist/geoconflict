// Task 0506 (ADR-126 §4.3; owner ruling 2026-10-26: a source setting, not an env var).

import {
  CONSUME_PERMANENT_PURCHASES,
  consumePermanentBootLine,
} from "../../src/profile-server/ConsumePermanentSetting";

describe("ConsumePermanentSetting", () => {
  // Turning it on is a one-way door per purchase. If you are turning it on on
  // purpose (an owner decision), change this expectation in the same commit.
  it("ships OFF", () => {
    expect(CONSUME_PERMANENT_PURCHASES).toBe(false);
  });

  it("the boot line names the state and the file", () => {
    expect(consumePermanentBootLine(false)).toBe(
      "payments consume-permanent: OFF (ConsumePermanentSetting.ts)",
    );
    expect(consumePermanentBootLine(true)).toContain(
      "payments consume-permanent: ON",
    );
    expect(consumePermanentBootLine(true)).toContain("ONE-WAY");
  });
});
