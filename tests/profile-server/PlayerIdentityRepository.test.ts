// Unit tests for PlayerIdentityRepository (task 0270) over a scripted fake Pool —
// the NameChangeRepository.test.ts harness idea. They pin the transaction
// choreography of find-or-create: statement order, what is retried, what is
// rethrown, the attempt cap, and that the client is released on every path.
// The DB-backed proof (real races, real PK collisions, 0 orphans) is
// tests/integration/PlayerIdentityRepository.it.test.ts.

import type { Pool } from "pg";
import { Writable } from "stream";
import winston from "winston";
import { logger } from "../../src/profile-server/Logger";
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

// The find-only lookup the login-creation switch needs (task 0274). It is the SAME
// read resolveOrCreatePlayer does on a hit — profile included, last_login_at touched
// — minus the create branch. A "find-only" helper that could still insert would make
// the switch a lie, which is what the last assertion here is for.
describe("PlayerIdentityRepository.resolveExistingPlayer", () => {
  it("returns the player and its profile on a hit, and touches last_login_at", async () => {
    const db = fakePool({ lookups: [[playerRow(WINNER_ID)]] });
    const repo = new PlayerIdentityRepository(db.pool);
    const resolved = await repo.resolveExistingPlayer(
      PLATFORM_YANDEX_GAMES,
      "y-1",
    );
    expect(resolved).toMatchObject({ playerId: WINNER_ID, created: false });
    expect(resolved?.profile.xp).toBe(0);
    expect(
      db.poolStatements.some((sql) => sql.includes("SET last_login_at")),
    ).toBe(true);
  });

  it("returns null on a miss and INSERTS NOTHING — no transaction, no player", async () => {
    const db = fakePool({ lookups: [[]] });
    const repo = new PlayerIdentityRepository(db.pool);
    await expect(
      repo.resolveExistingPlayer(PLATFORM_YANDEX_GAMES, "y-nobody"),
    ).resolves.toBeNull();
    expect(db.connect).not.toHaveBeenCalled();
    for (const sql of db.poolStatements) {
      expect(sql).not.toMatch(/INSERT INTO/i);
    }
  });

  it("never fires the creation callback — it creates nothing to count", async () => {
    const onPlayerCreated = jest.fn();
    const db = fakePool({ lookups: [[]] });
    const repo = new PlayerIdentityRepository(db.pool, { onPlayerCreated });
    await repo.resolveExistingPlayer(PLATFORM_YANDEX_GAMES, "y-nobody");
    expect(onPlayerCreated).not.toHaveBeenCalled();
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

  // ── The S5 creation callback (task 0274) ───────────────────────────────────
  // Alert A1 pages on creations per 10 minutes. A callback that fires on a path
  // that did NOT create a player would inflate that count and page on nothing; one
  // that misses a real creation would hide the exact flood the alert exists for.
  describe("onPlayerCreated", () => {
    it("fires exactly once, after COMMIT, with the platform and the source", async () => {
      const onPlayerCreated = jest.fn();
      const db = fakePool({ lookups: [[]] });
      const repo = new PlayerIdentityRepository(db.pool, { onPlayerCreated });
      await repo.resolveOrCreatePlayer(PLATFORM_YANDEX_GAMES, "y-1", "login");
      expect(onPlayerCreated).toHaveBeenCalledTimes(1);
      expect(onPlayerCreated).toHaveBeenCalledWith(
        PLATFORM_YANDEX_GAMES,
        "login",
      );
    });

    it("passes game_server through — A1 counts BOTH sources", async () => {
      const onPlayerCreated = jest.fn();
      const db = fakePool({ lookups: [[]] });
      const repo = new PlayerIdentityRepository(db.pool, { onPlayerCreated });
      await repo.resolveOrCreatePlayer(
        PLATFORM_YANDEX_GAMES,
        "y-1",
        "game_server",
      );
      expect(onPlayerCreated).toHaveBeenCalledWith(
        PLATFORM_YANDEX_GAMES,
        "game_server",
      );
    });

    it("never fires for a player that already existed", async () => {
      const onPlayerCreated = jest.fn();
      const db = fakePool({ lookups: [[playerRow(WINNER_ID)]] });
      const repo = new PlayerIdentityRepository(db.pool, { onPlayerCreated });
      await repo.resolveOrCreatePlayer(PLATFORM_YANDEX_GAMES, "y-1", "login");
      expect(onPlayerCreated).not.toHaveBeenCalled();
    });

    it("never fires on a LOST RACE — the player row we inserted was rolled back", async () => {
      const onPlayerCreated = jest.fn();
      const db = fakePool({
        lookups: [[], [playerRow(WINNER_ID)]],
        identityInserts: ["conflict"],
      });
      const repo = new PlayerIdentityRepository(db.pool, { onPlayerCreated });
      await repo.resolveOrCreatePlayer(PLATFORM_YANDEX_GAMES, "y-1", "login");
      expect(onPlayerCreated).not.toHaveBeenCalled();
    });

    it("fires once, not twice, when a UUID collision forced a retry", async () => {
      const onPlayerCreated = jest.fn();
      const db = fakePool({
        lookups: [[], []],
        playerInserts: [pgError("23505", "players_pkey"), "ok"],
      });
      const repo = new PlayerIdentityRepository(db.pool, { onPlayerCreated });
      await repo.resolveOrCreatePlayer(PLATFORM_YANDEX_GAMES, "y-1", "login");
      expect(onPlayerCreated).toHaveBeenCalledTimes(1);
    });

    it("carries no id: the callback sees the platform and the source, nothing else", async () => {
      const onPlayerCreated = jest.fn();
      const db = fakePool({ lookups: [[]] });
      const repo = new PlayerIdentityRepository(db.pool, { onPlayerCreated });
      await repo.resolveOrCreatePlayer(
        PLATFORM_YANDEX_GAMES,
        "secret-yandex-id",
        "login",
      );
      const args = JSON.stringify(onPlayerCreated.mock.calls);
      expect(args).not.toContain("secret-yandex-id");
      expect(args).not.toContain(NEW_ID);
    });

    it("a throwing callback never fails the login it is only counting", async () => {
      const onPlayerCreated = jest.fn(() => {
        throw new Error("meter exploded");
      });
      const db = fakePool({ lookups: [[]] });
      const repo = new PlayerIdentityRepository(db.pool, { onPlayerCreated });
      const resolved = await repo.resolveOrCreatePlayer(
        PLATFORM_YANDEX_GAMES,
        "y-1",
        "login",
      );
      expect(resolved).toMatchObject({ playerId: NEW_ID, created: true });
    });

    // Review R3: swallowing the throw is right, swallowing it SILENTLY is not —
    // geoconflict.profile.players.created is what alert A1 (the creation-flood
    // alarm) pages on, so a hook that always throws would make A1 read zero
    // forever with nothing anywhere saying why.
    it("a throwing callback is WARNED about, by error type only and with no id", async () => {
      const chunks: string[] = [];
      const capture = new winston.transports.Stream({
        stream: new Writable({
          write(chunk, _encoding, callback) {
            chunks.push(String(chunk));
            callback();
          },
        }),
      });
      logger.add(capture);
      try {
        const db = fakePool({ lookups: [[]] });
        const repo = new PlayerIdentityRepository(db.pool, {
          onPlayerCreated: () => {
            throw new RangeError("meter exploded");
          },
        });
        await repo.resolveOrCreatePlayer(
          PLATFORM_YANDEX_GAMES,
          "zz0274-hook-canary",
          "login",
        );
      } finally {
        logger.remove(capture);
      }
      const logged = chunks.join("\n");
      // The error TYPE, so an operator can tell a broken exporter from a broken hook…
      expect(logged).toContain("RangeError");
      // …and nothing else: not the message, not the platform id, not the player id.
      expect(logged).not.toContain("meter exploded");
      expect(logged).not.toContain("zz0274-hook-canary");
      expect(logged).not.toContain(NEW_ID);
    });

    it("the hook warning is rate-limited — a hook that always throws cannot flood the log", async () => {
      const chunks: string[] = [];
      const capture = new winston.transports.Stream({
        stream: new Writable({
          write(chunk, _encoding, callback) {
            chunks.push(String(chunk));
            callback();
          },
        }),
      });
      logger.add(capture);
      try {
        // ONE repository, five creations — the production shape (the throttle budget
        // is per instance, so this is what a real broken hook would look like).
        const db = fakePool({ lookups: [[], [], [], [], []] });
        const repo = new PlayerIdentityRepository(db.pool, {
          onPlayerCreated: () => {
            throw new RangeError("meter exploded");
          },
        });
        for (let i = 0; i < 5; i++) {
          await repo.resolveOrCreatePlayer(
            PLATFORM_YANDEX_GAMES,
            `y-flood-${i}`,
            "login",
          );
        }
      } finally {
        logger.remove(capture);
      }
      // One line for five failures: the window is 10 minutes.
      expect(chunks.join("\n").match(/RangeError/g)).toHaveLength(1);
    });
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
