// Task 0443 — the SSH alert route: every box's ssh-alerts.sh agent → the Alerts topic.
//
// What this pins: ordinary status codes (401 / 400 / 429 / 503 / 202 — deliberately NOT the
// alert relay's never-401 contract), the message wording, the login GROUPING the owner ruled
// (first login at once, matching logins in the next 2 minutes as ONE follow-up; key = box +
// source + method, so openfront + root share a group and a password login never hides in a key
// group), the daily store, and that no source address ever reaches a log line or a response.
//
// ⚠️ Uses supertest, so it carries the known supertest flake family (CLAUDE.md): judge a lone
// `Exceeded timeout of 5000 ms` by that rule before calling it a regression.

import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Writable } from "node:stream";
import request from "supertest";
import winston from "winston";
import type { TelegramConfig } from "../../src/core/notifications/TelegramNotifier";
import {
  createApp,
  type InboxRepo,
  type NameChangeRepo,
  type ProfileRepo,
} from "../../src/profile-server/Routes";
import { logger } from "../../src/profile-server/Logger";
import {
  failedSendsPath,
  formatEventMessage,
  readFailedSendsTotal,
  SshAlertEventSchema,
  SSH_ALERTS_AGENT_VERSION,
  SSH_ALERTS_PATH,
  SSH_LOGIN_GROUP_WINDOW_MS,
} from "../../src/profile-server/SshAlerts";
import { TEST_SESSION_CONFIG } from "./support/sessionToken";

const TOKEN = "test-ssh-alert-token-0443";
const TELEGRAM: TelegramConfig = {
  token: "test-bot-token",
  chatId: "-100999",
  proxyUrl: "",
  threadId: "77",
};

type Harness = {
  app: ReturnType<typeof createApp>;
  sent: string[];
  timers: Array<{ fn: () => void; ms: number }>;
  stateDir: string;
  clock: { t: number };
  settle: () => Promise<void>;
};

const dirs: string[] = [];
afterAll(() => {
  for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
});

function build(
  over: {
    token?: string;
    sendResult?: string;
    writeFile?: (path: string, contents: string) => void;
  } = {},
): Harness {
  const stateDir = mkdtempSync(join(tmpdir(), "ssh-alerts-"));
  dirs.push(stateDir);
  const sent: string[] = [];
  const pending: Array<Promise<unknown>> = [];
  const timers: Array<{ fn: () => void; ms: number }> = [];
  const clock = { t: Date.parse("2026-10-12T10:00:00Z") };
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
      sshAlerts: {
        token: over.token ?? TOKEN,
        telegram: TELEGRAM,
        send: ((_config: TelegramConfig, text: string) => {
          sent.push(text);
          const p = Promise.resolve({ result: over.sendResult ?? "sent" });
          pending.push(p);
          return p;
        }) as never,
        now: () => clock.t,
        stateDir,
        writeFile: over.writeFile,
        setTimer: (fn, ms) => {
          timers.push({ fn, ms });
          return undefined;
        },
      },
    },
  );
  return {
    app,
    sent,
    timers,
    stateDir,
    clock,
    settle: async () => {
      await Promise.allSettled(pending);
      await new Promise((resolve) => setImmediate(resolve));
    },
  };
}

function post(h: Harness, body: unknown, token: string | null = TOKEN) {
  const req = request(h.app).post(SSH_ALERTS_PATH);
  if (token !== null) req.set("Authorization", `Bearer ${token}`);
  return req.send(body as object);
}

function login(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    type: "login",
    box: "game-prod",
    agentVersion: SSH_ALERTS_AGENT_VERSION,
    at: "2026-10-12T10:00:05Z",
    user: "root",
    method: "key",
    source: "203.0.*.*",
    provider: "example-isp.net",
    ...over,
  };
}

function daily(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    type: "daily",
    box: "game-dev",
    agentVersion: SSH_ALERTS_AGENT_VERSION,
    at: "2026-10-12T08:00:00Z",
    failed: 1992,
    invalid: 597,
    bans: 319,
    journal: "ok",
    banLog: "ok",
    fail2ban: "up",
    ...over,
  };
}

