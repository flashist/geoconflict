import { Writable } from "stream";
import request from "supertest";
import winston from "winston";
import type { PlayerProfile } from "../../src/core/profile/PlayerProfile";
import { logger } from "../../src/profile-server/Logger";
import { createApp, type ProfileRepo } from "../../src/profile-server/Routes";
import { TEST_SESSION_CONFIG, bearerFor } from "./support/sessionToken";

const TOKEN = "test-internal-token";
// The internal id the identity lookup maps "yandex-1" to (task 0270).
const PLAYER_ID = "0b6f8a52-3c1e-4d7a-9f10-2a4b6c8d0e1f";
const UUID_SHAPE =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

function fullProfile(): PlayerProfile {
  return {
    schema_version: 1,
    xp: 1200,
    is_citizen: true,
    is_paid_citizen: true,
    citizenship_earned_at: "2026-06-24T10:00:00.000Z",
    citizenship_purchased_at: "2026-06-24T11:00:00.000Z",
    display_name: "Commander",
    created_at: "2026-06-01T00:00:00.000Z",
    updated_at: "2026-06-24T12:00:00.000Z",
  };
}

/** Known identities resolve to PLAYER_ID; everything else is unknown. */
function mockRepo(overrides: Partial<ProfileRepo> = {}): ProfileRepo {
  return {
    ping: jest.fn().mockResolvedValue(undefined),
    getProfile: jest.fn().mockResolvedValue(null),
    creditMatchXp: jest.fn().mockResolvedValue({
      status: "credited",
      citizenshipNewlyGranted: false,
    }),
    findPlayerByIdentity: jest
      .fn()
      .mockImplementation(async (_platform: string, id: string) =>
        id === "yandex-1" || id === "y1" || id === "y2" ? PLAYER_ID : null,
      ),
    resolveExistingPlayer: jest.fn().mockResolvedValue(null),
    resolveOrCreatePlayer: jest.fn().mockResolvedValue({
      playerId: PLAYER_ID,
      created: true,
      profile: fullProfile(),
    }),
    hasXpGrant: jest.fn().mockResolvedValue(false),
    ...overrides,
  };
}

/**
 * Since task 0273 (S4) every player-facing route needs a session, so these suites
 * build the app WITH one. `createApp(repo)` alone is still used where the route
 * under test is internal.
 */
function appWithSession(repo: ProfileRepo) {
  return createApp(repo, undefined, undefined, undefined, TEST_SESSION_CONFIG);
}

const CALLER = bearerFor(PLAYER_ID);

