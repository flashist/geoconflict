/**
 * @jest-environment jsdom
 */
// Client claim of the one-time tenure XP grant (task 0253; ADR-112 as amended by
// the 2026-09-15 redesign). Uses the REAL ProfileSession (the primeProfileSession
// harness), so the Bearer header, the login gate and the no-id body are proven,
// not mocked.

jest.mock("../../src/core/configuration/ConfigLoader", () => ({
  getServerConfigFromClient: jest.fn(),
}));

const getYandexUniqueId = jest.fn();
const isYandexAuthorized = jest.fn();
const isCitizenshipSurfacesEnabled = jest.fn();
jest.mock("../../src/client/flashist/FlashistFacade", () => ({
  FlashistFacade: {
    instance: {
      getYandexUniqueId: (...args: unknown[]) => getYandexUniqueId(...args),
      isYandexAuthorized: (...args: unknown[]) => isYandexAuthorized(...args),
      isCitizenshipSurfacesEnabled: (...args: unknown[]) =>
        isCitizenshipSurfacesEnabled(...args),
    },
  },
  flashist_logEventAnalytics: jest.fn(),
  flashistConstants: {
    analyticEvents: {
      PROFILE_LOGIN_SUCCEEDED: "Profile:Login:Succeeded",
      PROFILE_LOGIN_CREATED: "Profile:Login:Created",
      PROFILE_LOGIN_FAILED_TIMEOUT: "Profile:Login:Failed:Timeout",
      PROFILE_LOGIN_FAILED_UNAVAILABLE: "Profile:Login:Failed:Unavailable",
      PROFILE_LOGIN_FAILED_ERROR: "Profile:Login:Failed:Error",
      PROFILE_SESSION_RELOGIN: "Profile:Session:Relogin",
      PLAYER_DAYS_PLAYED: "Player:DaysPlayed",
      CITIZENSHIP_TENURE_GRANT_CLAIMED: "Citizenship:TenureGrant:Claimed",
      CITIZENSHIP_TENURE_GRANT_REJECTED: "Citizenship:TenureGrant:Rejected",
      CITIZENSHIP_TENURE_GRANT_CLAIM_FAILED:
        "Citizenship:TenureGrant:ClaimFailed",
    },
  },
}));

import {
  maybeClaimTenureGrant,
  resetTenureClaimForTests,
} from "../../src/client/TenureGrantClaim";
import {
  ensureSession,
  resetProfileSessionForTests,
} from "../../src/client/ProfileSession";
import { flashist_logEventAnalytics } from "../../src/client/flashist/FlashistFacade";
import { getServerConfigFromClient } from "../../src/core/configuration/ConfigLoader";
import {
  EXPECTED_BEARER,
  TEST_SESSION_TOKEN,
  loginResponseBody,
  primeProfileSession,
} from "./support/profileSession";

const getServerConfig = getServerConfigFromClient as jest.Mock;
const logEvent = flashist_logEventAnalytics as jest.Mock;
const API_BASE = "https://api.example.test";
const CLAIM_URL = `${API_BASE}/v1/profile/tenure-grant`;

const CLAIMED = "Citizenship:TenureGrant:Claimed";
const REJECTED = "Citizenship:TenureGrant:Rejected";
const CLAIM_FAILED = "Citizenship:TenureGrant:ClaimFailed";
const TENURE_EVENTS = [
  CLAIMED,
  CLAIM_FAILED,
  `${REJECTED}:BelowMinimum`,
  `${REJECTED}:Duplicate`,
];

/** The login-variant of primeProfileSession: the player is already checked. */
async function primeCheckedSession(): Promise<void> {
  resetProfileSessionForTests();
  global.fetch = jest.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      ...loginResponseBody(),
      grantChecks: { tenure: "done" },
    }),
  })) as unknown as typeof fetch;
  expect(await ensureSession()).toBe(TEST_SESSION_TOKEN);
}

