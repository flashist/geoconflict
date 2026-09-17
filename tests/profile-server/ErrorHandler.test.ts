// The profile server's last-resort error handler (task 0271, review R1 + R4).
// Client errors keep their own 4xx status and are not logged; only a genuinely
// unknown error is a 500 with a name-only log line; a response already on the wire
// is cut off by destroying the socket (review R5) — never handed to Express's
// final handler, which would print err.stack.

import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import { Writable } from "stream";
import request from "supertest";
import winston from "winston";
import { logger } from "../../src/profile-server/Logger";
import {
  createApp,
  profileErrorHandler,
  type ProfileRepo,
} from "../../src/profile-server/Routes";

const SECRET = "0271-error-handler-secret-0123456789abc";

function mockRepo(): ProfileRepo {
  return {
    ping: jest.fn().mockResolvedValue(undefined),
    getProfile: jest.fn().mockResolvedValue(null),
    creditMatchXp: jest.fn(),
    findPlayerByIdentity: jest.fn().mockResolvedValue(null),
    resolveExistingPlayer: jest.fn().mockResolvedValue(null),
    resolveOrCreatePlayer: jest.fn(),
    hasXpGrant: jest.fn().mockResolvedValue(false),
  };
}

/** Captures every line the profile logger writes while `fn` runs. */
async function captureLogs(fn: () => Promise<void>): Promise<string> {
  const chunks: string[] = [];
  const capture = new winston.transports.Stream({
    stream: new Writable({
      write(chunk, _encoding, callback) {
        chunks.push(String(chunk));
        callback();
      },
    }),
  });
  logger.add(capture);
  try {
    await fn();
  } finally {
    logger.remove(capture);
  }
  return chunks.join("\n");
}

function mockRes(headersSent = false) {
  const res = {
    headersSent,
    set: jest.fn(),
    status: jest.fn(),
    json: jest.fn(),
    end: jest.fn(),
    destroy: jest.fn(),
  };
  res.set.mockReturnValue(res);
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res;
}

function run(err: unknown, res = mockRes(), path = "/v1/login") {
  const next = jest.fn();
  profileErrorHandler(
    err,
    { method: "POST", path } as Request,
    res as unknown as Response,
    next as NextFunction,
  );
  return { res, next };
}

describe("profileErrorHandler — over HTTP (body-parser client errors keep their 4xx)", () => {
  const app = () =>
    createApp(mockRepo(), undefined, undefined, undefined, { secret: SECRET });

  test.each([
    [
      "an unsupported charset",
      { "Content-Type": "application/json; charset=latin1" },
    ],
    [
      "an unsupported Content-Encoding",
      { "Content-Type": "application/json", "Content-Encoding": "br" },
    ],
  ])(
    "%s on a public route → 415 JSON, readable cross-origin, not logged",
    async (_label, headers) => {
      let status = 0;
      let body: unknown;
      let acao: string | undefined;
      const logs = await captureLogs(async () => {
        const res = await request(app())
          .post("/v1/login")
          .set(headers)
          .send('{"platform":"yandex_games","platformUserId":"zz0271"}');
        status = res.status;
        body = res.body;
        acao = res.headers["access-control-allow-origin"];
      });
      expect(status).toBe(415);
      expect(body).toEqual({ error: "unsupported_media_type" });
      expect(acao).toBe("*");
      // R6: nothing at all is logged — not merely no "unhandled error" prefix.
      expect(logs).not.toContain("zz0271");
      expect(logs.trim()).toBe("");
    },
  );

  test("an unsupported charset on /internal/* → 415 with no CORS header", async () => {
    const res = await request(app())
      .post("/internal/v1/credit")
      .set("Content-Type", "application/json; charset=latin1")
      .send("{}");
    expect(res.status).toBe(415);
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });
});

