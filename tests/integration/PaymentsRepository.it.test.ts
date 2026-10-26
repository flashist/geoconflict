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
import { PAYMENT_PRODUCT_IDS } from "../../src/core/profile/PaymentsContract";
import {
  durableItemGrant,
  PaymentsRepository,
  PRODUCT_GRANTS,
} from "../../src/profile-server/PaymentsRepository";
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
    await expect(
      payments.grantPaidPurchase(grantFor(intentId)),
    ).resolves.toEqual({ status: "granted", becamePaidCitizen: true });

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

    await expect(
      payments.grantPaidPurchase(grantFor(intentId)),
    ).resolves.toEqual({ status: "already_processed" });
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
    ).resolves.toEqual({ status: "granted", becamePaidCitizen: true });

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

// Task 0492 (B1): the shared paid step and becamePaidCitizen, for every product,
// against real row locks.
RUN("product-grant registry (task 0492, integration)", () => {
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
    P = await createYandexPlayer(pool, "yandex-registry-1");
  });

  describe.each(PAYMENT_PRODUCT_IDS)("%s", (productId) => {
    async function grant(token: string) {
      const intentId = await payments.createIntent(P, productId);
      return payments.grantPaidPurchase({
        purchaseToken: token,
        productId,
        playerId: P,
        intentId,
        rawPayload: '{"test":true}',
      });
    }

    test("first grant: becamePaidCitizen true, paid flag set, receipt recorded", async () => {
      await expect(grant("tok-r1")).resolves.toEqual({
        status: "granted",
        becamePaidCitizen: true,
      });
      const profile = await profiles.getProfile(P);
      expect(profile?.is_paid_citizen).toBe(true);
      await expect(payments.getProcessedPurchase("tok-r1")).resolves.toEqual({
        purchaseToken: "tok-r1",
        playerId: P,
        productId,
      });
    });

    test("a second purchase by the same player: granted, becamePaidCitizen false", async () => {
      await grant("tok-r1");
      await expect(grant("tok-r2")).resolves.toEqual({
        status: "granted",
        becamePaidCitizen: false,
      });
    });

    test("a replayed token: already_processed", async () => {
      const intentId = await payments.createIntent(P, productId);
      const input = {
        purchaseToken: "tok-r1",
        productId,
        playerId: P,
        intentId,
        rawPayload: '{"test":true}',
      };
      await payments.grantPaidPurchase(input);
      await expect(payments.grantPaidPurchase(input)).resolves.toEqual({
        status: "already_processed",
      });
    });

    // The 0425 tester role sets the flags with no purchase behind them.
    test("a player made paid without a purchase: becamePaidCitizen false", async () => {
      await pool.query(
        `UPDATE players
         SET is_citizen = true, is_paid_citizen = true,
             citizenship_purchased_at = now()
         WHERE id = $1`,
        [P],
      );
      await expect(grant("tok-r1")).resolves.toEqual({
        status: "granted",
        becamePaidCitizen: false,
      });
    });

    test("two grants for one player at once: exactly one becamePaidCitizen true", async () => {
      const [intentA, intentB] = await Promise.all([
        payments.createIntent(P, productId),
        payments.createIntent(P, productId),
      ]);
      const outcomes = await Promise.all(
        [
          ["tok-race-a", intentA],
          ["tok-race-b", intentB],
        ].map(([token, intentId]) =>
          payments.grantPaidPurchase({
            purchaseToken: token,
            productId,
            playerId: P,
            intentId,
            rawPayload: '{"test":true}',
          }),
        ),
      );
      expect(outcomes.every((outcome) => outcome.status === "granted")).toBe(
        true,
      );
      const flags = outcomes.map((outcome) =>
        outcome.status === "granted" ? outcome.becamePaidCitizen : null,
      );
      expect(flags.sort()).toEqual([false, true]);
    });
  });
});

