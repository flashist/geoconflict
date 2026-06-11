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
});

async function appendTabs(): Promise<{
  tabs: StartScreenTabs;
  multiplayerContent: HTMLElement;
  singleplayerContent: HTMLElement;
}> {
  const multiplayerContent = document.createElement("div");
  multiplayerContent.id = "multiplayer-tab-content";
  const singleplayerContent = document.createElement("div");
  singleplayerContent.id = "singleplayer-tab-content";
  singleplayerContent.classList.add("hidden");
  document.body.append(multiplayerContent, singleplayerContent);

  const tabs = new StartScreenTabs();
  document.body.appendChild(tabs);
  await flushLit(tabs);
  return { tabs, multiplayerContent, singleplayerContent };
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
