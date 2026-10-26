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
//
// The rule itself lives in PurchaseOffer.ts (one rule for every product); this
// maps its answer onto the citizenship surfaces' own offer shape.

import type { PaymentProductId } from "../core/profile/PaymentsContract";
import {
  derivePurchaseOffer,
  PURCHASE_OFFER_CHANGED_EVENT,
  type PurchaseProfileSnapshot,
} from "./PurchaseOffer";

/**
 * Fired on `window` after every citizenship card update, so an open explainer
 * popup re-reads the offer (a profile read or the payments catalog can land
 * while it is open).
 */
export const CITIZENSHIP_OFFER_CHANGED_EVENT = PURCHASE_OFFER_CHANGED_EVENT;

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

/** The card's gathered inputs as the shared rule's snapshot (one mapping). */
export function toPurchaseProfileSnapshot(
  inputs: CitizenshipOfferInputs,
  grantedThisPage: ReadonlySet<PaymentProductId> = new Set(),
): PurchaseProfileSnapshot {
  const profile = inputs.profile;
  return {
    isRevealed: inputs.isRevealed,
    isChecking: inputs.isChecking,
    profile:
      profile === null
        ? null
        : {
            isCitizen: profile.isCitizen,
            isAuthoritative: profile.isAuthoritative,
            isVerifiedRead: inputs.isVerifiedRead,
            isPaidCitizen: inputs.isPaidCitizen,
            xp: profile.xp,
            // The card's snapshot() fills this (task 0496); the citizenship
            // rule never reads it.
            entitlements: null,
          },
    paidGrantConfirmed: inputs.paidGrantConfirmed,
    grantedThisPage,
    canLogIn: inputs.canLogIn,
  };
}

export function deriveCitizenshipOffer(
  inputs: CitizenshipOfferInputs,
): CitizenshipOffer {
  const profile = inputs.profile;
  const offer = derivePurchaseOffer(
    "citizenship",
    toPurchaseProfileSnapshot(inputs),
    inputs.productPrice,
  );
  switch (offer.kind) {
    case "owned":
      return { kind: "citizen" };
    case "buy":
      return profile !== null && profile.isCitizen
        ? { kind: "citizen_buy", price: offer.price }
        : offer;
    case "guest":
      return { kind: "guest", canLogIn: offer.canLogIn };
    case "cannot_verify":
      // The citizenship kind never answers this; fail closed like a citizen.
      return { kind: "citizen" };
    default:
      return offer;
  }
}
