/**
 * @jest-environment jsdom
 */
import { readFileSync } from "fs";
import { join } from "path";
import { GameAnalytics } from "gameanalytics";
import {
  FlashistFacade,
  flashist_markGameInitComplete,
  flashistConstants,
} from "../../src/client/flashist/FlashistFacade";
import { AFTER_MATCH_EXIT_KEY } from "../../src/client/PlatformDegradedAnalytics";
import { SDK_LOADER_SCRIPT_ID } from "../../src/client/SdkLoaderRetry";

jest.mock("gameanalytics");

// Task 0328: Session:PlatformDegraded:{Cause} and Session:PlatformRecovered,
// wired through the facade. The constructor runs platform detection and
// analytics wiring, so everything is driven on a bare prototype instance (the
// FlashistFacade.test.ts / InterstitialAnalytics.test.ts pattern). Class-field
// initializers do not run on Object.create, so state is seeded explicitly.

const events = flashistConstants.analyticEvents;
const DEGRADED = events.SESSION_PLATFORM_DEGRADED_FIRST_PART;
const RECOVERED = events.SESSION_PLATFORM_RECOVERED;

type Internals = {
  logPlatformDegradedEvent(): Promise<void>;
  logPlatformRecoveredIfDegraded(): void;
  yandexSdkInit(): Promise<void>;
  runPlatformInit(): Promise<void>;
  sdkInitRejected?: boolean;
  sdkScriptSettled?: boolean;
  platformInitTimeoutStage?: "script" | "init";
  bootFollowsMatchExit?: boolean;
};
// Omit drops the class's private members, which would otherwise collapse the
// intersection with these test-only views of them to `never`.
type TestFacade = Omit<FlashistFacade, keyof Internals> & Internals;

const guestPlayer = { isAuthorized: () => false };
const FLAGS = { citizenship_ui: "enabled" };

function makeFacade(fields: Record<string, unknown> = {}): TestFacade {
  return Object.assign(Object.create(FlashistFacade.prototype), {
    yaGamesAvailable: true,
    yandexInitPromise: Promise.resolve(),
    ...fields,
  }) as unknown as TestFacade;
}

/** SDK + player + flags all present — the card shows. */
function healthyFields(): Record<string, unknown> {
  return {
    yandexGamesSDK: { getFlags: jest.fn().mockResolvedValue(FLAGS) },
    yandexSdkPlayerObject: guestPlayer,
    yandexInitExperimentsPromise: Promise.resolve(),
    yandexExperimentFlags: FLAGS,
  };
}

const addDesignEvent = GameAnalytics.addDesignEvent as jest.Mock;

const degradedCalls = () =>
  addDesignEvent.mock.calls.filter(
    ([event]) => typeof event === "string" && event.startsWith(DEGRADED),
  );
const recoveredCalls = () =>
  addDesignEvent.mock.calls.filter(([event]) => event === RECOVERED);

async function flush(): Promise<void> {
  for (let i = 0; i < 20; i++) {
    await Promise.resolve();
  }
}

const win = window as unknown as Record<string, unknown>;

const originalDeployEnv = process.env.DEPLOY_ENV;

beforeEach(() => {
  // flashist_logEventAnalytics only reaches GameAnalytics on prod builds.
  process.env.DEPLOY_ENV = "prod";
  addDesignEvent.mockReset();
  (GameAnalytics.addErrorEvent as jest.Mock).mockReset();
  jest.spyOn(console, "log").mockImplementation(() => {});
  jest.spyOn(console, "warn").mockImplementation(() => {});
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  if (originalDeployEnv === undefined) {
    delete process.env.DEPLOY_ENV;
  } else {
    process.env.DEPLOY_ENV = originalDeployEnv;
  }
  delete win.YaGames;
  delete win.flashist_sdkScriptLoadFailed;
  delete win.flashist_sdkScriptReadyPromise;
  jest.restoreAllMocks();
  jest.useRealTimers();
  try {
    window.sessionStorage.clear();
  } catch {
    // nothing to clear
  }
});

describe("enum keys (task 0328)", () => {
  it("the degraded prefix and the recovered event have the agreed strings", () => {
    expect(events.SESSION_PLATFORM_DEGRADED_FIRST_PART).toBe(
      "Session:PlatformDegraded:",
    );
    expect(events.SESSION_PLATFORM_RECOVERED).toBe("Session:PlatformRecovered");
  });
});

