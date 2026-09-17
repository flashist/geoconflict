// Unit tests for the stateless login session token (task 0271, ADR-113).
// Every "invalid" case below builds a token that differs from a genuine one in
// exactly one way, so a pass means that one check fired — not a lucky mismatch.

import { createHmac } from "crypto";
import {
  MIN_SESSION_SECRET_LENGTH,
  SESSION_TTL_SECONDS,
  isUsableSessionSecret,
  loadSessionSecret,
  signSessionToken,
  verifySessionToken,
} from "../../src/profile-server/SessionToken";

const SECRET = "0271-test-session-secret-0123456789abcdef"; // ≥ 32 chars, synthetic
const OTHER_SECRET = "0271-other-session-secret-fedcba9876543210";
const PLAYER_ID = "0b6f8a52-3c1e-4d7a-9f10-2a4b6c8d0e1f";
const OTHER_PLAYER_ID = "11111111-2222-4333-8444-555555555555";
const NOW_MS = Date.UTC(2026, 8, 15, 12, 0, 0);
const B64URL_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

function b64url(text: string): string {
  return Buffer.from(text, "utf8").toString("base64url");
}

function mac(secret: string, signingInput: string): string {
  return createHmac("sha256", secret).update(signingInput).digest("base64url");
}

/** A token signed exactly like the real one, over an arbitrary payload string. */
function signRaw(
  payload: string,
  secret: string = SECRET,
  version = "v1",
): string {
  const payloadB64 = b64url(payload);
  return `${version}.${payloadB64}.${mac(secret, `${version}.${payloadB64}`)}`;
}

function claims(overrides: Record<string, unknown> = {}) {
  const iat = Math.floor(NOW_MS / 1000);
  return {
    pid: PLAYER_ID,
    plt: "yandex_games",
    iat,
    exp: iat + SESSION_TTL_SECONDS,
    vfy: false,
    ...overrides,
  };
}

function genuine(): string {
  return signSessionToken(
    SECRET,
    { playerId: PLAYER_ID, platform: "yandex_games" },
    NOW_MS,
  ).token;
}

