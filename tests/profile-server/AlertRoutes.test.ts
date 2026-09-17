// Task 0277 — the alert relay route.
//
// 🚨 THE RULE THIS FILE EXISTS TO PIN (plan AMENDMENT 1, verified from the shipped
// uptrace 2.0.2 binary): a 401, 403 or 404 reply makes Uptrace call
// NotifChannelGateway.Disable, and the channel then refuses to send at all. ONE such
// reply kills alerting permanently and silently, with no retry. So the relay NEVER
// returns 401/403/404 — a bad, missing or unparseable secret answers 2xx, drops the
// message, counts it, and raises an alarm by a path that does not depend on Uptrace.
//
// The status is not a verdict we render. It is an INSTRUCTION Uptrace obeys:
// 2xx = "stop retrying, I own this event"; non-2xx = "try again" (32 attempts,
// ~26 hours). Assigning a status for any other reason is a bug.

import request from "supertest";
import type { TelegramConfig } from "../../src/core/notifications/TelegramNotifier";
import {
  ALERT_WEBHOOK_PATH,
  ALERT_WEBHOOK_SECRET_ENV,
  DedupeCache,
  DEDUPE_MAX_ENTRIES,
  formatAlertMessage,
  isAlarmText,
} from "../../src/profile-server/AlertRelay";
import {
  createApp,
  type InboxRepo,
  type NameChangeRepo,
  type ProfileRepo,
} from "../../src/profile-server/Routes";
import type { ProfileMetrics } from "../../src/profile-server/Telemetry";
import { TEST_SESSION_CONFIG } from "./support/sessionToken";

const SECRET = "test-relay-secret";
const TELEGRAM: TelegramConfig = {
  token: "test-bot-token",
  chatId: "-100999",
  proxyUrl: "",
  threadId: "77",
};

/**
 * A body in the VERIFIED 2.0.2 shape. ⚠️ Every trap here is load-bearing: `id` and
 * `alert.id` are JSON STRINGS (not numbers), the custom payload is MERGED under a
 * top-level `payload` key rather than replacing the body, `log` is absent entirely
 * for metric monitors (A1–A6 all are), and `alert.status` is the field to read —
 * `alert.state` is a legacy alias carrying the same value. Each of these rejects
 * EVERY real alert while a hand-built fixture of the wrong shape passes happily.
 */
function webhookBody(
  over: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id: "184467440737095516",
    eventName: "created",
    createdAt: "2026-09-17T14:02:00Z",
    payload: {
      secret: SECRET,
      value: "412",
      threshold: "300",
      window: "10 min",
    },
    alert: {
      id: "99887766554433221",
      url: "https://example.invalid/alert/1",
      name: "Player creation spike",
      type: "metric",
      state: "open",
      status: "open",
      createdAt: "2026-09-17T14:02:00Z",
    },
    ...over,
  };
}

type Sent = { config: TelegramConfig; text: string };

type Harness = {
  app: ReturnType<typeof createApp>;
  sent: Sent[];
  alerts: Sent[];
  alarms: Sent[];
  metricCalls: Array<[string, string]>;
  settle: () => Promise<void>;
};

