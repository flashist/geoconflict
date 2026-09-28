// Task 0303: the "restart to apply" popup's strings must exist, non-empty, in
// BOTH en.json and ru.json (project rule: the two files stay in sync), and
// must not name the game (0311).

import fs from "fs";
import path from "path";

const LANG_DIR = path.join(__dirname, "../../resources/lang");
const SECTION = "citizenship_restart_modal";

function load(file: string): Record<string, Record<string, string>> {
  return JSON.parse(fs.readFileSync(path.join(LANG_DIR, file), "utf-8"));
}

// Kept explicit (not derived from en.json) so deleting a key from BOTH files
// still fails.
const REQUIRED_KEYS = ["title", "body", "restart", "later"];

describe("citizenship restart popup localization (task 0303)", () => {
  const en = load("en.json");
  const ru = load("ru.json");

  it.each(REQUIRED_KEYS)("both files define %s, non-empty", (key) => {
    expect(en[SECTION]?.[key]?.length).toBeGreaterThan(0);
    expect(ru[SECTION]?.[key]?.length).toBeGreaterThan(0);
  });

  it("en and ru carry EXACTLY the same key set", () => {
    expect(Object.keys(ru[SECTION]).sort()).toEqual(
      Object.keys(en[SECTION]).sort(),
    );
  });

  it.each(REQUIRED_KEYS)("%s does not name the game", (key) => {
    for (const text of [en[SECTION][key], ru[SECTION][key]]) {
      expect(text.toLowerCase()).not.toContain("geoconflict");
      expect(text.toLowerCase()).not.toContain("геоконфликт");
    }
  });

  it.each(REQUIRED_KEYS)("ru %s is translated, not copied from en", (key) => {
    expect(ru[SECTION][key]).not.toBe(en[SECTION][key]);
  });
});
