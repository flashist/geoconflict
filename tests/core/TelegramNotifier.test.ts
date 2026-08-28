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
    await expect(sendTelegramMessage(CONFIG, "hello")).resolves.toBe("sent");
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
    ).resolves.toBe("not_configured");
    await expect(
      sendTelegramMessage({ ...CONFIG, chatId: "" }, "hi"),
    ).resolves.toBe("not_configured");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reports a non-OK response without throwing", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 403 });
    await expect(sendTelegramMessage(CONFIG, "hi")).resolves.toBe("http_error");
  });

  it("NEVER throws on a network failure — every caller is best-effort", async () => {
    fetchMock.mockRejectedValue(new Error("ECONNREFUSED"));
    await expect(sendTelegramMessage(CONFIG, "hi")).resolves.toBe(
      "network_error",
    );
  });

  it("passes an abort signal so a blocked host cannot hang the caller", async () => {
    await sendTelegramMessage(CONFIG, "hi");
    const [, init] = fetchMock.mock.calls[0] as [string, { signal?: unknown }];
    expect(init.signal).toBeDefined();
  });

  it("never returns the token in any result value", async () => {
    fetchMock.mockRejectedValue(
      // An undici error can carry the request URL, and therefore the token.
      new Error("failed to fetch https://api.telegram.org/bottest-token/…"),
    );
    const result = await sendTelegramMessage(CONFIG, "hi");
    expect(result).toBe("network_error");
    expect(JSON.stringify(result)).not.toContain("test-token");
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
