// Task 0494 (spec §5, §10): one offer rule for every product. The citizenship
// branch must keep today's order exactly (CitizenshipOffer.test.ts is its
// spec through the wrapper); the durable-item branch is the item double-charge
// guard, driven here with a test-only id because no item exists yet.
import type { PaymentProductId } from "../../src/core/profile/PaymentsContract";
import {
  deriveOfferForKind,
  derivePurchaseOffer,
  type PurchaseProfileSnapshot,
} from "../../src/client/PurchaseOffer";

const ITEM = "test_item" as unknown as PaymentProductId;
const OTHER_ITEM = "other_item" as unknown as PaymentProductId;
const PRICE = "99 ₽";

type Profile = NonNullable<PurchaseProfileSnapshot["profile"]>;

const NON_CITIZEN: Profile = {
  isCitizen: false,
  isAuthoritative: true,
  isVerifiedRead: false,
  isPaidCitizen: false,
  xp: 40,
  entitlements: null,
};
const EARNED_VERIFIED: Profile = {
  ...NON_CITIZEN,
  isCitizen: true,
  isVerifiedRead: true,
  xp: 120,
};
const EARNED_UNVERIFIED: Profile = {
  ...EARNED_VERIFIED,
  isVerifiedRead: false,
};
const PAID_CITIZEN: Profile = { ...EARNED_VERIFIED, isPaidCitizen: true };
const FAILED_READ: Profile = { ...NON_CITIZEN, isAuthoritative: false, xp: 0 };

function snapshot(
  overrides: Partial<PurchaseProfileSnapshot> = {},
): PurchaseProfileSnapshot {
  return {
    isRevealed: true,
    isChecking: false,
    profile: NON_CITIZEN,
    paidGrantConfirmed: false,
    grantedThisPage: new Set(),
    canLogIn: true,
    ...overrides,
  };
}

const item = (snap: PurchaseProfileSnapshot, price: string | null = PRICE) =>
  deriveOfferForKind("durable_item", ITEM, snap, price);

describe("derivePurchaseOffer — shared start", () => {
  it.each(["citizenship", "durable_item"] as const)(
    "%s: checking until revealed, and while a read is in flight",
    (kind) => {
      expect(
        deriveOfferForKind(kind, ITEM, snapshot({ isRevealed: false }), PRICE),
      ).toEqual({ kind: "checking" });
      expect(
        deriveOfferForKind(kind, ITEM, snapshot({ isChecking: true }), PRICE),
      ).toEqual({ kind: "checking" });
    },
  );

  it.each(["citizenship", "durable_item"] as const)(
    "%s: a guest gets guest with the price (or none)",
    (kind) => {
      expect(
        deriveOfferForKind(kind, ITEM, snapshot({ profile: null }), PRICE),
      ).toEqual({ kind: "guest", canLogIn: true, price: PRICE });
      expect(
        deriveOfferForKind(
          kind,
          ITEM,
          snapshot({ profile: null, canLogIn: false }),
          null,
        ),
      ).toEqual({ kind: "guest", canLogIn: false, price: null });
    },
  );

  it("looks the product's kind up in PRODUCT_DEFINITIONS", () => {
    // Citizenship is the citizenship kind: an earned unverified citizen is
    // owned (never cannot_verify, which only the item kind answers).
    expect(
      derivePurchaseOffer(
        "citizenship",
        snapshot({ profile: EARNED_UNVERIFIED }),
        PRICE,
      ),
    ).toEqual({ kind: "owned" });
  });
});