describe("ssh alerts — status codes (ordinary ones, on purpose)", () => {
  it("answers 202 to a valid, authenticated event and delivers it", async () => {
    const h = build();
    const res = await post(h, login());
    expect(res.status).toBe(202);
    await h.settle();
    expect(h.sent).toHaveLength(1);
  });

  it("answers 401 to a missing or wrong token, and sends nothing", async () => {
    const h = build();
    expect((await post(h, login(), null)).status).toBe(401);
    expect((await post(h, login(), "wrong-token")).status).toBe(401);
    expect((await post(h, login(), `${TOKEN}x`)).status).toBe(401);
    await h.settle();
    expect(h.sent).toHaveLength(0);
  });

  it("answers 503 to everything when no token is configured (never open)", async () => {
    const h = build({ token: "" });
    expect((await post(h, login(), "")).status).toBe(503);
    expect((await post(h, login(), "anything")).status).toBe(503);
    await h.settle();
    expect(h.sent).toHaveLength(0);
  });

  it.each([
    ["an unknown box", login({ box: "laptop" })],
    ["an unknown type", { ...login(), type: "shell" }],
    ["a FULL IPv4 address as source", login({ source: "203.0.113.57" })],
    ["a FULL IPv6 address as source", login({ source: "2001:db8:77:5::9" })],
    ["a half-masked address as source", login({ source: "203.0.113.*" })],
    ["a source with stray characters", login({ source: "203.0.*.*<b>" })],
    ["a user with spaces", login({ user: "root admin" })],
    ["an unknown method", login({ method: "telepathy" })],
    ["a non-ISO time", login({ at: "yesterday" })],
    ["a negative count", daily({ failed: -1 })],
    ["an unknown fail2ban status", daily({ fail2ban: "sleepy" })],
  ])("answers 400 to %s", async (_label, body) => {
    const h = build();
    const res = await post(h, body);
    expect(res.status).toBe(400);
    await h.settle();
    expect(h.sent).toHaveLength(0);
  });

  it("strips (does not reject) a field a NEWER agent adds — a 400 would drop it for good", async () => {
    const h = build();
    const res = await post(h, login({ futureField: "x" }));
    expect(res.status).toBe(202);
  });

  it("answers 429 once the route's own limiter is exceeded", async () => {
    const h = build();
    let last = 0;
    for (let i = 0; i < 61; i++) {
      last = (await post(h, { type: "nope" })).status;
    }
    expect(last).toBe(429);
  });

  it("echoes nothing from the request in any response body", async () => {
    const h = build();
    for (const res of [
      await post(h, login()),
      await post(h, login({ box: "laptop" })),
      await post(h, login(), "wrong"),
    ]) {
      expect(JSON.stringify(res.body)).not.toContain("203.0");
      expect(JSON.stringify(res.body)).not.toContain("example-isp");
    }
  });
});

describe("ssh alerts — the agent's wire shapes are accepted (contract)", () => {
  // Copied BYTE FOR BYTE from bodies ssh-alerts.sh produced in tests/ssh-alerts.sh. If the
  // agent's printf and this schema ever drift apart, every event of that type would 400 and
  // be dropped on the box — so the pair is pinned here.
  it.each([
    '{"type":"login","box":"game-prod","agentVersion":1,"at":"2025-10-12T09:00:00Z","user":"root","method":"key","source":"203.0.*.*","provider":"example-isp.net"}',
    '{"type":"login","box":"game-prod","agentVersion":1,"at":"2025-10-12T09:00:05Z","user":"deploy","method":"password","source":"2001:db8::*","provider":"unknown"}',
    '{"type":"login","box":"game-prod","agentVersion":1,"at":"2025-10-12T09:00:05Z","user":"unprintable","method":"other","source":"unknown","provider":"unknown"}',
    '{"type":"daily","box":"game-dev","agentVersion":1,"at":"2026-10-12T08:00:00Z","failed":3,"invalid":2,"bans":2,"journal":"ok","banLog":"ok","fail2ban":"up"}',
    '{"type":"daily","box":"game-dev","agentVersion":1,"at":"2026-10-12T08:00:00Z","failed":null,"invalid":null,"bans":null,"journal":"unreadable","banLog":"unreadable","fail2ban":"up"}',
    '{"type":"dropped","box":"game-dev","agentVersion":1,"at":"2026-10-12T08:00:00Z","count":2}',
    '{"type":"fail2ban","box":"game-dev","agentVersion":1,"at":"2026-10-12T08:00:00Z","event":"back","status":"up"}',
    '{"type":"fail2ban","box":"game-dev","agentVersion":1,"at":"2026-10-12T08:00:00Z","event":"down","status":"not-installed","since":"2025-10-12T09:00:00Z"}',
    '{"type":"fail2ban","box":"game-dev","agentVersion":1,"at":"2026-10-12T08:00:00Z","event":"reminder","status":"down","since":"2025-10-12T09:05:00Z"}',
    '{"type":"test","box":"telemetry","agentVersion":1,"at":"2026-10-12T08:00:00Z"}',
  ])("accepts %s", (raw) => {
    expect(SshAlertEventSchema.safeParse(JSON.parse(raw)).success).toBe(true);
  });
});

