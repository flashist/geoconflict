// Unit tests for PlayerIdentityRepository (task 0270) over a scripted fake Pool —
// the NameChangeRepository.test.ts harness idea. They pin the transaction
// choreography of find-or-create: statement order, what is retried, what is
// rethrown, the attempt cap, and that the client is released on every path.
// The DB-backed proof (real races, real PK collisions, 0 orphans) is
// tests/integration/PlayerIdentityRepository.it.test.ts.

import type { Pool } from "pg";
import {
  MAX_RESOLVE_ATTEMPTS,
  PLATFORM_YANDEX_GAMES,
  PlayerIdentityRepository,
} from "../../src/profile-server/PlayerIdentityRepository";

const NEW_ID = "0b6f8a52-3c1e-4d7a-9f10-2a4b6c8d0e1f";
const WINNER_ID = "7d3c2b1a-0f9e-4d8c-b7a6-5e4d3c2b1a09";

function playerRow(id: string): Record<string, unknown> {
  return {
    id,
    schema_version: 1,
    xp: "0",
    is_citizen: false,
    is_paid_citizen: false,
    citizenship_earned_at: null,
    citizenship_purchased_at: null,
    display_name: null,
    extra: {},
    created_at: new Date("2026-09-15T00:00:00.000Z"),
    updated_at: new Date("2026-09-15T00:00:00.000Z"),
    last_login_at: new Date("2026-09-15T00:00:00.000Z"),
  };
}

function pgError(code: string, constraint?: string): Error {
  return Object.assign(new Error(`pg ${code}`), { code, constraint });
}

type Script = {
  /** Rows the identity+profile lookup returns, one entry per call. */
  lookups: Array<Record<string, unknown>[]>;
  /** What each `INSERT INTO player_identities` does, one entry per call. */
  identityInserts?: Array<"inserted" | "conflict" | Error>;
  /** What each `INSERT INTO players` does, one entry per call (default: ok). */
  playerInserts?: Array<"ok" | Error>;
};

function fakePool(script: Script) {
  const poolStatements: string[] = [];
  const clientStatements: string[] = [];
  const releases: jest.Mock[] = [];
  const lookups = [...script.lookups];
  const identityInserts = [...(script.identityInserts ?? [])];
  const playerInserts = [...(script.playerInserts ?? [])];

  const poolQuery = jest.fn(async (sql: string) => {
    poolStatements.push(sql);
    if (sql.includes("JOIN players")) {
      return { rows: lookups.shift() ?? [], rowCount: 0 };
    }
    if (sql.includes("SET last_login_at")) {
      return { rows: [], rowCount: 0 };
    }
    if (sql.includes("SELECT player_id FROM player_identities")) {
      return { rows: lookups.shift() ?? [], rowCount: 0 };
    }
    throw new Error(`unexpected pool SQL: ${sql}`);
  });

  const connect = jest.fn(async () => {
    const release = jest.fn();
    releases.push(release);
    return {
      release,
      query: jest.fn(async (sql: string) => {
        const trimmed = sql.trim();
        clientStatements.push(trimmed);
        if (/^(BEGIN|COMMIT|ROLLBACK)$/.test(trimmed)) {
          return { rows: [], rowCount: 0 };
        }
        if (trimmed.startsWith("INSERT INTO players")) {
          const next = playerInserts.shift() ?? "ok";
          if (next instanceof Error) throw next;
          return { rows: [playerRow(NEW_ID)], rowCount: 1 };
        }
        if (trimmed.startsWith("INSERT INTO player_identities")) {
          const next = identityInserts.shift() ?? "inserted";
          if (next instanceof Error) throw next;
          return next === "inserted"
            ? { rows: [{ player_id: NEW_ID }], rowCount: 1 }
            : { rows: [], rowCount: 0 };
        }
        throw new Error(`unexpected client SQL: ${trimmed}`);
      }),
    };
  });

  const pool = { query: poolQuery, connect } as unknown as Pool;
  const verbs = () =>
    clientStatements.map((sql) =>
      sql.startsWith("INSERT INTO players")
        ? "INSERT players"
        : sql.startsWith("INSERT INTO player_identities")
          ? "INSERT identity"
          : sql,
    );
  return { pool, poolStatements, clientStatements, releases, connect, verbs };
}

