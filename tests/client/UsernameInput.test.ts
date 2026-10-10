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

// Schemas (for JoinUsernameSchema, task 0321) pulls in jose, which needs a
// TextEncoder jsdom lacks; nothing here decodes patterns. Same stub as
// tests/LocalServer.test.ts.
jest.mock("jose", () => ({
  base64url: { decode: jest.fn() },
}));

const getCurPlayerName = jest.fn();
const logErrorToAnalytics = jest.fn();
jest.mock("../../src/client/flashist/FlashistFacade", () => ({
  flashist_logErrorToAnalytics: (...args: unknown[]) =>
    logErrorToAnalytics(...args),
  flashist_logErrorTypes: { DEBUG: "debug" },
  FlashistFacade: {
    instance: { getCurPlayerName: () => getCurPlayerName() },
  },
}));

// A type-only use would let the transform drop the import, and with it the
// `@customElement("username-input")` registration.
import "../../src/client/UsernameInput";
import {
  publishApprovedName,
  resetApprovedNameForTests,
} from "../../src/client/ApprovedName";
import type { UsernameInput } from "../../src/client/UsernameInput";
import { JoinUsernameSchema } from "../../src/core/Schemas";
import { checkUsernameRules } from "../../src/core/validations/usernameRules";

const HINT = "3–27 characters: letters, numbers, spaces, _ and [ ].";

async function flushLit(element: Element): Promise<void> {
  for (let i = 0; i < 5; i++) {
    await Promise.resolve();
  }
  await (element as Element & { updateComplete: Promise<unknown> })
    .updateComplete;
}

