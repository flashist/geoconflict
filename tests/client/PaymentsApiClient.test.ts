/**
 * @jest-environment jsdom
 */
jest.mock("../../src/core/configuration/ConfigLoader", () => ({
  getServerConfigFromClient: jest.fn(),
}));

const getYandexUniqueId = jest.fn();
const isYandexAuthorized = jest.fn();
jest.mock("../../src/client/flashist/FlashistFacade", () => ({
  FlashistFacade: {
    instance: {
      getYandexUniqueId: (...args: unknown[]) => getYandexUniqueId(...args),
      isYandexAuthorized: (...args: unknown[]) => isYandexAuthorized(...args),
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
    },
  },
}));

import { getServerConfigFromClient } from "../../src/core/configuration/ConfigLoader";
import {
  completePurchase,
  createPurchaseIntent,
  reconcilePurchases,
} from "../../src/client/PaymentsApiClient";
import { resetProfileSessionForTests } from "../../src/client/ProfileSession";
import { EXPECTED_BEARER, primeProfileSession } from "./support/profileSession";

const getServerConfig = getServerConfigFromClient as jest.Mock;

const API_BASE = "https://api.example.test";

function stubFetch(status: number, body: unknown): jest.Mock {
  const fetchMock = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

describe("PaymentsApiClient", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    getServerConfig.mockResolvedValue({ profileApiUrl: () => API_BASE });
    getYandexUniqueId.mockResolvedValue("yandex-1");
    isYandexAuthorized.mockResolvedValue(true);
    // S4: /intent goes out under a Bearer token; complete/reconcile do not.
    await primeProfileSession();
  });

  afterEach(() => {
    delete (global as { fetch?: unknown }).fetch;
  });

  it("createPurchaseIntent posts only the productId, under a Bearer token", async () => {
    const fetchMock = stubFetch(200, { intentId: "intent-1" });
    await expect(createPurchaseIntent("citizenship")).resolves.toBe("intent-1");
    expect(fetchMock).toHaveBeenCalledWith(
      `${API_BASE}/v1/payments/yandex/intent`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ productId: "citizenship" }),
        headers: expect.objectContaining({ Authorization: EXPECTED_BEARER }),
      }),
    );
  });

  // Reconciliation must never depend on being logged in: it runs at session
  // start to recover an interrupted purchase, and the GRANT is bound to the
  // Yandex-signed payload, not to the caller.
  it("completePurchase and reconcilePurchases send NO Authorization header", async () => {
    const fetchMock = stubFetch(200, {
      success: true,
      purchaseToken: "tok-1",
    });
    await completePurchase("sig.payload");
    stubFetch(200, { processedTokens: [] });
    await reconcilePurchases("sig.payload");
    expect(
      (fetchMock.mock.calls[0][1].headers as Record<string, string>)
        .Authorization,
    ).toBeUndefined();
  });

  it("createPurchaseIntent resolves null without a session, and never calls out", async () => {
    resetProfileSessionForTests();
    isYandexAuthorized.mockResolvedValue(false);
    const fetchMock = stubFetch(200, { intentId: "intent-1" });
    await expect(createPurchaseIntent("citizenship")).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("is a no-op resolving null when the profile API base is empty", async () => {
    getServerConfig.mockResolvedValue({ profileApiUrl: () => "" });
    const fetchMock = stubFetch(200, { intentId: "intent-1" });
    await expect(createPurchaseIntent("citizenship")).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("resolves null when the config loader itself throws", async () => {
    getServerConfig.mockRejectedValue(new Error("no /api/env"));
    stubFetch(200, { intentId: "intent-1" });
    await expect(createPurchaseIntent("citizenship")).resolves.toBeNull();
  });

  it("completePurchase returns the success payload with the token", async () => {
    stubFetch(200, { success: true, purchaseToken: "tok-1" });
    await expect(completePurchase("sig.payload")).resolves.toEqual({
      success: true,
      purchaseToken: "tok-1",
    });
  });

  it("resolves null on a non-200 and on a malformed body — never throws", async () => {
    stubFetch(409, { error: "intent_used" });
    await expect(completePurchase("sig.payload")).resolves.toBeNull();

    stubFetch(200, { success: true }); // missing purchaseToken
    await expect(completePurchase("sig.payload")).resolves.toBeNull();

    stubFetch(200, "not an object");
    await expect(reconcilePurchases("sig.payload")).resolves.toBeNull();
  });

  it("resolves null on a network failure and on an abort/timeout", async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValue(new Error("network down")) as unknown as typeof fetch;
    await expect(reconcilePurchases("sig.payload")).resolves.toBeNull();

    global.fetch = jest
      .fn()
      .mockRejectedValue(
        new DOMException("aborted", "AbortError"),
      ) as unknown as typeof fetch;
    await expect(completePurchase("sig.payload")).resolves.toBeNull();
  });

  it("reconcilePurchases returns the processed token list", async () => {
    stubFetch(200, { processedTokens: ["tok-1", "tok-2"] });
    await expect(reconcilePurchases("sig.payload")).resolves.toEqual([
      "tok-1",
      "tok-2",
    ]);
  });
});
