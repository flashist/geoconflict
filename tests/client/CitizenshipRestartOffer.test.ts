/**
 * @jest-environment jsdom
 */
// Task 0303 (owner ruling 2026-09-28, option B): the "restart to apply" offer
// after a mid-session citizenship grant — when it shows, when it waits, when
// it is dropped, and when Restart may reload.
jest.mock("../../src/client/flashist/FlashistFacade", () => ({
  flashistConstants: {
    analyticEvents: {
      CITIZENSHIP_RESTART_PROMPT_RESTART: "Citizenship:RestartPrompt:Restart",
    },
  },
  flashist_logEventAnalytics: jest.fn(),
}));
// Task 0494: a test-only product, so the per-product rules have two products.
jest.mock("../../src/client/ProductClientConfig", () => {
  const actual = jest.requireActual("../../src/client/ProductClientConfig");
  return {
    getProductClientConfig: (productId: string) =>
      productId === "test_item"
        ? {
            analytics: {
              restartPrompt: {
                shown: "TestItem:RestartPrompt:Shown",
                restart: "TestItem:RestartPrompt:Restart",
                later: "TestItem:RestartPrompt:Later",
              },
            },
          }
        : actual.getProductClientConfig(productId),
  };
});

import {
  CITIZENSHIP_GRANTED_MID_SESSION_EVENT,
  createCitizenshipRestartOffer,
  dispatchCitizenshipGrantedMidSession,
  type CitizenshipGrantedMidSessionDetail,
} from "../../src/client/CitizenshipRestartOffer";
import { flashist_logEventAnalytics } from "../../src/client/flashist/FlashistFacade";
import type { PaymentProductId } from "../../src/core/profile/PaymentsContract";

const TEST_ITEM = "test_item" as unknown as PaymentProductId;

const logEventAnalytics = flashist_logEventAnalytics as jest.Mock;

function setup(options: { away?: boolean; surfacesEnabled?: boolean } = {}) {
  const state = {
    away: options.away ?? false,
    surfacesEnabled: options.surfacesEnabled ?? true,
  };
  const showPrompt = jest.fn();
  const reload = jest.fn();
  const offer = createCitizenshipRestartOffer({
    isAwayFromStartScreen: () => state.away,
    isSurfacesEnabled: async () => state.surfacesEnabled,
    showPrompt,
    reload,
  });
  return { state, offer, showPrompt, reload };
}

