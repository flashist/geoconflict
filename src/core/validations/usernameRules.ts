// Pure username RULES — length and charset, with no translation and no I/O.
//
// Why this file exists (task 0067): the profile server must validate a requested
// display name with the SAME rules the in-game username input uses (owner ruling
// (c): reuse the existing validator, do not re-implement it). It cannot import
// `./username` to get them — that module pulls in `translateText` from
// src/client/Utils (which evaluates Lit `@customElement` definitions and dies
// under plain Node with "customElements is not defined") and `simpleHash` from
// src/core/Util (which drags in the game-state graph). tests/Censor.test.ts has to
// jest.mock("../src/client/Utils") just to import it.
//
// So the rules live here, dependency-free, and `./username` is a thin translating
// wrapper over them. Both callers therefore share ONE definition of the rules and
// cannot drift.
//
// NOTE: profanity is deliberately NOT part of this. `validateUsername` never ran
// the profanity check either — `isProfaneUsername`/`fixProfaneUsername` are
// separate and SHADOW-RENAME rather than reject. Mirroring the validator exactly
// means no profanity auto-reject on the name-change path; the human moderation
// gate is what catches that.

export const MIN_USERNAME_LENGTH = 3;
export const MAX_USERNAME_LENGTH = 27;

// Allow any letter/number in any script plus limited legacy symbols (underscore,
// brackets, whitespace). Emojis are disallowed entirely.
export const validUsernamePattern = /^[\p{L}\p{N}_[\]\s]+$/u;

/**
 * Which rule a username breaks. These are also the `username.<key>` message keys
 * in resources/lang/*.json, so the translating wrapper is a straight lookup.
 */
export type UsernameRuleViolation =
  | "not_string"
  | "too_short"
  | "too_long"
  | "invalid_chars";

/**
 * The first rule `username` breaks, or null when it passes all of them. Order is
 * load-bearing — it must match the original `validateUsername` sequence so the
 * client keeps reporting the same message for the same input.
 */
export function checkUsernameRules(
  username: unknown,
): UsernameRuleViolation | null {
  if (typeof username !== "string") {
    return "not_string";
  }
  if (username.length < MIN_USERNAME_LENGTH) {
    return "too_short";
  }
  if (username.length > MAX_USERNAME_LENGTH) {
    return "too_long";
  }
  if (!validUsernamePattern.test(username)) {
    return "invalid_chars";
  }
  return null;
}
