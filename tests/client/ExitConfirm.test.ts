/**
 * @jest-environment jsdom
 */
// Task 0437: both in-match exit buttons (the sidebar's and the settings
// window's) ask before leaving, in the game's own popup. Real sidebar, real
// settings window, real popup, real MatchExit — only the edges are mocked.
jest.mock("../../src/client/Utils", () => ({
  translateText: jest.fn((key: string) => key),
}));
jest.mock("../../src/client/flashist/FlashistFacade", () => ({
  FlashistFacade: {
    instance: {
      showInterstitial: jest.fn(),
      changeHref: jest.fn(),
      rootPathname: "/root/",
    },
  },
}));
jest.mock("../../src/client/ReconnectSession", () => ({
  clearReconnectSession: jest.fn(),
}));
jest.mock("../../src/client/Transport", () => ({
  PauseGameEvent: class PauseGameEvent {
    constructor(public readonly paused: boolean) {}
  },
}));
jest.mock("../../src/client/InputHandler", () => ({
  AlternateViewEvent: class AlternateViewEvent {},
  RefreshGraphicsEvent: class RefreshGraphicsEvent {},
}));
jest.mock("../../src/client/graphics/layers/ReplayPanel", () => ({
  ShowReplayPanelEvent: class ShowReplayPanelEvent {},
}));
jest.mock("../../src/client/sound/SoundManager", () => ({
  __esModule: true,
  default: {
    setBackgroundMusicVolume: jest.fn(),
    setSoundEffectsVolume: jest.fn(),
  },
}));

import fs from "fs";
import path from "path";
import { EventBus } from "../../src/core/EventBus";
import { UserSettings } from "../../src/core/game/UserSettings";
import { ExitConfirmModal } from "../../src/client/ExitConfirmModal";
import { FlashistFacade } from "../../src/client/flashist/FlashistFacade";
import { GameRightSidebar } from "../../src/client/graphics/layers/GameRightSidebar";
import {
  SettingsModal,
  ShowSettingsModalEvent,
} from "../../src/client/graphics/layers/SettingsModal";
import { clearReconnectSession } from "../../src/client/ReconnectSession";
import { PauseGameEvent } from "../../src/client/Transport";

const ROOT = path.join(__dirname, "../..");
const facade = FlashistFacade.instance as unknown as {
  showInterstitial: jest.Mock;
  changeHref: jest.Mock;
};
const clearSession = clearReconnectSession as jest.Mock;

let calls: string[];
let finishAd: () => void;

function stubGame(myPlayer: { isAlive: () => boolean } | null) {
  return {
    myPlayer: () => myPlayer,
    inSpawnPhase: () => false,
    ticks: () => 0,
    updatesSinceLastTick: () => null,
    gameID: () => "game-1",
    config: () => ({
      gameConfig: () => ({ gameType: "Multiplayer", maxTimerValue: undefined }),
      isReplay: () => false,
    }),
  };
}

async function mountPopup(): Promise<ExitConfirmModal> {
  const popup = new ExitConfirmModal();
  document.body.appendChild(popup);
  await popup.updateComplete;
  return popup;
}

async function mountSidebar(
  myPlayer: { isAlive: () => boolean } | null = { isAlive: () => true },
): Promise<GameRightSidebar> {
  const sidebar = new GameRightSidebar();
  sidebar.game = stubGame(myPlayer) as never;
  sidebar.eventBus = new EventBus();
  document.body.appendChild(sidebar);
  await sidebar.updateComplete;
  return sidebar;
}

const tapSidebarExit = (sidebar: GameRightSidebar) =>
  (
    sidebar.querySelector('img[alt="exit"]')!.parentElement as HTMLElement
  ).click();

const overlay = (popup: ExitConfirmModal) =>
  popup.shadowRoot!.querySelector(".modal-overlay") as HTMLElement;

const tap = (popup: ExitConfirmModal, id: string) =>
  (popup.shadowRoot!.querySelector(`#${id}`) as HTMLElement).click();

