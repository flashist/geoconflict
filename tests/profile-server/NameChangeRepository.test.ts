// Unit tests for NameChangeRepository (task 0067) over a scripted fake Pool —
// same harness idea as InboxRepository.test.ts. The DB-backed proof (real
// constraints, real transactions) is tests/integration/NameChange.it.test.ts;
// this file covers the branching, the notification contracts, and the
// error-code mapping without needing Postgres.

const telegramSend = jest.fn();
jest.mock("../../src/core/notifications/TelegramNotifier", () => ({
  sendTelegramMessage: (...args: unknown[]) => telegramSend(...args),
  // The REAL escaper (task 0312): the decide lines are checked for valid Telegram
  // HTML below, which an identity stub would make vacuous.
  escapeTelegramHtml: jest.requireActual(
    "../../src/core/notifications/TelegramNotifier",
  ).escapeTelegramHtml,
}));

import { spawnSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import {
  DECIDE_NPM_SCRIPT,
  REASON_PLACEHOLDER,
} from "../../src/profile-server/NameChangeDecideCommand";
import {
  NameChangeRepository,
  buildDecideCommandBody,
  buildOperatorNotificationText,
  decideCommandLines,
  describeRequestedNameForModerator,
  wouldMatchFilterHideName,
} from "../../src/profile-server/NameChangeRepository";

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
const PLAYER_ID = "0b6f8a52-3c1e-4d7a-9f10-2a4b6c8d0e1f";
const TELEGRAM = { token: "t", chatId: "c", proxyUrl: "p" };

beforeEach(() => {
  jest.clearAllMocks();
  inbox.sendTemplate.mockResolvedValue(undefined);
  telegramSend.mockResolvedValue({ result: "sent" });
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
    expect(check.sql).toContain("FROM players");
    expect(check.sql).toContain("id <> $2");
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

    // ── Task 0277 step 9: forum topic routing ────────────────────────────
    // ⚠️ This is the ONE profile-box Telegram path proven working in production,
    // and it only started working today. These two cases exist so the topic work
    // cannot silently change it.
    it("passes the configured topic through to the helper", async () => {
      const db = okPool();
      const withTopic = { ...TELEGRAM, threadId: "4242" };
      const repo = new NameChangeRepository(db.pool, inbox, withTopic);
      await repo.requestNameChange("p1", "NewName");
      expect(telegramSend.mock.calls[0][0]).toEqual(withTopic);
    });

    it("passes a config with NO topic through byte-identically", async () => {
      const db = okPool();
      const repo = new NameChangeRepository(db.pool, inbox, TELEGRAM);
      await repo.requestNameChange("p1", "NewName");
      const config = telegramSend.mock.calls[0][0] as Record<string, unknown>;
      expect(config).toEqual(TELEGRAM);
      // Not present-and-empty: the helper omits the key only when it is blank or
      // absent, and Telegram REJECTS an empty message_thread_id.
      expect(Object.keys(config)).not.toContain("threadId");
    });

    // A message the retry rescued is a SUCCESS, not a failure to warn about.
    it("treats sent_after_retry as delivered", async () => {
      telegramSend.mockResolvedValue({ result: "sent_after_retry" });
      const db = okPool();
      const repo = new NameChangeRepository(db.pool, inbox, TELEGRAM);
      await expect(
        repo.requestNameChange("p1", "NewName"),
      ).resolves.toMatchObject({ status: "ok" });
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

    // Task 0270: the notification and its command carry the INTERNAL player id.
    // Yandex ids stop going to Telegram, and the decide route accepts nothing else.
    it("names the player by internal playerId in the text AND the command — never a Yandex id", async () => {
      const db = okPool();
      const repo = new NameChangeRepository(db.pool, inbox, TELEGRAM);
      await repo.requestNameChange(PLAYER_ID, "NewName");
      const text = telegramSend.mock.calls[0][1] as string;
      expect(text).toContain(`<b>Player:</b> ${PLAYER_ID}`);
      expect(text).toContain(`"playerId":"${PLAYER_ID}"`);
      expect(text).not.toContain("yandexPlayerId");
      expect(text).not.toContain("yandex");
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
      // Task 0312: the command runs on the profile box and reads the token from
      // the container — no secret, URL, host or IP goes into a chat message.
      expect(text).toContain(`npm run -s ${DECIDE_NPM_SCRIPT}`);
      expect(text).not.toContain("placeholder-bot-token-fixture");
      expect(text).not.toContain("PROFILE_INTERNAL_TOKEN");
      expect(text).not.toContain("PROFILE_API_URL");
      expect(text).not.toMatch(/https?:/i);
      expect(text).not.toMatch(/\b\d{1,3}(\.\d{1,3}){3}\b/);
      expect(text).not.toContain("curl");
    });

    // Task 0312, verification 2: this fails on the pre-0312 code, which carried
    // an Approve line only.
    it("carries BOTH an Approve and a Reject command, each bound to the name", async () => {
      const db = okPool();
      const repo = new NameChangeRepository(db.pool, inbox, TELEGRAM);
      await repo.requestNameChange(PLAYER_ID, "NewName");
      const text = telegramSend.mock.calls[0][1] as string;
      expect(text).toContain("<b>Approve</b>");
      expect(text).toContain("<b>Reject</b>");
      expect(text).toContain(
        buildDecideCommandBody(PLAYER_ID, "NewName", "approve"),
      );
      expect(text).toContain(
        buildDecideCommandBody(PLAYER_ID, "NewName", "reject"),
      );
      expect(text).toContain(`NAME_CHANGE_REASON='${REASON_PLACEHOLDER}'`);
      expect(text.match(/<pre>/g)).toHaveLength(2);
    });

    it("omits the command for a player id that would break shell quoting", async () => {
      const db = okPool();
      const repo = new NameChangeRepository(db.pool, inbox, TELEGRAM);
      // Belt and braces: a server-generated uuid always passes the charset
      // check, but an operator pastes this into a shell, so a value that would
      // break the quoting is still never emitted.
      await repo.requestNameChange("p'; rm -rf /", "NewName");
      const text = telegramSend.mock.calls[0][1] as string;
      expect(text).not.toContain("docker compose");
      expect(text).not.toContain(DECIDE_NPM_SCRIPT);
      expect(text).not.toContain("<pre>");
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

    describe("a decision clears the slot (task 0313)", () => {
      /**
       * One fake serving the whole request → decide → withdraw → request flow.
       * Stateful on purpose: a decide finds the row the last request wrote, and
       * a decision or a withdraw clears it, as the real table would.
       *
       * fakePool takes the FIRST needle that matches, so each needle here must
       * match only its own statement. Checked against every statement it could
       * collide with: `lower(display_name)` is only in the taken-check (the lock
       * reads `SELECT display_name FROM players`), and the FOR UPDATE needle
       * carries `\nFOR UPDATE`, which the withdraw's DELETE (also filtered on
       * `'pending'`) does not have.
       */
      function lifecyclePool(
        options: {
          applyError?: Error;
          // Review R2: the COMMIT fails, and the transaction's writes are undone
          // (the row the decide marked is pending again), as Postgres would.
          commitError?: Error;
          // Review R2: runs once the COMMIT is applied but BEFORE its reply
          // reaches the repository — the window a player's new request can
          // land in.
          onCommitApplied?: () => Promise<void>;
        } = {},
      ) {
        type PendingRow = { id: number; name: string } | null;
        let pending: PendingRow = null;
        let pendingAtBegin: PendingRow = null;
        let nextId = 1;
        const decided = () => {
          pending = null;
          return { rowCount: 1 };
        };
        const fake = fakePool([
          ["SELECT is_citizen", CITIZEN],
          ["lower(display_name)", NAME_FREE],
          [
            "INSERT INTO player_name_history",
            (params) => {
              if (pending !== null) {
                throw pgError("23505", "player_name_history_one_pending_uq");
              }
              pending = { id: nextId++, name: String(params[1]) };
              return { rows: [{ id: pending.id }] };
            },
          ],
          [
            "DELETE FROM player_name_history",
            () => {
              const had = pending !== null;
              pending = null;
              return { rowCount: had ? 1 : 0 };
            },
          ],
          [
            "moderation_status = 'pending'\nFOR UPDATE",
            () => ({
              rows:
                pending === null
                  ? []
                  : [{ id: pending.id, new_display_name: pending.name }],
            }),
          ],
          [
            "SELECT display_name FROM players",
            () => ({ rows: [{ display_name: "OldName" }] }),
          ],
          [
            "UPDATE players SET display_name",
            () => {
              if (options.applyError !== undefined) {
                throw options.applyError;
              }
              return { rowCount: 1 };
            },
          ],
          ["moderation_status = 'approved'", decided],
          ["moderation_status = 'rejected'", decided],
        ]);
        const answer = fake.query.getMockImplementation();
        if (answer === undefined) {
          throw new Error("fakePool has no query implementation");
        }
        fake.query.mockImplementation(async (sql, params) => {
          if (/^\s*BEGIN\s*$/i.test(sql)) {
            pendingAtBegin = pending;
          }
          if (/^\s*COMMIT\s*$/i.test(sql)) {
            if (options.commitError !== undefined) {
              pending = pendingAtBegin;
              throw options.commitError;
            }
            await options.onCommitApplied?.();
          }
          return answer(sql, params);
        });
        return fake;
      }

      // Every step below happens at the same instant — well inside the window —
      // so any second notification is the decision's doing, not the clock's.
      let clock: jest.SpyInstance<number, []>;
      beforeEach(() => {
        const start = Date.now();
        clock = jest.spyOn(Date, "now").mockReturnValue(start);
      });
      afterEach(() => clock.mockRestore());

      it("request → APPROVE → request notifies twice, the 2nd with the new name", async () => {
        const repo = new NameChangeRepository(
          lifecyclePool().pool,
          inbox,
          TELEGRAM,
        );
        expect(await repo.requestNameChange("p1", "FirstName")).toMatchObject({
          status: "ok",
        });
        expect(
          await repo.decideNameChange("p1", "approve", undefined, "FirstName"),
        ).toEqual({ status: "ok" });
        expect(await repo.requestNameChange("p1", "SecondName")).toMatchObject({
          status: "ok",
        });
        expect(telegramSend).toHaveBeenCalledTimes(2);
        expect(telegramSend.mock.calls[1][1]).toContain("SecondName");
      });

      it("request → REJECT → request notifies twice", async () => {
        const repo = new NameChangeRepository(
          lifecyclePool().pool,
          inbox,
          TELEGRAM,
        );
        expect(await repo.requestNameChange("p1", "FirstName")).toMatchObject({
          status: "ok",
        });
        expect(
          await repo.decideNameChange(
            "p1",
            "reject",
            "impersonation",
            "FirstName",
          ),
        ).toEqual({ status: "ok" });
        expect(await repo.requestNameChange("p1", "SecondName")).toMatchObject({
          status: "ok",
        });
        expect(telegramSend).toHaveBeenCalledTimes(2);
        expect(telegramSend.mock.calls[1][1]).toContain("SecondName");
      });

      it("request → WITHDRAW → request inside the window still notifies ONCE (R1 holds)", async () => {
        const repo = new NameChangeRepository(
          lifecyclePool().pool,
          inbox,
          TELEGRAM,
        );
        await repo.requestNameChange("p1", "FirstName");
        expect(await repo.cancelNameChange("p1")).toEqual({ status: "ok" });
        expect(await repo.requestNameChange("p1", "SecondName")).toMatchObject({
          status: "ok",
        });
        expect(telegramSend).toHaveBeenCalledTimes(1);
      });

      describe("a decide that decided nothing keeps the slot", () => {
        // Each: request → decide that is NOT a decision → withdraw → request.
        // Only an actual approve/reject may reset; otherwise this is R1's loop.
        async function requestAfter(
          repo: NameChangeRepository,
          failedDecide: () => Promise<unknown>,
        ): Promise<void> {
          await repo.requestNameChange("p1", "FirstName");
          await failedDecide();
          expect(await repo.cancelNameChange("p1")).toEqual({ status: "ok" });
          expect(
            await repo.requestNameChange("p1", "SecondName"),
          ).toMatchObject({ status: "ok" });
          expect(telegramSend).toHaveBeenCalledTimes(1);
        }

        it("name_mismatch (a stale expectedName)", async () => {
          const repo = new NameChangeRepository(
            lifecyclePool().pool,
            inbox,
            TELEGRAM,
          );
          await requestAfter(repo, async () =>
            expect(
              await repo.decideNameChange("p1", "approve", undefined, "Other"),
            ).toEqual({ status: "name_mismatch", pendingName: "FirstName" }),
          );
        });

        it("name_taken (the approve-time race — the row stays pending)", async () => {
          const repo = new NameChangeRepository(
            lifecyclePool({
              applyError: pgError("23505", "players_display_name_uq"),
            }).pool,
            inbox,
            TELEGRAM,
          );
          await requestAfter(repo, async () =>
            expect(
              await repo.decideNameChange(
                "p1",
                "approve",
                undefined,
                "FirstName",
              ),
            ).toEqual({ status: "name_taken" }),
          );
        });

        it("a decide that throws", async () => {
          const repo = new NameChangeRepository(
            lifecyclePool({ applyError: pgError("08006") }).pool,
            inbox,
            TELEGRAM,
          );
          await requestAfter(repo, () =>
            expect(
              repo.decideNameChange("p1", "approve", undefined, "FirstName"),
            ).rejects.toThrow(),
          );
        });

        it("no_pending (the player already withdrew)", async () => {
          const repo = new NameChangeRepository(
            lifecyclePool().pool,
            inbox,
            TELEGRAM,
          );
          await repo.requestNameChange("p1", "FirstName");
          expect(await repo.cancelNameChange("p1")).toEqual({ status: "ok" });
          expect(await repo.decideNameChange("p1", "approve")).toEqual({
            status: "no_pending",
          });
          await repo.requestNameChange("p1", "SecondName");
          expect(telegramSend).toHaveBeenCalledTimes(1);
        });
      });

      it("after a decision the fresh slot still limits the withdraw loop", async () => {
        const repo = new NameChangeRepository(
          lifecyclePool().pool,
          inbox,
          TELEGRAM,
        );
        await repo.requestNameChange("p1", "FirstName");
        await repo.decideNameChange("p1", "approve", undefined, "FirstName");
        await repo.requestNameChange("p1", "SecondName");
        expect(await repo.cancelNameChange("p1")).toEqual({ status: "ok" });
        expect(await repo.requestNameChange("p1", "ThirdName")).toMatchObject({
          status: "ok",
        });
        expect(telegramSend).toHaveBeenCalledTimes(2);
      });

      it("a decision for one player does not reset another player's slot", async () => {
        const repo = new NameChangeRepository(
          lifecyclePool().pool,
          inbox,
          TELEGRAM,
        );
        // p2 used its slot; p1's decision must not hand it back. (The fake
        // holds one pending row at a time, so p2 withdraws before p1 asks.)
        await repo.requestNameChange("p2", "OtherName");
        await repo.cancelNameChange("p2");
        await repo.requestNameChange("p1", "FirstName");
        await repo.decideNameChange("p1", "approve", undefined, "FirstName");
        expect(await repo.requestNameChange("p2", "LaterName")).toMatchObject({
          status: "ok",
        });
        expect(telegramSend).toHaveBeenCalledTimes(2);
        expect(telegramSend.mock.calls[0][1]).toContain("OtherName");
        expect(telegramSend.mock.calls[1][1]).toContain("FirstName");
      });

      describe("the id's letter case does not matter (review R1)", () => {
        // The decide route and the session token both accept a UUID in any
        // case (the regexes are /i), and Postgres matches either. The slot must
        // too, or a decide typed in uppercase commits but frees nothing.
        const UPPER_ID = PLAYER_ID.toUpperCase();

        it("approve with the UPPERCASE uuid → the next request sends a 2nd alert", async () => {
          const repo = new NameChangeRepository(
            lifecyclePool().pool,
            inbox,
            TELEGRAM,
          );
          await repo.requestNameChange(PLAYER_ID, "FirstName");
          expect(
            await repo.decideNameChange(
              UPPER_ID,
              "approve",
              undefined,
              "FirstName",
            ),
          ).toEqual({ status: "ok" });
          expect(
            await repo.requestNameChange(PLAYER_ID, "SecondName"),
          ).toMatchObject({ status: "ok" });
          expect(telegramSend).toHaveBeenCalledTimes(2);
          expect(telegramSend.mock.calls[1][1]).toContain("SecondName");
        });

        it("the same player in two cases shares ONE slot (R1's withdraw loop holds)", async () => {
          const repo = new NameChangeRepository(
            lifecyclePool().pool,
            inbox,
            TELEGRAM,
          );
          await repo.requestNameChange(UPPER_ID, "FirstName");
          expect(await repo.cancelNameChange(UPPER_ID)).toEqual({
            status: "ok",
          });
          expect(
            await repo.requestNameChange(PLAYER_ID, "SecondName"),
          ).toMatchObject({ status: "ok" });
          expect(telegramSend).toHaveBeenCalledTimes(1);
        });
      });

      describe("the slot is freed before the COMMIT (review R2)", () => {
        it("a request landing between COMMIT applied and its reply still notifies", async () => {
          // Fails if the release moves after the COMMIT (or out of the try):
          // this request would find the slot still held and be dropped.
          const outcomes: unknown[] = [];
          // The hook only runs during the decide below, after `repo` exists.
          const fake = lifecyclePool({
            onCommitApplied: async () => {
              outcomes.push(await repo.requestNameChange("p1", "SecondName"));
            },
          });
          const repo = new NameChangeRepository(fake.pool, inbox, TELEGRAM);
          await repo.requestNameChange("p1", "FirstName");
          expect(
            await repo.decideNameChange(
              "p1",
              "approve",
              undefined,
              "FirstName",
            ),
          ).toEqual({ status: "ok" });
          expect(outcomes).toEqual([expect.objectContaining({ status: "ok" })]);
          expect(telegramSend).toHaveBeenCalledTimes(2);
          expect(telegramSend.mock.calls[1][1]).toContain("SecondName");
        });

        it("COMMIT fails: decide throws, the row stays pending, and the cost is one extra alert", async () => {
          const repo = new NameChangeRepository(
            lifecyclePool({ commitError: pgError("08006") }).pool,
            inbox,
            TELEGRAM,
          );
          await repo.requestNameChange("p1", "FirstName");
          await expect(
            repo.decideNameChange("p1", "approve", undefined, "FirstName"),
          ).rejects.toThrow("pg 08006");
          // Nothing was decided: the player is not told, and the row is still
          // pending, so a new request is refused and sends nothing.
          expect(inbox.sendTemplate).not.toHaveBeenCalled();
          expect(
            await repo.requestNameChange("p1", "SecondName"),
          ).toMatchObject({ status: "pending_exists" });
          expect(telegramSend).toHaveBeenCalledTimes(1);
          // The documented cost: the slot was already freed, so withdraw →
          // request inside the window sends ONE extra alert — at most one, as
          // the fresh slot then holds again.
          expect(await repo.cancelNameChange("p1")).toEqual({ status: "ok" });
          await repo.requestNameChange("p1", "ThirdName");
          expect(telegramSend).toHaveBeenCalledTimes(2);
          expect(await repo.cancelNameChange("p1")).toEqual({ status: "ok" });
          await repo.requestNameChange("p1", "FourthName");
          expect(telegramSend).toHaveBeenCalledTimes(2);
        });
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
    expect(del.sql).toContain("player_id = $1");
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

describe("dismissRejection (task 0314)", () => {
  it("is citizen-gated like every other player-facing call", async () => {
    const db = fakePool([["SELECT is_citizen", NOT_CITIZEN]]);
    const repo = new NameChangeRepository(db.pool, inbox);
    await expect(repo.dismissRejection("p1")).resolves.toEqual({
      status: "not_citizen",
    });
    expect(db.sqlFor("UPDATE player_name_history")).toHaveLength(0);
  });

  it("treats a player with no profile row as not_citizen", async () => {
    const db = fakePool([["SELECT is_citizen", NO_PROFILE]]);
    const repo = new NameChangeRepository(db.pool, inbox);
    await expect(repo.dismissRejection("p1")).resolves.toEqual({
      status: "not_citizen",
    });
  });

  it("hides ONLY the caller's newest row, and only while it is an unhidden decline", async () => {
    const db = fakePool([
      ["SELECT is_citizen", CITIZEN],
      ["SET dismissed_at = now()", () => ({ rowCount: 1 })],
    ]);
    const repo = new NameChangeRepository(db.pool, inbox);
    await expect(repo.dismissRejection("p1")).resolves.toEqual({
      status: "ok",
    });
    const update = db.sqlFor("SET dismissed_at = now()")[0];
    expect(update.params).toEqual(["p1"]);
    // The newest row of THIS player…
    expect(update.sql).toMatch(
      /WHERE id = \(\s*SELECT id FROM player_name_history\s+WHERE player_id = \$1\s+ORDER BY id DESC\s+LIMIT 1\s*\)/,
    );
    expect(update.sql).toContain("AND player_id = $1");
    // …and only a decline that is not hidden yet — a pending or approved row
    // can never be hidden.
    expect(update.sql).toContain("AND moderation_status = 'rejected'");
    expect(update.sql).toContain("AND dismissed_at IS NULL");
  });

  it("is still ok when nothing was hidden (second tap, or the newest row is not a decline)", async () => {
    const db = fakePool([
      ["SELECT is_citizen", CITIZEN],
      ["SET dismissed_at = now()", () => ({ rowCount: 0 })],
    ]);
    const repo = new NameChangeRepository(db.pool, inbox);
    await expect(repo.dismissRejection("p1")).resolves.toEqual({
      status: "ok",
    });
  });

  it("sends nothing to the inbox or Telegram", async () => {
    const db = fakePool([
      ["SELECT is_citizen", CITIZEN],
      ["SET dismissed_at = now()", () => ({ rowCount: 1 })],
    ]);
    const repo = new NameChangeRepository(db.pool, inbox, TELEGRAM);
    await repo.dismissRejection("p1");
    expect(inbox.sendTemplate).not.toHaveBeenCalled();
    expect(telegramSend).not.toHaveBeenCalled();
  });
});

describe("clearDisplayName (task 0314)", () => {
  function clearPool(
    currentName: string | null | undefined,
    overrides: Array<[string, Handler]> = [],
  ) {
    return fakePool([
      ...overrides,
      [
        "SELECT display_name FROM players",
        () => ({
          rows:
            currentName === undefined ? [] : [{ display_name: currentName }],
        }),
      ],
      ["UPDATE players SET display_name = NULL", () => ({ rowCount: 1 })],
      [
        "INSERT INTO player_name_history",
        () => ({ rows: [{ id: 41 }], rowCount: 1 }),
      ],
    ]);
  }

  it("clears the name and writes a 'cleared' audit row with the removed name and the reason, in one transaction", async () => {
    const db = clearPool("OldName");
    const repo = new NameChangeRepository(db.pool, inbox);
    await expect(
      repo.clearDisplayName(PLAYER_ID, "OldName", "offensive"),
    ).resolves.toEqual({ status: "ok" });

    const order = db.seen.map((e) => e.sql.trim().split("\n")[0]);
    expect(order).toEqual([
      "BEGIN",
      "SELECT display_name FROM players",
      "UPDATE players SET display_name = NULL, updated_at = now()",
      "INSERT INTO player_name_history",
      "COMMIT",
    ]);
    // The lock is the SAME one the approve path takes.
    expect(db.sqlFor("SELECT display_name FROM players")[0].sql).toContain(
      "FOR UPDATE",
    );
    expect(
      db.sqlFor("UPDATE players SET display_name = NULL")[0].params,
    ).toEqual([PLAYER_ID]);
    const insert = db.sqlFor("INSERT INTO player_name_history")[0];
    // Status passed EXPLICITLY (the column still defaults to 'approved'), no new name.
    expect(insert.sql).toContain("'cleared'");
    expect(insert.sql).toMatch(
      /VALUES \(\$1, \$2, NULL, 'cleared', \$3, now\(\)\)/,
    );
    expect(insert.params).toEqual([PLAYER_ID, "OldName", "offensive"]);
    expect(db.client.release).toHaveBeenCalled();
  });

  it("sends the name_change_cleared inbox note AFTER the commit, repeating the name and the reason", async () => {
    const db = clearPool("OldName");
    let committedBeforeSend = false;
    inbox.sendTemplate.mockImplementation(async () => {
      committedBeforeSend = db.seen.some((e) => /^\s*COMMIT\s*$/.test(e.sql));
    });
    const repo = new NameChangeRepository(db.pool, inbox);
    await repo.clearDisplayName(PLAYER_ID, "OldName", "offensive");
    expect(inbox.sendTemplate).toHaveBeenCalledWith(
      PLAYER_ID,
      "name_change_cleared",
      { name: "OldName", reason: "offensive" },
    );
    expect(committedBeforeSend).toBe(true);
  });

  it("no_custom_name when the player has no name set — nothing written, nothing sent", async () => {
    const db = clearPool(null);
    const repo = new NameChangeRepository(db.pool, inbox);
    await expect(
      repo.clearDisplayName(PLAYER_ID, "OldName", "offensive"),
    ).resolves.toEqual({ status: "no_custom_name" });
    expect(db.sqlFor("UPDATE players")).toHaveLength(0);
    expect(db.sqlFor("INSERT INTO player_name_history")).toHaveLength(0);
    expect(db.seen.some((e) => /ROLLBACK/.test(e.sql))).toBe(true);
    expect(inbox.sendTemplate).not.toHaveBeenCalled();
  });

  it("no_custom_name when there is no player row at all", async () => {
    const db = clearPool(undefined);
    const repo = new NameChangeRepository(db.pool, inbox);
    await expect(
      repo.clearDisplayName(PLAYER_ID, "OldName", "offensive"),
    ).resolves.toEqual({ status: "no_custom_name" });
  });

  it("name_mismatch carries the CURRENT name and changes nothing", async () => {
    const db = clearPool("RealName");
    const repo = new NameChangeRepository(db.pool, inbox);
    await expect(
      repo.clearDisplayName(PLAYER_ID, "OtherName", "offensive"),
    ).resolves.toEqual({ status: "name_mismatch", currentName: "RealName" });
    expect(db.sqlFor("UPDATE players")).toHaveLength(0);
    expect(db.sqlFor("INSERT INTO player_name_history")).toHaveLength(0);
    expect(inbox.sendTemplate).not.toHaveBeenCalled();
  });

  it("trims expectedName before comparing, but stays case-sensitive", async () => {
    const trimmed = clearPool("OldName");
    await expect(
      new NameChangeRepository(trimmed.pool, inbox).clearDisplayName(
        PLAYER_ID,
        "  OldName \n",
        "r",
      ),
    ).resolves.toEqual({ status: "ok" });
    const cased = clearPool("OldName");
    await expect(
      new NameChangeRepository(cased.pool, inbox).clearDisplayName(
        PLAYER_ID,
        "oldname",
        "r",
      ),
    ).resolves.toEqual({ status: "name_mismatch", currentName: "OldName" });
  });

  it("rolls back, releases the client and rethrows when a write fails — no inbox note", async () => {
    const db = clearPool("OldName", [
      [
        "INSERT INTO player_name_history",
        () => {
          throw pgError("23514");
        },
      ],
    ]);
    const repo = new NameChangeRepository(db.pool, inbox);
    await expect(
      repo.clearDisplayName(PLAYER_ID, "OldName", "offensive"),
    ).rejects.toThrow("pg 23514");
    expect(db.seen.some((e) => /ROLLBACK/.test(e.sql))).toBe(true);
    expect(db.seen.some((e) => /^\s*COMMIT\s*$/.test(e.sql))).toBe(false);
    expect(db.client.release).toHaveBeenCalled();
    expect(inbox.sendTemplate).not.toHaveBeenCalled();
  });

  it("returns ok even when the inbox send rejects (the clear is committed)", async () => {
    inbox.sendTemplate.mockRejectedValue(new Error("inbox down"));
    const db = clearPool("OldName");
    const repo = new NameChangeRepository(db.pool, inbox);
    await expect(
      repo.clearDisplayName(PLAYER_ID, "OldName", "offensive"),
    ).resolves.toEqual({ status: "ok" });
  });

  it("never touches a pending request, and sends no Telegram message", async () => {
    const db = clearPool("OldName");
    const repo = new NameChangeRepository(db.pool, inbox, TELEGRAM);
    await repo.clearDisplayName(PLAYER_ID, "OldName", "offensive");
    expect(db.sqlFor("moderation_status = 'pending'")).toHaveLength(0);
    expect(db.sqlFor("DELETE")).toHaveLength(0);
    expect(telegramSend).not.toHaveBeenCalled();
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
        "SELECT display_name FROM players",
        () => ({ rows: [{ display_name: "OldName" }] }),
      ],
      ["UPDATE players SET display_name", () => ({ rowCount: 1 })],
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
    expect(db.sqlFor("UPDATE players SET display_name")[0].params).toEqual([
      "p1",
      "NewName",
    ]);
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
    expect(db.sqlFor("UPDATE players SET display_name")).toHaveLength(0);
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
        "UPDATE players SET display_name",
        () => {
          throw pgError("23505", "players_display_name_uq");
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
      expect(db.sqlFor("UPDATE players SET display_name")[0].params).toEqual([
        "p1",
        "NewName",
      ]);
    });

    it("refuses a MISMATCH and applies nothing, returning the real pending name", async () => {
      const db = decidePool();
      const repo = new NameChangeRepository(db.pool, inbox);
      await expect(
        repo.decideNameChange("p1", "approve", undefined, "StaleName"),
      ).resolves.toEqual({ status: "name_mismatch", pendingName: "NewName" });
      expect(db.sqlFor("UPDATE players SET display_name")).toHaveLength(0);
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
      expect(db.sqlFor("UPDATE players SET display_name")[0].params).toEqual([
        "p1",
        "NewName",
      ]);
    });
  });

  it("rethrows a 23505 from a DIFFERENT constraint instead of calling it name_taken", async () => {
    const db = decidePool([
      [
        "UPDATE players SET display_name",
        () => {
          // Unreachable under today's schema — that UPDATE touches only
          // display_name. The day players gains another unique
          // constraint, mis-reporting it as a 409 would be silent, so the catch
          // is narrowed by index name rather than by which statement raised it.
          throw pgError("23505", "players_some_future_uq");
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
        "UPDATE players SET display_name",
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
        "UPDATE players SET display_name",
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
  // The projection query (its SELECT list; the dismiss UPDATE never matches it).
  const LATEST = "SELECT new_display_name, moderation_status";

  function latestPool(row: Record<string, unknown>) {
    return fakePool([[LATEST, () => ({ rows: [row] })]]);
  }

  it("returns null when the player has never requested a change", async () => {
    const db = fakePool([[LATEST, () => ({ rows: [] })]]);
    const repo = new NameChangeRepository(db.pool, inbox);
    await expect(repo.getLatestState("p1")).resolves.toBeNull();
  });

  it("projects the newest row WITHOUT the rejection reason", async () => {
    const decidedAt = new Date("2026-08-28T10:00:00.000Z");
    const db = fakePool([
      [
        LATEST,
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
    expect(db.sqlFor(LATEST)[0].sql).not.toContain("rejection_reason");
  });

  it("carries a null decided_at for a pending request", async () => {
    const db = fakePool([
      [
        LATEST,
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

  // ── Task 0314 ──
  it("a declined request the player HID projects as null — the card goes idle", async () => {
    const db = latestPool({
      new_display_name: "NewName",
      moderation_status: "rejected",
      decided_at: new Date("2026-08-28T10:00:00.000Z"),
      dismissed_at: new Date("2026-08-29T10:00:00.000Z"),
    });
    const repo = new NameChangeRepository(db.pool, inbox);
    await expect(repo.getLatestState("p1")).resolves.toBeNull();
    expect(db.sqlFor(LATEST)[0].sql).toContain("dismissed_at");
  });

  it("a declined request NOT hidden still projects as rejected", async () => {
    const db = latestPool({
      new_display_name: "NewName",
      moderation_status: "rejected",
      decided_at: new Date("2026-08-28T10:00:00.000Z"),
      dismissed_at: null,
    });
    const repo = new NameChangeRepository(db.pool, inbox);
    await expect(repo.getLatestState("p1")).resolves.toEqual({
      status: "rejected",
      requested_name: "NewName",
      decided_at: "2026-08-28T10:00:00.000Z",
    });
  });

  it("a 'cleared' audit row projects as null — never the string \"null\" and never the status", async () => {
    const db = latestPool({
      new_display_name: null,
      moderation_status: "cleared",
      decided_at: new Date("2026-08-28T10:00:00.000Z"),
      dismissed_at: null,
    });
    const repo = new NameChangeRepository(db.pool, inbox);
    await expect(repo.getLatestState("p1")).resolves.toBeNull();
  });

  it("dismissed_at only matters on a DECLINE — a pending or approved row still shows", async () => {
    for (const status of ["pending", "approved"]) {
      const db = latestPool({
        new_display_name: "NewName",
        moderation_status: status,
        decided_at: null,
        dismissed_at: new Date("2026-08-29T10:00:00.000Z"),
      });
      const repo = new NameChangeRepository(db.pool, inbox);
      await expect(repo.getLatestState("p1")).resolves.toMatchObject({
        status,
      });
    }
  });

  it("a PENDING row wins over a newer cleared row (a clear leaves a pending request alone)", async () => {
    const db = latestPool({
      new_display_name: "NewName",
      moderation_status: "pending",
      decided_at: null,
      dismissed_at: null,
    });
    const repo = new NameChangeRepository(db.pool, inbox);
    await repo.getLatestState("p1");
    const sql = db.sqlFor(LATEST)[0].sql;
    expect(sql).toMatch(
      /ORDER BY \(moderation_status = 'pending'\) DESC, id DESC\s+LIMIT 1/,
    );
  });
});

// ── Task 0307 — hostile names on the name-change path ──────────────────────
describe("hostile requested names (task 0307)", () => {
  it.each([
    ["'", "ab'cd", "invalid_chars"],
    ['"', 'ab"cd', "invalid_chars"],
    [";", "ab;cd", "invalid_chars"],
    ["--", "ab--cd", "invalid_chars"],
    ["' OR 1=1 --", "' OR 1=1 --", "invalid_chars"],
    ["\\", "ab\\cd", "invalid_chars"],
    ["<script>", "<script>", "invalid_chars"],
    ["<img onerror>", "<img onerror=x>", "invalid_chars"],
    ["&lt;", "&lt;abc", "invalid_chars"],
    ["<b>", "<b>abc</b>", "invalid_chars"],
    ["<a href>", "<a href=x>abc</a>", "invalid_chars"],
    ["$(…)", "$(touch x)", "invalid_chars"],
    ["backticks", "`id`abc", "invalid_chars"],
    ["zero-width space", "ab\u200Bcd", "invalid_chars"],
    ["zero-width joiner", "ab\u200Dcd", "invalid_chars"],
    ["right-to-left override", "ab\u202Ecd", "invalid_chars"],
    ["isolate", "ab\u2066cd", "invalid_chars"],
    ["emoji", "Cat\u{1F408}User", "invalid_chars"],
    ["combining mark", "abe\u0301", "invalid_chars"],
    ["28 characters", "a".repeat(28), "too_long"],
    ["27 astral letters", "\u{1D400}".repeat(27), "too_long"],
    ["all spaces (trimmed first)", "     ", "too_short"],
  ])(
    "refuses %s (%j) with the expected violation, inserting nothing",
    async (_l, name, rule) => {
      const db = fakePool([["SELECT is_citizen", CITIZEN]]);
      const repo = new NameChangeRepository(db.pool, inbox, TELEGRAM);
      await expect(repo.requestNameChange("p1", name)).resolves.toEqual({
        status: "invalid",
        violation: rule,
      });
      expect(db.sqlFor("INSERT INTO player_name_history")).toHaveLength(0);
      expect(telegramSend).not.toHaveBeenCalled();
    },
  );
});

// F2 (owner ruling Q4): the approve command is safe for ANY name, not just the
// ones the rule lets through today. These drive the pure builder with names the
// rule REFUSES on purpose — that is the point: if task 0308 ever widens the rule,
// the shell line must already be safe on its own.
describe("buildDecideCommandBody — the pasted shell line (task 0307, F2)", () => {
  const HOSTILE_NAMES = [
    "O'Brien",
    "'; touch PWNED; '",
    "$(touch PWNED)",
    "`touch PWNED`",
    "a\u00A0b", // no-break space
    "a\uFEFFb", // invisible U+FEFF
    "a\nb\tc\u2028d",
    "ab\u202Ecd",
    "Привет",
    "\u{1D400}\u{1F408}",
    'back\\slash "quote"',
    "<b>&amp;</b>",
    "\u007F",
  ];

  it.each(HOSTILE_NAMES.map((n) => [JSON.stringify(n), n]))(
    "%s → a pure-ASCII body with no single quote that parses back to the exact name",
    (_label, name) => {
      const body = buildDecideCommandBody(PLAYER_ID, name);
      expect(body).toMatch(/^[\x20-\x7E]*$/);
      expect(body).not.toContain("'");
      expect(JSON.parse(body)).toEqual({
        playerId: PLAYER_ID,
        decision: "approve",
        expectedName: name,
      });
    },
  );

  it("keeps a plain name readable in the body", () => {
    expect(buildDecideCommandBody(PLAYER_ID, "NewName")).toBe(
      `{"playerId":"${PLAYER_ID}","decision":"approve","expectedName":"NewName"}`,
    );
  });

  it("puts that body inside the '…' of BOTH decide lines (task 0312)", () => {
    const lines = decideCommandLines(PLAYER_ID, "O'Brien").join("\n");
    for (const decision of ["approve", "reject"] as const) {
      expect(lines).toContain(
        `-e NAME_CHANGE_DECISION='${buildDecideCommandBody(PLAYER_ID, "O'Brien", decision)}'`,
      );
    }
  });

  it("the reject body parses to decision reject with the exact name (task 0312)", () => {
    for (const name of HOSTILE_NAMES) {
      const body = buildDecideCommandBody(PLAYER_ID, name, "reject");
      expect(body).toMatch(/^[\x20-\x7E]*$/);
      expect(body).not.toContain("'");
      expect(JSON.parse(body)).toEqual({
        playerId: PLAYER_ID,
        decision: "reject",
        expectedName: name,
      });
    }
  });

  // The real proof: hand the quoted body to an actual bash, the way an operator's
  // paste does. Nothing expands, nothing runs, and the bytes come back unchanged.
  it("survives a real bash: nothing expands or runs, bytes come back exact", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nc-0307-"));
    try {
      for (const name of HOSTILE_NAMES) {
        const body = buildDecideCommandBody(PLAYER_ID, name);
        const result = spawnSync("bash", ["-c", `printf '%s' '${body}'`], {
          cwd: dir,
          encoding: "utf8",
        });
        expect(result.status).toBe(0);
        expect(result.stdout).toBe(body);
        expect(JSON.parse(result.stdout).expectedName).toBe(name);
      }
      expect(fs.readdirSync(dir)).toEqual([]);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});

// ── Task 0312 — the Approve/Reject lines as the operator pastes them ───────
describe("decideCommandLines — the box commands (task 0312)", () => {
  const HOSTILE_NAMES = [
    "O'Brien",
    "'; touch PWNED; '",
    "$(touch PWNED)",
    "`touch PWNED`",
    "a\u00A0b",
    "a\uFEFFb",
    "a\nb\tc\u2028d",
    "ab\u202Ecd",
    "Привет",
    "\u{1D400}\u{1F408}",
    'back\\slash "quote"',
    "<b>&amp;</b>",
    "\u007F",
    "a=b==c", // docker splits -e on the FIRST `=` only
    "!!x!$", // history expansion does not happen inside '…' (harness turns it ON)
    "Ivan",
  ];

  // `bash -c` is non-interactive, so history expansion is OFF by default and a `!`
  // case would pass even if '…' did not protect it (review 0312 R2). Turn it on and
  // prime the history, as an operator's interactive shell has it: an unprotected
  // `!!` / `!$` would now expand (or fail "event not found") and change the args.
  const HISTORY_ON = "set -o history -H\n: primed history\n";

  /** The <pre> commands, turned back from Telegram HTML into what the operator pastes. */
  function pastedCommands(lines: string[]): string[] {
    return lines
      .map((line) => /^<pre>(.*)<\/pre>$/.exec(line))
      .filter((m): m is RegExpExecArray => m !== null)
      .map((m) =>
        m[1].replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&"),
      );
  }

  it("emits exactly two commands, Approve then Reject", () => {
    const lines = decideCommandLines(PLAYER_ID, "Ivan");
    expect(lines[0]).toContain("<b>Approve</b>");
    expect(lines[2]).toContain("<b>Reject</b>");
    expect(pastedCommands(lines)).toEqual([
      `docker compose -f /opt/profile/docker-compose.yml exec -T -e NAME_CHANGE_DECISION='${buildDecideCommandBody(PLAYER_ID, "Ivan", "approve")}' profile-api npm run -s name-change:decide`,
      `docker compose -f /opt/profile/docker-compose.yml exec -T -e NAME_CHANGE_DECISION='${buildDecideCommandBody(PLAYER_ID, "Ivan", "reject")}' -e NAME_CHANGE_REASON='REPLACE-WITH-REASON' profile-api npm run -s name-change:decide`,
    ]);
  });

  // The real proof: run each pasted line through an actual bash, with a stub
  // `docker` first on PATH that records its arguments. Nothing may expand or run,
  // and docker must receive exactly the intended argument list.
  it("survives a real bash: docker gets exactly the intended arguments, nothing else runs", () => {
    const work = fs.mkdtempSync(path.join(os.tmpdir(), "nc-0312-cwd-"));
    const tools = fs.mkdtempSync(path.join(os.tmpdir(), "nc-0312-bin-"));
    const argsFile = path.join(tools, "args");
    fs.writeFileSync(
      path.join(tools, "docker"),
      '#!/bin/bash\nprintf \'%s\\0\' "$@" > "$DOCKER_ARGS_FILE"\n',
      { mode: 0o755 },
    );
    try {
      for (const name of HOSTILE_NAMES) {
        const commands = pastedCommands(decideCommandLines(PLAYER_ID, name));
        expect(commands).toHaveLength(2);
        commands.forEach((command, index) => {
          const decision = index === 0 ? "approve" : "reject";
          fs.rmSync(argsFile, { force: true });
          const result = spawnSync("bash", ["-c", HISTORY_ON + command], {
            cwd: work,
            encoding: "utf8",
            env: {
              ...process.env,
              PATH: `${tools}:${process.env.PATH ?? ""}`,
              DOCKER_ARGS_FILE: argsFile,
            },
          });
          expect(result.status).toBe(0);
          expect(result.stderr).toBe("");
          const args = fs.readFileSync(argsFile, "utf8").split("\0");
          args.pop(); // trailing NUL
          const body = buildDecideCommandBody(PLAYER_ID, name, decision);
          expect(args).toEqual([
            "compose",
            "-f",
            "/opt/profile/docker-compose.yml",
            "exec",
            "-T",
            "-e",
            `NAME_CHANGE_DECISION=${body}`,
            ...(decision === "reject"
              ? ["-e", "NAME_CHANGE_REASON=REPLACE-WITH-REASON"]
              : []),
            "profile-api",
            "npm",
            "run",
            "-s",
            "name-change:decide",
          ]);
          // What the container will see after docker splits on the first `=`.
          const value = args[6].slice(args[6].indexOf("=") + 1);
          expect(JSON.parse(value)).toEqual({
            playerId: PLAYER_ID,
            decision,
            expectedName: name,
          });
        });
      }
      expect(fs.readdirSync(work)).toEqual([]);
    } finally {
      fs.rmSync(work, { recursive: true, force: true });
      fs.rmSync(tools, { recursive: true, force: true });
    }
  });

  // Control for the harness above: the same preamble DOES expand an unquoted-by-'…'
  // `!!`, so the "!!x!$" case is a real check, not a vacuous one.
  it("control: the harness's bash really has history expansion on", () => {
    const result = spawnSync(
      "bash",
      ["-c", `${HISTORY_ON}printf '%s' "!!x!$"`],
      { encoding: "utf8" },
    );
    expect(result.stdout).toBe(": primed historyxhistory");
  });

  it.each(HOSTILE_NAMES.map((n) => [JSON.stringify(n), n]))(
    "%s → valid Telegram HTML: no raw < or > and no stray & inside <pre>",
    (_label, name) => {
      for (const line of decideCommandLines(PLAYER_ID, name)) {
        const pre = /^<pre>(.*)<\/pre>$/.exec(line);
        if (pre === null) {
          continue;
        }
        expect(pre[1]).not.toMatch(/[<>]/);
        expect(pre[1]).not.toMatch(/&(?!(amp|lt|gt);)/);
      }
    },
  );

  it("a worst-case 128-unit hostile name keeps the whole message under Telegram's 4096 limit", () => {
    // Raw markup length is an UPPER bound on what Telegram counts (it counts the
    // text after parsing the tags and entities), so passing here is conservative.
    const worst = [
      "\u00A0".repeat(128), // each: ⟨U+00A0⟩ in the text + \u00A0 in two bodies
      "&".repeat(128), // each: ⟨U+0026⟩ + &amp; in two bodies
      "\u{1F408}".repeat(64), // astral: two UTF-16 units each
      "\u202E".repeat(128),
    ];
    for (const name of worst) {
      expect(name.length).toBe(128);
      const text = buildOperatorNotificationText(
        PLAYER_ID,
        name,
        "2026-09-27T00:00:00.000Z",
      );
      expect(text).toContain("<b>Reject</b>");
      expect(text.length).toBeLessThan(4096);
    }
  });
});

// F3 (owner ruling Q1): the moderator SEES a hidden character instead of reading
// a clean-looking name.
describe("describeRequestedNameForModerator (task 0307, F3)", () => {
  it.each([
    ["a no-break space", "Iv\u00A0an", "Iv⟨U+00A0⟩an"],
    ["an invisible U+FEFF", "Iv\uFEFFan", "Iv⟨U+FEFF⟩an"],
    ["a newline", "Iv\nan", "Iv⟨U+000A⟩an"],
    ["a tab", "Iv\tan", "Iv⟨U+0009⟩an"],
    ["a carriage return", "Iv\ran", "Iv⟨U+000D⟩an"],
    ["a line separator", "Iv\u2028an", "Iv⟨U+2028⟩an"],
    ["an ideographic space", "Iv\u3000an", "Iv⟨U+3000⟩an"],
    ["an astral character (one code, not two)", "a\u{1F408}b", "a⟨U+1F408⟩b"],
    // 0307 review R1: invisible "letters" (category Lo) that pass the name rule
    // and `\p{L}`, yet draw as blank space.
    ["the Hangul filler U+3164", "Bob\u3164", "Bob⟨U+3164⟩"],
    ["the Hangul choseong filler U+115F", "Bo\u115Fb", "Bo⟨U+115F⟩b"],
    ["the Hangul jungseong filler U+1160", "Bo\u1160b", "Bo⟨U+1160⟩b"],
    ["the halfwidth Hangul filler U+FFA0", "Bo\uFFA0b", "Bo⟨U+FFA0⟩b"],
    [
      "a name made only of fillers",
      "\u3164\u3164\u3164",
      "⟨U+3164⟩⟨U+3164⟩⟨U+3164⟩",
    ],
  ])("shows %s as a visible code", (_label, name, shown) => {
    expect(describeRequestedNameForModerator(name)).toEqual({
      html: shown,
      hasHiddenCharacters: true,
    });
  });

  it.each(["Ivan", "Привет 123", "[Clan] Name_1", "한국어 이름", "ㄱㄴㄷ"])(
    "leaves a plain name (%s) untouched, with no warning",
    (name) => {
      expect(describeRequestedNameForModerator(name)).toEqual({
        html: name,
        hasHiddenCharacters: false,
      });
    },
  );

  it("the Telegram message shows the code and a warning line — and the command still carries the REAL name", async () => {
    const db = fakePool([
      ["SELECT is_citizen", CITIZEN],
      ["lower(display_name)", NAME_FREE],
      ["INSERT INTO player_name_history", () => ({ rows: [{ id: 3 }] })],
    ]);
    const repo = new NameChangeRepository(db.pool, inbox, TELEGRAM);
    await repo.requestNameChange(PLAYER_ID, "Iv\u00A0an");
    const text = telegramSend.mock.calls[0][1] as string;
    expect(text).toContain("<b>Requested:</b> Iv⟨U+00A0⟩an");
    expect(text).toContain("hidden or unusual characters");
    // The stored name (what expectedName must match) is the real one.
    const insert = db.sqlFor("INSERT INTO player_name_history")[0];
    expect(insert.params).toEqual([PLAYER_ID, "Iv\u00A0an"]);
    expect(text).toContain('"expectedName":"Iv\\u00a0an"');
  });

  it("warns about a name hiding a Hangul filler, which the name rule accepts (review R1)", async () => {
    const db = fakePool([
      ["SELECT is_citizen", CITIZEN],
      ["lower(display_name)", NAME_FREE],
      ["INSERT INTO player_name_history", () => ({ rows: [{ id: 3 }] })],
    ]);
    const repo = new NameChangeRepository(db.pool, inbox, TELEGRAM);
    // Accepted by the rule today (which characters are allowed is 0308's).
    expect(await repo.requestNameChange(PLAYER_ID, "Bob\u3164")).toEqual(
      expect.objectContaining({ status: "ok" }),
    );
    const text = telegramSend.mock.calls[0][1] as string;
    expect(text).toContain("<b>Requested:</b> Bob⟨U+3164⟩");
    expect(text).toContain("hidden or unusual characters");
    const insert = db.sqlFor("INSERT INTO player_name_history")[0];
    expect(insert.params).toEqual([PLAYER_ID, "Bob\u3164"]);
  });

  it("adds no warning line for a plain name", async () => {
    const db = fakePool([
      ["SELECT is_citizen", CITIZEN],
      ["lower(display_name)", NAME_FREE],
      ["INSERT INTO player_name_history", () => ({ rows: [{ id: 3 }] })],
    ]);
    const repo = new NameChangeRepository(db.pool, inbox, TELEGRAM);
    await repo.requestNameChange(PLAYER_ID, "Ivan");
    const text = telegramSend.mock.calls[0][1] as string;
    expect(text).toContain("<b>Requested:</b> Ivan");
    expect(text).not.toContain("hidden or unusual characters");
  });
});

// Task 0322 (owner ruling "Keep filter, warn me first"): since approved names show
// in matches, the moderator is told when the MATCH's rude-name filter would hide a
// requested name. A yes/no only — never the matched word, never the stand-in name.
describe("rude-name filter warning (task 0322)", () => {
  const FILTER_WARNING = "rude-name filter would hide this name";
  // A word from obscenity's English dataset (the real matcher, no mock here).
  const FILTERED = "bitch";
  // What the match shows instead (src/core/validations/username.ts shadowNames).
  const STAND_INS = [
    "NicePeopleOnly",
    "BeKindPlz",
    "LearningManners",
    "StayClassy",
    "BeNicer",
    "NeedHugs",
    "MakeFriends",
  ];

  it("asks the match's own matcher", () => {
    expect(wouldMatchFilterHideName(FILTERED)).toBe(true);
    expect(wouldMatchFilterHideName("B1tch_Queen")).toBe(true);
    expect(wouldMatchFilterHideName("Ivan")).toBe(false);
    expect(wouldMatchFilterHideName("Привет 123")).toBe(false);
  });

  it("the per-request message carries the warning for a filter-matched name", async () => {
    const db = fakePool([
      ["SELECT is_citizen", CITIZEN],
      ["lower(display_name)", NAME_FREE],
      ["INSERT INTO player_name_history", () => ({ rows: [{ id: 3 }] })],
    ]);
    const repo = new NameChangeRepository(db.pool, inbox, TELEGRAM);
    // The player's own reply carries nothing about the filter — no probing it.
    expect(await repo.requestNameChange(PLAYER_ID, FILTERED)).toEqual({
      status: "ok",
      id: 3,
    });
    const text = telegramSend.mock.calls[0][1] as string;
    expect(text).toContain(FILTER_WARNING);
    expect(text).toContain("Consider rejecting.");
    const warningLine = text
      .split("\n")
      .find((line) => line.includes(FILTER_WARNING));
    expect(warningLine).toBeDefined();
    // Never the matched term, never the stand-in name, on the warning line.
    expect(warningLine).not.toContain(FILTERED);
    for (const standIn of STAND_INS) {
      expect(text).not.toContain(standIn);
    }
  });

  it("no warning line for a clean name", async () => {
    const db = fakePool([
      ["SELECT is_citizen", CITIZEN],
      ["lower(display_name)", NAME_FREE],
      ["INSERT INTO player_name_history", () => ({ rows: [{ id: 3 }] })],
    ]);
    const repo = new NameChangeRepository(db.pool, inbox, TELEGRAM);
    await repo.requestNameChange(PLAYER_ID, "Ivan");
    const text = telegramSend.mock.calls[0][1] as string;
    expect(text).not.toContain(FILTER_WARNING);
  });

  it("a name with hidden characters AND a filtered word gets both warnings, and stays valid HTML under 4096", () => {
    const name = `${"\u00A0".repeat(123)}${FILTERED}`;
    expect(name.length).toBe(128);
    const text = buildOperatorNotificationText(
      PLAYER_ID,
      name,
      "2026-09-28T00:00:00.000Z",
    );
    expect(text).toContain("hidden or unusual characters");
    expect(text).toContain(FILTER_WARNING);
    expect(text.length).toBeLessThan(4096);
    // The only tags are the ones the message writes itself.
    const tags = new Set(text.match(/<[^>]*>/g) ?? []);
    for (const tag of tags) {
      expect(["<b>", "</b>", "<pre>", "</pre>"]).toContain(tag);
    }
  });
});
