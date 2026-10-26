/**
 * @jest-environment jsdom
 */
jest.mock("../../src/client/components/PatternButton", () => ({}));
jest.mock("howler", () => ({ Howler: { mute: jest.fn() } }));
jest.mock("../../src/client/RewardedMatchXpClaim", () => ({
  claimRewardedMatchXp: jest.fn(),
}));
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
  VK_CHANNEL_URL: "https://example.com/vk",
  flashistConstants: {
    analyticEvents: {
      GAME_END: "Game:End",
      GAME_LOSS: "Game:Loss",
      MATCH_DURATION: "Match:Duration",
      MATCH_LOSS_OPPONENT_WON: "Match:Loss:OpponentWon",
      PLAYER_ELIMINATED: "Player:Eliminated",
      GAME_WIN: "Game:Win",
      TUTORIAL_COMPLETED: "Tutorial:Completed",
      TUTORIAL_DURATION: "Tutorial:Duration",
      AD_REWARDED_OFFER_SHOWN: "Ad:Rewarded:OfferShown",
      AD_REWARDED_PRESSED: "Ad:Rewarded:Pressed",
      AD_REWARDED_LOGIN_OFFER_SHOWN: "Ad:Rewarded:LoginOfferShown",
      AD_REWARDED_LOGIN_PRESSED: "Ad:Rewarded:LoginPressed",
      AD_REWARDED_LOGIN_COMPLETED: "Ad:Rewarded:LoginCompleted",
      AD_REWARDED_SUPPRESSED_CITIZEN: "Ad:RewardedSuppressed:Citizen",
    },
    uiElementIds: {
      telegramLinkGameEnd: "TelegramLinkGameEnd",
      vkLinkGameEnd: "VkLinkGameEnd",
    },
  },
  flashist_logEventAnalytics: jest.fn(),
  FlashistFacade: {
    instance: {
      isEmailSubscribeButtonEnabled: jest.fn().mockResolvedValue(false),
      isTelegramLinkEnabled: jest.fn().mockResolvedValue(false),
      isVkLinkEnabled: jest.fn().mockResolvedValue(false),
      isRewardedVideoEnabled: jest.fn().mockResolvedValue(true),
      isCitizenshipSurfacesEnabled: jest.fn().mockResolvedValue(true),
      isRewardedVideoAvailable: jest.fn(() => true),
      showRewardedVideo: jest.fn(),
      openYandexAuthDialog: jest.fn(),
      showInterstitial: jest.fn(),
      changeHref: jest.fn(),
      logUiTapEvent: jest.fn(),
    },
  },
}));

import { GameMode, GameType } from "../../src/core/game/Game";
import { GameUpdateType } from "../../src/core/game/GameUpdates";
import {
  FlashistFacade,
  flashistConstants,
  flashist_logEventAnalytics,
} from "../../src/client/flashist/FlashistFacade";
import { WinModal } from "../../src/client/graphics/layers/WinModal";
import { ACTIVE_TAB_STORAGE_KEY } from "../../src/client/StartScreenTabStorage";
import { Howler } from "howler";
import { claimRewardedMatchXp } from "../../src/client/RewardedMatchXpClaim";
import {
  publishCitizenshipStatus,
  publishProfileVerificationStatus,
  resetCitizenshipStatusForTests,
} from "../../src/client/CitizenshipStatus";

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

// Task 0022 — risk 3. A singleplayer Team match can legitimately end with the
// Bot team winning. A live player gets the solo-loss screen; a player who
// already died falls through to the team branch, which used to render the raw
// untranslated enum value ("Bot team has won!").
describe("WinModal Bot team wins", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    jest.clearAllMocks();
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("shows a dedicated bot loss title when the player already died", async () => {
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
            winner: ["team", "Bot"],
            allPlayersStats: {},
          },
        ],
      }),
    });

    modal.tick();
    await flushLit(modal);

    expect(modal.textContent).toContain("win_modal.bot_team");
    expect(modal.textContent).not.toContain("win_modal.other_team");
    expect(flashist_logEventAnalytics).toHaveBeenCalledWith(
      flashistConstants.analyticEvents.GAME_LOSS,
    );
  });

  // Control: any other team still renders the normal "{team} team has won!"
  // copy, so the case above is not just asserting a missing string.
  it("still shows the generic other-team title for a non-bot team", async () => {
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
            winner: ["team", "Red"],
            allPlayersStats: {},
          },
        ],
      }),
    });

    modal.tick();
    await flushLit(modal);

    expect(modal.textContent).toContain("win_modal.other_team");
    expect(modal.textContent).not.toContain("win_modal.bot_team");
  });
});

