import { z } from "zod";

/**
 * Shared client↔profile-server WIRE contracts for the personal inbox (task 0012):
 * `GET /v1/messages`, `PATCH /v1/messages/read` (player-facing) and
 * `POST /internal/v1/messages/send` (service-authenticated). Defined here — the
 * inbox sibling of CreditContract.ts / PaymentsContract.ts — so the client's
 * `Inbox.ts` parses the exact same shapes the profile server validates.
 *
 * Content model: a message is EITHER a template (`templateKey` + `templateParams`,
 * rendered client-side via `inbox.templates.<key>.{title,body}` in the player's
 * language) OR literal `title`/`body` (manual / admin sends). Mirrors the
 * `chk_message_content` CHECK in migrations/003_player_messages.sql.
 *
 * Trust model (ADR-103, owner-ruled 2026-08-26 at the 0012 plan gate): the
 * player routes accept the CLIENT-asserted yandexPlayerId — the same trust level
 * `/v1/profile` and the credit path accept today. The citizen gate is enforced
 * server-side on every call; signature verification slots into the server's
 * single `resolvePlayerId` funnel once the Yandex secret exists (blocked on 0014).
 *
 * See ai-agents/tasks/backlog/0012-personal-inbox/brief.md.
 */

/** Template keys the client can render. Extend here (one place) + en/ru json. */
export const INBOX_TEMPLATE_KEYS = [
  "citizenship_earned",
  "citizenship_paid",
  "name_change_approved",
  "name_change_rejected",
] as const;
export const InboxTemplateKeySchema = z.enum(INBOX_TEMPLATE_KEYS);
export type InboxTemplateKey = z.infer<typeof InboxTemplateKeySchema>;

export function isKnownInboxTemplateKey(
  key: string | null,
): key is InboxTemplateKey {
  return (
    key !== null && (INBOX_TEMPLATE_KEYS as readonly string[]).includes(key)
  );
}

/**
 * The `{param}` names each template's en/ru text substitutes (review R4). A
 * template send missing one is rejected at the boundary: IntlMessageFormat
 * throws on an absent variable and `translateText` then falls back to the RAW
 * source, so the player would see the ICU escapes. Keep in step with
 * `inbox.templates.<key>.body` in resources/lang/*.json.
 */
export const INBOX_TEMPLATE_REQUIRED_PARAMS: Record<
  InboxTemplateKey,
  readonly string[]
> = {
  citizenship_earned: [],
  citizenship_paid: [],
  name_change_approved: ["name"],
  name_change_rejected: ["name", "reason"],
};

/** Required params of `key` that `params` does not supply (empty string counts as missing). */
export function missingInboxTemplateParams(
  key: InboxTemplateKey,
  params: Record<string, string> | undefined,
): string[] {
  return INBOX_TEMPLATE_REQUIRED_PARAMS[key].filter(
    (name) => (params?.[name] ?? "").length === 0,
  );
}

/** `{name}` / `{reason}`-style substitutions — bounded so a send can't balloon a row. */
export const InboxTemplateParamsSchema = z.record(
  z.string().min(1).max(64),
  z.string().max(1_000),
);
export type InboxTemplateParams = z.infer<typeof InboxTemplateParamsSchema>;

const PlayerIdSchema = z.string().min(1).max(128);

/**
 * One message as returned by GET /v1/messages. `templateKey` is deliberately a
 * plain string on the wire (review R3): the profile server and the client
 * bundle deploy separately, so a key this bundle does not know must degrade to
 * that ONE message being skipped (`isKnownInboxTemplateKey`), never to the
 * whole list failing to parse and the Personal tab vanishing.
 */
export const InboxMessageSchema = z.object({
  id: z.number().int().positive(),
  templateKey: z.string().min(1).max(64).nullable(),
  templateParams: z.record(z.string(), z.string()),
  title: z.string().nullable(),
  body: z.string().nullable(),
  sentAt: z.string().datetime(),
  readAt: z.string().datetime().nullable(),
});
export type InboxMessage = z.infer<typeof InboxMessageSchema>;

/** Newest first. V1 has no pagination — the whole (server-capped) list. */
export const InboxListResponseSchema = z.object({
  messages: z.array(InboxMessageSchema),
});
export type InboxListResponse = z.infer<typeof InboxListResponseSchema>;

/** PATCH /v1/messages/read — absent `ids` means "mark ALL of mine read". */
export const MarkReadRequestSchema = z.object({
  yandexPlayerId: PlayerIdSchema,
  ids: z.array(z.number().int().positive()).min(1).max(500).optional(),
});
export type MarkReadRequest = z.infer<typeof MarkReadRequestSchema>;

export const MarkReadResponseSchema = z.object({
  updated: z.number().int().nonnegative(),
});
export type MarkReadResponse = z.infer<typeof MarkReadResponseSchema>;

/**
 * POST /internal/v1/messages/send — a template send XOR a literal send (review
 * R2): a template carries `templateKey` (+ `templateParams`) and NO title/body;
 * a literal carries BOTH title and body and no template fields. The refines
 * mirror `chk_message_content` so a bad body is a clean 400, never a DB CHECK
 * violation surfacing as a 500; a template send must also supply every param
 * its text substitutes (review R4, `INBOX_TEMPLATE_REQUIRED_PARAMS`).
 */
export const SendMessageRequestSchema = z
  .object({
    yandexPlayerId: PlayerIdSchema,
    templateKey: InboxTemplateKeySchema.optional(),
    templateParams: InboxTemplateParamsSchema.optional(),
    title: z.string().min(1).max(200).optional(),
    body: z.string().min(1).max(4_000).optional(),
  })
  .refine(
    (value) =>
      value.templateKey !== undefined
        ? value.title === undefined && value.body === undefined
        : value.title !== undefined &&
          value.body !== undefined &&
          value.templateParams === undefined,
    {
      message:
        "exactly one of: templateKey (+templateParams), or title and body",
    },
  )
  .refine(
    (value) =>
      value.templateKey === undefined ||
      missingInboxTemplateParams(value.templateKey, value.templateParams)
        .length === 0,
    { message: "templateParams is missing a required param" },
  );
export type SendMessageRequest = z.infer<typeof SendMessageRequestSchema>;

export const SendMessageResponseSchema = z.object({
  id: z.number().int().positive(),
});
export type SendMessageResponse = z.infer<typeof SendMessageResponseSchema>;
