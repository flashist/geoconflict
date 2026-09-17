/**
 * @jest-environment jsdom
 */
// The client login session (task 0273, S4): one POST /v1/login per logged-in page
// load, a memory-only Bearer token, and the 401 → re-login → retry refresh path.
// Every test here is written against a mutation it must catch — see the plan's
// §4.4 step 1 table.

jest.mock("../../src/client/flashist/FlashistFacade", () => ({
  FlashistFacade: {
    instance: {
      isYandexAuthorized: jest.fn(),
      getYandexUniqueId: jest.fn(),
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

jest.mock("../../src/core/configuration/ConfigLoader", () => ({
  getServerConfigFromClient: jest.fn(),
}));

import {
  FlashistFacade,
  flashist_logEventAnalytics,
} from "../../src/client/flashist/FlashistFacade";
import { PROFILE_LOGIN_RESTART_LATCH_KEY } from "../../src/client/GameRestart";
import {
  ensureSession,
  getLoginOutcome,
  profileFetch,
  resetProfileSessionForTests,
  startProfileSession,
} from "../../src/client/ProfileSession";
import { getServerConfigFromClient } from "../../src/core/configuration/ConfigLoader";

const isYandexAuthorized = FlashistFacade.instance
  .isYandexAuthorized as jest.Mock;
const getYandexUniqueId = FlashistFacade.instance
  .getYandexUniqueId as jest.Mock;
const getServerConfig = getServerConfigFromClient as jest.Mock;
const logEventAnalytics = flashist_logEventAnalytics as jest.Mock;

const BASE = "https://api.example.test";
const YANDEX_ID = "yandex-0273-a";
const TOKEN = "v1.payload-a.mac-a";
const TOKEN_B = "v1.payload-b.mac-b";
/** Only ever handed out by a THIRD login — which no correct path makes. */
const TOKEN_C = "v1.payload-c.mac-c";

function loginBody(token = TOKEN, created = false) {
  return {
    created,
    profile: {
      schema_version: 1,
      xp: 0,
      is_citizen: false,
      citizenship_earned_at: null,
      display_name: null,
      created_at: "2026-09-16T00:00:00.000Z",
      updated_at: "2026-09-16T00:00:00.000Z",
    },
    grantChecks: { tenure: "pending" },
    session: { token, expiresAt: "2026-09-17T00:00:00.000Z" },
  };
}

interface Call {
  url: string;
  init: RequestInit;
}

interface RouteAnswer {
  status: number;
  body?: unknown;
}

/** Route a fetch stub by URL; a route answers (status, body), now or later. */
function routedFetch(
  routes: Record<string, (call: Call) => RouteAnswer | Promise<RouteAnswer>>,
): jest.Mock & { calls: Call[] } {
  const calls: Call[] = [];
  const mock = jest.fn(async (url: string, init: RequestInit = {}) => {
    calls.push({ url, init });
    const path = url.slice(BASE.length);
    const route = routes[path];
    if (route === undefined) {
      throw new Error(`unrouted fetch: ${url}`);
    }
    const answer = await route({ url, init });
    return {
      ok: answer.status >= 200 && answer.status < 300,
      status: answer.status,
      json: async () => answer.body,
    };
  });
  global.fetch = mock as unknown as typeof fetch;
  return Object.assign(mock, { calls }) as jest.Mock & { calls: Call[] };
}

function loginCalls(mock: { calls: Call[] }): Call[] {
  return mock.calls.filter((call) => call.url.endsWith("/v1/login"));
}

function headerOf(call: Call, name: string): string | undefined {
  const headers = (call.init.headers ?? {}) as Record<string, string>;
  return headers[name];
}

beforeEach(() => {
  jest.clearAllMocks();
  resetProfileSessionForTests();
  localStorage.clear();
  sessionStorage.clear();
  isYandexAuthorized.mockResolvedValue(true);
  getYandexUniqueId.mockResolvedValue(YANDEX_ID);
  getServerConfig.mockResolvedValue({ profileApiUrl: () => BASE });
});

afterEach(() => {
  delete (global as { fetch?: unknown }).fetch;
  jest.useRealTimers();
});

describe("startProfileSession / ensureSession — who logs in", () => {
  // Mutation: remove the isYandexAuthorized check → this goes red.
  it("makes no call at all for a guest", async () => {
    isYandexAuthorized.mockResolvedValue(false);
    const fetchMock = routedFetch({});

    await startProfileSession();
    await expect(ensureSession()).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(logEventAnalytics).not.toHaveBeenCalled();
  });

  it("makes no call when there is no Yandex id", async () => {
    getYandexUniqueId.mockResolvedValue(null);
    const fetchMock = routedFetch({});

    await startProfileSession();
    await expect(ensureSession()).resolves.toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // Mutation: drop the shared in-flight promise → four logins, red.
  it("logs in exactly once for the boot kick-off plus three simultaneous callers", async () => {
    const fetchMock = routedFetch({
      "/v1/login": () => ({ status: 200, body: loginBody() }),
    });

    const all = await Promise.all([
      startProfileSession(),
      ensureSession(),
      ensureSession(),
      ensureSession(),
    ]);

    expect(loginCalls(fetchMock)).toHaveLength(1);
    expect(all.slice(1)).toEqual([TOKEN, TOKEN, TOKEN]);
    const login = loginCalls(fetchMock)[0];
    expect(login.init.method).toBe("POST");
    expect(JSON.parse(login.init.body as string)).toEqual({
      platform: "yandex_games",
      platformUserId: YANDEX_ID,
    });
    // The login itself must never carry a Bearer header.
    expect(headerOf(login, "Authorization")).toBeUndefined();
    expect(logEventAnalytics).toHaveBeenCalledWith("Profile:Login:Succeeded");
  });

  it("re-uses the held token on a later call without a second login", async () => {
    const fetchMock = routedFetch({
      "/v1/login": () => ({ status: 200, body: loginBody() }),
    });

    await expect(ensureSession()).resolves.toBe(TOKEN);
    await expect(ensureSession()).resolves.toBe(TOKEN);
    expect(loginCalls(fetchMock)).toHaveLength(1);
  });

  it("fires Profile:Login:Created in addition on a brand-new player", async () => {
    routedFetch({
      "/v1/login": () => ({ status: 200, body: loginBody(TOKEN, true) }),
    });

    await ensureSession();
    expect(logEventAnalytics).toHaveBeenCalledWith("Profile:Login:Succeeded");
    expect(logEventAnalytics).toHaveBeenCalledWith("Profile:Login:Created");
  });

  // Mutation: remove the id comparison → the stale token is reused, red.
  it("discards the token when the Yandex id changes", async () => {
    const fetchMock = routedFetch({
      "/v1/login": (call) => ({
        status: 200,
        body: loginBody(
          JSON.parse(call.init.body as string).platformUserId === YANDEX_ID
            ? TOKEN
            : TOKEN_B,
        ),
      }),
    });

    await expect(ensureSession()).resolves.toBe(TOKEN);
    getYandexUniqueId.mockResolvedValue("yandex-0273-b");
    await expect(ensureSession()).resolves.toBe(TOKEN_B);
    expect(loginCalls(fetchMock)).toHaveLength(2);
  });

  // Mutation: remove the try/catch around the config read → the rejection escapes.
  it("never logs in when the profile API is unconfigured (empty base)", async () => {
    getServerConfig.mockResolvedValue({ profileApiUrl: () => "" });
    const fetchMock = routedFetch({});

    await expect(ensureSession()).resolves.toBeNull();
    await expect(
      profileFetch("/v1/profile", { timeoutMs: 100 }),
    ).resolves.toEqual({ kind: "unconfigured" });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(logEventAnalytics).not.toHaveBeenCalled();
  });

  it("never logs in when the config read rejects", async () => {
    getServerConfig.mockRejectedValue(new Error("/api/env down"));
    const fetchMock = routedFetch({});

    await expect(ensureSession()).resolves.toBeNull();
    await expect(
      profileFetch("/v1/profile", { timeoutMs: 100 }),
    ).resolves.toEqual({ kind: "unconfigured" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("startProfileSession resolves (never rejects) when the login blows up", async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValue(new Error("boom")) as unknown as typeof fetch;

    await expect(startProfileSession()).resolves.toBeUndefined();
  });
});

describe("login failures — fail soft, one event each", () => {
  // Mutation: swallow the event, or let the rejection escape → red.
  it.each<[string, number, unknown, string]>([
    [
      "503 session_unavailable",
      503,
      { error: "session_unavailable" },
      "Profile:Login:Failed:Unavailable",
    ],
    [
      "503 creation_paused (S5)",
      503,
      { error: "creation_paused" },
      "Profile:Login:Failed:Unavailable",
    ],
    ["500", 500, { error: "internal_error" }, "Profile:Login:Failed:Error"],
    ["400", 400, { error: "bad_request" }, "Profile:Login:Failed:Error"],
    ["a malformed 200 body", 200, { nope: true }, "Profile:Login:Failed:Error"],
  ])("%s → no session, exactly one %s", async (_label, status, body, event) => {
    routedFetch({ "/v1/login": () => ({ status, body }) });

    await expect(ensureSession()).resolves.toBeNull();
    expect(logEventAnalytics).toHaveBeenCalledTimes(1);
    expect(logEventAnalytics).toHaveBeenCalledWith(event);
  });

  it("a network error → no session, exactly one Profile:Login:Failed:Error", async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValue(new Error("network down")) as unknown as typeof fetch;

    await expect(ensureSession()).resolves.toBeNull();
    expect(logEventAnalytics).toHaveBeenCalledTimes(1);
    expect(logEventAnalytics).toHaveBeenCalledWith(
      "Profile:Login:Failed:Error",
    );
  });

  it("a timeout → no session, exactly one Profile:Login:Failed:Timeout", async () => {
    jest.useFakeTimers();
    global.fetch = jest.fn(
      (_url: string, init: RequestInit = {}) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener("abort", () =>
            reject(new DOMException("aborted", "AbortError")),
          );
        }),
    ) as unknown as typeof fetch;

    const pending = ensureSession();
    await jest.advanceTimersByTimeAsync(5000);
    await expect(pending).resolves.toBeNull();
    expect(logEventAnalytics).toHaveBeenCalledTimes(1);
    expect(logEventAnalytics).toHaveBeenCalledWith(
      "Profile:Login:Failed:Timeout",
    );
  });

  // [D3] Mutation: restore the on-demand retry → more than one login, red.
  it("never retries after a failed login for the rest of the page load", async () => {
    const fetchMock = routedFetch({
      "/v1/login": () => ({ status: 500, body: { error: "internal_error" } }),
    });

    await expect(ensureSession()).resolves.toBeNull();
    await expect(ensureSession()).resolves.toBeNull();
    await expect(ensureSession()).resolves.toBeNull();
    await expect(ensureSession()).resolves.toBeNull();
    expect(loginCalls(fetchMock)).toHaveLength(1);
    // And the failure event is not re-fired on each later call.
    expect(logEventAnalytics).toHaveBeenCalledTimes(1);
  });

  it("a failed login makes profileFetch report no_session, never unconfigured", async () => {
    routedFetch({
      "/v1/login": () => ({ status: 500, body: { error: "internal_error" } }),
    });

    await expect(
      profileFetch("/v1/profile", { timeoutMs: 100 }),
    ).resolves.toEqual({ kind: "no_session" });
  });
});

describe("profileFetch — Bearer and the 401 refresh", () => {
  // Mutation: change the prefix spelling → red (S2 parses strictly).
  it("sends exactly `Bearer <token>`", async () => {
    const fetchMock = routedFetch({
      "/v1/login": () => ({ status: 200, body: loginBody() }),
      "/v1/profile": () => ({ status: 200, body: { ok: true } }),
    });

    const result = await profileFetch("/v1/profile", { timeoutMs: 100 });
    expect(result.kind).toBe("response");
    const profileCall = fetchMock.calls.find((call) =>
      call.url.endsWith("/v1/profile"),
    )!;
    expect(headerOf(profileCall, "Authorization")).toBe(`Bearer ${TOKEN}`);
    // The id must never travel in a URL or body again.
    expect(profileCall.url).toBe(`${BASE}/v1/profile`);
  });

  it("reports network_error on a transport failure of the request itself", async () => {
    let loggedIn = false;
    global.fetch = jest.fn(async (url: string) => {
      if (url.endsWith("/v1/login")) {
        loggedIn = true;
        return {
          ok: true,
          status: 200,
          json: async () => loginBody(),
        } as unknown as Response;
      }
      throw new Error("network down");
    }) as unknown as typeof fetch;

    await expect(
      profileFetch("/v1/profile", { timeoutMs: 100 }),
    ).resolves.toEqual({ kind: "network_error" });
    expect(loggedIn).toBe(true);
  });

  // Mutation: turn the retry into a loop → more than 2 of each, red.
  it("a permanent 401 costs exactly two logins and two requests, and the 401 is returned", async () => {
    const fetchMock = routedFetch({
      "/v1/login": () => ({ status: 200, body: loginBody() }),
      "/v1/profile": () => ({
        status: 401,
        body: { error: "session_invalid" },
      }),
    });

    const result = await profileFetch("/v1/profile", { timeoutMs: 100 });
    expect(result.kind).toBe("response");
    expect(result.kind === "response" ? result.response.status : null).toBe(
      401,
    );
    expect(loginCalls(fetchMock)).toHaveLength(2);
    expect(
      fetchMock.calls.filter((call) => call.url.endsWith("/v1/profile")),
    ).toHaveLength(2);
    expect(logEventAnalytics).toHaveBeenCalledWith("Profile:Session:Relogin");
  });

  it("a 401 that a re-login fixes retries once and succeeds", async () => {
    let logins = 0;
    const fetchMock = routedFetch({
      "/v1/login": () => {
        logins += 1;
        return { status: 200, body: loginBody(logins === 1 ? TOKEN : TOKEN_B) };
      },
      "/v1/profile": (call) =>
        headerOf(call, "Authorization") === `Bearer ${TOKEN_B}`
          ? { status: 200, body: { ok: true } }
          : { status: 401, body: { error: "session_expired" } },
    });

    const result = await profileFetch("/v1/profile", { timeoutMs: 100 });
    expect(result.kind === "response" && result.response.status).toBe(200);
    expect(loginCalls(fetchMock)).toHaveLength(2);
  });

  /**
   * Only `Bearer TOKEN_B` is accepted — the token the SECOND (and only correct)
   * login hands out. TOKEN is the stale one; TOKEN_C means a third login happened.
   */
  function onlySecondTokenWorks(call: Call): RouteAnswer {
    return headerOf(call, "Authorization") === `Bearer ${TOKEN_B}`
      ? { status: 200, body: { ok: true } }
      : { status: 401, body: { error: "session_expired" } };
  }

  function reloginEvents(): unknown[][] {
    return logEventAnalytics.mock.calls.filter(
      (call: unknown[]) => call[0] === "Profile:Session:Relogin",
    );
  }

  // Both routes must really 401, so BOTH callers really reach the re-login path.
  // (Round-1 review R2: the old version asked for an unrouted /v1/messages, which
  // became a network_error, so the second caller never 401'd at all.)
  // Mutation: fire Profile:Session:Relogin outside the discard → two events, red (R1).
  it("two simultaneous 401s on the same stale token share ONE re-login and fire ONE event", async () => {
    let logins = 0;
    const fetchMock = routedFetch({
      "/v1/login": async () => {
        logins += 1;
        // Span a macrotask so BOTH callers have hit their 401 before the
        // re-login resolves — that is what makes them genuinely simultaneous.
        await new Promise((resolve) => setTimeout(resolve, 0));
        return { status: 200, body: loginBody(logins === 1 ? TOKEN : TOKEN_B) };
      },
      "/v1/profile": onlySecondTokenWorks,
      "/v1/messages": onlySecondTokenWorks,
    });

    // Prime the session so both callers start from the SAME stale token.
    await ensureSession();
    const [first, second] = await Promise.all([
      profileFetch("/v1/profile", { timeoutMs: 100 }),
      profileFetch("/v1/messages", { timeoutMs: 100 }),
    ]);

    expect(first.kind === "response" && first.response.status).toBe(200);
    expect(second.kind === "response" && second.response.status).toBe(200);
    expect(loginCalls(fetchMock)).toHaveLength(2);
    expect(reloginEvents()).toHaveLength(1);
  });

  // ⚠️ Mutation: drop the stale-token comparison in relogin() → the late caller
  // discards a GOOD token and starts a THIRD login → red on both assertions.
  // This is the case that comparison exists for; nothing else covers it.
  it("a 401 on an already-replaced token re-uses the fresh one — no second re-login", async () => {
    let logins = 0;
    let announceMessagesSent: () => void = () => {};
    const messagesSent = new Promise<void>((resolve) => {
      announceMessagesSent = resolve;
    });
    let releaseMessages: () => void = () => {};
    const messagesHeld = new Promise<void>((resolve) => {
      releaseMessages = resolve;
    });
    const fetchMock = routedFetch({
      "/v1/login": () => {
        logins += 1;
        const tokens = [TOKEN, TOKEN_B, TOKEN_C];
        return { status: 200, body: loginBody(tokens[logins - 1] ?? TOKEN_C) };
      },
      "/v1/profile": onlySecondTokenWorks,
      "/v1/messages": async (call) => {
        announceMessagesSent();
        await messagesHeld;
        return onlySecondTokenWorks(call);
      },
    });

    await ensureSession();
    // The inbox call goes out carrying the stale token, then is held.
    const inbox = profileFetch("/v1/messages", { timeoutMs: 100 });
    await messagesSent;
    // The profile call 401s and completes its re-login first: the session now
    // holds TOKEN_B while the inbox call is still out on TOKEN.
    const profile = await profileFetch("/v1/profile", { timeoutMs: 100 });
    expect(profile.kind === "response" && profile.response.status).toBe(200);

    releaseMessages();
    const second = await inbox;

    expect(second.kind === "response" && second.response.status).toBe(200);
    expect(loginCalls(fetchMock)).toHaveLength(2);
    expect(reloginEvents()).toHaveLength(1);
  });

  it("a 401 for a guest (no session) never happens — no_session comes first", async () => {
    isYandexAuthorized.mockResolvedValue(false);
    const fetchMock = routedFetch({});

    await expect(
      profileFetch("/v1/profile", { timeoutMs: 100 }),
    ).resolves.toEqual({ kind: "no_session" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("the token is never persisted", () => {
  // Mutation: any storage or cookie write → red.
  it("never reaches Storage.prototype.setItem or document.cookie", async () => {
    const setItem = jest.spyOn(Storage.prototype, "setItem");
    const cookieWrites: string[] = [];
    Object.defineProperty(document, "cookie", {
      configurable: true,
      get: () => "",
      set: (value: string) => {
        cookieWrites.push(value);
      },
    });
    routedFetch({
      "/v1/login": () => ({ status: 200, body: loginBody() }),
      "/v1/profile": () => ({ status: 200, body: { ok: true } }),
    });

    await profileFetch("/v1/profile", { timeoutMs: 100 });

    const stored = setItem.mock.calls.map((call) => String(call[1])).join("|");
    expect(stored).not.toContain(TOKEN);
    expect(cookieWrites.join("|")).not.toContain(TOKEN);
    setItem.mockRestore();
  });
});

describe("getLoginOutcome — the seam task 0253 consumes", () => {
  it("returns created and grantChecks, and never the token", async () => {
    routedFetch({
      "/v1/login": () => ({ status: 200, body: loginBody(TOKEN, true) }),
    });

    const outcome = await getLoginOutcome();
    expect(outcome).toEqual({
      created: true,
      grantChecks: { tenure: "pending" },
    });
    expect(JSON.stringify(outcome)).not.toContain(TOKEN);
  });

  it("returns null when there is no session", async () => {
    isYandexAuthorized.mockResolvedValue(false);
    routedFetch({});

    await expect(getLoginOutcome()).resolves.toBeNull();
  });

  // Mutation this actually catches: drop `outcome = null` where relogin()
  // discards the stale token → the PREVIOUS login's outcome is handed to 0253
  // while there is no session, red (R5; verified by the round-2 reviewer's M3).
  //
  // ⛔ It is NOT a guard on a clear inside login()'s failure path, and that line
  // must not be re-added: login() is only ever reached with `session === null`
  // (one call site), and all three `session = null` sites clear `outcome` with it
  // and with no await between — so `session === null ⟺ outcome === null` already
  // holds and the line is unreachable. Re-adding it was mutation-tested twice
  // (round 1, and the reviewer's M5) and changed nothing either time.
  it("returns null after a re-login fails, not the previous login's outcome", async () => {
    let logins = 0;
    routedFetch({
      "/v1/login": () => {
        logins += 1;
        return logins === 1
          ? { status: 200, body: loginBody(TOKEN, true) }
          : { status: 500, body: { error: "internal_error" } };
      },
      "/v1/profile": () => ({
        status: 401,
        body: { error: "session_expired" },
      }),
    });

    await expect(getLoginOutcome()).resolves.toEqual({
      created: true,
      grantChecks: { tenure: "pending" },
    });
    // The held token is rejected; the re-login it triggers fails (D3 latches).
    await profileFetch("/v1/profile", { timeoutMs: 100 });

    await expect(getLoginOutcome()).resolves.toBeNull();
  });

  // Mutation: drop `outcome = null` where a changed Yandex id discards the
  // session → account A's outcome is readable while logged in as nobody, red (R5).
  it("returns null once the Yandex id changes and no new session is obtained", async () => {
    routedFetch({
      "/v1/login": () => ({ status: 200, body: loginBody(TOKEN, true) }),
    });

    await expect(getLoginOutcome()).resolves.toEqual({
      created: true,
      grantChecks: { tenure: "pending" },
    });

    getYandexUniqueId.mockResolvedValue("yandex-0273-b");
    getServerConfig.mockResolvedValue({ profileApiUrl: () => "" });

    await expect(getLoginOutcome()).resolves.toBeNull();
  });
});

describe("the restart latch", () => {
  // Mutation: drop the clear → a second in-page restart is refused forever.
  it("is cleared by a successful login", async () => {
    sessionStorage.setItem(PROFILE_LOGIN_RESTART_LATCH_KEY, "1");
    routedFetch({ "/v1/login": () => ({ status: 200, body: loginBody() }) });

    await ensureSession();
    expect(sessionStorage.getItem(PROFILE_LOGIN_RESTART_LATCH_KEY)).toBeNull();
  });

  it("is left alone by a failed login", async () => {
    sessionStorage.setItem(PROFILE_LOGIN_RESTART_LATCH_KEY, "1");
    routedFetch({
      "/v1/login": () => ({ status: 500, body: { error: "internal_error" } }),
    });

    await ensureSession();
    expect(sessionStorage.getItem(PROFILE_LOGIN_RESTART_LATCH_KEY)).toBe("1");
  });

  it("survives sessionStorage throwing on removal", async () => {
    const removeItem = jest
      .spyOn(Storage.prototype, "removeItem")
      .mockImplementation(() => {
        throw new Error("storage disabled");
      });
    routedFetch({ "/v1/login": () => ({ status: 200, body: loginBody() }) });

    await expect(ensureSession()).resolves.toBe(TOKEN);
    removeItem.mockRestore();
  });
});
