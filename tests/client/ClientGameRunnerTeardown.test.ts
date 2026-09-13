// Task 0231 — ClientGameRunner.stop() as the one idempotent teardown.
//
// ClientGameRunner.ts drags in Lit components, Howler and the Flashist facade,
// none of which load under jest's node environment, so every browser-facing
// module is replaced by a factory. The runner, the EventBus and the input event
// classes are real. T1, T3, T4 and T5 fail on the pre-0231 code (unstored
// timeout, unstored bound listeners, no latch); T2 passes on it too — the old
// stop() already cleared a live interval — so T2 is a regression guard. T6 pins
// the start()-after-stop() guard (review R3); T5's music assertion pins the
// never-started runner leaving the music alone (review R4).

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
jest.mock("../../src/client/Transport", () => ({
  Transport: class {},
  SendAttackIntentEvent: class {},
  SendBoatAttackIntentEvent: class {},
  SendHashEvent: class {},
  SendSpawnIntentEvent: class {},
  SendUpgradeStructureIntentEvent: class {},
}));
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
jest.mock("../../src/client/flashist/FlashistFacade", () => ({
  flashist_logEventAnalytics: jest.fn(),
  flashistConstants: { analyticEvents: {} },
}));

import { ClientGameRunner } from "../../src/client/ClientGameRunner";
import {
  AutoUpgradeEvent,
  DoBoatAttackEvent,
  DoGroundAttackEvent,
  MouseMoveEvent,
  MouseUpEvent,
} from "../../src/client/InputHandler";
import SoundManager from "../../src/client/sound/SoundManager";
import { EventBus } from "../../src/core/EventBus";

const FIVE = [
  MouseUpEvent,
  MouseMoveEvent,
  AutoUpgradeEvent,
  DoBoatAttackEvent,
  DoGroundAttackEvent,
];

function listenerCount(bus: EventBus, eventType: unknown): number {
  const listeners = (bus as any).listeners as Map<unknown, unknown[]>;
  return listeners.get(eventType)?.length ?? 0;
}

function makeRunner() {
  const bus = new EventBus();
  const transport = {
    isLocal: false,
    connect: jest.fn(),
    leaveGame: jest.fn(),
    reconnect: jest.fn(),
    joinGame: jest.fn(),
    turnComplete: jest.fn(),
  };
  const worker = {
    start: jest.fn(),
    sendHeartbeat: jest.fn(),
    cleanup: jest.fn(),
  };
  const renderer = { initialize: jest.fn() };
  const input = { initialize: jest.fn() };
  const onGameEnd = jest.fn();
  const lobby: any = {
    gameID: "game-1",
    clientID: "client-1",
    playerName: "Tester",
    gameStartInfo: { gameID: "game-1", config: {}, players: [] },
  };
  const runner = new ClientGameRunner(
    lobby,
    bus,
    renderer as any,
    input as any,
    transport as any,
    worker as any,
    {} as any,
    onGameEnd,
  );
  return { runner, bus, transport, worker, onGameEnd };
}

describe("ClientGameRunner teardown (task 0231)", () => {
  let setIntervalSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers();
    (globalThis as any).requestAnimationFrame = jest.fn();
    setIntervalSpy = jest.spyOn(globalThis, "setInterval");
    (SoundManager.playBackgroundMusic as jest.Mock).mockClear();
    (SoundManager.stopBackgroundMusic as jest.Mock).mockClear();
  });

  afterEach(() => {
    setIntervalSpy.mockRestore();
    jest.useRealTimers();
  });

  test("T2 control: a live, silent runner does reconnect after the 20 s arm", () => {
    const { runner, transport } = makeRunner();
    runner.start();
    jest.advanceTimersByTime(21_000);
    expect(transport.reconnect).toHaveBeenCalledTimes(1);
  });

  test("T1: stop() before the 20 s arm — no interval, no reconnect", () => {
    const { runner, transport } = makeRunner();
    runner.start();
    runner.stop();
    jest.advanceTimersByTime(60_000);
    expect(transport.reconnect).not.toHaveBeenCalled();
    const oneSecondIntervals = setIntervalSpy.mock.calls.filter(
      (call) => call[1] === 1000,
    );
    expect(oneSecondIntervals).toHaveLength(0);
  });

  test("T2: stop() after the arm — the live interval stops reconnecting", () => {
    const { runner, transport } = makeRunner();
    runner.start();
    jest.advanceTimersByTime(21_000);
    expect(transport.reconnect).toHaveBeenCalledTimes(1);
    runner.stop();
    jest.advanceTimersByTime(30_000);
    expect(transport.reconnect).toHaveBeenCalledTimes(1);
  });

  test("T3: stop() removes the five bus listeners it registered", () => {
    const inputEventSpy = jest.spyOn(
      ClientGameRunner.prototype as any,
      "inputEvent",
    );
    const { runner, bus } = makeRunner();
    runner.start();
    for (const eventType of FIVE) {
      expect(listenerCount(bus, eventType)).toBe(1);
    }
    runner.stop();
    for (const eventType of FIVE) {
      expect(listenerCount(bus, eventType)).toBe(0);
    }
    bus.emit(new MouseUpEvent(1, 2));
    expect(inputEventSpy).not.toHaveBeenCalled();
    inputEventSpy.mockRestore();
  });

  test("T4: a second stop() is a no-op — cleanup, leaveGame, onGameEnd, music once", () => {
    const { runner, worker, transport, onGameEnd } = makeRunner();
    runner.start();
    runner.stop();
    runner.stop();
    expect(worker.cleanup).toHaveBeenCalledTimes(1);
    expect(transport.leaveGame).toHaveBeenCalledTimes(1);
    expect(onGameEnd).toHaveBeenCalledTimes(1);
    expect(SoundManager.stopBackgroundMusic).toHaveBeenCalledTimes(1);
  });

  test("T5: stop() on a never-started runner still tears the worker down", () => {
    const { runner, worker, transport, onGameEnd } = makeRunner();
    runner.stop();
    expect(worker.cleanup).toHaveBeenCalledTimes(1);
    expect(transport.leaveGame).toHaveBeenCalledTimes(1);
    expect(onGameEnd).toHaveBeenCalledTimes(1);
    // It never played music, so it must not stop another game's track (R4).
    expect(SoundManager.stopBackgroundMusic).not.toHaveBeenCalled();
  });

  test("T6: start() after stop() is a no-op — nothing re-armed (R3)", () => {
    const { runner, bus, worker, transport } = makeRunner();
    runner.start();
    runner.stop();
    runner.start();
    expect(worker.start).toHaveBeenCalledTimes(1);
    expect(SoundManager.playBackgroundMusic).toHaveBeenCalledTimes(1);
    for (const eventType of FIVE) {
      expect(listenerCount(bus, eventType)).toBe(0);
    }
    jest.advanceTimersByTime(60_000);
    expect(transport.reconnect).not.toHaveBeenCalled();
    const oneSecondIntervals = setIntervalSpy.mock.calls.filter(
      (call) => call[1] === 1000,
    );
    expect(oneSecondIntervals).toHaveLength(0);
  });
});