function build(
  over: {
    secret?: string;
    now?: () => number;
    sendImpl?: (config: TelegramConfig, text: string) => Promise<unknown>;
  } = {},
): Harness {
  const sent: Sent[] = [];
  const pending: Array<Promise<unknown>> = [];
  const metricCalls: Array<[string, string]> = [];

  const metrics: ProfileMetrics = {
    loginRequest: () => {},
    playerCreated: () => {},
    httpRequest: () => {},
    sessionRejected: () => {},
    tenureClaim: () => {},
    alertRelay: (result, keyed) => {
      metricCalls.push([result, keyed]);
    },
  };

  const send = (config: TelegramConfig, text: string) => {
    sent.push({ config, text });
    const promise = over.sendImpl
      ? over.sendImpl(config, text)
      : Promise.resolve({ result: "sent" as const });
    pending.push(promise);
    return promise as Promise<never>;
  };

  const repo = {
    ping: jest.fn().mockResolvedValue(undefined),
    getProfile: jest.fn().mockResolvedValue(null),
    creditMatchXp: jest.fn(),
    findPlayerByIdentity: jest.fn().mockResolvedValue(null),
    resolveExistingPlayer: jest.fn().mockResolvedValue(null),
    resolveOrCreatePlayer: jest.fn(),
    hasXpGrant: jest.fn().mockResolvedValue(false),
  } as unknown as ProfileRepo;

  const app = createApp(
    repo,
    undefined,
    undefined as unknown as InboxRepo,
    undefined as unknown as NameChangeRepo,
    TEST_SESSION_CONFIG,
    {
      metrics,
      alertRelay: {
        secret: over.secret ?? SECRET,
        telegram: TELEGRAM,
        send: send as never,
        now: over.now,
      },
    },
  );

  return {
    app,
    sent,
    get alerts() {
      return sent.filter((s) => !isAlarmText(s.text));
    },
    get alarms() {
      return sent.filter((s) => isAlarmText(s.text));
    },
    metricCalls,
    // The relay responds BEFORE delivering, so a send is still in flight when
    // supertest resolves. Draining here keeps assertions deterministic without
    // turning the ordering guarantee into a race.
    settle: async () => {
      await Promise.allSettled(pending);
      await new Promise((resolve) => setImmediate(resolve));
    },
  };
}

function post(h: Harness, body: unknown) {
  return request(h.app)
    .post(ALERT_WEBHOOK_PATH)
    .send(body as object);
}

