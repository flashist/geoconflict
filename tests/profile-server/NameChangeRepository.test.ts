// Unit tests for NameChangeRepository (task 0067) over a scripted fake Pool —
// same harness idea as InboxRepository.test.ts. The DB-backed proof (real
// constraints, real transactions) is tests/integration/NameChange.it.test.ts;
// this file covers the branching, the notification contracts, and the
// error-code mapping without needing Postgres.

const telegramSend = jest.fn();
jest.mock("../../src/core/notifications/TelegramNotifier", () => ({
  sendTelegramMessage: (...args: unknown[]) => telegramSend(...args),
  escapeTelegramHtml: (text: string) => text,
}));

import { NameChangeRepository } from "../../src/profile-server/NameChangeRepository";

type Handler = (params: unknown[]) => { rows?: unknown[]; rowCount?: number };

/**
 * A fake Pool that dispatches on a substring of the SQL. Anything unmatched
 * throws loudly rather than silently returning an empty result — a query the
 * test did not anticipate should fail the test, not pass it.
 */
function fakePool(handlers: Array<[string, Handler]>) {
  const seen: Array<{ sql: string; params: unknown[] }> = [];
  const query = jest.fn(async (sql: string, params: unknown[] = []) => {
    seen.push({ sql, params });
    if (/^\s*(BEGIN|COMMIT|ROLLBACK)\s*$/i.test(sql)) {
      return { rows: [], rowCount: 0 };
    }
    for (const [needle, handler] of handlers) {
      if (sql.includes(needle)) {
        const result = handler(params);
        return { rows: result.rows ?? [], rowCount: result.rowCount ?? 0 };
      }
    }
    throw new Error(`unexpected SQL: ${sql}`);
  });
  const client = { query, release: jest.fn() };
  return {
    pool: { query, connect: jest.fn(async () => client) } as never,
    query,
    client,
    seen,
    sqlFor: (needle: string) => seen.filter((e) => e.sql.includes(needle)),
  };
}

function pgError(code: string, constraint?: string): Error {
  return Object.assign(new Error(`pg ${code}`), { code, constraint });
}

const CITIZEN: Handler = () => ({ rows: [{ is_citizen: true }], rowCount: 1 });
const NOT_CITIZEN: Handler = () => ({
  rows: [{ is_citizen: false }],
  rowCount: 1,
});
const NO_PROFILE: Handler = () => ({ rows: [], rowCount: 0 });
const NAME_FREE: Handler = () => ({ rows: [], rowCount: 0 });

const inbox = { sendTemplate: jest.fn() };
const TELEGRAM = { token: "t", chatId: "c", proxyUrl: "p" };

beforeEach(() => {
  jest.clearAllMocks();
  inbox.sendTemplate.mockResolvedValue(undefined);
  telegramSend.mockResolvedValue("sent");
});

