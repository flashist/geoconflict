// What the citizenship surfaces may offer right now (task 0301). Pure: the
// citizenship card hands in what it knows and both the card and the "What is
// citizenship?" explainer popup render the answer. One rule, written once, so
// the two buy buttons cannot drift apart.
//
// The order of checks is the card's own (it was inline in the card before):
// checking → guest → citizen → not authoritative → no product → buy. It is the
// double-charge guard from task 0018 (review R1): a working buy button needs an
// AUTHORITATIVE non-citizen read, and a server-confirmed paid grant beats
// everything after "guest" — a stale buy button after a committed grant invites
// a second real charge.
//
// Task 0409: the guard covers citizens too. An earned citizen may buy only on a
// VERIFIED read that says "not paid" — an unverified read cannot say "paid"
// (ADR-116 Decision 4), so a paid citizen on an unverified session would look
// unpaid. Every unknown gives plain `citizen`: no button. The server does not
// refuse a second purchase, so this rule is the only guard.

/**
 * Fired on `window` after every citizenship card update, so an open explainer
 * popup re-reads the offer (a profile read or the payments catalog can land
 * while it is open).
 */
export const CITIZENSHIP_OFFER_CHANGED_EVENT =
  "geoconflict-citizenship-offer-changed";

export type CitizenshipOffer =
  /** No read applied yet, a re-read in flight, or the card not yet revealed. */
  | { kind: "checking" }
  /** Not logged in. `canLogIn` is false when a login button would be dead. */
  | { kind: "guest"; canLogIn: boolean }
  /** A citizen, or a server-confirmed paid grant whose re-read has not landed. */
  | { kind: "citizen" }
  /** An earned citizen whose verified read says "not paid" (task 0409). */
  | { kind: "citizen_buy"; price: string }
  /** The profile read failed — never offer a purchase off it. */
  | { kind: "read_failed" }
  /** An authoritative non-citizen, but the catalog has no citizenship product. */
  | { kind: "no_product"; xp: number }
  | { kind: "buy"; price: string; xp: number };

export interface CitizenshipOfferInputs {
  /** The card has been revealed (kill switch and flag passed). */
  isRevealed: boolean;
  /** The card's status line reads "checking". */
  isChecking: boolean;
  /** The applied profile read; null means a guest. */
  profile: { isCitizen: boolean; isAuthoritative: boolean; xp: number } | null;
  paidGrantConfirmed: boolean;
  /** The last applied read is the verified owner view (task 0409). */
  isVerifiedRead: boolean;
  /** That verified read says paid (task 0409). */
  isPaidCitizen: boolean;
  /** `yaGamesAvailable && !isYandexDegraded()`. */
  canLogIn: boolean;
  /** The catalog price of the citizenship product, or null if it has none. */
  productPrice: string | null;
}

export function deriveCitizenshipOffer(
  inputs: CitizenshipOfferInputs,
): CitizenshipOffer {
  if (!inputs.isRevealed || inputs.isChecking) {
    return { kind: "checking" };
  }
  const profile = inputs.profile;
  if (profile === null) {
    return { kind: "guest", canLogIn: inputs.canLogIn };
  }
  if (profile.isCitizen || inputs.paidGrantConfirmed) {
    if (
      !inputs.paidGrantConfirmed &&
      profile.isAuthoritative &&
      inputs.isVerifiedRead &&
      !inputs.isPaidCitizen &&
      inputs.productPrice !== null
    ) {
      return { kind: "citizen_buy", price: inputs.productPrice };
    }
    return { kind: "citizen" };
  }
  if (!profile.isAuthoritative) {
    return { kind: "read_failed" };
  }
  if (inputs.productPrice === null) {
    return { kind: "no_product", xp: profile.xp };
  }
  return { kind: "buy", price: inputs.productPrice, xp: profile.xp };
}
