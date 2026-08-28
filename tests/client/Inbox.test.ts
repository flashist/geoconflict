/**
 * @jest-environment jsdom
 */
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
      INBOX_OPENED: "Inbox:Opened",
      INBOX_LOAD_FAILED: "Inbox:LoadFailed",
    },
    features: {
      CITIZENSHIP_CARD_ENABLED: true,
    },
  },
}));

jest.mock("../../src/core/configuration/ConfigLoader", () => ({
  getServerConfigFromClient: jest.fn(),
}));

jest.mock("../../src/client/Utils", () => ({
  // Minimal stand-in for the ICU-backed translateText: `{param}` substitution.
  translateText: (key: string, params: Record<string, string> = {}) =>
    Object.entries(params).reduce(
      (text, [name, value]) => text.replace(`{${name}}`, value),
      `[${key}]`,
    ),
}));

jest.mock("../../src/client/Announcements", () => ({
  getCurrentAnnouncementLanguage: () => "en",
}));

import { getServerConfigFromClient } from "../../src/core/configuration/ConfigLoader";
import {
  FlashistFacade,
  flashist_logEventAnalytics,
  flashistConstants,
} from "../../src/client/flashist/FlashistFacade";
import {
  INBOX_STATE_CHANGED_EVENT,
  getInboxState,
  loadInboxState,
  markInboxRead,
  refreshInbox,
  renderInboxMessage,
  resetInboxForTests,
} from "../../src/client/Inbox";

const isYandexAuthorized = FlashistFacade.instance
  .isYandexAuthorized as jest.Mock;
const getYandexUniqueId = FlashistFacade.instance
  .getYandexUniqueId as jest.Mock;
const getServerConfig = getServerConfigFromClient as jest.Mock;
const logEventAnalytics = flashist_logEventAnalytics as jest.Mock;

const PROFILE_API_BASE = "https://api.example.test";

function message(id: number, readAt: string | null = null) {
  return {
    id,
    templateKey: "citizenship_earned",
    templateParams: {},
    title: null,
    body: null,
    sentAt: "2026-08-26T10:00:00.000Z",
    readAt,
  };
}

/** Install a global fetch stub resolving to the given status + body. */
function stubFetch(status: number, body: unknown): jest.Mock {
  const fetchMock = jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

const UNAVAILABLE = {
  available: false,
  messages: [],
  unreadCount: 0,
  error: false,
};

describe("loadInboxState", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetInboxForTests();
    flashistConstants.features.CITIZENSHIP_CARD_ENABLED = true;
    getServerConfig.mockResolvedValue({
      profileApiUrl: () => PROFILE_API_BASE,
    });
    isYandexAuthorized.mockResolvedValue(true);
    getYandexUniqueId.mockResolvedValue("yandex-123");
  });

  afterEach(() => {
    delete (global as { fetch?: unknown }).fetch;
  });

  it("is unavailable and never fetches while the launch flag is off", async () => {
    flashistConstants.features.CITIZENSHIP_CARD_ENABLED = false;
    const fetchMock = stubFetch(200, { messages: [message(1)] });
    await expect(loadInboxState()).resolves.toEqual(UNAVAILABLE);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(isYandexAuthorized).not.toHaveBeenCalled();
  });

  it("is unavailable and never fetches for guests", async () => {
    isYandexAuthorized.mockResolvedValue(false);
    const fetchMock = stubFetch(200, { messages: [message(1)] });
    await expect(loadInboxState()).resolves.toEqual(UNAVAILABLE);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("is unavailable when there is no Yandex id or no profile API base", async () => {
    getYandexUniqueId.mockResolvedValue(null);
    const fetchMock = stubFetch(200, { messages: [] });
    await expect(loadInboxState()).resolves.toEqual(UNAVAILABLE);
    expect(fetchMock).not.toHaveBeenCalled();

    resetInboxForTests();
    getYandexUniqueId.mockResolvedValue("yandex-123");
    getServerConfig.mockResolvedValue({ profileApiUrl: () => "" });
    await expect(loadInboxState()).resolves.toEqual(UNAVAILABLE);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(logEventAnalytics).not.toHaveBeenCalled();
  });

  it("treats 403 as the ordinary non-citizen answer (unavailable, no error, no event)", async () => {
    stubFetch(403, { error: "not_citizen" });
    await expect(loadInboxState()).resolves.toEqual(UNAVAILABLE);
    expect(logEventAnalytics).not.toHaveBeenCalled();
  });

  it("loads messages, counts unread, remembers the session and notifies listeners", async () => {
    const fetchMock = stubFetch(200, {
      messages: [
        message(3),
        message(2, "2026-08-26T11:00:00.000Z"),
        message(1),
      ],
    });
    const listener = jest.fn();
    window.addEventListener(INBOX_STATE_CHANGED_EVENT, listener);

    const state = await loadInboxState();
    expect(state.available).toBe(true);
    expect(state.error).toBe(false);
    expect(state.messages.map((m) => m.id)).toEqual([3, 2, 1]);
    expect(state.unreadCount).toBe(2);
    expect(getInboxState()).toBe(state);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      `${PROFILE_API_BASE}/v1/messages?yandexPlayerId=yandex-123`,
      expect.objectContaining({ signal: expect.anything() }),
    );
    window.removeEventListener(INBOX_STATE_CHANGED_EVENT, listener);
  });

  it("reports a failed load (5xx) as error + Inbox:LoadFailed, tab hidden", async () => {
    stubFetch(500, { error: "internal_error" });
    await expect(loadInboxState()).resolves.toEqual({
      ...UNAVAILABLE,
      error: true,
    });
    expect(logEventAnalytics).toHaveBeenCalledTimes(1);
    expect(logEventAnalytics).toHaveBeenCalledWith("Inbox:LoadFailed");
  });

  it("reports a network error / abort as a failed load", async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValue(
        new DOMException("aborted", "AbortError"),
      ) as unknown as typeof fetch;
    await expect(loadInboxState()).resolves.toEqual({
      ...UNAVAILABLE,
      error: true,
    });
    expect(logEventAnalytics).toHaveBeenCalledWith("Inbox:LoadFailed");
  });

  it("reports a malformed body as a failed load", async () => {
    stubFetch(200, { messages: [{ id: "x" }] });
    await expect(loadInboxState()).resolves.toEqual({
      ...UNAVAILABLE,
      error: true,
    });
    expect(logEventAnalytics).toHaveBeenCalledWith("Inbox:LoadFailed");
  });

  it("shares one in-flight fetch between concurrent callers and caches the result", async () => {
    const fetchMock = stubFetch(200, { messages: [message(1)] });
    const [a, b] = await Promise.all([loadInboxState(), loadInboxState()]);
    expect(a).toBe(b);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await loadInboxState(); // cached — no new request
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await refreshInbox(); // explicit refresh — one more request
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("skips ONE message with a template key this bundle does not know; the list survives (review R3)", async () => {
    stubFetch(200, {
      messages: [
        { ...message(3), templateKey: "tournament_invite" },
        message(2),
        message(1, "2026-08-26T11:00:00.000Z"),
      ],
    });
    const state = await loadInboxState();
    expect(state.available).toBe(true);
    expect(state.error).toBe(false);
    expect(state.messages.map((m) => m.id)).toEqual([2, 1]);
    expect(state.unreadCount).toBe(1);
    expect(logEventAnalytics).not.toHaveBeenCalled();
  });
});