describe("WinModal exit to menu", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    localStorage.clear();
    jest.clearAllMocks();
  });

  it("forces the multiplayer start screen tab before leaving", async () => {
    localStorage.setItem(ACTIVE_TAB_STORAGE_KEY, "singleplayer");
    const eventBus = { emit: jest.fn() };
    const modal = await appendModal({
      eventBus,
      game: createGame({
        gameType: GameType.Singleplayer,
        isTutorial: false,
        winUpdates: [],
      }),
    });

    await (
      modal as unknown as { _handleExit: () => Promise<void> }
    )._handleExit();

    expect(localStorage.getItem(ACTIVE_TAB_STORAGE_KEY)).toBe("multiplayer");
    expect(FlashistFacade.instance.changeHref).toHaveBeenCalled();
  });
});

describe("WinModal.buildPlayerParticipation", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    jest.clearAllMocks();
  });

  function fakePlayer(over: {
    clientID: string | null;
    hasSpawned: boolean;
    isAlive: boolean;
  }) {
    return {
      clientID: () => over.clientID,
      hasSpawned: () => over.hasSpawned,
      isAlive: () => over.isAlive,
    };
  }

  it("summarizes only human players with spawn / alive / killedAt", () => {
    const modal = new WinModal();
    modal.game = {
      players: () => [
        fakePlayer({ clientID: "alive1", hasSpawned: true, isAlive: true }),
        fakePlayer({ clientID: "dead1", hasSpawned: true, isAlive: false }),
        fakePlayer({ clientID: "nospawn", hasSpawned: false, isAlive: false }),
        // AI player: no clientID → skipped entirely.
        fakePlayer({ clientID: null, hasSpawned: true, isAlive: true }),
      ],
    } as never;

    const result = (
      modal as unknown as {
        buildPlayerParticipation: (stats: unknown) => unknown[];
      }
    ).buildPlayerParticipation({ dead1: { killedAt: 17n } });

    expect(result).toEqual([
      { clientID: "alive1", hasSpawned: true, isAliveAtEnd: true },
      {
        clientID: "dead1",
        hasSpawned: true,
        isAliveAtEnd: false,
        killedAt: 17,
      },
      { clientID: "nospawn", hasSpawned: false, isAliveAtEnd: false },
    ]);
  });
});

