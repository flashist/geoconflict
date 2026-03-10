const STORAGE_KEY = "geoconflict_match_history";
const MAX_ENTRIES = 5;

export interface MatchHistoryEntry {
  gameID: string;
  gameType: string;
  gameMap: string;
  outcome: "win" | "loss" | "abandoned";
  timestamp: number;
}

export function readMatchHistory(): MatchHistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeMatchHistory(entries: MatchHistoryEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // ignore storage errors
  }
}

export function writeMatchStart(
  gameID: string,
  gameType = "",
  gameMap = "",
): void {
  const entries = readMatchHistory().filter((e) => e.gameID !== gameID);
  entries.unshift({
    gameID,
    gameType,
    gameMap,
    outcome: "abandoned",
    timestamp: Date.now(),
  });
  writeMatchHistory(entries.slice(0, MAX_ENTRIES));
}

export function updateMatchOutcome(
  gameID: string,
  outcome: "win" | "loss",
): void {
  const entries = readMatchHistory();
  const entry = entries.find((e) => e.gameID === gameID);
  if (entry) {
    entry.outcome = outcome;
    writeMatchHistory(entries);
  }
}
