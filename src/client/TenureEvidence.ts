// Device-side evidence for the one-time tenure XP grant (task 0253; ADR-112 as
// amended by the 2026-09-15 redesign). Pure over StorageLike, like
// DaysPlayedAnalytics.ts: no network, no UI, no clock.
//
// The redesign dropped every date rule: no snapshot, no "pre-launch" cut-off, no
// floor, no clamp against the clock. The claim sends two counts and the SERVER
// computes the amount and records the one-time check:
//   * daysPlayed     — `geoconflict.player.daysPlayed` (today's boot included);
//   * gameRecordDays — distinct local calendar dates over every `game-records`
//                      entry, across all game types.
//
// Returns null ONLY when reading storage itself throws (plan decision D1): a
// transient read failure must not send 0/0 and burn an old-timer's one-time
// check for good. A missing key is a real 0 and is sent.

import {
  DAYS_PLAYED_KEY,
  localDateString,
  type StorageLike,
} from "./DaysPlayedAnalytics";
import {
  TENURE_MAX_DAY_COUNT,
  type TenureEvidence,
} from "../core/profile/TenureGrantContract";

// Written by LocalPersistantStats.startGame(). Must match that writer.
const GAME_RECORDS_KEY = "game-records";

/** Keeps a count inside the request schema, so an odd value is never a 400. */
function clampCount(value: number): number {
  return Math.min(Math.max(0, Math.floor(value)), TENURE_MAX_DAY_COUNT);
}

function parseDaysPlayed(raw: string | null): number {
  if (raw === null) {
    return 0;
  }
  const value = parseInt(raw, 10);
  return Number.isFinite(value) ? clampCount(value) : 0;
}

/** Distinct local dates of every usable `startTime`. Corrupt JSON ⇒ 0. */
function countGameRecordDays(raw: string | null): number {
  if (raw === null) {
    return 0;
  }
  let records: unknown;
  try {
    records = JSON.parse(raw);
  } catch {
    return 0;
  }
  if (typeof records !== "object" || records === null) {
    return 0;
  }
  const dates = new Set<string>();
  for (const record of Object.values(records as Record<string, unknown>)) {
    const startTime = (record as { startTime?: unknown } | null)?.startTime;
    if (typeof startTime !== "number" || !Number.isFinite(startTime)) {
      continue;
    }
    const date = new Date(startTime);
    // Finite but outside the Date range ⇒ an Invalid Date, whose string would
    // otherwise count as one bogus "NaN-NaN-NaN" day.
    if (Number.isNaN(date.getTime())) {
      continue;
    }
    dates.add(localDateString(date));
  }
  return clampCount(dates.size);
}

/**
 * The evidence the claim sends, or null when storage cannot be read at all.
 * Call it at claim time — it parses `game-records`.
 */
export function readTenureEvidence(
  storage: StorageLike,
): TenureEvidence | null {
  let daysPlayedRaw: string | null;
  let gameRecordsRaw: string | null;
  try {
    daysPlayedRaw = storage.getItem(DAYS_PLAYED_KEY);
    gameRecordsRaw = storage.getItem(GAME_RECORDS_KEY);
  } catch {
    return null;
  }
  return {
    daysPlayed: parseDaysPlayed(daysPlayedRaw),
    gameRecordDays: countGameRecordDays(gameRecordsRaw),
  };
}
