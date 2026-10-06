/**
 * @jest-environment jsdom
 */
import { GameAnalytics } from "gameanalytics";
import {
  publishPaidCitizenship,
  resetCitizenshipStatusForTests,
} from "../../src/client/CitizenshipStatus";
import {
  FlashistFacade,
  flashistConstants,
} from "../../src/client/flashist/FlashistFacade";

jest.mock("gameanalytics");

// Task 0248: the one gate that turns interstitials off for a paid citizen. One
// gate covers all six placements, so both directions are tested here: a gate
// proven only on the paid side might be off for everyone.

type AdCallbacks = {
  onClose: (wasShown: unknown) => void;
  onError: (error: unknown) => void;
};

// Bare prototype instance (the InterstitialAnalytics.test.ts pattern): the
// constructor runs platform detection. The citizenship kill-switch snapshot is
// set by hand.
function makeFacade(
  yandexGamesSDK: unknown,
  citizenshipSurfacesSnapshot: boolean,
): FlashistFacade {
  return Object.assign(Object.create(FlashistFacade.prototype), {
    yandexGamesSDK,
    citizenshipSurfacesSnapshot,
  }) as FlashistFacade;
}

/** Fake SDK that shows the ad (onClose(true)) whenever it is asked. */
function makeShowingSdk() {
  return {
    adv: {
      showFullscreenAdv: jest.fn(
        ({ callbacks }: { callbacks: AdCallbacks }) => {
          callbacks.onClose(true);
        },
      ),
    },
  };
}

const addDesignEvent = GameAnalytics.addDesignEvent as jest.Mock;
const addErrorEvent = GameAnalytics.addErrorEvent as jest.Mock;

const callsOf = (event: string) =>
  addDesignEvent.mock.calls.filter(([name]) => name === event);
const suppressedCalls = () =>
  callsOf(
    flashistConstants.analyticEvents.AD_INTERSTITIAL_SUPPRESSED_PAID_CITIZEN,
  );
const shownCalls = () =>
  callsOf(flashistConstants.analyticEvents.AD_INTERSTITIAL);