describe("profileErrorHandler — unit", () => {
  test.each([
    [
      "request.aborted (status 400)",
      { status: 400, type: "request.aborted" },
      400,
      "bad_request",
    ],
    [
      "request.size.invalid (statusCode 400)",
      { statusCode: 400, type: "request.size.invalid" },
      400,
      "bad_request",
    ],
    [
      "entity.parse.failed",
      { status: 400, type: "entity.parse.failed" },
      400,
      "bad_request",
    ],
    [
      "entity.too.large",
      { status: 413, type: "entity.too.large" },
      413,
      "payload_too_large",
    ],
    [
      "entity.verify.failed (403)",
      { status: 403, type: "entity.verify.failed" },
      403,
      "bad_request",
    ],
  ])(
    "%s → its own status, not logged",
    async (_label, fields, status, code) => {
      let outcome: ReturnType<typeof run> | undefined;
      const logs = await captureLogs(async () => {
        outcome = run(
          Object.assign(new Error("client said 0271-secret-detail"), fields),
        );
      });
      expect(outcome?.res.status).toHaveBeenCalledWith(status);
      expect(outcome?.res.json).toHaveBeenCalledWith({ error: code });
      expect(outcome?.next).not.toHaveBeenCalled();
      // R6: nothing at all is logged — the planted message under no prefix either.
      expect(logs).not.toContain("0271-secret-detail");
      expect(logs.trim()).toBe("");
    },
  );

  test.each([
    ["an error with no status", new TypeError("boom 0271-secret-detail")],
    [
      "an error with a 5xx status",
      Object.assign(new Error("0271-secret-detail"), {
        status: 500,
        type: "stream.encoding.set",
      }),
    ],
    ["a non-Error throw", "0271-secret-detail"],
  ])("%s → 500 internal_error, logged by NAME only", async (_label, err) => {
    let outcome: ReturnType<typeof run> | undefined;
    const logs = await captureLogs(async () => {
      outcome = run(err);
    });
    expect(outcome?.res.status).toHaveBeenCalledWith(500);
    expect(outcome?.res.json).toHaveBeenCalledWith({ error: "internal_error" });
    expect(logs).toContain("unhandled error on POST /v1/login");
    expect(logs).not.toContain("0271-secret-detail");
  });

  test("headers already sent → the connection is destroyed and the error logged by NAME, never next(err)", async () => {
    let outcome: ReturnType<typeof run> | undefined;
    const logs = await captureLogs(async () => {
      outcome = run(
        new RangeError("mid-stream 0271-secret-detail"),
        mockRes(true),
      );
    });
    expect(outcome?.res.destroy).toHaveBeenCalled();
    expect(outcome?.next).not.toHaveBeenCalled();
    expect(outcome?.res.end).not.toHaveBeenCalled();
    expect(outcome?.res.status).not.toHaveBeenCalled();
    expect(logs).toContain("unhandled error on POST /v1/login: RangeError");
    expect(logs).not.toContain("0271-secret-detail");
  });

  // ── Task 0276: the /internal check must be case-insensitive ────────────────
  // `req.path` preserves the request's ORIGINAL case, so `/INTERNAL/v1/credit`
  // used to slip past `startsWith("/internal/")` and get `Access-Control-Allow-
  // Origin: *` — a cross-origin page could read a body-parser 400/413/415 from a
  // case-variant internal path.
  //
  // ⚠️ Deliberately UNIT-level. Once `case sensitive routing` is on (task 0276),
  // a case-variant path 404s BEFORE the body parser runs, so this branch is
  // unreachable over HTTP through this app and an HTTP test here would assert
  // nothing. The fix is defensive: it survives a future revert of the routing
  // setting. It is NOT a fix for an exploitable leak — do not read it as one.
  const CLIENT_ERROR = { status: 400, type: "entity.parse.failed" };

  test.each(["/INTERNAL/v1/credit", "/Internal/v1/credit"])(
    "%s gets NO CORS header (the case variant is still an internal path)",
    (path) => {
      const { res } = run(
        Object.assign(new Error("x"), CLIENT_ERROR),
        mockRes(),
        path,
      );
      expect(res.set).not.toHaveBeenCalledWith(
        "Access-Control-Allow-Origin",
        "*",
      );
    },
  );

  test("exact lowercase /internal/* still gets no CORS header", () => {
    const { res } = run(
      Object.assign(new Error("x"), CLIENT_ERROR),
      mockRes(),
      "/internal/v1/credit",
    );
    expect(res.set).not.toHaveBeenCalledWith(
      "Access-Control-Allow-Origin",
      "*",
    );
  });

  // Guards the other direction: lowercasing must not turn this into a
  // public-route allowlist that withholds CORS from everything.
  test("a public path still gets the CORS header", () => {
    const { res } = run(
      Object.assign(new Error("x"), CLIENT_ERROR),
      mockRes(),
      "/v1/login",
    );
    expect(res.set).toHaveBeenCalledWith("Access-Control-Allow-Origin", "*");
  });
});

describe("profileErrorHandler — headers already sent, through real Express (review R5)", () => {
  test("a half-written response is cut off, and no stack or message reaches stderr", async () => {
    const app = express();
    // Production shape: Express's final handler prints err.stack unless env is "test".
    app.set("env", "development");
    app.get("/partial", (_req, res, next) => {
      res.status(200).write("partial-body");
      next(new Error("mid-stream 0271-secret-detail"));
    });
    app.use(profileErrorHandler);

    const consoleError = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    try {
      let completed = false;
      const logs = await captureLogs(async () => {
        await request(app)
          .get("/partial")
          .then(
            () => {
              completed = true;
            },
            () => {
              completed = false;
            },
          );
      });
      // The client never sees a cleanly finished response.
      expect(completed).toBe(false);
      const stderr = consoleError.mock.calls
        .map((call) => call.map(String).join(" "))
        .join("\n");
      expect(stderr).not.toContain("0271-secret-detail");
      expect(logs).toContain("unhandled error on GET /partial: Error");
      expect(logs).not.toContain("0271-secret-detail");
    } finally {
      consoleError.mockRestore();
    }
  });
});
