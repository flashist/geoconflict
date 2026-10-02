import {
  compareIssuedAt,
  isPastStale,
  readSignatureIssuedAtSeconds,
  SIGNATURE_AGE_TO_SERVER_BRACKET,
  signatureAgeLabel,
  type SignatureAgeLabel,
} from "../../src/client/SignatureAgeAnalytics";
import { SIGNATURE_MAX } from "../../src/core/profile/LoginContract";
import {
  LOGIN_SIGNATURE_MAX_AGE_SECONDS,
  LOGIN_SIGNATURE_MAX_FUTURE_SECONDS,
  staleSignatureAgeBracket,
} from "../../src/profile-server/PlayerSignature";

// Task 0372 (A1/A2): the client's read of a signed player envelope's issuedAt, and
// its age label. Synthetic envelopes only — no real signature, id or name.

const MAC = "c3ludGhldGljLW1hYw==";
const ISSUED_AT = 1_790_000_000;
const SYNTHETIC_NAME = "SyntheticPublicName";
const SYNTHETIC_AVATAR = "syntheticAvatarHash";
const SYNTHETIC_ID = "syntheticUniqueId";

function payloadBase64(payload: unknown): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64");
}
function envelope(payload: unknown): string {
  return `${MAC}.${payloadBase64(payload)}`;
}
const fullPayload = (issuedAt: unknown) => ({
  algorithm: "HMAC-SHA256",
  issuedAt,
  requestPayload: "",
  data: {
    id: SYNTHETIC_ID,
    uniqueID: SYNTHETIC_ID,
    lang: "ru",
    publicName: SYNTHETIC_NAME,
    avatarIdHash: SYNTHETIC_AVATAR,
  },
});

