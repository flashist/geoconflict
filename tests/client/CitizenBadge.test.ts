/**
 * @jest-environment jsdom
 */
// Brief step 5: en/ru keys present in both files. Plus the two constraints on the
// badge itself that must survive the follow-up icon-design task — it renders no
// country/flag imagery, and every visible string goes through translateText.

jest.mock("../../src/client/Utils", () => ({
  translateText: jest.fn((key: string) => `t:${key}`),
}));

// Task 0236: the badge now reads the kill switch's SYNC snapshot. Mocked to the
// sync getter alone so this suite keeps testing the badge, not platform init.
jest.mock("../../src/client/flashist/FlashistFacade", () => ({
  FlashistFacade: {
    instance: {
      isCitizenshipSurfacesEnabledSync: jest.fn(),
    },
  },
}));

import fs from "fs";
import path from "path";
import { render } from "lit";
import { renderCitizenBadge } from "../../src/client/CitizenBadge";
import { FlashistFacade } from "../../src/client/flashist/FlashistFacade";

const isCitizenshipSurfacesEnabledSync = FlashistFacade.instance
  .isCitizenshipSurfacesEnabledSync as jest.Mock;

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
  // The kill switch is ON for the original cases below — they assert what the
  // badge renders, which is only meaningful when it renders at all (task 0236).
  beforeEach(() => {
    isCitizenshipSurfacesEnabledSync.mockReturnValue(true);
  });

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

describe("renderCitizenBadge kill switch (task 0236)", () => {
  function renderToHost(): HTMLElement {
    const host = document.createElement("div");
    render(renderCitizenBadge(), host);
    return host;
  }

  it("renders no badge when the switch is off", () => {
    isCitizenshipSurfacesEnabledSync.mockReturnValue(false);
    // Asserted on the element, NOT on innerHTML === "": lit leaves comment
    // markers behind, so an empty-string assertion would be wrong.
    expect(renderToHost().querySelector(".citizen-badge")).toBeNull();
  });

  // The pre-resolution / fail-closed default is NOT tested here: this suite
  // mocks the facade module wholesale, so it can only observe what the mock was
  // told to return — it can never see the real `citizenshipSurfacesSnapshot`
  // field default or run the prime. That coverage lives in
  // FlashistFacade.test.ts, against a real (bare-prototype) facade.
  it("renders the badge when the switch is on", () => {
    isCitizenshipSurfacesEnabledSync.mockReturnValue(true);
    expect(renderToHost().querySelector(".citizen-badge")).not.toBeNull();
  });
});
