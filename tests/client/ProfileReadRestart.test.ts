jest.mock("../../src/client/flashist/FlashistFacade", () => ({
  flashist_logEventAnalytics: jest.fn(),
  flashistConstants: {
    analyticEvents: {
      CITIZENSHIP_STATUS_RESTART: "Citizenship:Status:Restart",
    },
  },
}));

import { flashist_logEventAnalytics } from "../../src/client/flashist/FlashistFacade";
import {
  PROFILE_READ_RESTART_MARKER_KEY,
  resetProfileReadRestartForTests,
  restartAfterProfileReadFailure,
  wasRestartedAfterProfileReadFailure,
} from "../../src/client/ProfileReadRestart";

const logEventAnalytics = flashist_logEventAnalytics as jest.Mock;

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: jest.fn((key: string) => data.get(key) ?? null),
    setItem: jest.fn((key: string, value: string) => {
      data.set(key, value);
    }),
    removeItem: jest.fn((key: string) => {
      data.delete(key);
    }),
  };
}

function throwingStorage() {
  const fail = () => {
    throw new Error("storage blocked");
  };
  return {
    getItem: jest.fn(fail),
    setItem: jest.fn(fail),
    removeItem: jest.fn(fail),
  };
}

// Task 0397 (owner ruling Q3): the couldn't-load notice's Restart game button.
describe("restartAfterProfileReadFailure", () => {
  beforeEach(() => {
    logEventAnalytics.mockClear();
    resetProfileReadRestartForTests();
  });

  it("refuses off the start screen: no reload, no event, no marker", () => {
    const reload = jest.fn();
    const storage = memoryStorage();

    const result = restartAfterProfileReadFailure({
      isOnStartScreen: () => false,
      reload,
      storage,
    });

    expect(result).toBe(false);
    expect(reload).not.toHaveBeenCalled();
    expect(logEventAnalytics).not.toHaveBeenCalled();
    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it("on the start screen: writes the marker, logs Restart once, then reloads", () => {
    const order: string[] = [];
    const reload = jest.fn(() => order.push("reload"));
    logEventAnalytics.mockImplementation(() => order.push("event"));
    const storage = memoryStorage();
    storage.setItem.mockImplementation((key: string, value: string) => {
      order.push("marker");
      storage.data.set(key, value);
    });

    const result = restartAfterProfileReadFailure({
      isOnStartScreen: () => true,
      reload,
      storage,
    });

    expect(result).toBe(true);
    expect(order).toEqual(["marker", "event", "reload"]);
    expect(logEventAnalytics.mock.calls).toEqual([
      ["Citizenship:Status:Restart"],
    ]);
    expect(storage.data.has(PROFILE_READ_RESTART_MARKER_KEY)).toBe(true);
    logEventAnalytics.mockReset();
  });

  it("a throwing storage still reloads (only the still-failing text is lost)", () => {
    const reload = jest.fn();

    const result = restartAfterProfileReadFailure({
      isOnStartScreen: () => true,
      reload,
      storage: throwingStorage(),
    });

    expect(result).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(logEventAnalytics).toHaveBeenCalledWith(
      "Citizenship:Status:Restart",
    );
  });

  it("no storage at all still reloads", () => {
    const reload = jest.fn();
    expect(
      restartAfterProfileReadFailure({
        isOnStartScreen: () => true,
        reload,
        storage: null,
      }),
    ).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
  });
});

describe("wasRestartedAfterProfileReadFailure", () => {
  beforeEach(() => {
    resetProfileReadRestartForTests();
  });

  it("reads the marker once, removes it at once, and memoizes the answer", () => {
    const storage = memoryStorage({ [PROFILE_READ_RESTART_MARKER_KEY]: "1" });

    expect(wasRestartedAfterProfileReadFailure(storage)).toBe(true);
    expect(storage.data.has(PROFILE_READ_RESTART_MARKER_KEY)).toBe(false);
    expect(wasRestartedAfterProfileReadFailure(storage)).toBe(true);
    expect(storage.getItem).toHaveBeenCalledTimes(1);
  });

  it("is false without a marker, and memoized too", () => {
    const storage = memoryStorage();
    expect(wasRestartedAfterProfileReadFailure(storage)).toBe(false);
    storage.data.set(PROFILE_READ_RESTART_MARKER_KEY, "1");
    expect(wasRestartedAfterProfileReadFailure(storage)).toBe(false);
  });

  it("never carries past the next load: a fresh page after a read sees nothing", () => {
    const storage = memoryStorage({ [PROFILE_READ_RESTART_MARKER_KEY]: "1" });
    expect(wasRestartedAfterProfileReadFailure(storage)).toBe(true);

    resetProfileReadRestartForTests(); // the following page load
    expect(wasRestartedAfterProfileReadFailure(storage)).toBe(false);
  });

  it("any storage error reads false", () => {
    expect(wasRestartedAfterProfileReadFailure(throwingStorage())).toBe(false);
  });

  it("no storage reads false", () => {
    expect(wasRestartedAfterProfileReadFailure(null)).toBe(false);
  });
});
