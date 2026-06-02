import { Game, PlayerType } from "../src/core/game/Game";
import { TileRef } from "../src/core/game/GameMap";
import {
  closestShoreFromPlayer,
  targetTransportTile,
} from "../src/core/game/TransportShipUtils";
import { playerInfo, setup } from "./util/Setup";

function allTiles(game: Game): TileRef[] {
  const tiles: TileRef[] = [];
  for (let x = 0; x < game.width(); x++) {
    for (let y = 0; y < game.height(); y++) {
      tiles.push(game.ref(x, y));
    }
  }
  return tiles;
}

describe("targetTransportTile", () => {
  // Regression for s4c-fix-compact-map-boat-attack: compact maps (map4x.bin) can
  // strip isShore from a player's border tiles, so closestShoreFromPlayer returns
  // null and the boat attack is wrongly disabled. targetTransportTile must fall
  // back to the nearest shore near the target, regardless of ownership.
  test("falls back to a nearby shore when the target player's border tiles have no isShore", async () => {
    const game = await setup("ocean_and_land", {});
    const player = game.addPlayer(playerInfo("p", PlayerType.Human));

    // An interior land tile: owning only this tile gives the player a border with
    // no isShore tile, reproducing the compact-map defect on a normal map.
    const interior = allTiles(game).find(
      (t) => game.isLand(t) && !game.isShore(t),
    );
    expect(interior).toBeDefined();
    player.conquer(interior!);

    // Precondition: the player-shore path returns null (this is the bug branch).
    expect(closestShoreFromPlayer(game, player, interior!)).toBeNull();

    // The fallback resolves a real shore tile within range. (The pre-fix code,
    // and the literal closestShoreTN reuse, would both return null here because
    // the BFS seed tile is player-owned.)
    const dst = targetTransportTile(game, interior!);
    expect(dst).not.toBeNull();
    expect(game.isShore(dst!)).toBe(true);
  });

  // The fallback must never re-enable an attack against a genuinely landlocked
  // target: when no shore exists within range, the result stays null.
  test("returns null when no shore exists within range (genuinely landlocked)", async () => {
    // "plains" is 100% land — there are no shore tiles anywhere on the map.
    const game = await setup("plains", {});
    const player = game.addPlayer(playerInfo("p", PlayerType.Human));
    const landTile = game.ref(50, 50);
    player.conquer(landTile);

    expect(closestShoreFromPlayer(game, player, landTile)).toBeNull();
    expect(targetTransportTile(game, landTile)).toBeNull();
  });

  // Additive guarantee: when the target player already has shore tiles, the
  // fallback never runs and the result is byte-identical to the pre-fix code
  // (closestShoreFromPlayer). This is the no-regression proof for working boats.
  test("is unchanged when the target player has shore tiles (fallback not taken)", async () => {
    const game = await setup("ocean_and_land", {});
    const player = game.addPlayer(playerInfo("p", PlayerType.Human));

    const shore = allTiles(game).find((t) => game.isShore(t));
    expect(shore).toBeDefined();
    player.conquer(shore!);

    const viaPlayer = closestShoreFromPlayer(game, player, shore!);
    expect(viaPlayer).not.toBeNull();
    expect(targetTransportTile(game, shore!)).toBe(viaPlayer);
  });
});
