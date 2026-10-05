/**
 * @jest-environment jsdom
 */

// Task 0353: the host window polls the lobby's players once a second. Before
// this opening's lobby exists it must send no player request at all — no
// empty-id request (the server answers it with an HTML 404, and `json()` threw
// one uncaught rejection per tick) and no request for an earlier opening's
// lobby. A failed poll must not go unhandled either. Once the lobby exists the
// list still refreshes every second. Same harness as
// HostLobbyModalLeave.test.ts: the REAL o-modal, fake timers.

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
// Same stub as HostLobbyModalLeave.test.ts (task 0380): PrivateLobbyInvite's ID
// check pulls in Schemas → jose, which needs a TextEncoder jsdom lacks.
jest.mock("jose", () => ({
  base64url: { decode: jest.fn() },
}));
jest.mock("../../src/core/configuration/ConfigLoader", () => ({
  getServerConfigFromClient: jest
    .fn()
    .mockResolvedValue({ workerPath: () => "w1" }),
}));

import "../../src/client/components/baseComponents/Modal";
import { HostLobbyModal } from "../../src/client/HostLobbyModal";
import { exposeLitAccessors } from "./support/litAccessors";

// jsdom has no setImmediate, and fake timers would hold it anyway; Node only
// reports an unhandled rejection after a real macrotask turn.
const realSetImmediate: (callback: () => void) => unknown =
  jest.requireActual("timers").setImmediate;

const LOBBY_ID = "HOSTLOBBY";
const HOST = { clientID: "HOST0001", username: "Host" };
const FRIEND = { clientID: "FRND0001", username: "Friend" };

type OModalElement = HTMLElement & {
  isModalOpen: boolean;
  updateComplete: Promise<boolean>;
};

type Reply = {
  ok: boolean;
  status: number;
  statusText?: string;
  json: () => Promise<unknown>;
};

async function flush(): Promise<void> {
  for (let i = 0; i < 20; i++) await Promise.resolve();
}

async function drainRejections(): Promise<void> {
  await new Promise<void>((resolve) => realSetImmediate(resolve));
  await new Promise<void>((resolve) => realSetImmediate(resolve));
}

// What the worker sends for `/api/game/` with nothing after it: Express's
// default 404 HTML page, so `json()` throws.
const htmlNotFound = (): Reply => ({
  ok: false,
  status: 404,
  statusText: "Not Found",
  json: () =>
    Promise.reject(
      new SyntaxError(
        `Unexpected token '<', "<!DOCTYPE "... is not valid JSON`,
      ),
    ),
});

