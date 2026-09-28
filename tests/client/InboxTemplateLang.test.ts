// Task 0250 S1: every inbox template key the client can render has a title and
// a body in BOTH en.json and ru.json, with the placeholders its contract
// requires — and the neutral `citizenship_granted` note (served to unverified
// callers in place of citizenship_paid / citizenship_earned) says nothing that
// tells a paid citizen from an earned one.

import fs from "fs";
import IntlMessageFormat from "intl-messageformat";
import path from "path";
import {
  INBOX_TEMPLATE_KEYS,
  INBOX_TEMPLATE_REQUIRED_PARAMS,
} from "../../src/core/profile/InboxContract";

const LANG_DIR = path.join(__dirname, "../../resources/lang");

type Templates = Record<string, { title?: string; body?: string }>;

function templates(file: string): Templates {
  const lang = JSON.parse(
    fs.readFileSync(path.join(LANG_DIR, file), "utf-8"),
  ) as { inbox: { templates: Templates } };
  return lang.inbox.templates;
}

function placeholders(message: string): string[] {
  return [...message.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
}

describe("inbox template localization (task 0250 S1)", () => {
  const files = { en: templates("en.json"), ru: templates("ru.json") };

  describe.each(Object.entries(files))("%s.json", (_lang, lang) => {
    it.each([...INBOX_TEMPLATE_KEYS])(
      "%s has a non-empty title and body that format as ICU",
      (key) => {
        const { title, body } = lang[key] ?? {};
        expect(title?.length).toBeGreaterThan(0);
        expect(body?.length).toBeGreaterThan(0);
        const params = Object.fromEntries(
          INBOX_TEMPLATE_REQUIRED_PARAMS[key].map((name) => [name, "x"]),
        );
        expect(() =>
          new IntlMessageFormat(body!, "en").format(params),
        ).not.toThrow();
      },
    );

    it.each([...INBOX_TEMPLATE_KEYS])(
      "%s body substitutes exactly its required params",
      (key) => {
        expect(placeholders(lang[key]!.body!)).toEqual(
          [...INBOX_TEMPLATE_REQUIRED_PARAMS[key]].sort(),
        );
      },
    );
  });

  describe("the neutral citizenship_granted note", () => {
    it("the owner-approved copy, verbatim (Q4: no game name)", () => {
      expect(files.en.citizenship_granted).toEqual({
        title: "Welcome, Citizen!",
        body: "You are now a citizen. Citizen benefits are now available to you.",
      });
      expect(files.ru.citizenship_granted).toEqual({
        title: "Добро пожаловать, Гражданин!",
        body: "Теперь вы гражданин. Вам доступны привилегии граждан.",
      });
    });

    it.each(Object.entries(files))(
      "%s: says nothing about a purchase or the XP threshold",
      (_lang, lang) => {
        const text =
          `${lang.citizenship_granted.title} ${lang.citizenship_granted.body}`.toLowerCase();
        expect(text).not.toContain("100");
        expect(text).not.toContain("xp");
        for (const word of [
          "purchase",
          "bought",
          "paid",
          "buy",
          "покупк",
          "купил",
          "оплат",
        ]) {
          expect(text).not.toContain(word);
        }
      },
    );
  });
});
