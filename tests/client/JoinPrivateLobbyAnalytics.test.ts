/**
 * @jest-environment jsdom
 */

// Task 0451: the guest window's private-lobby funnel events —
// Joined:{Link|Code}, JoinFailed:{NotFound|Error}, Left:Guest. Each fires at
// its moment, once, and never carries the lobby code. Uses the REAL o-modal.
// Task 0454: every join-failed case also checks the player's message, so the
// screen and the event are proven to agree.

jest.mock("../../src/client/Main", () => ({ JoinLobbyEvent: class {} }));
jest.mock("../../src/client/Utils", () => ({
  translateText: (k: string) => k,
}));
jest.mock("../../src/client/CitizenBadge", () => ({
  renderCitizenBadge: () => "",
}));
jest.mock("../../src/client/components/baseComponents/Button", () => ({}));
jest.mock("../../src/client/jwt", () => ({ getApiBase: () => "/archive" }));
jest.mock("../../src/core/configuration/ConfigLoader", () => ({
  getServerConfigFromClient: jest.fn(),
}));
// Schemas pulls in jose, which needs a TextEncoder jsdom lacks; nothing here
// decodes patterns. Same stub as JoinPrivateLobbyModalLeave.test.ts.
jest.mock("jose", () => ({
  base64url: { decode: jest.fn() },
}));
jest.mock("../../src/client/flashist/FlashistFacade", () => ({
  flashistConstants: {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    analyticEvents: require("./support/privateLobbyEvents")
      .PRIVATE_LOBBY_EVENTS,
  },
  flashist_logEventAnalytics: jest.fn(),
}));

import "../../src/client/components/baseComponents/Modal";
import { flashist_logEventAnalytics } from "../../src/client/flashist/FlashistFacade";
import { JoinPrivateLobbyModal } from "../../src/client/JoinPrivateLobbyModal";
import { getServerConfigFromClient } from "../../src/core/configuration/ConfigLoader";
import { exposeLitAccessors } from "./support/litAccessors";

// Task 0389: the Join window only looks up private-lobby codes.
const LOBBY_ID = "K7M4PCRX";

type OModalElement = HTMLElement & {
  isModalOpen: boolean;
  updateComplete: Promise<boolean>;
};

// "html" is what production's archive lookup answers today (review R1): the
// site's page fallback, 200 with an HTML body, so `json()` throws.
type Reply = { status: number; json?: unknown } | Error | "pending" | "html";

async function flush(): Promise<void> {
  for (let i = 0; i < 20; i++) await Promise.resolve();
}

