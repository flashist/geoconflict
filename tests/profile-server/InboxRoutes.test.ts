// Route tests for the personal inbox (task 0012) over a mocked InboxRepo —
// same harness as Routes.test.ts / PaymentsRoutes.test.ts.

import request from "supertest";
import {
  createApp,
  type InboxRepo,
  type ProfileRepo,
} from "../../src/profile-server/Routes";

const TOKEN = "test-internal-token";
// Task 0270: "y1" is a known Yandex identity resolving to this internal id; the
// operator send route takes the internal id directly.
const PLAYER_ID = "0b6f8a52-3c1e-4d7a-9f10-2a4b6c8d0e1f";

function mockRepo(): ProfileRepo {
  return {
    ping: jest.fn().mockResolvedValue(undefined),
    getProfile: jest.fn().mockResolvedValue(null),
    creditMatchXp: jest.fn(),
    findPlayerByIdentity: jest
      .fn()
      .mockImplementation(async (_platform: string, id: string) =>
        id === "y1" ? PLAYER_ID : null,
      ),
    resolveOrCreatePlayer: jest.fn(),
  };
}

function message(id: number, readAt: string | null = null) {
  return {
    id,
    templateKey: "citizenship_earned" as const,
    templateParams: {},
    title: null,
    body: null,
    sentAt: "2026-08-26T10:00:00.000Z",
    readAt,
  };
}

function mockInbox(overrides: Partial<InboxRepo> = {}): InboxRepo {
  return {
    listMessages: jest
      .fn()
      .mockResolvedValue({ status: "ok", messages: [message(2), message(1)] }),
    markRead: jest.fn().mockResolvedValue({ status: "ok", updated: 2 }),
    sendMessage: jest.fn().mockResolvedValue({ status: "sent", id: 9 }),
    ...overrides,
  };
}

/** `null` = build the app WITHOUT an inbox repo (an explicit `undefined` would hit the default). */
function appWith(
  inbox: InboxRepo | null = mockInbox(),
  repo: ProfileRepo = mockRepo(),
) {
  return createApp(repo, undefined, inbox ?? undefined);
}

