// Integration tests for migrations/006_player_identity.sql (task 0270) against a
// REAL Postgres, through the REAL runner (src/profile-server/Migrations.ts).
//
// Each case gets its own throwaway Postgres schema: a dedicated pool whose
// search_path is ONLY that schema, so 001–006 build (and the guard inspects) that
// schema's tables and never the shared `public` one the other suites use. Schemas
// are dropped in afterAll, and dropped-if-exists before creation so an
// interrupted earlier run cannot poison the next one.

import { join } from "path";
import { Pool } from "pg";
import { applyMigrations } from "../../src/profile-server/Migrations";

const RUN = process.env.RUN_DB_TESTS ? describe : describe.skip;
const MIGRATIONS_DIR = join(process.cwd(), "migrations");
const UP_TO_004 = (filename: string) => filename < "005";

const OLD_TABLES: Array<[string, string]> = [
  [
    "player_profiles",
    "INSERT INTO player_profiles (yandex_player_id) VALUES ('it-guard')",
  ],
  [
    "player_match_xp_credits",
    "INSERT INTO player_match_xp_credits (game_id, yandex_player_id) VALUES ('g', 'it-guard')",
  ],
  [
    "player_name_history",
    "INSERT INTO player_name_history (yandex_player_id, new_display_name) VALUES ('it-guard', 'N')",
  ],
  [
    "player_cosmetic_ownership",
    "INSERT INTO player_cosmetic_ownership (yandex_player_id, cosmetic_type, cosmetic_id) VALUES ('it-guard', 'flag', 'x')",
  ],
  [
    "purchase_intents",
    "INSERT INTO purchase_intents (yandex_player_id, product_id) VALUES ('it-guard', 'citizenship')",
  ],
  [
    "processed_purchases",
    "INSERT INTO processed_purchases (purchase_token, yandex_player_id, product_id, raw_payload) VALUES ('t', 'it-guard', 'citizenship', '{}')",
  ],
  [
    "player_messages",
    "INSERT INTO player_messages (yandex_player_id, title, body) VALUES ('it-guard', 'T', 'B')",
  ],
];

