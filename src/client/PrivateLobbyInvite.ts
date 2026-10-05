import { cleanLobbyCode } from "../core/PrivateLobbyCode";
import { PrivateLobbyCodeSchema } from "../core/Schemas";

// Task 0380 (ADR-119): what a private-lobby invite is, per platform. Yandex
// rules 8.4.2/8.4.4 forbid links off the portal, so on the Yandex build the
// invite is the bare lobby code and a `#join=` link is not honoured. The
// standalone build keeps today's link and `#join=` exactly as before.
//
// The platform is the template's flag (FlashistFacade.yaGamesAvailable), not
// whether the SDK loaded: a Yandex boot whose SDK failed still copies the code,
// never a URL.

/** The text the host's invite copies. */
export function inviteCopyText(
  lobbyId: string,
  isYandexPlatform: boolean,
  windowOrigin: string,
): string {
  if (isYandexPlatform) {
    return lobbyId;
  }
  // Flashist Adaptation: windowOrigin is correct here — the invite should keep the
  // current document (…/yandex-games_iframe.html). No separator: a trailing "/"
  // makes the path stop matching nginx's `\.html$` and serves index.html instead.
  // `${location.origin}/#join=${lobbyId}`,
  return `${windowOrigin}#join=${lobbyId}`;
}

/**
 * The lobby id a `#join=` hash asks to open, or null when it is not honoured:
 * always null on the Yandex build, and null for anything that is not a
 * private-lobby code once cleaned (task 0389) anywhere.
 */
export function lobbyIdFromJoinHash(
  decodedHash: string,
  isYandexPlatform: boolean,
): string | null {
  if (isYandexPlatform) {
    return null;
  }
  const lobbyId = cleanLobbyCode(decodedHash.substring(6)); // Remove "#join="
  if (PrivateLobbyCodeSchema.safeParse(lobbyId).success) {
    return lobbyId;
  }
  return null;
}
