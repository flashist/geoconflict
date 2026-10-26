// Unit tests for PaymentsRepository over a mocked pg Pool — transaction
// choreography and the idempotent short-circuit. (Real-Postgres behavior, CHECK
// constraints included, is covered in tests/integration/PaymentsRepository.it.test.ts
// under RUN_DB_TESTS.)

import type { Pool } from "pg";
import { PAYMENT_PRODUCT_IDS } from "../../src/core/profile/PaymentsContract";
import {
  durableItemGrant,
  plausibleIssuedAt,
  PRODUCT_GRANTS,
  PaymentsRepository,
  welcomeTemplatesFor,
} from "../../src/profile-server/PaymentsRepository";
import { ITEM_PURCHASE_INBOX_TEMPLATE_KEYS } from "../../src/profile-server/PublicProjection";

interface MockClient {
  query: jest.Mock;
  release: jest.Mock;
}

function makePool(client: MockClient): {
  pool: Pool;
  poolQuery: jest.Mock;
} {
  const poolQuery = jest.fn();
  const pool = {
    query: poolQuery,
    connect: jest.fn().mockResolvedValue(client),
  } as unknown as Pool;
  return { pool, poolQuery };
}

const PLAYER_ID = "0b6f8a52-3c1e-4d7a-9f10-2a4b6c8d0e1f";

function grantInput(overrides: Record<string, unknown> = {}) {
  return {
    purchaseToken: "tok-1",
    productId: "citizenship",
    playerId: PLAYER_ID,
    intentId: "11111111-1111-1111-1111-111111111111",
    rawPayload: "{}",
    ...overrides,
  };
}

