/**
 * @jest-environment jsdom
 */
// Session-start reconciliation (task 0019) + the 0018 refresh signal: after
// reconciliation processed ≥1 purchase, PURCHASES_RECONCILED_EVENT fires on
// window so profile consumers (citizenship card) re-fetch instead of keeping
// a stale State 2 with a live buy button.
jest.mock("../../src/client/flashist/FlashistFacade", () => ({
  flashist_waitGameInitComplete: jest.fn().mockResolvedValue(undefined),
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

import { CITIZENSHIP_GRANTED_MID_SESSION_EVENT } from "../../src/client/CitizenshipRestartOffer";
import { FlashistFacade } from "../../src/client/flashist/FlashistFacade";
import { reconcilePurchases } from "../../src/client/PaymentsApiClient";
import {
  PURCHASES_RECONCILED_EVENT,
  reconcilePurchasesNow,
  resetPaymentsReconciliationForTests,
  schedulePaymentsReconciliation,
} from "../../src/client/PaymentsReconciliation";

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
    reconcile.mockResolvedValue({
      kind: "ok",
      processedTokens: ["tok-1", "tok-2"],
    });
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

  it("consumes every returned token and fires the reconciled event once", async () => {
    schedulePaymentsReconciliation();
    await flushAsync();

    expect(reconcile).toHaveBeenCalledWith("sig.list");
    expect(consumePurchase).toHaveBeenCalledTimes(2);
    expect(consumePurchase).toHaveBeenNthCalledWith(1, "tok-1");
    expect(consumePurchase).toHaveBeenNthCalledWith(2, "tok-2");
    expect(reconciledEvents).toBe(1);
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
    reconcile.mockResolvedValue({ kind: "ok", processedTokens: [] });

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
    reconcile.mockResolvedValue({
      kind: "ok",
      processedTokens: ["tok-1", "tok-2"],
      failedCount: 0,
    });
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
    expect(reconcile).toHaveBeenCalledWith("sig.list");
    expect(reconciledEvents).toBe(1);
    expect(consumePurchase).toHaveBeenCalledWith("tok-1");
  });

  it("an empty answer → none, no event", async () => {
    reconcile.mockResolvedValue({
      kind: "ok",
      processedTokens: [],
      failedCount: 0,
    });

    await expect(reconcilePurchasesNow(10_000)).resolves.toBe("none");
    expect(reconciledEvents).toBe(0);
  });

  it("failedCount > 0 → pending_ungranted; the processed tokens are still signalled and consumed (OQ-1)", async () => {
    reconcile.mockResolvedValue({
      kind: "ok",
      processedTokens: ["tok-1"],
      failedCount: 1,
    });

    await expect(reconcilePurchasesNow(10_000)).resolves.toBe(
      "pending_ungranted",
    );
    await flushAsync();
    expect(reconciledEvents).toBe(1);
    expect(consumePurchase).toHaveBeenCalledWith("tok-1");
  });

  it("failedCount > 0 with nothing processed → pending_ungranted, no event", async () => {
    reconcile.mockResolvedValue({
      kind: "ok",
      processedTokens: [],
      failedCount: 2,
    });

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

    answer({ kind: "ok", processedTokens: ["tok-1"], failedCount: 0 });
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
