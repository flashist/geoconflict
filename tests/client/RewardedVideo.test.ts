/**
 * @jest-environment jsdom
 */
import { GameAnalytics } from "gameanalytics";
import {
  FlashistFacade,
  flashistConstants,
  resetRewardedVideoForTests,
} from "../../src/client/flashist/FlashistFacade";
import {
  isPlatformDialogOpen,
  resetPlatformDialogPresenceForTests,
} from "../../src/client/PlatformDialogPresence";

jest.mock("gameanalytics");

// Task 0488: the reward is granted only from the SDK's onRewarded, at most once.

type RewardedCallbacks = {
  onOpen: () => void;
  onRewarded: () => void;
  onClose: () => void;
  onError: (error: unknown) => void;
};

/** Bare prototype instance: the constructor runs platform detection. */
function makeFacade(yandexGamesSDK: unknown): FlashistFacade {
  return Object.assign(Object.create(FlashistFacade.prototype), {
    yandexGamesSDK,
  }) as FlashistFacade;
}

function makeSdk(play: (callbacks: RewardedCallbacks) => void) {
  return {
    adv: {
      showRewardedVideo: jest.fn(
        ({ callbacks }: { callbacks: RewardedCallbacks }) => play(callbacks),
      ),
    },
  };
}

const events = flashistConstants.analyticEvents;
const addDesignEvent = GameAnalytics.addDesignEvent as jest.Mock;
const callsOf = (event: string) =>
  addDesignEvent.mock.calls.filter(([name]) => name === event);