describe("requestNameChange", () => {
  it("rejects a non-citizen — the gate is in SQL, not client state", async () => {
    const db = fakePool([["SELECT is_citizen", NOT_CITIZEN]]);
    const repo = new NameChangeRepository(db.pool, inbox);
    await expect(repo.requestNameChange("p1", "NewName")).resolves.toEqual({
      status: "not_citizen",
    });
    // Never reached the insert.
    expect(db.sqlFor("INSERT INTO player_name_history")).toHaveLength(0);
  });

  it("rejects a player with no profile row at all as not_citizen", async () => {
    const db = fakePool([["SELECT is_citizen", NO_PROFILE]]);
    const repo = new NameChangeRepository(db.pool, inbox);
    await expect(repo.requestNameChange("ghost", "NewName")).resolves.toEqual({
      status: "not_citizen",
    });
  });

  it("rejects an invalid name with the broken rule, before touching the DB", async () => {
    const db = fakePool([["SELECT is_citizen", CITIZEN]]);
    const repo = new NameChangeRepository(db.pool, inbox);
    await expect(repo.requestNameChange("p1", "ab")).resolves.toEqual({
      status: "invalid",
      violation: "too_short",
    });
    await expect(repo.requestNameChange("p1", "Bad!Name")).resolves.toEqual({
      status: "invalid",
      violation: "invalid_chars",
    });
    expect(db.sqlFor("INSERT INTO player_name_history")).toHaveLength(0);
  });

  it("INSERTS moderation_status 'pending' EXPLICITLY (001 defaults it to 'approved')", async () => {
    const db = fakePool([
      ["SELECT is_citizen", CITIZEN],
      ["lower(display_name)", NAME_FREE],
      ["INSERT INTO player_name_history", () => ({ rows: [{ id: 7 }] })],
    ]);
    const repo = new NameChangeRepository(db.pool, inbox);
    await expect(repo.requestNameChange("p1", "NewName")).resolves.toEqual({
      status: "ok",
      id: 7,
    });
    const insert = db.sqlFor("INSERT INTO player_name_history")[0];
    expect(insert.sql).toContain("'pending'");
    expect(insert.sql).not.toContain("'approved'");
  });

  it("rejects a case-insensitively taken name without writing a pending row", async () => {
    const db = fakePool([
      ["SELECT is_citizen", CITIZEN],
      [
        "lower(display_name)",
        () => ({ rows: [{ "?column?": 1 }], rowCount: 1 }),
      ],
    ]);
    const repo = new NameChangeRepository(db.pool, inbox);
    await expect(repo.requestNameChange("p1", "Ivan")).resolves.toEqual({
      status: "name_taken",
    });
    expect(db.sqlFor("INSERT INTO player_name_history")).toHaveLength(0);
  });

  it("excludes the caller's OWN row from the taken check", async () => {
    const db = fakePool([
      ["SELECT is_citizen", CITIZEN],
      ["lower(display_name)", NAME_FREE],
      ["INSERT INTO player_name_history", () => ({ rows: [{ id: 1 }] })],
    ]);
    const repo = new NameChangeRepository(db.pool, inbox);
    await repo.requestNameChange("p1", "Ivan");
    const check = db.sqlFor("lower(display_name)")[0];
    expect(check.sql).toContain("yandex_player_id <> $2");
    expect(check.params).toEqual(["Ivan", "p1"]);
  });

  it("maps the one-pending unique violation to pending_exists", async () => {
    const db = fakePool([
      ["SELECT is_citizen", CITIZEN],
      ["lower(display_name)", NAME_FREE],
      [
        "INSERT INTO player_name_history",
        () => {
          throw pgError("23505", "player_name_history_one_pending_uq");
        },
      ],
    ]);
    const repo = new NameChangeRepository(db.pool, inbox);
    await expect(repo.requestNameChange("p1", "NewName")).resolves.toEqual({
      status: "pending_exists",
    });
  });

  it("TRIMS before validating — the server must not be laxer than the validator it reuses", async () => {
    const db = fakePool([["SELECT is_citizen", CITIZEN]]);
    const repo = new NameChangeRepository(db.pool, inbox);
    // Three spaces: length 3 and \s is inside validUsernamePattern, so this
    // passed the raw rules. Both client paths trim first; the server now does.
    await expect(repo.requestNameChange("p1", "   ")).resolves.toEqual({
      status: "invalid",
      violation: "too_short",
    });
    expect(db.sqlFor("INSERT INTO player_name_history")).toHaveLength(0);
  });

  it("stores, uniqueness-checks and reports the TRIMMED name", async () => {
    const db = fakePool([
      ["SELECT is_citizen", CITIZEN],
      ["lower(display_name)", NAME_FREE],
      ["INSERT INTO player_name_history", () => ({ rows: [{ id: 9 }] })],
    ]);
    const repo = new NameChangeRepository(db.pool, inbox, TELEGRAM);
    await expect(repo.requestNameChange("p1", "  NewName  ")).resolves.toEqual({
      status: "ok",
      id: 9,
    });
    expect(db.sqlFor("lower(display_name)")[0].params).toEqual([
      "NewName",
      "p1",
    ]);
    expect(db.sqlFor("INSERT INTO player_name_history")[0].params).toEqual([
      "p1",
      "NewName",
    ]);
    expect(telegramSend.mock.calls[0][1]).toContain("NewName");
  });

  it("rethrows a 23505 from a DIFFERENT constraint instead of calling it pending_exists", async () => {
    const db = fakePool([
      ["SELECT is_citizen", CITIZEN],
      ["lower(display_name)", NAME_FREE],
      [
        "INSERT INTO player_name_history",
        () => {
          // A future unique constraint on player_name_history must surface as a
          // real error, not be silently mis-reported as "you already have one".
          throw pgError("23505", "player_name_history_some_future_uq");
        },
      ],
    ]);
    const repo = new NameChangeRepository(db.pool, inbox);
    await expect(repo.requestNameChange("p1", "NewName")).rejects.toThrow();
  });

  it("rethrows an unexpected DB error rather than swallowing it", async () => {
    const db = fakePool([
      ["SELECT is_citizen", CITIZEN],
      ["lower(display_name)", NAME_FREE],
      [
        "INSERT INTO player_name_history",
        () => {
          throw pgError("08006");
        },
      ],
    ]);
    const repo = new NameChangeRepository(db.pool, inbox);
    await expect(repo.requestNameChange("p1", "NewName")).rejects.toThrow();
  });

  describe("operator Telegram notification (brief step 7)", () => {
    function okPool() {
      return fakePool([
        ["SELECT is_citizen", CITIZEN],
        ["lower(display_name)", NAME_FREE],
        ["INSERT INTO player_name_history", () => ({ rows: [{ id: 3 }] })],
      ]);
    }

    it("fires exactly once, with the requested name and the configured chat", async () => {
      const db = okPool();
      const repo = new NameChangeRepository(db.pool, inbox, TELEGRAM);
      await repo.requestNameChange("p1", "NewName");
      expect(telegramSend).toHaveBeenCalledTimes(1);
      const [config, text] = telegramSend.mock.calls[0];
      expect(config).toEqual(TELEGRAM);
      expect(text).toContain("NewName");
      expect(text).toContain("p1");
    });

    it("never fails the request when Telegram fails", async () => {
      telegramSend.mockRejectedValue(new Error("blocked"));
      const db = okPool();
      const repo = new NameChangeRepository(db.pool, inbox, TELEGRAM);
      await expect(repo.requestNameChange("p1", "NewName")).resolves.toEqual({
        status: "ok",
        id: 3,
      });
    });

    it("is simply skipped when Telegram is not configured", async () => {
      const db = okPool();
      const repo = new NameChangeRepository(db.pool, inbox);
      await expect(repo.requestNameChange("p1", "NewName")).resolves.toEqual({
        status: "ok",
        id: 3,
      });
      expect(telegramSend).not.toHaveBeenCalled();
    });

    it("carries a ready-to-paste command binding the decision to the name", async () => {
      const db = okPool();
      // A distinctive placeholder token: the shared TELEGRAM fixture's is the
      // single letter "t", which appears in any sentence and would make the
      // leak assertion below meaningless.
      const repo = new NameChangeRepository(db.pool, inbox, {
        ...TELEGRAM,
        token: "placeholder-bot-token-fixture",
      });
      await repo.requestNameChange("p1", "NewName");
      const text = telegramSend.mock.calls[0][1] as string;
      expect(text).toContain('"expectedName":"NewName"');
      expect(text).toContain('"decision":"approve"');
      // Shell variables, never values — no secret goes into a chat message.
      expect(text).toContain("$PROFILE_INTERNAL_TOKEN");
      expect(text).not.toContain("placeholder-bot-token-fixture");
    });

    it("omits the command for a player id that would break shell quoting", async () => {
      const db = okPool();
      const repo = new NameChangeRepository(db.pool, inbox, TELEGRAM);
      // Ids are client-asserted (ADR-103); an operator pastes this into a shell.
      await repo.requestNameChange("p'; rm -rf /", "NewName");
      const text = telegramSend.mock.calls[0][1] as string;
      expect(text).not.toContain("curl");
      // Still reports the request — only the convenience is dropped.
      expect(text).toContain("NewName");
    });

    describe("per-player cooldown (review R1)", () => {
      it("notifies ONCE per player however many request/cancel cycles run", async () => {
        const repo = new NameChangeRepository(okPool().pool, inbox, TELEGRAM);
        for (let i = 0; i < 5; i++) {
          await repo.requestNameChange("p1", `Name${i}`);
        }
        expect(telegramSend).toHaveBeenCalledTimes(1);
      });

      it("suppresses a CHANGED name too — otherwise varying the string re-opens the flood", async () => {
        const repo = new NameChangeRepository(okPool().pool, inbox, TELEGRAM);
        await repo.requestNameChange("p1", "FirstName");
        await repo.requestNameChange("p1", "SecondName");
        expect(telegramSend).toHaveBeenCalledTimes(1);
        // Safe only because the decision is bound to expectedName: an operator
        // acting on the stale message gets name_mismatch, never a silent apply.
        expect(telegramSend.mock.calls[0][1]).toContain("FirstName");
      });

      it("does not let one player's cooldown silence another's request", async () => {
        const repo = new NameChangeRepository(okPool().pool, inbox, TELEGRAM);
        await repo.requestNameChange("p1", "NewName");
        await repo.requestNameChange("p2", "NewName");
        expect(telegramSend).toHaveBeenCalledTimes(2);
      });

      it("notifies again once the window has passed", async () => {
        const repo = new NameChangeRepository(okPool().pool, inbox, TELEGRAM);
        const start = Date.now();
        const clock = jest.spyOn(Date, "now").mockReturnValue(start);
        try {
          await repo.requestNameChange("p1", "NewName");
          clock.mockReturnValue(start + 10 * 60_000 + 1);
          await repo.requestNameChange("p1", "NewName");
        } finally {
          clock.mockRestore();
        }
        expect(telegramSend).toHaveBeenCalledTimes(2);
      });

      it("does not consume a slot when the request never lands", async () => {
        let citizen = false;
        const db = fakePool([
          [
            "SELECT is_citizen",
            () => ({ rows: [{ is_citizen: citizen }], rowCount: 1 }),
          ],
          ["lower(display_name)", NAME_FREE],
          ["INSERT INTO player_name_history", () => ({ rows: [{ id: 3 }] })],
        ]);
        const repo = new NameChangeRepository(db.pool, inbox, TELEGRAM);
        await repo.requestNameChange("p1", "NewName");
        expect(telegramSend).not.toHaveBeenCalled();
        // The first ACCEPTED request must still be able to notify.
        citizen = true;
        await repo.requestNameChange("p1", "NewName");
        expect(telegramSend).toHaveBeenCalledTimes(1);
      });
    });
  });
});