describe("HostLobbyModal player poll before the lobby exists (task 0353)", () => {
  let modal: HostLobbyModal;
  let fetchMock: jest.Mock;
  let unhandled: unknown[];
  // Answers for `/w1/api/game/HOSTLOBBY` GETs, in order; the last one repeats.
  let lobbyReplies: Array<() => Reply>;
  // What the next create does: answer, fail with a 500, or never answer.
  let createMode: "answer" | "fail" | "hang";
  const onUnhandled = (reason: unknown) => {
    unhandled.push(reason);
  };

  const oModal = () => modal.querySelector("o-modal") as OModalElement;
  const playerGets = () =>
    fetchMock.mock.calls
      .filter(
        (c) =>
          (c[0] as string).includes("/api/game/") &&
          (c[1] as { method?: string } | undefined)?.method === "GET",
      )
      .map((c) => c[0] as string);
  const playerNames = () =>
    // Each tag also holds the host's "remove player" ×.
    Array.from(modal.querySelectorAll(".players-list .player-tag")).map((el) =>
      (el.textContent ?? "").replace("×", "").trim(),
    );
  const startButton = () =>
    modal.querySelector(".start-game-button") as HTMLButtonElement;

  async function render(): Promise<void> {
    await modal.updateComplete;
    await oModal().updateComplete;
  }

  // One second at a time, so each tick's poll settles before the next.
  async function advanceSeconds(seconds: number): Promise<void> {
    for (let i = 0; i < seconds; i++) {
      jest.advanceTimersByTime(1000);
      await flush();
    }
    await render();
    await drainRejections();
  }

  async function open(): Promise<void> {
    modal.open();
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

  beforeEach(async () => {
    jest.useFakeTimers();
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});
    unhandled = [];
    process.on("unhandledRejection", onUnhandled);
    createMode = "answer";
    lobbyReplies = [
      () => ({
        ok: true,
        status: 200,
        statusText: "OK",
        json: async () => ({ clients: [HOST] }),
      }),
    ];
    fetchMock = jest.fn((url: string) => {
      if (url.includes("/api/create_game/")) {
        if (createMode === "hang") {
          return new Promise(() => {});
        }
        if (createMode === "fail") {
          return Promise.resolve({
            ok: false,
            status: 500,
            statusText: "Server Error",
            json: async () => ({}),
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({ gameID: LOBBY_ID }),
        });
      }
      if (url === `/w1/api/game/${LOBBY_ID}`) {
        const reply =
          lobbyReplies.length > 1 ? lobbyReplies.shift()! : lobbyReplies[0];
        return Promise.resolve(reply());
      }
      return Promise.resolve(htmlNotFound());
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    document.body.innerHTML = "";
    modal = new HostLobbyModal();
    exposeLitAccessors(modal);
    document.body.appendChild(modal);
    await modal.updateComplete;
    exposeLitAccessors(oModal());
    await render();
  });

  afterEach(async () => {
    modal.remove();
    jest.clearAllTimers();
    jest.useRealTimers();
    await drainRejections();
    process.off("unhandledRejection", onUnhandled);
    jest.restoreAllMocks();
  });

  it("a slow create: no player request and no unhandled rejection", async () => {
    createMode = "hang";
    await open();

    await advanceSeconds(5);

    expect(playerGets()).toEqual([]);
    expect(unhandled).toEqual([]);
  });

  it("a failed create: no player request and no unhandled rejection", async () => {
    createMode = "fail";
    await open();

    await advanceSeconds(5);

    expect(playerGets()).toEqual([]);
    expect(unhandled).toEqual([]);
  });

  // Guards the normal path: passes on the pre-0353 code by nature.
  it("once the lobby exists, the list fills and refreshes every second", async () => {
    lobbyReplies = [
      () => ({
        ok: true,
        status: 200,
        statusText: "OK",
        json: async () => ({ clients: [HOST] }),
      }),
      () => ({
        ok: true,
        status: 200,
        statusText: "OK",
        json: async () => ({ clients: [HOST, FRIEND] }),
      }),
    ];
    await open();

    await advanceSeconds(1);
    expect(playerGets()).toEqual([`/w1/api/game/${LOBBY_ID}`]);
    expect(playerNames()).toEqual(["Host"]);

    await advanceSeconds(1);
    expect(playerGets()).toHaveLength(2);
    expect(playerNames()).toEqual(["Host", "Friend"]);
    expect(unhandled).toEqual([]);
  });

  it("a failed poll after the lobby exists is handled, and the next tick polls again", async () => {
    lobbyReplies = [
      htmlNotFound,
      () => ({
        ok: true,
        status: 200,
        statusText: "OK",
        json: async () => ({ clients: [HOST, FRIEND] }),
      }),
    ];
    await open();

    await advanceSeconds(1);
    expect(playerGets()).toHaveLength(1);
    expect(unhandled).toEqual([]);

    await advanceSeconds(1);
    expect(playerGets()).toHaveLength(2);
    expect(playerNames()).toEqual(["Host", "Friend"]);
    expect(unhandled).toEqual([]);
  });

  it("a reopen during a slow create sends no request for the earlier lobby", async () => {
    await open();
    await clickClose();
    const getsAtClose = playerGets().length;

    createMode = "hang";
    await open();
    await advanceSeconds(3);

    expect(playerGets().slice(getsAtClose)).toEqual([]);
    expect(unhandled).toEqual([]);
  });

  // Review R1/R2: the gate skips the poll until this opening's lobby exists, so
  // the earlier opening's players must not survive the reopen — or Start stays
  // enabled and starts the lobby the host already left.
  it.each(["fail", "hang"] as const)(
    "a reopen whose create does not answer (%s) shows no earlier players and keeps Start disabled",
    async (mode) => {
      lobbyReplies = [
        () => ({
          ok: true,
          status: 200,
          statusText: "OK",
          json: async () => ({ clients: [HOST, FRIEND] }),
        }),
      ];
      await open();
      await advanceSeconds(1);
      expect(playerNames()).toEqual(["Host", "Friend"]);
      expect(startButton().disabled).toBe(false);

      await clickClose();
      createMode = mode;
      await open();
      await advanceSeconds(3);

      expect(playerNames()).toEqual([]);
      expect(startButton().disabled).toBe(true);
      expect(unhandled).toEqual([]);
    },
  );

  it("closing the window stops the poll", async () => {
    await open();
    await advanceSeconds(1);
    expect(playerGets()).toHaveLength(1);

    await clickClose();
    await advanceSeconds(3);

    expect(playerGets()).toHaveLength(1);
  });
});
