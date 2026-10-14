jest.mock("../../src/client/flashist/FlashistFacade", () => ({
  flashistConstants: {
    analyticEvents: {
      GAME_START: "Game:Start",
      GAME_MODE_MULTIPLAYER: "Game:Mode:Multiplayer",
      GAME_MODE_SOLO: "Game:Mode:Solo",
      GAME_END: "Game:End",
      MATCH_SPAWNED_CONFIRMED: "Match:Spawned",
      MATCH_DURATION: "Match:Duration",
      PRIVATE_LOBBY_MATCH_STARTED_HOST: "PrivateLobby:MatchStarted:Host",
      PRIVATE_LOBBY_MATCH_STARTED_GUEST: "PrivateLobby:MatchStarted:Guest",
      PRIVATE_LOBBY_MATCH_ENDED: "PrivateLobby:MatchEnded",
    },
  },
  flashist_logEventAnalytics: jest.fn(),
}));

import {
  flashistConstants,
  flashist_logEventAnalytics,
} from "../../src/client/flashist/FlashistFacade";
import {
  Difficulty,
  GameMapSize,
  GameMapType,
  GameMode,
  GameType,
} from "../../src/core/game/Game";
import { GameStartInfo } from "../../src/core/Schemas";
import {
  clearActiveMatchStartTime,
  logMatchEndAnalytics,
  logMatchSpawnedConfirmedAnalytics,
  logMatchStartAnalytics,
  secondsSinceMatchStart,
  setActiveMatchStartTime,
  shouldLogMatchSpawnedConfirmedAnalytics,
  shouldLogMatchStartAnalytics,
} from "../../src/client/MatchStartAnalytics";
import {
  rememberPrivateLobbyHostClientID,
  resetPrivateLobbyAnalyticsForTests,
} from "../../src/client/PrivateLobbyAnalytics";

const MY_CLIENT_ID = "abcd1234";
const HOST_CLIENT_ID = "host5678";

describe("match start analytics", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetPrivateLobbyAnalyticsForTests();
    clearActiveMatchStartTime();
  });

  it("emits Game:Start then multiplayer mode for initial Public starts", () => {
    const didLog = logMatchStartAnalytics(
      createGameStartInfo(GameType.Public, 3),
      {
        hasJoined: false,
        isReconnect: false,
        isReplay: false,
      },
      MY_CLIENT_ID,
    );

    expect(didLog).toBe(true);
    expect(flashist_logEventAnalytics).toHaveBeenCalledTimes(2);
    expect(flashist_logEventAnalytics).toHaveBeenNthCalledWith(
      1,
      flashistConstants.analyticEvents.GAME_START,
      3,
    );
    expect(flashist_logEventAnalytics).toHaveBeenNthCalledWith(
      2,
      flashistConstants.analyticEvents.GAME_MODE_MULTIPLAYER,
    );
  });

  // Task 0451: Game:Start and Game:Mode:Multiplayer are unchanged; the private
  // start event comes third.
  it("emits Game:Start, multiplayer mode, then the private start for initial Private starts", () => {
    const didLog = logMatchStartAnalytics(
      createGameStartInfo(GameType.Private, 3),
      {
        hasJoined: false,
        isReconnect: false,
        isReplay: false,
      },
      MY_CLIENT_ID,
    );

    expect(didLog).toBe(true);
    expect(flashist_logEventAnalytics).toHaveBeenCalledTimes(3);
    expect(flashist_logEventAnalytics).toHaveBeenNthCalledWith(
      1,
      flashistConstants.analyticEvents.GAME_START,
      3,
    );
    expect(flashist_logEventAnalytics).toHaveBeenNthCalledWith(
      2,
      flashistConstants.analyticEvents.GAME_MODE_MULTIPLAYER,
    );
    expect(flashist_logEventAnalytics).toHaveBeenNthCalledWith(
      3,
      "PrivateLobby:MatchStarted:Guest",
    );
  });

  it("counts the private start as the host's when this client created the lobby", () => {
    rememberPrivateLobbyHostClientID(HOST_CLIENT_ID);

    logMatchStartAnalytics(
      createGameStartInfo(GameType.Private, 2),
      { hasJoined: false, isReconnect: false, isReplay: false },
      HOST_CLIENT_ID,
    );

    expect(flashist_logEventAnalytics).toHaveBeenNthCalledWith(
      3,
      "PrivateLobby:MatchStarted:Host",
    );
    expect(flashist_logEventAnalytics).not.toHaveBeenCalledWith(
      "PrivateLobby:MatchStarted:Guest",
    );
  });

  it("counts a guest as a guest even after this page hosted a lobby", () => {
    rememberPrivateLobbyHostClientID(HOST_CLIENT_ID);

    logMatchStartAnalytics(
      createGameStartInfo(GameType.Private, 2),
      { hasJoined: false, isReconnect: false, isReplay: false },
      MY_CLIENT_ID,
    );

    expect(flashist_logEventAnalytics).toHaveBeenNthCalledWith(
      3,
      "PrivateLobby:MatchStarted:Guest",
    );
  });

  it.each([GameType.Public, GameType.Singleplayer])(
    "emits no private-lobby event for %s starts",
    (gameType) => {
      rememberPrivateLobbyHostClientID(MY_CLIENT_ID);

      logMatchStartAnalytics(
        createGameStartInfo(gameType, 2),
        { hasJoined: false, isReconnect: false, isReplay: false },
        MY_CLIENT_ID,
      );

      expect(privateLobbyCalls()).toHaveLength(0);
    },
  );

  it.each([
    { hasJoined: true, isReconnect: false, isReplay: false },
    { hasJoined: false, isReconnect: true, isReplay: false },
    { hasJoined: false, isReconnect: false, isReplay: true },
  ])(
    "emits no private start for a reconnect, replay or repeat start (%o)",
    (state) => {
      rememberPrivateLobbyHostClientID(MY_CLIENT_ID);

      logMatchStartAnalytics(
        createGameStartInfo(GameType.Private, 2),
        state,
        MY_CLIENT_ID,
      );

      expect(flashist_logEventAnalytics).not.toHaveBeenCalled();
    },
  );

  it("emits Game:Start then solo mode for initial singleplayer starts", () => {
    const didLog = logMatchStartAnalytics(
      createGameStartInfo(GameType.Singleplayer, 1),
      {
        hasJoined: false,
        isReconnect: false,
        isReplay: false,
      },
      MY_CLIENT_ID,
    );

    expect(didLog).toBe(true);
    expect(flashist_logEventAnalytics).toHaveBeenCalledTimes(2);
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

  it.each([
    {
      name: "same-runner reconnect start",
      state: { hasJoined: true, isReconnect: false, isReplay: false },
    },
    {
      name: "persisted reconnect start",
      state: { hasJoined: false, isReconnect: true, isReplay: false },
    },
    {
      name: "archived replay start",
      state: { hasJoined: false, isReconnect: false, isReplay: true },
    },
  ])("does not emit analytics for $name", ({ state }) => {
    const didLog = logMatchStartAnalytics(
      createGameStartInfo(GameType.Public, 2),
      state,
      MY_CLIENT_ID,
    );

    expect(didLog).toBe(false);
    expect(shouldLogMatchStartAnalytics(state)).toBe(false);
    expect(flashist_logEventAnalytics).not.toHaveBeenCalled();
  });
});

