// Shared Telegram send helper (task 0067). A src/core/ change, so it must be
// tested (project rule). undici is mocked at module level — the established
// convention; nothing here ever touches the network.

const fetchMock = jest.fn();
const proxyAgentCtor = jest.fn();

jest.mock("undici", () => ({
  fetch: (...args: unknown[]) => fetchMock(...args),
  ProxyAgent: class {
    constructor(url: string) {
      proxyAgentCtor(url);
    }
  },
}));

import {
  escapeTelegramHtml,
  sendTelegramMessage,
} from "../../src/core/notifications/TelegramNotifier";

const CONFIG = {
  token: "test-token",
  chatId: "-100123",
  proxyUrl: "http://proxy.test:3128",
};

describe("sendTelegramMessage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetchMock.mockResolvedValue({ ok: true, status: 200 });
  });

  it("posts to the bot's sendMessage endpoint with the chat id and HTML mode", async () => {
    await expect(sendTelegramMessage(CONFIG, "hello")).resolves.toEqual({
      result: "sent",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [
      string,
      { method: string; body: string },
    ];
    expect(url).toBe("https://api.telegram.org/bottest-token/sendMessage");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({
      chat_id: "-100123",
      text: "hello",
      parse_mode: "HTML",
    });
  });

  it("routes through the proxy when one is configured", async () => {
    // A URL of its own: agents are cached per URL for the life of the module, so
    // a shared URL would already be warm from an earlier test in this file.
    const proxyUrl = "http://proxy-routes.test:3128";
    await sendTelegramMessage({ ...CONFIG, proxyUrl }, "hi");
    // api.telegram.org is blocked from Russian IPs — the proxy is load-bearing.
    expect(proxyAgentCtor).toHaveBeenCalledWith(proxyUrl);
    const [, init] = fetchMock.mock.calls[0] as [
      string,
      { dispatcher?: unknown },
    ];
    expect(init.dispatcher).toBeDefined();
  });

  it("builds ONE ProxyAgent per URL and reuses it across sends", async () => {
    // Constructing one per send leaks the dispatcher and its keep-alive socket
    // pool; src/server/Master.ts:213 hoists a single agent for the same reason.
    const proxyUrl = "http://proxy-reuse.test:3128";
    await sendTelegramMessage({ ...CONFIG, proxyUrl }, "one");
    await sendTelegramMessage({ ...CONFIG, proxyUrl }, "two");
    expect(proxyAgentCtor).toHaveBeenCalledTimes(1);
    const dispatchers = fetchMock.mock.calls.map(
      (call) => (call[1] as { dispatcher?: unknown }).dispatcher,
    );
    expect(dispatchers[0]).toBe(dispatchers[1]);
  });

  it("sends without a dispatcher when no proxy is configured", async () => {
    await sendTelegramMessage({ ...CONFIG, proxyUrl: "" }, "hi");
    expect(proxyAgentCtor).not.toHaveBeenCalled();
    const [, init] = fetchMock.mock.calls[0] as [
      string,
      { dispatcher?: unknown },
    ];
    expect(init.dispatcher).toBeUndefined();
  });

  it("does not call out at all when the token or chat id is blank", async () => {
    await expect(
      sendTelegramMessage({ ...CONFIG, token: "" }, "hi"),
    ).resolves.toEqual({ result: "not_configured" });
    await expect(
      sendTelegramMessage({ ...CONFIG, chatId: "" }, "hi"),
    ).resolves.toEqual({ result: "not_configured" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reports a non-OK response without throwing, carrying the status", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 403 });
    await expect(sendTelegramMessage(CONFIG, "hi")).resolves.toEqual({
      result: "http_error",
      status: 403,
    });
  });

  it("NEVER throws on a network failure — every caller is best-effort", async () => {
    fetchMock.mockRejectedValue(new Error("ECONNREFUSED"));
    const outcome = await sendTelegramMessage(CONFIG, "hi");
    expect(outcome.result).toBe("network_error");
  });

  it("passes an abort signal so a blocked host cannot hang the caller", async () => {
    await sendTelegramMessage(CONFIG, "hi");
    const [, init] = fetchMock.mock.calls[0] as [string, { signal?: unknown }];
    expect(init.signal).toBeDefined();
  });

  // ── Task 0277 step 1: forum topic routing ────────────────────────────────
  // The chat is a forum group. `message_thread_id` picks the topic; omitting it
  // lands the message in General, which is today's behaviour and the ONLY profile-box
  // Telegram path proven working in production.
  it("carries message_thread_id when a topic is configured", async () => {
    await sendTelegramMessage({ ...CONFIG, threadId: "42" }, "hi");
    const [, init] = fetchMock.mock.calls[0] as [string, { body: string }];
    expect(JSON.parse(init.body).message_thread_id).toBe("42");
  });

  // ⚠️ The mutation this exists to catch is `message_thread_id: config.threadId ?? ""`.
  // Telegram REJECTS an empty thread id, so a present-but-empty key would break every
  // name-change notification — the one path that only started working today.
  it.each([
    ["absent", undefined],
    ["null", null],
    ["blank", ""],
  ])(
    "omits message_thread_id entirely when the topic is %s",
    async (_label, threadId) => {
      await sendTelegramMessage(
        { ...CONFIG, threadId: threadId as string | null | undefined },
        "hi",
      );
      const [, init] = fetchMock.mock.calls[0] as [string, { body: string }];
      expect(Object.keys(JSON.parse(init.body))).not.toContain(
        "message_thread_id",
      );
    },
  );

  // ── Task 0277 step 2: one retry on a connection-level failure (task 0061) ──
  // The classification is STRUCTURAL, not diagnostic: a Telegram rejection is an HTTP
  // response, so `fetch` RESOLVES and never reaches the catch. Reaching the catch is
  // itself the proof that no response arrived.
  it("retries once when the first attempt fails at the connection level", async () => {
    fetchMock
      .mockRejectedValueOnce(new Error("socket hang up"))
      .mockResolvedValueOnce({ ok: true, status: 200 });
    await expect(sendTelegramMessage(CONFIG, "hi")).resolves.toEqual({
      result: "sent_after_retry",
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does NOT retry a Telegram rejection — it already answered", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 400 });
    const outcome = await sendTelegramMessage(CONFIG, "hi");
    expect(outcome.result).toBe("http_error");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("gives up after exactly two attempts and leaks no token", async () => {
    fetchMock.mockRejectedValue(
      new Error("failed to fetch https://api.telegram.org/bottest-token/…"),
    );
    const outcome = await sendTelegramMessage(CONFIG, "hi");
    expect(outcome.result).toBe("network_error");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(outcome)).not.toContain("test-token");
  });

  // ── Task 0277 step 3: the bounded cause code (task 0061 step 1) ───────────
  // The module's total discard of the caught error is relaxed by EXACTLY one field,
  // `error.cause.code`, and only when it matches a symbolic-constant charset. The
  // error, its message and its stack are still never read and never logged.
  it("reports the transport cause code when it is a symbolic constant", async () => {
    const error = new Error("fetch failed");
    (error as { cause?: unknown }).cause = { code: "ECONNRESET" };
    fetchMock.mockRejectedValue(error);
    const outcome = await sendTelegramMessage(CONFIG, "hi");
    expect(outcome.code).toBe("ECONNRESET");
  });

  // ⚠️ This test is the ENTIRE justification for relaxing the discard. Without it the
  // relaxation is an unguarded passthrough of an attacker- or vendor-controlled string
  // into a log line, which is the exact token leak the module header forbids.
  it.each([
    [
      "a URL carrying the token",
      "https://api.telegram.org/bottest-token/sendMessage",
    ],
    ["the bare token", "test-token"],
    ["free text", "connect ECONNREFUSED 10.0.0.1:3128"],
    ["an over-long constant", "A".repeat(64)],
    ["a lowercase code", "econnreset"],
  ])('collapses %s to "unknown"', async (_label, code) => {
    const error = new Error("fetch failed");
    (error as { cause?: unknown }).cause = { code };
    fetchMock.mockRejectedValue(error);
    const outcome = await sendTelegramMessage(CONFIG, "hi");
    expect(outcome.code).toBe("unknown");
    expect(JSON.stringify(outcome)).not.toContain("test-token");
  });

  it.each([
    ["no cause at all", (e: Error) => e],
    ["a string cause", (e: Error) => Object.assign(e, { cause: "nope" })],
    ["a cause with no code", (e: Error) => Object.assign(e, { cause: {} })],
    [
      "a non-string code",
      (e: Error) => Object.assign(e, { cause: { code: 500 } }),
    ],
  ])(
    'reports "unknown" and does not throw for %s',
    async (_label, decorate) => {
      fetchMock.mockRejectedValue(decorate(new Error("fetch failed")));
      const outcome = await sendTelegramMessage(CONFIG, "hi");
      expect(outcome.result).toBe("network_error");
      expect(outcome.code).toBe("unknown");
    },
  );

  it("never returns the token in any result value", async () => {
    fetchMock.mockRejectedValue(
      // A fixture, and deliberately a hostile one: undici puts a whole input URL into
      // a TypeError message in at least one construction (lib/web/fetch/request.js:136),
      // and this URL carries the token in its path. ⚠️ No real log has ever been
      // observed carrying it — that stronger claim was retracted. This pins the
      // invariant regardless of which undici shape shows up.
      new Error("failed to fetch https://api.telegram.org/bottest-token/…"),
    );
    const outcome = await sendTelegramMessage(CONFIG, "hi");
    expect(outcome.result).toBe("network_error");
    expect(JSON.stringify(outcome)).not.toContain("test-token");
  });
});

describe("escapeTelegramHtml", () => {
  it("escapes the characters HTML parse_mode treats as markup", () => {
    expect(escapeTelegramHtml("<b>&</b>")).toBe("&lt;b&gt;&amp;&lt;/b&gt;");
  });

  it("escapes & first so an escaped entity is not double-mangled", () => {
    expect(escapeTelegramHtml("a & <b")).toBe("a &amp; &lt;b");
  });

  it("leaves an ordinary player name untouched", () => {
    expect(escapeTelegramHtml("Игрок_123")).toBe("Игрок_123");
  });
});
