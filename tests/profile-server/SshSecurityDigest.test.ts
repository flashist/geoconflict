// Task 0443 — the daily SSH security digest (one message a day, Alerts topic).
//
// The rule this file pins hardest: a missing number must never look like "0 attacks". A box
// with no report in 26 h, a box that never reported, an unreadable report and an unreadable
// count each say so in words.

import type { TelegramConfig } from "../../src/core/notifications/TelegramNotifier";
import {
  SSH_ALERTS_AGENT_VERSION,
  dailyReportPath,
  failedSendsPath,
} from "../../src/profile-server/SshAlerts";
import {
  formatBoxLine,
  runSshSecurityDigest,
  SSH_DAILY_FRESH_MS,
  SSH_DAILY_STALE_MS,
  type StoredDaily,
} from "../../src/profile-server/SshSecurityDigest";

const TELEGRAM: TelegramConfig = {
  token: "t",
  chatId: "-1",
  proxyUrl: "",
  threadId: "77",
};
const AT = new Date("2026-10-12T08:10:00Z");
const DIR = "/state";

function report(over: Record<string, unknown> = {}) {
  return {
    type: "daily" as const,
    box: "game-prod" as const,
    agentVersion: SSH_ALERTS_AGENT_VERSION,
    at: "2026-10-12T08:00:00Z",
    failed: 1992,
    invalid: 597,
    bans: 319,
    journal: "ok" as const,
    banLog: "ok" as const,
    fail2ban: "up" as const,
    ...over,
  };
}

function stored(
  over: Record<string, unknown> = {},
  receivedAt = "2026-10-12T08:00:03Z",
): StoredDaily {
  return { kind: "ok", receivedAt, report: report(over) as never };
}

function files(map: Record<string, unknown>): (path: string) => string {
  return (path) => {
    if (!(path in map)) {
      throw Object.assign(new Error("nope"), { code: "ENOENT" });
    }
    const value = map[path];
    if (value instanceof Error) throw value;
    return typeof value === "string" ? value : JSON.stringify(value);
  };
}

describe("ssh security digest — one line per box", () => {
  it("ok: all three counts and fail2ban's state", () => {
    expect(formatBoxLine("game-prod", stored(), AT)).toBe(
      "game-prod: 1992 failed logins · 597 unknown-user tries · 319 bans · fail2ban up",
    );
  });

  it("unreadable counts are spelled UNREADABLE — never 0", () => {
    const line = formatBoxLine(
      "game-dev",
      stored({
        failed: null,
        invalid: null,
        bans: null,
        journal: "unreadable",
        banLog: "unreadable",
      }),
      AT,
    );
    expect(line).toBe(
      "game-dev: failed logins UNREADABLE · unknown-user tries UNREADABLE · bans UNREADABLE · fail2ban up",
    );
    expect(line).not.toMatch(/\b0\b/);
  });

  it("a ban log that does not reach back 24 h is marked partial", () => {
    expect(
      formatBoxLine("profile", stored({ bans: 45, banLog: "partial" }), AT),
    ).toContain("45 bans (ban log covers less than 24 h)");
  });

  it("fail2ban not up is loud", () => {
    expect(
      formatBoxLine("telemetry", stored({ fail2ban: "not-installed" }), AT),
    ).toContain("fail2ban NOT INSTALLED");
    expect(
      formatBoxLine("telemetry", stored({ fail2ban: "down" }), AT),
    ).toContain("fail2ban DOWN");
  });

  it("no report in more than 26 h reads 'NO REPORT since …', never a count", () => {
    const old =
      new Date(AT.getTime() - SSH_DAILY_STALE_MS - 60_000)
        .toISOString()
        .slice(0, 19) + "Z";
    const line = formatBoxLine("game-prod", stored({}, old), AT);
    expect(line).toBe(
      `game-prod: NO REPORT since ${old.slice(0, 16).replace("T", " ")} UTC`,
    );
    expect(line).not.toContain("1992");
  });

  it("yesterday's report, when today's has not arrived, is marked OLD with its time — never passed off as today's (review R7)", () => {
    const yesterday =
      new Date(AT.getTime() - SSH_DAILY_FRESH_MS - 60_000)
        .toISOString()
        .slice(0, 19) + "Z";
    const line = formatBoxLine("game-prod", stored({}, yesterday), AT);
    expect(line).toBe(
      `game-prod: ⚠️ OLD numbers from ${yesterday.slice(0, 16).replace("T", " ")} UTC, ` +
        "today's report has not arrived · 1992 failed logins · 597 unknown-user tries · 319 bans · fail2ban up",
    );
    expect(formatBoxLine("game-prod", stored(), AT)).not.toContain("OLD");
  });

  it("a box that never reported, and an unreadable stored report, are NO REPORT", () => {
    expect(formatBoxLine("game-dev", { kind: "missing" }, AT)).toBe(
      "game-dev: NO REPORT — never reported (is its agent installed?)",
    );
    expect(formatBoxLine("game-dev", { kind: "unreadable" }, AT)).toBe(
      "game-dev: NO REPORT — its stored report is unreadable",
    );
  });

  it("an outdated agent is flagged on that box's line", () => {
    expect(
      formatBoxLine(
        "game-prod",
        stored({ agentVersion: SSH_ALERTS_AGENT_VERSION - 1 }),
        AT,
      ),
    ).toContain(
      `agent v${SSH_ALERTS_AGENT_VERSION - 1} is outdated (current v${SSH_ALERTS_AGENT_VERSION}) — redeploy this box`,
    );
    expect(formatBoxLine("game-prod", stored(), AT)).not.toContain("outdated");
  });
});