describe("derivePurchaseOffer — citizenship kind (today's order)", () => {
  const citizenship = (
    snap: PurchaseProfileSnapshot,
    price: string | null = PRICE,
  ) => derivePurchaseOffer("citizenship", snap, price);

  it("an authoritative non-citizen with a price: buy, with xp", () => {
    expect(citizenship(snapshot())).toEqual({
      kind: "buy",
      price: PRICE,
      xp: 40,
    });
  });

  it("an authoritative non-citizen without a price: no_product, with xp", () => {
    expect(citizenship(snapshot(), null)).toEqual({
      kind: "no_product",
      xp: 40,
    });
  });

  it("a failed read: read_failed, never buy", () => {
    expect(citizenship(snapshot({ profile: FAILED_READ }))).toEqual({
      kind: "read_failed",
    });
  });

  it("an earned citizen on a verified not-paid read: buy", () => {
    expect(citizenship(snapshot({ profile: EARNED_VERIFIED }))).toEqual({
      kind: "buy",
      price: PRICE,
      xp: 120,
    });
  });

  it.each([
    ["an earned citizen on an unverified read", EARNED_UNVERIFIED, PRICE],
    ["a paid citizen", PAID_CITIZEN, PRICE],
    ["an earned verified citizen with no price", EARNED_VERIFIED, null],
    [
      "a citizen whose read is not authoritative",
      { ...EARNED_VERIFIED, isAuthoritative: false },
      PRICE,
    ],
  ] as const)("%s: owned", (_label, profile, price) => {
    expect(citizenship(snapshot({ profile }), price)).toEqual({
      kind: "owned",
    });
  });

  it("a server-confirmed grant beats a stale or failed read: owned", () => {
    for (const profile of [NON_CITIZEN, FAILED_READ, EARNED_VERIFIED]) {
      expect(
        citizenship(snapshot({ profile, paidGrantConfirmed: true })),
      ).toEqual({ kind: "owned" });
    }
  });
});

describe("deriveOfferForKind — durable item (spec §5 order)", () => {
  it("granted this page: owned, even on a stale or failed read", () => {
    for (const profile of [NON_CITIZEN, FAILED_READ, EARNED_UNVERIFIED]) {
      expect(
        item(snapshot({ profile, grantedThisPage: new Set([ITEM]) })),
      ).toEqual({ kind: "owned" });
    }
  });

  it("a different product granted this page does not make this one owned", () => {
    expect(item(snapshot({ grantedThisPage: new Set([OTHER_ITEM]) }))).toEqual({
      kind: "buy",
      price: PRICE,
      xp: 40,
    });
  });

  it("a non-authoritative read: read_failed", () => {
    expect(item(snapshot({ profile: FAILED_READ }))).toEqual({
      kind: "read_failed",
    });
  });

  describe("ownership list known", () => {
    it.each([
      ["a non-citizen", NON_CITIZEN],
      ["an earned verified citizen", EARNED_VERIFIED],
      ["a paid citizen", PAID_CITIZEN],
    ] as const)("%s who owns it: owned", (_label, profile) => {
      expect(
        item(snapshot({ profile: { ...profile, entitlements: [ITEM] } })),
      ).toEqual({ kind: "owned" });
    });

    it.each([
      ["a non-citizen", NON_CITIZEN],
      ["an earned verified citizen", EARNED_VERIFIED],
      ["a paid citizen", PAID_CITIZEN],
    ] as const)("%s who does not own it: buy", (_label, profile) => {
      expect(
        item(snapshot({ profile: { ...profile, entitlements: [OTHER_ITEM] } })),
      ).toEqual({ kind: "buy", price: PRICE, xp: profile.xp });
    });

    it("not owned and no catalog price: no_product", () => {
      expect(
        item(
          snapshot({ profile: { ...PAID_CITIZEN, entitlements: [] } }),
          null,
        ),
      ).toEqual({ kind: "no_product", xp: 120 });
    });
  });

  describe("ownership list unknown", () => {
    it("a non-citizen: buy (a real player owns no item without citizenship)", () => {
      expect(item(snapshot())).toEqual({ kind: "buy", price: PRICE, xp: 40 });
    });

    it("a non-citizen with no catalog price: no_product", () => {
      expect(item(snapshot(), null)).toEqual({ kind: "no_product", xp: 40 });
    });

    it.each([
      ["an earned verified citizen", EARNED_VERIFIED],
      ["an earned unverified citizen", EARNED_UNVERIFIED],
      ["a paid citizen", PAID_CITIZEN],
    ] as const)("%s: cannot_verify, never owned", (_label, profile) => {
      expect(item(snapshot({ profile }))).toEqual({ kind: "cannot_verify" });
    });
  });
});
