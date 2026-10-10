/**
 * @jest-environment jsdom
 */
// Task 0415: no native browser tooltip anywhere in the game's UI. A `title`
// attribute makes the browser show a hover tooltip, which the owner reads as
// against the Yandex Games rules. `o-button` / `o-modal` used to name their
// label / heading property `title` (upstream OpenFront does), so every caller
// put a real tooltip on the page. They now use `label` / `heading`.
//
// This guard stops a `title` coming back — through either HTML template, an
// upstream merge, or a later task — in two ways:
//   (a) parse both templates and require no element in <body> to carry `title`
//       (HTML comments are not elements, so commented-out markup is ignored);
//   (b) scan every client .ts file for a template `title=` attribute or a
//       script `.title =` assignment. `document.title` (the browser tab name)
//       is not a tooltip and is allowed.
// Out of scope: the tooltips the game draws itself (radial menu, tutorial).

import fs from "fs";
import path from "path";

const ROOT = path.join(__dirname, "../..");
const CLIENT_DIR = path.join(ROOT, "src/client");

const TEMPLATES = [
  "src/client/index.html",
  "src/client/yandex-games_iframe.html",
];

describe("no native tooltips in the HTML templates", () => {
  it.each(TEMPLATES)("%s has no element with a title attribute", (file) => {
    const html = fs.readFileSync(path.join(ROOT, file), "utf-8");
    const page = new DOMParser().parseFromString(html, "text/html");

    const offenders = Array.from(page.body.querySelectorAll("[title]")).map(
      (element) => element.outerHTML.slice(0, 120),
    );
    expect(offenders).toEqual([]);
  });

  it.each(TEMPLATES)(
    "%s has no o-button / o-modal tag with title= (brief's guard)",
    (file) => {
      const html = fs.readFileSync(path.join(ROOT, file), "utf-8");
      const page = new DOMParser().parseFromString(html, "text/html");

      expect(
        page.querySelectorAll("o-button[title], o-modal[title]"),
      ).toHaveLength(0);
      // The guard is only meaningful if the templates still use the components.
      expect(page.querySelectorAll("o-button").length).toBeGreaterThan(0);
    },
  );
});

describe("no native tooltips in client source", () => {
  // Each pattern runs over the whole file text, not line by line, so a call
  // Prettier wraps across lines (`setAttribute(\n  "title",`) is still caught.
  // A template attribute: ` title=` (Lit `title=${…}` or `title="…"`).
  const TEMPLATE_TITLE_ATTRIBUTE = /\stitle=/g;
  // A script assignment `.title = …` (not `===`/`==`), except document.title.
  const TITLE_ASSIGNMENT = /(?<!document)\.title\s*=(?!=)/g;
  // `el["title"] = …`.
  const BRACKET_TITLE_ASSIGNMENT = /\[\s*["'`]title["'`]\s*\]\s*=(?!=)/g;
  // `setAttribute("title", …)`, `toggleAttribute("title")`,
  // `setAttributeNS(ns, "title", …)`.
  const SET_TITLE_ATTRIBUTE =
    /(?:setAttribute|toggleAttribute)\(\s*["'`]title["'`]|setAttributeNS\(\s*[^,()]*,\s*["'`]title["'`]/g;
  // Not caught: `Object.assign(el, { title })`, a spread onto an element, or a
  // computed attribute name. In source text these look like ordinary
  // `{ title: … }` object keys, which are allowed. The live-page `[title]` scan
  // recorded in the task worklog is the check for those.
  const PATTERNS = [
    TEMPLATE_TITLE_ATTRIBUTE,
    TITLE_ASSIGNMENT,
    BRACKET_TITLE_ASSIGNMENT,
    SET_TITLE_ATTRIBUTE,
  ];

  function matches(pattern: RegExp, text: string): boolean {
    return new RegExp(pattern.source, pattern.flags.replace("g", "")).test(
      text,
    );
  }

  function listTsFiles(dir: string): string[] {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return listTsFiles(full);
      return entry.name.endsWith(".ts") ? [full] : [];
    });
  }

  it("scans a meaningful number of files", () => {
    expect(listTsFiles(CLIENT_DIR).length).toBeGreaterThan(50);
  });

  it("no client .ts file sets a title attribute or assigns .title", () => {
    const offenders: string[] = [];
    for (const file of listTsFiles(CLIENT_DIR)) {
      const text = fs.readFileSync(file, "utf-8");
      const lines = text.split("\n");
      for (const pattern of PATTERNS) {
        for (const match of text.matchAll(pattern)) {
          const lineIndex = text.slice(0, match.index).split("\n").length - 1;
          offenders.push(
            `${path.relative(ROOT, file)}:${lineIndex + 1}: ${lines[lineIndex].trim()}`,
          );
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("the patterns catch what they are meant to catch", () => {
    expect(matches(TEMPLATE_TITLE_ATTRIBUTE, `<o-button title=\${x}>`)).toBe(
      true,
    );
    expect(matches(TEMPLATE_TITLE_ATTRIBUTE, `        title="Remove"`)).toBe(
      true,
    );
    expect(matches(TITLE_ASSIGNMENT, `missionButton.title = label;`)).toBe(
      true,
    );
    expect(matches(TITLE_ASSIGNMENT, `licenseCredits.title=version;`)).toBe(
      true,
    );
    expect(matches(TITLE_ASSIGNMENT, `el\n  .title =\n  label;`)).toBe(true);
    expect(matches(BRACKET_TITLE_ASSIGNMENT, `el["title"] = x;`)).toBe(true);
    expect(matches(BRACKET_TITLE_ASSIGNMENT, `el['title']=x;`)).toBe(true);
    expect(matches(SET_TITLE_ATTRIBUTE, `el.setAttribute("title", x)`)).toBe(
      true,
    );
    // The shape Prettier produces when it wraps a long call.
    expect(
      matches(SET_TITLE_ATTRIBUTE, `el.setAttribute(\n  "title",\n  x,\n)`),
    ).toBe(true);
    expect(matches(SET_TITLE_ATTRIBUTE, `el.toggleAttribute("title")`)).toBe(
      true,
    );
    expect(
      matches(SET_TITLE_ATTRIBUTE, `el.setAttributeNS(null, "title", x)`),
    ).toBe(true);
    // Allowed: the tab name, comparisons, CSS classes, object keys, reads and
    // a "title" that is a value rather than the attribute name.
    expect(matches(TITLE_ASSIGNMENT, `document.title = name;`)).toBe(false);
    expect(matches(TITLE_ASSIGNMENT, `if (a.title === b) {}`)).toBe(false);
    expect(matches(TEMPLATE_TITLE_ATTRIBUTE, `<span class="title">`)).toBe(
      false,
    );
    expect(matches(TEMPLATE_TITLE_ATTRIBUTE, `{ title: "x" }`)).toBe(false);
    expect(matches(BRACKET_TITLE_ASSIGNMENT, `if (el["title"] === x) {}`)).toBe(
      false,
    );
    expect(matches(SET_TITLE_ATTRIBUTE, `el.getAttribute("title")`)).toBe(
      false,
    );
    expect(
      matches(SET_TITLE_ATTRIBUTE, `el.setAttribute("data-kind", "title")`),
    ).toBe(false);
  });
});
