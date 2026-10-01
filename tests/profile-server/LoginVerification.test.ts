// The login's verification decision (task 0325): the full outcome table of the one
// pure function the login route calls. Synthetic key and ids only.

import { createHmac } from "crypto";
import { classifyLoginSignature } from "../../src/profile-server/LoginVerification";

const SECRET = "0325-synthetic-login-verification-key";
const ID_A = "zz0325-player-a";
const ID_B = "zz0325-player-b";
const NOW_SEC = 1_790_000_000;
const NOW_MS = NOW_SEC * 1000;

function signFor(
  uniqueID: unknown,
  issuedAt: unknown = NOW_SEC,
  secret: string = SECRET,
): string {
  const text = JSON.stringify({
    algorithm: "HMAC-SHA256",
    issuedAt,
    requestPayload: "",
    data: { id: "x", uniqueID },
  });
  const mac = createHmac("sha256", secret).update(text).digest("base64");
  return `${mac}.${Buffer.from(text).toString("base64")}`;
}

describe("classifyLoginSignature", () => {
  test.each<
    [
      string,
      () => string | undefined,
      string,
      string,
      boolean,
      string | undefined,
    ]
  >([
    ["no signature", () => undefined, SECRET, "absent", false, undefined],
    [
      "no secret configured",
      () => signFor(ID_A),
      "",
      "no_secret",
      false,
      undefined,
    ],
    [
      "absent wins over no_secret (nothing was sent to check)",
      () => undefined,
      "",
      "absent",
      false,
      undefined,
    ],
    [
      "a forged signature",
      () => signFor(ID_A, NOW_SEC, "wrong-key"),
      SECRET,
      "bad_signature",
      false,
      undefined,
    ],
    [
      "garbage",
      () => "not-a-signature",
      SECRET,
      "bad_signature",
      false,
      undefined,
    ],
    [
      "a genuine signature with no uniqueID",
      () => signFor(undefined),
      SECRET,
      "bad_payload",
      false,
      undefined,
    ],
    [
      "a genuine but stale signature",
      () => signFor(ID_A, NOW_SEC - 901),
      SECRET,
      "stale",
      false,
      "past_15m_20m",
    ],
    [
      "a valid signature for A while the login asserts B",
      () => signFor(ID_B),
      SECRET,
      "id_mismatch",
      false,
      undefined,
    ],
    [
      "a fresh, genuine signature for the asserted id",
      () => signFor(ID_A),
      SECRET,
      "ok",
      true,
      undefined,
    ],
  ])("%s → %s", (_label, build, secret, outcome, verified, staleAgeBracket) => {
    expect(classifyLoginSignature(build(), ID_A, secret, NOW_MS)).toEqual(
      staleAgeBracket === undefined
        ? { outcome, verified }
        : { outcome, verified, staleAgeBracket },
    );
  });

  // Task 0366. The stale check runs BEFORE the id check, so a stale signature for
  // someone else is `stale`, not `id_mismatch`. This pins today's order; it does
  // not change it.
  test("a 1-day-old signature for ANOTHER id is stale, bracket past_6h_24h", () => {
    expect(
      classifyLoginSignature(
        signFor(ID_B, NOW_SEC - 86_400),
        ID_A,
        SECRET,
        NOW_MS,
      ),
    ).toEqual({
      outcome: "stale",
      verified: false,
      staleAgeBracket: "past_6h_24h",
    });
  });

  test("only a stale outcome carries a staleAgeBracket key", () => {
    const cases: Array<[string | undefined, string]> = [
      [undefined, SECRET],
      [signFor(ID_A), ""],
      [signFor(ID_A, NOW_SEC, "wrong-key"), SECRET],
      [signFor(undefined), SECRET],
      [signFor(ID_B), SECRET],
      [signFor(ID_A), SECRET],
    ];
    for (const [signature, secret] of cases) {
      const result = classifyLoginSignature(signature, ID_A, secret, NOW_MS);
      expect(result.outcome).not.toBe("stale");
      expect(Object.keys(result)).not.toContain("staleAgeBracket");
    }
  });

  test("id comparison is exact: case and whitespace differences are id_mismatch", () => {
    for (const asserted of [ID_A.toUpperCase(), ` ${ID_A}`, `${ID_A} `]) {
      expect(
        classifyLoginSignature(signFor(ID_A), asserted, SECRET, NOW_MS),
      ).toEqual({ outcome: "id_mismatch", verified: false });
    }
  });

  test("verified is true ONLY for ok", () => {
    const cases: Array<string | undefined> = [
      undefined,
      "x",
      signFor(ID_B),
      signFor(ID_A, NOW_SEC + 301),
      signFor(ID_A),
    ];
    for (const signature of cases) {
      const result = classifyLoginSignature(signature, ID_A, SECRET, NOW_MS);
      expect(result.verified).toBe(result.outcome === "ok");
    }
  });
});
