/**
 * @jest-environment jsdom
 */

// Task 0327: closing a joined private lobby's join window must leave the lobby.
// Every close the player makes (✕, a click outside, Escape) ends in exactly one
// `leave-lobby`; closing before joining, and a programmatic close (match start,
// hash reset), send none. Uses the REAL o-modal, so ✕ and the outside click are
// the real handlers in its shadow root.

jest.mock("../../src/client/Main", () => ({ JoinLobbyEvent: class {} }));
jest.mock("../../src/client/Utils", () => ({
  translateText: (k: string) => k,
}));
jest.mock("../../src/client/CitizenBadge", () => ({
  renderCitizenBadge: () => "",
}));
jest.mock("../../src/client/components/baseComponents/Button", () => ({}));
jest.mock("../../src/client/jwt", () => ({ getApiBase: () => "/api" }));
jest.mock("../../src/core/configuration/ConfigLoader", () => ({
  getServerConfigFromClient: jest
    .fn()
    .mockResolvedValue({ workerPath: () => "w1" }),
}));
// Schemas pulls in jose, which needs a TextEncoder jsdom lacks; nothing here
// decodes patterns. Same stub as tests/client/UsernameInput.test.ts.
jest.mock("jose", () => ({
  base64url: { decode: jest.fn() },
}));
jest.mock("../../src/client/flashist/FlashistFacade", () => ({
  flashistConstants: {
    analyticEvents: {
      CITIZENSHIP_RESTART_PROMPT_RESTART: "Citizenship:RestartPrompt:Restart",
    },
  },
  flashist_logEventAnalytics: jest.fn(),
}));

import { createCitizenshipRestartOffer } from "../../src/client/CitizenshipRestartOffer";
import "../../src/client/components/baseComponents/Modal";
import { JoinPrivateLobbyModal } from "../../src/client/JoinPrivateLobbyModal";
import {
  beginJoiningLobby,
  reportBackOnStartScreen,
  resetStartScreenPresenceForTests,
  setStartScreenPresenceSource,
  whenOnStartScreen,
} from "../../src/client/StartScreenPresence";
import { exposeLitAccessors } from "./support/litAccessors";

const LOBBY_ID = "LOBBY123";

type OModalElement = HTMLElement & {
  isModalOpen: boolean;
  updateComplete: Promise<boolean>;
};

async function flush(): Promise<void> {
  for (let i = 0; i < 20; i++) await Promise.resolve();
}

