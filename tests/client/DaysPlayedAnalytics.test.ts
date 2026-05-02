jest.mock("../../src/client/flashist/FlashistFacade", () => ({
  flashistConstants: {
    analyticEvents: {
      PLAYER_DAYS_PLAYED: "Player:DaysPlayed",
    },
  },
  flashist_logEventAnalytics: jest.fn(),
}));

import {
  flashistConstants,
  flashist_logEventAnalytics,
} from "../../src/client/flashist/FlashistFacade";
import {
  logDaysPlayedAnalytics,
  StorageLike,
} from "../../src/client/DaysPlayedAnalytics";

const LAST_PLAYED_KEY = "geoconflict.player.lastPlayedDate";
const DAYS_PLAYED_KEY = "geoconflict.player.daysPlayed";

function makeStorage(initial: Record<string, string> = {}): StorageLike & {
  data: Record<string, string>;
} {
  const data = { ...initial };
  return {
    data,
    getItem: (key) => data[key] ?? null,
    setItem: (key, value) => {
      data[key] = value;
    },
  };
}

describe("logDaysPlayedAnalytics", () => {
  beforeEach(() => {
    (flashist_logEventAnalytics as jest.Mock).mockClear();
  });

  it("fires Player:DaysPlayed with value 1 on the first ever session", () => {
    const storage = makeStorage();

    logDaysPlayedAnalytics("2026-05-01", storage);

    expect(flashist_logEventAnalytics).toHaveBeenCalledWith(
      flashistConstants.analyticEvents.PLAYER_DAYS_PLAYED,
      1,
    );
    expect(storage.data[DAYS_PLAYED_KEY]).toBe("1");
    expect(storage.data[LAST_PLAYED_KEY]).toBe("2026-05-01");
  });

  it("fires with the same value on a second session on the same calendar day", () => {
    const storage = makeStorage({
      [DAYS_PLAYED_KEY]: "1",
      [LAST_PLAYED_KEY]: "2026-05-01",
    });

    logDaysPlayedAnalytics("2026-05-01", storage);

    expect(flashist_logEventAnalytics).toHaveBeenCalledWith(
      flashistConstants.analyticEvents.PLAYER_DAYS_PLAYED,
      1,
    );
    expect(storage.data[DAYS_PLAYED_KEY]).toBe("1");
  });

  it("increments by exactly 1 when a new calendar day begins", () => {
    const storage = makeStorage({
      [DAYS_PLAYED_KEY]: "3",
      [LAST_PLAYED_KEY]: "2026-05-01",
    });

    logDaysPlayedAnalytics("2026-05-02", storage);

    expect(flashist_logEventAnalytics).toHaveBeenCalledWith(
      flashistConstants.analyticEvents.PLAYER_DAYS_PLAYED,
      4,
    );
    expect(storage.data[DAYS_PLAYED_KEY]).toBe("4");
    expect(storage.data[LAST_PLAYED_KEY]).toBe("2026-05-02");
  });

  it("increments by exactly 1 even after a gap of several days", () => {
    const storage = makeStorage({
      [DAYS_PLAYED_KEY]: "5",
      [LAST_PLAYED_KEY]: "2026-04-01",
    });

    logDaysPlayedAnalytics("2026-05-01", storage);

    expect(flashist_logEventAnalytics).toHaveBeenCalledWith(
      flashistConstants.analyticEvents.PLAYER_DAYS_PLAYED,
      6,
    );
  });

  it("treats a corrupted daysPlayed value as 0 and fires with value 1", () => {
    const storage = makeStorage({
      [DAYS_PLAYED_KEY]: "not-a-number",
      [LAST_PLAYED_KEY]: "2026-05-01",
    });

    logDaysPlayedAnalytics("2026-05-02", storage);

    expect(flashist_logEventAnalytics).toHaveBeenCalledWith(
      flashistConstants.analyticEvents.PLAYER_DAYS_PLAYED,
      1,
    );
    expect(storage.data[DAYS_PLAYED_KEY]).toBe("1");
  });

  it("silently skips the event and does not throw when storage throws", () => {
    const brokenStorage: StorageLike = {
      getItem: () => {
        throw new Error("storage unavailable");
      },
      setItem: () => {
        throw new Error("storage unavailable");
      },
    };

    expect(() => logDaysPlayedAnalytics("2026-05-01", brokenStorage)).not.toThrow();
    expect(flashist_logEventAnalytics).not.toHaveBeenCalled();
  });
});
