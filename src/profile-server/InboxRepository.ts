// Data layer for the personal inbox (task 0012). Same rules as
// PlayerProfileRepository: the ONLY component that touches `player_messages`,
// snake_case column names end-to-end, shared pg Pool.
//
// The citizen gate lives HERE (server-side, on every read/write — brief note),
// never in client state: a non-citizen or a missing profile gets `not_citizen`
// whatever the client claims.

import { Pool } from "pg";
import type {
  InboxMessage,
  InboxTemplateKey,
  InboxTemplateParams,
} from "../core/profile/InboxContract";
import { formatError, logger } from "./Logger";

const log = logger.child({ comp: "inbox" });

/**
 * What the post-commit citizenship seams need: fire a template message at a
 * player. Implemented by InboxRepository; the seams hold the interface so they
 * stay testable with a stub.
 */
export interface InboxSender {
  sendTemplate(
    yandexPlayerId: string,
    templateKey: InboxTemplateKey,
    params?: InboxTemplateParams,
  ): Promise<void>;
}

/** A send is EITHER a template OR literal title+body (chk_message_content). */
export interface SendMessageInput {
  yandexPlayerId: string;
  templateKey?: InboxTemplateKey;
  templateParams?: InboxTemplateParams;
  title?: string;
  body?: string;
}

export type SendOutcome =
  | { status: "sent"; id: number }
  | { status: "no_profile" };

export type ListOutcome =
  | { status: "not_citizen" }
  | { status: "ok"; messages: InboxMessage[] };

export type MarkReadOutcome =
  | { status: "not_citizen" }
  | { status: "ok"; updated: number };

// Postgres `foreign_key_violation` — a send for a yandex_player_id with no
// player_profiles row. Reported as `no_profile`, not thrown (same pattern as
// creditMatchXp).
const PG_FOREIGN_KEY_VIOLATION = "23503";

// V1 has no pagination (brief). This cap only guards a runaway account — a
// citizen receives a handful of system messages, never hundreds.
const LIST_LIMIT = 500;

const INSERT_SQL = `
INSERT INTO player_messages
  (yandex_player_id, template_key, template_params, title, body)
VALUES ($1, $2, $3::jsonb, $4, $5)
RETURNING id
`;

const CITIZEN_SQL = `
SELECT is_citizen FROM player_profiles WHERE yandex_player_id = $1
`;

const LIST_SQL = `
SELECT id, template_key, template_params, title, body, sent_at, read_at
FROM player_messages
WHERE yandex_player_id = $1
ORDER BY sent_at DESC, id DESC
LIMIT ${LIST_LIMIT}
`;

// Scoped to the caller's OWN yandex_player_id so one player can never mark
// another's messages; `read_at IS NULL` keeps it idempotent (a re-run touches
// nothing and never rewrites the first read timestamp).
const MARK_ALL_READ_SQL = `
UPDATE player_messages
SET read_at = now()
WHERE yandex_player_id = $1 AND read_at IS NULL
`;

const MARK_IDS_READ_SQL = `
UPDATE player_messages
SET read_at = now()
WHERE yandex_player_id = $1 AND read_at IS NULL AND id = ANY($2::bigint[])
`;

function isPgError(error: unknown, code: string): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: string }).code === code
  );
}

function toIsoOrNull(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

/**
 * jsonb → the wire's string→string map. Drops any non-string value defensively
 * (only the validated send boundary writes this column, but a hand-edited row
 * must not break a client parse of the whole list).
 */
function toTemplateParams(value: unknown): Record<string, string> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {};
  }
  const params: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === "string") {
      params[key] = entry;
    }
  }
  return params;
}

/** Map a raw `player_messages` row to the shared wire contract. */
export function rowToMessage(row: Record<string, unknown>): InboxMessage {
  return {
    id: Number(row.id),
    templateKey: (row.template_key as string | null) ?? null,
    templateParams: toTemplateParams(row.template_params),
    title: (row.title as string | null) ?? null,
    body: (row.body as string | null) ?? null,
    sentAt: (row.sent_at as Date).toISOString(),
    readAt: toIsoOrNull(row.read_at as Date | null),
  };
}

export class InboxRepository implements InboxSender {
  constructor(private readonly pool: Pool) {}

  /**
   * Insert one message. A player with no profile row is reported
   * (`no_profile`), not thrown. The route / seams supply either a template or
   * literal content; the DB CHECK is the last line of defence.
   */
  async sendMessage(input: SendMessageInput): Promise<SendOutcome> {
    try {
      const res = await this.pool.query(INSERT_SQL, [
        input.yandexPlayerId,
        input.templateKey ?? null,
        JSON.stringify(input.templateParams ?? {}),
        input.title ?? null,
        input.body ?? null,
      ]);
      return { status: "sent", id: Number(res.rows[0].id) };
    } catch (error) {
      if (isPgError(error, PG_FOREIGN_KEY_VIOLATION)) {
        return { status: "no_profile" };
      }
      throw error;
    }
  }

  /**
   * The seams' entry point (InboxSender). Resolves on `sent`; a `no_profile`
   * outcome is logged and swallowed (a grant that just committed always has a
   * profile row, so this is a diagnostic, never an error the caller acts on).
   * DB failures still reject — the seams contain that (they never throw).
   */
  async sendTemplate(
    yandexPlayerId: string,
    templateKey: InboxTemplateKey,
    params: InboxTemplateParams = {},
  ): Promise<void> {
    const outcome = await this.sendMessage({
      yandexPlayerId,
      templateKey,
      templateParams: params,
    });
    if (outcome.status === "no_profile") {
      log.warn(
        `inbox send "${templateKey}" skipped: no profile for yandex_player_id=${yandexPlayerId}`,
      );
    }
  }

  /**
   * A citizen's messages, newest first. Non-citizens AND missing profiles get
   * `not_citizen` — the server-side gate the brief requires on every call.
   */
  async listMessages(yandexPlayerId: string): Promise<ListOutcome> {
    if (!(await this.isCitizen(yandexPlayerId))) {
      return { status: "not_citizen" };
    }
    const res = await this.pool.query(LIST_SQL, [yandexPlayerId]);
    return { status: "ok", messages: res.rows.map(rowToMessage) };
  }

  /**
   * Mark all (ids omitted) or specific messages read — only the caller's own,
   * only those still unread. Idempotent. Same citizen gate as the read.
   */
  async markRead(
    yandexPlayerId: string,
    ids?: readonly number[],
  ): Promise<MarkReadOutcome> {
    if (!(await this.isCitizen(yandexPlayerId))) {
      return { status: "not_citizen" };
    }
    const res =
      ids === undefined
        ? await this.pool.query(MARK_ALL_READ_SQL, [yandexPlayerId])
        : await this.pool.query(MARK_IDS_READ_SQL, [yandexPlayerId, ids]);
    return { status: "ok", updated: res.rowCount ?? 0 };
  }

  private async isCitizen(yandexPlayerId: string): Promise<boolean> {
    const res = await this.pool.query(CITIZEN_SQL, [yandexPlayerId]);
    return res.rows.length > 0 && Boolean(res.rows[0].is_citizen);
  }
}

/** Log helper shared by the post-commit seams (never throws). */
export function logInboxSendFailure(templateKey: string, error: unknown): void {
  log.warn(`inbox send "${templateKey}" failed: ${formatError(error)}`);
}
