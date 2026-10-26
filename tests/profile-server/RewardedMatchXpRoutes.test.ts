// Route tests for the rewarded-ad match-XP grant (task 0491, server part of 0488)
// over a mocked RewardedMatchXpRepo — the TenureGrantRoutes harness.
// supertest-based, so this suite is part of the known supertest flake family
// (CLAUDE.md, "Known flake").

// Every log line the routes write, so the suite can prove no id, token or game
// id reaches the container log.
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
import type { RewardedMatchXpOutcome } from "../../src/profile-server/PlayerProfileRepository";
import {
  createApp,
  type ProfileRepo,
  type RewardedMatchXpRepo,
} from "../../src/profile-server/Routes";
import {
  noopProfileMetrics,
  type ProfileMetrics,
  type RewardedMatchXpGrantOutcome,
} from "../../src/profile-server/Telemetry";
import { TEST_SESSION_CONFIG, bearerFor } from "./support/sessionToken";

const PATH = "/v1/profile/rewarded-match-xp";
const PLAYER_ID = "0b6f8a52-3c1e-4d7a-9f10-2a4b6c8d0e1f";
const CALLER = bearerFor(PLAYER_ID);
const GAME_ID = "zz0491-game-canary";

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
  overrides: Partial<RewardedMatchXpOutcome> = {},
): RewardedMatchXpOutcome {
  return {
    status: "granted",
    xpAwarded: 1,
    xp: 21,
    citizenshipNewlyGranted: false,
    isCitizen: false,
    ...overrides,
  };
}

function mockRewarded(
  result: RewardedMatchXpOutcome | Error = outcome(),
): RewardedMatchXpRepo & { grantRewardedMatchXp: jest.Mock } {
  const grantRewardedMatchXp = jest.fn();
  if (result instanceof Error) {
    grantRewardedMatchXp.mockRejectedValue(result);
  } else {
    grantRewardedMatchXp.mockResolvedValue(result);
  }
  return { grantRewardedMatchXp };
}

function recordingMetrics(): {
  metrics: ProfileMetrics;
  grants: RewardedMatchXpGrantOutcome[];
} {
  const grants: RewardedMatchXpGrantOutcome[] = [];
  return {
    metrics: {
      ...noopProfileMetrics,
      rewardedMatchXpGrant: (value) => grants.push(value),
    },
    grants,
  };
}

/** `null` rewardedMatchXp = build the app WITHOUT one (fail-closed path). */
function appWith(
  rewardedMatchXp: RewardedMatchXpRepo | null = mockRewarded(),
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
      ...(rewardedMatchXp === null ? {} : { rewardedMatchXp }),
    },
  );
}

const post = (
  app: ReturnType<typeof createApp>,
  auth: string | null = CALLER,
) => {
  const req = request(app).post(PATH);
  return auth === null ? req : req.set("Authorization", auth);
};

