/**
 * @jest-environment jsdom
 */
import { GameAnalytics } from "gameanalytics";
import { resetCitizenshipStatusForTests } from "../../src/client/CitizenshipStatus";
import {
  FlashistFacade,
  flashistConstants,
  INTERSTITIAL_GAP_AFTER_REWARDED_MS,
  resetRewardedVideoForTests,
} from "../../src/client/flashist/FlashistFacade";

jest.mock("gameanalytics");

// Task 0488: no interstitial within 60 s of a rewarded video — no back-to-back ads.

type Callbacks = {
  onOpen: () => void;
  onRewarded: () => void;
  onClose: (wasShown?: unknown) => void;
  onError: (error: unknown) => void;
};

function makeSdk(rewardedPlay: (cb: Callbacks) => void) {
  return {
    adv: {
      showFullscreenAdv: jest.fn(({ callbacks }: { callbacks: Callbacks }) =>
        callbacks.onClose(true),
      ),
      showRewardedVideo: jest.fn(({ callbacks }: { callbacks: Callbacks }) =>
        rewardedPlay(callbacks),
      ),
    },
  };
}

function makeFacade(yandexGamesSDK: unknown): FlashistFacade {
  return Object.assign(Object.create(FlashistFacade.prototype), {
    yandexGamesSDK,
    citizenshipSurfacesSnapshot: true,
  }) as FlashistFacade;
}

const addDesignEvent = GameAnalytics.addDesignEvent as jest.Mock;
const suppressedCalls = () =>
  addDesignEvent.mock.calls.filter(
    ([name]) =>
      name ===
      flashistConstants.analyticEvents
        .AD_INTERSTITIAL_SUPPRESSED_AFTER_REWARDED,
  );

const watchedToTheEnd = (cb: Callbacks) => {
  cb.onOpen();
  cb.onRewarded();
  cb.onClose();
};

describe("showInterstitial after a rewarded video (task 0488)", () => {
  const originalDeployEnv = process.env.DEPLOY_ENV;
  let now = 1_000_000;

  beforeEach(() => {
    process.env.DEPLOY_ENV = "prod";
    addDesignEvent.mockReset();
    resetRewardedVideoForTests();
    resetCitizenshipStatusForTests();
    now = 1_000_000;
    jest.spyOn(Date, "now").mockImplementation(() => now);
    jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    if (originalDeployEnv === undefined) {
      delete process.env.DEPLOY_ENV;
    } else {
      process.env.DEPLOY_ENV = originalDeployEnv;
    }
    resetRewardedVideoForTests();
    jest.restoreAllMocks();
  });

  it("no rewarded video yet: the interstitial is requested", async () => {
    const sdk = makeSdk(watchedToTheEnd);
    const facade = makeFacade(sdk);

    await expect(facade.showInterstitial()).resolves.toBe(true);
    expect(sdk.adv.showFullscreenAdv).toHaveBeenCalledTimes(1);
    expect(suppressedCalls()).toHaveLength(0);
  });

  it("within 60 s of a watched video: skipped, one event per request", async () => {
    const sdk = makeSdk(watchedToTheEnd);
    const facade = makeFacade(sdk);
    await facade.showRewardedVideo(jest.fn(), jest.fn());

    now += INTERSTITIAL_GAP_AFTER_REWARDED_MS - 1;
    await expect(facade.showInterstitial()).resolves.toBe(false);
    await expect(facade.showInterstitial()).resolves.toBe(false);

    expect(sdk.adv.showFullscreenAdv).not.toHaveBeenCalled();
    expect(suppressedCalls()).toHaveLength(2);
  });

  it("a video closed early counts too: it was on screen", async () => {
    const sdk = makeSdk((cb) => {
      cb.onOpen();
      cb.onClose();
    });
    const facade = makeFacade(sdk);
    await facade.showRewardedVideo(jest.fn(), jest.fn());

    await expect(facade.showInterstitial()).resolves.toBe(false);
    expect(sdk.adv.showFullscreenAdv).not.toHaveBeenCalled();
  });

  it("60 s or more after: the interstitial is requested again", async () => {
    const sdk = makeSdk(watchedToTheEnd);
    const facade = makeFacade(sdk);
    await facade.showRewardedVideo(jest.fn(), jest.fn());

    now += INTERSTITIAL_GAP_AFTER_REWARDED_MS;
    await expect(facade.showInterstitial()).resolves.toBe(true);
    expect(sdk.adv.showFullscreenAdv).toHaveBeenCalledTimes(1);
    expect(suppressedCalls()).toHaveLength(0);
  });

  it("a rewarded video that never reached the screen does not block", async () => {
    const sdk = makeSdk((cb) => cb.onError(new Error("no fill")));
    const facade = makeFacade(sdk);
    await facade.showRewardedVideo(jest.fn(), jest.fn());

    await expect(facade.showInterstitial()).resolves.toBe(true);
    expect(suppressedCalls()).toHaveLength(0);
  });

  it("covers every facade: the timestamp is module-level", async () => {
    await makeFacade(makeSdk(watchedToTheEnd)).showRewardedVideo(
      jest.fn(),
      jest.fn(),
    );
    const otherSdk = makeSdk(watchedToTheEnd);

    await expect(makeFacade(otherSdk).showInterstitial()).resolves.toBe(false);
    expect(otherSdk.adv.showFullscreenAdv).not.toHaveBeenCalled();
  });
});
