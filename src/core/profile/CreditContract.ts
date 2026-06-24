import { z } from "zod";

/**
 * Shared service-to-service credit contract for match-end XP crediting.
 *
 * This is the WIRE contract for `POST /internal/v1/credit` — distinct from the
 * `PlayerProfile` row contract (src/core/profile/PlayerProfile.ts). It is
 * deliberately camelCase because it is an RPC payload, not the snake_case
 * Postgres row, and there is no field-mapping layer for the profile elsewhere.
 *
 * Defined here (not in the profile server) so T6's game-server `ProfileApiClient`
 * serializes the exact same schema the profile server validates — no drift.
 * Crediting is server-authoritative: `xpAwarded` originates on the game server,
 * never from a player. `xpAwarded` is bounded so a buggy caller can't overflow
 * the `integer` ledger column (`xp_awarded`).
 *
 * See ai-agents/tasks/backlog/s4-profile-05-backend-db-api.md (T5).
 */

/** One match-end credit: award `xpAwarded` to `yandexPlayerId` for `gameId`. */
export const CreditItemSchema = z.object({
  gameId: z.string().min(1).max(128),
  yandexPlayerId: z.string().min(1).max(128),
  xpAwarded: z.number().int().positive().max(10_000),
});
export type CreditItem = z.infer<typeof CreditItemSchema>;

/** A batch of credits posted in a single internal request. */
export const CreditBatchRequestSchema = z.object({
  credits: z.array(CreditItemSchema).min(1).max(500),
});
export type CreditBatchRequest = z.infer<typeof CreditBatchRequestSchema>;

/**
 * Per-item outcome:
 *  - credited   — the credit was newly applied and XP incremented.
 *  - duplicate  — `(gameId, yandexPlayerId)` was already credited (idempotent no-op).
 *  - no_profile — no `player_profiles` row exists for `yandexPlayerId` yet.
 *  - error      — an unexpected failure crediting this item (others still processed).
 */
export const CreditResultSchema = z.object({
  gameId: z.string(),
  yandexPlayerId: z.string(),
  status: z.enum(["credited", "duplicate", "no_profile", "error"]),
});
export type CreditResult = z.infer<typeof CreditResultSchema>;

/** Always-200 batch response: one result per input item, order-aligned. */
export const CreditBatchResponseSchema = z.object({
  results: z.array(CreditResultSchema),
});
export type CreditBatchResponse = z.infer<typeof CreditBatchResponseSchema>;
