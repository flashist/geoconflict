/**
 * @jest-environment jsdom
 */
// Session-start reconciliation (task 0019) + the 0018 refresh signal: after
// reconciliation GRANTED ≥1 purchase, PURCHASES_RECONCILED_EVENT fires on
// window so profile consumers (citizenship card) re-fetch instead of keeping
// a stale State 2 with a live buy button. Since task 0510 (ADR-126) only the
// server's consumeTokens are consumed and a held-elsewhere answer is stored.
jest.mock("../../src/client/flashist/FlashistFacade", () => ({
  flashist_waitGameInitComplete: jest.fn().mockResolvedValue(undefined),
  flashist_logEventAnalytics: jest.fn(),
  flashistConstants: {
    analyticEvents: {
      PURCHASE_HELD_ON_OTHER_PROFILE_CITIZENSHIP:
        "Purchase:HeldOnOtherProfile:Citizenship",
    },
  },
  FlashistFacade: {
    instance: {
      getPaymentsCatalogStatus: jest.fn(),
      getSignedPurchases: jest.fn(),
      getSignedPurchasesResult: jest.fn(),
      consumePurchase: jest.fn(),
      // Task 0236 kill switch — enabled by default in beforeEach.
      isCitizenshipSurfacesEnabled: jest.fn(),
    },
  },
}));
jest.mock("../../src/client/PaymentsApiClient", () => ({
  reconcilePurchases: jest.fn(),
}));
jest.mock("../../src/client/ProfileSession", () => ({
  ensureSession: jest.fn(),
}));

import { CITIZENSHIP_GRANTED_MID_SESSION_EVENT } from "../../src/client/CitizenshipRestartOffer";
import {
  FlashistFacade,
  flashist_logEventAnalytics,
} from "../../src/client/flashist/FlashistFacade";
import { reconcilePurchases } from "../../src/client/PaymentsApiClient";
import {
  getHeldElsewhereProducts,
  PURCHASES_RECONCILED_EVENT,
  reconcilePurchasesNow,
  resetPaymentsReconciliationForTests,
  schedulePaymentsReconciliation,
} from "../../src/client/PaymentsReconciliation";
import { ensureSession } from "../../src/client/ProfileSession";
import { PURCHASE_OFFER_CHANGED_EVENT } from "../../src/client/PurchaseOffer";

const getPaymentsCatalogStatus = FlashistFacade.instance
  .getPaymentsCatalogStatus as jest.Mock;
const getSignedPurchases = FlashistFacade.instance
  .getSignedPurchases as jest.Mock;
const getSignedPurchasesResult = FlashistFacade.instance
  .getSignedPurchasesResult as jest.Mock;
const consumePurchase = FlashistFacade.instance.consumePurchase as jest.Mock;
const isCitizenshipSurfacesEnabled = FlashistFacade.instance
  .isCitizenshipSurfacesEnabled as jest.Mock;
const reconcile = reconcilePurchases as jest.Mock;
const ensureSessionMock = ensureSession as jest.Mock;
const logEvent = flashist_logEventAnalytics as jest.Mock;

const HELD_EVENT = "Purchase:HeldOnOtherProfile:Citizenship";

/** A post-0506 answer; override what a test is about. */
function okAnswer(
  fields: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    kind: "ok",
    processedTokens: [],
    grantedTokens: [],
    consumeTokens: [],
    heldElsewhere: [],
    failedCount: 0,
    ...fields,
  };
}

function heldEventCount(): number {
  return logEvent.mock.calls.filter(([event]) => event === HELD_EVENT).length;
}

async function flushAsync(): Promise<void> {
  for (let i = 0; i < 8; i++) {
    await Promise.resolve();
  }
}

