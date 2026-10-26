import { createHmac } from "crypto";
import {
  verifyHmacEnvelope,
  verifySignedPayload,
} from "../../src/profile-server/YandexSignature";

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
        status: null,
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
        status: "waiting",
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

  // Task 0309: the result names which HMAC construction matched, so the payment
  // routes can log it and 0310 can drop the one Yandex does not use.
  it("reports construction=base64_payload for an HMAC over the base64 payload", () => {
    expect(verifySignedPayload(sign(FLAT_PURCHASE), SECRET)?.construction).toBe(
      "base64_payload",
    );
    expect(
      verifySignedPayload(sign(ENVELOPE_PURCHASE), SECRET)?.construction,
    ).toBe("base64_payload");
  });

  it("reports construction=decoded_json for an HMAC over the decoded JSON", () => {
    expect(
      verifySignedPayload(signOverDecodedJson(FLAT_PURCHASE), SECRET)
        ?.construction,
    ).toBe("decoded_json");
    expect(
      verifySignedPayload(signOverDecodedJson(ENVELOPE_PURCHASE), SECRET)
        ?.construction,
    ).toBe("decoded_json");
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
        status: null,
      },
      {
        purchaseToken: "tok-b",
        productId: "citizenship",
        developerPayload: "d",
        status: null,
      },
    ]);
  });

  // Task 0506 (spec §4.7): shadow-measured fields; the verifier still never throws.
  describe("issuedAt and entry status", () => {
    it("exposes the envelope's numeric issuedAt", () => {
      const result = verifySignedPayload(sign(ENVELOPE_PURCHASE), SECRET);
      expect(result?.issuedAt).toBe(1_571_233_371);
      expect(result?.issuedAtPresent).toBe(true);
    });

    it("issuedAt absent from the envelope ⇒ null, not present", () => {
      const result = verifySignedPayload(
        sign({ data: [{ token: "t", productID: "citizenship" }] }),
        SECRET,
      );
      expect(result?.issuedAt).toBeNull();
      expect(result?.issuedAtPresent).toBe(false);
    });

    it.each([["1571233371"], [{ s: 1 }], [true]])(
      "a non-numeric issuedAt %p ⇒ null, but present",
      (issuedAt) => {
        const result = verifySignedPayload(
          sign({ ...ENVELOPE_PURCHASE, issuedAt }),
          SECRET,
        );
        expect(result).not.toBeNull();
        expect(result?.issuedAt).toBeNull();
        expect(result?.issuedAtPresent).toBe(true);
      },
    );

    it("a flat (non-envelope) payload has no issuedAt, even if it carries one", () => {
      const result = verifySignedPayload(
        sign({ ...FLAT_PURCHASE, issuedAt: 1_571_233_371 }),
        SECRET,
      );
      expect(result?.issuedAt).toBeNull();
      expect(result?.issuedAtPresent).toBe(false);
    });

    it("passes each entry's status through, null when absent or not a string", () => {
      const result = verifySignedPayload(
        sign({
          issuedAt: 1,
          data: [
            { token: "a", productID: "citizenship", status: "waiting" },
            { token: "b", productID: "citizenship" },
            { token: "c", productID: "citizenship", status: 3 },
          ],
        }),
        SECRET,
      );
      expect(result?.purchases.map((p) => p.status)).toEqual([
        "waiting",
        null,
        null,
      ]);
    });
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

// Task 0325: the HMAC half, extracted unchanged so the login's signed-player-data
// check shares it. Every case above passing unmodified is the proof that the
// extraction is a pure refactor; these pin the extracted function on its own.
describe("verifyHmacEnvelope", () => {
  const ANY_JSON = { anything: "at all", issuedAt: 1 };

  it("returns the decoded JSON under the base64-payload construction", () => {
    expect(verifyHmacEnvelope(sign(ANY_JSON), SECRET)).toEqual({
      decodedJson: JSON.stringify(ANY_JSON),
      construction: "base64_payload",
    });
  });

  it("returns the decoded JSON under the decoded-JSON construction", () => {
    expect(verifyHmacEnvelope(signOverDecodedJson(ANY_JSON), SECRET)).toEqual({
      decodedJson: JSON.stringify(ANY_JSON),
      construction: "decoded_json",
    });
  });

  it("does not look inside the payload: non-JSON text with a valid HMAC passes", () => {
    const text = "not json {";
    const encoded = Buffer.from(text).toString("base64");
    const signature = createHmac("sha256", SECRET)
      .update(encoded)
      .digest("base64");
    expect(verifyHmacEnvelope(`${signature}.${encoded}`, SECRET)).toEqual({
      decodedJson: text,
      construction: "base64_payload",
    });
  });

  it("rejects the wrong key, an empty key, and malformed envelopes", () => {
    expect(verifyHmacEnvelope(sign(ANY_JSON, "other-key"), SECRET)).toBeNull();
    expect(verifyHmacEnvelope(sign(ANY_JSON), "")).toBeNull();
    for (const bad of ["", ".", "abc", ".abc", "abc.", "!!!.e30="]) {
      expect(verifyHmacEnvelope(bad, SECRET)).toBeNull();
    }
  });
});
