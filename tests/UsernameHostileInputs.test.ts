// Task 0307 — the shared name rule and the name cleaner, driven with the brief's
// full hostile-input list. `checkUsernameRules` is what the profile server runs on
// a requested citizen name AND (since 0307) what the game server runs on a join
// name; `sanitizeUsername` is what cleans a stored/Yandex name on load and every
// in-game name in PlayerImpl. Each case asserts the OUTCOME — refused with which
// rule, or accepted — not just "no crash".
//
// ⚠️ CHARACTERIZATION, flips on purpose in task 0308. The cases marked
// "accepted today" pin characters the rule lets through because of its `\s`
// (newline, tab, no-break space, U+FEFF, …) and because it does no look-alike
// check. Task 0308 owns which characters a name may contain; when it narrows the
// rule these expectations are MEANT to change. Look-alike letters are an
// owner-accepted residual (2026-09-26, "Accept for now") — see the 0307 report.

import {
  MAX_USERNAME_LENGTH,
  MIN_USERNAME_LENGTH,
  checkUsernameRules,
  sanitizeUsername,
  sanitizeUsernameForJoin,
} from "../src/core/validations/usernameRules";
import { JoinUsernameSchema } from "../src/core/Schemas";

// A mathematical bold "A" — one letter, stored as TWO UTF-16 units.
const ASTRAL_LETTER = "\u{1D400}";

describe("checkUsernameRules — hostile inputs (task 0307)", () => {
  describe("refused as invalid_chars", () => {
    it.each([
      // SQL metacharacters
      ["single quote", "a'bc"],
      ["double quote", 'a"bc'],
      ["semicolon", "ab;c"],
      ["SQL comment", "ab--c"],
      ["classic injection", "' OR 1=1 --"],
      ["backslash", "ab\\c"],
      // HTML / Telegram HTML
      ["<script>", "<script>"],
      ["<img onerror>", "<img onerror=x>"],
      ["HTML entity", "&lt;abc"],
      ["<b> tag", "<b>abc</b>"],
      ["<a href>", "<a href=x>"],
      // Shell
      ["command substitution", "$(rm)"],
      ["backticks", "`id`"],
      // Invisible and direction characters
      ["zero-width space U+200B", "ab\u200Bc"],
      ["zero-width joiner U+200D", "ab\u200Dc"],
      ["right-to-left override U+202E", "ab\u202Ec"],
      ["left-to-right isolate U+2066", "ab\u2066c"],
      ["pop directional isolate U+2069", "ab\u2069c"],
      // Other
      ["emoji", "ab\u{1F408}c"],
      ["combining mark", "abe\u0301"],
    ])("%s", (_label, name) => {
      expect(checkUsernameRules(name)).toBe("invalid_chars");
    });
  });

  describe("length", () => {
    it("accepts exactly 27 characters and refuses 28", () => {
      expect(checkUsernameRules("a".repeat(27))).toBeNull();
      expect(checkUsernameRules("a".repeat(28))).toBe("too_long");
    });

    it("counts in UTF-16 units: 27 astral letters are 54 units → too_long", () => {
      expect(checkUsernameRules(ASTRAL_LETTER.repeat(27))).toBe("too_long");
      // 13 astral letters = 26 units fits; 14 = 28 units does not.
      expect(checkUsernameRules(ASTRAL_LETTER.repeat(13))).toBeNull();
      expect(checkUsernameRules(ASTRAL_LETTER.repeat(14))).toBe("too_long");
    });

    it("refuses the empty name as too_short", () => {
      expect(checkUsernameRules("")).toBe("too_short");
    });

    it("keeps the owner-ruled limits: 3 to 27 (0307 Q-A)", () => {
      expect(MIN_USERNAME_LENGTH).toBe(3);
      expect(MAX_USERNAME_LENGTH).toBe(27);
    });
  });

  // ⚠️ Characterization — see the header. Task 0308 decides these.
  describe("accepted today (characterization → task 0308)", () => {
    it.each([
      ["newline", "ab\nc"],
      ["tab", "ab\tc"],
      ["carriage return", "ab\rc"],
      ["line separator U+2028", "ab\u2028c"],
      ["paragraph separator U+2029", "ab\u2029c"],
      ["no-break space U+00A0", "ab\u00A0c"],
      ["ideographic space U+3000", "ab\u3000c"],
      ["invisible U+FEFF", "ab\uFEFFc"],
      // The raw rule does not trim — every caller trims first (the name-change
      // server, both name inputs), which is what turns this into too_short.
      ["all spaces (untrimmed)", "   "],
    ])("%s", (_label, name) => {
      expect(checkUsernameRules(name)).toBeNull();
    });

    // Owner-accepted residual (Q2): look-alikes pass, since no other player sees
    // an approved name today.
    it.each([
      ["Cyrillic а inside a Latin name", "Iv\u0430n"],
      ["full-width I", "\uFF29van"],
    ])("look-alike: %s", (_label, name) => {
      expect(checkUsernameRules(name)).toBeNull();
    });
  });
});

