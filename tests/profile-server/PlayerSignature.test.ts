// Unit tests for Yandex signed player data (task 0325). Synthetic key, ids, names
// and avatar — nothing real in any fixture. The payload shape mirrors S0's field
// names (worklog.md § S0 result), never its values.

import { createHmac } from "crypto";
import {
  LOGIN_SIGNATURE_MAX_AGE_SECONDS,
  LOGIN_SIGNATURE_MAX_FUTURE_SECONDS,
  staleSignatureAgeBracket,
  verifySignedPlayer,
} from "../../src/profile-server/PlayerSignature";
import type { StaleSignatureAgeBracket } from "../../src/profile-server/Telemetry";

const SECRET = "0325-synthetic-player-signature-key";
const OTHER_SECRET = "0325-some-other-key";
const UNIQUE_ID = "zz0325-synthetic-unique-id";
const NOW_SEC = 1_790_000_000;
const NOW_MS = NOW_SEC * 1000;
const NAME_CANARY = "zz0325-Synthetic-Public-Name";
const AVATAR_CANARY = "zz0325-synthetic-avatar-hash";

function payload(
  overrides: Record<string, unknown> = {},
  dataOverrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    algorithm: "HMAC-SHA256",
    issuedAt: NOW_SEC,
    requestPayload: "",
    data: {
      id: "zz0325-synthetic-id",
      uniqueID: UNIQUE_ID,
      lang: "ru",
      publicName: NAME_CANARY,
      avatarIdHash: AVATAR_CANARY,
      scopePermissions: { public_name: "allow" },
      payingStatus: "unknown",
      hasPremium: false,
      ...dataOverrides,
    },
    ...overrides,
  };
}

/** S0's construction: HMAC over the DECODED JSON text. */
function signDecoded(text: string, secret: string = SECRET): string {
  const encoded = Buffer.from(text).toString("base64");
  const mac = createHmac("sha256", secret).update(text).digest("base64");
  return `${mac}.${encoded}`;
}

/** The other accepted construction: HMAC over the base64 payload as sent. */
function signBase64(text: string, secret: string = SECRET): string {
  const encoded = Buffer.from(text).toString("base64");
  const mac = createHmac("sha256", secret).update(encoded).digest("base64");
  return `${mac}.${encoded}`;
}

function signed(
  overrides: Record<string, unknown> = {},
  dataOverrides: Record<string, unknown> = {},
): string {
  return signDecoded(JSON.stringify(payload(overrides, dataOverrides)));
}

