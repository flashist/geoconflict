import { createHmac } from "crypto";
import { verifySignedPayload } from "../../src/profile-server/YandexSignature";

const SECRET = "test-secret-key";

/** Build a Yandex-style signed string: base64(HMAC(base64(json))).base64(json). */
function sign(payload: unknown, secret: string = SECRET): string {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64");
  const signature = createHmac("sha256", secret)
    .update(encoded)
    .digest("base64");
  return `${signature}.${encoded}`;
}

/** Alternate construction: HMAC over the DECODED json text (docs are ambiguous). */
function signOverDecodedJson(payload: unknown): string {
  const json = JSON.stringify(payload);
  const encoded = Buffer.from(json).toString("base64");
  const signature = createHmac("sha256", SECRET).update(json).digest("base64");
  return `${signature}.${encoded}`;
}

const FLAT_PURCHASE = {
  productID: "citizenship",
  purchaseToken: "tok-1",
  developerPayload: "intent-uuid-1",
};

// The docs' example envelope (sdk-purchases, re-checked 2026-08-14).
const ENVELOPE_PURCHASE = {
  algorithm: "HMAC-SHA256",
  issuedAt: 1_571_233_371,
  data: {
    token: "tok-envelope",
    status: "waiting",
    product: { id: "citizenship", title: "Гражданство" },
    developerPayload: "intent-uuid-2",
  },
};

describe("verifySignedPayload", () => {
  it("verifies and normalizes a flat IPurchase payload", () => {
    const result = verifySignedPayload(sign(FLAT_PURCHASE), SECRET);
    expect(result).not.toBeNull();
    expect(result?.purchases).toEqual([
      {
        purchaseToken: "tok-1",
        productId: "citizenship",
        developerPayload: "intent-uuid-1",
      },
    ]);
    expect(result?.rawPayload).toBe(JSON.stringify(FLAT_PURCHASE));
  });

  it("verifies and normalizes the docs' envelope shape (data.token/product.id)", () => {
    const result = verifySignedPayload(sign(ENVELOPE_PURCHASE), SECRET);
    expect(result?.purchases).toEqual([
      {
        purchaseToken: "tok-envelope",
        productId: "citizenship",
        developerPayload: "intent-uuid-2",
      },
    ]);
  });

  it("accepts the HMAC-over-decoded-JSON construction too", () => {
    const result = verifySignedPayload(
      signOverDecodedJson(FLAT_PURCHASE),
      SECRET,
    );
    expect(result?.purchases).toHaveLength(1);
  });

  it("normalizes an array payload (signed getPurchases), skipping malformed entries", () => {
    const payload = {
      data: [
        { purchaseToken: "tok-a", productID: "citizenship" },
        { somethingElse: true },
        {
          token: "tok-b",
          product: { id: "citizenship" },
          developerPayload: "d",
        },
      ],
    };
    const result = verifySignedPayload(sign(payload), SECRET);
    expect(result?.purchases).toEqual([
      {
        purchaseToken: "tok-a",
        productId: "citizenship",
        developerPayload: null,
      },
      {
        purchaseToken: "tok-b",
        productId: "citizenship",
        developerPayload: "d",
      },
    ]);
  });

  it("returns an empty purchase list for a verified empty array", () => {
    const result = verifySignedPayload(sign({ data: [] }), SECRET);
    expect(result?.purchases).toEqual([]);
  });

  it("rejects a tampered payload", () => {
    const signed = sign(FLAT_PURCHASE);
    const [sig] = signed.split(".");
    const tampered = Buffer.from(
      JSON.stringify({ ...FLAT_PURCHASE, productID: "everything" }),
    ).toString("base64");
    expect(verifySignedPayload(`${sig}.${tampered}`, SECRET)).toBeNull();
  });

  it("rejects a payload signed with the wrong key", () => {
    expect(
      verifySignedPayload(sign(FLAT_PURCHASE, "wrong-key"), SECRET),
    ).toBeNull();
  });

  it("fails closed on an empty secret", () => {
    expect(verifySignedPayload(sign(FLAT_PURCHASE), "")).toBeNull();
  });

  it.each([
    ["no dot", "abcdef"],
    ["empty", ""],
    ["dot only", "."],
    ["empty signature part", ".payload"],
    ["empty payload part", "sig."],
  ])("rejects malformed input: %s", (_name, input) => {
    expect(verifySignedPayload(input, SECRET)).toBeNull();
  });

  it("rejects a correctly signed non-JSON payload", () => {
    const encoded = Buffer.from("not json at all").toString("base64");
    const sig = createHmac("sha256", SECRET).update(encoded).digest("base64");
    expect(verifySignedPayload(`${sig}.${encoded}`, SECRET)).toBeNull();
  });

  it("rejects a correctly signed JSON payload with no purchase shape", () => {
    expect(verifySignedPayload(sign({ hello: "world" }), SECRET)).toBeNull();
  });

  it("rejects a single purchase missing its token or product", () => {
    expect(
      verifySignedPayload(sign({ productID: "citizenship" }), SECRET),
    ).toBeNull();
    expect(
      verifySignedPayload(sign({ purchaseToken: "t" }), SECRET),
    ).toBeNull();
  });
});
