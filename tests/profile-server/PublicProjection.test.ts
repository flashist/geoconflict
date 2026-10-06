// Unit tests for the equalized UNVERIFIED view (task 0250, slice S1): a paid
// citizen and an earned citizen must look the same to anyone who can mint an
// unverified session for an id they merely assert. Pure functions — no app.

import type { InboxMessage } from "../../src/core/profile/InboxContract";
import {
  PublicPlayerProfileSchema,
  type PlayerProfile,
} from "../../src/core/profile/PlayerProfile";
import {
  equalizedXp,
  hiddenInboxMessageIds,
  inboxMessagesForCaller,
  profileForCaller,
  toOwnerProfile,
  toPublicInboxMessages,
  toPublicProfile,
  xpForCaller,
} from "../../src/profile-server/PublicProjection";

const CREATED_AT = "2026-06-01T00:00:00.000Z";

function profile(overrides: Partial<PlayerProfile> = {}): PlayerProfile {
  return {
    schema_version: 1,
    xp: 0,
    is_citizen: false,
    is_paid_citizen: false,
    citizenship_earned_at: null,
    citizenship_purchased_at: null,
    display_name: "Commander",
    created_at: CREATED_AT,
    updated_at: "2026-06-24T12:00:00.000Z",
    ...overrides,
  };
}

/** Paid-not-earned: a paid grant never stamps earned_at below 100. */
function paidNotEarned(xp: number): PlayerProfile {
  return profile({
    xp,
    is_citizen: true,
    is_paid_citizen: true,
    citizenship_purchased_at: "2026-06-24T11:00:00.000Z",
    updated_at: "2026-06-24T11:00:00.000Z",
  });
}

const EARNED_AT_100 = profile({
  xp: 100,
  is_citizen: true,
  citizenship_earned_at: "2026-06-20T10:00:00.000Z",
  updated_at: "2026-06-20T10:00:00.000Z",
});

const PAID_THEN_EARNED = profile({
  xp: 140,
  is_citizen: true,
  is_paid_citizen: true,
  citizenship_purchased_at: "2026-06-10T00:00:00.000Z",
  citizenship_earned_at: "2026-06-22T00:00:00.000Z",
  updated_at: "2026-06-22T00:00:00.000Z",
});

const leakL1 = (p: { is_citizen: boolean; citizenship_earned_at: unknown }) =>
  p.is_citizen && p.citizenship_earned_at === null;
const leakL2 = (p: { is_citizen: boolean; xp: number }) =>
  p.is_citizen && p.xp < 100;

describe("equalizedXp", () => {
  test.each([
    [0, 100],
    [30, 100],
    [99, 100],
    [100, 100],
    [101, 100],
    [1200, 100],
  ])("a citizen at %i is shown exactly %i (owner ruling Q-A)", (xp, shown) => {
    expect(equalizedXp(xp, true)).toBe(shown);
  });

  test.each([0, 99])("a non-citizen at %i is unchanged", (xp) => {
    expect(equalizedXp(xp, false)).toBe(xp);
  });
});

describe("toPublicProfile", () => {
  test("earned_at is always null, updated_at is created_at, no paid keys", () => {
    for (const source of [
      paidNotEarned(30),
      EARNED_AT_100,
      PAID_THEN_EARNED,
      profile({ xp: 42 }),
    ]) {
      const projected = toPublicProfile(source);
      expect(projected.citizenship_earned_at).toBeNull();
      expect(projected.updated_at).toBe(source.created_at);
      expect(projected).not.toHaveProperty("is_paid_citizen");
      expect(projected).not.toHaveProperty("citizenship_purchased_at");
      // Same keys and types as before — still the shared contract.
      expect(PublicPlayerProfileSchema.safeParse(projected).success).toBe(true);
    }
  });

  test("is_citizen, display_name, created_at and schema_version pass through", () => {
    expect(toPublicProfile(paidNotEarned(30))).toMatchObject({
      is_citizen: true,
      display_name: "Commander",
      created_at: CREATED_AT,
      schema_version: 1,
    });
    expect(toPublicProfile(profile({ xp: 42 })).xp).toBe(42);
  });

  test("name_change is merged in when present and omitted when absent", () => {
    const nameChange = {
      status: "pending" as const,
      requested_name: "NewName",
      decided_at: null,
    };
    expect(toPublicProfile(EARNED_AT_100, nameChange).name_change).toEqual(
      nameChange,
    );
    expect(toPublicProfile(EARNED_AT_100, null)).not.toHaveProperty(
      "name_change",
    );
    expect(toPublicProfile(EARNED_AT_100)).not.toHaveProperty("name_change");
  });

  describe("attempted leak (L1/L2)", () => {
    const paidFixtures = {
      "paid-not-earned at 0": paidNotEarned(0),
      "paid-not-earned at 30": paidNotEarned(30),
      "paid-not-earned at 99": paidNotEarned(99),
      "paid-then-earned": PAID_THEN_EARNED,
    };

    test.each(Object.entries(paidFixtures))(
      "%s answers every predicate like an earned citizen",
      (_name, paid) => {
        const p = toPublicProfile(paid);
        const e = toPublicProfile(EARNED_AT_100);
        // The leak is closed when the predicate gives the SAME answer for both —
        // L1 is true for every citizen now (earned_at is always null), which
        // carries no signal; L2 is false for every citizen (xp is exactly 100).
        expect(leakL1(p)).toBe(leakL1(e));
        expect(leakL2(p)).toBe(leakL2(e));
        expect(leakL2(p)).toBe(false);
      },
    );

    test("an earned citizen whose xp has moved past 100 projects exactly like one at 100 (review R1/R3)", () => {
      for (const xp of [101, 110, 1200]) {
        expect(toPublicProfile({ ...EARNED_AT_100, xp })).toEqual(
          toPublicProfile(EARNED_AT_100),
        );
      }
      expect(toPublicProfile(PAID_THEN_EARNED).xp).toBe(100);
    });

    test("a paid-not-earned citizen and an earned citizen at 100 (same created_at) project deep-equal", () => {
      for (const xp of [0, 30, 99]) {
        expect(toPublicProfile(paidNotEarned(xp))).toEqual(
          toPublicProfile(EARNED_AT_100),
        );
      }
    });
  });
});

