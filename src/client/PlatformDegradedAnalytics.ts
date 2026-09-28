// Session:PlatformDegraded:{Cause} (task 0328): why the Yandex platform is
// degraded (SDK, player or flags missing) on this page load, and whether the
// load follows a match exit. Only missing flags hide the citizenship card. Pure helpers only — FlashistFacade records the state and logs the event.

/**
 * Closed list — the only strings ever appended to the event prefix. Checked in
 * this order, first match wins (owner ruling 2026-09-28, 0328 plan option (a)).
 */
export type PlatformDegradedCause =
  | "ScriptFailed" // the loader's onerror ran and no download retry (task 0330) recovered it before the 5 s deadline
  | "ScriptTimeout" // the loader was still downloading at the 5 s deadline
  | "InitFailed" // YaGames.init() rejected
  | "InitTimeout" // YaGames.init() had not settled at the 5 s deadline
  | "NoSdk" // the loader ran but left no YaGames (e.g. not inside Yandex's frame)
  | "NoPlayer" // SDK present, no player object
  | "NoFlags"; // SDK present, experiment flags missing

export interface PlatformDegradedState {
  scriptFailed: boolean;
  scriptTimedOut: boolean;
  initFailed: boolean;
  initTimedOut: boolean;
  hasSdk: boolean;
  hasPlayer: boolean;
  hasFlags: boolean;
}

export function classifyPlatformDegradedCause(
  state: PlatformDegradedState,
): PlatformDegradedCause | null {
  if (state.hasSdk && state.hasPlayer && state.hasFlags) return null;
  if (state.scriptFailed) return "ScriptFailed";
  if (state.scriptTimedOut) return "ScriptTimeout";
  if (state.initFailed) return "InitFailed";
  if (state.initTimedOut) return "InitTimeout";
  if (!state.hasSdk) return "NoSdk";
  if (!state.hasPlayer) return "NoPlayer";
  return "NoFlags";
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

// sessionStorage survives the same-tab navigation of a match exit. The value is
// a bare "1" — no ids.
export const AFTER_MATCH_EXIT_KEY = "geoconflict.session.afterMatchExit";
const AFTER_MATCH_EXIT_VALUE = "1";

/**
 * sessionStorage, or null when it is unavailable (private mode / sandboxed
 * iframe) — merely touching the property can throw, so the access is guarded.
 */
function readSessionStorage(): StorageLike | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/** Written right before the match-exit navigation. Never throws. */
export function markMatchExit(
  storage: StorageLike | null = readSessionStorage(),
): void {
  try {
    storage?.setItem(AFTER_MATCH_EXIT_KEY, AFTER_MATCH_EXIT_VALUE);
  } catch {
    // Storage unavailable — this boot will simply read as "not after a match"
  }
}

/**
 * Read and remove the marker; true when this boot follows a match exit. Called
 * on every boot so a marker never carries over to a later one. Never throws —
 * any storage failure reads as false.
 */
export function consumeMatchExitMarker(
  storage: StorageLike | null = readSessionStorage(),
): boolean {
  if (storage === null) return false;
  try {
    const value = storage.getItem(AFTER_MATCH_EXIT_KEY);
    if (value === null) return false;
    storage.removeItem(AFTER_MATCH_EXIT_KEY);
    return value === AFTER_MATCH_EXIT_VALUE;
  } catch {
    return false;
  }
}