describe("alert relay — the status contract (AMENDMENT 1)", () => {
  it("accepts a well-formed, correctly-authenticated alert with 202 and delivers it", async () => {
    const h = build();
    const res = await post(h, webhookBody());
    expect(res.status).toBe(202);
    await h.settle();
    expect(h.alerts).toHaveLength(1);
    expect(h.alerts[0].config.threadId).toBe("77");
    expect(h.metricCalls).toContainEqual(["sent", "keyed"]);
  });

  // ⚠️ The mutation: a 401. It would permanently disable the channel — every later
  // alert dropped at source, silently, forever. This is the single most important
  // assertion in the file.
  it.each([
    ["a wrong secret", { secret: "not-the-secret" }],
    ["no secret field", {}],
    ["a null payload (Uptrace sends null, not omitted)", null],
  ])("answers 2xx and NEVER 401/403/404 for %s", async (_label, payload) => {
    const h = build();
    const res = await post(h, webhookBody({ payload }));
    expect([401, 403, 404]).not.toContain(res.status);
    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.status).toBeLessThan(300);
    await h.settle();
    expect(h.alerts).toHaveLength(0);
    expect(h.metricCalls.map(([result]) => result)).toContain("rejected");
  });

  // ⚠️ The classic fail-OPEN inversion: `if (body.secret && !match)` lets a MISSING
  // secret through. Absent must be treated exactly like wrong.
  it("treats a missing secret exactly like a wrong one — no send either way", async () => {
    const missing = build();
    await post(missing, webhookBody({ payload: { value: "1" } }));
    const wrong = build();
    await post(wrong, webhookBody({ payload: { secret: "nope" } }));
    await missing.settle();
    await wrong.settle();
    expect(missing.alerts).toHaveLength(0);
    expect(wrong.alerts).toHaveLength(0);
  });

  // Fails CLOSED on DELIVERY (nothing is sent) while still answering 2xx.
  it("delivers nothing at all when the configured secret is empty", async () => {
    const h = build({ secret: "" });
    for (const body of [
      webhookBody(),
      webhookBody({ payload: { secret: "" } }),
    ]) {
      const res = await post(h, body);
      expect(res.status).toBeLessThan(300);
    }
    await h.settle();
    expect(h.alerts).toHaveLength(0);
  });

  // ⚠️ Review R1, at the level that matters: a non-ASCII wrong secret must not become
  // a 500. It is the same length on screen, so an operator pasting a secret with a
  // stray accented character hits exactly this — and a 500 means the alarm never
  // fires, so nobody learns the alerts are being dropped.
  it("answers 2xx and ALARMS for a wrong secret containing non-ASCII characters", async () => {
    const h = build();
    // Same JS string length as SECRET, different UTF-8 byte length.
    const sameLengthNonAscii = `${SECRET.slice(0, -1)}é`;
    expect(sameLengthNonAscii.length).toBe(SECRET.length);
    const res = await post(
      h,
      webhookBody({ payload: { secret: sameLengthNonAscii } }),
    );
    expect(res.status).toBeLessThan(300);
    expect(res.status).toBeGreaterThanOrEqual(200);
    await h.settle();
    expect(h.alerts).toHaveLength(0);
    expect(h.alarms).toHaveLength(1);
    expect(h.metricCalls.map(([result]) => result)).toContain("rejected");
  });

  it("answers 2xx for a malformed body and does NOT burn the 32-attempt budget", async () => {
    const h = build();
    // The verified trap, inverted: a NUMERIC id. Real alerts carry a STRING — and
    // the reason they do is exactly that a uint64 id does not survive a JSON number.
    const res = await post(h, webhookBody({ id: 12345 }));
    expect(res.status).toBeLessThan(300);
    await h.settle();
    expect(h.alerts).toHaveLength(0);
    expect(h.metricCalls.map(([result]) => result)).toContain("malformed");
  });

  // ⚠️ The plan had NO test for this branch, so the branch could be absent and every
  // other test would still pass. 5xx is the ONE case where spending Uptrace's ~26 h
  // retry budget is correct: a transient internal failure is worth retrying.
  it("answers 5xx when an internal failure happens BEFORE responding, and sends nothing", async () => {
    const h = build({
      now: () => {
        throw new Error("clock exploded");
      },
    });
    const res = await post(h, webhookBody());
    expect(res.status).toBeGreaterThanOrEqual(500);
    await h.settle();
    expect(h.sent).toHaveLength(0);
    expect(h.metricCalls.map(([result]) => result)).toContain("failed");
  });

  it("returns 429 once the limiter trips — non-2xx is correct, it IS transient", async () => {
    const h = build();
    let sawTooMany = false;
    for (let i = 0; i < 70 && !sawTooMany; i++) {
      const res = await post(h, webhookBody({ id: `limiter-${i}` }));
      sawTooMany = res.status === 429;
    }
    expect(sawTooMany).toBe(true);
  });
});

// 🚫 Uptrace persists the FIRST 100 BYTES of our response into its ClickHouse
// notification history, per attempt. Anything the relay says is written to disk on
// the telemetry box — so it says fixed constants and nothing else.
describe("alert relay — response body purity", () => {
  it.each([
    ["a valid alert", webhookBody(), 202],
    ["a bad secret", webhookBody({ payload: { secret: "leak-me" } }), 200],
  ])(
    "echoes nothing from the request for %s",
    async (_label, body, expected) => {
      const h = build();
      const res = await post(h, body);
      expect(res.status).toBe(expected);
      expect(res.body).toEqual({ status: "accepted" });
      const rendered = JSON.stringify(res.body);
      for (const forbidden of [
        SECRET,
        "leak-me",
        "184467440737095516",
        "Player creation spike",
      ]) {
        expect(rendered).not.toContain(forbidden);
      }
    },
  );

  it("echoes nothing on the 5xx path either", async () => {
    const h = build({
      now: () => {
        throw new Error(`clock exploded holding ${SECRET}`);
      },
    });
    const res = await post(h, webhookBody());
    expect(res.body).toEqual({ status: "error" });
    expect(JSON.stringify(res.body)).not.toContain(SECRET);
  });
});

