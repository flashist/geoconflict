/**
 * Pure decision: may this session use the client-local guest profile (S4 Profile
 * T2)? Extracted to its own module so the matrix is unit-testable without pulling
 * in FlashistFacade's (DOM/SDK-heavy) import graph.
 *
 * A guest profile is only for definitely-unauthenticated players:
 *  - not on the Yandex platform (standalone web) → always a guest;
 *  - on Yandex with a player object that is NOT authorized → a guest;
 *  - on Yandex but the auth state is UNKNOWN (no player object resolved after the
 *    bounded init) → skip, so an actually-logged-in user whose getPlayer() hung is
 *    not given divergent local XP that bypasses the server-authoritative path;
 *  - on Yandex and authorized → skip (server-authoritative).
 */
export function canUseGuestProfileForState(state: {
  yaGamesAvailable: boolean;
  hasYandexPlayer: boolean;
  isYandexAuthorized: boolean;
}): boolean {
  if (!state.yaGamesAvailable) return true; // standalone web => definite guest
  if (!state.hasYandexPlayer) return false; // Yandex present, auth unknown => skip
  return !state.isYandexAuthorized; // Yandex player present => guest iff not authorized
}
