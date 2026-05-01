import {
  consumePendingSessionEnd,
  persistPendingSessionEnd,
  recordSessionMatchStart,
  startSessionMatchTracking,
} from "../../src/client/SessionMatchAnalytics";

describe("session match analytics", () => {
  let storage: Storage;
  let logMatchesPlayed: jest.Mock;
  let originalAddEventListener: typeof globalThis.addEventListener | undefined;

  beforeEach(() => {
    storage = createMemoryStorage();
    logMatchesPlayed = jest.fn();
    startSessionMatchTracking(1_000);
  });

  beforeAll(() => {
    originalAddEventListener = globalThis.addEventListener;
  });

  afterAll(() => {
    if (originalAddEventListener) {
      globalThis.addEventListener = originalAddEventListener;
    } else {
      delete (globalThis as Partial<typeof globalThis>).addEventListener;
    }
  });

  it("persists and consumes a zero-match session", () => {
    persistPendingSessionEnd(storage, 5_000);

    consumePendingSessionEnd(logMatchesPlayed, storage);

    expect(logMatchesPlayed).toHaveBeenCalledWith(0);
    expect(storage.getItem("geoconflict_pending_session_end")).toBeNull();
  });

  it("persists and consumes matches started during the session", () => {
    recordSessionMatchStart();
    recordSessionMatchStart();

    persistPendingSessionEnd(storage, 5_000);
    consumePendingSessionEnd(logMatchesPlayed, storage);

    expect(logMatchesPlayed).toHaveBeenCalledWith(2);
  });

  it("does not throw when persisting without storage", () => {
    persistPendingSessionEnd(undefined, 5_000);

    expect(storage.getItem("geoconflict_pending_session_end")).toBeNull();
  });

  it("removes malformed pending data without logging", () => {
    storage.setItem("geoconflict_pending_session_end", "{not json");

    consumePendingSessionEnd(logMatchesPlayed, storage);

    expect(logMatchesPlayed).not.toHaveBeenCalled();
    expect(storage.getItem("geoconflict_pending_session_end")).toBeNull();
  });

  it("does not throw when storage is unavailable", () => {
    expect(() => persistPendingSessionEnd(undefined, 5_000)).not.toThrow();
    expect(() =>
      consumePendingSessionEnd(logMatchesPlayed, undefined),
    ).not.toThrow();
  });

  it("normalizes invalid pending match counts before logging", () => {
    storage.setItem(
      "geoconflict_pending_session_end",
      JSON.stringify({
        matchesPlayed: 2.9,
        sessionStartTime: 1_000,
        firedAt: 5_000,
      }),
    );

    consumePendingSessionEnd(logMatchesPlayed, storage);

    expect(logMatchesPlayed).toHaveBeenCalledWith(2);
  });

  it("installs close-time persistence handlers when session tracking starts", () => {
    const addEventListener = jest.fn();
    globalThis.addEventListener = addEventListener;

    startSessionMatchTracking(2_000);

    expect(addEventListener).toHaveBeenCalledWith(
      "beforeunload",
      expect.any(Function),
    );
    expect(addEventListener).toHaveBeenCalledWith(
      "pagehide",
      expect.any(Function),
    );
  });
});

function createMemoryStorage(): Storage {
  const data = new Map<string, string>();

  return {
    get length() {
      return data.size;
    },
    clear: jest.fn(() => data.clear()),
    getItem: jest.fn((key: string) => data.get(key) ?? null),
    key: jest.fn((index: number) => Array.from(data.keys())[index] ?? null),
    removeItem: jest.fn((key: string) => {
      data.delete(key);
    }),
    setItem: jest.fn((key: string, value: string) => {
      data.set(key, value);
    }),
  };
}
