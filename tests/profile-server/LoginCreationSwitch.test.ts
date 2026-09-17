// Unit tests for the login-creation switch parser (task 0274, S5; owner ruling D3).
//
// The switch is the incident lever: with it OFF, POST /v1/login stops creating
// players. The parse rule owner-ruled in D3 is deliberately fail-OPEN — an
// unrecognised value means creation stays ON and says so loudly, because a typo
// that silently paused every new player would be worse than a typo that is merely
// noisy.

import {
  parseLoginCreateEnabled,
  type SwitchLogger,
} from "../../src/profile-server/LoginCreationSwitch";

function fakeLog(): SwitchLogger & { warnings: string[] } {
  const warnings: string[] = [];
  return { warnings, warn: (message: string) => warnings.push(message) };
}

describe("parseLoginCreateEnabled", () => {
  test.each<[string, string | undefined]>([
    ["undefined (never set)", undefined],
    ["empty", ""],
    ["whitespace only", "   "],
  ])("%s → ON, no warning", (_label, raw) => {
    const log = fakeLog();
    expect(parseLoginCreateEnabled(raw, log)).toBe(true);
    expect(log.warnings).toEqual([]);
  });

  test.each<[string, boolean]>([
    ["true", true],
    ["TRUE", true],
    ["True", true],
    ["  true  ", true],
    ["false", false],
    ["FALSE", false],
    ["False", false],
    ["  false  ", false],
  ])("%s → %s, no warning", (raw, expected) => {
    const log = fakeLog();
    expect(parseLoginCreateEnabled(raw, log)).toBe(expected);
    expect(log.warnings).toEqual([]);
  });

  test.each(["0", "1", "no", "yes", "off", "on", "falsch", "flase"])(
    "unknown value %p → ON with a loud warning (owner ruling D3)",
    (raw) => {
      const log = fakeLog();
      expect(parseLoginCreateEnabled(raw, log)).toBe(true);
      expect(log.warnings).toHaveLength(1);
      expect(log.warnings[0]).toContain("PROFILE_LOGIN_CREATE_ENABLED");
      expect(log.warnings[0]).toContain("ENABLED");
    },
  );

  test("the warning quotes the unrecognised value so the operator can see the typo", () => {
    const log = fakeLog();
    parseLoginCreateEnabled("flase", log);
    expect(log.warnings[0]).toContain("flase");
  });
});
