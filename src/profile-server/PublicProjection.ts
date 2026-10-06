// What an UNVERIFIED caller may see of a player (task 0250, slice S1).
//
// A `vfy:false` session token proves nothing: anyone who asserts a platform id gets
// one. A token may be `vfy:true` since task 0340 (0325 S3a), but no route branches
// on it yet — so this is the view EVERY caller gets until S3b, in which a PAID
// citizen and an EARNED citizen look the same — same keys, same types, only the
// values are equalized:
//  - L1 `citizenship_earned_at` → always null;
//  - L2/L3 `xp` → exactly the citizenship threshold for EVERY citizen (owner
//    ruling Q-A, 2026-09-27), so a citizen's xp never moves on any route;
//  - `updated_at` → `created_at` (a paid grant would otherwise move it);
//  - L4 `citizenship_paid` / `citizenship_earned` inbox messages → one neutral
//    `citizenship_granted`, and only the oldest one is kept — and marking
//    messages read never counts or confirms a hidden one (review R2).
// The stored rows are never rewritten: this is a projection at the route.
//
// UNVERIFIED view. S3b adds the owner view beside it and branches on
// `caller.verified` at the same call sites.

import { CITIZENSHIP_XP_THRESHOLD } from "../core/profile/Citizenship";
import type { InboxMessage } from "../core/profile/InboxContract";
import type { NameChangeState } from "../core/profile/NameChangeContract";
import type {
  PlayerProfile,
  PublicPlayerProfile,
} from "../core/profile/PlayerProfile";

/**
 * The xp an unverified caller sees: EXACTLY the threshold for every citizen,
 * whatever the stored value (owner ruling Q-A, 2026-09-27). A floor (`max(xp,
 * 100)`) was not enough (review R1/R3): it hid a paid citizen's LEVEL but not
 * its MOVEMENT — an earned citizen's xp rises past 100 after a match or a
 * tenure claim, a paid-not-earned one's stayed pinned at 100, and anyone who
 * can cause the credit could watch which. A constant never moves, and it also
 * removes the "exactly 100 ⇒ probably paid" hint. Cost, accepted in the same
 * ruling: an earned citizen sees 100 / 100 on their own card until verified
 * reads ship (0325 + S3b). A non-citizen is unchanged.
 */
export function equalizedXp(xp: number, isCitizen: boolean): number {
  return isCitizen ? CITIZENSHIP_XP_THRESHOLD : xp;
}

/**
 * Public projection of a profile — the equalized view above. This read needs a
 * session token; a token may be `vfy:true` since task 0340, but no route branches
 * on it yet, so this is the view every caller gets until S3b — and anyone can still
 * mint a `vfy:false` token for an id they merely assert. So:
 *  - paid state (`is_paid_citizen`, `citizenship_purchased_at`) is omitted —
 *    leaking "who paid";
 *  - `xp`, `citizenship_earned_at` and `updated_at` are equalized (task 0250 S1)
 *    so paid state cannot be inferred from them either.
 * The profile carries no identity at all (task 0270): neither the internal player
 * id nor a platform id can reach a client through it (ADR-113 hard rule).
 * TODO(payments): 0250 S3b returns the true values to a `verified` caller (the
 * signature is checked at login since task 0340; no route reads it yet).
 *
 * `nameChange` (task 0067) is merged in when the caller has one. It carries only
 * {status, requested_name, decided_at} — never the operator's rejection reason,
 * which would otherwise be readable by anyone who can guess a player id; that
 * text reaches the player through the citizen-gated inbox message instead.
 */
export function toPublicProfile(
  profile: PlayerProfile,
  nameChange?: NameChangeState | null,
): PublicPlayerProfile {
  const { is_paid_citizen, citizenship_purchased_at, ...rest } = profile;
  void is_paid_citizen;
  void citizenship_purchased_at;
  const equalized: PublicPlayerProfile = {
    ...rest,
    xp: equalizedXp(profile.xp, profile.is_citizen),
    citizenship_earned_at: null,
    updated_at: profile.created_at,
  };
  // Omit the key entirely (rather than sending null) when there is no request —
  // the field is `.optional()` on the shared schema, not nullable.
  return nameChange ? { ...equalized, name_change: nameChange } : equalized;
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
