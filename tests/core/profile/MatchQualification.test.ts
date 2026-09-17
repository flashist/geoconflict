import { ClientID, PlayerParticipation } from "../../../src/core/Schemas";
import {
  ClientCreditState,
  qualifiesForMatchXp,
  selectMatchCredits,
  selectUnresolvedCreditClients,
} from "../../../src/core/profile/MatchQualification";

function participation(
  clientID: string,
  over: Partial<PlayerParticipation> = {},
): PlayerParticipation {
  return {
    clientID: clientID as ClientID,
    hasSpawned: true,
    isAliveAtEnd: true,
    ...over,
  };
}

const PLAYER_A = "0b6f8a52-3c1e-4d7a-9f10-2a4b6c8d0e1a";
const PLAYER_B = "0b6f8a52-3c1e-4d7a-9f10-2a4b6c8d0e1b";

function state(over: Partial<ClientCreditState> = {}): ClientCreditState {
  return {
    playerId: PLAYER_A,
    identityKnown: true,
    kicked: false,
    disconnected: false,
    ...over,
  };
}

function roster(...ids: string[]): ReadonlySet<ClientID> {
  return new Set(ids as ClientID[]);
}

describe("qualifiesForMatchXp", () => {
  test("spawned and alive at end qualifies", () => {
    expect(
      qualifiesForMatchXp(participation("a", { isAliveAtEnd: true })),
    ).toBe(true);
  });

  test("spawned and killed qualifies", () => {
    expect(
      qualifiesForMatchXp(
        participation("a", { isAliveAtEnd: false, killedAt: 42 }),
      ),
    ).toBe(true);
  });

  test("never spawned does not qualify", () => {
    expect(qualifiesForMatchXp(participation("a", { hasSpawned: false }))).toBe(
      false,
    );
  });

  // Task 0211, owner ruling. The leaver exclusion NARROWED; it was not deleted.
  // Named explicitly in the titles below so a later reader sees the reversal is
  // deliberate and does not "fix" it back. See the doc comment on
  // qualifiesForMatchXp.
  test("an eliminated player qualifies even though they later left (ruling: paid)", () => {
    expect(
      qualifiesForMatchXp(
        participation("a", { isAliveAtEnd: false, killedAt: 42 }),
      ),
    ).toBe(true);
  });

  test("a vanisher no trigger ever credited still does not qualify (ruling: not paid)", () => {
    expect(
      qualifiesForMatchXp(
        participation("a", { isAliveAtEnd: false, killedAt: undefined }),
      ),
    ).toBe(false);
  });

  // Task 0211. The predicate is evaluated MID-MATCH now, not only at an end. Both
  // mid-match shapes must pass with no logic change to this module.
  test("a just-eliminated player qualifies mid-match", () => {
    expect(
      qualifiesForMatchXp(
        participation("a", { isAliveAtEnd: false, killedAt: 7 }),
      ),
    ).toBe(true);
  });

  test("a still-alive spawned player qualifies mid-match", () => {
    expect(
      qualifiesForMatchXp(
        participation("a", { isAliveAtEnd: true, killedAt: undefined }),
      ),
    ).toBe(true);
  });

  test("killedAt of 0 (eliminated at tick 0) still qualifies", () => {
    expect(
      qualifiesForMatchXp(
        participation("a", { isAliveAtEnd: false, killedAt: 0 }),
      ),
    ).toBe(true);
  });
});