describe("ssh alerts — messages", () => {
  it("a key login: box, user, method, masked source + provider, UTC time", async () => {
    const h = build();
    await post(h, login());
    await h.settle();
    expect(h.sent[0]).toBe(
      [
        "🔑 SSH login · game-prod",
        "User: root · by key",
        "From: 203.0.*.* (example-isp.net)",
        "Time: 2026-10-12 10:00 UTC",
      ].join("\n"),
    );
  });

  it("a PASSWORD login is flagged in the heading", async () => {
    const h = build();
    await post(h, login({ method: "password", user: "openfront" }));
    await h.settle();
    expect(h.sent[0]).toMatch(
      /^⚠️ SSH login by PASSWORD · game-prod\nUser: openfront · by PASSWORD/,
    );
  });

  it("fail2ban down / reminder / back read plainly", () => {
    const base = {
      box: "game-dev",
      agentVersion: 1,
      at: "2026-10-12T10:00:00Z",
    } as const;
    expect(
      formatEventMessage({
        ...base,
        type: "fail2ban",
        event: "down",
        status: "not-installed",
        since: "2026-10-12T09:55:00Z",
      }),
    ).toBe(
      "🚨 fail2ban DOWN · game-dev\nState: not installed\nSince: 2026-10-12 09:55 UTC\nPassword guessers are NOT being banned on this box.",
    );
    expect(
      formatEventMessage({
        ...base,
        type: "fail2ban",
        event: "reminder",
        status: "jail-missing",
      }),
    ).toMatch(
      /^🚨 fail2ban STILL DOWN · game-dev \(reminder every 12 h\)\nState: running, but its sshd jail is missing/,
    );
    expect(
      formatEventMessage({
        ...base,
        type: "fail2ban",
        event: "back",
        status: "up",
      }),
    ).toMatch(/^✅ fail2ban back · game-dev/);
  });

  it("test and dropped events are delivered; a daily report is NOT messaged", async () => {
    const h = build();
    await post(h, {
      type: "test",
      box: "telemetry",
      agentVersion: 1,
      at: "2026-10-12T10:00:00Z",
    });
    await post(h, {
      type: "dropped",
      box: "telemetry",
      agentVersion: 1,
      at: "2026-10-12T10:00:00Z",
      count: 4,
    });
    await post(h, daily());
    await h.settle();
    expect(h.sent).toHaveLength(2);
    expect(h.sent[0]).toMatch(/^🧪 SSH alerts test · telemetry/);
    expect(h.sent[1]).toMatch(
      /4 alert\(s\) could not be delivered within 24 h/,
    );
  });

  it("nothing the operator reads names the tooling", () => {
    const text =
      formatEventMessage({
        type: "test",
        box: "profile",
        agentVersion: 1,
        at: "2026-10-12T10:00:00Z",
      }) ?? "";
    expect(text.toLowerCase()).not.toMatch(/uptrace|fkit/);
  });
});

