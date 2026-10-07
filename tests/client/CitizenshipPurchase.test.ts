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
  CITIZENSHIP_GRANTED_MID_SESSION_EVENT,
  type CitizenshipGrantedMidSessionDetail,
} from "../../src/client/CitizenshipRestartOffer";
import {
  FlashistFacade,
  flashist_logEventAnalytics,
} from "../../src/client/flashist/FlashistFacade";
import {
  completePurchase,
  createPurchaseIntent,
} from "../../src/client/PaymentsApiClient";
import {
  isPlatformDialogOpen,
  resetPlatformDialogPresenceForTests,
} from "../../src/client/PlatformDialogPresence";

const purchaseCatalogItem = FlashistFacade.instance
  .purchaseCatalogItem as jest.Mock;
const consumePurchase = FlashistFacade.instance.consumePurchase as jest.Mock;
const logEventAnalytics = flashist_logEventAnalytics as jest.Mock;
const createIntent = createPurchaseIntent as jest.Mock;
const complete = completePurchase as jest.Mock;

/** The event strings logged, in order. */
const loggedEvents = (): string[] =>
  logEventAnalytics.mock.calls.map((call) => call[0] as string);

// Task 0303: the "restart to apply" signal, recorded per test.
let grantedSignals: CitizenshipGrantedMidSessionDetail[] = [];
const onGrantedSignal = (event: Event) => {
  grantedSignals.push(
    (event as CustomEvent<CitizenshipGrantedMidSessionDetail>).detail,
  );
};

describe("runCitizenshipPurchase", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    grantedSignals = [];
    window.addEventListener(
      CITIZENSHIP_GRANTED_MID_SESSION_EVENT,
      onGrantedSignal,
    );
    // Happy-path defaults; individual tests break one link at a time.
    createIntent.mockResolvedValue("intent-uuid");
    purchaseCatalogItem.mockResolvedValue({ signature: "sig.payload" });
    complete.mockResolvedValue({ success: true, purchaseToken: "tok-1" });
    consumePurchase.mockResolvedValue(undefined);
  });

  afterEach(() => {
    window.removeEventListener(
      CITIZENSHIP_GRANTED_MID_SESSION_EVENT,
      onGrantedSignal,
    );
  });

  it("granted: fires the restart-offer signal once, with source purchase (task 0303)", async () => {
    await expect(runCitizenshipPurchase()).resolves.toBe("granted");

    expect(grantedSignals).toEqual([{ source: "purchase" }]);
  });

  it("a HUNG consume still fires the restart-offer signal (task 0303)", async () => {
    consumePurchase.mockImplementation(() => new Promise(() => {}));

    await expect(runCitizenshipPurchase()).resolves.toBe("granted");

    expect(grantedSignals).toEqual([{ source: "purchase" }]);
  });

  it.each([
    [
      "no intent",
      () => {
        createIntent.mockResolvedValue(null);
      },
    ],
    [
      "frame rejected",
      () => {
        purchaseCatalogItem.mockRejectedValue(new Error("frame closed"));
      },
    ],
    [
      "missing signature",
      () => {
        purchaseCatalogItem.mockResolvedValue({});
      },
    ],
    [
      "failed completion",
      () => {
        complete.mockResolvedValue(null);
      },
    ],
  ])(
    "%s: no restart-offer signal (task 0303)",
    async (_label, breakOneLink) => {
      breakOneLink();

      await expect(runCitizenshipPurchase()).resolves.toBe("error");

      expect(grantedSignals).toEqual([]);
    },
  );

  it("happy path: intent → purchase → complete → consume, Started then Completed", async () => {
    await expect(runCitizenshipPurchase()).resolves.toBe("granted");

    expect(createIntent).toHaveBeenCalledWith("citizenship");
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

  // Since S4 (task 0273) the flow no longer reads the Yandex id at all — the
  // identity travels as the Bearer token inside createPurchaseIntent. A guest,
  // a failed login and a failed /intent all arrive here as a null intent.
  it("intent creation fails (incl. no session): error, frame never opened, no Started and no Abandoned", async () => {
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

// Task 0404: the whole flow — intent through /complete — counts as an open
// platform dialog, so the forced "please refresh" popup waits for it.
describe("runCitizenshipPurchase marks a platform dialog (task 0404)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetPlatformDialogPresenceForTests();
    createIntent.mockResolvedValue("intent-uuid");
    purchaseCatalogItem.mockResolvedValue({ signature: "sig.payload" });
    complete.mockResolvedValue({ success: true, purchaseToken: "tok-1" });
    consumePurchase.mockResolvedValue(undefined);
  });

  it("open while the intent, the payment frame and /complete run", async () => {
    const seen: boolean[] = [];
    createIntent.mockImplementation(async () => {
      seen.push(isPlatformDialogOpen());
      return "intent-uuid";
    });
    purchaseCatalogItem.mockImplementation(async () => {
      seen.push(isPlatformDialogOpen());
      return { signature: "sig.payload" };
    });
    complete.mockImplementation(async () => {
      seen.push(isPlatformDialogOpen());
      return { success: true, purchaseToken: "tok-1" };
    });

    await expect(runCitizenshipPurchase()).resolves.toBe("granted");

    expect(seen).toEqual([true, true, true]);
    expect(isPlatformDialogOpen()).toBe(false);
  });

  it.each<[string, () => void, string]>([
    ["granted", () => {}, "granted"],
    [
      "intent null",
      () => {
        createIntent.mockResolvedValue(null);
      },
      "error",
    ],
    [
      "frame abandoned",
      () => {
        purchaseCatalogItem.mockRejectedValue(new Error("frame closed"));
      },
      "error",
    ],
    [
      "complete null",
      () => {
        complete.mockResolvedValue(null);
      },
      "error",
    ],
    [
      "a hung consume",
      () => {
        consumePurchase.mockImplementation(() => new Promise(() => {}));
      },
      "granted",
    ],
  ])("closed afterwards: %s", async (_label, breakLink, expected) => {
    breakLink();
    await expect(runCitizenshipPurchase()).resolves.toBe(expected);
    expect(isPlatformDialogOpen()).toBe(false);
  });

  it("closed afterwards when a step throws", async () => {
    complete.mockRejectedValue(new Error("boom"));
    await expect(runCitizenshipPurchase()).rejects.toThrow("boom");
    expect(isPlatformDialogOpen()).toBe(false);
  });
});
