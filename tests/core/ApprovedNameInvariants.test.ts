// Task 0322. Two facts the approved-name swap leans on, pinned so a later change
// to the name rule (task 0308) or the in-match cleaner shows up here first:
//
//  1. A name that passes the JOIN rule also passes the wide roster schema
//     (`UsernameSchema`). The game server swaps an approved name into the start
//     roster only after `JoinUsernameSchema` passes; if such a name could fail
//     `UsernameSchema`, GameStartInfoSchema would refuse the roster and `start()`
//     would return without starting the match.
//  2. The in-match cleaner `sanitize` leaves such a name unchanged. The moderator's
//     rude-name warning is computed on the name itself; the match checks
//     `sanitize(name)` (GameRunner). They agree only while this holds.

import { JoinUsernameSchema, UsernameSchema } from "../../src/core/Schemas";
import { sanitize } from "../../src/core/Util";

const RULE_PASSING_NAMES = [
  "abc",
  "Good_Name123",
  "Привет123",
  "Иван Петров",
  "[TAG] Player",
  "[Clan]_Name",
  "a b c",
  "ÜberSpieler",
  "名前テスト",
  "x".repeat(27),
  "Жжжжжжжжжжжжжжжжжжжжжжжжжжж",
];

describe("approved-name invariants (task 0322)", () => {
  test.each(RULE_PASSING_NAMES)("%s passes the join rule", (name) => {
    expect(JoinUsernameSchema.safeParse(name).success).toBe(true);
  });

  test.each(RULE_PASSING_NAMES)(
    "%s: a join-rule pass implies the roster schema passes",
    (name) => {
      const joined = JoinUsernameSchema.parse(name);
      expect(UsernameSchema.safeParse(joined).success).toBe(true);
    },
  );

  test.each(RULE_PASSING_NAMES)(
    "%s: sanitize leaves a rule-passing name unchanged",
    (name) => {
      const joined = JoinUsernameSchema.parse(name);
      expect(sanitize(joined)).toBe(joined);
    },
  );
});
