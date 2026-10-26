/**
 * @jest-environment jsdom
 */
// Task 0494 (spec §4.3 step 11, §10; ADR-125): the shared purchase flow for any
// product. Its analytics come from the product's config, and it is the only
// purchase dispatch of the restart offer — once after every grant, never
// otherwise. A test-only product proves the flow is not citizenship-shaped.
jest.mock("../../src/client/flashist/FlashistFacade", () => ({
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
jest.mock("../../src/client/ProductClientConfig", () => {
  const configFor = (name: string) => ({
    analytics: {
      started: `Purchase:Started:${name}`,
      completed: `Purchase:Completed:${name}`,
      abandoned: `Purchase:Abandoned:${name}`,
      restartPrompt: {
        shown: `${name}:RestartPrompt:Shown`,
        restart: `${name}:RestartPrompt:Restart`,
        later: `${name}:RestartPrompt:Later`,
      },
    },
    restartPromptTitleKey: `${name}.title`,
    restartPromptBodyKey: `${name}.body`,
    isUiEnabled: null,
  });
  return {
    getProductClientConfig: jest.fn((productId: string) =>
      configFor(productId === "citizenship" ? "Citizenship" : "TestItem"),
    ),
  };
});

import type { PaymentProductId } from "../../src/core/profile/PaymentsContract";
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
import { runProductPurchase } from "../../src/client/ProductPurchase";

const TEST_ITEM = "test_item" as unknown as PaymentProductId;

const purchaseCatalogItem = FlashistFacade.instance
  .purchaseCatalogItem as jest.Mock;
const consumePurchase = FlashistFacade.instance.consumePurchase as jest.Mock;
const logEventAnalytics = flashist_logEventAnalytics as jest.Mock;
const createIntent = createPurchaseIntent as jest.Mock;
const complete = completePurchase as jest.Mock;

const loggedEvents = (): string[] =>
  logEventAnalytics.mock.calls.map((call) => call[0] as string);

let signals: CitizenshipGrantedMidSessionDetail[] = [];
const onSignal = (event: Event) => {
  signals.push(
    (event as CustomEvent<CitizenshipGrantedMidSessionDetail>).detail,
  );
};

describe("runProductPurchase", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetPlatformDialogPresenceForTests();
    signals = [];
    window.addEventListener(CITIZENSHIP_GRANTED_MID_SESSION_EVENT, onSignal);
    createIntent.mockResolvedValue({ kind: "ok", intentId: "intent-1" });
    purchaseCatalogItem.mockResolvedValue({ signature: "sig.payload" });
    complete.mockResolvedValue({ success: true, purchaseToken: "tok-1" });
    consumePurchase.mockResolvedValue(undefined);
  });

  afterEach(() => {
    window.removeEventListener(CITIZENSHIP_GRANTED_MID_SESSION_EVENT, onSignal);
  });

  it("uses the product's id and its configured analytics", async () => {
    await expect(runProductPurchase(TEST_ITEM)).resolves.toBe("granted");

    expect(createIntent).toHaveBeenCalledWith(TEST_ITEM);
    expect(purchaseCatalogItem).toHaveBeenCalledWith(TEST_ITEM, "intent-1");
    expect(loggedEvents()).toEqual([
      "Purchase:Started:TestItem",
      "Purchase:Completed:TestItem",
    ]);
  });

  it.each<[string, boolean | undefined, boolean | null]>([
    ["true", true, true],
    ["false (already a paid citizen)", false, false],
    ["missing (an older profile box)", undefined, null],
  ])(
    "becamePaidCitizen %s: granted, and the restart offer fires exactly once",
    async (_label, fromBox, expected) => {
      complete.mockResolvedValue({
        success: true,
        purchaseToken: "tok-1",
        ...(fromBox === undefined ? {} : { becamePaidCitizen: fromBox }),
      });

      await expect(runProductPurchase(TEST_ITEM)).resolves.toBe("granted");

      expect(signals).toEqual([
        {
          source: "purchase",
          productId: TEST_ITEM,
          becamePaidCitizen: expected,
        },
      ]);
    },
  );

  it.each<PaymentProductId>(["citizenship", TEST_ITEM])(
    "one restart offer per grant for %s",
    async (productId) => {
      await runProductPurchase(productId);
      await runProductPurchase(productId);

      expect(signals).toHaveLength(2);
      expect(
        signals.every((s) => "productId" in s && s.productId === productId),
      ).toBe(true);
    },
  );

  it("409 already_owned: already_owned, no frame, no Started, no restart offer", async () => {
    createIntent.mockResolvedValue({ kind: "already_owned" });

    await expect(runProductPurchase(TEST_ITEM)).resolves.toBe("already_owned");

    expect(purchaseCatalogItem).not.toHaveBeenCalled();
    expect(loggedEvents()).toEqual([]);
    expect(signals).toEqual([]);
  });

  it.each<[string, () => void]>([
    ["intent failed", () => createIntent.mockResolvedValue({ kind: "failed" })],
    [
      "frame rejected",
      () => purchaseCatalogItem.mockRejectedValue(new Error("closed")),
    ],
    ["missing signature", () => purchaseCatalogItem.mockResolvedValue({})],
    ["complete failed", () => complete.mockResolvedValue(null)],
  ])("%s: error and no restart offer", async (_label, breakLink) => {
    breakLink();

    await expect(runProductPurchase(TEST_ITEM)).resolves.toBe("error");

    expect(signals).toEqual([]);
  });

  it("a frame failure logs the product's Abandoned", async () => {
    purchaseCatalogItem.mockRejectedValue(new Error("closed"));

    await runProductPurchase(TEST_ITEM);

    expect(loggedEvents()).toEqual([
      "Purchase:Started:TestItem",
      "Purchase:Abandoned:TestItem",
    ]);
  });

  it("consume is not awaited: a hung consume still returns granted and fires the offer", async () => {
    consumePurchase.mockImplementation(() => new Promise(() => {}));

    await expect(runProductPurchase(TEST_ITEM)).resolves.toBe("granted");

    expect(consumePurchase).toHaveBeenCalledWith("tok-1");
    expect(signals).toHaveLength(1);
  });

  it("marks a platform dialog from the intent through /complete, closed afterwards", async () => {
    const seen: boolean[] = [];
    createIntent.mockImplementation(async () => {
      seen.push(isPlatformDialogOpen());
      return { kind: "ok", intentId: "intent-1" };
    });
    complete.mockImplementation(async () => {
      seen.push(isPlatformDialogOpen());
      return { success: true, purchaseToken: "tok-1" };
    });

    await runProductPurchase(TEST_ITEM);

    expect(seen).toEqual([true, true]);
    expect(isPlatformDialogOpen()).toBe(false);
  });

  it("closes the platform dialog when a step throws", async () => {
    complete.mockRejectedValue(new Error("boom"));

    await expect(runProductPurchase(TEST_ITEM)).rejects.toThrow("boom");
    expect(isPlatformDialogOpen()).toBe(false);
    expect(signals).toEqual([]);
  });
});