// Review R1 — a refresh whose GET was snapshotted before a mark-read landed
// must never roll read messages back to unread.
describe("markInboxRead vs an in-flight refresh (review R1)", () => {
  function deferred<T>() {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>((r) => {
      resolve = r;
    });
    return { promise, resolve };
  }
  function response(body: unknown) {
    return { ok: true, status: 200, json: async () => body };
  }
  // The refresh GET is issued only after the awaited SDK/config lookups, so
  // let the microtask queue drain before counting fetch calls.
  const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

  beforeEach(() => {
    jest.clearAllMocks();
    resetInboxForTests();
    flashistConstants.features.CITIZENSHIP_CARD_ENABLED = true;
    getServerConfig.mockResolvedValue({
      profileApiUrl: () => PROFILE_API_BASE,
    });
    isYandexAuthorized.mockResolvedValue(true);
    getYandexUniqueId.mockResolvedValue("yandex-123");
  });

  afterEach(() => {
    delete (global as { fetch?: unknown }).fetch;
  });

  it("waits for the in-flight refresh before PATCHing (modal open → Personal tab within one round-trip)", async () => {
    stubFetch(200, { messages: [message(1)] });
    await loadInboxState();

    const get = deferred<unknown>();
    const fetchMock = jest
      .fn()
      .mockImplementationOnce(() => get.promise) // the refresh GET
      .mockImplementationOnce(async () => response({ updated: 1 })); // the PATCH
    global.fetch = fetchMock as unknown as typeof fetch;

    const refresh = refreshInbox();
    const mark = markInboxRead();
    await flush();
    // Only the GET has been issued so far — the PATCH waits.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][1].method).toBeUndefined();

    get.resolve(response({ messages: [message(1)] })); // stale: still unread
    await refresh;
    await expect(mark).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][1].method).toBe("PATCH");
    expect(getInboxState().unreadCount).toBe(0);
  });

  it("a refresh started during the PATCH cannot roll read state back (generation merge)", async () => {
    stubFetch(200, { messages: [message(2), message(1)] });
    await loadInboxState();

    const patch = deferred<unknown>();
    const get = deferred<unknown>();
    const fetchMock = jest
      .fn()
      .mockImplementationOnce(() => patch.promise) // the PATCH
      .mockImplementationOnce(() => get.promise); // a refresh (e.g. reconcile)
    global.fetch = fetchMock as unknown as typeof fetch;

    const mark = markInboxRead();
    const refresh = refreshInbox();
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][1].method).toBe("PATCH");

    patch.resolve(response({ updated: 2 }));
    await expect(mark).resolves.toBe(true);
    expect(getInboxState().unreadCount).toBe(0);

    // The GET snapshot predates the PATCH: both still unread server-side.
    get.resolve(response({ messages: [message(2), message(1)] }));
    await refresh;
    const state = getInboxState();
    expect(state.unreadCount).toBe(0);
    expect(state.messages.every((m) => m.readAt !== null)).toBe(true);
  });

  it("a refresh with NO mark-read in between applies the snapshot as-is", async () => {
    stubFetch(200, { messages: [message(1, "2026-08-26T11:00:00.000Z")] });
    await loadInboxState();
    stubFetch(200, { messages: [message(2), message(1)] });
    const state = await refreshInbox();
    expect(state.unreadCount).toBe(2);
  });
});

