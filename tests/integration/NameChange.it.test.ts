// HTTP-level integration test for citizen name changes (task 0067): drives
// createApp() wired to a REAL NameChangeRepository + Postgres via supertest.
// This is where the brief's verification steps are actually PROVEN — the real
// CHECK constraints, the real partial unique index, the real transaction, and
// the real post-commit inbox send. Gated by RUN_DB_TESTS; see jest.config.ts.
// The schema is built once per run by globalSetup.ts; this suite only truncates.
//
// Task 0270: the player routes still take the Yandex id (resolved find-only to
// the internal player id); the operator decide route takes the internal
// `playerId`. Rows are read back by player_id.

import { Pool } from "pg";
import request from "supertest";
import { InboxRepository } from "../../src/profile-server/InboxRepository";
import { NameChangeRepository } from "../../src/profile-server/NameChangeRepository";
import { createApp } from "../../src/profile-server/Routes";
import {
  createYandexPlayer,
  realProfileRepo,
  truncateProfileTables,
} from "./support/db";

const RUN = process.env.RUN_DB_TESTS ? describe : describe.skip;
const TOKEN = "it-internal-token";

/** Post-commit inbox sends land a tick after the HTTP response — poll, don't sleep. */
async function waitForMessages(
  pool: Pool,
  playerId: string,
  expected: number,
): Promise<Array<{ template_key: string | null; template_params: unknown }>> {
  const deadline = Date.now() + 3_000;
  for (;;) {
    const res = await pool.query(
      `SELECT template_key, template_params FROM player_messages
       WHERE player_id = $1 ORDER BY id`,
      [playerId],
    );
    if (res.rows.length >= expected) return res.rows;
    if (Date.now() > deadline) {
      throw new Error(
        `expected ${expected} inbox message(s), saw ${res.rows.length}`,
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
}

RUN("citizen name change over real Postgres (integration)", () => {
  let pool: Pool;
  let app: ReturnType<typeof createApp>;
  const ORIGINAL_TOKEN = process.env.PROFILE_INTERNAL_TOKEN;

  // Yandex ids — what the player routes are called with.
  const CITIZEN = "yandex-nc-citizen";
  const OTHER = "yandex-nc-other";
  const PLAIN = "yandex-nc-plain";
  // Internal player ids — what the operator route and the tables are keyed by.
  const ids: Record<string, string> = {};

  beforeAll(() => {
    process.env.PROFILE_INTERNAL_TOKEN = TOKEN;
    pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
  });

  afterAll(async () => {
    process.env.PROFILE_INTERNAL_TOKEN = ORIGINAL_TOKEN;
    await pool.end();
  });

  beforeEach(async () => {
    // A FRESH app per test, on purpose: createApp builds the per-IP rate
    // limiter, and every request in this suite comes from 127.0.0.1. Sharing
    // one app across the whole file would exhaust the name-change limiter's
    // window and turn later tests into 429s. (Real clients are spread across
    // real IPs; this is a harness artifact, not the limiter being wrong.)
    const inbox = new InboxRepository(pool);
    // No Telegram config — the operator notification is unit-tested with a
    // mocked undici; nothing here should ever touch the network.
    app = createApp(
      realProfileRepo(pool, inbox),
      undefined,
      inbox,
      new NameChangeRepository(pool, inbox),
    );
    await truncateProfileTables(pool);
    for (const [yandexId, xp, citizen, name] of [
      [CITIZEN, 1000, true, null],
      [OTHER, 1000, true, "Ivan"],
      [PLAIN, 10, false, null],
    ] as const) {
      const playerId = await createYandexPlayer(pool, yandexId);
      ids[yandexId] = playerId;
      await pool.query(
        `UPDATE players
         SET xp = $2, is_citizen = $3,
             citizenship_earned_at = CASE WHEN $3 THEN now() END,
             display_name = $4
         WHERE id = $1`,
        [playerId, xp, citizen, name],
      );
    }
  });

  const submit = (yandexPlayerId: string, requestedName: string) =>
    request(app)
      .post("/v1/profile/name-change-request")
      .send({ yandexPlayerId, requestedName });

  /** Operator decision for the player behind a Yandex id, sent by internal playerId. */
  const decide = (yandexId: string, body: Record<string, unknown>) =>
    request(app)
      .post("/internal/v1/name-change/decide")
      .set("Authorization", `Bearer ${TOKEN}`)
      .send({ playerId: ids[yandexId], ...body });

  const rows = async (yandexId: string) =>
    (
      await pool.query(
        `SELECT new_display_name, old_display_name, moderation_status,
                rejection_reason, decided_at
         FROM player_name_history WHERE player_id = $1 ORDER BY id`,
        [ids[yandexId]],
      )
    ).rows;

  const displayName = async (yandexId: string) =>
    (
      await pool.query("SELECT display_name FROM players WHERE id = $1", [
        ids[yandexId],
      ])
    ).rows[0].display_name;

  // ── Step 1 — non-citizen rejected SERVER-side ────────────────────────────
  it("rejects a non-citizen's direct POST and writes nothing", async () => {
    await submit(PLAIN, "NewName").expect(403, { error: "not_citizen" });
    expect(await rows(PLAIN)).toHaveLength(0);
  });

  it("rejects a player with no profile row at all — and creates none", async () => {
    await submit("no-such-player", "NewName").expect(403, {
      error: "not_citizen",
    });
    const players = await pool.query("SELECT count(*)::int AS n FROM players");
    expect(players.rows[0].n).toBe(3);
  });

  it("the operator route refuses a Yandex id — it takes the internal playerId only", async () => {
    await submit(CITIZEN, "NewName").expect(200);
    await request(app)
      .post("/internal/v1/name-change/decide")
      .set("Authorization", `Bearer ${TOKEN}`)
      .send({ yandexPlayerId: CITIZEN, decision: "approve" })
      .expect(400, { error: "bad_request" });
    expect((await rows(CITIZEN))[0].moderation_status).toBe("pending");
  });

  // ── Step 2 — a valid request lands PENDING and changes nothing yet ───────
  it("writes a PENDING row and leaves display_name untouched", async () => {
    await submit(CITIZEN, "NewName").expect(200, { status: "ok" });
    const history = await rows(CITIZEN);
    expect(history).toHaveLength(1);
    // The 001 default is 'approved' — assert the explicit override, because a
    // silently-approved row is the whole trap this task had to avoid.
    expect(history[0].moderation_status).toBe("pending");
    expect(history[0].new_display_name).toBe("NewName");
    expect(history[0].decided_at).toBeNull();
    expect(await displayName(CITIZEN)).toBeNull();
  });

  it("surfaces the pending state on GET /v1/profile", async () => {
    await submit(CITIZEN, "NewName").expect(200);
    const res = await request(app)
      .get("/v1/profile")
      .query({ yandexPlayerId: CITIZEN })
      .expect(200);
    expect(res.body.name_change).toEqual({
      status: "pending",
      requested_name: "NewName",
      decided_at: null,
    });
  });

  // ── Step 3 — approve is atomic and notifies ──────────────────────────────
  it("approve applies the name, marks the row, and sends the inbox message", async () => {
    await submit(CITIZEN, "NewName").expect(200);
    await decide(CITIZEN, { decision: "approve" }).expect(200, {
      status: "ok",
    });

    expect(await displayName(CITIZEN)).toBe("NewName");
    const history = await rows(CITIZEN);
    expect(history[0].moderation_status).toBe("approved");
    expect(history[0].decided_at).not.toBeNull();
    expect(history[0].old_display_name).toBeNull(); // had no name before

    const res = await request(app)
      .get("/v1/profile")
      .query({ yandexPlayerId: CITIZEN })
      .expect(200);
    expect(res.body.display_name).toBe("NewName");

    const messages = await waitForMessages(pool, ids[CITIZEN], 1);
    expect(messages[0].template_key).toBe("name_change_approved");
    expect(messages[0].template_params).toEqual({ name: "NewName" });
  });

  it("captures the PREVIOUS display name into old_display_name", async () => {
    await submit(OTHER, "Petr").expect(200);
    await decide(OTHER, { decision: "approve" }).expect(200);
    const history = await rows(OTHER);
    expect(history[0].old_display_name).toBe("Ivan");
    expect(await displayName(OTHER)).toBe("Petr");
  });

  it("404s an approve with no pending request", async () => {
    await decide(CITIZEN, { decision: "approve" }).expect(404, {
      error: "no_pending",
    });
  });

  // ── Step 4 — reject with a reason, then a NEW request is allowed ─────────
  it("reject records the reason, leaves the name, and notifies", async () => {
    await submit(CITIZEN, "BadName").expect(200);
    await decide(CITIZEN, {
      decision: "reject",
      reason: "impersonation",
    }).expect(200, { status: "ok" });

    const history = await rows(CITIZEN);
    expect(history[0].moderation_status).toBe("rejected");
    expect(history[0].rejection_reason).toBe("impersonation");
    expect(history[0].decided_at).not.toBeNull();
    expect(await displayName(CITIZEN)).toBeNull();

    const messages = await waitForMessages(pool, ids[CITIZEN], 1);
    expect(messages[0].template_key).toBe("name_change_rejected");
    expect(messages[0].template_params).toEqual({
      name: "BadName",
      reason: "impersonation",
    });
  });

  it("the rejection reason is NOT exposed on the public profile", async () => {
    await submit(CITIZEN, "BadName").expect(200);
    await decide(CITIZEN, {
      decision: "reject",
      reason: "secret operator note",
    }).expect(200);
    const res = await request(app)
      .get("/v1/profile")
      .query({ yandexPlayerId: CITIZEN })
      .expect(200);
    expect(res.body.name_change.status).toBe("rejected");
    expect(JSON.stringify(res.body)).not.toContain("secret operator note");
  });

  it("allows a NEW request after a rejection", async () => {
    await submit(CITIZEN, "BadName").expect(200);
    await decide(CITIZEN, { decision: "reject", reason: "nope" }).expect(200);
    await submit(CITIZEN, "BetterName").expect(200, { status: "ok" });
    const history = await rows(CITIZEN);
    expect(history).toHaveLength(2);
    expect(history[1].moderation_status).toBe("pending");
  });

  // ── Step 5 — case-insensitive uniqueness, NO pending row ─────────────────
  it("refuses a case-insensitively duplicate name and writes NO pending row", async () => {
    // OTHER already holds 'Ivan'.
    await submit(CITIZEN, "ivan").expect(409, { error: "name_taken" });
    await submit(CITIZEN, "IVAN").expect(409, { error: "name_taken" });
    expect(await rows(CITIZEN)).toHaveLength(0);
  });

  // ── Step 6 — one pending request at a time ───────────────────────────────
  it("refuses a second request while one is pending (the partial unique index)", async () => {
    await submit(CITIZEN, "NameOne").expect(200);
    await submit(CITIZEN, "NameTwo").expect(409, { error: "pending_exists" });
    const history = await rows(CITIZEN);
    expect(history).toHaveLength(1);
    expect(history[0].new_display_name).toBe("NameOne");
  });

  it("still allows a DIFFERENT player to have their own pending request", async () => {
    await submit(CITIZEN, "NameOne").expect(200);
    await submit(OTHER, "NameTwo").expect(200);
    expect(await rows(OTHER)).toHaveLength(1);
  });

  // ── Owner amendment 2 — self-service cancel ──────────────────────────────
  describe("cancel (owner amendment 2)", () => {
    const cancel = (yandexPlayerId: string) =>
      request(app)
        .post("/v1/profile/name-change-cancel")
        .send({ yandexPlayerId });

    it("withdraws the pending row and frees the one-pending slot", async () => {
      await submit(CITIZEN, "NameOne").expect(200);
      await cancel(CITIZEN).expect(200, { status: "ok" });
      expect(await rows(CITIZEN)).toHaveLength(0);
      // The whole point: a NEW request then succeeds.
      await submit(CITIZEN, "NameTwo").expect(200, { status: "ok" });
      expect(await rows(CITIZEN)).toHaveLength(1);
    });

    it("404s when there is nothing pending", async () => {
      await cancel(CITIZEN).expect(404, { error: "no_pending" });
    });

    it("is citizen-gated", async () => {
      await cancel(PLAIN).expect(403, { error: "not_citizen" });
    });

    it("NEVER deletes an already-decided row", async () => {
      await submit(CITIZEN, "NameOne").expect(200);
      await decide(CITIZEN, { decision: "approve" }).expect(200);
      await cancel(CITIZEN).expect(404, { error: "no_pending" });
      // The approved history row survives — the audit trail is intact.
      const history = await rows(CITIZEN);
      expect(history).toHaveLength(1);
      expect(history[0].moderation_status).toBe("approved");
    });

    it("does not touch ANOTHER player's pending request", async () => {
      await submit(CITIZEN, "NameOne").expect(200);
      await submit(OTHER, "NameTwo").expect(200);
      await cancel(CITIZEN).expect(200);
      expect(await rows(OTHER)).toHaveLength(1);
    });
  });

  // ── Beyond the brief: the approve-time uniqueness race ───────────────────
  it("409s the approve-time race and leaves the loser's request PENDING", async () => {
    // Both citizens request the SAME name — the request-time check is advisory
    // only, so both pending rows are legitimately created.
    await submit(CITIZEN, "Duplicate").expect(200);
    await submit(OTHER, "Duplicate").expect(200);

    await decide(CITIZEN, { decision: "approve" }).expect(200);
    expect(await displayName(CITIZEN)).toBe("Duplicate");

    // The second approve hits players_display_name_uq.
    await decide(OTHER, { decision: "approve" }).expect(409, {
      error: "name_taken",
    });
    // Rolled back: the row is still actionable, and the name is unchanged.
    const history = await rows(OTHER);
    expect(history[0].moderation_status).toBe("pending");
    expect(history[0].decided_at).toBeNull();
    expect(await displayName(OTHER)).toBe("Ivan");

    // The operator can still reject it cleanly.
    await decide(OTHER, { decision: "reject", reason: "already taken" }).expect(
      200,
    );
    expect((await rows(OTHER))[0].moderation_status).toBe("rejected");
  });

  it("lets a player re-request the name they already hold", async () => {
    // The taken-check excludes the caller's own row, so this is not a collision.
    await submit(OTHER, "Ivan").expect(200, { status: "ok" });
    await decide(OTHER, { decision: "approve" }).expect(200);
    expect(await displayName(OTHER)).toBe("Ivan");
  });

  // ── Validation mirrors the in-game username rules (owner ruling c) ───────
  it.each([
    ["ab", "too_short"],
    ["a".repeat(28), "too_long"],
    ["Bad!Name", "invalid_chars"],
    ["Cat🐈User", "invalid_chars"],
  ])("refuses %s with violation %s and writes nothing", async (name, rule) => {
    await submit(CITIZEN, name).expect(400, {
      error: "invalid",
      violation: rule,
    });
    expect(await rows(CITIZEN)).toHaveLength(0);
  });

  it("accepts Cyrillic and bracketed names, as the in-game validator does", async () => {
    await submit(CITIZEN, "Привет123").expect(200);
    await decide(CITIZEN, { decision: "approve" }).expect(200);
    expect(await displayName(CITIZEN)).toBe("Привет123");
  });

  // Direct POSTs skip the card, which trims for us. The server trims too, so a
  // whitespace-only name cannot slip past the rules it is supposed to mirror.
  it("400s a whitespace-only name instead of storing three spaces", async () => {
    await submit(CITIZEN, "   ").expect(400, {
      error: "invalid",
      violation: "too_short",
    });
    expect(await rows(CITIZEN)).toHaveLength(0);
  });

  it("stores and applies the TRIMMED name from a padded direct POST", async () => {
    await submit(CITIZEN, "  Padded  ").expect(200);
    expect((await rows(CITIZEN))[0].new_display_name).toBe("Padded");
    await decide(CITIZEN, { decision: "approve" }).expect(200);
    expect(await displayName(CITIZEN)).toBe("Padded");
  });

  // ── Review R1 — the decision is bound to the name the operator saw ───────
  describe("expectedName binding (review R1, owner ruling A)", () => {
    const cancel = (yandexPlayerId: string) =>
      request(app)
        .post("/v1/profile/name-change-cancel")
        .send({ yandexPlayerId });

    it("REFUSES a decision on a name swapped by a request/cancel/re-request cycle", async () => {
      // This is the bypass. Without the binding, the operator holds a message
      // naming "InnocentName", the pending row now says "OffensiveName", and
      // approving by player id alone applies a name nobody reviewed.
      await submit(CITIZEN, "InnocentName").expect(200);
      await cancel(CITIZEN).expect(200);
      await submit(CITIZEN, "OffensiveName").expect(200);

      const res = await decide(CITIZEN, {
        decision: "approve",
        expectedName: "InnocentName",
      }).expect(409);
      expect(res.body).toEqual({
        error: "name_mismatch",
        pending_name: "OffensiveName",
      });

      // NOTHING applied, and the request is still actionable.
      expect(await displayName(CITIZEN)).toBeNull();
      const history = await rows(CITIZEN);
      expect(history).toHaveLength(1);
      expect(history[0].new_display_name).toBe("OffensiveName");
      expect(history[0].moderation_status).toBe("pending");
      expect(history[0].decided_at).toBeNull();
    });

    it("applies normally once the operator decides on the CURRENT name", async () => {
      await submit(CITIZEN, "InnocentName").expect(200);
      await cancel(CITIZEN).expect(200);
      await submit(CITIZEN, "SecondName").expect(200);
      await decide(CITIZEN, {
        decision: "approve",
        expectedName: "SecondName",
      }).expect(200, { status: "ok" });
      expect(await displayName(CITIZEN)).toBe("SecondName");
    });

    it("blocks a REJECTION on a stale name too", async () => {
      await submit(CITIZEN, "InnocentName").expect(200);
      await cancel(CITIZEN).expect(200);
      await submit(CITIZEN, "OffensiveName").expect(200);
      await decide(CITIZEN, {
        decision: "reject",
        reason: "impersonation",
        expectedName: "InnocentName",
      }).expect(409);
      expect((await rows(CITIZEN))[0].moderation_status).toBe("pending");
    });

    it("is OPTIONAL — an omitted expectedName decides as before", async () => {
      await submit(CITIZEN, "PlainName").expect(200);
      await decide(CITIZEN, { decision: "approve" }).expect(200, {
        status: "ok",
      });
      expect(await displayName(CITIZEN)).toBe("PlainName");
    });
  });

  it("400s a rejection with no reason — the inbox template requires one", async () => {
    await submit(CITIZEN, "NewName").expect(200);
    await decide(CITIZEN, { decision: "reject" }).expect(400, {
      error: "bad_request",
    });
    // Still pending — a refused decision must not half-apply.
    expect((await rows(CITIZEN))[0].moderation_status).toBe("pending");
  });

  it("401s the decide endpoint without the internal token", async () => {
    await submit(CITIZEN, "NewName").expect(200);
    await request(app)
      .post("/internal/v1/name-change/decide")
      .send({ playerId: ids[CITIZEN], decision: "approve" })
      .expect(401);
    expect((await rows(CITIZEN))[0].moderation_status).toBe("pending");
  });
});