// Task 0496 (B4): the durable-item base over real Postgres. No item is sellable
// yet, so a test-only id reaches the repository through its registry seam.
RUN("PaymentsRepository — durable items (task 0496, integration)", () => {
  const TEST_ITEM = "test_durable_item";
  let pool: Pool;
  let payments: PaymentsRepository;
  let items: PaymentsRepository;
  let profiles: PlayerProfileRepository;
  let P: string;

  beforeAll(() => {
    pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
    payments = new PaymentsRepository(pool);
    items = new PaymentsRepository(pool, undefined, {
      ...PRODUCT_GRANTS,
      [TEST_ITEM]: durableItemGrant(null),
    });
    profiles = new PlayerProfileRepository(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    await truncateProfileTables(pool);
    P = await createYandexPlayer(pool, "yandex-item-1");
  });

  async function grantItem(token: string, productId = TEST_ITEM) {
    const intentId = await items.createIntent(P, productId);
    return items.grantPaidPurchase({
      purchaseToken: token,
      productId,
      playerId: P,
      intentId,
      rawPayload: '{"test":true}',
    });
  }

  async function entitlementRows(playerId: string) {
    const res = await pool.query(
      `SELECT product_id, purchase_token, granted_at
       FROM player_entitlements WHERE player_id = $1`,
      [playerId],
    );
    return res.rows;
  }

  test("createIntent accepts the item id", async () => {
    const intentId = await items.createIntent(P, TEST_ITEM);
    await expect(items.findIntent(intentId)).resolves.toMatchObject({
      playerId: P,
      productId: TEST_ITEM,
      usedAt: null,
    });
  });

  test("first grant: one row, the paid flags and the receipt", async () => {
    await expect(grantItem("tok-i1")).resolves.toEqual({
      status: "granted",
      becamePaidCitizen: true,
    });
    const rows = await entitlementRows(P);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      product_id: TEST_ITEM,
      purchase_token: "tok-i1",
    });
    const profile = await profiles.getProfile(P);
    expect(profile?.is_paid_citizen).toBe(true);
    expect(profile?.is_citizen).toBe(true);
    await expect(payments.getProcessedPurchase("tok-i1")).resolves.toEqual({
      purchaseToken: "tok-i1",
      playerId: P,
      productId: TEST_ITEM,
    });
  });

  test("listEntitlements: the owned item, and [] for a player with none", async () => {
    await grantItem("tok-i1");
    await expect(items.listEntitlements(P)).resolves.toEqual([TEST_ITEM]);
    const other = await createYandexPlayer(pool, "yandex-item-2");
    await expect(items.listEntitlements(other)).resolves.toEqual([]);
  });

  test("a citizenship purchase writes no entitlement", async () => {
    const intentId = await payments.createIntent(P, "citizenship");
    await payments.grantPaidPurchase({
      purchaseToken: "tok-c1",
      productId: "citizenship",
      playerId: P,
      intentId,
      rawPayload: '{"test":true}',
    });
    await expect(payments.listEntitlements(P)).resolves.toEqual([]);
  });

  test("a replayed token: already_processed, still one row", async () => {
    const intentId = await items.createIntent(P, TEST_ITEM);
    const input = {
      purchaseToken: "tok-i1",
      productId: TEST_ITEM,
      playerId: P,
      intentId,
      rawPayload: '{"test":true}',
    };
    await items.grantPaidPurchase(input);
    await expect(items.grantPaidPurchase(input)).resolves.toEqual({
      status: "already_processed",
    });
    expect(await entitlementRows(P)).toHaveLength(1);
  });

  test("a second token for an owned item (two tabs): granted, false; the original row kept", async () => {
    await grantItem("tok-i1");
    const [original] = await entitlementRows(P);
    await expect(grantItem("tok-i2")).resolves.toEqual({
      status: "granted",
      becamePaidCitizen: false,
    });
    const rows = await entitlementRows(P);
    expect(rows).toHaveLength(1);
    expect(rows[0].purchase_token).toBe("tok-i1");
    expect(rows[0].granted_at).toEqual(original.granted_at);
  });

  test("citizenship first, then the item: becamePaidCitizen false, row written", async () => {
    const intentId = await payments.createIntent(P, "citizenship");
    await payments.grantPaidPurchase({
      purchaseToken: "tok-c1",
      productId: "citizenship",
      playerId: P,
      intentId,
      rawPayload: '{"test":true}',
    });
    await expect(grantItem("tok-i1")).resolves.toEqual({
      status: "granted",
      becamePaidCitizen: false,
    });
    expect(await entitlementRows(P)).toHaveLength(1);
  });

  test("deleting the player cascades its rows; the receipt stays", async () => {
    await grantItem("tok-i1");
    await pool.query("DELETE FROM players WHERE id = $1", [P]);
    expect(await entitlementRows(P)).toHaveLength(0);
    await expect(
      payments.getProcessedPurchase("tok-i1"),
    ).resolves.toMatchObject({ purchaseToken: "tok-i1" });
  });

  test("the default repository refuses the item id and writes nothing", async () => {
    const intentId = await payments.createIntent(P, TEST_ITEM);
    await expect(
      payments.grantPaidPurchase({
        purchaseToken: "tok-i1",
        productId: TEST_ITEM,
        playerId: P,
        intentId,
        rawPayload: '{"test":true}',
      }),
    ).rejects.toThrow("no grant defined");
    await expect(payments.getProcessedPurchase("tok-i1")).resolves.toBeNull();
    expect(await entitlementRows(P)).toHaveLength(0);
  });
});

