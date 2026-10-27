// Integration tests for the owner-run profile merge (task 0503, ADR-128) against a REAL
// Postgres: ProfileMergeRepository through its own transactions, and the command end to
// end with a scripted confirmation. Fixtures are built through the production write
// paths (login, match credit, tenure check, ad bonus, purchase grant, name decision), so
// every record starts out obeying the rules the merge checks. Synthetic ids only.

import { Pool } from "pg";
import { InboxRepository } from "../../src/profile-server/InboxRepository";
import { NameChangeRepository } from "../../src/profile-server/NameChangeRepository";
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
import {
  EXIT_OK,
  EXIT_REFUSED,
  runMergeProfiles,
} from "../../src/profile-server/ProfileMergeCommand";
import {
  ProfileMergeRepository,
  type CommitOutcome,
  type MergeRequest,
} from "../../src/profile-server/ProfileMergeRepository";
import { TesterRoleRepository } from "../../src/profile-server/TesterRoleRepository";
import { TESTER_ROLES } from "../../src/profile-server/TesterRoles";
import { createYandexPlayer, truncateProfileTables } from "./support/db";

const RUN = process.env.RUN_DB_TESTS ? describe : describe.skip;
const GHOST = "00000000-0000-4000-8000-00000000dead";
const TEST_ITEM = "test_durable_item";
const EVIDENCE = { daysPlayed: 40, gameRecordDays: 40 };
const UUID_SHAPED =
  /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