describe("PaymentsRepository", () => {
  describe("createIntent", () => {
    it("inserts the intent for an existing player and commits — no ensure-profile step", async () => {
      const client: MockClient = {
        query: jest.fn().mockImplementation(async (sql: string) => {
          if (sql.includes("RETURNING id")) {
            return { rows: [{ id: "intent-1" }] };
          }
          return { rows: [] };
        }),
        release: jest.fn(),
      };
      const { pool } = makePool(client);
      const repo = new PaymentsRepository(pool);

      await expect(repo.createIntent(PLAYER_ID, "citizenship")).resolves.toBe(
        "intent-1",
      );

      const statements = client.query.mock.calls.map((call) => String(call[0]));
      expect(statements[0]).toBe("BEGIN");
      expect(statements[1]).toContain("INSERT INTO purchase_intents");
      expect(client.query.mock.calls[1][1]).toEqual([PLAYER_ID, "citizenship"]);
      expect(
        statements.some((sql) => sql.includes("INSERT INTO players")),
      ).toBe(false);
      expect(statements[statements.length - 1]).toBe("COMMIT");
      expect(client.release).toHaveBeenCalled();
    });

    it("rolls back and rethrows on failure", async () => {
      const client: MockClient = {
        query: jest.fn().mockImplementation(async (sql: string) => {
          if (sql.includes("purchase_intents")) {
            throw new Error("boom");
          }
          return { rows: [] };
        }),
        release: jest.fn(),
      };
      const { pool } = makePool(client);
      const repo = new PaymentsRepository(pool);

      await expect(repo.createIntent(PLAYER_ID, "citizenship")).rejects.toThrow(
        "boom",
      );
      const statements = client.query.mock.calls.map((call) => String(call[0]));
      expect(statements).toContain("ROLLBACK");
      expect(statements).not.toContain("COMMIT");
      expect(client.release).toHaveBeenCalled();
    });
  });

  describe("grantPaidPurchase", () => {
    it("fresh token: records receipt, sets flags, marks intent used, commits", async () => {
      const client: MockClient = {
        query: jest.fn().mockImplementation(async (sql: string) => {
          if (sql.includes("INSERT INTO processed_purchases")) {
            return { rows: [{ purchase_token: "tok-1" }] };
          }
          if (sql.includes("is_paid_citizen = true")) {
            return { rows: [], rowCount: 1 };
          }
          return { rows: [] };
        }),
        release: jest.fn(),
      };
      const { pool } = makePool(client);
      const repo = new PaymentsRepository(pool);

      await expect(repo.grantPaidPurchase(grantInput())).resolves.toEqual({
        status: "granted",
        becamePaidCitizen: true,
      });

      const statements = client.query.mock.calls.map((call) => String(call[0]));
      expect(statements[0]).toBe("BEGIN");
      expect(
        statements.some((sql) => sql.includes("is_paid_citizen = true")),
      ).toBe(true);
      expect(
        statements.some((sql) => sql.includes("UPDATE purchase_intents")),
      ).toBe(true);
      expect(statements[statements.length - 1]).toBe("COMMIT");
    });

    // processed_purchases.player_id has no FK, so without this check a grant for
    // a vanished player would commit a receipt with no entitlement behind it.
    it("no players row to flag: throws and rolls back the whole grant (receipt included)", async () => {
      const client: MockClient = {
        query: jest.fn().mockImplementation(async (sql: string) => {
          if (sql.includes("INSERT INTO processed_purchases")) {
            return { rows: [{ purchase_token: "tok-1" }] };
          }
          if (sql.includes("is_paid_citizen = true")) {
            return { rows: [], rowCount: 0 };
          }
          return { rows: [] };
        }),
        release: jest.fn(),
      };
      const { pool } = makePool(client);
      const repo = new PaymentsRepository(pool);

      await expect(repo.grantPaidPurchase(grantInput())).rejects.toThrow(
        "no player row",
      );
      const statements = client.query.mock.calls.map((call) => String(call[0]));
      expect(statements).toContain("ROLLBACK");
      expect(statements).not.toContain("COMMIT");
      expect(
        statements.some((sql) => sql.includes("UPDATE purchase_intents")),
      ).toBe(false);
      expect(client.release).toHaveBeenCalled();
    });

    it("replayed token: short-circuits to already_processed WITHOUT touching flags", async () => {
      const client: MockClient = {
        query: jest.fn().mockResolvedValue({ rows: [] }), // ON CONFLICT DO NOTHING → no row
        release: jest.fn(),
      };
      const { pool } = makePool(client);
      const repo = new PaymentsRepository(pool);

      await expect(repo.grantPaidPurchase(grantInput())).resolves.toEqual({
        status: "already_processed",
      });
      const statements = client.query.mock.calls.map((call) => String(call[0]));
      expect(
        statements.some((sql) => sql.includes("is_paid_citizen = true")),
      ).toBe(false);
      expect(
        statements.some((sql) => sql.includes("UPDATE purchase_intents")),
      ).toBe(false);
      expect(statements[statements.length - 1]).toBe("COMMIT");
    });

    // Task 0492: prototype keys too — the registry lookup is own-property only.
    it.each(["premium_skin", "constructor", "__proto__", "toString"])(
      "unknown productId %p: throws before touching the database",
      async (productId) => {
        const client: MockClient = {
          query: jest.fn(),
          release: jest.fn(),
        };
        const { pool } = makePool(client);
        const repo = new PaymentsRepository(pool);

        await expect(
          repo.grantPaidPurchase(grantInput({ productId })),
        ).rejects.toThrow(`no grant defined for productId "${productId}"`);
        expect(client.query).not.toHaveBeenCalled();
        expect((pool.connect as jest.Mock).mock.calls.length).toBe(0);
      },
    );

    it("null intentId: skips the intent-used update", async () => {
      const client: MockClient = {
        query: jest.fn().mockImplementation(async (sql: string) => {
          if (sql.includes("INSERT INTO processed_purchases")) {
            return { rows: [{ purchase_token: "tok-1" }] };
          }
          if (sql.includes("is_paid_citizen = true")) {
            return { rows: [], rowCount: 1 };
          }
          return { rows: [] };
        }),
        release: jest.fn(),
      };
      const { pool } = makePool(client);
      const repo = new PaymentsRepository(pool);

      await repo.grantPaidPurchase(grantInput({ intentId: null }));
      const statements = client.query.mock.calls.map((call) => String(call[0]));
      expect(
        statements.some((sql) => sql.includes("UPDATE purchase_intents")),
      ).toBe(false);
    });
  });

  // Task 0492 (B1): the registry and the shared paid step, for every product.
  describe("product-grant registry", () => {
    it("PRODUCT_GRANTS covers exactly the sellable products (runtime half of the Record check)", () => {
      expect(Object.keys(PRODUCT_GRANTS).sort()).toEqual(
        [...PAYMENT_PRODUCT_IDS].sort(),
      );
    });

    /** A fresh-token client; `wasPaid` is what the row-locked read returns. */
    function freshClient(wasPaid: boolean): MockClient {
      return {
        query: jest.fn().mockImplementation(async (sql: string) => {
          if (sql.includes("INSERT INTO processed_purchases")) {
            return { rows: [{ purchase_token: "tok-1" }] };
          }
          if (sql.includes("FOR NO KEY UPDATE")) {
            return { rows: [{ is_paid_citizen: wasPaid }] };
          }
          if (sql.includes("is_paid_citizen = true")) {
            return { rows: [], rowCount: 1 };
          }
          return { rows: [] };
        }),
        release: jest.fn(),
      };
    }

    function statementsOf(client: MockClient): string[] {
      return client.query.mock.calls.map((call) => String(call[0]));
    }

    afterEach(() => {
      jest.restoreAllMocks();
    });

    describe.each(PAYMENT_PRODUCT_IDS)("%s", (productId) => {
      it("fresh grant to a non-paid player: becamePaidCitizen true, in the shared order", async () => {
        const client = freshClient(false);
        const repo = new PaymentsRepository(makePool(client).pool);

        await expect(
          repo.grantPaidPurchase(grantInput({ productId })),
        ).resolves.toEqual({ status: "granted", becamePaidCitizen: true });

        const statements = statementsOf(client);
        const at = (needle: string) =>
          statements.findIndex((sql) => sql.includes(needle));
        expect(statements[0]).toBe("BEGIN");
        expect(at("INSERT INTO processed_purchases")).toBe(1);
        expect(at("FOR NO KEY UPDATE")).toBe(2);
        expect(client.query.mock.calls[2][1]).toEqual([PLAYER_ID]);
        expect(at("is_paid_citizen = true")).toBe(3);
        expect(at("UPDATE purchase_intents")).toBe(4);
        expect(statements[statements.length - 1]).toBe("COMMIT");
      });

      it("fresh grant to an already-paid player: becamePaidCitizen false, flags still written", async () => {
        const client = freshClient(true);
        const repo = new PaymentsRepository(makePool(client).pool);

        await expect(
          repo.grantPaidPurchase(grantInput({ productId })),
        ).resolves.toEqual({ status: "granted", becamePaidCitizen: false });
        expect(
          statementsOf(client).some((sql) =>
            sql.includes("is_paid_citizen = true"),
          ),
        ).toBe(true);
        expect(statementsOf(client)).toContain("COMMIT");
      });

      it("replay: already_processed with no paid read and no flags", async () => {
        const client: MockClient = {
          query: jest.fn().mockResolvedValue({ rows: [] }),
          release: jest.fn(),
        };
        const repo = new PaymentsRepository(makePool(client).pool);

        await expect(
          repo.grantPaidPurchase(grantInput({ productId })),
        ).resolves.toEqual({ status: "already_processed" });
        const statements = statementsOf(client);
        expect(
          statements.some((sql) => sql.includes("FOR NO KEY UPDATE")),
        ).toBe(false);
        expect(
          statements.some((sql) => sql.includes("is_paid_citizen = true")),
        ).toBe(false);
      });

      it("applies the product's entitlement once, inside the transaction, before COMMIT", async () => {
        const client = freshClient(false);
        const apply = jest.spyOn(PRODUCT_GRANTS[productId], "applyEntitlement");
        const repo = new PaymentsRepository(makePool(client).pool);
        const grant = grantInput({ productId });

        await repo.grantPaidPurchase(grant);

        expect(apply).toHaveBeenCalledTimes(1);
        expect(apply).toHaveBeenCalledWith(client, grant);
        const statements = statementsOf(client);
        const order = client.query.mock.invocationCallOrder;
        expect(apply.mock.invocationCallOrder[0]).toBeGreaterThan(
          order[
            statements.findIndex((sql) =>
              sql.includes("is_paid_citizen = true"),
            )
          ],
        );
        expect(apply.mock.invocationCallOrder[0]).toBeLessThan(
          order[statements.indexOf("COMMIT")],
        );
      });

      it("an entitlement write that throws rolls the whole grant back — no receipt left alone", async () => {
        const client = freshClient(false);
        jest
          .spyOn(PRODUCT_GRANTS[productId], "applyEntitlement")
          .mockRejectedValue(new Error("entitlement boom"));
        const repo = new PaymentsRepository(makePool(client).pool);

        await expect(
          repo.grantPaidPurchase(grantInput({ productId })),
        ).rejects.toThrow("entitlement boom");
        const statements = statementsOf(client);
        expect(statements).toContain("ROLLBACK");
        expect(statements).not.toContain("COMMIT");
        expect(client.release).toHaveBeenCalled();
      });
    });
  });

  // Task 0496 (B4): the durable-item base. No item is sellable yet, so a
  // test-only id reaches the repository through its registry seam.
  describe("durable items (task 0496)", () => {
    const TEST_ITEM = "test_durable_item";
    const ENTITLEMENT_INSERT = `INSERT INTO player_entitlements (player_id, product_id, purchase_token)
         VALUES ($1, $2, $3)
         ON CONFLICT (player_id, product_id) DO NOTHING`;

    function freshClient(wasPaid: boolean): MockClient {
      return {
        query: jest.fn().mockImplementation(async (sql: string) => {
          if (sql.includes("INSERT INTO processed_purchases")) {
            return { rows: [{ purchase_token: "tok-1" }] };
          }
          if (sql.includes("FOR NO KEY UPDATE")) {
            return { rows: [{ is_paid_citizen: wasPaid }] };
          }
          if (sql.includes("is_paid_citizen = true")) {
            return { rows: [], rowCount: 1 };
          }
          return { rows: [] };
        }),
        release: jest.fn(),
      };
    }

    function testRegistry() {
      return { ...PRODUCT_GRANTS, [TEST_ITEM]: durableItemGrant(null) };
    }

    it("the sellable list is still citizenship only", () => {
      expect([...PAYMENT_PRODUCT_IDS]).toEqual(["citizenship"]);
    });

    it("durableItemGrant issues exactly one ON CONFLICT DO NOTHING insert and carries its template", async () => {
      const query = jest.fn().mockResolvedValue({ rows: [] });
      const grant = durableItemGrant("name_change_approved");
      expect(grant.itemInboxTemplate).toBe("name_change_approved");
      expect(durableItemGrant(null).itemInboxTemplate).toBeNull();

      await grant.applyEntitlement(
        { query } as never,
        grantInput({ productId: TEST_ITEM, purchaseToken: "tok-9" }),
      );

      expect(query).toHaveBeenCalledTimes(1);
      expect(query).toHaveBeenCalledWith(ENTITLEMENT_INSERT, [
        PLAYER_ID,
        TEST_ITEM,
        "tok-9",
      ]);
    });

    it.each([false, true])(
      "an injected item keeps the shared order and always writes the flags (wasPaid=%s)",
      async (wasPaid) => {
        const client = freshClient(wasPaid);
        const repo = new PaymentsRepository(
          makePool(client).pool,
          undefined,
          testRegistry(),
        );

        await expect(
          repo.grantPaidPurchase(grantInput({ productId: TEST_ITEM })),
        ).resolves.toEqual({ status: "granted", becamePaidCitizen: !wasPaid });

        const statements = client.query.mock.calls.map((call) =>
          String(call[0]),
        );
        const at = (needle: string) =>
          statements.findIndex((sql) => sql.includes(needle));
        expect(statements[0]).toBe("BEGIN");
        expect(at("INSERT INTO processed_purchases")).toBe(1);
        expect(at("FOR NO KEY UPDATE")).toBe(2);
        expect(at("is_paid_citizen = true")).toBe(3);
        expect(at("INSERT INTO player_entitlements")).toBe(4);
        expect(at("UPDATE purchase_intents")).toBe(5);
        expect(statements[statements.length - 1]).toBe("COMMIT");
      },
    );

    it("the default repository refuses a test-only id before connecting", async () => {
      const client = freshClient(false);
      const { pool } = makePool(client);
      const repo = new PaymentsRepository(pool);

      await expect(
        repo.grantPaidPurchase(grantInput({ productId: TEST_ITEM })),
      ).rejects.toThrow(`no grant defined for productId "${TEST_ITEM}"`);
      expect(pool.connect).not.toHaveBeenCalled();
    });

    it("the injected registry still refuses an inherited key", async () => {
      const client = freshClient(false);
      const { pool } = makePool(client);
      const repo = new PaymentsRepository(pool, undefined, testRegistry());

      await expect(
        repo.grantPaidPurchase(grantInput({ productId: "constructor" })),
      ).rejects.toThrow("no grant defined");
      expect(pool.connect).not.toHaveBeenCalled();
    });

    it("listEntitlements maps the sorted product ids", async () => {
      const client: MockClient = { query: jest.fn(), release: jest.fn() };
      const { pool, poolQuery } = makePool(client);
      poolQuery.mockResolvedValue({
        rows: [{ product_id: "a_item" }, { product_id: "b_item" }],
      });
      const repo = new PaymentsRepository(pool);

      await expect(repo.listEntitlements(PLAYER_ID)).resolves.toEqual([
        "a_item",
        "b_item",
      ]);
      expect(String(poolQuery.mock.calls[0][0])).toContain(
        "ORDER BY product_id",
      );
      expect(poolQuery.mock.calls[0][1]).toEqual([PLAYER_ID]);

      poolQuery.mockResolvedValue({ rows: [] });
      await expect(repo.listEntitlements(PLAYER_ID)).resolves.toEqual([]);
    });

    it.each([
      [true, true, null, ["citizenship_paid"]],
      [true, false, null, ["citizenship_paid"]],
      [false, true, null, ["citizenship_paid"]],
      [false, false, null, []],
      [
        false,
        true,
        "name_change_approved",
        ["citizenship_paid", "name_change_approved"],
      ],
      [false, false, "name_change_approved", ["name_change_approved"]],
      [
        true,
        true,
        "name_change_approved",
        ["citizenship_paid", "name_change_approved"],
      ],
      [
        true,
        false,
        "name_change_approved",
        ["citizenship_paid", "name_change_approved"],
      ],
    ] as const)(
      "welcomeTemplatesFor(citizenship=%s, becamePaid=%s, item=%s) → %j",
      (isCitizenship, becamePaid, itemTemplate, expected) => {
        expect(
          welcomeTemplatesFor(isCitizenship, becamePaid, itemTemplate),
        ).toEqual(expected);
      },
    );

    // An item welcome means "paid": the unverified inbox must drop it.
    it("every item template in PRODUCT_GRANTS is hidden from the unverified inbox", () => {
      for (const grant of Object.values(PRODUCT_GRANTS)) {
        if (grant.itemInboxTemplate !== null) {
          expect(
            ITEM_PURCHASE_INBOX_TEMPLATE_KEYS.has(grant.itemInboxTemplate),
          ).toBe(true);
        }
      }
    });
  });

  describe("findIntent / getProcessedPurchase mapping", () => {
    it("maps an intent row to camelCase with ISO usedAt", async () => {
      const client: MockClient = { query: jest.fn(), release: jest.fn() };
      const { pool, poolQuery } = makePool(client);
      poolQuery.mockResolvedValue({
        rows: [
          {
            id: "intent-1",
            player_id: PLAYER_ID,
            product_id: "citizenship",
            used_at: new Date("2026-08-14T00:00:00.000Z"),
          },
        ],
      });
      const repo = new PaymentsRepository(pool);
      await expect(repo.findIntent("intent-1")).resolves.toEqual({
        id: "intent-1",
        playerId: PLAYER_ID,
        productId: "citizenship",
        usedAt: "2026-08-14T00:00:00.000Z",
      });
    });

    it("returns null for a missing intent and a missing receipt", async () => {
      const client: MockClient = { query: jest.fn(), release: jest.fn() };
      const { pool, poolQuery } = makePool(client);
      poolQuery.mockResolvedValue({ rows: [] });
      const repo = new PaymentsRepository(pool);
      await expect(repo.findIntent("nope")).resolves.toBeNull();
      await expect(repo.getProcessedPurchase("nope")).resolves.toBeNull();
    });
  });

  // Task 0506 (spec §6.2): evidence for the manual merge; never a move.
  describe("recordHolderSighting", () => {
    it("issues one upsert with the four values, outside any transaction", async () => {
      const client: MockClient = { query: jest.fn(), release: jest.fn() };
      const { pool, poolQuery } = makePool(client);
      poolQuery.mockResolvedValue({ rows: [] });
      const issuedAt = new Date("2026-10-26T00:00:00.000Z");
      await new PaymentsRepository(pool).recordHolderSighting({
        purchaseToken: "tok-1",
        holderPlayerId: "holder-id",
        seenPlayerId: PLAYER_ID,
        payloadIssuedAt: issuedAt,
      });
      expect(poolQuery).toHaveBeenCalledTimes(1);
      const [sql, params] = poolQuery.mock.calls[0];
      expect(sql).toContain("INSERT INTO purchase_holder_sightings");
      expect(sql).toContain(
        "ON CONFLICT (purchase_token, seen_player_id) DO UPDATE",
      );
      expect(sql).toContain("seen_count = purchase_holder_sightings.seen_count + 1");
      expect(params).toEqual(["tok-1", "holder-id", PLAYER_ID, issuedAt]);
      expect(client.query).not.toHaveBeenCalled();
    });

    it("propagates a failure (the route owns the best-effort catch)", async () => {
      const client: MockClient = { query: jest.fn(), release: jest.fn() };
      const { pool, poolQuery } = makePool(client);
      poolQuery.mockRejectedValue(new Error("fk"));
      await expect(
        new PaymentsRepository(pool).recordHolderSighting({
          purchaseToken: "tok-1",
          holderPlayerId: "holder-id",
          seenPlayerId: PLAYER_ID,
          payloadIssuedAt: null,
        }),
      ).rejects.toThrow("fk");
    });
  });

  describe("plausibleIssuedAt", () => {
    const NOW_MS = Date.parse("2026-10-26T12:00:00.000Z");

    it("keeps a plausible seconds value as a Date", () => {
      expect(plausibleIssuedAt(1_571_233_371, NOW_MS)?.toISOString()).toBe(
        "2019-10-16T13:42:51.000Z",
      );
    });

    it.each([
      [null],
      [1_000],
      [NOW_MS], // milliseconds by mistake
      [1e15],
      [NOW_MS / 1000 + 86_401],
    ])("%p ⇒ null", (issuedAt) => {
      expect(plausibleIssuedAt(issuedAt, NOW_MS)).toBeNull();
    });

    it("accepts up to one day ahead", () => {
      expect(plausibleIssuedAt(NOW_MS / 1000 + 86_400, NOW_MS)).not.toBeNull();
    });
  });
});
