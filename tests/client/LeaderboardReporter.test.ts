import { readFileSync } from "node:fs";
import { join } from "node:path";

jest.mock("../../src/client/flashist/FlashistFacade", () => ({
  flashistConstants: {
    analyticEvents: {
      MATCH_LEADERBOARD_AWARD: "Match:Leaderboard:Award",
    },
  },
  flashist_logEventAnalytics: jest.fn(),
  FlashistFacade: {
    instance: {
      increaseCurPlayerLeaderboardScore: jest.fn(),
    },
  },
}));

import {
  FlashistFacade,
  flashistConstants,
  flashist_logEventAnalytics,
} from "../../src/client/flashist/FlashistFacade";
import {
  humanWonPlacement,
  reportParticipation,
  reportPlacement,
} from "../../src/client/leaderboard/LeaderboardReporter";
import { GameType, PlayerType } from "../../src/core/game/Game";
import { Winner } from "../../src/core/Schemas";

// GameAnalytics rejects any event id that does not match this: at most 5
// colon-separated segments, each 1-64 characters.
// (node_modules/gameanalytics — validateEventIdLength)
const GAME_ANALYTICS_EVENT_ID = /^[^:]{1,64}(?::[^:]{1,64}){0,4}$/;

// Same guard as tests/client/WinConditionAnalytics.test.ts, for the same
// reason: the mock above hard-codes MATCH_LEADERBOARD_AWARD, so on its own
// every assertion here validates the mock rather than the shipped constant.
// This reads the real value out of the source file, and the test that pins the
// mock to it makes the suite real — an edit to the constant fails here instead
// of shipping a six-segment event that GameAnalytics rejects.
//
// Read from source rather than jest.requireActual on purpose: importing the
// real module calls GameAnalytics.init, which throws and then leaks a handle,
// so the runner never exits. That is not the known supertest flake.
//
// The match is GLOBAL and the count is asserted to be exactly one, so the
// habit of commenting an old line out above the new one cannot silently make
// the stale value the one under test.
const MATCH_LEADERBOARD_AWARD_DEFINITIONS = [
  ...readFileSync(
    join(
      __dirname,
      "..",
      "..",
      "src",
      "client",
      "flashist",
      "FlashistFacade.ts",
    ),
    "utf8",
  ).matchAll(/MATCH_LEADERBOARD_AWARD:\s*"([^"]+)"/g),
];

const REAL_MATCH_LEADERBOARD_AWARD = ((): string => {
  if (MATCH_LEADERBOARD_AWARD_DEFINITIONS.length !== 1) {
    // Never silently skip: reading the wrong definition, or none, would make
    // the five-segment wall below vacuous.
    throw new Error(
      `Expected exactly one MATCH_LEADERBOARD_AWARD definition in FlashistFacade.ts, found ${MATCH_LEADERBOARD_AWARD_DEFINITIONS.length} — the five-segment assertion would be reading the wrong one`,
    );
  }
  return MATCH_LEADERBOARD_AWARD_DEFINITIONS[0][1];
})();

type ReporterPlayer = Parameters<typeof reportParticipation>[0]["player"];

function player(type: PlayerType = PlayerType.Human): ReporterPlayer {
  return {
    type: () => type,
    clientID: () => "client-1",
  } as unknown as ReporterPlayer;
}

const increaseScore = FlashistFacade.instance
  .increaseCurPlayerLeaderboardScore as jest.Mock;
const logEvent = flashist_logEventAnalytics as jest.Mock;

function loggedEvents(): [string, number | undefined][] {
  return logEvent.mock.calls as [string, number | undefined][];
}

