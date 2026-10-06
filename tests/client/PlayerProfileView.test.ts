/**
 * @jest-environment jsdom
 */
jest.mock("../../src/client/flashist/FlashistFacade", () => ({
  FlashistFacade: {
    instance: {
      isYandexAuthorized: jest.fn(),
      getCurPlayerName: jest.fn(),
      getYandexUniqueId: jest.fn(),
    },
  },
  flashist_logEventAnalytics: jest.fn(),
  flashistConstants: {
    analyticEvents: {
      CITIZENSHIP_EARNED_XP: "Citizenship:Earned:XP",
      PROFILE_LOGIN_SUCCEEDED: "Profile:Login:Succeeded",
      PROFILE_LOGIN_CREATED: "Profile:Login:Created",
      PROFILE_LOGIN_FAILED_TIMEOUT: "Profile:Login:Failed:Timeout",
      PROFILE_LOGIN_FAILED_UNAVAILABLE: "Profile:Login:Failed:Unavailable",
      PROFILE_LOGIN_FAILED_ERROR: "Profile:Login:Failed:Error",
      PROFILE_SESSION_RELOGIN: "Profile:Session:Relogin",
    },
  },
}));

jest.mock("../../src/core/configuration/ConfigLoader", () => ({
  getServerConfigFromClient: jest.fn(),
}));

import { getServerConfigFromClient } from "../../src/core/configuration/ConfigLoader";
import {
  FlashistFacade,
  flashist_logEventAnalytics,
} from "../../src/client/flashist/FlashistFacade";
import {
  EARNED_AT_STORAGE_KEY_PREFIX,
  loadPlayerProfileView,
  reportEarnedCitizenshipTransition,
} from "../../src/client/PlayerProfileView";
import { EXPECTED_BEARER, primeProfileSession } from "./support/profileSession";

const isYandexAuthorized = FlashistFacade.instance
  .isYandexAuthorized as jest.Mock;
const logEventAnalytics = flashist_logEventAnalytics as jest.Mock;
const getCurPlayerName = FlashistFacade.instance.getCurPlayerName as jest.Mock;
const getYandexUniqueId = FlashistFacade.instance
  .getYandexUniqueId as jest.Mock;
const getServerConfig = getServerConfigFromClient as jest.Mock;

const PROFILE_API_BASE = "https://api.example.test";
const YANDEX_NAME = "Игрок_7734";

/** A valid public projection (the shape GET /v1/profile returns). */
function publicProfile(overrides: Record<string, unknown> = {}) {
  return {
    schema_version: 1,
    xp: 250,
    is_citizen: false,
    citizenship_earned_at: null,
    display_name: "Commander",
    created_at: "2026-06-13T10:00:00.000Z",
    updated_at: "2026-06-13T12:00:00.000Z",
    ...overrides,
  };
}

/**
 * The verified OWNER view (task 0250 S3b): true values, both paid keys always
 * present. The server sends these keys in no other view.
 */
function ownerProfile(overrides: Record<string, unknown> = {}) {
  return publicProfile({
    is_paid_citizen: false,
    citizenship_purchased_at: null,
    ...overrides,
  });
}

