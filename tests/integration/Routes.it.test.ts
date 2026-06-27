// HTTP-level integration test: drives createApp() wired to a REAL
// PlayerProfileRepository + Postgres via supertest, proving the full
// upsert -> credit -> read flow works over the API with no psql seeding (the C1
// fix — the slice's "curl-exercisable working backend" priority). Gated by
// RUN_DB_TESTS; see jest.config.ts / TEST_DATABASE_URL.

import { readFileSync } from "fs";
import { join } from "path";
import { Pool } from "pg";
import request from "supertest";
import { PlayerProfileRepository } from "../../src/profile-server/PlayerProfileRepository";
import { createApp } from "../../src/profile-server/Routes";

const RUN = process.env.RUN_DB_TESTS ? describe : describe.skip;
const TOKEN = "it-internal-token";

RUN("profile API over real Postgres (integration)", () => {
  let pool: Pool;
  let app: ReturnType<typeof createApp>;
  const ORIGINAL_TOKEN = process.env.PROFILE_INTERNAL_TOKEN;

  const P = "yandex-http-1";
  const PID = "33333333-3333-3333-3333-333333333333";

  beforeAll(async () => {
    process.env.PROFILE_INTERNAL_TOKEN = TOKEN;
    pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
    const sql = readFileSync(
      join(process.cwd(), "migrations/001_player_profiles.sql"),
      "utf8",
    );
    await pool.query(sql);
    app = createApp(new PlayerProfileRepository(pool));
  });

  afterAll(async () => {
    process.env.PROFILE_INTERNAL_TOKEN = ORIGINAL_TOKEN;
    await pool.end();
  });

  beforeEach(async () => {
    await pool.query(
      `TRUNCATE player_match_xp_credits, player_name_history,
               player_cosmetic_ownership, player_profiles RESTART IDENTITY CASCADE`,
    );
  });

  test("upsert -> credit -> read produces xp 10, no leaked fields", async () => {
    // Before upsert: no profile.
    const missing = await request(app).get(`/v1/profile?yandexPlayerId=${P}`);
    expect(missing.status).toBe(404);

    // Create via the internal endpoint (no psql seeding).
    const created = await request(app)
      .post("/internal/v1/profile/upsert")
      .set("authorization", `Bearer ${TOKEN}`)
      .send({ yandexPlayerId: P, persistentId: PID });
    expect(created.status).toBe(200);
    expect(created.body.xp).toBe(0);
    expect(created.body).not.toHaveProperty("persistent_id");

    // Credit once, then idempotently again.
    const body = {
      credits: [{ gameId: "g1", yandexPlayerId: P, xpAwarded: 10 }],
    };
    const first = await request(app)
      .post("/internal/v1/credit")
      .set("authorization", `Bearer ${TOKEN}`)
      .send(body);
    expect(first.body.results[0].status).toBe("credited");
    const second = await request(app)
      .post("/internal/v1/credit")
      .set("authorization", `Bearer ${TOKEN}`)
      .send(body);
    expect(second.body.results[0].status).toBe("duplicate");

    // Read back: xp 10 (not 20), and no paid / persistent_id leakage.
    const read = await request(app).get(`/v1/profile?yandexPlayerId=${P}`);
    expect(read.status).toBe(200);
    expect(read.body.xp).toBe(10);
    expect(read.body).not.toHaveProperty("persistent_id");
    expect(read.body).not.toHaveProperty("is_paid_citizen");
    expect(read.body).not.toHaveProperty("citizenship_purchased_at");
  });

  test("credit before any profile reports no_profile and writes nothing", async () => {
    const res = await request(app)
      .post("/internal/v1/credit")
      .set("authorization", `Bearer ${TOKEN}`)
      .send({
        credits: [{ gameId: "g1", yandexPlayerId: "ghost", xpAwarded: 10 }],
      });
    expect(res.status).toBe(200);
    expect(res.body.results[0].status).toBe("no_profile");

    const ledger = await pool.query(
      "SELECT count(*)::int AS n FROM player_match_xp_credits",
    );
    expect(ledger.rows[0].n).toBe(0);
  });

  test("upsert relinks persistent_id on a changed value", async () => {
    await request(app)
      .post("/internal/v1/profile/upsert")
      .set("authorization", `Bearer ${TOKEN}`)
      .send({ yandexPlayerId: P, persistentId: PID });
    await request(app)
      .post("/internal/v1/profile/upsert")
      .set("authorization", `Bearer ${TOKEN}`)
      .send({
        yandexPlayerId: P,
        persistentId: "44444444-4444-4444-4444-444444444444",
      });

    const row = await pool.query(
      "SELECT persistent_id FROM player_profiles WHERE yandex_player_id = $1",
      [P],
    );
    expect(row.rows[0].persistent_id).toBe(
      "44444444-4444-4444-4444-444444444444",
    );
  });

  test("upsert with the same persistentId twice is a no-op (200, same row)", async () => {
    const first = await request(app)
      .post("/internal/v1/profile/upsert")
      .set("authorization", `Bearer ${TOKEN}`)
      .send({ yandexPlayerId: P, persistentId: PID });
    expect(first.status).toBe(200);

    const second = await request(app)
      .post("/internal/v1/profile/upsert")
      .set("authorization", `Bearer ${TOKEN}`)
      .send({ yandexPlayerId: P, persistentId: PID });
    expect(second.status).toBe(200);
    expect(second.body.yandex_player_id).toBe(P);
    expect(second.body.xp).toBe(0);
  });

  test("cross-account persistentId collision returns 409, not 500", async () => {
    // First account claims the device's persistentId.
    const first = await request(app)
      .post("/internal/v1/profile/upsert")
      .set("authorization", `Bearer ${TOKEN}`)
      .send({ yandexPlayerId: P, persistentId: PID });
    expect(first.status).toBe(200);

    // A second Yandex account presents the SAME persistentId (account switch /
    // shared browser) — the persistent_id UNIQUE index collides.
    const collision = await request(app)
      .post("/internal/v1/profile/upsert")
      .set("authorization", `Bearer ${TOKEN}`)
      .send({ yandexPlayerId: "yandex-http-2", persistentId: PID });
    expect(collision.status).toBe(409);
    expect(collision.body).toEqual({ error: "persistent_id_conflict" });

    // The second account got no profile row (clean failure, no partial write).
    const after = await request(app).get(
      "/v1/profile?yandexPlayerId=yandex-http-2",
    );
    expect(after.status).toBe(404);
  });
});
