// Task 0302: every new string must exist, non-empty, in BOTH en.json and
// ru.json (project rule: the two files stay in sync).

import fs from "fs";
import path from "path";

const LANG_DIR = path.join(__dirname, "../../resources/lang");

function load(file: string): Record<string, Record<string, string>> {
  return JSON.parse(fs.readFileSync(path.join(LANG_DIR, file), "utf-8"));
}

// Kept explicit (not derived from en.json) so deleting a key from BOTH files
// still fails.
const REQUIRED_KEYS: Array<[string, string]> = [
  ["locked_feature", "citizens_only"],
  ["citizens_only_modal", "title"],
  ["citizens_only_modal", "body"],
  ["citizens_only_modal", "close"],
  ["host_modal", "start_failed"],
];

describe("private-lobby perk localization (task 0302)", () => {
  const en = load("en.json");
  const ru = load("ru.json");

  it.each(REQUIRED_KEYS)(
    "both files define %s.%s, non-empty",
    (section, key) => {
      expect(en[section]?.[key]?.length).toBeGreaterThan(0);
      expect(ru[section]?.[key]?.length).toBeGreaterThan(0);
    },
  );

  it.each(["locked_feature", "citizens_only_modal"])(
    "en and ru carry EXACTLY the same %s key set",
    (section) => {
      expect(Object.keys(ru[section]).sort()).toEqual(
        Object.keys(en[section]).sort(),
      );
    },
  );

  // Review R1 (owner ruling 2026-09-27, "Drop the name"): player texts do not
  // name the game.
  it.each(REQUIRED_KEYS)("%s.%s does not name the game", (section, key) => {
    expect(en[section][key].toLowerCase()).not.toContain("geoconflict");
    expect(ru[section][key].toLowerCase()).not.toContain("geoconflict");
  });

  it.each(REQUIRED_KEYS)(
    "ru %s.%s is translated, not copied from en",
    (section, key) => {
      expect(ru[section][key]).not.toBe(en[section][key]);
    },
  );
});
