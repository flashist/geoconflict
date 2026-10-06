// Task 0301: what the citizenship surfaces may offer. One rule for the card and
// the explainer popup — the 0018 double-charge guard, written once.

import {
  type CitizenshipOfferInputs,
  deriveCitizenshipOffer,
} from "../../src/client/CitizenshipOffer";

const NON_CITIZEN = { isCitizen: false, isAuthoritative: true, xp: 25 };

function inputs(
  overrides: Partial<CitizenshipOfferInputs> = {},
): CitizenshipOfferInputs {
  return {
    isRevealed: true,
    isChecking: false,
    profile: NON_CITIZEN,
    paidGrantConfirmed: false,
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
});
