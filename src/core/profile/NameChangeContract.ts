import { z } from "zod";

/**
 * Shared client↔profile-server WIRE contracts for citizen name changes (task
 * 0067): `POST /v1/profile/name-change-request` and
 * `POST /v1/profile/name-change-cancel` (player-facing) plus
 * `POST /internal/v1/name-change/decide` (service-authenticated). Sibling of
 * InboxContract.ts / PaymentsContract.ts — defined here so the client posts and
 * parses exactly the shapes the profile server validates.
 *
 * Trust model (ADR-103, re-affirmed by the owner at this task's plan gate,
 * amendment 2): the player routes accept the CLIENT-asserted yandexPlayerId, the
 * same trust level `/v1/profile`, the inbox and the credit path accept today. The
 * citizen gate is enforced server-side in SQL on every call.
 *
 * ⚠️ ACCEPTED RESIDUAL, deliberately NOT solved here: a griefer who knows a
 * citizen's (non-secret) player id can submit an offensive name IN THAT
 * CITIZEN'S NAME. It is mitigated only by the human moderation gate — an
 * operator sees every name before it can apply. It closes when signed-payload
 * player verification lands, which is blocked on the Yandex IAP secret (task
 * 0014). The sibling vector — permanently blocking a citizen by parking a
 * pending request they cannot clear — IS closed, by the self-service cancel
 * endpoint below.
 *
 * See ai-agents/tasks/backlog/0067-name-change-citizens-only/brief.md.
 */

const PlayerIdSchema = z.string().min(1).max(128);

/**
 * The requested name is bounded generously here (not at MAX_USERNAME_LENGTH) on
 * purpose: an over-long name must reach the rule check and come back as a
 * specific `invalid` outcome the card can explain, not as an opaque 400.
 */
export const NameChangeRequestSchema = z.object({
  yandexPlayerId: PlayerIdSchema,
  requestedName: z.string().min(1).max(128),
});
export type NameChangeRequest = z.infer<typeof NameChangeRequestSchema>;

/** Self-service cancel of the caller's OWN pending request (owner amendment 2). */
export const NameChangeCancelRequestSchema = z.object({
  yandexPlayerId: PlayerIdSchema,
});
export type NameChangeCancelRequest = z.infer<
  typeof NameChangeCancelRequestSchema
>;

/** Operator-authored rejection reason. Bounded to fit the inbox `{reason}` param. */
export const MAX_REJECTION_REASON_LENGTH = 500;

/**
 * The operator's decision. A rejection MUST carry a non-empty reason: the brief
 * requires "rejected with a reason", and the `name_change_rejected` inbox
 * template lists `reason` as required — `missingInboxTemplateParams` counts an
 * empty string as missing, so a blank reason would be refused at the send
 * boundary AFTER the row was already marked rejected. Refusing it here keeps
 * that inconsistency impossible.
 */
export const NameChangeDecisionRequestSchema = z
  .object({
    yandexPlayerId: PlayerIdSchema,
    decision: z.enum(["approve", "reject"]),
    reason: z.string().max(MAX_REJECTION_REASON_LENGTH).optional(),
    /**
     * The name the operator BELIEVES they are deciding on — the binding that
     * makes this endpoint safe to act on from a Telegram message (review R1,
     * owner-ruled option A, 2026-08-28).
     *
     * Without it the decision is bound only to the player id, and the pending
     * row is whatever is pending AT DECIDE TIME. A request → cancel →
     * re-request cycle therefore swaps the name under a notification the
     * operator already holds, and the name that gets applied is one nobody
     * reviewed — a bypass of the human moderation gate, which is the only
     * mitigation the forged-id residual has. When present and it does not match
     * the pending row, nothing is applied and the endpoint returns 409
     * `name_mismatch`.
     *
     * OPTIONAL on the wire on purpose: the operator's tooling and this server
     * deploy separately, the same lesson `PublicPlayerProfileSchema` records.
     * The notification's ready-to-paste command always includes it, so the
     * bound path is the default one rather than extra work.
     */
    expectedName: z.string().max(128).optional(),
  })
  .refine(
    (value) =>
      value.decision !== "reject" || (value.reason ?? "").trim().length > 0,
    { message: "a rejection requires a non-empty reason" },
  );
export type NameChangeDecisionRequest = z.infer<
  typeof NameChangeDecisionRequestSchema
>;

export const NAME_CHANGE_STATUSES = [
  "pending",
  "approved",
  "rejected",
] as const;
export const NameChangeStatusSchema = z.enum(NAME_CHANGE_STATUSES);
export type NameChangeStatus = z.infer<typeof NameChangeStatusSchema>;

/**
 * The player's most recent name-change request, as carried on the PUBLIC profile
 * projection.
 *
 * `GET /v1/profile` is unauthenticated and enumerable by a non-secret player id,
 * so this deliberately OMITS `rejection_reason`: operator-authored reason text
 * reaches the player through the citizen-gated inbox message, which already has
 * a `{reason}` param for exactly that. The brief only requires the card to show
 * a rejected STATE and allow a retry.
 *
 * ⚠️ ACCEPTED RESIDUAL, UNMITIGATED (owner-ruled 2026-08-28, review R1 round 1):
 * `requested_name` IS carried here, and it is the string as submitted — readable
 * by anyone who knows the player id, BEFORE any operator sees it. The moderation
 * gate does NOT cover this: an operator reviews a name before it is APPLIED, not
 * before it is PUBLISHED. Kept because the player must be able to see what they
 * requested; it closes with signed-payload player verification (task 0014), the
 * same root as the forged-id residual above. Do not describe it as mitigated.
 */
export const NameChangeStateSchema = z.object({
  status: NameChangeStatusSchema,
  requested_name: z.string(),
  decided_at: z.iso.datetime().nullable(),
});
export type NameChangeState = z.infer<typeof NameChangeStateSchema>;

/**
 * Why a request was refused. `invalid` carries the broken rule so the client can
 * show the SAME message the in-game username input shows for that rule.
 */
export const NameChangeRequestResponseSchema = z.object({
  status: z.enum(["ok", "invalid", "name_taken", "pending_exists"]),
  violation: z
    .enum(["not_string", "too_short", "too_long", "invalid_chars"])
    .optional(),
});
export type NameChangeRequestResponse = z.infer<
  typeof NameChangeRequestResponseSchema
>;

export const NameChangeCancelResponseSchema = z.object({
  status: z.enum(["ok", "no_pending"]),
});
export type NameChangeCancelResponse = z.infer<
  typeof NameChangeCancelResponseSchema
>;

export const NameChangeDecisionResponseSchema = z.object({
  status: z.enum(["ok", "no_pending", "name_taken", "name_mismatch"]),
});
export type NameChangeDecisionResponse = z.infer<
  typeof NameChangeDecisionResponseSchema
>;
