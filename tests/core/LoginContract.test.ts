// Contract test for the login wire codes (task 0274, S5).
//
// src/core/ changes must be tested (CLAUDE.md). The point of this file is small and
// specific: the error-code list the client may see from POST /v1/login is declared
// in ONE place, and `creation_paused` — the switch's 503, which S2 deliberately left
// undeclared — is now in it.

import {
  LOGIN_ERROR_CODES,
  LoginRequestSchema,
  SESSION_ERROR_CODES,
  SIGNATURE_MAX,
  type LoginErrorCode,
} from "../../src/core/profile/LoginContract";

describe("LOGIN_ERROR_CODES", () => {
  test("declares exactly the codes POST /v1/login can answer", () => {
    expect([...LOGIN_ERROR_CODES].sort()).toEqual([
      "bad_request",
      "creation_paused",
      "internal_error",
      "session_unavailable",
    ]);
  });

  test("creation_paused is present — S5's switch answer is no longer undeclared", () => {
    const code: LoginErrorCode = "creation_paused";
    expect(LOGIN_ERROR_CODES).toContain(code);
  });

  test("the 401 session codes stay in SESSION_ERROR_CODES — login itself never answers them", () => {
    expect(SESSION_ERROR_CODES).toContain("session_expired");
    expect(SESSION_ERROR_CODES).toContain("session_invalid");
    expect(LOGIN_ERROR_CODES).not.toContain(
      "session_expired" as unknown as LoginErrorCode,
    );
    expect(LOGIN_ERROR_CODES).not.toContain(
      "session_invalid" as unknown as LoginErrorCode,
    );
  });

  test("session_unavailable is the one code both lists carry (the same 503, reachable two ways)", () => {
    expect(SESSION_ERROR_CODES).toContain("session_unavailable");
    expect(LOGIN_ERROR_CODES).toContain("session_unavailable");
  });
});

// Task 0325, S2: the optional signed-player-data field. All values synthetic.
describe("LoginRequestSchema — signature (task 0325)", () => {
  const base = { platform: "yandex_games", platformUserId: "synthetic-user" };

  test("SIGNATURE_MAX is the approved bound: max(4 × 733, 2048) = 2932", () => {
    expect(SIGNATURE_MAX).toBe(2932);
  });

  test("an old body with no signature still parses, and carries none", () => {
    const parsed = LoginRequestSchema.safeParse(base);
    expect(parsed.success).toBe(true);
    expect(parsed.success && "signature" in parsed.data).toBe(false);
  });

  test("a valid signature parses and is kept", () => {
    const parsed = LoginRequestSchema.safeParse({
      ...base,
      signature: "c2lnbmF0dXJl.eyJ9",
    });
    expect(parsed.success && parsed.data.signature).toBe("c2lnbmF0dXJl.eyJ9");
  });

  test("a signature of exactly SIGNATURE_MAX characters parses", () => {
    expect(
      LoginRequestSchema.safeParse({
        ...base,
        signature: "a".repeat(SIGNATURE_MAX),
      }).success,
    ).toBe(true);
  });

  test('an empty-string signature is rejected — the client omits the key instead of sending ""', () => {
    expect(
      LoginRequestSchema.safeParse({ ...base, signature: "" }).success,
    ).toBe(false);
  });

  test("an over-bound signature is rejected", () => {
    expect(
      LoginRequestSchema.safeParse({
        ...base,
        signature: "a".repeat(SIGNATURE_MAX + 1),
      }).success,
    ).toBe(false);
  });

  test("a non-string signature is rejected", () => {
    expect(
      LoginRequestSchema.safeParse({ ...base, signature: 123 }).success,
    ).toBe(false);
  });

  test("an unknown extra key is still stripped (the schema is not strict)", () => {
    const parsed = LoginRequestSchema.safeParse({ ...base, extra: "x" });
    expect(parsed.success).toBe(true);
    expect(parsed.success && "extra" in parsed.data).toBe(false);
  });
});