function message(
  id: number,
  templateKey: string | null,
  overrides: Partial<InboxMessage> = {},
): InboxMessage {
  return {
    id,
    templateKey,
    templateParams: {},
    title: templateKey === null ? "Hello" : null,
    body: templateKey === null ? "A literal note" : null,
    sentAt: `2026-08-${String(10 + id).padStart(2, "0")}T10:00:00.000Z`,
    readAt: null,
    ...overrides,
  };
}

describe("toPublicInboxMessages", () => {
  test("citizenship_paid → citizenship_granted", () => {
    expect(toPublicInboxMessages([message(1, "citizenship_paid")])).toEqual([
      message(1, "citizenship_granted"),
    ]);
  });

  test("citizenship_earned → citizenship_granted", () => {
    expect(toPublicInboxMessages([message(1, "citizenship_earned")])).toEqual([
      message(1, "citizenship_granted"),
    ]);
  });

  test("a paid list and an earned list are identical", () => {
    const readAt = "2026-08-12T00:00:00.000Z";
    expect(
      toPublicInboxMessages([message(1, "citizenship_paid", { readAt })]),
    ).toEqual(
      toPublicInboxMessages([message(1, "citizenship_earned", { readAt })]),
    );
  });

  test("name-change and literal messages pass through untouched; order, ids and readAt kept", () => {
    const list = [
      message(4, "name_change_approved", { templateParams: { name: "A" } }),
      message(3, null, { readAt: "2026-08-14T00:00:00.000Z" }),
      message(2, "citizenship_paid", { readAt: "2026-08-13T00:00:00.000Z" }),
      message(1, "name_change_rejected", {
        templateParams: { name: "B", reason: "r" },
      }),
    ];
    expect(toPublicInboxMessages(list)).toEqual([
      list[0],
      list[1],
      message(2, "citizenship_granted", {
        readAt: "2026-08-13T00:00:00.000Z",
      }),
      list[3],
    ]);
  });

  test("two citizenship messages collapse to the OLDEST one (the list is newest first)", () => {
    const list = [
      message(9, "citizenship_paid"),
      message(5, "name_change_approved", { templateParams: { name: "A" } }),
      message(2, "citizenship_earned", { readAt: "2026-08-20T00:00:00.000Z" }),
    ];
    expect(toPublicInboxMessages(list)).toEqual([
      list[1],
      message(2, "citizenship_granted", {
        readAt: "2026-08-20T00:00:00.000Z",
      }),
    ]);
  });

  test("the kept message's templateParams is reset to {}", () => {
    expect(
      toPublicInboxMessages([
        message(1, "citizenship_paid", { templateParams: { product: "x" } }),
      ])[0].templateParams,
    ).toEqual({});
  });

  test("hiddenInboxMessageIds names exactly the collapsed citizenship messages (review R2)", () => {
    expect(
      hiddenInboxMessageIds([
        message(9, "citizenship_paid"),
        message(7, "citizenship_paid"),
        message(5, "name_change_approved", { templateParams: { name: "A" } }),
        message(4, null),
        message(2, "citizenship_earned"),
      ]),
    ).toEqual(new Set([9, 7]));
    expect(hiddenInboxMessageIds([message(2, "citizenship_earned")])).toEqual(
      new Set(),
    );
    expect(hiddenInboxMessageIds([])).toEqual(new Set());
  });

  test("an empty list stays empty and the input is not mutated", () => {
    expect(toPublicInboxMessages([])).toEqual([]);
    const list = [message(1, "citizenship_paid")];
    toPublicInboxMessages(list);
    expect(list[0].templateKey).toBe("citizenship_paid");
  });
});

// ── Task 0250 S3b: the verified OWNER view and the per-caller choosers ────────

