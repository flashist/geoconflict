// Unit tests for the daily name-change digest (task 0283) over a scripted fake Pool —
// the same harness idea as NameChangeRepository.test.ts. The DB-backed proof (the real
// partial unique index, real constraints) is tests/integration/NameChange.it.test.ts;
// this file covers the counting contract, the send contract, the owner's zero-count
// ruling, and what a failure is allowed to log — and, since task 0315, the second (list)
// message and the rule that it can never disturb the heartbeat.

const telegramSend = jest.fn();
jest.mock("../../src/core/notifications/TelegramNotifier", () => ({
  sendTelegramMessage: (...args: unknown[]) => telegramSend(...args),
  // The REAL escaping (task 0315): the list interpolates player-chosen names, and an
  // identity fake here would make every escaping assertion below prove nothing.
  escapeTelegramHtml: jest.requireActual(
    "../../src/core/notifications/TelegramNotifier",
  ).escapeTelegramHtml,
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
  PENDING_LIST_CAP,
  PENDING_LIST_SQL,
  countPendingNameChanges,
  formatNameChangeDigest,
  formatPendingNameChangeList,
  formatWaitingTime,
  listPendingNameChanges,
  runNameChangeDigest,
  type PendingNameChange,
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

/** A pending row as the list query returns it (synthetic ids only). */
interface ListRow {
  player_id: string;
  new_display_name: string;
  changed_at: Date;
}

/**
 * A pool that answers the pending count and the list query, and throws on anything else.
 * The list answers `[]` by default, so every heartbeat case below runs exactly as it did
 * before task 0315 — one send. Each list row carries `total` (the query's
 * `count(*) OVER ()`), defaulting to the number of rows; pass `listTotal` to model more
 * waiting than the cap returns. It is independent of `pending`, the heartbeat's count —
 * exactly the two reads a race can pull apart.
 */
function fakePool(
  pending: number,
  listRows: ListRow[] = [],
  listTotal: number = listRows.length,
) {
  const query = jest.fn(async (sql: string, params?: unknown[]) => {
    void params;
    if (sql === PENDING_LIST_SQL) {
      return {
        rows: listRows.map((r) => ({ ...r, total: listTotal })),
        rowCount: listRows.length,
      };
    }
    if (sql.includes("player_name_history")) {
      return { rows: [{ pending }], rowCount: 1 };
    }
    throw new Error(`unexpected SQL: ${sql}`);
  });
  return { pool: { query } as never, query };
}

/** deps with every side effect captured — nothing here touches disk or the network. */
function deps(
  pending: number,
  outcome: unknown = { result: "sent" },
  listRows: ListRow[] = [],
  listTotal: number = listRows.length,
) {
  const { pool, query } = fakePool(pending, listRows, listTotal);
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

// ── Task 0315: the list message ────────────────────────────────────────────────────────
// Owner rulings 2026-09-27: Q1 "(a) List only, up to 20"; Q2 "Always send the short
// message as it works today. And the next message with more text".

/** A synthetic internal id — uuid-shaped, never a real one. */
const uuid = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

/** `n` pending rows, oldest first, the first one `firstAgeMinutes` old at AT. */
function rows(n: number, firstAgeMinutes = 60 * 24 * 3): ListRow[] {
  return Array.from({ length: n }, (_, i) => ({
    player_id: uuid(i + 1),
    new_display_name: `Waiting${i + 1}`,
    changed_at: new Date(AT.getTime() - (firstAgeMinutes - i) * 60_000),
  }));
}

const HEARTBEAT = (n: number) => formatNameChangeDigest(n, AT);

describe("listPendingNameChanges", () => {
  it("selects the three columns plus the pre-LIMIT total, pending only, oldest first, capped by $1 — and no Yandex id", async () => {
    const { pool, query } = fakePool(0, rows(1), 25);
    const listed = await listPendingNameChanges(pool, PENDING_LIST_CAP);
    expect(listed).toEqual({
      total: 25,
      entries: [
        {
          playerId: uuid(1),
          requestedName: "Waiting1",
          requestedAt: rows(1)[0].changed_at,
        },
      ],
    });
    const [sql, params] = query.mock.calls[0];
    expect(sql).toBe(PENDING_LIST_SQL);
    expect(sql).toMatch(
      /SELECT player_id, new_display_name, changed_at, count\(\*\) OVER \(\)::int AS total\s/,
    );
    expect(sql).toContain("moderation_status = 'pending'");
    expect(sql).toMatch(/ORDER BY changed_at, id/);
    expect(sql).toMatch(/LIMIT \$1/);
    expect(params).toEqual([20]);
    expect(PENDING_LIST_CAP).toBe(20);
    expect(sql).not.toMatch(/DISTINCT/i);
    expect(sql).not.toMatch(/GROUP\s+BY/i);
    expect(sql).not.toMatch(/yandex/i);
    expect(sql).not.toMatch(/\bplayers\b/);
  });

  it("no rows: total 0 and no entries (nothing to read a total from)", async () => {
    const { pool } = fakePool(0, []);
    await expect(
      listPendingNameChanges(pool, PENDING_LIST_CAP),
    ).resolves.toEqual({ total: 0, entries: [] });
  });
});

describe("formatWaitingTime", () => {
  it.each([
    [0, "0 min"],
    [59 * 60_000 + 59_000, "59 min"],
    [60 * 60_000, "1 h 0 min"],
    [(23 * 60 + 59) * 60_000, "23 h 59 min"],
    [24 * 60 * 60_000, "1 d 0 h"],
    [(2 * 24 + 5) * 60 * 60_000 + 30 * 60_000, "2 d 5 h"],
    [-5 * 60_000, "0 min"],
  ])("%d ms reads %s", (ms, text) => {
    expect(formatWaitingTime(ms)).toBe(text);
  });
});

describe("formatPendingNameChangeList", () => {
  const entries = (list: ListRow[]): PendingNameChange[] =>
    list.map((r) => ({
      playerId: r.player_id,
      requestedName: r.new_display_name,
      requestedAt: r.changed_at,
    }));

  it("lists one request with its id, name and age", () => {
    expect(formatPendingNameChangeList(1, AT, entries(rows(1, 60 * 53)))).toBe(
      [
        "<b>[Name change] Waiting for review — list</b>",
        `1. <code>${uuid(1)}</code> · Waiting1 · waiting 2 d 5 h`,
        "2026-09-19 04:00 UTC",
      ].join("\n"),
    );
  });

  it("lists 3 requests in the order given (oldest first) with no 'more' line", () => {
    const text = formatPendingNameChangeList(3, AT, entries(rows(3)));
    const lines = text.split("\n");
    expect(lines).toHaveLength(5);
    expect(lines[1]).toMatch(/^1\. .*Waiting1 /);
    expect(lines[2]).toMatch(/^2\. .*Waiting2 /);
    expect(lines[3]).toMatch(/^3\. .*Waiting3 /);
    expect(text).not.toContain("more waiting");
  });

  it("past the cap: 20 lines plus '…and 5 more'", () => {
    const text = formatPendingNameChangeList(25, AT, entries(rows(20)));
    const lines = text.split("\n");
    expect(lines.filter((l) => /^\d+\. <code>/.test(l))).toHaveLength(20);
    expect(lines[21]).toBe("…and 5 more waiting (oldest shown first)");
    expect(lines[22]).toBe("2026-09-19 04:00 UTC");
  });

  it("a total LOWER than the rows (impossible from one statement) never yields a negative (or any) 'more'", () => {
    const text = formatPendingNameChangeList(1, AT, entries(rows(3)));
    expect(text).not.toContain("more waiting");
    expect(text).not.toMatch(/and -\d/);
    expect(text.split("\n").filter((l) => /^\d+\. /.test(l))).toHaveLength(3);
  });

  it("a total lower than the rows AND a budget-dropped row: M still counts the dropped rows", () => {
    const hostile = "\u3164".repeat(128);
    const list = rows(20).map((r) => ({ ...r, new_display_name: hostile }));
    const text = formatPendingNameChangeList(3, AT, entries(list));
    const shown = text.split("\n").filter((l) => /^\d+\. <code>/.test(l));
    expect(text).toContain(`…and ${20 - shown.length} more waiting`);
  });

  it("20 worst-case hostile names stay under 4096 and M counts the dropped ones", () => {
    // 128 UTF-16 units each, every character one the display turns into a ⟨U+XXXX⟩ code
    // — the shape of 0312's length test (NameChangeRepository.test.ts).
    const hostile = "ㅤ".repeat(128);
    const list = rows(20).map((r) => ({ ...r, new_display_name: hostile }));
    const text = formatPendingNameChangeList(25, AT, entries(list));
    expect(text.length).toBeLessThan(4096);
    const shown = text.split("\n").filter((l) => /^\d+\. <code>/.test(l));
    expect(shown.length).toBeGreaterThan(0);
    expect(shown.length).toBeLessThan(20);
    expect(text).toContain(
      `…and ${25 - shown.length} more waiting (oldest shown first)`,
    );
    for (const line of shown) expect(line).toContain("⚠️ hidden characters");
  });

  it("escapes a hostile name, draws a newline as a code, and flags hidden characters", () => {
    const names = [
      "<b>x</b>&",
      "Fake\n2. <code>forged</code>",
      "No Break",
      "Right‮Left",
      "Fillerㅤ",
    ];
    const list = names.map((name, i) => ({
      player_id: uuid(i + 1),
      new_display_name: name,
      changed_at: AT,
    }));
    const text = formatPendingNameChangeList(5, AT, entries(list));
    // Exactly header + 5 items + stamp: no name managed to add a line.
    const lines = text.split("\n");
    expect(lines).toHaveLength(7);
    // The only tags left are the ones this function writes itself.
    const tags = text.match(/<[^>]*>/g) ?? [];
    expect(new Set(tags)).toEqual(
      new Set(["<b>", "</b>", "<code>", "</code>"]),
    );
    expect(tags.filter((t) => t === "<code>")).toHaveLength(5);
    expect(text).toContain("⟨U+000A⟩");
    expect(text).not.toContain(" ");
    expect(text).toContain("⟨U+00A0⟩");
    expect(text).not.toContain("‮");
    expect(text).toContain("⟨U+202E⟩");
    expect(text).toContain("⟨U+3164⟩");
    for (const line of lines.slice(1, 6)) {
      expect(line).toContain("⚠️ hidden characters");
    }
  });

  it("does not flag a plain name", () => {
    expect(formatPendingNameChangeList(1, AT, entries(rows(1)))).not.toContain(
      "hidden characters",
    );
  });
});

describe("runNameChangeDigest — the list message (task 0315)", () => {
  it("0 pending: exactly ONE send, and it is today's heartbeat text", async () => {
    const d = deps(0);
    await expect(runNameChangeDigest(d.args)).resolves.toBe("sent");
    expect(d.send).toHaveBeenCalledTimes(1);
    expect(d.send.mock.calls[0][1]).toBe(HEARTBEAT(0));
  });

  it("1 pending: TWO sends in order — the heartbeat byte-identical, then the list", async () => {
    const d = deps(1, { result: "sent" }, rows(1, 90));
    await expect(runNameChangeDigest(d.args)).resolves.toBe("sent");
    expect(d.send).toHaveBeenCalledTimes(2);
    expect(d.send.mock.calls[0][1]).toBe(HEARTBEAT(1));
    const list = String(d.send.mock.calls[1][1]);
    expect(list).toContain(`<code>${uuid(1)}</code>`);
    expect(list).toContain("Waiting1");
    expect(list).toContain("waiting 1 h 30 min");
    // Same topic for both.
    expect(d.send.mock.calls[1][0]).toEqual(TELEGRAM);
    expect(logError).not.toHaveBeenCalled();
  });

  it("25 pending with 20 rows: the heartbeat says 25, the list shows 20 and '…and 5 more'", async () => {
    const d = deps(25, { result: "sent" }, rows(20), 25);
    await runNameChangeDigest(d.args);
    expect(d.send.mock.calls[0][1]).toBe(HEARTBEAT(25));
    expect(d.send.mock.calls[1][1]).toContain("…and 5 more waiting");
  });

  // Reviews R1/R3: the heartbeat's count is read BEFORE its send and any retry, the list
  // after — so the two can disagree either way. "…and M more" must follow the list's own
  // total (read with the rows, in one statement), never the heartbeat's count.
  it("stale-HIGH heartbeat below the cap (count 5, list total 3): list names 3, no phantom 'more' (review R1)", async () => {
    const d = deps(5, { result: "sent" }, rows(3), 3);
    await expect(runNameChangeDigest(d.args)).resolves.toBe("sent");
    expect(d.send).toHaveBeenCalledTimes(2);
    expect(d.send.mock.calls[0][1]).toBe(HEARTBEAT(5));
    expect(d.send.mock.calls[1][1]).not.toContain("more waiting");
  });

  it("stale-LOW heartbeat at the cap (count 3, list total 25, 20 rows): '…and 5 more' still shows (review R3)", async () => {
    const d = deps(3, { result: "sent" }, rows(20), 25);
    await expect(runNameChangeDigest(d.args)).resolves.toBe("sent");
    expect(d.send.mock.calls[0][1]).toBe(HEARTBEAT(3));
    const list = String(d.send.mock.calls[1][1]);
    expect(
      list.split("\n").filter((l) => /^\d+\. <code>/.test(l)),
    ).toHaveLength(20);
    expect(list).toContain("…and 5 more waiting (oldest shown first)");
  });

  it("stale-HIGH heartbeat at the cap (count 30, list total 22, 20 rows): '…and 2 more', not 10 (review R3)", async () => {
    const d = deps(30, { result: "sent" }, rows(20), 22);
    await runNameChangeDigest(d.args);
    expect(d.send.mock.calls[0][1]).toBe(HEARTBEAT(30));
    expect(d.send.mock.calls[1][1]).toContain(
      "…and 2 more waiting (oldest shown first)",
    );
  });

  it("length cut at the cap with a stale heartbeat (count 3, list total 25): M = 25 − shown (review R3)", async () => {
    const hostile = "\u3164".repeat(128);
    const list = rows(20).map((r) => ({ ...r, new_display_name: hostile }));
    const d = deps(3, { result: "sent" }, list, 25);
    await runNameChangeDigest(d.args);
    const text = String(d.send.mock.calls[1][1]);
    expect(text.length).toBeLessThan(4096);
    const shown = text.split("\n").filter((l) => /^\d+\. <code>/.test(l));
    expect(shown.length).toBeGreaterThan(0);
    expect(shown.length).toBeLessThan(20);
    expect(text).toContain(
      `…and ${25 - shown.length} more waiting (oldest shown first)`,
    );
  });

  it("decides whether to list by the list itself — a count of 2 with no rows sends only the heartbeat", async () => {
    const d = deps(2, { result: "sent" }, []);
    await runNameChangeDigest(d.args);
    expect(d.send).toHaveBeenCalledTimes(1);
  });

  it("writes the marker BEFORE the list is sent", async () => {
    const d = deps(1, { result: "sent" }, rows(1));
    const order: string[] = [];
    d.writeMarkerFile.mockImplementation(() => {
      order.push("marker");
    });
    d.send.mockImplementation(async (_config: unknown, text: unknown) => {
      order.push(String(text).includes("— list") ? "list" : "heartbeat");
      return { result: "sent" };
    });
    await runNameChangeDigest(d.args);
    expect(order).toEqual(["heartbeat", "marker", "list"]);
  });

  it.each(["http_error", "network_error"])(
    "a failed list (%s) leaves the result 'sent', the marker written once, and logs only bounded fields",
    async (result) => {
      const d = deps(1, { result: "sent" }, rows(1));
      d.send
        .mockResolvedValueOnce({ result: "sent" })
        .mockResolvedValueOnce({ result, status: 400, code: "ECONNRESET" });
      await expect(runNameChangeDigest(d.args)).resolves.toBe("sent");
      expect(d.send).toHaveBeenCalledTimes(2);
      expect(d.writeMarkerFile).toHaveBeenCalledTimes(1);
      expect(logError).toHaveBeenCalledTimes(1);
      const line = String(logError.mock.calls[0][0]);
      expect(line).toContain("name-change digest list NOT sent");
      expect(line).toContain(`result=${result}`);
      for (const secret of [FAKE_TOKEN, FAKE_CHAT_ID, FAKE_TOPIC, FAKE_PROXY]) {
        expect(line).not.toContain(secret);
      }
      expect(line).not.toContain("api.telegram.org");
      // …and never the message text (the names).
      expect(line).not.toContain("Waiting1");
      expect(line).not.toContain(uuid(1));
    },
  );

  it("a list rescued by retry is a success — nothing logged as an error", async () => {
    const d = deps(1, { result: "sent" }, rows(1));
    d.send
      .mockResolvedValueOnce({ result: "sent" })
      .mockResolvedValueOnce({ result: "sent_after_retry" });
    await expect(runNameChangeDigest(d.args)).resolves.toBe("sent");
    expect(logError).not.toHaveBeenCalled();
  });

  it("a list QUERY that throws leaves the result 'sent' and the marker written, and logs the error", async () => {
    const d = deps(1);
    d.query.mockImplementation(async (sql: string) => {
      if (sql === PENDING_LIST_SQL) throw new Error("connection terminated");
      return { rows: [{ pending: 1 }], rowCount: 1 };
    });
    await expect(runNameChangeDigest(d.args)).resolves.toBe("sent");
    expect(d.send).toHaveBeenCalledTimes(1);
    expect(d.writeMarkerFile).toHaveBeenCalledTimes(1);
    expect(logError).toHaveBeenCalledTimes(1);
    expect(String(logError.mock.calls[0][0])).toContain(
      "name-change digest list NOT sent: Error: connection terminated",
    );
  });

  it("a failed HEARTBEAT: the list is not attempted, the result is 'failed', no marker", async () => {
    const d = deps(1, { result: "http_error", status: 502 }, rows(1));
    await expect(runNameChangeDigest(d.args)).resolves.toBe("failed");
    expect(d.send).toHaveBeenCalledTimes(1);
    expect(d.query.mock.calls.map((c) => c[0])).not.toContain(PENDING_LIST_SQL);
    expect(d.writeMarkerFile).not.toHaveBeenCalled();
  });
});
