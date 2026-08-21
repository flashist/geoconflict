// Integration tests for PaymentsRepository against a REAL Postgres.
// Gated by RUN_DB_TESTS so the default `npm test` (no DB) skips them entirely.
// See jest.integration.config.ts for how to run.
//
// Also carries the brief's verification-7 writer-side regression: upsertProfile
// and creditMatchXp must NEVER produce paid state — grantPaidPurchase (reachable
// only through HMAC-verified /complete or /reconcile) is the sole authority for
// is_paid_citizen / citizenship_purchased_at.

import { readFileSync } from "fs";
import { join } from "path";
import { Pool } from "pg";
import { PaymentsRepository } from "../../src/profile-server/PaymentsRepository";
import { PlayerProfileRepository } from "../../src/profile-server/PlayerProfileRepository";

const RUN = process.env.RUN_DB_TESTS ? describe : describe.skip;

RUN("PaymentsRepository (integration)", () => {
  let pool: Pool;
  let payments: PaymentsRepository;
  let profiles: PlayerProfileRepository;

  const P = "yandex-pay-1";

  function grantFor(intentId: string | null, token = "tok-1") {
    return {
      purchaseToken: token,
      productId: "citizenship",
      yandexPlayerId: P,
      intentId,
      rawPayload: '{"test":true}',
    };
  }

  beforeAll(async () => {
    pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
    for (const file of [
      "migrations/001_player_profiles.sql",
      "migrations/002_yandex_payments.sql",
    ]) {
      await pool.query(readFileSync(join(process.cwd(), file), "utf8"));
    }
    payments = new PaymentsRepository(pool);
    profiles = new PlayerProfileRepository(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    await pool.query(
      `TRUNCATE processed_purchases, purchase_intents, player_match_xp_credits,
               player_name_history, player_cosmetic_ownership, player_profiles
       RESTART IDENTITY CASCADE`,
    );
  });

  test("createIntent works for a buyer with NO profile row yet (ensure-row)", async () => {
    const intentId = await payments.createIntent(P, "citizenship");
    expect(intentId).toMatch(/^[0-9a-f-]{36}$/);

    const intent = await payments.findIntent(intentId);
    expect(intent).toEqual({
      id: intentId,
      yandexPlayerId: P,
      productId: "citizenship",
      usedAt: null,
    });
    // The ensured profile row exists at xp 0 with no paid state.
    const profile = await profiles.getProfile(P);
    expect(profile?.xp).toBe(0);
    expect(profile?.is_paid_citizen).toBe(false);
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
      yandexPlayerId: P,
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

  test("verification 7: upsertProfile and creditMatchXp never produce paid state", async () => {
    await profiles.upsertProfile(P, "pid-pay-1");
    await profiles.creditMatchXp("game-1", P, 10);

    let profile = await profiles.getProfile(P);
    expect(profile?.is_paid_citizen).toBe(false);
    expect(profile?.citizenship_purchased_at).toBeNull();

    // …and they never CLEAR paid state a verified purchase already granted.
    const intentId = await payments.createIntent(P, "citizenship");
    await payments.grantPaidPurchase(grantFor(intentId));
    await profiles.upsertProfile(P, "pid-pay-2");
    await profiles.creditMatchXp("game-2", P, 10);

    profile = await profiles.getProfile(P);
    expect(profile?.is_paid_citizen).toBe(true);
    expect(profile?.citizenship_purchased_at).not.toBeNull();
  });
});
