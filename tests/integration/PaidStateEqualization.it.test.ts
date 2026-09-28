// Integration test for task 0250, slice S1 — the equalized UNVERIFIED view. Real
// migrations, real repositories, real Postgres, driven through createApp()
// exactly as Server.ts wires it, with signed (vfy:false) session tokens and
// synthetic ids only. Every player is seeded through the production code paths
// (match credits, the paid grant, the tenure check) — never by hand-written SQL.
//
// Proves, over HTTP: a paid citizen and an earned citizen cannot be told apart on
// any client-visible route (L1–L4), the badge still works, and the STORED rows
// are untouched (the projection happens at the route). Timing is NOT measured:
// the projection is pure and adds no DB work that depends on paid state.
//
// Gated by RUN_DB_TESTS; supertest-based, so the known flake family applies
// (CLAUDE.md).

import { Pool } from "pg";
import request from "supertest";
import { InboxListResponseSchema } from "../../src/core/profile/InboxContract";
import { PublicPlayerProfileSchema } from "../../src/core/profile/PlayerProfile";
import { InboxRepository } from "../../src/profile-server/InboxRepository";
import { PaymentsRepository } from "../../src/profile-server/PaymentsRepository";
import { PlayerProfileRepository } from "../../src/profile-server/PlayerProfileRepository";
import { createApp } from "../../src/profile-server/Routes";
import {
  TEST_SESSION_CONFIG,
  bearerFor,
} from "../profile-server/support/sessionToken";
import {
  createYandexPlayer,
  realProfileRepo,
  truncateProfileTables,
} from "./support/db";

const RUN = process.env.RUN_DB_TESTS ? describe : describe.skip;

/** A fixture class — (a)–(e) of the plan. */
type PlayerClass =
  | "paid_not_earned"
  | "earned"
  | "paid_then_earned"
  | "earned_then_paid"
  | "non_citizen";

interface Seeded {
  name: string;
  cls: PlayerClass;
  platformUserId: string;
  playerId: string;
  /** Stored template keys expected, oldest first. */
  storedKeys: string[];
}

const PAID_CLASSES: PlayerClass[] = [
  "paid_not_earned",
  "paid_then_earned",
  "earned_then_paid",
];
const CITIZEN_CLASSES: PlayerClass[] = [...PAID_CLASSES, "earned"];

const leakL1 = (p: { is_citizen: boolean; citizenship_earned_at: unknown }) =>
  p.is_citizen && p.citizenship_earned_at === null;
const leakL2 = (p: { is_citizen: boolean; xp: number }) =>
  p.is_citizen && p.xp < 100;
// Review R1/R3, owner ruling Q-A: a citizen's xp must never be anything but
// exactly 100 to an unverified reader, or its MOVEMENT tells paid from earned.
const leakMoved = (p: { is_citizen: boolean; xp: number }) =>
  p.is_citizen && p.xp !== 100;
const leakL4 = (body: Record<string, unknown>) =>
  (body.messages as { templateKey: string | null }[]).some(
    (m) =>
      m.templateKey === "citizenship_paid" ||
      m.templateKey === "citizenship_earned",
  );

/** Sorted key set of an object — the "same keys" comparison. */
const keySet = (value: object) => Object.keys(value).sort();

