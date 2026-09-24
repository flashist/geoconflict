/**
 * @jest-environment jsdom
 */
import { GameAnalytics } from "gameanalytics";
import {
  FlashistFacade,
  flashistConstants,
} from "../../src/client/flashist/FlashistFacade";

jest.mock("gameanalytics");

// Ad:Interstitial (task 0020): fired once per REAL interstitial impression —
// only on onClose(wasShown === true) — never per attempt, on error, or twice.

type AdCallbacks = {
  onClose: (wasShown: unknown) => void;
  onError: (error: unknown) => void;
};

// The facade constructor runs platform detection and analytics wiring, so the
// method is tested on a bare prototype instance (the FlashistFacade.test.ts
// pattern) with only yandexGamesSDK set.
function makeFacade(yandexGamesSDK: unknown): FlashistFacade {
  return Object.assign(Object.create(FlashistFacade.prototype), {
    yandexGamesSDK,
  }) as FlashistFacade;
}

/** Fake SDK whose showFullscreenAdv hands its callbacks to `drive`. */
function makeSdk(drive: (callbacks: AdCallbacks) => void) {
  return {
    adv: {
      showFullscreenAdv: jest.fn(
        ({ callbacks }: { callbacks: AdCallbacks }) => {
          drive(callbacks);
        },
      ),
    },
  };
}

const addDesignEvent = GameAnalytics.addDesignEvent as jest.Mock;
const addErrorEvent = GameAnalytics.addErrorEvent as jest.Mock;

const interstitialCalls = () =>
  addDesignEvent.mock.calls.filter(
    ([event]) => event === flashistConstants.analyticEvents.AD_INTERSTITIAL,
  );

describe("FlashistFacade.showInterstitial — Ad:Interstitial", () => {
  const originalDeployEnv = process.env.DEPLOY_ENV;

  beforeEach(() => {
    // flashist_logEventAnalytics only reaches GameAnalytics on prod builds.
    process.env.DEPLOY_ENV = "prod";
    addDesignEvent.mockReset();
    addErrorEvent.mockReset();
    jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    if (originalDeployEnv === undefined) {
      delete process.env.DEPLOY_ENV;
    } else {
      process.env.DEPLOY_ENV = originalDeployEnv;
    }
    jest.restoreAllMocks();
  });

  it("fires exactly one Ad:Interstitial when the ad was shown", async () => {
    const facade = makeFacade(makeSdk((callbacks) => callbacks.onClose(true)));

    await expect(facade.showInterstitial()).resolves.toBe(true);

    expect(addDesignEvent).toHaveBeenCalledTimes(1);
    expect(interstitialCalls()).toHaveLength(1);
  });

  it("fires nothing when the SDK closed without showing (wasShown=false)", async () => {
    const facade = makeFacade(makeSdk((callbacks) => callbacks.onClose(false)));

    await expect(facade.showInterstitial()).resolves.toBe(false);

    expect(addDesignEvent).not.toHaveBeenCalled();
  });

  it("fires nothing on onError", async () => {
    const facade = makeFacade(
      makeSdk((callbacks) => callbacks.onError(new Error("ad failed"))),
    );

    await expect(facade.showInterstitial()).resolves.toBe(false);

    expect(addDesignEvent).not.toHaveBeenCalled();
  });

  it("fires nothing when onError is followed by onClose(false)", async () => {
    const facade = makeFacade(
      makeSdk((callbacks) => {
        callbacks.onError(new Error("ad failed"));
        callbacks.onClose(false);
      }),
    );

    await expect(facade.showInterstitial()).resolves.toBe(false);

    expect(addDesignEvent).not.toHaveBeenCalled();
  });

  it("fires nothing when showFullscreenAdv throws", async () => {
    const facade = makeFacade({
      adv: {
        showFullscreenAdv: jest.fn(() => {
          throw new Error("sdk threw");
        }),
      },
    });

    await expect(facade.showInterstitial()).resolves.toBe(false);

    expect(addDesignEvent).not.toHaveBeenCalled();
  });

  it("fires nothing and does not throw when there is no SDK", async () => {
    const facade = makeFacade(undefined);

    await expect(facade.showInterstitial()).resolves.toBeUndefined();

    expect(addDesignEvent).not.toHaveBeenCalled();
  });

  it("fires only once when the SDK calls onClose(true) twice", async () => {
    const facade = makeFacade(
      makeSdk((callbacks) => {
        callbacks.onClose(true);
        callbacks.onClose(true);
      }),
    );

    await expect(facade.showInterstitial()).resolves.toBe(true);

    expect(addDesignEvent).toHaveBeenCalledTimes(1);
  });

  it.each([["true"], [1], [{}]])(
    "fires nothing for a non-boolean truthy wasShown (%p)",
    async (wasShown) => {
      const facade = makeFacade(
        makeSdk((callbacks) => callbacks.onClose(wasShown)),
      );

      await facade.showInterstitial();

      expect(addDesignEvent).not.toHaveBeenCalled();
    },
  );

  it("fires the enum's string, with no value", async () => {
    const facade = makeFacade(makeSdk((callbacks) => callbacks.onClose(true)));

    await facade.showInterstitial();

    expect(flashistConstants.analyticEvents.AD_INTERSTITIAL).toBe(
      "Ad:Interstitial",
    );
    expect(addDesignEvent).toHaveBeenCalledWith(
      flashistConstants.analyticEvents.AD_INTERSTITIAL,
      undefined,
      false,
    );
  });

  it("still resolves wasShown when analytics throws (review R1)", async () => {
    // Both GameAnalytics calls throw, so flashist_logEventAnalytics' own catch
    // cannot contain it. The real SDK calls onClose asynchronously — after the
    // executor's try/catch has returned — so the fake does too, and records
    // anything that escapes the callback.
    addDesignEvent.mockImplementation(() => {
      throw new Error("design event failed");
    });
    addErrorEvent.mockImplementation(() => {
      throw new Error("error event failed");
    });
    let escaped: unknown = undefined;
    const facade = makeFacade(
      makeSdk((callbacks) => {
        setTimeout(() => {
          try {
            callbacks.onClose(true);
          } catch (error) {
            escaped = error;
          }
        }, 0);
      }),
    );

    const settled = await Promise.race([
      facade.showInterstitial(),
      new Promise((resolve) => setTimeout(() => resolve("unsettled"), 50)),
    ]);

    expect(settled).toBe(true);
    expect(escaped).toBeUndefined();
    expect(addDesignEvent).toHaveBeenCalledTimes(1);
  });

  it("fires one event per shown ad across separate shows", async () => {
    const facade = makeFacade(makeSdk((callbacks) => callbacks.onClose(true)));

    await facade.showInterstitial();
    await facade.showInterstitial();

    expect(interstitialCalls()).toHaveLength(2);
  });
});
