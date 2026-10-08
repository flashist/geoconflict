/**
 * @jest-environment jsdom
 */

// Task 0333: a player waiting in a PUBLIC lobby taps Create. If the private
// lobby is never joined (the window closed before `createLobby` answered, or
// `createLobby` failed), nothing used to stop the public connection: the card
// showed "not joined" while the player could still be pulled into that match.
// Create now leaves the public lobby for real at the tap.
//
// Uses the REAL o-modal and the REAL HostLobbyModal. Main.ts's `Client` cannot
// run in jest, so a small harness stands in for its lobby state: `gameStop`,
// `handleLeaveLobby`'s gate (`if null return; gameStop(); gameStop = null`) and
// `handleJoinLobby`'s stop-then-replace — a copy of Main's logic, as 0327's
// tests did.

jest.mock("../../resources/images/RandomMap.webp", () => "random-map.webp", {
  virtual: true,
});
jest.mock("../../src/client/Main", () => ({ JoinLobbyEvent: class {} }));
jest.mock("../../src/client/components/Difficulties", () => ({}));
jest.mock("../../src/client/components/Maps", () => ({}));
jest.mock("../../src/client/utilities/RenderUnitTypeOptions", () => ({
  renderUnitTypeOptions: () => "",
}));
jest.mock("../../src/client/Utils", () => ({
  translateText: (k: string) => k,
}));
jest.mock("../../src/client/CitizenBadge", () => ({
  renderCitizenBadge: () => "",
}));
jest.mock("../../src/client/flashist/FlashistFacade", () => ({
  FlashistFacade: {
    instance: {
      windowOrigin: "https://example.test/index.html",
      showInterstitial: jest.fn().mockResolvedValue(undefined),
      // Task 0382: open() fetches the portal link on Yandex; none here, so
      // Yandex copies the bare code (C4).
      loadPortalGameUrl: jest.fn().mockResolvedValue(null),
    },
  },
}));
// Task 0380: HostLobbyModal now imports PrivateLobbyInvite, whose ID check
// pulls in Schemas → jose, which needs a TextEncoder jsdom lacks; nothing here
// decodes patterns. Same stub as tests/client/JoinPrivateLobbyModalLeave.test.ts.
jest.mock("jose", () => ({
  base64url: { decode: jest.fn() },
}));
jest.mock("../../src/core/configuration/ConfigLoader", () => ({
  getServerConfigFromClient: jest
    .fn()
    .mockResolvedValue({ workerPath: () => "w1" }),
}));

import "../../src/client/components/baseComponents/Modal";
import { FlashistFacade } from "../../src/client/flashist/FlashistFacade";
import { getServerConfigFromClient } from "../../src/core/configuration/ConfigLoader";
import { HostLobbyModal } from "../../src/client/HostLobbyModal";
import { openHostLobbyFromStartScreen } from "../../src/client/HostLobbyOpen";
import { PrivateLobbyCodeSchema } from "../../src/core/Schemas";
import {
  beginJoiningLobby,
  reportBackOnStartScreen,
  resetStartScreenPresenceForTests,
  setStartScreenPresenceSource,
  whenOnStartScreen,
} from "../../src/client/StartScreenPresence";
import { exposeLitAccessors } from "./support/litAccessors";

const LOBBY_ID = "HOSTLOBBY";

type OModalElement = HTMLElement & {
  isModalOpen: boolean;
  updateComplete: Promise<boolean>;
};

type CreateAnswer = { ok: true } | { ok: false };

async function flush(): Promise<void> {
  for (let i = 0; i < 20; i++) await Promise.resolve();
}

