const LEGACY_PENDING_SESSION_END_KEY = "geoconflict_pending_session_end";
const PENDING_SESSION_END_KEY_PREFIX = "geoconflict_pending_session_end:";

type SessionStorageLike = Pick<
  Storage,
  "getItem" | "key" | "length" | "removeItem" | "setItem"
>;

interface PendingSessionEnd {
  matchesPlayed: number;
  sessionStartTime: number;
  firedAt: number;
}

let sessionMatchCount = 0;
let sessionStartTimestamp: number | null = null;
let sessionId: string | null = null;
let sessionEndPersistenceHandlersInstalled = false;

export function startSessionMatchTracking(nowMs = Date.now()): void {
  sessionMatchCount = 0;
  sessionStartTimestamp = nowMs;
  sessionId = createSessionId(nowMs);
  installSessionEndPersistenceHandlers();
}

export function recordSessionMatchStart(): void {
  sessionMatchCount += 1;
}

export function persistPendingSessionEnd(
  storage: SessionStorageLike | undefined = safeLocalStorage(),
  nowMs = Date.now(),
): void {
  if (!storage || sessionStartTimestamp === null) {
    return;
  }

  const pending: PendingSessionEnd = {
    matchesPlayed: sessionMatchCount,
    sessionStartTime: sessionStartTimestamp,
    firedAt: nowMs,
  };

  try {
    storage.setItem(pendingSessionEndKey(), JSON.stringify(pending));
  } catch {
    // Best-effort close-time persistence only.
  }
}

export function consumePendingSessionEnd(
  logMatchesPlayed: (matchesPlayed: number) => void,
  storage: SessionStorageLike | undefined = safeLocalStorage(),
): void {
  if (!storage) {
    return;
  }

  const keys = pendingSessionEndKeys(storage);
  for (const key of keys) {
    consumePendingSessionEndKey(key, logMatchesPlayed, storage);
  }
}

function consumePendingSessionEndKey(
  key: string,
  logMatchesPlayed: (matchesPlayed: number) => void,
  storage: SessionStorageLike,
): void {
  let raw: string | null;
  try {
    raw = storage.getItem(key);
  } catch {
    return;
  }

  if (raw === null) {
    return;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<PendingSessionEnd>;
    if (typeof parsed.matchesPlayed === "number") {
      logMatchesPlayed(normalizeMatchCount(parsed.matchesPlayed));
    }
  } catch {
    // Drop malformed data so one bad write cannot poison future sessions.
  } finally {
    try {
      storage.removeItem(key);
    } catch {
      // Nothing useful to do during startup analytics.
    }
  }
}

function pendingSessionEndKeys(storage: SessionStorageLike): string[] {
  const keys: string[] = [];
  try {
    for (let index = 0; index < storage.length; index++) {
      const key = storage.key(index);
      if (
        key === LEGACY_PENDING_SESSION_END_KEY ||
        key?.startsWith(PENDING_SESSION_END_KEY_PREFIX)
      ) {
        keys.push(key);
      }
    }
  } catch {
    return [];
  }

  return keys;
}

function normalizeMatchCount(matchesPlayed: number): number {
  if (!Number.isFinite(matchesPlayed)) {
    return 0;
  }

  return Math.max(0, Math.trunc(matchesPlayed));
}

function safeLocalStorage(): SessionStorageLike | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

function pendingSessionEndKey(): string {
  return PENDING_SESSION_END_KEY_PREFIX + (sessionId ?? createSessionId());
}

function createSessionId(nowMs = Date.now()): string {
  try {
    return globalThis.crypto?.randomUUID?.() ?? fallbackSessionId(nowMs);
  } catch {
    return fallbackSessionId(nowMs);
  }
}

function fallbackSessionId(nowMs: number): string {
  return `${nowMs}-${Math.random().toString(36).slice(2)}`;
}

function installSessionEndPersistenceHandlers(): void {
  if (sessionEndPersistenceHandlersInstalled) {
    return;
  }

  const eventTarget = globalThis as typeof globalThis & {
    addEventListener?: Window["addEventListener"];
  };
  if (typeof eventTarget.addEventListener !== "function") {
    return;
  }

  eventTarget.addEventListener("beforeunload", () => {
    persistPendingSessionEnd();
  });
  eventTarget.addEventListener("pagehide", () => {
    persistPendingSessionEnd();
  });
  sessionEndPersistenceHandlersInstalled = true;
}
