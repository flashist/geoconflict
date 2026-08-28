import {
  Difficulty,
  GameMapSize,
  GameMapType,
  GameMode,
  GameType,
} from "../../src/core/game/Game";
import { citizenClientIDs } from "../../src/core/game/GameView";
import {
  GameStartInfoSchema,
  Player,
  PlayerSchema,
} from "../../src/core/Schemas";

const CONFIG = {
  gameMap: GameMapType.World,
  difficulty: Difficulty.Medium,
  donateGold: false,
  donateTroops: false,
  gameType: GameType.Private,
  gameMode: GameMode.FFA,
  gameMapSize: GameMapSize.Normal,
  disableNPCs: false,
  bots: 0,
  infiniteGold: false,
  infiniteTroops: false,
  instantBuild: false,
};

function player(over: Record<string, unknown> = {}): Record<string, unknown> {
  return { clientID: "aaaa1111", username: "Player", ...over };
}

describe("citizen flag on the player wire schema (0068)", () => {
  test("absent on the wire parses to false (old server -> new client)", () => {
    const parsed = PlayerSchema.parse(player());
    expect(parsed.isCitizen).toBe(false);
  });

  test("true on the wire parses to true", () => {
    const parsed = PlayerSchema.parse(player({ isCitizen: true }));
    expect(parsed.isCitizen).toBe(true);
  });

  test("a malformed value degrades to false instead of failing the parse", () => {
    // `.catch(false)` — a bad value must never become a parse error, because
    // GameServer.start() aborts the whole game start on a failed safeParse.
    expect(PlayerSchema.parse(player({ isCitizen: "yes" })).isCitizen).toBe(
      false,
    );
    expect(PlayerSchema.parse(player({ isCitizen: null })).isCitizen).toBe(
      false,
    );
    expect(PlayerSchema.parse(player({ isCitizen: 1 })).isCitizen).toBe(false);
  });

  test("an unknown future field is stripped, not rejected (new server -> old client)", () => {
    const parsed = PlayerSchema.parse(player({ someFutureFlag: true }));
    expect(parsed).not.toHaveProperty("someFutureFlag");
  });

  test("one player's malformed flag never blocks the whole game start", () => {
    const result = GameStartInfoSchema.safeParse({
      gameID: "game1234",
      config: CONFIG,
      players: [
        player({ clientID: "aaaa1111", isCitizen: true }),
        player({ clientID: "bbbb2222", isCitizen: "not-a-boolean" }),
        player({ clientID: "cccc3333" }),
      ],
    });

    expect(result.success).toBe(true);
    expect(result.data?.players.map((p) => p.isCitizen)).toEqual([
      true,
      false,
      false,
    ]);
  });
});

describe("citizenClientIDs (0068)", () => {
  function roster(flags: boolean[]): Player[] {
    return flags.map((isCitizen, i) =>
      PlayerSchema.parse(player({ clientID: `aaaa000${i}`, isCitizen })),
    );
  }

  test("maps only the citizens in the frozen roster", () => {
    const ids = citizenClientIDs(roster([true, false, true]));

    expect(ids.has("aaaa0000")).toBe(true);
    expect(ids.has("aaaa0001")).toBe(false);
    expect(ids.has("aaaa0002")).toBe(true);
    expect(ids.size).toBe(2);
  });

  test("an all-non-citizen roster yields an empty set", () => {
    expect(citizenClientIDs(roster([false, false])).size).toBe(0);
  });

  test("an empty roster yields an empty set", () => {
    expect(citizenClientIDs([]).size).toBe(0);
  });

  test("a lookup for a player with no clientID (nation / bot) is false", () => {
    // GameView keys the set by clientID; nations and bots have `clientID: null`,
    // which the caller collapses to "" — that must never be in the set.
    const ids = citizenClientIDs(roster([true, true]));
    expect(ids.has("")).toBe(false);
  });
});
