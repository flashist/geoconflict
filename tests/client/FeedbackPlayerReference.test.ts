// Task 0509 — the shared id pattern and the client resolver. Ids are synthetic.
import { resolveFeedbackPlayerReference } from "../../src/client/FeedbackPlayerReference";
import {
  FEEDBACK_YANDEX_ID_PATTERN,
  FeedbackPlayerReferenceSchema,
} from "../../src/core/FeedbackPlayerReference";

const VALID_ID = "test-yandex-id-AbC+/=";

function source(authorized: boolean, id: string | null) {
  return {
    isYandexAuthorized: async () => authorized,
    getYandexUniqueId: async () => id,
  };
}

describe("FEEDBACK_YANDEX_ID_PATTERN", () => {
  it.each([
    ["1 character", "a"],
    ["128 characters", "b".repeat(128)],
    ["base64 symbols", VALID_ID],
    ["a UUID form", "00000000-0000-4000-8000-000000000000"],
  ])("accepts %s", (_label, id) => {
    expect(FEEDBACK_YANDEX_ID_PATTERN.test(id)).toBe(true);
    expect(
      FeedbackPlayerReferenceSchema.safeParse({ kind: "yandex", yandexId: id })
        .success,
    ).toBe(true);
  });

  it.each([
    ["an empty string", ""],
    ["129 characters", "a".repeat(129)],
    ["a newline", "abc\ndef"],
    ["a space", "abc def"],
    ["a tab", "abc\tdef"],
    ["a non-ASCII letter", "abcж"],
  ])("rejects %s", (_label, id) => {
    expect(FEEDBACK_YANDEX_ID_PATTERN.test(id)).toBe(false);
    expect(
      FeedbackPlayerReferenceSchema.safeParse({ kind: "yandex", yandexId: id })
        .success,
    ).toBe(false);
  });

  it("accepts the guest and unavailable kinds, and rejects an unknown kind", () => {
    expect(
      FeedbackPlayerReferenceSchema.safeParse({ kind: "guest" }).success,
    ).toBe(true);
    expect(
      FeedbackPlayerReferenceSchema.safeParse({ kind: "unavailable" }).success,
    ).toBe(true);
    expect(
      FeedbackPlayerReferenceSchema.safeParse({ kind: "internal", id: "x" })
        .success,
    ).toBe(false);
  });
});

describe("resolveFeedbackPlayerReference", () => {
  it("is a guest when not authorized", async () => {
    await expect(
      resolveFeedbackPlayerReference(source(false, VALID_ID)),
    ).resolves.toEqual({ kind: "guest" });
  });

  it("is unavailable when authorized but the id is null", async () => {
    await expect(
      resolveFeedbackPlayerReference(source(true, null)),
    ).resolves.toEqual({ kind: "unavailable" });
  });

  it.each([
    ["200 characters", "a".repeat(200)],
    ["a newline", "abc\ndef"],
  ])(
    "is unavailable when the id has %s, so the route never 400s",
    async (_label, id) => {
      await expect(
        resolveFeedbackPlayerReference(source(true, id)),
      ).resolves.toEqual({ kind: "unavailable" });
    },
  );

  it.each([
    ["undefined", undefined],
    ["a number", 12345],
  ])(
    "is unavailable when the untyped SDK yields %s instead of a string",
    async (_label, id) => {
      await expect(
        resolveFeedbackPlayerReference(source(true, id as unknown as string)),
      ).resolves.toEqual({ kind: "unavailable" });
    },
  );

  it("carries a valid id", async () => {
    await expect(
      resolveFeedbackPlayerReference(source(true, VALID_ID)),
    ).resolves.toEqual({ kind: "yandex", yandexId: VALID_ID });
  });

  it("is unavailable, and does not reject, when the source rejects", async () => {
    const failing = {
      isYandexAuthorized: async () => true,
      getYandexUniqueId: async (): Promise<string | null> => {
        throw new Error("sdk failure");
      },
    };
    await expect(resolveFeedbackPlayerReference(failing)).resolves.toEqual({
      kind: "unavailable",
    });
    const failingAuth = {
      isYandexAuthorized: async (): Promise<boolean> => {
        throw new Error("sdk failure");
      },
      getYandexUniqueId: async () => VALID_ID,
    };
    await expect(resolveFeedbackPlayerReference(failingAuth)).resolves.toEqual({
      kind: "unavailable",
    });
  });
});