describe("Session:PlatformDegraded:{Cause} — the check at the card's gate", () => {
  const noSdk = {
    yandexGamesSDK: undefined,
    yandexSdkPlayerObject: undefined,
    yandexExperimentFlags: undefined,
  };

  it.each<[string, () => Record<string, unknown>]>([
    [
      "ScriptFailed",
      () => {
        win.flashist_sdkScriptLoadFailed = true;
        return noSdk;
      },
    ],
    ["ScriptTimeout", () => ({ ...noSdk, platformInitTimeoutStage: "script" })],
    ["InitFailed", () => ({ ...noSdk, sdkInitRejected: true })],
    ["InitTimeout", () => ({ ...noSdk, platformInitTimeoutStage: "init" })],
    ["NoSdk", () => noSdk],
    [
      "NoPlayer",
      () => ({ ...healthyFields(), yandexSdkPlayerObject: undefined }),
    ],
    [
      "NoFlags",
      () => ({ ...healthyFields(), yandexExperimentFlags: undefined }),
    ],
  ])(
    "%s fires exactly one event, value 0 without the marker",
    async (cause, setup) => {
      const facade = makeFacade(setup());

      await facade.logPlatformDegradedEvent();

      expect(degradedCalls()).toEqual([[`${DEGRADED}${cause}`, 0, true]]);
    },
  );

  it.each<[string, Record<string, unknown>]>([
    ["InitTimeout", { platformInitTimeoutStage: "init" }],
    ["NoSdk", {}],
  ])(
    "%s fires value 1 when this boot follows a match exit",
    async (cause, fields) => {
      const facade = makeFacade({ ...fields, bootFollowsMatchExit: true });

      await facade.logPlatformDegradedEvent();

      expect(degradedCalls()).toEqual([[`${DEGRADED}${cause}`, 1, true]]);
    },
  );

  it("first match wins through the facade: ScriptFailed over NoPlayer/NoFlags", async () => {
    win.flashist_sdkScriptLoadFailed = true;
    const facade = makeFacade({ platformInitTimeoutStage: "script" });

    await facade.logPlatformDegradedEvent();

    expect(degradedCalls()).toEqual([[`${DEGRADED}ScriptFailed`, 0, true]]);
  });

  it("a second call fires nothing (once per page)", async () => {
    const facade = makeFacade();

    await facade.logPlatformDegradedEvent();
    await facade.logPlatformDegradedEvent();

    expect(degradedCalls()).toHaveLength(1);
  });

  it("a healthy boot fires nothing", async () => {
    const facade = makeFacade(healthyFields());

    await facade.logPlatformDegradedEvent();

    expect(degradedCalls()).toHaveLength(0);
  });

  it("a non-Yandex page (yaGamesAvailable=false) fires nothing", async () => {
    const facade = makeFacade({ yaGamesAvailable: false });

    await facade.logPlatformDegradedEvent();

    expect(addDesignEvent).not.toHaveBeenCalled();
  });

  describe("waits for flags still loading, as the card does", () => {
    function slowFlagsFacade() {
      let resolveFlags!: (value: unknown) => void;
      let rejectFlags!: (error: unknown) => void;
      const getFlags = jest.fn(
        () =>
          new Promise((resolve, reject) => {
            resolveFlags = resolve;
            rejectFlags = reject;
          }),
      );
      const facade = makeFacade({
        yandexGamesSDK: { getFlags },
        yandexSdkPlayerObject: guestPlayer,
      });
      return {
        facade,
        getFlags,
        resolve: (v: unknown) => resolveFlags(v),
        reject: (e: unknown) => rejectFlags(e),
      };
    }

    beforeEach(() => {
      // fetchExperimentFlags races getFlags() against a 5 s timer.
      jest.useFakeTimers();
    });

    it("flags still loading, then arriving → no event", async () => {
      const slow = slowFlagsFacade();

      const check = slow.facade.logPlatformDegradedEvent();
      await flush();
      expect(slow.getFlags).toHaveBeenCalledTimes(1);
      slow.resolve(FLAGS);
      await check;

      expect(degradedCalls()).toHaveLength(0);
    });

    it("flags still loading, then failing → NoFlags", async () => {
      const slow = slowFlagsFacade();

      const check = slow.facade.logPlatformDegradedEvent();
      await flush();
      slow.reject(new Error("getFlags failed"));
      await check;

      expect(degradedCalls()).toEqual([[`${DEGRADED}NoFlags`, 0, true]]);
    });
  });

  it("never throws, even if the state read blows up", async () => {
    const facade = makeFacade({
      yandexInitPromise: Promise.reject(new Error("boom")),
    });

    await expect(facade.logPlatformDegradedEvent()).resolves.toBeUndefined();
    expect(degradedCalls()).toHaveLength(0);
  });
});