const NAME_CHANGE = {
  status: "pending" as const,
  requested_name: "NewName",
  decided_at: null,
};

/** The S1 fixture matrix plus a non-citizen. */
const PROFILE_MATRIX: Record<string, PlayerProfile> = {
  "paid-not-earned at 0": paidNotEarned(0),
  "paid-not-earned at 30": paidNotEarned(30),
  "paid-not-earned at 99": paidNotEarned(99),
  "earned at 100": EARNED_AT_100,
  "earned at 1200": { ...EARNED_AT_100, xp: 1200 },
  "paid-then-earned": PAID_THEN_EARNED,
  "non-citizen at 42": profile({ xp: 42 }),
};

describe("toOwnerProfile", () => {
  test.each(Object.entries(PROFILE_MATRIX))(
    "%s: the stored values verbatim, both paid keys present",
    (_name, stored) => {
      const owner = toOwnerProfile(stored);
      expect(owner).toEqual(stored);
      expect(owner).toHaveProperty("is_paid_citizen", stored.is_paid_citizen);
      expect(owner).toHaveProperty(
        "citizenship_purchased_at",
        stored.citizenship_purchased_at,
      );
      expect(PublicPlayerProfileSchema.safeParse(owner).success).toBe(true);
    },
  );

  test("a non-payer still carries both paid keys (false / null): presence marks the view, not the state", () => {
    const owner = toOwnerProfile(profile({ xp: 42 }));
    expect(Object.keys(owner)).toEqual(
      expect.arrayContaining(["is_paid_citizen", "citizenship_purchased_at"]),
    );
    expect(owner.is_paid_citizen).toBe(false);
    expect(owner.citizenship_purchased_at).toBeNull();
  });

  test("name_change is merged in when present and omitted when absent", () => {
    expect(toOwnerProfile(EARNED_AT_100, NAME_CHANGE).name_change).toEqual(
      NAME_CHANGE,
    );
    expect(toOwnerProfile(EARNED_AT_100, null)).not.toHaveProperty(
      "name_change",
    );
    expect(toOwnerProfile(EARNED_AT_100)).not.toHaveProperty("name_change");
  });

  test("the stored record is not mutated", () => {
    const stored = paidNotEarned(30);
    const copy = { ...stored };
    toOwnerProfile(stored, NAME_CHANGE);
    expect(stored).toEqual(copy);
  });
});

describe("per-caller choosers", () => {
  describe("verified = false → exactly the S1 functions", () => {
    test.each(Object.entries(PROFILE_MATRIX))(
      "profileForCaller — %s",
      (_name, stored) => {
        for (const nameChange of [undefined, null, NAME_CHANGE]) {
          const chosen = profileForCaller(stored, nameChange, false);
          expect(chosen).toEqual(toPublicProfile(stored, nameChange));
          expect(chosen).not.toHaveProperty("is_paid_citizen");
          expect(chosen).not.toHaveProperty("citizenship_purchased_at");
          expect(JSON.stringify(chosen).length).toBe(
            JSON.stringify(toPublicProfile(stored, nameChange)).length,
          );
        }
      },
    );

    test.each([
      [0, true],
      [42, true],
      [1200, true],
      [0, false],
      [99, false],
    ])("xpForCaller(%i, citizen=%s)", (xp, isCitizen) => {
      expect(xpForCaller(xp, isCitizen, false)).toBe(
        equalizedXp(xp, isCitizen),
      );
    });

    test("inboxMessagesForCaller", () => {
      const list = [
        message(9, "citizenship_paid"),
        message(5, "name_change_approved", { templateParams: { name: "A" } }),
        message(2, "citizenship_earned"),
      ];
      expect(inboxMessagesForCaller(list, false)).toEqual(
        toPublicInboxMessages(list),
      );
    });
  });

  describe("verified = true → the caller's own true values", () => {
    test.each(Object.entries(PROFILE_MATRIX))(
      "profileForCaller — %s",
      (_name, stored) => {
        expect(profileForCaller(stored, undefined, true)).toEqual(stored);
        expect(profileForCaller(stored, NAME_CHANGE, true)).toEqual({
          ...stored,
          name_change: NAME_CHANGE,
        });
      },
    );

    test("a paid citizen's two views really differ (the branch runs)", () => {
      const stored = paidNotEarned(30);
      expect(profileForCaller(stored, undefined, true)).not.toEqual(
        profileForCaller(stored, undefined, false),
      );
      expect(xpForCaller(30, true, true)).toBe(30);
      expect(xpForCaller(1200, true, true)).toBe(1200);
    });

    test("inboxMessagesForCaller keeps the original keys, collapses nothing, and copies", () => {
      const list = [
        message(9, "citizenship_paid", { templateParams: { product: "x" } }),
        message(5, "name_change_approved", { templateParams: { name: "A" } }),
        message(2, "citizenship_earned"),
      ];
      const chosen = inboxMessagesForCaller(list, true);
      expect(chosen).toEqual(list);
      expect(chosen).not.toBe(list);
    });
  });
});
