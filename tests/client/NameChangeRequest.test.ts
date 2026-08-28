/**
 * @jest-environment jsdom
 */
// Client → profile-server name-change calls (task 0067). Same harness as
// PaymentsApiClient.test.ts.

jest.mock("../../src/core/configuration/ConfigLoader", () => ({
  getServerConfigFromClient: jest.fn(),
}));

const getYandexUniqueId = jest.fn();
jest.mock("../../src/client/flashist/FlashistFacade", () => ({
  FlashistFacade: {
    instance: {
      getYandexUniqueId: (...args: unknown[]) => getYandexUniqueId(...args),
    },
  },
}));

import { getServerConfigFromClient } from "../../src/core/configuration/ConfigLoader";
import {
  cancelNameChangeRequest,
  submitNameChangeRequest,
} from "../../src/client/NameChangeRequest";

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

describe("NameChangeRequest", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getServerConfig.mockResolvedValue({ profileApiUrl: () => API_BASE });
    getYandexUniqueId.mockResolvedValue("yandex-1");
  });

  afterEach(() => {
    delete (global as { fetch?: unknown }).fetch;
  });

  describe("submitNameChangeRequest", () => {
    it("posts the id and the requested name, and reports ok", async () => {
      const fetchMock = stubFetch(200, { status: "ok" });
      await expect(submitNameChangeRequest("NewName")).resolves.toEqual({
        status: "ok",
      });
      expect(fetchMock).toHaveBeenCalledWith(
        `${API_BASE}/v1/profile/name-change-request`,
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            yandexPlayerId: "yandex-1",
            requestedName: "NewName",
          }),
        }),
      );
    });

    it("surfaces the broken RULE so the card can reuse the username message", async () => {
      stubFetch(400, { error: "invalid", violation: "too_short" });
      await expect(submitNameChangeRequest("ab")).resolves.toEqual({
        status: "invalid",
        violation: "too_short",
      });
    });

    it("falls back to a sensible rule when the server names an unknown one", async () => {
      // Version skew: a newer server reporting a rule this bundle doesn't know
      // must still produce a message, not a blank error line.
      stubFetch(400, { error: "invalid", violation: "brand_new_rule" });
      await expect(submitNameChangeRequest("x")).resolves.toEqual({
        status: "invalid",
        violation: "invalid_chars",
      });
    });

    it("distinguishes name_taken, pending_exists and not_citizen", async () => {
      stubFetch(409, { error: "name_taken" });
      await expect(submitNameChangeRequest("Ivan")).resolves.toEqual({
        status: "name_taken",
      });
      stubFetch(409, { error: "pending_exists" });
      await expect(submitNameChangeRequest("Ivan")).resolves.toEqual({
        status: "pending_exists",
      });
      stubFetch(403, { error: "not_citizen" });
      await expect(submitNameChangeRequest("Ivan")).resolves.toEqual({
        status: "not_citizen",
      });
    });

    it("maps an unrecognized error code to a generic error", async () => {
      stubFetch(500, { error: "internal_error" });
      await expect(submitNameChangeRequest("NewName")).resolves.toEqual({
        status: "error",
      });
    });

    it("NEVER throws on a network failure", async () => {
      const fetchMock = jest.fn().mockRejectedValue(new Error("offline"));
      global.fetch = fetchMock as unknown as typeof fetch;
      await expect(submitNameChangeRequest("NewName")).resolves.toEqual({
        status: "error",
      });
    });

    it("survives a non-JSON error body", async () => {
      const fetchMock = jest.fn().mockResolvedValue({
        ok: false,
        status: 502,
        json: async () => {
          throw new Error("not json");
        },
      });
      global.fetch = fetchMock as unknown as typeof fetch;
      await expect(submitNameChangeRequest("NewName")).resolves.toEqual({
        status: "error",
      });
    });

    it("does not call out at all without a Yandex id", async () => {
      getYandexUniqueId.mockResolvedValue(null);
      const fetchMock = stubFetch(200, { status: "ok" });
      await expect(submitNameChangeRequest("NewName")).resolves.toEqual({
        status: "error",
      });
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("does not call out when the profile API is unconfigured (local dev)", async () => {
      getServerConfig.mockResolvedValue({ profileApiUrl: () => "" });
      const fetchMock = stubFetch(200, { status: "ok" });
      await expect(submitNameChangeRequest("NewName")).resolves.toEqual({
        status: "error",
      });
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("bounds the call with an abort signal", async () => {
      const fetchMock = stubFetch(200, { status: "ok" });
      await submitNameChangeRequest("NewName");
      expect(fetchMock.mock.calls[0][1].signal).toBeDefined();
    });
  });

  describe("cancelNameChangeRequest", () => {
    it("posts only the caller's id", async () => {
      const fetchMock = stubFetch(200, { status: "ok" });
      await expect(cancelNameChangeRequest()).resolves.toEqual({
        status: "ok",
      });
      expect(fetchMock).toHaveBeenCalledWith(
        `${API_BASE}/v1/profile/name-change-cancel`,
        expect.objectContaining({
          body: JSON.stringify({ yandexPlayerId: "yandex-1" }),
        }),
      );
    });

    it("reports no_pending and not_citizen distinctly", async () => {
      stubFetch(404, { error: "no_pending" });
      await expect(cancelNameChangeRequest()).resolves.toEqual({
        status: "no_pending",
      });
      stubFetch(403, { error: "not_citizen" });
      await expect(cancelNameChangeRequest()).resolves.toEqual({
        status: "not_citizen",
      });
    });

    it("NEVER throws on a network failure", async () => {
      const fetchMock = jest.fn().mockRejectedValue(new Error("offline"));
      global.fetch = fetchMock as unknown as typeof fetch;
      await expect(cancelNameChangeRequest()).resolves.toEqual({
        status: "error",
      });
    });
  });
});
