const PENDING_PREFIX = "geoconflict.session.pendingEnd:";
const LEGACY_KEY = "geoconflict.session.pendingEnd";

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

let sessionMatchCount = 0;
let sessionId: string | null = null;
let sessionStartTimeMs: number | null = null;
let handlersInstalled = false;

export function startSessionMatchTracking(nowMs = Date.now()): void {
  sessionMatchCount = 0;
  sessionStartTimeMs = nowMs;
  sessionId = crypto.randomUUID();
  if (!handlersInstalled) {
    handlersInstalled = true;
    const persist = (): void => persistPendingSessionEnd();
    window.addEventListener("beforeunload", persist);
    window.addEventListener("pagehide", persist);
  }
}

export function recordSessionMatchStart(): void {
  if (sessionId === null) return;
  sessionMatchCount++;
}

export function persistPendingSessionEnd(
  storage: StorageLike = localStorage,
  nowMs = Date.now(),
): void {
  if (sessionId === null) return;
  try {
    const entry: PendingSessionEntry = {
      matchesPlayed: sessionMatchCount,
      sessionStartTime: sessionStartTimeMs!,
      firedAt: nowMs,
    };
    storage.setItem(`${PENDING_PREFIX}${sessionId}`, JSON.stringify(entry));
  } catch {
    // silently skip if storage is unavailable (e.g. sandboxed iframe)
  }
}

export function resetForTesting(): void {
  sessionMatchCount = 0;
  sessionId = null;
  sessionStartTimeMs = null;
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
    if (storage.getItem(LEGACY_KEY) !== null) {
      keys.push(LEGACY_KEY);
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

