/**
 * @jest-environment jsdom
 */
jest.mock("../../src/client/Utils", () => ({
  translateText: jest.fn((key: string) => key),
}));
jest.mock("../../src/client/flashist/FlashistFacade", () => ({
  flashistConstants: {
    uiElementIds: {
      multiplayerTab: "MultiplayerTab",
      singleplayerTab: "SingleplayerTab",
      privateTab: "PrivateTab",
    },
  },
  FlashistFacade: {
    instance: {
      logUiTapEvent: jest.fn(),
    },
  },
}));

import { FlashistFacade } from "../../src/client/flashist/FlashistFacade";
import {
  START_SCREEN_TAB_CHANGED_EVENT,
  StartScreenTabs,
} from "../../src/client/StartScreenTabs";
import { ACTIVE_TAB_STORAGE_KEY } from "../../src/client/StartScreenTabStorage";

const logUiTapEvent = FlashistFacade.instance.logUiTapEvent as jest.Mock;

describe("StartScreenTabs", () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = "";
    jest.clearAllMocks();
  });

  it("shows the multiplayer content by default without firing analytics", async () => {
    const { multiplayerContent, singleplayerContent } = await appendTabs();

    expect(multiplayerContent.classList.contains("hidden")).toBe(false);
    expect(singleplayerContent.classList.contains("hidden")).toBe(true);
    expect(logUiTapEvent).not.toHaveBeenCalled();
  });

  it("restores the persisted singleplayer tab without firing analytics", async () => {
    localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, "singleplayer");

    const { multiplayerContent, singleplayerContent } = await appendTabs();

    expect(multiplayerContent.classList.contains("hidden")).toBe(true);
    expect(singleplayerContent.classList.contains("hidden")).toBe(false);
    expect(logUiTapEvent).not.toHaveBeenCalled();
  });

  it("switches content, persists, and fires analytics on singleplayer tap", async () => {
    const { multiplayerContent, singleplayerContent } = await appendTabs();
    const tabChanges: string[] = [];
    document.addEventListener(START_SCREEN_TAB_CHANGED_EVENT, (event) => {
      tabChanges.push((event as CustomEvent).detail.tab);
    });

    clickTabButton("singleplayer-tab-button");

    expect(logUiTapEvent).toHaveBeenCalledTimes(1);
    expect(logUiTapEvent).toHaveBeenCalledWith("SingleplayerTab");
    expect(localStorage.getItem(ACTIVE_TAB_STORAGE_KEY)).toBe("singleplayer");
    expect(multiplayerContent.classList.contains("hidden")).toBe(true);
    expect(singleplayerContent.classList.contains("hidden")).toBe(false);
    expect(tabChanges).toEqual(["singleplayer"]);
  });

  it("switches back to multiplayer on multiplayer tap", async () => {
    localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, "singleplayer");
    const { multiplayerContent, singleplayerContent } = await appendTabs();

    clickTabButton("multiplayer-tab-button");

    expect(logUiTapEvent).toHaveBeenCalledWith("MultiplayerTab");
    expect(localStorage.getItem(ACTIVE_TAB_STORAGE_KEY)).toBe("multiplayer");
    expect(multiplayerContent.classList.contains("hidden")).toBe(false);
    expect(singleplayerContent.classList.contains("hidden")).toBe(true);
  });

  it("marks the active tab with aria-selected", async () => {
    await appendTabs();

    const multiplayerButton = document.getElementById(
      "multiplayer-tab-button",
    )!;
    const singleplayerButton = document.getElementById(
      "singleplayer-tab-button",
    )!;
    expect(multiplayerButton.getAttribute("aria-selected")).toBe("true");
    expect(singleplayerButton.getAttribute("aria-selected")).toBe("false");

    clickTabButton("singleplayer-tab-button");
    await flushLit(document.querySelector("start-screen-tabs")!);

    expect(multiplayerButton.getAttribute("aria-selected")).toBe("false");
    expect(singleplayerButton.getAttribute("aria-selected")).toBe("true");
  });

  it("does not throw when the content containers are missing", async () => {
    const tabs = new StartScreenTabs();
    document.body.appendChild(tabs);
    await flushLit(tabs);

    expect(() => clickTabButton("singleplayer-tab-button")).not.toThrow();
    expect(logUiTapEvent).toHaveBeenCalledWith("SingleplayerTab");
  });

  // Task 0412: the third tab, "Private", shown only after enablePrivateTab().
  describe("the Private tab (task 0412)", () => {
    it("is not in the page by default — two tabs only", async () => {
      await appendTabs();

      expect(document.getElementById("private-tab-button")).toBeNull();
      expect(document.querySelectorAll('[role="tab"]')).toHaveLength(2);
    });

    it("enablePrivateTab() renders it last, labelled main.tab_private", async () => {
      const { tabs } = await appendTabs();

      tabs.enablePrivateTab();
      await flushLit(tabs);

      const tabButtons = Array.from(document.querySelectorAll('[role="tab"]'));
      expect(tabButtons.map((button) => button.id)).toEqual([
        "multiplayer-tab-button",
        "singleplayer-tab-button",
        "private-tab-button",
      ]);
      expect(tabButtons[2].textContent?.trim()).toBe("main.tab_private");
    });

    it("a stored 'private' with the tab never enabled shows Multiplayer, leaves storage alone, fires nothing", async () => {
      localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, "private");

      const { multiplayerContent, singleplayerContent, privateContent } =
        await appendTabs();

      expect(multiplayerContent.classList.contains("hidden")).toBe(false);
      expect(singleplayerContent.classList.contains("hidden")).toBe(true);
      expect(privateContent.classList.contains("hidden")).toBe(true);
      expect(
        document
          .getElementById("multiplayer-tab-button")!
          .getAttribute("aria-selected"),
      ).toBe("true");
      expect(localStorage.getItem(ACTIVE_TAB_STORAGE_KEY)).toBe("private");
      expect(logUiTapEvent).not.toHaveBeenCalled();
    });

    it("a stored 'private' is restored when the tab is enabled late, with no analytics", async () => {
      localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, "private");
      const { tabs, multiplayerContent, privateContent } = await appendTabs();
      const tabChanges: string[] = [];
      document.addEventListener(START_SCREEN_TAB_CHANGED_EVENT, (event) => {
        tabChanges.push((event as CustomEvent).detail.tab);
      });

      tabs.enablePrivateTab();
      await flushLit(tabs);

      expect(multiplayerContent.classList.contains("hidden")).toBe(true);
      expect(privateContent.classList.contains("hidden")).toBe(false);
      expect(
        document
          .getElementById("private-tab-button")!
          .getAttribute("aria-selected"),
      ).toBe("true");
      expect(
        document
          .getElementById("multiplayer-tab-button")!
          .getAttribute("aria-selected"),
      ).toBe("false");
      expect(tabChanges).toEqual(["private"]);
      expect(logUiTapEvent).not.toHaveBeenCalled();
    });

    it("a stored 'private' does not override a tab the player tapped before the tab appeared", async () => {
      localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, "private");
      const { tabs, singleplayerContent, privateContent } = await appendTabs();

      clickTabButton("singleplayer-tab-button");
      tabs.enablePrivateTab();
      await flushLit(tabs);

      expect(singleplayerContent.classList.contains("hidden")).toBe(false);
      expect(privateContent.classList.contains("hidden")).toBe(true);
      expect(
        document
          .getElementById("singleplayer-tab-button")!
          .getAttribute("aria-selected"),
      ).toBe("true");
    });

    it("a tap logs PrivateTab, persists, and shows the private content; a re-tap logs again", async () => {
      const { tabs, multiplayerContent, singleplayerContent, privateContent } =
        await appendTabs();
      tabs.enablePrivateTab();
      await flushLit(tabs);

      clickTabButton("private-tab-button");

      expect(logUiTapEvent).toHaveBeenCalledTimes(1);
      expect(logUiTapEvent).toHaveBeenCalledWith("PrivateTab");
      expect(localStorage.getItem(ACTIVE_TAB_STORAGE_KEY)).toBe("private");
      expect(multiplayerContent.classList.contains("hidden")).toBe(true);
      expect(singleplayerContent.classList.contains("hidden")).toBe(true);
      expect(privateContent.classList.contains("hidden")).toBe(false);

      clickTabButton("private-tab-button");

      expect(logUiTapEvent).toHaveBeenCalledTimes(2);
      expect(logUiTapEvent).toHaveBeenLastCalledWith("PrivateTab");
    });

    it("calling enablePrivateTab() twice is safe — one tab, no second switch", async () => {
      localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, "private");
      const { tabs, singleplayerContent } = await appendTabs();
      tabs.enablePrivateTab();
      await flushLit(tabs);
      clickTabButton("singleplayer-tab-button");

      tabs.enablePrivateTab();
      await flushLit(tabs);

      expect(document.querySelectorAll("#private-tab-button")).toHaveLength(1);
      expect(singleplayerContent.classList.contains("hidden")).toBe(false);
    });
  });
});

async function appendTabs(): Promise<{
  tabs: StartScreenTabs;
  multiplayerContent: HTMLElement;
  singleplayerContent: HTMLElement;
  privateContent: HTMLElement;
}> {
  const multiplayerContent = document.createElement("div");
  multiplayerContent.id = "multiplayer-tab-content";
  const singleplayerContent = document.createElement("div");
  singleplayerContent.id = "singleplayer-tab-content";
  singleplayerContent.classList.add("hidden");
  const privateContent = document.createElement("div");
  privateContent.id = "private-tab-content";
  privateContent.classList.add("hidden");
  document.body.append(multiplayerContent, singleplayerContent, privateContent);

  const tabs = new StartScreenTabs();
  document.body.appendChild(tabs);
  await flushLit(tabs);
  return { tabs, multiplayerContent, singleplayerContent, privateContent };
}

function clickTabButton(id: string): void {
  const button = document.getElementById(id);
  if (!button) {
    throw new Error(`Missing tab button ${id}`);
  }
  button.click();
}

async function flushLit(element: Element): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  if ("updateComplete" in element) {
    await (element as Element & { updateComplete: Promise<unknown> })
      .updateComplete;
  }
}
