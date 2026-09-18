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

import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import request from "supertest";
import type { TelegramConfig } from "../../src/core/notifications/TelegramNotifier";
import {
  ALERT_PROBE_KEY,
  ALERT_PROBE_RESPONSE_STATUS,
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
  /** Task 0284: where this harness's relay writes its probe marker. */
  markerPath: string;
  settle: () => Promise<void>;
};

/**
 * Task 0284. Every harness gets its own throwaway directory, so the REAL atomic write
 * (temp file + rename) is exercised rather than stubbed — the marker's on-disk SHAPE is
 * what profile-checks.sh parses, and a stub would not prove it.
 */
const markerDirs: string[] = [];
afterAll(() => {
  for (const dir of markerDirs) {
    rmSync(dir, { recursive: true, force: true });
  }
});

function build(
  over: {
    secret?: string;
    now?: () => number;
    sendImpl?: (config: TelegramConfig, text: string) => Promise<unknown>;
    writeMarkerFile?: (path: string, contents: string) => void;
  } = {},
): Harness {
  const markerDir = mkdtempSync(join(tmpdir(), "alert-probe-"));
  markerDirs.push(markerDir);
  const markerPath = join(markerDir, "last-alert-probe.json");
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
        markerPath,
        writeMarkerFile: over.writeMarkerFile,
      },
    },
  );

  return {
    app,
    sent,
    markerPath,
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
  // ⚠️ Updated 2026-09-17 for the live-traffic format (Status line + alert link) — the
  // fixture's value/threshold/window still render here because a fixture supplies them
  // directly. In REAL traffic they are absent; see the live-shape block below for why.
  it("renders the complete firing message", async () => {
    expect(await deliveredText({})).toBe(
      "🚨 Geoconflict · profile · Player creation spike\n" +
        "Status: firing\n" +
        "Value: 412 (threshold 300), over 10 min\n" +
        "Since: 2026-09-17 14:02 UTC\n" +
        '→ <a href="https://example.invalid/alert/1">open the alert</a>',
    );
  });
});