RUN("paid-state equalization over real Postgres (task 0250 S1)", () => {
  let pool: Pool;
  let inbox: InboxRepository;
  let profiles: PlayerProfileRepository;
  let payments: PaymentsRepository;
  let app: ReturnType<typeof createApp>;
  let purchaseSeq = 0;
  let gameSeq = 0;

  beforeAll(() => {
    pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
    inbox = new InboxRepository(pool);
    profiles = new PlayerProfileRepository(pool, inbox);
    payments = new PaymentsRepository(pool, inbox);
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    await truncateProfileTables(pool);
    // A fresh app per test: the profile-read limiter's window starts empty.
    app = createApp(
      realProfileRepo(pool, inbox),
      { paymentsRepo: payments, yandexPaymentsSecret: "it-0250-secret" },
      inbox,
      undefined,
      TEST_SESSION_CONFIG,
      { tenureGrant: profiles },
    );
  });

  // ── Seeding — production code paths only ──────────────────────────────────

  async function credit(playerId: string, xp: number): Promise<void> {
    gameSeq += 1;
    await profiles.creditMatchXp(`g0250-${gameSeq}`, playerId, xp);
  }

  async function pay(playerId: string): Promise<void> {
    purchaseSeq += 1;
    const intentId = await payments.createIntent(playerId, "citizenship");
    await expect(
      payments.grantPaidPurchase({
        purchaseToken: `tok-0250-${purchaseSeq}`,
        productId: "citizenship",
        playerId,
        intentId,
        rawPayload: '{"test":true}',
      }),
    ).resolves.toBe("granted");
  }

  /** The inbox sends are fire-and-forget after commit — poll, bounded. */
  async function waitForStoredKeys(
    playerId: string,
    expected: number,
  ): Promise<string[]> {
    const deadline = Date.now() + 3_000;
    for (;;) {
      const res = await pool.query(
        `SELECT template_key FROM player_messages
         WHERE player_id = $1 ORDER BY id`,
        [playerId],
      );
      if (res.rows.length >= expected) {
        return res.rows.map((row) => String(row.template_key));
      }
      if (Date.now() > deadline) {
        throw new Error(
          `expected ${expected} inbox message(s), saw ${res.rows.length}`,
        );
      }
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  }

  /**
   * `sent` on a step = the stored message count once that step's post-commit
   * send has landed. Waiting for it before the next step keeps the stored order
   * the real-life order.
   */
  type Step = { credit: number; sent: number } | { pay: true; sent: number };

  async function seed(
    name: string,
    cls: PlayerClass,
    steps: Step[],
    storedKeys: string[],
  ): Promise<Seeded> {
    const platformUserId = `zz0250-${name}`;
    const playerId = await createYandexPlayer(pool, platformUserId);
    for (const step of steps) {
      if ("credit" in step) {
        await credit(playerId, step.credit);
      } else {
        await pay(playerId);
      }
      await waitForStoredKeys(playerId, step.sent);
    }
    expect(await waitForStoredKeys(playerId, storedKeys.length)).toEqual(
      storedKeys,
    );
    return { name, cls, platformUserId, playerId, storedKeys };
  }

  const seedPaidNotEarned = (name: string, xp: number) =>
    seed(
      name,
      "paid_not_earned",
      xp > 0
        ? [
            { credit: xp, sent: 0 },
            { pay: true, sent: 1 },
          ]
        : [{ pay: true, sent: 1 }],
      ["citizenship_paid"],
    );
  const seedEarned = (name: string, xp: number) =>
    seed(name, "earned", [{ credit: xp, sent: 1 }], ["citizenship_earned"]);
  // A paid citizen crossing 100 later gets earned_at stamped and NO earned
  // message (PlayerProfileRepository — only a false→true flip sends).
  const seedPaidThenEarned = (name: string, before: number, after: number) =>
    seed(
      name,
      "paid_then_earned",
      [
        { credit: before, sent: 0 },
        { pay: true, sent: 1 },
        { credit: after, sent: 1 },
      ],
      ["citizenship_paid"],
    );
  const seedEarnedThenPaid = (name: string, xp: number) =>
    seed(
      name,
      "earned_then_paid",
      [
        { credit: xp, sent: 1 },
        { pay: true, sent: 2 },
      ],
      ["citizenship_earned", "citizenship_paid"],
    );
  const seedNonCitizen = (name: string, xp: number) =>
    seed(name, "non_citizen", xp > 0 ? [{ credit: xp, sent: 0 }] : [], []);

  // ── Route calls ───────────────────────────────────────────────────────────

  const readProfile = (s: Seeded) =>
    request(app).get("/v1/profile").set("Authorization", bearerFor(s.playerId));
  const readMessages = (s: Seeded) =>
    request(app)
      .get("/v1/messages")
      .set("Authorization", bearerFor(s.playerId));
  const login = (s: Seeded) =>
    request(app)
      .post("/v1/login")
      .send({ platform: "yandex_games", platformUserId: s.platformUserId });
  // A 2-day claim is below the minimum: the check is recorded with 0 XP, so the
  // stored xp (and so the player's class) does not move.
  const claimTenure = (s: Seeded, daysPlayed = 2) =>
    request(app)
      .post("/v1/profile/tenure-grant")
      .set("Authorization", bearerFor(s.playerId))
      .send({ evidence: { daysPlayed, gameRecordDays: 0 } });

  async function storedRow(playerId: string) {
    const res = await pool.query(
      `SELECT xp, is_citizen, is_paid_citizen, citizenship_earned_at
       FROM players WHERE id = $1`,
      [playerId],
    );
    return res.rows[0];
  }

  // ── Step 2: attempted leaks, (a) paid-not-earned vs (b) earned at 100 ──────

  test("every route: a paid-not-earned citizen and an earned citizen at 100 give identical answers (L1–L4)", async () => {
    const paid = await seedPaidNotEarned("a-30", 30);
    const earned = await seedEarned("b-100", 100);

    // L1/L2 — GET /v1/profile.
    const pp = await readProfile(paid);
    const ep = await readProfile(earned);
    expect([pp.status, ep.status]).toEqual([200, 200]);
    expect(leakL1(pp.body)).toBe(leakL1(ep.body));
    expect(leakL2(pp.body)).toBe(leakL2(ep.body));
    expect(leakL2(pp.body)).toBe(false);
    const withoutCreation = (body: Record<string, unknown>) => ({
      ...body,
      created_at: "X",
      updated_at: body.updated_at === body.created_at ? "X" : body.updated_at,
    });
    expect(withoutCreation(pp.body)).toEqual(withoutCreation(ep.body));
    expect(pp.body.xp).toBe(100);
    // Old and new clients parse it: same keys, same types.
    expect(PublicPlayerProfileSchema.safeParse(pp.body).success).toBe(true);

    // L1/L2 — POST /v1/login's profile.
    const pl = await login(paid);
    const el = await login(earned);
    expect([pl.status, el.status]).toEqual([200, 200]);
    expect(leakL1(pl.body.profile)).toBe(leakL1(el.body.profile));
    expect(leakL2(pl.body.profile)).toBe(leakL2(el.body.profile));
    expect(withoutCreation(pl.body.profile)).toEqual(
      withoutCreation(el.body.profile),
    );
    expect(pl.body.grantChecks).toEqual(el.body.grantChecks);

    // L3 — the tenure grant, first claim then duplicate.
    for (const expectedStatus of ["below_minimum", "duplicate"]) {
      const pt = await claimTenure(paid);
      const et = await claimTenure(earned);
      expect([pt.status, et.status]).toEqual([200, 200]);
      expect(pt.body).toEqual({
        status: expectedStatus,
        xpAwarded: 0,
        xp: 100,
      });
      expect(pt.body).toEqual(et.body);
    }

    // L4 — GET /v1/messages.
    const pm = await readMessages(paid);
    const em = await readMessages(earned);
    expect([pm.status, em.status]).toEqual([200, 200]);
    expect(leakL4(pm.body)).toBe(false);
    expect(leakL4(em.body)).toBe(false);
    const strip = (body: { messages: Record<string, unknown>[] }) =>
      body.messages.map((m) => ({ ...m, id: 0, sentAt: "X" }));
    expect(strip(pm.body)).toEqual(strip(em.body));
    expect(pm.body.messages[0].templateKey).toBe("citizenship_granted");
    expect(InboxListResponseSchema.safeParse(pm.body).success).toBe(true);

    // The STORED rows are untouched — the projection is at the route.
    expect(await waitForStoredKeys(paid.playerId, 1)).toEqual([
      "citizenship_paid",
    ]);
    expect(await waitForStoredKeys(earned.playerId, 1)).toEqual([
      "citizenship_earned",
    ]);
    const stored = await storedRow(paid.playerId);
    expect(Number(stored.xp)).toBe(30);
    expect(stored.is_paid_citizen).toBe(true);
    expect(stored.citizenship_earned_at).toBeNull();
  });

  test("a granted tenure claim for a paid-not-earned citizen reports 100, while the DB holds the true total", async () => {
    const paid = await seedPaidNotEarned("a-grant", 30);
    const res = await claimTenure(paid, 10);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "granted", xpAwarded: 10, xp: 100 });
    const stored = await storedRow(paid.playerId);
    expect(Number(stored.xp)).toBe(40);
    expect(stored.citizenship_earned_at).toBeNull();
  });

  test("earned-then-paid (two stored messages) shows ONE neutral message, like earned-only", async () => {
    const both = await seedEarnedThenPaid("d-100", 100);
    const earned = await seedEarned("b-100b", 100);
    const bm = await readMessages(both);
    const em = await readMessages(earned);
    expect(bm.body.messages).toHaveLength(1);
    expect(em.body.messages).toHaveLength(1);
    expect(bm.body.messages[0].templateKey).toBe("citizenship_granted");
    // The kept one is the OLDEST — the earned message, not the later purchase.
    const oldest = await pool.query(
      `SELECT id FROM player_messages WHERE player_id = $1 ORDER BY id LIMIT 1`,
      [both.playerId],
    );
    expect(bm.body.messages[0].id).toBe(Number(oldest.rows[0].id));
    // Stored: still both, with their true keys.
    expect(await waitForStoredKeys(both.playerId, 2)).toEqual([
      "citizenship_earned",
      "citizenship_paid",
    ]);
  });

  // Review R1 (owner ruling Q-A): the attacker's own probe — read, fire a
  // GRANTED claim with chosen evidence, read again — for a paid-not-earned
  // citizen and an earned citizen who was ALREADY a citizen. Before Q-A the
  // earned one read 100 → 110 → 110 and the paid one 100 → 100 → 100.
  test("attempted leak R1: a GRANTED tenure claim, paid (30) vs earned (100, already a citizen) — identical before, during and after, and on the duplicate", async () => {
    const paid = await seedPaidNotEarned("r1-paid", 30);
    const earned = await seedEarned("r1-earned", 100);
    const probe = async (s: Seeded) => {
      const before = await readProfile(s);
      const claim = await claimTenure(s, 10);
      const after = await readProfile(s);
      const replay = await claimTenure(s, 10);
      return { before, claim, after, replay };
    };
    const p = await probe(paid);
    const e = await probe(earned);

    expect(p.claim.status).toBe(200);
    expect(p.claim.body).toEqual({ status: "granted", xpAwarded: 10, xp: 100 });
    expect(p.claim.body).toEqual(e.claim.body);
    expect(p.replay.body).toEqual({
      status: "duplicate",
      xpAwarded: 10,
      xp: 100,
    });
    expect(p.replay.body).toEqual(e.replay.body);
    for (const probeResult of [p, e]) {
      expect(probeResult.before.body.xp).toBe(100);
      expect(probeResult.after.body.xp).toBe(100);
      expect(leakMoved(probeResult.after.body)).toBe(false);
    }
    const withoutCreation = (body: Record<string, unknown>) => ({
      ...body,
      created_at: "X",
      updated_at: "X",
    });
    expect(withoutCreation(p.after.body)).toEqual(
      withoutCreation(e.after.body),
    );

    // The claim really happened: both stored totals moved by 10.
    expect(Number((await storedRow(paid.playerId)).xp)).toBe(40);
    expect(Number((await storedRow(earned.playerId)).xp)).toBe(110);
  });

  // Review R3 (owner ruling Q-A): a match credit the observer can cause (the
  // accepted WebSocket-join risk) moves an earned citizen's stored xp — the
  // unverified read must not show it.
  test("attempted leak R3: a match credit moves the stored xp of both, and neither read moves", async () => {
    const paid = await seedPaidNotEarned("r3-paid", 30);
    const earned = await seedEarned("r3-earned", 100);
    for (const s of [paid, earned]) {
      await credit(s.playerId, 10);
    }
    const pp = await readProfile(paid);
    const ep = await readProfile(earned);
    expect(pp.body.xp).toBe(100);
    expect(ep.body.xp).toBe(100);
    expect(leakMoved(pp.body)).toBe(false);
    expect(leakMoved(ep.body)).toBe(false);
    expect(Number((await storedRow(paid.playerId)).xp)).toBe(40);
    expect(Number((await storedRow(earned.playerId)).xp)).toBe(110);
  });

  test("a non-citizen who crosses into citizenship THROUGH the claim is shown 100, with the true xpAwarded", async () => {
    const crossing = await seedNonCitizen("cross-95", 95);
    const res = await claimTenure(crossing, 10);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "granted", xpAwarded: 10, xp: 100 });
    const profile = await readProfile(crossing);
    expect(profile.body.is_citizen).toBe(true);
    expect(profile.body.xp).toBe(100);
    expect(Number((await storedRow(crossing.playerId)).xp)).toBe(105);
  });

  // Review R2 (owner ruling Q-B): PATCH /v1/messages/read must never count or
  // confirm the citizenship message GET /v1/messages hides.
  test("attempted leak R2: mark-read answers alike for earned-only and earned-then-paid, in both forms", async () => {
    const both = await seedEarnedThenPaid("r2-both", 100);
    const earned = await seedEarned("r2-earned", 100);
    const patch = (s: Seeded, body: object) =>
      request(app)
        .patch("/v1/messages/read")
        .set("Authorization", bearerFor(s.playerId))
        .send(body);
    const storedIds = async (playerId: string) =>
      (
        await pool.query(
          `SELECT id, read_at FROM player_messages
           WHERE player_id = $1 ORDER BY id`,
          [playerId],
        )
      ).rows.map((row) => ({ id: Number(row.id), read: row.read_at !== null }));

    // The client's flow: read the one visible message by id.
    const visibleBoth = (await readMessages(both)).body.messages[0].id;
    const visibleEarned = (await readMessages(earned)).body.messages[0].id;
    expect((await patch(both, { ids: [visibleBoth] })).body).toEqual({
      updated: 1,
    });
    expect((await patch(earned, { ids: [visibleEarned] })).body).toEqual({
      updated: 1,
    });

    // By-id: the hidden (newer, unread) purchase message answers like an id
    // the earned-only player does not have — and it is NOT marked.
    const hiddenId = (await storedIds(both.playerId))[1].id;
    const byIdBoth = await patch(both, { ids: [hiddenId] });
    const byIdEarned = await patch(earned, { ids: [visibleEarned + 1] });
    expect(byIdBoth.status).toBe(200);
    expect(byIdBoth.body).toEqual({ updated: 0 });
    expect(byIdBoth.body).toEqual(byIdEarned.body);
    expect((await storedIds(both.playerId))[1].read).toBe(false);

    // Mark-all: 0 for both (before the fix: 1 for earned-then-paid) — and the
    // hidden row is still marked read (plan § 6).
    const allBoth = await patch(both, {});
    const allEarned = await patch(earned, {});
    expect(allBoth.body).toEqual({ updated: 0 });
    expect(allBoth.body).toEqual(allEarned.body);
    expect((await storedIds(both.playerId)).every((row) => row.read)).toBe(
      true,
    );

    // GET agrees with the count: one read message each.
    const listBoth = await readMessages(both);
    const listEarned = await readMessages(earned);
    expect(listBoth.body.messages).toHaveLength(1);
    expect(listBoth.body.messages[0].readAt).not.toBeNull();
    expect(listEarned.body.messages[0].readAt).not.toBeNull();
  });

  // ── Step 3: enumeration across classes, unverified tokens ─────────────────

  test("enumeration: ~12 players across (a)–(e) — paid classes match the earned class on every route", async () => {
    const players = [
      await seedPaidNotEarned("a0", 0),
      await seedPaidNotEarned("a30", 30),
      await seedPaidNotEarned("a50", 50),
      await seedPaidNotEarned("a99", 99),
      await seedEarned("b100", 100),
      await seedEarned("b100x", 100),
      await seedPaidThenEarned("c30-70", 30, 70),
      await seedPaidThenEarned("c10-95", 10, 95),
      await seedEarnedThenPaid("d100", 100),
      await seedEarnedThenPaid("d100x", 100),
      await seedNonCitizen("e30", 30),
      await seedNonCitizen("e0", 0),
    ];

    interface Observed {
      cls: PlayerClass;
      profile: { status: number; body: Record<string, unknown> };
      login: { status: number; body: Record<string, unknown> };
      tenure: { status: number; body: Record<string, unknown> };
      messages: { status: number; body: Record<string, unknown> };
    }
    const observed: Observed[] = [];
    for (const player of players) {
      const profile = await readProfile(player);
      const loginRes = await login(player);
      const tenure = await claimTenure(player);
      const messages = await readMessages(player);
      observed.push({
        cls: player.cls,
        profile: { status: profile.status, body: profile.body },
        login: { status: loginRes.status, body: loginRes.body.profile },
        tenure: { status: tenure.status, body: tenure.body },
        messages: { status: messages.status, body: messages.body },
      });
    }

    const earnedRef = observed.find((o) => o.cls === "earned")!;
    // Byte lengths: ISO timestamps are fixed width; ids are normalised so a
    // row-id digit count is not mistaken for a paid-state signal.
    const messagesLength = (body: Record<string, unknown>) =>
      JSON.stringify(
        (body.messages as Record<string, unknown>[]).map((m) => ({
          ...m,
          id: 0,
        })),
      ).length;

    for (const o of observed.filter((o) => CITIZEN_CLASSES.includes(o.cls))) {
      for (const route of ["profile", "login"] as const) {
        const body = o[route].body as {
          is_citizen: boolean;
          xp: number;
          citizenship_earned_at: unknown;
          updated_at: unknown;
          created_at: unknown;
        };
        const ref = earnedRef[route].body;
        expect(o[route].status).toBe(earnedRef[route].status);
        expect(keySet(body)).toEqual(keySet(ref));
        // Badge (step 4).
        expect(body.is_citizen).toBe(true);
        // Every paid-sensitive value.
        expect(leakL1(body)).toBe(leakL1(ref as typeof body));
        expect(leakL2(body)).toBe(leakL2(ref as typeof body));
        expect(body.citizenship_earned_at).toBeNull();
        expect(body.updated_at).toBe(body.created_at);
        // Owner ruling Q-A: exactly 100 for every citizen, whatever is stored.
        expect(body.xp).toBe(100);
        expect(leakMoved(body)).toBe(false);
        expect(JSON.stringify(body).length).toBe(JSON.stringify(ref).length);
      }
      expect(o.tenure.status).toBe(200);
      expect(keySet(o.tenure.body)).toEqual(keySet(earnedRef.tenure.body));
      expect(o.tenure.body.xp).toBe(100);
      expect(o.tenure.body).toEqual(earnedRef.tenure.body);
      expect(o.messages.status).toBe(200);
      expect(leakL4(o.messages.body)).toBe(false);
      expect(o.messages.body.messages as unknown[]).toHaveLength(1);
      expect(messagesLength(o.messages.body)).toBe(
        messagesLength(earnedRef.messages.body),
      );
    }

    // Controls: non-citizens keep their true xp and stay gated from the inbox.
    for (const o of observed.filter((o) => o.cls === "non_citizen")) {
      expect(o.profile.body.is_citizen).toBe(false);
      expect(o.profile.body.xp as number).toBeLessThan(100);
      expect(o.messages.status).toBe(403);
    }
    expect(
      observed
        .filter((o) => o.cls === "non_citizen")
        .map((o) => o.profile.body.xp),
    ).toEqual([30, 0]);

    // Stored rows untouched: every paid player still has is_paid_citizen and
    // its true keys.
    for (const player of players.filter((p) => PAID_CLASSES.includes(p.cls))) {
      expect((await storedRow(player.playerId)).is_paid_citizen).toBe(true);
      expect(
        await waitForStoredKeys(player.playerId, player.storedKeys.length),
      ).toEqual(player.storedKeys);
    }
  });
});
