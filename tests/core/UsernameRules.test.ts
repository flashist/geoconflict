// Rules extraction (task 0067). Two jobs:
//   1. cover the new dependency-free rule module (a src/core/ change — project rule), and
//   2. prove `validateUsername` is BYTE-IDENTICAL in behavior after the extraction:
//      same message keys, same params, same ordering. That regression guard is the
//      point — username.ts is shared game code used by GameRunner and PlayerImpl.

jest.mock("../../src/client/Utils", () => ({
  // Record the key AND the params so the parity assertions can check both.
  translateText: jest.fn(
    (key: string, params?: Record<string, unknown>) =>
      `${key}|${params ? JSON.stringify(params) : ""}`,
  ),
}));

import fs from "fs";
import path from "path";
import {
  MAX_USERNAME_LENGTH,
  MIN_USERNAME_LENGTH,
  checkUsernameRules,
  validUsernamePattern,
} from "../../src/core/validations/usernameRules";
import { validateUsername } from "../../src/core/validations/username";
import { translateText } from "../../src/client/Utils";

describe("checkUsernameRules", () => {
  it("is importable with NO client/game dependencies", () => {
    // The whole reason this module exists: the profile server imports it under
    // plain Node, where src/client/Utils dies with "customElements is not
    // defined". If this file ever grows such an import, this test still passes
    // (Utils is mocked above) — so assert the source itself stays import-free.
    const source = fs.readFileSync(
      path.join(__dirname, "../../src/core/validations/usernameRules.ts"),
      "utf8",
    );
    expect(source).not.toMatch(/^\s*import\s/m);
  });

  it("exposes the same limits the pre-extraction module did", () => {
    expect(MIN_USERNAME_LENGTH).toBe(3);
    expect(MAX_USERNAME_LENGTH).toBe(27);
  });

  it("returns null for valid names", () => {
    expect(checkUsernameRules("Good_Name123")).toBeNull();
    expect(checkUsernameRules("Привет123")).toBeNull();
    expect(checkUsernameRules("CatÜser")).toBeNull();
    expect(checkUsernameRules("[Clan] Tag")).toBeNull();
  });

  it("flags a non-string", () => {
    expect(checkUsernameRules(123)).toBe("not_string");
    expect(checkUsernameRules(null)).toBe("not_string");
    expect(checkUsernameRules(undefined)).toBe("not_string");
  });

  it("flags length violations at the boundaries", () => {
    expect(checkUsernameRules("a".repeat(MIN_USERNAME_LENGTH - 1))).toBe(
      "too_short",
    );
    expect(checkUsernameRules("a".repeat(MIN_USERNAME_LENGTH))).toBeNull();
    expect(checkUsernameRules("a".repeat(MAX_USERNAME_LENGTH))).toBeNull();
    expect(checkUsernameRules("a".repeat(MAX_USERNAME_LENGTH + 1))).toBe(
      "too_long",
    );
  });

  it("flags disallowed characters, including emoji", () => {
    expect(checkUsernameRules("Invalid!Name")).toBe("invalid_chars");
    expect(checkUsernameRules("Cat🐈User")).toBe("invalid_chars");
  });

  it("checks length BEFORE charset (ordering is load-bearing)", () => {
    // An over-long name full of invalid characters must report too_long, the
    // way the original sequence of ifs did.
    expect(checkUsernameRules("!".repeat(MAX_USERNAME_LENGTH + 1))).toBe(
      "too_long",
    );
  });

  it("exports the pattern the sanitizer shares", () => {
    expect(validUsernamePattern.test("ok")).toBe(true);
    expect(validUsernamePattern.test("!")).toBe(false);
  });
});

describe("validateUsername parity after the extraction", () => {
  beforeEach(() => jest.clearAllMocks());

  it("passes a valid name without translating anything", () => {
    expect(validateUsername("Good_Name123")).toEqual({ isValid: true });
    expect(translateText).not.toHaveBeenCalled();
  });

  it("uses username.not_string with NO params", () => {
    // @ts-expect-error: deliberately non-string, as tests/Censor.test.ts does
    expect(validateUsername(123).isValid).toBe(false);
    expect(translateText).toHaveBeenCalledWith("username.not_string");
    // Exactly one argument — the original called it without a params object.
    expect((translateText as jest.Mock).mock.calls[0]).toHaveLength(1);
  });

  it("uses username.too_short with {min}", () => {
    expect(validateUsername("ab").isValid).toBe(false);
    expect(translateText).toHaveBeenCalledWith("username.too_short", {
      min: MIN_USERNAME_LENGTH,
    });
  });

  it("uses username.too_long with {max}", () => {
    expect(validateUsername("a".repeat(MAX_USERNAME_LENGTH + 1)).isValid).toBe(
      false,
    );
    expect(translateText).toHaveBeenCalledWith("username.too_long", {
      max: MAX_USERNAME_LENGTH,
    });
  });

  it("uses username.invalid_chars with {max} — the param the text does not (yet) use", () => {
    expect(validateUsername("Invalid!Name").isValid).toBe(false);
    expect(translateText).toHaveBeenCalledWith("username.invalid_chars", {
      max: MAX_USERNAME_LENGTH,
    });
  });

  it("surfaces the translated string as `error`", () => {
    expect(validateUsername("ab").error).toBe(
      `username.too_short|{"min":${MIN_USERNAME_LENGTH}}`,
    );
  });
});