// 🚩 FOUND BY THE FIRST REAL PRODUCTION CALL, 2026-09-17 — not by any test here.
// The sender stores the custom payload VERBATIM and never inspects it, so it never
// TEMPLATES it either: a payload value of "{{ .value }}" is delivered as those literal
// characters. Uptrace's own top-level fields carry no measured value, no threshold and
// no window, so those three are NOT OBTAINABLE by any syntax. Every test here passed
// because every test fed fixtures straight in.
//
// This supersedes plan §1c's message format (the plan file is byte-frozen; the
// supersede is recorded in the worklog and the ledger).
describe("alert message — the live-traffic shape (supersedes plan §1c)", () => {
  async function deliveredText(over: Record<string, unknown>): Promise<string> {
    const h = build();
    await post(h, webhookBody(over));
    await h.settle();
    expect(h.alerts).toHaveLength(1);
    return h.alerts[0].text;
  }

  // ⚠️ THE DEFECT ITSELF. Mutation killed: rendering a payload display value without
  // checking it for unsubstituted template syntax — which is exactly what shipped and
  // what the operator actually received.
  it.each([
    ["a template placeholder", "{{ .value }}"],
    ["a bare opening brace pair", "{{ anything"],
    ["a paste-me literal", "PASTE_THRESHOLD_HERE"],
    // ⚠️ The filter was whole-string anchored, so a placeholder with anything after it
    // slipped through — while the runbook says a value "still CONTAINING" one is
    // dropped. Mutation killed: re-anchoring the PASTE_ pattern.
    ["a paste-me literal with trailing text", "PASTE_ME HERE"],
    ["a paste-me literal with leading text", "see PASTE_ME"],
  ])("never renders %s to the operator", async (_label, poison) => {
    const text = await deliveredText({
      payload: {
        secret: SECRET,
        value: poison,
        threshold: poison,
        window: poison,
      },
    });
    expect(text).not.toContain("{{");
    expect(text).not.toContain("}}");
    expect(text).not.toContain("PASTE_");
    // It still says something useful rather than degrading to nothing.
    expect(text).toContain("Player creation spike");
  });

  // Mutation killed: dropping alert.url, or rendering it only when some other field
  // happens to be present. The link is now the ONLY way to reach the numbers.
  it("renders alert.url as a working link", async () => {
    const text = await deliveredText({});
    expect(text).toContain('<a href="https://example.invalid/alert/1">');
  });

  // ⚠️ Mutation killed: emitting the arrow (or an empty anchor) when the URL is absent,
  // which would show the operator a dangling "→" or a link to nowhere.
  it("still sends, with no dangling arrow, when alert.url is absent", async () => {
    const text = await deliveredText({
      alert: { name: "Player creation spike", status: "open" },
    });
    expect(text).toContain("Player creation spike");
    expect(text).not.toContain("→");
    expect(text).not.toContain("<a href");
  });

  // ⚠️ Mutation killed: embedding a non-http(s) URL. parse_mode:"HTML" makes Telegram
  // REJECT a message whose anchor it will not accept — so a junk URL would lose the
  // whole alert, not just the link. Degrade, never drop.
  it.each([
    ["javascript:", "javascript:alert(1)"],
    ["not a URL at all", "nonsense"],
    ["a template placeholder", "{{ .alertUrl }}"],
  ])(
    "omits the link rather than risking rejection for %s",
    async (_label, url) => {
      const text = await deliveredText({
        alert: { name: "Player creation spike", status: "open", url },
      });
      expect(text).not.toContain("<a href");
      expect(text).toContain("Player creation spike");
    },
  );

  // ⚠️ Review R13. `usableAlertUrl` PARSED the URL and then returned the RAW input,
  // throwing the parse away. `escapeTelegramHtml` escapes & < > but NOT `"` — and the
  // value lands inside href="…", so one quote breaks out of the attribute, the HTML is
  // malformed, Telegram rejects the message, and the ALERT IS LOST. That is the exact
  // failure this filter exists to prevent.
  // Mutation killed: returning `candidate` instead of `parsed.href`. ⚠️ All 50 tests
  // stayed green either way before this case existed — which is why it exists.
  it.each([
    [
      "a double quote",
      'https://example.invalid/a"onmouseover=x',
      "a%22onmouseover=x",
    ],
    ["a backtick", "https://example.invalid/a`x", "a%60x"],
  ])(
    "percent-encodes %s so it cannot break out of href",
    async (_label, url, encoded) => {
      const text = await deliveredText({
        alert: { name: "Player creation spike", status: "open", url },
      });
      expect(text).toContain(`<a href="https://example.invalid/${encoded}">`);
      // The raw character must not survive anywhere in the anchor.
      expect(text).not.toContain('a"onmouseover');
      expect(text).not.toContain("a`x");
    },
  );

  it("strips an embedded newline from the URL", async () => {
    const text = await deliveredText({
      alert: {
        name: "Player creation spike",
        status: "open",
        url: "https://example.invalid/a\nx",
      },
    });
    expect(text).toContain('<a href="https://example.invalid/ax">');
  });

  it("escapes the URL it embeds", async () => {
    const text = await deliveredText({
      alert: {
        name: "Player creation spike",
        status: "open",
        url: "https://example.invalid/a?x=1&y=2",
      },
    });
    expect(text).toContain("x=1&amp;y=2");
  });

  // The one display field that DOES survive verbatim passthrough: a static string an
  // operator hardcodes per monitor. Mutation killed: dropping payload display fields
  // wholesale as part of this fix.
  it("still renders a STATIC threshold an operator hardcoded", async () => {
    const text = await deliveredText({
      payload: { secret: SECRET, threshold: "300", window: "10 min" },
    });
    expect(text).toContain("300");
    expect(text).toContain("10 min");
  });

  it("names the status explicitly, normalised, not in the sender's vocabulary", async () => {
    expect(await deliveredText({})).toContain("Status: firing");
    const resolved = await deliveredText({
      id: "resolved-1",
      alert: { name: "Player creation spike", status: "closed" },
    });
    expect(resolved).toContain("Status: resolved");
    expect(resolved).toContain("resolved");
  });

  // ⚠️ The owner asked twice: what is wrong and where, never which tool noticed. The
  // vendor's hostname now travels in the link TARGET, so the assertion is about what
  // the operator SEES. Mutation killed: rendering the bare URL as visible text.
  it("keeps the tool's name out of the VISIBLE text even when the link carries it", async () => {
    const text = await deliveredText({
      alert: {
        name: "Player creation spike",
        status: "open",
        url: "https://uptrace.example.invalid/alert/9",
      },
    });
    const visible = text.replace(/<a href="[^"]*">/g, "").replace(/<\/a>/g, "");
    expect(visible.toLowerCase()).not.toContain("uptrace");
    expect(text).toContain("<a href=");
  });

  it("renders the complete firing message", async () => {
    expect(await deliveredText({ payload: { secret: SECRET } })).toBe(
      "🚨 Geoconflict · profile · Player creation spike\n" +
        "Status: firing\n" +
        "Since: 2026-09-17 14:02 UTC\n" +
        '→ <a href="https://example.invalid/alert/1">open the alert</a>',
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

// ── Task 0284 — the alert-path liveness probe ────────────────────────────────
//
// The guard for the 403 trap this file's header describes: a cron on the monitoring box
// POSTs here hourly over the real allowlist with the real secret, the relay stamps a
// marker and sends NOTHING, and profile-checks.sh pages through an EXTERNAL dead-man's
// switch when that marker goes stale.
//
// 🚩 The marker's SHAPE is a contract with a shell script in another language. Nothing
// but the tests below couples them, so they assert the exact bytes profile-checks.sh's
// `json_field` sed and `iso_to_epoch` can parse — not merely "a file was written".
describe("alert relay — the liveness probe (0284)", () => {
  function probeBody(
    over: Record<string, unknown> = {},
    payloadOver: Record<string, unknown> = {},
  ): Record<string, unknown> {
    return {
      payload: { secret: SECRET, probe: ALERT_PROBE_KEY, ...payloadOver },
      ...over,
    };
  }

  /**
   * profile-checks.sh's `json_field`, transcribed. The shell reads ONE key per line with
   * the key at the line start; a compact `JSON.stringify` would produce a file this
   * cannot parse, and the checker would page every day about a probe that is arriving.
   */
  const JSON_FIELD_FINISHED_AT =
    /^[ \t]*"finished_at"[ \t]*:[ \t]*"?([^",}]*)"?/;

  it("answers 2xx, writes the marker, and sends NOTHING", async () => {
    const h = build();
    const res = await post(h, probeBody());
    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.status).toBeLessThan(300);
    expect([401, 403, 404]).not.toContain(res.status);
    await h.settle();
    // The whole point: a probe must never produce a Telegram message, of either kind.
    expect(h.alerts).toHaveLength(0);
    expect(h.alarms).toHaveLength(0);
    expect(h.sent).toHaveLength(0);
    expect(existsSync(h.markerPath)).toBe(true);
    expect(h.metricCalls).toContainEqual(["probe", "unkeyed"]);
  });

  it("writes a marker the shell checker can actually parse", async () => {
    const at = Date.parse("2026-09-18T09:17:03.456Z");
    const h = build({ now: () => at });
    await post(h, probeBody());
    const raw = readFileSync(h.markerPath, "utf8");

    expect(JSON.parse(raw)).toEqual({
      schema: 1,
      finished_at: "2026-09-18T09:17:03Z",
      source: "alert-webhook-probe",
    });

    // `json_field` runs its sed line by line and takes `head -1`, so exactly one line
    // must carry the key — the property a compact stringify would destroy.
    const matching = raw
      .split("\n")
      .filter((line) => JSON_FIELD_FINISHED_AT.test(line));
    expect(matching).toHaveLength(1);
    const captured = JSON_FIELD_FINISHED_AT.exec(matching[0])?.[1];
    // And `iso_to_epoch` needs seconds precision with a trailing Z. Fractional seconds
    // are tolerated there, but a missing Z is not.
    expect(captured).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
    expect(Date.parse(captured ?? "")).toBe(Date.parse("2026-09-18T09:17:03Z"));

    // ⛔ Nothing from the request, ever — the secret least of all.
    expect(raw).not.toContain(SECRET);
    expect(raw).not.toContain(ALERT_PROBE_KEY);
  });

  // ⚠️ The mutation that would make the whole guard a lie: writing the marker before the
  // secret check. Anyone who can reach the route would keep the check green while every
  // real alert was being dropped for a secret mismatch.
  it.each([
    ["a wrong secret", { secret: "not-the-secret", probe: ALERT_PROBE_KEY }],
    ["no secret at all", { probe: ALERT_PROBE_KEY }],
  ])("answers 2xx but writes NO marker for %s", async (_label, payload) => {
    const h = build();
    const res = await post(h, { payload });
    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.status).toBeLessThan(300);
    await h.settle();
    expect(existsSync(h.markerPath)).toBe(false);
    expect(h.metricCalls.map(([result]) => result)).toContain("rejected");
    expect(h.metricCalls.map(([result]) => result)).not.toContain("probe");
  });

  // 🚨 FAIL TOWARD DELIVERY. If someone pastes `probe` into the monitoring stack's custom
  // payload, the naive rule would swallow EVERY REAL ALERT behind a 2xx — a worse failure
  // than the one this task fixes.
  it("relays a call as an ALERT when `probe` arrives alongside real alert fields", async () => {
    const h = build();
    const res = await post(
      h,
      webhookBody({
        payload: { secret: SECRET, probe: ALERT_PROBE_KEY, value: "412" },
      }),
    );
    expect(res.status).toBe(202);
    await h.settle();
    expect(h.alerts).toHaveLength(1);
    expect(h.alerts[0].text).toContain("Player creation spike");
    expect(existsSync(h.markerPath)).toBe(false);
    expect(h.metricCalls.map(([result]) => result)).not.toContain("probe");
  });

  // Same rule, the other half: a top-level `id` with no `alert` object is still an alert.
  it("relays a call as an ALERT when `probe` arrives with only a top-level id", async () => {
    const h = build();
    const res = await post(h, probeBody({ id: "555" }));
    expect(res.status).toBe(202);
    await h.settle();
    expect(h.alerts).toHaveLength(1);
    expect(existsSync(h.markerPath)).toBe(false);
  });

  // An unknown probe VALUE is not a probe. Same direction: deliver, never swallow.
  it("relays a call as an ALERT when the probe key carries an unknown value", async () => {
    const h = build();
    const res = await post(h, probeBody({}, { probe: "something-else" }));
    expect(res.status).toBe(202);
    await h.settle();
    expect(h.alerts).toHaveLength(1);
    expect(existsSync(h.markerPath)).toBe(false);
  });

  it("accepts the probe key with surrounding whitespace and odd casing", async () => {
    const h = build();
    const res = await post(h, probeBody({}, { probe: "  LiVeNeSs \n" }));
    expect(res.status).toBeLessThan(300);
    await h.settle();
    expect(h.sent).toHaveLength(0);
    expect(existsSync(h.markerPath)).toBe(true);
  });

  // A probe must not be able to suppress a later real alert: it never touches dedupe.
  it("creates no dedupe entry — a following real alert still delivers", async () => {
    const h = build();
    await post(h, probeBody());
    const res = await post(h, webhookBody());
    expect(res.status).toBe(202);
    await h.settle();
    expect(h.alerts).toHaveLength(1);
  });

  // Edge case 13: a run with no writable marker directory (local dev) must log and carry
  // on. And a non-2xx here would be read by nobody but the probe's own curl.
  it("still answers 2xx when the marker cannot be written", async () => {
    const h = build({
      writeMarkerFile: () => {
        throw new Error("EACCES: permission denied");
      },
    });
    const res = await post(h, probeBody());
    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.status).toBeLessThan(300);
    await h.settle();
    expect(existsSync(h.markerPath)).toBe(false);
    expect(h.sent).toHaveLength(0);
  });

  // The marker advances on every probe — a single stale stamp would page at 08:00 UTC.
  it("overwrites the marker on each probe rather than appending", async () => {
    let at = Date.parse("2026-09-18T09:00:00Z");
    const h = build({ now: () => at });
    await post(h, probeBody());
    at = Date.parse("2026-09-18T10:00:00Z");
    await post(h, probeBody());
    const raw = readFileSync(h.markerPath, "utf8");
    expect(JSON.parse(raw).finished_at).toBe("2026-09-18T10:00:00Z");
    expect(
      raw.split("\n").filter((l) => l.includes("finished_at")),
    ).toHaveLength(1);
  });

  // 🚫 The response body is persisted by the sender, so it stays a fixed constant here too.
  it("echoes nothing from the probe request in its response", async () => {
    const h = build();
    const res = await post(h, probeBody());
    expect(res.body).toEqual({ status: ALERT_PROBE_RESPONSE_STATUS });
    // Nothing from the request, and no secret — the sender persists the first 100 bytes.
    expect(JSON.stringify(res.body)).not.toContain(SECRET);
    expect(JSON.stringify(res.body)).not.toContain(ALERT_PROBE_KEY);
  });

  // Review R3 (owner ruling 2026-09-18). The probe's own exit code has to mean something: a
  // DROPPED call is deliberately a 200 as well, so if the two bodies matched, the operator
  // running the probe by hand during bring-up could not tell "marker written" from "call
  // thrown away for a wrong secret". Both halves are asserted here, in one test, because the
  // property is the DIFFERENCE between them.
  it("answers a probe with a body distinguishable from a dropped call's", async () => {
    const h = build();
    const probeRes = await post(h, probeBody());
    const droppedRes = await post(h, {
      payload: { secret: "not-the-secret", probe: ALERT_PROBE_KEY },
    });
    await h.settle();
    // ⛔ Still 200 on both — a 4xx would disable the notification channel.
    expect(probeRes.status).toBe(200);
    expect(droppedRes.status).toBe(200);
    expect(probeRes.body).not.toEqual(droppedRes.body);
    expect(droppedRes.body).toEqual({ status: "accepted" });
  });

  // Review R1 (2026-09-18). `probe` was typed `z.string()`, so a REAL alert whose custom
  // payload carried a non-string `probe` failed the WHOLE-body parse → `malformed` → dropped
  // at 200 and never sent. At HEAD (before the key existed) the same body was delivered, so
  // this task itself opened a second door past fail-toward-delivery. Every non-string kind is
  // covered: a number is the plausible paste, but an object or a boolean must not be a hole.
  it.each([
    ["a number", 1],
    ["a boolean", true],
    ["an object", { nested: "value" }],
    ["an array", ["liveness"]],
    ["null", null],
  ])(
    "still DELIVERS a real alert whose payload carries %s as `probe`",
    async (_label, probeValue) => {
      const h = build();
      const res = await post(
        h,
        webhookBody({
          payload: { secret: SECRET, value: "412", probe: probeValue },
        }),
      );
      expect(res.status).toBe(202);
      await h.settle();
      expect(h.alerts).toHaveLength(1);
      expect(h.alerts[0].text).toContain("Player creation spike");
      // The failure this guards: parsed away as malformed instead of delivered.
      expect(h.metricCalls.map(([result]) => result)).not.toContain(
        "malformed",
      );
      expect(existsSync(h.markerPath)).toBe(false);
    },
  );

  // Same rule for a probe-shaped body: a non-string `probe` is not a probe, and the safe
  // direction is to deliver it (as an unnamed alert), never to swallow it behind a 2xx.
  it("treats a probe-shaped body with a non-string `probe` as an alert, not a probe", async () => {
    const h = build();
    const res = await post(h, probeBody({}, { probe: 42 }));
    expect(res.status).toBe(202);
    await h.settle();
    expect(h.alerts).toHaveLength(1);
    expect(h.metricCalls.map(([result]) => result)).not.toContain("malformed");
    expect(existsSync(h.markerPath)).toBe(false);
  });
});