describe("createCitizenshipRestartOffer", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("on the start screen: shows the popup right away", async () => {
    const { offer, showPrompt } = setup();

    await offer.onGranted();

    expect(showPrompt).toHaveBeenCalledTimes(1);
  });

  it("in a lobby: waits, then shows on return to the start screen", async () => {
    const { state, offer, showPrompt } = setup({ away: true });

    await offer.onGranted();
    expect(showPrompt).not.toHaveBeenCalled();

    state.away = false;
    offer.onBackOnStartScreen();
    expect(showPrompt).toHaveBeenCalledTimes(1);
  });

  it("a match starting drops the waiting popup: nothing shows afterwards", async () => {
    const { state, offer, showPrompt } = setup({ away: true });

    await offer.onGranted();
    offer.onMatchStarting();
    state.away = false;
    offer.onBackOnStartScreen();

    expect(showPrompt).not.toHaveBeenCalled();
  });

  it("returning to the start screen with nothing waiting shows nothing", () => {
    const { offer, showPrompt } = setup();

    offer.onBackOnStartScreen();

    expect(showPrompt).not.toHaveBeenCalled();
  });

  it("shows at most once per page load", async () => {
    const { state, offer, showPrompt } = setup();

    await offer.onGranted();
    await offer.onGranted();
    state.away = true;
    await offer.onGranted();
    state.away = false;
    offer.onBackOnStartScreen();

    expect(showPrompt).toHaveBeenCalledTimes(1);
  });

  it("kill switch off: never shown, not even later", async () => {
    const { state, offer, showPrompt } = setup({
      away: true,
      surfacesEnabled: false,
    });

    await offer.onGranted();
    state.away = false;
    offer.onBackOnStartScreen();
    await offer.onGranted();

    expect(showPrompt).not.toHaveBeenCalled();
  });

  it("restart() logs Restart and reloads when no match is live", () => {
    const { offer, reload } = setup();

    expect(offer.restart()).toBe(true);

    expect(reload).toHaveBeenCalledTimes(1);
    expect(logEventAnalytics).toHaveBeenCalledWith(
      "Citizenship:RestartPrompt:Restart",
    );
    expect(logEventAnalytics.mock.invocationCallOrder[0]).toBeLessThan(
      reload.mock.invocationCallOrder[0],
    );
  });

  it("restart() never reloads while a match is live, and logs nothing", () => {
    const { offer, reload } = setup({ away: true });

    expect(offer.restart()).toBe(false);

    expect(reload).not.toHaveBeenCalled();
    expect(logEventAnalytics).not.toHaveBeenCalled();
  });

  // Review R3: the grant landed while a join from the start screen was still
  // awaiting its setup, so the popup showed as the player entered the lobby.
  it("a refused restart keeps the offer waiting: shown again on return to the start screen", async () => {
    const { state, offer, showPrompt, reload } = setup();

    await offer.onGranted();
    expect(showPrompt).toHaveBeenCalledTimes(1);
    state.away = true;
    expect(offer.restart()).toBe(false);

    await offer.onGranted();
    expect(showPrompt).toHaveBeenCalledTimes(1);

    state.away = false;
    offer.onBackOnStartScreen();
    expect(showPrompt).toHaveBeenCalledTimes(2);
    offer.onBackOnStartScreen();
    expect(showPrompt).toHaveBeenCalledTimes(2);

    expect(offer.restart()).toBe(true);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("a refused restart followed by a match start: nothing shows afterwards", async () => {
    const { state, offer, showPrompt } = setup();

    await offer.onGranted();
    state.away = true;
    offer.restart();
    offer.onMatchStarting();
    state.away = false;
    offer.onBackOnStartScreen();

    expect(showPrompt).toHaveBeenCalledTimes(1);
  });
});

describe("createCitizenshipRestartOffer — per product (task 0494)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("onGranted() with no product is citizenship (the tenure gift)", async () => {
    const { offer, showPrompt } = setup();

    await offer.onGranted();

    expect(showPrompt).toHaveBeenCalledWith("citizenship");
  });

  it("onGranted(productId) hands that product to showPrompt", async () => {
    const { offer, showPrompt } = setup();

    await offer.onGranted(TEST_ITEM);

    expect(showPrompt).toHaveBeenCalledWith(TEST_ITEM);
  });

  it("restart() logs the shown product's Restart event", async () => {
    const { offer } = setup();

    await offer.onGranted(TEST_ITEM);
    offer.restart();

    expect(logEventAnalytics).toHaveBeenCalledWith(
      "TestItem:RestartPrompt:Restart",
    );
    expect(logEventAnalytics).not.toHaveBeenCalledWith(
      "Citizenship:RestartPrompt:Restart",
    );
  });

  it("once per page across products: a second product's grant shows nothing", async () => {
    const { offer, showPrompt } = setup();

    await offer.onGranted("citizenship");
    await offer.onGranted(TEST_ITEM);
    offer.restart();

    expect(showPrompt).toHaveBeenCalledTimes(1);
    expect(showPrompt).toHaveBeenCalledWith("citizenship");
    expect(logEventAnalytics).toHaveBeenCalledWith(
      "Citizenship:RestartPrompt:Restart",
    );
  });

  it("two grants racing the kill-switch read: one popup, for the first", async () => {
    const { offer, showPrompt } = setup();

    await Promise.all([
      offer.onGranted("citizenship"),
      offer.onGranted(TEST_ITEM),
    ]);
    offer.restart();

    expect(showPrompt).toHaveBeenCalledTimes(1);
    expect(showPrompt).toHaveBeenCalledWith("citizenship");
    expect(logEventAnalytics).toHaveBeenCalledWith(
      "Citizenship:RestartPrompt:Restart",
    );
  });

  it("a waiting offer keeps the latest product", async () => {
    const { state, offer, showPrompt } = setup({ away: true });

    await offer.onGranted("citizenship");
    await offer.onGranted(TEST_ITEM);
    state.away = false;
    offer.onBackOnStartScreen();
    offer.restart();

    expect(showPrompt).toHaveBeenCalledTimes(1);
    expect(showPrompt).toHaveBeenCalledWith(TEST_ITEM);
    expect(logEventAnalytics).toHaveBeenCalledWith(
      "TestItem:RestartPrompt:Restart",
    );
  });

  it("a refused restart re-shows the same product", async () => {
    const { state, offer, showPrompt } = setup();

    await offer.onGranted(TEST_ITEM);
    state.away = true;
    offer.restart();
    state.away = false;
    offer.onBackOnStartScreen();

    expect(showPrompt).toHaveBeenNthCalledWith(2, TEST_ITEM);
  });
});

describe("dispatchCitizenshipGrantedMidSession", () => {
  it("a purchase carries its product and becamePaidCitizen (task 0494)", () => {
    const received: CitizenshipGrantedMidSessionDetail[] = [];
    const listener = (event: Event) => {
      received.push(
        (event as CustomEvent<CitizenshipGrantedMidSessionDetail>).detail,
      );
    };
    window.addEventListener(CITIZENSHIP_GRANTED_MID_SESSION_EVENT, listener);
    try {
      dispatchCitizenshipGrantedMidSession("purchase", {
        productId: TEST_ITEM,
        becamePaidCitizen: false,
      });
    } finally {
      window.removeEventListener(
        CITIZENSHIP_GRANTED_MID_SESSION_EVENT,
        listener,
      );
    }

    expect(received).toEqual([
      { source: "purchase", productId: TEST_ITEM, becamePaidCitizen: false },
    ]);
  });

  it.each(["purchase", "tenure"] as const)(
    "fires the event on window with source %s",
    (source) => {
      const received: CitizenshipGrantedMidSessionDetail[] = [];
      const listener = (event: Event) => {
        received.push(
          (event as CustomEvent<CitizenshipGrantedMidSessionDetail>).detail,
        );
      };
      window.addEventListener(CITIZENSHIP_GRANTED_MID_SESSION_EVENT, listener);
      try {
        dispatchCitizenshipGrantedMidSession(source);
      } finally {
        window.removeEventListener(
          CITIZENSHIP_GRANTED_MID_SESSION_EVENT,
          listener,
        );
      }

      expect(received).toEqual([{ source }]);
    },
  );
});