describe("JoinPrivateLobbyModal close leaves the lobby (task 0327)", () => {
  let modal: JoinPrivateLobbyModal;
  let leaves: CustomEvent[];
  let joins: CustomEvent[];
  let fetchMock: jest.Mock;
  const onLeave = (e: Event) => leaves.push(e as CustomEvent);
  const onJoin = (e: Event) => joins.push(e as CustomEvent);

  const oModal = () => modal.querySelector("o-modal") as OModalElement;
  const pollCalls = () =>
    fetchMock.mock.calls
      .map((c) => c[0] as string)
      .filter((u) => u === `/w1/api/game/${LOBBY_ID}`);
  const joinButton = () => modal.querySelector("o-button");

  async function render(): Promise<void> {
    await modal.updateComplete;
    await oModal().updateComplete;
  }

  async function openAndJoin(): Promise<void> {
    modal.open(LOBBY_ID);
    await flush();
    await render();
    expect(joins).toHaveLength(1);
  }

  async function clickClose(): Promise<void> {
    const x = oModal().shadowRoot!.querySelector(
      ".c-modal__close",
    ) as HTMLElement;
    expect(x).not.toBeNull();
    x.click();
    await flush();
    await render();
  }

  async function clickOutside(): Promise<void> {
    const aside = oModal().shadowRoot!.querySelector(
      "aside.c-modal",
    ) as HTMLElement;
    expect(aside).not.toBeNull();
    aside.click();
    await flush();
    await render();
  }

  async function pressEscape(): Promise<void> {
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "Escape" }));
    await flush();
    await render();
  }

  beforeEach(async () => {
    jest.useFakeTimers();
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
    fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ exists: true, clients: [] }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    leaves = [];
    joins = [];
    document.addEventListener("leave-lobby", onLeave);
    document.addEventListener("join-lobby", onJoin);
    document.body.innerHTML = "";
    modal = new JoinPrivateLobbyModal();
    exposeLitAccessors(modal);
    document.body.appendChild(modal);
    await modal.updateComplete;
    exposeLitAccessors(oModal());
    await render();
  });

  afterEach(() => {
    document.removeEventListener("leave-lobby", onLeave);
    document.removeEventListener("join-lobby", onJoin);
    modal.remove();
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("(a) ✕ after joining sends one leave-lobby carrying the lobby id", async () => {
    await openAndJoin();

    await clickClose();

    expect(leaves).toHaveLength(1);
    expect(leaves[0].detail).toEqual({ lobby: LOBBY_ID });
    expect(oModal().isModalOpen).toBe(false);
  });

  it("(b) a click outside after joining sends one leave-lobby", async () => {
    await openAndJoin();

    await clickOutside();

    expect(leaves).toHaveLength(1);
    expect(leaves[0].detail).toEqual({ lobby: LOBBY_ID });
  });

  it("(c) Escape after joining sends one leave-lobby", async () => {
    await openAndJoin();

    await pressEscape();

    expect(leaves).toHaveLength(1);
    expect(leaves[0].detail).toEqual({ lobby: LOBBY_ID });
    expect(oModal().isModalOpen).toBe(false);
  });

  it("(d) ✕ or Escape before joining sends no leave-lobby", async () => {
    modal.open();
    await render();
    await clickClose();
    expect(leaves).toHaveLength(0);

    modal.open();
    await render();
    await pressEscape();
    expect(leaves).toHaveLength(0);
  });

  it("(e) a programmatic close sends none, nor does a later Escape with the window hidden", async () => {
    await openAndJoin();

    modal.close();
    await flush();
    await render();
    expect(leaves).toHaveLength(0);

    // The window is hidden (e.g. in a match): Escape must not leave, and must
    // not even run the close funnel (the guard on isModalOpen).
    const modalCloses = jest.fn();
    oModal().addEventListener("modal-close", modalCloses);
    await pressEscape();
    expect(leaves).toHaveLength(0);
    expect(modalCloses).not.toHaveBeenCalled();
    expect(oModal().isModalOpen).toBe(false);
  });

  it("(f) closing while the lobby check is in flight does not join afterwards", async () => {
    let finishCheck: (value: unknown) => void = () => {};
    fetchMock.mockImplementationOnce(
      () => new Promise((resolve) => (finishCheck = resolve)),
    );

    modal.open(LOBBY_ID);
    await flush();
    await render();
    await clickClose();

    finishCheck({
      ok: true,
      status: 200,
      json: async () => ({ exists: true }),
    });
    await flush();
    await render();

    expect(joins).toHaveLength(0);
    expect(leaves).toHaveLength(0);
    jest.advanceTimersByTime(3000);
    await flush();
    expect(pollCalls()).toHaveLength(0);
  });

  it("(f2) closing while the archive check is in flight shows no late message", async () => {
    let finishArchive: (value: unknown) => void = () => {};
    fetchMock.mockImplementation((url: string) => {
      if (url.endsWith("/exists")) {
        return Promise.resolve({ ok: true, json: async () => ({}) });
      }
      if (url === `/api/game/${LOBBY_ID}`) {
        return new Promise((resolve) => (finishArchive = resolve));
      }
      return Promise.resolve({ ok: true, status: 404, text: async () => "" });
    });

    modal.open(LOBBY_ID);
    await flush();
    await render();
    await clickClose();

    finishArchive({ ok: false, status: 404 });
    await flush();
    await render();

    expect(joins).toHaveLength(0);
    expect(
      modal.querySelector(".message-area")!.classList.contains("show"),
    ).toBe(false);
  });

  it("(g) after ✕, the poll stops and reopening shows the Join button again", async () => {
    await openAndJoin();
    expect(joinButton()).toBeNull();

    await clickClose();
    const pollsAtClose = pollCalls().length;
    jest.advanceTimersByTime(3000);
    await flush();
    expect(pollCalls()).toHaveLength(pollsAtClose);

    modal.open();
    await render();
    expect(joinButton()).not.toBeNull();
  });

  // The Main glue is copied here, not executed: `Client` is not exported and
  // imports half the app. These listeners mirror Main.handleJoinLobby's
  // `gameStop` set and Main.handleLeaveLobby's gate + onBackOnStartScreen call
  // (Main.ts:1011-1026).
  it("(h) a grant made while joined shows 0303's restart popup once the window is closed", async () => {
    let gameStop: (() => void) | null = null;
    const showPrompt = jest.fn();
    const offer = createCitizenshipRestartOffer({
      isAwayFromStartScreen: () => gameStop !== null,
      isSurfacesEnabled: async () => true,
      showPrompt,
      reload: jest.fn(),
    });
    const handleJoin = () => {
      gameStop = jest.fn();
    };
    const handleLeave = () => {
      if (gameStop === null) return;
      gameStop();
      gameStop = null;
      offer.onBackOnStartScreen();
    };
    document.addEventListener("join-lobby", handleJoin);
    document.addEventListener("leave-lobby", handleLeave);
    try {
      await openAndJoin();

      await offer.onGranted();
      expect(showPrompt).not.toHaveBeenCalled();

      await clickClose();

      expect(showPrompt).toHaveBeenCalledTimes(1);
    } finally {
      document.removeEventListener("join-lobby", handleJoin);
      document.removeEventListener("leave-lobby", handleLeave);
    }
  });

  // Task 0336 (review R1): the lobby lookup (server config + `/exists`) runs
  // before `join-lobby` is sent, so it counts as joining — a tenure gift popup
  // that becomes ready during it must wait, not open over this window. Main is
  // stood in for as in (h): its join handler begins its own marker first, sets
  // `gameStop` and ends it; its leave clears `gameStop` and reports back.
  describe("a start-screen waiter during the lobby lookup (task 0336)", () => {
    let gameStop: (() => void) | null;
    const mainJoin = () => {
      const endJoining = beginJoiningLobby();
      gameStop = jest.fn();
      endJoining();
    };
    const mainLeave = () => {
      if (gameStop === null) return;
      gameStop();
      gameStop = null;
      reportBackOnStartScreen();
    };

    async function isSettled(promise: Promise<void>): Promise<boolean> {
      let settled = false;
      void promise.then(() => {
        settled = true;
      });
      await flush();
      return settled;
    }

    // Holds each `/exists` call until the test answers it.
    let answerExists: Array<(value: unknown) => void>;
    const existsAnswer = (exists: boolean) => ({
      ok: true,
      status: 200,
      json: async () => ({ exists, clients: [] }),
    });

    beforeEach(() => {
      gameStop = null;
      answerExists = [];
      resetStartScreenPresenceForTests();
      setStartScreenPresenceSource(() => gameStop !== null);
      document.addEventListener("join-lobby", mainJoin);
      document.addEventListener("leave-lobby", mainLeave);
      fetchMock.mockImplementation((url: string) => {
        if (url.endsWith("/exists")) {
          return new Promise((resolve) => answerExists.push(resolve));
        }
        return Promise.resolve({ ok: false, status: 404 });
      });
    });

    afterEach(() => {
      document.removeEventListener("join-lobby", mainJoin);
      document.removeEventListener("leave-lobby", mainLeave);
      resetStartScreenPresenceForTests();
    });

    it("J1. lobby found: waits through the lookup and the join; ✕ leaves and resolves it", async () => {
      modal.open(LOBBY_ID);
      await flush();
      expect(answerExists).toHaveLength(1);

      const waiting = whenOnStartScreen();
      expect(await isSettled(waiting)).toBe(false);

      answerExists[0](existsAnswer(true));
      await flush();
      await render();
      expect(joins).toHaveLength(1);
      expect(await isSettled(waiting)).toBe(false);

      await clickClose();
      expect(leaves).toHaveLength(1);
      expect(await isSettled(waiting)).toBe(true);
    });

    it("J2. lobby not found: the waiter resolves once the lookup gives up (no hang)", async () => {
      modal.open(LOBBY_ID);
      await flush();
      const waiting = whenOnStartScreen();
      expect(await isSettled(waiting)).toBe(false);

      answerExists[0](existsAnswer(false));
      await flush();
      await render();
      expect(joins).toHaveLength(0);
      expect(await isSettled(waiting)).toBe(true);
    });

    it("J3. the lookup throws: the waiter resolves (no hang)", async () => {
      modal.open(LOBBY_ID);
      await flush();
      const waiting = whenOnStartScreen();
      expect(await isSettled(waiting)).toBe(false);

      answerExists[0]({
        ok: true,
        status: 200,
        json: async () => {
          throw new Error("bad json");
        },
      });
      await flush();
      expect(joins).toHaveLength(0);
      expect(await isSettled(waiting)).toBe(true);
    });

    it("J4. ✕ during the lookup: the waiter resolves once the lookup settles", async () => {
      modal.open(LOBBY_ID);
      await flush();
      const waiting = whenOnStartScreen();

      await clickClose();
      expect(await isSettled(waiting)).toBe(false);

      answerExists[0](existsAnswer(true));
      await flush();
      expect(joins).toHaveLength(0);
      expect(await isSettled(waiting)).toBe(true);
    });

    it("J5. two Join taps: waits until both lookups have ended", async () => {
      modal.open(LOBBY_ID);
      await flush();
      await render();
      (joinButton() as HTMLElement).click();
      await flush();
      expect(answerExists).toHaveLength(2);

      const waiting = whenOnStartScreen();
      answerExists[0](existsAnswer(false));
      await flush();
      expect(await isSettled(waiting)).toBe(false);

      answerExists[1](existsAnswer(false));
      await flush();
      expect(await isSettled(waiting)).toBe(true);
    });
  });
});
