// Unit tests for PaymentsRepository over a mocked pg Pool — transaction
// choreography and the idempotent short-circuit. (Real-Postgres behavior, CHECK
// constraints included, is covered in tests/integration/PaymentsRepository.it.test.ts
// under RUN_DB_TESTS.)

import type { Pool } from "pg";
import { PaymentsRepository } from "../../src/profile-server/PaymentsRepository";

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

function grantInput(overrides: Record<string, unknown> = {}) {
  return {
    purchaseToken: "tok-1",
    productId: "citizenship",
    yandexPlayerId: "yandex-1",
    intentId: "11111111-1111-1111-1111-111111111111",
    rawPayload: "{}",
    ...overrides,
  };
}

describe("PaymentsRepository", () => {
  describe("createIntent", () => {
    it("ensures the profile row, inserts the intent, and commits", async () => {
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

      await expect(repo.createIntent("yandex-1", "citizenship")).resolves.toBe(
        "intent-1",
      );

      const statements = client.query.mock.calls.map((call) => String(call[0]));
      expect(statements[0]).toBe("BEGIN");
      expect(statements[1]).toContain("INSERT INTO player_profiles");
      expect(statements[2]).toContain("INSERT INTO purchase_intents");
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

      await expect(
        repo.createIntent("yandex-1", "citizenship"),
      ).rejects.toThrow("boom");
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
          return { rows: [] };
        }),
        release: jest.fn(),
      };
      const { pool } = makePool(client);
      const repo = new PaymentsRepository(pool);

      await expect(repo.grantPaidPurchase(grantInput())).resolves.toBe(
        "granted",
      );

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

    it("replayed token: short-circuits to already_processed WITHOUT touching flags", async () => {
      const client: MockClient = {
        query: jest.fn().mockResolvedValue({ rows: [] }), // ON CONFLICT DO NOTHING → no row
        release: jest.fn(),
      };
      const { pool } = makePool(client);
      const repo = new PaymentsRepository(pool);

      await expect(repo.grantPaidPurchase(grantInput())).resolves.toBe(
        "already_processed",
      );
      const statements = client.query.mock.calls.map((call) => String(call[0]));
      expect(
        statements.some((sql) => sql.includes("is_paid_citizen = true")),
      ).toBe(false);
      expect(
        statements.some((sql) => sql.includes("UPDATE purchase_intents")),
      ).toBe(false);
      expect(statements[statements.length - 1]).toBe("COMMIT");
    });

    it("unknown productId: throws before touching the database", async () => {
      const client: MockClient = {
        query: jest.fn(),
        release: jest.fn(),
      };
      const { pool } = makePool(client);
      const repo = new PaymentsRepository(pool);

      await expect(
        repo.grantPaidPurchase(grantInput({ productId: "premium_skin" })),
      ).rejects.toThrow('no grant defined for productId "premium_skin"');
      expect(client.query).not.toHaveBeenCalled();
      expect((pool.connect as jest.Mock).mock.calls.length).toBe(0);
    });

    it("null intentId: skips the intent-used update", async () => {
      const client: MockClient = {
        query: jest.fn().mockImplementation(async (sql: string) => {
          if (sql.includes("INSERT INTO processed_purchases")) {
            return { rows: [{ purchase_token: "tok-1" }] };
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

  describe("findIntent / getProcessedPurchase mapping", () => {
    it("maps an intent row to camelCase with ISO usedAt", async () => {
      const client: MockClient = { query: jest.fn(), release: jest.fn() };
      const { pool, poolQuery } = makePool(client);
      poolQuery.mockResolvedValue({
        rows: [
          {
            id: "intent-1",
            yandex_player_id: "yandex-1",
            product_id: "citizenship",
            used_at: new Date("2026-08-14T00:00:00.000Z"),
          },
        ],
      });
      const repo = new PaymentsRepository(pool);
      await expect(repo.findIntent("intent-1")).resolves.toEqual({
        id: "intent-1",
        yandexPlayerId: "yandex-1",
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
});
