// Route tests for the tenure XP grant (task 0253; ADR-112 as amended by the
// 2026-09-15 redesign) over a mocked TenureGrantRepo — the NameChangeRoutes
// harness. supertest-based, so this suite is part of the known supertest flake
// family (CLAUDE.md, "Known flake").

// Every log line the routes write, so the suite can prove no id, token or
// evidence value reaches the container log.
const logLines: string[] = [];
jest.mock("../../src/profile-server/Logger", () => {
  const record =
    () =>
    (...args: unknown[]): void => {
      logLines.push(args.map((arg) => String(arg)).join(" "));
    };
  const child = () => ({
    info: record(),
    warn: record(),
    error: record(),
    child,
  });
  return {
    logger: { child },
    formatError: (error: unknown) => String(error),
  };
});

import request from "supertest";
import type { TenureCheckOutcome } from "../../src/profile-server/PlayerProfileRepository";
import {
  createApp,
  type ProfileRepo,
  type TenureGrantRepo,
} from "../../src/profile-server/Routes";
import {
  noopProfileMetrics,
  type ProfileMetrics,
  type TenureClaimOutcome,
} from "../../src/profile-server/Telemetry";
import { TEST_SESSION_CONFIG, bearerFor } from "./support/sessionToken";

const PATH = "/v1/profile/tenure-grant";
const PLAYER_ID = "0b6f8a52-3c1e-4d7a-9f10-2a4b6c8d0e1f";
const CALLER = bearerFor(PLAYER_ID);

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

function outcome(
  overrides: Partial<TenureCheckOutcome> = {},
): TenureCheckOutcome {
  return {
    status: "granted",
    xpAwarded: 12,
    xp: 20,
    citizenshipNewlyGranted: false,
    ...overrides,
  };
}

function mockTenureGrant(
  result: TenureCheckOutcome | Error = outcome(),
): TenureGrantRepo & { recordTenureCheck: jest.Mock } {
  const recordTenureCheck = jest.fn();
  if (result instanceof Error) {
    recordTenureCheck.mockRejectedValue(result);
  } else {
    recordTenureCheck.mockResolvedValue(result);
  }
  return { recordTenureCheck };
}

function recordingMetrics(): {
  metrics: ProfileMetrics;
  tenure: TenureClaimOutcome[];
} {
  const tenure: TenureClaimOutcome[] = [];
  return {
    metrics: {
      ...noopProfileMetrics,
      tenureClaim: (value) => tenure.push(value),
    },
    tenure,
  };
}

/** `null` tenureGrant = build the app WITHOUT one (fail-closed path). */
function appWith(
  tenureGrant: TenureGrantRepo | null = mockTenureGrant(),
  options: {
    metrics?: ProfileMetrics;
    session?: { secret: string } | undefined;
  } = {},
) {
  return createApp(
    mockRepo(),
    undefined,
    undefined,
    undefined,
    "session" in options ? options.session : TEST_SESSION_CONFIG,
    {
      metrics: options.metrics,
      ...(tenureGrant === null ? {} : { tenureGrant }),
    },
  );
}

const EVIDENCE = { daysPlayed: 12, gameRecordDays: 4 };

