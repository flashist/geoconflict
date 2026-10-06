// Task 0302: the page's one citizenship answer for perk locks. Anything but a
// confirmed citizen must read as locked (owner ruling 2026-09-27, Q2).

import {
  deriveCitizenshipStatus,
  derivePaidCitizenship,
  deriveProfileVerificationStatus,
  getCitizenshipStatus,
  getProfileVerificationStatus,
  isCurrentPlayerPaidCitizen,
  publishCitizenshipStatus,
  publishPaidCitizenship,
  publishProfileVerificationStatus,
  resetCitizenshipStatusForTests,
  subscribeCitizenshipStatus,
  subscribeProfileVerificationStatus,
} from "../../src/client/CitizenshipStatus";
import type { PlayerProfileView } from "../../src/client/PlayerProfileView";

function profile(over: Partial<PlayerProfileView> = {}): PlayerProfileView {
  return {
    displayName: "player",
    xp: 0,
    isCitizen: false,
    isAuthoritative: true,
    nameChange: null,
    approvedName: null,
    isPaidCitizen: false,
    isVerifiedRead: false,
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

// Task 0248: the page's one paid-citizen answer, read by the interstitial-ad
// gate. Only a verified (authoritative) paid read is paid; false also means
// "unknown", which the ad gate treats as "show the ad".
describe("derivePaidCitizenship", () => {
  it.each([
    ["guest (null profile)", null, false],
    [
      "NON-authoritative read claiming paid (never trusted)",
      profile({ isAuthoritative: false, isPaidCitizen: true }),
      false,
    ],
    ["authoritative, not paid", profile(), false],
    [
      "authoritative earned-only citizen",
      profile({ isCitizen: true, isPaidCitizen: false }),
      false,
    ],
    [
      "authoritative paid citizen",
      profile({ isCitizen: true, isPaidCitizen: true }),
      true,
    ],
  ] as const)("%s → %s", (_label, view, expected) => {
    expect(derivePaidCitizenship(view)).toBe(expected);
  });

  it("is false when the field is left out (older path or test stub)", () => {
    const view = profile({ isCitizen: true }) as Partial<PlayerProfileView>;
    delete view.isPaidCitizen;
    expect(derivePaidCitizenship(view as PlayerProfileView)).toBe(false);
  });
});

describe("paid citizenship store", () => {
  beforeEach(() => {
    resetCitizenshipStatusForTests();
  });

  it("starts false (unknown reads as not paid)", () => {
    expect(isCurrentPlayerPaidCitizen()).toBe(false);
  });

  it("round-trips a published value in both directions", () => {
    publishPaidCitizenship(true);
    expect(isCurrentPlayerPaidCitizen()).toBe(true);

    publishPaidCitizenship(false);
    expect(isCurrentPlayerPaidCitizen()).toBe(false);
  });

  it("is reset to false by the test reset", () => {
    publishPaidCitizenship(true);

    resetCitizenshipStatusForTests();

    expect(isCurrentPlayerPaidCitizen()).toBe(false);
  });
});

// Task 0397: what the last read said about THIS session — display-only.
describe("deriveProfileVerificationStatus", () => {
  it.each([
    ["guest (null profile)", null, "guest"],
    [
      "zero-state (failed read)",
      profile({ isAuthoritative: false }),
      "read_failed",
    ],
    [
      "NON-authoritative read claiming verified (never trusted)",
      profile({ isAuthoritative: false, isVerifiedRead: true }),
      "read_failed",
    ],
    ["authoritative, unverified view", profile(), "unverified"],
    [
      "authoritative unverified citizen",
      profile({ isCitizen: true }),
      "unverified",
    ],
    [
      "verified owner view, not paid",
      profile({ isVerifiedRead: true }),
      "verified",
    ],
    [
      "verified owner view, paid",
      profile({ isCitizen: true, isPaidCitizen: true, isVerifiedRead: true }),
      "verified",
    ],
  ] as const)("%s → %s", (_label, view, expected) => {
    expect(deriveProfileVerificationStatus(view)).toBe(expected);
  });

  it("is unverified when the field is left out (older path or test stub)", () => {
    const view = profile({ isCitizen: true }) as Partial<PlayerProfileView>;
    delete view.isVerifiedRead;
    expect(deriveProfileVerificationStatus(view as PlayerProfileView)).toBe(
      "unverified",
    );
  });

  it("never derives unknown", () => {
    const derived = [
      null,
      profile(),
      profile({ isAuthoritative: false }),
      profile({ isVerifiedRead: true }),
    ].map(deriveProfileVerificationStatus);
    expect(derived).not.toContain("unknown");
  });
});

describe("profile verification status store", () => {
  beforeEach(() => {
    resetCitizenshipStatusForTests();
  });

  it("starts unknown", () => {
    expect(getProfileVerificationStatus()).toBe("unknown");
  });

  it("publishes and notifies subscribers, deduped", () => {
    const listener = jest.fn();
    subscribeProfileVerificationStatus(listener);

    publishProfileVerificationStatus("guest");
    publishProfileVerificationStatus("guest");
    publishProfileVerificationStatus("verified");

    expect(getProfileVerificationStatus()).toBe("verified");
    expect(listener.mock.calls).toEqual([["guest"], ["verified"]]);
  });

  it("is not called on subscribe, and stops after unsubscribe", () => {
    publishProfileVerificationStatus("unverified");
    const listener = jest.fn();
    const unsubscribe = subscribeProfileVerificationStatus(listener);
    expect(listener).not.toHaveBeenCalled();
    unsubscribe();

    publishProfileVerificationStatus("read_failed");

    expect(listener).not.toHaveBeenCalled();
  });

  it("is reset to unknown, with no listeners, by the test reset", () => {
    const listener = jest.fn();
    subscribeProfileVerificationStatus(listener);
    publishProfileVerificationStatus("verified");

    resetCitizenshipStatusForTests();
    publishProfileVerificationStatus("guest");

    expect(listener).toHaveBeenCalledTimes(1);
    resetCitizenshipStatusForTests();
    expect(getProfileVerificationStatus()).toBe("unknown");
  });
});

// Task 0397 regression pins: the verified marker changes none of the existing
// answers — the 0248 ad gate and the 3-value perk status stay as they were.
describe("isVerifiedRead leaves the existing answers alone (task 0397)", () => {
  it.each([
    ["unverified, not paid", profile()],
    ["verified, not paid", profile({ isVerifiedRead: true })],
    [
      "unverified citizen claiming paid",
      profile({ isCitizen: true, isPaidCitizen: true }),
    ],
    [
      "verified paid citizen",
      profile({ isCitizen: true, isPaidCitizen: true, isVerifiedRead: true }),
    ],
    [
      "failed read marked verified",
      profile({ isAuthoritative: false, isVerifiedRead: true }),
    ],
  ] as const)("%s", (_label, view) => {
    const withoutMarker = { ...view, isVerifiedRead: !view.isVerifiedRead };
    expect(derivePaidCitizenship(view)).toBe(
      derivePaidCitizenship(withoutMarker),
    );
    for (const paid of [false, true]) {
      expect(deriveCitizenshipStatus(view, paid)).toBe(
        deriveCitizenshipStatus(withoutMarker, paid),
      );
    }
  });
});
