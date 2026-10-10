/**
 * @jest-environment jsdom
 */
// Task 0423: every game window that scrolls shows the game's dark thin
// scrollbar. The page's copy is in src/client/styles.css, but page styles do not
// reach inside a shadow root, so shadow components use the shared copy in
// DarkScrollbarStyles.ts. jsdom paints no scrollbars, so these tests check the
// styles themselves; the look is checked in a real browser (task worklog).
jest.mock("../../../src/client/Utils", () => ({
  translateText: jest.fn((key: string) => key),
}));
jest.mock("../../../src/client/flashist/FlashistFacade", () => ({
  flashistConstants: {
    analyticEvents: {},
    uiElementIds: {},
    citizenshipExplainerSources: {},
  },
  flashist_logEventAnalytics: jest.fn(),
  FlashistFacade: { instance: {} },
}));
jest.mock("../../../src/client/PrivateLobbyAccess", () => ({
  isPrivateLobbyRowEnabled: jest.fn(),
}));

import fs from "fs";
import type { CSSResultGroup } from "lit";
import path from "path";
import { CitizenshipExplainerModal } from "../../../src/client/CitizenshipExplainerModal";
import { darkScrollbarStyles } from "../../../src/client/components/baseComponents/DarkScrollbarStyles";
import { OModal } from "../../../src/client/components/baseComponents/Modal";

const ROOT = path.join(__dirname, "../../..");
const CLIENT_DIR = path.join(ROOT, "src/client");

const PSEUDO_ELEMENTS = [
  "::-webkit-scrollbar",
  "::-webkit-scrollbar-track",
  "::-webkit-scrollbar-thumb",
  "::-webkit-scrollbar-thumb:hover",
];

// Since Chromium 121, either property set to a non-`auto` value turns the
// `::-webkit-scrollbar` rules off.
const SWITCH_OFF_PROPERTY = /scrollbar-(?:color|width)\s*:/;

// The declarations of the first rule whose selector is exactly `selector`
// (optionally prefixed with `*`), normalized: "width: 8px; …" with single
// spaces, so formatting differences do not count as drift.
function declarationsOf(cssText: string, selector: string): string | null {
  const withoutComments = cssText.replace(/\/\*[\s\S]*?\*\//g, "");
  const ruleRegex = /([^{}]+)\{([^{}]*)\}/g;
  for (const match of withoutComments.matchAll(ruleRegex)) {
    const ruleSelector = match[1].trim();
    if (ruleSelector === selector || ruleSelector === `*${selector}`) {
      return match[2]
        .split(";")
        .map((declaration) => declaration.trim().replace(/\s+/g, " "))
        .filter((declaration) => declaration !== "")
        .join("; ");
    }
  }
  return null;
}

// A component's `static styles` may nest arrays; flatten them all.
function stylesOf(group: CSSResultGroup | undefined): unknown[] {
  return Array.isArray(group) ? group.flatMap(stylesOf) : [group];
}

describe("shared dark scrollbar styles", () => {
  it.each(PSEUDO_ELEMENTS)(
    "%s carries the same declarations as the page's copy in styles.css",
    (pseudoElement) => {
      const pageCss = fs.readFileSync(
        path.join(CLIENT_DIR, "styles.css"),
        "utf-8",
      );
      const pageDeclarations = declarationsOf(pageCss, pseudoElement);
      expect(pageDeclarations).not.toBeNull();
      expect(declarationsOf(darkScrollbarStyles.cssText, pseudoElement)).toBe(
        pageDeclarations,
      );
    },
  );

  it("has no scrollbar-color or scrollbar-width, which would turn it off", () => {
    expect(darkScrollbarStyles.cssText).not.toMatch(SWITCH_OFF_PROPERTY);
  });
});

describe("o-modal and the citizenship popup use the shared styles", () => {
  it("o-modal lists them in its static styles", () => {
    expect(stylesOf(OModal.styles)).toContain(darkScrollbarStyles);
  });

  it("the citizenship explainer popup lists them in its static styles", () => {
    expect(stylesOf(CitizenshipExplainerModal.styles)).toContain(
      darkScrollbarStyles,
    );
  });

  it("an open o-modal's shadow root carries the scrollbar rules", async () => {
    document.body.innerHTML = "";
    const modal = document.createElement("o-modal") as OModal;
    document.body.appendChild(modal);
    modal.open();
    await modal.updateComplete;

    const shadowRoot = modal.shadowRoot!;
    expect(shadowRoot.querySelector(".c-modal__content")).not.toBeNull();
    // Lit adopts the styles where the environment supports it, and falls back
    // to <style> elements otherwise (jsdom); read both.
    const adopted = (shadowRoot.adoptedStyleSheets ?? []).flatMap((sheet) =>
      Array.from(sheet.cssRules).map((rule) => rule.cssText),
    );
    const styleElements = Array.from(shadowRoot.querySelectorAll("style")).map(
      (style) => style.textContent ?? "",
    );
    const shadowCss = [...adopted, ...styleElements].join("\n");
    expect(shadowCss).toContain("::-webkit-scrollbar");
    expect(shadowCss).toContain("::-webkit-scrollbar-thumb");
  });
});

// A shadow component that declares a scroll area must take the shared styles,
// so a new window cannot bring the browser's light scrollbar back (task 0419's
// popups included, if they gain scrolling).
// Known limit: a scroll area made only at runtime (`el.style.overflow = …`) or
// through a class from outside the component is not caught.
describe("every shadow component that scrolls uses the shared styles", () => {
  const SCROLL_DECLARATION = /overflow(?:-x|-y)?\s*:\s*(?:auto|scroll)\b/;

  function clientSourceFiles(directory: string): string[] {
    return fs
      .readdirSync(directory, { withFileTypes: true })
      .flatMap((entry) => {
        const fullPath = path.join(directory, entry.name);
        if (entry.isDirectory()) return clientSourceFiles(fullPath);
        return entry.name.endsWith(".ts") ? [fullPath] : [];
      });
  }

  const scrollingShadowComponents = clientSourceFiles(CLIENT_DIR)
    .filter((file) => {
      const source = fs.readFileSync(file, "utf-8");
      return (
        /extends LitElement\b/.test(source) &&
        !/createRenderRoot\s*\(/.test(source) &&
        SCROLL_DECLARATION.test(source)
      );
    })
    .map((file) => path.relative(ROOT, file));

  it("finds the shadow components that scroll (the scan is not vacuous)", () => {
    expect(scrollingShadowComponents).toEqual(
      expect.arrayContaining([
        "src/client/components/baseComponents/Modal.ts",
        "src/client/CitizenshipExplainerModal.ts",
      ]),
    );
  });

  it.each(scrollingShadowComponents)(
    "%s uses darkScrollbarStyles and has no scrollbar-color / scrollbar-width",
    (file) => {
      const source = fs.readFileSync(path.join(ROOT, file), "utf-8");
      expect(source).toMatch(/\bdarkScrollbarStyles\b/);
      expect(source).not.toMatch(SWITCH_OFF_PROPERTY);
    },
  );
});
