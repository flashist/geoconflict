// What a Buy surface may offer for one product right now (task 0494, spec
// 2026-10-24-design-shared-purchase-flow.md §5). Pure. This is the
// double-charge guard, written once for every product: a working Buy needs an
// authoritative read, and a server-confirmed grant beats a stale read.
// CitizenshipOffer.ts is a thin wrapper over the citizenship branch.

import {
  PRODUCT_DEFINITIONS,
  type PaymentProductId,
  type ProductKind,
} from "../core/profile/PaymentsContract";

/**
 * Fired on `window` after every citizenship card update, so an open surface
 * re-reads the offer. Same string as CITIZENSHIP_OFFER_CHANGED_EVENT.
 */
export const PURCHASE_OFFER_CHANGED_EVENT =
  "geoconflict-citizenship-offer-changed";

export type PurchaseOffer =
  /** No read applied yet, a re-read in flight, or the card not yet revealed. */
  | { kind: "checking" }
  /** Not logged in. `canLogIn` is false when a login button would be dead. */
  | { kind: "guest"; canLogIn: boolean; price: string | null }
  | { kind: "owned" }
  /** Ownership cannot be known from this read — never treated as owned. */
  | { kind: "cannot_verify" }
  /** The profile read failed — never offer a purchase off it. */
  | { kind: "read_failed" }
  /** The catalog has no such product. */
  | { kind: "no_product"; xp: number }
  | { kind: "buy"; price: string; xp: number };

export interface PurchaseProfileSnapshot {
  /** The card has been revealed (kill switch and flag passed). */
  isRevealed: boolean;
  /** The card's status line reads "checking". */
  isChecking: boolean;
  /** The applied profile read; null means a guest. */
  profile: {
    isCitizen: boolean;
    isAuthoritative: boolean;
    /** The last applied read is the verified owner view (task 0409). */
    isVerifiedRead: boolean;
    /** That verified read says paid (task 0409). */
    isPaidCitizen: boolean;
    xp: number;
    /** Owned durable product ids; null = not known from this read. */
    entitlements: readonly PaymentProductId[] | null;
  } | null;
  /** The server confirmed a paid grant whose re-read has not landed. */
  paidGrantConfirmed: boolean;
  /** Product ids the server granted during this page load. */
  grantedThisPage: ReadonlySet<PaymentProductId>;
  /** `yaGamesAvailable && !isYandexDegraded()`. */
  canLogIn: boolean;
}

export function derivePurchaseOffer(
  productId: PaymentProductId,
  snapshot: PurchaseProfileSnapshot,
  catalogPrice: string | null,
): PurchaseOffer {
  return deriveOfferForKind(
    PRODUCT_DEFINITIONS[productId].kind,
    productId,
    snapshot,
    catalogPrice,
  );
}

/** Exported so the durable-item branch is testable before any item id exists. */
export function deriveOfferForKind(
  kind: ProductKind,
  productId: PaymentProductId,
  snapshot: PurchaseProfileSnapshot,
  catalogPrice: string | null,
): PurchaseOffer {
  if (!snapshot.isRevealed || snapshot.isChecking) {
    return { kind: "checking" };
  }
  const profile = snapshot.profile;
  if (profile === null) {
    return { kind: "guest", canLogIn: snapshot.canLogIn, price: catalogPrice };
  }
  if (kind === "citizenship") {
    return deriveCitizenshipKindOffer(profile, snapshot, catalogPrice);
  }
  return deriveDurableItemOffer(productId, profile, snapshot, catalogPrice);
}

type SnapshotProfile = NonNullable<PurchaseProfileSnapshot["profile"]>;

// Task 0409: an earned citizen may buy only on a VERIFIED read that says "not
// paid" — an unverified read cannot say "paid" (ADR-116 Decision 4). Every
// unknown is `owned`: the server does not refuse a second citizenship purchase.
function deriveCitizenshipKindOffer(
  profile: SnapshotProfile,
  snapshot: PurchaseProfileSnapshot,
  catalogPrice: string | null,
): PurchaseOffer {
  if (profile.isCitizen || snapshot.paidGrantConfirmed) {
    if (
      !snapshot.paidGrantConfirmed &&
      profile.isAuthoritative &&
      profile.isVerifiedRead &&
      !profile.isPaidCitizen &&
      catalogPrice !== null
    ) {
      return { kind: "buy", price: catalogPrice, xp: profile.xp };
    }
    return { kind: "owned" };
  }
  if (!profile.isAuthoritative) {
    return { kind: "read_failed" };
  }
  return buyOrNoProduct(profile, catalogPrice);
}

// A real player cannot own an item without being a citizen (every grant sets
// is_citizen), so an unknown list blocks only citizens. Testers reset to
// non-citizen are an accepted residual (spec §7).
function deriveDurableItemOffer(
  productId: PaymentProductId,
  profile: SnapshotProfile,
  snapshot: PurchaseProfileSnapshot,
  catalogPrice: string | null,
): PurchaseOffer {
  if (snapshot.grantedThisPage.has(productId)) {
    return { kind: "owned" };
  }
  if (!profile.isAuthoritative) {
    return { kind: "read_failed" };
  }
  if (profile.entitlements !== null) {
    return profile.entitlements.includes(productId)
      ? { kind: "owned" }
      : buyOrNoProduct(profile, catalogPrice);
  }
  if (!profile.isCitizen) {
    return buyOrNoProduct(profile, catalogPrice);
  }
  return { kind: "cannot_verify" };
}

function buyOrNoProduct(
  profile: SnapshotProfile,
  catalogPrice: string | null,
): PurchaseOffer {
  if (catalogPrice === null) {
    return { kind: "no_product", xp: profile.xp };
  }
  return { kind: "buy", price: catalogPrice, xp: profile.xp };
}
