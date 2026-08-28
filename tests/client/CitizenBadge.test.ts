/**
 * @jest-environment jsdom
 */
// Brief step 5: en/ru keys present in both files. Plus the two constraints on the
// badge itself that must survive the follow-up icon-design task — it renders no
// country/flag imagery, and every visible string goes through translateText.

jest.mock("../../src/client/Utils", () => ({
  translateText: jest.fn((key: string) => `t:${key}`),
}));

import fs from "fs";
import path from "path";
import { render } from "lit";
import { renderCitizenBadge } from "../../src/client/CitizenBadge";

const LANG_DIR = path.join(__dirname, "../../resources/lang");

function load(file: string): Record<string, Record<string, string>> {
  return JSON.parse(fs.readFileSync(path.join(LANG_DIR, file), "utf-8"));
}

const SECTION = "citizen_badge";

// Kept explicit (not derived from en.json) so deleting a key from BOTH files still
// fails this test rather than silently agreeing with itself.
const REQUIRED_KEYS = ["tooltip", "aria_label"];

describe("citizen_badge localization (task 0068)", () => {
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
    expect(ru[SECTION].tooltip).not.toBe(en[SECTION].tooltip);
  });
});

describe("renderCitizenBadge (task 0068)", () => {
  function renderToHtml(): string {
    const host = document.createElement("div");
    render(renderCitizenBadge(), host);
    return host.innerHTML;
  }

  it("routes both visible strings through translateText", () => {
    const html = renderToHtml();
    expect(html).toContain(`t:${SECTION}.tooltip`);
    expect(html).toContain(`t:${SECTION}.aria_label`);
  });

  it("is announced to screen readers", () => {
    const host = document.createElement("div");
    render(renderCitizenBadge(), host);
    const badge = host.querySelector(".citizen-badge");
    expect(badge?.getAttribute("role")).toBe("img");
    expect(badge?.getAttribute("aria-label")).toBe(`t:${SECTION}.aria_label`);
  });

  it("uses no country or flag imagery (Yandex constraint)", () => {
    const html = renderToHtml();
    // No image/SVG asset at all, and specifically nothing from the deliberately
    // suppressed /flags directory, nor a flag-adjacent emoji.
    expect(html).not.toMatch(/<img|<svg|\/flags\//);
    expect(html).not.toMatch(/[\u{1F1E6}-\u{1F1FF}]/u); // regional-indicator flags
    expect(html).not.toContain("\u{1F3F3}"); // 🏳
    expect(html).not.toContain("\u{1F3F4}"); // 🏴
  });
});
