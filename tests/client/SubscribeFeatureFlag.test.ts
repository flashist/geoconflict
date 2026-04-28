/**
 * @jest-environment jsdom
 */
jest.mock("../../src/client/components/PatternButton", () => ({}));
jest.mock("../../src/client/Cosmetics", () => ({
  fetchCosmetics: jest.fn(),
  handlePurchase: jest.fn(),
  patternRelationship: jest.fn(),
}));
jest.mock("../../src/client/Utils", () => ({
  isInIframe: jest.fn(() => false),
  translateText: jest.fn((key: string) => key),
}));
jest.mock("../../src/client/jwt", () => ({
  getUserMe: jest.fn(),
}));
jest.mock("../../src/client/Transport", () => ({
  SendWinnerEvent: class SendWinnerEvent {},
}));
jest.mock("../../src/client/ReconnectSession", () => ({
  clearReconnectSession: jest.fn(),
}));
jest.mock("../../src/client/SinglePlayMissionStorage", () => ({
  getNextMissionLevel: jest.fn(),
  markMissionCompleted: jest.fn(),
  setNextMissionLevel: jest.fn(),
}));
jest.mock("../../src/client/TutorialStorage", () => ({
  TUTORIAL_COMPLETED_KEY: "tutorial-completed",
  TUTORIAL_START_TIME_KEY: "tutorial-start-time",
}));

import { FlashistFacade } from "../../src/client/flashist/FlashistFacade";
import { EmailSubscribeModal } from "../../src/client/EmailSubscribeModal";
import { GameStartingModal } from "../../src/client/GameStartingModal";
import { WinModal } from "../../src/client/graphics/layers/WinModal";

describe("subscribe feature flag", () => {
  const appendElement = async <T extends HTMLElement>(
    element: T,
  ): Promise<T> => {
    document.body.appendChild(element);
    await flushAsyncState();
    await waitForUpdateComplete(element);
    await flushAsyncState();
    await waitForUpdateComplete(element);
    return element;
  };

  const flushAsyncState = async (): Promise<void> => {
    await Promise.resolve();
    await Promise.resolve();
  };

  const waitForUpdateComplete = async (element: HTMLElement): Promise<void> => {
    if ("updateComplete" in element) {
      await (element as HTMLElement & { updateComplete: Promise<unknown> })
        .updateComplete;
    }
  };

  beforeEach(() => {
    document.body.innerHTML = "";
  });

  afterEach(() => {
    jest.restoreAllMocks();
    document.body.innerHTML = "";
  });

  it("hides the start modal subscribe button when the flag is off", async () => {
    mockSubscribeFlag(false);

    const modal = await appendElement(new GameStartingModal());
    await modal.updateComplete;

    expect(modal.shadowRoot?.querySelector(".subscribe-btn")).toBeNull();
  });

  it("shows the start modal subscribe button when the flag is on", async () => {
    mockSubscribeFlag(true);

    const modal = await appendElement(new GameStartingModal());
    await (
      modal as unknown as {
        loadCtaFlags: () => Promise<void>;
      }
    ).loadCtaFlags();
    modal.requestUpdate();
    await modal.updateComplete;

    expect(modal.shadowRoot?.querySelector(".subscribe-btn")).not.toBeNull();
  });

  it("hides the win modal subscribe button when the flag is off", async () => {
    mockSubscribeFlag(false);

    const modal = await appendElement(new WinModal());
    modal.showButtons = true;
    modal.requestUpdate();
    await modal.updateComplete;

    expect(modal.querySelector("button.w-full")).toBeNull();
  });

  it("shows the win modal subscribe button when the flag is on", async () => {
    mockSubscribeFlag(true);

    const modal = await appendElement(new WinModal());
    modal.showButtons = true;
    modal.requestUpdate();
    await modal.updateComplete;

    expect(modal.querySelector("button.w-full")).not.toBeNull();
  });

  it("does not open the subscribe modal when the flag is off", async () => {
    mockSubscribeFlag(false);

    const modal = await appendElement(new EmailSubscribeModal());
    await modal.show();
    await modal.updateComplete;

    expect(modal.isVisible).toBe(false);
  });

  it("opens the subscribe modal when the flag is on", async () => {
    mockSubscribeFlag(true);

    const modal = await appendElement(new EmailSubscribeModal());
    await modal.show();
    await modal.updateComplete;

    expect(modal.isVisible).toBe(true);
  });

  function mockSubscribeFlag(isEnabled: boolean): void {
    jest.spyOn(FlashistFacade, "instance", "get").mockReturnValue({
      isEmailSubscribeButtonEnabled: jest.fn().mockResolvedValue(isEnabled),
      isTelegramLinkEnabled: jest.fn().mockResolvedValue(false),
    } as unknown as FlashistFacade);
  }
});