describe("POST /v1/profile/tenure-grant", () => {
  beforeEach(() => {
    logLines.length = 0;
  });

  describe("200 answers", () => {
    it("granted: the repository gets the caller's id and the SERVER-computed amount", async () => {
      const tenureGrant = mockTenureGrant(outcome({ xpAwarded: 12, xp: 20 }));
      await request(appWith(tenureGrant))
        .post(PATH)
        .set("Authorization", CALLER)
        .send({ evidence: EVIDENCE })
        .expect(200, { status: "granted", xpAwarded: 12, xp: 20 });
      expect(tenureGrant.recordTenureCheck).toHaveBeenCalledWith(
        PLAYER_ID,
        12,
        EVIDENCE,
      );
    });

    it("below_minimum: a 2-day claim is still checked, with 0 XP", async () => {
      const tenureGrant = mockTenureGrant(
        outcome({ status: "below_minimum", xpAwarded: 0, xp: 7 }),
      );
      await request(appWith(tenureGrant))
        .post(PATH)
        .set("Authorization", CALLER)
        .send({ evidence: { daysPlayed: 2, gameRecordDays: 1 } })
        .expect(200, { status: "below_minimum", xpAwarded: 0, xp: 7 });
      expect(tenureGrant.recordTenureCheck).toHaveBeenCalledWith(PLAYER_ID, 0, {
        daysPlayed: 2,
        gameRecordDays: 1,
      });
    });

    it("duplicate carries the stored amount", async () => {
      const tenureGrant = mockTenureGrant(
        outcome({ status: "duplicate", xpAwarded: 30, xp: 45 }),
      );
      await request(appWith(tenureGrant))
        .post(PATH)
        .set("Authorization", CALLER)
        .send({ evidence: EVIDENCE })
        .expect(200, { status: "duplicate", xpAwarded: 30, xp: 45 });
    });

    it("the response never carries citizenshipNewlyGranted or any id", async () => {
      const tenureGrant = mockTenureGrant(
        outcome({ citizenshipNewlyGranted: true, xpAwarded: 50, xp: 110 }),
      );
      const res = await request(appWith(tenureGrant))
        .post(PATH)
        .set("Authorization", CALLER)
        .send({ evidence: { daysPlayed: 80, gameRecordDays: 0 } })
        .expect(200);
      expect(res.body).toEqual({ status: "granted", xpAwarded: 50, xp: 110 });
    });

    it("ignores a client-sent amount and id — the server computes and resolves them", async () => {
      const tenureGrant = mockTenureGrant();
      await request(appWith(tenureGrant))
        .post(PATH)
        .set("Authorization", CALLER)
        .send({
          xpAwarded: 999,
          playerId: "11111111-1111-4111-8111-111111111111",
          yandexPlayerId: "yandex-other",
          evidence: { daysPlayed: 80, gameRecordDays: 3, xpAwarded: 999 },
        })
        .expect(200);
      expect(tenureGrant.recordTenureCheck).toHaveBeenCalledWith(
        PLAYER_ID,
        50,
        { daysPlayed: 80, gameRecordDays: 3 },
      );
    });

    it("forged counts are capped at 50 (verification 10)", async () => {
      const tenureGrant = mockTenureGrant();
      await request(appWith(tenureGrant))
        .post(PATH)
        .set("Authorization", CALLER)
        .send({ evidence: { daysPlayed: 100_000, gameRecordDays: 100_000 } })
        .expect(200);
      expect(tenureGrant.recordTenureCheck.mock.calls[0][1]).toBe(50);
    });
  });

  describe("refusals", () => {
    it.each([
      ["an empty body", {}],
      ["no evidence", { daysPlayed: 5, gameRecordDays: 5 }],
      ["a string count", { evidence: { daysPlayed: "12", gameRecordDays: 0 } }],
      ["a negative count", { evidence: { daysPlayed: -1, gameRecordDays: 0 } }],
      [
        "a count over 100000",
        { evidence: { daysPlayed: 100_001, gameRecordDays: 0 } },
      ],
      [
        "a fractional count",
        { evidence: { daysPlayed: 1.5, gameRecordDays: 0 } },
      ],
    ])("400 on %s, without touching the repository", async (_label, body) => {
      const tenureGrant = mockTenureGrant();
      await request(appWith(tenureGrant))
        .post(PATH)
        .set("Authorization", CALLER)
        .send(body)
        .expect(400, { error: "bad_request" });
      expect(tenureGrant.recordTenureCheck).not.toHaveBeenCalled();
    });

    it("401 session_invalid with no token", async () => {
      const tenureGrant = mockTenureGrant();
      await request(appWith(tenureGrant))
        .post(PATH)
        .send({ evidence: EVIDENCE })
        .expect(401, { error: "session_invalid" });
      expect(tenureGrant.recordTenureCheck).not.toHaveBeenCalled();
    });

    it("401 session_invalid with a bad token", async () => {
      const tenureGrant = mockTenureGrant();
      await request(appWith(tenureGrant))
        .post(PATH)
        .set(
          "Authorization",
          bearerFor(PLAYER_ID, {
            secret: "some-other-secret-0123456789abcdefghij",
          }),
        )
        .send({ evidence: EVIDENCE })
        .expect(401, { error: "session_invalid" });
      expect(tenureGrant.recordTenureCheck).not.toHaveBeenCalled();
    });

    it("401 session_expired with an expired token", async () => {
      await request(appWith())
        .post(PATH)
        .set(
          "Authorization",
          bearerFor(PLAYER_ID, { nowMs: Date.now() - 48 * 60 * 60 * 1000 }),
        )
        .send({ evidence: EVIDENCE })
        .expect(401, { error: "session_expired" });
    });

    it("503 session_unavailable when no usable session secret is configured", async () => {
      const tenureGrant = mockTenureGrant();
      await request(appWith(tenureGrant, { session: undefined }))
        .post(PATH)
        .set("Authorization", CALLER)
        .send({ evidence: EVIDENCE })
        .expect(503, { error: "session_unavailable" });
      expect(tenureGrant.recordTenureCheck).not.toHaveBeenCalled();
    });

    it("503 tenure_grant_unavailable when the route is not wired", async () => {
      await request(appWith(null))
        .post(PATH)
        .set("Authorization", CALLER)
        .send({ evidence: EVIDENCE })
        .expect(503, { error: "tenure_grant_unavailable" });
    });

    it("404 not_found when the token's player is gone", async () => {
      await request(
        appWith(
          mockTenureGrant(
            outcome({ status: "not_found", xpAwarded: 0, xp: 0 }),
          ),
        ),
      )
        .post(PATH)
        .set("Authorization", CALLER)
        .send({ evidence: EVIDENCE })
        .expect(404, { error: "not_found" });
    });

    it("500 internal_error when the repository throws", async () => {
      await request(appWith(mockTenureGrant(new Error("db down"))))
        .post(PATH)
        .set("Authorization", CALLER)
        .send({ evidence: EVIDENCE })
        .expect(500, { error: "internal_error" });
    });
  });

  describe("CORS", () => {
    it("OPTIONS preflight → 204 with the CORS headers, Authorization included", async () => {
      const tenureGrant = mockTenureGrant();
      const res = await request(appWith(tenureGrant)).options(PATH).expect(204);
      expect(res.headers["access-control-allow-origin"]).toBe("*");
      expect(res.headers["access-control-allow-methods"]).toBe("POST");
      expect(res.headers["access-control-allow-headers"]).toBe(
        "Content-Type, Authorization",
      );
      expect(tenureGrant.recordTenureCheck).not.toHaveBeenCalled();
    });

    it("the CORS header is on errors too, so the browser can read them", async () => {
      const res = await request(appWith(null))
        .post(PATH)
        .send({ evidence: EVIDENCE })
        .expect(503);
      expect(res.headers["access-control-allow-origin"]).toBe("*");
      const unauthorized = await request(appWith())
        .post(PATH)
        .send({ evidence: EVIDENCE })
        .expect(401);
      expect(unauthorized.headers["access-control-allow-origin"]).toBe("*");
    });
  });

  it("has no rate limiter — many requests from one IP are never 429 (owner ruling)", async () => {
    const tenureGrant = mockTenureGrant(
      outcome({ status: "duplicate", xpAwarded: 12, xp: 20 }),
    );
    const app = appWith(tenureGrant);
    for (let i = 0; i < 80; i++) {
      const res = await request(app)
        .post(PATH)
        .set("Authorization", CALLER)
        .send({ evidence: EVIDENCE });
      expect(res.status).toBe(200);
      expect(res.headers["ratelimit-limit"]).toBeUndefined();
    }
    expect(tenureGrant.recordTenureCheck).toHaveBeenCalledTimes(80);
  });

  describe("metrics — tenureClaim recorded exactly once per request", () => {
    async function claimWith(
      tenureGrant: TenureGrantRepo | null,
      send: (app: ReturnType<typeof createApp>) => Promise<unknown>,
      session: { secret: string } | undefined = TEST_SESSION_CONFIG,
    ): Promise<TenureClaimOutcome[]> {
      const { metrics, tenure } = recordingMetrics();
      await send(appWith(tenureGrant, { metrics, session }));
      return tenure;
    }

    const post =
      (auth: string | null, body: unknown = { evidence: EVIDENCE }) =>
      (app: ReturnType<typeof createApp>) => {
        const req = request(app).post(PATH);
        return (auth === null ? req : req.set("Authorization", auth)).send(
          body as object,
        );
      };

    it.each(["granted", "below_minimum", "duplicate", "not_found"] as const)(
      "%s",
      async (status) => {
        expect(
          await claimWith(mockTenureGrant(outcome({ status })), post(CALLER)),
        ).toEqual([status]);
      },
    );

    it("bad_request", async () => {
      expect(
        await claimWith(mockTenureGrant(), post(CALLER, { evidence: {} })),
      ).toEqual(["bad_request"]);
    });

    it("unauthorized", async () => {
      expect(await claimWith(mockTenureGrant(), post(null))).toEqual([
        "unauthorized",
      ]);
    });

    it("unavailable — no session secret", async () => {
      expect(
        // An empty secret is refused by isUsableSessionSecret ⇒ 503.
        await claimWith(mockTenureGrant(), post(CALLER), { secret: "" }),
      ).toEqual(["unavailable"]);
    });

    it("unavailable — the route is not wired", async () => {
      expect(await claimWith(null, post(CALLER))).toEqual(["unavailable"]);
    });

    it("error", async () => {
      expect(
        await claimWith(mockTenureGrant(new Error("db down")), post(CALLER)),
      ).toEqual(["error"]);
    });

    it("a preflight records nothing", async () => {
      expect(
        await claimWith(mockTenureGrant(), (app) =>
          request(app)
            .options(PATH)
            .then(() => undefined),
        ),
      ).toEqual([]);
    });
  });

  it("never logs the player id, the token or the evidence values", async () => {
    const token = CALLER.slice("Bearer ".length);
    const evidence = { daysPlayed: 4242, gameRecordDays: 3131 };
    await request(appWith())
      .post(PATH)
      .set("Authorization", CALLER)
      .send({ evidence });
    await request(appWith(mockTenureGrant(new Error("db down"))))
      .post(PATH)
      .set("Authorization", CALLER)
      .send({ evidence });
    expect(logLines.length).toBeGreaterThan(0);
    for (const line of logLines) {
      expect(line).not.toContain(PLAYER_ID);
      expect(line).not.toContain(token);
      expect(line).not.toContain("4242");
      expect(line).not.toContain("3131");
    }
  });
});
