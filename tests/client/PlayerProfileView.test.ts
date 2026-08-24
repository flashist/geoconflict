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
import { loadPlayerProfileView } from "../../src/client/PlayerProfileView";

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
    yandex_player_id: "yandex-123",
    xp: 250,
    is_citizen: false,
    citizenship_earned_at: null,
    display_name: "Commander",
    created_at: "2026-06-13T10:00:00.000Z",
    updated_at: "2026-06-13T12:00:00.000Z",
    ...overrides,
  };
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
};

describe("loadPlayerProfileView", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    getServerConfig.mockResolvedValue({
      profileApiUrl: () => PROFILE_API_BASE,
    });
    getYandexUniqueId.mockResolvedValue("yandex-123");
    getCurPlayerName.mockResolvedValue(YANDEX_NAME);
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
    });
    expect(fetchMock).toHaveBeenCalledWith(
      `${PROFILE_API_BASE}/v1/profile?yandexPlayerId=yandex-123`,
      expect.objectContaining({ signal: expect.anything() }),
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
    });
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
    });
  });
});

// Task 0017 / 0021 §6 — Citizenship:Earned:XP fires when the server profile
// first shows citizenship_earned_at after a previous observation without it.
describe("Citizenship:Earned:XP transition detection", () => {
  const EARNED_AT = "2026-08-23T10:00:00.000Z";

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    getServerConfig.mockResolvedValue({
      profileApiUrl: () => PROFILE_API_BASE,
    });
    getYandexUniqueId.mockResolvedValue("yandex-123");
    getCurPlayerName.mockResolvedValue(YANDEX_NAME);
    isYandexAuthorized.mockResolvedValue(true);
  });

  afterEach(() => {
    delete (global as { fetch?: unknown }).fetch;
    jest.restoreAllMocks();
  });

  it("fires exactly once when earned_at appears after a not-earned observation", async () => {
    stubFetch(200, publicProfile({ xp: 990 }));
    await loadPlayerProfileView(); // arms: observed as not-yet-earned
    expect(logEventAnalytics).not.toHaveBeenCalled();

    stubFetch(
      200,
      publicProfile({
        xp: 1000,
        is_citizen: true,
        citizenship_earned_at: EARNED_AT,
      }),
    );
    await loadPlayerProfileView(); // the transition
    expect(logEventAnalytics).toHaveBeenCalledTimes(1);
    expect(logEventAnalytics).toHaveBeenCalledWith("Citizenship:Earned:XP");

    await loadPlayerProfileView(); // steady state — never again
    expect(logEventAnalytics).toHaveBeenCalledTimes(1);
  });

  it("does not fire on a first-ever observation that is already a citizen", async () => {
    // Fresh device / cleared storage: no stored snapshot means no transition
    // (accepted MVP residual — owner ruling 2026-08-23).
    stubFetch(
      200,
      publicProfile({
        xp: 1200,
        is_citizen: true,
        citizenship_earned_at: EARNED_AT,
      }),
    );
    await loadPlayerProfileView();
    expect(logEventAnalytics).not.toHaveBeenCalled();
  });

  it("does not fire while earned_at stays null across loads", async () => {
    stubFetch(200, publicProfile({ xp: 400 }));
    await loadPlayerProfileView();
    await loadPlayerProfileView();
    expect(logEventAnalytics).not.toHaveBeenCalled();
  });

  it("does not fire (and keeps the armed snapshot) on a failed fetch between observations", async () => {
    stubFetch(200, publicProfile({ xp: 990 }));
    await loadPlayerProfileView(); // arms

    stubFetch(500, { error: "internal_error" });
    await loadPlayerProfileView(); // zero-state path — detection untouched
    expect(logEventAnalytics).not.toHaveBeenCalled();

    stubFetch(
      200,
      publicProfile({ is_citizen: true, citizenship_earned_at: EARNED_AT }),
    );
    await loadPlayerProfileView(); // still fires once the real profile arrives
    expect(logEventAnalytics).toHaveBeenCalledTimes(1);
  });

  it("tracks the transition per Yandex account", async () => {
    stubFetch(200, publicProfile({ xp: 990 }));
    await loadPlayerProfileView(); // arms yandex-123

    getYandexUniqueId.mockResolvedValue("yandex-456");
    stubFetch(
      200,
      publicProfile({
        yandex_player_id: "yandex-456",
        is_citizen: true,
        citizenship_earned_at: EARNED_AT,
      }),
    );
    // First-ever observation for yandex-456 — armed state of yandex-123 must
    // not leak across accounts.
    await loadPlayerProfileView();
    expect(logEventAnalytics).not.toHaveBeenCalled();
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
    });
    expect(logEventAnalytics).not.toHaveBeenCalled();
  });
});