async function mount(
  storedName: string | null,
  yandexName: string = "",
): Promise<UsernameInput> {
  getCurPlayerName.mockResolvedValue(yandexName);
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
  resetApprovedNameForTests();
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

// Task 0321 (owner rulings D4, Q1–Q4): a citizen's approved name, published by
// the citizenship card, is shown in the name box read-only and is what joins.
describe("UsernameInput — approved name lock (task 0321)", () => {
  const APPROVED = "Commander";
  const YANDEX = "YandexPlayer";
  const LOCKED_HINT =
    "This is your approved name. You can change it on the Citizenship card.";

  function publishApproved(name: string = APPROVED): void {
    publishApprovedName({ kind: "approved", name });
  }

  function expectLockedTo(el: UsernameInput, name: string): void {
    expect(input(el).value).toBe(name);
    expect(input(el).readOnly).toBe(true);
    expect(input(el).getAttribute("aria-readonly")).toBe("true");
    // Task 0415: no native browser tooltip; the hint shows visibly on focus.
    expect(input(el).hasAttribute("title")).toBe(false);
    expect(el.querySelector("#username-lock-icon")).not.toBeNull();
    expect(el.getCurrentUsername()).toBe(name);
    expect(el.isValid()).toBe(true);
  }

  function expectUnlocked(el: UsernameInput): void {
    expect(input(el).readOnly).toBe(false);
    expect(input(el).hasAttribute("aria-readonly")).toBe(false);
    expect(input(el).hasAttribute("title")).toBe(false);
    expect(el.querySelector("#username-lock-icon")).toBeNull();
  }

  it("published before mount: shows it locked, stores it, and the server accepts it", async () => {
    publishApproved();
    const el = await mount(null, YANDEX);

    expectLockedTo(el, APPROVED);
    expect(localStorage.getItem("username")).toBe(APPROVED);
    expect(localStorage.getItem("approved_username")).toBe(APPROVED);
    expect(JoinUsernameSchema.safeParse(el.getCurrentUsername()).success).toBe(
      true,
    );
  });

  it("published DURING the box's own fill: the fill does not overwrite the lock", async () => {
    let resolveYandexName: (name: string) => void = () => {};
    getCurPlayerName.mockReturnValue(
      new Promise<string>((resolve) => {
        resolveYandexName = resolve;
      }),
    );
    const el = document.createElement("username-input") as UsernameInput;
    document.body.appendChild(el);
    await flushLit(el);

    publishApproved();
    resolveYandexName(YANDEX);
    await flushLit(el);

    expectLockedTo(el, APPROVED);
  });

  it("published AFTER the box filled (the normal race): switches from the Yandex name and locks", async () => {
    const el = await mount(null, YANDEX);
    expect(input(el).value).toBe(YANDEX);
    const changes: string[] = [];
    el.addEventListener("username-change", (event) =>
      changes.push((event as CustomEvent).detail.username),
    );

    publishApproved();
    await flushLit(el);

    expectLockedTo(el, APPROVED);
    expect(changes).toEqual([APPROVED]);
  });

  it("published while the player is typing: no swap until blur; the approved name joins meanwhile", async () => {
    const el = await mount(null, YANDEX);
    input(el).dispatchEvent(new Event("focus"));
    await type(el, "Half<typed");
    expect(el.isValid()).toBe(false);

    publishApproved();
    await flushLit(el);

    // The draft stays under the player's fingers...
    expect(input(el).value).toBe("Half<typed");
    expect(input(el).readOnly).toBe(false);
    // ...but a join in this window already uses the approved name.
    expect(el.getCurrentUsername()).toBe(APPROVED);
    expect(el.isValid()).toBe(true);

    input(el).dispatchEvent(new Event("blur"));
    await flushLit(el);

    expectLockedTo(el, APPROVED);
    expect(el.querySelector("#username-validation-error")).toBeNull();
  });

  it("ignores typing while locked", async () => {
    publishApproved();
    const el = await mount(null, YANDEX);

    await type(el, "Someone Else");

    expect(el.getCurrentUsername()).toBe(APPROVED);
    expect(localStorage.getItem("username")).toBe(APPROVED);
  });

  it("a locked box shows the locked hint on focus, not the rules hint", async () => {
    publishApproved();
    const el = await mount(null, YANDEX);
    expect(el.querySelector("#username-locked-hint")).toBeNull();

    input(el).dispatchEvent(new Event("focus"));
    await flushLit(el);

    expect(el.querySelector("#username-locked-hint")!.textContent).toContain(
      LOCKED_HINT,
    );
    expect(el.querySelector("#username-rules-hint")).toBeNull();

    input(el).dispatchEvent(new Event("blur"));
    await flushLit(el);
    expect(el.querySelector("#username-locked-hint")).toBeNull();
  });

  describe("no approved name: the order is unchanged, editable", () => {
    it.each([
      ["nothing published (guest, card disabled, failed read)", () => {}],
      ["none published", () => publishApprovedName({ kind: "none" as const })],
    ])("%s", async (_label, publish) => {
      publish();

      const yandex = await mount("Stored_Name", YANDEX);
      expect(yandex.getCurrentUsername()).toBe(YANDEX);
      expectUnlocked(yandex);

      document.body.innerHTML = "";
      localStorage.clear();
      const stored = await mount("Stored_Name");
      expect(stored.getCurrentUsername()).toBe("Stored_Name");
      expectUnlocked(stored);

      document.body.innerHTML = "";
      localStorage.clear();
      const anon = await mount(null);
      expect(anon.getCurrentUsername()).toMatch(/^Anon\d{4}$/);
      expectUnlocked(anon);
      await type(anon, "Typed Name");
      expect(anon.getCurrentUsername()).toBe("Typed Name");
    });
  });

  it("degraded load (owner ruling Q2): the stored approved name shows UNLOCKED", async () => {
    localStorage.setItem("username", APPROVED);
    localStorage.setItem("approved_username", APPROVED);
    getCurPlayerName.mockRejectedValue(new Error("sdk unavailable"));
    const el = document.createElement("username-input") as UsernameInput;
    document.body.appendChild(el);
    await flushLit(el);

    expect(input(el).value).toBe(APPROVED);
    expectUnlocked(el);
    await type(el, "Other Name");
    expect(el.getCurrentUsername()).toBe("Other Name");
  });

  it.each([
    ["too short", "ab"],
    ["an emoji", "\u{1F600}Bob"],
    ["a dash", "Bob-Smith"],
  ])(
    "an approved name that fails today's rule (%s) is not locked, and is not logged",
    async (_label, name) => {
      publishApproved(name);
      const el = await mount(null, YANDEX);

      expect(el.getCurrentUsername()).toBe(YANDEX);
      expectUnlocked(el);
      expect(localStorage.getItem("approved_username")).toBeNull();
      expect(logErrorToAnalytics).toHaveBeenCalledWith(
        expect.not.stringContaining(name),
        "debug",
      );
    },
  );

  it("trims an approved name before the rule, as the server's join check does", async () => {
    publishApproved("  Commander ");
    const el = await mount(null, YANDEX);
    expectLockedTo(el, APPROVED);
  });

  describe("name cleared (task 0314): none after an approved name", () => {
    it("unlocks and removes the stored copy; the box falls back to Anon#### with no Yandex name", async () => {
      publishApproved();
      const el = await mount(null);
      expectLockedTo(el, APPROVED);

      publishApprovedName({ kind: "none" });
      await flushLit(el);

      expectUnlocked(el);
      expect(el.getCurrentUsername()).toMatch(/^Anon\d{4}$/);
      expect(input(el).value).toBe(el.getCurrentUsername());
      expect(localStorage.getItem("username")).toBe(el.getCurrentUsername());
      expect(localStorage.getItem("approved_username")).toBeNull();
    });

    it("falls back to the Yandex name when there is one", async () => {
      publishApproved();
      const el = await mount(null, YANDEX);

      publishApprovedName({ kind: "none" });
      await flushLit(el);

      expectUnlocked(el);
      expect(el.getCurrentUsername()).toBe(YANDEX);
    });

    it("on the next load, a stale stored approved name is removed", async () => {
      // An earlier load stored it; the Yandex name is empty, so the box
      // starts on it, unlocked — then the fresh read says it is gone.
      localStorage.setItem("username", APPROVED);
      localStorage.setItem("approved_username", APPROVED);
      const el = await mount(null);
      expect(input(el).value).toBe(APPROVED);

      publishApprovedName({ kind: "none" });
      await flushLit(el);

      expect(el.getCurrentUsername()).toMatch(/^Anon\d{4}$/);
      expect(localStorage.getItem("username")).not.toBe(APPROVED);
      expect(localStorage.getItem("approved_username")).toBeNull();
    });

    it("keeps a name the player typed themselves (it does not match the marker)", async () => {
      localStorage.setItem("username", "My_Own_Name");
      localStorage.setItem("approved_username", APPROVED);
      const el = await mount(null);
      expect(el.getCurrentUsername()).toBe("My_Own_Name");

      publishApprovedName({ kind: "none" });
      await flushLit(el);

      expect(el.getCurrentUsername()).toBe("My_Own_Name");
      expect(localStorage.getItem("username")).toBe("My_Own_Name");
      expect(localStorage.getItem("approved_username")).toBeNull();
    });

    it("keeps a typed name even when it equals the approved name (R1, owner ruling 2026-09-28)", async () => {
      // Degraded-style start: the stored approved copy shows unlocked.
      localStorage.setItem("username", APPROVED);
      localStorage.setItem("approved_username", APPROVED);
      const el = await mount(null);
      input(el).dispatchEvent(new Event("focus"));
      await type(el, APPROVED);
      expect(localStorage.getItem("approved_username")).toBeNull();

      publishApprovedName({ kind: "none" });
      await flushLit(el);
      input(el).dispatchEvent(new Event("blur"));
      await flushLit(el);

      expect(input(el).value).toBe(APPROVED);
      expect(el.getCurrentUsername()).toBe(APPROVED);
      expect(localStorage.getItem("username")).toBe(APPROVED);
    });

    it("cleared while the box has focus: the refill waits for blur, as a lock does", async () => {
      publishApproved();
      const el = await mount(null);
      input(el).dispatchEvent(new Event("focus"));
      await flushLit(el);

      publishApprovedName({ kind: "none" });
      await flushLit(el);

      // Unlocked, but the text is not swapped under the player's fingers...
      expectUnlocked(el);
      expect(input(el).value).toBe(APPROVED);
      // ...while a join in this window already uses the replacement.
      expect(el.getCurrentUsername()).toMatch(/^Anon\d{4}$/);

      input(el).dispatchEvent(new Event("blur"));
      await flushLit(el);

      expect(input(el).value).toBe(el.getCurrentUsername());
      expect(el.getCurrentUsername()).toMatch(/^Anon\d{4}$/);
      expect(localStorage.getItem("username")).toBe(el.getCurrentUsername());
    });

    it("cleared while focused, then the player types: the typed name wins at blur", async () => {
      publishApproved();
      const el = await mount(null);
      input(el).dispatchEvent(new Event("focus"));
      await flushLit(el);

      publishApprovedName({ kind: "none" });
      await flushLit(el);
      await type(el, "Typed Name");
      input(el).dispatchEvent(new Event("blur"));
      await flushLit(el);

      expect(input(el).value).toBe("Typed Name");
      expect(el.getCurrentUsername()).toBe("Typed Name");
      expect(localStorage.getItem("username")).toBe("Typed Name");
    });

    it("cleared while focused, then an invalid edit: the cleared name never joins (R3)", async () => {
      publishApproved();
      const el = await mount(null);
      input(el).dispatchEvent(new Event("focus"));
      await flushLit(el);

      publishApprovedName({ kind: "none" });
      await flushLit(el);
      await type(el, "A");
      input(el).dispatchEvent(new Event("blur"));
      await flushLit(el);

      // The same name the unfocused path would join under — the replacement.
      expect(el.isValid()).toBe(false);
      expect(el.getCurrentUsername()).toMatch(/^Anon\d{4}$/);
      expect(localStorage.getItem("username")).not.toBe(APPROVED);
    });

    describe("the refill's own await is held open (R2: worklog decision 4's guard)", () => {
      function holdYandexRead(): (name: string) => void {
        let release: (name: string) => void = () => {};
        getCurPlayerName.mockReturnValue(
          new Promise<string>((resolve) => {
            release = resolve;
          }),
        );
        return release;
      }

      // The same name coming back is the case only the approved-name half of
      // the guard catches: the box still shows the cleared name.
      it.each([
        ["a different approved name", "Second_Name"],
        ["the same approved name again", APPROVED],
      ])("%s landing meanwhile keeps its lock", async (_label, name) => {
        publishApproved();
        const el = await mount(null, YANDEX);
        const releaseYandexRead = holdYandexRead();

        publishApprovedName({ kind: "none" });
        await flushLit(el);
        publishApproved(name);
        await flushLit(el);
        releaseYandexRead(YANDEX);
        await flushLit(el);

        expectLockedTo(el, name);
        expect(localStorage.getItem("username")).toBe(name);
        expect(localStorage.getItem("approved_username")).toBe(name);
      });

      it("a name typed meanwhile is kept", async () => {
        publishApproved();
        const el = await mount(null, YANDEX);
        const releaseYandexRead = holdYandexRead();

        publishApprovedName({ kind: "none" });
        await flushLit(el);
        await type(el, "Typed Name");
        releaseYandexRead(YANDEX);
        await flushLit(el);

        expect(input(el).value).toBe("Typed Name");
        expect(el.getCurrentUsername()).toBe("Typed Name");
        expect(localStorage.getItem("username")).toBe("Typed Name");
      });

      it("the cleared name typed back meanwhile is kept (R4)", async () => {
        publishApproved();
        const el = await mount(null, YANDEX);
        const releaseYandexRead = holdYandexRead();

        publishApprovedName({ kind: "none" });
        await flushLit(el);
        await type(el, "Other");
        await type(el, APPROVED);
        releaseYandexRead(YANDEX);
        await flushLit(el);

        expect(input(el).value).toBe(APPROVED);
        expect(el.getCurrentUsername()).toBe(APPROVED);
        expect(localStorage.getItem("username")).toBe(APPROVED);
      });

      it("an invalid edit meanwhile never falls back to the cleared name (R3)", async () => {
        publishApproved();
        const el = await mount(null, YANDEX);
        const releaseYandexRead = holdYandexRead();

        publishApprovedName({ kind: "none" });
        await flushLit(el);
        await type(el, "A");
        expect(el.getCurrentUsername()).not.toBe(APPROVED);
        releaseYandexRead(YANDEX);
        await flushLit(el);

        expect(input(el).value).toBe("A");
        expect(el.isValid()).toBe(false);
        expect(el.getCurrentUsername()).not.toBe(APPROVED);
        expect(checkUsernameRules(el.getCurrentUsername())).toBeNull();
        expect(localStorage.getItem("username")).toBeNull();
      });
    });
  });

  it("stops listening once disconnected", async () => {
    const el = await mount(null, YANDEX);
    el.remove();

    publishApproved();
    await flushLit(el);

    expect(el.getCurrentUsername()).toBe(YANDEX);
    expect(input(el).readOnly).toBe(false);
  });
});
