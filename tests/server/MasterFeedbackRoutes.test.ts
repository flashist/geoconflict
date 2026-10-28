// Task 0277 (ND-2) — CHARACTERIZATION tests for /api/feedback and /api/subscribe.
//
// ⚠️ READ THIS BEFORE CHANGING ANYTHING HERE.
//
// These were written against the code as it stood BEFORE the Telegram send was moved
// onto the shared helper, and they must pass UNCHANGED afterwards. That is the entire
// safety argument: a test written against the new code only proves the new code does
// what the new code does. A test written against the OLD code and left untouched
// proves the behaviour did not move.
//
// These two routes had ZERO test coverage and are the only Telegram path proven
// working in production. If one of these fails after a refactor, the refactor is
// wrong — do not adjust the test to match it.
//
// A FILE OF ITS OWN, not more cases in Master.test.ts: the module-level
// FEEDBACK_TELEGRAM_* constants are read at IMPORT time, so every case here has to
// load Master.ts fresh with a chosen environment. Doing that inside the existing
// 1100-line suite would mean rewriting its undici mock, which its lobby-poll tests
// drive directly. Same reasoning as InternalPathCase.test.ts (task 0276).

const fetchMock = jest.fn();
const proxyAgentCtor = jest.fn();
const logCalls: Array<[string, string]> = [];

jest.mock("jose", () => ({
  base64url: { decode: jest.fn() },
}));

jest.mock("../../src/server/Logger", () => {
  const child = {
    error: (message: string) => logCalls.push(["error", message]),
    info: (message: string) => logCalls.push(["info", message]),
    warn: (message: string) => logCalls.push(["warn", message]),
  };
  return {
    logger: { child: () => child },
    formatError: (error: unknown) => String(error),
  };
});

// Delegating to STABLE outer mocks, so a module re-load inside jest.isolateModules
// still reaches the same jest.fn() this file controls.
jest.mock("undici", () => ({
  fetch: (...args: unknown[]) => fetchMock(...args),
  ProxyAgent: class {
    constructor(url: string) {
      proxyAgentCtor(url);
    }
  },
}));

import type { Express } from "express";
import request from "supertest";

const TOKEN = "test-feedback-token";
const CHAT_ID = "-100777";
const PROXY = "http://proxy.test:3128";
const WEBHOOK = "https://webhook.invalid/hook";

const FEEDBACK_BODY = {
  category: "Bug" as const,
  text: "it broke",
  platform: "yandex",
  yandexStatus: "authorized",
  version: "0.0.151",
  screenSource: "battle" as const,
};

type Env = Record<string, string | undefined>;

/**
 * Load Master.ts fresh under a chosen environment. Its FEEDBACK_* constants are
 * module-level, so the environment has to be in place BEFORE the import — and each
 * load also gets its own rate limiter, which keeps the 5/min and 3/min caps from
 * leaking between cases.
 */