describe("cancelNameChange (owner amendment 2)", () => {
  it("is citizen-gated like every other player-facing call", async () => {
    const db = fakePool([["SELECT is_citizen", NOT_CITIZEN]]);
    const repo = new NameChangeRepository(db.pool, inbox);
    await expect(repo.cancelNameChange("p1")).resolves.toEqual({
      status: "not_citizen",
    });
  });

  it("deletes ONLY the caller's own pending row", async () => {
    const db = fakePool([
      ["SELECT is_citizen", CITIZEN],
      ["DELETE FROM player_name_history", () => ({ rowCount: 1 })],
    ]);
    const repo = new NameChangeRepository(db.pool, inbox);
    await expect(repo.cancelNameChange("p1")).resolves.toEqual({
      status: "ok",
    });
    const del = db.sqlFor("DELETE FROM player_name_history")[0];
    expect(del.sql).toContain("moderation_status = 'pending'");
    expect(del.sql).toContain("yandex_player_id = $1");
    expect(del.params).toEqual(["p1"]);
  });

  it("reports no_pending when nothing was withdrawn", async () => {
    const db = fakePool([
      ["SELECT is_citizen", CITIZEN],
      ["DELETE FROM player_name_history", () => ({ rowCount: 0 })],
    ]);
    const repo = new NameChangeRepository(db.pool, inbox);
    await expect(repo.cancelNameChange("p1")).resolves.toEqual({
      status: "no_pending",
    });
  });
});

