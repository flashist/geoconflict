// Every log line the routes write (task 0309), so the suite can pin the
// signature-construction line exactly and prove no secret-bearing value reaches
// the container log. Copied from TenureGrantRoutes.test.ts; the existing cases in
// this file assert nothing about logs, so capturing lines changes none of them.
const logLines: string[] = [];
// The raw arguments of every call. logLines alone cannot see a winston meta
// object — String() records it as "[object Object]" — while the real logger
// (winston.format.json()) prints its fields, so the leak guard also checks
// every call is exactly one string.
const logCalls: unknown[][] = [];
jest.mock("../../src/profile-server/Logger", () => {
  const record =
    () =>
    (...args: unknown[]): void => {
      logCalls.push(args);
      logLines.push(args.map((arg) => String(arg)).join(" "));
    };
  const child = () => ({
    info: record(),
    warn: record(),
    error: record(),
    child,
  });
  return {
    logger: { child },
    formatError: (error: unknown) => String(error),
  };
});

import { createHmac, randomUUID } from "crypto";
import request from "supertest";
import type {
  PaidPurchaseGrant,
  ProcessedPurchase,
  PurchaseIntent,
} from "../../src/profile-server/PaymentsRepository";
import {
  classifyHeld,
  createApp,
  intentRefusal,
  mayConsume,
  type PaymentsRepo,
  type ProfileRepo,
} from "../../src/profile-server/Routes";
import {
  noopProfileMetrics,
  type ProfileMetrics,
} from "../../src/profile-server/Telemetry";
import { TEST_SESSION_CONFIG, bearerFor } from "./support/sessionToken";

const SECRET = "payments-test-secret";
const INTENT_ID = randomUUID();
// Task 0270: "yandex-1" is a known identity resolving to this internal id.
const PLAYER_ID = "0b6f8a52-3c1e-4d7a-9f10-2a4b6c8d0e1f";

function mockProfileRepo(): ProfileRepo {
  return {
    ping: jest.fn().mockResolvedValue(undefined),
    getProfile: jest.fn().mockResolvedValue(null),
    creditMatchXp: jest.fn(),
    findPlayerByIdentity: jest
      .fn()
      .mockImplementation(async (_platform: string, id: string) =>
        id === "yandex-1" ? PLAYER_ID : null,
      ),
    resolveExistingPlayer: jest.fn().mockResolvedValue(null),
    resolveOrCreatePlayer: jest.fn(),
    hasXpGrant: jest.fn().mockResolvedValue(false),
  };
}

