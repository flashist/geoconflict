// Integration tests for SSH-only tester roles (task 0425) against a REAL Postgres:
// the real migrations (008 included), the real TesterRoleRepository, and the real
// command runner driven with a temp-dir allowlist and run log — so the refusal paths
// are proven against a real database too. The role values are also checked against
// the REAL code paths (creditMatchXp, recordTenureCheck) that produce the same state
// for a real player. Gated by RUN_DB_TESTS. No supertest here, so the known supertest
// flake family does not apply.

import fs from "fs";
import os from "os";
import path from "path";
import { Pool } from "pg";
import {
  CITIZENSHIP_XP_THRESHOLD,
  XP_PER_MATCH,
} from "../../src/core/profile/Citizenship";
import { PlayerProfileRepository } from "../../src/profile-server/PlayerProfileRepository";
import {
  EXIT_BAD_INPUT,
  EXIT_OK,
  EXIT_REFUSED,
  fileAllowlistReader,
  fileRunLog,
  runTesterRole,
} from "../../src/profile-server/TesterRoleCommand";
import { TesterRoleRepository } from "../../src/profile-server/TesterRoleRepository";
import {
  TESTER_ROLES,
  TESTER_ROLE_IDS,
} from "../../src/profile-server/TesterRoles";
import { createYandexPlayer, truncateProfileTables } from "./support/db";

const RUN = process.env.RUN_DB_TESTS ? describe : describe.skip;

const NO_SUCH_PLAYER = "5f0c1d2e-3a4b-4c5d-8e6f-7a8b9c0d1e2f";