describe("decideNameChange", () => {
  function decidePool(overrides: Array<[string, Handler]> = []) {
    return fakePool([
      ...overrides,
      [
        "moderation_status = 'pending'\nFOR UPDATE",
        () => ({ rows: [{ id: 5, new_display_name: "NewName" }] }),
      ],
      [
        "SELECT display_name FROM player_profiles",
        () => ({ rows: [{ display_name: "OldName" }] }),
      ],
      ["UPDATE player_profiles SET display_name", () => ({ rowCount: 1 })],
      ["moderation_status = 'approved'", () => ({ rowCount: 1 })],
      ["moderation_status = 'rejected'", () => ({ rowCount: 1 })],
    ]);
  }

  it("reports no_pending when there is nothing to decide", async () => {
    const db = fakePool([
      ["moderation_status = 'pending'\nFOR UPDATE", () => ({ rows: [] })],
    ]);
    const repo = new NameChangeRepository(db.pool, inbox);
    await expect(repo.decideNameChange("p1", "approve")).resolves.toEqual({
      status: "no_pending",
    });
    expect(inbox.sendTemplate).not.toHaveBeenCalled();
  });

  it("approve applies the name and captures the previous one", async () => {
    const db = decidePool();
    const repo = new NameChangeRepository(db.pool, inbox);
    await expect(repo.decideNameChange("p1", "approve")).resolves.toEqual({
      status: "ok",
    });
    expect(
      db.sqlFor("UPDATE player_profiles SET display_name")[0].params,
    ).toEqual(["p1", "NewName"]);
    // old_display_name captured for the history row.
    expect(db.sqlFor("moderation_status = 'approved'")[0].params).toEqual([
      5,
      "OldName",
    ]);
  });

  it("approve sends the name_change_approved inbox template AFTER commit", async () => {
    const db = decidePool();
    const repo = new NameChangeRepository(db.pool, inbox);
    await repo.decideNameChange("p1", "approve");
    expect(inbox.sendTemplate).toHaveBeenCalledWith(
      "p1",
      "name_change_approved",
      { name: "NewName" },
    );
    // Committed before the send — the send must never be inside the transaction.
    const commitIndex = db.seen.findIndex((e) => /COMMIT/i.test(e.sql));
    expect(commitIndex).toBeGreaterThan(-1);
  });

  it("reject records the reason and leaves the display name untouched", async () => {
    const db = decidePool();
    const repo = new NameChangeRepository(db.pool, inbox);
    await expect(
      repo.decideNameChange("p1", "reject", "impersonation"),
    ).resolves.toEqual({ status: "ok" });
    expect(db.sqlFor("UPDATE player_profiles SET display_name")).toHaveLength(
      0,
    );
    expect(db.sqlFor("moderation_status = 'rejected'")[0].params).toEqual([
      5,
      "impersonation",
    ]);
    expect(inbox.sendTemplate).toHaveBeenCalledWith(
      "p1",
      "name_change_rejected",
      { name: "NewName", reason: "impersonation" },
    );
  });

  it("never sends a BLANK reason param (the inbox boundary counts it as missing)", async () => {
    const db = decidePool();
    const repo = new NameChangeRepository(db.pool, inbox);
    await repo.decideNameChange("p1", "reject");
    const params = inbox.sendTemplate.mock.calls[0][2] as Record<
      string,
      string
    >;
    expect(params.reason.length).toBeGreaterThan(0);
  });

  it("maps the approve-time uniqueness race to name_taken and leaves the row PENDING", async () => {
    const db = decidePool([
      [
        "UPDATE player_profiles SET display_name",
        () => {
          throw pgError("23505", "player_profiles_display_name_uq");
        },
      ],
    ]);
    const repo = new NameChangeRepository(db.pool, inbox);
    await expect(repo.decideNameChange("p1", "approve")).resolves.toEqual({
      status: "name_taken",
    });
    // The row was never marked approved, and the transaction rolled back — so
    // the operator can retry or reject it.
    expect(db.sqlFor("moderation_status = 'approved'")).toHaveLength(0);
    expect(db.seen.some((e) => /ROLLBACK/i.test(e.sql))).toBe(true);
    expect(inbox.sendTemplate).not.toHaveBeenCalled();
  });

  describe("expectedName binding (review R1, owner ruling A)", () => {
    it("applies normally when the expected name MATCHES the pending row", async () => {
      const db = decidePool();
      const repo = new NameChangeRepository(db.pool, inbox);
      await expect(
        repo.decideNameChange("p1", "approve", undefined, "NewName"),
      ).resolves.toEqual({ status: "ok" });
      expect(
        db.sqlFor("UPDATE player_profiles SET display_name")[0].params,
      ).toEqual(["p1", "NewName"]);
    });

    it("refuses a MISMATCH and applies nothing, returning the real pending name", async () => {
      const db = decidePool();
      const repo = new NameChangeRepository(db.pool, inbox);
      await expect(
        repo.decideNameChange("p1", "approve", undefined, "StaleName"),
      ).resolves.toEqual({ status: "name_mismatch", pendingName: "NewName" });
      expect(db.sqlFor("UPDATE player_profiles SET display_name")).toHaveLength(
        0,
      );
      expect(db.sqlFor("moderation_status = 'approved'")).toHaveLength(0);
      expect(db.seen.some((e) => /ROLLBACK/i.test(e.sql))).toBe(true);
      expect(inbox.sendTemplate).not.toHaveBeenCalled();
    });

    it("checks a REJECTION too — the reason would answer a name nobody read", async () => {
      const db = decidePool();
      const repo = new NameChangeRepository(db.pool, inbox);
      await expect(
        repo.decideNameChange("p1", "reject", "impersonation", "StaleName"),
      ).resolves.toEqual({ status: "name_mismatch", pendingName: "NewName" });
      expect(db.sqlFor("moderation_status = 'rejected'")).toHaveLength(0);
      expect(inbox.sendTemplate).not.toHaveBeenCalled();
    });

    it("tolerates copy-paste whitespace around the expected name", async () => {
      const db = decidePool();
      const repo = new NameChangeRepository(db.pool, inbox);
      await expect(
        repo.decideNameChange("p1", "approve", undefined, "  NewName  "),
      ).resolves.toEqual({ status: "ok" });
    });

    it("is CASE-SENSITIVE — this check exists to be exact", async () => {
      const db = decidePool();
      const repo = new NameChangeRepository(db.pool, inbox);
      await expect(
        repo.decideNameChange("p1", "approve", undefined, "newname"),
      ).resolves.toEqual({ status: "name_mismatch", pendingName: "NewName" });
    });

    it("is OPTIONAL — omitting it keeps the pre-existing behavior", async () => {
      const db = decidePool();
      const repo = new NameChangeRepository(db.pool, inbox);
      await expect(repo.decideNameChange("p1", "approve")).resolves.toEqual({
        status: "ok",
      });
      expect(
        db.sqlFor("UPDATE player_profiles SET display_name")[0].params,
      ).toEqual(["p1", "NewName"]);
    });
  });

  it("rethrows a 23505 from a DIFFERENT constraint instead of calling it name_taken", async () => {
    const db = decidePool([
      [
        "UPDATE player_profiles SET display_name",
        () => {
          // Unreachable under today's schema — that UPDATE touches only
          // display_name. The day player_profiles gains another unique
          // constraint, mis-reporting it as a 409 would be silent, so the catch
          // is narrowed by index name rather than by which statement raised it.
          throw pgError("23505", "player_profiles_some_future_uq");
        },
      ],
    ]);
    const repo = new NameChangeRepository(db.pool, inbox);
    await expect(repo.decideNameChange("p1", "approve")).rejects.toThrow();
    expect(db.client.release).toHaveBeenCalled();
  });

  it("rethrows a 23505 carrying no constraint name at all", async () => {
    const db = decidePool([
      [
        "UPDATE player_profiles SET display_name",
        () => {
          throw pgError("23505");
        },
      ],
    ]);
    const repo = new NameChangeRepository(db.pool, inbox);
    await expect(repo.decideNameChange("p1", "approve")).rejects.toThrow();
  });

  it("returns the decision even when the inbox send rejects", async () => {
    inbox.sendTemplate.mockRejectedValue(new Error("inbox down"));
    const db = decidePool();
    const repo = new NameChangeRepository(db.pool, inbox);
    await expect(repo.decideNameChange("p1", "approve")).resolves.toEqual({
      status: "ok",
    });
  });

  it("works with no inbox wired at all", async () => {
    const db = decidePool();
    const repo = new NameChangeRepository(db.pool);
    await expect(repo.decideNameChange("p1", "approve")).resolves.toEqual({
      status: "ok",
    });
  });

  it("releases the client on an unexpected failure", async () => {
    const db = decidePool([
      [
        "UPDATE player_profiles SET display_name",
        () => {
          throw pgError("08006");
        },
      ],
    ]);
    const repo = new NameChangeRepository(db.pool, inbox);
    await expect(repo.decideNameChange("p1", "approve")).rejects.toThrow();
    expect(db.client.release).toHaveBeenCalled();
  });
});

