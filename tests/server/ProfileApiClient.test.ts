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

const PLAYER_ID = "0b6f8a52-3c1e-4d7a-9f10-2a4b6c8d0e1f";
const OTHER_PLAYER_ID = "0b6f8a52-3c1e-4d7a-9f10-2a4b6c8d0e2f";

function matchCredit(over: Partial<MatchCredit> = {}): MatchCredit {
  return {
    gameId: "game-1",
    playerId: PLAYER_ID,
    xpAwarded: 10,
    ...over,
  };
}

/** Every string any mocked log method was called with. */
function loggedText(child: ReturnType<typeof testLogger>["child"]): string {
  return [child.info, child.warn, child.error, child.debug]
    .flatMap((fn) => fn.mock.calls.map((call) => JSON.stringify(call)))
    .join("\n");
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
          { gameId: "game-1", playerId: PLAYER_ID, status: "credited" },
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
    // Keyed by the internal player id (task 0272) — no platform id on the wire.
    expect(JSON.parse(init.body)).toEqual({
      credits: [{ gameId: "game-1", playerId: PLAYER_ID, xpAwarded: 10 }],
    });
  });

  // Task 0272: there is no upsert to backfill with any more. A no_profile after S3
  // means the player was erased mid-match; it is logged and dropped for this match.
  test("a no_profile result is warned about and never triggers a second call", async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      jsonResponse(200, {
        results: [
          { gameId: "game-1", playerId: PLAYER_ID, status: "no_profile" },
        ],
      }),
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const { client, child } = newClient();
    await client.creditMatch([matchCredit()]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(child.warn).toHaveBeenCalledWith(
      expect.stringContaining("no_profile"),
    );
    expect(loggedText(child)).not.toContain(PLAYER_ID);
  });

  test("retries on 5xx then succeeds", async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(jsonResponse(503, {}))
      .mockResolvedValueOnce(
        jsonResponse(200, {
          results: [
            { gameId: "game-1", playerId: PLAYER_ID, status: "credited" },
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
    await client.resolvePlayer("yx-1");

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

  // Review R1: GameServer warns about a dropped award only when this is true.
  test("isConfigured is true only with both the URL and the token", () => {
    expect(newClient().client.isConfigured()).toBe(true);
    expect(newClient("").client.isConfigured()).toBe(false);
    delete process.env.PROFILE_INTERNAL_TOKEN;
    expect(newClient().client.isConfigured()).toBe(false);
  });

  test("empty credit list never calls the network", async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    const { client } = newClient();
    await client.creditMatch([]);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  // Task 0272 (S3): resolvePlayer replaces upsertProfile. Fail-soft IS the contract:
  // every failure path returns null ("not resolved"), never an exception or a delay.
  describe("resolvePlayer", () => {
    const SYNTHETIC_ID = "zz0272clientprobe";

    test("posts the platform identity to the resolve route with the bearer token", async () => {
      const fetchMock = jest
        .fn()
        .mockResolvedValue(
          jsonResponse(200, { playerId: PLAYER_ID, isCitizen: false }),
        );
      global.fetch = fetchMock as unknown as typeof fetch;

      const { client } = newClient();
      await client.resolvePlayer("yx-1");

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe(`${BASE}/internal/v1/players/resolve`);
      expect(init.method).toBe("POST");
      expect(init.headers.authorization).toBe("Bearer secret-token");
      expect(init.signal).toBeInstanceOf(AbortSignal);
      expect(JSON.parse(init.body)).toEqual({
        platform: "yandex_games",
        platformUserId: "yx-1",
      });
    });

    test("returns the parsed { playerId, isCitizen } pair", async () => {
      global.fetch = jest
        .fn()
        .mockResolvedValue(
          jsonResponse(200, { playerId: PLAYER_ID, isCitizen: true }),
        ) as unknown as typeof fetch;

      const { client } = newClient();
      await expect(client.resolvePlayer("yx-1")).resolves.toEqual({
        playerId: PLAYER_ID,
        isCitizen: true,
      });
    });

    test("returns null and never fetches when the profile API is unconfigured", async () => {
      const fetchMock = jest.fn();
      global.fetch = fetchMock as unknown as typeof fetch;

      const { client } = newClient("");
      await expect(client.resolvePlayer("yx-1")).resolves.toBeNull();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    test("returns null immediately on a 4xx, without retrying", async () => {
      const fetchMock = jest.fn().mockResolvedValue(jsonResponse(400, {}));
      global.fetch = fetchMock as unknown as typeof fetch;

      const { client } = newClient();
      await expect(client.resolvePlayer("yx-1")).resolves.toBeNull();
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    test("retries a 5xx up to the budget, then returns null", async () => {
      const fetchMock = jest.fn().mockResolvedValue(jsonResponse(500, {}));
      global.fetch = fetchMock as unknown as typeof fetch;

      const { client } = newClient();
      await expect(client.resolvePlayer("yx-1")).resolves.toBeNull();
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    test("returns null (never throws) when the network is down", async () => {
      const fetchMock = jest.fn().mockRejectedValue(new Error("ECONNREFUSED"));
      global.fetch = fetchMock as unknown as typeof fetch;

      const { client } = newClient();
      await expect(client.resolvePlayer("yx-1")).resolves.toBeNull();
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    test.each([
      ["a profile-shaped body", { xp: 0, is_citizen: true }],
      ["a non-UUID playerId", { playerId: "yx-1", isCitizen: false }],
      ["a non-boolean isCitizen", { playerId: PLAYER_ID, isCitizen: "true" }],
    ])("returns null on an invalid response: %s", async (_label, body) => {
      global.fetch = jest
        .fn()
        .mockResolvedValue(jsonResponse(200, body)) as unknown as typeof fetch;

      const { client, child } = newClient();
      await expect(client.resolvePlayer("yx-1")).resolves.toBeNull();
      expect(child.warn).toHaveBeenCalledWith(
        expect.stringContaining("resolve response failed validation"),
      );
    });

    test("returns null for a json() that throws", async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => {
          throw new Error("bad json");
        },
      }) as unknown as typeof fetch;

      const { client } = newClient();
      await expect(client.resolvePlayer("yx-1")).resolves.toBeNull();
    });

    test("an over-long (129-char) id is refused before any fetch, logging its length only", async () => {
      const fetchMock = jest.fn();
      global.fetch = fetchMock as unknown as typeof fetch;
      const longId = `${SYNTHETIC_ID}${"x".repeat(129 - SYNTHETIC_ID.length)}`;

      const { client, child } = newClient();
      await expect(client.resolvePlayer(longId)).resolves.toBeNull();
      expect(fetchMock).not.toHaveBeenCalled();
      expect(child.warn).toHaveBeenCalledWith(
        expect.stringContaining("length 129"),
      );
      expect(loggedText(child)).not.toContain(SYNTHETIC_ID);
    });

    test("no log line on any failure path carries the platform id or the player id", async () => {
      const { client, child } = newClient();
      const scripted = [
        jsonResponse(500, {}),
        jsonResponse(400, {}),
        jsonResponse(200, { playerId: PLAYER_ID, isCitizen: "no" }),
      ];
      for (const response of scripted) {
        global.fetch = jest
          .fn()
          .mockResolvedValue(response) as unknown as typeof fetch;
        await client.resolvePlayer(SYNTHETIC_ID);
      }
      global.fetch = jest
        .fn()
        .mockRejectedValue(
          new Error("ECONNREFUSED"),
        ) as unknown as typeof fetch;
      await client.resolvePlayer(SYNTHETIC_ID);

      const text = loggedText(child);
      expect(text).not.toContain(SYNTHETIC_ID);
      expect(text).not.toContain(PLAYER_ID);
    });
  });

  test("isolates a non-UUID playerId so it can't poison the batch (P1)", async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      jsonResponse(200, {
        results: [
          { gameId: "game-1", playerId: OTHER_PLAYER_ID, status: "credited" },
        ],
      }),
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const { client, child } = newClient();
    await client.creditMatch([
      matchCredit({ playerId: "not-a-uuid-zz0272" }),
      matchCredit({ playerId: OTHER_PLAYER_ID }),
    ]);

    // The bad item is dropped before POST; the valid player is still credited.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.credits).toEqual([
      { gameId: "game-1", playerId: OTHER_PLAYER_ID, xpAwarded: 10 },
    ]);
    expect(child.warn).toHaveBeenCalledWith(
      expect.stringContaining("dropping invalid credit item"),
    );
    expect(loggedText(child)).not.toContain("zz0272");
    expect(loggedText(child)).not.toContain(OTHER_PLAYER_ID);
  });

  test("skips the POST entirely when every item is invalid", async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    const { client } = newClient();
    await client.creditMatch([matchCredit({ playerId: "not-a-uuid" })]);

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
