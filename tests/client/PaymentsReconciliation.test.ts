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
      consumePurchase: jest.fn(),
    },
  },
}));
jest.mock("../../src/client/PaymentsApiClient", () => ({
  reconcilePurchases: jest.fn(),
}));

import { FlashistFacade } from "../../src/client/flashist/FlashistFacade";
import { reconcilePurchases } from "../../src/client/PaymentsApiClient";
import {
  PURCHASES_RECONCILED_EVENT,
  resetPaymentsReconciliationForTests,
  schedulePaymentsReconciliation,
} from "../../src/client/PaymentsReconciliation";

const getPaymentsCatalogStatus = FlashistFacade.instance
  .getPaymentsCatalogStatus as jest.Mock;
const getSignedPurchases = FlashistFacade.instance
  .getSignedPurchases as jest.Mock;
const consumePurchase = FlashistFacade.instance.consumePurchase as jest.Mock;
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
    getSignedPurchases.mockResolvedValue({ signature: "sig.list" });
    reconcile.mockResolvedValue(["tok-1", "tok-2"]);
    consumePurchase.mockResolvedValue(undefined);
  });

  afterEach(() => {
    window.removeEventListener(PURCHASES_RECONCILED_EVENT, onReconciled);
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
    reconcile.mockResolvedValue([]);

    schedulePaymentsReconciliation();
    await flushAsync();

    expect(consumePurchase).not.toHaveBeenCalled();
    expect(reconciledEvents).toBe(0);
  });

  it("fires nothing when the reconcile call fails", async () => {
    reconcile.mockResolvedValue(null);

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