describe("selectMatchCredits", () => {
  test("credits a qualifying, connected, resolved player by playerId", () => {
    const credits = selectMatchCredits(
      "game-1",
      [participation("a")],
      new Map([["a" as ClientID, state({ playerId: PLAYER_A })]]),
      roster("a"),
    );
    expect(credits).toEqual([
      {
        gameId: "game-1",
        playerId: PLAYER_A,
        // ADR-111 / task 0211: the award is 1, asserted by test and not by reading
        // the diff. Every crediting path resolves through here, so this is the one
        // place the amount is pinned for all of them.
        xpAwarded: 1,
      },
    ]);
  });

  // Task 0211. A one-entry batch is the shape the mid-match self-report produces.
  // Nothing about this module changes for it — that is the claim, so it is asserted.
  test("credits a single mid-match entry for a just-eliminated player", () => {
    const credits = selectMatchCredits(
      "game-1",
      [participation("a", { isAliveAtEnd: false, killedAt: 12 })],
      new Map([["a" as ClientID, state()]]),
      roster("a", "b", "c"),
    );
    expect(credits).toEqual([
      { gameId: "game-1", playerId: PLAYER_A, xpAwarded: 1 },
    ]);
  });

  test("credits a single mid-match entry for a still-alive stalled-match survivor", () => {
    const credits = selectMatchCredits(
      "game-1",
      [participation("a", { isAliveAtEnd: true })],
      new Map([["a" as ClientID, state()]]),
      roster("a", "b", "c"),
    );
    expect(credits).toHaveLength(1);
    expect(credits[0].xpAwarded).toBe(1);
  });

  test("excludes players with no server-side client state", () => {
    const credits = selectMatchCredits(
      "game-1",
      [participation("ghost")],
      new Map(),
      roster("ghost"),
    );
    expect(credits).toEqual([]);
  });

  test("excludes a connected, qualifying, resolved player not in the start roster", () => {
    const credits = selectMatchCredits(
      "game-1",
      [participation("latejoiner")],
      new Map([["latejoiner" as ClientID, state()]]),
      roster("someoneelse"),
    );
    expect(credits).toEqual([]);
  });

  test("excludes kicked, disconnected, and identity-less clients", () => {
    const credits = selectMatchCredits(
      "game-1",
      [participation("a"), participation("b"), participation("c")],
      new Map([
        ["a" as ClientID, state({ kicked: true })],
        ["b" as ClientID, state({ playerId: PLAYER_B, disconnected: true })],
        ["c" as ClientID, state({ identityKnown: false, playerId: null })],
      ]),
      roster("a", "b", "c"),
    );
    expect(credits).toEqual([]);
  });

  // The identity gate is the ADR-103 funnel's verdict. A playerId alone must never
  // be enough to credit — it is only ever set from a resolve of that verdict.
  test("excludes a client whose identity is not creditable even if a playerId is present", () => {
    const credits = selectMatchCredits(
      "game-1",
      [participation("a")],
      new Map([["a" as ClientID, state({ identityKnown: false })]]),
      roster("a"),
    );
    expect(credits).toEqual([]);
  });

  test("excludes non-qualifying participation even if connected", () => {
    const credits = selectMatchCredits(
      "game-1",
      [participation("a", { hasSpawned: false })],
      new Map([["a" as ClientID, state()]]),
      roster("a"),
    );
    expect(credits).toEqual([]);
  });

  test("leaves an identified client with no playerId yet out of the credits", () => {
    const credits = selectMatchCredits(
      "game-1",
      [participation("a")],
      new Map([["a" as ClientID, state({ playerId: null })]]),
      roster("a"),
    );
    expect(credits).toEqual([]);
  });

  test("dedupes by playerId (two clientIDs resolving to the same player)", () => {
    const credits = selectMatchCredits(
      "game-1",
      [participation("a"), participation("b")],
      new Map([
        ["a" as ClientID, state({ playerId: PLAYER_A })],
        ["b" as ClientID, state({ playerId: PLAYER_A })],
      ]),
      roster("a", "b"),
    );
    expect(credits).toEqual([
      { gameId: "game-1", playerId: PLAYER_A, xpAwarded: 1 },
    ]);
  });

  test("two different players are both credited", () => {
    const credits = selectMatchCredits(
      "game-1",
      [participation("a"), participation("b")],
      new Map([
        ["a" as ClientID, state({ playerId: PLAYER_A })],
        ["b" as ClientID, state({ playerId: PLAYER_B })],
      ]),
      roster("a", "b"),
    );
    expect(credits.map((c) => c.playerId)).toEqual([PLAYER_A, PLAYER_B]);
  });
});

describe("selectUnresolvedCreditClients", () => {
  test("lists an identified, qualifying client whose playerId is still null", () => {
    const unresolved = selectUnresolvedCreditClients(
      [participation("a"), participation("b")],
      new Map([
        ["a" as ClientID, state({ playerId: null })],
        ["b" as ClientID, state({ playerId: PLAYER_B })],
      ]),
      roster("a", "b"),
    );
    expect(unresolved).toEqual(["a"]);
  });

  test("a client with no creditable identity is in neither list", () => {
    const stateById = new Map([
      ["a" as ClientID, state({ identityKnown: false, playerId: null })],
    ]);
    expect(
      selectUnresolvedCreditClients(
        [participation("a")],
        stateById,
        roster("a"),
      ),
    ).toEqual([]);
    expect(
      selectMatchCredits(
        "game-1",
        [participation("a")],
        stateById,
        roster("a"),
      ),
    ).toEqual([]);
  });

  test("roster, qualification, kicked and disconnected gates apply", () => {
    const unresolved = selectUnresolvedCreditClients(
      [
        participation("offroster"),
        participation("nospawn", { hasSpawned: false }),
        participation("kicked"),
        participation("gone"),
        participation("ghost"),
      ],
      new Map([
        ["offroster" as ClientID, state({ playerId: null })],
        ["nospawn" as ClientID, state({ playerId: null })],
        ["kicked" as ClientID, state({ playerId: null, kicked: true })],
        ["gone" as ClientID, state({ playerId: null, disconnected: true })],
      ]),
      roster("nospawn", "kicked", "gone", "ghost"),
    );
    expect(unresolved).toEqual([]);
  });

  test("dedupes a clientID named twice in the participation", () => {
    const unresolved = selectUnresolvedCreditClients(
      [participation("a"), participation("a")],
      new Map([["a" as ClientID, state({ playerId: null })]]),
      roster("a"),
    );
    expect(unresolved).toEqual(["a"]);
  });
});
