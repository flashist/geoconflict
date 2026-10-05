/**
 * @jest-environment jsdom
 */

// Task 0327 (owner ruling 2026-09-28, Q1 "Host leaves cleanly"): closing the
// host's lobby window leaves the lobby and stops its background refresh. Every
// close the host makes (✕, a click outside, Escape) sends exactly one
// `leave-lobby`; a programmatic close (a successful Start, the match-start
// close list) sends none. Uses the REAL o-modal.

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
import { HostLobbyModal } from "../../src/client/HostLobbyModal";
import { getServerConfigFromClient } from "../../src/core/configuration/ConfigLoader";
import { exposeLitAccessors } from "./support/litAccessors";

const LOBBY_ID = "HOSTLOBBY";

type OModalElement = HTMLElement & {
  isModalOpen: boolean;
  updateComplete: Promise<boolean>;
};

async function flush(): Promise<void> {
  for (let i = 0; i < 20; i++) await Promise.resolve();
}

describe("HostLobbyModal close leaves the lobby (task 0327)", () => {
  let modal: HostLobbyModal;
  let leaves: CustomEvent[];
  let joins: CustomEvent[];
  let fetchMock: jest.Mock;
  let finishCreate: (() => void) | null;
  const onLeave = (e: Event) => leaves.push(e as CustomEvent);
  const onJoin = (e: Event) => joins.push(e as CustomEvent);

  const oModal = () => modal.querySelector("o-modal") as OModalElement;
  const calls = () => fetchMock.mock.calls.map((c) => c[0] as string);
  const pollCalls = () =>
    fetchMock.mock.calls
      .filter(
        (c) =>
          c[0] === `/w1/api/game/${LOBBY_ID}` &&
          (c[1] as { method?: string } | undefined)?.method === "GET",
      )
      .map((c) => c[0] as string);

  async function render(): Promise<void> {
    await modal.updateComplete;
    await oModal().updateComplete;
  }

  async function openAndJoin(): Promise<void> {
    modal.open();
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
    finishCreate = null;
    fetchMock = jest.fn((url: string) => {
      if (url.includes("/api/create_game/")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ gameID: LOBBY_ID }),
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

  it("✕ after joining sends one leave-lobby carrying the lobby id", async () => {
    await openAndJoin();

    await clickClose();

    expect(leaves).toHaveLength(1);
    expect(leaves[0].detail).toEqual({ lobby: LOBBY_ID });
    expect(oModal().isModalOpen).toBe(false);
  });

  it("a click outside after joining sends one leave-lobby", async () => {
    await openAndJoin();

    await clickOutside();

    expect(leaves).toHaveLength(1);
    expect(leaves[0].detail).toEqual({ lobby: LOBBY_ID });
  });

  it("Escape after joining sends one leave-lobby", async () => {
    await openAndJoin();

    await pressEscape();

    expect(leaves).toHaveLength(1);
    expect(leaves[0].detail).toEqual({ lobby: LOBBY_ID });
    expect(oModal().isModalOpen).toBe(false);
  });

  it("✕ stops the player poll", async () => {
    await openAndJoin();

    await clickClose();
    const pollsAtClose = pollCalls().length;
    jest.advanceTimersByTime(3000);
    await flush();

    expect(pollCalls()).toHaveLength(pollsAtClose);
  });

  it("a programmatic close sends none, nor does a later Escape with the window hidden", async () => {
    await openAndJoin();

    modal.close();
    await flush();
    await render();
    expect(leaves).toHaveLength(0);

    // Hidden window (e.g. in a match): Escape must not run the close funnel.
    const modalCloses = jest.fn();
    oModal().addEventListener("modal-close", modalCloses);
    await pressEscape();
    expect(leaves).toHaveLength(0);
    expect(modalCloses).not.toHaveBeenCalled();
  });

  it("a successful Start closes the window without a leave-lobby", async () => {
    await openAndJoin();
    (modal as unknown as { clients: unknown[] }).clients = [{}, {}];

    await (
      modal as unknown as { startGame: () => Promise<unknown> }
    ).startGame();
    await flush();
    await render();

    expect(calls().some((u) => u.includes("start_game"))).toBe(true);
    expect(oModal().isModalOpen).toBe(false);
    expect(leaves).toHaveLength(0);
  });

  it("closing before the lobby is created neither joins nor leaves", async () => {
    fetchMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishCreate = () =>
            resolve({
              ok: true,
              status: 200,
              json: async () => ({ gameID: LOBBY_ID }),
            });
        }),
    );

    modal.open();
    await flush();
    await render();
    await clickClose();
    expect(finishCreate).not.toBeNull();
    finishCreate!();
    await flush();
    await render();

    expect(joins).toHaveLength(0);
    expect(leaves).toHaveLength(0);
  });

  it("closing while a Start's ad is showing starts nothing", async () => {
    await openAndJoin();
    (modal as unknown as { clients: unknown[] }).clients = [{}, {}];
    let finishAd: () => void = () => {};
    (FlashistFacade.instance.showInterstitial as jest.Mock).mockReturnValueOnce(
      new Promise<void>((resolve) => (finishAd = resolve)),
    );

    const start = (
      modal as unknown as { startGame: () => Promise<unknown> }
    ).startGame();
    await flush();
    await clickClose();
    expect(leaves).toHaveLength(1);

    finishAd();
    await expect(start).resolves.toBeNull();
    await flush();

    expect(calls().some((u) => u.includes("start_game"))).toBe(false);
  });

  // Task 0334 (0327 review R1): a close after the ad but before `start_game` is
  // sent must stop the Start too.
  describe("closing during the rest of a Start (task 0334)", () => {
    type Held = { isHeld: () => boolean; release: (value: unknown) => void };

    const startGame = () =>
      (modal as unknown as { startGame: () => Promise<unknown> }).startGame();
    const startCalls = () => calls().filter((u) => u.includes("start_game"));
    const putCalls = () =>
      fetchMock.mock.calls.filter(
        (c) => (c[1] as { method?: string } | undefined)?.method === "PUT",
      );
    const startFailedLine = () =>
      modal.querySelector("#host-lobby-start-failed");
    const isSave = (url: string, method?: string) =>
      url === `/w1/api/game/${LOBBY_ID}` && method === "PUT";

    // Holds the first request `match` accepts until release(); every other
    // request gets the normal answer.
    function holdRequest(
      match: (url: string, method?: string) => boolean,
    ): Held {
      const base = fetchMock.getMockImplementation()!;
      const held: { resolve?: (value: unknown) => void; reject?: unknown } = {};
      fetchMock.mockImplementation(
        (url: string, init?: { method?: string }) => {
          if (held.resolve === undefined && match(url, init?.method)) {
            return new Promise((resolve, reject) => {
              held.resolve = resolve;
              held.reject = reject;
            });
          }
          return base(url, init);
        },
      );
      return {
        isHeld: () => held.resolve !== undefined,
        release: (value: unknown) => {
          if (value instanceof Error) {
            (held.reject as (e: unknown) => void)(value);
          } else {
            held.resolve!(value);
          }
        },
      };
    }

    async function joinWithFriend(): Promise<void> {
      await openAndJoin();
      (modal as unknown as { clients: unknown[] }).clients = [{}, {}];
    }

    it.each([
      ["succeeds", { ok: true, status: 200, statusText: "OK" }],
      ["fails", { ok: false, status: 500, statusText: "Server Error" }],
      ["throws", new Error("network down")],
    ])(
      "closing while the settings save is pending sends no start_game (the save %s late)",
      async (_label, saveAnswer) => {
        await joinWithFriend();
        const save = holdRequest(isSave);

        const start = startGame();
        await flush();
        expect(save.isHeld()).toBe(true);
        await clickClose();
        expect(leaves).toHaveLength(1);

        save.release(saveAnswer);
        await expect(start).resolves.toBeNull();
        await flush();
        await render();

        expect(startCalls()).toHaveLength(0);
        expect(startFailedLine()).toBeNull();
      },
    );

    it("closing while the Start's config read is pending sends no start_game", async () => {
      const readConfig = getServerConfigFromClient as jest.Mock;
      await joinWithFriend();
      const save = holdRequest(isSave);

      const start = startGame();
      await flush();
      expect(save.isHeld()).toBe(true);
      // Queued only now, so the save's own config read cannot take it.
      let finishRead: (value: unknown) => void = () => {};
      readConfig.mockReturnValueOnce(
        new Promise((resolve) => (finishRead = resolve)),
      );
      const readsBefore = readConfig.mock.calls.length;
      save.release({ ok: true, status: 200, statusText: "OK" });
      await flush();
      expect(readConfig.mock.calls.length).toBe(readsBefore + 1);

      await clickClose();
      expect(leaves).toHaveLength(1);
      finishRead({ workerPath: () => "w1" });
      await expect(start).resolves.toBeNull();
      await flush();

      expect(startCalls()).toHaveLength(0);
    });

    // Guards the normal path: passes on the pre-0334 code by nature.
    it("with the window kept open, a Start sends exactly one start_game", async () => {
      await joinWithFriend();
      const putsBefore = putCalls().length;

      await startGame();
      await flush();
      await render();

      expect(startCalls()).toHaveLength(1);
      expect(putCalls().length - putsBefore).toBe(1);
      expect(oModal().isModalOpen).toBe(false);
      expect(leaves).toHaveLength(0);
    });

    // After-send guard (owner ruling 2026-09-30, Q1 "include"): a start_game
    // already sent cannot be recalled, but its late answer must not act on a
    // window reopened meanwhile.
    async function closeAndReopenDuringStartGame(): Promise<{
      start: Promise<unknown>;
      startRequest: Held;
    }> {
      await joinWithFriend();
      const startRequest = holdRequest((url) => url.includes("start_game"));
      const start = startGame();
      await flush();
      expect(startRequest.isHeld()).toBe(true);
      await clickClose();
      expect(leaves).toHaveLength(1);

      modal.open();
      await flush();
      await render();
      expect(joins).toHaveLength(2);
      expect(oModal().isModalOpen).toBe(true);
      return { start, startRequest };
    }

    it("a late OK for the old start_game leaves the reopened window open", async () => {
      const { start, startRequest } = await closeAndReopenDuringStartGame();

      startRequest.release({ ok: true, status: 200, statusText: "OK" });
      await start;
      await flush();
      await render();

      expect(oModal().isModalOpen).toBe(true);
      expect(leaves).toHaveLength(1);
    });

    it.each([
      ["a 403", { ok: false, status: 403, statusText: "Forbidden" }],
      ["a network error", new Error("network down")],
    ])(
      "%s for the old start_game shows no failure line in the reopened window",
      async (_label, answer) => {
        const { start, startRequest } = await closeAndReopenDuringStartGame();

        startRequest.release(answer);
        await start;
        await flush();
        await render();

        expect(startFailedLine()).toBeNull();
        expect(oModal().isModalOpen).toBe(true);
      },
    );
  });
});
