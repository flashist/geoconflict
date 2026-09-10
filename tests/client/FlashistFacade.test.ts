/**
 * @jest-environment jsdom
 */
import {
  FlashistFacade,
  flashistConstants,
} from "../../src/client/flashist/FlashistFacade";

// The facade constructor runs platform detection and analytics wiring, so the
// formula is tested on a bare prototype instance with just the relevant
// fields set (yandexSdkPlayerObject is protected — hence Object.assign).
// NOTE: class-field initializers don't run on Object.create, so payments state
// is seeded explicitly in makePaymentsFacade below.
function makeFacade(fields: {
  yaGamesAvailable: boolean;
  yandexGamesSDK?: unknown;
  yandexSdkPlayerObject?: unknown;
}): FlashistFacade {
  return Object.assign(
    Object.create(FlashistFacade.prototype),
    fields,
  ) as FlashistFacade;
}

/** Facade with the payments class-field state seeded (constructor is skipped). */
function makePaymentsFacade(fields: {
  yaGamesAvailable: boolean;
  yandexGamesSDK?: unknown;
}): FlashistFacade {
  return Object.assign(Object.create(FlashistFacade.prototype), {
    yandexInitPromise: Promise.resolve(),
    paymentsObject: null,
    paymentsCatalog: [],
    paymentsCatalogById: new Map(),
    paymentsCatalogStatus: "idle",
    ...fields,
  }) as FlashistFacade;
}

const initPayments = (facade: FlashistFacade): Promise<void> =>
  (facade as unknown as { initPayments(): Promise<void> }).initPayments();

const CITIZENSHIP_PRODUCT = {
  id: "citizenship",
  title: "Гражданство",
  description: "",
  imageURI: "",
  price: "99 YAN",
  priceValue: "99",
  priceCurrencyCode: "YAN",
  getPriceCurrencyImage: () => "",
};

const guestPlayer = { isAuthorized: () => false };

describe("FlashistFacade.isYandexDegraded", () => {
  it("is true when YaGames.init() never produced an SDK", () => {
    expect(makeFacade({ yaGamesAvailable: true }).isYandexDegraded()).toBe(
      true,
    );
  });

  it("is true when the SDK is present but the boot player fetch never completed", () => {
    expect(
      makeFacade({
        yaGamesAvailable: true,
        yandexGamesSDK: {},
      }).isYandexDegraded(),
    ).toBe(true);
  });

  it("is false for a real logged-out guest (SDK and player object present)", () => {
    expect(
      makeFacade({
        yaGamesAvailable: true,
        yandexGamesSDK: {},
        yandexSdkPlayerObject: guestPlayer,
      }).isYandexDegraded(),
    ).toBe(false);
  });

  it("is false for an authorized player", () => {
    expect(
      makeFacade({
        yaGamesAvailable: true,
        yandexGamesSDK: {},
        yandexSdkPlayerObject: { isAuthorized: () => true },
      }).isYandexDegraded(),
    ).toBe(false);
  });

  it("is false in a standalone/no-Yandex context, whatever the other fields", () => {
    expect(makeFacade({ yaGamesAvailable: false }).isYandexDegraded()).toBe(
      false,
    );
    expect(
      makeFacade({
        yaGamesAvailable: false,
        yandexGamesSDK: {},
        yandexSdkPlayerObject: guestPlayer,
      }).isYandexDegraded(),
    ).toBe(false);
  });
});

