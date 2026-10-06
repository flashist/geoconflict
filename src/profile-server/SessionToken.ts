// Stateless login session token (task 0271, ADR-113; design report §2).
//
//   v1.<base64url(JSON payload)>.<base64url(HMAC-SHA256(secret, "v1." + payloadB64))>
//   payload = { pid, plt, iat, exp, vfy }   (iat/exp in seconds, TTL 24 h)
//
// 🔓 A `vfy:false` token gains NO security: anyone who asserts a Yandex id at
// POST /v1/login gets one for it. The token takes Yandex ids out of URLs and logs and
// carries the login's one verification result (`vfy`). A `vfy:false` token must
// NEVER count as a proven owner — not for paid state (0250), not for anything else.
//
// `vfy` is a boolean since task 0325, S2, which WIDENED the claim ahead of the first
// `vfy:true` mint (S3a) so that a live verified token still parses if the server is
// rolled back to S2. S2 minted only `false`; since S3a (task 0340) the login mints
// `true` for outcome `ok`. ⛔ Never roll a server that minted `vfy:true` straight back
// to a pre-S2 build: every live verified token would turn `session_invalid`.
//
// The payload is base64, NOT encrypted: whoever holds a token can read its `pid`.
// Accepted (owner ruling D2, 2026-09-15): the holder only ever sees their OWN internal
// id, and no public route accepts a player id as input.
//
// Key rotation: one key, no key id, no "previous key" overlap. Rotating (a new
// PROFILE_SESSION_SECRET, or rm the box's persist file and redeploy) makes every live
// token `session_invalid`; the client logs in again once and nothing stored is lost.
// Since task 0340 issues `vfy:true` tokens, rotation also drops every VERIFIED
// session; the client's relogin makes a fresh signed call, so it re-verifies. Revisit
// a key id / dual key later — a `v2` prefix is the upgrade path. No refresh endpoint
// and no revocation (design §2).
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
  /** True only for a login whose Yandex signed player data verified (0325 S3a). */
  vfy: boolean;
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
  vfy: z.boolean(),
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
  subject: { playerId: string; platform: Platform; verified?: boolean },
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
    // Strictly `=== true`: anything else — absent, undefined, a truthy non-boolean —
    // mints an unverified session.
    vfy: subject.verified === true,
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