describe("SessionToken", () => {
  describe("sign → verify", () => {
    test("round-trips with vfy:false, a 24 h TTL and a matching expiresAt", () => {
      const signed = signSessionToken(
        SECRET,
        { playerId: PLAYER_ID, platform: "yandex_games" },
        NOW_MS,
      );
      expect(signed.token.startsWith("v1.")).toBe(true);
      const result = verifySessionToken(SECRET, signed.token, NOW_MS);
      expect(result.status).toBe("ok");
      if (result.status !== "ok") return;
      expect(result.claims.pid).toBe(PLAYER_ID);
      expect(result.claims.plt).toBe("yandex_games");
      expect(result.claims.vfy).toBe(false);
      expect(result.claims.exp - result.claims.iat).toBe(86_400);
      expect(signed.expiresAt).toBe(
        new Date(result.claims.exp * 1000).toISOString(),
      );
    });

    test("the hand-built signer in this file agrees with the real one (test oracle check)", () => {
      expect(
        verifySessionToken(SECRET, signRaw(JSON.stringify(claims())), NOW_MS),
      ).toEqual({ status: "ok", claims: claims() });
    });
  });

  describe("every tampered or foreign token is invalid", () => {
    const [, payloadB64, macB64] = genuine().split(".");

    test.each<[string, () => string]>([
      [
        "tampered payload (a different player id, original MAC)",
        () =>
          `v1.${b64url(JSON.stringify(claims({ pid: OTHER_PLAYER_ID })))}.${macB64}`,
      ],
      [
        "a deterministic middle-character MAC flip",
        () => {
          const index = 20;
          const flipped = macB64[index] === "A" ? "B" : "A";
          return `v1.${payloadB64}.${macB64.slice(0, index)}${flipped}${macB64.slice(index + 1)}`;
        },
      ],
      [
        "a non-canonical MAC encoding (same decoded bytes, different last character)",
        () => {
          const last = B64URL_ALPHABET.indexOf(macB64[42]);
          const nonCanonical = B64URL_ALPHABET[last | 1];
          // Proves the case is real: the bytes are identical, only the spelling differs.
          expect(
            Buffer.from(macB64.slice(0, 42) + nonCanonical, "base64url"),
          ).toEqual(Buffer.from(macB64, "base64url"));
          return `v1.${payloadB64}.${macB64.slice(0, 42)}${nonCanonical}`;
        },
      ],
      ["a padded MAC", () => `v1.${payloadB64}.${macB64}=`],
      [
        "signed with the wrong key",
        () => signRaw(JSON.stringify(claims()), OTHER_SECRET),
      ],
      [
        "version prefix v2.",
        () => signRaw(JSON.stringify(claims()), SECRET, "v2"),
      ],
      [
        "version prefix V1.",
        () => signRaw(JSON.stringify(claims()), SECRET, "V1"),
      ],
      ["no version prefix", () => `${payloadB64}.${macB64}`],
      ["the empty string", () => ""],
      ["a.b", () => "a.b"],
      ["a.b.c.d", () => "a.b.c.d"],
      ["validly signed non-JSON", () => signRaw("not json {")],
      [
        "validly signed vfy:true",
        () => signRaw(JSON.stringify(claims({ vfy: true }))),
      ],
      [
        "validly signed non-uuid pid",
        () => signRaw(JSON.stringify(claims({ pid: "yandex-1" }))),
      ],
      [
        "validly signed unknown platform",
        () => signRaw(JSON.stringify(claims({ plt: "web" }))),
      ],
      [
        "validly signed extra claim",
        () => signRaw(JSON.stringify({ ...claims(), admin: true })),
      ],
      [
        "validly signed exp - iat > TTL",
        () =>
          signRaw(
            JSON.stringify(
              claims({
                exp: Math.floor(NOW_MS / 1000) + SESSION_TTL_SECONDS + 1,
              }),
            ),
          ),
      ],
    ])("%s", (_label, build) => {
      expect(verifySessionToken(SECRET, build(), NOW_MS)).toEqual({
        status: "invalid",
      });
    });

    test("a forged MAC with a past exp is invalid, never expired (expiry is checked only after the MAC)", () => {
      const pastIat = Math.floor(NOW_MS / 1000) - 3 * SESSION_TTL_SECONDS;
      const expired = signRaw(
        JSON.stringify(
          claims({ iat: pastIat, exp: pastIat + SESSION_TTL_SECONDS }),
        ),
      );
      // Genuinely signed: expired.
      expect(verifySessionToken(SECRET, expired, NOW_MS)).toEqual({
        status: "expired",
      });
      // Same payload, wrong key: invalid.
      const forged = signRaw(
        JSON.stringify(
          claims({ iat: pastIat, exp: pastIat + SESSION_TTL_SECONDS }),
        ),
        OTHER_SECRET,
      );
      expect(verifySessionToken(SECRET, forged, NOW_MS)).toEqual({
        status: "invalid",
      });
    });
  });

  describe("expiry boundary", () => {
    const token = genuine();
    const exp = Math.floor(NOW_MS / 1000) + SESSION_TTL_SECONDS;

    test("now === exp is expired", () => {
      expect(verifySessionToken(SECRET, token, exp * 1000)).toEqual({
        status: "expired",
      });
    });

    test("one second before exp is still ok", () => {
      expect(verifySessionToken(SECRET, token, (exp - 1) * 1000).status).toBe(
        "ok",
      );
    });
  });

  describe("unusable secrets fail closed", () => {
    test.each([
      ["empty", ""],
      ["one short of the minimum", "x".repeat(MIN_SESSION_SECRET_LENGTH - 1)],
    ])(
      "a %s secret never verifies a token signed with that same key",
      (_label, weak) => {
        expect(isUsableSessionSecret(weak)).toBe(false);
        // HMAC with a weak key is valid crypto — the guard, not the MAC, must refuse it.
        expect(
          verifySessionToken(
            weak,
            signRaw(JSON.stringify(claims()), weak),
            NOW_MS,
          ),
        ).toEqual({ status: "invalid" });
      },
    );

    test.each([
      ["empty", ""],
      ["short", "x".repeat(MIN_SESSION_SECRET_LENGTH - 1)],
    ])("sign throws with an %s secret", (_label, weak) => {
      expect(() =>
        signSessionToken(
          weak,
          { playerId: PLAYER_ID, platform: "yandex_games" },
          NOW_MS,
        ),
      ).toThrow();
    });

    test("exactly the minimum length is usable", () => {
      expect(isUsableSessionSecret("x".repeat(MIN_SESSION_SECRET_LENGTH))).toBe(
        true,
      );
    });
  });

  describe("loadSessionSecret", () => {
    const CANARY = "0271-canary-short"; // < 32 chars

    test("unset → '' and a warn that names the variable", () => {
      const log = { warn: jest.fn() };
      expect(loadSessionSecret(undefined, log)).toBe("");
      expect(log.warn).toHaveBeenCalledTimes(1);
      expect(log.warn.mock.calls[0][0]).toContain("PROFILE_SESSION_SECRET");
      expect(log.warn.mock.calls[0][0]).toContain("503");
    });

    test("too short → '' and a warn that names the variable, never the value or its length", () => {
      const log = { warn: jest.fn() };
      expect(loadSessionSecret(CANARY, log)).toBe("");
      expect(log.warn).toHaveBeenCalledTimes(1);
      const line = String(log.warn.mock.calls[0][0]);
      expect(line).toContain("PROFILE_SESSION_SECRET");
      expect(line).not.toContain(CANARY);
      expect(line).not.toMatch(
        new RegExp(`(^|[^0-9])${CANARY.length}([^0-9]|$)`),
      );
    });

    test("a usable secret is returned with no warn", () => {
      const log = { warn: jest.fn() };
      expect(loadSessionSecret(SECRET, log)).toBe(SECRET);
      expect(log.warn).not.toHaveBeenCalled();
    });
  });
});