describe("FlashistFacade payments (task 0019)", () => {
  it("is 'unavailable' outside Yandex Games, with inert helpers and no errors", async () => {
    const facade = makePaymentsFacade({ yaGamesAvailable: false });

    await initPayments(facade);

    expect(facade.getPaymentsCatalogStatus()).toBe("unavailable");
    expect(facade.hasCatalogProduct("citizenship")).toBe(false);
    expect(facade.getCatalogProduct("citizenship")).toBeNull();
    await expect(facade.getSignedPurchases()).resolves.toBeNull();
    await expect(facade.consumePurchase("tok")).resolves.toBeUndefined();
    await expect(
      facade.purchaseCatalogItem("citizenship", "intent-1"),
    ).rejects.toThrow("payments_not_ready");
  });

  it("reaches 'ready' with a mocked SDK and serves the catalog", async () => {
    const paymentsObject = {
      getCatalog: jest.fn().mockResolvedValue([CITIZENSHIP_PRODUCT]),
    };
    const sdk = { getPayments: jest.fn().mockResolvedValue(paymentsObject) };
    const facade = makePaymentsFacade({
      yaGamesAvailable: true,
      yandexGamesSDK: sdk,
    });

    await initPayments(facade);

    expect(sdk.getPayments).toHaveBeenCalledWith({ signed: true });
    expect(facade.getPaymentsCatalogStatus()).toBe("ready");
    expect(facade.hasCatalogProduct("citizenship")).toBe(true);
    expect(facade.getCatalogProduct("citizenship")).toEqual(
      CITIZENSHIP_PRODUCT,
    );
    expect(facade.hasCatalogProduct("unknown")).toBe(false);
  });

  it("is 'failed' when the catalog fetch throws, and helpers stay inert", async () => {
    const sdk = {
      getPayments: jest.fn().mockResolvedValue({
        getCatalog: jest.fn().mockRejectedValue(new Error("catalog down")),
      }),
    };
    const facade = makePaymentsFacade({
      yaGamesAvailable: true,
      yandexGamesSDK: sdk,
    });

    await initPayments(facade);

    expect(facade.getPaymentsCatalogStatus()).toBe("failed");
    expect(facade.hasCatalogProduct("citizenship")).toBe(false);
    expect(facade.getCatalogProduct("citizenship")).toBeNull();
  });

  it("is 'failed' when getPayments itself rejects", async () => {
    const sdk = {
      getPayments: jest.fn().mockRejectedValue(new Error("no payments")),
    };
    const facade = makePaymentsFacade({
      yaGamesAvailable: true,
      yandexGamesSDK: sdk,
    });

    await initPayments(facade);
    expect(facade.getPaymentsCatalogStatus()).toBe("failed");
  });

  it("stays 'idle' on a degraded Yandex boot (no SDK yet) and recovers when the SDK arrives", async () => {
    const facade = makePaymentsFacade({ yaGamesAvailable: true });

    await initPayments(facade);
    expect(facade.getPaymentsCatalogStatus()).toBe("idle");

    // Late-SDK recovery path: yandexSdkInit assigns the SDK, then re-calls
    // initPayments — the un-memoized first attempt lets this one fetch for real.
    (facade as unknown as { yandexGamesSDK: unknown }).yandexGamesSDK = {
      getPayments: jest.fn().mockResolvedValue({
        getCatalog: jest.fn().mockResolvedValue([CITIZENSHIP_PRODUCT]),
      }),
    };
    await initPayments(facade);
    expect(facade.getPaymentsCatalogStatus()).toBe("ready");
    expect(facade.hasCatalogProduct("citizenship")).toBe(true);
  });

  it("purchaseCatalogItem passes id + developerPayload and returns the signed result", async () => {
    const purchase = jest.fn().mockResolvedValue({ signature: "sig.payload" });
    const facade = makePaymentsFacade({
      yaGamesAvailable: true,
      yandexGamesSDK: {
        getPayments: jest.fn().mockResolvedValue({
          getCatalog: jest.fn().mockResolvedValue([CITIZENSHIP_PRODUCT]),
          purchase,
        }),
      },
    });
    await initPayments(facade);

    await expect(
      facade.purchaseCatalogItem("citizenship", "intent-uuid"),
    ).resolves.toEqual({ signature: "sig.payload" });
    expect(purchase).toHaveBeenCalledWith({
      id: "citizenship",
      developerPayload: "intent-uuid",
    });
  });

  it("getSignedPurchases: signature when pending purchases exist, null when the list is verifiably empty or the call fails", async () => {
    const pending = Object.assign([{ productID: "citizenship" }], {
      signature: "sig.list",
    });
    const getPurchases = jest.fn().mockResolvedValue(pending);
    const facade = makePaymentsFacade({
      yaGamesAvailable: true,
      yandexGamesSDK: {
        getPayments: jest.fn().mockResolvedValue({
          getCatalog: jest.fn().mockResolvedValue([]),
          getPurchases,
        }),
      },
    });
    await initPayments(facade);

    await expect(facade.getSignedPurchases()).resolves.toEqual({
      signature: "sig.list",
    });

    getPurchases.mockResolvedValue(Object.assign([], { signature: "sig.e" }));
    await expect(facade.getSignedPurchases()).resolves.toBeNull();

    getPurchases.mockRejectedValue(new Error("sdk error"));
    await expect(facade.getSignedPurchases()).resolves.toBeNull();
  });
});

