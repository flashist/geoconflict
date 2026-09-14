/**
 * @jest-environment jsdom
 */
jest.mock("../../../src/client/Utils", () => ({
  translateText: jest.fn((key: string) => key),
  renderNumber: jest.fn((n: number | bigint) => String(n)),
}));
jest.mock("../../../src/client/CitizenBadge", () => ({
  renderCitizenBadge: jest.fn(() => ""),
}));

import { PlayerType } from "../../../src/core/game/Game";
import { Leaderboard } from "../../../src/client/graphics/layers/Leaderboard";

// The mock mirrors `PlayerView.isOnSameTeam` (GameView.ts): it reads
// `other.data.team`, so a null `other` throws `.data` on null exactly as the
// real class did — that crash is what the null-myPlayer test proves.
function makePlayer(name: string, tiles: number, team = "red") {
  return {
    data: { team },
    type: () => PlayerType.Human,
    gold: () => 0n,
    troops: () => 100,
    numTilesOwned: () => tiles,
    isAlive: () => true,
    displayName: () => name,
    isOnSameTeam: jest.fn(
      (other: { data: { team: string } }) =>
        team !== undefined && team === other.data.team,
    ),
  };
}

function makeGame(players: unknown[], myPlayer: unknown) {
  return {
    myPlayer: () => myPlayer,
    playerViews: () => players,
    numLandTiles: () => 100,
    numTilesWithFallout: () => 0,
    ticks: () => 10,
  };
}

function makeLeaderboard(game: unknown): Leaderboard {
  const leaderboard = new Leaderboard();
  leaderboard.game = game as never;
  leaderboard.visible = true;
  return leaderboard;
}

describe("Leaderboard.updateLeaderboard", () => {
  // Task 0032: myPlayer is null for a spectator or a missed spawn. The old
  // `player.isOnSameTeam(myPlayer!)` dereferenced null every 10 ticks.
  test("tick with no myPlayer does not throw and marks nobody as a teammate", () => {
    const a = makePlayer("a", 10);
    const b = makePlayer("b", 5);
    const leaderboard = makeLeaderboard(makeGame([a, b], null));

    expect(() => leaderboard.tick()).not.toThrow();

    expect(leaderboard.players.map((p) => p.name)).toEqual(["a", "b"]);
    expect(leaderboard.players.every((p) => !p.isMyPlayer)).toBe(true);
    expect(leaderboard.players.every((p) => !p.isOnSameTeam)).toBe(true);
    expect(a.isOnSameTeam).not.toHaveBeenCalled();
    expect(b.isOnSameTeam).not.toHaveBeenCalled();
  });

  test("with a myPlayer, teammates are still resolved through isOnSameTeam", () => {
    const me = makePlayer("me", 10);
    const other = makePlayer("other", 5);
    const rival = makePlayer("rival", 3, "blue");
    const leaderboard = makeLeaderboard(makeGame([me, other, rival], me));

    leaderboard.tick();

    const byName = Object.fromEntries(
      leaderboard.players.map((p) => [p.name, p]),
    );
    expect(byName.me.isMyPlayer).toBe(true);
    expect(byName.me.isOnSameTeam).toBe(true);
    expect(byName.other.isOnSameTeam).toBe(true);
    expect(byName.rival.isOnSameTeam).toBe(false);
    expect(other.isOnSameTeam).toHaveBeenCalledWith(me);
    expect(rival.isOnSameTeam).toHaveBeenCalledWith(me);
  });
});