describe("readSignatureIssuedAtSeconds", () => {
  test("a well-formed envelope → its issuedAt", () => {
    expect(readSignatureIssuedAtSeconds(envelope(fullPayload(ISSUED_AT)))).toBe(
      ISSUED_AT,
    );
  });

  test("a fractional issuedAt is returned as is", () => {
    expect(
      readSignatureIssuedAtSeconds(envelope({ issuedAt: ISSUED_AT + 0.25 })),
    ).toBe(ISSUED_AT + 0.25);
  });

  test("URL-safe and unpadded base64 are read, as the server's Buffer decode does", () => {
    // A payload whose standard base64 carries '+', '/' and '=' padding.
    const payload = { issuedAt: ISSUED_AT, data: { publicName: "~~~?>>>" } };
    const standard = payloadBase64(payload);
    expect(standard).toMatch(/[+/]/);
    expect(standard).toMatch(/=$/);
    const urlSafeUnpadded = standard
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    expect(readSignatureIssuedAtSeconds(`${MAC}.${standard}`)).toBe(ISSUED_AT);
    expect(readSignatureIssuedAtSeconds(`${MAC}.${urlSafeUnpadded}`)).toBe(
      ISSUED_AT,
    );
    // The server agrees both decode to the same JSON.
    expect(Buffer.from(urlSafeUnpadded, "base64").toString("utf8")).toBe(
      JSON.stringify(payload),
    );
  });

  test("a non-ASCII (Cyrillic) public name does not disturb the read", () => {
    expect(
      readSignatureIssuedAtSeconds(
        envelope({ issuedAt: ISSUED_AT, data: { publicName: "Игрок «Тест»" } }),
      ),
    ).toBe(ISSUED_AT);
  });

  test.each<[string, unknown]>([
    ["no dot", `${MAC}${payloadBase64({ issuedAt: ISSUED_AT })}`],
    ["a leading dot", `.${payloadBase64({ issuedAt: ISSUED_AT })}`],
    ["a trailing dot", `${MAC}.`],
    ["bad base64", `${MAC}.%%%not-base64%%%`],
    ["base64 of a length no decoder accepts", `${MAC}.abcde`],
    ["not JSON", `${MAC}.${Buffer.from("not json").toString("base64")}`],
    ["a JSON array", envelope([ISSUED_AT])],
    ["JSON null", envelope(null)],
    ["a JSON number", envelope(ISSUED_AT)],
    ["issuedAt missing", envelope({ data: { uniqueID: SYNTHETIC_ID } })],
    ["issuedAt a string", envelope({ issuedAt: String(ISSUED_AT) })],
    ["issuedAt null", envelope({ issuedAt: null })],
    [
      "issuedAt NaN (not JSON-encodable — hand-written)",
      `${MAC}.${Buffer.from('{"issuedAt":NaN}').toString("base64")}`,
    ],
    [
      "issuedAt Infinity (1e999)",
      `${MAC}.${Buffer.from('{"issuedAt":1e999}').toString("base64")}`,
    ],
    ["issuedAt only nested under data", envelope({ data: { issuedAt: 1 } })],
    [
      "over SIGNATURE_MAX",
      `${MAC}.${payloadBase64({ issuedAt: ISSUED_AT, pad: "x".repeat(SIGNATURE_MAX) })}`,
    ],
    ["undefined", undefined],
    ["null", null],
    ["a number", 42],
    ["an object", { issuedAt: ISSUED_AT }],
    ["an empty string", ""],
  ])("%s → null, never a throw", (_label, input) => {
    expect(() => readSignatureIssuedAtSeconds(input)).not.toThrow();
    expect(readSignatureIssuedAtSeconds(input)).toBeNull();
  });

  test("exactly SIGNATURE_MAX characters is still read (the limit is inclusive)", () => {
    // Grow a pad until the unpadded envelope is exactly SIGNATURE_MAX long.
    let signed = "";
    for (let padLength = 0; signed.length < SIGNATURE_MAX; padLength++) {
      signed = `${MAC}.${payloadBase64({
        issuedAt: ISSUED_AT,
        pad: "x".repeat(padLength),
      }).replace(/=+$/, "")}`;
    }
    expect(signed).toHaveLength(SIGNATURE_MAX);
    expect(readSignatureIssuedAtSeconds(signed)).toBe(ISSUED_AT);
  });

  test("returns nothing but the number — no name, avatar or id comes back", () => {
    const result = readSignatureIssuedAtSeconds(
      envelope(fullPayload(ISSUED_AT)),
    );
    expect(typeof result).toBe("number");
    const text = JSON.stringify(result);
    expect(text).not.toContain(SYNTHETIC_NAME);
    expect(text).not.toContain(SYNTHETIC_AVATAR);
    expect(text).not.toContain(SYNTHETIC_ID);
  });
});

