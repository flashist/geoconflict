/**
 * @jest-environment jsdom
 */
// Task 0404: one <stale-build-modal>, two messages — the stale-build message
// (task 0113, unchanged) and the long-session "please refresh" message — so two
// refresh popups never stack.
jest.mock("../../src/client/Utils", () => ({
  translateText: jest.fn((key: string) => key),
}));
jest.mock("../../src/client/FeedbackModal", () => ({
  FeedbackModalScreenSource: { staleBuild: "staleBuild" },
  showFeedbackModal: jest.fn(),
}));
jest.mock("../../src/client/flashist/FlashistFacade", () => ({
  flashistConstants: {
    analyticEvents: {
      UI_CLICK_STALE_BUILD_REFRESH: "UI:ClickStaleBuildRefresh",
      UI_CLICK_STALE_BUILD_CONTACT: "UI:ClickStaleBuildContact",
      LONG_SESSION_REFRESH_PRESSED: "Session:LongSessionRefresh:Refresh",
    },
  },
  flashist_logEventAnalytics: jest.fn(),
  FlashistFacade: {
    instance: { reloadAppWithoutHash: jest.fn() },
  },
}));

import * as fs from "fs";
import type { CSSResult } from "lit";
import * as path from "path";
import {
  FlashistFacade,
  flashist_logEventAnalytics,
} from "../../src/client/flashist/FlashistFacade";
import { isLongSessionRefreshShowing } from "../../src/client/LongSessionRefresh";
import { StaleBuildModal } from "../../src/client/StaleBuildModal";

const logEventAnalytics = flashist_logEventAnalytics as jest.Mock;
const reloadAppWithoutHash = FlashistFacade.instance
  .reloadAppWithoutHash as jest.Mock;

const loggedEvents = (): string[] =>
  logEventAnalytics.mock.calls.map((call) => call[0] as string);

async function mount(): Promise<StaleBuildModal> {
  const modal = new StaleBuildModal();
  document.body.appendChild(modal);
  await modal.updateComplete;
  return modal;
}

const overlays = (modal: StaleBuildModal) =>
  modal.shadowRoot!.querySelectorAll(".modal-overlay");
const text = (modal: StaleBuildModal) => modal.shadowRoot!.textContent!;
const buttons = (modal: StaleBuildModal) =>
  [...modal.shadowRoot!.querySelectorAll("button")] as HTMLButtonElement[];

