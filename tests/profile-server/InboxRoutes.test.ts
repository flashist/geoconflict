// Route tests for the personal inbox (task 0012) over a mocked InboxRepo —
// same harness as Routes.test.ts / PaymentsRoutes.test.ts.

import request from "supertest";
import {
  createApp,
  type InboxRepo,
  type ProfileRepo,
} from "../../src/profile-server/Routes";
import { TEST_SESSION_CONFIG, bearerFor } from "./support/sessionToken";

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
    resolveExistingPlayer: jest.fn().mockResolvedValue(null),
    resolveOrCreatePlayer: jest.fn(),
    hasXpGrant: jest.fn().mockResolvedValue(false),
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
  return createApp(
    repo,
    undefined,
    inbox ?? undefined,
    undefined,
    TEST_SESSION_CONFIG,
  );
}

// Since task 0273 (S4) the Bearer token is the ONLY way to be a caller.
const CALLER = bearerFor(PLAYER_ID);

describe("inbox routes", () => {
  const ORIGINAL = process.env.PROFILE_INTERNAL_TOKEN;
  beforeEach(() => {
    process.env.PROFILE_INTERNAL_TOKEN = TOKEN;
  });
  afterEach(() => {
    process.env.PROFILE_INTERNAL_TOKEN = ORIGINAL;
  });

  describe("GET /v1/messages", () => {
    // Task 0271, owner ruling D4: no token is "not logged in".
    test("401 session_invalid without a token", async () => {
      const res = await request(appWith()).get("/v1/messages");
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: "session_invalid" });
    });

    test("403 not_citizen when the repo gates the caller", async () => {
      const inbox = mockInbox({
        listMessages: jest.fn().mockResolvedValue({ status: "not_citizen" }),
      });
      const res = await request(appWith(inbox))
        .get("/v1/messages")
        .set("Authorization", CALLER);
      expect(res.status).toBe(403);
      expect(res.body).toEqual({ error: "not_citizen" });
      expect(inbox.listMessages).toHaveBeenCalledWith(PLAYER_ID);
    });

    // Task 0273 (S4), owner ruling D1: the legacy client-asserted Yandex id is
    // GONE. It used to resolve a caller here; now it is simply ignored.
    test("401 for a legacy yandexPlayerId query — never reads messages, never looks the identity up", async () => {
      const inbox = mockInbox();
      const repo = mockRepo();
      const res = await request(appWith(inbox, repo)).get(
        "/v1/messages?yandexPlayerId=y1",
      );
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: "session_invalid" });
      expect(inbox.listMessages).not.toHaveBeenCalled();
      expect(repo.findPlayerByIdentity).not.toHaveBeenCalled();
      expect(repo.resolveOrCreatePlayer).not.toHaveBeenCalled();
    });

    test("200 with the messages exactly as the repo orders them", async () => {
      const res = await request(appWith())
        .get("/v1/messages")
        .set("Authorization", CALLER);
      expect(res.status).toBe(200);
      expect(res.body.messages.map((m: { id: number }) => m.id)).toEqual([
        2, 1,
      ]);
    });

    test("500 when the repo throws", async () => {
      const inbox = mockInbox({
        listMessages: jest.fn().mockRejectedValue(new Error("db down")),
      });
      const res = await request(appWith(inbox))
        .get("/v1/messages")
        .set("Authorization", CALLER);
      expect(res.status).toBe(500);
      expect(res.body).toEqual({ error: "internal_error" });
    });

    test("carries CORS headers so the game origin can read it", async () => {
      const res = await request(appWith())
        .get("/v1/messages")
        .set("Authorization", CALLER)
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
      expect(res.headers["access-control-allow-headers"]).toBe(
        "Content-Type, Authorization",
      );
      expect(inbox.listMessages).not.toHaveBeenCalled();
      expect(inbox.markRead).not.toHaveBeenCalled();
    });

    test("503 inbox_unavailable when no inbox repo is wired", async () => {
      const res = await request(appWith(null))
        .get("/v1/messages")
        .set("Authorization", CALLER);
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
        .set("Authorization", CALLER)
        .send({});
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
        .set("Authorization", CALLER)
        .send({ ids: [2] });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ updated: 1 });
      expect(inbox.markRead).toHaveBeenCalledWith(PLAYER_ID, [2]);
    });

    test("400 on a malformed body (empty ids); 401 with no token (task 0271, D4)", async () => {
      const inbox = mockInbox();
      const empty = await request(appWith(inbox))
        .patch("/v1/messages/read")
        .set("Authorization", CALLER)
        .send({ ids: [] });
      expect(empty.status).toBe(400);
      const noId = await request(appWith(inbox))
        .patch("/v1/messages/read")
        .send({ ids: [1] });
      expect(noId.status).toBe(401);
      expect(noId.body).toEqual({ error: "session_invalid" });
      expect(inbox.markRead).not.toHaveBeenCalled();
    });

    test("403 not_citizen", async () => {
      const inbox = mockInbox({
        markRead: jest.fn().mockResolvedValue({ status: "not_citizen" }),
      });
      const res = await request(appWith(inbox))
        .patch("/v1/messages/read")
        .set("Authorization", CALLER)
        .send({});
      expect(res.status).toBe(403);
    });

    // Task 0273 (S4): a legacy id in the body no longer names a caller.
    test("401 for a legacy yandexPlayerId body, without touching either repo", async () => {
      const inbox = mockInbox();
      const repo = mockRepo();
      const res = await request(appWith(inbox, repo))
        .patch("/v1/messages/read")
        .send({ yandexPlayerId: "y1" });
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: "session_invalid" });
      expect(inbox.markRead).not.toHaveBeenCalled();
      expect(repo.findPlayerByIdentity).not.toHaveBeenCalled();
      expect(repo.resolveOrCreatePlayer).not.toHaveBeenCalled();
    });

    test("500 when the repo throws", async () => {
      const inbox = mockInbox({
        markRead: jest.fn().mockRejectedValue(new Error("db down")),
      });
      const res = await request(appWith(inbox))
        .patch("/v1/messages/read")
        .set("Authorization", CALLER)
        .send({});
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
