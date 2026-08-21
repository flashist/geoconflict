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

const SECRET = "payments-test-secret";
const INTENT_ID = randomUUID();

function mockProfileRepo(): ProfileRepo {
  return {
    ping: jest.fn().mockResolvedValue(undefined),
    getProfile: jest.fn().mockResolvedValue(null),
    upsertProfile: jest.fn(),
    creditMatchXp: jest.fn(),
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

function appWith(paymentsRepo: PaymentsRepo, secret: string = SECRET) {
  return createApp(mockProfileRepo(), {
    paymentsRepo,
    yandexPaymentsSecret: secret,
  });
}

/** Real signed payloads (the routes use the real verifier). */
function sign(payload: unknown): string {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64");
  const signature = createHmac("sha256", SECRET)
    .update(encoded)
    .digest("base64");
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
    yandexPlayerId: "yandex-1",
    productId: "citizenship",
    usedAt: null,
    ...overrides,
  };
}

const processedReceipt: ProcessedPurchase = {
  purchaseToken: "tok-1",
  yandexPlayerId: "yandex-1",
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
        "Content-Type",
      );

      const post = await request(app)
        .post("/v1/payments/yandex/intent")
        .set("Origin", "https://geoconflict.ru")
        .send({ yandexPlayerId: "yandex-1", productId: "citizenship" });
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
        .send({ yandexPlayerId: "yandex-1", productId: "citizenship" });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ intentId: INTENT_ID });
      expect(repo.createIntent).toHaveBeenCalledWith("yandex-1", "citizenship");
    });

    it("is 400 for an unknown product or bad body", async () => {
      const app = appWith(mockPaymentsRepo());
      const bad = await request(app)
        .post("/v1/payments/yandex/intent")
        .send({ yandexPlayerId: "yandex-1", productId: "nuke" });
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
        .send({ yandexPlayerId: "yandex-1", productId: "citizenship" });
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
          yandexPlayerId: "yandex-1",
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
});
