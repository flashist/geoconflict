import { getServerConfigFromClient } from "../core/configuration/ConfigLoader";
import type { NameChangeState } from "../core/profile/NameChangeContract";
import {
  PublicPlayerProfileSchema,
  type PublicPlayerProfile,
} from "../core/profile/PlayerProfile";
import {
  FlashistFacade,
  flashist_logEventAnalytics,
  flashistConstants,
} from "./flashist/FlashistFacade";

// Re-exported from the shared source of truth so the card keeps importing it from
// here while the server and client agree on one threshold value.
export { CITIZENSHIP_XP_THRESHOLD } from "../core/profile/Citizenship";

export type PlayerProfileView = {
  displayName: string;
  xp: number;
  isCitizen: boolean;
  /**
   * True only when this view reflects a SUCCESSFULLY fetched server profile.
   * False for every zero-state fallback (no id, unconfigured API, 404,
   * non-200, timeout, malformed body) — those report `isCitizen: false`
   * without knowing it. Anything with real-money consequences (the paid
   * citizenship CTA, task 0018 review R1) must require this flag: an existing
   * citizen behind a failed profile read must never see a working buy button.
   */
  isAuthoritative: boolean;
  /**
   * The player's latest name-change request (task 0067), or null when they have
   * none — which is also what every zero-state fallback reports, since a
   * non-authoritative read knows nothing about requests. The card gates the
   * whole name-change UI on `isAuthoritative` anyway.
   */
  nameChange: NameChangeState | null;
};

// Bound the profile read so an unreachable/slow profile API can never hang the
// card — matches the Bootstrap.ts degraded-mode philosophy.
const PROFILE_FETCH_TIMEOUT_MS = 5000;

// Last server-observed `citizenship_earned_at` per Yandex account (null encoded
// as ""), used to detect the earned-citizenship transition across page loads —
// the post-match exit is a full navigation, so in-memory state cannot carry it.
const EARNED_AT_STORAGE_KEY_PREFIX = "geoconflict_citizenship_earned_at:";

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
  const zeroState: PlayerProfileView = {
    displayName,
    xp: 0,
    isCitizen: false,
    isAuthoritative: false,
    nameChange: null,
  };

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

  reportEarnedCitizenshipTransition(
    yandexPlayerId,
    profile.citizenship_earned_at,
  );

  return {
    displayName: profile.display_name ?? displayName,
    xp: profile.xp,
    isCitizen: profile.is_citizen,
    isAuthoritative: true,
    // Absent on a server that predates task 0067, or for a player who has never
    // requested a change — both mean "no request" to the card.
    nameChange: profile.name_change ?? null,
  };
}

/**
 * Fire `Citizenship:Earned:XP` when the server-authoritative profile first shows
 * `citizenship_earned_at` after a previous observation without it (task 0017;
 * spec 0021 §6 — the server write is authoritative, never the local XP display;
 * client-side detection owner-approved 2026-08-23). Keys on
 * `citizenship_earned_at`, NOT `is_citizen`: the paid grant sets `is_citizen`
 * too, the public projection strips `is_paid_citizen`, and only the server's
 * XP-threshold path ever stamps `citizenship_earned_at`.
 *
 * Accepted MVP residuals (owner ruling 2026-08-23): a first-ever observation on
 * a device with no stored snapshot never fires (fresh device / cleared storage
 * under-counts), and a paid citizen later crossing the XP threshold does fire
 * (paid state is invisible client-side).
 *
 * Never throws: storage being unavailable (private mode / iframe policy) only
 * skips detection — the card must render regardless.
 */
function reportEarnedCitizenshipTransition(
  yandexPlayerId: string,
  earnedAt: string | null,
): void {
  try {
    const key = EARNED_AT_STORAGE_KEY_PREFIX + yandexPlayerId;
    // null (never observed) is deliberately distinct from "" (observed as
    // not-yet-earned): only the latter can arm the transition.
    const previous = localStorage.getItem(key);
    localStorage.setItem(key, earnedAt ?? "");
    if (previous === "" && earnedAt !== null) {
      flashist_logEventAnalytics(
        flashistConstants.analyticEvents.CITIZENSHIP_EARNED_XP,
      );
    }
  } catch {
    // Storage unavailable — silently skip detection.
  }
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