// Task 0506 (spec §6.2): the sightings table is evidence for the manual merge. It
// never touches the ledger or either profile.
RUN("PaymentsRepository — holder sightings (task 0506, integration)", () => {
  let pool: Pool;
  let payments: PaymentsRepository;
  let holder: string;
  let seen: string;

  beforeAll(() => {
    pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
    payments = new PaymentsRepository(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    await truncateProfileTables(pool);
    holder = await createYandexPlayer(pool, "yandex-holder-0506");
    seen = await createYandexPlayer(pool, "yandex-seen-0506");
  });

  async function sightingRows() {
    const res = await pool.query(
      `SELECT purchase_token, holder_player_id, seen_player_id, payload_issued_at,
              first_seen_at, last_seen_at, seen_count
       FROM purchase_holder_sightings ORDER BY purchase_token, seen_player_id`,
    );
    return res.rows;
  }

  test("migration 011 was applied by the runner", async () => {
    const res = await pool.query(
      "SELECT 1 FROM schema_migrations WHERE filename = '011_purchase_holder_sightings.sql'",
    );
    expect(res.rows).toHaveLength(1);
  });

  test("the upsert counts repeats, moves last_seen_at, and keeps the latest holder and issuedAt", async () => {
    const firstIssuedAt = new Date("2026-10-26T10:00:00.000Z");
    await payments.recordHolderSighting({
      purchaseToken: "tok-s1",
      holderPlayerId: holder,
      seenPlayerId: seen,
      payloadIssuedAt: firstIssuedAt,
    });
    const [first] = await sightingRows();
    expect(first.seen_count).toBe(1);
    expect(first.payload_issued_at.toISOString()).toBe(
      firstIssuedAt.toISOString(),
    );
    expect(first.first_seen_at.getTime()).toBe(first.last_seen_at.getTime());

    await new Promise((resolve) => setTimeout(resolve, 20));
    await payments.recordHolderSighting({
      purchaseToken: "tok-s1",
      holderPlayerId: holder,
      seenPlayerId: seen,
      payloadIssuedAt: null,
    });
    const rows = await sightingRows();
    expect(rows).toHaveLength(1);
    expect(rows[0].seen_count).toBe(2);
    expect(rows[0].payload_issued_at).toBeNull();
    expect(rows[0].first_seen_at.getTime()).toBe(first.first_seen_at.getTime());
    expect(rows[0].last_seen_at.getTime()).toBeGreaterThan(
      first.last_seen_at.getTime(),
    );
  });

  test("deleting the seen player cascades its sightings; the ledger row is untouched", async () => {
    const intentId = await payments.createIntent(holder, "citizenship");
    await payments.grantPaidPurchase({
      purchaseToken: "tok-s1",
      productId: "citizenship",
      playerId: holder,
      intentId,
      rawPayload: '{"test":true}',
    });
    await payments.recordHolderSighting({
      purchaseToken: "tok-s1",
      holderPlayerId: holder,
      seenPlayerId: seen,
      payloadIssuedAt: null,
    });
    await pool.query("DELETE FROM players WHERE id = $1", [seen]);
    expect(await sightingRows()).toHaveLength(0);
    await expect(payments.getProcessedPurchase("tok-s1")).resolves.toEqual({
      purchaseToken: "tok-s1",
      playerId: holder,
      productId: "citizenship",
    });
  });

  test("a sighting for a seen player that does not exist is refused by the FK", async () => {
    await expect(
      payments.recordHolderSighting({
        purchaseToken: "tok-s1",
        holderPlayerId: holder,
        seenPlayerId: GHOST,
        payloadIssuedAt: null,
      }),
    ).rejects.toMatchObject({ code: "23503" });
  });
});
