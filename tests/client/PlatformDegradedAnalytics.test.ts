/**
 * @jest-environment jsdom
 */
import {
  AFTER_LONG_SESSION_REFRESH_KEY,
  AFTER_MATCH_EXIT_KEY,
  classifyPlatformDegradedCause,
  consumeLongSessionRefreshMarker,
  consumeMatchExitMarker,
  markLongSessionRefresh,
  markMatchExit,
  type PlatformDegradedState,
} from "../../src/client/PlatformDegradedAnalytics";

// Task 0328: the pure half of Session:PlatformDegraded:{Cause} — the cause
// classifier and the sessionStorage "this boot follows a match exit" marker.

const HEALTHY: PlatformDegradedState = {
  scriptFailed: false,
  scriptTimedOut: false,
  initFailed: false,
  initTimedOut: false,
  hasSdk: true,
  hasPlayer: true,
  hasFlags: true,
};

function state(fields: Partial<PlatformDegradedState>): PlatformDegradedState {
  return { ...HEALTHY, ...fields };
}

describe("classifyPlatformDegradedCause", () => {
  it("returns null when SDK, player and flags are all present", () => {
    expect(classifyPlatformDegradedCause(HEALTHY)).toBeNull();
  });

  it.each([
    ["ScriptFailed", state({ scriptFailed: true, hasSdk: false })],
    ["ScriptTimeout", state({ scriptTimedOut: true, hasSdk: false })],
    ["InitFailed", state({ initFailed: true, hasSdk: false })],
    ["InitTimeout", state({ initTimedOut: true, hasSdk: false })],
    ["NoSdk", state({ hasSdk: false, hasPlayer: false, hasFlags: false })],
    ["NoPlayer", state({ hasPlayer: false })],
    ["NoFlags", state({ hasFlags: false })],
  ])("reports %s on its own", (cause, input) => {
    expect(classifyPlatformDegradedCause(input)).toBe(cause);
  });

  it("first match wins: ScriptFailed beats NoPlayer and NoFlags", () => {
    expect(
      classifyPlatformDegradedCause(
        state({
          scriptFailed: true,
          hasSdk: false,
          hasPlayer: false,
          hasFlags: false,
        }),
      ),
    ).toBe("ScriptFailed");
  });

  it("first match wins: InitFailed beats InitTimeout", () => {
    expect(
      classifyPlatformDegradedCause(
        state({ initFailed: true, initTimedOut: true, hasSdk: false }),
      ),
    ).toBe("InitFailed");
  });

  it("first match wins: ScriptFailed beats ScriptTimeout", () => {
    expect(
      classifyPlatformDegradedCause(
        state({ scriptFailed: true, scriptTimedOut: true, hasSdk: false }),
      ),
    ).toBe("ScriptFailed");
  });

  it("first match wins: ScriptTimeout beats InitFailed", () => {
    expect(
      classifyPlatformDegradedCause(
        state({ scriptTimedOut: true, initFailed: true, hasSdk: false }),
      ),
    ).toBe("ScriptTimeout");
  });

  it("first match wins: InitTimeout beats NoFlags once the SDK arrived late", () => {
    expect(
      classifyPlatformDegradedCause(
        state({ initTimedOut: true, hasSdk: true, hasFlags: false }),
      ),
    ).toBe("InitTimeout");
  });

  it("first match wins: NoPlayer beats NoFlags", () => {
    expect(
      classifyPlatformDegradedCause(
        state({ hasPlayer: false, hasFlags: false }),
      ),
    ).toBe("NoPlayer");
  });

  it("a timeout that recovered in full before the check is not degraded", () => {
    expect(
      classifyPlatformDegradedCause(state({ initTimedOut: true })),
    ).toBeNull();
  });
});

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    map,
    getItem: jest.fn((key: string) => map.get(key) ?? null),
    setItem: jest.fn((key: string, value: string) => {
      map.set(key, value);
    }),
    removeItem: jest.fn((key: string) => {
      map.delete(key);
    }),
  };
}

