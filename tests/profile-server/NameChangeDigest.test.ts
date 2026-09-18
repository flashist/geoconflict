// Unit tests for the daily name-change digest (task 0283) over a scripted fake Pool —
// the same harness idea as NameChangeRepository.test.ts. The DB-backed proof (the real
// partial unique index, real constraints) is tests/integration/NameChange.it.test.ts;
// this file covers the counting contract, the send contract, the owner's zero-count
// ruling, and what a failure is allowed to log.

const telegramSend = jest.fn();
jest.mock("../../src/core/notifications/TelegramNotifier", () => ({
  sendTelegramMessage: (...args: unknown[]) => telegramSend(...args),
  escapeTelegramHtml: (text: string) => text,
}));

const logError = jest.fn();
const logInfo = jest.fn();
jest.mock("../../src/profile-server/Logger", () => ({
  // Lazy wrappers: jest.mock is hoisted above the consts above, and the module under
  // test calls logger.child() at import time — a direct reference would be in the TDZ.
  logger: {
    child: () => ({
      error: (...args: unknown[]) => logError(...args),
      info: (...args: unknown[]) => logInfo(...args),
      warn: () => {},
    }),
  },
  formatError: (error: unknown) => String(error),
}));

import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  NAME_CHANGE_DIGEST_MARKER_PATH,
  PENDING_COUNT_SQL,
  countPendingNameChanges,
  formatNameChangeDigest,
  runNameChangeDigest,
} from "../../src/profile-server/NameChangeDigest";

const SOURCE_PATH = join(
  __dirname,
  "../../src/profile-server/NameChangeDigest.ts",
);

/** The secrets a log line must never carry, in visibly synthetic form. */
const FAKE_TOKEN = "1234567:FAKE-TOKEN-0283-NOTREAL";
const FAKE_CHAT_ID = "-1000283000000";
const FAKE_TOPIC = "283283";
const FAKE_PROXY = "http://proxy-0283.example.invalid:3128";

const TELEGRAM = {
  token: FAKE_TOKEN,
  chatId: FAKE_CHAT_ID,
  proxyUrl: FAKE_PROXY,
  threadId: FAKE_TOPIC,
};

const AT = new Date("2026-09-19T04:00:07.500Z");

/** A pool that answers the pending count and throws on anything else. */
function fakePool(pending: number) {
  const query = jest.fn(async (sql: string) => {
    if (sql.includes("player_name_history")) {
      return { rows: [{ pending }], rowCount: 1 };
    }
    throw new Error(`unexpected SQL: ${sql}`);
  });
  return { pool: { query } as never, query };
}

/** deps with every side effect captured — nothing here touches disk or the network. */
function deps(pending: number, outcome: unknown = { result: "sent" }) {
  const { pool, query } = fakePool(pending);
  // Typed parameters, not a bare `jest.fn()`: the assertions below read
  // `mock.calls[0][0]` and `[0][1]`, which an untyped mock types as an empty tuple.
  const send = jest.fn(async (config: unknown, text: unknown) => {
    void config;
    void text;
    return outcome;
  });
  const writeMarkerFile = jest.fn((path: string, contents: string) => {
    void path;
    void contents;
  });
  return {
    query,
    send,
    writeMarkerFile,
    args: {
      pool,
      telegram: TELEGRAM,
      send,
      writeMarkerFile,
      markerPath: "/tmp/does-not-exist-0283/marker.json",
      now: () => AT,
    } as never,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  telegramSend.mockResolvedValue({ result: "sent" });
});

describe("countPendingNameChanges", () => {
  it("counts pending ROWS, which the partial unique index makes equal to waiting PLAYERS", async () => {
    const { pool, query } = fakePool(3);
    await expect(countPendingNameChanges(pool)).resolves.toBe(3);
    const sql = query.mock.calls[0][0];
    expect(sql).toContain("player_name_history");
    expect(sql).toContain("moderation_status = 'pending'");
    // ⛔ player_name_history_one_pending_uq already guarantees one pending row per
    // player. A DISTINCT or GROUP BY here would assert a duplicate the schema forbids —
    // and would be the shape a later "improvement" reaches for.
    expect(sql).not.toMatch(/DISTINCT/i);
    expect(sql).not.toMatch(/GROUP\s+BY/i);
    expect(PENDING_COUNT_SQL).toBe(sql);
  });

  it("reads 0 from an empty result rather than NaN or undefined", async () => {
    const query = jest.fn(async () => ({ rows: [], rowCount: 0 }));
    await expect(countPendingNameChanges({ query } as never)).resolves.toBe(0);
  });
});

describe("formatNameChangeDigest", () => {
  it("renders the count and a minute-precision UTC stamp", () => {
    expect(formatNameChangeDigest(3, AT)).toBe(
      [
        "<b>[Name change] Daily digest</b>",
        "Waiting for review: 3",
        "2026-09-19 04:00 UTC",
      ].join("\n"),
    );
  });
});