function loadMaster(env: Env): Express {
  const saved: Env = {};
  for (const key of Object.keys(env)) {
    saved[key] = process.env[key];
    const value = env[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
  let app: Express | undefined;
  try {
    jest.isolateModules(() => {
      // A dynamic require is the only way to re-evaluate a module's top-level
      // constants after changing the environment; a static import is hoisted and
      // would capture whatever was set when the FILE loaded, once, for every case.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      app = (require("../../src/server/Master") as { app: Express }).app;
    });
  } finally {
    for (const key of Object.keys(saved)) {
      const value = saved[key];
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
  if (app === undefined) {
    throw new Error("Master.ts did not export an app");
  }
  return app;
}

/** Telegram configured, no webhook — the shape production runs in. */
function telegramOnly(): Express {
  return loadMaster({
    FEEDBACK_WEBHOOK_URL: undefined,
    FEEDBACK_TELEGRAM_TOKEN: TOKEN,
    FEEDBACK_TELEGRAM_CHAT_ID: CHAT_ID,
    TELEGRAM_PROXY_URL: PROXY,
  });
}

function messages(level: string): string[] {
  return logCalls
    .filter(([got]) => got === level)
    .map(([, message]) => message);
}

function allMessages(): string {
  return logCalls.map(([, message]) => message).join("\n");
}

/** Every Telegram call this load made, regardless of how it was dispatched. */
function telegramCalls(): Array<
  [string, { body: string; dispatcher?: unknown }]
> {
  return fetchMock.mock.calls.filter((call) =>
    String(call[0]).includes("api.telegram.org"),
  ) as Array<[string, { body: string; dispatcher?: unknown }]>;
}

beforeEach(() => {
  jest.clearAllMocks();
  logCalls.length = 0;
  fetchMock.mockResolvedValue({ ok: true, status: 200 });
});

describe("POST /api/feedback — behaviour as it stands (characterization)", () => {
  it("posts to the bot's sendMessage endpoint with the chat id and HTML mode", async () => {
    const app = telegramOnly();
    await request(app).post("/api/feedback").send(FEEDBACK_BODY);
    const calls = telegramCalls();
    expect(calls).toHaveLength(1);
    expect(calls[0][0]).toBe(
      `https://api.telegram.org/bot${TOKEN}/sendMessage`,
    );
    const body = JSON.parse(calls[0][1].body);
    expect(body.chat_id).toBe(CHAT_ID);
    expect(body.parse_mode).toBe("HTML");
    expect(body.text).toContain("it broke");
  });

  it("routes the send through the configured proxy", async () => {
    const app = telegramOnly();
    await request(app).post("/api/feedback").send(FEEDBACK_BODY);
    // api.telegram.org is blocked from Russian IPs — the proxy is load-bearing.
    expect(proxyAgentCtor).toHaveBeenCalledWith(PROXY);
    expect(telegramCalls()[0][1].dispatcher).toBeDefined();
  });

  // ⚠️ THE SILENT-SUCCESS CONTRACT. The player is told it worked whether or not it
  // did. Task 0061 step 4 asks whether that is acceptable — it is a PRODUCT question
  // and this task does NOT answer it. Pinned here deliberately, so the behaviour is
  // visible rather than incidental, and so a refactor cannot change it by accident.
  it.each([
    [
      "the send is refused",
      () => fetchMock.mockResolvedValue({ ok: false, status: 403 }),
    ],
    [
      "the send throws",
      () => fetchMock.mockRejectedValue(new Error("ECONNRESET")),
    ],
  ])(
    "still answers {ok:true} to the player when %s",
    async (_label, arrange) => {
      arrange();
      const app = telegramOnly();
      const res = await request(app).post("/api/feedback").send(FEEDBACK_BODY);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true });
    },
  );

  it("rejects a malformed body with 400 and sends nothing", async () => {
    const app = telegramOnly();
    const res = await request(app)
      .post("/api/feedback")
      .send({ category: "Nope" });
    expect(res.status).toBe(400);
    expect(telegramCalls()).toHaveLength(0);
  });

  // 0061 names this distinction as useful evidence: "responded with <status>" means
  // Telegram answered and refused; "delivery failed" means nothing answered at all.
  // The two are diagnosed completely differently, so both lines must survive.
  it("logs 'responded with <status>' for a refusal, NOT 'delivery failed'", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 403 });
    const app = telegramOnly();
    await request(app).post("/api/feedback").send(FEEDBACK_BODY);
    expect(allMessages()).toContain("[feedback] telegram responded with 403");
    expect(allMessages()).not.toContain("[feedback] telegram delivery failed");
  });

  it("logs 'delivery failed' when nothing answered, NOT 'responded with'", async () => {
    fetchMock.mockRejectedValue(new Error("ECONNRESET"));
    const app = telegramOnly();
    await request(app).post("/api/feedback").send(FEEDBACK_BODY);
    expect(messages("error").join("\n")).toContain(
      "[feedback] telegram delivery failed",
    );
    expect(allMessages()).not.toContain("[feedback] telegram responded with");
  });

  // The webhook path is independent of the Telegram path: neither one failing may
  // stop the other, and the player's answer does not depend on either.
  it("fires the webhook and Telegram independently", async () => {
    const app = loadMaster({
      FEEDBACK_WEBHOOK_URL: WEBHOOK,
      FEEDBACK_TELEGRAM_TOKEN: TOKEN,
      FEEDBACK_TELEGRAM_CHAT_ID: CHAT_ID,
      TELEGRAM_PROXY_URL: PROXY,
    });
    await request(app).post("/api/feedback").send(FEEDBACK_BODY);
    expect(
      fetchMock.mock.calls.filter((call) => String(call[0]) === WEBHOOK),
    ).toHaveLength(1);
    expect(telegramCalls()).toHaveLength(1);
  });

  it("still sends to Telegram when the webhook fails", async () => {
    fetchMock.mockImplementation((url: string) =>
      url === WEBHOOK
        ? Promise.reject(new Error("webhook down"))
        : Promise.resolve({ ok: true, status: 200 }),
    );
    const app = loadMaster({
      FEEDBACK_WEBHOOK_URL: WEBHOOK,
      FEEDBACK_TELEGRAM_TOKEN: TOKEN,
      FEEDBACK_TELEGRAM_CHAT_ID: CHAT_ID,
      TELEGRAM_PROXY_URL: PROXY,
    });
    const res = await request(app).post("/api/feedback").send(FEEDBACK_BODY);
    expect(telegramCalls()).toHaveLength(1);
    expect(res.body).toEqual({ ok: true });
    expect(allMessages()).toContain("[feedback] webhook delivery failed");
  });

  // With nothing configured the feedback must still not vanish: it goes to stdout,
  // which is the only record a developer has in that state.
  it("falls back to stdout when neither webhook nor token is configured", async () => {
    const app = loadMaster({
      FEEDBACK_WEBHOOK_URL: undefined,
      FEEDBACK_TELEGRAM_TOKEN: undefined,
      FEEDBACK_TELEGRAM_CHAT_ID: undefined,
      TELEGRAM_PROXY_URL: undefined,
    });
    const res = await request(app).post("/api/feedback").send(FEEDBACK_BODY);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(messages("info").join("\n")).toContain("[feedback]");
    expect(messages("info").join("\n")).toContain("it broke");
    expect(res.body).toEqual({ ok: true });
  });
});

