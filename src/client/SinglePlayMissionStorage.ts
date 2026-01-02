const NEXT_MISSION_LEVEL_KEY = "geoconflict.sp.nextMissionLevel";
const LAST_COMPLETED_KEY = "geoconflict.sp.lastCompletedAt";

export function getNextMissionLevel(): number {
  try {
    const raw = localStorage.getItem(NEXT_MISSION_LEVEL_KEY);
    const parsed = parseInt(raw ?? "", 10);
    if (Number.isNaN(parsed) || parsed < 1) {
      return 1;
    }
    return parsed;
  } catch (error) {
    console.warn("Failed to read next mission level:", error);
    return 1;
  }
}

export function setNextMissionLevel(level: number): void {
  const normalized = Number.isFinite(level) && level > 0 ? Math.floor(level) : 1;
  try {
    localStorage.setItem(NEXT_MISSION_LEVEL_KEY, String(normalized));
  } catch (error) {
    console.warn("Failed to store next mission level:", error);
  }
}

export function markMissionCompleted(): void {
  try {
    localStorage.setItem(LAST_COMPLETED_KEY, new Date().toISOString());
  } catch (error) {
    console.warn("Failed to store mission completion timestamp:", error);
  }
}
