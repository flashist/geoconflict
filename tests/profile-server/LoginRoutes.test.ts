// Route tests for POST /v1/login (task 0271, S2) over a mocked ProfileRepo —
// same harness as Routes.test.ts. The DB-backed race lives in
// tests/integration/Login.it.test.ts.

import request from "supertest";
import { LoginResponseSchema } from "../../src/core/profile/LoginContract";
import type { PlayerProfile } from "../../src/core/profile/PlayerProfile";
import {
  createApp,
  type AppOptions,
  type NameChangeRepo,
  type ProfileRepo,
} from "../../src/profile-server/Routes";
import { verifySessionToken } from "../../src/profile-server/SessionToken";

const SECRET = "0271-login-test-secret-0123456789abcdef";
const PLAYER_ID = "0b6f8a52-3c1e-4d7a-9f10-2a4b6c8d0e1f";
const PLATFORM_USER_ID = "zz0271-login-synthetic";
const UUID_SHAPE =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

function fullProfile(): PlayerProfile {
  return {
    schema_version: 1,
    xp: 40,
    is_citizen: false,
    is_paid_citizen: true,
    citizenship_earned_at: null,
    citizenship_purchased_at: "2026-09-01T00:00:00.000Z",
    display_name: null,
    created_at: "2026-09-01T00:00:00.000Z",
    updated_at: "2026-09-01T00:00:00.000Z",
  };
}

function mockRepo(
  created: boolean,
  overrides: Partial<ProfileRepo> = {},
): ProfileRepo {
  return {
    ping: jest.fn().mockResolvedValue(undefined),
    getProfile: jest.fn().mockResolvedValue(null),
    creditMatchXp: jest.fn(),
    findPlayerByIdentity: jest.fn().mockResolvedValue(null),
    resolveExistingPlayer: jest.fn().mockResolvedValue(null),
    resolveOrCreatePlayer: jest.fn().mockResolvedValue({
      playerId: PLAYER_ID,
      created,
      profile: fullProfile(),
    }),
    hasXpGrant: jest.fn().mockResolvedValue(false),
    ...overrides,
  };
}

function appWith(
  repo: ProfileRepo,
  secret: string | null = SECRET,
  nameChange?: NameChangeRepo,
  options?: AppOptions,
) {
  return createApp(
    repo,
    undefined,
    undefined,
    nameChange,
    secret === null ? undefined : { secret },
    options,
  );
}

const BODY = { platform: "yandex_games", platformUserId: PLATFORM_USER_ID };