describe("ssh security digest — the run", () => {
  function run(map: Record<string, unknown>, result = "sent") {
    const sent: string[] = [];
    const markers: Array<[string, string]> = [];
    const promise = runSshSecurityDigest({
      telegram: TELEGRAM,
      send: (async (_c: TelegramConfig, text: string) => {
        sent.push(text);
        return { result };
      }) as never,
      now: () => AT,
      stateDir: DIR,
      readFile: files(map),
      markerPath: "/state/last-ssh-digest.json",
      writeMarkerFile: (path, contents) => markers.push([path, contents]),
    });
    return { promise, sent, markers };
  }

  it("sends ONE message with every expected box — even with no reports at all", async () => {
    const r = run({});
    expect(await r.promise).toBe("sent");
    expect(r.sent).toHaveLength(1);
    const lines = r.sent[0].split("\n");
    expect(lines[0]).toBe("🛡 SSH security · daily · 2026-10-12");
    for (const box of ["game-prod", "game-dev", "profile", "telemetry"]) {
      expect(r.sent[0]).toContain(`${box}: NO REPORT — never reported`);
    }
    expect(r.sent[0]).not.toContain("game-staging");
    expect(r.sent[0]).toContain(
      "NO REPORT means the numbers are unknown — not zero.",
    );
  });

  it("reads each box's stored report; a staging box appears once it has reported", async () => {
    const r = run({
      [dailyReportPath(DIR, "game-prod")]: {
        schema: 1,
        receivedAt: "2026-10-12T08:00:03Z",
        report: report(),
      },
      [dailyReportPath(DIR, "game-staging")]: {
        schema: 1,
        receivedAt: "2026-10-12T08:00:04Z",
        report: report({ box: "game-staging", failed: 7 }),
      },
      [dailyReportPath(DIR, "profile")]: "{not json",
    });
    await r.promise;
    expect(r.sent[0]).toContain("game-prod: 1992 failed logins");
    expect(r.sent[0]).toContain("game-staging: 7 failed logins");
    expect(r.sent[0]).toContain(
      "profile: NO REPORT — its stored report is unreadable",
    );
    expect(r.sent[0]).toContain("telemetry: NO REPORT — never reported");
  });

  it("writes the marker ONLY after a successful send", async () => {
    const ok = run({});
    await ok.promise;
    expect(ok.markers).toHaveLength(1);
    expect(JSON.parse(ok.markers[0][1])).toEqual({
      schema: 1,
      finished_at: "2026-10-12T08:10:00Z",
      source: "ssh-security-digest",
      failedSendsTotal: 0,
    });
    const failed = run({}, "network_error");
    expect(await failed.promise).toBe("failed");
    expect(failed.markers).toHaveLength(0);
  });

  it("says how many SSH alerts could not be sent since the last digest, and remembers the total (review R1)", async () => {
    const marker = "/state/last-ssh-digest.json";
    const first = run({ [failedSendsPath(DIR)]: { schema: 1, total: 5 } });
    await first.promise;
    expect(first.sent[0]).toContain(
      "⚠️ 5 SSH alert messages could not be sent to Telegram since the last digest",
    );
    expect(JSON.parse(first.markers[0][1]).failedSendsTotal).toBe(5);

    // Next day: two more failed (total 7), the marker holds 5 → "2".
    const next = run({
      [failedSendsPath(DIR)]: { schema: 1, total: 7 },
      [marker]: { schema: 1, finished_at: "x", failedSendsTotal: 5 },
    });
    await next.promise;
    expect(next.sent[0]).toContain("⚠️ 2 SSH alert messages could not be sent");

    // Nothing new → no line at all.
    const quiet = run({
      [failedSendsPath(DIR)]: { schema: 1, total: 7 },
      [marker]: { schema: 1, finished_at: "x", failedSendsTotal: 7 },
    });
    await quiet.promise;
    expect(quiet.sent[0]).not.toContain("could not be sent");

    // The total file was lost/reset below the last report → everything in it is new.
    const reset = run({
      [failedSendsPath(DIR)]: { schema: 1, total: 1 },
      [marker]: { schema: 1, finished_at: "x", failedSendsTotal: 7 },
    });
    await reset.promise;
    expect(reset.sent[0]).toContain("⚠️ 1 SSH alert message could not be sent");
  });

  it("a failed digest does not move the remembered total, so the next one still reports it", async () => {
    const failed = run(
      { [failedSendsPath(DIR)]: { schema: 1, total: 3 } },
      "network_error",
    );
    expect(await failed.promise).toBe("failed");
    expect(failed.markers).toHaveLength(0);
  });

  it("the footer says an unknown-user password try counts in both numbers (review R9)", async () => {
    const r = run({});
    await r.promise;
    expect(r.sent[0]).toContain(
      "An unknown-user try that also sent a password counts in both failed logins and unknown-user tries.",
    );
  });

  it("sent_after_retry is a success", async () => {
    const r = run({}, "sent_after_retry");
    expect(await r.promise).toBe("sent");
    expect(r.markers).toHaveLength(1);
  });
});