describe("runNameChangeDigest", () => {
  // ⛔ OWNER RULING, 2026-09-17. The daily arrival is the Telegram-delivery heartbeat,
  // so the message's ABSENCE is the signal. A test asserting "no send when empty" would
  // assert the opposite of the ruling — this is the case that pins it.
  it("SENDS when the count is zero — the daily message is the heartbeat", async () => {
    const d = deps(0);
    await expect(runNameChangeDigest(d.args)).resolves.toBe("sent");
    expect(d.send).toHaveBeenCalledTimes(1);
    expect(d.send.mock.calls[0][1]).toContain("Waiting for review: 0");
  });

  it("sends exactly once per invocation, carrying the non-zero count", async () => {
    const d = deps(7);
    await expect(runNameChangeDigest(d.args)).resolves.toBe("sent");
    expect(d.send).toHaveBeenCalledTimes(1);
    expect(d.send.mock.calls[0][1]).toContain("Waiting for review: 7");
    expect(logError).not.toHaveBeenCalled();
  });

  it("routes into the topic it was given (the Name Changes forum topic)", async () => {
    const d = deps(1);
    await runNameChangeDigest(d.args);
    expect(d.send.mock.calls[0][0]).toEqual(TELEGRAM);
    expect((d.send.mock.calls[0][0] as { threadId: string }).threadId).toBe(
      FAKE_TOPIC,
    );
  });

  // Task 0277's lesson (NameChangeRepository.ts:545-551): a rescued retry is a SUCCESS.
  // Treating it as a failure would log an error for every message the 0061 fix saved.
  it("treats sent_after_retry as success, logging nothing", async () => {
    const d = deps(2, { result: "sent_after_retry" });
    await expect(runNameChangeDigest(d.args)).resolves.toBe("sent");
    expect(logError).not.toHaveBeenCalled();
    expect(d.writeMarkerFile).toHaveBeenCalledTimes(1);
  });

  it.each(["http_error", "network_error", "not_configured"])(
    "reports %s as failed, loudly, and leaks nothing",
    async (result) => {
      const d = deps(4, { result, status: 429, code: "ECONNRESET" });
      await expect(runNameChangeDigest(d.args)).resolves.toBe("failed");
      expect(logError).toHaveBeenCalledTimes(1);
      const line = String(logError.mock.calls[0][0]);
      expect(line).toContain(result);
      for (const secret of [FAKE_TOKEN, FAKE_CHAT_ID, FAKE_TOPIC, FAKE_PROXY]) {
        expect(line).not.toContain(secret);
      }
      expect(line).not.toContain("api.telegram.org");
    },
  );

  it("withholds the marker when the send failed — a failed run must let it AGE", async () => {
    const d = deps(4, { result: "http_error", status: 500 });
    await expect(runNameChangeDigest(d.args)).resolves.toBe("failed");
    expect(d.writeMarkerFile).not.toHaveBeenCalled();
  });

  it("stamps the marker in the shape profile-checks.sh parses", async () => {
    const d = deps(0);
    await runNameChangeDigest(d.args);
    const [path, contents] = d.writeMarkerFile.mock.calls[0] as [
      string,
      string,
    ];
    expect(path).toBe("/tmp/does-not-exist-0283/marker.json");
    // One key per line, key at the line start, seconds-precision ISO with a trailing Z:
    // that is a contract with a shell `sed` reader, not a formatting preference.
    expect(contents).toContain('\n  "finished_at": "2026-09-19T04:00:07Z"');
    expect(JSON.parse(contents)).toEqual({
      schema: 1,
      finished_at: "2026-09-19T04:00:07Z",
      source: "name-change-digest",
    });
  });

  // Review R8. The field is called `finished_at` and profile-checks.sh turns it into
  // "how long since a digest ARRIVED", so it must be read after the send, not before the
  // query. A clock that advances between the two calls is the only way to tell the two
  // apart — the other cases use a frozen `now`, which cannot.
  it("stamps finished_at AFTER the send, not at the start of the run", async () => {
    const d = deps(0);
    const ticks = [
      new Date("2026-09-19T04:00:00Z"),
      new Date("2026-09-19T04:00:09Z"),
    ];
    let tick = 0;
    (d.args as { now: () => Date }).now = () =>
      ticks[Math.min(tick++, ticks.length - 1)];
    await runNameChangeDigest(d.args);
    const [, contents] = d.writeMarkerFile.mock.calls[0] as [string, string];
    expect(JSON.parse(contents).finished_at).toBe("2026-09-19T04:00:09Z");
    // …and the message still carries the start stamp, which is what it means.
    expect(d.send.mock.calls[0][1]).toContain("2026-09-19 04:00 UTC");
  });

  it("still reports success when the marker write throws — the message DID arrive", async () => {
    const d = deps(1);
    d.writeMarkerFile.mockImplementation(() => {
      throw new Error("read-only file system");
    });
    await expect(runNameChangeDigest(d.args)).resolves.toBe("sent");
    expect(logError).toHaveBeenCalledTimes(1);
  });
});

describe("module hygiene", () => {
  it("opens no pool, binds no port and registers no timer at import", () => {
    const interval = jest.spyOn(global, "setInterval");
    const timeout = jest.spyOn(global, "setTimeout");
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require("../../src/profile-server/NameChangeDigest");
    });
    expect(interval).not.toHaveBeenCalled();
    expect(timeout).not.toHaveBeenCalled();
    interval.mockRestore();
    timeout.mockRestore();
  });

  it("imports pg as a TYPE only — a value import would pull the driver into a CLI", () => {
    const source = readFileSync(SOURCE_PATH, "utf8");
    expect(source).toContain('import type { Pool } from "pg"');
    for (const forbidden of [
      "./Server",
      "./Routes",
      "./Telemetry",
      "express",
    ]) {
      expect(source).not.toContain(`from "${forbidden}"`);
    }
  });

  it("pins the marker path the bind mount and profile-checks.sh must agree with", () => {
    expect(NAME_CHANGE_DIGEST_MARKER_PATH).toBe(
      "/var/lib/profile/digest/last-name-change-digest.json",
    );
  });
});
