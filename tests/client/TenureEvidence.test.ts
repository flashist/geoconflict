/**
 * @jest-environment jsdom
 */
// Device-side tenure evidence (task 0253; ADR-112 as amended by the 2026-09-15
// redesign): two counts, no dates, and null only when storage cannot be read.

jest.mock("../../src/client/flashist/FlashistFacade", () => ({
  flashistConstants: {
    analyticEvents: { PLAYER_DAYS_PLAYED: "Player:DaysPlayed" },
  },
  flashist_logEventAnalytics: jest.fn(),
}));

import {
  localDateString,
  type StorageLike,
} from "../../src/client/DaysPlayedAnalytics";
import { readTenureEvidence } from "../../src/client/TenureEvidence";

const DAYS_PLAYED_KEY = "geoconflict.player.daysPlayed";
const GAME_RECORDS_KEY = "game-records";

function makeStorage(initial: Record<string, string> = {}): StorageLike {
  const data = { ...initial };
  return {
    getItem: (key) => data[key] ?? null,
    setItem: (key, value) => {
      data[key] = value;
    },
  };
}

/** Local-time timestamps, so the date grouping is independent of the TZ. */
function at(year: number, month: number, day: number, hour = 12): number {
  return new Date(year, month - 1, day, hour).getTime();
}

function records(startTimes: unknown[]): string {
  return JSON.stringify(
    Object.fromEntries(
      startTimes.map((startTime, i) => [`game-${i}`, { lobby: {}, startTime }]),
    ),
  );
}

describe("readTenureEvidence", () => {
  it("empty storage → 0 / 0, still evidence (a claim is still sent)", () => {
    expect(readTenureEvidence(makeStorage())).toEqual({
      daysPlayed: 0,
      gameRecordDays: 0,
    });
  });

  it("reads daysPlayed", () => {
    expect(
      readTenureEvidence(makeStorage({ [DAYS_PLAYED_KEY]: "37" })),
    ).toEqual({ daysPlayed: 37, gameRecordDays: 0 });
  });

  it("counts DISTINCT local dates across every game-records entry", () => {
    const storage = makeStorage({
      [GAME_RECORDS_KEY]: records([
        at(2026, 3, 1, 9),
        at(2026, 3, 1, 23), // same local day
        at(2026, 3, 2, 0), // next local day, minutes later
        at(2025, 12, 31, 12),
        at(2026, 9, 20, 12), // after launch — no date filtering any more
      ]),
    });
    expect(readTenureEvidence(storage)).toEqual({
      daysPlayed: 0,
      gameRecordDays: 4,
    });
  });

  it("groups by the LOCAL date string, the same one DaysPlayedAnalytics uses", () => {
    const times = [at(2026, 5, 5, 1), at(2026, 5, 5, 22), at(2026, 5, 6, 1)];
    const expected = new Set(times.map((t) => localDateString(new Date(t))))
      .size;
    const storage = makeStorage({ [GAME_RECORDS_KEY]: records(times) });
    expect(readTenureEvidence(storage)?.gameRecordDays).toBe(expected);
  });

  it("ignores non-numeric, non-finite, out-of-range and missing startTime values", () => {
    const storage = makeStorage({
      [GAME_RECORDS_KEY]: JSON.stringify({
        a: { startTime: "1735732800000" },
        b: { startTime: null },
        c: { lobby: {} },
        d: null,
        e: 42,
        f: { startTime: 1e20 }, // finite, but an Invalid Date
        g: { startTime: at(2026, 1, 10) },
      }),
    });
    expect(readTenureEvidence(storage)?.gameRecordDays).toBe(1);
  });

  it("corrupt game-records JSON → gameRecordDays 0, daysPlayed still used", () => {
    const storage = makeStorage({
      [DAYS_PLAYED_KEY]: "12",
      [GAME_RECORDS_KEY]: "{not json",
    });
    expect(readTenureEvidence(storage)).toEqual({
      daysPlayed: 12,
      gameRecordDays: 0,
    });
  });

  it("a non-object game-records value → 0", () => {
    for (const raw of ["null", "42", '"text"']) {
      expect(
        readTenureEvidence(makeStorage({ [GAME_RECORDS_KEY]: raw }))
          ?.gameRecordDays,
      ).toBe(0);
    }
  });

  it.each([
    ["negative", "-5", 0],
    ["garbage", "abc", 0],
    ["over the schema bound", "250000", 100_000],
    ["fractional-looking", "7.9", 7],
  ])("clamps a %s daysPlayed (%s → %i)", (_label, raw, expected) => {
    expect(
      readTenureEvidence(makeStorage({ [DAYS_PLAYED_KEY]: raw }))?.daysPlayed,
    ).toBe(expected);
  });

  it("returns null ONLY when reading storage throws (plan D1)", () => {
    const throwing: StorageLike = {
      getItem: () => {
        throw new Error("SecurityError");
      },
      setItem: () => {
        throw new Error("SecurityError");
      },
    };
    expect(readTenureEvidence(throwing)).toBeNull();
  });

  it("returns null when only the SECOND read throws", () => {
    const storage: StorageLike = {
      getItem: (key) => {
        if (key === GAME_RECORDS_KEY) {
          throw new Error("SecurityError");
        }
        return "10";
      },
      setItem: () => {},
    };
    expect(readTenureEvidence(storage)).toBeNull();
  });
});