describe("ssh alerts — grouping (owner ruling: first now + one follow-up)", () => {
  it("first login at once; matching logins within 2 minutes become ONE follow-up listing the users", async () => {
    const h = build();
    await post(h, login({ user: "openfront" }));
    h.clock.t += 10_000;
    await post(h, login({ user: "root" }));
    h.clock.t += 10_000;
    await post(h, login({ user: "root" }));
    await h.settle();
    expect(h.sent).toHaveLength(1);
    expect(h.timers).toHaveLength(1);
    expect(h.timers[0].ms).toBe(SSH_LOGIN_GROUP_WINDOW_MS - 10_000);
    h.timers[0].fn();
    await h.settle();
    expect(h.sent).toHaveLength(2);
    expect(h.sent[1]).toMatch(
      /^🔑 \+2 more SSH logins · game-prod\nUsers: root · by key\nFrom: 203\.0\.\*\.\* \(example-isp\.net\)/,
    );
  });

  it("a deploy's openfront + root logins share ONE group (users are listed, not keyed)", async () => {
    const h = build();
    await post(h, login({ user: "openfront" }));
    h.clock.t += 30_000;
    await post(h, login({ user: "root" }));
    h.timers[0].fn();
    await h.settle();
    expect(h.sent).toHaveLength(2);
    expect(h.sent[1]).toContain("+1 more SSH login · game-prod");
    expect(h.sent[1]).toContain("Users: root");
  });

  it("a PASSWORD login never hides inside a KEY group: it gets its own immediate message", async () => {
    const h = build();
    await post(h, login({ method: "key" }));
    h.clock.t += 5_000;
    await post(h, login({ method: "password" }));
    await h.settle();
    expect(h.sent).toHaveLength(2);
    expect(h.sent[1]).toMatch(/^⚠️ SSH login by PASSWORD/);
  });

  it("another source or another box is another group", async () => {
    const h = build();
    await post(h, login());
    await post(h, login({ source: "198.51.*.*" }));
    await post(h, login({ box: "game-dev" }));
    await h.settle();
    expect(h.sent).toHaveLength(3);
  });

  it("after the window a matching login opens a NEW group (sent at once)", async () => {
    const h = build();
    await post(h, login());
    h.clock.t += SSH_LOGIN_GROUP_WINDOW_MS + 1;
    await post(h, login());
    await h.settle();
    expect(h.sent).toHaveLength(2);
    expect(h.timers).toHaveLength(0);
  });

  it("logins that HAPPENED far apart are not grouped, even when they ARRIVE together (spool replay, review R4a)", async () => {
    const h = build();
    await post(h, login({ at: "2026-10-12T07:00:00Z" }));
    h.clock.t += 1_000;
    await post(h, login({ at: "2026-10-12T09:30:00Z", user: "openfront" }));
    await h.settle();
    expect(h.sent).toHaveLength(2);
    expect(h.sent[0]).toContain("Time: 2026-10-12 07:00 UTC");
    expect(h.sent[1]).toContain("Time: 2026-10-12 09:30 UTC");
    expect(h.sent.join("\n")).not.toContain("more SSH login");
  });

  it("a group replaced before its timer fires still sends its follow-up, and the old timer leaves the new group alone (review R4b)", async () => {
    const h = build();
    await post(h, login({ user: "openfront" }));
    h.clock.t += 10_000;
    await post(h, login({ user: "root" })); // joins; the follow-up timer is set
    expect(h.timers).toHaveLength(1);
    // The window has run out but the timer has not fired yet (timer lag): a new login replaces
    // the group — the old follow-up must go out now, not be lost.
    h.clock.t += SSH_LOGIN_GROUP_WINDOW_MS;
    await post(h, login({ user: "deploy", at: "2026-10-12T10:02:30Z" }));
    await h.settle();
    expect(h.sent).toHaveLength(3);
    expect(h.sent[1]).toContain("+1 more SSH login · game-prod");
    expect(h.sent[1]).toContain("Users: root");
    expect(h.sent[2]).toContain("User: deploy");
    // The OLD timer fires late: nothing is sent twice, and the new group survives it.
    h.timers[0].fn();
    h.clock.t += 5_000;
    await post(h, login({ user: "root", at: "2026-10-12T10:02:35Z" }));
    expect(h.timers).toHaveLength(2);
    h.timers[1].fn();
    await h.settle();
    expect(h.sent).toHaveLength(4);
    expect(h.sent[3]).toContain("+1 more SSH login · game-prod");
    expect(h.sent[3]).toContain("(2026-10-12 10:02 UTC)");
  });

  it("a lone login sends no follow-up at all", async () => {
    const h = build();
    await post(h, login());
    await h.settle();
    expect(h.timers).toHaveLength(0);
    expect(h.sent).toHaveLength(1);
  });
});

