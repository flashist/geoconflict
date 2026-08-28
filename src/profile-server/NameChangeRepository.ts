// Data layer for citizen name changes (task 0067). Same rules as
// InboxRepository / PlayerProfileRepository: the ONLY component that touches
// `player_name_history`, snake_case column names end-to-end, shared pg Pool.
//
// The citizen gate lives HERE (server-side, in SQL, on every player-facing
// call), never in client state: a non-citizen or a missing profile gets
// `not_citizen` whatever the client claims.

import { Pool, PoolClient } from "pg";
import {
  escapeTelegramHtml,
  sendTelegramMessage,
  type TelegramConfig,
} from "../core/notifications/TelegramNotifier";
import type { NameChangeState } from "../core/profile/NameChangeContract";
import {
  checkUsernameRules,
  type UsernameRuleViolation,
} from "../core/validations/usernameRules";
import { logInboxSendFailure, type InboxSender } from "./InboxRepository";
import { formatError, logger } from "./Logger";

const log = logger.child({ comp: "namechange" });

export type RequestOutcome =
  | { status: "not_citizen" }
  | { status: "invalid"; violation: UsernameRuleViolation }
  | { status: "name_taken" }
  | { status: "pending_exists" }
  | { status: "ok"; id: number };

export type CancelOutcome =
  | { status: "not_citizen" }
  | { status: "no_pending" }
  | { status: "ok" };

export type DecideOutcome =
  | { status: "no_pending" }
  | { status: "name_taken" }
  // Carries the name that IS pending: the decide endpoint is internal-auth'd
  // (operators only) and this string is already public on GET /v1/profile, so
  // returning it leaks nothing and makes a stale command self-correcting.
  | { status: "name_mismatch"; pendingName: string }
  | { status: "ok" };

// At most ONE operator notification per player per window (review R1). Cancel
// DELETES the pending row, which frees the one-pending unique index, so
// request → cancel → request loops indefinitely and every accepted insert used
// to notify. The 30/min per-IP limiter does not bound this: it is per IP, and
// Russian carriers CGNAT thousands of players behind one address.
//
// Suppressing a notification is only SAFE because the decision is bound to
// `expectedName` (owner ruling, option A): an operator acting on a message
// whose name has since been swapped gets 409 `name_mismatch` and applies
// nothing. Without that binding this cooldown would itself be a moderation-gate
// bypass — which is why the two shipped together.
const OPERATOR_NOTIFY_COOLDOWN_MS = 10 * 60_000;

// Above this many tracked players, expired entries are swept before inserting.
// The map is already bounded by the citizen count (the SQL gate runs first), so
// this is tidiness, not a defence.
const NOTIFY_TRACKING_SWEEP_AT = 256;

// Postgres `unique_violation`. TWO different indexes raise it on this path and
// they mean opposite things, so every catch below is narrowed by the INDEX NAME
// the error carries, never by the code alone:
//   * player_name_history_one_pending_uq  → this player already has a pending
//     request (`pending_exists`), raised by the INSERT.
//   * player_profiles_display_name_uq     → the name was taken between request
//     and approval (`name_taken`), raised by the approve UPDATE.
const PG_UNIQUE_VIOLATION = "23505";

// Narrowing by statement alone is not enough. It is correct under TODAY's schema
// (the approve UPDATE touches only display_name, so only the display-name index
// can fire), but the day player_profiles gains a second unique constraint that
// violation would be silently mis-reported as `name_taken` and rolled back, with
// nothing to flag it. Postgres reports the offending INDEX name in the error's
// `constraint` field, so both catches below check it explicitly and rethrow
// anything else.
const DISPLAY_NAME_UNIQUE = "player_profiles_display_name_uq";
const ONE_PENDING_UNIQUE = "player_name_history_one_pending_uq";

function isPgError(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: string }).code === code
  );
}

function isUniqueViolationOn(error: unknown, constraint: string): boolean {
  return (
    isPgError(error, PG_UNIQUE_VIOLATION) &&
    (error as { constraint?: string }).constraint === constraint
  );
}

const CITIZEN_SQL = `
SELECT is_citizen FROM player_profiles WHERE yandex_player_id = $1
`;

