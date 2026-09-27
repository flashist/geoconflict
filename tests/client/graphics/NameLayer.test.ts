/**
 * @jest-environment jsdom
 */
// Task 0307 (F1): NameLayer draws a player's name as TEXT, never as HTML. It used
// `innerHTML`, which was safe only because PlayerImpl runs sanitizeUsername on
// every name; these drive the layer with a name that sanitizer would have
// removed, to prove the layer no longer depends on it.
import { NameLayer } from "../../../src/client/graphics/layers/NameLayer";

const HOSTILE = '<img src=x onerror="window.__pwned=1"><b>Bold</b>';

/** A PlayerView stand-in: named methods as given, anything else returns false. */
function fakePlayer(overrides: Record<string, unknown>) {
  return new Proxy(overrides, {
    get(target, key: string) {
      if (key in target) {
        return target[key];
      }
      return () => false;
    },
  }) as never;
}

// Built with Object.create, not `new`: NameLayer's `theme` field initializer reads
// `this.game` before the constructor's parameter properties are assigned under
// the test transform (SWC), so the real constructor cannot run here. Only the
// fields the two name paths read are set.
function makeLayer() {
  const theme = { textColor: () => "#fff", font: () => "Arial" };
  const game = {
    config: () => ({
      theme: () => theme,
      maxTroops: () => 100,
      userSettings: () => null,
    }),
    myPlayer: () => null,
    units: () => [],
  };
  const container = document.createElement("div");
  const layer = Object.assign(Object.create(NameLayer.prototype), {
    game,
    transformHandler: { scale: 1, isOnScreen: () => true },
    theme,
    container,
    renders: [],
    renderRefreshRate: 500,
    rand: { nextInt: () => 0 },
    userSettings: { darkMode: () => false },
    isVisible: true,
    firstPlace: null,
    // The icon images the refresh path reads a `src` from.
    ...Object.fromEntries(
      [
        "traitorIconImage",
        "disconnectedIconImage",
        "allianceIconImage",
        "allianceRequestBlackIconImage",
        "allianceRequestWhiteIconImage",
        "crownIconImage",
        "targetIconImage",
        "embargoBlackIconImage",
        "embargoWhiteIconImage",
        "nukeWhiteIconImage",
        "nukeRedIconImage",
        "shieldIconImage",
      ].map((field) => [field, { src: "icon.svg" }]),
    ),
  }) as NameLayer;
  return { layer, container };
}

describe("NameLayer — a name is text, not HTML (task 0307, F1)", () => {
  afterEach(() => {
    delete (window as unknown as { __pwned?: number }).__pwned;
  });

  it("creates the name span with the raw text and no HTML elements", () => {
    const { layer } = makeLayer();
    const player = fakePlayer({
      name: () => HOSTILE,
      cosmetics: {},
      troops: () => 10,
    });
    const element = (
      layer as unknown as {
        createPlayerElement(p: unknown): HTMLDivElement;
      }
    ).createPlayerElement(player);
    const span = element.querySelector(".player-name-span")!;
    expect(span.textContent).toBe(HOSTILE);
    expect(span.querySelector("img")).toBeNull();
    expect(span.querySelector("b")).toBeNull();
    expect(span.children).toHaveLength(0);
  });

  it("keeps it text when renderPlayerInfo refreshes the name", () => {
    const { layer, container } = makeLayer();
    const player = fakePlayer({
      name: () => HOSTILE,
      cosmetics: {},
      troops: () => 10,
      numTilesOwned: () => 1,
      outgoingAttacks: () => [],
      outgoingEmojis: () => [],
      isAlive: () => true,
      nameLocation: () => ({ x: 5, y: 5, size: 100 }),
    });
    const element = (
      layer as unknown as {
        createPlayerElement(p: unknown): HTMLDivElement;
      }
    ).createPlayerElement(player);
    const span = element.querySelector(".player-name-span")!;
    span.textContent = "stale";
    layer.renderPlayerInfo({
      player,
      lastRenderCalc: 0,
      location: null,
      fontSize: 10,
      fontColor: "#fff",
      element,
      icons: new Map(),
    } as never);
    expect(span.textContent).toBe(HOSTILE);
    expect(container.querySelector("img[src='x']")).toBeNull();
    expect(span.children).toHaveLength(0);
  });
});
