// Task 0404: the forced "please refresh" popup after 23 h on one page — start
// screen only, never over a payment/login dialog, one-shot. Every dependency is
// injected: a fake clock, a fake interval and a fake visibility listener, so no
// real waits. The start-screen and dialog sources are the real modules.
jest.mock("../../src/client/flashist/FlashistFacade", () => ({
  flashistConstants: {
    analyticEvents: {
      LONG_SESSION_REFRESH_DUE: "Session:LongSessionRefresh:Due",
      LONG_SESSION_REFRESH_SHOWN: "Session:LongSessionRefresh:Shown",
      LONG_SESSION_REFRESH_PRESSED: "Session:LongSessionRefresh:Refresh",
      LONG_SESSION_REFRESH_WAITED: "Session:LongSessionRefresh:Waited",
      LONG_SESSION_REFRESH_DEFERRED_BY_DIALOG:
        "Session:LongSessionRefresh:DeferredByDialog",
      LONG_SESSION_REFRESH_PREEMPTED_BY_STALE_BUILD:
        "Session:LongSessionRefresh:PreemptedByStaleBuild",
    },
  },
  flashist_logEventAnalytics: jest.fn(),
}));

import {
  decideLongSessionRefresh,
  LONG_SESSION_REFRESH_AFTER_MS,
  type LongSessionRefreshDeps,
  type LongSessionRefreshInputs,
  startLongSessionRefreshChecker,
} from "../../src/client/LongSessionRefresh";
import {
  beginPlatformDialog,
  isPlatformDialogOpen,
  resetPlatformDialogPresenceForTests,
  whenNoPlatformDialogOpen,
} from "../../src/client/PlatformDialogPresence";
import {
  beginJoiningLobby,
  isOnStartScreen,
  reportBackOnStartScreen,
  resetStartScreenPresenceForTests,
  setStartScreenPresenceSource,
  whenOnStartScreen,
} from "../../src/client/StartScreenPresence";

const MINUTE = 60_000;
const PAGE_LOADED_AT = 1_700_000_000_000;
const INTERVAL_HANDLE = Symbol("interval");

const DUE = "Session:LongSessionRefresh:Due";
const SHOWN = "Session:LongSessionRefresh:Shown";
const WAITED = "Session:LongSessionRefresh:Waited";
const DEFERRED_BY_DIALOG = "Session:LongSessionRefresh:DeferredByDialog";
const PREEMPTED = "Session:LongSessionRefresh:PreemptedByStaleBuild";

async function flush(): Promise<void> {
  for (let i = 0; i < 20; i++) {
    await Promise.resolve();
  }
}

function makeHarness(options: { showPopupResult?: boolean } = {}) {
  let nowMs = PAGE_LOADED_AT;
  let visible = true;
  let intervalCallback: (() => void) | null = null;
  let intervalMs: number | null = null;
  const visibilityListeners = new Set<() => void>();
  const clearInterval = jest.fn();
  const showPopup = jest.fn(() => options.showPopupResult ?? true);
  const logEvent = jest.fn();

  const deps: LongSessionRefreshDeps = {
    now: () => nowMs,
    pageLoadedAt: PAGE_LOADED_AT,
    isTabVisible: () => visible,
    addVisibilityListener: (listener) => {
      visibilityListeners.add(listener);
      return () => visibilityListeners.delete(listener);
    },
    setInterval: (callback, ms) => {
      intervalCallback = callback;
      intervalMs = ms;
      return INTERVAL_HANDLE;
    },
    clearInterval,
    isOnStartScreen,
    whenOnStartScreen,
    isPlatformDialogOpen,
    whenNoPlatformDialogOpen,
    showPopup,
    logEvent,
  };

  return {
    deps,
    showPopup,
    logEvent,
    clearInterval,
    visibilityListeners,
    get intervalMs() {
      return intervalMs;
    },
    setPageAge(ms: number) {
      nowMs = PAGE_LOADED_AT + ms;
    },
    advance(ms: number) {
      nowMs += ms;
    },
    /** One interval tick (the timer firing). */
    async tick() {
      intervalCallback?.();
      await flush();
    },
    async setVisible(value: boolean) {
      visible = value;
      for (const listener of [...visibilityListeners]) {
        listener();
      }
      await flush();
    },
    events: () => logEvent.mock.calls.map((call) => call[0] as string),
    eventCalls: () => logEvent.mock.calls as Array<[string, number?]>,
  };
}