describe("PaymentsReconciliation", () => {
  let reconciledEvents: number;
  const onReconciled = () => {
    reconciledEvents += 1;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    resetPaymentsReconciliationForTests();
    reconciledEvents = 0;
    window.addEventListener(PURCHASES_RECONCILED_EVENT, onReconciled);
    getPaymentsCatalogStatus.mockReturnValue("ready");
    isCitizenshipSurfacesEnabled.mockResolvedValue(true);
    getSignedPurchases.mockResolvedValue({ signature: "sig.list" });
    ensureSessionMock.mockResolvedValue("session-token");
    reconcile.mockResolvedValue(
      okAnswer({
        processedTokens: ["tok-1", "tok-2"],
        grantedTokens: ["tok-1", "tok-2"],
        consumeTokens: ["tok-1", "tok-2"],
      }),
    );
    consumePurchase.mockResolvedValue(undefined);
  });

  afterEach(() => {
    window.removeEventListener(PURCHASES_RECONCILED_EVENT, onReconciled);
  });

  it("does not reach the profile server while the kill switch is off (task 0236)", async () => {
    isCitizenshipSurfacesEnabled.mockResolvedValue(false);
    schedulePaymentsReconciliation();
    await flushAsync();

    expect(getSignedPurchases).not.toHaveBeenCalled();
    expect(reconcile).not.toHaveBeenCalled();
    expect(consumePurchase).not.toHaveBeenCalled();
    expect(reconciledEvents).toBe(0);
  });

  it("consumes every consumeTokens token and fires the reconciled event once", async () => {
    schedulePaymentsReconciliation();
    await flushAsync();

    expect(reconcile).toHaveBeenCalledWith("sig.list", "session-token");
    expect(consumePurchase).toHaveBeenCalledTimes(2);
    expect(consumePurchase).toHaveBeenNthCalledWith(1, "tok-1");
    expect(consumePurchase).toHaveBeenNthCalledWith(2, "tok-2");
    expect(reconciledEvents).toBe(1);
  });

  it("awaits the session once and forwards its token; a null session sends none", async () => {
    schedulePaymentsReconciliation();
    await flushAsync();
    expect(ensureSessionMock).toHaveBeenCalledTimes(1);
    expect(reconcile).toHaveBeenCalledWith("sig.list", "session-token");

    resetPaymentsReconciliationForTests();
    ensureSessionMock.mockResolvedValue(null);
    schedulePaymentsReconciliation();
    await flushAsync();
    expect(reconcile).toHaveBeenLastCalledWith("sig.list", null);
  });

  it("a throwing session lookup still reconciles, without a token", async () => {
    ensureSessionMock.mockRejectedValue(new Error("boom"));
    schedulePaymentsReconciliation();
    await flushAsync();
    expect(reconcile).toHaveBeenCalledWith("sig.list", null);
  });

  it("does not wait for a session when nothing is pending (deviation 6)", async () => {
    getSignedPurchases.mockResolvedValue(null);
    schedulePaymentsReconciliation();
    await flushAsync();
    expect(ensureSessionMock).not.toHaveBeenCalled();
  });

  // ADR-126: a kept purchase is processed on every load; only a fresh grant
  // may refresh the card and inbox, so reloads stay quiet.
  it("a kept purchase granted earlier: no event and no consume", async () => {
    reconcile.mockResolvedValue(
      okAnswer({ processedTokens: ["tok-1"], grantedTokens: [] }),
    );
    schedulePaymentsReconciliation();
    await flushAsync();
    expect(reconciledEvents).toBe(0);
    expect(consumePurchase).not.toHaveBeenCalled();
  });

  it("consumes only consumeTokens, never the rest of processedTokens", async () => {
    reconcile.mockResolvedValue(
      okAnswer({
        processedTokens: ["tok-1", "tok-2"],
        grantedTokens: ["tok-1"],
        consumeTokens: ["tok-2"],
      }),
    );
    schedulePaymentsReconciliation();
    await flushAsync();
    expect(consumePurchase).toHaveBeenCalledTimes(1);
    expect(consumePurchase).toHaveBeenCalledWith("tok-2");
    expect(reconciledEvents).toBe(1);
  });

  it("an old box (no grantedTokens): falls back to processedTokens for the event, consumes nothing", async () => {
    reconcile.mockResolvedValue(
      okAnswer({ processedTokens: ["tok-1"], grantedTokens: null }),
    );
    schedulePaymentsReconciliation();
    await flushAsync();
    expect(reconciledEvents).toBe(1);
    expect(consumePurchase).not.toHaveBeenCalled();
  });

  it("held elsewhere only: stores it, fires the offer event and the analytics once, no reconciled event, no consume", async () => {
    const onOfferChanged = jest.fn();
    window.addEventListener(PURCHASE_OFFER_CHANGED_EVENT, onOfferChanged);
    reconcile.mockResolvedValue(okAnswer({ heldElsewhere: ["citizenship"] }));
    try {
      schedulePaymentsReconciliation();
      await flushAsync();
    } finally {
      window.removeEventListener(PURCHASE_OFFER_CHANGED_EVENT, onOfferChanged);
    }
    expect(getHeldElsewhereProducts().has("citizenship")).toBe(true);
    expect(onOfferChanged).toHaveBeenCalledTimes(1);
    expect(heldEventCount()).toBe(1);
    expect(reconciledEvents).toBe(0);
    expect(consumePurchase).not.toHaveBeenCalled();
  });

  // Task 0303 (decided in the plan): a session-start grant never offers the
  // "restart to apply" popup — the page just loaded, and a quick restart could
  // leave the consume unfinished and chain a second popup.
  it("never fires the restart-offer signal, even when it granted (task 0303)", async () => {
    const onGrantedSignal = jest.fn();
    window.addEventListener(
      CITIZENSHIP_GRANTED_MID_SESSION_EVENT,
      onGrantedSignal,
    );
    try {
      schedulePaymentsReconciliation();
      await flushAsync();
    } finally {
      window.removeEventListener(
        CITIZENSHIP_GRANTED_MID_SESSION_EVENT,
        onGrantedSignal,
      );
    }

    expect(reconciledEvents).toBe(1);
    expect(onGrantedSignal).not.toHaveBeenCalled();
  });

  it("still fires the event when a consume fails — the grant is committed server-side", async () => {
    consumePurchase.mockRejectedValue(new Error("consume failed"));

    schedulePaymentsReconciliation();
    await flushAsync();

    expect(reconciledEvents).toBe(1);
  });

  it("still fires the event when a consume HANGS — the signal never waits on the SDK (review R3)", async () => {
    // First consume never settles. The grants were committed the moment
    // /reconcile responded, so the card-refresh signal must fire anyway —
    // otherwise a just-granted player keeps a live buy CTA all session
    // (the once-per-session latch blocks any retry).
    consumePurchase.mockImplementation(() => new Promise(() => {}));

    schedulePaymentsReconciliation();
    await flushAsync();

    expect(consumePurchase).toHaveBeenCalledWith("tok-1");
    expect(reconciledEvents).toBe(1);
  });

  it("fires nothing when the server returns no processed tokens", async () => {
    reconcile.mockResolvedValue(okAnswer());

    schedulePaymentsReconciliation();
    await flushAsync();

    expect(consumePurchase).not.toHaveBeenCalled();
    expect(reconciledEvents).toBe(0);
  });

  it("fires nothing when the reconcile call fails", async () => {
    reconcile.mockResolvedValue({ kind: "failed" });

    schedulePaymentsReconciliation();
    await flushAsync();

    expect(consumePurchase).not.toHaveBeenCalled();
    expect(reconciledEvents).toBe(0);
  });

  it("fires nothing when there are no pending purchases", async () => {
    getSignedPurchases.mockResolvedValue(null);

    schedulePaymentsReconciliation();
    await flushAsync();

    expect(reconcile).not.toHaveBeenCalled();
    expect(reconciledEvents).toBe(0);
  });

  it("does nothing unless the catalog is ready", async () => {
    getPaymentsCatalogStatus.mockReturnValue("failed");

    schedulePaymentsReconciliation();
    await flushAsync();

    expect(getSignedPurchases).not.toHaveBeenCalled();
    expect(reconciledEvents).toBe(0);
  });

  it("runs at most once per session (latch)", async () => {
    schedulePaymentsReconciliation();
    schedulePaymentsReconciliation();
    await flushAsync();

    expect(reconcile).toHaveBeenCalledTimes(1);
    expect(reconciledEvents).toBe(1);
  });
});

