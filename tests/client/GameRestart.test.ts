/**
 * @jest-environment jsdom
 */
// The full restart after an in-page login (task 0273, S4; owner ruling D3).
// The one test that must never regress is the mid-match guard: this code may
// never reload out of a live match.

jest.mock("../../src/client/flashist/FlashistFacade", () => ({
  flashist_logEventAnalytics: jest.fn(),
  flashistConstants: {
    analyticEvents: {
      PROFILE_LOGIN_RESTART_PERFORMED: "Profile:Login:Restart:Performed",
      PROFILE_LOGIN_RESTART_SUPPRESSED_IN_MATCH:
        "Profile:Login:Restart:Suppressed:InMatch",
      PROFILE_LOGIN_RESTART_SUPPRESSED_LATCHED:
        "Profile:Login:Restart:Suppressed:Latched",
      PROFILE_LOGIN_RESTART_SUPPRESSED_NO_STORAGE:
        "Profile:Login:Restart:Suppressed:NoStorage",
    },
  },
}));

import { flashist_logEventAnalytics } from "../../src/client/flashist/FlashistFacade";
import {
  PROFILE_LOGIN_RESTART_LATCH_KEY,
  requestGameRestart,
} from "../../src/client/GameRestart";

const logEventAnalytics = flashist_logEventAnalytics as jest.Mock;

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("requestGameRestart", () => {
  it("reloads once, writes the latch and reports Performed", () => {
    const reload = jest.fn();
    const fallback = jest.fn();
    const storage = memoryStorage();

    requestGameRestart({ matchActive: false, reload, storage, fallback });

    expect(reload).toHaveBeenCalledTimes(1);
    expect(fallback).not.toHaveBeenCalled();
    expect(storage.data.get(PROFILE_LOGIN_RESTART_LATCH_KEY)).toBe("1");
    expect(logEventAnalytics).toHaveBeenCalledWith(
      "Profile:Login:Restart:Performed",
    );
  });

  // Mutation: drop the latch write → this goes red.
  it("reloads at most ONCE per page load", () => {
    const reload = jest.fn();
    const fallback = jest.fn();
    const storage = memoryStorage();

    requestGameRestart({ matchActive: false, reload, storage, fallback });
    requestGameRestart({ matchActive: false, reload, storage, fallback });
    requestGameRestart({ matchActive: false, reload, storage, fallback });

    expect(reload).toHaveBeenCalledTimes(1);
    expect(fallback).toHaveBeenCalledTimes(2);
    expect(logEventAnalytics).toHaveBeenCalledWith(
      "Profile:Login:Restart:Suppressed:Latched",
    );
  });

  // ⚠️ Mutation: drop the match guard → red. This must never regress.
  it("NEVER reloads while a match is running", () => {
    const reload = jest.fn();
    const fallback = jest.fn();
    const storage = memoryStorage();

    requestGameRestart({ matchActive: true, reload, storage, fallback });

    expect(reload).not.toHaveBeenCalled();
    expect(fallback).toHaveBeenCalledTimes(1);
    expect(storage.data.size).toBe(0);
    expect(logEventAnalytics).toHaveBeenCalledWith(
      "Profile:Login:Restart:Suppressed:InMatch",
    );
  });

  it("checks the match guard BEFORE the latch, so a suppressed match tap can still restart later", () => {
    const reload = jest.fn();
    const fallback = jest.fn();
    const storage = memoryStorage();

    requestGameRestart({ matchActive: true, reload, storage, fallback });
    requestGameRestart({ matchActive: false, reload, storage, fallback });

    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("honours a latch left by an earlier page state", () => {
    const reload = jest.fn();
    const fallback = jest.fn();
    const storage = memoryStorage({ [PROFILE_LOGIN_RESTART_LATCH_KEY]: "1" });

    requestGameRestart({ matchActive: false, reload, storage, fallback });

    expect(reload).not.toHaveBeenCalled();
    expect(fallback).toHaveBeenCalledTimes(1);
  });

  // Mutation: remove the try/catch → the throw escapes into the click handler.
  // Mutation: drop the Suppressed:NoStorage report → the event assertion goes red
  // (owner-approved sixth event, review round 1 R4: a Requested must never be
  // left without an outcome event).
  it("does not reload and does not throw when storage throws on read, and reports NoStorage", () => {
    const reload = jest.fn();
    const fallback = jest.fn();
    const storage = {
      getItem: () => {
        throw new Error("storage disabled");
      },
      setItem: () => {},
    };

    expect(() =>
      requestGameRestart({ matchActive: false, reload, storage, fallback }),
    ).not.toThrow();
    expect(reload).not.toHaveBeenCalled();
    expect(fallback).toHaveBeenCalledTimes(1);
    expect(logEventAnalytics.mock.calls).toEqual([
      ["Profile:Login:Restart:Suppressed:NoStorage"],
    ]);
  });

  it("does not reload and does not throw when storage throws on write, and reports NoStorage", () => {
    const reload = jest.fn();
    const fallback = jest.fn();
    const storage = {
      getItem: () => null,
      setItem: () => {
        throw new Error("storage full");
      },
    };

    expect(() =>
      requestGameRestart({ matchActive: false, reload, storage, fallback }),
    ).not.toThrow();
    expect(reload).not.toHaveBeenCalled();
    expect(fallback).toHaveBeenCalledTimes(1);
    expect(logEventAnalytics.mock.calls).toEqual([
      ["Profile:Login:Restart:Suppressed:NoStorage"],
    ]);
  });

  it("treats missing storage (null) the same as a throwing one — no reload, and reports NoStorage", () => {
    const reload = jest.fn();
    const fallback = jest.fn();

    requestGameRestart({
      matchActive: false,
      reload,
      storage: null,
      fallback,
    });

    expect(reload).not.toHaveBeenCalled();
    expect(fallback).toHaveBeenCalledTimes(1);
    expect(logEventAnalytics.mock.calls).toEqual([
      ["Profile:Login:Restart:Suppressed:NoStorage"],
    ]);
  });

  it("swallows a throwing fallback so one broken path cannot break the handler", () => {
    const reload = jest.fn();
    const fallback = jest.fn(() => {
      throw new Error("refresh failed");
    });

    expect(() =>
      requestGameRestart({
        matchActive: true,
        reload,
        storage: memoryStorage(),
        fallback,
      }),
    ).not.toThrow();
  });
});