describe("POST /v1/profile/rewarded-match-xp", () => {
  beforeEach(() => {
    logLines.length = 0;
  });

  describe("200 answers", () => {
    it("granted: the repository gets the body's game id and the SESSION's player id", async () => {
      const rewarded = mockRewarded(outcome({ xpAwarded: 1, xp: 21 }));
      await post(appWith(rewarded))
        .send({ gameId: GAME_ID })
        .expect(200, { status: "granted", xpAwarded: 1, xp: 21 });
      expect(rewarded.grantRewardedMatchXp).toHaveBeenCalledWith(
        GAME_ID,
        PLAYER_ID,
      );
    });

    it("duplicate carries the stored amount", async () => {
      await post(
        appWith(
          mockRewarded(outcome({ status: "duplicate", xpAwarded: 1, xp: 21 })),
        ),
      )
        .send({ gameId: GAME_ID })
        .expect(200, { status: "duplicate", xpAwarded: 1, xp: 21 });
    });

    it("not_credited answers 200 with 0 XP awarded", async () => {
      await post(
        appWith(
          mockRewarded(
            outcome({ status: "not_credited", xpAwarded: 0, xp: 20 }),
          ),
        ),
      )
        .send({ gameId: GAME_ID })
        .expect(200, { status: "not_credited", xpAwarded: 0, xp: 20 });
    });

    it("ignores a client-sent amount and player id", async () => {
      const rewarded = mockRewarded();
      await post(appWith(rewarded))
        .send({
          gameId: GAME_ID,
          xpAwarded: 999,
          playerId: "11111111-1111-4111-8111-111111111111",
        })
        .expect(200);
      expect(rewarded.grantRewardedMatchXp).toHaveBeenCalledWith(
        GAME_ID,
        PLAYER_ID,
      );
    });

    it("the response never carries citizenshipNewlyGranted or any id", async () => {
      const res = await post(
        appWith(
          mockRewarded(
            outcome({
              citizenshipNewlyGranted: true,
              isCitizen: true,
              xpAwarded: 1,
              xp: 101,
            }),
          ),
        ),
      )
        .send({ gameId: GAME_ID })
        .expect(200);
      expect(Object.keys(res.body).sort()).toEqual([
        "status",
        "xp",
        "xpAwarded",
      ]);
    });

    // Task 0250 S1 / S3b, the tenure-grant rule: an unverified caller sees every
    // citizen at exactly the threshold; a verified caller sees its own true total.
    describe("xp equalization for unverified callers", () => {
      it.each([
        ["granted", 101, true, 100],
        ["duplicate", 1200, true, 100],
        ["not_credited", 42, true, 100],
        ["granted", 21, false, 21],
      ] as const)(
        "vfy:false, %s at %i (citizen=%s) → xp %i",
        async (status, xp, isCitizen, shown) => {
          const res = await post(
            appWith(mockRewarded(outcome({ status, xp, isCitizen }))),
            bearerFor(PLAYER_ID, { verified: false }),
          )
            .send({ gameId: GAME_ID })
            .expect(200);
          expect(res.body.xp).toBe(shown);
        },
      );

      it("vfy:true sees its own true total, citizen or not; same repository call", async () => {
        const result = outcome({
          status: "granted",
          xp: 101,
          isCitizen: true,
          citizenshipNewlyGranted: true,
        });
        const verifiedRepo = mockRewarded(result);
        const unverifiedRepo = mockRewarded(result);
        const verified = await post(
          appWith(verifiedRepo),
          bearerFor(PLAYER_ID, { verified: true }),
        )
          .send({ gameId: GAME_ID })
          .expect(200);
        const unverified = await post(
          appWith(unverifiedRepo),
          bearerFor(PLAYER_ID, { verified: false }),
        )
          .send({ gameId: GAME_ID })
          .expect(200);
        expect(verified.body).toEqual({
          status: "granted",
          xpAwarded: 1,
          xp: 101,
        });
        expect(unverified.body).toEqual({
          status: "granted",
          xpAwarded: 1,
          xp: 100,
        });
        expect(verifiedRepo.grantRewardedMatchXp.mock.calls).toEqual(
          unverifiedRepo.grantRewardedMatchXp.mock.calls,
        );
      });
    });
  });

  describe("refusals", () => {
    it.each([
      ["an empty body", {}],
      ["an empty game id", { gameId: "" }],
      ["a 129-character game id", { gameId: "g".repeat(129) }],
      ["a numeric game id", { gameId: 7 }],
    ])("400 on %s, without touching the repository", async (_label, body) => {
      const rewarded = mockRewarded();
      await post(appWith(rewarded))
        .send(body)
        .expect(400, { error: "bad_request" });
      expect(rewarded.grantRewardedMatchXp).not.toHaveBeenCalled();
    });

    it("400 on malformed JSON", async () => {
      const rewarded = mockRewarded();
      await post(appWith(rewarded))
        .set("Content-Type", "application/json")
        .send("{not json")
        .expect(400);
      expect(rewarded.grantRewardedMatchXp).not.toHaveBeenCalled();
    });

    it("401 session_invalid with no token", async () => {
      const rewarded = mockRewarded();
      await post(appWith(rewarded), null)
        .send({ gameId: GAME_ID })
        .expect(401, { error: "session_invalid" });
      expect(rewarded.grantRewardedMatchXp).not.toHaveBeenCalled();
    });

    it("401 session_invalid with a bad token", async () => {
      const rewarded = mockRewarded();
      await post(
        appWith(rewarded),
        bearerFor(PLAYER_ID, {
          secret: "some-other-secret-0123456789abcdefghij",
        }),
      )
        .send({ gameId: GAME_ID })
        .expect(401, { error: "session_invalid" });
      expect(rewarded.grantRewardedMatchXp).not.toHaveBeenCalled();
    });

    it("401 session_expired with an expired token", async () => {
      await post(
        appWith(),
        bearerFor(PLAYER_ID, { nowMs: Date.now() - 48 * 60 * 60 * 1000 }),
      )
        .send({ gameId: GAME_ID })
        .expect(401, { error: "session_expired" });
    });

    it("503 session_unavailable when no usable session secret is configured", async () => {
      const rewarded = mockRewarded();
      await post(appWith(rewarded, { session: undefined }))
        .send({ gameId: GAME_ID })
        .expect(503, { error: "session_unavailable" });
      expect(rewarded.grantRewardedMatchXp).not.toHaveBeenCalled();
    });

    it("503 rewarded_match_xp_unavailable when the route is not wired", async () => {
      await post(appWith(null))
        .send({ gameId: GAME_ID })
        .expect(503, { error: "rewarded_match_xp_unavailable" });
    });

    it("404 not_found when the token's player is gone", async () => {
      await post(
        appWith(
          mockRewarded(outcome({ status: "not_found", xpAwarded: 0, xp: 0 })),
        ),
      )
        .send({ gameId: GAME_ID })
        .expect(404, { error: "not_found" });
    });

    it("500 internal_error when the repository throws", async () => {
      await post(appWith(mockRewarded(new Error("db down"))))
        .send({ gameId: GAME_ID })
        .expect(500, { error: "internal_error" });
    });
  });

  describe("CORS", () => {
    it("OPTIONS preflight → 204 with the CORS headers, Authorization included", async () => {
      const rewarded = mockRewarded();
      const res = await request(appWith(rewarded)).options(PATH).expect(204);
      expect(res.headers["access-control-allow-origin"]).toBe("*");
      expect(res.headers["access-control-allow-methods"]).toBe("POST");
      expect(res.headers["access-control-allow-headers"]).toBe(
        "Content-Type, Authorization",
      );
      expect(rewarded.grantRewardedMatchXp).not.toHaveBeenCalled();
    });

    it("the CORS header is on errors too, so the browser can read them", async () => {
      const unavailable = await post(appWith(null), null)
        .send({ gameId: GAME_ID })
        .expect(503);
      expect(unavailable.headers["access-control-allow-origin"]).toBe("*");
      const unauthorized = await post(appWith(), null)
        .send({ gameId: GAME_ID })
        .expect(401);
      expect(unauthorized.headers["access-control-allow-origin"]).toBe("*");
    });
  });

  describe("metrics — rewardedMatchXpGrant recorded exactly once per request", () => {
    async function grantWith(
      rewarded: RewardedMatchXpRepo | null,
      send: (app: ReturnType<typeof createApp>) => Promise<unknown>,
      session: { secret: string } | undefined = TEST_SESSION_CONFIG,
    ): Promise<RewardedMatchXpGrantOutcome[]> {
      const { metrics, grants } = recordingMetrics();
      await send(appWith(rewarded, { metrics, session }));
      return grants;
    }

    const send =
      (auth: string | null, body: object = { gameId: GAME_ID }) =>
      (app: ReturnType<typeof createApp>) =>
        post(app, auth).send(body);

    it.each(["granted", "duplicate", "not_credited", "not_found"] as const)(
      "%s",
      async (status) => {
        expect(
          await grantWith(mockRewarded(outcome({ status })), send(CALLER)),
        ).toEqual([status]);
      },
    );

    it("bad_request", async () => {
      expect(
        await grantWith(mockRewarded(), send(CALLER, { gameId: "" })),
      ).toEqual(["bad_request"]);
    });

    it("unauthorized", async () => {
      expect(await grantWith(mockRewarded(), send(null))).toEqual([
        "unauthorized",
      ]);
    });

    it("unavailable — no session secret", async () => {
      expect(
        await grantWith(mockRewarded(), send(CALLER), { secret: "" }),
      ).toEqual(["unavailable"]);
    });

    it("unavailable — the route is not wired", async () => {
      expect(await grantWith(null, send(CALLER))).toEqual(["unavailable"]);
    });

    it("error", async () => {
      expect(
        await grantWith(mockRewarded(new Error("db down")), send(CALLER)),
      ).toEqual(["error"]);
    });

    it("a preflight records nothing", async () => {
      expect(
        await grantWith(mockRewarded(), (app) =>
          request(app)
            .options(PATH)
            .then(() => undefined),
        ),
      ).toEqual([]);
    });
  });

  it("never logs the player id, the token or the game id", async () => {
    const token = CALLER.slice("Bearer ".length);
    for (const status of [
      "granted",
      "duplicate",
      "not_credited",
      "not_found",
    ] as const) {
      await post(appWith(mockRewarded(outcome({ status }))))
        .send({ gameId: GAME_ID })
        .expect((res) => expect(res.status).toBeLessThan(500));
    }
    await post(appWith(mockRewarded(new Error("db down"))))
      .send({ gameId: GAME_ID })
      .expect(500);
    expect(logLines.length).toBeGreaterThan(0);
    for (const line of logLines) {
      expect(line).not.toContain(PLAYER_ID);
      expect(line).not.toContain(token);
      expect(line).not.toContain(GAME_ID);
    }
  });
});