describe("the after-match marker", () => {
  it("changeHref(rootPathname) writes the marker, and still navigates", () => {
    const facade = makeFacade({ rootPathname: "#root-exit-1" });

    facade.changeHref("#root-exit-1");

    expect(window.sessionStorage.getItem(AFTER_MATCH_EXIT_KEY)).toBe("1");
    expect(window.location.hash).toBe("#root-exit-1");
  });

  it("changeHref(any other url) does not write the marker", () => {
    const facade = makeFacade({ rootPathname: "#root-exit-2" });

    facade.changeHref("#checkout");

    expect(window.sessionStorage.getItem(AFTER_MATCH_EXIT_KEY)).toBeNull();
    expect(window.location.hash).toBe("#checkout");
  });

  it("reloadApp() is not a match exit and never writes the marker", () => {
    const facade = makeFacade({ rootPathname: window.location.pathname });

    facade.reloadApp();

    expect(window.sessionStorage.getItem(AFTER_MATCH_EXIT_KEY)).toBeNull();
  });

  it("storage throwing in changeHref → navigation still happens", () => {
    jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    const facade = makeFacade({ rootPathname: "#root-exit-3" });

    expect(() => facade.changeHref("#root-exit-3")).not.toThrow();
    expect(window.location.hash).toBe("#root-exit-3");
  });

  it("the sessionStorage getter throwing in changeHref → navigation still happens", () => {
    jest.spyOn(window, "sessionStorage", "get").mockImplementation(() => {
      throw new DOMException("sandboxed", "SecurityError");
    });
    const facade = makeFacade({ rootPathname: "#root-exit-4" });

    expect(() => facade.changeHref("#root-exit-4")).not.toThrow();
    expect(window.location.hash).toBe("#root-exit-4");
  });

  describe("initializeImmediate consumes the marker on every boot", () => {
    beforeEach(() => {
      // Keep initializeImmediate off GameAnalytics.initialize; the marker
      // read does not depend on the deploy env.
      process.env.DEPLOY_ENV = "dev";
      Object.defineProperty(window, "matchMedia", {
        configurable: true,
        value: jest.fn().mockReturnValue({ matches: false }),
      });
    });

    it("a marked boot reads true and removes the marker", () => {
      window.sessionStorage.setItem(AFTER_MATCH_EXIT_KEY, "1");
      const facade = makeFacade();

      facade.initializeImmediate();

      expect(facade.bootFollowsMatchExit).toBe(true);
      expect(window.sessionStorage.getItem(AFTER_MATCH_EXIT_KEY)).toBeNull();
    });

    it("an unmarked boot reads false", () => {
      const facade = makeFacade();

      facade.initializeImmediate();

      expect(facade.bootFollowsMatchExit).toBe(false);
    });

    it("storage throwing → boot still completes, value reads false", () => {
      jest.spyOn(window, "sessionStorage", "get").mockImplementation(() => {
        throw new DOMException("sandboxed", "SecurityError");
      });
      const facade = makeFacade();

      expect(() => facade.initializeImmediate()).not.toThrow();
      expect(facade.bootFollowsMatchExit).toBe(false);
    });

    it("end to end: a marked degraded boot logs value 1", async () => {
      window.sessionStorage.setItem(AFTER_MATCH_EXIT_KEY, "1");
      const facade = makeFacade();
      facade.initializeImmediate();
      process.env.DEPLOY_ENV = "prod";
      addDesignEvent.mockReset();

      await facade.logPlatformDegradedEvent();

      expect(degradedCalls()).toEqual([[`${DEGRADED}NoSdk`, 1, true]]);
    });
  });
});

