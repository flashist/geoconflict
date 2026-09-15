// Integration tests for PaymentsRepository against a REAL Postgres.
// Gated by RUN_DB_TESTS so the default `npm test` (no DB) skips them entirely.
// The schema is built once per run by globalSetup.ts; suites only truncate.
// Keyed by the internal player id since task 0270.
//
// Also carries the brief's verification-7 writer-side regression: find-or-create
// and creditMatchXp must NEVER produce paid state — grantPaidPurchase (reachable
// only through HMAC-verified /complete or /reconcile) is the sole authority for
// is_paid_citizen / citizenship_purchased_at.

import { Pool } from "pg";
import { PaymentsRepository } from "../../src/profile-server/PaymentsRepository";
import {
  PLATFORM_YANDEX_GAMES,
  PlayerIdentityRepository,
} from "../../src/profile-server/PlayerIdentityRepository";
import { PlayerProfileRepository } from "../../src/profile-server/PlayerProfileRepository";
import { createYandexPlayer, truncateProfileTables } from "./support/db";

// A syntactically valid player id that no players row carries.
const GHOST = "00000000-0000-4000-8000-00000000dead";

const RUN = process.env.RUN_DB_TESTS ? describe : describe.skip;

RUN("PaymentsRepository (integration)", () => {
  let pool: Pool;
  let payments: PaymentsRepository;
  let profiles: PlayerProfileRepository;

  let P: string;

  function grantFor(intentId: string | null, token = "tok-1") {
    return {
      purchaseToken: token,
      productId: "citizenship",
      playerId: P,
      intentId,
      rawPayload: '{"test":true}',
    };
  }

  beforeAll(() => {
    pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
    payments = new PaymentsRepository(pool);
    profiles = new PlayerProfileRepository(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    await truncateProfileTables(pool);
    P = await createYandexPlayer(pool, "yandex-pay-1");
  });

  test("createIntent binds the intent to an existing player", async () => {
    const intentId = await payments.createIntent(P, "citizenship");
    expect(intentId).toMatch(/^[0-9a-f-]{36}$/);

    const intent = await payments.findIntent(intentId);
    expect(intent).toEqual({
      id: intentId,
      playerId: P,
      productId: "citizenship",
      usedAt: null,
    });
    const profile = await profiles.getProfile(P);
    expect(profile?.xp).toBe(0);
    expect(profile?.is_paid_citizen).toBe(false);
  });

  // Task 0270: no ensure-profile any more. The route resolves the caller
  // find-only; the foreign key is the last line of defence and creates nothing.
  test("createIntent for an unknown player id is refused by the FK and creates nothing", async () => {
    await expect(
      payments.createIntent(GHOST, "citizenship"),
    ).rejects.toMatchObject({ code: "23503" });
    const players = await pool.query("SELECT count(*)::int AS n FROM players");
    expect(players.rows[0].n).toBe(1); // only P
    const intents = await pool.query(
      "SELECT count(*)::int AS n FROM purchase_intents",
    );
    expect(intents.rows[0].n).toBe(0);
  });

  test("a grant with no players row to flag rolls back — no receipt without an entitlement", async () => {
    await expect(
      payments.grantPaidPurchase({ ...grantFor(null), playerId: GHOST }),
    ).rejects.toThrow("no player row");
    await expect(payments.getProcessedPurchase("tok-1")).resolves.toBeNull();
  });

  test("grantPaidPurchase grants, satisfies CHECKs, and marks the intent used", async () => {
    const intentId = await payments.createIntent(P, "citizenship");
    await expect(payments.grantPaidPurchase(grantFor(intentId))).resolves.toBe(
      "granted",
    );

    const profile = await profiles.getProfile(P);
    expect(profile?.is_citizen).toBe(true);
    expect(profile?.is_paid_citizen).toBe(true);
    expect(profile?.citizenship_purchased_at).not.toBeNull();

    const intent = await payments.findIntent(intentId);
    expect(intent?.usedAt).not.toBeNull();

    const receipt = await payments.getProcessedPurchase("tok-1");
    expect(receipt).toEqual({
      purchaseToken: "tok-1",
      playerId: P,
      productId: "citizenship",
    });
  });

  test("repeat grant of the same token is an idempotent no-op that keeps the original timestamp", async () => {
    const intentId = await payments.createIntent(P, "citizenship");
    await payments.grantPaidPurchase(grantFor(intentId));
    const first = await profiles.getProfile(P);

    await expect(payments.grantPaidPurchase(grantFor(intentId))).resolves.toBe(
      "already_processed",
    );
    const second = await profiles.getProfile(P);
    expect(second?.citizenship_purchased_at).toEqual(
      first?.citizenship_purchased_at,
    );
  });

  test("verification 7: find-or-create and creditMatchXp never produce paid state", async () => {
    const identities = new PlayerIdentityRepository(pool);
    await identities.resolveOrCreatePlayer(
      PLATFORM_YANDEX_GAMES,
      "yandex-pay-1",
      "game_server",
    );
    await profiles.creditMatchXp("game-1", P, 10);

    let profile = await profiles.getProfile(P);
    expect(profile?.is_paid_citizen).toBe(false);
    expect(profile?.citizenship_purchased_at).toBeNull();

    // …and they never CLEAR paid state a verified purchase already granted.
    const intentId = await payments.createIntent(P, "citizenship");
    await payments.grantPaidPurchase(grantFor(intentId));
    await identities.resolveOrCreatePlayer(
      PLATFORM_YANDEX_GAMES,
      "yandex-pay-1",
      "login",
    );
    await profiles.creditMatchXp("game-2", P, 10);

    profile = await profiles.getProfile(P);
    expect(profile?.is_paid_citizen).toBe(true);
    expect(profile?.citizenship_purchased_at).not.toBeNull();
  });
});

// Task 0018 compose-proof: a paid grant and an earned crossing must compose in
// BOTH orders — neither path may clobber the other's flags or timestamps, and
// the earned-inbox trigger must not double-fire for an already-paid citizen.
// (Separate block from the 0019 suite above; shares its harness on purpose.)
RUN("paid × earned citizenship compose (task 0018, integration)", () => {
  let pool: Pool;
  let payments: PaymentsRepository;
  let profiles: PlayerProfileRepository;

  let P: string;

  beforeAll(() => {
    pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
    payments = new PaymentsRepository(pool);
    profiles = new PlayerProfileRepository(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    await truncateProfileTables(pool);
    P = await createYandexPlayer(pool, "yandex-compose-1");
  });

  test("earned then paid: paid grant adds paid state without touching earned state", async () => {
    const credit = await profiles.creditMatchXp("game-c1", P, 1000);
    expect(credit.citizenshipNewlyGranted).toBe(true);
    const earned = await profiles.getProfile(P);
    expect(earned?.is_citizen).toBe(true);
    expect(earned?.is_paid_citizen).toBe(false);
    expect(earned?.citizenship_earned_at).not.toBeNull();

    const intentId = await payments.createIntent(P, "citizenship");
    await expect(
      payments.grantPaidPurchase({
        purchaseToken: "tok-c1",
        productId: "citizenship",
        playerId: P,
        intentId,
        rawPayload: '{"test":true}',
      }),
    ).resolves.toBe("granted");

    const composed = await profiles.getProfile(P);
    expect(composed?.is_citizen).toBe(true);
    expect(composed?.is_paid_citizen).toBe(true);
    expect(composed?.citizenship_purchased_at).not.toBeNull();
    // The earned stamp survives the paid grant, byte for byte.
    expect(composed?.citizenship_earned_at).toEqual(
      earned?.citizenship_earned_at,
    );
    expect(composed?.xp).toBe(1000);
  });

  test("paid then earned: threshold crossing stamps earned_at but reports NO new grant", async () => {
    const intentId = await payments.createIntent(P, "citizenship");
    await payments.grantPaidPurchase({
      purchaseToken: "tok-c2",
      productId: "citizenship",
      playerId: P,
      intentId,
      rawPayload: '{"test":true}',
    });
    const paid = await profiles.getProfile(P);
    expect(paid?.is_citizen).toBe(true);
    expect(paid?.citizenship_earned_at).toBeNull();

    const credit = await profiles.creditMatchXp("game-c2", P, 1000);
    // Already a (paid) citizen — no earned-inbox double-fire (owner-ruled
    // 2026-08-23 in 0017: earned_at still stamps, newlyGranted stays false).
    expect(credit.status).toBe("credited");
    expect(credit.citizenshipNewlyGranted).toBe(false);

    const composed = await profiles.getProfile(P);
    expect(composed?.is_citizen).toBe(true);
    expect(composed?.is_paid_citizen).toBe(true);
    expect(composed?.citizenship_earned_at).not.toBeNull();
    // The paid stamp survives the earned crossing, byte for byte.
    expect(composed?.citizenship_purchased_at).toEqual(
      paid?.citizenship_purchased_at,
    );
  });
});
