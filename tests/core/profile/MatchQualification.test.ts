import { ClientID, PlayerParticipation } from "../../../src/core/Schemas";
import {
  ClientCreditState,
  qualifiesForMatchXp,
  selectMatchCredits,
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

function state(over: Partial<ClientCreditState> = {}): ClientCreditState {
  return {
    yandexPlayerId: "yandex-default",
    persistentId: "persistent-default",
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
  test("credits a qualifying, connected, identified player", () => {
    const credits = selectMatchCredits(
      "game-1",
      [participation("a")],
      new Map([["a" as ClientID, state({ yandexPlayerId: "yx-a" })]]),
      roster("a"),
    );
    expect(credits).toEqual([
      {
        gameId: "game-1",
        yandexPlayerId: "yx-a",
        persistentId: "persistent-default",
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
      new Map([["a" as ClientID, state({ yandexPlayerId: "yx-a" })]]),
      roster("a", "b", "c"),
    );
    expect(credits).toEqual([
      {
        gameId: "game-1",
        yandexPlayerId: "yx-a",
        persistentId: "persistent-default",
        xpAwarded: 1,
      },
    ]);
  });

  test("credits a single mid-match entry for a still-alive stalled-match survivor", () => {
    const credits = selectMatchCredits(
      "game-1",
      [participation("a", { isAliveAtEnd: true })],
      new Map([["a" as ClientID, state({ yandexPlayerId: "yx-a" })]]),
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

  test("excludes a connected, qualifying, identified player not in the start roster", () => {
    const credits = selectMatchCredits(
      "game-1",
      [participation("latejoiner")],
      new Map([
        ["latejoiner" as ClientID, state({ yandexPlayerId: "yx-late" })],
      ]),
      roster("someoneelse"),
    );
    expect(credits).toEqual([]);
  });

  test("excludes kicked, disconnected, and id-less clients", () => {
    const credits = selectMatchCredits(
      "game-1",
      [participation("a"), participation("b"), participation("c")],
      new Map([
        ["a" as ClientID, state({ yandexPlayerId: "yx-a", kicked: true })],
        [
          "b" as ClientID,
          state({ yandexPlayerId: "yx-b", disconnected: true }),
        ],
        ["c" as ClientID, state({ yandexPlayerId: null })],
      ]),
      roster("a", "b", "c"),
    );
    expect(credits).toEqual([]);
  });

  test("excludes non-qualifying participation even if connected", () => {
    const credits = selectMatchCredits(
      "game-1",
      [participation("a", { hasSpawned: false })],
      new Map([["a" as ClientID, state({ yandexPlayerId: "yx-a" })]]),
      roster("a"),
    );
    expect(credits).toEqual([]);
  });

  test("dedupes by yandex id (same account on two connections)", () => {
    const credits = selectMatchCredits(
      "game-1",
      [participation("a"), participation("b")],
      new Map([
        ["a" as ClientID, state({ yandexPlayerId: "same" })],
        ["b" as ClientID, state({ yandexPlayerId: "same" })],
      ]),
      roster("a", "b"),
    );
    expect(credits).toHaveLength(1);
    expect(credits[0].yandexPlayerId).toBe("same");
  });
});
