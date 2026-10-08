// Task 0382: the host window's invite-link hint must exist, non-empty, in BOTH
// en.json and ru.json (project rule: the two files stay in sync).

import fs from "fs";
import path from "path";

const LANG_DIR = path.join(__dirname, "../../resources/lang");

function load(file: string): Record<string, Record<string, string>> {
  return JSON.parse(fs.readFileSync(path.join(LANG_DIR, file), "utf-8"));
}

describe("invite link hint localization (task 0382)", () => {
  const en = load("en.json");
  const ru = load("ru.json");

  it("both files define host_modal.invite_link_hint, non-empty", () => {
    expect(en.host_modal?.invite_link_hint?.length).toBeGreaterThan(0);
    expect(ru.host_modal?.invite_link_hint?.length).toBeGreaterThan(0);
  });

  it("ru is translated, not copied from en", () => {
    expect(ru.host_modal.invite_link_hint).not.toBe(
      en.host_modal.invite_link_hint,
    );
  });

  it("keeps 0380's code hint next to it", () => {
    expect(en.host_modal.invite_code_hint?.length).toBeGreaterThan(0);
    expect(ru.host_modal.invite_code_hint?.length).toBeGreaterThan(0);
  });

  it("names no site or portal in either language", () => {
    for (const text of [
      en.host_modal.invite_link_hint,
      ru.host_modal.invite_link_hint,
    ]) {
      expect(text.toLowerCase()).not.toMatch(/geoconflict|yandex|http/);
    }
  });
});
