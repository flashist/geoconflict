/**
 * @jest-environment jsdom
 */

// Task 0198: the private-lobby API URLs must be root-absolute (`/w<N>/api/...`).
// windowOrigin is origin + document pathname; the worker API is mounted at the
// host root, so joining onto windowOrigin prefixes the document path and misses
// the worker route. The regression this guards is the NON-ROOT pathname case.

jest.mock("../../resources/images/RandomMap.webp", () => "random-map.webp", {
  virtual: true,
});
jest.mock("../../src/client/Main", () => ({ JoinLobbyEvent: class {} }));
jest.mock("../../src/client/components/baseComponents/Modal", () => ({}));
jest.mock("../../src/client/components/Difficulties", () => ({}));
jest.mock("../../src/client/components/Maps", () => ({}));
jest.mock("../../src/client/utilities/RenderUnitTypeOptions", () => ({
  renderUnitTypeOptions: () => "",
}));
jest.mock("../../src/client/Utils", () => ({
  translateText: (k: string) => k,
}));
jest.mock("../../src/client/flashist/FlashistFacade", () => ({
  FlashistFacade: {
    instance: {
      // The real value at a non-root document, e.g. /yandex-games_iframe.html
      windowOrigin: "https://geoconflict.ru/yandex-games_iframe.html",
      showInterstitial: jest.fn().mockResolvedValue(undefined),
      // Task 0380: delegates to navigator.clipboard so the 0198 link test below
      // stays as it was; the 0380 suite replaces it per test.
      copyText: jest.fn((text: string) =>
        navigator.clipboard.writeText(text).then(
          () => true,
          () => false,
        ),
      ),
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

import { FlashistFacade } from "../../src/client/flashist/FlashistFacade";
import { HostLobbyModal } from "../../src/client/HostLobbyModal";
import { getServerConfigFromClient } from "../../src/core/configuration/ConfigLoader";

describe("HostLobbyModal private-lobby URLs (task 0198)", () => {
  let fetchMock: jest.Mock;
  let modal: HostLobbyModal;

  beforeEach(() => {
    fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => ({}),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    modal = new HostLobbyModal();
    (modal as unknown as { lobbyId: string }).lobbyId = "TESTLOBBY";
  });

  it("putGameConfig PUTs to a root-absolute worker path, not under the document path", async () => {
    await (
      modal as unknown as { putGameConfig: () => Promise<Response> }
    ).putGameConfig();

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toBe("/w1/api/game/TESTLOBBY");
    // The defect shape: document pathname prefixed onto the worker route.
    expect(url.startsWith("/w")).toBe(true);
    expect(url).not.toContain("yandex-games_iframe.html");
    expect(url).not.toContain("//w");
  });

  it("startGame POSTs to a root-absolute worker path", async () => {
    (modal as unknown as { close: () => void }).close = () => {};

    await (
      modal as unknown as { startGame: () => Promise<Response> }
    ).startGame();

    const startCall = fetchMock.mock.calls
      .map((c) => c[0] as string)
      .find((u) => u.includes("start_game"));
    expect(startCall).toBe("/w1/api/start_game/TESTLOBBY");
    expect(startCall).not.toContain("yandex-games_iframe.html");
    expect(startCall).not.toContain("//w");
  });

  it("the invite link keeps the current document and appends the hash with no separator", async () => {
    const written: string[] = [];
    Object.assign(navigator, {
      clipboard: {
        writeText: (t: string) => {
          written.push(t);
          return Promise.resolve();
        },
      },
    });

    await (
      modal as unknown as { copyToClipboard: () => Promise<void> }
    ).copyToClipboard();

    // A trailing "/" would stop the path matching nginx's `\.html$` rule and
    // serve index.html (the standalone build) instead of the Yandex template.
    expect(written[0]).toBe(
      "https://geoconflict.ru/yandex-games_iframe.html#join=TESTLOBBY",
    );
    expect(written[0]).not.toContain(".html/#join=");
  });
});

// Task 0302: a refused start (403 citizens_only, or any other failure) keeps the
// host in the lobby with a generic inline line; only a successful start closes.
describe("HostLobbyModal start result (task 0302)", () => {
  let modal: HostLobbyModal;
  let close: jest.Mock;

  const startFailedLine = () => modal.querySelector("#host-lobby-start-failed");

  async function start(): Promise<void> {
    await (
      modal as unknown as { startGame: () => Promise<unknown> }
    ).startGame();
    await modal.updateComplete;
  }

  function respondToStart(response: unknown): void {
    global.fetch = jest.fn((url: string) =>
      url.includes("start_game")
        ? response instanceof Error
          ? Promise.reject(response)
          : Promise.resolve(response)
        : Promise.resolve({ ok: true, status: 200, json: async () => ({}) }),
    ) as unknown as typeof fetch;
  }

  beforeEach(() => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(console, "log").mockImplementation(() => {});
    document.body.innerHTML = "";
    modal = new HostLobbyModal();
    (modal as unknown as { lobbyId: string }).lobbyId = "TESTLOBBY";
    close = jest.fn();
    (modal as unknown as { close: () => void }).close = close;
    document.body.appendChild(modal);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("an OK start closes the modal and shows no error", async () => {
    respondToStart({ ok: true, status: 200, statusText: "OK" });

    await start();

    expect(close).toHaveBeenCalledTimes(1);
    expect(startFailedLine()).toBeNull();
  });

  it("a 403 keeps the modal open and shows host_modal.start_failed", async () => {
    respondToStart({ ok: false, status: 403, statusText: "Forbidden" });

    await start();

    expect(close).not.toHaveBeenCalled();
    expect(startFailedLine()).not.toBeNull();
    expect(startFailedLine()!.textContent).toContain("host_modal.start_failed");
  });

  it("any other non-OK start also keeps it open with the same line", async () => {
    respondToStart({ ok: false, status: 500, statusText: "Server Error" });

    await start();

    expect(close).not.toHaveBeenCalled();
    expect(startFailedLine()).not.toBeNull();
  });

  it("a network failure keeps it open with the same line", async () => {
    respondToStart(new Error("network down"));

    await start();

    expect(close).not.toHaveBeenCalled();
    expect(startFailedLine()).not.toBeNull();
  });

  it("a successful retry clears the error line", async () => {
    respondToStart({ ok: false, status: 403, statusText: "Forbidden" });
    await start();
    expect(startFailedLine()).not.toBeNull();

    respondToStart({ ok: true, status: 200, statusText: "OK" });
    await start();

    expect(startFailedLine()).toBeNull();
    expect(close).toHaveBeenCalledTimes(1);
  });

  // Review R4 (owner ruling 2026-09-27, "Fix in 0302"): a failed or throwing
  // settings save shows the same line and does not start.
  function startCalls(): string[] {
    return (global.fetch as jest.Mock).mock.calls
      .map((c) => c[0] as string)
      .filter((u) => u.includes("start_game"));
  }

  function respondToConfigSave(response: unknown): void {
    global.fetch = jest.fn((url: string, init?: { method?: string }) =>
      init?.method === "PUT"
        ? response instanceof Error
          ? Promise.reject(response)
          : Promise.resolve(response)
        : Promise.resolve({ ok: true, status: 200, json: async () => ({}) }),
    ) as unknown as typeof fetch;
  }

  it("a non-OK settings save shows the line and does not start", async () => {
    respondToConfigSave({ ok: false, status: 400, statusText: "Bad Request" });

    await start();

    expect(startCalls()).toEqual([]);
    expect(close).not.toHaveBeenCalled();
    expect(startFailedLine()).not.toBeNull();
  });

  it("a throwing settings save shows the line and does not start", async () => {
    respondToConfigSave(new Error("network down"));

    await start();

    expect(startCalls()).toEqual([]);
    expect(close).not.toHaveBeenCalled();
    expect(startFailedLine()).not.toBeNull();
  });

  it("a throwing server-config read shows the line and does not start", async () => {
    respondToStart({ ok: true, status: 200, statusText: "OK" });
    (getServerConfigFromClient as jest.Mock).mockRejectedValueOnce(
      new Error("env unreachable"),
    );

    await start();

    expect(startCalls()).toEqual([]);
    expect(close).not.toHaveBeenCalled();
    expect(startFailedLine()).not.toBeNull();
  });

  // Review R3: a second tap while a start is in flight is ignored.
  it("a double tap starts once and disables Start while in flight", async () => {
    let finishStart: (value: unknown) => void = () => {};
    global.fetch = jest.fn((url: string) =>
      url.includes("start_game")
        ? new Promise((resolve) => (finishStart = resolve))
        : Promise.resolve({ ok: true, status: 200, json: async () => ({}) }),
    ) as unknown as typeof fetch;
    (modal as unknown as { clients: unknown[] }).clients = [{}, {}];
    const showInterstitial = FlashistFacade.instance
      .showInterstitial as jest.Mock;
    showInterstitial.mockClear();
    const startGame = (
      modal as unknown as { startGame: () => Promise<unknown> }
    ).startGame.bind(modal);

    const first = startGame();
    const second = startGame();
    await expect(second).resolves.toBeNull();
    for (let i = 0; i < 10 && startCalls().length === 0; i++) {
      await Promise.resolve();
    }
    await modal.updateComplete;

    const startButton = modal.querySelector(
      ".start-game-button",
    ) as HTMLButtonElement;
    expect(startButton.disabled).toBe(true);
    expect(startCalls()).toHaveLength(1);
    expect(showInterstitial).toHaveBeenCalledTimes(1);

    finishStart({ ok: true, status: 200, statusText: "OK" });
    await first;
    await modal.updateComplete;

    expect(close).toHaveBeenCalledTimes(1);
    expect(startButton.disabled).toBe(false);
  });

  // Review R7: open() resets a Start left hanging in an earlier opening, and
  // that stale Start never goes on to act on the new lobby.
  it("reopening re-enables Start, and a late ad from the old opening starts nothing", async () => {
    respondToStart({ ok: true, status: 200, statusText: "OK" });
    (modal as unknown as { clients: unknown[] }).clients = [{}, {}];
    let finishOldAd: () => void = () => {};
    const showInterstitial = FlashistFacade.instance
      .showInterstitial as jest.Mock;
    showInterstitial.mockReturnValueOnce(
      new Promise<void>((resolve) => (finishOldAd = resolve)),
    );
    const startGame = (
      modal as unknown as { startGame: () => Promise<unknown> }
    ).startGame.bind(modal);
    const startButton = () =>
      modal.querySelector(".start-game-button") as HTMLButtonElement;

    const stale = startGame();
    await modal.updateComplete;
    expect(startButton().disabled).toBe(true);

    modal.open();
    clearInterval(
      (modal as unknown as { playersInterval: NodeJS.Timeout }).playersInterval,
    );
    // Task 0353 review R1: open() empties the earlier opening's list; these are
    // the new lobby's players, as its poll would fill them.
    (modal as unknown as { clients: unknown[] }).clients = [{}, {}];
    await modal.updateComplete;
    expect(startButton().disabled).toBe(false);

    const callsBefore = (global.fetch as jest.Mock).mock.calls.length;
    finishOldAd();
    await expect(stale).resolves.toBeNull();
    await modal.updateComplete;

    // No settings save and no start from the stale attempt.
    const staleCalls = (global.fetch as jest.Mock).mock.calls
      .slice(callsBefore)
      .map((c) => c[0] as string)
      .filter((u) => u.includes("/api/game/") || u.includes("start_game"));
    expect(staleCalls).toEqual([]);
    expect(close).not.toHaveBeenCalled();

    // A fresh tap in the new opening starts normally.
    await startGame();
    expect(startCalls()).toHaveLength(1);
    expect(close).toHaveBeenCalledTimes(1);
  });

  it("a stale Start finishing late does not clear the new opening's in-flight flag", async () => {
    (modal as unknown as { clients: unknown[] }).clients = [{}, {}];
    let finishOldStart: (value: unknown) => void = () => {};
    let finishNewStart: (value: unknown) => void = () => {};
    let startRequests = 0;
    global.fetch = jest.fn((url: string) => {
      if (!url.includes("start_game")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({}),
        });
      }
      startRequests++;
      return new Promise((resolve) =>
        startRequests === 1
          ? (finishOldStart = resolve)
          : (finishNewStart = resolve),
      );
    }) as unknown as typeof fetch;
    const startGame = (
      modal as unknown as { startGame: () => Promise<unknown> }
    ).startGame.bind(modal);
    const startButton = () =>
      modal.querySelector(".start-game-button") as HTMLButtonElement;
    const flush = async () => {
      for (let i = 0; i < 10; i++) await Promise.resolve();
      await modal.updateComplete;
    };

    const stale = startGame();
    await flush();
    modal.open();
    clearInterval(
      (modal as unknown as { playersInterval: NodeJS.Timeout }).playersInterval,
    );
    // Task 0353 review R1: the new lobby's players (open() empties the list).
    (modal as unknown as { clients: unknown[] }).clients = [{}, {}];
    const fresh = startGame();
    await flush();
    expect(startButton().disabled).toBe(true);

    finishOldStart({ ok: true, status: 200, statusText: "OK" });
    await stale;
    await flush();
    expect(startButton().disabled).toBe(true);

    finishNewStart({ ok: true, status: 200, statusText: "OK" });
    await fresh;
    await flush();
    expect(startButton().disabled).toBe(false);
  });

  // Review R6: the max-timer field matches the schema's min(1).
  describe("max timer value (review R6)", () => {
    function timerInput(): HTMLInputElement {
      return modal.querySelector("#end-timer-value") as HTMLInputElement;
    }

    async function showTimer(): Promise<void> {
      (modal as unknown as { maxTimer: boolean }).maxTimer = true;
      modal.requestUpdate();
      await modal.updateComplete;
    }

    function typeTimer(value: string): void {
      timerInput().value = value;
      (
        modal as unknown as { handleMaxTimerValueChanges: (e: Event) => void }
      ).handleMaxTimerValueChanges({
        target: timerInput(),
      } as unknown as Event);
    }

    const timerValue = () =>
      (modal as unknown as { maxTimerValue: number | undefined }).maxTimerValue;
    const puts = () =>
      (global.fetch as jest.Mock).mock.calls.filter(
        (c) => (c[1] as { method?: string } | undefined)?.method === "PUT",
      );

    beforeEach(() => {
      respondToStart({ ok: true, status: 200, statusText: "OK" });
    });

    it("the field's minimum is 1", async () => {
      await showTimer();
      expect(timerInput().min).toBe("1");
      expect(timerInput().max).toBe("120");
    });

    it("0 is ignored: no new value, no settings save", async () => {
      await showTimer();
      typeTimer("5");
      await Promise.resolve();
      const putsAfterFive = puts().length;

      typeTimer("0");
      await Promise.resolve();

      expect(timerValue()).toBe(5);
      expect(puts()).toHaveLength(putsAfterFive);
    });

    it.each([
      ["1", 1],
      ["120", 120],
    ])("%s is accepted", async (typed, expected) => {
      await showTimer();
      typeTimer(typed);

      expect(timerValue()).toBe(expected);
    });

    it("121 is still ignored", async () => {
      await showTimer();
      typeTimer("121");

      expect(timerValue()).toBeUndefined();
    });
  });
});

// Task 0380 (ADR-119): on the Yandex build the invite copies the bare code,
// inside the click, without revealing a hidden code; a failed copy says so.
describe("HostLobbyModal invite copy (task 0380)", () => {
  type FacadeMock = {
    yaGamesAvailable?: boolean;
    copyText: jest.Mock;
  };
  const facade = FlashistFacade.instance as unknown as FacadeMock;
  const originalCopyText = facade.copyText;
  let modal: HostLobbyModal;

  const copy = () =>
    (
      modal as unknown as { copyToClipboard: () => Promise<void> }
    ).copyToClipboard();
  const copyFailedLine = () => modal.querySelector("#host-lobby-copy-failed");
  const hintLine = () => modal.querySelector("#host-lobby-invite-code-hint");
  const tick = () => modal.querySelector(".copy-success-icon");
  const setVisible = (visible: boolean) => {
    (modal as unknown as { lobbyIdVisible: boolean }).lobbyIdVisible = visible;
    modal.requestUpdate();
  };
  const isVisible = () =>
    (modal as unknown as { lobbyIdVisible: boolean }).lobbyIdVisible;

  beforeEach(() => {
    document.body.innerHTML = "";
    facade.yaGamesAvailable = true;
    facade.copyText = jest.fn().mockResolvedValue(true);
    modal = new HostLobbyModal();
    (modal as unknown as { lobbyId: string }).lobbyId = "AbC12345";
    document.body.appendChild(modal);
  });

  afterEach(() => {
    delete facade.yaGamesAvailable;
    facade.copyText = originalCopyText;
  });

  it("on Yandex copies the bare code, never a URL", async () => {
    await copy();

    expect(facade.copyText).toHaveBeenCalledWith("AbC12345");
  });

  it("calls copyText synchronously, inside the click", async () => {
    const pending = copy();
    // Checked before awaiting: nothing was awaited ahead of the copy.
    expect(facade.copyText).toHaveBeenCalledTimes(1);
    await pending;
  });

  it("on Yandex, copying a hidden code leaves it hidden", async () => {
    setVisible(false);

    await copy();
    await modal.updateComplete;

    expect(isVisible()).toBe(false);
    expect(modal.querySelector(".lobby-id")!.textContent).not.toContain(
      "AbC12345",
    );
    expect(tick()).not.toBeNull();
  });

  it("a failed copy of a hidden code points to the eye button, with no tick and no reveal", async () => {
    facade.copyText.mockResolvedValue(false);
    setVisible(false);

    await copy();
    await modal.updateComplete;

    expect(copyFailedLine()).not.toBeNull();
    expect(copyFailedLine()!.textContent).toContain(
      "host_modal.copy_failed_hidden",
    );
    expect(tick()).toBeNull();
    expect(isVisible()).toBe(false);
  });

  it("a failed copy of a visible code just says to copy it by hand", async () => {
    facade.copyText.mockResolvedValue(false);
    setVisible(true);

    await copy();
    await modal.updateComplete;

    expect(copyFailedLine()!.textContent!.trim()).toBe(
      "host_modal.copy_failed",
    );
  });

  it("a later successful copy clears the failure line", async () => {
    facade.copyText.mockResolvedValueOnce(false);
    await copy();
    await modal.updateComplete;
    expect(copyFailedLine()).not.toBeNull();

    await copy();
    await modal.updateComplete;

    expect(copyFailedLine()).toBeNull();
    expect(tick()).not.toBeNull();
  });

  // Review R1: a copy still settling when the window closes must not put its
  // tick or failure line on the next opening.
  it.each([
    ["failure line", false],
    ["tick", true],
  ])(
    "a copy that settles after the window closed shows no %s",
    async (_label, result) => {
      let settle: (copied: boolean) => void = () => {};
      facade.copyText.mockReturnValue(
        new Promise<boolean>((resolve) => {
          settle = resolve;
        }),
      );

      const pending = copy();
      modal.close();
      settle(result);
      await pending;
      await modal.updateComplete;

      expect(copyFailedLine()).toBeNull();
      expect(tick()).toBeNull();
    },
  );

  it("shows the code hint on Yandex only", async () => {
    await modal.updateComplete;
    expect(hintLine()!.textContent).toContain("host_modal.invite_code_hint");

    facade.yaGamesAvailable = false;
    modal.requestUpdate();
    await modal.updateComplete;
    expect(hintLine()).toBeNull();
  });

  it("on standalone still copies today's link", async () => {
    facade.yaGamesAvailable = false;

    await copy();

    expect(facade.copyText).toHaveBeenCalledWith(
      "https://geoconflict.ru/yandex-games_iframe.html#join=AbC12345",
    );
  });
});

// Task 0382 (ADR-119): once the SDK gave this game's portal link (fetched when
// the window opens), Yandex copies that link with the code as `payload`, still
// inside the click; until then, the bare code. Fake portal URL only.
describe("HostLobbyModal invite link (task 0382)", () => {
  type FacadeMock = {
    yaGamesAvailable?: boolean;
    portalGameUrl?: string | null;
    loadPortalGameUrl?: jest.Mock;
    copyText: jest.Mock;
  };
  const facade = FlashistFacade.instance as unknown as FacadeMock;
  const originalCopyText = facade.copyText;
  const PORTAL = "https://portal.example/games/app/111111";
  const CODE = "K7M4PCRX";
  const LINK = "https://portal.example/games/app/111111?payload=K7M4PCRX";
  let modal: HostLobbyModal;

  const copy = () =>
    (
      modal as unknown as { copyToClipboard: () => Promise<void> }
    ).copyToClipboard();
  const hintLine = () => modal.querySelector("#host-lobby-invite-code-hint");
  const openModal = () => {
    modal.open();
    clearInterval(
      (modal as unknown as { playersInterval: NodeJS.Timeout }).playersInterval,
    );
  };

  beforeEach(() => {
    document.body.innerHTML = "";
    jest.spyOn(console, "log").mockImplementation(() => {});
    // The lobby create never answers here: only the link fetch matters.
    global.fetch = jest.fn(
      () => new Promise(() => {}),
    ) as unknown as typeof fetch;
    facade.yaGamesAvailable = true;
    facade.portalGameUrl = null;
    facade.loadPortalGameUrl = jest.fn().mockResolvedValue(null);
    facade.copyText = jest.fn().mockResolvedValue(true);
    modal = new HostLobbyModal();
    (modal as unknown as { lobbyId: string }).lobbyId = CODE;
    document.body.appendChild(modal);
  });

  afterEach(() => {
    delete facade.yaGamesAvailable;
    delete facade.portalGameUrl;
    delete facade.loadPortalGameUrl;
    facade.copyText = originalCopyText;
    jest.restoreAllMocks();
  });

  it("with the link ready, copies the link synchronously, inside the click", async () => {
    facade.portalGameUrl = PORTAL;

    const pending = copy();
    // Checked before awaiting: nothing was awaited ahead of the copy.
    expect(facade.copyText).toHaveBeenCalledWith(LINK);
    await pending;
    expect(facade.loadPortalGameUrl).not.toHaveBeenCalled();
  });

  it("with the link not ready yet, copies the bare code", async () => {
    await copy();

    expect(facade.copyText).toHaveBeenCalledWith(CODE);
  });

  it("before the lobby code exists, copies no link", async () => {
    facade.portalGameUrl = PORTAL;
    (modal as unknown as { lobbyId: string }).lobbyId = "";

    await copy();

    expect(facade.copyText).toHaveBeenCalledWith("");
  });

  it("on standalone ignores the portal link and copies today's link", async () => {
    facade.yaGamesAvailable = false;
    facade.portalGameUrl = PORTAL;

    await copy();

    expect(facade.copyText).toHaveBeenCalledWith(
      "https://geoconflict.ru/yandex-games_iframe.html#join=K7M4PCRX",
    );
  });

  it("copying the link leaves a hidden code hidden", async () => {
    facade.portalGameUrl = PORTAL;
    (modal as unknown as { lobbyIdVisible: boolean }).lobbyIdVisible = false;
    modal.requestUpdate();

    await copy();
    await modal.updateComplete;

    expect(
      (modal as unknown as { lobbyIdVisible: boolean }).lobbyIdVisible,
    ).toBe(false);
    expect(modal.querySelector(".lobby-id")!.textContent).not.toContain("K7M4");
  });

  it("open() starts the link fetch on Yandex", () => {
    openModal();

    expect(facade.loadPortalGameUrl).toHaveBeenCalledTimes(1);
  });

  it("open() does not fetch on standalone", () => {
    facade.yaGamesAvailable = false;

    openModal();

    expect(facade.loadPortalGameUrl).not.toHaveBeenCalled();
  });

  it("the hint switches from the code to the link when the link lands", async () => {
    let land: (url: string | null) => void = () => {};
    facade.loadPortalGameUrl = jest.fn(
      () =>
        new Promise<string | null>((resolve) => {
          land = resolve;
        }),
    );
    // open() resets the code; this opening's code, as the create would set it.
    openModal();
    (modal as unknown as { lobbyId: string }).lobbyId = CODE;
    modal.requestUpdate();
    await modal.updateComplete;
    expect(hintLine()!.textContent!.trim()).toBe("host_modal.invite_code_hint");

    facade.portalGameUrl = PORTAL;
    land(PORTAL);
    await Promise.resolve();
    await modal.updateComplete;

    expect(hintLine()!.textContent!.trim()).toBe("host_modal.invite_link_hint");
  });

  it("keeps the code hint when the SDK has no link", async () => {
    openModal();
    await Promise.resolve();
    await modal.updateComplete;

    expect(hintLine()!.textContent!.trim()).toBe("host_modal.invite_code_hint");
  });
});
