const PENDING_SESSION_END_KEY = "geoconflict_pending_session_end";

type SessionStorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

interface PendingSessionEnd {
  matchesPlayed: number;
  sessionStartTime: number;
  firedAt: number;
}

let sessionMatchCount = 0;
let sessionStartTimestamp: number | null = null;
let sessionEndPersistenceHandlersInstalled = false;

export function startSessionMatchTracking(nowMs = Date.now()): void {
  sessionMatchCount = 0;
  sessionStartTimestamp = nowMs;
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
    storage.setItem(PENDING_SESSION_END_KEY, JSON.stringify(pending));
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

  let raw: string | null;
  try {
    raw = storage.getItem(PENDING_SESSION_END_KEY);
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
      storage.removeItem(PENDING_SESSION_END_KEY);
    } catch {
      // Nothing useful to do during startup analytics.
    }
  }
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
