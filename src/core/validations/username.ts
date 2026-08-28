import {
  RegExpMatcher,
  collapseDuplicatesTransformer,
  englishDataset,
  englishRecommendedTransformers,
  resolveConfusablesTransformer,
  resolveLeetSpeakTransformer,
  skipNonAlphabeticTransformer,
} from "obscenity";
import { translateText } from "../../client/Utils";
import { simpleHash } from "../Util";
import {
  MAX_USERNAME_LENGTH,
  MIN_USERNAME_LENGTH,
  checkUsernameRules,
  validUsernamePattern,
  type UsernameRuleViolation,
} from "./usernameRules";

const matcher = new RegExpMatcher({
  ...englishDataset.build(),
  ...englishRecommendedTransformers,
  ...resolveConfusablesTransformer(),
  ...skipNonAlphabeticTransformer(),
  ...collapseDuplicatesTransformer(),
  ...resolveLeetSpeakTransformer(),
});

// Re-exported so every existing importer of this module keeps working unchanged;
// the rules themselves now live in ./usernameRules (dependency-free, so the
// profile server can share them — task 0067).
export { MAX_USERNAME_LENGTH, MIN_USERNAME_LENGTH };

const validPattern = validUsernamePattern;

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

export function isProfaneUsername(username: string): boolean {
  return matcher.hasMatch(username);
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
  const params = VIOLATION_PARAMS[violation];
  return {
    isValid: false,
    error:
      params === undefined
        ? translateText(`username.${violation}`)
        : translateText(`username.${violation}`, params),
  };
}

export function sanitizeUsername(str: string): string {
  const sanitized = Array.from(str)
    .filter((ch) => validPattern.test(ch))
    .join("")
    .slice(0, MAX_USERNAME_LENGTH);
  return sanitized.padEnd(MIN_USERNAME_LENGTH, "x");
}
