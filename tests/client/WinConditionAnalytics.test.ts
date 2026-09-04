import { readFileSync } from "node:fs";
import { join } from "node:path";

jest.mock("../../src/client/flashist/FlashistFacade", () => ({
  flashistConstants: {
    analyticEvents: {
      MATCH_WIN_CONDITION: "Match:WinCondition",
    },
  },
  flashist_logEventAnalytics: jest.fn(),
}));

import {
  flashistConstants,
  flashist_logEventAnalytics,
} from "../../src/client/flashist/FlashistFacade";
import {
  logWinConditionCheckAnalytics,
  shouldLogWinConditionCheck,
  winConditionAnalyticsEventName,
} from "../../src/client/WinConditionAnalytics";
import {
  GameUpdateType,
  WinConditionBranch,
  WinConditionCheckUpdate,
  WinConditionLeaderKind,
  WinConditionLobbyType,
  WinConditionMode,
} from "../../src/core/game/GameUpdates";

// GameAnalytics rejects any event id that does not match this: at most 5
// colon-separated segments, each 1-64 characters.
// (node_modules/gameanalytics — validateEventIdLength)
const GAME_ANALYTICS_EVENT_ID = /^[^:]{1,64}(?::[^:]{1,64}){0,4}$/;

// The mock at the top of this file hard-codes MATCH_WIN_CONDITION, so on its
// own every assertion below validates the mock, not the shipped constant. This
// reads the real value out of the source file, and the test that pins the mock
// to it makes the whole suite real: an edit to the constant fails here instead
// of shipping a six-segment event that GameAnalytics rejects.
//
// Read from source rather than jest.requireActual on purpose: importing the
// real module calls GameAnalytics.init, which throws and then leaks a handle,
// so the node-environment runner never exits (measured: >2 min against a 0.1 s
// suite). This is not the known supertest flake.
//
// The match is GLOBAL and the count is asserted to be exactly one. A non-global
// match takes the FIRST textual occurrence, which the ordinary habit of
// commenting the old line out above the new one would silently make the stale
// value — the guard would then go green while production shipped a six-segment
// event. That is the one case this guard exists for.
//
// It counts DEFINITIONS — the key followed by a string literal — not mentions,
// so the constant may be referenced freely elsewhere in that file without
// tripping it. Only a second key-with-literal, which is the genuinely ambiguous
// shape, trips it.
const MATCH_WIN_CONDITION_DEFINITIONS = [
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
  ).matchAll(/MATCH_WIN_CONDITION:\s*"([^"]+)"/g),
];

const REAL_MATCH_WIN_CONDITION = ((): string => {
  if (MATCH_WIN_CONDITION_DEFINITIONS.length !== 1) {
    // Never silently skip: reading the wrong definition, or none, would make
    // the five-segment wall below vacuous.
    throw new Error(
      `Expected exactly one MATCH_WIN_CONDITION definition in FlashistFacade.ts, found ${MATCH_WIN_CONDITION_DEFINITIONS.length} — the five-segment assertion would be reading the wrong one`,
    );
  }
  return MATCH_WIN_CONDITION_DEFINITIONS[0][1];
})();

const LIVE_STATE = {
  isReplay: false,
  isReconnect: false,
  hasReported: false,
};