describe("FlashistFacade.showRewardedVideo (task 0488)", () => {
  const originalDeployEnv = process.env.DEPLOY_ENV;

  beforeEach(() => {
    // flashist_logEventAnalytics only reaches GameAnalytics on prod builds.
    process.env.DEPLOY_ENV = "prod";
    addDesignEvent.mockReset();
    resetRewardedVideoForTests();
    resetPlatformDialogPresenceForTests();
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

  it("onOpen → onRewarded → onClose: watched, reward once, muted then unmuted", async () => {
    const onRewarded = jest.fn();
    const setMuted = jest.fn();
    const facade = makeFacade(
      makeSdk((cb) => {
        cb.onOpen();
        cb.onRewarded();
        cb.onClose();
      }),
    );

    await expect(facade.showRewardedVideo(onRewarded, setMuted)).resolves.toBe(
      "watched",
    );

    expect(onRewarded).toHaveBeenCalledTimes(1);
    expect(setMuted.mock.calls).toEqual([[true], [false]]);
    expect(callsOf(events.AD_REWARDED_OPENED)).toHaveLength(1);
    expect(callsOf(events.AD_REWARDED_WATCHED)).toHaveLength(1);
    expect(callsOf(events.AD_REWARDED_CLOSED_EARLY)).toHaveLength(0);
    expect(isPlatformDialogOpen()).toBe(false);
  });

  it("the reward fires at onRewarded, before any close", async () => {
    const onRewarded = jest.fn();
    let callbacks: RewardedCallbacks | null = null;
    const facade = makeFacade(
      makeSdk((cb) => {
        callbacks = cb;
      }),
    );

    const pending = facade.showRewardedVideo(onRewarded, jest.fn());
    callbacks!.onOpen();
    callbacks!.onRewarded();

    expect(onRewarded).toHaveBeenCalledTimes(1);
    expect(isPlatformDialogOpen()).toBe(true);
    callbacks!.onClose();
    await expect(pending).resolves.toBe("watched");
  });

  it("onRewarded twice and onClose twice: one reward, one settle", async () => {
    const onRewarded = jest.fn();
    const setMuted = jest.fn();
    const facade = makeFacade(
      makeSdk((cb) => {
        cb.onOpen();
        cb.onRewarded();
        cb.onRewarded();
        cb.onClose();
        cb.onClose();
      }),
    );

    await expect(facade.showRewardedVideo(onRewarded, setMuted)).resolves.toBe(
      "watched",
    );

    expect(onRewarded).toHaveBeenCalledTimes(1);
    expect(setMuted.mock.calls).toEqual([[true], [false]]);
    expect(callsOf(events.AD_REWARDED_WATCHED)).toHaveLength(1);
  });

  it("close without onRewarded: closed_early, no reward", async () => {
    const onRewarded = jest.fn();
    const setMuted = jest.fn();
    const facade = makeFacade(
      makeSdk((cb) => {
        cb.onOpen();
        cb.onClose();
        cb.onClose();
      }),
    );

    await expect(facade.showRewardedVideo(onRewarded, setMuted)).resolves.toBe(
      "closed_early",
    );

    expect(onRewarded).not.toHaveBeenCalled();
    expect(setMuted.mock.calls).toEqual([[true], [false]]);
    expect(callsOf(events.AD_REWARDED_CLOSED_EARLY)).toHaveLength(1);
  });

  it("onError: error, no reward, sound restored", async () => {
    const onRewarded = jest.fn();
    const setMuted = jest.fn();
    const facade = makeFacade(
      makeSdk((cb) => {
        cb.onOpen();
        cb.onError(new Error("no fill"));
      }),
    );

    await expect(facade.showRewardedVideo(onRewarded, setMuted)).resolves.toBe(
      "error",
    );

    expect(onRewarded).not.toHaveBeenCalled();
    expect(setMuted.mock.calls).toEqual([[true], [false]]);
    expect(callsOf(events.AD_REWARDED_ERROR)).toHaveLength(1);
    expect(isPlatformDialogOpen()).toBe(false);
  });

  it("showRewardedVideo throwing: error, no reward, never muted", async () => {
    const onRewarded = jest.fn();
    const setMuted = jest.fn();
    const facade = makeFacade(
      makeSdk(() => {
        throw new Error("sdk broke");
      }),
    );

    await expect(facade.showRewardedVideo(onRewarded, setMuted)).resolves.toBe(
      "error",
    );

    expect(onRewarded).not.toHaveBeenCalled();
    expect(setMuted).not.toHaveBeenCalled();
    expect(callsOf(events.AD_REWARDED_ERROR)).toHaveLength(1);
    expect(isPlatformDialogOpen()).toBe(false);
  });

  it("no SDK: unavailable, no reward, nothing requested", async () => {
    const onRewarded = jest.fn();
    const facade = makeFacade(undefined);

    expect(facade.isRewardedVideoAvailable()).toBe(false);
    await expect(facade.showRewardedVideo(onRewarded, jest.fn())).resolves.toBe(
      "unavailable",
    );

    expect(onRewarded).not.toHaveBeenCalled();
    expect(callsOf(events.AD_REWARDED_UNAVAILABLE)).toHaveLength(1);
  });

  it("an SDK without showRewardedVideo is not available", () => {
    expect(makeFacade({ adv: {} }).isRewardedVideoAvailable()).toBe(false);
    expect(makeFacade(makeSdk(() => {})).isRewardedVideoAvailable()).toBe(true);
  });

  it("a throwing reward handler or mute hook still settles", async () => {
    const facade = makeFacade(
      makeSdk((cb) => {
        cb.onOpen();
        cb.onRewarded();
        cb.onClose();
      }),
    );

    await expect(
      facade.showRewardedVideo(
        () => {
          throw new Error("handler broke");
        },
        () => {
          throw new Error("mute broke");
        },
      ),
    ).resolves.toBe("watched");
  });

  it("the funnel strings sit outside Ad:Interstitial:*", () => {
    expect(events.AD_REWARDED_WATCHED).toBe("Ad:Rewarded:Watched");
    expect(events.AD_REWARDED_SUPPRESSED_CITIZEN).toBe(
      "Ad:RewardedSuppressed:Citizen",
    );
    expect(events.AD_INTERSTITIAL_SUPPRESSED_AFTER_REWARDED).toBe(
      "Ad:InterstitialSuppressed:AfterRewarded",
    );
  });
});
