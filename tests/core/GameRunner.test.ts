import { GameUpdates } from "../../src/core/game/Game";
import {
  ErrorUpdate,
  GameUpdateType,
  GameUpdateViewData,
} from "../../src/core/game/GameUpdates";
import { GameRunner } from "../../src/core/GameRunner";

// Task 0232: the runner's tick-fault path. Only executeNextTick() is under
// test, so the game and executor are the thinnest stubs that path touches.
function makeRunner(executeNextTick: () => GameUpdates) {
  const game = {
    addExecution: jest.fn(),
    executeNextTick: jest.fn(executeNextTick),
    inSpawnPhase: () => false,
    ticks: () => 5,
    players: () => [],
  };
  const executor = { createExecs: () => [] };
  const callback = jest.fn<void, [GameUpdateViewData | ErrorUpdate]>();
  const runner = new GameRunner(game as never, executor as never, [], callback);
  runner.addTurn({ turnNumber: 0, intents: [] });
  return { game, runner, callback };
}

describe("GameRunner.executeNextTick tick faults (task 0232)", () => {
  let consoleError: jest.SpyInstance;

  beforeEach(() => {
    consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  test("an Error thrown by the tick is reported as an ErrorUpdate", () => {
    const { runner, callback } = makeRunner(() => {
      throw new Error("boom");
    });

    runner.executeNextTick();

    expect(callback).toHaveBeenCalledTimes(1);
    const update = callback.mock.calls[0][0] as ErrorUpdate;
    expect(update.errMsg).toBe("boom");
    expect(update.stack).toContain("boom");
  });

  test("a non-Error throw is reported too, with no stack", () => {
    const { runner, callback } = makeRunner(() => {
      throw "bad";
    });

    runner.executeNextTick();

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback.mock.calls[0][0]).toEqual({
      errMsg: "bad",
      stack: undefined,
    });
  });

  test("a throw that String() cannot coerce is still reported (review R1)", () => {
    const { runner, callback } = makeRunner(() => {
      throw Object.create(null);
    });

    expect(() => runner.executeNextTick()).not.toThrow();

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback.mock.calls[0][0]).toEqual({
      errMsg: "non-coercible throw",
      stack: undefined,
    });
  });

  test("after a fault the runner stays latched: no further ticks, no second report", () => {
    const { game, runner, callback } = makeRunner(() => {
      throw new Error("boom");
    });

    runner.executeNextTick();
    runner.addTurn({ turnNumber: 1, intents: [] });
    runner.executeNextTick();

    expect(game.executeNextTick).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  test("control: a normal tick delivers view data", () => {
    const updates = { [GameUpdateType.Tile]: [] } as unknown as GameUpdates;
    const { runner, callback } = makeRunner(() => updates);

    runner.executeNextTick();

    expect(callback).toHaveBeenCalledTimes(1);
    const update = callback.mock.calls[0][0] as GameUpdateViewData;
    expect(update.tick).toBe(5);
    expect(update.updates).toBe(updates);
    expect(update.packedTileUpdates).toBeInstanceOf(BigUint64Array);
  });
});
