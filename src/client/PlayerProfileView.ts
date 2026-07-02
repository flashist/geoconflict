import { getServerConfigFromClient } from "../core/configuration/ConfigLoader";
import {
  PublicPlayerProfileSchema,
  type PublicPlayerProfile,
} from "../core/profile/PlayerProfile";
import { FlashistFacade } from "./flashist/FlashistFacade";

// Re-exported from the shared source of truth so the card keeps importing it from
// here while the server and client agree on one threshold value.
export { CITIZENSHIP_XP_THRESHOLD } from "../core/profile/Citizenship";

export type PlayerProfileView = {
  displayName: string;
  xp: number;
  isCitizen: boolean;
};

// Bound the profile read so an unreachable/slow profile API can never hang the
// card — matches the Bootstrap.ts degraded-mode philosophy.
const PROFILE_FETCH_TIMEOUT_MS = 5000;

/**
 * View model the citizenship card renders from.
 *
 * Contract the card depends on: `null` == guest (renders the login CTA), otherwise
 * a logged-in view `{ displayName, xp, isCitizen }`. Guests are the ONLY null
 * return — every authorized failure path (no id, profile API unconfigured, 404,
 * non-200, network error, timeout, malformed body) resolves to the logged-in
 * zero-state, so a logged-in player or citizen is never misrendered as a guest.
 *
 * XP and citizenship are read from the server profile via `GET /v1/profile`; the
 * card itself makes no network calls (it just re-reads this view model).
 */
export async function loadPlayerProfileView(): Promise<PlayerProfileView | null> {
  const isAuthorized = await FlashistFacade.instance.isYandexAuthorized();
  if (!isAuthorized) {
    return null;
  }

  // Authorized from here on: always return a logged-in view, never null.
  const displayName = await FlashistFacade.instance
    .getCurPlayerName()
    .catch(() => "");
  const zeroState: PlayerProfileView = { displayName, xp: 0, isCitizen: false };

  const yandexPlayerId = await FlashistFacade.instance.getYandexUniqueId();
  if (yandexPlayerId === null) {
    return zeroState;
  }

  // The profile server is a distinct backend (profileApiUrl), NOT the game API in
  // jwt.ts. getServerConfigFromClient() fetches /api/env and THROWS on a non-OK
  // response or missing gameEnv; a throw here would propagate out and misrender an
  // authorized player as a guest, so degrade to the zero-state instead (matches the
  // "every authorized failure path → zero-state" contract above).
  // Empty base (e.g. PROFILE_API_URL unset in local dev) → skip the fetch.
  let base: string;
  try {
    base = (await getServerConfigFromClient()).profileApiUrl().replace(/\/+$/, "");
  } catch {
    return zeroState;
  }
  if (!base) {
    return zeroState;
  }

  const profile = await fetchPublicProfile(base, yandexPlayerId);
  if (profile === null) {
    return zeroState;
  }

  return {
    displayName: profile.display_name ?? displayName,
    xp: profile.xp,
    isCitizen: profile.is_citizen,
  };
}

/**
 * Fetch and parse the public profile projection. Returns `null` on any failure
 * (404, non-200, network error, timeout, or a body that fails schema validation);
 * the caller maps that to the logged-in zero-state. Never throws to the card.
 */
async function fetchPublicProfile(
  base: string,
  yandexPlayerId: string,
): Promise<PublicPlayerProfile | null> {
  const url = `${base}/v1/profile?yandexPlayerId=${encodeURIComponent(
    yandexPlayerId,
  )}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROFILE_FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      return null;
    }
    const parsed = PublicPlayerProfileSchema.safeParse(await response.json());
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
