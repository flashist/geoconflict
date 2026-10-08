// Task 0397: the citizenship card's session status strings must exist,
// non-empty, in BOTH en.json and ru.json (project rule: the two files stay in
// sync), and must equal the owner-approved wording exactly (2026-10-06,
// brief verification step 8) — an edit to either file is an owner decision.
// Task 0407: `verified_paid` is now the paid-citizen thank-you line; its text
// below is the owner's 0407 ruling (2026-10-08), which replaced the 0397
// wording ("✓ Verified — …") and dropped the ✓.

import fs from "fs";
import path from "path";

const LANG_DIR = path.join(__dirname, "../../resources/lang");
const SECTION = "citizenship_status";

function load(file: string): Record<string, Record<string, string>> {
  return JSON.parse(fs.readFileSync(path.join(LANG_DIR, file), "utf-8"));
}

// Kept explicit (not derived from en.json) so deleting a key from BOTH files
// still fails. Owner-approved text, verbatim (0397 brief, "Approved wording";
// `verified_paid` from the 0407 brief, "Design approval (Step 1 gate)").
const APPROVED: Record<string, { en: string; ru: string }> = {
  checking: {
    en: "Checking your account…",
    ru: "Проверяем ваш аккаунт…",
  },
  verified_paid: {
    en: "Thank you for supporting the game! Your paid citizenship benefits are on.",
    ru: "Спасибо, что поддерживаете игру! Преимущества платного гражданства включены.",
  },
  unverified: {
    en: "We couldn't confirm your account this time. If you bought citizenship, it's safe — you may just see ads until it's confirmed. Closing and reopening the game usually helps.",
    ru: "Не удалось подтвердить ваш аккаунт в этот раз. Если вы купили гражданство, оно сохранено — просто до подтверждения может показываться реклама. Обычно помогает закрыть игру и открыть её снова.",
  },
  read_failed: {
    en: "We couldn't load your profile right now. Nothing is lost — a restart usually helps.",
    ru: "Сейчас не удалось загрузить ваш профиль. Ничего не потеряно — обычно помогает перезапуск.",
  },
  restart: {
    en: "Restart game",
    ru: "Перезапустить",
  },
  still_failing: {
    en: "Still not working. Please try again a bit later — nothing is lost.",
    ru: "Всё ещё не получается. Попробуйте чуть позже — ничего не потеряно.",
  },
};
const REQUIRED_KEYS = Object.keys(APPROVED);

describe("citizenship status localization (task 0397)", () => {
  const en = load("en.json");
  const ru = load("ru.json");

  it.each(REQUIRED_KEYS)("both files define %s, non-empty", (key) => {
    expect(en[SECTION]?.[key]?.length).toBeGreaterThan(0);
    expect(ru[SECTION]?.[key]?.length).toBeGreaterThan(0);
  });

  it("en and ru carry EXACTLY the same key set, and only the approved keys", () => {
    expect(Object.keys(ru[SECTION]).sort()).toEqual(
      Object.keys(en[SECTION]).sort(),
    );
    expect(Object.keys(en[SECTION]).sort()).toEqual([...REQUIRED_KEYS].sort());
  });

  it.each(REQUIRED_KEYS)("ru %s is translated, not copied from en", (key) => {
    expect(ru[SECTION][key]).not.toBe(en[SECTION][key]);
  });

  it.each(REQUIRED_KEYS)("%s equals the owner-approved text exactly", (key) => {
    expect(en[SECTION][key]).toBe(APPROVED[key].en);
    expect(ru[SECTION][key]).toBe(APPROVED[key].ru);
  });
});