describe("StaleBuildModal", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    jest.clearAllMocks();
    // jsdom cannot navigate: the stale path's window.location.reload() only
    // reports "not implemented" on console.error (location cannot be stubbed).
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("is hidden until shown", async () => {
    const modal = await mount();
    expect(modal.isVisible).toBe(false);
    expect(overlays(modal)[0].classList.contains("visible")).toBe(false);
  });

  it("stale show(): today's message and contact link; REFRESH logs UI:ClickStaleBuildRefresh, not the hash-dropping reload", async () => {
    const modal = await mount();
    modal.show();
    await modal.updateComplete;

    expect(overlays(modal)[0].classList.contains("visible")).toBe(true);
    expect(text(modal)).toContain("stale_build_modal.message");
    expect(text(modal)).toContain("stale_build_modal.contact_link");
    expect(text(modal)).not.toContain("long_session_refresh_modal");

    modal
      .shadowRoot!.querySelector<HTMLButtonElement>(".refresh-button")!
      .click();
    expect(loggedEvents()).toEqual(["UI:ClickStaleBuildRefresh"]);
    expect(reloadAppWithoutHash).not.toHaveBeenCalled();
  });

  it("showLongSession(): title, message and button keys; no contact link and no close control", async () => {
    const modal = await mount();
    expect(modal.showLongSession()).toBe(true);
    await modal.updateComplete;

    expect(overlays(modal)).toHaveLength(1);
    expect(overlays(modal)[0].classList.contains("visible")).toBe(true);
    for (const key of ["title", "message", "refresh_button"]) {
      expect(text(modal)).toContain(`long_session_refresh_modal.${key}`);
    }
    expect(text(modal)).not.toContain("stale_build_modal");
    expect(modal.shadowRoot!.querySelector(".contact-link")).toBeNull();
    // The refresh button is the only control.
    expect(buttons(modal)).toHaveLength(1);
  });

  it("the long-session REFRESH logs Session:LongSessionRefresh:Refresh and reloads without the hash", async () => {
    const modal = await mount();
    modal.showLongSession();
    await modal.updateComplete;

    buttons(modal)[0].click();
    expect(loggedEvents()).toEqual(["Session:LongSessionRefresh:Refresh"]);
    expect(reloadAppWithoutHash).toHaveBeenCalledTimes(1);
  });

  it("an outside click does not close the long-session popup", async () => {
    const modal = await mount();
    modal.showLongSession();
    await modal.updateComplete;

    (overlays(modal)[0] as HTMLElement).click();
    await modal.updateComplete;
    expect(modal.isVisible).toBe(true);
    expect(logEventAnalytics).not.toHaveBeenCalled();
  });

  it("stale show() while the long-session popup is up: one overlay, the stale message", async () => {
    const modal = await mount();
    modal.showLongSession();
    await modal.updateComplete;
    modal.show();
    await modal.updateComplete;

    expect(overlays(modal)).toHaveLength(1);
    expect(overlays(modal)[0].classList.contains("visible")).toBe(true);
    expect(text(modal)).toContain("stale_build_modal.message");
    expect(text(modal)).not.toContain("long_session_refresh_modal");
  });

  it("showLongSession() while the stale popup is up: returns false, still stale", async () => {
    const modal = await mount();
    modal.show();
    await modal.updateComplete;

    expect(modal.showLongSession()).toBe(false);
    await modal.updateComplete;
    expect(text(modal)).toContain("stale_build_modal.message");
    expect(text(modal)).not.toContain("long_session_refresh_modal");
  });

  it("showLongSession() twice: the second returns false", async () => {
    const modal = await mount();
    expect(modal.showLongSession()).toBe(true);
    expect(modal.showLongSession()).toBe(false);
  });

  // Task 0404 review R1: o-modal, reconnect-modal and most other windows are
  // also z-index 9999 and come later in the DOM, so at an equal z-index they
  // paint over this element. The long-session popup must be topmost, or it can
  // sit under the single-player window, let the player press Start, and then be
  // revealed over the match. jsdom does not paint: these tests pin the class
  // and the numbers; only a browser confirms what is actually on top.
  describe("review R1: the long-session popup is topmost; the stale one keeps its stacking", () => {
    const styleText = (StaleBuildModal.styles as CSSResult).cssText;
    const zIndexOf = (selector: RegExp): number => {
      const match = styleText.match(selector);
      expect(match).not.toBeNull();
      return Number(match![1]);
    };
    const longSessionZIndex = () =>
      zIndexOf(/\.modal-overlay\.long-session\s*\{[^}]*z-index:\s*(\d+)/);

    it("the long-session overlay carries the long-session class; the stale overlay does not", async () => {
      const modal = await mount();
      modal.showLongSession();
      await modal.updateComplete;
      expect(overlays(modal)[0].classList.contains("long-session")).toBe(true);

      modal.show();
      await modal.updateComplete;
      expect(overlays(modal)[0].classList.contains("long-session")).toBe(false);
    });

    it("the stale overlay is still z-index 9999 (task 0113, locked)", () => {
      expect(zIndexOf(/\.modal-overlay\s*\{[^}]*z-index:\s*(\d+)/)).toBe(9999);
    });

    // Every way src/client sets a z-index: CSS, camelCase (style.zIndex /
    // Object.assign), Tailwind arbitrary values, and the string-property form —
    // d3 .style("z-index", …), setProperty("z-index", …), style["z-index"] = …,
    // { "z-index": … } (review R2: RadialMenu.ts uses the d3 form).
    const zIndexPatterns = [
      /z-index:\s*(\d+)/g,
      /zIndex["']?\s*[:=]\s*["']?(\d+)/g,
      /\bz-\[(\d+)\]/g,
      /["']z-index["']\s*(?:[,:]|\]\s*=)\s*["']?(\d+)/g,
    ];
    const zIndexValuesIn = (source: string): number[] =>
      zIndexPatterns.flatMap((pattern) =>
        [...source.matchAll(pattern)].map((match) => Number(match[1])),
      );

    it("the z-index scan recognises every form of setting a z-index", () => {
      const forms = [
        ".overlay { z-index: 10003; }",
        'el.style.zIndex = "10003";',
        'Object.assign(el.style, { zIndex: "10003" });',
        '<div class="z-[10003]"></div>',
        'd3.select(el).style("z-index", "10003")',
        "d3.select(el).style('z-index', 10003)",
        'el.style.setProperty("z-index", "10003")',
        'el.style["z-index"] = "10003";',
        'styleMap({ "z-index": "10003" })',
      ];
      for (const form of forms) {
        expect({ form, values: zIndexValuesIn(form) }).toEqual({
          form,
          values: [10003],
        });
      }
    });

    it("the long-session z-index is above every other z-index in src/client", () => {
      const clientDir = path.join(__dirname, "../../src/client");
      const found: Array<{ file: string; value: number }> = [];
      const walk = (dir: string) => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            walk(full);
          } else if (
            /\.(ts|html|css)$/.test(entry.name) &&
            entry.name !== "StaleBuildModal.ts"
          ) {
            const source = fs.readFileSync(full, "utf8");
            for (const value of zIndexValuesIn(source)) {
              found.push({ file: full, value });
            }
          }
        }
      };
      walk(clientDir);

      // Sanity: the scan does see the windows R1 is about.
      expect(
        found.some((z) => z.file.endsWith("Modal.ts") && z.value === 9999),
      ).toBe(true);
      const highest = Math.max(...found.map((z) => z.value));
      expect(longSessionZIndex()).toBeGreaterThan(highest);
    });

    it("isShowingLongSession: only while the long-session message is up", async () => {
      const modal = await mount();
      expect(modal.isShowingLongSession).toBe(false);

      modal.showLongSession();
      expect(modal.isShowingLongSession).toBe(true);

      // A stale build replaces it: from then on the stale path rules.
      modal.show();
      expect(modal.isShowingLongSession).toBe(false);
    });

    it("isShowingLongSession is false for a stale popup on its own", async () => {
      const modal = await mount();
      modal.show();
      expect(modal.isShowingLongSession).toBe(false);
    });

    it("isLongSessionRefreshShowing() reads the element in the document; false with none", async () => {
      expect(isLongSessionRefreshShowing()).toBe(false);
      const modal = await mount();
      expect(isLongSessionRefreshShowing()).toBe(false);
      modal.showLongSession();
      expect(isLongSessionRefreshShowing()).toBe(true);
      modal.show();
      expect(isLongSessionRefreshShowing()).toBe(false);
    });

    it("Main's join handler drops a join while the popup is up, before it marks a join", () => {
      // Main.ts cannot be constructed in a unit test (the StartScreenPresence /
      // HostLobbyOpen tests make the same call); pin the guard's place instead.
      const mainSource = fs.readFileSync(
        path.join(__dirname, "../../src/client/Main.ts"),
        "utf8",
      );
      const handler = mainSource.slice(
        mainSource.indexOf("private async handleJoinLobby("),
        mainSource.indexOf("private async joinLobbyFromEvent("),
      );
      const guardAt = handler.indexOf("if (isLongSessionRefreshShowing()) {");
      expect(guardAt).toBeGreaterThan(0);
      expect(handler.indexOf("return;", guardAt)).toBeLessThan(
        handler.indexOf("beginJoiningLobby()"),
      );
    });
  });
});
