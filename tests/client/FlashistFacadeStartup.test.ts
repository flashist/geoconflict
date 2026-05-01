/**
 * @jest-environment jsdom
 */

jest.mock("gameanalytics", () => ({
  GameAnalytics: {
    addDesignEvent: jest.fn(),
    addErrorEvent: jest.fn(),
    configureBuild: jest.fn(),
    initialize: jest.fn(),
    setCustomDimension01: jest.fn(),
    setCustomDimension02: jest.fn(),
    setEnabledInfoLog: jest.fn(),
    setEnabledVerboseLog: jest.fn(),
  },
}));

jest.mock("../../src/client/OtelBrowserInit", () => ({
  setOtelUser: jest.fn(),
}));

import { GameAnalytics } from "gameanalytics";
import {
  flashistConstants,
  FlashistFacade,
} from "../../src/client/flashist/FlashistFacade";

describe("FlashistFacade startup analytics", () => {
  const originalDeployEnv = process.env.DEPLOY_ENV;
  let consoleLogSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    process.env.DEPLOY_ENV = "prod";
    localStorage.clear();
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: jest.fn(() => ({ matches: false })),
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    delete (window as Partial<Window> & { YaGames?: unknown }).YaGames;
    process.env.DEPLOY_ENV = originalDeployEnv;
  });

  it("emits the session baseline without permanently marking unknown when player init never resolves", async () => {
    installYandexSdk({
      getPlayer: jest.fn(() => new Promise(() => {})),
      getFlags: jest.fn(() => new Promise(() => {})),
    });

    const facade = new FlashistFacade();
    await flushStartupPromises();

    expect(eventNames()).toContain(
      flashistConstants.analyticEvents.SESSION_START,
    );
    await facade.initializationPromise;

    expect(eventNames()).toEqual(
      expect.arrayContaining([
        flashistConstants.analyticEvents.SESSION_START,
      ]),
    );
    expect(eventNames()).not.toContain(
      flashistConstants.analyticEvents.PLAYER_YANDEX_UNKNOWN,
    );
    expect(eventNames()).not.toContain(
      flashistConstants.analyticEvents.PLAYER_YANDEX_LOGGED_IN,
    );
    expect(eventNames()).not.toContain(
      flashistConstants.analyticEvents.PLAYER_YANDEX_GUEST,
    );
  });

  it("starts fetching experiment flags while player init is still unresolved, but logs them after the session baseline", async () => {
    const flags = deferred<Record<string, string>>();
    const getFlags = jest.fn(() => flags.promise);
    installYandexSdk({
      getPlayer: jest.fn(() => new Promise(() => {})),
      getFlags,
    });

    const facade = new FlashistFacade();
    await flushStartupPromises();

    expect(getFlags).toHaveBeenCalledTimes(1);

    flags.resolve({ Tutorial: "Enabled" });
    await flushPromises();

    await facade.initializationPromise;
    await flushPromises();

    expectEventOrder([
      flashistConstants.analyticEvents.SESSION_START,
      "Experiment:Tutorial:Enabled",
    ]);
  });

  it("emits logged-in status when player authorization resolves before the timeout", async () => {
    installYandexSdk({
      getPlayer: jest.fn(() =>
        Promise.resolve({
          getName: () => "Authorized Player",
          isAuthorized: () => true,
        }),
      ),
      getFlags: jest.fn(() => Promise.resolve({})),
    });

    const facade = new FlashistFacade();
    await facade.initializationPromise;
    await flushPromises();

    expect(eventNames()).toContain(
      flashistConstants.analyticEvents.PLAYER_YANDEX_LOGGED_IN,
    );
    expect(eventNames()).not.toContain(
      flashistConstants.analyticEvents.PLAYER_YANDEX_UNKNOWN,
    );
  });

  it("emits logged-in status when slow player authorization resolves after the session baseline", async () => {
    const player = deferred<{
      getName: () => string;
      isAuthorized: () => boolean;
    }>();
    installYandexSdk({
      getPlayer: jest.fn(() => player.promise),
      getFlags: jest.fn(() => Promise.resolve({})),
    });

    const facade = new FlashistFacade();
    await flushStartupPromises();
    await jest.advanceTimersByTimeAsync(1_000);
    await facade.initializationPromise;

    expect(eventNames()).toContain(
      flashistConstants.analyticEvents.SESSION_START,
    );
    expect(eventNames()).not.toContain(
      flashistConstants.analyticEvents.PLAYER_YANDEX_UNKNOWN,
    );
    expect(eventNames()).not.toContain(
      flashistConstants.analyticEvents.PLAYER_YANDEX_LOGGED_IN,
    );

    player.resolve({
      getName: () => "Slow Authorized Player",
      isAuthorized: () => true,
    });
    await flushPromises();

    expect(eventNames()).toContain(
      flashistConstants.analyticEvents.PLAYER_YANDEX_LOGGED_IN,
    );
    expect(eventNames()).not.toContain(
      flashistConstants.analyticEvents.PLAYER_YANDEX_UNKNOWN,
    );
  });

  it("emits unknown Yandex status when player init rejects", async () => {
    installYandexSdk({
      getPlayer: jest.fn(() => Promise.reject(new Error("player failed"))),
      getFlags: jest.fn(() => Promise.resolve({})),
    });

    const facade = new FlashistFacade();
    await facade.initializationPromise;
    await flushPromises();

    expect(eventNames()).toContain(
      flashistConstants.analyticEvents.PLAYER_YANDEX_UNKNOWN,
    );
  });

  it("emits the session baseline with unknown Yandex status when SDK init never resolves", async () => {
    installYandexInit(jest.fn(() => new Promise(() => {})));

    const facade = new FlashistFacade();
    await flushStartupPromises();

    expect(eventNames()).not.toContain(
      flashistConstants.analyticEvents.SESSION_START,
    );

    await jest.advanceTimersByTimeAsync(1_000);
    await facade.initializationPromise;

    expect(eventNames()).toEqual(
      expect.arrayContaining([
        flashistConstants.analyticEvents.SESSION_START,
        flashistConstants.analyticEvents.PLAYER_YANDEX_UNKNOWN,
      ]),
    );
  });

  it("emits the session baseline with unknown Yandex status when SDK init rejects", async () => {
    installYandexInit(jest.fn(() => Promise.reject(new Error("sdk failed"))));

    const facade = new FlashistFacade();
    await facade.initializationPromise;

    expect(eventNames()).toEqual(
      expect.arrayContaining([
        flashistConstants.analyticEvents.SESSION_START,
        flashistConstants.analyticEvents.PLAYER_YANDEX_UNKNOWN,
      ]),
    );
  });
});

function installYandexSdk({
  getPlayer,
  getFlags,
}: {
  getPlayer: jest.Mock;
  getFlags: jest.Mock;
}): void {
  (window as Window & { YaGames?: unknown }).YaGames = {
    init: jest.fn(() =>
      Promise.resolve({
        getFlags,
        getPlayer,
      }),
    ),
  };
}

function installYandexInit(init: jest.Mock): void {
  (window as Window & { YaGames?: unknown }).YaGames = { init };
}

function eventNames(): string[] {
  return (GameAnalytics.addDesignEvent as jest.Mock).mock.calls.map(
    ([event]) => event,
  );
}

function expectEventOrder(expectedEvents: string[]): void {
  const events = eventNames();
  const indexes = expectedEvents.map((event) => events.indexOf(event));
  expect(indexes.every((index) => index >= 0)).toBe(true);
  expect(indexes).toEqual([...indexes].sort((a, b) => a - b));
}

function deferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
} {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((innerResolve) => {
    resolve = innerResolve;
  });
  return { promise, resolve };
}

async function flushPromises(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

async function flushStartupPromises(): Promise<void> {
  await jest.advanceTimersByTimeAsync(0);
  await flushPromises();
}
