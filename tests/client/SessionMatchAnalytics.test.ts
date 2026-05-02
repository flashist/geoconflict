/**
 * @jest-environment jsdom
 */

jest.mock("../../src/client/flashist/FlashistFacade", () => ({
  flashistConstants: {
    analyticEvents: {
      SESSION_MATCHES_PLAYED: "Session:MatchesPlayed",
    },
  },
  flashist_logEventAnalytics: jest.fn(),
}));

import {
  startSessionMatchTracking,
  recordSessionMatchStart,
  persistPendingSessionEnd,
  consumePendingSessionEnd,
  resetForTesting,
  StorageLike,
} from "../../src/client/SessionMatchAnalytics";

const PENDING_PREFIX = "geoconflict.session.pendingEnd:";

function makeStorage(
  initial: Record<string, string> = {},
): StorageLike & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    getItem: (k) => data[k] ?? null,
    setItem: (k, v) => {
      data[k] = v;
    },
    removeItem: (k) => {
      delete data[k];
    },
    get length() {
      return Object.keys(data).length;
    },
    key: (i) => Object.keys(data)[i] ?? null,
  };
}

describe("SessionMatchAnalytics", () => {
  let addEventListenerSpy: jest.SpyInstance;

  beforeEach(() => {
    resetForTesting();
    addEventListenerSpy = jest
      .spyOn(window, "addEventListener")
      .mockImplementation(() => {});
  });

  afterEach(() => {
    addEventListenerSpy.mockRestore();
  });

  describe("startSessionMatchTracking", () => {
    it("resets the match counter to 0", () => {
      startSessionMatchTracking(1000);
      recordSessionMatchStart();
      recordSessionMatchStart();

      startSessionMatchTracking(2000);

      const storage = makeStorage();
      persistPendingSessionEnd(storage, 3000);
      const raw = Object.values(storage.data)[0];
      expect(JSON.parse(raw!).matchesPlayed).toBe(0);
    });

    it("installs beforeunload and pagehide handlers on first call", () => {
      startSessionMatchTracking(1000);

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        "beforeunload",
        expect.any(Function),
      );
      expect(addEventListenerSpy).toHaveBeenCalledWith(
        "pagehide",
        expect.any(Function),
      );
    });

    it("does not install duplicate handlers on subsequent calls", () => {
      startSessionMatchTracking(1000);
      addEventListenerSpy.mockClear();

      startSessionMatchTracking(2000);

      expect(addEventListenerSpy).not.toHaveBeenCalled();
    });
  });

  describe("recordSessionMatchStart", () => {
    it("increments the match counter", () => {
      startSessionMatchTracking(1000);
      recordSessionMatchStart();
      recordSessionMatchStart();
      recordSessionMatchStart();

      const storage = makeStorage();
      persistPendingSessionEnd(storage, 2000);
      const raw = Object.values(storage.data)[0];
      expect(JSON.parse(raw!).matchesPlayed).toBe(3);
    });

    it("is a no-op before startSessionMatchTracking is called", () => {
      recordSessionMatchStart();
      recordSessionMatchStart();

      const storage = makeStorage();
      persistPendingSessionEnd(storage, 2000);

      expect(Object.keys(storage.data)).toHaveLength(0);
    });
  });

  describe("persistPendingSessionEnd", () => {
    it("writes a JSON entry under a key matching the pending prefix", () => {
      startSessionMatchTracking(1000);
      recordSessionMatchStart();
      const storage = makeStorage();

      persistPendingSessionEnd(storage, 5000);

      const keys = Object.keys(storage.data);
      expect(keys).toHaveLength(1);
      expect(keys[0]).toMatch(new RegExp(`^${PENDING_PREFIX}`));

      const entry = JSON.parse(storage.data[keys[0]]);
      expect(entry.matchesPlayed).toBe(1);
      expect(entry.firedAt).toBe(5000);
      expect(entry.sessionStartTime).toBe(1000);
    });

    it("writes matchesPlayed = 0 when no matches were played", () => {
      startSessionMatchTracking(1000);
      const storage = makeStorage();

      persistPendingSessionEnd(storage, 5000);

      const raw = Object.values(storage.data)[0];
      expect(JSON.parse(raw!).matchesPlayed).toBe(0);
    });

    it("is a no-op before startSessionMatchTracking is called", () => {
      const storage = makeStorage();
      persistPendingSessionEnd(storage, 5000);
      expect(Object.keys(storage.data)).toHaveLength(0);
    });

    it("silently swallows storage errors", () => {
      startSessionMatchTracking(1000);
      const brokenStorage: StorageLike = {
        getItem: () => null,
        setItem: () => {
          throw new Error("quota exceeded");
        },
        removeItem: () => {},
        get length() {
          return 0;
        },
        key: () => null,
      };

      expect(() => persistPendingSessionEnd(brokenStorage)).not.toThrow();
    });
  });

  describe("consumePendingSessionEnd", () => {
    it("fires logMatchesPlayed for a pending entry with the correct count", () => {
      const storage = makeStorage({
        [`${PENDING_PREFIX}abc-123`]: JSON.stringify({
          matchesPlayed: 4,
          sessionStartTime: 1000,
          firedAt: 2000,
        }),
      });

      const log = jest.fn();
      consumePendingSessionEnd(log, storage);

      expect(log).toHaveBeenCalledTimes(1);
      expect(log).toHaveBeenCalledWith(4);
    });

    it("removes consumed keys from storage", () => {
      const key = `${PENDING_PREFIX}abc-123`;
      const storage = makeStorage({
        [key]: JSON.stringify({ matchesPlayed: 2, sessionStartTime: 1, firedAt: 2 }),
      });

      consumePendingSessionEnd(jest.fn(), storage);

      expect(storage.data[key]).toBeUndefined();
    });

    it("handles two independent session entries and fires once per entry", () => {
      const storage = makeStorage({
        [`${PENDING_PREFIX}tab-1`]: JSON.stringify({
          matchesPlayed: 1,
          sessionStartTime: 1000,
          firedAt: 2000,
        }),
        [`${PENDING_PREFIX}tab-2`]: JSON.stringify({
          matchesPlayed: 3,
          sessionStartTime: 3000,
          firedAt: 4000,
        }),
      });

      const log = jest.fn();
      consumePendingSessionEnd(log, storage);

      expect(log).toHaveBeenCalledTimes(2);
      const counts = log.mock.calls.map(([c]) => c).sort((a, b) => a - b);
      expect(counts).toEqual([1, 3]);
      expect(Object.keys(storage.data)).toHaveLength(0);
    });

    it("silently drops and removes a malformed JSON entry", () => {
      const key = `${PENDING_PREFIX}bad`;
      const storage = makeStorage({ [key]: "not-json{{{" });

      const log = jest.fn();
      expect(() => consumePendingSessionEnd(log, storage)).not.toThrow();
      expect(log).not.toHaveBeenCalled();
      expect(storage.data[key]).toBeUndefined();
    });

    it("silently drops an entry where matchesPlayed is not a number", () => {
      const key = `${PENDING_PREFIX}bad2`;
      const storage = makeStorage({
        [key]: JSON.stringify({
          matchesPlayed: "five",
          sessionStartTime: 1,
          firedAt: 2,
        }),
      });

      const log = jest.fn();
      consumePendingSessionEnd(log, storage);

      expect(log).not.toHaveBeenCalled();
      expect(storage.data[key]).toBeUndefined();
    });

    it("does not throw when storage throws", () => {
      const brokenStorage: StorageLike = {
        getItem: () => {
          throw new Error("unavailable");
        },
        setItem: () => {},
        removeItem: () => {},
        get length() {
          throw new Error("unavailable");
        },
        key: () => null,
      };

      expect(() =>
        consumePendingSessionEnd(jest.fn(), brokenStorage),
      ).not.toThrow();
    });
  });

  describe("end-to-end: persist then consume", () => {
    it("round-trips the match count through storage", () => {
      startSessionMatchTracking(1000);
      recordSessionMatchStart();
      recordSessionMatchStart();

      const storage = makeStorage();
      persistPendingSessionEnd(storage, 9000);

      const log = jest.fn();
      consumePendingSessionEnd(log, storage);

      expect(log).toHaveBeenCalledWith(2);
      expect(Object.keys(storage.data)).toHaveLength(0);
    });
  });
});