describe("JoinPrivateLobbyModal private-lobby analytics (task 0451)", () => {
  const logEvent = flashist_logEventAnalytics as jest.Mock;
  let modal: JoinPrivateLobbyModal;
  let existsReply: Reply;
  let archiveReply: Reply;
  let finishPending: (() => void)[];
  let joins: CustomEvent[];
  // Task 0454: archiving is off in every environment today (ADR-104). Tests of
  // the archive path switch it on, as task 0030 one day will.
  let archiveOn: boolean;
  const onJoin = (e: Event) => joins.push(e as CustomEvent);

  const oModal = () => modal.querySelector("o-modal") as OModalElement;
  const events = () => logEvent.mock.calls.map((c) => c[0] as string);
  const input = () => modal.querySelector("#lobbyIdInput") as HTMLInputElement;
  const joinButton = () => modal.querySelector("o-button") as HTMLElement;
  const message = () => modal.querySelector(".message-area")!.textContent;
  const fetchedUrls = () =>
    (global.fetch as jest.Mock).mock.calls.map((c) => c[0] as string);
  const archiveRequests = () =>
    fetchedUrls().filter(
      (url) => url.startsWith("/archive/") || url === "/commit.txt",
    );

  function reply(r: Reply, pendingValue: unknown): Promise<unknown> {
    if (r === "pending") {
      return new Promise((resolve) =>
        finishPending.push(() => resolve(pendingValue)),
      );
    }
    if (r instanceof Error) return Promise.reject(r);
    if (r === "html") {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => {
          throw new SyntaxError("Unexpected token '<'");
        },
        text: async () => "<!doctype html>",
      });
    }
    return Promise.resolve({
      ok: r.status === 200,
      status: r.status,
      json: async () => r.json,
      text: async () => "",
    });
  }

  async function render(): Promise<void> {
    await modal.updateComplete;
    await oModal().updateComplete;
  }

  async function typeAndPressJoin(code = LOBBY_ID): Promise<void> {
    input().value = code;
    joinButton().click();
    await flush();
    await render();
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
    jest.spyOn(console, "warn").mockImplementation(() => {});
    existsReply = { status: 200, json: { exists: true } };
    archiveReply = "html";
    archiveOn = false;
    (getServerConfigFromClient as jest.Mock).mockResolvedValue({
      workerPath: () => "w1",
      archiveEnabled: () => archiveOn,
    });
    finishPending = [];
    global.fetch = jest.fn((url: string) => {
      if (url.endsWith("/exists")) {
        return reply(existsReply, {
          ok: true,
          status: 200,
          json: async () => ({ exists: true }),
        });
      }
      if (url.startsWith("/archive/")) {
        return reply(archiveReply, {
          ok: false,
          status: 404,
          json: async () => ({}),
        });
      }
      if (url === "/commit.txt") {
        return reply({ status: 404 }, null);
      }
      return reply({ status: 200, json: { clients: [] } }, null);
    }) as unknown as typeof fetch;
    joins = [];
    document.addEventListener("join-lobby", onJoin);
    document.body.innerHTML = "";
    modal = new JoinPrivateLobbyModal();
    exposeLitAccessors(modal);
    document.body.appendChild(modal);
    await modal.updateComplete;
    exposeLitAccessors(oModal());
    await render();
    logEvent.mockClear();
  });

  afterEach(() => {
    document.removeEventListener("join-lobby", onJoin);
    modal.remove();
    jest.clearAllTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe("joined", () => {
    it("typing a code and pressing Join fires Joined:Code", async () => {
      modal.open();
      await render();

      await typeAndPressJoin();

      expect(joins).toHaveLength(1);
      expect(events()).toEqual(["PrivateLobby:Joined:Code"]);
    });

    it("a window opened with a code (an invite link) fires Joined:Link", async () => {
      modal.open(LOBBY_ID);
      await flush();
      await render();

      expect(joins).toHaveLength(1);
      expect(events()).toEqual(["PrivateLobby:Joined:Link"]);
    });

    it("two overlapping lookups in one opening count one join", async () => {
      modal.open();
      await render();
      existsReply = "pending";
      input().value = LOBBY_ID;
      joinButton().click();
      joinButton().click();
      await flush();
      expect(finishPending).toHaveLength(2);

      finishPending.forEach((finish) => finish());
      await flush();

      expect(events()).toEqual(["PrivateLobby:Joined:Code"]);
    });

    it("a lookup that settles after the window closed fires nothing", async () => {
      modal.open();
      await render();
      existsReply = "pending";
      await typeAndPressJoin();

      await clickClose();
      finishPending.forEach((finish) => finish());
      await flush();

      expect(joins).toHaveLength(0);
      expect(events()).toEqual([]);
    });
  });

  describe("join failed", () => {
    beforeEach(() => {
      existsReply = { status: 200, json: { exists: false } };
    });

    it("no such lobby fires JoinFailed:NotFound, and no Joined", async () => {
      modal.open();
      await render();

      await typeAndPressJoin();

      expect(joins).toHaveLength(0);
      expect(message()).toContain("private_lobby.not_found");
      expect(events()).toEqual(["PrivateLobby:JoinFailed:NotFound"]);
    });

    // Task 0454: archiving is off (ADR-104), so a wrong code never asks the
    // archive — the player sees the not-found line, not the generic error.
    it("a wrong code with archiving off shows not found and asks no archive", async () => {
      modal.open();
      await render();

      await typeAndPressJoin();

      expect(message()).toContain("private_lobby.not_found");
      expect(message()).not.toContain("private_lobby.error");
      expect(events()).toEqual(["PrivateLobby:JoinFailed:NotFound"]);
      expect(archiveRequests()).toEqual([]);
    });

    it("each failed press counts once (a player action each)", async () => {
      modal.open();
      await render();

      await typeAndPressJoin();
      await typeAndPressJoin();

      expect(events()).toEqual([
        "PrivateLobby:JoinFailed:NotFound",
        "PrivateLobby:JoinFailed:NotFound",
      ]);
    });

    // Review R2: an HTTP error from the worker lookup is not "does not
    // exist", even when its body is JSON without `exists: true`.
    it("a worker lookup HTTP error with a JSON body shows the error line and fires JoinFailed:Error", async () => {
      existsReply = { status: 500, json: { exists: false } };
      modal.open();
      await render();

      await typeAndPressJoin();

      expect(message()).toContain("private_lobby.error");
      expect(events()).toEqual(["PrivateLobby:JoinFailed:Error"]);
      expect(archiveRequests()).toEqual([]);
    });

    it("a worker lookup that answers HTML (a proxy error page) shows the error line and fires JoinFailed:Error", async () => {
      existsReply = "html";
      modal.open();
      await render();

      await typeAndPressJoin();

      expect(message()).toContain("private_lobby.error");
      expect(events()).toEqual(["PrivateLobby:JoinFailed:Error"]);
      expect(archiveRequests()).toEqual([]);
    });

    it("a worker lookup that answers OK without `exists` shows the error line and fires JoinFailed:Error", async () => {
      existsReply = { status: 200, json: {} };
      modal.open();
      await render();

      await typeAndPressJoin();

      expect(message()).toContain("private_lobby.error");
      expect(events()).toEqual(["PrivateLobby:JoinFailed:Error"]);
      expect(archiveRequests()).toEqual([]);
    });

    it("a network failure shows the error line and fires JoinFailed:Error", async () => {
      existsReply = new Error("network down");
      modal.open(LOBBY_ID);
      await flush();
      await render();

      expect(message()).toContain("private_lobby.error");
      expect(events()).toEqual(["PrivateLobby:JoinFailed:Error"]);
      expect(archiveRequests()).toEqual([]);
    });

    // Task 0454: the archive path, as task 0030 will switch it back on.
    describe("with archiving on", () => {
      beforeEach(() => {
        archiveOn = true;
      });

      // Review R1: production's archive answers 200 HTML, so `json()` throws.
      // The worker already said "no such lobby", so the player sees not-found.
      it("a 200 HTML archive answer (production's shape) after the worker said no such lobby shows not found", async () => {
        archiveReply = "html";
        modal.open();
        await render();

        await typeAndPressJoin();

        expect(archiveRequests().length).toBeGreaterThan(0);
        expect(message()).toContain("private_lobby.not_found");
        expect(message()).not.toContain("private_lobby.error");
        expect(events()).toEqual(["PrivateLobby:JoinFailed:NotFound"]);
      });

      it("an archive HTTP error after the worker said no such lobby shows not found", async () => {
        archiveReply = { status: 500 };
        modal.open();
        await render();

        await typeAndPressJoin();

        expect(message()).toContain("private_lobby.not_found");
        expect(events()).toEqual(["PrivateLobby:JoinFailed:NotFound"]);
      });

      it("an archive that answers 404 shows not found", async () => {
        archiveReply = { status: 404 };
        modal.open();
        await render();

        await typeAndPressJoin();

        expect(message()).toContain("private_lobby.not_found");
        expect(events()).toEqual(["PrivateLobby:JoinFailed:NotFound"]);
      });

      it("a worker answer that is not 'no such lobby', then an HTML archive answer, shows the error line", async () => {
        existsReply = { status: 500, json: {} };
        archiveReply = "html";
        modal.open();
        await render();

        await typeAndPressJoin();

        expect(archiveRequests().length).toBeGreaterThan(0);
        expect(message()).toContain("private_lobby.error");
        expect(events()).toEqual(["PrivateLobby:JoinFailed:Error"]);
      });

      it("a version mismatch (an archived game of another version) fires nothing", async () => {
        archiveReply = { status: 200, json: { not: "a game record" } };
        modal.open();
        await render();

        await typeAndPressJoin();

        expect(modal.querySelector(".message-area")!.textContent).toContain(
          "private_lobby.version_mismatch",
        );
        expect(events()).toEqual([]);
      });

      it("the archived game / replay branch fires nothing", async () => {
        jest
          .spyOn(
            JoinPrivateLobbyModal.prototype as unknown as {
              checkArchivedGame: () => Promise<string>;
            },
            "checkArchivedGame",
          )
          .mockResolvedValue("success");
        modal.open();
        await render();

        await typeAndPressJoin();

        expect(events()).toEqual([]);
      });

      it("a failure that settles after the window closed fires nothing", async () => {
        archiveReply = "pending";
        modal.open();
        await render();
        await typeAndPressJoin();

        await clickClose();
        finishPending.forEach((finish) => finish());
        await flush();

        expect(events()).toEqual([]);
      });
    });

    it("a text that is not a code fires nothing (no lookup was made)", async () => {
      modal.open();
      await render();

      await typeAndPressJoin("");
      await typeAndPressJoin("not a code at all");

      expect(events()).toEqual([]);
    });
  });

  describe("leave", () => {
    it("a user close after joining fires Left:Guest once", async () => {
      modal.open(LOBBY_ID);
      await flush();
      await render();
      logEvent.mockClear();

      await clickClose();

      expect(events()).toEqual(["PrivateLobby:Left:Guest"]);
    });

    it("a programmatic close (match start) fires no Left", async () => {
      modal.open(LOBBY_ID);
      await flush();
      await render();
      logEvent.mockClear();

      modal.close();
      await flush();
      await render();

      expect(events()).toEqual([]);
    });

    it("a close before joining fires no Left", async () => {
      modal.open();
      await render();

      await clickClose();

      expect(events()).toEqual([]);
    });
  });

  it("no event name or value carries the lobby code", async () => {
    modal.open(LOBBY_ID);
    await flush();
    await render();
    await clickClose();
    existsReply = { status: 200, json: { exists: false } };
    modal.open();
    await render();
    await typeAndPressJoin();
    existsReply = { status: 500, json: {} };
    await typeAndPressJoin();

    expect(logEvent.mock.calls).toHaveLength(4);
    for (const call of logEvent.mock.calls) {
      expect(JSON.stringify(call)).not.toContain(LOBBY_ID);
      expect(call[0]).toMatch(/^PrivateLobby:/);
      expect(call[1]).toBeUndefined();
    }
  });
});