function mockPaymentsRepo(overrides: Partial<PaymentsRepo> = {}): PaymentsRepo {
  return {
    createIntent: jest.fn().mockResolvedValue(INTENT_ID),
    findIntent: jest.fn().mockResolvedValue(null),
    getProcessedPurchase: jest.fn().mockResolvedValue(null),
    grantPaidPurchase: jest
      .fn()
      .mockResolvedValue({ status: "granted", becamePaidCitizen: true }),
    listEntitlements: jest.fn().mockResolvedValue([]),
    recordHolderSighting: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function appWith(
  paymentsRepo: PaymentsRepo,
  secret: string = SECRET,
  profileRepo: ProfileRepo = mockProfileRepo(),
) {
  return createApp(
    profileRepo,
    { paymentsRepo, yandexPaymentsSecret: secret },
    undefined,
    undefined,
    TEST_SESSION_CONFIG,
  );
}

// Since task 0273 (S4) /intent accepts NOTHING but a Bearer token.
const CALLER = bearerFor(PLAYER_ID);

/** Real signed payloads (the routes use the real verifier). */
function sign(payload: unknown): string {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64");
  const signature = createHmac("sha256", SECRET)
    .update(encoded)
    .digest("base64");
  return `${signature}.${encoded}`;
}

/** Alternate construction (task 0309): HMAC over the DECODED json text. */
function signOverDecodedJson(payload: unknown): string {
  const json = JSON.stringify(payload);
  const encoded = Buffer.from(json).toString("base64");
  const signature = createHmac("sha256", SECRET).update(json).digest("base64");
  return `${signature}.${encoded}`;
}

function purchasePayload(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    productID: "citizenship",
    purchaseToken: "tok-1",
    developerPayload: INTENT_ID,
    ...overrides,
  };
}

function openIntent(overrides: Partial<PurchaseIntent> = {}): PurchaseIntent {
  return {
    id: INTENT_ID,
    playerId: PLAYER_ID,
    productId: "citizenship",
    usedAt: null,
    ...overrides,
  };
}

/** A /reconcile answer with nothing in any list (task 0506 adds three of them). */
const NOTHING_RECONCILED = {
  processedTokens: [],
  grantedTokens: [],
  consumeTokens: [],
  heldElsewhere: [],
};

const processedReceipt: ProcessedPurchase = {
  purchaseToken: "tok-1",
  playerId: PLAYER_ID,
  productId: "citizenship",
};

describe("payments routes", () => {
  describe("fail-closed and wiring", () => {
    it.each([
      ["/v1/payments/yandex/intent"],
      ["/v1/payments/yandex/complete"],
      ["/v1/payments/yandex/reconcile"],
    ])("%s is 503 when no payments config is wired", async (path) => {
      const res = await request(createApp(mockProfileRepo())).post(path);
      expect(res.status).toBe(503);
      expect(res.body).toEqual({ error: "payments_unavailable" });
    });

    it.each([
      ["/v1/payments/yandex/intent"],
      ["/v1/payments/yandex/complete"],
      ["/v1/payments/yandex/reconcile"],
    ])("%s is 503 when the secret is empty", async (path) => {
      const res = await request(appWith(mockPaymentsRepo(), "")).post(path);
      expect(res.status).toBe(503);
    });

    it("payments routes carry CORS headers and answer OPTIONS preflight", async () => {
      const app = appWith(mockPaymentsRepo());
      const preflight = await request(app)
        .options("/v1/payments/yandex/intent")
        .set("Origin", "https://geoconflict.ru");
      expect(preflight.status).toBe(204);
      expect(preflight.headers["access-control-allow-origin"]).toBe("*");
      expect(preflight.headers["access-control-allow-methods"]).toBe("POST");
      expect(preflight.headers["access-control-allow-headers"]).toBe(
        "Content-Type, Authorization",
      );

      const post = await request(app)
        .post("/v1/payments/yandex/intent")
        .set("Origin", "https://geoconflict.ru")
        .set("Authorization", CALLER)
        .send({ productId: "citizenship" });
      expect(post.headers["access-control-allow-origin"]).toBe("*");
    });

    it("internal routes still carry NO CORS header", async () => {
      process.env.PROFILE_INTERNAL_TOKEN = "t";
      const res = await request(appWith(mockPaymentsRepo()))
        .post("/internal/v1/credit")
        .set("Origin", "https://geoconflict.ru")
        .send({});
      expect(res.headers["access-control-allow-origin"]).toBeUndefined();
      delete process.env.PROFILE_INTERNAL_TOKEN;
    });
  });

  describe("POST /v1/payments/yandex/intent", () => {
    it("creates an intent and returns its id", async () => {
      const repo = mockPaymentsRepo();
      const res = await request(appWith(repo))
        .post("/v1/payments/yandex/intent")
        .set("Authorization", CALLER)
        .send({ productId: "citizenship" });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ intentId: INTENT_ID });
      expect(repo.createIntent).toHaveBeenCalledWith(PLAYER_ID, "citizenship");
    });

    // Task 0273 (S4), owner ruling D1: the legacy client-asserted id is GONE. It
    // used to resolve a caller here (404 for an unknown one); now it is ignored.
    it("is 401 for a legacy yandexPlayerId body and creates nothing", async () => {
      const repo = mockPaymentsRepo();
      const profileRepo = mockProfileRepo();
      const res = await request(appWith(repo, SECRET, profileRepo))
        .post("/v1/payments/yandex/intent")
        .send({ yandexPlayerId: "yandex-1", productId: "citizenship" });
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ error: "session_invalid" });
      expect(repo.createIntent).not.toHaveBeenCalled();
      expect(profileRepo.findPlayerByIdentity).not.toHaveBeenCalled();
      expect(profileRepo.resolveOrCreatePlayer).not.toHaveBeenCalled();
    });

    // Task 0271 residual, unchanged by S4: a valid token whose player row is gone
    // hits the foreign key and is a clean 404, not a 500.
    it("is 404 not_found when the token's player no longer exists", async () => {
      const repo = mockPaymentsRepo({
        createIntent: jest.fn().mockRejectedValue(
          Object.assign(new Error("violates foreign key constraint"), {
            code: "23503",
          }),
        ),
      });
      const res = await request(appWith(repo))
        .post("/v1/payments/yandex/intent")
        .set("Authorization", CALLER)
        .send({ productId: "citizenship" });
      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: "not_found" });
    });

    it("is 400 for an unknown product or bad body", async () => {
      const app = appWith(mockPaymentsRepo());
      const bad = await request(app)
        .post("/v1/payments/yandex/intent")
        .set("Authorization", CALLER)
        .send({ productId: "nuke" });
      expect(bad.status).toBe(400);
      const empty = await request(app).post("/v1/payments/yandex/intent");
      expect(empty.status).toBe(400);
    });

    it("is 500 when the repository fails", async () => {
      const repo = mockPaymentsRepo({
        createIntent: jest.fn().mockRejectedValue(new Error("db down")),
      });
      const res = await request(appWith(repo))
        .post("/v1/payments/yandex/intent")
        .set("Authorization", CALLER)
        .send({ productId: "citizenship" });
      expect(res.status).toBe(500);
    });

    // Task 0496 (spec §5.3): only an owned durable item, for a VERIFIED caller,
    // is refused. No item id is sellable yet, so the rule is pinned on the kind.
    it.each([
      ["durable_item", true, true, "already_owned"],
      ["durable_item", true, false, null],
      ["durable_item", false, true, null],
      ["durable_item", false, false, null],
      ["citizenship", true, true, null],
      ["citizenship", true, false, null],
      ["citizenship", false, true, null],
      ["citizenship", false, false, null],
    ] as const)(
      "intentRefusal(%s, owned=%s, verified=%s) → %s",
      (kind, isOwned, verified, expected) => {
        expect(intentRefusal(kind, isOwned, verified)).toBe(expected);
      },
    );

    it.each([false, true])(
      "citizenship never reads ownership (verified=%s) → 200",
      async (verified) => {
        const repo = mockPaymentsRepo();
        const res = await request(appWith(repo))
          .post("/v1/payments/yandex/intent")
          .set("Authorization", bearerFor(PLAYER_ID, { verified }))
          .send({ productId: "citizenship" });
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ intentId: INTENT_ID });
        expect(repo.listEntitlements).not.toHaveBeenCalled();
      },
    );
  });

  describe("POST /v1/payments/yandex/complete", () => {
    it("grants a fresh verified purchase and returns the token", async () => {
      const repo = mockPaymentsRepo({
        findIntent: jest.fn().mockResolvedValue(openIntent()),
      });
      const res = await request(appWith(repo))
        .post("/v1/payments/yandex/complete")
        .send({ signature: sign(purchasePayload()) });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        success: true,
        purchaseToken: "tok-1",
        becamePaidCitizen: true,
        consume: false,
      });
      expect(repo.grantPaidPurchase).toHaveBeenCalledWith(
        expect.objectContaining<Partial<PaidPurchaseGrant>>({
          purchaseToken: "tok-1",
          productId: "citizenship",
          playerId: PLAYER_ID,
          intentId: INTENT_ID,
        }),
      );
    });

    // Task 0492: false = the buyer was already a paid citizen before this grant.
    it("passes becamePaidCitizen: false through from the grant", async () => {
      const repo = mockPaymentsRepo({
        findIntent: jest.fn().mockResolvedValue(openIntent()),
        grantPaidPurchase: jest
          .fn()
          .mockResolvedValue({ status: "granted", becamePaidCitizen: false }),
      });
      const res = await request(appWith(repo))
        .post("/v1/payments/yandex/complete")
        .send({ signature: sign(purchasePayload()) });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        success: true,
        purchaseToken: "tok-1",
        becamePaidCitizen: false,
        consume: false,
      });
    });

    // A parallel /reconcile landed the token first: success, but the server
    // cannot know whether that grant made the buyer paid, so the field is absent.
    it("grant returning already_processed ⇒ success WITHOUT becamePaidCitizen", async () => {
      const repo = mockPaymentsRepo({
        findIntent: jest.fn().mockResolvedValue(openIntent()),
        grantPaidPurchase: jest
          .fn()
          .mockResolvedValue({ status: "already_processed" }),
      });
      const res = await request(appWith(repo))
        .post("/v1/payments/yandex/complete")
        .send({ signature: sign(purchasePayload()) });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        success: true,
        purchaseToken: "tok-1",
        consume: false,
      });
    });

    it("is 400 for an invalid signature and never touches the repo", async () => {
      const repo = mockPaymentsRepo();
      const res = await request(appWith(repo))
        .post("/v1/payments/yandex/complete")
        .send({ signature: "garbage.notbase64json" });
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "invalid_signature" });
      expect(repo.getProcessedPurchase).not.toHaveBeenCalled();
      expect(repo.grantPaidPurchase).not.toHaveBeenCalled();
    });

    it("is 400 for a missing/oversized body", async () => {
      const app = appWith(mockPaymentsRepo());
      expect(
        (await request(app).post("/v1/payments/yandex/complete")).status,
      ).toBe(400);
    });

    it("replayed token ⇒ idempotent success WITHOUT re-granting (before intent checks)", async () => {
      const repo = mockPaymentsRepo({
        getProcessedPurchase: jest.fn().mockResolvedValue(processedReceipt),
        // Intent already used — must NOT matter: idempotency check runs first.
        findIntent: jest
          .fn()
          .mockResolvedValue(openIntent({ usedAt: "2026-08-14T00:00:00Z" })),
      });
      const res = await request(appWith(repo))
        .post("/v1/payments/yandex/complete")
        .send({ signature: sign(purchasePayload()) });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        success: true,
        purchaseToken: "tok-1",
        consume: false,
      });
      expect(repo.grantPaidPurchase).not.toHaveBeenCalled();
      expect(repo.findIntent).not.toHaveBeenCalled();
    });

    it("used intent + NEW token ⇒ 409 intent_used", async () => {
      const repo = mockPaymentsRepo({
        findIntent: jest
          .fn()
          .mockResolvedValue(openIntent({ usedAt: "2026-08-14T00:00:00Z" })),
      });
      const res = await request(appWith(repo))
        .post("/v1/payments/yandex/complete")
        .send({ signature: sign(purchasePayload({ purchaseToken: "tok-2" })) });
      expect(res.status).toBe(409);
      expect(res.body).toEqual({ error: "intent_used" });
      expect(repo.grantPaidPurchase).not.toHaveBeenCalled();
    });

    it("product mismatch ⇒ 409", async () => {
      const repo = mockPaymentsRepo({
        findIntent: jest
          .fn()
          .mockResolvedValue(openIntent({ productId: "other_product" })),
      });
      const res = await request(appWith(repo))
        .post("/v1/payments/yandex/complete")
        .send({ signature: sign(purchasePayload()) });
      expect(res.status).toBe(409);
      expect(res.body).toEqual({ error: "product_mismatch" });
    });

    it("unknown intent ⇒ 409 (including a non-uuid developerPayload)", async () => {
      const repo = mockPaymentsRepo();
      const unknown = await request(appWith(repo))
        .post("/v1/payments/yandex/complete")
        .send({ signature: sign(purchasePayload()) });
      expect(unknown.status).toBe(409);
      expect(unknown.body).toEqual({ error: "unknown_intent" });

      const nonUuid = await request(appWith(repo))
        .post("/v1/payments/yandex/complete")
        .send({
          signature: sign(purchasePayload({ developerPayload: "not-a-uuid" })),
        });
      expect(nonUuid.status).toBe(409);
      expect(nonUuid.body).toEqual({ error: "unknown_intent" });
      expect(repo.findIntent).toHaveBeenCalledTimes(1); // non-uuid never hits the DB
    });

    it("a multi-purchase payload is not a valid /complete", async () => {
      const res = await request(appWith(mockPaymentsRepo()))
        .post("/v1/payments/yandex/complete")
        .send({
          signature: sign({ data: [purchasePayload(), purchasePayload()] }),
        });
      expect(res.status).toBe(400);
    });
  });

  describe("POST /v1/payments/yandex/reconcile", () => {
    it("grants unprocessed mapped purchases and echoes already-processed tokens", async () => {
      const repo = mockPaymentsRepo({
        getProcessedPurchase: jest
          .fn()
          .mockImplementation(async (token: string) =>
            token === "tok-done" ? processedReceipt : null,
          ),
        findIntent: jest.fn().mockResolvedValue(
          // Used intent is fine on reconcile — that's its whole point.
          openIntent({ usedAt: "2026-08-14T00:00:00Z" }),
        ),
      });
      const res = await request(appWith(repo))
        .post("/v1/payments/yandex/reconcile")
        .send({
          signature: sign({
            data: [
              purchasePayload({ purchaseToken: "tok-done" }),
              purchasePayload({ purchaseToken: "tok-new" }),
            ],
          }),
        });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        processedTokens: ["tok-done", "tok-new"],
        grantedTokens: ["tok-new"],
        consumeTokens: [],
        heldElsewhere: [],
      });
      expect(repo.grantPaidPurchase).toHaveBeenCalledTimes(1);
      expect(repo.grantPaidPurchase).toHaveBeenCalledWith(
        expect.objectContaining({ purchaseToken: "tok-new" }),
      );
    });

    it("skips unmapped payloads without granting", async () => {
      const repo = mockPaymentsRepo();
      const res = await request(appWith(repo))
        .post("/v1/payments/yandex/reconcile")
        .send({
          signature: sign({
            data: [
              purchasePayload({ developerPayload: "not-a-uuid" }),
              purchasePayload({ purchaseToken: "tok-x" }), // uuid but no intent row
            ],
          }),
        });
      expect(res.status).toBe(200);
      expect(res.body).toEqual(NOTHING_RECONCILED);
      expect(repo.grantPaidPurchase).not.toHaveBeenCalled();
    });

    it("verified empty purchase list ⇒ empty result", async () => {
      const res = await request(appWith(mockPaymentsRepo()))
        .post("/v1/payments/yandex/reconcile")
        .send({ signature: sign({ data: [] }) });
      expect(res.status).toBe(200);
      expect(res.body).toEqual(NOTHING_RECONCILED);
    });

    it("is 400 for an invalid signature", async () => {
      const res = await request(appWith(mockPaymentsRepo()))
        .post("/v1/payments/yandex/reconcile")
        .send({ signature: "bad.payload" });
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "invalid_signature" });
    });

    // Task 0492 (B1, spec §6): one throwing entry no longer strands the rest.
    describe("per-entry isolation", () => {
      const MIDDLE_TOKEN = "synthetic-reconcile-middle-token-0492-bbbb";

      beforeEach(() => {
        logLines.length = 0;
        logCalls.length = 0;
      });

      const failureLines = () =>
        logLines.filter((line) => line.includes("reconcile entry failed"));

      it("a grant that throws for the middle entry still grants the other two", async () => {
        const repo = mockPaymentsRepo({
          findIntent: jest.fn().mockResolvedValue(openIntent()),
          grantPaidPurchase: jest
            .fn()
            .mockImplementation(async (grant: PaidPurchaseGrant) => {
              if (grant.purchaseToken === MIDDLE_TOKEN) {
                throw new Error("grant boom");
              }
              return { status: "granted", becamePaidCitizen: true };
            }),
        });
        const res = await request(appWith(repo))
          .post("/v1/payments/yandex/reconcile")
          .send({
            signature: sign({
              data: [
                purchasePayload({ purchaseToken: "tok-a" }),
                purchasePayload({ purchaseToken: MIDDLE_TOKEN }),
                purchasePayload({ purchaseToken: "tok-c" }),
              ],
            }),
          });
        expect(res.status).toBe(200);
        expect(res.body).toEqual({
          processedTokens: ["tok-a", "tok-c"],
          grantedTokens: ["tok-a", "tok-c"],
          consumeTokens: [],
          heldElsewhere: [],
          failedCount: 1,
        });
        expect(repo.grantPaidPurchase).toHaveBeenCalledTimes(3);
        expect(failureLines()).toHaveLength(1);
        expect(failureLines()[0]).toContain(
          `token=${MIDDLE_TOKEN.slice(0, 8)}…`,
        );
        expect(failureLines()[0]).toContain("grant boom");
        expect(failureLines()[0]).not.toContain(MIDDLE_TOKEN);
      });

      it("a receipt lookup that throws for one entry still processes the others", async () => {
        const repo = mockPaymentsRepo({
          getProcessedPurchase: jest
            .fn()
            .mockImplementation(async (token: string) => {
              if (token === MIDDLE_TOKEN) {
                throw new Error("lookup boom");
              }
              return token === "tok-done" ? processedReceipt : null;
            }),
          findIntent: jest.fn().mockResolvedValue(openIntent()),
        });
        const res = await request(appWith(repo))
          .post("/v1/payments/yandex/reconcile")
          .send({
            signature: sign({
              data: [
                purchasePayload({ purchaseToken: "tok-done" }),
                purchasePayload({ purchaseToken: MIDDLE_TOKEN }),
                purchasePayload({ purchaseToken: "tok-new" }),
              ],
            }),
          });
        expect(res.status).toBe(200);
        expect(res.body).toEqual({
          processedTokens: ["tok-done", "tok-new"],
          grantedTokens: ["tok-new"],
          consumeTokens: [],
          heldElsewhere: [],
          failedCount: 1,
        });
        expect(repo.grantPaidPurchase).toHaveBeenCalledTimes(1);
      });

      // Documented change from 500: the database down for every entry is now a
      // 200 with nothing to consume, and failedCount says why.
      it("every entry failing ⇒ 200 with no tokens and the failure count", async () => {
        const repo = mockPaymentsRepo({
          getProcessedPurchase: jest
            .fn()
            .mockRejectedValue(new Error("db down")),
        });
        const res = await request(appWith(repo))
          .post("/v1/payments/yandex/reconcile")
          .send({
            signature: sign({
              data: [
                purchasePayload({ purchaseToken: "tok-a" }),
                purchasePayload({ purchaseToken: "tok-b" }),
              ],
            }),
          });
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ ...NOTHING_RECONCILED, failedCount: 2 });
        expect(failureLines()).toHaveLength(2);
      });

      it("no failed entry ⇒ failedCount left out", async () => {
        const repo = mockPaymentsRepo({
          findIntent: jest.fn().mockResolvedValue(openIntent()),
        });
        const res = await request(appWith(repo))
          .post("/v1/payments/yandex/reconcile")
          .send({ signature: sign({ data: [purchasePayload()] }) });
        expect(res.status).toBe(200);
        expect(res.body).toEqual({
          processedTokens: ["tok-1"],
          grantedTokens: ["tok-1"],
          consumeTokens: [],
          heldElsewhere: [],
        });
        expect(failureLines()).toEqual([]);
      });
    });
  });

  // Task 0309: both payment routes log WHICH HMAC construction a real purchase
  // matched — the label only, nothing request-derived — so the unused one can be
  // dropped later (0310).
  describe("signature-construction log line", () => {
    // Synthetic and deliberately longer than 8 characters: the reconcile skip
    // line logs token.slice(0, 8), so a short token would appear in full and
    // blind the leak guard below.
    const LONG_TOKEN = "synthetic-purchase-token-0309-not-a-real-token-aaaa";
    const WRONG_KEY = "some-other-synthetic-key";

    const signers: Array<[string, (payload: unknown) => string]> = [
      ["base64_payload", sign],
      ["decoded_json", signOverDecodedJson],
    ];

    const signatureLines = () =>
      logLines.filter((line) => line.includes("signature verified"));

    function signWithKey(payload: unknown, key: string): string {
      const encoded = Buffer.from(JSON.stringify(payload)).toString("base64");
      const signature = createHmac("sha256", key)
        .update(encoded)
        .digest("base64");
      return `${signature}.${encoded}`;
    }

    beforeEach(() => {
      logLines.length = 0;
      logCalls.length = 0;
    });

    it.each(signers)(
      "/complete logs construction=%s exactly once on success",
      async (label, signer) => {
        const repo = mockPaymentsRepo({
          findIntent: jest.fn().mockResolvedValue(openIntent()),
        });
        const res = await request(appWith(repo))
          .post("/v1/payments/yandex/complete")
          .send({
            signature: signer(purchasePayload({ purchaseToken: LONG_TOKEN })),
          });
        expect(res.status).toBe(200);
        expect(signatureLines()).toEqual([
          `yandex purchase signature verified (complete): construction=${label}`,
        ]);
      },
    );

    it.each(signers)(
      "/reconcile logs construction=%s exactly once on success",
      async (label, signer) => {
        const repo = mockPaymentsRepo({
          findIntent: jest.fn().mockResolvedValue(openIntent()),
        });
        const res = await request(appWith(repo))
          .post("/v1/payments/yandex/reconcile")
          .send({
            signature: signer({
              data: [purchasePayload({ purchaseToken: LONG_TOKEN })],
            }),
          });
        expect(res.status).toBe(200);
        expect(res.body).toEqual({
          processedTokens: [LONG_TOKEN],
          grantedTokens: [LONG_TOKEN],
          consumeTokens: [],
          heldElsewhere: [],
        });
        expect(signatureLines()).toEqual([
          `yandex purchase signature verified (reconcile): construction=${label}`,
        ]);
      },
    );

    // Plan design choice 3: the question is about the signature, not the grant,
    // so a verified payload /complete then refuses still records its label.
    it("/complete logs the label even when it then refuses a multi-purchase payload", async () => {
      const res = await request(appWith(mockPaymentsRepo()))
        .post("/v1/payments/yandex/complete")
        .send({
          signature: sign({ data: [purchasePayload(), purchasePayload()] }),
        });
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "invalid_signature" });
      expect(signatureLines()).toEqual([
        "yandex purchase signature verified (complete): construction=base64_payload",
      ]);
    });

    it.each([
      ["/v1/payments/yandex/complete"],
      ["/v1/payments/yandex/reconcile"],
    ])("%s logs no signature line for a bad signature", async (path) => {
      const app = appWith(mockPaymentsRepo());
      const wrongKey = await request(app)
        .post(path)
        .send({
          signature: signWithKey(
            { data: [purchasePayload({ purchaseToken: LONG_TOKEN })] },
            WRONG_KEY,
          ),
        });
      expect(wrongKey.status).toBe(400);
      expect(wrongKey.body).toEqual({ error: "invalid_signature" });
      const garbage = await request(app)
        .post(path)
        .send({ signature: "garbage.notbase64json" });
      expect(garbage.status).toBe(400);
      expect(signatureLines()).toEqual([]);
    });

    it("leak guard: no log line carries the secret, signed string, parts, JSON, token or intent id", async () => {
      const forbidden: string[] = [SECRET, LONG_TOKEN, INTENT_ID];
      for (const [, signer] of signers) {
        const single = purchasePayload({ purchaseToken: LONG_TOKEN });
        const list = { data: [single] };
        for (const [path, payload] of [
          ["/v1/payments/yandex/complete", single],
          ["/v1/payments/yandex/reconcile", list],
        ] as const) {
          const signed = signer(payload);
          const dotIndex = signed.indexOf(".");
          forbidden.push(
            signed,
            signed.slice(0, dotIndex),
            signed.slice(dotIndex + 1),
            JSON.stringify(payload),
          );
          const repo = mockPaymentsRepo({
            findIntent: jest.fn().mockResolvedValue(openIntent()),
          });
          const res = await request(appWith(repo))
            .post(path)
            .send({ signature: signed });
          expect(res.status).toBe(200);
        }
      }
      // Task 0492: a failing reconcile entry logs its error — prefix only.
      const failing = signers[0][1]({
        data: [purchasePayload({ purchaseToken: LONG_TOKEN })],
      });
      const failingRes = await request(
        appWith(
          mockPaymentsRepo({
            findIntent: jest.fn().mockResolvedValue(openIntent()),
            grantPaidPurchase: jest
              .fn()
              .mockRejectedValue(new Error("grant boom")),
          }),
        ),
      )
        .post("/v1/payments/yandex/reconcile")
        .send({ signature: failing });
      expect(failingRes.status).toBe(200);
      expect(failingRes.body).toEqual({
        ...NOTHING_RECONCILED,
        failedCount: 1,
      });
      expect(
        logLines.filter((line) => line.includes("reconcile entry failed")),
      ).toHaveLength(1);
      // Five verified requests ⇒ five label lines; the guard is not vacuous.
      expect(signatureLines()).toHaveLength(5);
      // No meta objects: a secret passed as `log.info("…", { signature })`
      // would reach the real JSON log but not logLines.
      for (const args of logCalls) {
        expect(args).toHaveLength(1);
        expect(typeof args[0]).toBe("string");
      }
      for (const line of logLines) {
        for (const value of forbidden) {
          expect(line).not.toContain(value);
        }
      }
    });
  });

  // Task 0506 (S1 of the 0505 design, ADR-126): the server-owned consume policy,
  // the optional verified caller on /reconcile, held-elsewhere detection and the
  // sightings evidence, and the labels-only shadow measurement.
  describe("stop consuming permanent purchases (task 0506)", () => {
    // Synthetic ids, long enough that a leak would be visible in a log line.
    const OTHER_PLAYER_ID = "7d1e2c3b-4a59-4687-8a9b-0c1d2e3f4a5b";
    const LONG_TOKEN = "synthetic-purchase-token-0506-not-a-real-token-cccc";
    const OTHER_TOKEN = "synthetic-purchase-token-0506-not-a-real-token-dddd";
    const NOW_SECONDS = Math.floor(Date.now() / 1000);

    function capturingMetrics() {
      const metrics = {
        ...noopProfileMetrics,
        sessionRejected: jest.fn(),
        paymentsReconcileEntry: jest.fn(),
        paymentsReconcileCaller: jest.fn(),
        paymentsPayloadIssuedAt: jest.fn(),
        paymentsEntryStatus: jest.fn(),
      };
      return metrics satisfies ProfileMetrics;
    }

    function app0506(
      paymentsRepo: PaymentsRepo,
      options: {
        consumePermanent?: boolean;
        metrics?: ProfileMetrics;
        session?: typeof TEST_SESSION_CONFIG;
      } = {},
    ) {
      return createApp(
        mockProfileRepo(),
        {
          paymentsRepo,
          yandexPaymentsSecret: SECRET,
          consumePermanent: options.consumePermanent,
        },
        undefined,
        undefined,
        options.session ?? TEST_SESSION_CONFIG,
        { metrics: options.metrics ?? noopProfileMetrics },
      );
    }

    /** The docs' envelope: issuedAt in seconds, each entry with `status`. */
    function reconcileSignature(
      tokens: string[],
      issuedAt: number | undefined = NOW_SECONDS,
    ): string {
      return sign({
        ...(issuedAt === undefined ? {} : { issuedAt }),
        data: tokens.map((purchaseToken) =>
          purchasePayload({ purchaseToken, status: "waiting" }),
        ),
      });
    }

    /** Every token is already in the ledger, held by `holder`. */
    function heldRepo(
      holder: string = PLAYER_ID,
      productId: string = "citizenship",
      overrides: Partial<PaymentsRepo> = {},
    ): PaymentsRepo {
      return mockPaymentsRepo({
        getProcessedPurchase: jest
          .fn()
          .mockImplementation(async (purchaseToken: string) => ({
            purchaseToken,
            playerId: holder,
            productId,
          })),
        ...overrides,
      });
    }

    async function reconcile(
      app: ReturnType<typeof app0506>,
      signature: string,
      authorization?: string,
    ) {
      const call = request(app).post("/v1/payments/yandex/reconcile");
      if (authorization !== undefined) {
        call.set("Authorization", authorization);
      }
      return call.send({ signature });
    }

    function expectNoWrites(repo: PaymentsRepo) {
      expect(repo.grantPaidPurchase).not.toHaveBeenCalled();
      expect(repo.createIntent).not.toHaveBeenCalled();
      expect(repo.recordHolderSighting).not.toHaveBeenCalled();
    }

    describe("pure helpers", () => {
      it.each([
        ["citizenship", false, false],
        ["citizenship", true, true],
        ["not_a_product", false, false],
        ["not_a_product", true, false],
        ["constructor", true, false],
        ["__proto__", true, false],
      ] as const)(
        "mayConsume(%s, consumePermanent=%s) → %s",
        (productId, consumePermanent, expected) => {
          expect(mayConsume(productId, consumePermanent)).toBe(expected);
        },
      );

      it.each([
        [null, "held_no_caller"],
        [{ status: "ok", playerId: PLAYER_ID, verified: true }, "held"],
        [{ status: "ok", playerId: PLAYER_ID, verified: false }, "held"],
        [
          { status: "ok", playerId: OTHER_PLAYER_ID, verified: true },
          "held_elsewhere_verified",
        ],
        [
          { status: "ok", playerId: OTHER_PLAYER_ID, verified: false },
          "held_elsewhere_unverified",
        ],
      ] as const)("classifyHeld(holder, %p) → %s", (caller, expected) => {
        expect(classifyHeld(PLAYER_ID, caller)).toBe(expected);
      });
    });

    describe("/reconcile with a held purchase", () => {
      it("same verified caller ⇒ quiet: no heldElsewhere, no sighting", async () => {
        const repo = heldRepo();
        const metrics = capturingMetrics();
        const res = await reconcile(
          app0506(repo, { metrics }),
          reconcileSignature([LONG_TOKEN]),
          bearerFor(PLAYER_ID, { verified: true }),
        );
        expect(res.status).toBe(200);
        expect(res.body).toEqual({
          processedTokens: [LONG_TOKEN],
          grantedTokens: [],
          consumeTokens: [],
          heldElsewhere: [],
        });
        expectNoWrites(repo);
        expect(metrics.paymentsReconcileEntry).toHaveBeenCalledWith("held");
        expect(metrics.paymentsReconcileCaller).toHaveBeenCalledWith(
          "verified",
        );
      });

      it("a different VERIFIED caller ⇒ heldElsewhere + sighting; nothing granted or moved", async () => {
        const repo = heldRepo();
        const metrics = capturingMetrics();
        const res = await reconcile(
          app0506(repo, { metrics }),
          reconcileSignature([LONG_TOKEN]),
          bearerFor(OTHER_PLAYER_ID, { verified: true }),
        );
        expect(res.status).toBe(200);
        expect(res.body).toEqual({
          processedTokens: [LONG_TOKEN],
          grantedTokens: [],
          consumeTokens: [],
          heldElsewhere: ["citizenship"],
        });
        expect(repo.recordHolderSighting).toHaveBeenCalledTimes(1);
        expect(repo.recordHolderSighting).toHaveBeenCalledWith({
          purchaseToken: LONG_TOKEN,
          holderPlayerId: PLAYER_ID,
          seenPlayerId: OTHER_PLAYER_ID,
          payloadIssuedAt: new Date(NOW_SECONDS * 1000),
        });
        expect(repo.grantPaidPurchase).not.toHaveBeenCalled();
        expect(repo.createIntent).not.toHaveBeenCalled();
        expect(repo.findIntent).not.toHaveBeenCalled();
        expect(metrics.paymentsReconcileEntry).toHaveBeenCalledWith(
          "held_elsewhere_verified",
        );
      });

      it("an implausible issuedAt is stored as null, the sighting still written", async () => {
        const repo = heldRepo();
        await reconcile(
          app0506(repo),
          reconcileSignature([LONG_TOKEN], Date.now()), // milliseconds
          bearerFor(OTHER_PLAYER_ID, { verified: true }),
        );
        expect(repo.recordHolderSighting).toHaveBeenCalledWith(
          expect.objectContaining({ payloadIssuedAt: null }),
        );
      });

      it("a different UNVERIFIED caller ⇒ quiet, no sighting, counted only", async () => {
        const repo = heldRepo();
        const metrics = capturingMetrics();
        const res = await reconcile(
          app0506(repo, { metrics }),
          reconcileSignature([LONG_TOKEN]),
          bearerFor(OTHER_PLAYER_ID, { verified: false }),
        );
        expect(res.status).toBe(200);
        expect(res.body.heldElsewhere).toEqual([]);
        expectNoWrites(repo);
        expect(metrics.paymentsReconcileEntry).toHaveBeenCalledWith(
          "held_elsewhere_unverified",
        );
        expect(metrics.paymentsReconcileCaller).toHaveBeenCalledWith(
          "unverified",
        );
      });

      it("two tokens for one product ⇒ heldElsewhere once, a sighting per token", async () => {
        const repo = heldRepo();
        const res = await reconcile(
          app0506(repo),
          reconcileSignature([LONG_TOKEN, OTHER_TOKEN]),
          bearerFor(OTHER_PLAYER_ID, { verified: true }),
        );
        expect(res.body.heldElsewhere).toEqual(["citizenship"]);
        expect(repo.recordHolderSighting).toHaveBeenCalledTimes(2);
      });

      it("a ledger product no longer in the catalogue is never in heldElsewhere nor consumable", async () => {
        const repo = heldRepo(PLAYER_ID, "retired_item");
        const res = await reconcile(
          app0506(repo, { consumePermanent: true }),
          reconcileSignature([LONG_TOKEN]),
          bearerFor(OTHER_PLAYER_ID, { verified: true }),
        );
        expect(res.status).toBe(200);
        expect(res.body).toEqual({
          processedTokens: [LONG_TOKEN],
          grantedTokens: [],
          consumeTokens: [],
          heldElsewhere: [],
        });
        expect(repo.recordHolderSighting).not.toHaveBeenCalled();
      });

      it("a sighting write that throws ⇒ still 200 with the right fields, no failedCount", async () => {
        logLines.length = 0;
        const repo = heldRepo(PLAYER_ID, "citizenship", {
          recordHolderSighting: jest
            .fn()
            .mockRejectedValue(
              Object.assign(new Error(`fk ${OTHER_PLAYER_ID}`), {
                name: "DatabaseError",
              }),
            ),
        });
        const res = await reconcile(
          app0506(repo),
          reconcileSignature([LONG_TOKEN]),
          bearerFor(OTHER_PLAYER_ID, { verified: true }),
        );
        expect(res.status).toBe(200);
        expect(res.body).toEqual({
          processedTokens: [LONG_TOKEN],
          grantedTokens: [],
          consumeTokens: [],
          heldElsewhere: ["citizenship"],
        });
        expect(
          logLines.filter((line) => line.includes("holder sighting failed")),
        ).toEqual(["reconcile holder sighting failed: DatabaseError"]);
      });
    });

    describe("/reconcile caller is optional and never refused", () => {
      const expired = bearerFor(OTHER_PLAYER_ID, {
        verified: true,
        nowMs: Date.now() - 48 * 3_600_000,
      });
      const callers: Array<[string, string | undefined, string]> = [
        ["no header", undefined, "none"],
        ["a non-Bearer header", "Basic abc", "invalid"],
        ["an invalid token", "Bearer not.a.token", "invalid"],
        ["an expired token", expired, "expired"],
        ["a vfy:false token", bearerFor(OTHER_PLAYER_ID), "unverified"],
        [
          "a vfy:true token",
          bearerFor(OTHER_PLAYER_ID, { verified: true }),
          "verified",
        ],
      ];

      it.each(callers)(
        "%s ⇒ 200, processedTokens as before 0506, no session.rejected",
        async (_label, authorization, state) => {
          const repo = mockPaymentsRepo({
            getProcessedPurchase: jest
              .fn()
              .mockImplementation(async (token: string) =>
                token === LONG_TOKEN
                  ? { ...processedReceipt, purchaseToken: LONG_TOKEN }
                  : null,
              ),
            findIntent: jest.fn().mockResolvedValue(openIntent()),
          });
          const metrics = capturingMetrics();
          const res = await reconcile(
            app0506(repo, { metrics }),
            reconcileSignature([LONG_TOKEN, OTHER_TOKEN]),
            authorization,
          );
          expect(res.status).toBe(200);
          // Byte for byte what a client older than 0506 reads.
          expect(res.body.processedTokens).toEqual([LONG_TOKEN, OTHER_TOKEN]);
          expect(res.body.grantedTokens).toEqual([OTHER_TOKEN]);
          expect(metrics.sessionRejected).not.toHaveBeenCalled();
          expect(metrics.paymentsReconcileCaller).toHaveBeenCalledWith(state);
          if (state !== "verified") {
            expect(res.body.heldElsewhere).toEqual([]);
            expect(repo.recordHolderSighting).not.toHaveBeenCalled();
          }
        },
      );

      it("sessions not configured + a header ⇒ 200, counted session_unavailable", async () => {
        const metrics = capturingMetrics();
        const res = await reconcile(
          app0506(heldRepo(), { metrics, session: { secret: "" } }),
          reconcileSignature([LONG_TOKEN]),
          bearerFor(OTHER_PLAYER_ID, { verified: true }),
        );
        expect(res.status).toBe(200);
        expect(res.body.heldElsewhere).toEqual([]);
        expect(metrics.paymentsReconcileCaller).toHaveBeenCalledWith(
          "session_unavailable",
        );
      });
    });

    describe("/reconcile fresh grants", () => {
      it("granted to the profile that started it while ANOTHER verified profile calls ⇒ heldElsewhere now (deviation 3)", async () => {
        const repo = mockPaymentsRepo({
          findIntent: jest.fn().mockResolvedValue(openIntent()),
        });
        const res = await reconcile(
          app0506(repo),
          reconcileSignature([LONG_TOKEN]),
          bearerFor(OTHER_PLAYER_ID, { verified: true }),
        );
        expect(res.status).toBe(200);
        expect(res.body).toEqual({
          processedTokens: [LONG_TOKEN],
          grantedTokens: [LONG_TOKEN],
          consumeTokens: [],
          heldElsewhere: ["citizenship"],
        });
        expect(repo.grantPaidPurchase).toHaveBeenCalledWith(
          expect.objectContaining({ playerId: PLAYER_ID }),
        );
        expect(repo.recordHolderSighting).toHaveBeenCalledWith(
          expect.objectContaining({
            purchaseToken: LONG_TOKEN,
            holderPlayerId: PLAYER_ID,
            seenPlayerId: OTHER_PLAYER_ID,
          }),
        );
      });

      it.each([
        ["the buyer's own verified session", bearerFor(PLAYER_ID, { verified: true })],
        ["another profile's UNVERIFIED session", bearerFor(OTHER_PLAYER_ID)],
        ["no session", undefined],
      ])("granted while %s calls ⇒ no heldElsewhere", async (_label, auth) => {
        const repo = mockPaymentsRepo({
          findIntent: jest.fn().mockResolvedValue(openIntent()),
        });
        const res = await reconcile(
          app0506(repo),
          reconcileSignature([LONG_TOKEN]),
          auth,
        );
        expect(res.body.grantedTokens).toEqual([LONG_TOKEN]);
        expect(res.body.heldElsewhere).toEqual([]);
        expect(repo.recordHolderSighting).not.toHaveBeenCalled();
      });

      it("a parallel request won the grant race ⇒ processedTokens only, not grantedTokens", async () => {
        const metrics = capturingMetrics();
        const repo = mockPaymentsRepo({
          findIntent: jest.fn().mockResolvedValue(openIntent()),
          grantPaidPurchase: jest
            .fn()
            .mockResolvedValue({ status: "already_processed" }),
        });
        const res = await reconcile(
          app0506(repo, { metrics }),
          reconcileSignature([LONG_TOKEN]),
        );
        expect(res.body).toEqual({
          processedTokens: [LONG_TOKEN],
          grantedTokens: [],
          consumeTokens: [],
          heldElsewhere: [],
        });
        expect(metrics.paymentsReconcileEntry).toHaveBeenCalledWith(
          "already_processed_race",
        );
      });
    });

    describe("never revoke on absence (G4)", () => {
      it.each([
        ["an empty list", [] as string[]],
        ["a list without the held token", [OTHER_TOKEN]],
      ])("%s writes nothing for the paid player", async (_label, tokens) => {
        const repo = mockPaymentsRepo(); // OTHER_TOKEN: no ledger row, no intent
        const res = await reconcile(
          app0506(repo),
          reconcileSignature(tokens),
          bearerFor(PLAYER_ID, { verified: true }),
        );
        expect(res.status).toBe(200);
        expect(res.body.processedTokens).toEqual([]);
        expectNoWrites(repo);
      });
    });

    describe("the consume-permanent setting", () => {
      it("ON ⇒ consumeTokens equals processedTokens, held-elsewhere included", async () => {
        const repo = mockPaymentsRepo({
          getProcessedPurchase: jest
            .fn()
            .mockImplementation(async (token: string) =>
              token === LONG_TOKEN
                ? {
                    purchaseToken: LONG_TOKEN,
                    playerId: PLAYER_ID,
                    productId: "citizenship",
                  }
                : null,
            ),
          findIntent: jest.fn().mockResolvedValue(openIntent()),
        });
        const res = await reconcile(
          app0506(repo, { consumePermanent: true }),
          reconcileSignature([LONG_TOKEN, OTHER_TOKEN]),
          bearerFor(OTHER_PLAYER_ID, { verified: true }),
        );
        expect(res.body.processedTokens).toEqual([LONG_TOKEN, OTHER_TOKEN]);
        expect(res.body.consumeTokens).toEqual([LONG_TOKEN, OTHER_TOKEN]);
        expect(res.body.heldElsewhere).toEqual(["citizenship"]);
      });

      it.each([
        ["fresh grant", openIntent(), null],
        ["replay", openIntent(), processedReceipt],
      ])("ON ⇒ /complete says consume:true (%s)", async (_label, intent, receipt) => {
        const repo = mockPaymentsRepo({
          findIntent: jest.fn().mockResolvedValue(intent),
          getProcessedPurchase: jest.fn().mockResolvedValue(receipt),
        });
        const res = await request(app0506(repo, { consumePermanent: true }))
          .post("/v1/payments/yandex/complete")
          .send({ signature: sign(purchasePayload()) });
        expect(res.status).toBe(200);
        expect(res.body.consume).toBe(true);
      });

      it("OFF is the default when the config leaves it out", async () => {
        const repo = mockPaymentsRepo({
          findIntent: jest.fn().mockResolvedValue(openIntent()),
        });
        const res = await request(appWith(repo))
          .post("/v1/payments/yandex/complete")
          .send({ signature: sign(purchasePayload()) });
        expect(res.body.consume).toBe(false);
      });

      it("/complete error answers carry no consume field", async () => {
        const res = await request(app0506(mockPaymentsRepo()))
          .post("/v1/payments/yandex/complete")
          .send({ signature: sign(purchasePayload()) });
        expect(res.status).toBe(409);
        expect(res.body).toEqual({ error: "unknown_intent" });
      });
    });

    describe("shadow measurement, labels only", () => {
      beforeEach(() => {
        logLines.length = 0;
        logCalls.length = 0;
      });

      const shadowLines = () =>
        logLines.filter((line) => line.includes("payload shadow"));

      it("/reconcile: one labels-only line and the counters", async () => {
        const metrics = capturingMetrics();
        await reconcile(
          app0506(heldRepo(), { metrics }),
          reconcileSignature([LONG_TOKEN]),
          bearerFor(OTHER_PLAYER_ID, { verified: true }),
        );
        expect(shadowLines()).toEqual([
          "yandex purchase payload shadow (reconcile): caller=verified issued_at=under_1m statuses=waiting:1 outcomes=held_elsewhere_verified:1",
        ]);
        expect(metrics.paymentsPayloadIssuedAt).toHaveBeenCalledWith(
          "reconcile",
          "under_1m",
        );
        expect(metrics.paymentsEntryStatus).toHaveBeenCalledWith(
          "reconcile",
          "waiting",
        );
      });

      it("/complete: one labels-only line; an envelope-less payload is `absent`", async () => {
        const metrics = capturingMetrics();
        await request(
          app0506(
            mockPaymentsRepo({
              findIntent: jest.fn().mockResolvedValue(openIntent()),
            }),
            { metrics },
          ),
        )
          .post("/v1/payments/yandex/complete")
          .send({ signature: sign(purchasePayload()) });
        expect(shadowLines()).toEqual([
          "yandex purchase payload shadow (complete): issued_at=absent statuses=absent:1",
        ]);
        expect(metrics.paymentsPayloadIssuedAt).toHaveBeenCalledWith(
          "complete",
          "absent",
        );
      });

      it("an empty list logs statuses=none outcomes=none", async () => {
        await reconcile(app0506(mockPaymentsRepo()), reconcileSignature([]));
        expect(shadowLines()).toEqual([
          "yandex purchase payload shadow (reconcile): caller=none issued_at=under_1m statuses=none outcomes=none",
        ]);
      });

      it("leak guard: no token, player id, intent id, payload or signature in any line", async () => {
        const verifiedOther = bearerFor(OTHER_PLAYER_ID, { verified: true });
        const signed = reconcileSignature([LONG_TOKEN, OTHER_TOKEN]);
        const failingSighting = heldRepo(PLAYER_ID, "citizenship", {
          recordHolderSighting: jest.fn().mockRejectedValue(new Error("x")),
        });
        await reconcile(app0506(heldRepo()), signed, verifiedOther);
        await reconcile(app0506(failingSighting), signed, verifiedOther);
        await reconcile(
          app0506(
            mockPaymentsRepo({
              findIntent: jest.fn().mockResolvedValue(openIntent()),
            }),
          ),
          signed,
          verifiedOther,
        );
        expect(shadowLines()).toHaveLength(3);
        const forbidden = [
          LONG_TOKEN,
          OTHER_TOKEN,
          PLAYER_ID,
          OTHER_PLAYER_ID,
          INTENT_ID,
          signed,
          verifiedOther.slice("Bearer ".length),
          SECRET,
        ];
        for (const args of logCalls) {
          expect(args).toHaveLength(1);
          expect(typeof args[0]).toBe("string");
        }
        for (const line of logLines) {
          for (const value of forbidden) {
            expect(line).not.toContain(value);
          }
        }
      });
    });
  });
});
