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

  test("spawned then vanished without dying (left) does not qualify", () => {
    expect(
      qualifiesForMatchXp(
        participation("a", { isAliveAtEnd: false, killedAt: undefined }),
      ),
    ).toBe(false);
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
        xpAwarded: 10,
      },
    ]);
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