describe("alert relay — dedupe on the alert-event id", () => {
  // Verified: `id` is the alert-EVENT row id and is stable across retry attempts —
  // re-loaded from storage each time, never regenerated. So it is the right key.
  it("delivers once for a repeated id, and still answers 2xx the second time", async () => {
    const h = build();
    const first = await post(h, webhookBody());
    const second = await post(h, webhookBody());
    expect(first.status).toBe(202);
    // ⚠️ A non-2xx duplicate would make Uptrace retry it forever.
    expect(second.status).toBeLessThan(300);
    await h.settle();
    expect(h.alerts).toHaveLength(1);
    expect(h.metricCalls).toContainEqual(["deduped", "keyed"]);
  });

  // `created`, `status-changed` and `recurring` for ONE alert are SEPARATE events
  // with separate ids. Several messages per alert is correct — a recurrence must
  // never be suppressed.
  it("delivers each distinct event id", async () => {
    const h = build();
    await post(h, webhookBody({ id: "event-1", eventName: "created" }));
    await post(h, webhookBody({ id: "event-2", eventName: "recurring" }));
    await h.settle();
    expect(h.alerts).toHaveLength(2);
  });

  // ⚠️ Dropping an un-keyed alert would silently lose exactly the alerts whose shape
  // we guessed wrong — the failure mode hardest to notice.
  it("DELIVERS an alert with no usable id, counted separately", async () => {
    const h = build();
    const res = await post(h, webhookBody({ id: undefined }));
    expect(res.status).toBe(202);
    await h.settle();
    expect(h.alerts).toHaveLength(1);
    expect(h.metricCalls).toContainEqual(["sent", "unkeyed"]);
  });

  // ⚠️ Review R3, owner ruled FIX. The dedupe entry is written BEFORE delivery is
  // attempted. If the send then fails AND our 202 is lost in transit, the sender's
  // retry is suppressed by an entry for a message nobody ever received — the alert is
  // LOST, which is the exact opposite of this module's own stated rule that a
  // duplicate beats a loss. So a failed delivery must un-mark the id.
  it("un-marks the id when delivery fails, so a retry is not suppressed", async () => {
    const h = build({
      sendImpl: () =>
        Promise.resolve({ result: "network_error", code: "ECONNRESET" }),
    });
    await post(h, webhookBody({ id: "retry-me" }));
    await h.settle();
    expect(h.alerts).toHaveLength(1);
    await post(h, webhookBody({ id: "retry-me" }));
    await h.settle();
    // Delivered again: a duplicate beats a loss.
    expect(h.alerts).toHaveLength(2);
    expect(h.metricCalls.map(([result]) => result)).toContain("failed");
  });

  it("un-marks the id when the send THROWS, not just when it reports failure", async () => {
    const h = build({ sendImpl: () => Promise.reject(new Error("boom")) });
    await post(h, webhookBody({ id: "threw" }));
    await h.settle();
    await post(h, webhookBody({ id: "threw" }));
    await h.settle();
    expect(h.alerts).toHaveLength(2);
  });

  // ⚠️ The other half, and the one a careless fix breaks: a SUCCESSFUL delivery must
  // still suppress the retry, or the un-marking has simply deleted dedupe.
  it("still suppresses a retry after a SUCCESSFUL delivery", async () => {
    const h = build();
    await post(h, webhookBody({ id: "delivered" }));
    await h.settle();
    await post(h, webhookBody({ id: "delivered" }));
    await h.settle();
    expect(h.alerts).toHaveLength(1);
  });

  // Asserted at the cache's own level, NOT through the route: the route's limiter
  // is 60/min and would trip hundreds of requests before the 500-entry cap was
  // reached, so an HTTP-level version of this test would pass for the wrong reason.
  it("keeps the dedupe map bounded, evicting oldest-first", () => {
    const cache = new DedupeCache();
    const at = 1_000_000;
    for (let i = 0; i < DEDUPE_MAX_ENTRIES + 5; i++) {
      expect(cache.seen(`bounded-${i}`, at)).toBe(false);
    }
    // The oldest ids were evicted, so the very first one is deliverable again...
    expect(cache.seen("bounded-0", at)).toBe(false);
    // ...while a recent one is still suppressed.
    expect(cache.seen(`bounded-${DEDUPE_MAX_ENTRIES + 4}`, at)).toBe(true);
  });

  // ⚠️ The TTL must outlast Uptrace's VERIFIED ~26 h retry budget. A 24 h window —
  // what the plan assumed before the budget was known — would let the tail of a
  // retry sequence fall out and deliver a duplicate.
  it("still suppresses a repeat 26 hours later", () => {
    const cache = new DedupeCache();
    const at = 1_000_000;
    expect(cache.seen("long", at)).toBe(false);
    expect(cache.seen("long", at + 26 * 60 * 60 * 1000)).toBe(true);
  });
});

