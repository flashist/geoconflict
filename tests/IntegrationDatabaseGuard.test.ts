// The integration run DROPS the `public` schema of TEST_DATABASE_URL (task 0270),
// so its global setup refuses any database that is not on this machine (owner
// ruling D1). This pins that guard in the default `npm test`, which needs no
// database. Synthetic URLs only — no real host or credential appears here.

// `pg` and the migration runner are mocked: every call lands in one ordered event
// log, so the wiring tests below can prove WHEN the guard runs relative to the
// destructive DROP — not just that the predicate is right (review 0270 R2).
const mockEvents: string[] = [];
jest.mock("pg", () => ({
  Pool: jest.fn().mockImplementation(() => {
    mockEvents.push("Pool");
    return {
      query: jest.fn(async (sql: string) => {
        mockEvents.push(`query:${sql}`);
        return { rows: [], rowCount: 0 };
      }),
      end: jest.fn(async () => {
        mockEvents.push("end");
      }),
    };
  }),
}));
jest.mock("../src/profile-server/Migrations", () => ({
  applyMigrations: jest.fn(async () => {
    mockEvents.push("applyMigrations");
    return [];
  }),
}));

import prepareIntegrationDatabase, {
  databaseHost,
  isLocalDatabase,
} from "./integration/globalSetup";

describe("integration database host guard", () => {
  test.each([
    "postgres://user:pass@localhost:5433/testdb",
    "postgresql://user:pass@localhost/testdb",
    "postgres://user:pass@127.0.0.1:5433/testdb",
    "postgres://user:pass@[::1]:5433/testdb",
    "postgres://user:pass@LOCALHOST:5433/testdb",
  ])("accepts a local database: %s", (url) => {
    expect(isLocalDatabase(url)).toBe(true);
  });

  test.each([
    ["a remote host", "postgres://user:pass@db.example.test:5432/prod"],
    ["a private-network address", "postgres://user:pass@10.0.0.5:5432/db"],
    ["a lookalike hostname", "postgres://user:pass@localhost.example.test/db"],
    [
      "a host= override hiding behind localhost",
      "postgres://user:pass@localhost:5433/db?host=db.example.test",
    ],
    ["a non-postgres scheme", "mysql://user:pass@localhost:3306/db"],
    ["a key=value connection string", "host=localhost port=5433 dbname=db"],
    ["an empty string", ""],
  ])("refuses %s", (_label, url) => {
    expect(isLocalDatabase(url)).toBe(false);
  });

  test("reads the hostname, lower-cased", () => {
    expect(databaseHost("postgres://u:p@LocalHost:5433/db")).toBe("localhost");
    expect(databaseHost("not a url")).toBeNull();
  });

  describe("globalSetup wiring — the guard runs BEFORE anything touches a database", () => {
    const ORIGINAL = process.env.TEST_DATABASE_URL;
    beforeEach(() => {
      mockEvents.length = 0;
    });
    afterEach(() => {
      if (ORIGINAL === undefined) {
        delete process.env.TEST_DATABASE_URL;
      } else {
        process.env.TEST_DATABASE_URL = ORIGINAL;
      }
    });

    test.each([
      ["a remote host", "postgres://user:pass@db.example.test:5432/prod"],
      [
        "a host= override hiding behind localhost",
        "postgres://user:pass@localhost:5433/db?host=db.example.test",
      ],
    ])(
      "%s: refuses without building a Pool or issuing any DROP",
      async (_label, url) => {
        process.env.TEST_DATABASE_URL = url;
        await expect(prepareIntegrationDatabase()).rejects.toThrow(
          "does not point at a local database",
        );
        expect(mockEvents).toEqual([]);
      },
    );

    test("the refusal never echoes the connection string", async () => {
      const url =
        "postgres://someuser:not-a-real-secret@db.example.test:5432/x";
      process.env.TEST_DATABASE_URL = url;
      const failure = prepareIntegrationDatabase();
      await expect(failure).rejects.toThrow();
      await failure.catch((error: Error) => {
        expect(error.message).not.toContain("not-a-real-secret");
        expect(error.message).not.toContain("db.example.test");
      });
    });

    test("an unset URL refuses before any database work", async () => {
      delete process.env.TEST_DATABASE_URL;
      await expect(prepareIntegrationDatabase()).rejects.toThrow(
        "TEST_DATABASE_URL is not set",
      );
      expect(mockEvents).toEqual([]);
    });

    test("a local URL resets in order: DROP, CREATE, the real runner, then end", async () => {
      process.env.TEST_DATABASE_URL =
        "postgres://user:pass@localhost:5433/testdb";
      await prepareIntegrationDatabase();
      expect(mockEvents).toEqual([
        "Pool",
        "query:DROP SCHEMA public CASCADE",
        "query:CREATE SCHEMA public",
        "applyMigrations",
        "end",
      ]);
    });
  });
});