describe("POST /api/subscribe — behaviour as it stands (characterization)", () => {
  // ⚠️ NOT the same contract as /api/feedback. Subscribe reports the failure to the
  // caller with a 500 — it does NOT silently succeed. Pinned because the two routes
  // look alike and a refactor that "unified" them would change this one silently.
  it.each([
    [
      "the send is refused",
      () => fetchMock.mockResolvedValue({ ok: false, status: 403 }),
    ],
    [
      "the send throws",
      () => fetchMock.mockRejectedValue(new Error("ECONNRESET")),
    ],
  ])("answers 500 when %s", async (_label, arrange) => {
    arrange();
    const app = telegramOnly();
    const res = await request(app)
      .post("/api/subscribe")
      .send({ email: "a@example.invalid" });
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: "Delivery failed" });
  });

  it("answers {ok:true} on a successful send, with the email in the message", async () => {
    const app = telegramOnly();
    const res = await request(app)
      .post("/api/subscribe")
      .send({ email: "a@example.invalid" });
    expect(res.body).toEqual({ ok: true });
    const body = JSON.parse(telegramCalls()[0][1].body);
    expect(body.chat_id).toBe(CHAT_ID);
    expect(body.parse_mode).toBe("HTML");
    expect(body.text).toContain("a@example.invalid");
  });

  it("logs 'responded with <status>' for a refusal, NOT 'delivery failed'", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 403 });
    const app = telegramOnly();
    await request(app)
      .post("/api/subscribe")
      .send({ email: "a@example.invalid" });
    expect(messages("error").join("\n")).toContain(
      "[subscribe] telegram responded with 403",
    );
    expect(allMessages()).not.toContain("[subscribe] telegram delivery failed");
  });

  it("logs 'delivery failed' when nothing answered, NOT 'responded with'", async () => {
    fetchMock.mockRejectedValue(new Error("ECONNRESET"));
    const app = telegramOnly();
    await request(app)
      .post("/api/subscribe")
      .send({ email: "a@example.invalid" });
    expect(messages("error").join("\n")).toContain(
      "[subscribe] telegram delivery failed",
    );
    expect(allMessages()).not.toContain("[subscribe] telegram responded with");
  });

  it("rejects a malformed email with 400 and sends nothing", async () => {
    const app = telegramOnly();
    const res = await request(app)
      .post("/api/subscribe")
      .send({ email: "nope" });
    expect(res.status).toBe(400);
    expect(telegramCalls()).toHaveLength(0);
  });

  it("falls back to stdout, and 200, when Telegram is not configured", async () => {
    const app = loadMaster({
      FEEDBACK_TELEGRAM_TOKEN: undefined,
      FEEDBACK_TELEGRAM_CHAT_ID: undefined,
      TELEGRAM_PROXY_URL: undefined,
    });
    const res = await request(app)
      .post("/api/subscribe")
      .send({ email: "a@example.invalid" });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(messages("info").join("\n")).toContain(
      "[subscribe] a@example.invalid",
    );
    expect(res.body).toEqual({ ok: true });
  });
});