describe("alert relay — the out-of-band alarm", () => {
  // The alarm must not depend on Uptrace: Uptrace is what is misconfigured.
  it("names the environment variable and NOTHING else", async () => {
    const h = build();
    await post(h, webhookBody({ payload: { secret: "wrong" } }));
    await h.settle();
    expect(h.alarms).toHaveLength(1);
    const text = h.alarms[0].text;
    expect(text).toContain(ALERT_WEBHOOK_SECRET_ENV);
    for (const forbidden of [
      SECRET,
      "wrong",
      TELEGRAM.token,
      TELEGRAM.chatId,
    ]) {
      expect(text).not.toContain(forbidden);
    }
  });

  // ⚠️ An un-rate-limited alarm turns one misconfiguration into a topic flood —
  // and Uptrace will keep posting for ~26 hours while it stays wrong.
  it("fires at most once per process per hour", async () => {
    const h = build();
    await post(h, webhookBody({ id: "a", payload: { secret: "wrong" } }));
    await post(h, webhookBody({ id: "b", payload: { secret: "wrong" } }));
    await h.settle();
    expect(h.alarms).toHaveLength(1);
  });

  it("raises the alarm for a malformed body, but relays no alert for it", async () => {
    const h = build();
    await post(h, webhookBody({ id: 12345 }));
    await h.settle();
    expect(h.alarms).toHaveLength(1);
    expect(h.alerts).toHaveLength(0);
  });
});

describe("alert relay — responds before delivering", () => {
  // ⚠️ ADR-114 Decision 4. `await send(...)` before responding earns a DUPLICATE per
  // slow send, not a delay — and it is invisible in a fast local test unless the send
  // is deliberately left unsettled, as here.
  it("answers 202 while the Telegram send is still in flight", async () => {
    let release: () => void = () => {};
    const blocked = new Promise<{ result: "sent" }>((resolve) => {
      release = () => resolve({ result: "sent" });
    });
    const h = build({ sendImpl: () => blocked });
    const res = await post(h, webhookBody());
    expect(res.status).toBe(202);
    release();
    await h.settle();
  });
});

