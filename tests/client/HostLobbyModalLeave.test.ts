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
jest.mock("../../src/core/configuration/ConfigLoader", () => ({
  getServerConfigFromClient: jest
    .fn()
    .mockResolvedValue({ workerPath: () => "w1" }),
}));

import "../../src/client/components/baseComponents/Modal";
import { FlashistFacade } from "../../src/client/flashist/FlashistFacade";
import { HostLobbyModal } from "../../src/client/HostLobbyModal";
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
});
