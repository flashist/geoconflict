/**
 * @jest-environment jsdom
 */
// Task 0307 (F4) — the in-game name input:
//   - explains the rule BEFORE it is broken (a hint while editing — owner ruling Q-C),
//   - states the full rule in every error,
//   - only ever hands out the LAST ACCEPTED name to join a game (Q-B): the server
//     now refuses a name that breaks the rule, so a half-typed invalid draft must
//     never be sent,
//   - cleans (never refuses) a stored name, including the half-astral-letter case.
//
// translateText is mocked with the REAL en.json text and a plain `{param}`
// substitution, so the assertions read what a player would read.
import en from "../../resources/lang/en.json";

jest.mock("../../src/client/Utils", () => ({
  translateText: jest.fn(
    (key: string, params: Record<string, string | number> = {}) => {
      const [section, name] = key.split(".");
      const lang = jest.requireActual("../../resources/lang/en.json") as Record<
        string,
        Record<string, string>
      >;
      let text = lang[section]?.[name] ?? key;
      for (const [param, value] of Object.entries(params)) {
        text = text.replace(`{${param}}`, String(value));
      }
      return text;
    },
  ),
}));

const getCurPlayerName = jest.fn();
jest.mock("../../src/client/flashist/FlashistFacade", () => ({
  flashist_logErrorToAnalytics: jest.fn(),
  flashist_logErrorTypes: { DEBUG: "debug" },
  FlashistFacade: {
    instance: { getCurPlayerName: () => getCurPlayerName() },
  },
}));

// A type-only use would let the transform drop the import, and with it the
// `@customElement("username-input")` registration.
import "../../src/client/UsernameInput";
import type { UsernameInput } from "../../src/client/UsernameInput";
import { checkUsernameRules } from "../../src/core/validations/usernameRules";

const HINT = "3–27 characters: letters, numbers, spaces, _ and [ ].";

async function flushLit(element: Element): Promise<void> {
  for (let i = 0; i < 5; i++) {
    await Promise.resolve();
  }
  await (element as Element & { updateComplete: Promise<unknown> })
    .updateComplete;
}

async function mount(storedName: string | null): Promise<UsernameInput> {
  getCurPlayerName.mockResolvedValue("");
  if (storedName !== null) {
    localStorage.setItem("username", storedName);
  }
  const el = document.createElement("username-input") as UsernameInput;
  document.body.appendChild(el);
  await flushLit(el);
  return el;
}

function input(el: UsernameInput): HTMLInputElement {
  return el.querySelector("input")!;
}

async function type(el: UsernameInput, value: string): Promise<void> {
  input(el).value = value;
  input(el).dispatchEvent(new Event("input"));
  await flushLit(el);
}

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = "";
  jest.clearAllMocks();
});

describe("UsernameInput (task 0307)", () => {
  it("uses the real en text for the hint", () => {
    expect(en.username.rules_hint).toBe(
      "{min}–{max} characters: letters, numbers, spaces, _ and [ ].",
    );
  });

  describe("explains the rule before it is broken (Q-C)", () => {
    it("shows the rule hint while the input has focus, and hides it after", async () => {
      const el = await mount("Stored_Name");
      expect(el.querySelector("#username-rules-hint")).toBeNull();
      input(el).dispatchEvent(new Event("focus"));
      await flushLit(el);
      expect(el.querySelector("#username-rules-hint")!.textContent).toContain(
        HINT,
      );
      input(el).dispatchEvent(new Event("blur"));
      await flushLit(el);
      expect(el.querySelector("#username-rules-hint")).toBeNull();
    });

    it("sets maxlength to 27", async () => {
      const el = await mount("Stored_Name");
      expect(input(el).getAttribute("maxlength")).toBe("27");
    });
  });

  describe("every error states the full rule", () => {
    it.each([
      ["a broken character", "Bad<Name", "Username can only contain letters"],
      [
        "a too-short name",
        "ab",
        "Username must be at least 3 characters long.",
      ],
    ])("%s", async (_label, draft, problem) => {
      const el = await mount("Stored_Name");
      input(el).dispatchEvent(new Event("focus"));
      await type(el, draft);
      const error = el.querySelector("#username-validation-error")!;
      expect(error.textContent).toContain(problem);
      expect(error.textContent).toContain(HINT);
      expect(error.textContent).not.toContain("{");
      // One message, not the error and a second hint box.
      expect(el.querySelector("#username-rules-hint")).toBeNull();
    });
  });

  describe("only ever hands out the last accepted name (Q-B)", () => {
    it("keeps the stored name while the draft is invalid", async () => {
      const el = await mount("Stored_Name");
      await type(el, "Half<typed");
      expect(el.isValid()).toBe(false);
      expect(input(el).value).toBe("Half<typed"); // the draft stays visible
      expect(el.getCurrentUsername()).toBe("Stored_Name");
    });

    it("moves on to a newly typed name once it passes the rule", async () => {
      const el = await mount("Stored_Name");
      await type(el, "New Name");
      expect(el.isValid()).toBe(true);
      expect(el.getCurrentUsername()).toBe("New Name");
      await type(el, "x");
      expect(el.isValid()).toBe(false);
      expect(el.getCurrentUsername()).toBe("New Name");
    });

    it("never hands out an invalid name, whatever is typed", async () => {
      const el = await mount("Stored_Name");
      for (const draft of ["", "a", "<script>", "a".repeat(40), "ab\u202Ecd"]) {
        await type(el, draft);
        expect(checkUsernameRules(el.getCurrentUsername())).toBeNull();
      }
    });

    it("hands out a valid name even before the stored name has loaded", () => {
      const el = document.createElement("username-input") as UsernameInput;
      // Not connected: nothing loaded yet.
      expect(checkUsernameRules(el.getCurrentUsername())).toBeNull();
    });
  });

  describe("stored names are cleaned, never refused", () => {
    it("cleans a stored name with 14 astral letters into a valid one", async () => {
      const el = await mount("\u{1D400}".repeat(14));
      expect(el.getCurrentUsername()).toBe("\u{1D400}".repeat(13));
      expect(checkUsernameRules(el.getCurrentUsername())).toBeNull();
    });

    // 0307 review R2: the server's join check trims before the rule, so a
    // cleaned name with edge spaces would trim to a too-short name and be refused.
    it.each([
      ["\u2605 A \u2605", "Axx"],
      ["   ", "xxx"],
      [" Bob ", "Bob"],
    ])(
      "cleans the stored name %j to the trimmed %j",
      async (stored, expected) => {
        const el = await mount(stored);
        expect(el.getCurrentUsername()).toBe(expected);
        expect(el.getCurrentUsername()).toBe(el.getCurrentUsername().trim());
        expect(checkUsernameRules(el.getCurrentUsername())).toBeNull();
      },
    );

    it("cleans a stored hostile name instead of locking the player out", async () => {
      const el = await mount("<b>Bob</b>");
      expect(el.getCurrentUsername()).toBe("bBobb");
      expect(el.isValid()).toBe(true);
    });
  });
});
