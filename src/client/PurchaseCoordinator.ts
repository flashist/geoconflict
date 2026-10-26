// The page's one purchase flow for every product (task 0494, spec §4.3): one
// in-flight latch across all products, the owned check before any intent, and
// the progress states. This is the logged-in path; the guest path (log in,
// then continue) is task 0495's. Everything it touches comes in through deps,
// so it never imports a surface and is testable without a DOM.

import type { PaymentProductId } from "../core/profile/PaymentsContract";
import type { ProductPurchaseResult } from "./ProductPurchase";
import {
  derivePurchaseOffer,
  type PurchaseProfileSnapshot,
} from "./PurchaseOffer";

export const PURCHASE_FLOW_STATE_EVENT = "geoconflict-purchase-flow-state";
export const PURCHASE_GRANTED_EVENT = "geoconflict-purchase-granted";

export type PurchaseFlowState =
  | "idle"
  | "preparing"
  | "paying"
  | "granted"
  | "profile_unavailable"
  | "already_owned"
  | "cannot_verify"
  | "error";

export type PurchaseRequestResult =
  | "granted"
  | "busy"
  | "profile_unavailable"
  | "already_owned"
  | "cannot_verify"
  | "error";

export interface PurchaseFlowStateDetail {
  productId: PaymentProductId;
  state: PurchaseFlowState;
}

export interface PurchaseGrantedDetail {
  productId: PaymentProductId;
}

/** Implemented by CitizenshipCard — it stays the page's only profile reader. */
export interface PurchaseProfileSource {
  snapshot(): PurchaseProfileSnapshot;
  /** Re-read the profile; resolves when the read is applied. */
  reread(): Promise<void>;
  /** A server-confirmed grant: stop offering it before the re-read lands. */
  markGranted(productId: PaymentProductId): void;
}

export interface PurchaseCoordinatorDeps {
  profileSource: () => PurchaseProfileSource | null;
  runProductPurchase: (
    productId: PaymentProductId,
  ) => Promise<ProductPurchaseResult>;
  catalogPrice: (productId: PaymentProductId) => string | null;
  logUiTap: (tapElementId: string) => void;
}

export interface PurchaseCoordinator {
  requestPurchase(request: {
    productId: PaymentProductId;
    tapElementId: string;
  }): Promise<PurchaseRequestResult>;
  currentState(productId: PaymentProductId): PurchaseFlowState;
}

export function createPurchaseCoordinator(
  deps: PurchaseCoordinatorDeps,
): PurchaseCoordinator {
  let isInFlight = false;
  const states = new Map<PaymentProductId, PurchaseFlowState>();

  const setState = (
    productId: PaymentProductId,
    state: PurchaseFlowState,
  ): void => {
    states.set(productId, state);
    window.dispatchEvent(
      new CustomEvent<PurchaseFlowStateDetail>(PURCHASE_FLOW_STATE_EVENT, {
        detail: { productId, state },
      }),
    );
  };

  const end = (
    productId: PaymentProductId,
    result: Exclude<PurchaseRequestResult, "busy">,
  ): Exclude<PurchaseRequestResult, "busy"> => {
    setState(productId, result);
    return result;
  };

  const run = async (
    productId: PaymentProductId,
  ): Promise<Exclude<PurchaseRequestResult, "busy">> => {
    setState(productId, "preparing");
    const source = deps.profileSource();
    if (source === null) {
      return end(productId, "error");
    }
    // Logged-in path: the card's current read, no extra re-read before paying,
    // so a citizenship buy looks and times exactly as before (plan OP-3).
    const offer = derivePurchaseOffer(
      productId,
      source.snapshot(),
      deps.catalogPrice(productId),
    );
    switch (offer.kind) {
      case "buy":
        break;
      case "owned":
        return end(productId, "already_owned");
      case "cannot_verify":
        return end(productId, "cannot_verify");
      case "read_failed":
        return end(productId, "profile_unavailable");
      default:
        // checking, guest, no_product: a tap cannot reach these on the
        // logged-in path.
        return end(productId, "error");
    }

    setState(productId, "paying");
    const result = await deps.runProductPurchase(productId);
    if (result !== "granted") {
      return end(productId, result);
    }
    source.markGranted(productId);
    setState(productId, "granted");
    window.dispatchEvent(
      new CustomEvent<PurchaseGrantedDetail>(PURCHASE_GRANTED_EVENT, {
        detail: { productId },
      }),
    );
    try {
      await source.reread();
    } catch (error) {
      // The server confirmed the grant; a failed re-read must not undo that.
      console.warn("Profile re-read after a purchase failed:", error);
    }
    return "granted";
  };

  return {
    async requestPurchase({
      productId,
      tapElementId,
    }): Promise<PurchaseRequestResult> {
      if (isInFlight) {
        return "busy";
      }
      isInFlight = true;
      try {
        deps.logUiTap(tapElementId);
        return await run(productId);
      } catch (error) {
        console.warn("Purchase flow failed:", error);
        return end(productId, "error");
      } finally {
        isInFlight = false;
      }
    },

    currentState(productId: PaymentProductId): PurchaseFlowState {
      return states.get(productId) ?? "idle";
    },
  };
}

let pageCoordinator: PurchaseCoordinator | null = null;

export function getPurchaseCoordinator(): PurchaseCoordinator | null {
  return pageCoordinator;
}

/** Main.ts registers the page's one instance; tests swap or clear it. */
export function setPurchaseCoordinator(
  coordinator: PurchaseCoordinator | null,
): void {
  pageCoordinator = coordinator;
}
