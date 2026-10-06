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
  /**
   * True ONLY when the server answered with the verified OWNER view (task 0250
   * S3b) and it says the player bought citizenship (`is_paid_citizen: true`).
   * False for every zero-state, every unverified (equalized S1) view and every
   * server that predates S3b — fail-closed for entitlement (ADR-116 Decision 4):
   * an unverified read can never grant a paid benefit. Task 0248 reads this; no
   * UI does in S3b.
   */
  isPaidCitizen: boolean;
  /**
   * True ONLY when the server answered with the verified OWNER view (task 0250
   * S3b) — whatever it says about paid. False for every zero-state, every
   * unverified (equalized S1) view and every server that predates S3b. Task
   * 0397: display-only, it tells the player whether this session is confirmed.
   * It never grants anything (ADR-116 Decision 4) — `isPaidCitizen` is the
   * entitlement.
   */
  isVerifiedRead: boolean;
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
 * it keys the local earned-at storage for the verified-read detector (S3b).
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
    isPaidCitizen: false,
    isVerifiedRead: false,
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

  // The server sends the paid keys ONLY in the verified owner view (task 0250
  // S3b), so their presence is the marker. Detection runs for that view only: an
  // unverified response carries `citizenship_earned_at: null` by design (S1,
  // owner ruling D4), so it touches no storage and cannot arm the transition.
  const isOwnerView = profile.is_paid_citizen !== undefined;
  if (isOwnerView) {
    reportEarnedCitizenshipTransition(yandexPlayerId, {
      earnedAt: profile.citizenship_earned_at,
      isPaidCitizen: profile.is_paid_citizen === true,
      purchasedAt: profile.citizenship_purchased_at ?? null,
    });
  }

  return {
    displayName: profile.display_name ?? displayName,
    xp: profile.xp,
    isCitizen: profile.is_citizen,
    isAuthoritative: true,
    // Absent on a server that predates task 0067, or for a player who has never
    // requested a change — both mean "no request" to the card.
    nameChange: profile.name_change ?? null,
    approvedName: profile.display_name ?? null,
    isPaidCitizen: isOwnerView && profile.is_paid_citizen === true,
    isVerifiedRead: isOwnerView,
  };
}

/** What a verified (owner-view) read says about how the player became a citizen. */
export type CitizenshipFacts = {
  earnedAt: string | null;
  isPaidCitizen: boolean;
  purchasedAt: string | null;
};

/**
 * Fire `Citizenship:Earned:XP` when the server-authoritative profile first shows
 * `citizenship_earned_at` after a previous observation without it (task 0017;
 * spec 0021 §6 — the server write is authoritative, never the local XP display;
 * client-side detection owner-approved 2026-08-23). Keys on
 * `citizenship_earned_at`, NOT `is_citizen`: the paid grant sets `is_citizen`
 * too, and only the server's XP-threshold path ever stamps
 * `citizenship_earned_at`.
 *
 * Called for VERIFIED (owner-view) reads only (task 0250 S3b). Since S1 an
 * unverified profile carries `citizenship_earned_at: null` for every player, so
 * feeding it one would arm every device and then never fire (owner ruling D4).
 * Storage lives under the fresh `EARNED_AT_STORAGE_KEY_PREFIX` (`_v2`) — see its
 * comment.
 *
 * Paid citizens (brief note 2026-09-27): the server still stamps
 * `citizenship_earned_at` when a PAID citizen crosses 100 XP, which is not an
 * earned citizenship. So the date is always stored, but the event fires only if
 * the earn came BEFORE any purchase:
 *  - not paid → fire;
 *  - paid, purchased strictly after the earn (earned first, paid later — even
 *    between two page loads) → fire;
 *  - paid with the purchase at or before the earn, or with no purchase date →
 *    suppress (lean to under-counting, as D4 already does).
 *
 * Accepted MVP residual (owner ruling 2026-08-23): a first-ever observation on
 * a device with no stored snapshot never fires (fresh device / cleared storage
 * under-counts), and an unverified session never fires at all.
 *
 * Never throws: storage being unavailable (private mode / iframe policy) only
 * skips detection — the card must render regardless.
 */
export function reportEarnedCitizenshipTransition(
  yandexPlayerId: string,
  facts: CitizenshipFacts,
): void {
  const { earnedAt } = facts;
  try {
    const key = EARNED_AT_STORAGE_KEY_PREFIX + yandexPlayerId;
    // null (never observed) is deliberately distinct from "" (observed as
    // not-yet-earned): only the latter can arm the transition.
    const previous = localStorage.getItem(key);
    localStorage.setItem(key, earnedAt ?? "");
    if (previous === "" && earnedAt !== null && earnedBeforePurchase(facts)) {
      flashist_logEventAnalytics(
        flashistConstants.analyticEvents.CITIZENSHIP_EARNED_XP,
      );
    }
  } catch {
    // Storage unavailable — silently skip detection.
  }
}

/** True when citizenship was earned before any purchase (see the rule above). */
function earnedBeforePurchase(facts: CitizenshipFacts): boolean {
  if (!facts.isPaidCitizen) {
    return true;
  }
  if (facts.earnedAt === null || facts.purchasedAt === null) {
    return false;
  }
  const earnedMs = Date.parse(facts.earnedAt);
  const purchasedMs = Date.parse(facts.purchasedAt);
  // NaN compares false, so an unparseable date suppresses (under-count).
  return purchasedMs > earnedMs;
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
