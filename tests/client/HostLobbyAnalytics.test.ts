/**
 * @jest-environment jsdom
 */

// Task 0451: the host window's private-lobby funnel events — Created /
// CreateFailed, InviteCopied:{Link|Code} / InviteCopyFailed, Start:Tapped /
// Start:Failed, Left:Host. Each fires at its moment, once, and never carries
// the lobby code or the creator's clientID. Uses the REAL o-modal.

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
  flashistConstants: {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    analyticEvents: require("./support/privateLobbyEvents")
      .PRIVATE_LOBBY_EVENTS,
  },
  flashist_logEventAnalytics: jest.fn(),
  FlashistFacade: {
    instance: {
      windowOrigin: "https://example.test/index.html",
      showInterstitial: jest.fn().mockResolvedValue(undefined),
      loadPortalGameUrl: jest.fn().mockResolvedValue(null),
      copyText: jest.fn().mockResolvedValue(true),
      yaGamesAvailable: true,
      portalGameUrl: null,
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
import {
  FlashistFacade,
  flashist_logEventAnalytics,
} from "../../src/client/flashist/FlashistFacade";
import { HostLobbyModal } from "../../src/client/HostLobbyModal";
import {
  privateLobbyRole,
  resetPrivateLobbyAnalyticsForTests,
} from "../../src/client/PrivateLobbyAnalytics";
import { exposeLitAccessors } from "./support/litAccessors";

// A valid private-lobby code, so a known portal link is used (task 0382).
const LOBBY_ID = "K7M4PCRX";
const PORTAL = "https://portal.example/games/app/111111";

type OModalElement = HTMLElement & {
  isModalOpen: boolean;
  updateComplete: Promise<boolean>;
};

type FacadeMock = {
  yaGamesAvailable: boolean;
  portalGameUrl: string | null;
  copyText: jest.Mock;
  showInterstitial: jest.Mock;
};

type Reply = { ok: boolean; status: number } | Error | "pending";

async function flush(): Promise<void> {
  for (let i = 0; i < 20; i++) await Promise.resolve();
}

describe("HostLobbyModal private-lobby analytics (task 0451)", () => {
  const facade = FlashistFacade.instance as unknown as FacadeMock;
  const logEvent = flashist_logEventAnalytics as jest.Mock;
  let modal: HostLobbyModal;
  let createReply: Reply;
  let settingsReply: Reply;
  let startReply: Reply;
  let finishCreate: (() => void) | null;

  const oModal = () => modal.querySelector("o-modal") as OModalElement;
  const events = () => logEvent.mock.calls.map((c) => c[0] as string);
  const creatorClientID = () =>
    (modal as unknown as { lobbyCreatorClientID: string }).lobbyCreatorClientID;
  const copy = () =>
    (
      modal as unknown as { copyToClipboard: () => Promise<void> }
    ).copyToClipboard();
  const startGame = () =>
    (modal as unknown as { startGame: () => Promise<unknown> }).startGame();

  function reply(r: Reply, json: () => Promise<unknown>): Promise<unknown> {
    if (r === "pending") return new Promise(() => {});
    if (r instanceof Error) return Promise.reject(r);
    return Promise.resolve({
      ...r,
      statusText: "",
      text: async () => "",
      json,
    });
  }

  async function render(): Promise<void> {
    await modal.updateComplete;
    await oModal().updateComplete;
  }

  async function openAndJoin(): Promise<void> {
    modal.open();
    await flush();
    await render();
    expect(
      (modal as unknown as { hasJoinedLobby: boolean }).hasJoinedLobby,
    ).toBe(true);
  }

  async function clickClose(): Promise<void> {
    (
      oModal().shadowRoot!.querySelector(".c-modal__close") as HTMLElement
    ).click();
    await flush();
    await render();
  }

  beforeEach(async () => {
    jest.useFakeTimers();
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
    resetPrivateLobbyAnalyticsForTests();
    createReply = { ok: true, status: 200 };
    settingsReply = { ok: true, status: 200 };
    startReply = { ok: true, status: 200 };
    finishCreate = null;
    facade.yaGamesAvailable = true;
    facade.portalGameUrl = null;
    facade.copyText = jest.fn().mockResolvedValue(true);
    facade.showInterstitial = jest.fn().mockResolvedValue(undefined);
    global.fetch = jest.fn((url: string, init?: { method?: string }) => {
      if (url.includes("/api/create_game/")) {
        if (createReply === "pending") {
          return new Promise((resolve) => {
            finishCreate = () =>
              resolve({
                ok: true,
                status: 200,
                json: async () => ({ gameID: LOBBY_ID }),
              });
          });
        }
        return reply(createReply, async () => ({ gameID: LOBBY_ID }));
      }
      if (url.includes("/api/start_game/")) {
        return reply(startReply, async () => ({}));
      }
      if (init?.method === "PUT") {
        return reply(settingsReply, async () => ({}));
      }
      return reply({ ok: true, status: 200 }, async () => ({ clients: [] }));
    }) as unknown as typeof fetch;
    document.body.innerHTML = "";
    modal = new HostLobbyModal();
    exposeLitAccessors(modal);
    document.body.appendChild(modal);
    await modal.updateComplete;
    exposeLitAccessors(oModal());
    await render();
    logEvent.mockClear();
  });

  afterEach(() => {
    modal.remove();
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe("create", () => {
    it("fires PrivateLobby:Created once when the create answers OK", async () => {
      await openAndJoin();

      expect(events()).toEqual(["PrivateLobby:Created"]);
    });

    it("remembers this window's clientID, so its match start counts as the host's", async () => {
      await openAndJoin();

      expect(privateLobbyRole(creatorClientID())).toBe("Host");
      expect(privateLobbyRole("someone-else")).toBe("Guest");
    });

    it.each([
      ["an HTTP 500", { ok: false, status: 500 }],
      ["a network failure", new Error("network down")],
    ])("fires PrivateLobby:CreateFailed on %s", async (_label, r) => {
      createReply = r as Reply;

      modal.open();
      await flush();

      expect(events()).toEqual(["PrivateLobby:CreateFailed"]);
    });

    it("fires no Created when the window closed before the answer", async () => {
      createReply = "pending";
      modal.open();
      await flush();
      await render();

      await clickClose();
      finishCreate!();
      await flush();

      expect(events()).toEqual([]);
    });
  });

  describe("invite copy", () => {
    it("a bare-code copy fires one InviteCopied:Code, even on a double copy", async () => {
      await openAndJoin();
      logEvent.mockClear();

      await copy();
      await copy();

      expect(facade.copyText).toHaveBeenLastCalledWith(LOBBY_ID);
      expect(events()).toEqual(["PrivateLobby:InviteCopied:Code"]);
    });

    it("a portal-link copy fires InviteCopied:Link", async () => {
      await openAndJoin();
      logEvent.mockClear();
      facade.portalGameUrl = PORTAL;

      await copy();

      expect(events()).toEqual(["PrivateLobby:InviteCopied:Link"]);
    });

    it("a standalone #join= link copy fires InviteCopied:Link", async () => {
      facade.yaGamesAvailable = false;
      await openAndJoin();
      logEvent.mockClear();

      await copy();

      expect(events()).toEqual(["PrivateLobby:InviteCopied:Link"]);
    });

    it("a failed copy is not counted as copied; it fires one InviteCopyFailed", async () => {
      await openAndJoin();
      logEvent.mockClear();
      facade.copyText.mockResolvedValue(false);

      await copy();
      await copy();

      expect(events()).toEqual(["PrivateLobby:InviteCopyFailed"]);
    });

    it("a failed copy then a successful retry counts both", async () => {
      await openAndJoin();
      logEvent.mockClear();
      facade.copyText.mockResolvedValueOnce(false);

      await copy();
      await copy();

      expect(events()).toEqual([
        "PrivateLobby:InviteCopyFailed",
        "PrivateLobby:InviteCopied:Code",
      ]);
    });

    it("a copy before this opening's lobby exists is not counted", async () => {
      createReply = "pending";
      modal.open();
      await flush();

      await copy();
      facade.copyText.mockResolvedValue(false);
      await copy();

      expect(events()).toEqual([]);
    });

    it("a copy that settles after the window closed is not counted", async () => {
      await openAndJoin();
      logEvent.mockClear();
      let settle: (copied: boolean) => void = () => {};
      facade.copyText.mockReturnValue(
        new Promise<boolean>((resolve) => (settle = resolve)),
      );

      const pending = copy();
      modal.close();
      settle(true);
      await pending;

      expect(events()).toEqual([]);
    });

    it("the once-per-opening latch resets when the window reopens", async () => {
      await openAndJoin();
      await copy();
      modal.close();
      await flush();
      await openAndJoin();
      await copy();

      expect(
        events().filter((e) => e === "PrivateLobby:InviteCopied:Code"),
      ).toHaveLength(2);
    });
  });

  describe("start", () => {
    it("a double tap fires Start:Tapped once", async () => {
      await openAndJoin();
      logEvent.mockClear();
      startReply = "pending";

      void startGame();
      void startGame();
      await flush();

      expect(events()).toEqual(["PrivateLobby:Start:Tapped"]);
    });

    it.each([
      ["a 403 start (citizens_only)", 403, "start", { ok: false, status: 403 }],
      ["a 400 settings save", 400, "settings", { ok: false, status: 400 }],
      ["a throwing start", 0, "start", new Error("network down")],
      ["a throwing settings save", 0, "settings", new Error("network down")],
    ])(
      "%s fires Start:Failed with value %d",
      async (_label, expected, which, r) => {
        await openAndJoin();
        logEvent.mockClear();
        if (which === "start") startReply = r as Reply;
        else settingsReply = r as Reply;

        await startGame();

        expect(logEvent.mock.calls).toEqual([
          ["PrivateLobby:Start:Tapped"],
          ["PrivateLobby:Start:Failed", expected],
        ]);
      },
    );

    it("fires no Start:Failed when the window closed during the ad", async () => {
      await openAndJoin();
      let finishAd: () => void = () => {};
      facade.showInterstitial.mockReturnValueOnce(
        new Promise<void>((resolve) => (finishAd = resolve)),
      );
      startReply = { ok: false, status: 403 };
      const pending = startGame();
      await flush();
      modal.close();
      await flush();
      logEvent.mockClear();

      finishAd();
      await pending;
      await flush();

      expect(events()).toEqual([]);
    });
  });

  describe("leave", () => {
    it("a user close while joined fires Left:Host once", async () => {
      await openAndJoin();
      logEvent.mockClear();

      await clickClose();

      expect(events()).toEqual(["PrivateLobby:Left:Host"]);
    });

    it("the close after a successful Start fires no Left", async () => {
      await openAndJoin();
      logEvent.mockClear();

      await startGame();
      await flush();
      await render();

      expect(oModal().isModalOpen).toBe(false);
      expect(events()).toEqual(["PrivateLobby:Start:Tapped"]);
    });

    it("a close before the lobby exists fires no Left", async () => {
      createReply = "pending";
      modal.open();
      await flush();
      await render();

      await clickClose();

      expect(events()).toEqual([]);
    });
  });

  it("no event name or value carries the lobby code or the creator's clientID", async () => {
    const creatorIDs: string[] = [];
    facade.portalGameUrl = PORTAL;
    await openAndJoin();
    creatorIDs.push(creatorClientID());
    await copy();
    facade.copyText.mockResolvedValue(false);
    modal.close();
    await flush();
    await openAndJoin();
    creatorIDs.push(creatorClientID());
    await copy();
    startReply = { ok: false, status: 403 };
    await startGame();
    await clickClose();
    createReply = { ok: false, status: 500 };
    modal.open();
    creatorIDs.push(creatorClientID());
    await flush();

    const seen = logEvent.mock.calls.map((c) => JSON.stringify(c));
    expect(seen).toHaveLength(8);
    for (const call of seen) {
      expect(call).not.toContain(LOBBY_ID);
      for (const id of creatorIDs) expect(call).not.toContain(id);
      expect(call).not.toContain("portal.example");
    }
    for (const [event, value] of logEvent.mock.calls) {
      expect(event).toMatch(/^PrivateLobby:/);
      expect(value === undefined || typeof value === "number").toBe(true);
    }
  });
});
