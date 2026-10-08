// Task 0301: what the citizenship surfaces may offer. One rule for the card and
// the explainer popup — the 0018 double-charge guard, written once.

import {
  type CitizenshipOfferInputs,
  deriveCitizenshipOffer,
} from "../../src/client/CitizenshipOffer";

const NON_CITIZEN = { isCitizen: false, isAuthoritative: true, xp: 25 };
const CITIZEN = { isCitizen: true, isAuthoritative: true, xp: 100 };

function inputs(
  overrides: Partial<CitizenshipOfferInputs> = {},
): CitizenshipOfferInputs {
  return {
    isRevealed: true,
    isChecking: false,
    profile: NON_CITIZEN,
    paidGrantConfirmed: false,
    isVerifiedRead: false,
    isPaidCitizen: false,
    canLogIn: true,
    productPrice: "99 ₽",
    ...overrides,
  };
}

describe("deriveCitizenshipOffer (task 0301)", () => {
  it("checking while the card is not revealed", () => {
    expect(deriveCitizenshipOffer(inputs({ isRevealed: false }))).toEqual({
      kind: "checking",
    });
  });

  it("checking while no read has been applied", () => {
    expect(deriveCitizenshipOffer(inputs({ isChecking: true }))).toEqual({
      kind: "checking",
    });
  });

  it.each([true, false])("guest carries canLogIn=%s", (canLogIn) => {
    expect(deriveCitizenshipOffer(inputs({ profile: null, canLogIn }))).toEqual(
      { kind: "guest", canLogIn },
    );
  });

  it("citizen for a citizen profile", () => {
    expect(
      deriveCitizenshipOffer(
        inputs({ profile: { ...NON_CITIZEN, isCitizen: true, xp: 100 } }),
      ),
    ).toEqual({ kind: "citizen" });
  });

  it("read_failed for a non-authoritative read", () => {
    expect(
      deriveCitizenshipOffer(
        inputs({ profile: { ...NON_CITIZEN, isAuthoritative: false } }),
      ),
    ).toEqual({ kind: "read_failed" });
  });

  it("no_product when the catalog has no citizenship product", () => {
    expect(deriveCitizenshipOffer(inputs({ productPrice: null }))).toEqual({
      kind: "no_product",
      xp: 25,
    });
  });

  it("buy for an authoritative non-citizen with a product", () => {
    expect(deriveCitizenshipOffer(inputs())).toEqual({
      kind: "buy",
      price: "99 ₽",
      xp: 25,
    });
  });

  describe("precedence", () => {
    it("checking beats guest", () => {
      expect(
        deriveCitizenshipOffer(inputs({ isChecking: true, profile: null })),
      ).toEqual({ kind: "checking" });
    });

    it("a confirmed paid grant beats a failed re-read (citizen, never buy)", () => {
      expect(
        deriveCitizenshipOffer(
          inputs({
            profile: { ...NON_CITIZEN, isAuthoritative: false },
            paidGrantConfirmed: true,
          }),
        ),
      ).toEqual({ kind: "citizen" });
    });

    it("a confirmed paid grant beats a stale non-citizen read", () => {
      expect(
        deriveCitizenshipOffer(inputs({ paidGrantConfirmed: true })),
      ).toEqual({ kind: "citizen" });
    });

    it("not authoritative beats a ready product — never a buy off a failed read", () => {
      expect(
        deriveCitizenshipOffer(
          inputs({ profile: { ...NON_CITIZEN, isAuthoritative: false } }),
        ),
      ).toEqual({ kind: "read_failed" });
    });
  });

  // Task 0409: an earned citizen may buy — only on a verified "not paid" read.
  describe("citizen_buy (task 0409)", () => {
    it("citizen_buy for a verified, not-paid citizen with a product", () => {
      expect(
        deriveCitizenshipOffer(
          inputs({ profile: CITIZEN, isVerifiedRead: true }),
        ),
      ).toEqual({ kind: "citizen_buy", price: "99 ₽" });
    });

    it("double-charge guard: an unverified citizen never gets a buy offer", () => {
      // An unverified read cannot say "paid" (ADR-116 Decision 4): a paid
      // citizen on this session looks exactly like an unpaid one.
      expect(
        deriveCitizenshipOffer(
          inputs({
            profile: CITIZEN,
            isVerifiedRead: false,
            isPaidCitizen: false,
          }),
        ),
      ).toEqual({ kind: "citizen" });
    });

    it("citizen for a verified paid citizen", () => {
      expect(
        deriveCitizenshipOffer(
          inputs({
            profile: CITIZEN,
            isVerifiedRead: true,
            isPaidCitizen: true,
          }),
        ),
      ).toEqual({ kind: "citizen" });
    });

    it("citizen once a paid grant is confirmed, even on a stale verified not-paid read", () => {
      expect(
        deriveCitizenshipOffer(
          inputs({
            profile: CITIZEN,
            isVerifiedRead: true,
            paidGrantConfirmed: true,
          }),
        ),
      ).toEqual({ kind: "citizen" });
    });

    it("citizen when the catalog has no citizenship product — no dead button", () => {
      expect(
        deriveCitizenshipOffer(
          inputs({
            profile: CITIZEN,
            isVerifiedRead: true,
            productPrice: null,
          }),
        ),
      ).toEqual({ kind: "citizen" });
    });

    it("checking beats citizen_buy", () => {
      expect(
        deriveCitizenshipOffer(
          inputs({ profile: CITIZEN, isVerifiedRead: true, isChecking: true }),
        ),
      ).toEqual({ kind: "checking" });
    });

    it.each([
      [false, false],
      [true, false],
      [false, true],
      [true, true],
    ])(
      "non-citizen results ignore the new flags (verified=%s, paid=%s)",
      (isVerifiedRead, isPaidCitizen) => {
        const flags = { isVerifiedRead, isPaidCitizen };
        expect(deriveCitizenshipOffer(inputs(flags))).toEqual({
          kind: "buy",
          price: "99 ₽",
          xp: 25,
        });
        expect(
          deriveCitizenshipOffer(inputs({ ...flags, productPrice: null })),
        ).toEqual({ kind: "no_product", xp: 25 });
        expect(
          deriveCitizenshipOffer(
            inputs({
              ...flags,
              profile: { ...NON_CITIZEN, isAuthoritative: false },
            }),
          ),
        ).toEqual({ kind: "read_failed" });
        expect(
          deriveCitizenshipOffer(inputs({ ...flags, profile: null })),
        ).toEqual({ kind: "guest", canLogIn: true });
      },
    );
  });
});