describe("FlashistFacade.showInterstitial — paid-citizen gate (task 0248)", () => {
  const originalDeployEnv = process.env.DEPLOY_ENV;

  beforeEach(() => {
    // flashist_logEventAnalytics only reaches GameAnalytics on prod builds.
    process.env.DEPLOY_ENV = "prod";
    addDesignEvent.mockReset();
    addErrorEvent.mockReset();
    resetCitizenshipStatusForTests();
    jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    if (originalDeployEnv === undefined) {
      delete process.env.DEPLOY_ENV;
    } else {
      process.env.DEPLOY_ENV = originalDeployEnv;
    }
    resetCitizenshipStatusForTests();
    jest.restoreAllMocks();
  });

  it("the event string sits outside the Ad:Interstitial:* subtree", () => {
    expect(
      flashistConstants.analyticEvents.AD_INTERSTITIAL_SUPPRESSED_PAID_CITIZEN,
    ).toBe("Ad:InterstitialSuppressed:PaidCitizen");
  });

  it("paid + surfaces on: no ad requested, resolves false, one suppression event", async () => {
    publishPaidCitizenship(true);
    const sdk = makeShowingSdk();
    const facade = makeFacade(sdk, true);

    await expect(facade.showInterstitial()).resolves.toBe(false);

    expect(sdk.adv.showFullscreenAdv).not.toHaveBeenCalled();
    expect(suppressedCalls()).toHaveLength(1);
    expect(addDesignEvent).toHaveBeenCalledWith(
      flashistConstants.analyticEvents.AD_INTERSTITIAL_SUPPRESSED_PAID_CITIZEN,
      undefined,
      false,
    );
    expect(shownCalls()).toHaveLength(0);
  });

  it("fires one suppression event per suppressed request", async () => {
    publishPaidCitizenship(true);
    const facade = makeFacade(makeShowingSdk(), true);

    await facade.showInterstitial();
    await facade.showInterstitial();

    expect(suppressedCalls()).toHaveLength(2);
  });

  it("paid + surfaces off (kill switch): the ad is requested", async () => {
    publishPaidCitizenship(true);
    const sdk = makeShowingSdk();
    const facade = makeFacade(sdk, false);

    await expect(facade.showInterstitial()).resolves.toBe(true);

    expect(sdk.adv.showFullscreenAdv).toHaveBeenCalledTimes(1);
    expect(suppressedCalls()).toHaveLength(0);
    expect(shownCalls()).toHaveLength(1);
  });

  it("paid + snapshot never primed (bare facade): the ad is requested", async () => {
    publishPaidCitizenship(true);
    const sdk = makeShowingSdk();
    const facade = Object.assign(Object.create(FlashistFacade.prototype), {
      yandexGamesSDK: sdk,
    }) as FlashistFacade;

    await expect(facade.showInterstitial()).resolves.toBe(true);

    expect(sdk.adv.showFullscreenAdv).toHaveBeenCalledTimes(1);
    expect(suppressedCalls()).toHaveLength(0);
  });

  it("not paid: the ad is requested", async () => {
    publishPaidCitizenship(false);
    const sdk = makeShowingSdk();
    const facade = makeFacade(sdk, true);

    await expect(facade.showInterstitial()).resolves.toBe(true);

    expect(sdk.adv.showFullscreenAdv).toHaveBeenCalledTimes(1);
    expect(suppressedCalls()).toHaveLength(0);
    expect(shownCalls()).toHaveLength(1);
  });

  it("nothing published yet (unknown): the ad is requested", async () => {
    const sdk = makeShowingSdk();
    const facade = makeFacade(sdk, true);

    await expect(facade.showInterstitial()).resolves.toBe(true);

    expect(sdk.adv.showFullscreenAdv).toHaveBeenCalledTimes(1);
    expect(suppressedCalls()).toHaveLength(0);
  });

  it("earned-only citizen (publishes false): the ad is requested", async () => {
    // The card derives false for an earned-only citizen
    // (derivePaidCitizenship, covered in CitizenshipStatus.test.ts).
    publishPaidCitizenship(false);
    const sdk = makeShowingSdk();
    const facade = makeFacade(sdk, true);

    await expect(facade.showInterstitial()).resolves.toBe(true);

    expect(sdk.adv.showFullscreenAdv).toHaveBeenCalledTimes(1);
    expect(suppressedCalls()).toHaveLength(0);
  });

  it("no SDK + paid: resolves undefined, no suppression event", async () => {
    publishPaidCitizenship(true);
    const facade = makeFacade(undefined, true);

    await expect(facade.showInterstitial()).resolves.toBeUndefined();

    expect(addDesignEvent).not.toHaveBeenCalled();
  });

  it("the check throwing fails open: the ad is requested", async () => {
    publishPaidCitizenship(true);
    const sdk = makeShowingSdk();
    const facade = makeFacade(sdk, true);
    jest
      .spyOn(facade, "isCitizenshipSurfacesEnabledSync")
      .mockImplementation(() => {
        throw new Error("check failed");
      });

    await expect(facade.showInterstitial()).resolves.toBe(true);

    expect(sdk.adv.showFullscreenAdv).toHaveBeenCalledTimes(1);
    expect(suppressedCalls()).toHaveLength(0);
  });

  it("suppression analytics throwing still resolves false and does not hang", async () => {
    // Both GameAnalytics calls throw, so flashist_logEventAnalytics' own catch
    // cannot contain it.
    addDesignEvent.mockImplementation(() => {
      throw new Error("design event failed");
    });
    addErrorEvent.mockImplementation(() => {
      throw new Error("error event failed");
    });
    publishPaidCitizenship(true);
    const sdk = makeShowingSdk();
    const facade = makeFacade(sdk, true);

    const settled = await Promise.race([
      facade.showInterstitial(),
      new Promise((resolve) => setTimeout(() => resolve("unsettled"), 50)),
    ]);

    expect(settled).toBe(false);
    expect(sdk.adv.showFullscreenAdv).not.toHaveBeenCalled();
  });
});
