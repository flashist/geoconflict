// The profile server vouching for a game server's session token (task 0332,
// ADR-124; design report §4–§5).
//
// The game server never holds the session secret. It forwards the token a player
// sent in the WebSocket join on its resolve call, and this module answers ONE
// question about it: is this a valid, unexpired, VERIFIED (`vfy:true`) session of
// exactly the player the resolve just found? Anything else ⇒ not verified.
//
// Pure: no I/O, no clock other than the `nowMs` it is given, no logging.
// ⛔ Never log the token, a claim, or the secret from here or from a caller.

import type { Platform } from "../core/profile/Platform";
import { isUsableSessionSecret, verifySessionToken } from "./SessionToken";

/**
 * One resolve's vouch outcome — the `outcome` label of
 * `geoconflict.profile.resolve.vouch`. Eight bounded values, in check order:
 *  - `absent`             — the resolve carried no token (old client, a lazy
 *                           credit-time resolve, a reconnect after verification).
 *  - `no_secret`          — this box has no usable session secret: nothing verifies.
 *  - `invalid`            — the token failed its MAC or its shape (forged, tampered,
 *                           signed with a rotated-out key). Also the label a vouch
 *                           that THROWS is counted under, so the total stays
 *                           equal to the number of resolves.
 *  - `expired`            — a genuine token past its 24 h TTL.
 *  - `unverified_session` — a genuine `vfy:false` session: the login's signed
 *                           player data did not verify.
 *  - `other_platform`     — a genuine token for another platform. Cannot happen
 *                           today (one platform, and the strict claim schema
 *                           already refuses any other `plt` as `invalid`); kept as
 *                           a defensive check because ADR-124 fixes this list.
 *  - `other_player`       — a genuine verified token of a DIFFERENT player than the
 *                           one this resolve found: a stolen or replayed token, or
 *                           an id swapped after login.
 *  - `verified`           — vouched.
 */
export type ResolveVouchOutcome =
  | "verified"
  | "absent"
  | "invalid"
  | "expired"
  | "unverified_session"
  | "other_player"
  | "other_platform"
  | "no_secret";

/**
 * Vouch for `token` against the player the resolve found. The order above is
 * load-bearing — it decides the label — and so is `vfy === true` (strict, exactly
 * as `callerFromSession` reads it: anything but a literal `true` is unverified).
 */
export function vouchForSession(
  secret: string,
  token: string | undefined,
  resolved: { playerId: string; platform: Platform },
  nowMs: number = Date.now(),
): ResolveVouchOutcome {
  if (token === undefined) {
    return "absent";
  }
  if (!isUsableSessionSecret(secret)) {
    return "no_secret";
  }
  const verification = verifySessionToken(secret, token, nowMs);
  if (verification.status === "invalid") {
    return "invalid";
  }
  if (verification.status === "expired") {
    return "expired";
  }
  const { claims } = verification;
  if (claims.vfy !== true) {
    return "unverified_session";
  }
  if (claims.plt !== resolved.platform) {
    return "other_platform";
  }
  if (claims.pid !== resolved.playerId) {
    return "other_player";
  }
  return "verified";
}
