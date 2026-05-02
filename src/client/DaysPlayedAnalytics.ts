import {
  flashist_logEventAnalytics,
  flashistConstants,
} from "./flashist/FlashistFacade";

const LAST_PLAYED_KEY = "geoconflict.player.lastPlayedDate";
const DAYS_PLAYED_KEY = "geoconflict.player.daysPlayed";

export function localDateString(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function logDaysPlayedAnalytics(
  today = localDateString(),
  storage: StorageLike = localStorage,
): void {
  try {
    const lastDate = storage.getItem(LAST_PLAYED_KEY);
    let daysValue: number;
    if (lastDate !== today) {
      const stored = parseInt(storage.getItem(DAYS_PLAYED_KEY) ?? "0", 10);
      daysValue = (isNaN(stored) ? 0 : stored) + 1;
      storage.setItem(DAYS_PLAYED_KEY, String(daysValue));
      storage.setItem(LAST_PLAYED_KEY, today);
    } else {
      const stored = parseInt(storage.getItem(DAYS_PLAYED_KEY) ?? "0", 10);
      daysValue = isNaN(stored) ? 0 : stored;
    }
    if (daysValue > 0) {
      flashist_logEventAnalytics(
        flashistConstants.analyticEvents.PLAYER_DAYS_PLAYED,
        daysValue,
      );
    }
  } catch {
    // silently skip if storage is unavailable (e.g. sandboxed iframe)
  }
}