describe("verifySignedPlayer", () => {
  describe("ok", () => {
    test("the decoded-JSON construction (what Yandex uses, per S0)", () => {
      expect(verifySignedPlayer(signed(), SECRET, NOW_MS)).toEqual({
        status: "ok",
        platformUserId: UNIQUE_ID,
        issuedAtMs: NOW_MS,
      });
    });

    test("the base64-payload construction (accepted for parity with purchases)", () => {
      expect(
        verifySignedPlayer(
          signBase64(JSON.stringify(payload())),
          SECRET,
          NOW_MS,
        ),
      ).toEqual({
        status: "ok",
        platformUserId: UNIQUE_ID,
        issuedAtMs: NOW_MS,
      });
    });

    test("reads data.uniqueID, not data.id — and does not require them equal", () => {
      const result = verifySignedPlayer(
        signed({}, { id: "zz0325-a-different-id" }),
        SECRET,
        NOW_MS,
      );
      expect(result).toEqual({
        status: "ok",
        platformUserId: UNIQUE_ID,
        issuedAtMs: NOW_MS,
      });
    });

    test("ignores `algorithm` entirely (owner ruling D3): a different or missing value still verifies", () => {
      expect(
        verifySignedPlayer(signed({ algorithm: "hmac-sha256" }), SECRET, NOW_MS)
          .status,
      ).toBe("ok");
      const noAlgorithm = payload();
      delete noAlgorithm.algorithm;
      expect(
        verifySignedPlayer(
          signDecoded(JSON.stringify(noAlgorithm)),
          SECRET,
          NOW_MS,
        ).status,
      ).toBe("ok");
    });

    test("the result carries no name, avatar or any other payload field", () => {
      const result = verifySignedPlayer(signed(), SECRET, NOW_MS);
      expect(Object.keys(result).sort()).toEqual(
        ["issuedAtMs", "platformUserId", "status"].sort(),
      );
      const text = JSON.stringify(result);
      expect(text).not.toContain(NAME_CANARY);
      expect(text).not.toContain(AVATAR_CANARY);
    });
  });

  describe("bad_signature", () => {
    test("a FORGED signature (right shape, wrong key)", () => {
      expect(
        verifySignedPlayer(
          signDecoded(JSON.stringify(payload()), OTHER_SECRET),
          SECRET,
          NOW_MS,
        ),
      ).toEqual({ status: "bad_signature" });
    });

    test("a tampered payload (a different uniqueID under the original MAC)", () => {
      const [mac] = signed().split(".");
      const tampered = Buffer.from(
        JSON.stringify(payload({}, { uniqueID: "zz0325-victim" })),
      ).toString("base64");
      expect(verifySignedPlayer(`${mac}.${tampered}`, SECRET, NOW_MS)).toEqual({
        status: "bad_signature",
      });
    });

    test.each([
      ["no dot", "abcdef"],
      ["empty signature part", ".e30="],
      ["empty payload part", "abcd."],
      ["the empty string", ""],
      ["non-base64 signature", "!!!!.e30="],
      ["a lone dot", "."],
    ])("%s", (_label, value) => {
      expect(verifySignedPlayer(value, SECRET, NOW_MS)).toEqual({
        status: "bad_signature",
      });
    });
  });

  describe("bad_payload (the HMAC passed)", () => {
    test("non-JSON", () => {
      expect(
        verifySignedPlayer(signDecoded("not json {"), SECRET, NOW_MS),
      ).toEqual({ status: "bad_payload" });
    });

    test.each<[string, string]>([
      ["JSON null", "null"],
      ["a JSON array", "[1,2]"],
      ["a JSON number", "42"],
    ])("%s", (_label, text) => {
      expect(verifySignedPlayer(signDecoded(text), SECRET, NOW_MS)).toEqual({
        status: "bad_payload",
      });
    });

    test("no data object", () => {
      const noData = payload();
      delete noData.data;
      expect(
        verifySignedPlayer(signDecoded(JSON.stringify(noData)), SECRET, NOW_MS),
      ).toEqual({ status: "bad_payload" });
    });

    test.each<[string, unknown]>([
      ["missing", undefined],
      ["empty", ""],
      ["a number", 12345],
      ["null", null],
    ])("data.uniqueID %s — no fallback to data.id", (_label, value) => {
      const text = JSON.stringify(payload({}, { uniqueID: value }));
      expect(verifySignedPlayer(signDecoded(text), SECRET, NOW_MS)).toEqual({
        status: "bad_payload",
      });
    });

    test.each<[string, unknown]>([
      ["missing", undefined],
      ["a string", String(NOW_SEC)],
      ["null", null],
    ])("issuedAt %s — required (owner ruling Q3)", (_label, value) => {
      const text = JSON.stringify(payload({ issuedAt: value }));
      expect(verifySignedPlayer(signDecoded(text), SECRET, NOW_MS)).toEqual({
        status: "bad_payload",
      });
    });

    test("issuedAt NaN (serializes to null, still bad_payload)", () => {
      const text = JSON.stringify(payload({ issuedAt: NaN }));
      expect(verifySignedPlayer(signDecoded(text), SECRET, NOW_MS)).toEqual({
        status: "bad_payload",
      });
    });

    test("issuedAt non-finite (a huge exponent parses to Infinity)", () => {
      const text = JSON.stringify(payload()).replace(
        `"issuedAt":${NOW_SEC}`,
        `"issuedAt":1e400`,
      );
      expect(text).toContain("1e400");
      expect(verifySignedPlayer(signDecoded(text), SECRET, NOW_MS)).toEqual({
        status: "bad_payload",
      });
    });
  });

  describe("freshness: 900 s old / 300 s future, both limits inclusive", () => {
    test("the window is the approved one", () => {
      expect(LOGIN_SIGNATURE_MAX_AGE_SECONDS).toBe(900);
      expect(LOGIN_SIGNATURE_MAX_FUTURE_SECONDS).toBe(300);
    });

    test.each<[string, number, string]>([
      ["exactly 900 s old", NOW_SEC - 900, "ok"],
      ["901 s old", NOW_SEC - 901, "stale"],
      ["an old signature (1 day)", NOW_SEC - 86_400, "stale"],
      ["exactly 300 s ahead", NOW_SEC + 300, "ok"],
      ["301 s ahead", NOW_SEC + 301, "stale"],
      ["far future", NOW_SEC + 86_400, "stale"],
    ])("%s → %s", (_label, issuedAt, expected) => {
      expect(
        verifySignedPlayer(signed({ issuedAt }), SECRET, NOW_MS).status,
      ).toBe(expected);
    });

    test("issuedAt is read in SECONDS: a milliseconds value is far future → stale", () => {
      expect(
        verifySignedPlayer(signed({ issuedAt: NOW_MS }), SECRET, NOW_MS).status,
      ).toBe("stale");
    });
  });

  // Task 0366: a stale result carries a fixed age bracket — and nothing else does.
  describe("stale age bracket", () => {
    test.each<[string, number]>([
      ["exactly 900 s old", NOW_SEC - 900],
      ["exactly 300 s ahead", NOW_SEC + 300],
    ])("%s → ok, with no ageBracket", (_label, issuedAt) => {
      expect(verifySignedPlayer(signed({ issuedAt }), SECRET, NOW_MS)).toEqual({
        status: "ok",
        platformUserId: UNIQUE_ID,
        issuedAtMs: issuedAt * 1000,
      });
    });

    test.each<[string, number, StaleSignatureAgeBracket]>([
      ["901 s old (just past the window)", NOW_SEC - 901, "past_15m_20m"],
      ["301 s ahead (just past the window)", NOW_SEC + 301, "future_5m_15m"],
      ["25 min old", NOW_SEC - 25 * 60, "past_20m_30m"],
      ["45 min old", NOW_SEC - 45 * 60, "past_30m_1h"],
      ["3 h old", NOW_SEC - 3 * 3600, "past_1h_6h"],
      ["12 h old", NOW_SEC - 12 * 3600, "past_6h_24h"],
      ["30 days old", NOW_SEC - 30 * 86_400, "past_over_24h"],
      ["10 min ahead", NOW_SEC + 10 * 60, "future_5m_15m"],
      ["1 h ahead", NOW_SEC + 3600, "future_over_15m"],
      ["a milliseconds issuedAt", NOW_MS, "future_over_15m"],
    ])("%s → %s", (_label, issuedAt, bracket) => {
      expect(verifySignedPlayer(signed({ issuedAt }), SECRET, NOW_MS)).toEqual({
        status: "stale",
        ageBracket: bracket,
      });
    });

    test.each<[number, StaleSignatureAgeBracket, StaleSignatureAgeBracket]>([
      [1_200, "past_15m_20m", "past_20m_30m"],
      [1_800, "past_20m_30m", "past_30m_1h"],
      [3_600, "past_30m_1h", "past_1h_6h"],
      [21_600, "past_1h_6h", "past_6h_24h"],
      [86_400, "past_6h_24h", "past_over_24h"],
    ])(
      "exactly %i s old → %s; 1 ms more → %s",
      (edgeSeconds, atEdge, pastEdge) => {
        expect(staleSignatureAgeBracket(edgeSeconds * 1000)).toBe(atEdge);
        expect(staleSignatureAgeBracket(edgeSeconds * 1000 + 1)).toBe(pastEdge);
      },
    );

    test("exactly 900 s ahead → future_5m_15m; 1 ms more → future_over_15m", () => {
      expect(staleSignatureAgeBracket(-900_000)).toBe("future_5m_15m");
      expect(staleSignatureAgeBracket(-900_001)).toBe("future_over_15m");
    });
  });

  test("an empty secret is no_secret — checked before anything else", () => {
    expect(verifySignedPlayer(signed(), "", NOW_MS)).toEqual({
      status: "no_secret",
    });
    expect(verifySignedPlayer("garbage", "", NOW_MS)).toEqual({
      status: "no_secret",
    });
  });

  test("garbage input never throws", () => {
    const inputs: unknown[] = [
      "",
      ".",
      "..",
      "a.b.c",
      "\u0000.\u0000",
      "💥.💥",
      "a".repeat(10_000),
      `${"A".repeat(43)}=.${"B".repeat(100)}`,
      undefined,
      null,
      42,
      {},
    ];
    for (const input of inputs) {
      expect(() =>
        verifySignedPlayer(input as string, SECRET, NOW_MS),
      ).not.toThrow();
    }
  });
});
