import { translateText } from "../../client/Utils";
import { simpleHash } from "../Util";
import { isProfaneUsername } from "./profanity";
import {
  MAX_USERNAME_LENGTH,
  MIN_USERNAME_LENGTH,
  checkUsernameRules,
  sanitizeUsername,
  type UsernameRuleViolation,
} from "./usernameRules";

// The matcher itself lives in ./profanity (task 0322) so the profile server can
// ask the same one without this module's client imports; re-exported here so
// every existing importer keeps working unchanged.
export { isProfaneUsername };

// Re-exported so every existing importer of this module keeps working unchanged;
// the rules themselves now live in ./usernameRules (dependency-free, so the
// profile server can share them — task 0067).
export { MAX_USERNAME_LENGTH, MIN_USERNAME_LENGTH, sanitizeUsername };

const shadowNames = [
  "NicePeopleOnly",
  "BeKindPlz",
  "LearningManners",
  "StayClassy",
  "BeNicer",
  "NeedHugs",
  "MakeFriends",
];

export function fixProfaneUsername(username: string): string {
  if (isProfaneUsername(username)) {
    return shadowNames[simpleHash(username) % shadowNames.length];
  }
  return username;
}

/**
 * The `translateText` params each violation's message substitutes. Kept exactly
 * as the pre-extraction implementation passed them — including the `{max}` on
 * `invalid_chars`, whose current en/ru text does not use it. Dropping an unused
 * param would be a silent behavior change if the text ever starts using it.
 */
const VIOLATION_PARAMS: Record<
  UsernameRuleViolation,
  Record<string, number> | undefined
> = {
  not_string: undefined,
  too_short: { min: MIN_USERNAME_LENGTH },
  too_long: { max: MAX_USERNAME_LENGTH },
  invalid_chars: { max: MAX_USERNAME_LENGTH },
};

/**
 * The translated message for one broken rule, with its `{min}`/`{max}` filled in
 * (task 0307). The ONE place those params are passed — the citizenship card used
 * to translate `username.<violation>` without them and showed a raw `{max}`.
 */
export function usernameViolationMessage(
  violation: UsernameRuleViolation,
): string {
  const params = VIOLATION_PARAMS[violation];
  return params === undefined
    ? translateText(`username.${violation}`)
    : translateText(`username.${violation}`, params);
}

/**
 * The whole name rule in one sentence (`username.rules_hint`), shown while a
 * name is being edited and after every rule error (task 0307, owner ruling Q-C).
 * The numbers come from the shared constants, so the text cannot drift from the
 * rule the server enforces. Task 0308 owns the character set: when it changes,
 * it edits `username.rules_hint` and `username.invalid_chars` with it.
 */
export function usernameRulesHint(): string {
  return translateText("username.rules_hint", {
    min: MIN_USERNAME_LENGTH,
    max: MAX_USERNAME_LENGTH,
  });
}

/**
 * What a player sees when their name breaks the rule: the specific problem, then
 * the full rule — so every error explains what IS allowed (task 0307).
 */
export function usernameRuleErrorMessage(
  violation: UsernameRuleViolation,
): string {
  return `${usernameViolationMessage(violation)} ${usernameRulesHint()}`;
}

/**
 * Thin translating wrapper over `checkUsernameRules` (task 0067). Same signature,
 * same message keys, same params, same ordering as before the extraction — the
 * rules moved, the client-visible behavior did not.
 */
export function validateUsername(username: string): {
  isValid: boolean;
  error?: string;
} {
  const violation = checkUsernameRules(username);
  if (violation === null) {
    return { isValid: true };
  }
  return { isValid: false, error: usernameViolationMessage(violation) };
}
