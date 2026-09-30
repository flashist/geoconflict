// Task 0347 — joinLobby saves the reconnect session on the server's `start`,
// before the worker is built, so a refresh after a failed worker start can
// still offer Rejoin.
//
// The module-mock block follows ClientGameRunnerTeardown.test.ts: every
// browser-facing module is replaced by a factory. On top of that, the worker,
// the config loader and the terrain loader are mocked so createClientGame can
// be driven up to (and through) the worker start without a browser.
// showErrorModal returns early when "#error-modal" already exists, so a truthy
// querySelector stub keeps the failure path on the node environment.

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
  // joinLobby builds its own Transport, so the mock records every instance.
  // isLocal is derived from the lobby config exactly as the real constructor
  // does (Transport.ts), so singleplayer is excluded the same way.
  const instances: unknown[] = [];
  class Transport {
    isLocal: boolean;
    connect = jest.fn();
    leaveGame = jest.fn();
    joinGame = jest.fn();
    reconnect = jest.fn();
    constructor(lobbyConfig: any) {
      this.isLocal =
        lobbyConfig.gameRecord !== undefined ||
        lobbyConfig.gameStartInfo?.config.gameType === "Singleplayer";
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
  loadReconnectSession: jest.fn(),
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
  flashistConstants: {
    analyticEvents: {
      WORKER_INIT_SUCCESS: "Worker:InitSuccess",
      WORKER_INIT_FAILED: "Worker:InitFailed",
      WORKER_INIT_FAILED_CAUSE_FIRST_PART: "Worker:InitFailedCause:",
    },
  },
}));
jest.mock("../../src/core/worker/WorkerClient", () => {
  // A constructor spy with a controllable initialize(). The default never
  // settles, so a test that does not care about the worker outcome leaves
  // createClientGame parked at the worker start.
  const workerInitialize = jest.fn(() => new Promise<void>(() => {}));
  const WorkerClient = jest.fn().mockImplementation(() => ({
    initialize: workerInitialize,
    cleanup: jest.fn(),
  }));
  // Task 0348: the real error class, so createClientGame's instanceof check
  // does not throw against a mocked-away export.
  return {
    __workerInitialize: workerInitialize,
    WorkerClient,
    WorkerInitTimeoutError: jest.requireActual(
      "../../src/core/worker/WorkerClient",
    ).WorkerInitTimeoutError,
  };
});
jest.mock("../../src/core/configuration/ConfigLoader", () => ({
  getConfig: jest.fn(() => Promise.resolve({})),
}));
jest.mock("../../src/core/game/TerrainMapLoader", () => ({
  loadTerrainMap: jest.fn(() => Promise.resolve({})),
  getCachedMap: jest.fn(() => ({})),
}));

import { joinLobby } from "../../src/client/ClientGameRunner";
import { flashist_logEventAnalytics } from "../../src/client/flashist/FlashistFacade";
import { logOtelWarn } from "../../src/client/OtelBrowserInit";
import {
  clearReconnectSession,
  loadReconnectSession,
  saveReconnectSession,
} from "../../src/client/ReconnectSession";
import * as TransportModule from "../../src/client/Transport";
import * as ConfigLoaderModule from "../../src/core/configuration/ConfigLoader";
import { EventBus } from "../../src/core/EventBus";
import * as TerrainMapLoaderModule from "../../src/core/game/TerrainMapLoader";
import * as WorkerClientModule from "../../src/core/worker/WorkerClient";

const transportInstances = (TransportModule as any).__instances as any[];
const WorkerClientMock =
  WorkerClientModule.WorkerClient as unknown as jest.Mock;
const workerInitialize = (WorkerClientModule as any)
  .__workerInitialize as jest.Mock;
const saveMock = saveReconnectSession as jest.Mock;
const clearMock = clearReconnectSession as jest.Mock;
const loadMock = loadReconnectSession as jest.Mock;
const getConfigMock = ConfigLoaderModule.getConfig as unknown as jest.Mock;
const loadTerrainMapMock =
  TerrainMapLoaderModule.loadTerrainMap as unknown as jest.Mock;
const getCachedMapMock =
  TerrainMapLoaderModule.getCachedMap as unknown as jest.Mock;
