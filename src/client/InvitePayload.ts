import { cleanLobbyCode } from "../core/PrivateLobbyCode";
import { PrivateLobbyCodeSchema } from "../core/Schemas";

// Task 0382 (ADR-119): the friend's side of a Yandex invite link. The link
// carries the lobby code as `payload`; the SDK hands it back as
// `environment.payload`. A valid code opens the Join window ONCE — the payload
// comes back on the post-match reload too (0199 probe P8), so handled codes are
// remembered in sessionStorage. Pure helpers with injectable storage; Main calls
// openInviteFromPayload().
//
// This file only reads. It never touches the page address or history: Yandex's
// loader reads its SDK address from the query string (the 0331/0337 trap).
//
// Private-lobby flags are deliberately NOT an input: an invite always opens the
// Join window, tester or not (owner ruling (a), 2026-10-04).

export interface InviteStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const HANDLED_INVITES_KEY = "geoconflict.privateLobby.handledInvites";
/** How many handled codes are remembered — the most recent ones are kept. */
export const MAX_HANDLED_INVITES = 20;
/** Longer payloads are not looked at (another use of the payload, or junk). */
const MAX_PAYLOAD_LENGTH = 64;

// Codes handled on this page, so the startup read and the SDK-ready read never
// open the Join window twice, even when sessionStorage is unavailable.
const handledThisPage = new Set<string>();

export function resetInvitePayloadForTests(): void {
  handledThisPage.clear();
}

/** The private-lobby code an invite payload carries, or null (task 0389 rule: clean first). */
export function lobbyCodeFromInvitePayload(payload: unknown): string | null {
  if (typeof payload !== "string" || payload.length > MAX_PAYLOAD_LENGTH) {
    return null;
  }
  const code = cleanLobbyCode(payload);
  return PrivateLobbyCodeSchema.safeParse(code).success ? code : null;
}

/**
 * Marks the code handled. "claimed": first time in this tab — open it.
 * "seen": already handled (this page, or before a reload). "no-storage":
 * sessionStorage is unavailable, so a reload could not be told apart — owner
 * ruling 2026-10-08: do not open.
 */
export function claimInviteCode(
  code: string,
  storage: InviteStorage | null,
): "claimed" | "seen" | "no-storage" {
  if (handledThisPage.has(code)) {
    return "seen";
  }
  handledThisPage.add(code);
  if (storage === null) {
    return "no-storage";
  }
  try {
    const handled = readHandledCodes(storage.getItem(HANDLED_INVITES_KEY));
    if (handled.includes(code)) {
      return "seen";
    }
    handled.push(code);
    storage.setItem(
      HANDLED_INVITES_KEY,
      JSON.stringify(handled.slice(-MAX_HANDLED_INVITES)),
    );
    return "claimed";
  } catch {
    return "no-storage";
  }
}

/** The stored list; anything unreadable counts as empty (it is overwritten). */
function readHandledCodes(stored: string | null): string[] {
  if (stored === null) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(stored);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

/**
 * sessionStorage, or null when it is unavailable (private mode / sandboxed
 * iframe) — merely touching the property can throw, so the access is guarded.
 */
function readSessionStorage(): InviteStorage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

/**
 * Opens the Join window for a new invite. Returns whether it opened. A valid
 * code is marked handled even when the player is busy (in a lobby, a match or
 * the tutorial) — they are never pulled out of what they chose, and it does not
 * come back later.
 */
export function openInviteFromPayload(options: {
  readPayload: () => unknown;
  isBusy: () => boolean;
  openJoinWindow: (code: string) => void;
  storage?: InviteStorage | null;
}): boolean {
  const code = lobbyCodeFromInvitePayload(options.readPayload());
  if (code === null) {
    return false;
  }
  const storage =
    options.storage === undefined ? readSessionStorage() : options.storage;
  if (claimInviteCode(code, storage) !== "claimed") {
    return false;
  }
  if (options.isBusy()) {
    return false;
  }
  options.openJoinWindow(code);
  console.log(`InvitePayload | opening the Join window for an invite`);
  return true;
}

/**
 * The first-time tutorial auto-launches unless the invite opened the Join
 * window on this page load: the tutorial's own join would replace the friend's
 * private-lobby join (owner ruling 2026-10-08, "Skip tutorial that load").
 */
export function shouldAutoLaunchTutorial(
  tutorialDone: boolean,
  openedInvite: boolean,
): boolean {
  return !tutorialDone && !openedInvite;
}