describe("match exit keeps the query string (task 0331)", () => {
  // Production serves the game at a non-root path, so the URL is set there
  // (wiki windoworigin-url-join-defect testing rule). Fake values only.
  const IFRAME_PATH = "/yandex-games_iframe.html";

  // jsdom performs no real navigation: it only updates `location` when the
  // target equals the current URL minus its hash (the shape of a correct match
  // exit), and logs "Not implemented: navigation" otherwise. Asserting that
  // log is absent makes these tests fail loudly, not pass falsely, if a future
  // jsdom stops doing this.
  const navigationNotImplementedLogged = () =>
    (console.error as jest.Mock).mock.calls.some((args) =>
      args.some((arg) =>
        String(arg?.message ?? arg).includes("Not implemented: navigation"),
      ),
    );

  const currentUrl = () =>
    window.location.pathname + window.location.search + window.location.hash;

  afterEach(() => {
    window.history.replaceState(null, "", "/");
  });

  it("changeHref(rootPathname) keeps the query, drops the hash, and writes the marker", () => {
    window.history.replaceState(
      null,
      "",
      `${IFRAME_PATH}?sdk=fake&lang=ru#join=abc`,
    );
    const facade = makeFacade({ rootPathname: IFRAME_PATH });

    facade.changeHref(IFRAME_PATH);

    expect(currentUrl()).toBe(`${IFRAME_PATH}?sdk=fake&lang=ru`);
    expect(window.sessionStorage.getItem(AFTER_MATCH_EXIT_KEY)).toBe("1");
    expect(navigationNotImplementedLogged()).toBe(false);
  });

  it("reads the query at navigation time, not when the facade was built", () => {
    window.history.replaceState(null, "", `${IFRAME_PATH}?sdk=fake`);
    const facade = makeFacade({ rootPathname: IFRAME_PATH });
    window.history.replaceState(null, "", `${IFRAME_PATH}?sdk=later#x`);

    facade.changeHref(IFRAME_PATH);

    expect(currentUrl()).toBe(`${IFRAME_PATH}?sdk=later`);
    expect(navigationNotImplementedLogged()).toBe(false);
  });

  it("no query → navigates to the bare root path", () => {
    window.history.replaceState(null, "", `${IFRAME_PATH}#frag`);
    const facade = makeFacade({ rootPathname: IFRAME_PATH });

    facade.changeHref(IFRAME_PATH);

    expect(currentUrl()).toBe(IFRAME_PATH);
    expect(navigationNotImplementedLogged()).toBe(false);
  });

  it("a non-root url gets no query appended and no marker", () => {
    window.history.replaceState(null, "", `${IFRAME_PATH}?sdk=fake`);
    const facade = makeFacade({ rootPathname: IFRAME_PATH });

    facade.changeHref("#checkout");

    expect(window.location.hash).toBe("#checkout");
    expect(window.sessionStorage.getItem(AFTER_MATCH_EXIT_KEY)).toBeNull();
  });

  it("reloadApp() does not route through changeHref and writes no marker", () => {
    window.history.replaceState(null, "", `${IFRAME_PATH}?sdk=fake#frag`);
    const facade = makeFacade({ rootPathname: IFRAME_PATH });
    const changeHref = jest.spyOn(facade, "changeHref");

    facade.reloadApp();

    expect(changeHref).not.toHaveBeenCalled();
    expect(window.sessionStorage.getItem(AFTER_MATCH_EXIT_KEY)).toBeNull();
    expect(currentUrl()).toBe(`${IFRAME_PATH}?sdk=fake#frag`);
  });
});