// ⚠️ Review R2 — THE GAP THAT MATTERED MOST. The wire→view mapping inside decide()
// had no test at all: four independent mutations of it (reading `alert.state` instead
// of `alert.status`; dropping `alert.name` from the title; swapping
// `payload.value`↔`payload.threshold`; dropping `since`) ALL passed 27/27, because the
// accept test asserted only that a message was sent, never what it said.
//
// A message that silently reports the WRONG NUMBER is worse than no message: it is
// acted on. formatAlertMessage's own tests below cannot cover this — they are handed a
// ready-made view, so they exercise rendering and never the mapping that fills it.
// These go through the real route and read the delivered text.
describe("alert relay — the wire→view field mapping (review R2)", () => {
  async function deliveredText(over: Record<string, unknown>): Promise<string> {
    const h = build();
    await post(h, webhookBody(over));
    await h.settle();
    expect(h.alerts).toHaveLength(1);
    return h.alerts[0].text;
  }

  // ⚠️ `alert.state` is a LEGACY ALIAS carrying the same value as `alert.status` in
  // real traffic — so a fixture copied from the wire can never tell the two apart.
  // These two cases set them to DIFFERENT values on purpose; that is the only way the
  // mutation is observable at all.
  it("reads alert.status, NOT the legacy alert.state alias", async () => {
    const text = await deliveredText({
      alert: {
        name: "Player creation spike",
        state: "open",
        status: "closed",
        createdAt: "2026-09-17T14:02:00Z",
      },
    });
    expect(text).toContain("resolved");
  });

  it("does not report a firing alert as resolved when only state says closed", async () => {
    const text = await deliveredText({
      alert: {
        name: "Player creation spike",
        state: "closed",
        status: "open",
        createdAt: "2026-09-17T14:02:00Z",
      },
    });
    expect(text).not.toContain("resolved");
  });

  // The title comes from the sender's own top-level `alert.name`. The payload key is
  // only a fallback — a fixture carrying both proves which one was actually read.
  it("takes the title from alert.name, not from the payload fallback", async () => {
    const text = await deliveredText({
      payload: { secret: SECRET, title: "WRONG-fallback-title", value: "412" },
      alert: { name: "Player creation spike", status: "open" },
    });
    expect(text).toContain("Player creation spike");
    expect(text).not.toContain("WRONG-fallback-title");
  });

  // ⚠️ Swapping these renders a plausible, actionable, WRONG sentence. Asserting the
  // exact line is the only thing that catches it — asserting "contains 412" would not.
  it("renders value and threshold the right way round", async () => {
    const text = await deliveredText({});
    expect(text).toContain("Value: 412 (threshold 300), over 10 min");
  });

  it("carries the alert's own start time through to the Since line", async () => {
    const text = await deliveredText({});
    expect(text).toContain("Since: 2026-09-17 14:02 UTC");
  });

  // The whole mapping at once, so a reader sees the shape the operator receives.
  it("renders the complete firing message", async () => {
    expect(await deliveredText({})).toBe(
      "🚨 Geoconflict · profile · Player creation spike\n" +
        "Value: 412 (threshold 300), over 10 min\n" +
        "Since: 2026-09-17 14:02 UTC",
    );
  });
});

describe("formatAlertMessage (plan §1c)", () => {
  const parsed = {
    title: "Player creation spike",
    resolved: false,
    value: "412",
    threshold: "300",
    window: "10 min",
    since: "2026-09-17T14:02:00Z",
  };

  it("renders the rule title, the value, its threshold and the window", () => {
    const text = formatAlertMessage(parsed);
    expect(text).toContain("Player creation spike");
    expect(text).toContain("412");
    expect(text).toContain("300");
    expect(text).toContain("10 min");
  });

  it("renders a resolved alert distinctly", () => {
    const text = formatAlertMessage({ ...parsed, resolved: true });
    expect(text).toContain("resolved");
    expect(text).toContain("Player creation spike");
  });

  // ⚠️ The owner asked for this twice: what is wrong and where, never which tool
  // noticed. A "helpful" `Source: …` line is the mutation.
  it.each([["uptrace"], ["fkit"]])("never names %s, in any casing", (word) => {
    const text = formatAlertMessage({
      ...parsed,
      title: `${word.toUpperCase()} ${word} spike`,
    }).toLowerCase();
    // Only the echoed title may contain it; nothing the formatter itself adds.
    const authored = text.split("spike").pop() ?? "";
    expect(authored).not.toContain(word);
  });

  // ⚠️ Unescaped interpolation makes Telegram REJECT the message under
  // parse_mode: "HTML" — the alert is LOST, not merely ugly.
  it("escapes HTML in every field it interpolates", () => {
    const text = formatAlertMessage({
      ...parsed,
      title: "<b>boom</b> & co",
      value: "<script>",
    });
    expect(text).not.toContain("<b>boom");
    expect(text).not.toContain("<script>");
    expect(text).toContain("&lt;b&gt;boom");
    expect(text).toContain("&amp;");
  });

  // Tolerant by design: a missing cosmetic field degrades the message, never drops it.
  it("degrades rather than throwing when display fields are absent", () => {
    const text = formatAlertMessage({ title: "Bare", resolved: false });
    expect(text).toContain("Bare");
    expect(text.length).toBeGreaterThan(0);
  });
});
