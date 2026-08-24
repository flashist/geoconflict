/**
 * @jest-environment jsdom
 */
// Purchase-flow orchestration tests (task 0018): the analytics contract
// (Started as the frame opens; exactly one of Completed/Abandoned per started
// flow; nothing pre-frame) and the sequencing over 0019's payments seam.
jest.mock("../../src/client/flashist/FlashistFacade", () => ({
  flashistConstants: {
    analyticEvents: {
      PURCHASE_STARTED_CITIZENSHIP: "Purchase:Started:Citizenship",
      PURCHASE_COMPLETED_CITIZENSHIP: "Purchase:Completed:Citizenship",
      PURCHASE_ABANDONED_CITIZENSHIP: "Purchase:Abandoned:Citizenship",
    },
  },
  flashist_logEventAnalytics: jest.fn(),
  FlashistFacade: {
    instance: {
      getYandexUniqueId: jest.fn(),
      purchaseCatalogItem: jest.fn(),
      consumePurchase: jest.fn(),
    },
  },
}));
jest.mock("../../src/client/PaymentsApiClient", () => ({
  createPurchaseIntent: jest.fn(),
  completePurchase: jest.fn(),
}));

import { runCitizenshipPurchase } from "../../src/client/CitizenshipPurchase";
import {
  FlashistFacade,
  flashist_logEventAnalytics,
} from "../../src/client/flashist/FlashistFacade";
import {
  completePurchase,
  createPurchaseIntent,
} from "../../src/client/PaymentsApiClient";

const getYandexUniqueId = FlashistFacade.instance
  .getYandexUniqueId as jest.Mock;
const purchaseCatalogItem = FlashistFacade.instance
  .purchaseCatalogItem as jest.Mock;
const consumePurchase = FlashistFacade.instance.consumePurchase as jest.Mock;
const logEventAnalytics = flashist_logEventAnalytics as jest.Mock;
const createIntent = createPurchaseIntent as jest.Mock;
const complete = completePurchase as jest.Mock;

/** The event strings logged, in order. */
const loggedEvents = (): string[] =>
  logEventAnalytics.mock.calls.map((call) => call[0] as string);

describe("runCitizenshipPurchase", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Happy-path defaults; individual tests break one link at a time.
    getYandexUniqueId.mockResolvedValue("player-1");
    createIntent.mockResolvedValue("intent-uuid");
    purchaseCatalogItem.mockResolvedValue({ signature: "sig.payload" });
    complete.mockResolvedValue({ success: true, purchaseToken: "tok-1" });
    consumePurchase.mockResolvedValue(undefined);
  });

  it("happy path: intent → purchase → complete → consume, Started then Completed", async () => {
    await expect(runCitizenshipPurchase()).resolves.toBe("granted");

    expect(createIntent).toHaveBeenCalledWith("player-1", "citizenship");
    expect(purchaseCatalogItem).toHaveBeenCalledWith(
      "citizenship",
      "intent-uuid",
    );
    expect(complete).toHaveBeenCalledWith("sig.payload");
    expect(consumePurchase).toHaveBeenCalledWith("tok-1");
    expect(loggedEvents()).toEqual([
      "Purchase:Started:Citizenship",
      "Purchase:Completed:Citizenship",
    ]);
    // Started fires BEFORE the payment frame opens (0021 §3).
    expect(logEventAnalytics.mock.invocationCallOrder[0]).toBeLessThan(
      purchaseCatalogItem.mock.invocationCallOrder[0],
    );
    // Completed (server-confirmed) fires before the best-effort consume.
    expect(logEventAnalytics.mock.invocationCallOrder[1]).toBeLessThan(
      consumePurchase.mock.invocationCallOrder[0],
    );
  });

  it("no Yandex id: error, nothing called, no events", async () => {
    getYandexUniqueId.mockResolvedValue(null);

    await expect(runCitizenshipPurchase()).resolves.toBe("error");

    expect(createIntent).not.toHaveBeenCalled();
    expect(purchaseCatalogItem).not.toHaveBeenCalled();
    expect(loggedEvents()).toEqual([]);
  });

  it("intent creation fails: error, frame never opened, no Started and no Abandoned", async () => {
    createIntent.mockResolvedValue(null);

    await expect(runCitizenshipPurchase()).resolves.toBe("error");

    expect(purchaseCatalogItem).not.toHaveBeenCalled();
    expect(loggedEvents()).toEqual([]);
  });

  it("purchase() rejects (frame closed / SDK error): Started then Abandoned, no /complete", async () => {
    purchaseCatalogItem.mockRejectedValue(new Error("frame closed"));

    await expect(runCitizenshipPurchase()).resolves.toBe("error");

    expect(complete).not.toHaveBeenCalled();
    expect(consumePurchase).not.toHaveBeenCalled();
    expect(loggedEvents()).toEqual([
      "Purchase:Started:Citizenship",
      "Purchase:Abandoned:Citizenship",
    ]);
  });

  it("purchase() resolves without a signature: treated as abandoned, no /complete", async () => {
    purchaseCatalogItem.mockResolvedValue({});

    await expect(runCitizenshipPurchase()).resolves.toBe("error");

    expect(complete).not.toHaveBeenCalled();
    expect(loggedEvents()).toEqual([
      "Purchase:Started:Citizenship",
      "Purchase:Abandoned:Citizenship",
    ]);
  });

  it("server /complete fails: Started then Abandoned, purchase left unconsumed for reconciliation", async () => {
    complete.mockResolvedValue(null);

    await expect(runCitizenshipPurchase()).resolves.toBe("error");

    expect(consumePurchase).not.toHaveBeenCalled();
    expect(loggedEvents()).toEqual([
      "Purchase:Started:Citizenship",
      "Purchase:Abandoned:Citizenship",
    ]);
  });

  it("failed consume after a confirmed grant is swallowed: still granted, Completed stands", async () => {
    consumePurchase.mockRejectedValue(new Error("consume failed"));

    await expect(runCitizenshipPurchase()).resolves.toBe("granted");

    expect(loggedEvents()).toEqual([
      "Purchase:Started:Citizenship",
      "Purchase:Completed:Citizenship",
    ]);
  });

  it("a HUNG consume never blocks the granted result (review R2)", async () => {
    // The SDK call never settles — the codebase treats hung SDK calls as real
    // (platform-init deadline). The flow must still resolve "granted": the
    // server committed the grant, and the card's latch must not stay held.
    consumePurchase.mockImplementation(() => new Promise(() => {}));

    await expect(runCitizenshipPurchase()).resolves.toBe("granted");

    // Consume-after-grant ordering preserved: the call was still made, after
    // the server-confirmed Completed signal.
    expect(consumePurchase).toHaveBeenCalledWith("tok-1");
    expect(loggedEvents()).toEqual([
      "Purchase:Started:Citizenship",
      "Purchase:Completed:Citizenship",
    ]);
    expect(logEventAnalytics.mock.invocationCallOrder[1]).toBeLessThan(
      consumePurchase.mock.invocationCallOrder[0],
    );
  });
});
