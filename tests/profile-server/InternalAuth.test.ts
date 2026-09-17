import type { NextFunction, Request, Response } from "express";
import {
  internalAuth,
  tokensMatch,
} from "../../src/profile-server/InternalAuth";

function fakeReq(authHeader?: string): Request {
  return {
    get: (name: string) =>
      name.toLowerCase() === "authorization" ? authHeader : undefined,
  } as unknown as Request;
}

function fakeRes(): Response & { statusCode?: number; body?: unknown } {
  const res: Partial<Response> & { statusCode?: number; body?: unknown } = {};
  res.status = ((code: number) => {
    res.statusCode = code;
    return res as Response;
  }) as Response["status"];
  res.json = ((payload: unknown) => {
    res.body = payload;
    return res as Response;
  }) as Response["json"];
  return res as Response & { statusCode?: number; body?: unknown };
}

describe("internalAuth", () => {
  const ORIGINAL = process.env.PROFILE_INTERNAL_TOKEN;
  afterEach(() => {
    process.env.PROFILE_INTERNAL_TOKEN = ORIGINAL;
  });

  test("calls next() with the correct bearer token", () => {
    process.env.PROFILE_INTERNAL_TOKEN = "secret-token";
    const next = jest.fn() as NextFunction;
    const res = fakeRes();
    internalAuth(fakeReq("Bearer secret-token"), res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBeUndefined();
  });

  test("401 on a wrong token", () => {
    process.env.PROFILE_INTERNAL_TOKEN = "secret-token";
    const next = jest.fn() as NextFunction;
    const res = fakeRes();
    internalAuth(fakeReq("Bearer nope"), res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
  });

  test("401 on a missing header", () => {
    process.env.PROFILE_INTERNAL_TOKEN = "secret-token";
    const next = jest.fn() as NextFunction;
    const res = fakeRes();
    internalAuth(fakeReq(undefined), res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
  });

  test("fails closed: 401 when the env token is empty/unset", () => {
    delete process.env.PROFILE_INTERNAL_TOKEN;
    const next = jest.fn() as NextFunction;
    const res = fakeRes();
    internalAuth(fakeReq("Bearer anything"), res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
  });
});

// Task 0277 step 4. `tokensMatch` is exported so a second shared-secret check can
// reuse the SAME comparison instead of growing a parallel one. ADR-114 lists "one
// more place a fail-closed check must be right" as an accepted cost; exporting the
// existing one removes that cost rather than accepting it.
describe("tokensMatch (exported for reuse — task 0277)", () => {
  test("true only for an exact match", () => {
    expect(tokensMatch("abc123", "abc123")).toBe(true);
  });

  test("false for a same-length mismatch", () => {
    expect(tokensMatch("abc124", "abc123")).toBe(false);
  });

  // ⚠️ THE mutation this file exists to catch: dropping the length guard.
  // timingSafeEqual THROWS on a length mismatch, so without the guard a
  // wrong-LENGTH secret becomes a 500 instead of a 401 — a crash-shaped oracle
  // that tells an attacker their guess was the wrong length.
  test.each([
    ["shorter", "abc"],
    ["longer", "abc123456"],
    ["empty", ""],
  ])("false, WITHOUT throwing, for a %s provided token", (_label, provided) => {
    expect(() => tokensMatch(provided, "abc123")).not.toThrow();
    expect(tokensMatch(provided, "abc123")).toBe(false);
  });

  // ⚠️ Review R1. The length guard must count UTF-8 BYTES, because timingSafeEqual
  // compares Buffers. A wrong secret of equal STRING length containing any non-ASCII
  // character has a different byte length, so a string-length guard lets it through to
  // timingSafeEqual, which THROWS RangeError. In the alert relay that surfaces as a
  // 500 instead of the contracted 200 — and the out-of-band alarm never fires, so the
  // one input class the alarm exists for becomes silent.
  test.each([
    ["a two-byte character", "abcdeé"],
    ["a leading two-byte character", "ábcdef"],
    ["a four-byte emoji", "abcd🚀"],
  ])(
    "false, WITHOUT throwing, for an equal-string-length token containing %s",
    (_label, provided) => {
      expect(() => tokensMatch(provided, "abcdef")).not.toThrow();
      expect(tokensMatch(provided, "abcdef")).toBe(false);
    },
  );

  test("still true for an exact non-ASCII match", () => {
    expect(tokensMatch("sëcrét-ключ", "sëcrét-ключ")).toBe(true);
  });

  // Fails CLOSED: an unconfigured secret rejects everything, including "".
  test.each([
    ["an empty provided token", ""],
    ["any provided token", "anything"],
  ])("false when the EXPECTED token is empty, given %s", (_label, provided) => {
    expect(tokensMatch(provided, "")).toBe(false);
  });
});