describe("match-exit marker", () => {
  it("mark then consume is true once, then false", () => {
    const storage = memoryStorage();
    markMatchExit(storage);
    expect(storage.map.get(AFTER_MATCH_EXIT_KEY)).toBe("1");

    expect(consumeMatchExitMarker(storage)).toBe(true);
    expect(storage.map.has(AFTER_MATCH_EXIT_KEY)).toBe(false);
    expect(consumeMatchExitMarker(storage)).toBe(false);
  });

  it("consume is false with no marker", () => {
    expect(consumeMatchExitMarker(memoryStorage())).toBe(false);
  });

  it('the marker holds only the value "1" under a fixed key', () => {
    const storage = memoryStorage();
    markMatchExit(storage);
    expect([...storage.map.entries()]).toEqual([
      ["geoconflict.session.afterMatchExit", "1"],
    ]);
  });

  it("setItem throwing does not throw", () => {
    const storage = memoryStorage();
    storage.setItem.mockImplementation(() => {
      throw new Error("quota");
    });
    expect(() => markMatchExit(storage)).not.toThrow();
  });

  it("getItem throwing → consume is false, no throw", () => {
    const storage = memoryStorage();
    storage.getItem.mockImplementation(() => {
      throw new Error("denied");
    });
    expect(consumeMatchExitMarker(storage)).toBe(false);
  });

  it("removeItem throwing → consume is false, no throw", () => {
    const storage = memoryStorage();
    markMatchExit(storage);
    storage.removeItem.mockImplementation(() => {
      throw new Error("denied");
    });
    expect(consumeMatchExitMarker(storage)).toBe(false);
  });

  it("null storage → mark does nothing, consume is false", () => {
    expect(() => markMatchExit(null)).not.toThrow();
    expect(consumeMatchExitMarker(null)).toBe(false);
  });

  describe("default storage (window.sessionStorage)", () => {
    afterEach(() => {
      jest.restoreAllMocks();
      try {
        window.sessionStorage.clear();
      } catch {
        // restored below if a test replaced the getter
      }
    });

    it("round-trips through the real sessionStorage", () => {
      markMatchExit();
      expect(window.sessionStorage.getItem(AFTER_MATCH_EXIT_KEY)).toBe("1");
      expect(consumeMatchExitMarker()).toBe(true);
      expect(window.sessionStorage.getItem(AFTER_MATCH_EXIT_KEY)).toBeNull();
    });

    it("the window.sessionStorage getter throwing → false, no throw", () => {
      jest.spyOn(window, "sessionStorage", "get").mockImplementation(() => {
        throw new DOMException("sandboxed", "SecurityError");
      });
      expect(() => markMatchExit()).not.toThrow();
      expect(consumeMatchExitMarker()).toBe(false);
    });
  });
});

// Task 0404 (§2.9): the "this boot follows the long-session refresh popup"
// marker — a twin of the match-exit marker.
describe("long-session refresh marker", () => {
  it("mark then consume is true once, then false", () => {
    const storage = memoryStorage();
    markLongSessionRefresh(storage);
    expect(storage.map.get(AFTER_LONG_SESSION_REFRESH_KEY)).toBe("1");

    expect(consumeLongSessionRefreshMarker(storage)).toBe(true);
    expect(storage.map.has(AFTER_LONG_SESSION_REFRESH_KEY)).toBe(false);
    expect(consumeLongSessionRefreshMarker(storage)).toBe(false);
  });

  it('holds only the value "1" under a fixed key, separate from the match-exit marker', () => {
    const storage = memoryStorage();
    markLongSessionRefresh(storage);
    expect([...storage.map.entries()]).toEqual([
      ["geoconflict.session.afterLongSessionRefresh", "1"],
    ]);
    expect(consumeMatchExitMarker(storage)).toBe(false);
  });

  it("the match-exit marker does not read as this one", () => {
    const storage = memoryStorage();
    markMatchExit(storage);
    expect(consumeLongSessionRefreshMarker(storage)).toBe(false);
  });

  it("storage failures never throw and read false", () => {
    const storage = memoryStorage();
    storage.setItem.mockImplementation(() => {
      throw new Error("quota");
    });
    expect(() => markLongSessionRefresh(storage)).not.toThrow();

    const broken = memoryStorage();
    broken.getItem.mockImplementation(() => {
      throw new Error("denied");
    });
    expect(consumeLongSessionRefreshMarker(broken)).toBe(false);

    expect(() => markLongSessionRefresh(null)).not.toThrow();
    expect(consumeLongSessionRefreshMarker(null)).toBe(false);
  });

  it("round-trips through the real sessionStorage", () => {
    markLongSessionRefresh();
    expect(window.sessionStorage.getItem(AFTER_LONG_SESSION_REFRESH_KEY)).toBe(
      "1",
    );
    expect(consumeLongSessionRefreshMarker()).toBe(true);
    expect(
      window.sessionStorage.getItem(AFTER_LONG_SESSION_REFRESH_KEY),
    ).toBeNull();
  });
});