describe("confirmed spawn analytics", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("emits Match:Spawned with positive elapsed seconds", () => {
    logMatchSpawnedConfirmedAnalytics(1_000, 1_200);

    expect(flashist_logEventAnalytics).toHaveBeenCalledWith(
      flashistConstants.analyticEvents.MATCH_SPAWNED_CONFIRMED,
      1,
    );
  });

  it("rounds elapsed seconds from the match start timestamp", () => {
    expect(secondsSinceMatchStart(1_000, 3_600)).toBe(3);
  });

  it.each([
    {
      name: "missing match start timestamp",
      state: {
        matchStartTimeMs: null,
        hasReportedSpawnConfirmed: false,
        hasSpawned: true,
        tilesOwned: 1,
      },
    },
    {
      name: "already reported",
      state: {
        matchStartTimeMs: 1_000,
        hasReportedSpawnConfirmed: true,
        hasSpawned: true,
        tilesOwned: 1,
      },
    },
    {
      name: "server has not confirmed spawned flag",
      state: {
        matchStartTimeMs: 1_000,
        hasReportedSpawnConfirmed: false,
        hasSpawned: false,
        tilesOwned: 1,
      },
    },
    {
      name: "spawned flag without territory ownership",
      state: {
        matchStartTimeMs: 1_000,
        hasReportedSpawnConfirmed: false,
        hasSpawned: true,
        tilesOwned: 0,
      },
    },
  ])("does not allow confirmed spawn analytics for $name", ({ state }) => {
    expect(shouldLogMatchSpawnedConfirmedAnalytics(state)).toBe(false);
  });

  it("allows confirmed spawn analytics once the player has spawned with territory", () => {
    expect(
      shouldLogMatchSpawnedConfirmedAnalytics({
        matchStartTimeMs: 1_000,
        hasReportedSpawnConfirmed: false,
        hasSpawned: true,
        tilesOwned: 1,
      }),
    ).toBe(true);
  });
});