describe("profile API routes", () => {
  const ORIGINAL = process.env.PROFILE_INTERNAL_TOKEN;
  beforeEach(() => {
    process.env.PROFILE_INTERNAL_TOKEN = TOKEN;
  });
  afterEach(() => {
    process.env.PROFILE_INTERNAL_TOKEN = ORIGINAL;
  });

  test("GET /health is 200", async () => {
    const res = await request(createApp(mockRepo())).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });

  test("GET /ready is 200 when the DB answers", async () => {
    const res = await request(createApp(mockRepo())).get("/ready");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ready" });
  });

  test("GET /ready is 503 when the DB ping fails", async () => {
    const repo = mockRepo({
      ping: jest.fn().mockRejectedValue(new Error("down")),
    });
    const res = await request(createApp(repo)).get("/ready");
    expect(res.status).toBe(503);
    expect(res.body).toEqual({ status: "not_ready" });
  });

  test("GET /v1/profile resolves the caller from the token and strips paid fields", async () => {
    const repo = mockRepo({
      getProfile: jest.fn().mockResolvedValue(fullProfile()),
    });
    const res = await request(appWithSession(repo))
      .get("/v1/profile")
      .set("Authorization", CALLER);
    expect(res.status).toBe(200);
    // Task 0250 S1, owner ruling Q-A: every citizen reads exactly 100 (true 1200).
    expect(res.body.xp).toBe(100);
    expect(res.body.is_citizen).toBe(true);
    expect(res.body).not.toHaveProperty("is_paid_citizen");
    expect(res.body).not.toHaveProperty("citizenship_purchased_at");
    // Task 0250 S1: equalized for an unverified caller — never the true stamp.
    expect(res.body.citizenship_earned_at).toBeNull();
    expect(res.body.updated_at).toBe(fullProfile().created_at);
    // The token IS the caller: no identity lookup at all (task 0273 removed the
    // legacy fallback, so this is the only path left).
    expect(repo.findPlayerByIdentity).not.toHaveBeenCalled();
    // The repository is keyed by the INTERNAL id, never the Yandex id.
    expect(repo.getProfile).toHaveBeenCalledWith(PLAYER_ID);
  });

  // Task 0250 S1, leaks L1/L2: attempt the leak on a paid-not-earned citizen and
  // an earned one. Every predicate must give the same answer, and the bodies must
  // be identical.
  describe("GET /v1/profile equalizes paid state (task 0250 S1, L1/L2)", () => {
    const CREATED_AT = "2026-06-01T00:00:00.000Z";
    const base = {
      schema_version: 1 as const,
      display_name: "Commander",
      created_at: CREATED_AT,
    };
    const fixtures: Record<string, PlayerProfile> = {
      paidAt0: {
        ...base,
        xp: 0,
        is_citizen: true,
        is_paid_citizen: true,
        citizenship_earned_at: null,
        citizenship_purchased_at: "2026-06-24T11:00:00.000Z",
        updated_at: "2026-06-24T11:00:00.000Z",
      },
      paidAt30: {
        ...base,
        xp: 30,
        is_citizen: true,
        is_paid_citizen: true,
        citizenship_earned_at: null,
        citizenship_purchased_at: "2026-06-24T11:00:00.000Z",
        updated_at: "2026-06-24T11:00:00.000Z",
      },
      paidAt99: {
        ...base,
        xp: 99,
        is_citizen: true,
        is_paid_citizen: true,
        citizenship_earned_at: null,
        citizenship_purchased_at: "2026-06-24T11:00:00.000Z",
        updated_at: "2026-06-24T11:00:00.000Z",
      },
      paidThenEarnedAt140: {
        ...base,
        xp: 140,
        is_citizen: true,
        is_paid_citizen: true,
        citizenship_earned_at: "2026-06-26T10:00:00.000Z",
        citizenship_purchased_at: "2026-06-24T11:00:00.000Z",
        updated_at: "2026-06-26T10:00:00.000Z",
      },
      earnedAt100: {
        ...base,
        xp: 100,
        is_citizen: true,
        is_paid_citizen: false,
        citizenship_earned_at: "2026-06-20T10:00:00.000Z",
        citizenship_purchased_at: null,
        updated_at: "2026-06-20T10:00:00.000Z",
      },
      // Review R1/R3, owner ruling Q-A: an earned citizen whose xp has MOVED
      // past 100 must read the same too — a floor alone let it show 1200.
      earnedAt1200: {
        ...base,
        xp: 1200,
        is_citizen: true,
        is_paid_citizen: false,
        citizenship_earned_at: "2026-06-20T10:00:00.000Z",
        citizenship_purchased_at: null,
        updated_at: "2026-06-25T10:00:00.000Z",
      },
    };
    const read = async (profile: PlayerProfile) =>
      request(
        appWithSession(
          mockRepo({ getProfile: jest.fn().mockResolvedValue(profile) }),
        ),
      )
        .get("/v1/profile")
        .set("Authorization", CALLER);
    const leakL1 = (p: {
      is_citizen: boolean;
      citizenship_earned_at: unknown;
    }) => p.is_citizen && p.citizenship_earned_at === null;
    const leakL2 = (p: { is_citizen: boolean; xp: number }) =>
      p.is_citizen && p.xp < 100;

    // Movement (review R1/R3): any citizen xp other than exactly 100.
    const leakMoved = (p: { is_citizen: boolean; xp: number }) =>
      p.is_citizen && p.xp !== 100;

    describe.each(["earnedAt100", "earnedAt1200"])(
      "against %s",
      (earnedName) => {
        test.each(["paidAt0", "paidAt30", "paidAt99", "paidThenEarnedAt140"])(
          "%s reads exactly like the earned citizen",
          async (name) => {
            const paid = await read(fixtures[name]);
            const earned = await read(fixtures[earnedName]);
            expect(paid.status).toBe(200);
            expect(earned.status).toBe(200);
            expect(leakL1(paid.body)).toBe(leakL1(earned.body));
            expect(leakL2(paid.body)).toBe(leakL2(earned.body));
            expect(leakMoved(paid.body)).toBe(false);
            expect(leakMoved(earned.body)).toBe(false);
            expect(paid.body).toEqual(earned.body);
            expect(JSON.stringify(paid.body).length).toBe(
              JSON.stringify(earned.body).length,
            );
            // The badge still works.
            expect(paid.body.is_citizen).toBe(true);
          },
        );
      },
    );
  });

  // Task 0273 (S4), owner ruling D1: the legacy client-asserted Yandex id is GONE.
  // A caller still sending it — an old cached bundle — gets 401, not a profile.
  test("GET /v1/profile is 401 for a legacy yandexPlayerId query with no token", async () => {
    const repo = mockRepo({
      getProfile: jest.fn().mockResolvedValue(fullProfile()),
    });
    const res = await request(appWithSession(repo)).get(
      "/v1/profile?yandexPlayerId=yandex-1",
    );
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "session_invalid" });
    expect(repo.findPlayerByIdentity).not.toHaveBeenCalled();
    expect(repo.getProfile).not.toHaveBeenCalled();
    expect(repo.resolveOrCreatePlayer).not.toHaveBeenCalled();
  });

  // A malformed legacy id used to be 400; it is now the same 401 as any other
  // request without a token.
  test("GET /v1/profile is 401 (not 400) for an empty legacy yandexPlayerId", async () => {
    const repo = mockRepo();
    const res = await request(appWithSession(repo)).get(
      "/v1/profile?yandexPlayerId=",
    );
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "session_invalid" });
  });

  // Kept from 0271: a valid token for a player whose row is gone (a restore
  // without rotating the session key) is 404, never a silently created profile.
  test("GET /v1/profile is 404 when the token is valid but the profile is gone", async () => {
    const repo = mockRepo();
    const res = await request(appWithSession(repo))
      .get("/v1/profile")
      .set("Authorization", CALLER);
    expect(res.status).toBe(404);
    expect(repo.resolveOrCreatePlayer).not.toHaveBeenCalled();
  });

  // Task 0271, owner ruling D4: no token at all is "not logged in".
  test("GET /v1/profile is 401 session_invalid without a token", async () => {
    const repo = mockRepo();
    const res = await request(appWithSession(repo)).get("/v1/profile");
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: "session_invalid" });
    expect(repo.findPlayerByIdentity).not.toHaveBeenCalled();
  });

  test("GET /v1/profile is 500 when the profile read throws", async () => {
    const repo = mockRepo({
      getProfile: jest.fn().mockRejectedValue(new Error("db down")),
    });
    const res = await request(appWithSession(repo))
      .get("/v1/profile")
      .set("Authorization", CALLER);
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "internal_error" });
  });

  test("GET /v1/profile sends a permissive CORS header so the game origin can read it", async () => {
    const repo = mockRepo({
      getProfile: jest.fn().mockResolvedValue(fullProfile()),
    });
    const res = await request(appWithSession(repo))
      .get("/v1/profile")
      .set("Authorization", CALLER)
      .set("Origin", "https://geoconflict.ru");
    expect(res.status).toBe(200);
    expect(res.headers["access-control-allow-origin"]).toBe("*");
  });

  test("internal routes do NOT get a CORS header", async () => {
    const res = await request(createApp(mockRepo()))
      .post("/internal/v1/players/resolve")
      .set("authorization", `Bearer ${TOKEN}`)
      .set("Origin", "https://geoconflict.ru")
      .send({ platform: "yandex_games", platformUserId: "yandex-1" });
    expect(res.status).toBe(200);
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });

  // ── POST /internal/v1/players/resolve (task 0272, S3) ─────────────────────
  describe("POST /internal/v1/players/resolve", () => {
    function resolve(body: unknown, token: string | null = TOKEN) {
      const req = request(createApp(currentRepo)).post(
        "/internal/v1/players/resolve",
      );
      if (token !== null) req.set("authorization", `Bearer ${token}`);
      return req.send(body as object);
    }
    let currentRepo: ProfileRepo;
    beforeEach(() => {
      currentRepo = mockRepo();
    });

    test("is 401 without a token and never touches the repository", async () => {
      const res = await resolve(
        { platform: "yandex_games", platformUserId: "yandex-1" },
        null,
      );
      expect(res.status).toBe(401);
      expect(currentRepo.resolveOrCreatePlayer).not.toHaveBeenCalled();
    });

    test.each([
      [
        "an unknown platform",
        { platform: "steam", platformUserId: "yandex-1" },
      ],
      ["an empty id", { platform: "yandex_games", platformUserId: "" }],
      [
        "a 129-char id",
        { platform: "yandex_games", platformUserId: "y".repeat(129) },
      ],
      [
        "the retired upsert body",
        { yandexPlayerId: "yandex-1", persistentId: "p" },
      ],
    ])("is 400 bad_request on %s", async (_label, body) => {
      const res = await resolve(body);
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "bad_request" });
      expect(currentRepo.resolveOrCreatePlayer).not.toHaveBeenCalled();
    });

    test("find-or-creates as game_server and returns only { playerId, isCitizen, displayName }", async () => {
      const res = await resolve({
        platform: "yandex_games",
        platformUserId: "yandex-1",
        // Forged fields never reach the repository.
        is_citizen: true,
        xp: 999999,
      });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        playerId: PLAYER_ID,
        isCitizen: true,
        displayName: "Commander",
      });
      expect(currentRepo.resolveOrCreatePlayer).toHaveBeenCalledTimes(1);
      expect(currentRepo.resolveOrCreatePlayer).toHaveBeenCalledWith(
        "yandex_games",
        "yandex-1",
        "game_server",
      );
      // No profile projection and no platform id on the internal response.
      const text = JSON.stringify(res.body);
      expect(text).not.toContain("yandex-1");
      expect(res.body).not.toHaveProperty("xp");
      expect(res.body).not.toHaveProperty("is_paid_citizen");
      expect(res.body).not.toHaveProperty("display_name");
    });

    test("reports isCitizen false for a non-citizen", async () => {
      currentRepo = mockRepo({
        resolveOrCreatePlayer: jest.fn().mockResolvedValue({
          playerId: PLAYER_ID,
          created: false,
          profile: { ...fullProfile(), is_citizen: false },
        }),
      });
      const res = await resolve({
        platform: "yandex_games",
        platformUserId: "yandex-1",
      });
      expect(res.body).toEqual({
        playerId: PLAYER_ID,
        isCitizen: false,
        displayName: "Commander",
      });
    });

    // Task 0322: null — never approved, or cleared by task 0314 — is sent as an
    // explicit null (not omitted), which the game server reads as "clear it".
    test("sends displayName null for a player with no approved name", async () => {
      currentRepo = mockRepo({
        resolveOrCreatePlayer: jest.fn().mockResolvedValue({
          playerId: PLAYER_ID,
          created: true,
          profile: { ...fullProfile(), display_name: null },
        }),
      });
      const res = await resolve({
        platform: "yandex_games",
        platformUserId: "yandex-1",
      });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        playerId: PLAYER_ID,
        isCitizen: true,
        displayName: null,
      });
      expect(res.body).toHaveProperty("displayName", null);
    });

    test("is 500 when find-or-create throws, and the log line names no id", async () => {
      const SYNTHETIC_ID = "zz0272resolveprobe";
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
        currentRepo = mockRepo({
          resolveOrCreatePlayer: jest
            .fn()
            .mockRejectedValue(new Error("db down")),
        });
        const res = await resolve({
          platform: "yandex_games",
          platformUserId: SYNTHETIC_ID,
        });
        expect(res.status).toBe(500);
        expect(res.body).toEqual({ error: "internal_error" });
      } finally {
        logger.remove(capture);
      }
      const logged = chunks.join("\n");
      expect(logged).toContain("/internal/v1/players/resolve");
      expect(logged).not.toContain(SYNTHETIC_ID);
      expect(logged).not.toContain(PLAYER_ID);
    });
  });

  // S3 removed the upsert route: a caller still on it must see it is gone.
  test("POST /internal/v1/profile/upsert is gone (404)", async () => {
    const repo = mockRepo();
    const res = await request(createApp(repo))
      .post("/internal/v1/profile/upsert")
      .set("authorization", `Bearer ${TOKEN}`)
      .send({ yandexPlayerId: "yandex-1", persistentId: "pid-1" });
    expect(res.status).toBe(404);
    expect(repo.resolveOrCreatePlayer).not.toHaveBeenCalled();
  });

  // ── POST /internal/v1/credit (keyed by playerId since task 0272) ──────────
  const OTHER_PLAYER_ID = "0b6f8a52-3c1e-4d7a-9f10-2a4b6c8d0e2f";

  test("POST /internal/v1/credit is 401 without a token", async () => {
    const res = await request(createApp(mockRepo()))
      .post("/internal/v1/credit")
      .send({
        credits: [{ gameId: "g1", playerId: PLAYER_ID, xpAwarded: 10 }],
      });
    expect(res.status).toBe(401);
  });

  test("POST /internal/v1/credit is 400 on a malformed body", async () => {
    const res = await request(createApp(mockRepo()))
      .post("/internal/v1/credit")
      .set("authorization", `Bearer ${TOKEN}`)
      .send({ credits: [] });
    expect(res.status).toBe(400);
  });

  test("POST /internal/v1/credit is 400 on the legacy yandexPlayerId-keyed body", async () => {
    const repo = mockRepo();
    const res = await request(createApp(repo))
      .post("/internal/v1/credit")
      .set("authorization", `Bearer ${TOKEN}`)
      .send({
        credits: [{ gameId: "g1", yandexPlayerId: "y1", xpAwarded: 10 }],
      });
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "bad_request" });
    expect(repo.creditMatchXp).not.toHaveBeenCalled();
  });

  test("POST /internal/v1/credit credits by playerId directly, never through an identity lookup", async () => {
    const creditMatchXp = jest
      .fn()
      .mockResolvedValueOnce({
        status: "credited",
        citizenshipNewlyGranted: true,
      })
      .mockResolvedValueOnce({
        status: "duplicate",
        citizenshipNewlyGranted: false,
      });
    const repo = mockRepo({ creditMatchXp });
    const res = await request(createApp(repo))
      .post("/internal/v1/credit")
      .set("authorization", `Bearer ${TOKEN}`)
      .send({
        credits: [
          { gameId: "g1", playerId: PLAYER_ID, xpAwarded: 10 },
          { gameId: "g1", playerId: OTHER_PLAYER_ID, xpAwarded: 10 },
        ],
      });
    expect(res.status).toBe(200);
    // Status-only wire contract: citizenshipNewlyGranted never leaks into the
    // response — it has no consumer on the game server.
    expect(res.body.results).toEqual([
      { gameId: "g1", playerId: PLAYER_ID, status: "credited" },
      { gameId: "g1", playerId: OTHER_PLAYER_ID, status: "duplicate" },
    ]);
    expect(creditMatchXp).toHaveBeenNthCalledWith(1, "g1", PLAYER_ID, 10);
    expect(creditMatchXp).toHaveBeenNthCalledWith(2, "g1", OTHER_PLAYER_ID, 10);
    expect(repo.findPlayerByIdentity).not.toHaveBeenCalled();
    expect(repo.resolveOrCreatePlayer).not.toHaveBeenCalled();
  });

  test("POST /internal/v1/credit passes the repository's no_profile through", async () => {
    const repo = mockRepo({
      creditMatchXp: jest.fn().mockResolvedValue({
        status: "no_profile",
        citizenshipNewlyGranted: false,
      }),
    });
    const res = await request(createApp(repo))
      .post("/internal/v1/credit")
      .set("authorization", `Bearer ${TOKEN}`)
      .send({
        credits: [{ gameId: "g1", playerId: PLAYER_ID, xpAwarded: 10 }],
      });
    expect(res.status).toBe(200);
    expect(res.body.results).toEqual([
      { gameId: "g1", playerId: PLAYER_ID, status: "no_profile" },
    ]);
    expect(repo.resolveOrCreatePlayer).not.toHaveBeenCalled();
  });

  test("POST /internal/v1/credit reports per-item error without failing the batch", async () => {
    const creditMatchXp = jest
      .fn()
      .mockResolvedValueOnce({
        status: "credited",
        citizenshipNewlyGranted: false,
      })
      .mockRejectedValueOnce(new Error("boom"));
    const repo = mockRepo({ creditMatchXp });
    const res = await request(createApp(repo))
      .post("/internal/v1/credit")
      .set("authorization", `Bearer ${TOKEN}`)
      .send({
        credits: [
          { gameId: "g1", playerId: PLAYER_ID, xpAwarded: 10 },
          { gameId: "g2", playerId: OTHER_PLAYER_ID, xpAwarded: 10 },
        ],
      });
    expect(res.status).toBe(200);
    expect(res.body.results[0].status).toBe("credited");
    expect(res.body.results[1].status).toBe("error");
  });

  // Task 0017 verification 6 (forged citizenship): no inbound body may flip
  // is_citizen / citizenship_earned_at.
  test("POST /internal/v1/credit ignores forged citizenship fields in credit items", async () => {
    const creditMatchXp = jest.fn().mockResolvedValue({
      status: "credited",
      citizenshipNewlyGranted: false,
    });
    const repo = mockRepo({ creditMatchXp });
    const res = await request(createApp(repo))
      .post("/internal/v1/credit")
      .set("authorization", `Bearer ${TOKEN}`)
      .send({
        credits: [
          {
            gameId: "g1",
            playerId: PLAYER_ID,
            xpAwarded: 10,
            is_citizen: true,
            citizenship_earned_at: "2020-01-01T00:00:00.000Z",
          },
        ],
      });
    expect(res.status).toBe(200);
    // Positional contract args only — forged fields never reach the repository.
    expect(creditMatchXp).toHaveBeenCalledWith("g1", PLAYER_ID, 10);
    expect(res.body.results[0]).toEqual({
      gameId: "g1",
      playerId: PLAYER_ID,
      status: "credited",
    });
  });

  // ADR-113 hard rule: the internal id never reaches a CLIENT, and no platform id
  // or retired identity field rides along either. The internal (service-auth'd)
  // responses may carry a playerId (ADR-113 point 3) — but never the retired fields.
  test("no response body carries yandex_player_id or persistent_id; public bodies carry no uuid-shaped id", async () => {
    const repo = mockRepo({
      getProfile: jest.fn().mockResolvedValue(fullProfile()),
    });
    const app = appWithSession(repo);
    const publicResponses = [
      await request(app).get("/v1/profile").set("Authorization", CALLER),
    ];
    const internalResponses = [
      await request(app)
        .post("/internal/v1/players/resolve")
        .set("authorization", `Bearer ${TOKEN}`)
        .send({ platform: "yandex_games", platformUserId: "yandex-1" }),
      await request(app)
        .post("/internal/v1/credit")
        .set("authorization", `Bearer ${TOKEN}`)
        .send({
          credits: [{ gameId: "g1", playerId: PLAYER_ID, xpAwarded: 10 }],
        }),
    ];
    for (const res of [...publicResponses, ...internalResponses]) {
      expect(res.status).toBe(200);
      const text = JSON.stringify(res.body);
      expect(text).not.toContain("yandex_player_id");
      expect(text).not.toContain("persistent_id");
      expect(text).not.toContain("yandex-1");
    }
    for (const res of publicResponses) {
      expect(JSON.stringify(res.body)).not.toMatch(UUID_SHAPE);
    }
  });
});
