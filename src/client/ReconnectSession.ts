const KEY = "reconnect-session";

export interface ReconnectSession {
  gameID: string;
  clientID: string;
}

export function saveReconnectSession(gameID: string, clientID: string): void {
  localStorage.setItem(KEY, JSON.stringify({ gameID, clientID }));
}

export function clearReconnectSession(): void {
  localStorage.removeItem(KEY);
}

export function loadReconnectSession(): ReconnectSession | null {
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (
      typeof parsed?.gameID === "string" &&
      typeof parsed?.clientID === "string"
    ) {
      return { gameID: parsed.gameID, clientID: parsed.clientID };
    }
  } catch {
    /* ignore */
  }
  return null;
}

// Queries server; clears stale session if game is no longer active.
export async function checkReconnectSession(): Promise<ReconnectSession | null> {
  const session = loadReconnectSession();
  if (!session) return null;
  try {
    const resp = await fetch(`/api/game/${session.gameID}/active`);
    if (!resp.ok) {
      // Only clear on definitive "game gone" responses; preserve on transient errors
      if (resp.status === 404 || resp.status === 410) {
        clearReconnectSession();
      }
      return null;
    }
    const body = (await resp.json()) as { active: boolean };
    if (body.active) return session;
  } catch {
    // Network error: server unreachable. Don't clear the session (preserve it
    // for the next page load), but also don't show the banner — clicking
    // "Rejoin" while offline would silently fail.
    return null;
  }
  clearReconnectSession();
  return null;
}
