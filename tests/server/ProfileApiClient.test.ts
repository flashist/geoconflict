import { Logger } from "winston";
import { ServerConfig } from "../../src/core/configuration/Config";
import { MatchCredit } from "../../src/core/profile/MatchQualification";
import { ProfileApiClient } from "../../src/server/ProfileApiClient";

function testLogger() {
  const child = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  };
  return {
    child,
    parent: { child: jest.fn(() => child) } as unknown as Logger,
  };
}

function fakeConfig(profileApiUrl: string): ServerConfig {
  return { profileApiUrl: () => profileApiUrl } as unknown as ServerConfig;
}

function jsonResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

function matchCredit(over: Partial<MatchCredit> = {}): MatchCredit {
  return {
    gameId: "game-1",
    yandexPlayerId: "yx-1",
    persistentId: "p-1",
    xpAwarded: 10,
    ...over,
  };
}

/** The shape `POST /internal/v1/profile/upsert` actually returns (toPublicProfile). */
function publicProfile(over: Record<string, unknown> = {}) {
  return {
    schema_version: 1,
    yandex_player_id: "yx-1",
    xp: 0,
    is_citizen: false,
    citizenship_earned_at: null,
    display_name: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...over,
  };
}

const BASE = "https://api.test";

describe("ProfileApiClient", () => {
  const originalFetch = global.fetch;
  const originalToken = process.env.PROFILE_INTERNAL_TOKEN;

  beforeEach(() => {
    process.env.PROFILE_INTERNAL_TOKEN = "secret-token";
  });

  afterEach(() => {
    global.fetch = originalFetch;
    if (originalToken === undefined) {
      delete process.env.PROFILE_INTERNAL_TOKEN;
    } else {
      process.env.PROFILE_INTERNAL_TOKEN = originalToken;
    }
    jest.restoreAllMocks();
  });

  function newClient(url = BASE) {
    const { child, parent } = testLogger();
    // backoffMs = 0 so retry tests don't actually sleep.
    return {
      client: new ProfileApiClient(fakeConfig(url), parent, 3, 0),
      child,
    };
  }

  test("credits a batch with the right URL, bearer header, and wire body", async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      jsonResponse(200, {
        results: [
          { gameId: "game-1", yandexPlayerId: "yx-1", status: "credited" },
        ],
      }),
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const { client } = newClient();
    await client.creditMatch([matchCredit()]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE}/internal/v1/credit`);
    expect(init.method).toBe("POST");
    expect(init.headers.authorization).toBe("Bearer secret-token");
    expect(init.headers["Content-Type"]).toBe("application/json");
    // Each attempt is bounded by a per-attempt timeout signal (C3).
    expect(init.signal).toBeInstanceOf(AbortSignal);
    // persistentId must NOT leak onto the credit wire payload.
    expect(JSON.parse(init.body)).toEqual({
      credits: [{ gameId: "game-1", yandexPlayerId: "yx-1", xpAwarded: 10 }],
    });
  });

  test("no_profile result triggers upsert then a re-credit", async () => {
    let creditCalls = 0;
    let upsertCalls = 0;
    const fetchMock = jest.fn(async (url: string) => {
      if (url.endsWith("/internal/v1/credit")) {
        creditCalls++;
        const status = creditCalls === 1 ? "no_profile" : "credited";
        return jsonResponse(200, {
          results: [{ gameId: "game-1", yandexPlayerId: "yx-1", status }],
        });
      }
      if (url.endsWith("/internal/v1/profile/upsert")) {
        upsertCalls++;
        return jsonResponse(200, { yandexPlayerId: "yx-1", xp: 0 });
      }
      throw new Error(`unexpected url ${url}`);
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const { client } = newClient();
    await client.creditMatch([matchCredit()]);

    expect(creditCalls).toBe(2);
    expect(upsertCalls).toBe(1);
  });

  test("retries on 5xx then succeeds", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse(503, {}))
      .mockResolvedValueOnce(
        jsonResponse(200, {
          results: [
            { gameId: "game-1", yandexPlayerId: "yx-1", status: "credited" },
          ],
        }),
      );
    global.fetch = fetchMock as unknown as typeof fetch;

    const { client, child } = newClient();
    await expect(client.creditMatch([matchCredit()])).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(child.warn).toHaveBeenCalledWith(
      expect.stringContaining("returned 503"),
    );
  });

  test("never throws when the profile server is unreachable (fail-soft)", async () => {
    const fetchMock = jest.fn().mockRejectedValue(new Error("ECONNREFUSED"));
    global.fetch = fetchMock as unknown as typeof fetch;

    const { client, child } = newClient();
    await expect(client.creditMatch([matchCredit()])).resolves.toBeUndefined();

    // 3 attempts, then a single "dropped" warning.
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(child.warn).toHaveBeenCalledWith(
      expect.stringContaining("award(s) dropped"),
    );
  });

  test("gives up immediately on a 4xx without retrying", async () => {
    const fetchMock = jest.fn().mockResolvedValue(jsonResponse(400, {}));
    global.fetch = fetchMock as unknown as typeof fetch;

    const { client } = newClient();
    await client.creditMatch([matchCredit()]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("is a no-op when PROFILE_API_URL is empty", async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    const { client } = newClient("");
    await client.creditMatch([matchCredit()]);
    await client.upsertProfile("yx-1", "p-1");

    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("is a no-op when PROFILE_INTERNAL_TOKEN is unset", async () => {
    delete process.env.PROFILE_INTERNAL_TOKEN;
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    const { client } = newClient();
    await client.creditMatch([matchCredit()]);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("empty credit list never calls the network", async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    const { client } = newClient();
    await client.creditMatch([]);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("upsertProfile posts the expected body", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValue(jsonResponse(200, { yandexPlayerId: "yx-1", xp: 0 }));
    global.fetch = fetchMock as unknown as typeof fetch;

    const { client } = newClient();
    await client.upsertProfile("yx-1", "p-1");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE}/internal/v1/profile/upsert`);
    expect(JSON.parse(init.body)).toEqual({
      yandexPlayerId: "yx-1",
      persistentId: "p-1",
    });
  });

  // Task 0068: upsertProfile now also reports the profile's is_citizen off the
  // response the endpoint ALREADY returns. The whole point is that every failure
  // path collapses to `false` ("not a citizen") without ever throwing, because the
  // caller is on the join path and awaits nothing.
  describe("upsertProfile citizen flag (0068)", () => {
    test("returns is_citizen from a well-formed response", async () => {
      global.fetch = jest
        .fn()
        .mockResolvedValue(
          jsonResponse(200, publicProfile({ is_citizen: true })),
        ) as unknown as typeof fetch;

      const { client } = newClient();
      await expect(client.upsertProfile("yx-1", "p-1")).resolves.toBe(true);
    });

    test("returns false for a non-citizen", async () => {
      global.fetch = jest
        .fn()
        .mockResolvedValue(
          jsonResponse(200, publicProfile({ is_citizen: false })),
        ) as unknown as typeof fetch;

      const { client } = newClient();
      await expect(client.upsertProfile("yx-1", "p-1")).resolves.toBe(false);
    });

    test("returns false when the profile API is unconfigured (local dev)", async () => {
      const fetchMock = jest.fn();
      global.fetch = fetchMock as unknown as typeof fetch;

      const { client } = newClient("");
      await expect(client.upsertProfile("yx-1", "p-1")).resolves.toBe(false);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    test("returns false (never throws) when the network is down", async () => {
      const fetchMock = jest.fn().mockRejectedValue(new Error("ECONNREFUSED"));
      global.fetch = fetchMock as unknown as typeof fetch;

      const { client } = newClient();
      await expect(client.upsertProfile("yx-1", "p-1")).resolves.toBe(false);
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    test("returns false after retries are exhausted on 5xx", async () => {
      const fetchMock = jest.fn().mockResolvedValue(jsonResponse(500, {}));
      global.fetch = fetchMock as unknown as typeof fetch;

      const { client } = newClient();
      await expect(client.upsertProfile("yx-1", "p-1")).resolves.toBe(false);
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    test("returns false immediately on a 409 persistent_id_conflict", async () => {
      const fetchMock = jest
        .fn()
        .mockResolvedValue(
          jsonResponse(409, { error: "persistent_id_conflict" }),
        );
      global.fetch = fetchMock as unknown as typeof fetch;

      const { client } = newClient();
      await expect(client.upsertProfile("yx-1", "p-1")).resolves.toBe(false);
      // 4xx is not retried.
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    test("returns false and warns on an unparseable body", async () => {
      global.fetch = jest
        .fn()
        .mockResolvedValue(
          jsonResponse(200, { not: "a profile" }),
        ) as unknown as typeof fetch;

      const { client, child } = newClient();
      await expect(client.upsertProfile("yx-1", "p-1")).resolves.toBe(false);
      expect(child.warn).toHaveBeenCalledWith(
        expect.stringContaining("upsert response failed validation"),
      );
    });

    test("a truthy-but-not-boolean is_citizen is rejected, not coerced", async () => {
      global.fetch = jest
        .fn()
        .mockResolvedValue(
          jsonResponse(200, publicProfile({ is_citizen: "true" })),
        ) as unknown as typeof fetch;

      const { client } = newClient();
      await expect(client.upsertProfile("yx-1", "p-1")).resolves.toBe(false);
    });
  });

  test("isolates an over-long yandexPlayerId so it can't poison the batch (P1)", async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      jsonResponse(200, {
        results: [
          { gameId: "game-1", yandexPlayerId: "yx-good", status: "credited" },
        ],
      }),
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const { client, child } = newClient();
    await client.creditMatch([
      // 200 chars: accepted at the 256-char join boundary, over the 128 credit cap.
      matchCredit({ yandexPlayerId: "x".repeat(200) }),
      matchCredit({ yandexPlayerId: "yx-good" }),
    ]);

    // The bad item is dropped before POST; the valid player is still credited.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.credits).toEqual([
      { gameId: "game-1", yandexPlayerId: "yx-good", xpAwarded: 10 },
    ]);
    expect(child.warn).toHaveBeenCalledWith(
      expect.stringContaining("dropping invalid credit item"),
    );
  });

  test("skips the POST entirely when every item is invalid", async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    const { client } = newClient();
    await client.creditMatch([
      matchCredit({ yandexPlayerId: "x".repeat(200) }),
    ]);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  describe("partial-configuration warning at construction (0062)", () => {
    test("warns once when PROFILE_API_URL is set but the token is empty", () => {
      delete process.env.PROFILE_INTERNAL_TOKEN;

      const { child } = newClient();

      expect(child.warn).toHaveBeenCalledTimes(1);
      expect(child.warn).toHaveBeenCalledWith(
        expect.stringContaining("PROFILE_INTERNAL_TOKEN is empty"),
      );
    });

    test("warns once when the token is set but PROFILE_API_URL is empty", () => {
      const { child } = newClient("");

      expect(child.warn).toHaveBeenCalledTimes(1);
      expect(child.warn).toHaveBeenCalledWith(
        expect.stringContaining("PROFILE_API_URL is empty"),
      );
      // The secret's VALUE must never appear in the log line, only its name.
      expect(child.warn.mock.calls[0][0]).not.toContain("secret-token");
    });

    test("does not warn when both are set", () => {
      const { child } = newClient();

      expect(child.warn).not.toHaveBeenCalled();
    });

    test("does not warn when neither is set (local dev)", () => {
      delete process.env.PROFILE_INTERNAL_TOKEN;

      const { child } = newClient("");

      expect(child.warn).not.toHaveBeenCalled();
    });
  });
});