describe("inbox routes", () => {
  const ORIGINAL = process.env.PROFILE_INTERNAL_TOKEN;
  beforeEach(() => {
    process.env.PROFILE_INTERNAL_TOKEN = TOKEN;
  });
  afterEach(() => {
    process.env.PROFILE_INTERNAL_TOKEN = ORIGINAL;
  });

  describe("GET /v1/messages", () => {
    test("400 without yandexPlayerId", async () => {
      const res = await request(appWith()).get("/v1/messages");
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "bad_request" });
    });

    test("403 not_citizen when the repo gates the caller", async () => {
      const inbox = mockInbox({
        listMessages: jest.fn().mockResolvedValue({ status: "not_citizen" }),
      });
      const res = await request(appWith(inbox)).get(
        "/v1/messages?yandexPlayerId=y1",
      );
      expect(res.status).toBe(403);
      expect(res.body).toEqual({ error: "not_citizen" });
      expect(inbox.listMessages).toHaveBeenCalledWith(PLAYER_ID);
    });

    test("403 not_citizen for an unknown identity — never reads messages, never creates", async () => {
      const inbox = mockInbox();
      const repo = mockRepo();
      const res = await request(appWith(inbox, repo)).get(
        "/v1/messages?yandexPlayerId=ghost",
      );
      expect(res.status).toBe(403);
      expect(res.body).toEqual({ error: "not_citizen" });
      expect(inbox.listMessages).not.toHaveBeenCalled();
      expect(repo.resolveOrCreatePlayer).not.toHaveBeenCalled();
    });

    test("200 with the messages exactly as the repo orders them", async () => {
      const res = await request(appWith()).get(
        "/v1/messages?yandexPlayerId=y1",
      );
      expect(res.status).toBe(200);
      expect(res.body.messages.map((m: { id: number }) => m.id)).toEqual([
        2, 1,
      ]);
    });

    test("500 when the repo throws", async () => {
      const inbox = mockInbox({
        listMessages: jest.fn().mockRejectedValue(new Error("db down")),
      });
      const res = await request(appWith(inbox)).get(
        "/v1/messages?yandexPlayerId=y1",
      );
      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: "internal_error" });
    });

    test("carries CORS headers so the game origin can read it", async () => {
      const res = await request(appWith())
        .get("/v1/messages?yandexPlayerId=y1")
        .set("Origin", "https://geoconflict.ru");
      expect(res.headers["access-control-allow-origin"]).toBe("*");
      expect(res.headers["access-control-allow-methods"]).toBe("GET, PATCH");
    });

    test("OPTIONS preflight answers 204 with CORS headers before touching the repo", async () => {
      const inbox = mockInbox();
      const res = await request(appWith(inbox))
        .options("/v1/messages/read")
        .set("Origin", "https://geoconflict.ru")
        .set("Access-Control-Request-Method", "PATCH");
      expect(res.status).toBe(204);
      expect(res.headers["access-control-allow-origin"]).toBe("*");
      expect(res.headers["access-control-allow-headers"]).toBe("Content-Type");
      expect(inbox.listMessages).not.toHaveBeenCalled();
      expect(inbox.markRead).not.toHaveBeenCalled();
    });

    test("503 inbox_unavailable when no inbox repo is wired", async () => {
      const res = await request(appWith(null)).get(
        "/v1/messages?yandexPlayerId=y1",
      );
      expect(res.status).toBe(503);
      expect(res.body).toEqual({ error: "inbox_unavailable" });
      // Still readable cross-origin (the browser must see the 503).
      expect(res.headers["access-control-allow-origin"]).toBe("*");
    });
  });

  describe("PATCH /v1/messages/read", () => {
    test("marks ALL read when ids are absent", async () => {
      const inbox = mockInbox();
      const res = await request(appWith(inbox))
        .patch("/v1/messages/read")
        .send({ yandexPlayerId: "y1" });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ updated: 2 });
      expect(inbox.markRead).toHaveBeenCalledWith(PLAYER_ID, undefined);
    });

    test("marks only the given ids", async () => {
      const inbox = mockInbox({
        markRead: jest.fn().mockResolvedValue({ status: "ok", updated: 1 }),
      });
      const res = await request(appWith(inbox))
        .patch("/v1/messages/read")
        .send({ yandexPlayerId: "y1", ids: [2] });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ updated: 1 });
      expect(inbox.markRead).toHaveBeenCalledWith(PLAYER_ID, [2]);
    });

    test("400 on a malformed body (empty ids / missing player id)", async () => {
      const inbox = mockInbox();
      const empty = await request(appWith(inbox))
        .patch("/v1/messages/read")
        .send({ yandexPlayerId: "y1", ids: [] });
      expect(empty.status).toBe(400);
      const noId = await request(appWith(inbox))
        .patch("/v1/messages/read")
        .send({ ids: [1] });
      expect(noId.status).toBe(400);
      expect(inbox.markRead).not.toHaveBeenCalled();
    });

    test("403 not_citizen", async () => {
      const inbox = mockInbox({
        markRead: jest.fn().mockResolvedValue({ status: "not_citizen" }),
      });
      const res = await request(appWith(inbox))
        .patch("/v1/messages/read")
        .send({ yandexPlayerId: "y1" });
      expect(res.status).toBe(403);
    });

    test("403 not_citizen for an unknown identity without touching the repo", async () => {
      const inbox = mockInbox();
      const repo = mockRepo();
      const res = await request(appWith(inbox, repo))
        .patch("/v1/messages/read")
        .send({ yandexPlayerId: "ghost" });
      expect(res.status).toBe(403);
      expect(res.body).toEqual({ error: "not_citizen" });
      expect(inbox.markRead).not.toHaveBeenCalled();
      expect(repo.resolveOrCreatePlayer).not.toHaveBeenCalled();
    });

    test("500 when the repo throws", async () => {
      const inbox = mockInbox({
        markRead: jest.fn().mockRejectedValue(new Error("db down")),
      });
      const res = await request(appWith(inbox))
        .patch("/v1/messages/read")
        .send({ yandexPlayerId: "y1" });
      expect(res.status).toBe(500);
    });
  });

  describe("POST /internal/v1/messages/send", () => {
    test("401 without a token", async () => {
      const inbox = mockInbox();
      const res = await request(appWith(inbox))
        .post("/internal/v1/messages/send")
        .send({ playerId: PLAYER_ID, title: "T", body: "B" });
      expect(res.status).toBe(401);
      expect(inbox.sendMessage).not.toHaveBeenCalled();
    });

    test("400 when addressed by a Yandex id instead of the internal playerId", async () => {
      const inbox = mockInbox();
      const res = await request(appWith(inbox))
        .post("/internal/v1/messages/send")
        .set("authorization", `Bearer ${TOKEN}`)
        .send({ yandexPlayerId: "y1", title: "T", body: "B" });
      expect(res.status).toBe(400);
      expect(inbox.sendMessage).not.toHaveBeenCalled();
    });

    test("400 when playerId is not uuid-shaped (a clean 400, not a pg 22P02 → 500)", async () => {
      const inbox = mockInbox();
      const res = await request(appWith(inbox))
        .post("/internal/v1/messages/send")
        .set("authorization", `Bearer ${TOKEN}`)
        .send({ playerId: "not-a-uuid", title: "T", body: "B" });
      expect(res.status).toBe(400);
      expect(inbox.sendMessage).not.toHaveBeenCalled();
    });

    test("400 when neither a template nor title+body is given", async () => {
      const res = await request(appWith())
        .post("/internal/v1/messages/send")
        .set("authorization", `Bearer ${TOKEN}`)
        .send({ playerId: PLAYER_ID, title: "only a title" });
      expect(res.status).toBe(400);
    });

    test("400 when a template send ALSO carries literal text (XOR — review R2)", async () => {
      const inbox = mockInbox();
      const res = await request(appWith(inbox))
        .post("/internal/v1/messages/send")
        .set("authorization", `Bearer ${TOKEN}`)
        .send({
          playerId: PLAYER_ID,
          templateKey: "citizenship_paid",
          title: "Welcome",
          body: "…",
        });
      expect(res.status).toBe(400);
      expect(inbox.sendMessage).not.toHaveBeenCalled();
    });

    test("400 when a template send is missing a required param (review R4)", async () => {
      const inbox = mockInbox();
      const res = await request(appWith(inbox))
        .post("/internal/v1/messages/send")
        .set("authorization", `Bearer ${TOKEN}`)
        .send({
          playerId: PLAYER_ID,
          templateKey: "name_change_rejected",
          templateParams: { name: "Alpha" },
        });
      expect(res.status).toBe(400);
      expect(inbox.sendMessage).not.toHaveBeenCalled();
    });

    test("404 no_profile when the recipient has no profile row", async () => {
      const inbox = mockInbox({
        sendMessage: jest.fn().mockResolvedValue({ status: "no_profile" }),
      });
      const res = await request(appWith(inbox))
        .post("/internal/v1/messages/send")
        .set("authorization", `Bearer ${TOKEN}`)
        .send({
          playerId: "11111111-2222-3333-4444-555555555555",
          templateKey: "citizenship_paid",
        });
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: "no_profile" });
    });

    test("200 { id } on a template send and on a literal send", async () => {
      const inbox = mockInbox();
      const template = await request(appWith(inbox))
        .post("/internal/v1/messages/send")
        .set("authorization", `Bearer ${TOKEN}`)
        .send({
          playerId: PLAYER_ID,
          templateKey: "name_change_approved",
          templateParams: { name: "Alpha" },
        });
      expect(template.status).toBe(200);
      expect(template.body).toEqual({ id: 9 });
      expect(inbox.sendMessage).toHaveBeenCalledWith({
        playerId: PLAYER_ID,
        templateKey: "name_change_approved",
        templateParams: { name: "Alpha" },
      });

      const literal = await request(appWith(inbox))
        .post("/internal/v1/messages/send")
        .set("authorization", `Bearer ${TOKEN}`)
        .send({ playerId: PLAYER_ID, title: "Hello", body: "Welcome." });
      expect(literal.status).toBe(200);
      expect(inbox.sendMessage).toHaveBeenLastCalledWith({
        playerId: PLAYER_ID,
        title: "Hello",
        body: "Welcome.",
      });
    });

    test("500 when the repo throws", async () => {
      const inbox = mockInbox({
        sendMessage: jest.fn().mockRejectedValue(new Error("db down")),
      });
      const res = await request(appWith(inbox))
        .post("/internal/v1/messages/send")
        .set("authorization", `Bearer ${TOKEN}`)
        .send({ playerId: PLAYER_ID, title: "T", body: "B" });
      expect(res.status).toBe(500);
    });

    test("503 inbox_unavailable when no inbox repo is wired (after auth)", async () => {
      const res = await request(appWith(null))
        .post("/internal/v1/messages/send")
        .set("authorization", `Bearer ${TOKEN}`)
        .send({ playerId: PLAYER_ID, title: "T", body: "B" });
      expect(res.status).toBe(503);
    });

    test("internal send carries NO CORS header", async () => {
      const res = await request(appWith())
        .post("/internal/v1/messages/send")
        .set("authorization", `Bearer ${TOKEN}`)
        .set("Origin", "https://geoconflict.ru")
        .send({ playerId: PLAYER_ID, title: "T", body: "B" });
      expect(res.status).toBe(200);
      expect(res.headers["access-control-allow-origin"]).toBeUndefined();
    });
  });
});
