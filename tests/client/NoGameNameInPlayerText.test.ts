// Task 0311: player-facing text must not name the game. Owner ruled a wide
// guard (Q4): every string in en.json and ru.json, the page title (`main.title`
// in every lang file, and the <title> tag of both HTML templates), the install
// name in manifest.json, and every string in the news feed.
//
// Deliberately NOT covered: the domain (canonical <link>), localStorage keys,
// metric/service names, the favicon filename, and the upstream credit
// "Based on OpenFront" — none of those is our game name in player copy.

import fs from "fs";
import path from "path";

const ROOT = path.join(__dirname, "../..");
const LANG_DIR = path.join(ROOT, "resources/lang");

const GAME_NAME = /geo[\s-]*conflict|гео[\s-]*конфликт/i;

// `main.title` in ar/ko/tp carried the upstream name instead of ours (0311
// plan, B4). The page title and the install name must carry neither. Not
// applied to the en/ru walk or the news feed: the upstream credit "Based on
// OpenFront" is kept there on purpose.
const UPSTREAM_NAME = /opent?[\s-]*front|openpon|오픈\s*프론트/i;

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

function readJson(file: string): Json {
  return JSON.parse(fs.readFileSync(file, "utf-8")) as Json;
}

function collectStrings(
  node: Json,
  keyPath: string,
  out: Array<[string, string]>,
): Array<[string, string]> {
  if (typeof node === "string") {
    out.push([keyPath, node]);
  } else if (Array.isArray(node)) {
    node.forEach((child, i) => collectStrings(child, `${keyPath}[${i}]`, out));
  } else if (node !== null && typeof node === "object") {
    for (const [key, child] of Object.entries(node)) {
      collectStrings(child, keyPath === "" ? key : `${keyPath}.${key}`, out);
    }
  }
  return out;
}

function offenders(strings: Array<[string, string]>): string[] {
  return strings
    .filter(([, value]) => GAME_NAME.test(value))
    .map(([keyPath, value]) => `${keyPath}: ${value}`);
}

describe("no game name in player-facing text (task 0311)", () => {
  it("the matcher catches every known spelling", () => {
    for (const text of [
      "Вы получили гражданство Geoconflict!",
      "GeoConflict",
      "Геоконфликт",
      "Geo-Conflict",
      "гео конфликт",
    ]) {
      expect(text).toMatch(GAME_NAME);
    }
    expect("Online strategy").not.toMatch(GAME_NAME);
    for (const text of [
      "OpentFront (ALPHA)",
      "OpenFront",
      "musi Openpon",
      "오픈 프론트",
    ]) {
      expect(text).toMatch(UPSTREAM_NAME);
    }
  });

  it.each(["en.json", "ru.json"])("no string in %s names the game", (file) => {
    const strings = collectStrings(readJson(path.join(LANG_DIR, file)), "", []);
    // An empty or broken walk must not pass by accident.
    expect(strings.length).toBeGreaterThan(500);
    expect(offenders(strings)).toEqual([]);
  });

  it("main.title in every lang file is absent or name-free", () => {
    const files = fs.readdirSync(LANG_DIR).filter((f) => f.endsWith(".json"));
    expect(files.length).toBeGreaterThan(30);
    const bad: string[] = [];
    for (const file of files) {
      const lang = readJson(path.join(LANG_DIR, file)) as {
        main?: { title?: string };
      };
      const title = lang.main?.title;
      if (title === undefined) continue;
      if (GAME_NAME.test(title) || UPSTREAM_NAME.test(title)) {
        bad.push(`${file}: ${title}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it("en and ru both still define main.title (the fallback for the rest)", () => {
    for (const file of ["en.json", "ru.json"]) {
      const lang = readJson(path.join(LANG_DIR, file)) as {
        main: { title?: string };
      };
      expect(lang.main.title?.length).toBeGreaterThan(0);
    }
  });

  it.each(["src/client/index.html", "src/client/yandex-games_iframe.html"])(
    "the <title> of %s does not name the game",
    (file) => {
      const html = fs.readFileSync(path.join(ROOT, file), "utf-8");
      // Only the tag text: the canonical <link> carries the domain, which is
      // out of scope.
      const match = html.match(/<title>([\s\S]*?)<\/title>/i);
      expect(match).not.toBeNull();
      expect(match![1].trim().length).toBeGreaterThan(0);
      expect(match![1]).not.toMatch(GAME_NAME);
      expect(match![1]).not.toMatch(UPSTREAM_NAME);
    },
  );

  it("the install name in manifest.json does not name the game", () => {
    const manifest = readJson(path.join(ROOT, "resources/manifest.json")) as {
      name?: string;
      short_name?: string;
    };
    for (const value of [manifest.name, manifest.short_name]) {
      expect(value?.length).toBeGreaterThan(0);
      expect(value).not.toMatch(GAME_NAME);
      expect(value).not.toMatch(UPSTREAM_NAME);
    }
  });

  it("no string in the news feed names the game", () => {
    const strings = collectStrings(
      readJson(path.join(ROOT, "resources/announcements.json")),
      "",
      [],
    );
    expect(strings.length).toBeGreaterThan(0);
    expect(offenders(strings)).toEqual([]);
  });
});
