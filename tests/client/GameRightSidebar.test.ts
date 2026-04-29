/**
 * @jest-environment jsdom
 */
jest.mock("../../src/client/flashist/FlashistFacade", () => ({
  FlashistFacade: {
    instance: {
      showInterstitial: jest.fn(),
      changeHref: jest.fn(),
      rootPathname: "/",
    },
  },
}));
jest.mock("../../src/client/ReconnectSession", () => ({
  clearReconnectSession: jest.fn(),
}));
jest.mock("../../src/client/analytics/MatchLifecycleAnalytics", () => ({
  trackGameAbandon: jest.fn(),
}));
jest.mock("../../src/client/Transport", () => ({
  PauseGameEvent: class PauseGameEvent {
    constructor(public readonly paused: boolean) {}
  },
}));
jest.mock("../../src/client/graphics/layers/SettingsModal", () => ({
  ShowSettingsModalEvent: class ShowSettingsModalEvent {
    constructor(
      public readonly isVisible: boolean,
      public readonly isSinglePlayer: boolean,
      public readonly isPaused: boolean,
    ) {}
  },
}));

import { FlashistFacade } from "../../src/client/flashist/FlashistFacade";
import { clearReconnectSession } from "../../src/client/ReconnectSession";
import { trackGameAbandon } from "../../src/client/analytics/MatchLifecycleAnalytics";
import { GameRightSidebar } from "../../src/client/graphics/layers/GameRightSidebar";

describe("GameRightSidebar", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("tracks explicit abandon before waiting for the interstitial", () => {
    (FlashistFacade.instance.showInterstitial as jest.Mock).mockReturnValue(
      new Promise(() => undefined),
    );

    const sidebar = new GameRightSidebar();
    sidebar.game = {
      myPlayer: () => ({ isAlive: () => true }),
    } as never;

    void sidebar["onExitButtonClick"]();

    expect(trackGameAbandon).toHaveBeenCalledTimes(1);
    expect(FlashistFacade.instance.showInterstitial).toHaveBeenCalledTimes(1);
    expect(clearReconnectSession).not.toHaveBeenCalled();
    expect(FlashistFacade.instance.changeHref).not.toHaveBeenCalled();
  });
});
