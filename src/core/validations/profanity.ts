// The match's rude-name matcher, with no client and no game-state imports.
//
// Why this file exists (task 0322): the profile server must tell the moderator
// whether the match's rude-name filter would hide a requested name, and it must
// ask EXACTLY the matcher the match uses — not a copy that could drift. It cannot
// import `./username` for it: that module pulls in `translateText` from
// src/client/Utils (Lit components, dies under plain Node) and `simpleHash` from
// src/core/Util (the game-state graph) — the same problem ./usernameRules solved
// for the length and character rules (task 0067).
//
// So the matcher lives here, dependency-free apart from `obscenity`, and
// `./username` re-exports `isProfaneUsername` and keeps `fixProfaneUsername`
// (which needs `simpleHash`). Both callers share ONE matcher.
//
// It checks the ENGLISH dataset only: a Russian insult is not caught. The
// moderator's own reading of the name is still the real check.

import {
  RegExpMatcher,
  collapseDuplicatesTransformer,
  englishDataset,
  englishRecommendedTransformers,
  resolveConfusablesTransformer,
  resolveLeetSpeakTransformer,
  skipNonAlphabeticTransformer,
} from "obscenity";

const matcher = new RegExpMatcher({
  ...englishDataset.build(),
  ...englishRecommendedTransformers,
  ...resolveConfusablesTransformer(),
  ...skipNonAlphabeticTransformer(),
  ...collapseDuplicatesTransformer(),
  ...resolveLeetSpeakTransformer(),
});

/** Whether the match's rude-name filter would replace this name for other players. */
export function isProfaneUsername(username: string): boolean {
  return matcher.hasMatch(username);
}
