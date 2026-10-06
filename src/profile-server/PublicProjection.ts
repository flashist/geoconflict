// The two views of a player a route may return (task 0250).
//
// UNVERIFIED view (slice S1). A `vfy:false` session token proves nothing: anyone
// who asserts a platform id gets one. That caller sees a PAID citizen and an
// EARNED citizen the same — same keys, same types, only the values are equalized:
//  - L1 `citizenship_earned_at` → always null;
//  - L2/L3 `xp` → exactly the citizenship threshold for EVERY citizen (owner
//    ruling Q-A, 2026-09-27), so a citizen's xp never moves on any route;
//  - `updated_at` → `created_at` (a paid grant would otherwise move it);
//  - L4 `citizenship_paid` / `citizenship_earned` inbox messages → one neutral
//    `citizenship_granted`, and only the oldest one is kept — and marking
//    messages read never counts or confirms a hidden one (review R2).
//
// OWNER view (slice S3b, owner ruling D1). A `vfy:true` token was minted for a
// fresh, genuine Yandex signature of the asserted id (task 0340, id checked
// first), so its `pid` IS the signed player — and no player-facing route takes a
// target id, so the caller can only ever read itself. That caller gets its own
// stored values verbatim, plus the raw paid facts, and the original inbox keys.
//
// The choice is made ONLY by the caller's own `verified` flag (the `*ForCaller`
// choosers below), never by anything about the stored player, so which view
// answers says nothing about paid state. The stored rows are never rewritten:
// this is a projection at the route.

import { CITIZENSHIP_XP_THRESHOLD } from "../core/profile/Citizenship";
import type { InboxMessage } from "../core/profile/InboxContract";
import type { NameChangeState } from "../core/profile/NameChangeContract";
import type {
  PlayerProfile,
  PublicPlayerProfile,
} from "../core/profile/PlayerProfile";

/** The unverified view's type: the paid keys are never on it. */
export type UnverifiedPublicProfile = Omit<
  PublicPlayerProfile,
  "is_paid_citizen" | "citizenship_purchased_at"
>;

/**
 * The xp an unverified caller sees: EXACTLY the threshold for every citizen,
 * whatever the stored value (owner ruling Q-A, 2026-09-27). A floor (`max(xp,
 * 100)`) was not enough (review R1/R3): it hid a paid citizen's LEVEL but not
 * its MOVEMENT — an earned citizen's xp rises past 100 after a match or a
 * tenure claim, a paid-not-earned one's stayed pinned at 100, and anyone who
 * can cause the credit could watch which. A constant never moves, and it also
 * removes the "exactly 100 ⇒ probably paid" hint. Cost, accepted in the same
 * ruling: an earned citizen sees 100 / 100 on their own card unless the read
 * is verified (task 0250 S3b: `xpForCaller`). A non-citizen is unchanged.
 */
export function equalizedXp(xp: number, isCitizen: boolean): number {
  return isCitizen ? CITIZENSHIP_XP_THRESHOLD : xp;
}

/**
 * The UNVERIFIED projection of a profile — the equalized view above. Anyone can
 * mint a `vfy:false` token for an id they merely assert, so:
 *  - paid state (`is_paid_citizen`, `citizenship_purchased_at`) is omitted —
 *    leaking "who paid" (the return type says so);
 *  - `xp`, `citizenship_earned_at` and `updated_at` are equalized (task 0250 S1)
 *    so paid state cannot be inferred from them either.
 * The profile carries no identity at all (task 0270): neither the internal player
 * id nor a platform id can reach a client through it (ADR-113 hard rule).
 *
 * `nameChange` (task 0067) is merged in when the caller has one. It carries only
 * {status, requested_name, decided_at} — never the operator's rejection reason,
 * which would otherwise be readable by anyone who can guess a player id; that
 * text reaches the player through the citizen-gated inbox message instead.
 */
export function toPublicProfile(
  profile: PlayerProfile,
  nameChange?: NameChangeState | null,
): UnverifiedPublicProfile {
  const { is_paid_citizen, citizenship_purchased_at, ...rest } = profile;
  void is_paid_citizen;
  void citizenship_purchased_at;
  const equalized: UnverifiedPublicProfile = {
    ...rest,
    xp: equalizedXp(profile.xp, profile.is_citizen),
    citizenship_earned_at: null,
    updated_at: profile.created_at,
  };
  // Omit the key entirely (rather than sending null) when there is no request —
  // the field is `.optional()` on the shared schema, not nullable.
  return nameChange ? { ...equalized, name_change: nameChange } : equalized;
}

