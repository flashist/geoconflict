/**
 * @jest-environment jsdom
 */

// Leaderboard uses LitElement decorators which SWC can't process in tests
jest.mock("../src/client/graphics/layers/Leaderboard", () => ({
  GoToPlayerEvent: class {
    constructor(public player: any) { }
  },
  GoToPositionEvent: class {
    constructor(
      public x: number,
      public y: number,
    ) { }
  },
  GoToUnitEvent: class {
    constructor(public unit: any) { }
  },
}));

import {
  TransformHandler,
  ZOOM_TO_PLAYER_MIN,
  ZOOM_TO_PLAYER_MAX,
} from "../src/client/graphics/TransformHandler";
import { EventBus } from "../src/core/EventBus";

const mockGameView = {
  width: () => 1000,
  height: () => 800,
  myPlayer: () => null,
} as any;

function makeHandler(viewportW: number, viewportH: number): TransformHandler {
  const canvas = document.createElement("canvas");
  canvas.width = viewportW;
  canvas.height = viewportH;
  jest.spyOn(canvas, "getBoundingClientRect").mockReturnValue({
    width: viewportW,
    height: viewportH,
    top: 0,
    left: 0,
    bottom: viewportH,
    right: viewportW,
    x: 0,
    y: 0,
    toJSON: () => { },
  } as DOMRect);
  return new TransformHandler(mockGameView, new EventBus(), canvas);
}

function mockPlayer(tiles: number) {
  return { numTilesOwned: () => tiles, nameLocation: () => null } as any;
}

describe("TransformHandler.calculateZoomForPlayer", () => {
  test("clamps to ZOOM_TO_PLAYER_MAX for very small territory (1 tile)", () => {
    const handler = makeHandler(800, 600);
    const zoom = (handler as any).calculateZoomForPlayer(mockPlayer(1));
    expect(zoom).toBe(ZOOM_TO_PLAYER_MAX);
  });

  test("clamps to ZOOM_TO_PLAYER_MIN for very large territory (1 000 000 tiles)", () => {
    const handler = makeHandler(800, 600);
    const zoom = (handler as any).calculateZoomForPlayer(mockPlayer(1_000_000));
    expect(zoom).toBe(ZOOM_TO_PLAYER_MIN);
  });

  test("zooms closer for small territory than for large territory", () => {
    const handler = makeHandler(800, 600);
    const smallZoom = (handler as any).calculateZoomForPlayer(mockPlayer(100));
    const largeZoom = (handler as any).calculateZoomForPlayer(mockPlayer(5000));
    expect(smallZoom).toBeGreaterThan(largeZoom);
  });

  test("result is always within [ZOOM_TO_PLAYER_MIN, ZOOM_TO_PLAYER_MAX] for various sizes", () => {
    const handler = makeHandler(800, 600);
    for (const tiles of [1, 10, 100, 1000, 10000, 100000]) {
      const zoom = (handler as any).calculateZoomForPlayer(mockPlayer(tiles));
      expect(zoom).toBeGreaterThanOrEqual(ZOOM_TO_PLAYER_MIN);
      expect(zoom).toBeLessThanOrEqual(ZOOM_TO_PLAYER_MAX);
    }
  });

  test("uses the smaller viewport dimension (landscape vs portrait give same result)", () => {
    // Both have the same smaller dimension (300px), so zoom should be equal
    const wideHandler = makeHandler(800, 300);
    const tallHandler = makeHandler(300, 800);
    const wideZoom = (wideHandler as any).calculateZoomForPlayer(mockPlayer(500));
    const tallZoom = (tallHandler as any).calculateZoomForPlayer(mockPlayer(500));
    expect(wideZoom).toBeCloseTo(tallZoom);
  });

  test("larger viewport produces higher zoom for same territory size", () => {
    const smallViewport = makeHandler(400, 300);
    const largeViewport = makeHandler(800, 600);
    const zoom400 = (smallViewport as any).calculateZoomForPlayer(mockPlayer(1000));
    const zoom800 = (largeViewport as any).calculateZoomForPlayer(mockPlayer(1000));
    expect(zoom800).toBeGreaterThan(zoom400);
  });
});