// Task 0488: the rewarded-video offer inside the end-of-match popup.
describe("WinModal rewarded-video offer", () => {
  const facade = FlashistFacade.instance as unknown as {
    showRewardedVideo: jest.Mock;
    openYandexAuthDialog: jest.Mock;
    isRewardedVideoEnabled: jest.Mock;
    changeHref: jest.Mock;
  };
  const claim = claimRewardedMatchXp as jest.Mock;
  const logEvent = flashist_logEventAnalytics as jest.Mock;
  const eventsLogged = (event: string) =>
    logEvent.mock.calls.filter(([name]) => name === event);

  beforeEach(() => {
    document.body.innerHTML = "";
    jest.clearAllMocks();
    resetCitizenshipStatusForTests();
    publishCitizenshipStatus("not_citizen");
    publishProfileVerificationStatus("verified");
  });

  afterEach(() => {
    document.body.innerHTML = "";
    resetCitizenshipStatusForTests();
    jest.useRealTimers();
  });

  async function revealedModal(gameType = GameType.Public): Promise<WinModal> {
    const modal = await appendModal({
      eventBus: { emit: jest.fn() },
      game: createGame({ gameType, isTutorial: false, winUpdates: [] }),
    });
    await reveal(modal);
    return modal;
  }

  async function reveal(modal: WinModal): Promise<void> {
    (modal as unknown as { revealButtons: () => void }).revealButtons();
    await settle(modal);
  }

  async function settle(modal: WinModal): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 0));
    await flushLit(modal);
  }

  function watchButton(modal: WinModal): HTMLButtonElement | null {
    return (
      Array.from(modal.querySelectorAll("button")).find(
        (button) =>
          button.textContent?.trim() === "win_modal.rewarded_watch_button",
      ) ?? null
    );
  }

  it("a non-citizen sees the XP explainer and the watch button, OfferShown once", async () => {
    const modal = await revealedModal();

    expect(modal.textContent).toContain("win_modal.xp_explainer");
    expect(watchButton(modal)).not.toBeNull();
    expect(eventsLogged("Ad:Rewarded:OfferShown")).toHaveLength(1);

    await reveal(modal);
    expect(eventsLogged("Ad:Rewarded:OfferShown")).toHaveLength(1);
  });

  it("a citizen sees the popup as before, and the suppression fires once", async () => {
    publishCitizenshipStatus("citizen");
    const modal = await revealedModal();

    expect(modal.textContent).not.toContain("win_modal.xp_explainer");
    expect(watchButton(modal)).toBeNull();
    expect(eventsLogged("Ad:RewardedSuppressed:Citizen")).toHaveLength(1);
    expect(eventsLogged("Ad:Rewarded:OfferShown")).toHaveLength(0);

    await reveal(modal);
    expect(eventsLogged("Ad:RewardedSuppressed:Citizen")).toHaveLength(1);
  });

  it("a single-player match shows no offer", async () => {
    const modal = await revealedModal(GameType.Singleplayer);

    expect(modal.textContent).not.toContain("win_modal.xp_explainer");
  });

  it("the remote flag off shows no offer", async () => {
    facade.isRewardedVideoEnabled.mockResolvedValueOnce(false);
    const modal = await revealedModal();

    expect(watchButton(modal)).toBeNull();
  });

  it("watched to the end: the claim runs and the granted text replaces the button", async () => {
    claim.mockResolvedValue({ status: "granted", xpAwarded: 1, xp: 2 });
    facade.showRewardedVideo.mockImplementation(
      async (onRewarded: () => void, setMuted: (muted: boolean) => void) => {
        setMuted(true);
        onRewarded();
        setMuted(false);
        return "watched";
      },
    );
    const modal = await revealedModal();

    watchButton(modal)!.click();
    await settle(modal);

    expect(eventsLogged("Ad:Rewarded:Pressed")).toHaveLength(1);
    expect(claim).toHaveBeenCalledWith("game-1");
    expect(Howler.mute).toHaveBeenNthCalledWith(1, true);
    expect(Howler.mute).toHaveBeenNthCalledWith(2, false);
    expect(modal.textContent).toContain("win_modal.rewarded_granted");
    expect(watchButton(modal)).toBeNull();

    // The match-end popup after the death popup: same match, same result.
    await reveal(modal);
    expect(modal.textContent).toContain("win_modal.rewarded_granted");
    expect(watchButton(modal)).toBeNull();
    expect(claim).toHaveBeenCalledTimes(1);
  });

  it("closed early: no claim, the button stays with the closed-early text", async () => {
    facade.showRewardedVideo.mockResolvedValue("closed_early");
    const modal = await revealedModal();

    watchButton(modal)!.click();
    await settle(modal);

    expect(claim).not.toHaveBeenCalled();
    expect(modal.textContent).toContain("win_modal.rewarded_closed_early");
    expect(watchButton(modal)).not.toBeNull();
  });

  it("a guest gets the login prompt, no video", async () => {
    publishProfileVerificationStatus("guest");
    facade.openYandexAuthDialog.mockResolvedValue(true);
    const modal = await revealedModal();

    expect(watchButton(modal)).toBeNull();
    expect(modal.textContent).toContain("win_modal.guest_login_text");
    expect(eventsLogged("Ad:Rewarded:LoginOfferShown")).toHaveLength(1);

    const loginButton = Array.from(modal.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "win_modal.guest_login_button",
    );
    loginButton!.click();
    await settle(modal);

    expect(facade.showRewardedVideo).not.toHaveBeenCalled();
    expect(eventsLogged("Ad:Rewarded:LoginPressed")).toHaveLength(1);
    expect(eventsLogged("Ad:Rewarded:LoginCompleted")).toHaveLength(1);
    expect(modal.textContent).toContain("win_modal.guest_logged_in");
  });

  it("exit waits for a running claim before leaving", async () => {
    let finishClaim!: (value: unknown) => void;
    claim.mockReturnValue(
      new Promise((resolve) => {
        finishClaim = resolve;
      }),
    );
    facade.showRewardedVideo.mockImplementation(
      async (onRewarded: () => void) => {
        onRewarded();
        return "watched";
      },
    );
    const modal = await revealedModal();
    watchButton(modal)!.click();
    await settle(modal);

    const exiting = (
      modal as unknown as { _handleExit: () => Promise<void> }
    )._handleExit();
    await settle(modal);
    expect(facade.changeHref).not.toHaveBeenCalled();

    finishClaim({ status: "granted", xpAwarded: 1, xp: 2 });
    await exiting;
    expect(facade.changeHref).toHaveBeenCalledTimes(1);
  });

  it("exit stops waiting for a hung claim after 5 s", async () => {
    claim.mockReturnValue(new Promise(() => {}));
    facade.showRewardedVideo.mockImplementation(
      async (onRewarded: () => void) => {
        onRewarded();
        return "watched";
      },
    );
    const modal = await revealedModal();
    watchButton(modal)!.click();
    await settle(modal);

    jest.useFakeTimers();
    const exiting = (
      modal as unknown as { _handleExit: () => Promise<void> }
    )._handleExit();
    await jest.advanceTimersByTimeAsync(4_999);
    expect(facade.changeHref).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(1);
    await exiting;
    expect(facade.changeHref).toHaveBeenCalledTimes(1);
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
  gameID = "game-1",
}: {
  gameType: GameType;
  isAlive?: boolean;
  isTutorial: boolean;
  winUpdates: unknown[];
  gameID?: string;
}) {
  return {
    gameID: () => gameID,
    config: () => ({
      gameConfig: () => ({
        gameMode: GameMode.FFA,
        gameType,
        isTutorial,
      }),
      isReplay: () => false,
    }),
    myPlayer: () => ({
      clientID: () => "me",
      hasSpawned: () => true,
      isAlive: () => isAlive,
      team: () => null,
    }),
    inSpawnPhase: () => false,
    ticks: () => 120,
    players: () => [],
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