/**
 * The OWNER projection of a profile (task 0250 S3b, owner ruling D1): the stored
 * record verbatim — true `xp`, `citizenship_earned_at` and `updated_at`, and BOTH
 * paid keys, always present (even false / null) so their presence marks the owner
 * view and depends only on the caller's token, never on the player's state.
 * `name_change` is merged exactly as in `toPublicProfile`. The profile carries no
 * identity (task 0270), so nothing else can ride along. Only for a `vfy:true`
 * caller reading ITSELF — use `profileForCaller`, never call this directly.
 */
export function toOwnerProfile(
  profile: PlayerProfile,
  nameChange?: NameChangeState | null,
): PublicPlayerProfile {
  const owner: PublicPlayerProfile = { ...profile };
  return nameChange ? { ...owner, name_change: nameChange } : owner;
}

/** The profile a caller sees: the owner view when verified, else the S1 view. */
export function profileForCaller(
  profile: PlayerProfile,
  nameChange: NameChangeState | null | undefined,
  verified: boolean,
): PublicPlayerProfile {
  return verified
    ? toOwnerProfile(profile, nameChange)
    : toPublicProfile(profile, nameChange);
}

/** The xp a caller sees: the true total when verified, else `equalizedXp`. */
export function xpForCaller(
  xp: number,
  isCitizen: boolean,
  verified: boolean,
): number {
  return verified ? xp : equalizedXp(xp, isCitizen);
}

/**
 * The inbox list a caller sees: the stored messages unchanged when verified (the
 * original keys, nothing collapsed), else `toPublicInboxMessages`.
 */
export function inboxMessagesForCaller(
  messages: readonly InboxMessage[],
  verified: boolean,
): InboxMessage[] {
  return verified ? [...messages] : toPublicInboxMessages(messages);
}

/** The two stored keys that reveal how a player became a citizen. */
const CITIZENSHIP_TEMPLATE_KEYS: ReadonlySet<string> = new Set([
  "citizenship_paid",
  "citizenship_earned",
]);

/** The neutral key an unverified caller sees in their place. */
const NEUTRAL_CITIZENSHIP_TEMPLATE_KEY = "citizenship_granted";

/**
 * The inbox list an unverified caller sees. Every `citizenship_paid` /
 * `citizenship_earned` message becomes `citizenship_granted`, and only the
 * OLDEST of them is kept — a player who earned and then paid has two, which
 * would otherwise tell them apart. `messages` is newest first (InboxRepository),
 * so the oldest is the last one. Every other message — name-change templates and
 * literal (`templateKey: null`) messages — passes through untouched, and order,
 * ids, `sentAt` and `readAt` are kept. The kept citizenship message's
 * `templateParams` is reset to `{}` (the neutral template has none).
 */
export function toPublicInboxMessages(
  messages: readonly InboxMessage[],
): InboxMessage[] {
  let oldestCitizenshipIndex = -1;
  messages.forEach((message, index) => {
    if (isCitizenshipMessage(message)) {
      oldestCitizenshipIndex = index;
    }
  });
  const result: InboxMessage[] = [];
  messages.forEach((message, index) => {
    if (!isCitizenshipMessage(message)) {
      result.push(message);
    } else if (index === oldestCitizenshipIndex) {
      // The neutral template substitutes no params; `{}` is what both hooks
      // store, and resetting it means an operator-sent row cannot differ.
      result.push({
        ...message,
        templateKey: NEUTRAL_CITIZENSHIP_TEMPLATE_KEY,
        templateParams: {},
      });
    }
  });
  return result;
}

/**
 * The ids of the stored messages `toPublicInboxMessages` hides — the newer
 * citizenship messages of a player who has more than one (review R2). Marking
 * messages read must neither count nor confirm these, or `updated` would tell
 * an earned-then-paid citizen apart from an earned-only one.
 */
export function hiddenInboxMessageIds(
  messages: readonly InboxMessage[],
): Set<number> {
  const visibleIds = new Set(
    toPublicInboxMessages(messages).map((message) => message.id),
  );
  return new Set(
    messages
      .filter((message) => !visibleIds.has(message.id))
      .map((message) => message.id),
  );
}

function isCitizenshipMessage(message: InboxMessage): boolean {
  return (
    message.templateKey !== null &&
    CITIZENSHIP_TEMPLATE_KEYS.has(message.templateKey)
  );
}
