import { z } from "zod";
import { InternalPlayerIdSchema } from "./InboxContract";
import { PlatformSchema } from "./Platform";

/**
 * Shared service-to-service WIRE contracts for the profile server's internal
 * game-server endpoints (`POST /internal/v1/credit` and
 * `POST /internal/v1/players/resolve`) — distinct from the `PlayerProfile` row
 * contract (src/core/profile/PlayerProfile.ts). These are deliberately camelCase
 * because they are RPC payloads, not the snake_case Postgres row.
 *
 * Defined here (not in the profile server) so the game server's `ProfileApiClient`
 * serializes the exact same schemas the profile server validates — no drift.
 * Both calls are server-authoritative: `xpAwarded` / identity originate on the
 * game server, never from a player. `xpAwarded` is bounded so a buggy caller can't
 * overflow the `integer` ledger column (`xp_awarded`).
 *
 * Task 0272 (S3, ADR-113): credits are keyed by the INTERNAL player id the game
 * server got back from `/players/resolve`, not by a platform id. A player id in
 * these internal payloads is allowed (ADR-113 point 3); it never reaches a client.
 *
 * See ai-agents/tasks/done/0185-profile-05-backend-db-api/brief.md (T5).
 */

/** One match-end credit: award `xpAwarded` to `playerId` for `gameId`. */
export const CreditItemSchema = z.object({
  gameId: z.string().min(1).max(128),
  playerId: InternalPlayerIdSchema,
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
 *  - duplicate  — `(gameId, playerId)` was already credited (idempotent no-op).
 *  - no_profile — no `players` row exists for `playerId` (erased). The wire value
 *                 keeps its old name; the repository already returns it.
 *  - error      — an unexpected failure crediting this item (others still processed).
 */
export const CreditResultSchema = z.object({
  gameId: z.string(),
  playerId: z.string(),
  status: z.enum(["credited", "duplicate", "no_profile", "error"]),
});
export type CreditResult = z.infer<typeof CreditResultSchema>;

/** Always-200 batch response: one result per input item, order-aligned. */
export const CreditBatchResponseSchema = z.object({
  results: z.array(CreditResultSchema),
});
export type CreditBatchResponse = z.infer<typeof CreditBatchResponseSchema>;

/**
 * Find-or-create the player behind a platform identity (task 0272). The game server
 * calls this when it first learns a creditable identity — at join, on a late
 * `update_identity`, and on a reconnect — and credits by the returned `playerId`.
 * Always creates (source `game_server`), independent of any login-creation switch.
 * The id bound mirrors the credit item's so the same caller serializes a
 * consistent shape.
 */
export const PlayerResolveRequestSchema = z.object({
  platform: PlatformSchema,
  platformUserId: z.string().min(1).max(128),
});
export type PlayerResolveRequest = z.infer<typeof PlayerResolveRequestSchema>;

/** The resolved internal id plus the display-only citizen flag (task 0068). */
export const PlayerResolveResponseSchema = z.object({
  playerId: InternalPlayerIdSchema,
  isCitizen: z.boolean(),
});
export type PlayerResolveResponse = z.infer<typeof PlayerResolveResponseSchema>;
