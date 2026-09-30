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
    },
  },
}));
jest.mock("../../src/core/configuration/ConfigLoader", () => ({
  getServerConfigFromClient: jest
    .fn()
    .mockResolvedValue({ workerPath: () => "w1" }),
}));

import "../../src/client/components/baseComponents/Modal";
import { getServerConfigFromClient } from "../../src/core/configuration/ConfigLoader";
import { HostLobbyModal } from "../../src/client/HostLobbyModal";
import { openHostLobbyFromStartScreen } from "../../src/client/HostLobbyOpen";
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

    it("H3. ✕ before create answers: the waiter resolves once create settles", async () => {
      joinPublicLobby();
      const waiting = whenOnStartScreen();

      await tapCreate();
      await clickClose();
      expect(await isSettled(waiting)).toBe(false);

      await answer({ ok: true });
      expect(joins).toHaveLength(0);
      expect(await isSettled(waiting)).toBe(true);
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
