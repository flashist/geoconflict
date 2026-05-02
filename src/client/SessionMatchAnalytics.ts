const PENDING_PREFIX = "geoconflict.session.pendingEnd:";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  readonly length: number;
  key(index: number): string | null;
}

interface PendingSessionEntry {
  matchesPlayed: number;
  sessionStartTime: number;
  firedAt: number;
}

interface ActiveSession {
  id: string;
  startTime: number;
  matchCount: number;
}

let activeSession: ActiveSession | null = null;
let handlersInstalled = false;

export function startSessionMatchTracking(nowMs = Date.now()): void {
  activeSession = { id: crypto.randomUUID(), startTime: nowMs, matchCount: 0 };
  if (!handlersInstalled) {
    handlersInstalled = true;
    const persist = (): void => persistPendingSessionEnd();
    window.addEventListener("beforeunload", persist);
    window.addEventListener("pagehide", persist);
  }
}

export function recordSessionMatchStart(): void {
  if (activeSession === null) return;
  activeSession.matchCount++;
}

export function persistPendingSessionEnd(
  storage: StorageLike = localStorage,
  nowMs = Date.now(),
): void {
  if (activeSession === null) return;
  try {
    const entry: PendingSessionEntry = {
      matchesPlayed: activeSession.matchCount,
      sessionStartTime: activeSession.startTime,
      firedAt: nowMs,
    };
    storage.setItem(`${PENDING_PREFIX}${activeSession.id}`, JSON.stringify(entry));
  } catch {
    // silently skip if storage is unavailable (e.g. sandboxed iframe)
  }
}

export function resetForTesting(): void {
  activeSession = null;
  handlersInstalled = false;
}

export function consumePendingSessionEnd(
  logMatchesPlayed: (count: number) => void,
  storage: StorageLike = localStorage,
): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < storage.length; i++) {
      const k = storage.key(i);
      if (k !== null && k.startsWith(PENDING_PREFIX)) {
        keys.push(k);
      }
    }
    for (const k of keys) {
      try {
        const raw = storage.getItem(k);
        if (raw !== null) {
          const entry = JSON.parse(raw) as PendingSessionEntry;
          if (typeof entry.matchesPlayed === "number") {
            logMatchesPlayed(entry.matchesPlayed);
          }
        }
      } catch {
        // malformed entry — silently drop
      }
      storage.removeItem(k);
    }
  } catch {
    // silently skip if storage is unavailable (e.g. sandboxed iframe)
  }
}