/** Install a global fetch stub that resolves to the given status + body. */
function stubFetch(status: number, body: unknown): jest.Mock {
  const fetchMock = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

const ZERO_STATE = {
  displayName: YANDEX_NAME,
  xp: 0,
  isCitizen: false,
  // Zero-state fallbacks are never authoritative (0018 review R1).
  isAuthoritative: false,
  // A non-authoritative read knows nothing about name-change requests (0067).
  nameChange: null,
  // ...nor about an approved name (0321): null never means "none" here.
  approvedName: null,
  // Fail-closed for entitlement (0250 S3b, ADR-116 Decision 4).
  isPaidCitizen: false,
};

describe("loadPlayerProfileView", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    localStorage.clear();
    getServerConfig.mockResolvedValue({
      profileApiUrl: () => PROFILE_API_BASE,
    });
    getYandexUniqueId.mockResolvedValue("yandex-123");
    getCurPlayerName.mockResolvedValue(YANDEX_NAME);
    // S4: the profile read now goes out with a Bearer token. Individual tests
    // below override the authorization state after the session is primed.
    isYandexAuthorized.mockResolvedValue(true);
    await primeProfileSession();
    logEventAnalytics.mockClear();
  });

  afterEach(() => {
    delete (global as { fetch?: unknown }).fetch;
  });

  it("returns null for guests and never fetches", async () => {
    isYandexAuthorized.mockResolvedValue(false);
    const fetchMock = stubFetch(200, publicProfile());

    await expect(loadPlayerProfileView()).resolves.toBeNull();
    expect(getCurPlayerName).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("maps real xp / citizenship / display name from a 200 profile", async () => {
    isYandexAuthorized.mockResolvedValue(true);
    const fetchMock = stubFetch(
      200,
      publicProfile({ xp: 1200, is_citizen: true, display_name: "Генерал" }),
    );

    await expect(loadPlayerProfileView()).resolves.toEqual({
      displayName: "Генерал",
      xp: 1200,
      isCitizen: true,
      isAuthoritative: true,
      nameChange: null,
      approvedName: "Генерал",
      isPaidCitizen: false,
    });
    // The Yandex id is gone from the URL; the Bearer token carries the identity.
    expect(fetchMock).toHaveBeenCalledWith(
      `${PROFILE_API_BASE}/v1/profile`,
      expect.objectContaining({
        signal: expect.anything(),
        headers: expect.objectContaining({ Authorization: EXPECTED_BEARER }),
      }),
    );
  });

  it("falls back to the Yandex name when the profile display_name is null", async () => {
    isYandexAuthorized.mockResolvedValue(true);
    stubFetch(200, publicProfile({ display_name: null, xp: 40 }));

    await expect(loadPlayerProfileView()).resolves.toEqual({
      displayName: YANDEX_NAME,
      xp: 40,
      isCitizen: false,
      isAuthoritative: true,
      nameChange: null,
      // The card falls back to the Yandex name; the approved name does not
      // (task 0321), so the name box never locks to a platform name.
      approvedName: null,
      isPaidCitizen: false,
    });
  });

  // Task 0321 — the approved name is the raw display_name, never the fallback.
  it("carries display_name as approvedName, and null when there is none", async () => {
    isYandexAuthorized.mockResolvedValue(true);
    stubFetch(200, publicProfile({ display_name: "Commander" }));
    const named = await loadPlayerProfileView();
    expect(named!.approvedName).toBe("Commander");
    expect(named!.displayName).toBe("Commander");

    stubFetch(200, publicProfile({ display_name: null }));
    const unnamed = await loadPlayerProfileView();
    expect(unnamed!.approvedName).toBeNull();
    expect(unnamed!.displayName).toBe(YANDEX_NAME);
    expect(unnamed!.isAuthoritative).toBe(true);
  });

  // Task 0067 — the name-change state rides the public profile projection.
  it("carries the name_change state through when the server sends one", async () => {
    isYandexAuthorized.mockResolvedValue(true);
    stubFetch(
      200,
      publicProfile({
        is_citizen: true,
        name_change: {
          status: "pending",
          requested_name: "NewName",
          decided_at: null,
        },
      }),
    );

    const view = await loadPlayerProfileView();
    expect(view!.nameChange).toEqual({
      status: "pending",
      requested_name: "NewName",
      decided_at: null,
    });
  });

  // The field is .optional() precisely so a client build can outlive a server
  // that does not send it yet (InboxContract review R3 — separate deploys).
  it("parses a profile from a server that does not send name_change at all", async () => {
    isYandexAuthorized.mockResolvedValue(true);
    stubFetch(200, publicProfile({ xp: 5 }));

    const view = await loadPlayerProfileView();
    expect(view!.nameChange).toBeNull();
    expect(view!.isAuthoritative).toBe(true);
  });

  it("degrades to the zero-state when name_change is malformed", async () => {
    isYandexAuthorized.mockResolvedValue(true);
    stubFetch(200, publicProfile({ name_change: { status: "not-a-status" } }));

    await expect(loadPlayerProfileView()).resolves.toEqual(ZERO_STATE);
  });

  it("returns the logged-in zero-state on 404 (never null)", async () => {
    isYandexAuthorized.mockResolvedValue(true);
    stubFetch(404, { error: "not_found" });

    await expect(loadPlayerProfileView()).resolves.toEqual(ZERO_STATE);
  });

  it("returns the zero-state on a non-200 (e.g. 429 / 500)", async () => {
    isYandexAuthorized.mockResolvedValue(true);
    stubFetch(429, { error: "rate_limited" });

    await expect(loadPlayerProfileView()).resolves.toEqual(ZERO_STATE);
  });

  it("returns the zero-state on a network error", async () => {
    isYandexAuthorized.mockResolvedValue(true);
    global.fetch = jest
      .fn()
      .mockRejectedValue(new Error("network down")) as unknown as typeof fetch;

    await expect(loadPlayerProfileView()).resolves.toEqual(ZERO_STATE);
  });

  it("returns the zero-state when the fetch aborts (timeout)", async () => {
    isYandexAuthorized.mockResolvedValue(true);
    global.fetch = jest
      .fn()
      .mockRejectedValue(
        new DOMException("aborted", "AbortError"),
      ) as unknown as typeof fetch;

    await expect(loadPlayerProfileView()).resolves.toEqual(ZERO_STATE);
  });

  it("returns the zero-state when the body fails schema validation", async () => {
    isYandexAuthorized.mockResolvedValue(true);
    stubFetch(200, { xp: "lots", not: "a profile" });

    await expect(loadPlayerProfileView()).resolves.toEqual(ZERO_STATE);
  });

  it("skips the fetch when profileApiUrl is empty (e.g. local dev)", async () => {
    isYandexAuthorized.mockResolvedValue(true);
    getServerConfig.mockResolvedValue({ profileApiUrl: () => "" });
    const fetchMock = stubFetch(200, publicProfile());

    await expect(loadPlayerProfileView()).resolves.toEqual(ZERO_STATE);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("skips the fetch when there is no Yandex id", async () => {
    isYandexAuthorized.mockResolvedValue(true);
    getYandexUniqueId.mockResolvedValue(null);
    const fetchMock = stubFetch(200, publicProfile());

    await expect(loadPlayerProfileView()).resolves.toEqual(ZERO_STATE);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns the zero-state (never throws, never null) when the config read rejects", async () => {
    isYandexAuthorized.mockResolvedValue(true);
    getServerConfig.mockRejectedValue(new Error("/api/env down"));
    const fetchMock = stubFetch(200, publicProfile());

    await expect(loadPlayerProfileView()).resolves.toEqual(ZERO_STATE);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("falls back to an empty name when the name lookup fails", async () => {
    isYandexAuthorized.mockResolvedValue(true);
    getCurPlayerName.mockRejectedValue(new Error("sdk failure"));
    stubFetch(404, { error: "not_found" });

    await expect(loadPlayerProfileView()).resolves.toEqual({
      displayName: "",
      xp: 0,
      isCitizen: false,
      isAuthoritative: false,
      nameChange: null,
      approvedName: null,
      isPaidCitizen: false,
    });
  });

  // Task 0250 S3b — `isPaidCitizen` is true ONLY for a verified owner view that
  // says paid. Fail-closed everywhere else (ADR-116 Decision 4).
  describe("isPaidCitizen", () => {
    it("is true for an owner view with is_paid_citizen: true", async () => {
      stubFetch(
        200,
        ownerProfile({
          xp: 30,
          is_citizen: true,
          is_paid_citizen: true,
          citizenship_purchased_at: "2026-06-24T11:00:00.000Z",
        }),
      );
      await expect(loadPlayerProfileView()).resolves.toEqual({
        displayName: "Commander",
        // The owner view's TRUE xp, not the equalized 100.
        xp: 30,
        isCitizen: true,
        isAuthoritative: true,
        nameChange: null,
        approvedName: "Commander",
        isPaidCitizen: true,
      });
    });

    it("is false for an owner view of a non-payer", async () => {
      stubFetch(200, ownerProfile({ xp: 1200, is_citizen: true }));
      const view = await loadPlayerProfileView();
      expect(view!.isPaidCitizen).toBe(false);
      expect(view!.isAuthoritative).toBe(true);
    });

    it("is false for an unverified (S1) view of a citizen, which carries no paid keys", async () => {
      stubFetch(200, publicProfile({ xp: 100, is_citizen: true }));
      const view = await loadPlayerProfileView();
      expect(view!.isPaidCitizen).toBe(false);
      expect(view!.isCitizen).toBe(true);
    });

    it("is false for a body from an older server, even if it somehow names a purchase date only", async () => {
      // No `is_paid_citizen` key ⇒ not an owner view, whatever else is there.
      stubFetch(
        200,
        publicProfile({
          is_citizen: true,
          citizenship_purchased_at: "2026-06-24T11:00:00.000Z",
        }),
      );
      const view = await loadPlayerProfileView();
      expect(view!.isPaidCitizen).toBe(false);
    });

    it("degrades to the zero-state (false) when a paid key has the wrong type", async () => {
      stubFetch(200, ownerProfile({ is_paid_citizen: "yes" }));
      await expect(loadPlayerProfileView()).resolves.toEqual(ZERO_STATE);
      stubFetch(200, ownerProfile({ citizenship_purchased_at: "not-a-date" }));
      await expect(loadPlayerProfileView()).resolves.toEqual(ZERO_STATE);
    });

    it("is false on every zero-state path", async () => {
      stubFetch(404, { error: "not_found" });
      expect((await loadPlayerProfileView())!.isPaidCitizen).toBe(false);
      stubFetch(500, ownerProfile({ is_paid_citizen: true }));
      expect((await loadPlayerProfileView())!.isPaidCitizen).toBe(false);
      getYandexUniqueId.mockResolvedValue(null);
      stubFetch(200, ownerProfile({ is_paid_citizen: true }));
      expect((await loadPlayerProfileView())!.isPaidCitizen).toBe(false);
    });
  });
});

// Task 0017 / 0021 §6 — Citizenship:Earned:XP fires when the server profile
// first shows citizenship_earned_at after a previous observation without it.
//
// Task 0250 S1 (owner ruling D4): an unverified read carries
// `citizenship_earned_at: null` for every player, so it never runs detection.
// Task 0250 S3b: a verified OWNER view does, under the fresh `_v2` prefix, and
// it now knows the paid facts — a payer who later crosses 100 is not "earned".
describe("Citizenship:Earned:XP transition detection", () => {
  const EARNED_AT = "2026-08-23T10:00:00.000Z";
  const OLD_PREFIX = "geoconflict_citizenship_earned_at:";
  const earnedAtKeys = () =>
    Object.keys(localStorage).filter((key) =>
      key.startsWith("geoconflict_citizenship_earned_at"),
    );

  beforeEach(async () => {
    jest.clearAllMocks();
    localStorage.clear();
    getServerConfig.mockResolvedValue({
      profileApiUrl: () => PROFILE_API_BASE,
    });
    getYandexUniqueId.mockResolvedValue("yandex-123");
    getCurPlayerName.mockResolvedValue(YANDEX_NAME);
    isYandexAuthorized.mockResolvedValue(true);
    await primeProfileSession();
    logEventAnalytics.mockClear();
  });

  afterEach(() => {
    delete (global as { fetch?: unknown }).fetch;
    jest.restoreAllMocks();
  });

  describe("loadPlayerProfileView — an UNVERIFIED view never detects (task 0250 S1)", () => {
    it("a not-earned → earned sequence NEVER fires and writes nothing under either prefix", async () => {
      stubFetch(200, publicProfile({ xp: 99 }));
      await loadPlayerProfileView(); // would have armed before S1
      stubFetch(
        200,
        publicProfile({
          xp: 100,
          is_citizen: true,
          citizenship_earned_at: EARNED_AT,
        }),
      );
      await loadPlayerProfileView(); // would have fired before S1
      await loadPlayerProfileView();
      expect(logEventAnalytics).not.toHaveBeenCalled();
      expect(earnedAtKeys()).toEqual([]);
    });

    it("an old-prefix armed snapshot from a pre-S1 bundle never fires either", async () => {
      localStorage.setItem(OLD_PREFIX + "yandex-123", "");
      stubFetch(
        200,
        publicProfile({ is_citizen: true, citizenship_earned_at: EARNED_AT }),
      );
      await loadPlayerProfileView();
      expect(logEventAnalytics).not.toHaveBeenCalled();
      // The old key is left as it was; nothing new is written.
      expect(earnedAtKeys()).toEqual([OLD_PREFIX + "yandex-123"]);
    });

    it("survives localStorage being unavailable (no fire, card unaffected)", async () => {
      jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
        throw new Error("storage disabled");
      });
      stubFetch(
        200,
        publicProfile({
          xp: 1000,
          is_citizen: true,
          citizenship_earned_at: EARNED_AT,
        }),
      );

      await expect(loadPlayerProfileView()).resolves.toEqual({
        displayName: "Commander",
        xp: 1000,
        isCitizen: true,
        isAuthoritative: true,
        nameChange: null,
        approvedName: "Commander",
        isPaidCitizen: false,
      });
      expect(logEventAnalytics).not.toHaveBeenCalled();
    });
  });

  describe("loadPlayerProfileView — a VERIFIED owner view detects (task 0250 S3b)", () => {
    const PURCHASED_BEFORE = "2026-08-20T10:00:00.000Z";
    const PURCHASED_AFTER = "2026-08-25T10:00:00.000Z";
    const notYetEarned = (overrides: Record<string, unknown> = {}) =>
      ownerProfile({ xp: 99, ...overrides });
    const earned = (overrides: Record<string, unknown> = {}) =>
      ownerProfile({
        xp: 100,
        is_citizen: true,
        citizenship_earned_at: EARNED_AT,
        ...overrides,
      });

    async function loadWith(body: unknown) {
      stubFetch(200, body);
      return loadPlayerProfileView();
    }

    it("a non-payer's not-earned → earned fires exactly once", async () => {
      await loadWith(notYetEarned()); // arms
      expect(logEventAnalytics).not.toHaveBeenCalled();
      expect(
        localStorage.getItem(EARNED_AT_STORAGE_KEY_PREFIX + "yandex-123"),
      ).toBe("");
      await loadWith(earned()); // transition
      expect(logEventAnalytics).toHaveBeenCalledTimes(1);
      expect(logEventAnalytics).toHaveBeenCalledWith("Citizenship:Earned:XP");
      await loadWith(earned()); // steady
      expect(logEventAnalytics).toHaveBeenCalledTimes(1);
    });

    it("paid-then-earned is suppressed, the date is still stored, and it never fires later", async () => {
      const paid = {
        is_citizen: true,
        is_paid_citizen: true,
        citizenship_purchased_at: PURCHASED_BEFORE,
      };
      await loadWith(notYetEarned(paid)); // arms (a paid citizen below 100)
      await loadWith(earned(paid)); // crosses 100 after paying
      expect(logEventAnalytics).not.toHaveBeenCalled();
      expect(
        localStorage.getItem(EARNED_AT_STORAGE_KEY_PREFIX + "yandex-123"),
      ).toBe(EARNED_AT);
      await loadWith(earned(paid));
      expect(logEventAnalytics).not.toHaveBeenCalled();
    });

    it("earned-then-paid between two loads still fires (the earn came first)", async () => {
      await loadWith(notYetEarned()); // arms
      await loadWith(
        earned({
          is_paid_citizen: true,
          citizenship_purchased_at: PURCHASED_AFTER,
        }),
      );
      expect(logEventAnalytics).toHaveBeenCalledTimes(1);
    });

    it("a purchase at the same instant as the earn is suppressed (under-count)", async () => {
      await loadWith(notYetEarned());
      await loadWith(
        earned({ is_paid_citizen: true, citizenship_purchased_at: EARNED_AT }),
      );
      expect(logEventAnalytics).not.toHaveBeenCalled();
    });

    it("paid with no purchase date is suppressed (under-count)", async () => {
      await loadWith(notYetEarned());
      await loadWith(
        earned({ is_paid_citizen: true, citizenship_purchased_at: null }),
      );
      expect(logEventAnalytics).not.toHaveBeenCalled();
    });

    it("an unverified read in between neither arms nor disarms it", async () => {
      await loadWith(notYetEarned()); // arms
      // A stale-signature session (S1 view): no paid keys, earned_at null.
      await loadWith(publicProfile({ xp: 100, is_citizen: true }));
      expect(
        localStorage.getItem(EARNED_AT_STORAGE_KEY_PREFIX + "yandex-123"),
      ).toBe("");
      await loadWith(earned());
      expect(logEventAnalytics).toHaveBeenCalledTimes(1);
    });

    it("an old-prefix armed snapshot from a pre-S1 bundle does not arm it", async () => {
      localStorage.setItem(OLD_PREFIX + "yandex-123", "");
      await loadWith(earned());
      expect(logEventAnalytics).not.toHaveBeenCalled();
    });

    it("tracks the transition per Yandex account", async () => {
      // Another account on this device is armed; yandex-123 is not.
      localStorage.setItem(EARNED_AT_STORAGE_KEY_PREFIX + "yandex-456", "");
      await loadWith(earned());
      expect(logEventAnalytics).not.toHaveBeenCalled();
      expect(
        localStorage.getItem(EARNED_AT_STORAGE_KEY_PREFIX + "yandex-456"),
      ).toBe("");
      expect(
        localStorage.getItem(EARNED_AT_STORAGE_KEY_PREFIX + "yandex-123"),
      ).toBe(EARNED_AT);
    });

    it("survives localStorage being unavailable (no fire, card unaffected)", async () => {
      jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
        throw new Error("storage disabled");
      });
      await expect(loadWith(earned({ xp: 1000 }))).resolves.toEqual({
        displayName: "Commander",
        xp: 1000,
        isCitizen: true,
        isAuthoritative: true,
        nameChange: null,
        approvedName: "Commander",
        isPaidCitizen: false,
      });
      expect(logEventAnalytics).not.toHaveBeenCalled();
    });
  });

  // The verified-read detector, exercised directly.
  describe("reportEarnedCitizenshipTransition (the verified-read detector)", () => {
    const NOT_PAID = { isPaidCitizen: false, purchasedAt: null };
    const facts = (earnedAt: string | null) => ({ earnedAt, ...NOT_PAID });
    it("uses the fresh _v2 prefix", () => {
      expect(EARNED_AT_STORAGE_KEY_PREFIX).toBe(
        "geoconflict_citizenship_earned_at_v2:",
      );
      reportEarnedCitizenshipTransition("yandex-123", facts(null));
      expect(earnedAtKeys()).toEqual([
        "geoconflict_citizenship_earned_at_v2:yandex-123",
      ]);
    });

    it("fires exactly once when earned_at appears after a not-earned observation", () => {
      reportEarnedCitizenshipTransition("yandex-123", facts(null)); // arms
      expect(logEventAnalytics).not.toHaveBeenCalled();
      reportEarnedCitizenshipTransition("yandex-123", facts(EARNED_AT)); // transition
      expect(logEventAnalytics).toHaveBeenCalledTimes(1);
      expect(logEventAnalytics).toHaveBeenCalledWith("Citizenship:Earned:XP");
      reportEarnedCitizenshipTransition("yandex-123", facts(EARNED_AT)); // steady
      expect(logEventAnalytics).toHaveBeenCalledTimes(1);
    });

    it('an old-prefix "" does not arm it (no false Earned event at S3b)', () => {
      localStorage.setItem(OLD_PREFIX + "yandex-123", "");
      reportEarnedCitizenshipTransition("yandex-123", facts(EARNED_AT));
      expect(logEventAnalytics).not.toHaveBeenCalled();
    });

    it("does not fire on a first-ever observation that is already a citizen", () => {
      // Fresh device / cleared storage (accepted MVP residual, 2026-08-23).
      reportEarnedCitizenshipTransition("yandex-123", facts(EARNED_AT));
      expect(logEventAnalytics).not.toHaveBeenCalled();
    });

    it("does not fire while earned_at stays null", () => {
      reportEarnedCitizenshipTransition("yandex-123", facts(null));
      reportEarnedCitizenshipTransition("yandex-123", facts(null));
      expect(logEventAnalytics).not.toHaveBeenCalled();
    });

    it("tracks the transition per Yandex account", () => {
      reportEarnedCitizenshipTransition("yandex-123", facts(null)); // arms 123 only
      reportEarnedCitizenshipTransition("yandex-456", facts(EARNED_AT));
      expect(logEventAnalytics).not.toHaveBeenCalled();
    });

    it("never throws when localStorage is unavailable", () => {
      jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
        throw new Error("storage disabled");
      });
      expect(() =>
        reportEarnedCitizenshipTransition("yandex-123", facts(EARNED_AT)),
      ).not.toThrow();
      expect(logEventAnalytics).not.toHaveBeenCalled();
    });
  });
});
