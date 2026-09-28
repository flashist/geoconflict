/**
 * @jest-environment jsdom
 */
import { GameAnalytics } from "gameanalytics";
import {
  FlashistFacade,
  flashistConstants,
} from "../../src/client/flashist/FlashistFacade";
import type { SdkLoaderAttemptResult } from "../../src/client/SdkLoaderRetry";

jest.mock("gameanalytics");

// Task 0330: a failed SDK loader DOWNLOAD is retried (+0.5 s, +1.5 s inside the
// 5 s deadline, then +5 / +15 / +45 s in the background). YaGames.init() is
// never retried. Driven on a bare prototype instance (the 0328/0329 suites'
// pattern): class-field initializers do not run on Object.create, so state is
// seeded explicitly. The download attempt itself is stubbed; the stub defines
// window.YaGames when it reports "load", as the real loader would.

const events = flashistConstants.analyticEvents;
const DEGRADED = events.SESSION_PLATFORM_DEGRADED_FIRST_PART;
const RETRY = events.SESSION_SDK_LOADER_RETRY_FIRST_PART;

type Internals = {
  yandexSdkInit(): Promise<void>;
  runPlatformInit(): Promise<void>;
  logPlatformDegradedEvent(): Promise<void>;
  sdkInitRejected?: boolean;
  yandexGamesSDK?: unknown;
};
type TestFacade = Omit<FlashistFacade, keyof Internals> & Internals;

const FLAGS = { citizenship_ui: "enabled" };
const loggedInPlayer = { isAuthorized: () => true };

const win = window as unknown as Record<string, unknown>;
const addDesignEvent = GameAnalytics.addDesignEvent as jest.Mock;

const callsOf = (event: string) =>
  addDesignEvent.mock.calls.filter(([name]) => name === event);
const callsStartingWith = (prefix: string) =>
  addDesignEvent.mock.calls.filter(
    ([name]) => typeof name === "string" && name.startsWith(prefix),
  );

type Step = SdkLoaderAttemptResult | (() => Promise<SdkLoaderAttemptResult>);

/**
 * A stubbed download attempt that follows a script. A "load" defines
 * window.YaGames (the loader ran); "error" / "missing" leave it undefined.
 */
function scriptedDownloads(steps: Step[], yaGames: unknown) {
  const queue = [...steps];
  return jest.fn(async (): Promise<SdkLoaderAttemptResult> => {
    const step = queue.shift() ?? "error";
    const result = typeof step === "function" ? await step() : step;
    if (result === "load" && yaGames !== undefined) {
      win.YaGames = yaGames;
    }
    return result;
  });
}

function makeSdk() {
  return {
    getFlags: jest.fn().mockResolvedValue(FLAGS),
    getPlayer: jest.fn().mockResolvedValue(loggedInPlayer),
  };
}

function deferred<T = void>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

/** Marks the template's first loader download as failed (its onerror ran). */
function failFirstDownload(): void {
  win.flashist_sdkScriptReadyPromise = Promise.resolve();
  win.flashist_sdkScriptLoadFailed = true;
}

/**
 * A facade ready for the whole runPlatformInit(): real deferreds, real
 * yandexSdkInit and flags; player init stubbed to read the SDK's player.
 */
function bootFacade(options: {
  steps: Step[];
  init?: jest.Mock;
  sdk?: ReturnType<typeof makeSdk>;
  fields?: Record<string, unknown>;
}) {
  const sdk = options.sdk ?? makeSdk();
  const init = options.init ?? jest.fn().mockResolvedValue(sdk);
  const attempt = scriptedDownloads(options.steps, { init });
  const yandexInit = deferred();
  const playerInit = deferred();
  const facade = Object.assign(Object.create(FlashistFacade.prototype), {
    yaGamesAvailable: true,
    yandexInitPromise: yandexInit.promise,
    yandexInitPromiseResolve: yandexInit.resolve,
    yandexSdkInitPlayerPromise: playerInit.promise,
    yandexSdkInitPlayerPromiseResolve: playerInit.resolve,
    hasLoggedExperimentEvents: true,
    attemptSdkLoaderDownload: attempt,
    initPayments: jest.fn().mockResolvedValue(undefined),
    primeCitizenshipSurfacesSnapshot: jest.fn(),
    yandexGamesReadyCallback: jest.fn(),
    getLanguageCode: jest.fn().mockResolvedValue("ru"),
    getCurPlayerName: jest.fn().mockResolvedValue(undefined),
    ...options.fields,
  }) as TestFacade & Record<string, unknown>;
  facade.initPlayer = jest.fn(async () => {
    const current = facade.yandexGamesSDK as
      | ReturnType<typeof makeSdk>
      | undefined;
    if (current) {
      facade.yandexSdkPlayerObject = await current.getPlayer();
    }
  });
  return { facade, attempt, init, sdk };
}

