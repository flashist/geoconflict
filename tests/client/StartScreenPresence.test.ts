import {
  beginJoiningLobby,
  reportBackOnStartScreen,
  resetStartScreenPresenceForTests,
  setStartScreenPresenceSource,
  whenOnStartScreen,
} from "../../src/client/StartScreenPresence";

// Task 0329, review R1: start-screen UI waits out a lobby or match.
describe("StartScreenPresence", () => {
  beforeEach(() => {
    resetStartScreenPresenceForTests();
  });

  async function isSettled(promise: Promise<void>): Promise<boolean> {
    let settled = false;
    void promise.then(() => {
      settled = true;
    });
    for (let i = 0; i < 5; i++) {
      await Promise.resolve();
    }
    return settled;
  }

  it("resolves at once when no source is registered (the behavior before R1)", async () => {
    expect(await isSettled(whenOnStartScreen())).toBe(true);
  });

  it("resolves at once when the player is on the start screen", async () => {
    setStartScreenPresenceSource(() => false);
    expect(await isSettled(whenOnStartScreen())).toBe(true);
  });

  it("waits while away and resolves on the return to the start screen", async () => {
    let away = true;
    setStartScreenPresenceSource(() => away);
    const waiting = whenOnStartScreen();
    expect(await isSettled(waiting)).toBe(false);

    away = false;
    reportBackOnStartScreen();
    expect(await isSettled(waiting)).toBe(true);
  });

  it("keeps waiting when woken while still away", async () => {
    let away = true;
    setStartScreenPresenceSource(() => away);
    const waiting = whenOnStartScreen();

    reportBackOnStartScreen(); // still away: e.g. re-joined before the wake ran
    expect(await isSettled(waiting)).toBe(false);

    away = false;
    reportBackOnStartScreen();
    expect(await isSettled(waiting)).toBe(true);
  });

  it("wakes every waiter", async () => {
    let away = true;
    setStartScreenPresenceSource(() => away);
    const first = whenOnStartScreen();
    const second = whenOnStartScreen();

    away = false;
    reportBackOnStartScreen();
    expect(await isSettled(first)).toBe(true);
    expect(await isSettled(second)).toBe(true);
  });

  // Task 0336: Main.handleJoinLobby awaits server config, cosmetics and the
  // Yandex id before it sets gameStop. The join counts as away from its first
  // line, and a join that fails before gameStop is set wakes the waiters.
  describe("a join being set up (task 0336)", () => {
    it("P1. waits while a join is being set up, though the source reads 'on the start screen'", async () => {
      setStartScreenPresenceSource(() => false);
      beginJoiningLobby();

      expect(await isSettled(whenOnStartScreen())).toBe(false);
    });

    it("P2. a join that succeeds (source now away) keeps waiting; the later leave resolves it", async () => {
      let away = false;
      setStartScreenPresenceSource(() => away);
      const endJoining = beginJoiningLobby();
      const waiting = whenOnStartScreen();

      away = true; // gameStop set
      endJoining();
      expect(await isSettled(waiting)).toBe(false);

      away = false; // left the lobby
      reportBackOnStartScreen();
      expect(await isSettled(waiting)).toBe(true);
    });

    it("P3. a join that fails (source still on the start screen) wakes the waiters — no hang", async () => {
      setStartScreenPresenceSource(() => false);
      const endJoining = beginJoiningLobby();
      const waiting = whenOnStartScreen();
      expect(await isSettled(waiting)).toBe(false);

      endJoining();
      expect(await isSettled(waiting)).toBe(true);
    });

    it("P4. two overlapping joins: ending one still waits; ending both resolves", async () => {
      setStartScreenPresenceSource(() => false);
      const endFirst = beginJoiningLobby();
      const endSecond = beginJoiningLobby();
      const waiting = whenOnStartScreen();

      endFirst();
      expect(await isSettled(waiting)).toBe(false);

      endSecond();
      expect(await isSettled(waiting)).toBe(true);
    });

    it("P5. ending the same join twice does not under-count", async () => {
      setStartScreenPresenceSource(() => false);
      const endFirst = beginJoiningLobby();
      beginJoiningLobby();

      endFirst();
      endFirst();
      expect(await isSettled(whenOnStartScreen())).toBe(false);
    });

    it("P6. the test reset clears joins still being set up", async () => {
      beginJoiningLobby();
      resetStartScreenPresenceForTests();

      expect(await isSettled(whenOnStartScreen())).toBe(true);
    });
  });
});