const analyticsMock = flashist_logEventAnalytics as unknown as jest.Mock;
const otelWarnMock = logOtelWarn as unknown as jest.Mock;
const { WorkerInitTimeoutError } = WorkerClientModule;

function workerCleanupCalls(): number {
  return WorkerClientMock.mock.results.reduce(
    (total, result) =>
      total +
      (result.type === "return" ? result.value.cleanup.mock.calls.length : 0),
    0,
  );
}

function workerFailureEvents(): Array<[string, unknown]> {
  return analyticsMock.mock.calls.filter(([name]) =>
    String(name).startsWith("Worker:InitFailed"),
  ) as Array<[string, unknown]>;
}

function startMessage(gameType: string) {
  return {
    type: "start",
    gameStartInfo: {
      gameID: "g",
      config: { gameMap: "World", gameMapSize: "Normal", gameType },
      players: [],
    },
    turns: [],
  };
}

function join(lobbyConfig: any) {
  const onGameEnd = jest.fn();
  const before = transportInstances.length;
  const gameStop = joinLobby(
    new EventBus(),
    lobbyConfig,
    jest.fn(),
    jest.fn(),
    onGameEnd,
  );
  expect(transportInstances).toHaveLength(before + 1);
  const transport = transportInstances[before];
  const onmessage = transport.connect.mock.calls[0][1];
  return { onmessage, gameStop, onGameEnd, transport };
}

function multiplayerLobby(): any {
  return {
    gameID: "g",
    clientID: "c",
    playerName: "Tester",
    serverConfig: {},
  };
}

async function flushPromises() {
  for (let i = 0; i < 10; i++) {
    await Promise.resolve();
  }
}