function stubFetch(status: number, body: unknown): jest.Mock {
  const fetchMock = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

function tenureEvents(): unknown[][] {
  return logEvent.mock.calls.filter((call) =>
    TENURE_EVENTS.includes(String(call[0])),
  );
}

describe("maybeClaimTenureGrant", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    localStorage.clear();
    resetTenureClaimForTests();
    getServerConfig.mockResolvedValue({ profileApiUrl: () => API_BASE });
    getYandexUniqueId.mockResolvedValue("yandex-1");
    isYandexAuthorized.mockResolvedValue(true);
    isCitizenshipSurfacesEnabled.mockResolvedValue(true);
    await primeProfileSession();
    logEvent.mockClear();
  });

  afterEach(() => {
    delete (global as { fetch?: unknown }).fetch;
  });

  describe("sends nothing", () => {
    it("when the citizenship gate is off (verification 13)", async () => {
      isCitizenshipSurfacesEnabled.mockResolvedValue(false);
      const fetchMock = stubFetch(200, {});
      await expect(maybeClaimTenureGrant()).resolves.toEqual({
        status: "skipped",
      });
      expect(fetchMock).not.toHaveBeenCalled();
      expect(tenureEvents()).toEqual([]);
    });

    it("for a guest (verification 12)", async () => {
      resetProfileSessionForTests();
      isYandexAuthorized.mockResolvedValue(false);
      const fetchMock = stubFetch(200, {});
      await expect(maybeClaimTenureGrant()).resolves.toEqual({
        status: "skipped",
      });
      expect(fetchMock).not.toHaveBeenCalled();
      expect(tenureEvents()).toEqual([]);
    });

    it("when the login failed this load", async () => {
      resetProfileSessionForTests();
      const fetchMock = stubFetch(500, { error: "internal_error" });
      await expect(maybeClaimTenureGrant()).resolves.toEqual({
        status: "skipped",
      });
      // Only the failed login went out — never a claim.
      expect(fetchMock.mock.calls.map((call) => call[0])).toEqual([
        `${API_BASE}/v1/login`,
      ]);
      expect(tenureEvents()).toEqual([]);
    });

    it("when the login says the player is already checked (done)", async () => {
      await primeCheckedSession();
      const fetchMock = stubFetch(200, {});
      await expect(maybeClaimTenureGrant()).resolves.toEqual({
        status: "skipped",
      });
      expect(fetchMock).not.toHaveBeenCalled();
      expect(tenureEvents()).toEqual([]);
    });

    it("when storage cannot be read (plan D1) — no request, no event", async () => {
      jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
        throw new Error("SecurityError");
      });
      const fetchMock = stubFetch(200, {});
      await expect(maybeClaimTenureGrant()).resolves.toEqual({
        status: "skipped",
      });
      expect(fetchMock).not.toHaveBeenCalled();
      expect(tenureEvents()).toEqual([]);
      jest.restoreAllMocks();
    });

    it("on a second call in the same page load", async () => {
      stubFetch(200, { status: "granted", xpAwarded: 5, xp: 5 });
      await maybeClaimTenureGrant();
      const fetchMock = stubFetch(200, {
        status: "granted",
        xpAwarded: 5,
        xp: 5,
      });
      await expect(maybeClaimTenureGrant()).resolves.toEqual({
        status: "skipped",
      });
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  it("pending: ONE POST under a Bearer token, with a body of only {evidence}", async () => {
    localStorage.setItem("geoconflict.player.daysPlayed", "12");
    localStorage.setItem(
      "game-records",
      JSON.stringify({ g1: { startTime: new Date(2026, 0, 5, 12).getTime() } }),
    );
    const fetchMock = stubFetch(200, {
      status: "granted",
      xpAwarded: 12,
      xp: 20,
    });
    await maybeClaimTenureGrant();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(CLAIM_URL);
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe(EXPECTED_BEARER);
    expect(JSON.parse(init.body)).toEqual({
      evidence: { daysPlayed: 12, gameRecordDays: 1 },
    });
    expect(init.body).not.toContain("yandex-1");
  });

  it("under 3 days is still sent", async () => {
    localStorage.setItem("geoconflict.player.daysPlayed", "1");
    const fetchMock = stubFetch(200, {
      status: "below_minimum",
      xpAwarded: 0,
      xp: 0,
    });
    await maybeClaimTenureGrant();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      evidence: { daysPlayed: 1, gameRecordDays: 0 },
    });
  });

  describe("maps each answer to its event", () => {
    it("granted → Claimed with value = XP", async () => {
      stubFetch(200, { status: "granted", xpAwarded: 37, xp: 45 });
      await expect(maybeClaimTenureGrant()).resolves.toEqual({
        status: "granted",
        xpAwarded: 37,
        xp: 45,
      });
      expect(tenureEvents()).toEqual([[CLAIMED, 37]]);
    });

    it("below_minimum → Rejected:BelowMinimum", async () => {
      stubFetch(200, { status: "below_minimum", xpAwarded: 0, xp: 3 });
      await expect(maybeClaimTenureGrant()).resolves.toEqual({
        status: "below_minimum",
      });
      expect(tenureEvents()).toEqual([[`${REJECTED}:BelowMinimum`]]);
    });

    it("duplicate → Rejected:Duplicate", async () => {
      stubFetch(200, { status: "duplicate", xpAwarded: 30, xp: 45 });
      await expect(maybeClaimTenureGrant()).resolves.toEqual({
        status: "duplicate",
      });
      expect(tenureEvents()).toEqual([[`${REJECTED}:Duplicate`]]);
    });
  });

  describe("ClaimFailed, and nothing stored on the device", () => {
    async function expectFailed(): Promise<void> {
      const before = { ...localStorage };
      await expect(maybeClaimTenureGrant()).resolves.toEqual({
        status: "failed",
      });
      expect(tenureEvents()).toEqual([[CLAIM_FAILED]]);
      expect({ ...localStorage }).toEqual(before);
    }

    it("a network error", async () => {
      global.fetch = jest
        .fn()
        .mockRejectedValue(new Error("offline")) as unknown as typeof fetch;
      await expectFailed();
    });

    it.each([500, 502, 503])("a %i", async (status) => {
      stubFetch(status, { error: "internal_error" });
      await expectFailed();
    });

    it("a 404 (the route is not on the box yet)", async () => {
      stubFetch(404, { error: "not_found" });
      await expectFailed();
    });

    it("a 400", async () => {
      stubFetch(400, { error: "bad_request" });
      await expectFailed();
    });

    it("a 200 whose body does not parse", async () => {
      stubFetch(200, { status: "window_closed" });
      await expectFailed();
    });

    it("a 200 whose body is not JSON", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => {
          throw new Error("not json");
        },
      }) as unknown as typeof fetch;
      await expectFailed();
    });

    it("a failure is retried on the next page load", async () => {
      stubFetch(503, { error: "session_unavailable" });
      await maybeClaimTenureGrant();
      // A new page load: the module latch is fresh, the login still says pending.
      resetTenureClaimForTests();
      const fetchMock = stubFetch(200, {
        status: "granted",
        xpAwarded: 5,
        xp: 5,
      });
      await expect(maybeClaimTenureGrant()).resolves.toMatchObject({
        status: "granted",
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });
});
