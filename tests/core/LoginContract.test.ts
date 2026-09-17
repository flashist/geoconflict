// Contract test for the login wire codes (task 0274, S5).
//
// src/core/ changes must be tested (CLAUDE.md). The point of this file is small and
// specific: the error-code list the client may see from POST /v1/login is declared
// in ONE place, and `creation_paused` — the switch's 503, which S2 deliberately left
// undeclared — is now in it.

import {
  LOGIN_ERROR_CODES,
  SESSION_ERROR_CODES,
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
