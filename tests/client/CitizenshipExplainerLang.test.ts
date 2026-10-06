// Task 0301: the citizenship explainer copy (owner-approved 2026-10-06, Q1).
// Every key in BOTH en.json and ru.json (project rule), the same {placeholders}
// in both, 0302's interim notice gone, and nothing promised that is not built.

import fs from "fs";
import path from "path";

const LANG_DIR = path.join(__dirname, "../../resources/lang");

function load(file: string): Record<string, Record<string, unknown>> {
  return JSON.parse(fs.readFileSync(path.join(LANG_DIR, file), "utf-8"));
}

// Kept explicit (not derived from en.json) so deleting a key from BOTH files
// still fails.
const REQUIRED_KEYS: Array<[string, string]> = [
  ["citizenship_explainer", "link"],
  ["citizenship_explainer", "title"],
  ["citizenship_explainer", "intro"],
  ["citizenship_explainer", "benefits_title"],
  ["citizenship_explainer", "benefit_badge"],
  ["citizenship_explainer", "benefit_name_change"],
  ["citizenship_explainer", "benefit_private_lobby"],
  ["citizenship_explainer", "benefit_no_ads"],
  ["citizenship_explainer", "free_title"],
  ["citizenship_explainer", "free_body"],
  ["citizenship_explainer", "your_xp"],
  ["citizenship_explainer", "buy_title"],
  ["citizenship_explainer", "login_hint"],
  ["citizenship_explainer", "already_citizen"],
  ["citizenship_explainer", "close"],
  ["help_modal", "citizenship_title"],
  ["help_modal", "citizenship_desc"],
  // Reused unchanged by the popup.
  ["citizenship_paid", "buy_cta"],
  ["citizenship_paid", "purchase_error"],
  ["citizenship_card", "login_cta"],
  ["citizenship_status", "checking"],
  ["citizenship_status", "read_failed"],
];

const placeholders = (text: string): string[] =>
  (text.match(/\{\w+\}/g) ?? []).sort();

describe("citizenship explainer localization (task 0301)", () => {
  const en = load("en.json");
  const ru = load("ru.json");
  const value = (
    lang: Record<string, Record<string, unknown>>,
    section: string,
    key: string,
  ) => lang[section]?.[key] as string | undefined;

  it.each(REQUIRED_KEYS)(
    "both files define %s.%s, non-empty",
    (section, key) => {
      expect(value(en, section, key)?.length).toBeGreaterThan(0);
      expect(value(ru, section, key)?.length).toBeGreaterThan(0);
    },
  );

  it.each(REQUIRED_KEYS)(
    "%s.%s carries the same {placeholders} in en and ru",
    (section, key) => {
      expect(placeholders(value(ru, section, key)!)).toEqual(
        placeholders(value(en, section, key)!),
      );
    },
  );

  it.each(REQUIRED_KEYS)(
    "ru %s.%s is translated, not copied from en",
    (section, key) => {
      expect(value(ru, section, key)).not.toBe(value(en, section, key));
    },
  );

  it("en and ru carry EXACTLY the same citizenship_explainer key set", () => {
    expect(Object.keys(ru.citizenship_explainer).sort()).toEqual(
      Object.keys(en.citizenship_explainer).sort(),
    );
  });

  it("the free route and the progress line are parameterized, never hard-coded", () => {
    expect(
      placeholders(value(en, "citizenship_explainer", "free_body")!),
    ).toEqual(["{threshold}", "{xpPerMatch}"]);
    expect(
      placeholders(value(en, "citizenship_explainer", "your_xp")!),
    ).toEqual(["{threshold}", "{xp}"]);
  });

  it("0302's interim citizens_only_modal section is gone from both files", () => {
    expect(en.citizens_only_modal).toBeUndefined();
    expect(ru.citizens_only_modal).toBeUndefined();
  });

  it("keeps 0302's locked look", () => {
    expect(value(en, "locked_feature", "citizens_only")).toBeTruthy();
    expect(value(ru, "locked_feature", "citizens_only")).toBeTruthy();
  });

  // Brief verification 9 / owner ruling Q4: built perks only — no emoji set,
  // archive, replays, map voting, custom flags, inbox, or "coming soon".
  it.each(["en", "ru"])(
    "the %s copy promises nothing that is not built",
    (lang) => {
      const file = lang === "en" ? en : ru;
      const texts = [
        ...Object.values(file.citizenship_explainer as Record<string, string>),
        value(file, "help_modal", "citizenship_title")!,
        value(file, "help_modal", "citizenship_desc")!,
      ].join("\n");
      expect(texts).not.toMatch(
        /emoji|archive|replay|vote|voting|flag|inbox|coming soon|soon|эмодзи|архив|повтор|голосова|флаг|почт|скоро/i,
      );
    },
  );
});