RUN("profile merge (integration)", () => {
  let pool: Pool;
  let merge: ProfileMergeRepository;
  let profiles: PlayerProfileRepository;
  let payments: PaymentsRepository;
  let items: PaymentsRepository;
  let names: NameChangeRepository;
  let identities: PlayerIdentityRepository;

  beforeAll(() => {
    pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
    merge = new ProfileMergeRepository(pool);
    profiles = new PlayerProfileRepository(pool);
    payments = new PaymentsRepository(pool);
    items = new PaymentsRepository(pool, undefined, {
      ...PRODUCT_GRANTS,
      [TEST_ITEM]: durableItemGrant(null),
    });
    names = new NameChangeRepository(pool);
    identities = new PlayerIdentityRepository(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    await truncateProfileTables(pool);
  });

  // ── Fixture helpers ──────────────────────────────────────────────────────

  async function credit(playerId: string, game: string, xp = 10) {
    const outcome = await profiles.creditMatchXp(game, playerId, xp);
    expect(outcome.status).toBe("credited");
  }

  async function buy(
    playerId: string,
    token: string,
    productId = "citizenship",
  ) {
    const repo = productId === "citizenship" ? payments : items;
    const intentId = await repo.createIntent(playerId, productId);
    await repo.grantPaidPurchase({
      purchaseToken: token,
      productId,
      playerId,
      intentId,
      rawPayload: '{"test":true}',
    });
    return intentId;
  }

  async function approveName(playerId: string, name: string) {
    expect((await names.requestNameChange(playerId, name)).status).toBe("ok");
    expect((await names.decideNameChange(playerId, "approve")).status).toBe(
      "ok",
    );
  }

  async function player(playerId: string) {
    const res = await pool.query(
      `SELECT xp::int AS xp, is_citizen, is_paid_citizen, display_name,
              citizenship_earned_at::text AS earned_at,
              citizenship_purchased_at::text AS purchased_at
       FROM players WHERE id = $1`,
      [playerId],
    );
    return res.rows[0];
  }

  async function count(table: string, playerId: string, column = "player_id") {
    const res = await pool.query(
      `SELECT count(*)::int AS n FROM ${table} WHERE ${column} = $1`,
      [playerId],
    );
    return Number(res.rows[0].n);
  }

  async function games(table: string, playerId: string): Promise<string[]> {
    const res = await pool.query(
      `SELECT game_id FROM ${table} WHERE player_id = $1 ORDER BY game_id`,
      [playerId],
    );
    return res.rows.map((row) => String(row.game_id));
  }

  async function tenureXp(playerId: string): Promise<number | null> {
    const res = await pool.query(
      `SELECT xp_awarded FROM player_xp_grants WHERE player_id = $1 AND kind = 'tenure'`,
      [playerId],
    );
    return res.rows.length === 0 ? null : Number(res.rows[0].xp_awarded);
  }

  /** Every row of every public table — "nothing changed" means this is equal. */
  async function databaseDigest(): Promise<Record<string, string>> {
    const tables = await pool.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY 1`,
    );
    const digest: Record<string, string> = {};
    for (const row of tables.rows) {
      const name = String(row.table_name);
      const res = await pool.query(
        `SELECT md5(coalesce(string_agg(row_to_json(t)::text, '|' ORDER BY row_to_json(t)::text), '')) AS d FROM ${name} t`,
      );
      digest[name] = String(res.rows[0].d);
    }
    return digest;
  }

  async function fingerprintOf(request: MergeRequest): Promise<string> {
    const inspected = await merge.inspect(request, new Date());
    if (inspected.status !== "inspected") {
      throw new Error(`inspect: ${inspected.status}`);
    }
    return inspected.fingerprint;
  }

  async function commit(request: MergeRequest): Promise<CommitOutcome> {
    return merge.commit(
      {
        ...request,
        expectedFingerprint: await fingerprintOf(request),
        operator: "test",
      },
      new Date(),
    );
  }

  /** The command, end to end, with a scripted terminal. */
  async function runCommand(argv: string[], answer = "MERGE") {
    const out: string[] = [];
    const err: string[] = [];
    const code = await runMergeProfiles({
      argv,
      operator: "it-operator",
      interactive: true,
      prompt: async () => answer,
      store: merge,
      out: (line) => out.push(line),
      err: (line) => err.push(line),
      now: () => new Date(),
    });
    return { code, out: out.join("\n"), err: err.join("\n") };
  }

  /**
   * The affected player's shape, by role only: an old paid profile with a nickname, then
   * an intermediate one, then the current one — each with its own tenure row.
   */
  async function seedChain() {
    const old = await createYandexPlayer(pool, "zz0503-old");
    await credit(old, "g1");
    await credit(old, "g2");
    await profiles.recordTenureCheck(old, 20, EVIDENCE);
    await buy(old, "zz0503-tok-old");
    await approveName(old, "Zz Merge Old");

    const mid = await createYandexPlayer(pool, "zz0503-mid");
    await credit(mid, "g2");
    await credit(mid, "g3");
    await profiles.grantRewardedMatchXp("g3", mid);
    await profiles.recordTenureCheck(mid, 30, EVIDENCE);

    const cur = await createYandexPlayer(pool, "zz0503-cur");
    await credit(cur, "g4");
    await profiles.recordTenureCheck(cur, 10, EVIDENCE);
    await new InboxRepository(pool).sendMessage({
      playerId: cur,
      title: "zz",
      body: "zz",
    });
    return { old, mid, cur };
  }

  // ── Dry run ──────────────────────────────────────────────────────────────

  test("a dry run changes nothing, row for row", async () => {
    const { old, mid, cur } = await seedChain();
    const before = await databaseDigest();
    const result = await runCommand([
      "dry-run",
      "--into",
      old,
      "--from",
      mid,
      "--from",
      cur,
    ]);
    expect(result.code).toBe(EXIT_OK);
    expect(result.out).toMatch(/Fingerprint: [0-9a-f]{32}/);
    expect(result.out).not.toMatch(UUID_SHAPED);
    expect(await databaseDigest()).toEqual(before);
  });

  // ── The case: KEEP = the old paid profile ────────────────────────────────

  test("the three-record chain into the OLD profile, through the command", async () => {
    const { old, mid, cur } = await seedChain();
    const oldBefore = await player(old);
    const ids = ["--into", old, "--from", mid, "--from", cur];
    const dry = await runCommand(["dry-run", ...ids]);
    const fingerprint = /Fingerprint: ([0-9a-f]{32})/.exec(dry.out)?.[1];
    expect(fingerprint).toBeDefined();

    const real = await runCommand([
      "commit",
      ...ids,
      "--expect",
      fingerprint as string,
    ]);
    expect(real.err).toBe("");
    expect(real.code).toBe(EXIT_OK);
    expect(real.out).toContain("MERGED");
    expect(`${real.out}\n${dry.out}`).not.toMatch(UUID_SHAPED);

    // Every login lands on the old profile now.
    expect(await count("player_identities", old)).toBe(3);
    for (const source of [mid, cur]) {
      expect(await count("player_identities", source)).toBe(0);
      expect(await count("processed_purchases", source)).toBe(0);
    }
    // Each match once: g2 was already on old, so mid's g2 stays there.
    expect(await games("player_match_xp_credits", old)).toEqual([
      "g1",
      "g2",
      "g3",
      "g4",
    ]);
    expect(await games("player_match_xp_credits", mid)).toEqual(["g2"]);
    expect(await games("player_rewarded_match_xp", old)).toEqual(["g3"]);
    // The largest tenure row (30) ends on old; old's 20 went to mid; cur's 10 stays.
    expect(await tenureXp(old)).toBe(30);
    expect(await tenureXp(mid)).toBe(20);
    expect(await tenureXp(cur)).toBe(10);
    expect(await count("player_messages", old)).toBe(1);

    const oldAfter = await player(old);
    expect(oldAfter.xp).toBe(4 * 10 + 10 + 30);
    expect(oldAfter.is_paid_citizen).toBe(true);
    expect(oldAfter.purchased_at).toBe(oldBefore.purchased_at);
    expect(oldAfter.display_name).toBe("Zz Merge Old");
    expect((await names.getLatestState(old))?.status).toBe("approved");
    expect(await player(mid)).toMatchObject({
      xp: 10 + 20,
      is_citizen: false,
      is_paid_citizen: false,
    });
    expect(await player(cur)).toMatchObject({ xp: 10, is_citizen: false });

    const audit = await pool.query(
      `SELECT operator, into_player_id::text AS into_id, from_player_ids::text[] AS froms,
              fingerprint, moved, before_state FROM player_merges`,
    );
    expect(audit.rows).toHaveLength(1);
    expect(audit.rows[0]).toMatchObject({
      operator: "it-operator",
      into_id: old,
      froms: [mid, cur],
      fingerprint,
    });
    expect(audit.rows[0].before_state).toHaveLength(3);
    expect(JSON.stringify(audit.rows[0].before_state)).not.toContain(
      "Zz Merge Old",
    );

    // Brief check 3: the moved identity resolves to the kept record on the next login.
    const resolved = await identities.resolveExistingPlayer(
      PLATFORM_YANDEX_GAMES,
      "zz0503-cur",
    );
    expect(resolved?.playerId).toBe(old);
  });

  // ── The other direction: KEEP = the current, empty profile ───────────────

  test("moving the data onto the CURRENT profile: paid state, receipt, intent, name and history", async () => {
    const old = await createYandexPlayer(pool, "zz0503-old");
    await credit(old, "g1");
    const intentId = await buy(old, "zz0503-tok-old");
    await approveName(old, "Zz Merge Old");
    const cur = await createYandexPlayer(pool, "zz0503-cur");
    const oldBefore = await player(old);

    const outcome = await commit({ into: cur, sources: [old] });
    expect(outcome.status).toBe("merged");

    const after = await player(cur);
    expect(after).toMatchObject({
      is_paid_citizen: true,
      is_citizen: true,
      display_name: "Zz Merge Old",
      purchased_at: oldBefore.purchased_at,
    });
    expect(await player(old)).toMatchObject({
      is_paid_citizen: false,
      is_citizen: false,
      display_name: null,
      purchased_at: null,
    });
    const receipt = await payments.getProcessedPurchase("zz0503-tok-old");
    expect(receipt?.playerId).toBe(cur);
    expect((await payments.findIntent(intentId as string))?.playerId).toBe(cur);
    // Old's one history row (the request, approved in place) moved, plus a new approved row on top.
    expect(await count("player_name_history", cur)).toBe(2);
    expect(await count("player_name_history", old)).toBe(0);
    expect(await names.getLatestState(cur)).toMatchObject({
      status: "approved",
      requested_name: "Zz Merge Old",
    });
  });

  // ── Clashes ──────────────────────────────────────────────────────────────

  test("a game the kept record holds in EITHER table keeps both of the source's rows", async () => {
    const keep = await createYandexPlayer(pool, "zz0503-keep");
    await credit(keep, "gx");
    await credit(keep, "gy");
    await profiles.grantRewardedMatchXp("gy", keep);
    const source = await createYandexPlayer(pool, "zz0503-src");
    await credit(source, "gx");
    await profiles.grantRewardedMatchXp("gx", source);
    await credit(source, "gy");
    await credit(source, "gz");
    await profiles.grantRewardedMatchXp("gz", source);

    expect((await commit({ into: keep, sources: [source] })).status).toBe(
      "merged",
    );
    expect(await games("player_match_xp_credits", source)).toEqual([
      "gx",
      "gy",
    ]);
    expect(await games("player_rewarded_match_xp", source)).toEqual(["gx"]);
    expect(await games("player_rewarded_match_xp", keep)).toEqual(["gy", "gz"]);
    expect((await player(keep)).xp).toBe(10 + 10 + 10 + 10 + 10);
    expect((await player(source)).xp).toBe(10 + 10 + 10);
  });

  test("a 0-XP tenure row still counts as a row, and the larger one ends on the kept record", async () => {
    const keep = await createYandexPlayer(pool, "zz0503-keep");
    await profiles.recordTenureCheck(keep, 0, EVIDENCE);
    const source = await createYandexPlayer(pool, "zz0503-src");
    await profiles.recordTenureCheck(source, 25, EVIDENCE);
    expect((await commit({ into: keep, sources: [source] })).status).toBe(
      "merged",
    );
    expect(await tenureXp(keep)).toBe(25);
    expect(await tenureXp(source)).toBe(0);
    expect((await player(keep)).xp).toBe(25);
    expect((await player(source)).xp).toBe(0);
  });

  test("the same durable item on both sides: the receipt moves, the duplicate ownership row goes, a warning is printed", async () => {
    const keep = await createYandexPlayer(pool, "zz0503-keep");
    await buy(keep, "zz0503-tok-k", TEST_ITEM);
    const source = await createYandexPlayer(pool, "zz0503-src");
    await buy(source, "zz0503-tok-s", TEST_ITEM);

    const inspected = await merge.inspect(
      { into: keep, sources: [source] },
      new Date(),
    );
    expect(inspected.status).toBe("inspected");
    if (inspected.status === "inspected") {
      expect(inspected.plan.warnings.join(" ")).toContain("DOUBLE CHARGE");
    }
    expect((await commit({ into: keep, sources: [source] })).status).toBe(
      "merged",
    );
    expect(await count("processed_purchases", keep)).toBe(2);
    expect(await count("player_entitlements", keep)).toBe(1);
    expect(await count("player_entitlements", source)).toBe(0);
    expect(await player(source)).toMatchObject({ is_paid_citizen: false });
  });

  test("a source with two receipts for the same durable item is refused", async () => {
    const keep = await createYandexPlayer(pool, "zz0503-keep");
    const source = await createYandexPlayer(pool, "zz0503-src");
    await buy(source, "zz0503-tok-1", TEST_ITEM);
    await buy(source, "zz0503-tok-2", TEST_ITEM);
    const before = await databaseDigest();
    const outcome = await commit({ into: keep, sources: [source] });
    expect(outcome).toMatchObject({
      status: "refused",
      refusals: [
        expect.objectContaining({ code: "duplicate_durable_receipts" }),
      ],
    });
    expect(await databaseDigest()).toEqual(before);
  });

  test("cosmetics: a clashing one stays on the source, the rest move", async () => {
    const keep = await createYandexPlayer(pool, "zz0503-keep");
    const source = await createYandexPlayer(pool, "zz0503-src");
    await pool.query(
      `INSERT INTO player_cosmetic_ownership (player_id, cosmetic_type, cosmetic_id)
       VALUES ($1, 'pattern', 'a'), ($2, 'pattern', 'a'), ($2, 'pattern', 'b')`,
      [keep, source],
    );
    expect((await commit({ into: keep, sources: [source] })).status).toBe(
      "merged",
    );
    expect(await count("player_cosmetic_ownership", keep)).toBe(2);
    expect(await count("player_cosmetic_ownership", source)).toBe(1);
  });

  test("a kept record that already has a name: the source's name stays reserved on the source", async () => {
    const keep = await createYandexPlayer(pool, "zz0503-keep");
    await buy(keep, "zz0503-tok-k");
    await approveName(keep, "Zz Keep");
    const source = await createYandexPlayer(pool, "zz0503-src");
    await buy(source, "zz0503-tok-s");
    await approveName(source, "Zz Source");
    expect((await commit({ into: keep, sources: [source] })).status).toBe(
      "merged",
    );
    expect((await player(keep)).display_name).toBe("Zz Keep");
    expect((await player(source)).display_name).toBe("Zz Source");
    expect(await count("player_name_history", source)).toBe(1);
  });

  test("two named sources into an unnamed kept record: the first in --from order moves its name, the other stays reserved", async () => {
    const keep = await createYandexPlayer(pool, "zz0503-keep");
    const earlier = await createYandexPlayer(pool, "zz0503-src-a");
    await buy(earlier, "zz0503-tok-a");
    await approveName(earlier, "Zz Source A");
    const later = await createYandexPlayer(pool, "zz0503-src-b");
    await buy(later, "zz0503-tok-b");
    await approveName(later, "Zz Source B");

    expect(
      (await commit({ into: keep, sources: [later, earlier] })).status,
    ).toBe("merged");

    expect((await player(keep)).display_name).toBe("Zz Source B");
    expect((await player(later)).display_name).toBeNull();
    expect((await player(earlier)).display_name).toBe("Zz Source A");
    expect(await count("player_name_history", keep)).toBe(2);
    expect(await count("player_name_history", earlier)).toBe(1);
    expect(await names.getLatestState(keep)).toMatchObject({
      status: "approved",
      requested_name: "Zz Source B",
    });
  });

  test.each([
    ["the source", "source"],
    ["the kept record, while a name moves onto it", "keep"],
  ])("a pending name request on %s is refused", async (_label, side) => {
    const keep = await createYandexPlayer(pool, "zz0503-keep");
    const source = await createYandexPlayer(pool, "zz0503-src");
    await buy(source, "zz0503-tok-s");
    if (side === "source") {
      await names.requestNameChange(source, "Zz Pending");
    } else {
      await approveName(source, "Zz Source");
      await buy(keep, "zz0503-tok-k");
      await names.requestNameChange(keep, "Zz Pending");
    }
    const before = await databaseDigest();
    const outcome = await commit({ into: keep, sources: [source] });
    expect(outcome).toMatchObject({
      status: "refused",
      refusals: [expect.objectContaining({ code: "pending_name" })],
    });
    expect(await databaseDigest()).toEqual(before);
  });

  // ── Citizenship ──────────────────────────────────────────────────────────

  test("earned citizenship: the earliest earned date wins, and the kept record is stamped at the threshold", async () => {
    const keep = await createYandexPlayer(pool, "zz0503-keep");
    for (let game = 0; game < 6; game++) {
      await credit(keep, `k${game}`);
    }
    const source = await createYandexPlayer(pool, "zz0503-src");
    for (let game = 0; game < 5; game++) {
      await credit(source, `s${game}`);
    }
    expect(await player(keep)).toMatchObject({ xp: 60, earned_at: null });
    expect((await commit({ into: keep, sources: [source] })).status).toBe(
      "merged",
    );
    const after = await player(keep);
    expect(after.xp).toBe(110);
    expect(after.is_citizen).toBe(true);
    expect(after.earned_at).not.toBeNull();

    // A second merge: a source that earned earlier hands its date over.
    const earlier = await createYandexPlayer(pool, "zz0503-earlier");
    for (let game = 0; game < 10; game++) {
      await credit(earlier, `e${game}`);
    }
    await pool.query(
      `UPDATE players SET citizenship_earned_at = now() - interval '30 days' WHERE id = $1`,
      [earlier],
    );
    const sourceEarned = (await player(earlier)).earned_at;
    expect((await commit({ into: keep, sources: [earlier] })).status).toBe(
      "merged",
    );
    expect((await player(keep)).earned_at).toBe(sourceEarned);
    expect(await player(earlier)).toMatchObject({
      earned_at: null,
      is_citizen: false,
    });
  });

  // ── All or nothing, fingerprint, refusals ────────────────────────────────

  test("a failure at the very end (the audit insert) leaves everything as it was", async () => {
    const { old, mid, cur } = await seedChain();
    const before = await databaseDigest();
    await pool.query(`
      CREATE FUNCTION zz0503_fail() RETURNS trigger LANGUAGE plpgsql AS
      $$ BEGIN RAISE EXCEPTION 'zz0503 forced failure'; END $$`);
    await pool.query(
      `CREATE TRIGGER zz0503_fail BEFORE INSERT ON player_merges
       FOR EACH ROW EXECUTE FUNCTION zz0503_fail()`,
    );
    try {
      await expect(commit({ into: old, sources: [mid, cur] })).rejects.toThrow(
        "zz0503 forced failure",
      );
    } finally {
      await pool.query("DROP TRIGGER zz0503_fail ON player_merges");
      await pool.query("DROP FUNCTION zz0503_fail()");
    }
    expect(await databaseDigest()).toEqual(before);
  });

  test("a record that changed after the dry run: fingerprint mismatch, nothing written", async () => {
    const { old, mid, cur } = await seedChain();
    const request = { into: old, sources: [mid, cur] };
    const fingerprint = await fingerprintOf(request);
    await credit(cur, "g-late");
    const before = await databaseDigest();
    const outcome = await merge.commit(
      { ...request, expectedFingerprint: fingerprint, operator: "test" },
      new Date(),
    );
    expect(outcome.status).toBe("fingerprint_mismatch");
    expect(await databaseDigest()).toEqual(before);
  });

  test("the same records in a different order do not share a fingerprint", async () => {
    const { old, mid, cur } = await seedChain();
    expect(await fingerprintOf({ into: old, sources: [mid, cur] })).not.toBe(
      await fingerprintOf({ into: old, sources: [cur, mid] }),
    );
  });

  test("an unknown player is refused", async () => {
    const keep = await createYandexPlayer(pool, "zz0503-keep");
    await expect(
      merge.inspect({ into: keep, sources: [GHOST] }, new Date()),
    ).resolves.toEqual({ status: "no_such_player", labels: ["from #1"] });
    await expect(
      merge.commit(
        {
          into: keep,
          sources: [GHOST],
          expectedFingerprint: "0".repeat(32),
          operator: "test",
        },
        new Date(),
      ),
    ).resolves.toEqual({ status: "no_such_player", labels: ["from #1"] });
  });

  test("migration 012 not recorded: refused", async () => {
    const keep = await createYandexPlayer(pool, "zz0503-keep");
    const source = await createYandexPlayer(pool, "zz0503-src");
    await credit(source, "g1");
    await pool.query(
      "DELETE FROM schema_migrations WHERE filename = '012_player_merges.sql'",
    );
    try {
      await expect(
        merge.inspect({ into: keep, sources: [source] }, new Date()),
      ).resolves.toEqual({ status: "schema_missing" });
      await expect(
        merge.commit(
          {
            into: keep,
            sources: [source],
            expectedFingerprint: "0".repeat(32),
            operator: "test",
          },
          new Date(),
        ),
      ).resolves.toEqual({ status: "schema_missing" });
    } finally {
      await pool.query(
        "INSERT INTO schema_migrations (filename) VALUES ('012_player_merges.sql')",
      );
    }
  });

  test.each([
    [
      "tester_snapshot",
      async (id: string) => {
        await new TesterRoleRepository(pool).apply(
          id,
          TESTER_ROLES["non-citizen"],
        );
      },
    ],
    [
      "paid_flags_mismatch",
      async (id: string) => {
        await pool.query(
          `UPDATE players SET is_citizen = true, is_paid_citizen = true,
                              citizenship_purchased_at = now() WHERE id = $1`,
          [id],
        );
      },
    ],
    [
      "xp_rule_broken",
      async (id: string) => {
        await pool.query("UPDATE players SET xp = xp + 5 WHERE id = $1", [id]);
      },
    ],
  ])("refusal: %s — nothing written", async (code, spoil) => {
    const keep = await createYandexPlayer(pool, "zz0503-keep");
    const source = await createYandexPlayer(pool, "zz0503-src");
    await credit(source, "g1");
    await spoil(source);
    const before = await databaseDigest();
    const outcome = await commit({ into: keep, sources: [source] });
    expect(outcome.status).toBe("refused");
    if (outcome.status === "refused") {
      expect(outcome.refusals.map((r) => r.code)).toContain(code);
    }
    expect(await databaseDigest()).toEqual(before);
  });

  test("KEEP's XP would fall below its previous high: refused, nothing written", async () => {
    const keep = await createYandexPlayer(pool, "zz0503-keep");
    await credit(keep, "g1", 10);
    const source = await createYandexPlayer(pool, "zz0503-src");
    await credit(source, "g1", 50);
    const before = await databaseDigest();
    const outcome = await commit({ into: keep, sources: [source] });
    expect(outcome).toMatchObject({
      status: "refused",
      refusals: [expect.objectContaining({ code: "xp_would_drop" })],
    });
    expect(await databaseDigest()).toEqual(before);
  });

  test("a re-run says nothing to move; residue that lands later is swept by another run", async () => {
    const { old, mid, cur } = await seedChain();
    const ids = ["--into", old, "--from", mid, "--from", cur];
    expect((await commit({ into: old, sources: [mid, cur] })).status).toBe(
      "merged",
    );

    const again = await runCommand(["dry-run", ...ids]);
    expect(again.code).toBe(EXIT_OK);
    expect(again.out).toContain("NOTHING TO MOVE");
    expect(again.out).not.toContain("Fingerprint:");

    // A page still open on a source finishes a match after the merge.
    await credit(cur, "g-late");
    const sweep = await runCommand(["dry-run", ...ids]);
    const fingerprint = /Fingerprint: ([0-9a-f]{32})/.exec(sweep.out)?.[1];
    expect(fingerprint).toBeDefined();
    const real = await runCommand([
      "commit",
      ...ids,
      "--expect",
      fingerprint as string,
    ]);
    expect(real.code).toBe(EXIT_OK);
    expect(await games("player_match_xp_credits", old)).toContain("g-late");
    expect(await count("player_merges", old, "into_player_id")).toBe(2);
  });

  test("the command refuses a commit without a typed MERGE and writes nothing", async () => {
    const { old, mid, cur } = await seedChain();
    const ids = ["--into", old, "--from", mid, "--from", cur];
    const fingerprint = await fingerprintOf({ into: old, sources: [mid, cur] });
    const before = await databaseDigest();
    const result = await runCommand(
      ["commit", ...ids, "--expect", fingerprint],
      "merge",
    );
    expect(result.code).toBe(EXIT_REFUSED);
    expect(await databaseDigest()).toEqual(before);
  });
});