describe("PlayerIdentityRepository.findPlayerByIdentity", () => {
  it("returns the player id on a hit and null on a miss — and never writes", async () => {
    const db = fakePool({ lookups: [[{ player_id: WINNER_ID }], []] });
    const repo = new PlayerIdentityRepository(db.pool);
    await expect(
      repo.findPlayerByIdentity(PLATFORM_YANDEX_GAMES, "y-1"),
    ).resolves.toBe(WINNER_ID);
    await expect(
      repo.findPlayerByIdentity(PLATFORM_YANDEX_GAMES, "y-2"),
    ).resolves.toBeNull();
    expect(db.connect).not.toHaveBeenCalled();
    for (const sql of db.poolStatements) {
      expect(sql).not.toMatch(/INSERT|UPDATE|DELETE/i);
    }
  });
});

describe("PlayerIdentityRepository.resolveOrCreatePlayer", () => {
  it("hit: returns the existing player, touches last_login_at, opens no transaction", async () => {
    const db = fakePool({ lookups: [[playerRow(WINNER_ID)]] });
    const repo = new PlayerIdentityRepository(db.pool);
    const resolved = await repo.resolveOrCreatePlayer(
      PLATFORM_YANDEX_GAMES,
      "y-1",
      "game_server",
    );
    expect(resolved.playerId).toBe(WINNER_ID);
    expect(resolved.created).toBe(false);
    expect(resolved.profile.xp).toBe(0);
    // The profile never carries the internal id.
    expect(resolved.profile).not.toHaveProperty("id");
    expect(db.connect).not.toHaveBeenCalled();
    const touch = db.poolStatements.find((sql) =>
      sql.includes("SET last_login_at"),
    );
    // The one-hour condition lives in the SQL, for both rows.
    expect(touch).toContain("UPDATE player_identities");
    expect(touch).toContain("UPDATE players");
    expect(touch?.match(/interval '1 hour'/g)).toHaveLength(2);
  });

  it("miss: BEGIN → insert player → insert identity → COMMIT, created", async () => {
    const db = fakePool({ lookups: [[]] });
    const repo = new PlayerIdentityRepository(db.pool);
    const resolved = await repo.resolveOrCreatePlayer(
      PLATFORM_YANDEX_GAMES,
      "y-1",
      "login",
    );
    expect(resolved).toMatchObject({ playerId: NEW_ID, created: true });
    expect(db.verbs()).toEqual([
      "BEGIN",
      "INSERT players",
      "INSERT identity",
      "COMMIT",
    ]);
    expect(
      db.releases.every((release) => release.mock.calls.length === 1),
    ).toBe(true);
  });

  it("lost race: ROLLBACK (no orphan player), then re-read and return the winner", async () => {
    const db = fakePool({
      lookups: [[], [playerRow(WINNER_ID)]],
      identityInserts: ["conflict"],
    });
    const repo = new PlayerIdentityRepository(db.pool);
    const resolved = await repo.resolveOrCreatePlayer(
      PLATFORM_YANDEX_GAMES,
      "y-1",
      "login",
    );
    expect(resolved).toMatchObject({ playerId: WINNER_ID, created: false });
    expect(db.verbs()).toEqual([
      "BEGIN",
      "INSERT players",
      "INSERT identity",
      "ROLLBACK",
    ]);
    expect(db.clientStatements).not.toContain("COMMIT");
    expect(db.releases).toHaveLength(1);
    expect(db.releases[0]).toHaveBeenCalledTimes(1);
  });

  it("UUID collision on players_pkey: ROLLBACK and retry with a new id", async () => {
    const db = fakePool({
      lookups: [[], []],
      playerInserts: [pgError("23505", "players_pkey"), "ok"],
    });
    const repo = new PlayerIdentityRepository(db.pool);
    const resolved = await repo.resolveOrCreatePlayer(
      PLATFORM_YANDEX_GAMES,
      "y-1",
      "login",
    );
    expect(resolved.created).toBe(true);
    expect(db.verbs()).toEqual([
      "BEGIN",
      "INSERT players",
      "ROLLBACK",
      "BEGIN",
      "INSERT players",
      "INSERT identity",
      "COMMIT",
    ]);
    expect(db.releases).toHaveLength(2);
  });

  it("rethrows a 23505 on ANY other constraint instead of retrying", async () => {
    const db = fakePool({
      lookups: [[]],
      identityInserts: [pgError("23505", "player_identities_player_idx")],
    });
    const repo = new PlayerIdentityRepository(db.pool);
    await expect(
      repo.resolveOrCreatePlayer(PLATFORM_YANDEX_GAMES, "y-1", "login"),
    ).rejects.toThrow("pg 23505");
    expect(db.verbs()).toEqual([
      "BEGIN",
      "INSERT players",
      "INSERT identity",
      "ROLLBACK",
    ]);
    expect(db.connect).toHaveBeenCalledTimes(1);
    expect(db.releases[0]).toHaveBeenCalledTimes(1);
  });

  it("rethrows a non-unique error (e.g. a CHECK violation) after rolling back", async () => {
    const db = fakePool({
      lookups: [[]],
      identityInserts: [pgError("23514")],
    });
    const repo = new PlayerIdentityRepository(db.pool);
    await expect(
      repo.resolveOrCreatePlayer(PLATFORM_YANDEX_GAMES, "y-1", "login"),
    ).rejects.toThrow("pg 23514");
    expect(db.clientStatements).toContain("ROLLBACK");
    expect(db.clientStatements).not.toContain("COMMIT");
    expect(db.releases[0]).toHaveBeenCalledTimes(1);
  });

  it(`gives up after ${MAX_RESOLVE_ATTEMPTS} attempts — and the error carries no id`, async () => {
    const db = fakePool({
      lookups: [[], [], [], []],
      playerInserts: [
        pgError("23505", "players_pkey"),
        pgError("23505", "players_pkey"),
        pgError("23505", "players_pkey"),
        "ok",
      ],
    });
    const repo = new PlayerIdentityRepository(db.pool);
    const failure = repo.resolveOrCreatePlayer(
      PLATFORM_YANDEX_GAMES,
      "secret-yandex-id",
      "login",
    );
    await expect(failure).rejects.toThrow(
      `gave up after ${MAX_RESOLVE_ATTEMPTS} attempts`,
    );
    await failure.catch((error: Error) => {
      expect(error.message).not.toContain("secret-yandex-id");
    });
    expect(MAX_RESOLVE_ATTEMPTS).toBe(3);
    expect(db.connect).toHaveBeenCalledTimes(3);
    expect(
      db.releases.every((release) => release.mock.calls.length === 1),
    ).toBe(true);
    expect(db.clientStatements).not.toContain("COMMIT");
  });

  it("repeated lost races also stop at the cap", async () => {
    const db = fakePool({
      lookups: [[], [], [], []],
      identityInserts: ["conflict", "conflict", "conflict"],
    });
    const repo = new PlayerIdentityRepository(db.pool);
    await expect(
      repo.resolveOrCreatePlayer(PLATFORM_YANDEX_GAMES, "y-1", "login"),
    ).rejects.toThrow("gave up");
    expect(db.connect).toHaveBeenCalledTimes(3);
    expect(
      db.clientStatements.filter((sql) => sql === "ROLLBACK"),
    ).toHaveLength(3);
  });

  it("releases the client even when ROLLBACK itself fails", async () => {
    const release = jest.fn();
    const pool = {
      query: jest.fn(async () => ({ rows: [], rowCount: 0 })),
      connect: jest.fn(async () => ({
        release,
        query: jest.fn(async (sql: string) => {
          if (sql.trim() === "BEGIN") return { rows: [] };
          throw pgError("08006");
        }),
      })),
    } as unknown as Pool;
    const repo = new PlayerIdentityRepository(pool);
    await expect(
      repo.resolveOrCreatePlayer(PLATFORM_YANDEX_GAMES, "y-1", "login"),
    ).rejects.toThrow("pg 08006");
    expect(release).toHaveBeenCalledTimes(1);
  });
});
