/**
 * @jest-environment jsdom
 */

// Task 0413: inside the Yandex Games iframe the page may not read the
// clipboard, so the join window's paste button failed silently. When reading
// is unavailable the button is hidden and a hint tells the player how to paste
// by hand (owner, 2026-10-08: option 1, a line under the box). A press that
// fails always ends in the hint with the cursor in the box.

jest.mock("../../src/client/Main", () => ({ JoinLobbyEvent: class {} }));
jest.mock("../../src/client/Utils", () => ({
  translateText: (k: string) => k,
}));
jest.mock("../../src/client/CitizenBadge", () => ({
  renderCitizenBadge: () => "",
}));
jest.mock("../../src/client/components/baseComponents/Button", () => ({}));
jest.mock("../../src/client/jwt", () => ({ getApiBase: () => "/api" }));
jest.mock("../../src/core/configuration/ConfigLoader", () => ({
  getServerConfigFromClient: jest
    .fn()
    .mockResolvedValue({ workerPath: () => "w1" }),
}));
// Schemas pulls in jose, which needs a TextEncoder jsdom lacks. Same stub as
// tests/client/JoinPrivateLobbyModalLeave.test.ts.
jest.mock("jose", () => ({
  base64url: { decode: jest.fn() },
}));
jest.mock("../../src/client/flashist/FlashistFacade", () => ({
  flashistConstants: { analyticEvents: {} },
  flashist_logEventAnalytics: jest.fn(),
}));

import fs from "fs";
import path from "path";
import "../../src/client/components/baseComponents/Modal";
import {
  JoinPrivateLobbyModal,
  resetClipboardReadMemoryForTests,
} from "../../src/client/JoinPrivateLobbyModal";
import { resetStartScreenPresenceForTests } from "../../src/client/StartScreenPresence";
import { exposeLitAccessors } from "./support/litAccessors";

const LOBBY_ID = "K7M4PCRX";

type OModalElement = HTMLElement & { updateComplete: Promise<boolean> };
type PolicyCheck = { allowsFeature: (feature: string) => boolean };
type PolicyDocument = Document & {
  featurePolicy?: PolicyCheck;
  permissionsPolicy?: PolicyCheck;
};

async function flush(): Promise<void> {
  for (let i = 0; i < 20; i++) await Promise.resolve();
}

function setClipboard(value: unknown): void {
  Object.defineProperty(navigator, "clipboard", {
    value,
    configurable: true,
    writable: true,
  });
}

function setPolicy(
  name: "featurePolicy" | "permissionsPolicy",
  allowsClipboardRead: boolean | undefined,
): void {
  const policyDocument = document as PolicyDocument;
  if (allowsClipboardRead === undefined) {
    delete policyDocument[name];
    return;
  }
  policyDocument[name] = {
    allowsFeature: (feature: string) =>
      feature === "clipboard-read" ? allowsClipboardRead : true,
  };
}

function setFeaturePolicy(allowsClipboardRead: boolean | undefined): void {
  setPolicy("featurePolicy", allowsClipboardRead);
}

function setPermissionsPolicy(allowsClipboardRead: boolean | undefined): void {
  setPolicy("permissionsPolicy", allowsClipboardRead);
}

function permissionError(name: string): Error {
  const error = new Error(`${name}: denied`);
  error.name = name;
  return error;
}

