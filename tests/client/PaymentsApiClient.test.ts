/**
 * @jest-environment jsdom
 */
jest.mock("../../src/core/configuration/ConfigLoader", () => ({
  getServerConfigFromClient: jest.fn(),
}));

import { getServerConfigFromClient } from "../../src/core/configuration/ConfigLoader";
import {
  completePurchase,
  createPurchaseIntent,
  reconcilePurchases,
} from "../../src/client/PaymentsApiClient";

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
  beforeEach(() => {
    jest.clearAllMocks();
    getServerConfig.mockResolvedValue({ profileApiUrl: () => API_BASE });
  });

  afterEach(() => {
    delete (global as { fetch?: unknown }).fetch;
  });

  it("createPurchaseIntent posts the request and returns the intentId", async () => {
    const fetchMock = stubFetch(200, { intentId: "intent-1" });
    await expect(createPurchaseIntent("yandex-1", "citizenship")).resolves.toBe(
      "intent-1",
    );
    expect(fetchMock).toHaveBeenCalledWith(
      `${API_BASE}/v1/payments/yandex/intent`,
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          yandexPlayerId: "yandex-1",
          productId: "citizenship",
        }),
      }),
    );
  });

  it("is a no-op resolving null when the profile API base is empty", async () => {
    getServerConfig.mockResolvedValue({ profileApiUrl: () => "" });
    const fetchMock = stubFetch(200, { intentId: "intent-1" });
    await expect(
      createPurchaseIntent("yandex-1", "citizenship"),
    ).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("resolves null when the config loader itself throws", async () => {
    getServerConfig.mockRejectedValue(new Error("no /api/env"));
    stubFetch(200, { intentId: "intent-1" });
    await expect(
      createPurchaseIntent("yandex-1", "citizenship"),
    ).resolves.toBeNull();
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