// Task 0495: reconcile right now, for a guest who just logged in to buy.
describe("reconcilePurchasesNow", () => {
  let reconciledEvents: number;
  const onReconciled = () => {
    reconciledEvents += 1;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    resetPaymentsReconciliationForTests();
    reconciledEvents = 0;
    window.addEventListener(PURCHASES_RECONCILED_EVENT, onReconciled);
    getPaymentsCatalogStatus.mockReturnValue("ready");
    isCitizenshipSurfacesEnabled.mockResolvedValue(true);
    getSignedPurchases.mockResolvedValue({ signature: "sig.list" });
    getSignedPurchasesResult.mockResolvedValue({
      kind: "signed",
      signature: "sig.list",
    });
    ensureSessionMock.mockResolvedValue("session-token");
    reconcile.mockResolvedValue(
      okAnswer({
        processedTokens: ["tok-1", "tok-2"],
        grantedTokens: ["tok-1", "tok-2"],
        consumeTokens: ["tok-1", "tok-2"],
      }),
    );
    consumePurchase.mockResolvedValue(undefined);
  });

  afterEach(() => {
    window.removeEventListener(PURCHASES_RECONCILED_EVENT, onReconciled);
    jest.useRealTimers();
  });

  it("kill switch off → failed, with no POST", async () => {
    isCitizenshipSurfacesEnabled.mockResolvedValue(false);

    await expect(reconcilePurchasesNow(10_000)).resolves.toBe("failed");
    expect(getSignedPurchasesResult).not.toHaveBeenCalled();
    expect(reconcile).not.toHaveBeenCalled();
  });

  it("catalog not ready or an SDK failure (the facade says failed) → failed, with no POST", async () => {
    getSignedPurchasesResult.mockResolvedValue({ kind: "failed" });

    await expect(reconcilePurchasesNow(10_000)).resolves.toBe("failed");
    expect(reconcile).not.toHaveBeenCalled();
  });

  it("nothing pending → none, with no POST", async () => {
    getSignedPurchasesResult.mockResolvedValue({ kind: "none" });

    await expect(reconcilePurchasesNow(10_000)).resolves.toBe("none");
    expect(reconcile).not.toHaveBeenCalled();
    expect(reconciledEvents).toBe(0);
  });

  it("processed → processed: the event fires, and the consumes do not block it", async () => {
    consumePurchase.mockReturnValue(new Promise(() => {}));

    await expect(reconcilePurchasesNow(10_000)).resolves.toBe("processed");
    expect(reconcile).toHaveBeenCalledWith("sig.list", "session-token");
    expect(reconciledEvents).toBe(1);
    expect(consumePurchase).toHaveBeenCalledWith("tok-1");
  });

  it("an empty answer → none, no event", async () => {
    reconcile.mockResolvedValue(okAnswer());

    await expect(reconcilePurchasesNow(10_000)).resolves.toBe("none");
    expect(reconciledEvents).toBe(0);
  });

  it("only purchases granted earlier → none (processed means fresh), no event, no consume", async () => {
    reconcile.mockResolvedValue(
      okAnswer({ processedTokens: ["tok-1"], grantedTokens: [] }),
    );

    await expect(reconcilePurchasesNow(10_000)).resolves.toBe("none");
    await flushAsync();
    expect(reconciledEvents).toBe(0);
    expect(consumePurchase).not.toHaveBeenCalled();
  });

  it("an old box → processed on processedTokens, consumes nothing", async () => {
    reconcile.mockResolvedValue(
      okAnswer({ processedTokens: ["tok-1"], grantedTokens: null }),
    );

    await expect(reconcilePurchasesNow(10_000)).resolves.toBe("processed");
    await flushAsync();
    expect(reconciledEvents).toBe(1);
    expect(consumePurchase).not.toHaveBeenCalled();
  });

  it("held elsewhere → held_elsewhere, and the store has it before the result", async () => {
    reconcile.mockResolvedValue(okAnswer({ heldElsewhere: ["citizenship"] }));

    await expect(reconcilePurchasesNow(10_000)).resolves.toBe("held_elsewhere");
    expect(getHeldElsewhereProducts().has("citizenship")).toBe(true);
    expect(reconciledEvents).toBe(0);
  });

  it.each<[string, Record<string, unknown>, string]>([
    [
      "pending_ungranted beats held_elsewhere and processed",
      {
        failedCount: 1,
        heldElsewhere: ["citizenship"],
        grantedTokens: ["tok-1"],
      },
      "pending_ungranted",
    ],
    [
      "held_elsewhere beats processed",
      { heldElsewhere: ["citizenship"], grantedTokens: ["tok-1"] },
      "held_elsewhere",
    ],
  ])("precedence: %s", async (_label, fields, expected) => {
    reconcile.mockResolvedValue(okAnswer(fields));
    await expect(reconcilePurchasesNow(10_000)).resolves.toBe(expected);
  });

  it("HeldOnOtherProfile fires once per page across both passes", async () => {
    reconcile.mockResolvedValue(okAnswer({ heldElsewhere: ["citizenship"] }));
    schedulePaymentsReconciliation();
    await flushAsync();
    await reconcilePurchasesNow(10_000);
    await reconcilePurchasesNow(10_000);
    expect(heldEventCount()).toBe(1);
  });

  it("failedCount > 0 → pending_ungranted; the processed tokens are still signalled and consumed (OQ-1)", async () => {
    reconcile.mockResolvedValue(
      okAnswer({
        processedTokens: ["tok-1"],
        grantedTokens: ["tok-1"],
        consumeTokens: ["tok-1"],
        failedCount: 1,
      }),
    );

    await expect(reconcilePurchasesNow(10_000)).resolves.toBe(
      "pending_ungranted",
    );
    await flushAsync();
    expect(reconciledEvents).toBe(1);
    expect(consumePurchase).toHaveBeenCalledWith("tok-1");
  });

  it("failedCount > 0 with nothing processed → pending_ungranted, no event", async () => {
    reconcile.mockResolvedValue(okAnswer({ failedCount: 2 }));

    await expect(reconcilePurchasesNow(10_000)).resolves.toBe(
      "pending_ungranted",
    );
    expect(reconciledEvents).toBe(0);
  });

  it("an HTTP failure → failed, never pending_ungranted (review R1)", async () => {
    reconcile.mockResolvedValue({ kind: "failed" });

    await expect(reconcilePurchasesNow(10_000)).resolves.toBe("failed");
  });

  it("a throw anywhere → failed, never a rejection", async () => {
    getSignedPurchasesResult.mockRejectedValue(new Error("boom"));

    await expect(reconcilePurchasesNow(10_000)).resolves.toBe("failed");
  });

  it("no answer in time → timeout; a late finish still signals and consumes", async () => {
    jest.useFakeTimers();
    let answer: (value: unknown) => void = () => {};
    reconcile.mockReturnValue(
      new Promise((resolve) => {
        answer = resolve;
      }),
    );

    const result = reconcilePurchasesNow(10_000);
    await jest.advanceTimersByTimeAsync(10_000);
    await expect(result).resolves.toBe("timeout");

    answer(
      okAnswer({
        processedTokens: ["tok-1"],
        grantedTokens: ["tok-1"],
        consumeTokens: ["tok-1"],
      }),
    );
    await flushAsync();
    expect(reconciledEvents).toBe(1);
    expect(consumePurchase).toHaveBeenCalledWith("tok-1");
  });

  it("ignores the once-per-session latch: runs after the boot pass, and twice", async () => {
    schedulePaymentsReconciliation();
    await flushAsync();
    expect(reconcile).toHaveBeenCalledTimes(1);

    await reconcilePurchasesNow(10_000);
    await reconcilePurchasesNow(10_000);

    expect(reconcile).toHaveBeenCalledTimes(3);
  });
});
