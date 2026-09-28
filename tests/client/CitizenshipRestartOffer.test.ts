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

import {
  CITIZENSHIP_GRANTED_MID_SESSION_EVENT,
  createCitizenshipRestartOffer,
  dispatchCitizenshipGrantedMidSession,
  type CitizenshipGrantedMidSessionDetail,
} from "../../src/client/CitizenshipRestartOffer";
import { flashist_logEventAnalytics } from "../../src/client/flashist/FlashistFacade";

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

describe("dispatchCitizenshipGrantedMidSession", () => {
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
