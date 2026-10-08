/**
 * @jest-environment jsdom
 */

// Task 0413 (Part B, from 0414): the error window's "copy" button copies
// through FlashistFacade.copyText (Yandex SDK first, browser clipboard as the
// fallback), called first in the click with nothing awaited before it, and its
// text follows copyText's result. Reuses ClientGameRunnerTeardown.test.ts's
// mock set; only the facade mock adds `instance.copyText`.

jest.mock("../../src/client/Main", () => ({
  getPersistentID: jest.fn(() => "test-persistent-id"),
}));
jest.mock("../../src/client/OtelBrowserInit", () => ({
  logOtelWarn: jest.fn(),
}));
jest.mock("../../src/client/Utils", () => ({
  translateText: (key: string) => key,
  createCanvas: jest.fn(),
}));
jest.mock("../../src/client/TerrainMapFileLoader", () => ({
  terrainMapFileLoader: {},
}));
jest.mock("../../src/client/graphics/GameRenderer", () => ({
  createRenderer: jest.fn(),
  GameRenderer: class {},
}));
jest.mock("../../src/client/graphics/layers/Leaderboard", () => ({
  GoToPlayerEvent: class {},
}));
jest.mock("../../src/client/sound/SoundManager", () => ({
  __esModule: true,
  default: {
    playBackgroundMusic: jest.fn(),
    stopBackgroundMusic: jest.fn(),
  },
}));
jest.mock("../../src/client/Transport", () => {
  // Task 0233 (T9): joinLobby builds its own Transport, so the mock records
  // every instance and gives each the methods the lobby handler reaches.
  const instances: unknown[] = [];
  class Transport {
    isLocal = false;
    connect = jest.fn();
    leaveGame = jest.fn();
    joinGame = jest.fn();
    reconnect = jest.fn();
    constructor() {
      instances.push(this);
    }
  }
  return {
    __instances: instances,
    Transport,
    SendAttackIntentEvent: class {},
    SendBoatAttackIntentEvent: class {},
    SendHashEvent: class {},
    SendSpawnIntentEvent: class {},
    SendUpgradeStructureIntentEvent: class {},
  };
});
jest.mock("../../src/client/LocalPersistantStats", () => ({
  endGame: jest.fn(),
  startGame: jest.fn(),
  startTime: jest.fn(() => 0),
}));
jest.mock("../../src/client/MatchStartAnalytics", () => ({
  logMatchSpawnedConfirmedAnalytics: jest.fn(),
  logMatchStartAnalytics: jest.fn(() => false),
  setActiveMatchStartTime: jest.fn(),
  shouldLogMatchSpawnedConfirmedAnalytics: jest.fn(() => false),
}));
jest.mock("../../src/client/PlayerElimination", () => ({
  isEliminated: jest.fn(() => false),
}));
jest.mock("../../src/client/ReconnectSession", () => ({
  saveReconnectSession: jest.fn(),
  clearReconnectSession: jest.fn(),
  loadReconnectSession: jest.fn(() => null),
}));
jest.mock("../../src/client/WinConditionAnalytics", () => ({
  logWinConditionCheckAnalytics: jest.fn(),
  shouldLogWinConditionCheck: jest.fn(() => false),
}));
jest.mock("../../src/client/leaderboard/LeaderboardReporter", () => ({
  humanWonPlacement: jest.fn(),
  reportParticipation: jest.fn(),
  reportPlacement: jest.fn(),
}));
jest.mock("../../src/client/flashist-game/FlashistGameSettings", () => ({
  FlashistGameSettings: {
    leaderboardPoints: { first: 0, second: 0, third: 0 },
  },
}));
// jose needs a TextEncoder jsdom lacks; nothing here decodes. Same stub as
// tests/client/JoinPrivateLobbyModalLeave.test.ts.
jest.mock("jose", () => ({
  base64url: { decode: jest.fn() },
}));
jest.mock("../../src/client/flashist/FlashistFacade", () => ({
  flashist_logEventAnalytics: jest.fn(),
  flashistConstants: { analyticEvents: {} },
  FlashistFacade: { instance: { copyText: jest.fn() } },
}));

import { showErrorModal } from "../../src/client/ClientGameRunner";
import { FlashistFacade } from "../../src/client/flashist/FlashistFacade";

const copyText = (FlashistFacade.instance as unknown as { copyText: jest.Mock })
  .copyText;

async function flush(): Promise<void> {
  for (let i = 0; i < 20; i++) await Promise.resolve();
}

describe("error window copy button (task 0413, Part B)", () => {
  let writeText: jest.Mock;
  let unhandled: unknown[];
  const onUnhandled = (reason: unknown) => unhandled.push(reason);

  const copyButton = () =>
    document.querySelector("#error-modal .copy-btn") as HTMLButtonElement;
  const windowText = () =>
    document.querySelector("#error-modal pre")!.textContent;

  beforeEach(() => {
    document.body.innerHTML = "";
    copyText.mockReset();
    writeText = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
      writable: true,
    });
    unhandled = [];
    process.on("unhandledRejection", onUnhandled);
    showErrorModal("boom", "details", "GAME1234", "CLIENT01", true);
  });

  afterEach(() => {
    process.off("unhandledRejection", onUnhandled);
    Object.defineProperty(navigator, "clipboard", {
      value: undefined,
      configurable: true,
      writable: true,
    });
  });

  it("(1) calls copyText once with the window's full text, before anything is awaited", async () => {
    copyText.mockResolvedValue(true);

    copyButton().click();
    // Checked synchronously: nothing was awaited ahead of the copy.
    expect(copyText).toHaveBeenCalledTimes(1);
    expect(copyText).toHaveBeenCalledWith(windowText());
    expect(windowText()).toContain("game id: GAME1234");
    expect(windowText()).toContain("Error: boom");

    await flush();
  });

  it("(2) copyText resolves true → the button reads the copied text", async () => {
    copyText.mockResolvedValue(true);

    copyButton().click();
    await flush();

    expect(copyButton().textContent).toBe("error_modal.copied");
  });

  it("(3) copyText resolves false → the button reads the failed-to-copy text", async () => {
    copyText.mockResolvedValue(false);

    copyButton().click();
    await flush();

    expect(copyButton().textContent).toBe("error_modal.failed_copy");
  });

  it("(4) copyText rejects (defensive) → failed-to-copy text, no unhandled rejection", async () => {
    copyText.mockRejectedValue(new Error("unexpected"));

    copyButton().click();
    await flush();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(copyButton().textContent).toBe("error_modal.failed_copy");
    expect(unhandled).toEqual([]);
  });

  it("(5) never calls navigator.clipboard.writeText directly", async () => {
    copyText.mockResolvedValue(true);

    copyButton().click();
    await flush();

    expect(writeText).not.toHaveBeenCalled();
  });
});
