// Task 0228: Main.ts's join handler awaits server config, cosmetics and the
// Yandex id before it connects. Reproduced live (Slow 3G, real clicks): a leave
// in that gap was dropped and the join completed anyway, and a double-tapped
// Join connected twice. Main.ts now asks LobbyJoinSequence, right before it
// connects, whether its join is still the current one. These tests drive the
// real module in the same order Main.ts does: beginJoin() before the awaits,
// isCurrent() after them, connected() with joinLobby()'s stopper. Main.ts runs
// that through runJoin(), which also ends a join that threw before connecting
// (review R1).

import { LobbyJoinSequence } from "../../src/client/LobbyJoinSequence";

describe("LobbyJoinSequence (task 0228)", () => {
  test("a leave during setup cancels the join; its stopper is never stored", () => {
    const joins = new LobbyJoinSequence();
    const join = joins.beginJoin();
    expect(joins.isInLobbyOrJoining()).toBe(true);
    expect(joins.hasStopper()).toBe(false);

    expect(joins.leave()).toBe("cancelled-setup");

    // The awaits finish: Main.ts sees the join is stale and does not connect.
    expect(join.isCurrent()).toBe(false);
    expect(joins.isInLobbyOrJoining()).toBe(false);
    expect(joins.leave()).toBe("nothing");
  });

  test("two joins in setup: only the second connects", () => {
    const joins = new LobbyJoinSequence();
    const first = joins.beginJoin();
    const second = joins.beginJoin();

    // Both finish their awaits, first one first.
    expect(first.isCurrent()).toBe(false);
    expect(second.isCurrent()).toBe(true);
    const stopSecond = jest.fn();
    second.connected(stopSecond);

    expect(joins.currentStopper()).toBe(stopSecond);
    expect(stopSecond).not.toHaveBeenCalled();
  });

  test("a join over a connected one calls the old stopper once and clears it", () => {
    const joins = new LobbyJoinSequence();
    const stopOld = jest.fn();
    joins.beginJoin().connected(stopOld);

    const next = joins.beginJoin();

    expect(stopOld).toHaveBeenCalledTimes(1);
    expect(joins.hasStopper()).toBe(false);
    expect(next.isCurrent()).toBe(true);
    // A leave during the new join's setup cancels it, and never reaches the
    // old stopper again.
    expect(joins.leave()).toBe("cancelled-setup");
    expect(stopOld).toHaveBeenCalledTimes(1);
  });

  test("a leave after connect calls the stopper once; a second leave does nothing", () => {
    const joins = new LobbyJoinSequence();
    const stop = jest.fn();
    joins.beginJoin().connected(stop);
    expect(joins.isInLobbyOrJoining()).toBe(true);

    expect(joins.leave()).toBe("left");
    expect(joins.leave()).toBe("nothing");

    expect(stop).toHaveBeenCalledTimes(1);
    expect(joins.currentStopper()).toBeNull();
    expect(joins.isInLobbyOrJoining()).toBe(false);
  });

  test("leave, then a new join: the new ticket is current and connects", () => {
    const joins = new LobbyJoinSequence();
    const cancelled = joins.beginJoin();
    joins.leave();

    const next = joins.beginJoin();
    const stop = jest.fn();
    next.connected(stop);

    expect(cancelled.isCurrent()).toBe(false);
    expect(next.isCurrent()).toBe(true);
    expect(joins.currentStopper()).toBe(stop);
  });

  test("a stale ticket's connected() is ignored", () => {
    const joins = new LobbyJoinSequence();
    const stale = joins.beginJoin();
    const current = joins.beginJoin();
    const stopCurrent = jest.fn();
    current.connected(stopCurrent);

    const stopStale = jest.fn();
    stale.connected(stopStale);

    expect(joins.currentStopper()).toBe(stopCurrent);
    expect(joins.leave()).toBe("left");
    expect(stopCurrent).toHaveBeenCalledTimes(1);
    expect(stopStale).not.toHaveBeenCalled();
  });

  test("a stopper that starts a join while it runs is not called again", () => {
    const joins = new LobbyJoinSequence();
    let calls = 0;
    joins.beginJoin().connected(() => {
      calls++;
      joins.beginJoin();
    });

    expect(joins.leave()).toBe("left");
    expect(calls).toBe(1);
  });

  test("a join whose setup failed does not stay 'being set up'", () => {
    const joins = new LobbyJoinSequence();
    const failed = joins.beginJoin();

    failed.abandon();

    expect(joins.isInLobbyOrJoining()).toBe(false);
    expect(joins.leave()).toBe("nothing");
  });

  test("a stale ticket's abandon() does not touch the current join", () => {
    const joins = new LobbyJoinSequence();
    const stale = joins.beginJoin();
    joins.beginJoin();

    stale.abandon();

    expect(joins.isInLobbyOrJoining()).toBe(true);
    expect(joins.leave()).toBe("cancelled-setup");
  });
  describe("runJoin (review R1)", () => {
    test("the synchronous connect step throws after isCurrent(): the join does not stay 'being set up'; the error is passed on", async () => {
      const joins = new LobbyJoinSequence();
      // As joinLobby() -> startGame() parsing a corrupt localStorage record.
      const corrupt = new SyntaxError("Unexpected token in JSON");

      const run = joins.runJoin(async (join) => {
        await Promise.resolve(); // the setup awaits
        expect(join.isCurrent()).toBe(true);
        expect(joins.isInLobbyOrJoining()).toBe(true);
        throw corrupt; // before join.connected()
      });

      await expect(run).rejects.toBe(corrupt);
      expect(joins.isInLobbyOrJoining()).toBe(false);
      expect(joins.leave()).toBe("nothing");
    });

    test("a setup await rejects: same", async () => {
      const joins = new LobbyJoinSequence();
      const offline = new Error("config fetch failed");

      await expect(
        joins.runJoin(async () => {
          await Promise.reject(offline);
        }),
      ).rejects.toBe(offline);

      expect(joins.isInLobbyOrJoining()).toBe(false);
    });

    test("a connected join keeps its stopper when runJoin ends", async () => {
      const joins = new LobbyJoinSequence();
      const stop = jest.fn();

      await joins.runJoin(async (join) => {
        await Promise.resolve();
        join.connected(stop);
      });

      expect(joins.currentStopper()).toBe(stop);
      expect(stop).not.toHaveBeenCalled();
    });

    test("a stale join that throws does not touch the newer join still being set up", async () => {
      const joins = new LobbyJoinSequence();
      let finishFirstSetup: () => void = () => {};
      const firstSetup = new Promise<void>((resolve) => {
        finishFirstSetup = resolve;
      });
      const first = joins.runJoin(async () => {
        await firstSetup;
        throw new Error("first join failed late");
      });
      const second = joins.beginJoin();

      finishFirstSetup();
      await expect(first).rejects.toThrow("first join failed late");

      expect(second.isCurrent()).toBe(true);
      expect(joins.isInLobbyOrJoining()).toBe(true);
      expect(joins.leave()).toBe("cancelled-setup");
    });
  });
});