// THE ONE BLOCK IN THIS FILE THAT IS *NOT* A CHARACTERIZATION TEST.
//
// Everything above pins behaviour that must NOT move. This block is the opposite: it
// asserts a property the pre-migration code did not have. It was RED before the
// migration and green after.
//
// ⚠️ CORRECTED, AND THE CORRECTION MATTERS MORE THAN THE TEST. This comment used to
// claim the red proved a LIVE LEAK — that a Telegram failure on the game server wrote
// the real bot token into an off-box log. THAT CLAIM WAS WRONG, and it was wrong for a
// reason worth remembering: the red came from two mocks in this very file talking to
// each other. The error below is a FIXTURE whose message carries a URL because the test
// author put it there, and this file MOCKS `formatError` as `String(error)` (see the
// top of the file) — so neither half of the round trip exercised production code.
//
// What was then verified in undici 8.0.2 in this tree:
//   • a fetch failure is `new TypeError('fetch failed', { cause: … })` — no URL in the
//     message (lib/web/fetch/index.js);
//   • every message in lib/core/errors.js is a FIXED literal — none interpolates a URL;
//   • no undici error stores a `.url` property at all;
//   • `stack` begins with the message, so a URL-free message means a URL-free stack.
// And the real formatError (src/server/Logger.ts) returns `error.stack ?? error.message`
// — it NEVER reads `.cause`, which is exactly where the URL-bearing detail lives.
// A real production log line (2026-09-17 10:30:06 UTC, the stale-socket feedback
// failure) contains internal frames only and no token, matching that analysis.
//
// ⇒ TRUE SEVERITY: a LATENT, CURRENTLY-UNREACHABLE passthrough — free-text formatting
// of a vendor-controlled value. The migration closes it as DEFENCE IN DEPTH against a
// future undici, NOT as a fix for anything ever observed. ⛔ It justified no credential
// rotation and no log search, and it must not be cited as if it did.
//
// Caveat kept: undici 8.0.2 was checked in THIS working tree, not the version inside
// the deployed game image.
//
// The sharpest evidence that the original theory was untested: under it, Master.ts's
// WEBHOOK failure line (`[feedback] webhook delivery failed: ${formatError(err)}`)
// leaks a capability URL by the identical mechanism — and it was left untouched. A
// theory not applied to the identical adjacent line had not really been tested.
//
// The assertion below still earns its place: it pins that the migrated code emits a
// BOUNDED code rather than a formatted error. Keep it.
describe("error detail is bounded, never a formatted error (defence in depth)", () => {
  it.each([
    ["/api/feedback", FEEDBACK_BODY],
    ["/api/subscribe", { email: "a@example.invalid" }],
  ])("never puts the bot token in a log line (%s)", async (path, body) => {
    fetchMock.mockRejectedValue(
      new Error(
        `failed to fetch https://api.telegram.org/bot${TOKEN}/sendMessage`,
      ),
    );
    const app = telegramOnly();
    await request(app).post(path).send(body);
    expect(allMessages()).not.toContain(TOKEN);
  });
});