describe("FlashistFacade.whenPaymentsCatalogSettled (task 0018)", () => {
  it("resolves immediately when the catalog already settled", async () => {
    const facade = makePaymentsFacade({ yaGamesAvailable: false });
    await initPayments(facade);

    await expect(facade.whenPaymentsCatalogSettled()).resolves.toBe(
      "unavailable",
    );
  });

  it("stays pending while 'idle' and wakes every waiter when the catalog settles late", async () => {
    // Degraded Yandex boot: no SDK yet, status stays 'idle'.
    const facade = makePaymentsFacade({ yaGamesAvailable: true });
    await initPayments(facade);
    expect(facade.getPaymentsCatalogStatus()).toBe("idle");

    let settled: string | null = null;
    const first = facade
      .whenPaymentsCatalogSettled()
      .then((status) => (settled = status));
    const second = facade.whenPaymentsCatalogSettled();
    // Still pending — the settle must come from the status transition.
    await Promise.resolve();
    expect(settled).toBeNull();

    // Late-SDK recovery lands the catalog for real.
    (facade as unknown as { yandexGamesSDK: unknown }).yandexGamesSDK = {
      getPayments: jest.fn().mockResolvedValue({
        getCatalog: jest.fn().mockResolvedValue([CITIZENSHIP_PRODUCT]),
      }),
    };
    await initPayments(facade);

    await expect(first).resolves.toBe("ready");
    await expect(second).resolves.toBe("ready");
  });

  it("resolves 'failed' waiters too — consumers must not wait forever on a broken catalog", async () => {
    const facade = makePaymentsFacade({ yaGamesAvailable: true });
    const pending = facade.whenPaymentsCatalogSettled();

    (facade as unknown as { yandexGamesSDK: unknown }).yandexGamesSDK = {
      getPayments: jest.fn().mockRejectedValue(new Error("no payments")),
    };
    await initPayments(facade);

    await expect(pending).resolves.toBe("failed");
  });
});

