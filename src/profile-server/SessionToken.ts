// Stateless login session token (task 0271, ADR-113; design report §2).
//
//   v1.<base64url(JSON payload)>.<base64url(HMAC-SHA256(secret, "v1." + payloadB64))>
//   payload = { pid, plt, iat, exp, vfy: false }   (iat/exp in seconds, TTL 24 h)
//
// 🔓 Security gained today: NONE. Anyone who asserts a Yandex id at POST /v1/login
// gets a token for it. The token takes Yandex ids out of URLs and logs and gives one
// later verification point (0267). A `vfy:false` token must NEVER count as a proven
// owner — not for paid state (0250), not for anything else.
//
// The payload is base64, NOT encrypted: whoever holds a token can read its `pid`.
// Accepted (owner ruling D2, 2026-09-15): the holder only ever sees their OWN internal
// id, and no public route accepts a player id as input.
//
// Key rotation: one key, no key id, no "previous key" overlap. Rotating (a new
// PROFILE_SESSION_SECRET, or rm the box's persist file and redeploy) makes every live
// token `session_invalid`; the client logs in again once and nothing stored is lost.
// Once 0267 issues `vfy:true` tokens, revisit a key id / dual key — a `v2` prefix is
// the upgrade path. No refresh endpoint and no revocation (design §2).
//
// ⛔ Never log a token, a claim, or the secret from here or from a caller.

import { createHmac, timingSafeEqual } from "crypto";
import { z } from "zod";
import { PlatformSchema, type Platform } from "../core/profile/Platform";

export const SESSION_TOKEN_VERSION = "v1";
export const SESSION_TTL_SECONDS = 86_400;
export const MIN_SESSION_SECRET_LENGTH = 32;

export interface SessionClaims {
  pid: string;
  plt: Platform;
  iat: number;
  exp: number;
  vfy: false;
}

export type SessionVerification =
  | { status: "ok"; claims: SessionClaims }
  | { status: "expired" }
  | { status: "invalid" };

// HMAC-SHA256 is 32 bytes → exactly 43 unpadded base64url characters.
const MAC_B64URL_RE = /^[A-Za-z0-9_-]{43}$/;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SessionClaimsSchema = z.strictObject({
  pid: z.string().regex(UUID_RE),
  plt: PlatformSchema,
  iat: z.number().int().nonnegative(),
  exp: z.number().int().nonnegative(),
  vfy: z.literal(false),
});

const INVALID: SessionVerification = { status: "invalid" };

/**
 * An empty or short key is refused everywhere. HMAC with "" is valid crypto, so
 * without this guard an unset secret would happily sign AND verify tokens.
 */
export function isUsableSessionSecret(secret: string): boolean {
  return secret.length >= MIN_SESSION_SECRET_LENGTH;
}

function computeMac(secret: string, signingInput: string): Buffer {
  return createHmac("sha256", secret).update(signingInput).digest();
}

export function signSessionToken(
  secret: string,
  subject: { playerId: string; platform: Platform },
  nowMs: number = Date.now(),
): { token: string; expiresAt: string } {
  if (!isUsableSessionSecret(secret)) {
    // Second guard: the login route already answered 503 before reaching here.
    throw new Error("signSessionToken: session secret is unusable");
  }
  const iat = Math.floor(nowMs / 1000);
  const claims: SessionClaims = {
    pid: subject.playerId,
    plt: subject.platform,
    iat,
    exp: iat + SESSION_TTL_SECONDS,
    vfy: false,
  };
  const payloadB64 = Buffer.from(JSON.stringify(claims), "utf8").toString(
    "base64url",
  );
  const signingInput = `${SESSION_TOKEN_VERSION}.${payloadB64}`;
  const mac = computeMac(secret, signingInput).toString("base64url");
  return {
    token: `${signingInput}.${mac}`,
    expiresAt: new Date(claims.exp * 1000).toISOString(),
  };
}

/**
 * The order is load-bearing: nothing about the payload — not even whether it is
 * JSON, and in particular not its expiry — is looked at until the MAC has passed,
 * so a forged token is always `invalid` and never `expired`.
 */
export function verifySessionToken(
  secret: string,
  token: string,
  nowMs: number = Date.now(),
): SessionVerification {
  if (!isUsableSessionSecret(secret)) {
    return INVALID;
  }
  const parts = token.split(".");
  if (parts.length !== 3) {
    return INVALID;
  }
  const [version, payloadB64, macB64] = parts;
  if (version !== SESSION_TOKEN_VERSION) {
    return INVALID;
  }
  // Canonical spelling only: base64url decoding ignores the last character's two
  // spare bits, so without the re-encode check a "tampered" last character can
  // decode to the SAME bytes and still verify.
  if (!MAC_B64URL_RE.test(macB64)) {
    return INVALID;
  }
  const provided = Buffer.from(macB64, "base64url");
  if (provided.toString("base64url") !== macB64) {
    return INVALID;
  }
  const expected = computeMac(secret, `${version}.${payloadB64}`);
  // timingSafeEqual throws on a length mismatch — guard first (InternalAuth.ts).
  if (
    provided.length !== expected.length ||
    !timingSafeEqual(provided, expected)
  ) {
    return INVALID;
  }

  let decoded: unknown;
  try {
    decoded = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
  } catch {
    return INVALID;
  }
  const parsed = SessionClaimsSchema.safeParse(decoded);
  if (!parsed.success) {
    return INVALID;
  }
  const claims = parsed.data;
  if (claims.exp - claims.iat > SESSION_TTL_SECONDS) {
    return INVALID;
  }
  if (claims.exp * 1000 <= nowMs) {
    return { status: "expired" };
  }
  return { status: "ok", claims };
}

/**
 * The effective secret, or "" when it is unusable (unset or too short). Takes the
 * RAW value so Server.ts reads it as a literal `process.env.PROFILE_SESSION_SECRET`
 * — the form the config-parity checker enumerates. Warns by NAME only: never the
 * value, never its length.
 */
export function loadSessionSecret(
  raw: string | undefined,
  log: { warn(message: string): void },
): string {
  const value = raw ?? "";
  if (value.length === 0) {
    log.warn(
      "PROFILE_SESSION_SECRET is not set — POST /v1/login and Bearer sessions disabled (503)",
    );
    return "";
  }
  if (!isUsableSessionSecret(value)) {
    log.warn(
      `PROFILE_SESSION_SECRET is too short (minimum ${MIN_SESSION_SECRET_LENGTH} characters) — treated as unset (503)`,
    );
    return "";
  }
  return value;
}
