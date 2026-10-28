import {
  FEEDBACK_YANDEX_ID_PATTERN,
  FeedbackPlayerReference,
} from "../core/FeedbackPlayerReference";

export interface FeedbackPlayerIdentitySource {
  isYandexAuthorized(): Promise<boolean>;
  getYandexUniqueId(): Promise<string | null>;
}

// Never rejects: a failure to read the id must not stop the feedback being sent.
export async function resolveFeedbackPlayerReference(
  source: FeedbackPlayerIdentitySource,
): Promise<FeedbackPlayerReference> {
  try {
    if (!(await source.isYandexAuthorized())) {
      return { kind: "guest" };
    }
    const yandexId = await source.getYandexUniqueId();
    // The SDK player object is untyped, and RegExp.test would coerce a non-string into a match.
    if (
      typeof yandexId !== "string" ||
      !FEEDBACK_YANDEX_ID_PATTERN.test(yandexId)
    ) {
      return { kind: "unavailable" };
    }
    return { kind: "yandex", yandexId };
  } catch {
    return { kind: "unavailable" };
  }
}