describe("Create from a public lobby leaves it at the tap (task 0333)", () => {
  let modal: HostLobbyModal;
  let leaves: CustomEvent[];
  let joins: CustomEvent[];
  let fetchMock: jest.Mock;
  let answerCreate: ((answer: CreateAnswer) => void) | null;

  // Main.ts stand-in.
  let gameStop: jest.Mock | null;
  let publicStop: jest.Mock;
  let privateStop: jest.Mock;
  let leaveLobbyDependency: jest.Mock;
  let clearPublicLobbyHighlight: jest.Mock;
  // Task 0336: also Main's presence wiring — the leave reports back on the
  // start screen, and a join counts as away from its first line.
  const mainLeaveLobby = () => {
    if (gameStop === null) return;
    gameStop();
    gameStop = null;
    reportBackOnStartScreen();
  };
  // Task 0336 R3: Main's join awaits server config, cosmetics and the Yandex
  // id before it sets `gameStop`. A test holds that window open by setting
  // `mainSetup`; left null, the stand-in finishes at once (0333's tests).
  let mainSetup: Promise<void> | null;
  const onJoin = (e: Event) => {
    const endJoining = beginJoiningLobby();
    joins.push(e as CustomEvent);
    if (gameStop !== null) gameStop();
    const finishSetup = () => {
      gameStop = privateStop;
    };
    if (mainSetup === null) {
      finishSetup();
      endJoining();
      return;
    }
    void mainSetup.then(finishSetup).finally(endJoining);
  };
  const onLeave = (e: Event) => {
    leaves.push(e as CustomEvent);
    mainLeaveLobby();
  };

  const oModal = () => modal.querySelector("o-modal") as OModalElement;

  async function render(): Promise<void> {
    await modal.updateComplete;
    await oModal().updateComplete;
  }

  async function tapCreate(): Promise<void> {
    openHostLobbyFromStartScreen({
      isInLobby: () => gameStop !== null,
      leaveLobby: leaveLobbyDependency,
      clearPublicLobbyHighlight,
      openHostModal: () => modal.open(),
    });
    await flush();
    await render();
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

  async function answer(result: CreateAnswer): Promise<void> {
    expect(answerCreate).not.toBeNull();
    answerCreate!(result);
    await flush();
    await render();
  }

  beforeEach(async () => {
    jest.useFakeTimers();
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
    answerCreate = null;
    fetchMock = jest.fn((url: string) => {
      if (url.includes("/api/create_game/")) {
        return new Promise((resolve) => {
          answerCreate = (result) =>
            resolve(
              result.ok
                ? {
                    ok: true,
                    status: 200,
                    json: async () => ({ gameID: LOBBY_ID }),
                  }
                : {
                    ok: false,
                    status: 500,
                    text: async () => "forced failure",
                  },
            );
        });
      }
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: "OK",
        json: async () => ({ clients: [] }),
      });
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    resetStartScreenPresenceForTests();
    setStartScreenPresenceSource(() => gameStop !== null);
    publicStop = jest.fn();
    privateStop = jest.fn();
    gameStop = null;
    mainSetup = null;
    leaveLobbyDependency = jest.fn(mainLeaveLobby);
    clearPublicLobbyHighlight = jest.fn();

    leaves = [];
    joins = [];
    document.addEventListener("leave-lobby", onLeave);
    document.addEventListener("join-lobby", onJoin);
    document.body.innerHTML = "";
    modal = new HostLobbyModal();
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

  const joinPublicLobby = () => {
    gameStop = publicStop;
  };

  it("1. in a public lobby, ✕ before create answers: the public connection is stopped once, nothing is joined", async () => {
    joinPublicLobby();

    await tapCreate();
    await clickClose();
    await answer({ ok: true });

    expect(publicStop).toHaveBeenCalledTimes(1);
    expect(gameStop).toBeNull();
    expect(joins).toHaveLength(0);
    expect(leaves).toHaveLength(0);
    expect(clearPublicLobbyHighlight).toHaveBeenCalled();
  });

  it("2. in a public lobby, create fails, then ✕: the public connection is stopped once, nothing is joined", async () => {
    joinPublicLobby();

    await tapCreate();
    await answer({ ok: false });
    await clickClose();

    expect(publicStop).toHaveBeenCalledTimes(1);
    expect(gameStop).toBeNull();
    expect(joins).toHaveLength(0);
    expect(leaves).toHaveLength(0);
  });

  it("3. in a public lobby, create fails and the window stays open: the public connection is already stopped", async () => {
    joinPublicLobby();

    await tapCreate();
    await answer({ ok: false });

    expect(oModal().isModalOpen).toBe(true);
    expect(publicStop).toHaveBeenCalledTimes(1);
    expect(gameStop).toBeNull();
    expect(joins).toHaveLength(0);
  });

  it("3b. review R1: a server-config failure before the create request is logged, not silently swallowed", async () => {
    const configError = new Error("config fetch failed");
    (getServerConfigFromClient as jest.Mock).mockRejectedValueOnce(configError);
    joinPublicLobby();

    await tapCreate();

    expect(console.error).toHaveBeenCalledWith(
      "Error creating lobby:",
      configError,
    );
    expect(answerCreate).toBeNull();
    expect(publicStop).toHaveBeenCalledTimes(1);
    expect(joins).toHaveLength(0);
  });

  it("4a. not in any lobby, tap then ✕: no leave at all", async () => {
    await tapCreate();
    await clickClose();
    await answer({ ok: true });

    expect(leaveLobbyDependency).not.toHaveBeenCalled();
    expect(publicStop).not.toHaveBeenCalled();
    expect(leaves).toHaveLength(0);
    expect(joins).toHaveLength(0);
  });

  it("4b. not in any lobby, create answers then ✕: only 0327's one private leave", async () => {
    await tapCreate();
    await answer({ ok: true });
    expect(joins).toHaveLength(1);
    await clickClose();

    expect(leaveLobbyDependency).not.toHaveBeenCalled();
    expect(publicStop).not.toHaveBeenCalled();
    expect(privateStop).toHaveBeenCalledTimes(1);
    expect(leaves).toHaveLength(1);
    expect(leaves[0].detail).toEqual({ lobby: LOBBY_ID });
    expect(gameStop).toBeNull();
  });

  it("5. 0327 regression: in a public lobby, create answers, join, ✕: one public stop, one private stop, one leave-lobby", async () => {
    joinPublicLobby();

    await tapCreate();
    await answer({ ok: true });
    expect(joins).toHaveLength(1);
    expect(gameStop).toBe(privateStop);
    await clickClose();

    expect(publicStop).toHaveBeenCalledTimes(1);
    expect(privateStop).toHaveBeenCalledTimes(1);
    expect(leaves).toHaveLength(1);
    expect(leaves[0].detail).toEqual({ lobby: LOBBY_ID });
    expect(gameStop).toBeNull();
  });

  // Task 0336: 0333's leave at the Create tap wakes whatever waits for the
  // start screen (the tenure gift popup). Creating the private lobby counts as
  // joining one, so the waiter keeps waiting while the host window is open.
  describe("a start-screen waiter during Create (task 0336)", () => {
    async function isSettled(promise: Promise<void>): Promise<boolean> {
      let settled = false;
      void promise.then(() => {
        settled = true;
      });
      await flush();
      return settled;
    }

    it("H1. in a public lobby: Create, create answers, join — still waiting; ✕ leaves and resolves it", async () => {
      joinPublicLobby();
      const waiting = whenOnStartScreen();
      expect(await isSettled(waiting)).toBe(false);

      await tapCreate();
      expect(publicStop).toHaveBeenCalledTimes(1);
      expect(await isSettled(waiting)).toBe(false);

      await answer({ ok: true });
      expect(joins).toHaveLength(1);
      expect(await isSettled(waiting)).toBe(false);

      await clickClose();
      expect(leaves).toHaveLength(1);
      expect(await isSettled(waiting)).toBe(true);
    });

    // The host window's marker ends as soon as `join-lobby` is sent; Main's
    // must already be held by then and stay held across its own setup awaits.
    it("H4. create answers, Main still setting up: still waiting; then joined; ✕ resolves it", async () => {
      let finishMainSetup: () => void = () => {};
      mainSetup = new Promise<void>((resolve) => {
        finishMainSetup = resolve;
      });
      joinPublicLobby();
      const waiting = whenOnStartScreen();

      await tapCreate();
      await answer({ ok: true });
      expect(joins).toHaveLength(1);
      expect(gameStop).toBeNull();
      expect(await isSettled(waiting)).toBe(false);

      finishMainSetup();
      await flush();
      expect(gameStop).toBe(privateStop);
      expect(await isSettled(waiting)).toBe(false);

      await clickClose();
      expect(leaves).toHaveLength(1);
      expect(await isSettled(waiting)).toBe(true);
    });

    it("H2. create fails: the waiter resolves (no hang)", async () => {
      joinPublicLobby();
      const waiting = whenOnStartScreen();

      await tapCreate();
      expect(await isSettled(waiting)).toBe(false);

      await answer({ ok: false });
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

    // Task 0374 (R1): the mark ends at the close, not when a create that may
    // hang finally settles.
    it("H3. ✕ before create answers: the waiter resolves at the close; a late OK create joins nothing", async () => {
      joinPublicLobby();
      const waiting = whenOnStartScreen();

      await tapCreate();
      expect(await isSettled(waiting)).toBe(false);
      await clickClose();
      expect(await isSettled(waiting)).toBe(true);

      await answer({ ok: true });
      expect(joins).toHaveLength(0);
      await expectJoiningCountIsZero();
    });

    it("H5. ✕ while create hangs, then create fails: resolved, no join, count back at zero", async () => {
      joinPublicLobby();
      const waiting = whenOnStartScreen();

      await tapCreate();
      await clickClose();
      expect(await isSettled(waiting)).toBe(true);

      await answer({ ok: false });
      expect(joins).toHaveLength(0);
      await expectJoiningCountIsZero();
    });

    it("H6. window stays open while create hangs: the waiter keeps waiting, however long", async () => {
      joinPublicLobby();
      const waiting = whenOnStartScreen();

      await tapCreate();
      jest.advanceTimersByTime(10 * 60 * 1000);
      await flush();
      expect(await isSettled(waiting)).toBe(false);
      expect(joins).toHaveLength(0);
    });

    it("H7. reopen while the first create hangs: the openings do not end each other's marks", async () => {
      joinPublicLobby();
      const waitingAtFirstOpening = whenOnStartScreen();

      await tapCreate();
      const answerFirstCreate = answerCreate!;
      // The first opening's mark ends at its own close.
      await clickClose();
      expect(await isSettled(waitingAtFirstOpening)).toBe(true);

      await tapCreate();
      expect(answerCreate).not.toBe(answerFirstCreate);
      // The second opening holds its own mark.
      const waiting = whenOnStartScreen();
      expect(await isSettled(waiting)).toBe(false);

      // The first create answering late ends nothing and joins nothing.
      answerFirstCreate({ ok: true });
      await flush();
      await render();
      expect(joins).toHaveLength(0);
      expect(await isSettled(waiting)).toBe(false);

      await clickClose();
      expect(await isSettled(waiting)).toBe(true);
      await expectJoiningCountIsZero();
    });

    it("H8. a programmatic close while create hangs ends the mark like ✕", async () => {
      joinPublicLobby();
      const waiting = whenOnStartScreen();

      await tapCreate();
      modal.close();
      await flush();
      await render();
      expect(await isSettled(waiting)).toBe(true);

      await answer({ ok: true });
      expect(joins).toHaveLength(0);
      await expectJoiningCountIsZero();
    });
  });

  // Task 0389: the host creates the lobby with a private-lobby code, shows it
  // in two groups and copies it whole. Owner ruling 2026-10-05: no retry — a
  // refused create (409 game_id_taken) fails like any other failed create.
  describe("the private-lobby code (task 0389)", () => {
    type FacadeMock = { yaGamesAvailable?: boolean; copyText: jest.Mock };
    const facade = FlashistFacade.instance as unknown as FacadeMock;
    let createStatus: number;

    const createCalls = () =>
      fetchMock.mock.calls
        .map((c) => c[0] as string)
        .filter((u) => u.includes("/api/create_game/"));
    const createdCode = () => {
      const match = /\/api\/create_game\/([^?]+)\?/.exec(createCalls()[0]);
      expect(match).not.toBeNull();
      return match![1];
    };
    const shownCode = () =>
      modal.querySelector(".lobby-id")!.textContent!.trim();
    const copy = () =>
      (
        modal as unknown as { copyToClipboard: () => Promise<void> }
      ).copyToClipboard();

    beforeEach(() => {
      createStatus = 200;
      facade.copyText = jest.fn().mockResolvedValue(true);
      fetchMock.mockImplementation((url: string) => {
        const create = /\/api\/create_game\/([^?]+)\?/.exec(url);
        if (create !== null) {
          return Promise.resolve(
            createStatus === 200
              ? {
                  ok: true,
                  status: 200,
                  json: async () => ({ gameID: create[1] }),
                }
              : {
                  ok: false,
                  status: createStatus,
                  text: async () => '{"error":"game_id_taken"}',
                },
          );
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ clients: [] }),
        });
      });
    });

    afterEach(() => {
      delete facade.yaGamesAvailable;
    });

    it("C1. the create request carries a new-format code", async () => {
      await tapCreate();

      expect(createCalls()).toHaveLength(1);
      expect(PrivateLobbyCodeSchema.safeParse(createdCode()).success).toBe(
        true,
      );
      expect(joins).toHaveLength(1);
      expect(joins[0].detail.gameID).toBe(createdCode());
    });

    it("C2. the code is shown in two groups of four", async () => {
      await tapCreate();
      const code = createdCode();

      expect(shownCode()).toBe(`${code.slice(0, 4)} ${code.slice(4)}`);
    });

    it("C3. the copied link carries the code ungrouped (standalone)", async () => {
      await tapCreate();

      await copy();

      expect(facade.copyText).toHaveBeenCalledWith(
        `https://example.test/index.html#join=${createdCode()}`,
      );
    });

    it("C4. on Yandex the copied text is the bare, ungrouped code", async () => {
      facade.yaGamesAvailable = true;
      await tapCreate();

      await copy();

      expect(facade.copyText).toHaveBeenCalledWith(createdCode());
    });

    it("C5. a hidden code is still eight dots", async () => {
      await tapCreate();
      (modal as unknown as { lobbyIdVisible: boolean }).lobbyIdVisible = false;
      modal.requestUpdate();
      await render();

      expect(shownCode()).toBe("••••••••");
    });

    it("C6. a 409 is a failed create: no join, and no second try", async () => {
      createStatus = 409;

      await tapCreate();

      expect(createCalls()).toHaveLength(1);
      expect(joins).toHaveLength(0);
      expect(oModal().isModalOpen).toBe(true);
    });
  });
});

describe("openHostLobbyFromStartScreen order (task 0333)", () => {
  function record(isInLobby: boolean): string[] {
    const calls: string[] = [];
    openHostLobbyFromStartScreen({
      isInLobby: () => isInLobby,
      leaveLobby: () => calls.push("leaveLobby"),
      clearPublicLobbyHighlight: () => calls.push("clearPublicLobbyHighlight"),
      openHostModal: () => calls.push("openHostModal"),
    });
    return calls;
  }

  it("6a. in a lobby: leaves before the host window opens (no create request while the public connection is live)", () => {
    expect(record(true)).toEqual([
      "leaveLobby",
      "clearPublicLobbyHighlight",
      "openHostModal",
    ]);
  });

  it("6b. not in a lobby: no leave; highlight still cleared, window opened", () => {
    expect(record(false)).toEqual([
      "clearPublicLobbyHighlight",
      "openHostModal",
    ]);
  });
});