RUN("tester roles over real Postgres (integration)", () => {
  let pool: Pool;
  let profiles: PlayerProfileRepository;
  let repo: TesterRoleRepository;
  let dir: string;
  let allowlistPath: string;
  let logPath: string;
  let tester: string;
  let other: string;

  beforeAll(() => {
    pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
    profiles = new PlayerProfileRepository(pool);
    repo = new TesterRoleRepository(pool);
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "tester-role-it-"));
    allowlistPath = path.join(dir, "allowlist");
    logPath = path.join(dir, "runs.log");
  });

  afterAll(async () => {
    await pool.end();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  beforeEach(async () => {
    await truncateProfileTables(pool);
    fs.rmSync(logPath, { force: true });
    // The tester: some matches and a tenure grant, so every role changes something.
    tester = await createYandexPlayer(pool, "it-0425-tester");
    for (const game of ["g1", "g2", "g3"]) {
      await profiles.creditMatchXp(game, tester, XP_PER_MATCH);
    }
    await profiles.recordTenureCheck(tester, 12, {
      daysPlayed: 12,
      gameRecordDays: 5,
    });
    // A second, non-tester player with a tenure row, credits and a name — it must be
    // byte-identical before and after every run.
    other = await createYandexPlayer(pool, "it-0425-other");
    await profiles.creditMatchXp("g1", other, XP_PER_MATCH);
    await profiles.recordTenureCheck(other, 7, {
      daysPlayed: 7,
      gameRecordDays: 7,
    });
    await pool.query("UPDATE players SET display_name = $2 WHERE id = $1", [
      other,
      "Other",
    ]);
  });

  async function run(argv: string[], allowlist: string[] = [tester]) {
    fs.writeFileSync(allowlistPath, `${allowlist.join("\n")}\n`);
    const out: string[] = [];
    const err: string[] = [];
    const code = await runTesterRole({
      argv,
      operator: "it",
      readAllowlistFile: fileAllowlistReader(allowlistPath),
      openLog: () => fileRunLog(logPath),
      repo,
      out: (line) => out.push(line),
      err: (line) => err.push(line),
      now: () => new Date(),
    });
    return { code, out: out.join("\n"), err: err.join("\n") };
  }

  /** Full-precision JSON (timestamptz keeps its microseconds) of one query's rows. */
  async function json(sql: string, id: string): Promise<string> {
    const res = await pool.query(
      `SELECT coalesce(json_agg(t)::text, '[]') AS j FROM (${sql}) t`,
      [id],
    );
    return String(res.rows[0].j);
  }
  const playerRow = (id: string) =>
    json("SELECT * FROM players WHERE id = $1", id);
  const tenureRow = (id: string) =>
    json(
      "SELECT * FROM player_xp_grants WHERE player_id = $1 AND kind = 'tenure'",
      id,
    );
  const snapshotRow = (id: string) =>
    json("SELECT * FROM tester_role_snapshots WHERE player_id = $1", id);

  /** Every row a player owns, across the tables a role must never reach for another player. */
  async function fingerprint(id: string): Promise<string> {
    return [
      await playerRow(id),
      await json("SELECT * FROM player_xp_grants WHERE player_id = $1", id),
      await json(
        "SELECT * FROM player_match_xp_credits WHERE player_id = $1 ORDER BY game_id",
        id,
      ),
      await json(
        "SELECT * FROM player_identities WHERE player_id = $1 ORDER BY platform_user_id",
        id,
      ),
    ].join("\n");
  }

  async function count(table: string): Promise<number> {
    const res = await pool.query(`SELECT count(*)::int AS n FROM ${table}`);
    return Number(res.rows[0].n);
  }

  async function players(id: string) {
    const res = await pool.query(
      `SELECT xp, is_citizen, is_paid_citizen, citizenship_earned_at,
              citizenship_purchased_at, updated_at,
              extract(epoch FROM (now() - coalesce(citizenship_earned_at, now()))) AS earned_age,
              extract(epoch FROM (now() - coalesce(citizenship_purchased_at, now()))) AS purchased_age
       FROM players WHERE id = $1`,
      [id],
    );
    return res.rows[0];
  }

  function logLines(): Array<Record<string, unknown>> {
    return fs
      .readFileSync(logPath, "utf8")
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line) as Record<string, unknown>);
  }

  it.each(TESTER_ROLE_IDS)(
    "%s: exactly its values, only this tester touched, no purchase record",
    async (id) => {
      const role = TESTER_ROLES[id];
      const otherBefore = await fingerprint(other);
      const tenureBefore = await tenureRow(tester);
      const before = await players(tester);

      const r = await run(["apply", tester, id]);
      expect(r.code).toBe(EXIT_OK);

      const after = await players(tester);
      expect(Number(after.xp)).toBe(role.xp);
      expect(after.is_citizen).toBe(role.isCitizen);
      expect(after.is_paid_citizen).toBe(role.isPaidCitizen);
      if (role.stampEarnedAt) {
        expect(after.citizenship_earned_at).not.toBeNull();
        expect(Number(after.earned_age)).toBeLessThan(60);
      } else {
        expect(after.citizenship_earned_at).toBeNull();
      }
      if (role.stampPurchasedAt) {
        expect(after.citizenship_purchased_at).not.toBeNull();
        expect(Number(after.purchased_age)).toBeLessThan(60);
      } else {
        expect(after.citizenship_purchased_at).toBeNull();
      }
      expect(after.updated_at.getTime()).toBeGreaterThanOrEqual(
        before.updated_at.getTime(),
      );
      // Tenure: deleted for brand-new only, otherwise untouched.
      expect(await tenureRow(tester)).toBe(
        role.clearTenureGrant ? "[]" : tenureBefore,
      );
      expect(await fingerprint(other)).toBe(otherBefore);
      expect(await count("processed_purchases")).toBe(0);
      expect(await count("purchase_intents")).toBe(0);
      // The snapshot is held and names the role.
      const snapshot = JSON.parse(await snapshotRow(tester));
      expect(snapshot).toHaveLength(1);
      expect(snapshot[0].applied_role).toBe(id);
      expect(logLines()).toEqual([
        expect.objectContaining({
          subcommand: "apply",
          role: id,
          tester,
          outcome: "applied",
        }),
      ]);
    },
  );

  it("almost-citizen becomes an earned citizen after one normal match credit", async () => {
    await run(["apply", tester, "almost-citizen"]);
    const credit = await profiles.creditMatchXp("g-next", tester, XP_PER_MATCH);
    expect(credit).toEqual({
      status: "credited",
      citizenshipNewlyGranted: true,
    });
    const after = await players(tester);
    expect(Number(after.xp)).toBe(CITIZENSHIP_XP_THRESHOLD);
    expect(after.is_citizen).toBe(true);
    expect(after.citizenship_earned_at).not.toBeNull();
  });

  it("paid-citizen + one credit stays paid, with no earned stamp", async () => {
    await run(["apply", tester, "paid-citizen"]);
    const credit = await profiles.creditMatchXp("g-next", tester, XP_PER_MATCH);
    expect(credit.citizenshipNewlyGranted).toBe(false);
    const after = await players(tester);
    expect(after.is_paid_citizen).toBe(true);
    expect(after.is_citizen).toBe(true);
    expect(after.citizenship_earned_at).toBeNull();
  });

  it("earned-citizen + one credit: xp = threshold + 1, earned_at unchanged", async () => {
    await run(["apply", tester, "earned-citizen"]);
    const earnedAt = (await players(tester)).citizenship_earned_at as Date;
    const credit = await profiles.creditMatchXp("g-next", tester, XP_PER_MATCH);
    expect(credit.citizenshipNewlyGranted).toBe(false);
    const after = await players(tester);
    expect(Number(after.xp)).toBe(CITIZENSHIP_XP_THRESHOLD + XP_PER_MATCH);
    expect(after.citizenship_earned_at.getTime()).toBe(earnedAt.getTime());
  });

  it("brand-new removes only this tester's tenure row, and a following claim is granted again", async () => {
    const otherTenure = await tenureRow(other);
    await run(["apply", tester, "brand-new"]);
    expect(await profiles.hasXpGrant(tester, "tenure")).toBe(false);
    expect(await tenureRow(other)).toBe(otherTenure);
    const claim = await profiles.recordTenureCheck(tester, 9, {
      daysPlayed: 9,
      gameRecordDays: 9,
    });
    expect(claim.status).toBe("granted");
    expect(claim.xpAwarded).toBe(9);
  });

  it("restore round trip: two applies keep the FIRST snapshot, restore is exact, the snapshot is cleared", async () => {
    const originalPlayer = await playerRow(tester);
    const originalTenure = await tenureRow(tester);
    const otherBefore = await fingerprint(other);

    expect((await run(["apply", tester, "brand-new"])).code).toBe(EXIT_OK);
    const firstSnapshot = await json(
      `SELECT xp, is_citizen, is_paid_citizen, citizenship_earned_at,
              citizenship_purchased_at, updated_at, tenure_grant_present,
              tenure_xp_awarded, tenure_evidence, tenure_granted_at, saved_at
       FROM tester_role_snapshots WHERE player_id = $1`,
      tester,
    );
    expect((await run(["apply", tester, "paid-citizen"])).code).toBe(EXIT_OK);

    // The second apply did not overwrite the snapshot …
    expect(
      await json(
        `SELECT xp, is_citizen, is_paid_citizen, citizenship_earned_at,
                citizenship_purchased_at, updated_at, tenure_grant_present,
                tenure_xp_awarded, tenure_evidence, tenure_granted_at, saved_at
         FROM tester_role_snapshots WHERE player_id = $1`,
        tester,
      ),
    ).toBe(firstSnapshot);
    // … and the snapshot holds the ORIGINAL values, compared in SQL at full precision.
    const matches = await pool.query(
      `SELECT (s.xp, s.is_citizen, s.is_paid_citizen, s.citizenship_earned_at,
               s.citizenship_purchased_at, s.updated_at)
              IS NOT DISTINCT FROM
              (o.xp, o.is_citizen, o.is_paid_citizen, o.citizenship_earned_at,
               o.citizenship_purchased_at, o.updated_at) AS same
       FROM tester_role_snapshots s,
            json_populate_record(null::players, $2::json) o
       WHERE s.player_id = $1`,
      [tester, JSON.stringify(JSON.parse(originalPlayer)[0])],
    );
    expect(matches.rows[0].same).toBe(true);
    expect(JSON.parse(await snapshotRow(tester))[0].applied_role).toBe(
      "paid-citizen",
    );

    expect((await run(["restore", tester])).code).toBe(EXIT_OK);
    expect(await playerRow(tester)).toBe(originalPlayer);
    expect(await tenureRow(tester)).toBe(originalTenure);
    expect(await snapshotRow(tester)).toBe("[]");
    expect(await fingerprint(other)).toBe(otherBefore);
    expect(logLines().map((line) => line.outcome)).toEqual([
      "applied",
      "applied",
      "restored",
    ]);
  });

  it("restore after a tenure claim made while brand-new: a tester who had no tenure row has none again", async () => {
    await pool.query("DELETE FROM player_xp_grants WHERE player_id = $1", [
      tester,
    ]);
    const originalPlayer = await playerRow(tester);
    await run(["apply", tester, "brand-new"]);
    await profiles.recordTenureCheck(tester, 20, {
      daysPlayed: 20,
      gameRecordDays: 20,
    });
    expect(await profiles.hasXpGrant(tester, "tenure")).toBe(true);
    expect((await run(["restore", tester])).code).toBe(EXIT_OK);
    expect(await tenureRow(tester)).toBe("[]");
    expect(await playerRow(tester)).toBe(originalPlayer);
  });

  it("restore with no snapshot is refused and writes nothing", async () => {
    const before = await fingerprint(tester);
    const r = await run(["restore", tester]);
    expect(r.code).toBe(EXIT_REFUSED);
    expect(await fingerprint(tester)).toBe(before);
    expect(logLines()).toEqual([
      expect.objectContaining({ outcome: "refused", reason: "no_snapshot" }),
    ]);
  });

  it.each([
    [
      "not allowlisted",
      ["apply", "TESTER", "earned-citizen"],
      "OTHER_ONLY",
      EXIT_REFUSED,
      "not_allowlisted",
    ],
    [
      "unknown role",
      ["apply", "TESTER", "admin"],
      "TESTER",
      EXIT_BAD_INPUT,
      "unknown_role",
    ],
    [
      "no such player",
      ["apply", NO_SUCH_PLAYER, "earned-citizen"],
      "BOTH",
      EXIT_REFUSED,
      "no_such_player",
    ],
    [
      "show, not allowlisted",
      ["show", "TESTER"],
      "OTHER_ONLY",
      EXIT_REFUSED,
      "not_allowlisted",
    ],
  ] as const)(
    "refusal over the real DB (%s): snapshot table empty, rows identical",
    async (_label, argvTemplate, list, code, reason) => {
      const argv = argvTemplate.map((value) =>
        value === "TESTER" ? tester : value,
      );
      const allowlist =
        list === "OTHER_ONLY"
          ? [other]
          : list === "BOTH"
            ? [tester, NO_SUCH_PLAYER]
            : [tester];
      const testerBefore = await fingerprint(tester);
      const otherBefore = await fingerprint(other);
      const r = await run(argv, allowlist);
      expect(r.code).toBe(code);
      expect(await count("tester_role_snapshots")).toBe(0);
      expect(await fingerprint(tester)).toBe(testerBefore);
      expect(await fingerprint(other)).toBe(otherBefore);
      expect(logLines()).toEqual([
        expect.objectContaining({ outcome: "refused", reason }),
      ]);
    },
  );

  it("show reads the real state and prints no id", async () => {
    await run(["apply", tester, "earned-citizen"]);
    const r = await run(["show", tester]);
    expect(r.code).toBe(EXIT_OK);
    expect(r.out).toContain("role applied: earned-citizen");
    expect(r.out).toContain(`xp: ${CITIZENSHIP_XP_THRESHOLD}`);
    expect(r.out).toContain("is_citizen: true");
    expect(r.out).toContain("tenure grant: present, xp_awarded=12");
    expect(r.out).toContain("snapshot held: yes");
    expect(r.out).not.toContain(tester);
    expect(r.out).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-/i);
  });

  it("deleting the tester cascades the snapshot away; restore then refuses", async () => {
    await run(["apply", tester, "earned-citizen"]);
    await pool.query("DELETE FROM players WHERE id = $1", [tester]);
    expect(await count("tester_role_snapshots")).toBe(0);
    const r = await run(["restore", tester]);
    expect(r.code).toBe(EXIT_REFUSED);
  });

  it("a concurrent apply and match credit both land, serialized on the player row", async () => {
    await run(["apply", tester, "almost-citizen"]);
    const [credit, applied] = await Promise.all([
      profiles.creditMatchXp("g-race", tester, XP_PER_MATCH),
      repo.apply(tester, TESTER_ROLES["almost-citizen"]),
    ]);
    expect(credit.status).toBe("credited");
    expect(applied.status).toBe("applied");
    const after = await players(tester);
    // Either order is valid; both are consistent with the CHECK constraints.
    expect([
      CITIZENSHIP_XP_THRESHOLD - XP_PER_MATCH,
      CITIZENSHIP_XP_THRESHOLD,
    ]).toContain(Number(after.xp));
  });
});
