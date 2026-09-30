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
  createApp,
  type PaymentsRepo,
  type ProfileRepo,
} from "../../src/profile-server/Routes";
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
    grantPaidPurchase: jest.fn().mockResolvedValue("granted"),
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
      expect(res.body).toEqual({ success: true, purchaseToken: "tok-1" });
      expect(repo.grantPaidPurchase).toHaveBeenCalledWith(
        expect.objectContaining<Partial<PaidPurchaseGrant>>({
          purchaseToken: "tok-1",
          productId: "citizenship",
          playerId: PLAYER_ID,
          intentId: INTENT_ID,
        }),
      );
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
      expect(res.body).toEqual({ success: true, purchaseToken: "tok-1" });
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
      expect(res.body).toEqual({ processedTokens: ["tok-done", "tok-new"] });
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
      expect(res.body).toEqual({ processedTokens: [] });
      expect(repo.grantPaidPurchase).not.toHaveBeenCalled();
    });

    it("verified empty purchase list ⇒ empty result", async () => {
      const res = await request(appWith(mockPaymentsRepo()))
        .post("/v1/payments/yandex/reconcile")
        .send({ signature: sign({ data: [] }) });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ processedTokens: [] });
    });

    it("is 400 for an invalid signature", async () => {
      const res = await request(appWith(mockPaymentsRepo()))
        .post("/v1/payments/yandex/reconcile")
        .send({ signature: "bad.payload" });
      expect(res.status).toBe(400);
      expect(res.body).toEqual({ error: "invalid_signature" });
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
        expect(res.body).toEqual({ processedTokens: [LONG_TOKEN] });
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
      // Four successful requests ⇒ four label lines; the guard is not vacuous.
      expect(signatureLines()).toHaveLength(4);
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
});