describe("sanitizeUsername — hostile inputs (task 0307)", () => {
  it.each([
    ["<script>alert(1)</script>", "scriptalert1script"],
    ["' OR 1=1 --", " OR 11 "],
    ["$(rm -rf)", "rm rf"],
    ["ab\u202Ecd", "abcd"],
    ["ab\u200Bcd", "abcd"],
    ["Cat\u{1F408}User", "CatUser"],
    ["", "xxx"],
    ["a", "axx"],
  ])("cleans %j to %j", (input, expected) => {
    expect(sanitizeUsername(input)).toBe(expected);
  });

  it("caps at 27 units", () => {
    expect(sanitizeUsername("a".repeat(40))).toBe("a".repeat(27));
  });

  it("cuts at a WHOLE astral letter, never between its two halves", () => {
    // 14 astral letters = 28 units. The old `.slice(0, 27)` kept 13½ letters —
    // ending in a lone high surrogate, which the rule then refused.
    const cleaned = sanitizeUsername(ASTRAL_LETTER.repeat(14));
    expect(cleaned).toBe(ASTRAL_LETTER.repeat(13));
    expect(cleaned.length).toBe(26);
  });

  it("keeps a BMP-only name exactly as the old slice did", () => {
    const name = "Привет_[Clan] Name 12345678901";
    expect(sanitizeUsername(name)).toBe(name.slice(0, 27));
  });

  // The property F4 relies on: a stored or Yandex-supplied name is CLEANED, never
  // refused, so the cleaned name must always pass the rule the server enforces.
  describe("its output ALWAYS passes checkUsernameRules", () => {
    const hostile = [
      "",
      " ",
      "   ",
      "a",
      "' OR 1=1 --",
      "<img onerror=x>",
      "$(rm)`id`",
      "\u202E\u2066\u2069\u200B\u200D",
      "\uFEFF\u00A0\n\t\r\u2028",
      "\u{1F408}\u{1F408}\u{1F408}",
      "e\u0301e\u0301",
      "a".repeat(28),
      "a".repeat(1000),
      ASTRAL_LETTER.repeat(14),
      ASTRAL_LETTER.repeat(27),
      "a" + ASTRAL_LETTER.repeat(14),
      "ab" + ASTRAL_LETTER.repeat(20),
      "\uD835", // a lone high surrogate
      "abc\uDC00def", // a lone low surrogate
    ];
    it.each(hostile.map((name) => [JSON.stringify(name), name]))(
      "%s",
      (_label, name) => {
        expect(checkUsernameRules(sanitizeUsername(name))).toBeNull();
      },
    );

    it("for every astral-letter count from 0 to 30, with any BMP prefix up to 3", () => {
      for (let prefix = 0; prefix <= 3; prefix++) {
        for (let count = 0; count <= 30; count++) {
          const name = "a".repeat(prefix) + ASTRAL_LETTER.repeat(count);
          expect(checkUsernameRules(sanitizeUsername(name))).toBeNull();
        }
      }
    });
  });
});

// 0307 review R2: the server's join check TRIMS, then applies the rule. A client
// joins with `sanitizeUsernameForJoin`'s output (stored/Yandex names), so that
// output must pass the trimmed check — and be what the server keeps unchanged.
describe("sanitizeUsernameForJoin — the name a client joins with (review R2)", () => {
  it.each([
    ["\u2605 A \u2605", "Axx"], // sanitizeUsername alone gives " A " → trims to "A"
    ["   ", "xxx"], // sanitizeUsername alone keeps a blank name
    ["\u{1F600} \u{1F600} \u{1F600}", "xxx"], // sanitizeUsername alone gives "  x"
    [" Bob ", "Bob"],
    ["Name_1 [TAG]", "Name_1 [TAG]"],
    ["<b>Bob</b>", "bBobb"],
    ["", "xxx"],
  ])("cleans %j to %j", (input, expected) => {
    expect(sanitizeUsernameForJoin(input)).toBe(expected);
  });

  const hostile = [
    "",
    " ",
    "   ",
    " a ",
    "\u2605 A \u2605",
    "\u{1F600} \u{1F600} \u{1F600}",
    "\t\n Bob \u00A0",
    "' OR 1=1 --",
    "<img onerror=x>",
    "$(rm)`id`",
    "\u202E\u2066\u2069\u200B\u200D",
    "\uFEFF\u00A0\n\t\r\u2028",
    "a".repeat(1000),
    " " + "a".repeat(30),
    ASTRAL_LETTER.repeat(14),
    " " + ASTRAL_LETTER.repeat(14),
    "\uD835",
  ];
  it.each(hostile.map((name) => [JSON.stringify(name), name]))(
    "%s passes the server's join check, unchanged",
    (_label, name) => {
      const cleaned = sanitizeUsernameForJoin(name);
      const result = JoinUsernameSchema.safeParse(cleaned);
      expect(result.success).toBe(true);
      expect(result.data).toBe(cleaned);
    },
  );
});
