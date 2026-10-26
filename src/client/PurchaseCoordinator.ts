// The page's one purchase flow for every product (task 0494, spec §4.3): one
// in-flight latch across all products, the owned check before any intent, and
// the progress states. A guest logs in first and the flow goes on by itself,
// with no login reload (task 0495, ADR-125). Everything it touches comes in
// through deps, so it never imports a surface and is testable without a DOM.

import type { PaymentProductId } from "../core/profile/PaymentsContract";
import type { ReconcileNowResult } from "./PaymentsReconciliation";
import type { ProductAnalytics } from "./ProductClientConfig";
import type {
  ProductPurchaseOptions,
  ProductPurchaseResult,
} from "./ProductPurchase";
import {
  derivePurchaseOffer,
  type PurchaseProfileSnapshot,
} from "./PurchaseOffer";

export const PURCHASE_FLOW_STATE_EVENT = "geoconflict-purchase-flow-state";
export const PURCHASE_GRANTED_EVENT = "geoconflict-purchase-granted";

/**
 * After a guest's login dialog closes, the flow may open the payment window by
 * itself only within this time (spec §15.2 item 1); later it asks for a tap.
 * The live check (task 0498) measures the real value; 0 = always one more tap.
 */
export const AUTO_CONTINUE_DEADLINE_MS = 15_000;
/** How long a guest flow's end line stays up before the login restart. */
export const HANDOFF_DELAY_MS = 5_000;
const PAYMENTS_REFRESH_TIMEOUT_MS = 5_000;
const RECONCILE_TIMEOUT_MS = 10_000;

export type PurchaseFlowState =
  | "idle"
  | "logging_in"
  | "preparing"
  | "paying"
  | "granted"
  | "profile_unavailable"
  | "already_owned"
  | "cannot_verify"
  | "login_cancelled"
  | "needs_tap"
  | "earlier_purchase_pending"
  | "error";

export type PurchaseRequestResult =
  | "granted"
  | "busy"
  | "profile_unavailable"
  | "already_owned"
  | "cannot_verify"
  | "login_cancelled"
  | "needs_tap"
  | "earlier_purchase_pending"
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
  /**
   * Re-read the profile; resolves when the read is applied. `showChecking`
   * shows "checking" while it runs (the guest flow's read after a login).
   */
  reread(options?: { showChecking?: boolean }): Promise<void>;
  /** A server-confirmed grant: stop offering it before the re-read lands. */
  markGranted(productId: PaymentProductId): void;
}

export interface PurchaseCoordinatorDeps {
  profileSource: () => PurchaseProfileSource | null;
  runProductPurchase: (
    productId: PaymentProductId,
    options?: ProductPurchaseOptions,
  ) => Promise<ProductPurchaseResult>;
  catalogPrice: (productId: PaymentProductId) => string | null;
  logUiTap: (tapElementId: string) => void;
  // The guest path (task 0495).
  /** The facade's single-flight Yandex login dialog; true = logged in. */
  openAuthDialog: () => Promise<boolean>;
  /** True only when a payments object for the logged-in player is in place. */
  refreshPaymentsAfterLogin: (timeoutMs: number) => Promise<boolean>;
  /** The profile session token; null = no session for this player. */
  ensureSession: () => Promise<string | null>;
  reconcileNow: (timeoutMs: number) => Promise<ReconcileNowResult>;
  /** The D3 login restart a guest flow hands off to when it ends unbought. */
  requestLoginRestart: () => void;
  now: () => number;
  /** Returns a cancel function. */
  setTimer: (callback: () => void, delayMs: number) => () => void;
  autoContinueDeadlineMs: number;
  handOffDelayMs: number;
  productAnalytics: (productId: PaymentProductId) => ProductAnalytics;
  logEvent: (event: string, value?: number) => void;
}

export interface PurchaseCoordinator {
  requestPurchase(request: {
    productId: PaymentProductId;
    tapElementId: string;
  }): Promise<PurchaseRequestResult>;
  currentState(productId: PaymentProductId): PurchaseFlowState;
  /**
   * The surface that started the flow closed (spec §15.2 item 3): a guest flow
   * then never opens the payment window, and hands off to the login restart.
   */
  surfaceClosed(productId: PaymentProductId): void;
}

type RunResult = Exclude<PurchaseRequestResult, "busy">;

type PrepareResult = "ready" | "profile_unavailable" | "not_ready";

/** A guest who logged in through this flow and has not been handed off yet. */
interface GuestFlow {
  productId: PaymentProductId;
  loggedInAt: number;
  /** Runs once, from the login, whether or not a run is waiting on it. */
  prepare: Promise<PrepareResult>;
  /** Ended unbought; waiting for the hand-off timer or the surface to close. */
  isAwaitingHandOff: boolean;
  cancelHandOffTimer: (() => void) | null;
}

const TIMED_OUT = Symbol("timed_out");

