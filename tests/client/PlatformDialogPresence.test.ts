import {
  beginPlatformDialog,
  isPlatformDialogOpen,
  resetPlatformDialogPresenceForTests,
  whenNoPlatformDialogOpen,
} from "../../src/client/PlatformDialogPresence";

// Task 0404: a Yandex payment or login dialog in progress defers the forced
// "please refresh" popup.
describe("PlatformDialogPresence", () => {
  beforeEach(() => {
    resetPlatformDialogPresenceForTests();
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

  it("reads closed with no dialog started", async () => {
    expect(isPlatformDialogOpen()).toBe(false);
    expect(await isSettled(whenNoPlatformDialogOpen())).toBe(true);
  });

  it("reads open between begin and end", () => {
    const end = beginPlatformDialog();
    expect(isPlatformDialogOpen()).toBe(true);
    end();
    expect(isPlatformDialogOpen()).toBe(false);
  });

  it("counts dialogs: open until the last one ends", () => {
    const endFirst = beginPlatformDialog();
    const endSecond = beginPlatformDialog();
    endFirst();
    expect(isPlatformDialogOpen()).toBe(true);
    endSecond();
    expect(isPlatformDialogOpen()).toBe(false);
  });

  it("the end function is safe to call more than once", () => {
    const endFirst = beginPlatformDialog();
    const endSecond = beginPlatformDialog();
    endFirst();
    endFirst();
    expect(isPlatformDialogOpen()).toBe(true);
    endSecond();
    expect(isPlatformDialogOpen()).toBe(false);
  });

  it("waiters wake only when the count reaches 0", async () => {
    const endFirst = beginPlatformDialog();
    const endSecond = beginPlatformDialog();
    const waiting = whenNoPlatformDialogOpen();
    expect(await isSettled(waiting)).toBe(false);
    endFirst();
    expect(await isSettled(waiting)).toBe(false);
    endSecond();
    expect(await isSettled(waiting)).toBe(true);
  });

  it("a waiter woken while a new dialog has opened keeps waiting", async () => {
    const endFirst = beginPlatformDialog();
    const waiting = whenNoPlatformDialogOpen();
    endFirst();
    const endSecond = beginPlatformDialog();
    expect(await isSettled(waiting)).toBe(false);
    endSecond();
    expect(await isSettled(waiting)).toBe(true);
  });

  it("reset clears the count and the waiters", async () => {
    beginPlatformDialog();
    resetPlatformDialogPresenceForTests();
    expect(isPlatformDialogOpen()).toBe(false);
    expect(await isSettled(whenNoPlatformDialogOpen())).toBe(true);
  });
});