describe("joinLobby saves the reconnect session on start (task 0347)", () => {
  beforeEach(() => {
    (globalThis as any).requestAnimationFrame = jest.fn();
    (globalThis as any).document = { querySelector: () => ({}) };
    saveMock.mockReset();
    clearMock.mockReset();
    loadMock.mockReset();
    loadMock.mockImplementation(() => ({ gameID: "g", clientID: "c" }));
    getConfigMock.mockReset();
    getConfigMock.mockImplementation(() => Promise.resolve({}));
    loadTerrainMapMock.mockReset();
    loadTerrainMapMock.mockImplementation(() => Promise.resolve({}));
    WorkerClientMock.mockClear();
    analyticsMock.mockClear();
    otelWarnMock.mockClear();
    workerInitialize.mockReset();
    workerInitialize.mockImplementation(() => new Promise<void>(() => {}));
  });

  afterEach(() => {
    delete (globalThis as any).document;
  });

  test("J1: a multiplayer start saves the session before the worker is built", () => {
    const workerCallsAtSave: number[] = [];
    saveMock.mockImplementation(() => {
      workerCallsAtSave.push(WorkerClientMock.mock.calls.length);
    });
    // getConfig is createClientGame's first call, made synchronously when it
    // is invoked, so this pins the save ahead of createClientGame itself
    // (review R4) — not just ahead of the worker, which is built later.
    const savesAtCreateClientGame: number[] = [];
    getConfigMock.mockImplementation(() => {
      savesAtCreateClientGame.push(saveMock.mock.calls.length);
      return Promise.resolve({});
    });
    const { onmessage } = join(multiplayerLobby());
    onmessage(startMessage("Public"));
    expect(saveMock).toHaveBeenCalledTimes(1);
    expect(saveMock).toHaveBeenCalledWith("g", "c");
    expect(workerCallsAtSave).toEqual([0]);
    expect(savesAtCreateClientGame).toEqual([1]);
  });

  test("J2: a failed worker start keeps the session — nothing clears it", async () => {
    // Task 0348 review R2: the real timeout class, so the fixture runs the
    // Timeout branch its text describes (a plain Error is classed as Crash).
    workerInitialize.mockImplementation(() =>
      Promise.reject(new WorkerInitTimeoutError()),
    );
    const { onmessage, onGameEnd } = join(multiplayerLobby());
    onmessage(startMessage("Public"));
    await flushPromises();
    expect(WorkerClientMock).toHaveBeenCalledTimes(1);
    expect(onGameEnd).toHaveBeenCalledTimes(1);
    expect(saveMock).toHaveBeenCalledTimes(1);
    expect(clearMock).not.toHaveBeenCalled();
    // Task 0348: the left-over worker is stopped, and the 0347 hand-off holds —
    // the failure path stops the worker but never clears the session.
    expect(workerCleanupCalls()).toBe(1);
  });

  test("J2b: a match start that rejects before the worker keeps the session", async () => {
    // joinLobby's .catch re-throws on purpose, so the rejection stays
    // unhandled for the global reporters. Capture the promises it derives with
    // .catch and handle them here, so jest does not fail on the unhandled
    // rejection — and so the test can check the re-throw still happens.
    const originalCatch = Promise.prototype.catch;
    const derived: Promise<unknown>[] = [];
    const catchSpy = jest
      .spyOn(Promise.prototype, "catch")
      .mockImplementation(function (
        this: Promise<unknown>,
        onRejected?: (reason: unknown) => unknown,
      ) {
        const promise = originalCatch.call(this, onRejected);
        derived.push(promise);
        return promise;
      });
    const rejections: string[] = [];
    try {
      loadTerrainMapMock.mockImplementation(() =>
        Promise.reject(new Error("map load failed")),
      );
      const { onmessage, onGameEnd } = join(multiplayerLobby());
      onmessage(startMessage("Public"));
      catchSpy.mockRestore();
      for (const promise of derived) {
        promise.then(undefined, (err: Error) => rejections.push(err.message));
      }
      await flushPromises();
      expect(WorkerClientMock).not.toHaveBeenCalled();
      expect(onGameEnd).toHaveBeenCalledTimes(1);
      expect(saveMock).toHaveBeenCalledTimes(1);
      expect(clearMock).not.toHaveBeenCalled();
      expect(rejections).toEqual(["map load failed"]);
    } finally {
      catchSpy.mockRestore();
    }
  });

  test("J3: a singleplayer start saves nothing", () => {
    const lobbyConfig = {
      ...multiplayerLobby(),
      gameStartInfo: startMessage("Singleplayer").gameStartInfo,
    };
    const { onmessage } = join(lobbyConfig);
    onmessage(startMessage("Singleplayer"));
    expect(saveMock).not.toHaveBeenCalled();
  });

  test("J4: a lobby error after start clears the session this join saved", () => {
    const { onmessage } = join(multiplayerLobby());
    onmessage(startMessage("Public"));
    onmessage({ type: "error", error: "Kicked from game" });
    expect(saveMock).toHaveBeenCalledTimes(1);
    expect(clearMock).toHaveBeenCalledTimes(1);
  });

  test("J4c: a lobby error keeps a session another tab has written since", () => {
    loadMock.mockImplementation(() => ({ gameID: "g2", clientID: "c2" }));
    const { onmessage } = join(multiplayerLobby());
    onmessage(startMessage("Public"));
    onmessage({ type: "error", error: "Kicked from game" });
    expect(clearMock).not.toHaveBeenCalled();
  });

  test("J4d: a throwing storage call in the lobby error cannot skip the teardown", () => {
    clearMock.mockImplementation(() => {
      throw new Error("storage blocked");
    });
    const { onmessage, onGameEnd, transport } = join(multiplayerLobby());
    onmessage(startMessage("Public"));
    expect(() =>
      onmessage({ type: "error", error: "Kicked from game" }),
    ).toThrow("storage blocked");
    expect(transport.leaveGame).toHaveBeenCalledTimes(1);
    expect(onGameEnd).toHaveBeenCalledTimes(1);
  });

  test("J4b: a lobby error with no prior start clears nothing", () => {
    const { onmessage } = join(multiplayerLobby());
    onmessage({ type: "error", error: "Kicked from game" });
    expect(clearMock).not.toHaveBeenCalled();
  });

  test("J5: a start that lands after the player left saves nothing", () => {
    const { onmessage, gameStop } = join(multiplayerLobby());
    gameStop();
    onmessage(startMessage("Public"));
    expect(saveMock).not.toHaveBeenCalled();
  });

  test("J6a: a start timeout logs InitFailed plus the Timeout cause, and warns Uptrace", async () => {
    workerInitialize.mockImplementation(() =>
      Promise.reject(new WorkerInitTimeoutError()),
    );
    const { onmessage } = join(multiplayerLobby());
    onmessage(startMessage("Public"));
    await flushPromises();
    const events = workerFailureEvents();
    expect(events.map(([name]) => name)).toEqual([
      "Worker:InitFailed",
      "Worker:InitFailedCause:Timeout",
    ]);
    expect(typeof events[1][1]).toBe("number");
    expect(otelWarnMock).toHaveBeenCalledTimes(1);
    expect(otelWarnMock).toHaveBeenCalledWith(
      "Worker init failed (Timeout): Worker initialization timeout",
    );
  });

  test("J6b: a worker crash logs the Crash cause and sends the real reason to Uptrace", async () => {
    workerInitialize.mockImplementation(() =>
      Promise.reject(
        new Error("Worker initialization failed: Failed to fetch /maps/x"),
      ),
    );
    const { onmessage } = join(multiplayerLobby());
    onmessage(startMessage("Public"));
    await flushPromises();
    const events = workerFailureEvents();
    expect(events.map(([name]) => name)).toEqual([
      "Worker:InitFailed",
      "Worker:InitFailedCause:Crash",
    ]);
    expect(typeof events[1][1]).toBe("number");
    expect(otelWarnMock).toHaveBeenCalledTimes(1);
    expect(otelWarnMock).toHaveBeenCalledWith(
      "Worker init failed (Crash): Worker initialization failed: Failed to fetch /maps/x",
    );
    expect(workerCleanupCalls()).toBe(1);
  });

  test("J7: new WorkerClient throwing is a Crash, ends the game and keeps the session", async () => {
    WorkerClientMock.mockImplementationOnce(() => {
      throw new Error("worker script blocked");
    });
    const { onmessage, onGameEnd } = join(multiplayerLobby());
    onmessage(startMessage("Public"));
    await flushPromises();
    expect(WorkerClientMock).toHaveBeenCalledTimes(1);
    expect(workerCleanupCalls()).toBe(0);
    expect(workerFailureEvents().map(([name]) => name)).toEqual([
      "Worker:InitFailed",
      "Worker:InitFailedCause:Crash",
    ]);
    expect(otelWarnMock).toHaveBeenCalledWith(
      "Worker init failed (Crash): worker script blocked",
    );
    expect(onGameEnd).toHaveBeenCalledTimes(1);
    expect(saveMock).toHaveBeenCalledTimes(1);
    expect(clearMock).not.toHaveBeenCalled();
  });
});