describe("ssh alerts — the daily store", () => {
  it("stores the latest report per box, atomically, 0600, and answers 202", async () => {
    const h = build();
    expect((await post(h, daily())).status).toBe(202);
    expect((await post(h, daily({ failed: 5 }))).status).toBe(202);
    const stored = JSON.parse(
      readFileSync(join(h.stateDir, "daily-game-dev.json"), "utf8"),
    );
    expect(stored).toMatchObject({
      schema: 1,
      receivedAt: "2026-10-12T10:00:00Z",
    });
    expect(stored.report.failed).toBe(5);
    await h.settle();
    expect(h.sent).toHaveLength(0);
  });

  it("answers 500 when the report cannot be stored, so the agent keeps it and retries", async () => {
    const h = build({
      writeFile: () => {
        throw new Error("disk full");
      },
    });
    expect((await post(h, daily())).status).toBe(500);
  });
});

describe("ssh alerts — a send that still fails is counted for the digest (ADR-114 Decision 6, review R1)", () => {
  it("every failed send bumps the running total; a delivered one does not", async () => {
    const failing = build({ sendResult: "network_error" });
    await post(failing, login());
    await post(failing, {
      type: "test",
      box: "telemetry",
      agentVersion: SSH_ALERTS_AGENT_VERSION,
      at: "2026-10-12T10:00:06Z",
    });
    await failing.settle();
    const path = failedSendsPath(failing.stateDir);
    expect(readFailedSendsTotal(path)).toBe(2);
    expect(JSON.parse(readFileSync(path, "utf8"))).toMatchObject({
      schema: 1,
      total: 2,
      lastAt: "2026-10-12T10:00:00Z",
    });

    const ok = build();
    await post(ok, login());
    await ok.settle();
    expect(readFailedSendsTotal(failedSendsPath(ok.stateDir))).toBe(0);
  });

  it("a total it cannot write never breaks the route", async () => {
    const h = build({
      sendResult: "network_error",
      writeFile: () => {
        throw new Error("read-only");
      },
    });
    expect((await post(h, login())).status).toBe(202);
    await h.settle();
  });

  it("an unreadable or nonsense total reads as 0", () => {
    const read = (text: string) => () => text;
    expect(readFailedSendsTotal("/x", read("{not json"))).toBe(0);
    expect(readFailedSendsTotal("/x", read('{"total":-3}'))).toBe(0);
    expect(readFailedSendsTotal("/x", read('{"total":"7"}'))).toBe(0);
    expect(readFailedSendsTotal("/x", read('{"total":7}'))).toBe(7);
  });
});

describe("ssh alerts — privacy", () => {
  it("no source address and no token reaches any log line, even on failures", async () => {
    // A transport on the SHARED logger (child loggers write through it), so every line the
    // route logs is captured whatever jest does with the console.
    const writes: string[] = [];
    const capture = new winston.transports.Stream({
      stream: new Writable({
        write(chunk, _encoding, done) {
          writes.push(String(chunk));
          done();
        },
      }),
    });
    logger.add(capture);
    try {
      const h = build({ sendResult: "network_error" });
      await post(h, login());
      await post(h, login({ source: "203.0.113.57" }));
      await post(h, login(), "wrong");
      await h.settle();
      for (
        let i = 0;
        i < 100 && !writes.join("\n").includes("NOT delivered");
        i++
      ) {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      const all = writes.join("\n");
      expect(all).toContain("NOT delivered");
      expect(all).toContain("rejected a malformed event (400)");
      expect(all).not.toContain("203.0");
      expect(all).not.toContain("example-isp");
      expect(all).not.toContain(TOKEN);
    } finally {
      logger.remove(capture);
    }
  });
});