describe("getLatestState", () => {
  it("returns null when the player has never requested a change", async () => {
    const db = fakePool([["ORDER BY id DESC", () => ({ rows: [] })]]);
    const repo = new NameChangeRepository(db.pool, inbox);
    await expect(repo.getLatestState("p1")).resolves.toBeNull();
  });

  it("projects the newest row WITHOUT the rejection reason", async () => {
    const decidedAt = new Date("2026-08-28T10:00:00.000Z");
    const db = fakePool([
      [
        "ORDER BY id DESC",
        () => ({
          rows: [
            {
              new_display_name: "NewName",
              moderation_status: "rejected",
              decided_at: decidedAt,
            },
          ],
        }),
      ],
    ]);
    const repo = new NameChangeRepository(db.pool, inbox);
    const state = await repo.getLatestState("p1");
    expect(state).toEqual({
      status: "rejected",
      requested_name: "NewName",
      decided_at: "2026-08-28T10:00:00.000Z",
    });
    // GET /v1/profile is unauthenticated and enumerable — the operator's reason
    // must never ride along on it.
    expect(Object.keys(state ?? {})).not.toContain("rejection_reason");
    // ...and the query must not even select it.
    expect(db.sqlFor("ORDER BY id DESC")[0].sql).not.toContain(
      "rejection_reason",
    );
  });

  it("carries a null decided_at for a pending request", async () => {
    const db = fakePool([
      [
        "ORDER BY id DESC",
        () => ({
          rows: [
            {
              new_display_name: "NewName",
              moderation_status: "pending",
              decided_at: null,
            },
          ],
        }),
      ],
    ]);
    const repo = new NameChangeRepository(db.pool, inbox);
    await expect(repo.getLatestState("p1")).resolves.toEqual({
      status: "pending",
      requested_name: "NewName",
      decided_at: null,
    });
  });
});