describe("signatureAgeLabel", () => {
  const NOW_MS = ISSUED_AT * 1000;
  /** The label for a signature issued `ageMs` before NOW (negative = ahead). */
  const labelAt = (ageMs: number) =>
    signatureAgeLabel((NOW_MS - ageMs) / 1000, NOW_MS);
  const S = 1000;

  test("null → Unreadable", () => {
    expect(signatureAgeLabel(null, NOW_MS)).toBe("Unreadable");
  });

  test.each<[string, SignatureAgeLabel, number]>([
    ["exactly now", "Fresh", 0],
    ["exactly 900 s old", "Fresh", 900 * S],
    ["900 s + 1 ms old", "Past15m20m", 900 * S + 1],
    ["exactly 300 s ahead", "Fresh", -300 * S],
    ["300 s + 1 ms ahead", "Future5m15m", -300 * S - 1],
    ["600 s ahead", "Future5m15m", -600 * S],
    ["exactly 900 s ahead", "Future5m15m", -900 * S],
    ["900 s + 1 ms ahead", "FutureOver15m", -900 * S - 1],
    ["a day ahead", "FutureOver15m", -86_400 * S],
    ["1 000 s old", "Past15m20m", 1_000 * S],
    ["exactly 1 200 s old", "Past15m20m", 1_200 * S],
    ["1 200 s + 1 ms old", "Past20m30m", 1_200 * S + 1],
    ["1 500 s old", "Past20m30m", 1_500 * S],
    ["exactly 1 800 s old", "Past20m30m", 1_800 * S],
    ["1 800 s + 1 ms old", "Past30m1h", 1_800 * S + 1],
    ["2 700 s old", "Past30m1h", 2_700 * S],
    ["exactly 3 600 s old", "Past30m1h", 3_600 * S],
    ["3 600 s + 1 ms old", "Past1h6h", 3_600 * S + 1],
    ["10 000 s old", "Past1h6h", 10_000 * S],
    ["exactly 21 600 s old", "Past1h6h", 21_600 * S],
    ["21 600 s + 1 ms old", "Past6h24h", 21_600 * S + 1],
    ["50 000 s old", "Past6h24h", 50_000 * S],
    ["exactly 86 400 s old", "Past6h24h", 86_400 * S],
    ["86 400 s + 1 ms old", "PastOver24h", 86_400 * S + 1],
    ["a year old", "PastOver24h", 365 * 86_400 * S],
  ])("%s → %s", (_label, expected, ageMs) => {
    expect(labelAt(ageMs)).toBe(expected);
  });

  test("server parity: every edge ±1 ms and interior points match 0366's brackets", () => {
    const edgesSeconds = [
      0, 300, 900, 1_200, 1_800, 3_600, 21_600, 86_400, 1_000_000,
    ];
    const ages: number[] = [];
    for (const edge of edgesSeconds) {
      for (const sign of [1, -1]) {
        const centre = sign * edge * S;
        ages.push(centre - 1, centre, centre + 1, centre + 0.5 * S);
      }
    }
    for (const ageMs of ages) {
      const label = labelAt(ageMs);
      const serverFresh =
        ageMs <= LOGIN_SIGNATURE_MAX_AGE_SECONDS * S &&
        -ageMs <= LOGIN_SIGNATURE_MAX_FUTURE_SECONDS * S;
      if (serverFresh) {
        expect([ageMs, label]).toEqual([ageMs, "Fresh"]);
      } else {
        expect(label).not.toBe("Fresh");
        expect(label).not.toBe("Unreadable");
        expect([
          ageMs,
          SIGNATURE_AGE_TO_SERVER_BRACKET[
            label as keyof typeof SIGNATURE_AGE_TO_SERVER_BRACKET
          ],
        ]).toEqual([ageMs, staleSignatureAgeBracket(ageMs)]);
      }
    }
  });

  test("the mapping table covers all eight server brackets, one to one", () => {
    const serverLabels = Object.values(SIGNATURE_AGE_TO_SERVER_BRACKET);
    expect(new Set(serverLabels).size).toBe(8);
    expect(serverLabels.sort()).toEqual(
      [
        "future_5m_15m",
        "future_over_15m",
        "past_15m_20m",
        "past_20m_30m",
        "past_30m_1h",
        "past_1h_6h",
        "past_6h_24h",
        "past_over_24h",
      ].sort(),
    );
  });
});

describe("isPastStale", () => {
  test.each<[SignatureAgeLabel, boolean]>([
    ["Fresh", false],
    ["Future5m15m", false],
    ["FutureOver15m", false],
    ["Unreadable", false],
    ["Past15m20m", true],
    ["Past20m30m", true],
    ["Past30m1h", true],
    ["Past1h6h", true],
    ["Past6h24h", true],
    ["PastOver24h", true],
  ])("%s → %s", (label, expected) => {
    expect(isPastStale(label)).toBe(expected);
  });
});

describe("compareIssuedAt", () => {
  test("Newer / Same / Older", () => {
    expect(compareIssuedAt(ISSUED_AT, ISSUED_AT + 1)).toBe("Newer");
    expect(compareIssuedAt(ISSUED_AT, ISSUED_AT)).toBe("Same");
    expect(compareIssuedAt(ISSUED_AT, ISSUED_AT - 1)).toBe("Older");
  });
});
