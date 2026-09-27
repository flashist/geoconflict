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

/**
 * Clean ANY string into a name that passes `checkUsernameRules` — used where a
 * name must never be refused (a stored or Yandex-supplied name on load, every
 * in-game name in PlayerImpl). Keeps only the characters the rule allows, then
 * pads a too-short result with "x".
 *
 * Moved here from ./username (task 0307) so it sits next to the rule it must
 * satisfy; ./username re-exports it, so existing importers are unchanged.
 *
 * The length cap counts UTF-16 units, exactly as the rule does, but it cuts at a
 * WHOLE character: the old `.slice(0, MAX_USERNAME_LENGTH)` could stop between
 * the two halves of an "astral" letter (one stored as two units), leaving half a
 * character the rule then refused. Only names of ≥14 astral letters are affected;
 * every other name cleans exactly as before. `tests/UsernameHostileInputs.test.ts`
 * pins that the output always passes the rule.
 */
export function sanitizeUsername(str: string): string {
  let sanitized = "";
  for (const ch of str) {
    if (!validUsernamePattern.test(ch)) {
      continue;
    }
    if (sanitized.length + ch.length > MAX_USERNAME_LENGTH) {
      break;
    }
    sanitized += ch;
  }
  return sanitized.padEnd(MIN_USERNAME_LENGTH, "x");
}

/**
 * `sanitizeUsername`, trimmed — for the name a client JOINS a game with (0307
 * review R2). The server's join check trims, then applies the rule (like the
 * name input and the profile server), but `sanitizeUsername` keeps edge spaces:
 * "★ A ★" cleans to " A ", which trims to a too-short "A" the server refuses,
 * and "   " stays a blank name. So: clean, trim, then clean once more to re-pad a
 * now-short name. The output always passes the rule AND equals its own trim.
 *
 * `sanitizeUsername` itself is unchanged — PlayerImpl runs it on every in-game
 * name, and how the cleaner treats characters is task 0308's.
 */
export function sanitizeUsernameForJoin(str: string): string {
  return sanitizeUsername(sanitizeUsername(str).trim());
}
