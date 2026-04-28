/**
 * @jest-environment jsdom
 */
jest.mock("../../src/client/components/PatternButton", () => ({}));
jest.mock("../../src/client/Cosmetics", () => ({
  fetchCosmetics: jest
    .fn()
    .mockResolvedValue({ patterns: {}, colorPalettes: {} }),
  handlePurchase: jest.fn(),
  patternRelationship: jest.fn(),
}));
jest.mock("../../src/client/Utils", () => ({
  isInIframe: jest.fn(() => false),
  translateText: jest.fn((key: string) => key),
}));
jest.mock("../../src/client/jwt", () => ({
  getUserMe: jest.fn().mockResolvedValue(null),
}));
jest.mock("../../src/client/Transport", () => ({
  SendWinnerEvent: class SendWinnerEvent {
    constructor(
      public readonly winner: unknown,
      public readonly allPlayersStats: unknown,
    ) {}
  },
}));
jest.mock("../../src/client/ReconnectSession", () => ({
  clearReconnectSession: jest.fn(),
}));
jest.mock("../../src/client/SinglePlayMissionStorage", () => ({
  getNextMissionLevel: jest.fn(),
  markMissionCompleted: jest.fn(),
  setNextMissionLevel: jest.fn(),
}));
jest.mock("../../src/client/TutorialStorage", () => ({
  TUTORIAL_COMPLETED_KEY: "tutorial-completed",
  TUTORIAL_START_TIME_KEY: "tutorial-start-time",
}));
jest.mock("../../src/client/flashist/FlashistFacade", () => ({
  TELEGRAM_CHANNEL_URL: "https://example.com/telegram",
  flashistConstants: {
    analyticEvents: {
      GAME_END: "Game:End",
      GAME_LOSS: "Game:Loss",
      MATCH_LOSS_OPPONENT_WON: "Match:Loss:OpponentWon",
      PLAYER_ELIMINATED: "Player:Eliminated",
      GAME_WIN: "Game:Win",
      TUTORIAL_COMPLETED: "Tutorial:Completed",
      TUTORIAL_DURATION: "Tutorial:Duration",
    },
    uiElementIds: {
      telegramLinkGameEnd: "TelegramLinkGameEnd",
    },
  },
  flashist_logEventAnalytics: jest.fn(),
  FlashistFacade: {
    instance: {
      isEmailSubscribeButtonEnabled: jest.fn().mockResolvedValue(false),
      isTelegramLinkEnabled: jest.fn().mockResolvedValue(false),
      showInterstitial: jest.fn(),
      changeHref: jest.fn(),
      logUiTapEvent: jest.fn(),
    },
  },
}));

import { GameMode, GameType } from "../../src/core/game/Game";
import { GameUpdateType } from "../../src/core/game/GameUpdates";
import {
  flashistConstants,
  flashist_logEventAnalytics,
} from "../../src/client/flashist/FlashistFacade";
import { WinModal } from "../../src/client/graphics/layers/WinModal";

describe("WinModal solo opponent wins", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    jest.clearAllMocks();
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("shows a distinct solo loss when an opponent without a client id wins", async () => {
    const eventBus = { emit: jest.fn() };
    const modal = await appendModal({
      eventBus,
      game: createGame({
        gameType: GameType.Singleplayer,
        isTutorial: false,
        winUpdates: [
          {
            type: GameUpdateType.Win,
            winner: ["opponent", "Nation"],
            allPlayersStats: { me: { gold: 0 } },
          },
        ],
      }),
    });

    modal.tick();
    modal.tick();
    await flushLit(modal);

    expect(modal.textContent).toContain("win_modal.opponent_won_title");
    expect(modal.textContent).toContain("win_modal.opponent_won_body");
    expect(modal.textContent).not.toContain("win_modal.died");
    expect(flashist_logEventAnalytics).toHaveBeenCalledWith(
      flashistConstants.analyticEvents.MATCH_LOSS_OPPONENT_WON,
    );
    expect(
      (flashist_logEventAnalytics as jest.Mock).mock.calls.filter(
        ([event]) =>
          event === flashistConstants.analyticEvents.MATCH_LOSS_OPPONENT_WON,
      ),
    ).toHaveLength(1);
    expect(eventBus.emit).toHaveBeenCalledTimes(1);
    expect(eventBus.emit.mock.calls[0][0].winner).toEqual([
      "opponent",
      "Nation",
    ]);
  });

  it("does not use the solo opponent loss state in tutorial matches", async () => {
    const eventBus = { emit: jest.fn() };
    const modal = await appendModal({
      eventBus,
      game: createGame({
        gameType: GameType.Singleplayer,
        isTutorial: true,
        winUpdates: [
          {
            type: GameUpdateType.Win,
            winner: ["opponent", "Nation"],
            allPlayersStats: {},
          },
        ],
      }),
    });

    modal.tick();
    await flushLit(modal);

    expect(modal.textContent).not.toContain("win_modal.opponent_won_title");
    expect(flashist_logEventAnalytics).not.toHaveBeenCalledWith(
      flashistConstants.analyticEvents.MATCH_LOSS_OPPONENT_WON,
    );
    expect(eventBus.emit).not.toHaveBeenCalled();
  });

  it("keeps the elimination modal when a dead player receives a solo opponent win update", async () => {
    const eventBus = { emit: jest.fn() };
    const modal = await appendModal({
      eventBus,
      game: createGame({
        gameType: GameType.Singleplayer,
        isAlive: false,
        isTutorial: false,
        winUpdates: [
          {
            type: GameUpdateType.Win,
            winner: ["opponent", "Nation"],
            allPlayersStats: {},
          },
        ],
      }),
    });

    modal.tick();
    await flushLit(modal);

    expect(modal.textContent).toContain("win_modal.died");
    expect(modal.textContent).not.toContain("win_modal.opponent_won_title");
    expect(flashist_logEventAnalytics).toHaveBeenCalledWith(
      flashistConstants.analyticEvents.PLAYER_ELIMINATED,
      120,
    );
    expect(flashist_logEventAnalytics).not.toHaveBeenCalledWith(
      flashistConstants.analyticEvents.MATCH_LOSS_OPPONENT_WON,
    );
    expect(eventBus.emit).not.toHaveBeenCalled();
  });
});

async function appendModal({
  eventBus,
  game,
}: {
  eventBus: { emit: jest.Mock };
  game: unknown;
}): Promise<WinModal> {
  const modal = new WinModal();
  modal.eventBus = eventBus as never;
  modal.game = game as never;
  document.body.appendChild(modal);
  await flushLit(modal);
  return modal;
}

function createGame({
  gameType,
  isTutorial,
  winUpdates,
  isAlive = true,
}: {
  gameType: GameType;
  isAlive?: boolean;
  isTutorial: boolean;
  winUpdates: unknown[];
}) {
  return {
    config: () => ({
      gameConfig: () => ({
        gameMode: GameMode.FFA,
        gameType,
        isTutorial,
      }),
    }),
    myPlayer: () => ({
      clientID: () => "me",
      hasSpawned: () => true,
      isAlive: () => isAlive,
      team: () => null,
    }),
    inSpawnPhase: () => false,
    ticks: () => 120,
    updatesSinceLastTick: () => ({
      [GameUpdateType.Win]: winUpdates,
    }),
  };
}

async function flushLit(element: HTMLElement): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  if ("updateComplete" in element) {
    await (element as HTMLElement & { updateComplete: Promise<unknown> })
      .updateComplete;
  }
}
