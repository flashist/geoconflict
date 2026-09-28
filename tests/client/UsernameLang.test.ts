// Task 0307: the name-rule texts, in BOTH en.json and ru.json (the project rule).
// `username.rules_hint` is new; the Russian `username.invalid_chars` used to say
// "Latin letters only", which was wrong — the rule allows letters of any alphabet.
// Task 0308 owns the character set and will re-edit these two keys if it changes.

import fs from "fs";
import path from "path";

const LANG_DIR = path.join(__dirname, "../../resources/lang");

function usernameSection(file: string): Record<string, string> {
  return JSON.parse(fs.readFileSync(path.join(LANG_DIR, file), "utf-8"))
    .username;
}

describe("username localization (task 0307)", () => {
  const en = usernameSection("en.json");
  const ru = usernameSection("ru.json");

  it.each([
    ["en.json", en],
    ["ru.json", ru],
  ])("%s has rules_hint carrying both {min} and {max}", (_file, section) => {
    expect(section.rules_hint).toContain("{min}");
    expect(section.rules_hint).toContain("{max}");
  });

  it("en and ru carry exactly the same username keys", () => {
    expect(Object.keys(ru).sort()).toEqual(Object.keys(en).sort());
  });

  // Task 0321: the locked name box's hint (owner ruling Q4, 2026-09-28),
  // pointing at the card by its own title and carrying no game name (0311).
  it.each([
    [
      "en.json",
      en,
      "This is your approved name. You can change it on the Citizenship card.",
    ],
    [
      "ru.json",
      ru,
      "Это ваше одобренное имя. Сменить его можно в карточке «Гражданство».",
    ],
  ])("%s has the owner-ruled locked_hint", (_file, section, text) => {
    expect(section.locked_hint).toBe(text);
    expect(section.locked_hint).not.toMatch(/geoconflict|геоконфликт/i);
  });

  it("the Russian invalid_chars no longer says Latin letters only", () => {
    expect(ru.invalid_chars).not.toMatch(/латинск/i);
    expect(ru.invalid_chars).toContain("буквы");
  });
});