export function createPurchaseCoordinator(
  deps: PurchaseCoordinatorDeps,
): PurchaseCoordinator {
  let isInFlight = false;
  let inFlightProductId: PaymentProductId | null = null;
  let isSurfaceClosedDuringRun = false;
  // One at most: there is one latch.
  let guestFlow: GuestFlow | null = null;
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

  const end = (productId: PaymentProductId, result: RunResult): RunResult => {
    setState(productId, result);
    return result;
  };

  const withinDeadline = <T>(
    work: Promise<T>,
    deadlineAt: number | null,
  ): Promise<T | typeof TIMED_OUT> => {
    if (deadlineAt === null) {
      return work;
    }
    // A rejection after the deadline has nobody waiting on it.
    work.catch(() => {});
    const remaining = deadlineAt - deps.now();
    if (remaining <= 0) {
      return Promise.resolve(TIMED_OUT);
    }
    let cancelTimer = (): void => {};
    const timedOut = new Promise<typeof TIMED_OUT>((resolve) => {
      cancelTimer = deps.setTimer(() => resolve(TIMED_OUT), remaining);
    });
    return Promise.race([work, timedOut]).finally(() => cancelTimer());
  };

  const grant = async (
    productId: PaymentProductId,
    source: PurchaseProfileSource,
  ): Promise<RunResult> => {
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

  const runLoggedIn = async (
    productId: PaymentProductId,
    source: PurchaseProfileSource,
  ): Promise<RunResult> => {
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
        // checking, no_product: a tap cannot reach these on the logged-in
        // path (a guest takes runGuestLogin).
        return end(productId, "error");
    }

    setState(productId, "paying");
    const result = await deps.runProductPurchase(productId);
    if (result === "granted") {
      return grant(productId, source);
    }
    return end(productId, result === "not_opened" ? "error" : result);
  };

  const prepareAfterLogin = async (): Promise<PrepareResult> => {
    const [isPaymentsRefreshed, session] = await Promise.all([
      deps.refreshPaymentsAfterLogin(PAYMENTS_REFRESH_TIMEOUT_MS),
      deps.ensureSession(),
    ]);
    if (session === null) {
      return "profile_unavailable";
    }
    const reconciled = await deps.reconcileNow(RECONCILE_TIMEOUT_MS);
    // A failed or unanswered reconcile may hide a paid, ungranted purchase, and
    // without the refresh the reconcile read the guest-time payments object,
    // not this account's: never open a second payment window by itself after
    // either (spec F5, OQ-1; review R2).
    return isPaymentsRefreshed &&
      (reconciled === "processed" || reconciled === "none")
      ? "ready"
      : "not_ready";
  };

  const needsTap = (productId: PaymentProductId): RunResult => {
    deps.logEvent(deps.productAnalytics(productId).continueNeedsTap);
    return end(productId, "needs_tap");
  };

  const profileUnavailable = (productId: PaymentProductId): RunResult => {
    deps.logEvent(deps.productAnalytics(productId).loginProfileFailed);
    return end(productId, "profile_unavailable");
  };

  const alreadyOwned = (productId: PaymentProductId): RunResult => {
    deps.logEvent(deps.productAnalytics(productId).blockedAlreadyOwned);
    return end(productId, "already_owned");
  };

  const runGuestLogin = async (
    productId: PaymentProductId,
    source: PurchaseProfileSource,
    canLogIn: boolean,
  ): Promise<RunResult> => {
    if (!canLogIn) {
      return end(productId, "error");
    }
    const analytics = deps.productAnalytics(productId);
    setState(productId, "logging_in");
    deps.logEvent(analytics.loginRequested);
    const isAuthorized = await deps.openAuthDialog();
    if (!isAuthorized) {
      deps.logEvent(analytics.loginCancelled);
      return end(productId, "login_cancelled");
    }
    deps.logEvent(analytics.loginSucceeded);
    const loggedInAt = deps.now();
    const flow: GuestFlow = {
      productId,
      loggedInAt,
      prepare: prepareAfterLogin().catch((error): PrepareResult => {
        console.warn("Preparing a purchase after login failed:", error);
        return "not_ready";
      }),
      isAwaitingHandOff: false,
      cancelHandOffTimer: null,
    };
    guestFlow = flow;
    setState(productId, "preparing");
    return continueGuestFlow(
      flow,
      source,
      loggedInAt + deps.autoContinueDeadlineMs,
    );
  };

  /**
   * `deadlineAt` null = a player's tap continues it: no deadline and no F5
   * stop, but the reconcile runs again first.
   */
  const continueGuestFlow = async (
    flow: GuestFlow,
    source: PurchaseProfileSource,
    deadlineAt: number | null,
  ): Promise<RunResult> => {
    const productId = flow.productId;
    const analytics = deps.productAnalytics(productId);

    const prepared = await withinDeadline(flow.prepare, deadlineAt);
    if (prepared === TIMED_OUT) {
      return needsTap(productId);
    }
    if (prepared === "profile_unavailable") {
      // Fast: the failed login is latched, so the card shows "couldn't load"
      // with its Restart game button. Never a hand-off from here.
      try {
        await source.reread();
      } catch (error) {
        console.warn("Profile re-read after a failed login failed:", error);
      }
      return profileUnavailable(productId);
    }
    if (
      (deadlineAt !== null && prepared === "not_ready") ||
      isSurfaceClosedDuringRun
    ) {
      return needsTap(productId);
    }
    if (deadlineAt === null) {
      // Only the server's own "not granted" blocks a tap; a re-check that
      // cannot answer lets the player pay, as before (review R1, owner ruling).
      const rechecked = await deps.reconcileNow(RECONCILE_TIMEOUT_MS);
      if (rechecked === "pending_ungranted") {
        deps.logEvent(analytics.blockedEarlierPurchasePending);
        return end(productId, "earlier_purchase_pending");
      }
    }

    const read = await withinDeadline(
      source.reread({ showChecking: true }),
      deadlineAt,
    );
    if (read === TIMED_OUT || isSurfaceClosedDuringRun) {
      return needsTap(productId);
    }
    const offer = derivePurchaseOffer(
      productId,
      source.snapshot(),
      deps.catalogPrice(productId),
    );
    switch (offer.kind) {
      case "buy":
        break;
      case "owned":
        return alreadyOwned(productId);
      case "cannot_verify":
        if (analytics.blockedCannotVerify !== null) {
          deps.logEvent(analytics.blockedCannotVerify);
        }
        return end(productId, "cannot_verify");
      case "read_failed":
        return profileUnavailable(productId);
      case "checking":
        // A newer read is still in flight (the card's read guard): one more tap.
        return needsTap(productId);
      default:
        return end(productId, "error");
    }

    if (deadlineAt !== null) {
      deps.logEvent(analytics.continueReady, deps.now() - flow.loggedInAt);
    }
    setState(productId, "paying");
    const result = await deps.runProductPurchase(productId, {
      mayOpenPaymentWindow: () =>
        !isSurfaceClosedDuringRun &&
        (deadlineAt === null || deps.now() < deadlineAt),
    });
    switch (result) {
      case "granted":
        return grant(productId, source);
      case "not_opened":
        return needsTap(productId);
      case "already_owned":
        return alreadyOwned(productId);
      default:
        return end(productId, "error");
    }
  };

  const run = async (productId: PaymentProductId): Promise<RunResult> => {
    const source = deps.profileSource();
    const flow = guestFlow;
    if (source !== null && flow !== null && flow.productId === productId) {
      // A tap after needs_tap or an end line: re-check, then go on from the
      // read — no second login and no deadline; the work started at the login.
      flow.cancelHandOffTimer?.();
      flow.cancelHandOffTimer = null;
      flow.isAwaitingHandOff = false;
      setState(productId, "preparing");
      return continueGuestFlow(flow, source, null);
    }
    const offer =
      source === null
        ? null
        : derivePurchaseOffer(
            productId,
            source.snapshot(),
            deps.catalogPrice(productId),
          );
    if (source !== null && offer?.kind === "guest") {
      return runGuestLogin(productId, source, offer.canLogIn);
    }
    setState(productId, "preparing");
    if (source === null) {
      return end(productId, "error");
    }
    return runLoggedIn(productId, source);
  };

  const handOff = (flow: GuestFlow): void => {
    if (guestFlow !== flow) {
      return;
    }
    flow.cancelHandOffTimer?.();
    guestFlow = null;
    setState(flow.productId, "idle");
    deps.requestLoginRestart();
  };

  // Spec §4.3 step 12: a guest flow that ended unbought still owes the player
  // the login restart (ADR-125) — after its end line, or as the surface closes.
  const settleGuestFlow = (
    productId: PaymentProductId,
    result: RunResult,
  ): void => {
    const flow = guestFlow;
    if (flow === null || flow.productId !== productId) {
      return;
    }
    if (result === "granted" || result === "profile_unavailable") {
      guestFlow = null;
      return;
    }
    flow.isAwaitingHandOff = true;
    if (isSurfaceClosedDuringRun) {
      handOff(flow);
      return;
    }
    if (result !== "needs_tap") {
      flow.cancelHandOffTimer = deps.setTimer(
        () => handOff(flow),
        deps.handOffDelayMs,
      );
    }
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
      inFlightProductId = productId;
      isSurfaceClosedDuringRun = false;
      let result: RunResult;
      try {
        deps.logUiTap(tapElementId);
        result = await run(productId);
      } catch (error) {
        console.warn("Purchase flow failed:", error);
        result = end(productId, "error");
      } finally {
        isInFlight = false;
        inFlightProductId = null;
      }
      settleGuestFlow(productId, result);
      return result;
    },

    currentState(productId: PaymentProductId): PurchaseFlowState {
      return states.get(productId) ?? "idle";
    },

    surfaceClosed(productId: PaymentProductId): void {
      if (isInFlight) {
        if (inFlightProductId === productId) {
          isSurfaceClosedDuringRun = true;
        }
        return;
      }
      const flow = guestFlow;
      if (
        flow !== null &&
        flow.productId === productId &&
        flow.isAwaitingHandOff
      ) {
        handOff(flow);
        return;
      }
      // A re-opened surface starts clean.
      if ((states.get(productId) ?? "idle") !== "idle") {
        setState(productId, "idle");
      }
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
