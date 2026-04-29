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
      GAME_ABANDON: "Game:Abandon",
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
  trackGameAbandon,
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
    trackGameStart("game-1", "client-1", GameType.Public, 12);

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
    trackGameStart("game-1", "client-1", GameType.Singleplayer, 1);

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
    trackGameStart("game-1", "client-1", GameType.Public, 4);
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
    trackGameStart("game-1", "client-1", GameType.Public, 4);
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

  it("does not reset lifecycle state for a duplicate start message from the same game", () => {
    jest.spyOn(Date, "now").mockReturnValue(1000);
    trackGameStart("game-1", "client-1", GameType.Public, 4);
    (flashist_logEventAnalytics as jest.Mock).mockClear();

    jest.spyOn(Date, "now").mockReturnValue(20_000);
    trackGameStart("game-1", "client-1", GameType.Public, 4);

    expect(flashist_logEventAnalytics).not.toHaveBeenCalled();

    jest.spyOn(Date, "now").mockReturnValue(31_000);
    trackGameEnd();

    expect(flashist_logEventAnalytics).toHaveBeenCalledWith(
      flashistConstants.analyticEvents.MATCH_DURATION,
      30,
    );
  });

  it("starts a fresh lifecycle for a different game id", () => {
    jest.spyOn(Date, "now").mockReturnValue(1000);
    trackGameStart("game-1", "client-1", GameType.Public, 4);
    (flashist_logEventAnalytics as jest.Mock).mockClear();

    jest.spyOn(Date, "now").mockReturnValue(20_000);
    trackGameStart("game-2", "client-1", GameType.Singleplayer, 1);

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

  it("restores lifecycle state after a crash reload reconnect", () => {
    jest.spyOn(Date, "now").mockReturnValue(1000);
    trackGameStart("game-1", "client-1", GameType.Public, 4);

    jest.spyOn(Date, "now").mockReturnValue(3500);
    trackSpawnConfirmed(true);

    resetMatchLifecycleAnalyticsForTests(true);
    (flashist_logEventAnalytics as jest.Mock).mockClear();

    jest.spyOn(Date, "now").mockReturnValue(20_000);
    trackGameStart("game-1", "client-1", GameType.Public, 4);
    trackSpawnConfirmed(true);

    expect(flashist_logEventAnalytics).not.toHaveBeenCalled();

    jest.spyOn(Date, "now").mockReturnValue(31_000);
    trackGameEnd();

    expect(flashist_logEventAnalytics).toHaveBeenCalledWith(
      flashistConstants.analyticEvents.MATCH_DURATION,
      30,
    );
    expect(
      (flashist_logEventAnalytics as jest.Mock).mock.calls.filter(
        ([event]) =>
          event ===
          flashistConstants.analyticEvents.MATCH_SPAWNED_CONFIRMED,
      ),
    ).toHaveLength(0);
  });

  it("emits abandon duration without closing recoverable reconnect lifecycle", () => {
    jest.spyOn(Date, "now").mockReturnValue(1000);
    trackGameStart("game-1", "client-1", GameType.Public, 4);
    (flashist_logEventAnalytics as jest.Mock).mockClear();

    jest.spyOn(Date, "now").mockReturnValue(11_000);
    trackGameAbandon({ persistDuration: false });

    expect(flashist_logEventAnalytics).toHaveBeenCalledWith(
      flashistConstants.analyticEvents.GAME_END,
      undefined,
    );
    expect(flashist_logEventAnalytics).toHaveBeenCalledWith(
      flashistConstants.analyticEvents.MATCH_DURATION,
      10,
    );
    expect(flashist_logEventAnalytics).toHaveBeenCalledWith(
      flashistConstants.analyticEvents.GAME_ABANDON,
    );

    resetMatchLifecycleAnalyticsForTests(true);
    (flashist_logEventAnalytics as jest.Mock).mockClear();

    jest.spyOn(Date, "now").mockReturnValue(20_000);
    trackGameStart("game-1", "client-1", GameType.Public, 4);

    jest.spyOn(Date, "now").mockReturnValue(31_000);
    trackGameEnd(300);

    expect(flashist_logEventAnalytics).toHaveBeenCalledWith(
      flashistConstants.analyticEvents.GAME_END,
      300,
    );
    expect(flashist_logEventAnalytics).toHaveBeenCalledWith(
      flashistConstants.analyticEvents.MATCH_DURATION,
      30,
    );
  });

  it("persists explicit abandon so unload does not double count it", () => {
    jest.spyOn(Date, "now").mockReturnValue(1000);
    trackGameStart("game-1", "client-1", GameType.Public, 4);
    (flashist_logEventAnalytics as jest.Mock).mockClear();

    jest.spyOn(Date, "now").mockReturnValue(11_000);
    trackGameAbandon();
    trackGameAbandon({ persistDuration: false });

    expect(
      (flashist_logEventAnalytics as jest.Mock).mock.calls.filter(
        ([event]) => event === flashistConstants.analyticEvents.GAME_ABANDON,
      ),
    ).toHaveLength(1);
    expect(
      (flashist_logEventAnalytics as jest.Mock).mock.calls.filter(
        ([event]) => event === flashistConstants.analyticEvents.MATCH_DURATION,
      ),
    ).toHaveLength(1);
  });
});
