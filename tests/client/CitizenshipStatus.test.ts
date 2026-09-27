// Task 0302: the page's one citizenship answer for perk locks. Anything but a
// confirmed citizen must read as locked (owner ruling 2026-09-27, Q2).

import {
  deriveCitizenshipStatus,
  getCitizenshipStatus,
  publishCitizenshipStatus,
  resetCitizenshipStatusForTests,
  subscribeCitizenshipStatus,
} from "../../src/client/CitizenshipStatus";
import type { PlayerProfileView } from "../../src/client/PlayerProfileView";

function profile(over: Partial<PlayerProfileView> = {}): PlayerProfileView {
  return {
    displayName: "player",
    xp: 0,
    isCitizen: false,
    isAuthoritative: true,
    nameChange: null,
    ...over,
  };
}

describe("deriveCitizenshipStatus", () => {
  it.each([
    ["guest (null profile)", null, false, "not_citizen"],
    ["guest even with a confirmed grant", null, true, "not_citizen"],
    ["authoritative non-citizen", profile(), false, "not_citizen"],
    ["authoritative citizen", profile({ isCitizen: true }), false, "citizen"],
    [
      "NON-authoritative read claiming citizen (never trusted)",
      profile({ isCitizen: true, isAuthoritative: false }),
      false,
      "not_citizen",
    ],
    [
      "unreadable profile (zero-state)",
      profile({ isAuthoritative: false }),
      false,
      "not_citizen",
    ],
    [
      "server-confirmed paid grant, stale non-citizen read",
      profile(),
      true,
      "citizen",
    ],
    [
      "server-confirmed paid grant, unreadable profile",
      profile({ isAuthoritative: false }),
      true,
      "citizen",
    ],
  ] as const)("%s → %s", (_label, view, paid, expected) => {
    expect(deriveCitizenshipStatus(view, paid)).toBe(expected);
  });
});

describe("citizenship status store", () => {
  beforeEach(() => {
    resetCitizenshipStatusForTests();
  });

  it("starts unknown", () => {
    expect(getCitizenshipStatus()).toBe("unknown");
  });

  it("publishes and notifies subscribers", () => {
    const listener = jest.fn();
    subscribeCitizenshipStatus(listener);

    publishCitizenshipStatus("not_citizen");
    publishCitizenshipStatus("citizen");

    expect(getCitizenshipStatus()).toBe("citizen");
    expect(listener.mock.calls).toEqual([["not_citizen"], ["citizen"]]);
  });

  it("does not notify when the status is unchanged", () => {
    const listener = jest.fn();
    publishCitizenshipStatus("citizen");
    subscribeCitizenshipStatus(listener);

    publishCitizenshipStatus("citizen");

    expect(listener).not.toHaveBeenCalled();
  });

  it("stops notifying after unsubscribe", () => {
    const listener = jest.fn();
    const unsubscribe = subscribeCitizenshipStatus(listener);
    unsubscribe();

    publishCitizenshipStatus("citizen");

    expect(listener).not.toHaveBeenCalled();
  });
});