// Task 0307 (F5) — NEW behaviour, not characterization: platform and yandexStatus
// are free client strings (the schema only caps their length), yet they went into
// the HTML-mode Telegram message unescaped, beside the escaped username.
describe("POST /api/feedback — every free field is HTML-escaped (task 0307)", () => {
  it("escapes <b> and <a href> in platform and yandexStatus", async () => {
    const app = telegramOnly();
    await request(app)
      .post("/api/feedback")
      .send({
        ...FEEDBACK_BODY,
        platform: "<b>x</b>",
        yandexStatus: '<a href="http://x">y</a>',
        username: "<i>n</i>",
      });
    const text = JSON.parse(telegramCalls()[0][1].body).text as string;
    expect(text).toContain("<b>Platform:</b> &lt;b&gt;x&lt;/b&gt;");
    expect(text).toContain(
      '<b>Yandex:</b> &lt;a href="http://x"&gt;y&lt;/a&gt;',
    );
    expect(text).toContain("<b>Username:</b> &lt;i&gt;n&lt;/i&gt;");
    expect(text).not.toContain("<a href");
  });
});

// Task 0509 — NEW behaviour: the client-reported player reference. All ids and
// tokens below are synthetic.
describe("POST /api/feedback — player reference (task 0509)", () => {
  const YANDEX_ID = "test-yandex-id-AbC+/=";
  const SESSION_TOKEN = "synthetic-session-token-not-a-real-credential";

  function bothLegs(): Express {
    return loadMaster({
      FEEDBACK_WEBHOOK_URL: WEBHOOK,
      FEEDBACK_TELEGRAM_TOKEN: TOKEN,
      FEEDBACK_TELEGRAM_CHAT_ID: CHAT_ID,
      TELEGRAM_PROXY_URL: PROXY,
    });
  }

  function telegramText(): string {
    return JSON.parse(telegramCalls()[0][1].body).text as string;
  }

  function webhookPlayerField(): string {
    const call = fetchMock.mock.calls.find(
      (got) => String(got[0]) === WEBHOOK,
    ) as [string, { body: string }];
    const fields = JSON.parse(call[1].body).embeds[0].fields as Array<{
      name: string;
      value: string;
    }>;
    const player = fields.find((field) => field.name === "Player");
    if (player === undefined) {
      throw new Error("webhook embed has no Player field");
    }
    return player.value;
  }

  function webhookBody(): string {
    const call = fetchMock.mock.calls.find(
      (got) => String(got[0]) === WEBHOOK,
    ) as [string, { body: string }];
    return call[1].body;
  }

  it("shows a logged-in player's id on a labelled line in both legs", async () => {
    const app = bothLegs();
    const res = await request(app)
      .post("/api/feedback")
      .send({
        ...FEEDBACK_BODY,
        playerReference: { kind: "yandex", yandexId: YANDEX_ID },
      });
    expect(res.status).toBe(200);
    expect(telegramText()).toContain(
      `<b>Player:</b> Yandex id <code>${YANDEX_ID}</code> (client-reported, unverified)`,
    );
    expect(webhookPlayerField()).toBe(
      `Yandex id ${YANDEX_ID} (client-reported, unverified)`,
    );
  });

  it("HTML-escapes <, & and > in the id", async () => {
    const app = bothLegs();
    await request(app)
      .post("/api/feedback")
      .send({
        ...FEEDBACK_BODY,
        playerReference: { kind: "yandex", yandexId: "a<b>&c" },
      });
    expect(telegramText()).toContain("<code>a&lt;b&gt;&amp;c</code>");
    expect(telegramText()).not.toContain("a<b>&c");
    expect(webhookPlayerField()).toContain("a&lt;b&gt;&amp;c");
  });

  it.each([
    ["guest", "none — not logged in (guest)"],
    ["unavailable", "none — logged in, but the id could not be read"],
  ])("shows the %s marker in both legs", async (kind, marker) => {
    const app = bothLegs();
    await request(app)
      .post("/api/feedback")
      .send({ ...FEEDBACK_BODY, playerReference: { kind } });
    expect(telegramText()).toContain(`<b>Player:</b> ${marker}`);
    expect(webhookPlayerField()).toBe(marker);
  });

  it("accepts an old-format post with no reference and says so", async () => {
    const app = bothLegs();
    const res = await request(app).post("/api/feedback").send(FEEDBACK_BODY);
    expect(res.status).toBe(200);
    expect(telegramText()).toContain(
      "<b>Player:</b> none — not sent (older game client)",
    );
    expect(webhookPlayerField()).toBe("none — not sent (older game client)");
  });

  it.each([
    ["129 characters", "a".repeat(129)],
    ["a newline", "abc\n<b>Fake:</b> x"],
    ["a space", "abc def"],
    ["an empty string", ""],
  ])("rejects an id with %s with 400 and sends nothing", async (_l, id) => {
    const app = bothLegs();
    const res = await request(app)
      .post("/api/feedback")
      .send({
        ...FEEDBACK_BODY,
        playerReference: { kind: "yandex", yandexId: id },
      });
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    ["1 character", "a"],
    ["128 characters", "b".repeat(128)],
  ])("accepts an id of %s", async (_l, id) => {
    const app = telegramOnly();
    const res = await request(app)
      .post("/api/feedback")
      .send({
        ...FEEDBACK_BODY,
        playerReference: { kind: "yandex", yandexId: id },
      });
    expect(res.status).toBe(200);
    expect(telegramText()).toContain(`<code>${id}</code>`);
  });

  it("never echoes the session token, in either leg or any log line", async () => {
    const send = (app: Express) =>
      request(app)
        .post("/api/feedback")
        .set("Authorization", `Bearer ${SESSION_TOKEN}`)
        .send({
          ...FEEDBACK_BODY,
          playerReference: { kind: "yandex", yandexId: YANDEX_ID },
        });
    await send(bothLegs());
    expect(telegramText()).not.toContain(SESSION_TOKEN);
    expect(webhookBody()).not.toContain(SESSION_TOKEN);
    await send(
      loadMaster({
        FEEDBACK_WEBHOOK_URL: undefined,
        FEEDBACK_TELEGRAM_TOKEN: undefined,
        FEEDBACK_TELEGRAM_CHAT_ID: undefined,
        TELEGRAM_PROXY_URL: undefined,
      }),
    );
    expect(allMessages()).not.toContain(SESSION_TOKEN);
  });

  it("keeps the stdout fallback free of the Yandex id", async () => {
    const app = loadMaster({
      FEEDBACK_WEBHOOK_URL: undefined,
      FEEDBACK_TELEGRAM_TOKEN: undefined,
      FEEDBACK_TELEGRAM_CHAT_ID: undefined,
      TELEGRAM_PROXY_URL: undefined,
    });
    await request(app)
      .post("/api/feedback")
      .send({
        ...FEEDBACK_BODY,
        playerReference: { kind: "yandex", yandexId: YANDEX_ID },
      });
    const info = messages("info").join("\n");
    expect(info).toContain('"playerReference":"yandex"');
    expect(info).not.toContain(YANDEX_ID);
  });
});
