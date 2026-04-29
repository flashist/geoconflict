/**
 * @jest-environment jsdom
 */
jest.mock("../../src/client/flashist/FlashistFacade", () => ({
  flashistConstants: {
    analyticEvents: {
      GAME_START: "Game:Start",
      GAME_END: "Game:End",
      GAME_MODE_MULTIPLAYER: "Game:Mode:Multiplayer",
      GAME_MODE_SOLO: "Game:Mode:Solo",
      MATCH_SPAWNED_CONFIRMED: "Match:Spawned",
      MATCH_DURATION: "Match:Duration",
    },
  },
  flashist_logEventAnalytics: jest.fn(),
}));

import { GameType } from "../../src/core/game/Game";
import {
  flashistConstants,
  flashist_logEventAnalytics,
} from "../../src/client/flashist/FlashistFacade";
import {
  resetMatchLifecycleAnalyticsForTests,
  trackGameEnd,
  trackGameStart,
  trackSpawnConfirmed,
} from "../../src/client/analytics/MatchLifecycleAnalytics";

describe("MatchLifecycleAnalytics", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    resetMatchLifecycleAnalyticsForTests();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    resetMatchLifecycleAnalyticsForTests();
  });

  it("fires Game:Start followed by the multiplayer mode classification", () => {
    trackGameStart(GameType.Public, 12);

    expect(flashist_logEventAnalytics).toHaveBeenNthCalledWith(
      1,
      flashistConstants.analyticEvents.GAME_START,
      12,
    );
    expect(flashist_logEventAnalytics).toHaveBeenNthCalledWith(
      2,
      flashistConstants.analyticEvents.GAME_MODE_MULTIPLAYER,
    );
  });

  it("fires Game:Start followed by the solo mode classification", () => {
    trackGameStart(GameType.Singleplayer, 1);

    expect(flashist_logEventAnalytics).toHaveBeenNthCalledWith(
      1,
      flashistConstants.analyticEvents.GAME_START,
      1,
    );
    expect(flashist_logEventAnalytics).toHaveBeenNthCalledWith(
      2,
      flashistConstants.analyticEvents.GAME_MODE_SOLO,
    );
  });

  it("fires confirmed spawn once with elapsed seconds", () => {
    jest.spyOn(Date, "now").mockReturnValue(1000);
    trackGameStart(GameType.Public, 4);
    (flashist_logEventAnalytics as jest.Mock).mockClear();

    jest.spyOn(Date, "now").mockReturnValue(3500);
    trackSpawnConfirmed(false);
    trackSpawnConfirmed(true);
    trackSpawnConfirmed(true);

    expect(flashist_logEventAnalytics).toHaveBeenCalledTimes(1);
    expect(flashist_logEventAnalytics).toHaveBeenCalledWith(
      flashistConstants.analyticEvents.MATCH_SPAWNED_CONFIRMED,
      3,
    );
  });

  it("fires match duration once alongside Game:End", () => {
    jest.spyOn(Date, "now").mockReturnValue(1000);
    trackGameStart(GameType.Public, 4);
    (flashist_logEventAnalytics as jest.Mock).mockClear();

    jest.spyOn(Date, "now").mockReturnValue(30_700);
    trackGameEnd(120);
    trackGameEnd(120);

    expect(flashist_logEventAnalytics).toHaveBeenCalledWith(
      flashistConstants.analyticEvents.GAME_END,
      120,
    );
    expect(flashist_logEventAnalytics).toHaveBeenCalledWith(
      flashistConstants.analyticEvents.MATCH_DURATION,
      30,
    );
    expect(
      (flashist_logEventAnalytics as jest.Mock).mock.calls.filter(
        ([event]) => event === flashistConstants.analyticEvents.MATCH_DURATION,
      ),
    ).toHaveLength(1);
  });
});