describe("match duration analytics", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearActiveMatchStartTime();
  });

  it("emits Match:Duration alongside Game:End when a match start timestamp exists", () => {
    setActiveMatchStartTime(1_000);

    logMatchEndAnalytics(120, 31_400);

    expect(flashist_logEventAnalytics).toHaveBeenCalledTimes(2);
    expect(flashist_logEventAnalytics).toHaveBeenNthCalledWith(
      1,
      flashistConstants.analyticEvents.GAME_END,
      120,
    );
    expect(flashist_logEventAnalytics).toHaveBeenNthCalledWith(
      2,
      flashistConstants.analyticEvents.MATCH_DURATION,
      30,
    );
  });

  it("does not emit Match:Duration without a fresh match start timestamp", () => {
    logMatchEndAnalytics(120, 31_400);

    expect(flashist_logEventAnalytics).toHaveBeenCalledTimes(1);
    expect(flashist_logEventAnalytics).toHaveBeenCalledWith(
      flashistConstants.analyticEvents.GAME_END,
      120,
    );
  });

  it("clears the match start timestamp after emitting duration", () => {
    setActiveMatchStartTime(1_000);

    logMatchEndAnalytics(120, 31_400);
    logMatchEndAnalytics(120, 35_000);

    expect(
      (flashist_logEventAnalytics as jest.Mock).mock.calls.filter(
        ([event]) => event === flashistConstants.analyticEvents.MATCH_DURATION,
      ),
    ).toHaveLength(1);
  });

  it("supports abandon paths that do not have a Game:End value", () => {
    setActiveMatchStartTime(1_000);

    logMatchEndAnalytics(undefined, 31_400);

    expect(flashist_logEventAnalytics).toHaveBeenNthCalledWith(
      1,
      flashistConstants.analyticEvents.GAME_END,
    );
    expect(flashist_logEventAnalytics).toHaveBeenNthCalledWith(
      2,
      flashistConstants.analyticEvents.MATCH_DURATION,
      30,
    );
  });
});

describe("private match end analytics (task 0451)", () => {
  const freshStart = { hasJoined: false, isReconnect: false, isReplay: false };

  beforeEach(() => {
    jest.clearAllMocks();
    resetPrivateLobbyAnalyticsForTests();
    clearActiveMatchStartTime();
  });

  it("emits PrivateLobby:MatchEnded once, with the match seconds, after Match:Duration", () => {
    logMatchStartAnalytics(
      createGameStartInfo(GameType.Private, 2),
      freshStart,
      MY_CLIENT_ID,
    );
    setActiveMatchStartTime(1_000);
    jest.clearAllMocks();

    logMatchEndAnalytics(120, 31_400);
    logMatchEndAnalytics(120, 35_000);

    expect(flashist_logEventAnalytics).toHaveBeenNthCalledWith(
      2,
      flashistConstants.analyticEvents.MATCH_DURATION,
      30,
    );
    expect(flashist_logEventAnalytics).toHaveBeenNthCalledWith(
      3,
      "PrivateLobby:MatchEnded",
      30,
    );
    expect(privateLobbyCalls()).toEqual([["PrivateLobby:MatchEnded", 30]]);
  });

  it("covers the leave path (no Game:End value)", () => {
    logMatchStartAnalytics(
      createGameStartInfo(GameType.Private, 2),
      freshStart,
      MY_CLIENT_ID,
    );
    setActiveMatchStartTime(1_000);
    jest.clearAllMocks();

    logMatchEndAnalytics(undefined, 31_400);

    expect(privateLobbyCalls()).toEqual([["PrivateLobby:MatchEnded", 30]]);
  });

  it("emits nothing private at the end of a public match", () => {
    logMatchStartAnalytics(
      createGameStartInfo(GameType.Public, 2),
      freshStart,
      MY_CLIENT_ID,
    );
    setActiveMatchStartTime(1_000);

    logMatchEndAnalytics(120, 31_400);

    expect(privateLobbyCalls()).toHaveLength(0);
  });

  it("emits nothing private at the end of a match whose start was not logged (reconnect)", () => {
    logMatchStartAnalytics(
      createGameStartInfo(GameType.Private, 2),
      { hasJoined: false, isReconnect: true, isReplay: false },
      MY_CLIENT_ID,
    );

    logMatchEndAnalytics(120, 31_400);

    expect(privateLobbyCalls()).toHaveLength(0);
  });

  it("a public match after a finished private one is not counted as private", () => {
    logMatchStartAnalytics(
      createGameStartInfo(GameType.Private, 2),
      freshStart,
      MY_CLIENT_ID,
    );
    setActiveMatchStartTime(1_000);
    logMatchEndAnalytics(120, 31_400);
    logMatchStartAnalytics(
      createGameStartInfo(GameType.Public, 2),
      freshStart,
      MY_CLIENT_ID,
    );
    setActiveMatchStartTime(40_000);
    jest.clearAllMocks();

    logMatchEndAnalytics(120, 70_000);

    expect(privateLobbyCalls()).toHaveLength(0);
  });
});

function privateLobbyCalls(): unknown[][] {
  return (flashist_logEventAnalytics as jest.Mock).mock.calls.filter(
    ([event]) => String(event).startsWith("PrivateLobby:"),
  );
}

function createGameStartInfo(
  gameType: GameType,
  playerCount: number,
): GameStartInfo {
  return {
    gameID: "00000000-0000-4000-8000-000000000001",
    players: Array.from({ length: playerCount }, (_, index) => ({
      clientID: `00000000-0000-4000-8000-00000000000${index + 2}`,
      username: `Player ${index + 1}`,
      isCitizen: false,
    })),
    config: {
      gameMap: GameMapType.World,
      difficulty: Difficulty.Medium,
      donateGold: false,
      donateTroops: false,
      gameType,
      gameMode: GameMode.FFA,
      gameMapSize: GameMapSize.Normal,
      disableNPCs: false,
      bots: 0,
      infiniteGold: false,
      startGold: 0,
      infiniteTroops: false,
      instantBuild: false,
    },
  };
}
