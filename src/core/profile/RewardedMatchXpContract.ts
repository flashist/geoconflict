import { z } from "zod";

// Wire contract for POST /v1/profile/rewarded-match-xp (task 0491). Why no watch
// proof is checked: the 0488 plan, section "XP crediting trust".

/** Same bound as `CreditItemSchema.gameId`, so every credited game id fits. */
export const RewardedMatchXpRequestSchema = z.object({
  gameId: z.string().min(1).max(128),
});
export type RewardedMatchXpRequest = z.infer<
  typeof RewardedMatchXpRequestSchema
>;

export const REWARDED_MATCH_XP_STATUSES = [
  "granted",
  "duplicate",
  "not_credited",
] as const;
export type RewardedMatchXpStatus = (typeof REWARDED_MATCH_XP_STATUSES)[number];

/** `not_credited` is retryable: the base credit can land a moment after the popup. */
export const RewardedMatchXpResponseSchema = z.object({
  status: z.enum(REWARDED_MATCH_XP_STATUSES),
  xpAwarded: z.number().int().min(0),
  xp: z.number().int().min(0),
});
export type RewardedMatchXpResponse = z.infer<
  typeof RewardedMatchXpResponseSchema
>;