const pressEscape = () =>
  document.body.dispatchEvent(
    new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
  );

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("in-match exit asks first (task 0437)", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    jest.clearAllMocks();
    calls = [];
    facade.showInterstitial.mockImplementation(() => {
      calls.push("interstitial");
      return new Promise<boolean>((resolve) => {
        finishAd = () => resolve(true);
      });
    });
    clearSession.mockImplementation(() => calls.push("clearReconnectSession"));
    facade.changeHref.mockImplementation((href: string) =>
      calls.push(`changeHref ${href}`),
    );
  });

  it("is registered as <exit-confirm-modal>", () => {
    expect(customElements.get("exit-confirm-modal")).toBe(ExitConfirmModal);
  });

  it("sidebar exit shows the popup and does not leave", async () => {
    const popup = await mountPopup();
    const sidebar = await mountSidebar();

    tapSidebarExit(sidebar);
    await popup.updateComplete;

    expect(popup.isVisible).toBe(true);
    expect(overlay(popup).classList.contains("visible")).toBe(true);
    const text = popup.shadowRoot!.textContent!;
    expect(text).toContain("help_modal.exit_confirmation");
    expect(text).toContain("exit_confirm_modal.leave");
    expect(text).toContain("exit_confirm_modal.stay");
    await flush();
    expect(calls).toEqual([]);
  });

  it.each([
    [
      "Stay",
      (popup: ExitConfirmModal) => tap(popup, "exit-confirm-modal-stay"),
    ],
    ["Escape", () => pressEscape()],
    [
      "a tap outside the box",
      (popup: ExitConfirmModal) => overlay(popup).click(),
    ],
  ])("%s closes the popup and does not leave", async (_name, close) => {
    const popup = await mountPopup();
    const sidebar = await mountSidebar();

    tapSidebarExit(sidebar);
    close(popup);
    await popup.updateComplete;

    expect(popup.isVisible).toBe(false);
    await flush();
    expect(calls).toEqual([]);
  });

  it("a tap inside the box (not on a button) does not close it", async () => {
    const popup = await mountPopup();
    const sidebar = await mountSidebar();

    tapSidebarExit(sidebar);
    (popup.shadowRoot!.querySelector(".modal-box") as HTMLElement).click();

    expect(popup.isVisible).toBe(true);
  });

  it("Leave runs ad, then clear, then start screen — once, even on a double tap", async () => {
    const popup = await mountPopup();
    const sidebar = await mountSidebar();

    tapSidebarExit(sidebar);
    tap(popup, "exit-confirm-modal-leave");
    tap(popup, "exit-confirm-modal-leave");
    await popup.updateComplete;

    expect(popup.isVisible).toBe(false);
    // The ad is still showing: nothing after it has run yet.
    expect(calls).toEqual(["interstitial"]);

    // Tapping exit again while the ad shows does not reopen the popup.
    tapSidebarExit(sidebar);
    expect(popup.isVisible).toBe(false);

    finishAd();
    await flush();

    expect(calls).toEqual([
      "interstitial",
      "clearReconnectSession",
      "changeHref /root/",
    ]);
  });

  it.each([
    ["dead", { isAlive: () => false }],
    ["a spectator (no player)", null],
  ])("asks too when the player is %s", async (_name, myPlayer) => {
    const popup = await mountPopup();
    const sidebar = await mountSidebar(myPlayer);

    tapSidebarExit(sidebar);

    expect(popup.isVisible).toBe(true);
    await flush();
    expect(calls).toEqual([]);
  });

  it("repeated exit taps open one popup; the first leave callback is kept", async () => {
    const popup = await mountPopup();
    const firstLeave = jest.fn();
    const secondLeave = jest.fn();

    popup.show(firstLeave);
    popup.show(secondLeave);
    tap(popup, "exit-confirm-modal-leave");

    expect(firstLeave).toHaveBeenCalledTimes(1);
    expect(secondLeave).not.toHaveBeenCalled();
    expect(popup.shadowRoot!.querySelectorAll(".modal-overlay")).toHaveLength(
      1,
    );
  });

  it("without the popup on the page, exit leaves at once (never a dead button)", async () => {
    const error = jest.spyOn(console, "error").mockImplementation(() => {});
    const sidebar = await mountSidebar();

    tapSidebarExit(sidebar);
    finishAd();
    await flush();

    expect(calls).toEqual([
      "interstitial",
      "clearReconnectSession",
      "changeHref /root/",
    ]);
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });

  describe("settings-window exit", () => {
    async function mountSettings() {
      const eventBus = new EventBus();
      const emitted: unknown[] = [];
      const emit = eventBus.emit.bind(eventBus);
      jest.spyOn(eventBus, "emit").mockImplementation((event) => {
        emitted.push(event);
        emit(event);
      });
      const settings = new SettingsModal();
      settings.eventBus = eventBus;
      settings.userSettings = new Proxy(
        {},
        { get: () => () => 0 },
      ) as unknown as UserSettings;
      document.body.appendChild(settings);
      settings.init();
      // Single player: the settings window pauses the game while open.
      eventBus.emit(new ShowSettingsModalEvent(true, true, false));
      await settings.updateComplete;
      return { settings, emitted };
    }

    const settingsVisible = (settings: SettingsModal) =>
      (settings as unknown as { isVisible: boolean }).isVisible;

    const tapSettingsExit = (settings: SettingsModal) =>
      (
        settings
          .querySelector('img[alt="exitIcon"]')!
          .closest("button") as HTMLElement
      ).click();

    it("asks, and Leave behaves exactly like the sidebar exit", async () => {
      const { settings } = await mountSettings();
      const popup = await mountPopup();

      tapSettingsExit(settings);
      expect(popup.isVisible).toBe(true);
      await flush();
      expect(calls).toEqual([]);

      tap(popup, "exit-confirm-modal-leave");
      finishAd();
      await flush();

      expect(calls).toEqual([
        "interstitial",
        "clearReconnectSession",
        "changeHref /root/",
      ]);
    });

    it("Escape closes only the popup: settings stay open and the game stays paused", async () => {
      const { settings, emitted } = await mountSettings();
      const popup = await mountPopup();

      tapSettingsExit(settings);
      pressEscape();

      expect(popup.isVisible).toBe(false);
      expect(settingsVisible(settings)).toBe(true);
      const pauses = emitted
        .filter((event) => event instanceof PauseGameEvent)
        .map((event) => (event as unknown as { paused: boolean }).paused);
      expect(pauses).toEqual([true]);

      // A second Escape, with the popup closed, reaches settings as before.
      pressEscape();
      expect(settingsVisible(settings)).toBe(false);
    });

    it("Stay returns to the settings window", async () => {
      const { settings } = await mountSettings();
      const popup = await mountPopup();

      tapSettingsExit(settings);
      tap(popup, "exit-confirm-modal-stay");

      expect(popup.isVisible).toBe(false);
      expect(settingsVisible(settings)).toBe(true);
      await flush();
      expect(calls).toEqual([]);
    });
  });
});

describe("page and text (task 0437)", () => {
  it.each(["src/client/index.html", "src/client/yandex-games_iframe.html"])(
    "%s has exactly one <exit-confirm-modal>",
    (file) => {
      const html = fs.readFileSync(path.join(ROOT, file), "utf-8");
      const page = new DOMParser().parseFromString(html, "text/html");
      expect(page.body.querySelectorAll("exit-confirm-modal")).toHaveLength(1);
    },
  );

  it.each([
    ["en", "Leave", "Stay"],
    ["ru", "Выйти", "Остаться"],
  ])("%s.json has the popup's text", (lang, leave, stay) => {
    const strings = JSON.parse(
      fs.readFileSync(path.join(ROOT, `resources/lang/${lang}.json`), "utf-8"),
    );
    expect(strings.exit_confirm_modal).toEqual({ leave, stay });
    expect(typeof strings.help_modal.exit_confirmation).toBe("string");
  });
});