describe("joinLobby hands the worker the page's map and stops it on leave (task 0035)", () => {
  const mapSourceMarker = { marker: "page-map-source" };
  let querySelector: jest.Mock;

  // A worker whose start the test settles by hand. cleanup() records when it
  // ran; with cleanupRejects it also fails the pending start, as the real
  // WorkerClient.cleanup() now does.
  function controlledWorker(cleanupRejects = false) {
    const events: string[] = [];
    let rejectStart: (err: Error) => void = () => {};
    const initialize = jest.fn(
      () =>
        new Promise<void>((_resolve, reject) => {
          rejectStart = (err: Error) => {
            events.push("start-settled");
            reject(err);
          };
        }),
    );
    const cleanup = jest.fn(() => {
      events.push("cleanup");
      if (cleanupRejects) {
        rejectStart(new Error("Worker stopped before it finished starting"));
      }
    });
    WorkerClientMock.mockImplementation(() => ({ initialize, cleanup }));
    return { events, cleanup, fail: (err: Error) => rejectStart(err) };
  }

  function errorModalQueries(): number {
    return querySelector.mock.calls.filter(([sel]) => sel === "#error-modal")
      .length;
  }

  beforeEach(() => {
    (globalThis as any).requestAnimationFrame = jest.fn();
    querySelector = jest.fn(() => ({}));
    (globalThis as any).document = { querySelector };
    saveMock.mockReset();
    clearMock.mockReset();
    loadMock.mockReset();
    loadMock.mockImplementation(() => ({ gameID: "g", clientID: "c" }));
    getConfigMock.mockReset();
    getConfigMock.mockImplementation(() => Promise.resolve({}));
    loadTerrainMapMock.mockReset();
    loadTerrainMapMock.mockImplementation(() => Promise.resolve({}));
    getCachedMapMock.mockReset();
    getCachedMapMock.mockImplementation(() => mapSourceMarker);
    WorkerClientMock.mockClear();
    analyticsMock.mockClear();
    otelWarnMock.mockClear();
    workerInitialize.mockReset();
    workerInitialize.mockImplementation(() => new Promise<void>(() => {}));
  });

  afterEach(() => {
    delete (globalThis as any).document;
    WorkerClientMock.mockImplementation(() => ({
      initialize: workerInitialize,
      cleanup: jest.fn(),
    }));
  });

  test("L1: the worker is built with the page's cached map source", async () => {
    const { onmessage } = join(multiplayerLobby());
    const start = startMessage("Public");
    onmessage(start);
    await flushPromises();
    expect(WorkerClientMock).toHaveBeenCalledTimes(1);
    expect(WorkerClientMock).toHaveBeenCalledWith(
      start.gameStartInfo,
      "c",
      mapSourceMarker,
    );
    expect(getCachedMapMock).toHaveBeenCalledWith("World", "Normal");
  });

  test("L2-control: a start failure while still joined asks for the popup (the spy below is not vacuous)", async () => {
    const worker = controlledWorker();
    const { onmessage } = join(multiplayerLobby());
    onmessage(startMessage("Public"));
    await flushPromises();
    worker.fail(new WorkerInitTimeoutError());
    await flushPromises();
    expect(errorModalQueries()).toBe(1);
    expect(workerFailureEvents()).toHaveLength(2);
  });

  test.each([
    ["a Timeout", () => new WorkerInitTimeoutError(), false],
    [
      "a Crash",
      () => new Error("Worker initialization failed: Failed to fetch"),
      false,
    ],
    ["cleanup() itself", () => undefined, true],
  ])(
    "L2: leaving during the start stops the worker first; %s failure afterwards is silent",
    async (_label, makeError, cleanupRejects) => {
      const worker = controlledWorker(cleanupRejects as boolean);
      const { onmessage, gameStop, onGameEnd } = join(multiplayerLobby());
      onmessage(startMessage("Public"));
      await flushPromises();
      expect(WorkerClientMock).toHaveBeenCalledTimes(1);

      gameStop();
      expect(worker.cleanup).toHaveBeenCalled();
      expect(worker.events[0]).toBe("cleanup");

      const error = (makeError as () => Error | undefined)();
      if (error !== undefined) worker.fail(error);
      await flushPromises();

      expect(workerFailureEvents()).toEqual([]);
      expect(otelWarnMock).not.toHaveBeenCalled();
      expect(errorModalQueries()).toBe(0);
      expect(clearMock).not.toHaveBeenCalled();
      expect(onGameEnd).toHaveBeenCalledTimes(1);
    },
  );

  test("L3: a lobby error during the start stops the worker; its later failure adds no telemetry and no second popup", async () => {
    const worker = controlledWorker();
    const { onmessage } = join(multiplayerLobby());
    onmessage(startMessage("Public"));
    await flushPromises();

    onmessage({ type: "error", error: "Kicked from game" });
    expect(worker.cleanup).toHaveBeenCalled();
    expect(worker.events[0]).toBe("cleanup");
    // The lobby error's own popup.
    expect(errorModalQueries()).toBe(1);

    worker.fail(new WorkerInitTimeoutError());
    await flushPromises();

    expect(workerFailureEvents()).toEqual([]);
    expect(otelWarnMock).not.toHaveBeenCalled();
    expect(errorModalQueries()).toBe(1);
  });

  test("L4: leaving before the config or map resolves never builds a worker", async () => {
    let resolveConfig: (value: unknown) => void = () => {};
    getConfigMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveConfig = resolve;
        }),
    );
    const { onmessage, gameStop, onGameEnd } = join(multiplayerLobby());
    onmessage(startMessage("Public"));
    await flushPromises();

    gameStop();
    resolveConfig({});
    await flushPromises();

    expect(WorkerClientMock).not.toHaveBeenCalled();
    expect(workerFailureEvents()).toEqual([]);
    expect(otelWarnMock).not.toHaveBeenCalled();
    expect(errorModalQueries()).toBe(0);
    expect(onGameEnd).toHaveBeenCalledTimes(1);
  });
});
