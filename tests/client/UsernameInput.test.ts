/**
 * @jest-environment jsdom
 */
jest.mock("../../src/client/Utils", () => ({
  translateText: jest.fn((key: string) => key),
}));
jest.mock("../../src/client/flashist/FlashistFacade", () => ({
  YANDEX_AUTH_CHANGED_EVENT: "yandex-auth-changed",
  flashist_logErrorTypes: { DEBUG: "Debug" },
  flashist_logErrorToAnalytics: jest.fn(),
  FlashistFacade: {
    instance: {
      getCurPlayerName: jest.fn().mockResolvedValue(""),
    },
  },
}));

import { FlashistFacade } from "../../src/client/flashist/FlashistFacade";
import { UsernameInput } from "../../src/client/UsernameInput";

const getCurPlayerName = FlashistFacade.instance.getCurPlayerName as jest.Mock;

describe("UsernameInput", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    localStorage.clear();
    jest.clearAllMocks();
    getCurPlayerName.mockResolvedValue("");
  });

  it("prefers the stored username when the platform has no name", async () => {
    localStorage.setItem("username", "StoredName");

    const input = await appendInput();

    expect(input.getCurrentUsername()).toBe("StoredName");
  });

  it("re-resolves to the Yandex name after a mid-session login", async () => {
    localStorage.setItem("username", "Anon1234");
    const input = await appendInput();
    expect(input.getCurrentUsername()).toBe("Anon1234");

    const usernameChanges: string[] = [];
    document.addEventListener("username-change", (event) => {
      usernameChanges.push((event as CustomEvent).detail.username);
    });

    getCurPlayerName.mockResolvedValue("YandexPlayer");
    document.dispatchEvent(new CustomEvent("yandex-auth-changed"));
    await flushMicrotasks();

    expect(input.getCurrentUsername()).toBe("YandexPlayer");
    expect(localStorage.getItem("username")).toBe("YandexPlayer");
    expect(usernameChanges).toContain("YandexPlayer");
  });

  it("stops listening after disconnect", async () => {
    localStorage.setItem("username", "Anon1234");
    const input = await appendInput();
    input.remove();

    getCurPlayerName.mockResolvedValue("YandexPlayer");
    document.dispatchEvent(new CustomEvent("yandex-auth-changed"));
    await flushMicrotasks();

    expect(input.getCurrentUsername()).toBe("Anon1234");
  });
});

async function appendInput(): Promise<UsernameInput> {
  const input = new UsernameInput();
  document.body.appendChild(input);
  await flushMicrotasks();
  if ("updateComplete" in input) {
    await (input as UsernameInput & { updateComplete: Promise<unknown> })
      .updateComplete;
  }
  return input;
}

async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}
