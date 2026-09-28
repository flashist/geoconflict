// Brief step 8: the name-change strings must exist in BOTH en.json and ru.json.
// The project rule is that any localization change is applied to both files in
// step; this asserts it for this task's section rather than trusting review.

import fs from "fs";
import IntlMessageFormat from "intl-messageformat";
import path from "path";

const LANG_DIR = path.join(__dirname, "../../resources/lang");

function load(file: string): Record<string, Record<string, string>> {
  return JSON.parse(fs.readFileSync(path.join(LANG_DIR, file), "utf-8"));
}

const SECTION = "citizenship_name_change";

// Every key the card renders. Kept explicit (not derived from en.json) so
// deleting a key from BOTH files still fails this test rather than silently
// agreeing with itself.
const REQUIRED_KEYS = [
  "cta",
  "title",
  "input_placeholder",
  "submit",
  "cancel_edit",
  "pending_label",
  "pending_hint",
  "cancel_request",
  "rejected_label",
  "rejected_hint",
  "try_again",
  "dismiss", // task 0314 — the Hide button on the declined notice
  "error_name_taken",
  "error_pending_exists",
  "error_not_citizen",
  "error_generic",
];

describe("citizenship_name_change localization (task 0067)", () => {
  const en = load("en.json");
  const ru = load("ru.json");

  it.each(["en.json", "ru.json"])("%s has the section", (file) => {
    expect(load(file)[SECTION]).toBeDefined();
  });

  it.each(REQUIRED_KEYS)("both files define %s, non-empty", (key) => {
    expect(en[SECTION][key]?.length).toBeGreaterThan(0);
    expect(ru[SECTION][key]?.length).toBeGreaterThan(0);
  });

  it("en and ru carry EXACTLY the same key set — no drift", () => {
    expect(Object.keys(ru[SECTION]).sort()).toEqual(
      Object.keys(en[SECTION]).sort(),
    );
  });

  it("ru is actually translated, not copied from en", () => {
    expect(ru[SECTION].cta).not.toBe(en[SECTION].cta);
  });

  // The two hint strings substitute the requested name; a missing placeholder
  // in one language would render the raw ICU source to that player.
  it.each(["pending_hint", "rejected_hint"])(
    "%s substitutes {name} in both languages",
    (key) => {
      expect(en[SECTION][key]).toContain("{name}");
      expect(ru[SECTION][key]).toContain("{name}");
    },
  );

  // The card reuses these for a server-reported rule violation, so the shared
  // username section must still carry them in both languages.
  it.each(["not_string", "too_short", "too_long", "invalid_chars"])(
    "username.%s is available in both languages for the name-change error line",
    (key) => {
      expect(en.username[key]?.length).toBeGreaterThan(0);
      expect(ru.username[key]?.length).toBeGreaterThan(0);
    },
  );

  // The moderation verdicts ride 0012's inbox templates.
  it.each([
    "name_change_approved",
    "name_change_rejected",
    "name_change_cleared", // task 0314
  ])("inbox template %s exists in both languages", (key) => {
    for (const lang of [en, ru]) {
      const templates = (
        lang.inbox as unknown as Record<
          string,
          Record<string, { title: string; body: string }>
        >
      ).templates;
      expect(templates[key].title.length).toBeGreaterThan(0);
      expect(templates[key].body.length).toBeGreaterThan(0);
    }
  });

  // Task 0314: the clear note must substitute BOTH params the server sends, or
  // the player sees the raw ICU source; and it must not name the game (0311).
  it("name_change_cleared substitutes {name} and {reason} in both languages", () => {
    for (const lang of [en, ru]) {
      const body = (
        lang.inbox as unknown as Record<
          string,
          Record<string, { title: string; body: string }>
        >
      ).templates.name_change_cleared.body;
      expect(body).toContain("{name}");
      expect(body).toContain("{reason}");
    }
  });

  it("the task 0314 texts do not name the game (task 0311)", () => {
    for (const lang of [en, ru]) {
      const cleared = (
        lang.inbox as unknown as Record<
          string,
          Record<string, { title: string; body: string }>
        >
      ).templates.name_change_cleared;
      for (const text of [lang[SECTION].dismiss, cleared.title, cleared.body]) {
        expect(text.toLowerCase()).not.toContain("geoconflict");
        expect(text.toLowerCase()).not.toContain("геоконфликт");
      }
    }
  });

  it("ru's Hide is translated, not copied from en", () => {
    expect(ru[SECTION].dismiss).not.toBe(en[SECTION].dismiss);
  });

  // Task 0316: the approved note must not promise the name is active
  // everywhere — the approved name shows only on the card (0067 ruling (b)).
  // The inbox renders this at view time, so the change is retroactive.
  describe("the name_change_approved note (task 0316)", () => {
    const approved = (lang: Record<string, Record<string, string>>) =>
      (
        lang.inbox as unknown as Record<
          string,
          Record<string, { title: string; body: string }>
        >
      ).templates.name_change_approved;

    it("the owner-approved copy, verbatim (Q1: option C, title unchanged)", () => {
      expect(approved(en)).toEqual({
        title: "Your name change was approved",
        body: "Your new display name ''{name}'' has been approved.",
      });
      expect(approved(ru)).toEqual({
        title: "Смена имени одобрена",
        body: "Ваше новое имя «{name}» одобрено.",
      });
    });

    it("no longer says the name is active", () => {
      expect(approved(en).body).not.toContain("is now active");
      expect(approved(ru).body).not.toContain("теперь активно");
    });

    // en's `''` is ICU escaping for one `'`; a single `'` would quote out
    // `{name}` and the player would see the raw placeholder.
    it.each([
      ["en", en, "Your new display name 'Test' has been approved."],
      ["ru", ru, "Ваше новое имя «Test» одобрено."],
    ] as const)("%s renders the exact sentence", (locale, lang, expected) => {
      expect(
        new IntlMessageFormat(approved(lang).body, locale).format({
          name: "Test",
        }),
      ).toBe(expected);
    });
  });
});
