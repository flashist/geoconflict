import request from "supertest";
import type { PlayerProfile } from "../../src/core/profile/PlayerProfile";
import { PersistentIdConflictError } from "../../src/profile-server/PlayerProfileRepository";
import { createApp, type ProfileRepo } from "../../src/profile-server/Routes";

const TOKEN = "test-internal-token";

function fullProfile(): PlayerProfile {
  return {
    schema_version: 1,
    yandex_player_id: "yandex-1",
    persistent_id: "pid-1",
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

function mockRepo(overrides: Partial<ProfileRepo> = {}): ProfileRepo {
  return {
    ping: jest.fn().mockResolvedValue(undefined),
    getProfile: jest.fn().mockResolvedValue(null),
    upsertProfile: jest.fn().mockResolvedValue(fullProfile()),
    creditMatchXp: jest.fn().mockResolvedValue("credited"),
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

  test("GET /v1/profile returns the profile with paid + persistent_id fields stripped", async () => {
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
    expect(res.body).not.toHaveProperty("persistent_id");
  });

  test("GET /v1/profile is 404 when absent", async () => {
    const res = await request(createApp(mockRepo())).get(
      "/v1/profile?yandexPlayerId=ghost",
    );
    expect(res.status).toBe(404);
  });

  test("GET /v1/profile is 400 without yandexPlayerId", async () => {
    const res = await request(createApp(mockRepo())).get("/v1/profile");
    expect(res.status).toBe(400);
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
      .mockResolvedValueOnce("credited")
      .mockResolvedValueOnce("duplicate");
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
    expect(res.body.results).toEqual([
      { gameId: "g1", yandexPlayerId: "y1", status: "credited" },
      { gameId: "g1", yandexPlayerId: "y2", status: "duplicate" },
    ]);
    expect(creditMatchXp).toHaveBeenCalledTimes(2);
  });

  test("POST /internal/v1/credit reports per-item error without failing the batch", async () => {
    const creditMatchXp = jest
      .fn()
      .mockResolvedValueOnce("credited")
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

  test("POST /internal/v1/profile/upsert creates a profile and strips persistent_id", async () => {
    const upsertProfile = jest.fn().mockResolvedValue(fullProfile());
    const repo = mockRepo({ upsertProfile });
    const res = await request(createApp(repo))
      .post("/internal/v1/profile/upsert")
      .set("authorization", `Bearer ${TOKEN}`)
      .send({ yandexPlayerId: "yandex-1", persistentId: "pid-1" });
    expect(res.status).toBe(200);
    expect(upsertProfile).toHaveBeenCalledWith("yandex-1", "pid-1");
    expect(res.body.yandex_player_id).toBe("yandex-1");
    expect(res.body).not.toHaveProperty("persistent_id");
    expect(res.body).not.toHaveProperty("is_paid_citizen");
    expect(res.body).not.toHaveProperty("citizenship_purchased_at");
  });

  test("POST /internal/v1/profile/upsert is 409 on a persistent_id conflict", async () => {
    const repo = mockRepo({
      upsertProfile: jest
        .fn()
        .mockRejectedValue(new PersistentIdConflictError("yandex-2", "pid-1")),
    });
    const res = await request(createApp(repo))
      .post("/internal/v1/profile/upsert")
      .set("authorization", `Bearer ${TOKEN}`)
      .send({ yandexPlayerId: "yandex-2", persistentId: "pid-1" });
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: "persistent_id_conflict" });
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

  test("POST /internal/v1/profile/upsert is 500 when the repo throws", async () => {
    const repo = mockRepo({
      upsertProfile: jest.fn().mockRejectedValue(new Error("db down")),
    });
    const res = await request(createApp(repo))
      .post("/internal/v1/profile/upsert")
      .set("authorization", `Bearer ${TOKEN}`)
      .send({ yandexPlayerId: "yandex-1", persistentId: "pid-1" });
    expect(res.status).toBe(500);
  });
});