// Task 0236 — the citizenship kill switch's own helper. Every other suite mocks
// the facade module wholesale, so this is the only place the real composition,
// the real sync-snapshot field default, and the real re-prime are exercised.
describe("FlashistFacade citizenship kill switch (task 0236)", () => {
  /** Bare-prototype facade; class fields are NOT initialized (see makeFacade). */
  function makeCitizenshipFacade(
    overrides: Record<string, unknown> = {},
  ): FlashistFacade {
    return Object.assign(Object.create(FlashistFacade.prototype), {
      yandexInitPromise: Promise.resolve(),
      ...overrides,
    }) as FlashistFacade;
  }

  const prime = (facade: FlashistFacade): void =>
    (
      facade as unknown as { primeCitizenshipSurfacesSnapshot(): void }
    ).primeCitizenshipSurfacesSnapshot();

  const launchFlag = flashistConstants.features;
  let originalLaunchFlag: boolean;

  beforeEach(() => {
    originalLaunchFlag = launchFlag.CITIZENSHIP_CARD_ENABLED;
  });

  afterEach(() => {
    // The constant is module-global and shared with every other suite.
    launchFlag.CITIZENSHIP_CARD_ENABLED = originalLaunchFlag;
  });

  describe("layer 1 is absolute (owner ruling 2026-08-21)", () => {
    it("short-circuits WITHOUT reading the remote flag when the launch flag is off", async () => {
      launchFlag.CITIZENSHIP_CARD_ENABLED = false;
      const isCitizenshipUiEnabled = jest.fn().mockResolvedValue(true);
      const facade = makeCitizenshipFacade({ isCitizenshipUiEnabled });

      await expect(facade.isCitizenshipSurfacesEnabled()).resolves.toBe(false);
      // The absoluteness guarantee is that the remote read never HAPPENS —
      // not merely that the result is false. This is what keeps layer 1 ahead
      // of checkExperimentFlag()'s GAME_ENV === "dev" bypass.
      expect(isCitizenshipUiEnabled).not.toHaveBeenCalled();
    });

    it("reads the remote flag only once the launch flag is on", async () => {
      launchFlag.CITIZENSHIP_CARD_ENABLED = true;
      const isCitizenshipUiEnabled = jest.fn().mockResolvedValue(false);
      const facade = makeCitizenshipFacade({ isCitizenshipUiEnabled });

      await expect(facade.isCitizenshipSurfacesEnabled()).resolves.toBe(false);
      expect(isCitizenshipUiEnabled).toHaveBeenCalledTimes(1);
    });

    it("is enabled only when BOTH layers say yes", async () => {
      launchFlag.CITIZENSHIP_CARD_ENABLED = true;
      const facade = makeCitizenshipFacade({
        isCitizenshipUiEnabled: jest.fn().mockResolvedValue(true),
      });

      await expect(facade.isCitizenshipSurfacesEnabled()).resolves.toBe(true);
    });
  });

  describe("the sync snapshot", () => {
    it("is false BEFORE priming — the real field default, fail-closed", () => {
      launchFlag.CITIZENSHIP_CARD_ENABLED = true;
      const facade = makeCitizenshipFacade({
        isCitizenshipUiEnabled: jest.fn().mockResolvedValue(true),
      });

      // Not mocked: this is the actual getter reading the actual field.
      expect(facade.isCitizenshipSurfacesEnabledSync()).toBe(false);
    });

    it("is true after priming resolves", async () => {
      launchFlag.CITIZENSHIP_CARD_ENABLED = true;
      const facade = makeCitizenshipFacade({
        isCitizenshipUiEnabled: jest.fn().mockResolvedValue(true),
      });

      prime(facade);
      await Promise.resolve();
      await Promise.resolve();

      expect(facade.isCitizenshipSurfacesEnabledSync()).toBe(true);
    });

    it("stays false when the remote flag is off", async () => {
      launchFlag.CITIZENSHIP_CARD_ENABLED = true;
      const facade = makeCitizenshipFacade({
        isCitizenshipUiEnabled: jest.fn().mockResolvedValue(false),
      });

      prime(facade);
      await Promise.resolve();
      await Promise.resolve();

      expect(facade.isCitizenshipSurfacesEnabledSync()).toBe(false);
    });
  });

  // R1: a degraded boot primes against no-SDK flags (false); when the SDK
  // recovers, the async helper flips to true, so the snapshot MUST be re-primed
  // or the badge stays hidden for the whole session while the inbox opens.
  describe("late-SDK recovery re-primes the snapshot (review R1)", () => {
    it("refreshes a stale false once the real flags arrive", async () => {
      launchFlag.CITIZENSHIP_CARD_ENABLED = true;
      // Degraded boot: no SDK, so the remote read reports false.
      const isCitizenshipUiEnabled = jest.fn().mockResolvedValue(false);
      const facade = makeCitizenshipFacade({ isCitizenshipUiEnabled });

      prime(facade);
      await Promise.resolve();
      await Promise.resolve();
      expect(facade.isCitizenshipSurfacesEnabledSync()).toBe(false);

      // SDK recovers; the real flags now say enabled.
      isCitizenshipUiEnabled.mockResolvedValue(true);
      prime(facade);
      await Promise.resolve();
      await Promise.resolve();

      expect(facade.isCitizenshipSurfacesEnabledSync()).toBe(true);
    });

    it("is actually called from the late-SDK recovery site", async () => {
      const primeSpy = jest.fn();
      const facade = makeCitizenshipFacade({
        yaGamesAvailable: false,
        // Stub the sibling recoveries so this test only asserts the wiring.
        initExperimentFlags: jest.fn().mockResolvedValue(undefined),
        initPayments: jest.fn().mockResolvedValue(undefined),
        yandexGamesReadyCallback: jest.fn(),
        primeCitizenshipSurfacesSnapshot: primeSpy,
      });
      (
        window as unknown as { flashist_sdkScriptReadyPromise: Promise<void> }
      ).flashist_sdkScriptReadyPromise = Promise.resolve();
      (window as unknown as { YaGames: unknown }).YaGames = {
        init: jest.fn().mockResolvedValue({ getFlags: jest.fn() }),
      };

      try {
        await (
          facade as unknown as { yandexSdkInit(): Promise<void> }
        ).yandexSdkInit();
        // The guarantee: the snapshot is re-primed alongside the four sibling
        // recoveries at that site, not left behind by them.
        expect(primeSpy).toHaveBeenCalled();
      } finally {
        delete (window as unknown as { YaGames?: unknown }).YaGames;
      }
    });
  });
});