// Advisory only — see the race note on decideNameChange. Excludes the caller's
// OWN row: re-requesting the name you already hold is not a collision (updating
// a row to its current value never violates the unique index).
const NAME_TAKEN_SQL = `
SELECT 1 FROM player_profiles
WHERE lower(display_name) = lower($1) AND yandex_player_id <> $2
LIMIT 1
`;

// 'pending' is passed EXPLICITLY. migrations/001 defaults moderation_status to
// 'approved', so an INSERT that omitted it would silently ship an unmoderated
// name change. This is the single most dangerous line in the file.
const INSERT_REQUEST_SQL = `
INSERT INTO player_name_history
  (yandex_player_id, new_display_name, moderation_status)
VALUES ($1, $2, 'pending')
RETURNING id
`;

// Self-service cancel (owner amendment 2). The pending row is DELETED rather
// than given a terminal status: the CHECK constraint in 001 allows only
// pending/approved/rejected, and a request the player withdrew before any
// operator saw it has no audit value — marking it 'rejected' would both lie
// about who rejected it and leave a reason-less rejected row the card would
// then render as an operator rejection. Scoped to the caller's own id and to
// `pending` only, so a decided row can never be erased.
const CANCEL_SQL = `
DELETE FROM player_name_history
WHERE yandex_player_id = $1 AND moderation_status = 'pending'
`;

const SELECT_PENDING_FOR_UPDATE_SQL = `
SELECT id, new_display_name FROM player_name_history
WHERE yandex_player_id = $1 AND moderation_status = 'pending'
FOR UPDATE
`;

// Locks the profile row for the duration of the decision transaction, so two
// concurrent approvals of the same target name serialize instead of racing.
const LOCK_PROFILE_SQL = `
SELECT display_name FROM player_profiles
WHERE yandex_player_id = $1
FOR UPDATE
`;

const APPLY_NAME_SQL = `
UPDATE player_profiles SET display_name = $2, updated_at = now()
WHERE yandex_player_id = $1
`;

const MARK_APPROVED_SQL = `
UPDATE player_name_history
SET moderation_status = 'approved', old_display_name = $2, decided_at = now()
WHERE id = $1
`;

const MARK_REJECTED_SQL = `
UPDATE player_name_history
SET moderation_status = 'rejected', rejection_reason = $2, decided_at = now()
WHERE id = $1
`;

// Newest request wins — this drives the card's pending / rejected / approved
// state. player_name_history_player_recent_idx serves it.
const LATEST_SQL = `
SELECT new_display_name, moderation_status, decided_at
FROM player_name_history
WHERE yandex_player_id = $1
ORDER BY id DESC
LIMIT 1
`;

