import { z } from "zod";

/**
 * Shared service-to-service WIRE contracts for the profile server's internal
 * write endpoints (`POST /internal/v1/credit` and `POST /internal/v1/profile/upsert`)
 * — distinct from the `PlayerProfile` row contract (src/core/profile/PlayerProfile.ts).
 * These are deliberately camelCase because they are RPC payloads, not the snake_case
 * Postgres row, and there is no field-mapping layer for the profile elsewhere.
 *
 * Defined here (not in the profile server) so T6's game-server `ProfileApiClient`
 * serializes the exact same schemas the profile server validates — no drift.
 * Both writes are server-authoritative: `xpAwarded` / identity originate on the
 * game server, never from a player. `xpAwarded` is bounded so a buggy caller can't
 * overflow the `integer` ledger column (`xp_awarded`).
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

/**
 * Create-or-relink a profile by Yandex identity. The game server calls this on a
 * player's first authenticated join (before any crediting) so a `player_profiles`
 * row exists for the credit FK. `persistentId` is the internal cross-device key
 * linked to the Yandex id. Bounds mirror `CreditItemSchema` so the same caller
 * serializes a consistent shape.
 */
export const ProfileUpsertRequestSchema = z.object({
  yandexPlayerId: z.string().min(1).max(128),
  persistentId: z.string().min(1).max(128),
});
export type ProfileUpsertRequest = z.infer<typeof ProfileUpsertRequestSchema>;
