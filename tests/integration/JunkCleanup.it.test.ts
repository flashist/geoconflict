// Integration test for the junk-cleanup SQL (task 0274, S5).
//
// The SQL is NOT duplicated here. It is READ OUT of the runbook
// (ai-agents/knowledge-base/profile-junk-cleanup-runbook.md) so there is exactly ONE
// definition of "junk": the one an operator will paste into psql at 3 a.m. A runbook
// with untested SQL beside a test with its own copy is the worst of both — the copy
// passes forever while the runbook rots.
//
// What is proved: a genuinely empty, aged, never-returned player is deleted, and ONE
// survivor of EVERY kind is not. Each `NOT EXISTS` in the predicate is a separate
// reason to keep a row, and each has its own survivor below — remove any one of them
// and this suite goes red on exactly that row.

import { readFileSync } from "fs";
import { Pool } from "pg";
import { resolve } from "path";

const RUN = process.env.RUN_DB_TESTS ? describe : describe.skip;

const RUNBOOK = resolve(
  __dirname,
  "../../ai-agents/knowledge-base/profile-junk-cleanup-runbook.md",
);

/**
 * The fenced SQL block that follows `<!-- cleanup-sql:<name> -->` in the runbook.
 * Anchored on the HTML comment, not on a heading or an ordinal, so re-ordering the
 * prose cannot silently pick up the wrong block.
 */
function runbookSql(anchor: string): string {
  const markdown = readFileSync(RUNBOOK, "utf8");
  const pattern = new RegExp(
    `<!--\\s*cleanup-sql:${anchor}\\s*-->\\s*\`\`\`sql\\n([\\s\\S]*?)\`\`\``,
  );
  const match = pattern.exec(markdown);
  if (match === null) {
    throw new Error(
      `runbook block "cleanup-sql:${anchor}" not found in ${RUNBOOK} — if the anchor was renamed, rename it here too`,
    );
  }
  return match[1];
}