function toIsoOrNull(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

export class NameChangeRepository {
  /**
   * When each player last had an operator notification sent for them. In-process
   * only, and deliberately so: losing it on restart costs at most one extra
   * Telegram message, whereas a shared store would put a dependency in front of
   * a best-effort notification path.
   */
  private readonly lastNotifiedAt = new Map<string, number>();

  /**
   * `inbox` and `telegram` are both optional so tests and tools can build the
   * repository without them; when absent the corresponding notification is
   * simply not sent, and nothing else changes.
   */
  constructor(
    private readonly pool: Pool,
    private readonly inbox?: InboxSender,
    private readonly telegram?: TelegramConfig,
  ) {}

  /**
   * Submit a name-change request. Citizen-gated in SQL. Validation is the SAME
   * rule set the in-game username input uses (owner ruling (c) — shared via
   * core/validations/usernameRules), plus the profile schema's case-insensitive
   * uniqueness. The row is written `pending`; nothing about the live profile
   * changes until an operator approves.
   *
   * The operator Telegram notification fires AFTER the insert, fire-and-forget,
   * and can never fail the request (brief step 7).
   */
  async requestNameChange(
    yandexPlayerId: string,
    requestedName: string,
  ): Promise<RequestOutcome> {
    if (!(await this.isCitizen(yandexPlayerId))) {
      return { status: "not_citizen" };
    }
    // TRIM FIRST — this is what ruling (c) actually mirrors. Both client paths
    // trim before validating (UsernameInput.ts:72, CitizenshipCard.ts:560), so
    // an untrimmed server was strictly MORE permissive than the validator it was
    // told to reuse: "   " is three characters and \s is inside
    // validUsernamePattern, so it passed. Anyone POSTing directly, rather than
    // through the card, went through that gap. The trimmed value is what gets
    // validated, uniqueness-checked, stored and shown to the operator.
    const name = requestedName.trim();
    const violation = checkUsernameRules(name);
    if (violation !== null) {
      return { status: "invalid", violation };
    }
    const taken = await this.pool.query(NAME_TAKEN_SQL, [name, yandexPlayerId]);
    if ((taken.rowCount ?? 0) > 0) {
      return { status: "name_taken" };
    }

    let id: number;
    try {
      const res = await this.pool.query(INSERT_REQUEST_SQL, [
        yandexPlayerId,
        name,
      ]);
      id = Number(res.rows[0].id);
    } catch (error) {
      // Only the one-pending partial index can fire here (the display-name index
      // is on player_profiles, which this statement does not touch) — but it is
      // checked by name anyway, so a future constraint on player_name_history
      // surfaces as a real error instead of a bogus `pending_exists`.
      if (isUniqueViolationOn(error, ONE_PENDING_UNIQUE)) {
        return { status: "pending_exists" };
      }
      throw error;
    }

    this.notifyOperator(yandexPlayerId, name);
    return { status: "ok", id };
  }

  /**
   * Withdraw the caller's OWN pending request (owner amendment 2). Citizen-gated
   * like every other player-facing call. Deleting the row frees the one-pending
   * partial unique index, so a new request immediately succeeds — which is the
   * point: it is what lets a citizen clear a request a griefer parked under
   * their (non-secret, client-asserted) player id.
   */
  async cancelNameChange(yandexPlayerId: string): Promise<CancelOutcome> {
    if (!(await this.isCitizen(yandexPlayerId))) {
      return { status: "not_citizen" };
    }
    const res = await this.pool.query(CANCEL_SQL, [yandexPlayerId]);
    return (res.rowCount ?? 0) > 0
      ? { status: "ok" }
      : { status: "no_pending" };
  }

  /**
   * Operator decision on the player's pending request, in ONE transaction.
   *
   * Approve: `player_profiles.display_name` is set, the previous value is
   * captured into `old_display_name`, and the row is marked approved + stamped.
   * Reject: the row is marked rejected with the reason + stamped, and the live
   * display name is not touched.
   *
   * ⚠️ THE APPROVE-TIME UNIQUENESS RACE IS REAL AND IS HANDLED HERE. The
   * request-time "is this name taken" check is ADVISORY ONLY: two players can
   * hold pending requests for the same name, and whoever is approved second
   * hits player_profiles_display_name_uq. That is reported as `name_taken` →
   * HTTP 409, and the transaction rolls back, so the row stays `pending` and the
   * operator can retry it or reject it. Letting this surface as a 500 was the
   * failure mode to avoid.
   *
   * ⚠️ `expectedName` BINDS THE DECISION TO THE NAME THE OPERATOR SAW (review
   * R1, owner ruling option A). The pending row is resolved by player id, so
   * without this a request → cancel → re-request cycle swaps the name under a
   * notification the operator already holds and gets an unreviewed name applied.
   * When supplied and it does not match, NOTHING is applied and the outcome is
   * `name_mismatch` carrying the name that actually is pending. It stays
   * OPTIONAL — omitting it is the pre-existing behavior, because the operator's
   * tooling deploys separately from this server.
   *
   * Inbox sends fire AFTER commit, fire-and-forget, contractually never throwing
   * — exactly PlayerProfileRepository.afterCitizenshipEarned.
   */
  async decideNameChange(
    yandexPlayerId: string,
    decision: "approve" | "reject",
    reason?: string,
    expectedName?: string,
  ): Promise<DecideOutcome> {
    const client = await this.pool.connect();
    let approvedName: string | null = null;
    let rejectedName: string | null = null;
    try {
      await client.query("BEGIN");
      const pending = await client.query(SELECT_PENDING_FOR_UPDATE_SQL, [
        yandexPlayerId,
      ]);
      if (pending.rows.length === 0) {
        await client.query("ROLLBACK");
        return { status: "no_pending" };
      }
      const rowId = Number(pending.rows[0].id);
      const newName = String(pending.rows[0].new_display_name);

      // Trimmed before comparing so a copy-pasted command with stray whitespace
      // still matches; the stored name is already trimmed at request time. The
      // comparison is case-SENSITIVE on purpose — "Ivan" and "ivan" are
      // different names here, and this check exists to be exact.
      //
      // Checked for REJECTIONS too, not just approvals: a rejection cannot
      // apply a name, but an operator rejecting a request they never read sends
      // the player a reason that answers a different name.
      if (expectedName !== undefined && expectedName.trim() !== newName) {
        await client.query("ROLLBACK");
        return { status: "name_mismatch", pendingName: newName };
      }

      if (decision === "approve") {
        const outcome = await this.approveInTransaction(
          client,
          yandexPlayerId,
          rowId,
          newName,
        );
        if (outcome !== null) {
          return outcome;
        }
        approvedName = newName;
      } else {
        await client.query(MARK_REJECTED_SQL, [rowId, reason ?? null]);
        rejectedName = newName;
      }
      await client.query("COMMIT");
    } catch (error) {
      await this.rollbackQuietly(client);
      throw error;
    } finally {
      client.release();
    }

    if (approvedName !== null) {
      this.afterNameChangeDecided(yandexPlayerId, "name_change_approved", {
        name: approvedName,
      });
    } else if (rejectedName !== null) {
      this.afterNameChangeDecided(yandexPlayerId, "name_change_rejected", {
        name: rejectedName,
        // The schema refuses a reject without a non-empty reason, so this
        // fallback is unreachable via the route; it exists so a direct
        // repository caller can never produce a param the inbox boundary
        // rejects as missing (an empty string counts as missing there).
        reason: reason ?? "—",
      });
    }
    return { status: "ok" };
  }

  /**
   * The approve half of the decision transaction. Returns null on success, or a
   * terminal outcome when the uniqueness race fired (transaction already rolled
   * back in that case).
   */
  private async approveInTransaction(
    client: PoolClient,
    yandexPlayerId: string,
    rowId: number,
    newName: string,
  ): Promise<DecideOutcome | null> {
    const profile = await client.query(LOCK_PROFILE_SQL, [yandexPlayerId]);
    const previousName =
      profile.rows.length > 0
        ? ((profile.rows[0].display_name as string | null) ?? null)
        : null;
    try {
      await client.query(APPLY_NAME_SQL, [yandexPlayerId, newName]);
    } catch (error) {
      if (isUniqueViolationOn(error, DISPLAY_NAME_UNIQUE)) {
        // Someone else was approved onto this name first. Roll back so the
        // request stays PENDING and remains actionable.
        await this.rollbackQuietly(client);
        log.warn(
          `name change approve rejected: "${newName}" already taken (player ${yandexPlayerId}, request ${rowId})`,
        );
        return { status: "name_taken" };
      }
      throw error;
    }
    await client.query(MARK_APPROVED_SQL, [rowId, previousName]);
    return null;
  }

  private async rollbackQuietly(client: PoolClient): Promise<void> {
    try {
      await client.query("ROLLBACK");
    } catch {
      // ROLLBACK failed (connection gone) — surface the ORIGINAL condition
      // instead, same as creditMatchXp.
    }
  }

  /**
   * The player's most recent request, for the public profile projection, or null
   * when they have never requested one. Deliberately does NOT return
   * `rejection_reason` — see NameChangeContract: `GET /v1/profile` is
   * unauthenticated and enumerable, and the reason reaches the player through
   * the citizen-gated inbox message instead.
   */
  async getLatestState(
    yandexPlayerId: string,
  ): Promise<NameChangeState | null> {
    const res = await this.pool.query(LATEST_SQL, [yandexPlayerId]);
    if (res.rows.length === 0) {
      return null;
    }
    const row = res.rows[0];
    return {
      status: row.moderation_status as NameChangeState["status"],
      requested_name: String(row.new_display_name),
      decided_at: toIsoOrNull(row.decided_at as Date | null),
    };
  }

  private async isCitizen(yandexPlayerId: string): Promise<boolean> {
    const res = await this.pool.query(CITIZEN_SQL, [yandexPlayerId]);
    return res.rows.length > 0 && Boolean(res.rows[0].is_citizen);
  }

  /**
   * Post-decision inbox hook. Best-effort and contractually never-throwing: a
   * sync throw is caught here, an async rejection is logged, and the decision
   * outcome is returned unchanged either way — the decision is already
   * committed and must never be misreported as a wire error.
   */
  private afterNameChangeDecided(
    yandexPlayerId: string,
    templateKey: "name_change_approved" | "name_change_rejected",
    params: Record<string, string>,
  ): void {
    if (this.inbox === undefined) {
      return;
    }
    try {
      void this.inbox
        .sendTemplate(yandexPlayerId, templateKey, params)
        .catch((error: unknown) => logInboxSendFailure(templateKey, error));
    } catch (error) {
      logInboxSendFailure(templateKey, error);
    }
  }

  /**
   * True when this player may be notified now, recording the send. At most one
   * notification per player per OPERATOR_NOTIFY_COOLDOWN_MS, so a request →
   * cancel → request loop cannot flood the channel (review R1).
   *
   * Deliberately keyed on the player ALONE, not on (player, name): exempting a
   * changed name would hand the flood straight back to anyone willing to vary
   * the string. Suppression is safe because the operator's decision is bound to
   * `expectedName` — a swapped name gets 409 `name_mismatch`, never a silent
   * apply.
   */
  private claimNotifySlot(yandexPlayerId: string): boolean {
    const now = Date.now();
    const last = this.lastNotifiedAt.get(yandexPlayerId);
    if (last !== undefined && now - last < OPERATOR_NOTIFY_COOLDOWN_MS) {
      return false;
    }
    if (this.lastNotifiedAt.size >= NOTIFY_TRACKING_SWEEP_AT) {
      for (const [id, at] of this.lastNotifiedAt) {
        if (now - at >= OPERATOR_NOTIFY_COOLDOWN_MS) {
          this.lastNotifiedAt.delete(id);
        }
      }
    }
    this.lastNotifiedAt.set(yandexPlayerId, now);
    return true;
  }

  /**
   * The ready-to-paste approve command, so deciding against `expectedName` is
   * the DEFAULT path rather than extra typing. `$PROFILE_API_URL` and
   * `$PROFILE_INTERNAL_TOKEN` are left as shell variables — no secret is ever
   * put in a Telegram message.
   *
   * The command is omitted entirely for a player id outside a conservative
   * charset. Ids are client-asserted (ADR-103), and a crafted one containing a
   * quote would break the shell quoting of a command an operator pastes into
   * their own terminal. The notification still names the player, so nothing is
   * lost but the convenience.
   */
  private decideCommandLines(
    yandexPlayerId: string,
    requestedName: string,
  ): string[] {
    if (!/^[A-Za-z0-9_-]+$/.test(yandexPlayerId)) {
      return [];
    }
    const body = JSON.stringify({
      yandexPlayerId,
      decision: "approve",
      expectedName: requestedName,
    });
    return [
      "<b>Approve:</b>",
      `<pre>curl -sS -X POST "$PROFILE_API_URL/internal/v1/name-change/decide" -H "Authorization: Bearer $PROFILE_INTERNAL_TOKEN" -H "Content-Type: application/json" -d '${escapeTelegramHtml(body)}'</pre>`,
    ];
  }

  /**
   * Operator Telegram notification for a NEW pending request (brief step 7).
   * Same never-throw discipline as the inbox hook: the request is already
   * written, and a blocked/unreachable Telegram must never fail it. The bot
   * token is never logged — sendTelegramMessage returns a bare result value.
   */
  private notifyOperator(yandexPlayerId: string, requestedName: string): void {
    const config = this.telegram;
    if (config === undefined) {
      return;
    }
    if (!this.claimNotifySlot(yandexPlayerId)) {
      return;
    }
    const text = [
      "<b>[Name change] Pending request</b>",
      `<b>Player:</b> ${escapeTelegramHtml(yandexPlayerId)}`,
      `<b>Requested:</b> ${escapeTelegramHtml(requestedName)}`,
      `<b>Time:</b> ${new Date().toISOString()}`,
      ...this.decideCommandLines(yandexPlayerId, requestedName),
    ].join("\n");
    try {
      void sendTelegramMessage(config, text)
        .then((result) => {
          if (result !== "sent") {
            log.warn(`operator telegram notification not sent: ${result}`);
          }
        })
        .catch((error: unknown) => {
          // sendTelegramMessage never rejects by contract; belt and braces.
          log.warn(
            `operator telegram notification failed: ${formatError(error)}`,
          );
        });
    } catch (error) {
      log.warn(`operator telegram notification failed: ${formatError(error)}`);
    }
  }
}