describe("markInboxRead", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetInboxForTests();
    flashistConstants.features.CITIZENSHIP_CARD_ENABLED = true;
    getServerConfig.mockResolvedValue({
      profileApiUrl: () => PROFILE_API_BASE,
    });
    isYandexAuthorized.mockResolvedValue(true);
    getYandexUniqueId.mockResolvedValue("yandex-123");
  });

  afterEach(() => {
    delete (global as { fetch?: unknown }).fetch;
  });

  async function loadWith(messages: unknown[]) {
    stubFetch(200, { messages });
    await loadInboxState();
  }

  it("returns false and never fetches when the inbox is unavailable", async () => {
    stubFetch(403, { error: "not_citizen" });
    await loadInboxState();
    const fetchMock = stubFetch(200, { updated: 1 });
    await expect(markInboxRead()).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("PATCHes mark-all, mirrors readAt locally, clears the count and notifies", async () => {
    await loadWith([message(2), message(1)]);
    const fetchMock = stubFetch(200, { updated: 2 });
    const listener = jest.fn();
    window.addEventListener(INBOX_STATE_CHANGED_EVENT, listener);

    await expect(markInboxRead()).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      `${PROFILE_API_BASE}/v1/messages/read`,
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ yandexPlayerId: "yandex-123" }),
      }),
    );
    const state = getInboxState();
    expect(state.unreadCount).toBe(0);
    expect(state.messages.every((m) => m.readAt !== null)).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);
    window.removeEventListener(INBOX_STATE_CHANGED_EVENT, listener);
  });

  it("PATCHes a subset and leaves the others unread", async () => {
    await loadWith([message(3), message(2), message(1)]);
    const fetchMock = stubFetch(200, { updated: 1 });
    await expect(markInboxRead([2])).resolves.toBe(true);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      yandexPlayerId: "yandex-123",
      ids: [2],
    });
    const state = getInboxState();
    expect(state.unreadCount).toBe(2);
    expect(state.messages.find((m) => m.id === 2)?.readAt).not.toBeNull();
    expect(state.messages.find((m) => m.id === 3)?.readAt).toBeNull();
  });

  it("is a local no-op (true, no request) when nothing is unread", async () => {
    await loadWith([message(1, "2026-08-26T11:00:00.000Z")]);
    const fetchMock = stubFetch(200, { updated: 0 });
    await expect(markInboxRead()).resolves.toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keeps the state untouched when the PATCH fails", async () => {
    await loadWith([message(1)]);
    stubFetch(500, { error: "internal_error" });
    await expect(markInboxRead()).resolves.toBe(false);
    expect(getInboxState().unreadCount).toBe(1);

    global.fetch = jest
      .fn()
      .mockRejectedValue(new Error("network down")) as unknown as typeof fetch;
    await expect(markInboxRead()).resolves.toBe(false);
    expect(getInboxState().unreadCount).toBe(1);
  });
});

describe("renderInboxMessage", () => {
  it("renders a template through inbox.templates.<key> with its params", () => {
    expect(
      renderInboxMessage({
        id: 1,
        templateKey: "name_change_rejected",
        templateParams: { name: "Alpha", reason: "too short" },
        title: null,
        body: null,
        sentAt: "2026-08-26T10:00:00.000Z",
        readAt: null,
      }),
    ).toEqual({
      title: "[inbox.templates.name_change_rejected.title]",
      body: "[inbox.templates.name_change_rejected.body]",
    });
  });

  it("renders a literal message as stored", () => {
    expect(
      renderInboxMessage({
        id: 1,
        templateKey: null,
        templateParams: {},
        title: "Hello",
        body: "Welcome.",
        sentAt: "2026-08-26T10:00:00.000Z",
        readAt: null,
      }),
    ).toEqual({ title: "Hello", body: "Welcome." });
  });

  it("defaults a missing required param so the ICU source never leaks (review R4)", () => {
    expect(
      renderInboxMessage({
        id: 1,
        templateKey: "name_change_approved",
        templateParams: {},
        title: null,
        body: null,
        sentAt: "2026-08-26T10:00:00.000Z",
        readAt: null,
      }).body,
    ).toBe("[inbox.templates.name_change_approved.body]");
  });
});