describe("LongSessionRefresh (task 0404)", () => {
  beforeEach(() => {
    resetStartScreenPresenceForTests();
    resetPlatformDialogPresenceForTests();
  });

  it("the threshold is exactly 23 hours (a forgotten local edit turns this red)", () => {
    expect(LONG_SESSION_REFRESH_AFTER_MS).toBe(23 * 60 * 60 * 1000);
    expect(LONG_SESSION_REFRESH_AFTER_MS).toBe(82_800_000);
  });

  describe("decideLongSessionRefresh", () => {
    const due: LongSessionRefreshInputs = {
      pageAgeMs: LONG_SESSION_REFRESH_AFTER_MS,
      isTabVisible: true,
      isOnStartScreen: true,
      isPlatformDialogOpen: false,
    };

    it.each<[string, Partial<LongSessionRefreshInputs>, string]>([
      ["page age 0", { pageAgeMs: 0 }, "not-yet"],
      [
        "1 ms below the threshold",
        { pageAgeMs: LONG_SESSION_REFRESH_AFTER_MS - 1 },
        "not-yet",
      ],
      [
        "below the threshold beats everything else",
        {
          pageAgeMs: 0,
          isTabVisible: false,
          isOnStartScreen: false,
          isPlatformDialogOpen: true,
        },
        "not-yet",
      ],
      ["at the threshold, all clear", {}, "show"],
      [
        "well past the threshold, all clear",
        { pageAgeMs: 3 * LONG_SESSION_REFRESH_AFTER_MS },
        "show",
      ],
      ["tab hidden", { isTabVisible: false }, "wait-until-visible"],
      [
        "tab hidden beats not on the start screen",
        { isTabVisible: false, isOnStartScreen: false },
        "wait-until-visible",
      ],
      [
        "not on the start screen",
        { isOnStartScreen: false },
        "wait-for-start-screen",
      ],
      [
        "not on the start screen beats a dialog",
        { isOnStartScreen: false, isPlatformDialogOpen: true },
        "wait-for-start-screen",
      ],
      ["a dialog open", { isPlatformDialogOpen: true }, "wait-for-dialog"],
    ])("%s → %s", (_label, fields, expected) => {
      expect(decideLongSessionRefresh({ ...due, ...fields })).toBe(expected);
    });
  });

  describe("startLongSessionRefreshChecker", () => {
    it("checks every 60 s and listens for visibility", () => {
      const harness = makeHarness();
      startLongSessionRefreshChecker(harness.deps);
      expect(harness.intervalMs).toBe(MINUTE);
      expect(harness.visibilityListeners.size).toBe(1);
    });

    it("below the threshold: nothing", async () => {
      const harness = makeHarness();
      startLongSessionRefreshChecker(harness.deps);
      harness.setPageAge(LONG_SESSION_REFRESH_AFTER_MS - 1);
      await harness.tick();
      await harness.setVisible(true);

      expect(harness.showPopup).not.toHaveBeenCalled();
      expect(harness.logEvent).not.toHaveBeenCalled();
      expect(harness.clearInterval).not.toHaveBeenCalled();
    });

    it("at the threshold, visible, on the start screen: shown once with Due and Shown minutes", async () => {
      const harness = makeHarness();
      startLongSessionRefreshChecker(harness.deps);
      harness.setPageAge(LONG_SESSION_REFRESH_AFTER_MS + 30_000);
      await harness.tick();

      expect(harness.showPopup).toHaveBeenCalledTimes(1);
      expect(harness.eventCalls()).toEqual([
        [DUE, 1380],
        [SHOWN, 1380],
      ]);
    });

    it("hidden tab: nothing until the tab becomes visible", async () => {
      const harness = makeHarness();
      startLongSessionRefreshChecker(harness.deps);
      await harness.setVisible(false);
      harness.setPageAge(LONG_SESSION_REFRESH_AFTER_MS);
      await harness.tick();
      await harness.tick();
      expect(harness.showPopup).not.toHaveBeenCalled();
      expect(harness.logEvent).not.toHaveBeenCalled();

      harness.advance(10 * MINUTE);
      await harness.setVisible(true);
      expect(harness.showPopup).toHaveBeenCalledTimes(1);
      expect(harness.eventCalls()).toEqual([
        [DUE, 1390],
        [SHOWN, 1390],
      ]);
    });

    it("a clock jump past the threshold through one visibility event (laptop sleep): shown", async () => {
      const harness = makeHarness();
      startLongSessionRefreshChecker(harness.deps);
      await harness.setVisible(false);
      harness.setPageAge(30 * 60 * MINUTE); // 30 h, no tick in between
      await harness.setVisible(true);

      expect(harness.showPopup).toHaveBeenCalledTimes(1);
      expect(harness.eventCalls()).toEqual([
        [DUE, 1800],
        [SHOWN, 1800],
      ]);
    });

    it("in a lobby or match: waits, then shows on the return to the start screen", async () => {
      let away = true;
      setStartScreenPresenceSource(() => away);
      const harness = makeHarness();
      startLongSessionRefreshChecker(harness.deps);
      harness.setPageAge(LONG_SESSION_REFRESH_AFTER_MS);
      await harness.tick();

      expect(harness.showPopup).not.toHaveBeenCalled();
      expect(harness.events()).toEqual([DUE]);
      // The trigger is one-shot even while it waits.
      expect(harness.clearInterval).toHaveBeenCalledWith(INTERVAL_HANDLE);

      harness.advance(7 * MINUTE);
      away = false;
      reportBackOnStartScreen();
      await flush();

      expect(harness.showPopup).toHaveBeenCalledTimes(1);
      expect(harness.eventCalls()).toEqual([
        [DUE, 1380],
        [SHOWN, 1387],
        [WAITED, 7],
      ]);
    });

    it("a join being set up: waits until it ends", async () => {
      const endJoin = beginJoiningLobby();
      const harness = makeHarness();
      startLongSessionRefreshChecker(harness.deps);
      harness.setPageAge(LONG_SESSION_REFRESH_AFTER_MS);
      await harness.tick();
      expect(harness.showPopup).not.toHaveBeenCalled();

      endJoin(); // the join failed: back on the start screen
      await flush();
      expect(harness.showPopup).toHaveBeenCalledTimes(1);
    });

    it("a payment or login dialog open: waits until it closes, logs DeferredByDialog once", async () => {
      const endDialog = beginPlatformDialog();
      const harness = makeHarness();
      startLongSessionRefreshChecker(harness.deps);
      harness.setPageAge(LONG_SESSION_REFRESH_AFTER_MS);
      await harness.tick();

      expect(harness.showPopup).not.toHaveBeenCalled();
      expect(harness.events()).toEqual([DUE, DEFERRED_BY_DIALOG]);

      harness.advance(2 * MINUTE);
      endDialog();
      await flush();

      expect(harness.showPopup).toHaveBeenCalledTimes(1);
      expect(harness.eventCalls()).toEqual([
        [DUE, 1380],
        [DEFERRED_BY_DIALOG],
        [SHOWN, 1382],
        [WAITED, 2],
      ]);
    });

    it("the dialog closes but the player has meanwhile joined a lobby: keeps waiting", async () => {
      let away = false;
      setStartScreenPresenceSource(() => away);
      const endDialog = beginPlatformDialog();
      const harness = makeHarness();
      startLongSessionRefreshChecker(harness.deps);
      harness.setPageAge(LONG_SESSION_REFRESH_AFTER_MS);
      await harness.tick();

      away = true; // joined a lobby while the dialog was closing
      endDialog();
      await flush();
      expect(harness.showPopup).not.toHaveBeenCalled();

      away = false;
      reportBackOnStartScreen();
      await flush();
      expect(harness.showPopup).toHaveBeenCalledTimes(1);
    });

    it("a second dialog opened after the first one: DeferredByDialog still logged only once", async () => {
      let endDialog = beginPlatformDialog();
      let away = false;
      setStartScreenPresenceSource(() => away);
      const harness = makeHarness();
      startLongSessionRefreshChecker(harness.deps);
      harness.setPageAge(LONG_SESSION_REFRESH_AFTER_MS);
      await harness.tick();

      away = true;
      endDialog();
      await flush();
      endDialog = beginPlatformDialog();
      away = false;
      reportBackOnStartScreen();
      await flush();
      expect(harness.showPopup).not.toHaveBeenCalled();

      endDialog();
      await flush();
      expect(harness.showPopup).toHaveBeenCalledTimes(1);
      expect(
        harness.events().filter((event) => event === DEFERRED_BY_DIALOG),
      ).toHaveLength(1);
    });

    it("showPopup returns false (the stale-build popup is up): no Shown, PreemptedByStaleBuild instead", async () => {
      const harness = makeHarness({ showPopupResult: false });
      startLongSessionRefreshChecker(harness.deps);
      harness.setPageAge(LONG_SESSION_REFRESH_AFTER_MS);
      await harness.tick();

      expect(harness.showPopup).toHaveBeenCalledTimes(1);
      expect(harness.events()).toEqual([DUE, PREEMPTED]);
    });

    it("one-shot: interval cleared, listener removed, never shown twice", async () => {
      const harness = makeHarness();
      startLongSessionRefreshChecker(harness.deps);
      harness.setPageAge(LONG_SESSION_REFRESH_AFTER_MS);
      await harness.tick();

      expect(harness.clearInterval).toHaveBeenCalledWith(INTERVAL_HANDLE);
      expect(harness.visibilityListeners.size).toBe(0);

      harness.advance(60 * MINUTE);
      await harness.tick();
      await harness.setVisible(true);
      expect(harness.showPopup).toHaveBeenCalledTimes(1);
      expect(harness.events()).toEqual([DUE, SHOWN]);
    });

    it("showPopup throwing (no popup element) never rejects", async () => {
      const harness = makeHarness();
      harness.showPopup.mockImplementation(() => {
        throw new Error("no element");
      });
      startLongSessionRefreshChecker(harness.deps);
      harness.setPageAge(LONG_SESSION_REFRESH_AFTER_MS);
      await expect(harness.tick()).resolves.toBeUndefined();
      expect(harness.events()).toEqual([DUE]);
    });
  });
});
