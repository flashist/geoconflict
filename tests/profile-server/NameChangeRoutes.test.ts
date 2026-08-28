// Route tests for citizen name changes (task 0067) over a mocked NameChangeRepo —
// same harness as InboxRoutes.test.ts / PaymentsRoutes.test.ts.

import request from "supertest";
import {
  createApp,
  type NameChangeRepo,
  type ProfileRepo,
} from "../../src/profile-server/Routes";

const TOKEN = "test-internal-token";
const PLAYER = "yandex-1";

function mockRepo(profile: Record<string, unknown> | null = null): ProfileRepo {
  return {
    ping: jest.fn().mockResolvedValue(undefined),
    getProfile: jest.fn().mockResolvedValue(profile),
    upsertProfile: jest.fn(),
    creditMatchXp: jest.fn(),
  };
}

function mockNameChange(
  overrides: Partial<NameChangeRepo> = {},
): NameChangeRepo {
  return {
    requestNameChange: jest.fn().mockResolvedValue({ status: "ok", id: 1 }),
    cancelNameChange: jest.fn().mockResolvedValue({ status: "ok" }),
    decideNameChange: jest.fn().mockResolvedValue({ status: "ok" }),
    getLatestState: jest.fn().mockResolvedValue(null),
    ...overrides,
  };
}

/** `null` = build the app WITHOUT a name-change repo (fail-closed path). */
function appWith(
  nameChange: NameChangeRepo | null = mockNameChange(),
  profile: Record<string, unknown> | null = null,
) {
  return createApp(
    mockRepo(profile),
    undefined,
    undefined,
    nameChange ?? undefined,
  );
}

const PROFILE_ROW = {
  schema_version: 1,
  yandex_player_id: PLAYER,
  persistent_id: "pid-1",
  xp: 1000,
  is_citizen: true,
  is_paid_citizen: true,
  citizenship_earned_at: "2026-08-01T00:00:00.000Z",
  citizenship_purchased_at: "2026-08-01T00:00:00.000Z",
  display_name: "OldName",
  created_at: "2026-08-01T00:00:00.000Z",
  updated_at: "2026-08-01T00:00:00.000Z",
};

