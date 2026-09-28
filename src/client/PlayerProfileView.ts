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
import { profileFetch } from "./ProfileSession";

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
  /**
   * The player's approved name — the server's `display_name` — or null when
   * the server holds none (never set, or cleared by an operator, task 0314).
   * Unlike `displayName` it never falls back to the platform name, so the
   * start-screen name box (task 0321) can tell "has an approved name" apart
   * from "shows the Yandex name". Every zero-state fallback reports null; only
   * an `isAuthoritative` view's null means "no approved name".
   */
  approvedName: string | null;
};

// Bound the profile read so an unreachable/slow profile API can never hang the
// card — matches the Bootstrap.ts degraded-mode philosophy.
const PROFILE_FETCH_TIMEOUT_MS = 5000;

// Last server-observed `citizenship_earned_at` per Yandex account (null encoded
// as ""), used to detect the earned-citizenship transition across page loads —
// the post-match exit is a full navigation, so in-memory state cannot carry it.
//
// `_v2` is deliberate (task 0250 S1, owner ruling D4): from the S1 server deploy
// every unverified response carries `citizenship_earned_at: null`, and bundles
// that predate S1 keep storing "" for it under the OLD prefix. Reusing that
// prefix would let S3b's first true date fire a false "earned" event for every
// earned citizen; a fresh prefix starts every device unarmed instead.
export const EARNED_AT_STORAGE_KEY_PREFIX =
  "geoconflict_citizenship_earned_at_v2:";

/**
 * View model the citizenship card renders from.
 *
 * Contract the card depends on: `null` == guest (renders the login CTA), otherwise
 * a logged-in view `{ displayName, xp, isCitizen }`. Guests are the ONLY null
 * return — every authorized failure path (no id, profile API unconfigured, 404,
 * non-200, network error, timeout, malformed body) resolves to the logged-in
 * zero-state, so a logged-in player or citizen is never misrendered as a guest.
 *
 * XP and citizenship are read from the server profile via `GET /v1/profile` under
 * the login session's Bearer token (task 0273, S4) — the Yandex id no longer
 * travels in the URL. It is still read here: a missing id is the zero-state, and
 * S3b needs it again for the local earned-at storage key.
 * The card itself makes no network calls (it just re-reads this view model).
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
    approvedName: null,
  };

  const yandexPlayerId = await FlashistFacade.instance.getYandexUniqueId();
  if (yandexPlayerId === null) {
    return zeroState;
  }

  // The profile server is a distinct backend (profileApiUrl), NOT the game API in
  // jwt.ts. profileFetch owns resolving it and the session: an unconfigured API, a
  // guest and a failed login all come back as a non-response, which degrades to the
  // zero-state (the "every authorized failure path → zero-state" contract above).
  const profile = await fetchPublicProfile();
  if (profile === null) {
    return zeroState;
  }

  // `reportEarnedCitizenshipTransition` is deliberately NOT called (task 0250
  // S1, owner ruling D4): every response is unverified until S3b, and an
  // unverified response carries `citizenship_earned_at: null` by design — so
  // there is no true transition to observe. Citizenship:Earned:XP is dormant
  // until S3b calls it for verified reads.

  return {
    displayName: profile.display_name ?? displayName,
    xp: profile.xp,
    isCitizen: profile.is_citizen,
    isAuthoritative: true,
    // Absent on a server that predates task 0067, or for a player who has never
    // requested a change — both mean "no request" to the card.
    nameChange: profile.name_change ?? null,
    approvedName: profile.display_name ?? null,
  };
}

/**
 * Fire `Citizenship:Earned:XP` when the server-authoritative profile first shows
 * `citizenship_earned_at` after a previous observation without it (task 0017;
 * spec 0021 §6 — the server write is authoritative, never the local XP display;
 * client-side detection owner-approved 2026-08-23). Keys on
 * `citizenship_earned_at`, NOT `is_citizen`: the paid grant sets `is_citizen`
 * too, and only the server's XP-threshold path ever stamps
 * `citizenship_earned_at`.
 *
 * ⚠️ S3b calls this for VERIFIED reads only. Since task 0250 S1 an unverified
 * profile carries `citizenship_earned_at: null` for every player (paid and
 * earned citizens are equalized), so feeding it an unverified read would arm
 * every device and then never fire — `loadPlayerProfileView` therefore does not
 * call it at all until S3b (owner ruling D4). Storage lives under the fresh
 * `EARNED_AT_STORAGE_KEY_PREFIX` (`_v2`) — see its comment.
 *
 * Accepted MVP residual (owner ruling 2026-08-23): a first-ever observation on
 * a device with no stored snapshot never fires (fresh device / cleared storage
 * under-counts). The old "a paid citizen crossing the threshold over-counts"
 * residual does not apply while the event is dormant; a verified read in S3b
 * carries paid state, so S3b can rule that case out when it re-enables this.
 *
 * Never throws: storage being unavailable (private mode / iframe policy) only
 * skips detection — the card must render regardless.
 */
export function reportEarnedCitizenshipTransition(
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
 * (no session, unconfigured API, 404, non-200, network error, timeout, or a body
 * that fails schema validation); the caller maps that to the logged-in
 * zero-state. Never throws to the card.
 */
async function fetchPublicProfile(): Promise<PublicPlayerProfile | null> {
  const result = await profileFetch("/v1/profile", {
    timeoutMs: PROFILE_FETCH_TIMEOUT_MS,
  });
  if (result.kind !== "response" || !result.response.ok) {
    return null;
  }
  const body: unknown = await result.response.json().catch(() => null);
  const parsed = PublicPlayerProfileSchema.safeParse(body);
  return parsed.success ? parsed.data : null;
}
