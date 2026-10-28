import { z } from "zod";

// Task 0509: the real Yandex id charset is not recorded yet, so this admits any
// printable ASCII and caps at the 128 every profile record enforces. No space
// or control characters, so a client cannot add lines to the Telegram message.
export const FEEDBACK_YANDEX_ID_PATTERN = /^[\x21-\x7E]{1,128}$/;

// Shared by client and server so a real client never sends a value the route rejects.
export const FeedbackPlayerReferenceSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("yandex"),
    yandexId: z.string().regex(FEEDBACK_YANDEX_ID_PATTERN),
  }),
  z.object({ kind: z.literal("guest") }),
  z.object({ kind: z.literal("unavailable") }),
]);

export type FeedbackPlayerReference = z.infer<
  typeof FeedbackPlayerReferenceSchema
>;