describe("name-change routes", () => {
  const ORIGINAL = process.env.PROFILE_INTERNAL_TOKEN;
  beforeEach(() => {
    process.env.PROFILE_INTERNAL_TOKEN = TOKEN;
  });
  afterEach(() => {
    process.env.PROFILE_INTERNAL_TOKEN = ORIGINAL;
  });

  describe("POST /v1/profile/name-change-request", () => {
    it("400s on a malformed body", async () => {
      await request(appWith())
        .post("/v1/profile/name-change-request")
        .send({ yandexPlayerId: PLAYER })
        .expect(400, { error: "bad_request" });
      await request(appWith())
        .post("/v1/profile/name-change-request")
        .send({ requestedName: "NewName" })
        .expect(400, { error: "bad_request" });
    });

    it("passes the request through and 200s", async () => {
      const nameChange = mockNameChange();
      await request(appWith(nameChange))
        .post("/v1/profile/name-change-request")
        .send({ yandexPlayerId: PLAYER, requestedName: "NewName" })
        .expect(200, { status: "ok" });
      expect(nameChange.requestNameChange).toHaveBeenCalledWith(
        PLAYER,
        "NewName",
      );
    });

    // Brief step 1: a direct POST from a non-citizen must be rejected
    // SERVER-side, not merely hidden in the UI.
    it("403s a non-citizen", async () => {
      const nameChange = mockNameChange({
        requestNameChange: jest
          .fn()
          .mockResolvedValue({ status: "not_citizen" }),
      });
      await request(appWith(nameChange))
        .post("/v1/profile/name-change-request")
        .send({ yandexPlayerId: PLAYER, requestedName: "NewName" })
        .expect(403, { error: "not_citizen" });
    });

    it("400s an invalid name AND names the broken rule", async () => {
      const nameChange = mockNameChange({
        requestNameChange: jest
          .fn()
          .mockResolvedValue({ status: "invalid", violation: "too_short" }),
      });
      await request(appWith(nameChange))
        .post("/v1/profile/name-change-request")
        .send({ yandexPlayerId: PLAYER, requestedName: "ab" })
        .expect(400, { error: "invalid", violation: "too_short" });
    });

    it("409s a taken name and a second concurrent request", async () => {
      await request(
        appWith(
          mockNameChange({
            requestNameChange: jest
              .fn()
              .mockResolvedValue({ status: "name_taken" }),
          }),
        ),
      )
        .post("/v1/profile/name-change-request")
        .send({ yandexPlayerId: PLAYER, requestedName: "Ivan" })
        .expect(409, { error: "name_taken" });

      await request(
        appWith(
          mockNameChange({
            requestNameChange: jest
              .fn()
              .mockResolvedValue({ status: "pending_exists" }),
          }),
        ),
      )
        .post("/v1/profile/name-change-request")
        .send({ yandexPlayerId: PLAYER, requestedName: "Other" })
        .expect(409, { error: "pending_exists" });
    });

    it("500s (without leaking) when the repository throws", async () => {
      const nameChange = mockNameChange({
        requestNameChange: jest.fn().mockRejectedValue(new Error("boom")),
      });
      await request(appWith(nameChange))
        .post("/v1/profile/name-change-request")
        .send({ yandexPlayerId: PLAYER, requestedName: "NewName" })
        .expect(500, { error: "internal_error" });
    });

    it("fails CLOSED with 503 when the feature is unwired", async () => {
      await request(appWith(null))
        .post("/v1/profile/name-change-request")
        .send({ yandexPlayerId: PLAYER, requestedName: "NewName" })
        .expect(503, { error: "name_change_unavailable" });
    });

    it("answers the CORS preflight with 204 + headers", async () => {
      const res = await request(appWith())
        .options("/v1/profile/name-change-request")
        .expect(204);
      expect(res.headers["access-control-allow-origin"]).toBe("*");
      expect(res.headers["access-control-allow-methods"]).toContain("POST");
    });
  });

  // Owner amendment 2 — the vector this closes: a griefer who knows a citizen's
  // non-secret id could otherwise park a pending request the victim can never clear.
  describe("POST /v1/profile/name-change-cancel", () => {
    it("withdraws the caller's own pending request", async () => {
      const nameChange = mockNameChange();
      await request(appWith(nameChange))
        .post("/v1/profile/name-change-cancel")
        .send({ yandexPlayerId: PLAYER })
        .expect(200, { status: "ok" });
      expect(nameChange.cancelNameChange).toHaveBeenCalledWith(PLAYER);
    });

    it("400s without a player id", async () => {
      await request(appWith())
        .post("/v1/profile/name-change-cancel")
        .send({})
        .expect(400, { error: "bad_request" });
    });

    it("403s a non-citizen and 404s when there is nothing pending", async () => {
      await request(
        appWith(
          mockNameChange({
            cancelNameChange: jest
              .fn()
              .mockResolvedValue({ status: "not_citizen" }),
          }),
        ),
      )
        .post("/v1/profile/name-change-cancel")
        .send({ yandexPlayerId: PLAYER })
        .expect(403, { error: "not_citizen" });

      await request(
        appWith(
          mockNameChange({
            cancelNameChange: jest
              .fn()
              .mockResolvedValue({ status: "no_pending" }),
          }),
        ),
      )
        .post("/v1/profile/name-change-cancel")
        .send({ yandexPlayerId: PLAYER })
        .expect(404, { error: "no_pending" });
    });

    it("fails CLOSED with 503 when the feature is unwired", async () => {
      await request(appWith(null))
        .post("/v1/profile/name-change-cancel")
        .send({ yandexPlayerId: PLAYER })
        .expect(503, { error: "name_change_unavailable" });
    });
  });

  describe("POST /internal/v1/name-change/decide", () => {
    it("401s without the internal token — it is NOT player-reachable", async () => {
      await request(appWith())
        .post("/internal/v1/name-change/decide")
        .send({ yandexPlayerId: PLAYER, decision: "approve" })
        .expect(401);
    });

    it("approves with a valid token", async () => {
      const nameChange = mockNameChange();
      await request(appWith(nameChange))
        .post("/internal/v1/name-change/decide")
        .set("Authorization", `Bearer ${TOKEN}`)
        .send({ yandexPlayerId: PLAYER, decision: "approve" })
        .expect(200, { status: "ok" });
      expect(nameChange.decideNameChange).toHaveBeenCalledWith(
        PLAYER,
        "approve",
        undefined,
        // expectedName is optional on the wire — omitting it keeps the
        // pre-existing behavior (review R1, owner ruling A).
        undefined,
      );
    });

    it("forwards expectedName when the operator sends it", async () => {
      const nameChange = mockNameChange();
      await request(appWith(nameChange))
        .post("/internal/v1/name-change/decide")
        .set("Authorization", `Bearer ${TOKEN}`)
        .send({
          yandexPlayerId: PLAYER,
          decision: "approve",
          expectedName: "NewName",
        })
        .expect(200, { status: "ok" });
      expect(nameChange.decideNameChange).toHaveBeenCalledWith(
        PLAYER,
        "approve",
        undefined,
        "NewName",
      );
    });

    // The bypass this closes: the pending row is resolved by player id, so a
    // request → cancel → re-request cycle swaps the name under a notification
    // the operator already holds.
    it("409s a name_mismatch and hands back the name that IS pending", async () => {
      await request(
        appWith(
          mockNameChange({
            decideNameChange: jest.fn().mockResolvedValue({
              status: "name_mismatch",
              pendingName: "SwappedName",
            }),
          }),
        ),
      )
        .post("/internal/v1/name-change/decide")
        .set("Authorization", `Bearer ${TOKEN}`)
        .send({
          yandexPlayerId: PLAYER,
          decision: "approve",
          expectedName: "StaleName",
        })
        .expect(409, { error: "name_mismatch", pending_name: "SwappedName" });
    });

    it("rejects WITH a reason", async () => {
      const nameChange = mockNameChange();
      await request(appWith(nameChange))
        .post("/internal/v1/name-change/decide")
        .set("Authorization", `Bearer ${TOKEN}`)
        .send({
          yandexPlayerId: PLAYER,
          decision: "reject",
          reason: "impersonation",
        })
        .expect(200, { status: "ok" });
      expect(nameChange.decideNameChange).toHaveBeenCalledWith(
        PLAYER,
        "reject",
        "impersonation",
        undefined,
      );
    });

    // The inbox `name_change_rejected` template requires a non-empty {reason};
    // an empty one would be refused at the send boundary AFTER the row was
    // already marked rejected. Refuse it up front instead.
    it("400s a rejection with a missing or blank reason", async () => {
      for (const body of [
        { yandexPlayerId: PLAYER, decision: "reject" },
        { yandexPlayerId: PLAYER, decision: "reject", reason: "" },
        { yandexPlayerId: PLAYER, decision: "reject", reason: "   " },
      ]) {
        await request(appWith())
          .post("/internal/v1/name-change/decide")
          .set("Authorization", `Bearer ${TOKEN}`)
          .send(body)
          .expect(400, { error: "bad_request" });
      }
    });

    it("400s an unknown decision verb", async () => {
      await request(appWith())
        .post("/internal/v1/name-change/decide")
        .set("Authorization", `Bearer ${TOKEN}`)
        .send({ yandexPlayerId: PLAYER, decision: "maybe" })
        .expect(400, { error: "bad_request" });
    });

    it("404s when there is no pending request", async () => {
      await request(
        appWith(
          mockNameChange({
            decideNameChange: jest
              .fn()
              .mockResolvedValue({ status: "no_pending" }),
          }),
        ),
      )
        .post("/internal/v1/name-change/decide")
        .set("Authorization", `Bearer ${TOKEN}`)
        .send({ yandexPlayerId: PLAYER, decision: "approve" })
        .expect(404, { error: "no_pending" });
    });

    it("409s the approve-time uniqueness race instead of 500ing", async () => {
      await request(
        appWith(
          mockNameChange({
            decideNameChange: jest
              .fn()
              .mockResolvedValue({ status: "name_taken" }),
          }),
        ),
      )
        .post("/internal/v1/name-change/decide")
        .set("Authorization", `Bearer ${TOKEN}`)
        .send({ yandexPlayerId: PLAYER, decision: "approve" })
        .expect(409, { error: "name_taken" });
    });

    it("sets NO CORS header — internal routes are never browser-reachable", async () => {
      const res = await request(appWith())
        .post("/internal/v1/name-change/decide")
        .set("Authorization", `Bearer ${TOKEN}`)
        .send({ yandexPlayerId: PLAYER, decision: "approve" });
      expect(res.headers["access-control-allow-origin"]).toBeUndefined();
    });

    it("fails CLOSED with 503 when the feature is unwired", async () => {
      await request(appWith(null))
        .post("/internal/v1/name-change/decide")
        .set("Authorization", `Bearer ${TOKEN}`)
        .send({ yandexPlayerId: PLAYER, decision: "approve" })
        .expect(503, { error: "name_change_unavailable" });
    });
  });

  describe("GET /v1/profile projection", () => {
    it("merges the name-change state when there is one", async () => {
      const state = {
        status: "pending" as const,
        requested_name: "NewName",
        decided_at: null,
      };
      const app = appWith(
        mockNameChange({ getLatestState: jest.fn().mockResolvedValue(state) }),
        PROFILE_ROW,
      );
      const res = await request(app)
        .get("/v1/profile")
        .query({ yandexPlayerId: PLAYER })
        .expect(200);
      expect(res.body.name_change).toEqual(state);
    });

    it("OMITS the key entirely when there is no request", async () => {
      const res = await request(appWith(mockNameChange(), PROFILE_ROW))
        .get("/v1/profile")
        .query({ yandexPlayerId: PLAYER })
        .expect(200);
      expect(res.body).not.toHaveProperty("name_change");
    });

    it("still strips paid state — the projection's other guarantees are intact", async () => {
      const res = await request(appWith(mockNameChange(), PROFILE_ROW))
        .get("/v1/profile")
        .query({ yandexPlayerId: PLAYER })
        .expect(200);
      expect(res.body).not.toHaveProperty("is_paid_citizen");
      expect(res.body).not.toHaveProperty("citizenship_purchased_at");
      expect(res.body).not.toHaveProperty("persistent_id");
    });

    // A newly added secondary subsystem must not be able to take down the read
    // that drives the whole citizenship card.
    it("degrades to no name_change when the state lookup FAILS, rather than 500ing", async () => {
      const app = appWith(
        mockNameChange({
          getLatestState: jest.fn().mockRejectedValue(new Error("db down")),
        }),
        PROFILE_ROW,
      );
      const res = await request(app)
        .get("/v1/profile")
        .query({ yandexPlayerId: PLAYER })
        .expect(200);
      expect(res.body).not.toHaveProperty("name_change");
      expect(res.body.xp).toBe(1000);
    });

    it("does not query name-change state for a profile that does not exist", async () => {
      const nameChange = mockNameChange();
      await request(appWith(nameChange, null))
        .get("/v1/profile")
        .query({ yandexPlayerId: PLAYER })
        .expect(404);
      expect(nameChange.getLatestState).not.toHaveBeenCalled();
    });
  });
});
