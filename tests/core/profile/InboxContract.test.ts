import {
  INBOX_TEMPLATE_KEYS,
  INBOX_TEMPLATE_REQUIRED_PARAMS,
  InboxListResponseSchema,
  InboxMessageSchema,
  InboxTemplateKeySchema,
  MarkReadRequestSchema,
  SendMessageRequestSchema,
  isKnownInboxTemplateKey,
  missingInboxTemplateParams,
} from "../../../src/core/profile/InboxContract";

function templateMessage(overrides: Record<string, unknown> = {}) {
  return {
    id: 7,
    templateKey: "citizenship_earned",
    templateParams: {},
    title: null,
    body: null,
    sentAt: "2026-08-26T10:00:00.000Z",
    readAt: null,
    ...overrides,
  };
}

describe("InboxContract", () => {
  describe("template keys", () => {
    test("registers exactly the four V1 keys", () => {
      expect([...INBOX_TEMPLATE_KEYS]).toEqual([
        "citizenship_earned",
        "citizenship_paid",
        "name_change_approved",
        "name_change_rejected",
      ]);
      for (const key of INBOX_TEMPLATE_KEYS) {
        expect(InboxTemplateKeySchema.safeParse(key).success).toBe(true);
      }
    });

    test("rejects an unknown key", () => {
      expect(
        InboxTemplateKeySchema.safeParse("tournament_invite").success,
      ).toBe(false);
    });
  });

  describe("InboxMessageSchema", () => {
    test("accepts a template message and a literal message", () => {
      expect(InboxMessageSchema.safeParse(templateMessage()).success).toBe(
        true,
      );
      expect(
        InboxMessageSchema.safeParse(
          templateMessage({
            templateKey: null,
            title: "Hello",
            body: "Welcome",
            readAt: "2026-08-26T11:00:00.000Z",
          }),
        ).success,
      ).toBe(true);
    });

    test("accepts a template key this bundle does not know (lenient wire — review R3)", () => {
      // The server may deploy a new key ahead of the client; the LIST must
      // still parse, and the client skips that one message instead.
      expect(
        InboxMessageSchema.safeParse(
          templateMessage({ templateKey: "tournament_invite" }),
        ).success,
      ).toBe(true);
      expect(isKnownInboxTemplateKey("tournament_invite")).toBe(false);
      expect(isKnownInboxTemplateKey("citizenship_paid")).toBe(true);
      expect(isKnownInboxTemplateKey(null)).toBe(false);
    });

    test("rejects a non-positive id, an empty key, and a non-ISO timestamp", () => {
      expect(
        InboxMessageSchema.safeParse(templateMessage({ id: 0 })).success,
      ).toBe(false);
      expect(
        InboxMessageSchema.safeParse(templateMessage({ templateKey: "" }))
          .success,
      ).toBe(false);
      expect(
        InboxMessageSchema.safeParse(templateMessage({ sentAt: "yesterday" }))
          .success,
      ).toBe(false);
    });

    test("list response is an array of messages", () => {
      expect(
        InboxListResponseSchema.safeParse({ messages: [templateMessage()] })
          .success,
      ).toBe(true);
      expect(InboxListResponseSchema.safeParse({ messages: "x" }).success).toBe(
        false,
      );
    });
  });

  describe("MarkReadRequestSchema", () => {
    test("accepts mark-all (no ids) and a bounded id list", () => {
      expect(
        MarkReadRequestSchema.safeParse({ yandexPlayerId: "y1" }).success,
      ).toBe(true);
      expect(
        MarkReadRequestSchema.safeParse({ yandexPlayerId: "y1", ids: [1, 2] })
          .success,
      ).toBe(true);
    });

    test("rejects an empty id list, non-positive ids, >500 ids, and a missing player id", () => {
      expect(
        MarkReadRequestSchema.safeParse({ yandexPlayerId: "y1", ids: [] })
          .success,
      ).toBe(false);
      expect(
        MarkReadRequestSchema.safeParse({ yandexPlayerId: "y1", ids: [0] })
          .success,
      ).toBe(false);
      expect(
        MarkReadRequestSchema.safeParse({
          yandexPlayerId: "y1",
          ids: Array.from({ length: 501 }, (_, i) => i + 1),
        }).success,
      ).toBe(false);
      expect(MarkReadRequestSchema.safeParse({ ids: [1] }).success).toBe(false);
    });
  });

  describe("SendMessageRequestSchema (mirrors chk_message_content)", () => {
    test("accepts a template send (with and without params)", () => {
      expect(
        SendMessageRequestSchema.safeParse({
          yandexPlayerId: "y1",
          templateKey: "name_change_rejected",
          templateParams: { name: "Alpha", reason: "too short" },
        }).success,
      ).toBe(true);
      expect(
        SendMessageRequestSchema.safeParse({
          yandexPlayerId: "y1",
          templateKey: "citizenship_paid",
        }).success,
      ).toBe(true);
    });

    test("accepts a literal send with both title and body", () => {
      expect(
        SendMessageRequestSchema.safeParse({
          yandexPlayerId: "y1",
          title: "Hello",
          body: "Welcome aboard.",
        }).success,
      ).toBe(true);
    });

    test("rejects neither-content, title-only, and body-only", () => {
      expect(
        SendMessageRequestSchema.safeParse({ yandexPlayerId: "y1" }).success,
      ).toBe(false);
      expect(
        SendMessageRequestSchema.safeParse({ yandexPlayerId: "y1", title: "T" })
          .success,
      ).toBe(false);
      expect(
        SendMessageRequestSchema.safeParse({ yandexPlayerId: "y1", body: "B" })
          .success,
      ).toBe(false);
    });

    test("rejects an unknown template key and oversized literal fields", () => {
      expect(
        SendMessageRequestSchema.safeParse({
          yandexPlayerId: "y1",
          templateKey: "unknown",
        }).success,
      ).toBe(false);
      expect(
        SendMessageRequestSchema.safeParse({
          yandexPlayerId: "y1",
          title: "x".repeat(201),
          body: "ok",
        }).success,
      ).toBe(false);
      expect(
        SendMessageRequestSchema.safeParse({
          yandexPlayerId: "y1",
          title: "ok",
          body: "x".repeat(4_001),
        }).success,
      ).toBe(false);
    });

    test("rejects non-string / oversized template params", () => {
      expect(
        SendMessageRequestSchema.safeParse({
          yandexPlayerId: "y1",
          templateKey: "name_change_approved",
          templateParams: { name: 42 },
        }).success,
      ).toBe(false);
      expect(
        SendMessageRequestSchema.safeParse({
          yandexPlayerId: "y1",
          templateKey: "name_change_approved",
          templateParams: { name: "x".repeat(1_001) },
        }).success,
      ).toBe(false);
    });

    test("XOR (review R2): a template send must not also carry literal text or vice versa", () => {
      expect(
        SendMessageRequestSchema.safeParse({
          yandexPlayerId: "y1",
          templateKey: "citizenship_paid",
          title: "Welcome",
          body: "…",
        }).success,
      ).toBe(false);
      expect(
        SendMessageRequestSchema.safeParse({
          yandexPlayerId: "y1",
          templateKey: "citizenship_paid",
          title: "Welcome",
        }).success,
      ).toBe(false);
      // Literal sends carry no template params either.
      expect(
        SendMessageRequestSchema.safeParse({
          yandexPlayerId: "y1",
          title: "Hello",
          body: "Welcome.",
          templateParams: { name: "x" },
        }).success,
      ).toBe(false);
    });

    test("required params (review R4): a template send must supply every param its text uses", () => {
      expect(INBOX_TEMPLATE_REQUIRED_PARAMS.name_change_rejected).toEqual([
        "name",
        "reason",
      ]);
      expect(missingInboxTemplateParams("name_change_rejected", {})).toEqual([
        "name",
        "reason",
      ]);
      expect(
        missingInboxTemplateParams("name_change_rejected", {
          name: "Alpha",
          reason: "",
        }),
      ).toEqual(["reason"]);
      expect(
        missingInboxTemplateParams("citizenship_earned", undefined),
      ).toEqual([]);

      expect(
        SendMessageRequestSchema.safeParse({
          yandexPlayerId: "y1",
          templateKey: "name_change_rejected",
        }).success,
      ).toBe(false);
      expect(
        SendMessageRequestSchema.safeParse({
          yandexPlayerId: "y1",
          templateKey: "name_change_approved",
          templateParams: { name: "" },
        }).success,
      ).toBe(false);
      expect(
        SendMessageRequestSchema.safeParse({
          yandexPlayerId: "y1",
          templateKey: "name_change_approved",
          templateParams: { name: "Alpha" },
        }).success,
      ).toBe(true);
    });

    test("every registered key has a required-params entry", () => {
      for (const key of INBOX_TEMPLATE_KEYS) {
        expect(Array.isArray(INBOX_TEMPLATE_REQUIRED_PARAMS[key])).toBe(true);
      }
    });
  });
});