describe("POST /v1/login", () => {
  test("200 — contract-valid body, created passed through, public profile, no-store, a token for the player", async () => {
    const repo = mockRepo(true);
    const res = await request(appWith(repo)).post("/v1/login").send(BODY);
    expect(res.status).toBe(200);
    const body = LoginResponseSchema.parse(res.body);
    expect(body.created).toBe(true);
    expect(res.body.profile).not.toHaveProperty("is_paid_citizen");
    expect(res.body.profile).not.toHaveProperty("citizenship_purchased_at");
    expect(JSON.stringify(res.body.profile)).not.toMatch(UUID_SHAPE);
    expect(JSON.stringify(res.body)).not.toContain(PLATFORM_USER_ID);
    expect(res.headers["cache-control"]).toBe("no-store");
    const verified = verifySessionToken(SECRET, body.session.token);
    expect(verified.status).toBe("ok");
    expect(verified.status === "ok" && verified.claims.pid).toBe(PLAYER_ID);
    expect(repo.resolveOrCreatePlayer).toHaveBeenCalledWith(
      "yandex_games",
      PLATFORM_USER_ID,
      "login",
    );
  });

  test("created:false is passed through", async () => {
    const res = await request(appWith(mockRepo(false)))
      .post("/v1/login")
      .send(BODY);
    expect(res.status).toBe(200);
    expect(res.body.created).toBe(false);
  });

  test("an existing player's pending name change rides on the profile, like GET /v1/profile", async () => {
    const nameChange: NameChangeRepo = {
      requestNameChange: jest.fn(),
      cancelNameChange: jest.fn(),
      decideNameChange: jest.fn(),
      getLatestState: jest.fn().mockResolvedValue({
        status: "pending",
        requested_name: "NewName",
        decided_at: null,
      }),
    };
    const res = await request(appWith(mockRepo(false), SECRET, nameChange))
      .post("/v1/login")
      .send(BODY);
    expect(res.status).toBe(200);
    expect(res.body.profile.name_change).toEqual({
      status: "pending",
      requested_name: "NewName",
      decided_at: null,
    });
    expect(nameChange.getLatestState).toHaveBeenCalledWith(PLAYER_ID);
  });

  describe("grantChecks.tenure", () => {
    test("a created player is pending without querying grants", async () => {
      const repo = mockRepo(true);
      const res = await request(appWith(repo)).post("/v1/login").send(BODY);
      expect(res.body.grantChecks).toEqual({ tenure: "pending" });
      expect(repo.hasXpGrant).not.toHaveBeenCalled();
    });

    test("an existing player with a tenure grant row is done", async () => {
      const repo = mockRepo(false, {
        hasXpGrant: jest.fn().mockResolvedValue(true),
      });
      const res = await request(appWith(repo)).post("/v1/login").send(BODY);
      expect(res.body.grantChecks).toEqual({ tenure: "done" });
      expect(repo.hasXpGrant).toHaveBeenCalledWith(PLAYER_ID, "tenure");
    });

    test("an existing player without one is pending", async () => {
      const repo = mockRepo(false);
      const res = await request(appWith(repo)).post("/v1/login").send(BODY);
      expect(res.body.grantChecks).toEqual({ tenure: "pending" });
      expect(repo.hasXpGrant).toHaveBeenCalledWith(PLAYER_ID, "tenure");
    });
  });

  describe("400 bad_request", () => {
    test.each<[string, unknown]>([
      ["missing platform", { platformUserId: PLATFORM_USER_ID }],
      [
        "unknown platform",
        { platform: "web", platformUserId: PLATFORM_USER_ID },
      ],
      ["missing platformUserId", { platform: "yandex_games" }],
      [
        "empty platformUserId",
        { platform: "yandex_games", platformUserId: "" },
      ],
      [
        "129-character platformUserId",
        { platform: "yandex_games", platformUserId: "x".repeat(129) },
      ],
      [
        "non-string platformUserId",
        { platform: "yandex_games", platformUserId: 42 },
      ],
    ])("%s", async (_label, body) => {
      const repo = mockRepo(true);
      const res = await request(appWith(repo))
        .post("/v1/login")
        .send(body as object);
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "bad_request" });
      expect(repo.resolveOrCreatePlayer).not.toHaveBeenCalled();
    });

    test("128 characters is still accepted", async () => {
      const res = await request(appWith(mockRepo(true)))
        .post("/v1/login")
        .send({ platform: "yandex_games", platformUserId: "x".repeat(128) });
      expect(res.status).toBe(200);
    });

    test("malformed JSON is a JSON 400 — not Express's HTML error page, not a 500", async () => {
      const repo = mockRepo(true);
      const res = await request(appWith(repo))
        .post("/v1/login")
        .set("Content-Type", "application/json")
        .send('{"platform":"yandex_games","platformUserId": zz0271}');
      expect(res.status).toBe(400);
      expect(res.headers["content-type"]).toMatch(/application\/json/);
      expect(res.body).toEqual({ error: "bad_request" });
      expect(res.headers["access-control-allow-origin"]).toBe("*");
      expect(repo.resolveOrCreatePlayer).not.toHaveBeenCalled();
    });
  });

  describe("503 session_unavailable — fail closed, before any write", () => {
    test.each([
      ["no session config", null],
      ["an empty secret", ""],
      ["a short secret", "x".repeat(31)],
    ])("%s", async (_label, secret) => {
      const repo = mockRepo(true);
      const res = await request(appWith(repo, secret))
        .post("/v1/login")
        .send(BODY);
      expect(res.status).toBe(503);
      expect(res.body).toEqual({ error: "session_unavailable" });
      expect(res.headers["access-control-allow-origin"]).toBe("*");
      expect(repo.resolveOrCreatePlayer).not.toHaveBeenCalled();
    });
  });

  test("500 internal_error when the repository throws", async () => {
    const repo = mockRepo(true, {
      resolveOrCreatePlayer: jest.fn().mockRejectedValue(new Error("db down")),
    });
    const res = await request(appWith(repo)).post("/v1/login").send(BODY);
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "internal_error" });
  });

  test("no rate limiter: 100 sequential logins are all 200", async () => {
    // ONE listening server for the whole loop: `request(app)` would open and close
    // 100 ephemeral servers, multiplying the exposure to the known supertest flake
    // family (CLAUDE.md). It does not change what is asserted.
    const server = appWith(mockRepo(false)).listen(0);
    try {
      const statuses: number[] = [];
      for (let i = 0; i < 100; i++) {
        statuses.push(
          (await request(server).post("/v1/login").send(BODY)).status,
        );
      }
      expect(statuses.filter((status) => status !== 200)).toEqual([]);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  // ── The login-creation switch (task 0274, S5; owner rulings D3 + the design) ──
  // The lever exists because login proves nothing: anyone asserting an id gets a
  // player row. Off, an EXISTING player must still be able to play — pausing
  // creation is not an outage — and a NEW id must get a clean 503 with NO write.
  describe("the login-creation switch is OFF", () => {
    const offApp = (repo: ProfileRepo) =>
      appWith(repo, SECRET, undefined, { loginCreateEnabled: false });

    test("a known player still logs in, and find-or-create is NEVER called", async () => {
      const repo = mockRepo(false, {
        resolveExistingPlayer: jest.fn().mockResolvedValue({
          playerId: PLAYER_ID,
          created: false,
          profile: fullProfile(),
        }),
      });
      const res = await request(offApp(repo)).post("/v1/login").send(BODY);
      expect(res.status).toBe(200);
      expect(res.body.created).toBe(false);
      expect(repo.resolveExistingPlayer).toHaveBeenCalledWith(
        "yandex_games",
        PLATFORM_USER_ID,
      );
      expect(repo.resolveOrCreatePlayer).not.toHaveBeenCalled();
      // The token still works — an existing player's session is unaffected.
      const verified = verifySessionToken(SECRET, res.body.session.token);
      expect(verified.status === "ok" && verified.claims.pid).toBe(PLAYER_ID);
    });

    test("an unknown id is 503 creation_paused, with CORS, and writes nothing", async () => {
      const repo = mockRepo(true, {
        resolveExistingPlayer: jest.fn().mockResolvedValue(null),
      });
      const res = await request(offApp(repo)).post("/v1/login").send(BODY);
      expect(res.status).toBe(503);
      expect(res.body).toEqual({ error: "creation_paused" });
      // Without this header the client cannot even read the refusal cross-origin.
      expect(res.headers["access-control-allow-origin"]).toBe("*");
      expect(repo.resolveOrCreatePlayer).not.toHaveBeenCalled();
    });

    test("the refusal carries no platform id", async () => {
      const repo = mockRepo(true);
      const res = await request(offApp(repo)).post("/v1/login").send(BODY);
      expect(JSON.stringify(res.body)).not.toContain(PLATFORM_USER_ID);
    });

    test("a repository failure on the find-only path is still a 500, not a paused", async () => {
      const repo = mockRepo(true, {
        resolveExistingPlayer: jest
          .fn()
          .mockRejectedValue(new Error("db down")),
      });
      const res = await request(offApp(repo)).post("/v1/login").send(BODY);
      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: "internal_error" });
    });

    test("the switch defaults to ON when createApp is given no options", async () => {
      const repo = mockRepo(true);
      const res = await request(appWith(repo)).post("/v1/login").send(BODY);
      expect(res.status).toBe(200);
      expect(repo.resolveOrCreatePlayer).toHaveBeenCalledTimes(1);
      expect(repo.resolveExistingPlayer).not.toHaveBeenCalled();
    });

    describe("answer order", () => {
      test("no usable session secret wins over the switch — 503 session_unavailable, not creation_paused", async () => {
        const repo = mockRepo(true);
        const res = await request(
          appWith(repo, "", undefined, { loginCreateEnabled: false }),
        )
          .post("/v1/login")
          .send(BODY);
        expect(res.status).toBe(503);
        expect(res.body).toEqual({ error: "session_unavailable" });
        expect(repo.resolveExistingPlayer).not.toHaveBeenCalled();
      });

      test("a malformed body wins over the switch — 400 bad_request, no lookup at all", async () => {
        const repo = mockRepo(true);
        const res = await request(offApp(repo))
          .post("/v1/login")
          .send({ platform: "yandex_games" });
        expect(res.status).toBe(400);
        expect(res.body).toEqual({ error: "bad_request" });
        expect(repo.resolveExistingPlayer).not.toHaveBeenCalled();
        expect(repo.resolveOrCreatePlayer).not.toHaveBeenCalled();
      });
    });

    test("the INTERNAL game-server resolve still creates — a real match is never gated", async () => {
      const originalToken = process.env.PROFILE_INTERNAL_TOKEN;
      process.env.PROFILE_INTERNAL_TOKEN = "0274-internal-test-token";
      try {
        const repo = mockRepo(true);
        const res = await request(offApp(repo))
          .post("/internal/v1/players/resolve")
          .set("authorization", "Bearer 0274-internal-test-token")
          .send({ platform: "yandex_games", platformUserId: PLATFORM_USER_ID });
        expect(res.status).toBe(200);
        expect(repo.resolveOrCreatePlayer).toHaveBeenCalledWith(
          "yandex_games",
          PLATFORM_USER_ID,
          "game_server",
        );
        expect(repo.resolveExistingPlayer).not.toHaveBeenCalled();
      } finally {
        process.env.PROFILE_INTERNAL_TOKEN = originalToken;
      }
    });
  });

  test("OPTIONS /v1/login is 204 with Authorization allowed and a Max-Age, and touches no repo", async () => {
    const repo = mockRepo(true);
    const res = await request(appWith(repo))
      .options("/v1/login")
      .set("Origin", "https://geoconflict.ru")
      .set("Access-Control-Request-Method", "POST")
      .set("Access-Control-Request-Headers", "content-type, authorization");
    expect(res.status).toBe(204);
    expect(res.headers["access-control-allow-origin"]).toBe("*");
    expect(res.headers["access-control-allow-methods"]).toContain("POST");
    expect(res.headers["access-control-allow-headers"]).toContain(
      "Authorization",
    );
    expect(res.headers["access-control-max-age"]).toBe("7200");
    expect(repo.resolveOrCreatePlayer).not.toHaveBeenCalled();
  });
});