beforeEach(() => {
  jest.clearAllMocks();
  increaseScore.mockResolvedValue(true);
  jest.spyOn(console, "debug").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("the shipped event constant", () => {
  it("is what this suite mocks", () => {
    expect(flashistConstants.analyticEvents.MATCH_LEADERBOARD_AWARD).toBe(
      REAL_MATCH_LEADERBOARD_AWARD,
    );
  });

  it("leaves room for the two composed segments inside GameAnalytics' wall", () => {
    // Three segments in the base plus kind plus mode is exactly five, the
    // hard maximum. A sixth dimension is not available and must not be added.
    expect(REAL_MATCH_LEADERBOARD_AWARD.split(":")).toHaveLength(3);
  });
});

describe("reportParticipation", () => {
  it("emits Participation:Solo with the participation point value", async () => {
    await reportParticipation({
      gameId: "g1",
      player: player(),
      gameType: GameType.Singleplayer,
      isTutorial: false,
    });

    expect(loggedEvents()).toEqual([
      ["Match:Leaderboard:Award:Participation:Solo", 1],
    ]);
  });

  it("marks a tutorial SoloTutorial rather than dropping it", async () => {
    await reportParticipation({
      gameId: "g1",
      player: player(),
      gameType: GameType.Singleplayer,
      isTutorial: true,
    });

    expect(loggedEvents()).toEqual([
      ["Match:Leaderboard:Award:Participation:SoloTutorial", 1],
    ]);
  });

  it.each([
    ["public", GameType.Public],
    ["private", GameType.Private],
  ])("emits nothing for a %s multiplayer lobby", async (_label, gameType) => {
    await reportParticipation({
      gameId: "g1",
      player: player(),
      gameType,
      isTutorial: false,
    });

    // The platform award itself is unchanged — only the measurement is
    // Singleplayer-scoped. Task 0210 owns whether the award should happen.
    expect(increaseScore).toHaveBeenCalledTimes(1);
    expect(logEvent).not.toHaveBeenCalled();
  });

  it("emits nothing for a non-human player", async () => {
    await reportParticipation({
      gameId: "g1",
      player: player(PlayerType.Bot),
      gameType: GameType.Singleplayer,
      isTutorial: false,
    });

    expect(increaseScore).not.toHaveBeenCalled();
    expect(logEvent).not.toHaveBeenCalled();
  });
});

describe("reportPlacement", () => {
  const placementParams = {
    gameId: "g1",
    placement: 1,
    points: 10,
    gameType: GameType.Singleplayer,
    isTutorial: false,
    humanWon: false,
  };

  it("emits PlacementLost:Solo when a bot took the win", async () => {
    await reportPlacement({ ...placementParams, player: player() });

    expect(loggedEvents()).toEqual([
      ["Match:Leaderboard:Award:PlacementLost:Solo", 10],
    ]);
  });

  it("emits PlacementWon:Solo when the human won", async () => {
    await reportPlacement({
      ...placementParams,
      player: player(),
      humanWon: true,
    });

    expect(loggedEvents()).toEqual([
      ["Match:Leaderboard:Award:PlacementWon:Solo", 10],
    ]);
  });

  it("marks a tutorial SoloTutorial rather than dropping it", async () => {
    await reportPlacement({
      ...placementParams,
      player: player(),
      isTutorial: true,
    });

    expect(loggedEvents()).toEqual([
      ["Match:Leaderboard:Award:PlacementLost:SoloTutorial", 10],
    ]);
  });

  it.each([
    ["public", GameType.Public],
    ["private", GameType.Private],
  ])("emits nothing for a %s multiplayer lobby", async (_label, gameType) => {
    await reportPlacement({ ...placementParams, player: player(), gameType });

    expect(increaseScore).toHaveBeenCalledTimes(1);
    expect(logEvent).not.toHaveBeenCalled();
  });

  it("emits nothing for a non-human player", async () => {
    await reportPlacement({
      ...placementParams,
      player: player(PlayerType.FakeHuman),
    });

    expect(increaseScore).not.toHaveBeenCalled();
    expect(logEvent).not.toHaveBeenCalled();
  });

  it("forwards the points that were actually attempted", async () => {
    await reportPlacement({ ...placementParams, player: player(), points: 5 });

    expect(loggedEvents()).toEqual([
      ["Match:Leaderboard:Award:PlacementLost:Solo", 5],
    ]);
  });
});

describe("attempts, not confirmed successes", () => {
  it("emits when the platform call returns false", async () => {
    increaseScore.mockResolvedValue(false);

    await reportParticipation({
      gameId: "g1",
      player: player(),
      gameType: GameType.Singleplayer,
      isTutorial: false,
    });

    expect(loggedEvents()).toEqual([
      ["Match:Leaderboard:Award:Participation:Solo", 1],
    ]);
  });

  it("emits when the platform call rejects, and still propagates the rejection", async () => {
    // increaseCurPlayerLeaderboardScore awaits setCurPlayerLeaderboardScore
    // outside any try/catch, so a rejecting SDK reaches here. A rejection is
    // precisely the platform failure this measurement is asked to include, so
    // dropping it would bias the count toward success.
    increaseScore.mockRejectedValue(new Error("sdk unavailable"));

    await expect(
      reportPlacement({
        gameId: "g1",
        player: player(),
        placement: 1,
        points: 10,
        gameType: GameType.Singleplayer,
        isTutorial: false,
        humanWon: false,
      }),
    ).rejects.toThrow("sdk unavailable");

    expect(loggedEvents()).toEqual([
      ["Match:Leaderboard:Award:PlacementLost:Solo", 10],
    ]);
  });
});

describe("humanWonPlacement", () => {
  // Every shape GameImpl.makeWinner() can emit. The team tuple is the one the
  // first version of this predicate missed: Singleplayer Team mode is
  // user-selectable, so a solo team win was reported as PlacementLost carrying
  // the first-place value.
  it("reads a player win by the local clientID", () => {
    expect(humanWonPlacement(["player", "client-1"], "client-1", null)).toBe(
      true,
    );
    expect(
      humanWonPlacement(["player", "someone-else"], "client-1", null),
    ).toBe(false);
  });

  it("reads a SOLO TEAM win by the local player's own team", () => {
    expect(humanWonPlacement(["team", "Red", "client-1"], "client-1", "Red")) //
      .toBe(true);
    expect(
      humanWonPlacement(["team", "Blue", "other"], "client-1", "Red"),
    ).toBe(false);
  });

  it("never calls a teamless player a team winner", () => {
    // team() returns null in FFA. A null team must not match a team name.
    expect(humanWonPlacement(["team", "Red", "client-1"], "client-1", null)) //
      .toBe(false);
  });

  it("never calls a clientless opponent win a human win", () => {
    expect(humanWonPlacement(["opponent", "Bot Nation"], "client-1", "Red")) //
      .toBe(false);
  });

  it("treats an undeclared winner as not a win", () => {
    expect(humanWonPlacement(undefined, "client-1", "Red")).toBe(false);
  });

  it("covers every shape makeWinner() emits", () => {
    // Two checks that do different jobs. Read the difference before editing
    // either — an earlier version of this test claimed the first job and only
    // did the second.
    //
    // 1. TYPE level, and this is the tripwire that actually fires. WinnerTag is
    //    derived from Winner, so a fourth tuple added to WinnerSchema makes
    //    COVERED miss a key and `npx tsc --noEmit` — already a gate — fails.
    //    The array literal below CANNOT do this: adding a variant leaves a
    //    hardcoded array valid and every runtime assertion still green.
    //    Demonstrated, not assumed: a stand-in union carrying a fourth variant
    //    was compiled against this exact form and tsc reported the missing key
    //    (worklog decision 26).
    // 2. RUNTIME level: that humanWonPlacement returns a boolean for each shape
    //    and says "won" for exactly the player and own-team shapes.
    type WinnerTag = NonNullable<Winner>[0];
    const COVERED: Record<WinnerTag, true> = {
      player: true,
      team: true,
      opponent: true,
    };
    expect(Object.keys(COVERED).sort()).toEqual(["opponent", "player", "team"]);

    const shapes: Winner[] = [
      ["player", "client-1"],
      ["team", "Red", "client-1"],
      ["opponent", "Bot Nation"],
      undefined,
    ];
    for (const shape of shapes) {
      expect(typeof humanWonPlacement(shape, "client-1", "Red")).toBe(
        "boolean",
      );
    }
    expect(
      shapes.filter((s) => humanWonPlacement(s, "client-1", "Red")),
    ).toEqual([
      ["player", "client-1"],
      ["team", "Red", "client-1"],
    ]);
  });
});

describe("the event-id composer", () => {
  // ⚠️ This sweep is the full cross-product on purpose — 2 x 3 = 6 — and must
  // NOT be reduced to the 5 ids production can currently reach. It covers the
  // COMPOSER, which must stay inside GameAnalytics' five-segment cap for any
  // well-typed input. Reachability is a separate property of the emitters and
  // of WinCheckExecution, documented in analytics-event-reference.md:
  // PlacementLost:SoloTutorial is unreachable today because tutorials are
  // hard-coded FFA with NPCs disabled, so a clientless leader hits the 0022
  // guard and no Win update is ever produced. It becomes reachable when
  // 0205/0211 land, and shrinking this loop to match today's reachable set
  // would silently drop composer coverage.
  it("composes a five-segment event id for every leaf", async () => {
    const cases: (() => Promise<void>)[] = [];
    for (const isTutorial of [false, true]) {
      cases.push(() =>
        reportParticipation({
          gameId: "g1",
          player: player(),
          gameType: GameType.Singleplayer,
          isTutorial,
        }),
      );
      for (const humanWon of [false, true]) {
        cases.push(() =>
          reportPlacement({
            gameId: "g1",
            player: player(),
            placement: 1,
            points: 10,
            gameType: GameType.Singleplayer,
            isTutorial,
            humanWon,
          }),
        );
      }
    }

    for (const run of cases) {
      await run();
    }

    const names = loggedEvents().map(([name]) => name);
    // 2 participation + 4 placement, and none of them collide.
    expect(names).toHaveLength(6);
    expect(new Set(names).size).toBe(6);
    for (const name of names) {
      expect(name).toMatch(GAME_ANALYTICS_EVENT_ID);
      expect(name.split(":")).toHaveLength(5);
      expect(name.startsWith(`${REAL_MATCH_LEADERBOARD_AWARD}:`)).toBe(true);
    }
  });
});