describe("JoinPrivateLobbyModal paste (task 0413)", () => {
  let modal: JoinPrivateLobbyModal;
  let joins: CustomEvent[];
  let unhandled: unknown[];
  const onJoin = (e: Event) => joins.push(e as CustomEvent);
  const onUnhandled = (reason: unknown) => unhandled.push(reason);

  const oModal = () => modal.querySelector("o-modal") as OModalElement;
  const pasteButton = () =>
    modal.querySelector(".lobby-id-paste-button") as HTMLButtonElement | null;
  const hint = () => modal.querySelector("#lobby-id-paste-hint");
  const input = () => modal.querySelector("#lobbyIdInput") as HTMLInputElement;

  async function render(): Promise<void> {
    await modal.updateComplete;
    await oModal().updateComplete;
  }

  async function mountAndOpen(): Promise<void> {
    modal = new JoinPrivateLobbyModal();
    exposeLitAccessors(modal);
    document.body.appendChild(modal);
    await modal.updateComplete;
    exposeLitAccessors(oModal());
    await render();
    modal.open();
    await render();
  }

  async function pressPaste(): Promise<void> {
    const button = pasteButton();
    expect(button).not.toBeNull();
    button!.click();
    await flush();
    await render();
  }

  function expectUnavailableLayout(): void {
    expect(pasteButton()).toBeNull();
    expect(hint()?.textContent?.trim()).toBe("private_lobby.paste_hint");
  }

  beforeEach(() => {
    resetClipboardReadMemoryForTests();
    resetStartScreenPresenceForTests();
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ exists: true, clients: [] }),
    }) as unknown as typeof fetch;
    setFeaturePolicy(undefined);
    setPermissionsPolicy(undefined);
    joins = [];
    unhandled = [];
    document.addEventListener("join-lobby", onJoin);
    process.on("unhandledRejection", onUnhandled);
    document.body.innerHTML = "";
  });

  afterEach(() => {
    document.removeEventListener("join-lobby", onJoin);
    process.off("unhandledRejection", onUnhandled);
    modal?.close();
    modal?.remove();
    setClipboard(undefined);
    setFeaturePolicy(undefined);
    setPermissionsPolicy(undefined);
    resetClipboardReadMemoryForTests();
    jest.restoreAllMocks();
  });

  it("(1) navigator.clipboard absent → no paste button, hint shown", async () => {
    setClipboard(undefined);
    await mountAndOpen();
    expectUnavailableLayout();
  });

  it("(2) readText absent → no paste button, hint shown", async () => {
    setClipboard({ writeText: jest.fn() });
    await mountAndOpen();
    expectUnavailableLayout();
  });

  it("(3) the policy check says no → no paste button, hint shown, readText never called", async () => {
    const readText = jest.fn().mockResolvedValue(LOBBY_ID);
    setClipboard({ readText });
    setFeaturePolicy(false);
    await mountAndOpen();
    expectUnavailableLayout();
    expect(readText).not.toHaveBeenCalled();
  });

  // Review R1: the newer document.permissionsPolicy is asked first, and its
  // answer wins over the older featurePolicy when a browser exposes both.
  it("(3b) permissionsPolicy says no (featurePolicy says yes) → no paste button, hint shown, readText never called", async () => {
    const readText = jest.fn().mockResolvedValue(LOBBY_ID);
    setClipboard({ readText });
    setPermissionsPolicy(false);
    setFeaturePolicy(true);
    await mountAndOpen();
    expectUnavailableLayout();
    expect(readText).not.toHaveBeenCalled();
  });

  it("(3c) permissionsPolicy says yes (featurePolicy says no) → paste button kept, no hint", async () => {
    setClipboard({ readText: jest.fn().mockResolvedValue(LOBBY_ID) });
    setPermissionsPolicy(true);
    setFeaturePolicy(false);
    await mountAndOpen();
    expect(pasteButton()).not.toBeNull();
    expect(hint()).toBeNull();
  });

  it("(4) a press failing with NotAllowedError → hint, box focused, box unchanged, button gone for the session", async () => {
    const readText = jest
      .fn()
      .mockRejectedValue(permissionError("NotAllowedError"));
    setClipboard({ readText });
    await mountAndOpen();
    expect(pasteButton()).not.toBeNull();
    expect(hint()).toBeNull();
    input().value = "typed";

    await pressPaste();

    expect(readText).toHaveBeenCalledTimes(1);
    expectUnavailableLayout();
    expect(document.activeElement).toBe(input());
    expect(input().value).toBe("typed");
    expect(console.error).not.toHaveBeenCalled();

    // Reopening the window, and a fresh window, remember it this session.
    modal.close();
    await render();
    modal.open();
    await render();
    expectUnavailableLayout();
    modal.remove();
    await mountAndOpen();
    expectUnavailableLayout();

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(unhandled).toEqual([]);
  });

  it("(4b) a SecurityError is remembered the same way", async () => {
    setClipboard({
      readText: jest.fn().mockRejectedValue(permissionError("SecurityError")),
    });
    await mountAndOpen();
    await pressPaste();
    expectUnavailableLayout();
  });

  it("(5) a press failing with another error → hint, box focused, button kept", async () => {
    setClipboard({
      readText: jest.fn().mockRejectedValue(new Error("something else")),
    });
    await mountAndOpen();

    await pressPaste();

    expect(pasteButton()).not.toBeNull();
    expect(hint()?.textContent?.trim()).toBe("private_lobby.paste_hint");
    expect(document.activeElement).toBe(input());

    // Not remembered: a reopened window starts without the hint.
    modal.close();
    await render();
    modal.open();
    await render();
    expect(pasteButton()).not.toBeNull();
    expect(hint()).toBeNull();
  });

  it("(6) a working read fills the box through setLobbyId, a #join= link reduced to the id, no hint", async () => {
    const readText = jest.fn().mockResolvedValue(LOBBY_ID);
    setClipboard({ readText });
    setFeaturePolicy(true);
    await mountAndOpen();

    await pressPaste();
    expect(input().value).toBe(LOBBY_ID);
    expect(hint()).toBeNull();

    readText.mockResolvedValue(`https://example.test/#join=${LOBBY_ID}`);
    input().value = "";
    await pressPaste();
    expect(input().value).toBe(LOBBY_ID);
    expect(hint()).toBeNull();
    expect(pasteButton()).not.toBeNull();
  });

  it("(7) open(id) still fills the box and starts the join with paste unavailable (0382 seam)", async () => {
    setClipboard(undefined);
    modal = new JoinPrivateLobbyModal();
    exposeLitAccessors(modal);
    document.body.appendChild(modal);
    await modal.updateComplete;
    exposeLitAccessors(oModal());
    await render();

    modal.open(LOBBY_ID);
    await flush();
    await render();

    expect(input().value).toBe(LOBBY_ID);
    expect(joins).toHaveLength(1);
    expect(joins[0].detail.gameID).toBe(LOBBY_ID);
    expectUnavailableLayout();
  });
});

describe("paste hint localization (task 0413)", () => {
  const load = (file: string) =>
    JSON.parse(
      fs.readFileSync(
        path.join(__dirname, "../../resources/lang", file),
        "utf-8",
      ),
    ) as Record<string, Record<string, string>>;
  const en = load("en.json");
  const ru = load("ru.json");

  it("carries the owner-approved text in both files (owner, 2026-10-08)", () => {
    expect(en.private_lobby.paste_hint).toBe(
      "Paste the ID: Ctrl+V / ⌘V or long-press",
    );
    expect(ru.private_lobby.paste_hint).toBe(
      "Вставьте ID: Ctrl+V / ⌘V или долгое нажатие",
    );
  });

  it("does not name the game", () => {
    expect(en.private_lobby.paste_hint.toLowerCase()).not.toContain(
      "geoconflict",
    );
    expect(ru.private_lobby.paste_hint.toLowerCase()).not.toContain(
      "geoconflict",
    );
  });
});