describe("state recorded where each thing happens", () => {
  const recoveryStubs = () => ({
    yandexGamesReadyCallback: jest.fn(),
    primeCitizenshipSurfacesSnapshot: jest.fn(),
    initPayments: jest.fn().mockResolvedValue(undefined),
    initExperimentFlags: jest.fn().mockResolvedValue(undefined),
  });

  it("yandexSdkInit: init() rejecting sets sdkInitRejected", async () => {
    win.flashist_sdkScriptReadyPromise = Promise.resolve();
    win.YaGames = { init: jest.fn().mockRejectedValue(new Error("init")) };
    const facade = makeFacade(recoveryStubs());

    await facade.yandexSdkInit();

    expect(facade.sdkScriptSettled).toBe(true);
    expect(facade.sdkInitRejected).toBe(true);
  });

  it("yandexSdkInit: init() resolving leaves sdkInitRejected unset", async () => {
    win.flashist_sdkScriptReadyPromise = Promise.resolve();
    win.YaGames = { init: jest.fn().mockResolvedValue({}) };
    const facade = makeFacade(recoveryStubs());

    await facade.yandexSdkInit();

    expect(facade.sdkInitRejected).not.toBe(true);
  });

  it("yandexSdkInit: a post-init step throwing is not an init() rejection", async () => {
    win.flashist_sdkScriptReadyPromise = Promise.resolve();
    win.YaGames = { init: jest.fn().mockResolvedValue({}) };
    const facade = makeFacade({
      ...recoveryStubs(),
      primeCitizenshipSurfacesSnapshot: jest.fn(() => {
        throw new Error("prime");
      }),
    });

    await facade.yandexSdkInit();

    expect(facade.sdkInitRejected).not.toBe(true);
  });

  it("yandexSdkInit: loader loaded but YaGames undefined → no rejection, no timeout (NoSdk)", async () => {
    win.flashist_sdkScriptReadyPromise = Promise.resolve();
    const facade = makeFacade();

    await facade.yandexSdkInit();
    await facade.logPlatformDegradedEvent();

    expect(facade.sdkScriptSettled).toBe(true);
    expect(facade.sdkInitRejected).not.toBe(true);
    expect(degradedCalls()).toEqual([[`${DEGRADED}NoSdk`, 0, true]]);
  });

  describe("the platform-init deadline branch records the stage", () => {
    function platformInitFacade(fields: Record<string, unknown> = {}) {
      return makeFacade({
        yandexInitPromise: new Promise(() => {}),
        yandexInitPromiseResolve: jest.fn(),
        yandexSdkInitPlayerPromiseResolve: jest.fn(),
        initPlayer: jest.fn().mockResolvedValue(undefined),
        loadExperimentFlags: jest.fn().mockResolvedValue(undefined),
        initPayments: jest.fn().mockResolvedValue(undefined),
        logExperimentEvents: jest.fn(),
        primeCitizenshipSurfacesSnapshot: jest.fn(),
        logYandexLoginStatusEvent: jest.fn(),
        scheduleYandexLoginStatusEvent: jest.fn(),
        getLanguageCode: jest.fn().mockResolvedValue("ru"),
        getCurPlayerName: jest.fn().mockResolvedValue(undefined),
        yandexGamesReadyCallback: jest.fn(),
        initExperimentFlags: jest.fn().mockResolvedValue(undefined),
        ...fields,
      });
    }

    const timeoutCalls = () =>
      addDesignEvent.mock.calls.filter(
        ([event]) => event === events.SESSION_PLATFORM_INIT_TIMEOUT,
      );

    beforeEach(() => {
      jest.useFakeTimers();
    });

    it("loader still downloading at 5 s → stage 'script'", async () => {
      win.flashist_sdkScriptReadyPromise = new Promise(() => {});
      const facade = platformInitFacade();

      const run = facade.runPlatformInit();
      await jest.advanceTimersByTimeAsync(5000);
      await run;

      expect(facade.platformInitTimeoutStage).toBe("script");
      expect(timeoutCalls()).toHaveLength(1);
    });

    it("init() hung at 5 s → stage 'init'", async () => {
      win.flashist_sdkScriptReadyPromise = Promise.resolve();
      win.YaGames = { init: jest.fn(() => new Promise(() => {})) };
      const facade = platformInitFacade();

      const run = facade.runPlatformInit();
      await jest.advanceTimersByTimeAsync(5000);
      await run;

      expect(facade.platformInitTimeoutStage).toBe("init");
      expect(timeoutCalls()).toHaveLength(1);
    });

    it("a stage-2 (player/flags) deadline leaves the stage unset", async () => {
      win.flashist_sdkScriptReadyPromise = Promise.resolve();
      win.YaGames = { init: jest.fn().mockResolvedValue({}) };
      const facade = platformInitFacade({
        yandexInitPromise: Promise.resolve(),
        initPlayer: jest.fn(() => new Promise(() => {})),
      });

      const run = facade.runPlatformInit();
      await jest.advanceTimersByTimeAsync(5000);
      await run;

      expect(facade.platformInitTimeoutStage).toBeUndefined();
      expect(timeoutCalls()).toHaveLength(1);
    });
  });
});