function track(promise: Promise<unknown>): { settled: () => boolean } {
  let settled = false;
  void promise.then(() => {
    settled = true;
  });
  return { settled: () => settled };
}

const originalDeployEnv = process.env.DEPLOY_ENV;

beforeEach(() => {
  // flashist_logEventAnalytics only reaches GameAnalytics on prod builds.
  process.env.DEPLOY_ENV = "prod";
  addDesignEvent.mockReset();
  (GameAnalytics.addErrorEvent as jest.Mock).mockReset();
  jest.spyOn(console, "log").mockImplementation(() => {});
  jest.spyOn(console, "warn").mockImplementation(() => {});
  jest.useFakeTimers();
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
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe("enum key (task 0330)", () => {
  it("the retry-outcome prefix has the agreed string", () => {
    expect(events.SESSION_SDK_LOADER_RETRY_FIRST_PART).toBe(
      "Session:SdkLoaderRetry:",
    );
  });
});

describe("in-deadline retry", () => {
  it("fail → retry → success: normal boot, init() once, no degraded or timeout event", async () => {
    failFirstDownload();
    const { facade, attempt, init } = bootFacade({ steps: ["load"] });
    const recoveredLate = track(facade.whenPlatformRecoveredLate());

    const run = facade.runPlatformInit();
    await jest.advanceTimersByTimeAsync(499);
    expect(attempt).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(1);
    expect(attempt).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(5000);
    await run;
    await facade.logPlatformDegradedEvent();
    await jest.advanceTimersByTimeAsync(120_000);

    expect(init).toHaveBeenCalledTimes(1);
    expect(attempt).toHaveBeenCalledTimes(1);
    expect(recoveredLate.settled()).toBe(false);
    expect(callsStartingWith(DEGRADED)).toHaveLength(0);
    expect(callsOf(events.SESSION_PLATFORM_INIT_TIMEOUT)).toHaveLength(0);
    expect(callsStartingWith(RETRY)).toEqual([[`${RETRY}Recovered`, 1, true]]);
  });

  it("the second quick retry (+2 s) succeeding logs Recovered with value 2", async () => {
    failFirstDownload();
    const { facade, attempt, init } = bootFacade({ steps: ["error", "load"] });

    const run = facade.runPlatformInit();
    await jest.advanceTimersByTimeAsync(10_000);
    await run;

    expect(attempt).toHaveBeenCalledTimes(2);
    expect(init).toHaveBeenCalledTimes(1);
    expect(callsStartingWith(RETRY)).toEqual([[`${RETRY}Recovered`, 2, true]]);
  });

  it("the 1 s login window starts from the loader that loaded → LoggedIn, not Unknown", async () => {
    failFirstDownload();
    const { facade } = bootFacade({ steps: ["error", "load"] });

    const run = facade.runPlatformInit();
    await jest.advanceTimersByTimeAsync(10_000);
    await run;
    await jest.advanceTimersByTimeAsync(0);

    expect(callsOf(events.PLAYER_YANDEX_UNKNOWN)).toHaveLength(0);
    expect(callsOf(events.PLAYER_YANDEX_LOGGED_IN)).toHaveLength(1);
  });

  it("a quick retry still downloading at 5 s: timeout as today, then a late load takes the late path", async () => {
    failFirstDownload();
    const slow = deferred<SdkLoaderAttemptResult>();
    const { facade, attempt, init } = bootFacade({
      steps: [() => slow.promise],
    });
    const recoveredLate = track(facade.whenPlatformRecoveredLate());

    const run = facade.runPlatformInit();
    await jest.advanceTimersByTimeAsync(5000);
    await run;
    expect(callsOf(events.SESSION_PLATFORM_INIT_TIMEOUT)).toHaveLength(1);

    slow.resolve("load");
    await jest.advanceTimersByTimeAsync(1000);

    expect(attempt).toHaveBeenCalledTimes(1);
    expect(init).toHaveBeenCalledTimes(1);
    expect(recoveredLate.settled()).toBe(true);
    expect(callsStartingWith(RETRY)).toEqual([
      [`${RETRY}RecoveredLate`, 1, true],
    ]);
  });
});

describe("background retry after the quick ones fail", () => {
  it("fail ×3 → degraded (ScriptFailed) → background success → late recovery", async () => {
    failFirstDownload();
    const { facade, attempt, init } = bootFacade({
      steps: ["error", "error", "load"],
    });
    const recoveredLate = track(facade.whenPlatformRecoveredLate());

    const run = facade.runPlatformInit();
    // Quick retries at +0.5 s and +2 s both fail; the boot continues degraded
    // at ~2 s, well before the 5 s deadline.
    await jest.advanceTimersByTimeAsync(2000);
    await run;
    expect(attempt).toHaveBeenCalledTimes(2);
    expect(init).not.toHaveBeenCalled();
    // The game-init gate check.
    await facade.logPlatformDegradedEvent();
    expect(callsStartingWith(DEGRADED)).toEqual([
      [`${DEGRADED}ScriptFailed`, 0, true],
    ]);
    expect(recoveredLate.settled()).toBe(false);

    // Background retry at +5 s after the quick ones.
    await jest.advanceTimersByTimeAsync(4999);
    expect(attempt).toHaveBeenCalledTimes(2);
    await jest.advanceTimersByTimeAsync(1);
    await jest.advanceTimersByTimeAsync(0);

    expect(attempt).toHaveBeenCalledTimes(3);
    expect(init).toHaveBeenCalledTimes(1);
    expect(recoveredLate.settled()).toBe(true);
    expect(callsOf(events.SESSION_PLATFORM_RECOVERED)).toEqual([
      [events.SESSION_PLATFORM_RECOVERED, 0, true],
    ]);
    expect(callsOf(events.SESSION_PLATFORM_INIT_TIMEOUT)).toHaveLength(0);
    expect(callsStartingWith(RETRY)).toEqual([
      [`${RETRY}RecoveredLate`, 3, true],
    ]);
  });

  it("the cap: exactly 5 retries at +0.5, +2, +7, +22, +67 s, then none; GaveUp once with 5", async () => {
    failFirstDownload();
    const { facade, attempt, init } = bootFacade({ steps: [] });

    const start = Date.now();
    const expectAttemptsAt = async (ms: number, count: number) => {
      await jest.advanceTimersByTimeAsync(start + ms - Date.now());
      expect(attempt).toHaveBeenCalledTimes(count);
    };
    const run = facade.runPlatformInit();
    await expectAttemptsAt(499, 0);
    await expectAttemptsAt(500, 1);
    await expectAttemptsAt(1999, 1);
    await expectAttemptsAt(2000, 2);
    await run;
    await expectAttemptsAt(6999, 2);
    await expectAttemptsAt(7000, 3);
    await expectAttemptsAt(21_999, 3);
    await expectAttemptsAt(22_000, 4);
    await expectAttemptsAt(66_999, 4);
    await expectAttemptsAt(67_000, 5);
    await jest.advanceTimersByTimeAsync(10 * 60_000);

    expect(attempt).toHaveBeenCalledTimes(5);
    expect(init).not.toHaveBeenCalled();
    expect(callsStartingWith(RETRY)).toEqual([[`${RETRY}GaveUp`, 5, true]]);
  });
});

describe("what is never retried", () => {
  it("the onload path (no failure recorded) never retries", async () => {
    win.flashist_sdkScriptReadyPromise = Promise.resolve();
    const { facade, attempt, init } = bootFacade({ steps: ["load"] });
    win.YaGames = { init };

    const run = facade.runPlatformInit();
    await jest.advanceTimersByTimeAsync(120_000);
    await run;

    expect(attempt).not.toHaveBeenCalled();
    expect(init).toHaveBeenCalledTimes(1);
    expect(callsStartingWith(RETRY)).toHaveLength(0);
  });

  it("an init() rejection after a normal load is never retried", async () => {
    win.flashist_sdkScriptReadyPromise = Promise.resolve();
    const init = jest.fn().mockRejectedValue(new Error("init"));
    const { facade, attempt } = bootFacade({ steps: [], init });
    win.YaGames = { init };

    await facade.yandexSdkInit();
    await jest.advanceTimersByTimeAsync(120_000);

    expect(init).toHaveBeenCalledTimes(1);
    expect(attempt).not.toHaveBeenCalled();
    expect(facade.sdkInitRejected).toBe(true);
  });

  it("an init() rejection after a retried load is never retried, nor the download", async () => {
    failFirstDownload();
    const init = jest.fn().mockRejectedValue(new Error("init"));
    const { facade, attempt } = bootFacade({ steps: ["load"], init });

    const sdkInit = facade.yandexSdkInit();
    await jest.advanceTimersByTimeAsync(500);
    await sdkInit;
    await jest.advanceTimersByTimeAsync(120_000);

    expect(init).toHaveBeenCalledTimes(1);
    expect(attempt).toHaveBeenCalledTimes(1);
    expect(facade.sdkInitRejected).toBe(true);
  });

  it("a retried load that leaves no YaGames is never downloaded again", async () => {
    failFirstDownload();
    const { facade, attempt } = bootFacade({ steps: ["load"] });
    // The stub's "load" defines nothing here.
    facade.attemptSdkLoaderDownload = jest.fn(async () => "load" as const);

    const sdkInit = facade.yandexSdkInit();
    await jest.advanceTimersByTimeAsync(500);
    await sdkInit;
    await jest.advanceTimersByTimeAsync(120_000);

    expect(facade.attemptSdkLoaderDownload).toHaveBeenCalledTimes(1);
    expect(attempt).not.toHaveBeenCalled();
  });

  it("a missing loader tag → no retry, no background phase, GaveUp with 0", async () => {
    failFirstDownload();
    const { facade, attempt, init } = bootFacade({ steps: ["missing"] });

    const sdkInit = facade.yandexSdkInit();
    await jest.advanceTimersByTimeAsync(500);
    await sdkInit;
    await jest.advanceTimersByTimeAsync(120_000);

    expect(attempt).toHaveBeenCalledTimes(1);
    expect(init).not.toHaveBeenCalled();
    expect(callsStartingWith(RETRY)).toEqual([[`${RETRY}GaveUp`, 0, true]]);
  });

  it("standalone page (no template promise, no flag) → no attempt", async () => {
    const { facade, attempt } = bootFacade({ steps: ["load"] });

    await facade.yandexSdkInit();
    await jest.advanceTimersByTimeAsync(120_000);

    expect(attempt).not.toHaveBeenCalled();
    expect(callsStartingWith(RETRY)).toHaveLength(0);
  });

  it("yandexSdkInit called twice starts the background phase once", async () => {
    failFirstDownload();
    const { facade, attempt } = bootFacade({ steps: [] });

    const first = facade.yandexSdkInit();
    const second = facade.yandexSdkInit();
    await jest.advanceTimersByTimeAsync(2000);
    await Promise.all([first, second]);
    await jest.advanceTimersByTimeAsync(10 * 60_000);

    expect(attempt).toHaveBeenCalledTimes(5);
    expect(callsStartingWith(RETRY)).toHaveLength(1);
  });
});

describe("Session:PlatformDegraded classification after a retry", () => {
  it("retried-then-OK with no player → NoPlayer, not ScriptFailed", async () => {
    failFirstDownload();
    const sdk = makeSdk();
    const { facade } = bootFacade({
      steps: ["load"],
      sdk,
      fields: { yandexInitPromise: Promise.resolve() },
    });

    const sdkInit = facade.yandexSdkInit();
    await jest.advanceTimersByTimeAsync(500);
    await sdkInit;
    await facade.logPlatformDegradedEvent();

    expect(callsStartingWith(DEGRADED)).toEqual([
      [`${DEGRADED}NoPlayer`, 0, true],
    ]);
  });

  it("a background save before the gate check, init() still pending → ScriptFailed, not NoSdk", async () => {
    // Review R1: only a save inside the 5 s window clears the ScriptFailed
    // label. A background save is after the boot went degraded.
    failFirstDownload();
    const pendingInit = deferred<unknown>();
    const { facade, attempt, init } = bootFacade({
      steps: ["error", "error", "load"],
      init: jest.fn(() => pendingInit.promise),
    });

    const run = facade.runPlatformInit();
    await jest.advanceTimersByTimeAsync(2000);
    await run;
    // The background retry at +5 s loads before the game-init gate check.
    await jest.advanceTimersByTimeAsync(5000);
    expect(attempt).toHaveBeenCalledTimes(3);
    expect(init).toHaveBeenCalledTimes(1);

    await facade.logPlatformDegradedEvent();

    expect(callsStartingWith(DEGRADED)).toEqual([
      [`${DEGRADED}ScriptFailed`, 0, true],
    ]);
  });

  it("a quick retry that loads after the 5 s deadline, before the check → ScriptFailed", async () => {
    // Review R1: a late quick-phase save (RecoveredLate) is not an in-window
    // save either.
    failFirstDownload();
    const slow = deferred<SdkLoaderAttemptResult>();
    const pendingInit = deferred<unknown>();
    const { facade } = bootFacade({
      steps: [() => slow.promise],
      init: jest.fn(() => pendingInit.promise),
    });

    const run = facade.runPlatformInit();
    await jest.advanceTimersByTimeAsync(5000);
    await run;
    slow.resolve("load");
    await jest.advanceTimersByTimeAsync(0);

    await facade.logPlatformDegradedEvent();

    expect(callsStartingWith(DEGRADED)).toEqual([
      [`${DEGRADED}ScriptFailed`, 0, true],
    ]);
  });

  it("every quick retry failed → ScriptFailed", async () => {
    failFirstDownload();
    const { facade } = bootFacade({
      steps: [],
      fields: { yandexInitPromise: Promise.resolve() },
    });

    const sdkInit = facade.yandexSdkInit();
    await jest.advanceTimersByTimeAsync(2000);
    await sdkInit;
    await facade.logPlatformDegradedEvent();

    expect(callsStartingWith(DEGRADED)).toEqual([
      [`${DEGRADED}ScriptFailed`, 0, true],
    ]);
  });
});
