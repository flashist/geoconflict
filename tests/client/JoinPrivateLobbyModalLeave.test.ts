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
import { getServerConfigFromClient } from "../../src/core/configuration/ConfigLoader";
import { prodConfig } from "../../src/core/configuration/ProdConfig";
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

// Task 0389: the Join window only looks up private-lobby codes.
const LOBBY_ID = "K7M4PCRX";

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

    // Task 0374: the count is back at exactly zero — a fresh waiter resolves
    // at once (not stuck above zero), and one more mark still holds it (not
    // driven below zero by a double end).
    async function expectJoiningCountIsZero(): Promise<void> {
      expect(await isSettled(whenOnStartScreen())).toBe(true);
      const endProbe = beginJoiningLobby();
      expect(await isSettled(whenOnStartScreen())).toBe(false);
      endProbe();
    }

    // Task 0374 (R2): the mark ends at the close, not when a lookup that may
    // hang finally settles.
    it("J4. ✕ during the lookup: the waiter resolves at the close; a late found lookup joins nothing", async () => {
      modal.open(LOBBY_ID);
      await flush();
      const waiting = whenOnStartScreen();
      expect(await isSettled(waiting)).toBe(false);

      await clickClose();
      expect(await isSettled(waiting)).toBe(true);

      answerExists[0](existsAnswer(true));
      await flush();
      expect(joins).toHaveLength(0);
      await expectJoiningCountIsZero();
    });

    it("J6a. ✕ during the lookup, then not found: no join, count back at zero", async () => {
      modal.open(LOBBY_ID);
      await flush();
      const waiting = whenOnStartScreen();

      await clickClose();
      expect(await isSettled(waiting)).toBe(true);

      answerExists[0](existsAnswer(false));
      await flush();
      await render();
      expect(joins).toHaveLength(0);
      await expectJoiningCountIsZero();
    });

    it("J6b. ✕ during the lookup, then the lookup throws: no join, count back at zero", async () => {
      modal.open(LOBBY_ID);
      await flush();
      const waiting = whenOnStartScreen();

      await clickClose();
      expect(await isSettled(waiting)).toBe(true);

      answerExists[0]({
        ok: true,
        status: 200,
        json: async () => {
          throw new Error("bad json");
        },
      });
      await flush();
      expect(joins).toHaveLength(0);
      await expectJoiningCountIsZero();
    });

    it("J7. window stays open while the lookup hangs: the waiter keeps waiting", async () => {
      modal.open(LOBBY_ID);
      await flush();
      const waiting = whenOnStartScreen();

      jest.advanceTimersByTime(10 * 60 * 1000);
      await flush();
      expect(await isSettled(waiting)).toBe(false);
      expect(joins).toHaveLength(0);
    });

    it("J8. two Join taps, then ✕ while both hang: the close ends both marks", async () => {
      modal.open(LOBBY_ID);
      await flush();
      await render();
      (joinButton() as HTMLElement).click();
      await flush();
      expect(answerExists).toHaveLength(2);

      const waiting = whenOnStartScreen();
      expect(await isSettled(waiting)).toBe(false);
      await clickClose();
      expect(await isSettled(waiting)).toBe(true);

      answerExists[0](existsAnswer(true));
      answerExists[1](existsAnswer(false));
      await flush();
      expect(joins).toHaveLength(0);
      await expectJoiningCountIsZero();
    });

    it("J9. a programmatic close while the lookup hangs ends the mark like ✕", async () => {
      modal.open(LOBBY_ID);
      await flush();
      const waiting = whenOnStartScreen();

      modal.close();
      await flush();
      await render();
      expect(await isSettled(waiting)).toBe(true);

      answerExists[0](existsAnswer(true));
      await flush();
      expect(joins).toHaveLength(0);
      await expectJoiningCountIsZero();
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
  // Task 0389: whatever is typed or pasted is cleaned into a code (spaces and
  // dashes dropped, any case) before the worker path is worked out from it;
  // anything that is not a private-lobby code says "not found" and asks no
  // server. The real prod worker hash, so a wrong-case path would differ.
  describe("typed and pasted codes (task 0389)", () => {
    const workerPathOf = (id: string) => prodConfig.workerPath(id);
    const input = () =>
      modal.querySelector("#lobbyIdInput") as HTMLInputElement;
    const messageText = () =>
      modal.querySelector(".message-area")!.textContent!.trim();

    beforeEach(() => {
      (getServerConfigFromClient as jest.Mock).mockResolvedValue({
        workerPath: workerPathOf,
      });
    });

    afterEach(() => {
      (getServerConfigFromClient as jest.Mock).mockResolvedValue({
        workerPath: () => "w1",
      });
    });

    async function typeAndJoin(text: string): Promise<void> {
      modal.open();
      await render();
      input().value = text;
      input().dispatchEvent(new KeyboardEvent("keyup"));
      (joinButton() as HTMLElement).click();
      await flush();
      await render();
    }

    const existsUrl = `/${workerPathOf(LOBBY_ID)}/api/game/${LOBBY_ID}/exists`;

    it("the code's worker differs from the lowercase text's, so the test can tell", () => {
      expect(workerPathOf("k7m4pcrx")).not.toBe(workerPathOf(LOBBY_ID));
    });

    it("typed in lowercase with a space: asks the code's worker, joins and leaves with the code", async () => {
      await typeAndJoin(" k7m4 pcrx ");

      expect(fetchMock.mock.calls[0][0]).toBe(existsUrl);
      expect(input().value).toBe(LOBBY_ID);
      expect(joins).toHaveLength(1);
      expect(joins[0].detail.gameID).toBe(LOBBY_ID);

      jest.advanceTimersByTime(1000);
      await flush();
      expect(fetchMock.mock.calls.map((c) => c[0])).toContain(
        `/${workerPathOf(LOBBY_ID)}/api/game/${LOBBY_ID}`,
      );

      await clickClose();
      expect(leaves).toHaveLength(1);
      expect(leaves[0].detail).toEqual({ lobby: LOBBY_ID });
    });

    it("typed with a dash: the same code", async () => {
      await typeAndJoin("k7m4-PCRX");

      expect(fetchMock.mock.calls[0][0]).toBe(existsUrl);
      expect(joins).toHaveLength(1);
    });

    it.each([
      ["a #join= link", "https://example.test/index.html#join=k7m4pcrx"],
      ["a join/ link", "https://example.test/join/K7M4PCRX"],
    ])("pasted %s: asks the code's worker and joins", async (_label, link) => {
      modal.open(link);
      await flush();
      await render();

      expect(fetchMock.mock.calls[0][0]).toBe(existsUrl);
      expect(joins).toHaveLength(1);
      expect(joins[0].detail.gameID).toBe(LOBBY_ID);
    });

    it.each([
      ["a mixed-case generateID() id", "AbC12345"],
      ["garbage", "hello world"],
      ["a Cyrillic look-alike", "К7М4РСРХ"],
      ["7 characters", "K7M4PCR"],
    ])("%s: not found, and no request at all", async (_label, text) => {
      await typeAndJoin(text);

      expect(fetchMock).not.toHaveBeenCalled();
      expect(joins).toHaveLength(0);
      expect(messageText()).toBe("private_lobby.not_found");
    });
  });
});