describe("Session:PlatformRecovered — flags arriving late", () => {
  /** Drives the real late-SDK recovery site in yandexSdkInit. */
  async function recoverLate(facade: TestFacade, getFlags: jest.Mock) {
    win.flashist_sdkScriptReadyPromise = Promise.resolve();
    win.YaGames = { init: jest.fn().mockResolvedValue({ getFlags }) };
    await facade.yandexSdkInit();
    await flush();
  }

  function degradedBootFacade(fields: Record<string, unknown> = {}) {
    return makeFacade({
      platformInitTimeoutStage: "init",
      yandexGamesReadyCallback: jest.fn(),
      primeCitizenshipSurfacesSnapshot: jest.fn(),
      initPayments: jest.fn().mockResolvedValue(undefined),
      ...fields,
    });
  }

  beforeEach(() => {
    jest.useFakeTimers();
  });

  it("fires once, after a degraded-without-flags check plus late flags", async () => {
    const facade = degradedBootFacade();
    await facade.logPlatformDegradedEvent();
    expect(degradedCalls()).toEqual([[`${DEGRADED}InitTimeout`, 0, true]]);

    await recoverLate(facade, jest.fn().mockResolvedValue(FLAGS));

    expect(recoveredCalls()).toEqual([[RECOVERED, 0, true]]);

    facade.logPlatformRecoveredIfDegraded();
    expect(recoveredCalls()).toHaveLength(1);
  });

  it("carries the after-match value", async () => {
    const facade = degradedBootFacade({ bootFollowsMatchExit: true });
    await facade.logPlatformDegradedEvent();

    await recoverLate(facade, jest.fn().mockResolvedValue(FLAGS));

    expect(recoveredCalls()).toEqual([[RECOVERED, 1, true]]);
  });

  it("does not fire when flags were present at the check", async () => {
    const facade = degradedBootFacade({
      ...healthyFields(),
      yandexSdkPlayerObject: undefined,
      platformInitTimeoutStage: undefined,
    });
    await facade.logPlatformDegradedEvent();
    expect(degradedCalls()).toEqual([[`${DEGRADED}NoPlayer`, 0, true]]);

    await recoverLate(facade, jest.fn().mockResolvedValue(FLAGS));

    expect(recoveredCalls()).toHaveLength(0);
  });

  it("does not fire without a degraded event", async () => {
    const facade = degradedBootFacade({ platformInitTimeoutStage: undefined });

    await recoverLate(facade, jest.fn().mockResolvedValue(FLAGS));

    expect(recoveredCalls()).toHaveLength(0);
  });

  it("does not fire when the late flags fetch fails too", async () => {
    const facade = degradedBootFacade();
    await facade.logPlatformDegradedEvent();

    await recoverLate(facade, jest.fn().mockRejectedValue(new Error("flags")));

    expect(recoveredCalls()).toHaveLength(0);
  });
});

describe("yandex-games_iframe.html records a failed loader", () => {
  const template = readFileSync(
    join(__dirname, "../../src/client/yandex-games_iframe.html"),
    "utf8",
  );
  const sdkTag = template.match(/<script[^>]*sdk\.js[^>]*>/s)?.[0] ?? "";

  it("onerror sets the flag AND still resolves the ready promise", () => {
    const onerror = sdkTag.match(/onerror="([^"]*)"/)?.[1] ?? "";
    expect(onerror).toContain("window.flashist_sdkScriptLoadFailed = true");
    expect(onerror).toContain("window.flashist_sdkScriptReadyResolve()");
  });

  it("the loader tag carries the id the download retry finds it by (task 0330)", () => {
    expect(sdkTag).toContain(`id="${SDK_LOADER_SCRIPT_ID}"`);
    expect(
      template.match(new RegExp(`id="${SDK_LOADER_SCRIPT_ID}"`, "g")),
    ).toHaveLength(1);
  });

  it("onload does not set the failure flag", () => {
    const onload = sdkTag.match(/onload="([^"]*)"/)?.[1] ?? "";
    expect(onload).toContain("window.flashist_sdkScriptReadyResolve()");
    expect(onload).not.toContain("flashist_sdkScriptLoadFailed");
  });
});

// Last on purpose: flashist_markGameInitComplete opens a module-level gate
// that stays open for the rest of this file.
describe("initializePlatform registers the check at the card's gate", () => {
  it("fires only once the game-init gate opens", async () => {
    const facade = makeFacade({
      runPlatformInit: jest.fn().mockResolvedValue(undefined),
      yandexInitPromiseResolve: jest.fn(),
      yandexSdkInitPlayerPromiseResolve: jest.fn(),
      initializationPromiseResolve: jest.fn(),
      initializationPromise: Promise.resolve(),
    });

    await facade.initializePlatform();
    await flush();
    expect(degradedCalls()).toHaveLength(0);

    flashist_markGameInitComplete();
    await flush();

    expect(degradedCalls()).toEqual([[`${DEGRADED}NoSdk`, 0, true]]);
  });
});
