import type { NextFunction, Request, Response } from "express";
import { internalAuth } from "../../src/profile-server/InternalAuth";

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
