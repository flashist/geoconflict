// Task 0253, verification 11: the tenure-grant modal strings exist in BOTH
// en.json and ru.json, with the same placeholders ({xp}/{total}/{threshold} —
// the redesign dropped {days}), and format cleanly as ICU.

import fs from "fs";
import IntlMessageFormat from "intl-messageformat";
import path from "path";

const LANG_DIR = path.join(__dirname, "../../resources/lang");

function load(file: string): Record<string, Record<string, string>> {
  return JSON.parse(fs.readFileSync(path.join(LANG_DIR, file), "utf-8"));
}

const SECTION = "citizenship_tenure_grant";

// Kept explicit (not derived from en.json) so deleting a key from BOTH files
// still fails.
const REQUIRED_KEYS = ["title", "body", "cta"];

function placeholders(message: string): string[] {
  return [...message.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
}

describe("citizenship_tenure_grant localization (task 0253)", () => {
  const en = load("en.json");
  const ru = load("ru.json");

  it.each(REQUIRED_KEYS)("both files define %s, non-empty", (key) => {
    expect(en[SECTION][key]?.length).toBeGreaterThan(0);
    expect(ru[SECTION][key]?.length).toBeGreaterThan(0);
  });

  it("en and ru carry exactly the same key set", () => {
    expect(Object.keys(ru[SECTION]).sort()).toEqual(
      Object.keys(en[SECTION]).sort(),
    );
  });

  it.each(REQUIRED_KEYS)(
    "%s has the same placeholders in both languages",
    (key) => {
      expect(placeholders(ru[SECTION][key])).toEqual(
        placeholders(en[SECTION][key]),
      );
    },
  );

  it("body substitutes exactly xp, total and threshold — no days", () => {
    expect(placeholders(en[SECTION].body)).toEqual([
      "threshold",
      "total",
      "xp",
    ]);
  });

  it("the owner-approved copy, verbatim", () => {
    expect(en[SECTION]).toEqual({
      title: "Thanks for being with us!",
      body: "Thank you for playing Geoconflict! As a thank-you for being with us for so long, we're giving you {xp} free XP. You now have {total} / {threshold} XP.",
      cta: "Great!",
    });
    expect(ru[SECTION]).toEqual({
      title: "Спасибо, что вы с нами!",
      body: "Спасибо, что играете в Geoconflict! В благодарность за то, что вы с нами так давно, мы дарим вам {xp} XP. Теперь у вас {total} / {threshold} XP.",
      cta: "Отлично!",
    });
  });

  it("the threshold is a placeholder, never a literal figure", () => {
    for (const lang of [en, ru]) {
      expect(lang[SECTION].body).not.toMatch(/\b100\b/);
    }
  });

  it.each([
    ["en", "en.json"],
    ["ru", "ru.json"],
  ])("%s body formats as ICU with every value substituted", (locale, file) => {
    const body = load(file)[SECTION].body;
    const formatted = new IntlMessageFormat(body, locale).format({
      xp: 37,
      total: 45,
      threshold: 100,
    }) as string;
    expect(formatted).not.toMatch(/[{}]/);
    expect(formatted).toContain("37");
    expect(formatted).toContain("45 / 100");
  });

  it("the ICU apostrophe rule leaves the English contraction intact", () => {
    const formatted = new IntlMessageFormat(en[SECTION].body, "en").format({
      xp: 5,
      total: 5,
      threshold: 100,
    }) as string;
    expect(formatted).toContain("we're giving you 5 free XP");
  });
});