RUN("migration 006 — player identity (integration)", () => {
  let admin: Pool;
  const schemas: string[] = [];
  const pools: Pool[] = [];

  /** A fresh schema plus a pool that sees ONLY it. */
  async function isolatedPool(name: string): Promise<Pool> {
    const schema = `it_m006_${name}`;
    await admin.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    await admin.query(`CREATE SCHEMA ${schema}`);
    schemas.push(schema);
    const pool = new Pool({
      connectionString: process.env.TEST_DATABASE_URL,
      options: `-c search_path=${schema}`,
    });
    pools.push(pool);
    return pool;
  }

  async function schemaSnapshot(pool: Pool): Promise<unknown> {
    const columns = await pool.query(
      `SELECT table_name, column_name, data_type, is_nullable, column_default
       FROM information_schema.columns
       WHERE table_schema = current_schema()
       ORDER BY table_name, column_name`,
    );
    const indexes = await pool.query(
      `SELECT tablename, indexname, indexdef FROM pg_indexes
       WHERE schemaname = current_schema()
       ORDER BY tablename, indexname`,
    );
    const constraints = await pool.query(
      `SELECT conrelid::regclass::text AS tbl, conname, pg_get_constraintdef(oid) AS def
       FROM pg_constraint
       WHERE connamespace = current_schema()::regnamespace
       ORDER BY tbl, conname`,
    );
    return {
      columns: columns.rows,
      indexes: indexes.rows,
      constraints: constraints.rows,
    };
  }

  async function appliedFiles(pool: Pool): Promise<string[]> {
    const res = await pool.query(
      "SELECT filename FROM schema_migrations ORDER BY filename",
    );
    return res.rows.map((row) => String(row.filename));
  }

  async function tableExists(pool: Pool, table: string): Promise<boolean> {
    const res = await pool.query("SELECT to_regclass($1) IS NOT NULL AS ok", [
      table,
    ]);
    return Boolean(res.rows[0].ok);
  }

  beforeAll(() => {
    admin = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
  });

  afterAll(async () => {
    for (const pool of pools) {
      await pool.end();
    }
    for (const schema of schemas) {
      await admin.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    }
    await admin.end();
  });

  test("a fresh schema applies 001–004 and 006 through the runner", async () => {
    const pool = await isolatedPool("fresh");
    const applied = await applyMigrations(pool, MIGRATIONS_DIR);
    expect(applied).toContain("006_player_identity.sql");
    expect(await appliedFiles(pool)).toEqual(applied);
    for (const table of [
      "players",
      "player_identities",
      "player_xp_grants",
      "player_match_xp_credits",
      "player_name_history",
      "player_cosmetic_ownership",
      "purchase_intents",
      "processed_purchases",
      "player_messages",
    ]) {
      expect(await tableExists(pool, table)).toBe(true);
    }
    expect(await tableExists(pool, "player_profiles")).toBe(false);

    // Re-running is a no-op (filename bookkeeping), not a second guard pass.
    await expect(applyMigrations(pool, MIGRATIONS_DIR)).resolves.toEqual([]);
  });

  test("a 001–004 schema with 0 rows applies 006, and every child table is re-keyed to a uuid player_id", async () => {
    const pool = await isolatedPool("empty004");
    await applyMigrations(pool, MIGRATIONS_DIR, { filter: UP_TO_004 });
    expect(await appliedFiles(pool)).not.toContain("006_player_identity.sql");

    await expect(applyMigrations(pool, MIGRATIONS_DIR)).resolves.toEqual([
      "006_player_identity.sql",
    ]);

    const leftovers = await pool.query(
      `SELECT table_name FROM information_schema.columns
       WHERE table_schema = current_schema()
         AND column_name IN ('yandex_player_id', 'persistent_id')`,
    );
    expect(leftovers.rows).toEqual([]);

    const keys = await pool.query(
      `SELECT table_name, data_type FROM information_schema.columns
       WHERE table_schema = current_schema() AND column_name = 'player_id'
       ORDER BY table_name`,
    );
    expect(keys.rows).toEqual(
      [
        "player_cosmetic_ownership",
        "player_identities",
        "player_match_xp_credits",
        "player_messages",
        "player_name_history",
        "player_xp_grants",
        "processed_purchases",
        "purchase_intents",
      ].map((table_name) => ({ table_name, data_type: "uuid" })),
    );

    // The names the application code narrows errors by must exist.
    const indexes = await pool.query(
      `SELECT indexname FROM pg_indexes WHERE schemaname = current_schema()`,
    );
    const names = indexes.rows.map((row) => String(row.indexname));
    for (const name of [
      "players_pkey",
      "players_display_name_uq",
      "player_identities_pkey",
      "player_identities_player_idx",
      "player_name_history_one_pending_uq",
      "player_name_history_player_recent_idx",
      "purchase_intents_player_idx",
      "player_messages_player_sent_idx",
      "player_messages_unread_idx",
      "player_match_xp_credits_pkey",
      "player_xp_grants_pkey",
    ]) {
      expect(names).toContain(name);
    }

    // processed_purchases keeps NO foreign key on player_id (receipt outlives an
    // erasure).
    const fks = await pool.query(
      `SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint
       WHERE conrelid = 'processed_purchases'::regclass AND contype = 'f'`,
    );
    expect(fks.rows.map((row) => String(row.def))).toEqual([
      expect.stringContaining(
        "(intent_id) REFERENCES purchase_intents(id) ON DELETE SET NULL",
      ),
    ]);
  });

  test.each(OLD_TABLES)(
    "one row in %s: 006 REFUSES and changes nothing",
    async (table, insertSql) => {
      const pool = await isolatedPool(`guard_${table}`);
      await applyMigrations(pool, MIGRATIONS_DIR, { filter: UP_TO_004 });

      // Exactly ONE table holds a row: FK triggers are skipped for this insert
      // (superuser test role), so a child table can be seeded without a parent.
      const client = await pool.connect();
      try {
        await client.query("SET session_replication_role = replica");
        await client.query(insertSql);
        await client.query("SET session_replication_role = DEFAULT");
      } finally {
        client.release();
      }

      const before = await schemaSnapshot(pool);
      const failure = applyMigrations(pool, MIGRATIONS_DIR);
      await expect(failure).rejects.toThrow(
        "migration failed: 006_player_identity.sql",
      );
      await failure.catch((error: Error) => {
        expect(error.message).toContain(`table ${table} holds rows`);
        expect(error.message).toContain("re-plan, do not bypass");
      });

      expect(await schemaSnapshot(pool)).toEqual(before);
      const rows = await pool.query(`SELECT count(*)::int AS n FROM ${table}`);
      expect(rows.rows[0].n).toBe(1);
      expect(await appliedFiles(pool)).not.toContain("006_player_identity.sql");
      expect(await tableExists(pool, "players")).toBe(false);
    },
  );

  describe("constraints on the new schema", () => {
    let pool: Pool;
    let playerId: string;

    beforeAll(async () => {
      pool = await isolatedPool("constraints");
      await applyMigrations(pool, MIGRATIONS_DIR);
      const player = await pool.query(
        "INSERT INTO players DEFAULT VALUES RETURNING id",
      );
      playerId = String(player.rows[0].id);
    });

    test("player_xp_grants accepts xp_awarded = 0 (checked, nothing granted) and rejects -1", async () => {
      await expect(
        pool.query(
          `INSERT INTO player_xp_grants (player_id, kind, xp_awarded, evidence)
           VALUES ($1, 'tenure', 0, '{}'::jsonb)`,
          [playerId],
        ),
      ).resolves.toBeDefined();
      await pool.query("DELETE FROM player_xp_grants");
      await expect(
        pool.query(
          `INSERT INTO player_xp_grants (player_id, kind, xp_awarded, evidence)
           VALUES ($1, 'tenure', -1, '{}'::jsonb)`,
          [playerId],
        ),
      ).rejects.toMatchObject({ code: "23514" });
    });

    test("the platform check accepts only yandex_games", async () => {
      await expect(
        pool.query(
          `INSERT INTO player_identities (platform, platform_user_id, player_id)
           VALUES ('web', 'u-1', $1)`,
          [playerId],
        ),
      ).rejects.toMatchObject({ code: "23514" });
      await expect(
        pool.query(
          `INSERT INTO player_identities (platform, platform_user_id, player_id)
           VALUES ('yandex_games', '', $1)`,
          [playerId],
        ),
      ).rejects.toMatchObject({ code: "23514" });
      await expect(
        pool.query(
          `INSERT INTO player_identities (platform, platform_user_id, player_id)
           VALUES ('yandex_games', 'u-1', $1)`,
          [playerId],
        ),
      ).resolves.toBeDefined();
    });

    test("moderation_status still DEFAULTS to 'approved' — the documented trap is preserved, not silently fixed", async () => {
      const row = await pool.query(
        `INSERT INTO player_name_history (player_id, new_display_name)
         VALUES ($1, 'Trap') RETURNING moderation_status`,
        [playerId],
      );
      expect(row.rows[0].moderation_status).toBe("approved");
    });

    test("erasing a player cascades to its identities but keeps purchase receipts", async () => {
      const other = String(
        (await pool.query("INSERT INTO players DEFAULT VALUES RETURNING id"))
          .rows[0].id,
      );
      await pool.query(
        `INSERT INTO player_identities (platform, platform_user_id, player_id)
         VALUES ('yandex_games', 'u-erase', $1)`,
        [other],
      );
      await pool.query(
        `INSERT INTO processed_purchases (purchase_token, player_id, product_id, raw_payload)
         VALUES ('tok-erase', $1, 'citizenship', '{}')`,
        [other],
      );
      await pool.query("DELETE FROM players WHERE id = $1", [other]);
      const identities = await pool.query(
        "SELECT count(*)::int AS n FROM player_identities WHERE player_id = $1",
        [other],
      );
      expect(identities.rows[0].n).toBe(0);
      const receipts = await pool.query(
        "SELECT count(*)::int AS n FROM processed_purchases WHERE player_id = $1",
        [other],
      );
      expect(receipts.rows[0].n).toBe(1);
    });
  });
});
