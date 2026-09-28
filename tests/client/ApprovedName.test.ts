// Task 0321: the page's one answer to "does this player have an approved
// name?", published by the citizenship card and read by the name box.

import {
  getApprovedName,
  publishApprovedName,
  resetApprovedNameForTests,
  subscribeApprovedName,
} from "../../src/client/ApprovedName";

describe("approved name store", () => {
  beforeEach(() => {
    resetApprovedNameForTests();
  });

  it("starts unknown", () => {
    expect(getApprovedName()).toEqual({ kind: "unknown" });
  });

  it("publishes and notifies subscribers", () => {
    const listener = jest.fn();
    subscribeApprovedName(listener);

    publishApprovedName({ kind: "none" });
    publishApprovedName({ kind: "approved", name: "Commander" });
    publishApprovedName({ kind: "approved", name: "General" });

    expect(getApprovedName()).toEqual({ kind: "approved", name: "General" });
    expect(listener.mock.calls).toEqual([
      [{ kind: "none" }],
      [{ kind: "approved", name: "Commander" }],
      [{ kind: "approved", name: "General" }],
    ]);
  });

  it("does not notify when the state is unchanged (same kind and name)", () => {
    const listener = jest.fn();
    publishApprovedName({ kind: "approved", name: "Commander" });
    publishApprovedName({ kind: "none" });
    subscribeApprovedName(listener);

    publishApprovedName({ kind: "none" });
    expect(listener).not.toHaveBeenCalled();

    publishApprovedName({ kind: "approved", name: "Commander" });
    publishApprovedName({ kind: "approved", name: "Commander" });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("does not call the listener on subscribe", () => {
    publishApprovedName({ kind: "approved", name: "Commander" });
    const listener = jest.fn();
    subscribeApprovedName(listener);
    expect(listener).not.toHaveBeenCalled();
  });

  it("stops notifying after unsubscribe", () => {
    const listener = jest.fn();
    const unsubscribe = subscribeApprovedName(listener);
    unsubscribe();

    publishApprovedName({ kind: "approved", name: "Commander" });

    expect(listener).not.toHaveBeenCalled();
  });

  it("reset returns to unknown and drops listeners", () => {
    const listener = jest.fn();
    subscribeApprovedName(listener);
    publishApprovedName({ kind: "none" });
    resetApprovedNameForTests();

    expect(getApprovedName()).toEqual({ kind: "unknown" });
    publishApprovedName({ kind: "approved", name: "Commander" });
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
