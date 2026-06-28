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
});
