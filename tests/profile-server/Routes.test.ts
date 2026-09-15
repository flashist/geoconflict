import request from "supertest";
import type { PlayerProfile } from "../../src/core/profile/PlayerProfile";
import { createApp, type ProfileRepo } from "../../src/profile-server/Routes";

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
    resolveOrCreatePlayer: jest.fn().mockResolvedValue({
      playerId: PLAYER_ID,
      created: true,
      profile: fullProfile(),
    }),
    ...overrides,
  };
}

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

  test("GET /v1/profile resolves the caller and returns the profile with paid fields stripped", async () => {
    const repo = mockRepo({
      getProfile: jest.fn().mockResolvedValue(fullProfile()),
    });
    const res = await request(createApp(repo)).get(
      "/v1/profile?yandexPlayerId=yandex-1",
    );
    expect(res.status).toBe(200);
    expect(res.body.xp).toBe(1200);
    expect(res.body.is_citizen).toBe(true);
    expect(res.body).not.toHaveProperty("is_paid_citizen");
    expect(res.body).not.toHaveProperty("citizenship_purchased_at");
    expect(repo.findPlayerByIdentity).toHaveBeenCalledWith(
      "yandex_games",
      "yandex-1",
    );
    // The repository is keyed by the INTERNAL id, never the Yandex id.
    expect(repo.getProfile).toHaveBeenCalledWith(PLAYER_ID);
  });

  test("GET /v1/profile is 404 for an unknown identity and never creates a player", async () => {
    const repo = mockRepo();
    const res = await request(createApp(repo)).get(
      "/v1/profile?yandexPlayerId=ghost",
    );
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "not_found" });
    expect(repo.getProfile).not.toHaveBeenCalled();
    expect(repo.resolveOrCreatePlayer).not.toHaveBeenCalled();
  });

  test("GET /v1/profile is 404 when the identity resolves but the profile is gone", async () => {
    const res = await request(createApp(mockRepo())).get(
      "/v1/profile?yandexPlayerId=yandex-1",
    );
    expect(res.status).toBe(404);
  });

  test("GET /v1/profile is 400 without yandexPlayerId", async () => {
    const repo = mockRepo();
    const res = await request(createApp(repo)).get("/v1/profile");
    expect(res.status).toBe(400);
    expect(repo.findPlayerByIdentity).not.toHaveBeenCalled();
  });

  test("GET /v1/profile is 500 when the identity lookup throws", async () => {
    const repo = mockRepo({
      findPlayerByIdentity: jest.fn().mockRejectedValue(new Error("db down")),
    });
    const res = await request(createApp(repo)).get(
      "/v1/profile?yandexPlayerId=yandex-1",
    );
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "internal_error" });
  });

  test("GET /v1/profile sends a permissive CORS header so the game origin can read it", async () => {
    const repo = mockRepo({
      getProfile: jest.fn().mockResolvedValue(fullProfile()),
    });
    const res = await request(createApp(repo))
      .get("/v1/profile?yandexPlayerId=yandex-1")
      .set("Origin", "https://geoconflict.ru");
    expect(res.status).toBe(200);
    expect(res.headers["access-control-allow-origin"]).toBe("*");
  });

  test("internal routes do NOT get a CORS header", async () => {
    const res = await request(createApp(mockRepo()))
      .post("/internal/v1/profile/upsert")
      .set("authorization", `Bearer ${TOKEN}`)
      .set("Origin", "https://geoconflict.ru")
      .send({ yandexPlayerId: "yandex-1", persistentId: "pid-1" });
    expect(res.status).toBe(200);
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });

  test("POST /internal/v1/credit is 401 without a token", async () => {
    const res = await request(createApp(mockRepo()))
      .post("/internal/v1/credit")
      .send({
        credits: [{ gameId: "g1", yandexPlayerId: "y1", xpAwarded: 10 }],
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

  test("POST /internal/v1/credit returns per-item results", async () => {
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
          { gameId: "g1", yandexPlayerId: "y1", xpAwarded: 10 },
          { gameId: "g1", yandexPlayerId: "y2", xpAwarded: 10 },
        ],
      });
    expect(res.status).toBe(200);
    // Status-only wire contract: citizenshipNewlyGranted (true for y1 above)
    // never leaks into the response — it has no consumer on the game server.
    expect(res.body.results).toEqual([
      { gameId: "g1", yandexPlayerId: "y1", status: "credited" },
      { gameId: "g1", yandexPlayerId: "y2", status: "duplicate" },
    ]);
    expect(creditMatchXp).toHaveBeenCalledTimes(2);
  });

  test("POST /internal/v1/credit reports no_profile for an unknown identity WITHOUT crediting or creating", async () => {
    const repo = mockRepo();
    const res = await request(createApp(repo))
      .post("/internal/v1/credit")
      .set("authorization", `Bearer ${TOKEN}`)
      .send({
        credits: [
          { gameId: "g1", yandexPlayerId: "ghost", xpAwarded: 10 },
          { gameId: "g1", yandexPlayerId: "y1", xpAwarded: 10 },
        ],
      });
    expect(res.status).toBe(200);
    expect(res.body.results).toEqual([
      { gameId: "g1", yandexPlayerId: "ghost", status: "no_profile" },
      { gameId: "g1", yandexPlayerId: "y1", status: "credited" },
    ]);
    expect(repo.creditMatchXp).toHaveBeenCalledTimes(1);
    expect(repo.creditMatchXp).toHaveBeenCalledWith("g1", PLAYER_ID, 10);
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
          { gameId: "g1", yandexPlayerId: "y1", xpAwarded: 10 },
          { gameId: "g2", yandexPlayerId: "y2", xpAwarded: 10 },
        ],
      });
    expect(res.status).toBe(200);
    expect(res.body.results[0].status).toBe("credited");
    expect(res.body.results[1].status).toBe("error");
  });

  // Task 0017 verification 6 (forged citizenship): no inbound body may flip
  // is_citizen / citizenship_earned_at. Both write routes validate with schemas
  // that carry only the contract fields, so forged citizenship fields must never
  // reach the repository.
  test("POST /internal/v1/profile/upsert ignores forged citizenship fields in the body", async () => {
    const repo = mockRepo();
    const res = await request(createApp(repo))
      .post("/internal/v1/profile/upsert")
      .set("authorization", `Bearer ${TOKEN}`)
      .send({
        yandexPlayerId: "yandex-1",
        persistentId: "pid-1",
        is_citizen: true,
        citizenship_earned_at: "2020-01-01T00:00:00.000Z",
        xp: 999999,
      });
    expect(res.status).toBe(200);
    // The repository receives ONLY the platform identity — nothing forged, and
    // persistentId is accepted on the wire but ignored (task 0270).
    expect(repo.resolveOrCreatePlayer).toHaveBeenCalledWith(
      "yandex_games",
      "yandex-1",
      "game_server",
    );
  });

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
            yandexPlayerId: "y1",
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
      yandexPlayerId: "y1",
      status: "credited",
    });
  });

  test("POST /internal/v1/profile/upsert find-or-creates and returns the public projection", async () => {
    const repo = mockRepo();
    const res = await request(createApp(repo))
      .post("/internal/v1/profile/upsert")
      .set("authorization", `Bearer ${TOKEN}`)
      .send({ yandexPlayerId: "yandex-1", persistentId: "pid-1" });
    expect(res.status).toBe(200);
    expect(repo.resolveOrCreatePlayer).toHaveBeenCalledTimes(1);
    expect(res.body.xp).toBe(1200);
    expect(res.body).not.toHaveProperty("is_paid_citizen");
    expect(res.body).not.toHaveProperty("citizenship_purchased_at");
  });

  test("POST /internal/v1/profile/upsert is 401 without a token", async () => {
    const res = await request(createApp(mockRepo()))
      .post("/internal/v1/profile/upsert")
      .send({ yandexPlayerId: "yandex-1", persistentId: "pid-1" });
    expect(res.status).toBe(401);
  });

  test("POST /internal/v1/profile/upsert is 400 on a malformed body", async () => {
    const res = await request(createApp(mockRepo()))
      .post("/internal/v1/profile/upsert")
      .set("authorization", `Bearer ${TOKEN}`)
      .send({ yandexPlayerId: "yandex-1" });
    expect(res.status).toBe(400);
  });

  test("POST /internal/v1/profile/upsert is 500 when find-or-create throws", async () => {
    const repo = mockRepo({
      resolveOrCreatePlayer: jest.fn().mockRejectedValue(new Error("db down")),
    });
    const res = await request(createApp(repo))
      .post("/internal/v1/profile/upsert")
      .set("authorization", `Bearer ${TOKEN}`)
      .send({ yandexPlayerId: "yandex-1", persistentId: "pid-1" });
    expect(res.status).toBe(500);
  });

  // ADR-113 hard rule: the internal id never reaches a client, and no platform id
  // or retired identity field rides along either.
  test("no response body carries yandex_player_id, persistent_id or a uuid-shaped player id", async () => {
    const repo = mockRepo({
      getProfile: jest.fn().mockResolvedValue(fullProfile()),
    });
    const app = createApp(repo);
    const responses = [
      await request(app).get("/v1/profile?yandexPlayerId=yandex-1"),
      await request(app)
        .post("/internal/v1/profile/upsert")
        .set("authorization", `Bearer ${TOKEN}`)
        .send({ yandexPlayerId: "yandex-1", persistentId: "pid-1" }),
      await request(app)
        .post("/internal/v1/credit")
        .set("authorization", `Bearer ${TOKEN}`)
        .send({
          credits: [{ gameId: "g1", yandexPlayerId: "y1", xpAwarded: 10 }],
        }),
    ];
    for (const res of responses) {
      expect(res.status).toBe(200);
      const text = JSON.stringify(res.body);
      expect(text).not.toContain("yandex_player_id");
      expect(text).not.toContain("persistent_id");
      expect(text).not.toMatch(UUID_SHAPE);
    }
  });
});
