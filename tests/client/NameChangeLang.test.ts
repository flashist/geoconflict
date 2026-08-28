// Brief step 8: the name-change strings must exist in BOTH en.json and ru.json.
// The project rule is that any localization change is applied to both files in
// step; this asserts it for this task's section rather than trusting review.

import fs from "fs";
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
  it.each(["name_change_approved", "name_change_rejected"])(
    "inbox template %s exists in both languages",
    (key) => {
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
    },
  );
});