describe("win condition analytics (task 0208)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const modes: WinConditionMode[] = ["Ffa", "Team"];
  const lobbyTypes: WinConditionLobbyType[] = ["Public", "Private"];
  const branches: WinConditionBranch[] = ["Threshold", "Timer"];
  const leaderKinds: WinConditionLeaderKind[] = [
    "Bot",
    "Nation",
    "AiPlayer",
    "Human",
    "BotTeam",
    "NationsTeam",
    "HumanTeam",
  ];

  // ⚠️ This sweep is the full cross-product on purpose — 2 x 2 x 2 x 7 = 56 —
  // and must NOT be reduced to the 28 combinations the emitters can actually
  // produce. It covers the COMPOSER, which takes any well-typed update and must
  // stay inside GameAnalytics' five-segment cap for all of them. Reachability is
  // a separate property of WinCheckExecution, documented in
  // analytics-event-reference.md, and shrinking this loop to match it would
  // silently drop composer coverage.
  it("composes the five-segment event string for every leaf", () => {
    const produced: string[] = [];
    for (const mode of modes) {
      for (const lobbyType of lobbyTypes) {
        for (const branch of branches) {
          for (const leaderKind of leaderKinds) {
            const name = winConditionAnalyticsEventName(
              update({ mode, lobbyType, branch, leaderKind }),
            );
            expect(name).not.toBeNull();
            produced.push(name!);
          }
        }
      }
    }

    expect(produced).toHaveLength(2 * 2 * 2 * 7);
    expect(new Set(produced).size).toBe(produced.length);
    for (const name of produced) {
      // The hard GameAnalytics wall: 5 segments, never more.
      expect(name).toMatch(GAME_ANALYTICS_EVENT_ID);
      expect(name.split(":")).toHaveLength(5);
      expect(name.startsWith("Match:WinCondition:")).toBe(true);
    }
  });

  it("fuses mode and lobby type into one segment", () => {
    expect(
      winConditionAnalyticsEventName(
        update({
          mode: "Ffa",
          lobbyType: "Public",
          branch: "Threshold",
          leaderKind: "Bot",
        }),
      ),
    ).toBe("Match:WinCondition:FfaPublic:Threshold:Bot");
    expect(
      winConditionAnalyticsEventName(
        update({
          mode: "Team",
          lobbyType: "Private",
          branch: "Timer",
          leaderKind: "BotTeam",
        }),
      ),
    ).toBe("Match:WinCondition:TeamPrivate:Timer:BotTeam");
    // The all-clientless HumansVsNations team gets its own leaf, and it still
    // fits the five-segment cap.
    expect(
      winConditionAnalyticsEventName(
        update({
          mode: "Team",
          lobbyType: "Public",
          branch: "Threshold",
          leaderKind: "NationsTeam",
        }),
      ),
    ).toBe("Match:WinCondition:TeamPublic:Threshold:NationsTeam");
  });

  // Guards the five-segment wall against the REAL constant, not the mock.
  it("keeps the real, unmocked event prefix at two segments", () => {
    // Exactly one definition, so the extraction above cannot read a
    // commented-out predecessor while production ships the new value.
    expect(MATCH_WIN_CONDITION_DEFINITIONS).toHaveLength(1);
    expect(flashistConstants.analyticEvents.MATCH_WIN_CONDITION).toBe(
      REAL_MATCH_WIN_CONDITION,
    );
    // winConditionAnalyticsEventName appends exactly three segments, so the
    // prefix must stay at two for the composed event to fit GameAnalytics' cap
    // of five. Growing the real constant a segment fails here — and, via the
    // assertion above, fails every other assertion in this suite too.
    expect(REAL_MATCH_WIN_CONDITION.split(":")).toHaveLength(2);
    expect(REAL_MATCH_WIN_CONDITION).toMatch(GAME_ANALYTICS_EVENT_ID);
  });

  it("never writes the event string inline — it is built from the enum key", () => {
    const name = winConditionAnalyticsEventName(update({}));
    expect(
      name?.startsWith(flashistConstants.analyticEvents.MATCH_WIN_CONDITION),
    ).toBe(true);
  });

  // Part A measures multiplayer. Singleplayer has no public/private lobby leaf,
  // so it is dropped rather than folded into a multiplayer one.
  it("drops singleplayer matches", () => {
    expect(
      winConditionAnalyticsEventName(update({ lobbyType: "Singleplayer" })),
    ).toBeNull();
    expect(
      logWinConditionCheckAnalytics(
        update({ lobbyType: "Singleplayer" }),
        LIVE_STATE,
      ),
    ).toBe(false);
    expect(flashist_logEventAnalytics).not.toHaveBeenCalled();
  });

  it("drops tutorial matches", () => {
    expect(
      winConditionAnalyticsEventName(update({ isTutorial: true })),
    ).toBeNull();
    expect(
      logWinConditionCheckAnalytics(update({ isTutorial: true }), LIVE_STATE),
    ).toBe(false);
    expect(flashist_logEventAnalytics).not.toHaveBeenCalled();
  });

  it("emits the event with the leader share as the value", () => {
    const didLog = logWinConditionCheckAnalytics(
      update({ leaderSharePercent: 83 }),
      LIVE_STATE,
    );

    expect(didLog).toBe(true);
    expect(flashist_logEventAnalytics).toHaveBeenCalledTimes(1);
    expect(flashist_logEventAnalytics).toHaveBeenCalledWith(
      "Match:WinCondition:FfaPublic:Threshold:Bot",
      83,
    );
  });

  describe("suppression gates", () => {
    it("allows a first, live, non-replay check", () => {
      expect(shouldLogWinConditionCheck(LIVE_STATE)).toBe(true);
    });

    // A replay re-simulates an archived match; it is not a live client-match.
    it("suppresses replays", () => {
      expect(
        shouldLogWinConditionCheck({ ...LIVE_STATE, isReplay: true }),
      ).toBe(false);
      expect(
        logWinConditionCheckAnalytics(update({}), {
          ...LIVE_STATE,
          isReplay: true,
        }),
      ).toBe(false);
      expect(flashist_logEventAnalytics).not.toHaveBeenCalled();
    });

    // A reconnecting client re-simulates from turn 0 with a fresh latch and
    // would fire again, while Game:Start — the denominator — is not re-fired on
    // reconnect. Suppressing keeps numerator and denominator on the same
    // population, at the cost of a small under-count.
    it("suppresses reconnects", () => {
      expect(
        shouldLogWinConditionCheck({ ...LIVE_STATE, isReconnect: true }),
      ).toBe(false);
      expect(
        logWinConditionCheckAnalytics(update({}), {
          ...LIVE_STATE,
          isReconnect: true,
        }),
      ).toBe(false);
      expect(flashist_logEventAnalytics).not.toHaveBeenCalled();
    });

    // The client-side latch is independent of the execution-level one.
    it("suppresses a second report in the same client match", () => {
      expect(
        shouldLogWinConditionCheck({ ...LIVE_STATE, hasReported: true }),
      ).toBe(false);
      expect(
        logWinConditionCheckAnalytics(update({}), {
          ...LIVE_STATE,
          hasReported: true,
        }),
      ).toBe(false);
      expect(flashist_logEventAnalytics).not.toHaveBeenCalled();
    });
  });
});

function update(
  overrides: Partial<WinConditionCheckUpdate>,
): WinConditionCheckUpdate {
  return {
    type: GameUpdateType.WinConditionCheck,
    mode: "Ffa",
    lobbyType: "Public",
    branch: "Threshold",
    leaderKind: "Bot",
    leaderSharePercent: 81,
    isTutorial: false,
    ...overrides,
  };
}
