import { readFileSync } from "fs";
import { join } from "path";
import { CITIZENSHIP_XP_THRESHOLD } from "../../../src/core/profile/Citizenship";

/**
 * Task 0211, verification step 4d. The citizenship threshold is stated in
 * player-facing copy, in two files that must stay in sync with each other AND with
 * the constant. Nothing linked them before: ADR-111's rescale moved the constant and
 * the copy would have gone on saying "1,000 XP" with nothing objecting.
 *
 * ⚠️ What this guard is, exactly: a literal-digits check. It asserts the copy
 * contains `String(CITIZENSHIP_XP_THRESHOLD)` — "100". It therefore does NOT tolerate
 * a thousands separator: if the threshold ever moves to a four-digit value, the copy
 * will read "1,000 XP" and this test will fail even though the copy is correct.
 * That is the moment to decide, deliberately, how the separator is handled in each
 * language — not a reason to loosen the assertion now. (The pre-rescale copy used
 * the English-style "1,000" in Russian too.)
 */
const KEY_PATH = ["inbox", "templates", "citizenship_earned", "body"] as const;

function citizenshipEarnedBody(lang: string): string {
  const raw = readFileSync(
    join(__dirname, "../../../resources/lang", `${lang}.json`),
    "utf-8",
  );
  let node: unknown = JSON.parse(raw);
  for (const segment of KEY_PATH) {
    expect(node).toMatchObject({ [segment]: expect.anything() });
    node = (node as Record<string, unknown>)[segment];
  }
  expect(typeof node).toBe("string");
  return node as string;
}

describe("citizenship threshold copy (task 0211 / ADR-111)", () => {
  test.each(["en", "ru"])(
    "%s.json states the current threshold, not a stale figure",
    (lang) => {
      const body = citizenshipEarnedBody(lang);
      expect(body).toContain(String(CITIZENSHIP_XP_THRESHOLD));
      // Not vacuous: the pre-rescale figure is gone. "1,000" does not contain the
      // substring "100", so the assertion above really does discriminate.
      expect(body).not.toContain("1,000");
      expect(body).not.toContain("1000");
    },
  );

  test("both languages state the same figure", () => {
    const figure = String(CITIZENSHIP_XP_THRESHOLD);
    expect(citizenshipEarnedBody("en")).toContain(figure);
    expect(citizenshipEarnedBody("ru")).toContain(figure);
  });
});