RUN("junk cleanup SQL (integration)", () => {
  let pool: Pool;

  // A dedicated client: the predicate lives in a TEMP view, which exists only for the
  // session that created it — exactly as it does in the operator's one psql session.
  let sql: import("pg").PoolClient;

  // Every timestamp is relative to NOW, because the predicate compares against now()
  // for the min_age guard. Fixed calendar dates would pass or fail depending on the day
  // the suite is run — which is exactly the kind of test that rots.
  const hoursAgo = (hours: number) =>
    new Date(Date.now() - hours * 3_600_000).toISOString();
  const WINDOW_START = hoursAgo(16);
  const WINDOW_END = hoursAgo(12);
  const INSIDE = hoursAgo(14);
  const BEFORE = hoursAgo(20);
  const AFTER_RETURN = hoursAgo(2);
  const MIN_AGE = "6 hours";

  /**
   * A player created INSIDE the window who never came back. `created_at`/`last_login_at`
   * are written explicitly: the repository's defaults are now(), and the predicate's
   * whole job is to discriminate on these timestamps.
   */
  async function seedPlayer(
    platformUserId: string,
    overrides: {
      createdAt?: string;
      lastLoginAt?: string;
      xp?: number;
      isCitizen?: boolean;
      isPaidCitizen?: boolean;
      displayName?: string | null;
      identityCreatedAt?: string;
    } = {},
  ): Promise<string> {
    const createdAt = overrides.createdAt ?? INSIDE;
    const res = await sql.query(
      `INSERT INTO players (xp, is_citizen, is_paid_citizen, citizenship_earned_at,
                            display_name, created_at, updated_at, last_login_at)
       VALUES ($1, $2, $3, $4, $5, $6, $6, $7) RETURNING id`,
      [
        overrides.xp ?? 0,
        overrides.isCitizen ?? overrides.isPaidCitizen ?? false,
        overrides.isPaidCitizen ?? false,
        // chk_earned_implies_citizen: a citizen in this fixture is an EARNED citizen.
        overrides.isCitizen && !overrides.isPaidCitizen ? createdAt : null,
        overrides.displayName ?? null,
        createdAt,
        overrides.lastLoginAt ?? createdAt,
      ],
    );
    const playerId = String(res.rows[0].id);
    await sql.query(
      `INSERT INTO player_identities (platform, platform_user_id, player_id, created_at, last_login_at)
       VALUES ('yandex_games', $1, $2, $3, $3)`,
      [platformUserId, playerId, overrides.identityCreatedAt ?? createdAt],
    );
    return playerId;
  }

  /**
   * Run the runbook's window block exactly as psql would (review R7): each statement
   * separately, autocommit, so the drops/creates are the runbook's own text and not a
   * retyped copy. Only the three `\set` values are substituted — psql interpolates
   * them as literals, and there is no way to bind a parameter into DDL.
   *
   * Statements are split on `;` at end-of-line, which is safe for this block: it has
   * no function bodies, strings or dollar-quoting containing a semicolon.
   */
  async function runWindowBlock(
    window: { start?: string; end?: string; minAge?: string } = {},
  ): Promise<void> {
    const body = runbookSql("window")
      .split("\n")
      .filter((line) => !line.trim().startsWith("\\set"))
      .join("\n")
      .replace(":'window_start'", `'${window.start ?? WINDOW_START}'`)
      .replace(":'window_end'", `'${window.end ?? WINDOW_END}'`)
      .replace(":'min_age'", `'${window.minAge ?? MIN_AGE}'`);
    // A leftover psql placeholder would silently become a syntax error further down.
    expect(body).not.toContain(":'");
    for (const statement of body
      .split(/;\s*$/m)
      .map((s) => s.trim())
      .filter(Boolean)) {
      await sql.query(statement);
    }
  }

  async function buildPredicate(
    window: { start?: string; end?: string; minAge?: string } = {},
  ): Promise<void> {
    await runWindowBlock(window);
    await sql.query(runbookSql("candidates"));
  }

  /** The runbook's dry-run block, verbatim. */
  async function dryRun(): Promise<{
    candidates: number;
    columns: string[];
  }> {
    const res = await sql.query(runbookSql("dry-run"));
    return {
      candidates: Number(res.rows[0].candidates),
      columns: Object.keys(res.rows[0]),
    };
  }

  /**
   * The runbook's DELETE, verbatim — or with its batch size swapped when a test needs a
   * smaller one. The replacement is asserted, so a changed limit in the runbook shows up
   * here instead of silently making the batching test meaningless.
   */
  async function runbookDelete(limit?: number): Promise<number> {
    let statement = runbookSql("delete").trim().replace(/;$/, "");
    if (limit !== undefined) {
      const swapped = statement.replace(/limit\s+10000/i, `limit ${limit}`);
      expect(swapped).not.toBe(statement);
      statement = swapped;
    }
    const res = await sql.query(statement);
    return res.rowCount ?? 0;
  }

  async function candidateCount(): Promise<number> {
    const res = await sql.query(
      "SELECT count(*)::int AS n FROM junk_candidates",
    );
    return Number(res.rows[0].n);
  }

  async function playerExists(playerId: string): Promise<boolean> {
    const res = await sql.query("SELECT 1 FROM players WHERE id = $1", [
      playerId,
    ]);
    return res.rows.length > 0;
  }

  beforeAll(() => {
    pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    sql = await pool.connect();
    await sql.query(
      `TRUNCATE player_messages, processed_purchases, purchase_intents, player_xp_grants,
                player_cosmetic_ownership, player_name_history, player_match_xp_credits,
                player_identities, players RESTART IDENTITY CASCADE`,
    );
  });

  afterEach(async () => {
    // Releasing the client drops the temp view and table with the session.
    await sql.query("DROP VIEW IF EXISTS junk_candidates");
    await sql.query("DROP TABLE IF EXISTS cleanup_window");
    sql.release();
  });

  test("the runbook still contains all four SQL blocks under their anchors", () => {
    expect(runbookSql("window")).toContain("cleanup_window");
    // The dry run and the DELETE are pulled, not retyped (review R7) — so their anchors
    // are part of the contract too, and a missing one must fail loudly here.
    expect(runbookSql("dry-run")).toContain("from junk_candidates");
    expect(runbookSql("delete")).toContain("delete from players");
    expect(runbookSql("delete")).toContain("limit 10000");
    const predicate = runbookSql("candidates");
    expect(predicate).toContain("create or replace temp view junk_candidates");
    // Every table a player can be attached to is named. A predicate that quietly loses
    // one of these would delete a real player, so the list is asserted, not assumed.
    for (const table of [
      "player_match_xp_credits",
      "player_xp_grants",
      "purchase_intents",
      "processed_purchases",
      "player_messages",
      "player_name_history",
      "player_cosmetic_ownership",
      "player_identities",
    ]) {
      expect(predicate).toContain(table);
    }
    expect(predicate).toContain("min_age");
  });

  test("one junk row and one survivor of EVERY kind: exactly the junk row is deleted", async () => {
    const junk = await seedPlayer("zz0274-junk");

    // Each entry is one reason the predicate must keep a row.
    const survivors: Record<string, string> = {};
    survivors.credit = await seedPlayer("zz0274-credit");
    await sql.query(
      "INSERT INTO player_match_xp_credits (game_id, player_id, xp_awarded) VALUES ('zz0274-game', $1, 10)",
      [survivors.credit],
    );

    // A 0-XP grant row is a FINAL "checked" — real state, not an empty row.
    survivors.zeroXpGrant = await seedPlayer("zz0274-grant");
    await sql.query(
      `INSERT INTO player_xp_grants (player_id, kind, xp_awarded, evidence)
       VALUES ($1, 'tenure', 0, '{}'::jsonb)`,
      [survivors.zeroXpGrant],
    );

    survivors.intent = await seedPlayer("zz0274-intent");
    await sql.query(
      "INSERT INTO purchase_intents (player_id, product_id) VALUES ($1, 'citizenship')",
      [survivors.intent],
    );

    // processed_purchases has NO foreign key, so only the explicit NOT EXISTS saves it.
    survivors.processedPurchase = await seedPlayer("zz0274-purchase");
    await sql.query(
      `INSERT INTO processed_purchases (purchase_token, player_id, product_id, raw_payload)
       VALUES ('zz0274-token', $1, 'citizenship', '{}')`,
      [survivors.processedPurchase],
    );

    survivors.message = await seedPlayer("zz0274-message");
    await sql.query(
      "INSERT INTO player_messages (player_id, title, body) VALUES ($1, 'hi', 'there')",
      [survivors.message],
    );

    survivors.nameHistory = await seedPlayer("zz0274-name-history");
    await sql.query(
      `INSERT INTO player_name_history (player_id, new_display_name, moderation_status)
       VALUES ($1, 'Someone', 'pending')`,
      [survivors.nameHistory],
    );

    survivors.cosmetic = await seedPlayer("zz0274-cosmetic");
    await sql.query(
      `INSERT INTO player_cosmetic_ownership (player_id, cosmetic_type, cosmetic_id)
       VALUES ($1, 'pattern', 'zz0274-pattern')`,
      [survivors.cosmetic],
    );

    survivors.displayName = await seedPlayer("zz0274-named", {
      displayName: "zz0274 Named",
    });
    survivors.xp = await seedPlayer("zz0274-xp", { xp: 10 });
    survivors.citizen = await seedPlayer("zz0274-citizen", { isCitizen: true });
    survivors.paidCitizen = await seedPlayer("zz0274-paid", {
      isCitizen: true,
      isPaidCitizen: true,
    });
    // Created before the window: an existing player who happens to look empty.
    survivors.beforeWindow = await seedPlayer("zz0274-before", {
      createdAt: BEFORE,
    });
    // Came back after the window closed.
    survivors.cameBack = await seedPlayer("zz0274-returned", {
      lastLoginAt: AFTER_RETURN,
    });
    // An identity that predates the window, on a player row created inside it.
    survivors.olderIdentity = await seedPlayer("zz0274-old-identity", {
      identityCreatedAt: BEFORE,
    });

    await buildPredicate();

    expect(await candidateCount()).toBe(1);
    const candidates = await sql.query("SELECT id FROM junk_candidates");
    expect(String(candidates.rows[0].id)).toBe(junk);

    // The runbook's own DELETE, pulled from the file — not a copy of it (review R7).
    expect(await runbookDelete()).toBe(1);
    expect(await playerExists(junk)).toBe(false);

    for (const [reason, playerId] of Object.entries(survivors)) {
      expect(await playerExists(playerId)).toBe(true);
      // ...and the reason is still a reason: nothing was quietly cascaded away.
      if (reason === "credit") {
        const rows = await sql.query(
          "SELECT 1 FROM player_match_xp_credits WHERE player_id = $1",
          [playerId],
        );
        expect(rows.rows).toHaveLength(1);
      }
    }

    // The junk player's identity went with it (ON DELETE CASCADE) — no orphan identity.
    const orphans = await sql.query(
      `SELECT count(*)::int AS n FROM player_identities i
       WHERE NOT EXISTS (SELECT 1 FROM players p WHERE p.id = i.player_id)`,
    );
    expect(Number(orphans.rows[0].n)).toBe(0);
    // ...and no player without an identity either.
    const orphanPlayers = await sql.query(
      `SELECT count(*)::int AS n FROM players p
       WHERE NOT EXISTS (SELECT 1 FROM player_identities i WHERE i.player_id = p.id)`,
    );
    expect(Number(orphanPlayers.rows[0].n)).toBe(0);
  });

  test("the dry run reports the same count as the delete removes, and no ids", async () => {
    for (let i = 0; i < 5; i++) {
      await seedPlayer(`zz0274-dry-${i}`);
    }
    await seedPlayer("zz0274-dry-keep", { xp: 5 });
    await buildPredicate();

    // The runbook's dry-run block, pulled from the file: a count and two timestamps,
    // and — asserted here — NO id column (ADR-113).
    const dry = await dryRun();
    expect(dry.candidates).toBe(5);
    expect(dry.columns).toEqual(["candidates", "oldest", "newest"]);

    expect(await runbookDelete()).toBe(5);
    const remaining = await sql.query("SELECT count(*)::int AS n FROM players");
    expect(Number(remaining.rows[0].n)).toBe(1);
  });

  test("batching terminates: repeating the delete with a small limit removes everything, then reports 0", async () => {
    for (let i = 0; i < 7; i++) {
      await seedPlayer(`zz0274-batch-${i}`);
    }
    await buildPredicate();
    let total = 0;
    for (let round = 0; round < 10; round++) {
      // The runbook's DELETE with only its batch size swapped (the swap is asserted).
      const deleted = await runbookDelete(3);
      if (deleted === 0) {
        break;
      }
      total += deleted;
    }
    expect(total).toBe(7);
    const remaining = await sql.query("SELECT count(*)::int AS n FROM players");
    expect(Number(remaining.rows[0].n)).toBe(0);
  });

  // The min_age guard needs its OWN window: in the main test the whole window is older
  // than min_age, so nothing there can exercise it. This is the guard that stops a player
  // being deleted mid-match — the one loss the cleanup can actually cause.
  test("min_age keeps a player who is inside the window but too young, and releases them once they age", async () => {
    await seedPlayer("zz0274-mid-match", {
      createdAt: hoursAgo(2),
      lastLoginAt: hoursAgo(2),
    });
    const recentWindow = { start: hoursAgo(3), end: hoursAgo(1) };

    await buildPredicate({ ...recentWindow, minAge: "6 hours" });
    expect(await candidateCount()).toBe(0);

    // Same row, same window, a min_age it now clears: the ONLY thing that changed.
    await sql.query("DROP VIEW junk_candidates");
    await sql.query("DROP TABLE cleanup_window");
    await buildPredicate({ ...recentWindow, minAge: "1 hour" });
    expect(await candidateCount()).toBe(1);
  });

  // ── Review R1 (high): the re-paste path ────────────────────────────────────
  // The runbook tells the operator to "narrow it and count again" (section 5). Before
  // the fix, re-pasting left the OLD row in cleanup_window and added the new one, so
  // `cross join cleanup_window w` made junk_candidates the UNION of both windows — the
  // DELETE would have removed rows from OUTSIDE the chosen window, and the dry-run count
  // double-counted. The previous version of this suite could not catch it, because its
  // own helper created the table fresh every time: the TEST did the reset the RUNBOOK
  // omitted. These tests exercise the operator's actual sequence instead.
  describe("re-pasting the runbook blocks (the operator's narrow-and-retry path)", () => {
    test("narrowing the window really narrows it — one window is in force, not the union", async () => {
      await seedPlayer("zz0274-repaste-in", { createdAt: hoursAgo(14) });
      await seedPlayer("zz0274-repaste-out", { createdAt: hoursAgo(30) });

      // Pass 1: a WIDE window catches both.
      await buildPredicate({ start: hoursAgo(40), end: hoursAgo(12) });
      expect(await candidateCount()).toBe(2);

      // Pass 2: the operator narrows and re-pastes, exactly as section 5 instructs.
      await buildPredicate({ start: hoursAgo(16), end: hoursAgo(12) });
      expect(await candidateCount()).toBe(1);

      // Exactly one window row — two would mean the union bug is back.
      const rows = await sql.query(
        "SELECT count(*)::int AS n FROM cleanup_window",
      );
      expect(Number(rows.rows[0].n)).toBe(1);

      // No duplicate candidate rows: count(*) and count(distinct id) must agree, which
      // is what kept the dry run's cross-check with the DELETE total honest.
      const dupes = await sql.query(
        "SELECT count(*)::int AS total, count(distinct id)::int AS distinct_players FROM junk_candidates",
      );
      expect(Number(dupes.rows[0].total)).toBe(
        Number(dupes.rows[0].distinct_players),
      );

      // And the DELETE removes only the narrowed window's row.
      expect(await runbookDelete()).toBe(1);
    });

    test("re-pasting is idempotent — neither block errors the second time", async () => {
      await seedPlayer("zz0274-repaste-idem");
      await buildPredicate();
      // Would have thrown 42P07 "already exists" on both the table and the view before.
      await expect(buildPredicate()).resolves.toBeUndefined();
      expect(await candidateCount()).toBe(1);
    });

    test("an EDITED predicate takes effect on a re-paste instead of silently keeping the old one", async () => {
      await seedPlayer("zz0274-repaste-edit", { xp: 0 });
      await buildPredicate();
      expect(await candidateCount()).toBe(1);

      // Simulate the operator tightening the predicate and re-pasting it. `create temp
      // view` (no `or replace`) errored here, leaving the ORIGINAL view in force — so an
      // operator would have believed an edit applied when it had not.
      const tightened = runbookSql("candidates").replace(
        "and p.xp = 0",
        "and p.xp = 0 and false",
      );
      expect(tightened).toContain("and false");
      await sql.query(tightened);
      expect(await candidateCount()).toBe(0);
    });

    test("the window block carries its own reset, schema-qualified, and the view is re-runnable", () => {
      const windowBlock = runbookSql("window");
      // Order matters: the view depends on the table, so it must be dropped first.
      const viewDrop = windowBlock.indexOf(
        "drop view if exists pg_temp.junk_candidates",
      );
      const tableDrop = windowBlock.indexOf(
        "drop table if exists pg_temp.cleanup_window",
      );
      expect(viewDrop).toBeGreaterThanOrEqual(0);
      expect(tableDrop).toBeGreaterThan(viewDrop);
      // Review R14: the drops must stay pg_temp-qualified. Unqualified, they resolve
      // through search_path — and on the FIRST paste of a session, when no temp object
      // exists yet, that is `public`. The blast radius is nil in this database today,
      // but an unqualified DROP does not belong in a block whose next statements delete
      // production rows. This assertion is what stops the qualification drifting back
      // out unnoticed.
      for (const unqualified of [
        /drop\s+view\s+if\s+exists\s+junk_candidates/i,
        /drop\s+table\s+if\s+exists\s+cleanup_window/i,
      ]) {
        expect(windowBlock).not.toMatch(unqualified);
      }
      // Named columns, so a reordered table definition cannot swap start and end.
      expect(windowBlock).toContain(
        "insert into cleanup_window (window_start, window_end, min_age)",
      );
      expect(runbookSql("candidates")).toContain(
        "create or replace temp view junk_candidates",
      );
    });
  });

  test("an empty window deletes nothing rather than everything", async () => {
    await seedPlayer("zz0274-outside", { createdAt: BEFORE });
    await buildPredicate({
      start: "2026-01-01T00:00:00.000Z",
      end: "2026-01-02T00:00:00.000Z",
    });
    expect(await candidateCount()).toBe(0);
  });
});
