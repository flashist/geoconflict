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
    },
  },
}));
jest.mock("../../src/core/configuration/ConfigLoader", () => ({
  getServerConfigFromClient: jest
    .fn()
    .mockResolvedValue({ workerPath: () => "w1" }),
}));

import { HostLobbyModal } from "../../src/client/HostLobbyModal";

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
