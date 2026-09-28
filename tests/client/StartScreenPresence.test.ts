import {
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
});
