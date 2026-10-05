// Yandex Games signed PLAYER data, checked at login (task 0325; ADR-116).
//
// The client sends `getPlayer({ signed: true }).signature` — the same
// `<signature>.<payload>` HMAC envelope as a signed purchase, keyed by the same
// per-game secret (YANDEX_PAYMENTS_SECRET). The HMAC half is shared with the
// purchase check (YandexSignature.ts → verifyHmacEnvelope), so both constructions
// are accepted there; S0 (2026-09-29) found Yandex uses the decoded-JSON one.
//
// Payload shape, from S0 (field names only):
//   { algorithm, issuedAt, requestPayload, data: { id, uniqueID, lang, publicName,
//     avatarIdHash, scopePermissions, payingStatus, hasPremium } }
//
// This module reads EXACTLY two fields and drops everything else:
//   * `data.uniqueID` — the id the SDK's getUniqueID() returns, which is what the
//     client asserts and what player_identities stores. `data.id` is NOT read and
//     NOT required to equal it (both sit inside the same HMAC, so equality adds no
//     security, only a way to fail). No fallback to `data.id`: a missing uniqueID is
//     the "Yandex changed the payload" signal `bad_payload` exists to show.
//   * `issuedAt` — top level, in SECONDS, and REQUIRED: a payload without it could be
//     replayed forever (owner ruling Q3), so it never verifies.
// `algorithm` is never read or pinned (owner ruling D3): the check hardcodes
// HMAC-SHA256 and the field cannot choose it. `requestPayload` is never read.
//
// ⛔ The signature is a CREDENTIAL — a captured one logs in as its owner for up to
// 24 h after `issuedAt` (+5 min skew); see ADR-121 R1. Never log it, never persist
// it, never put it in a metric or an error message. (Unlike a purchase, whose
// decoded payload IS stored as `rawPayload`.) The public name and avatar pass
// through here and are dropped: never returned, stored or logged (152-ФЗ).
//
// A `stale` result carries how far `issuedAt` was from now as one of a FIXED set of
// brackets (task 0366; re-cut by ADR-121, task 0391) — never the raw age, which does
// not leave this module. It also carries the signed id (ADR-121 Decision 2), ONLY so
// the caller can compare it with the asserted id: never logged, never a label, never
// returned to a client.
//
// Never throws.

import type { StaleSignatureAgeBracket } from "./Telemetry";
import { verifyHmacEnvelope } from "./YandexSignature";

/**
 * A signature older than this (by its own `issuedAt`) is `stale`. 24 h (ADR-121;
 * was 900 s under ADR-116).
 */
export const LOGIN_SIGNATURE_MAX_AGE_SECONDS = 86_400;
/** A signature dated further ahead than this (clock skew) is `stale`. 5 min. */
export const LOGIN_SIGNATURE_MAX_FUTURE_SECONDS = 300;

// Upper edges of the stale-age brackets (task 0366; past side re-cut by ADR-121,
// task 0391), inclusive. The lower edges are the window's own limits above.
const STALE_FUTURE_SMALL_MAX_SECONDS = 900;
const STALE_PAST_48H_SECONDS = 172_800;
const STALE_PAST_7D_SECONDS = 604_800;

export type PlayerSignatureResult =
  | { status: "ok"; platformUserId: string; issuedAtMs: number }
  /** No usable secret configured — nothing can verify. */
  | { status: "no_secret" }
  /** Bad structure, bad base64, or the HMAC did not match. */
  | { status: "bad_signature" }
  /** The HMAC passed, but the payload is not JSON, or lacks `data.uniqueID` / `issuedAt`. */
  | { status: "bad_payload" }
  /**
   * Outside the freshness window (too old, or too far in the future). Carries the
   * signed id ONLY so the caller can check it before the age (ADR-121 Decision 2).
   */
  | {
      status: "stale";
      platformUserId: string;
      ageBracket: StaleSignatureAgeBracket;
    };

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/**
 * Which fixed bracket a signature's age falls in (task 0366; past side re-cut by
 * ADR-121, task 0391). `ageMs` is `now - issuedAt`: positive is past, negative is
 * future. Only meaningful for an age OUTSIDE the freshness window (> 86 400 s old
 * or > 300 s ahead) — that is the only place it is called. Pure number
 * comparisons; never throws.
 */
export function staleSignatureAgeBracket(
  ageMs: number,
): StaleSignatureAgeBracket {
  if (ageMs < 0) {
    return -ageMs <= STALE_FUTURE_SMALL_MAX_SECONDS * 1000
      ? "future_5m_15m"
      : "future_over_15m";
  }
  if (ageMs <= STALE_PAST_48H_SECONDS * 1000) {
    return "past_24h_48h";
  }
  if (ageMs <= STALE_PAST_7D_SECONDS * 1000) {
    return "past_48h_7d";
  }
  return "past_over_7d";
}

export function verifySignedPlayer(
  signed: string,
  secret: string,
  nowMs: number,
): PlayerSignatureResult {
  try {
    if (secret.length === 0) {
      return { status: "no_secret" };
    }
    const envelope = verifyHmacEnvelope(signed, secret);
    if (envelope === null) {
      return { status: "bad_signature" };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(envelope.decodedJson);
    } catch {
      return { status: "bad_payload" };
    }
    const root = asRecord(parsed);
    const data = asRecord(root?.data);
    const uniqueId = data?.uniqueID;
    if (typeof uniqueId !== "string" || uniqueId.length === 0) {
      return { status: "bad_payload" };
    }
    const issuedAt = root?.issuedAt;
    if (typeof issuedAt !== "number" || !Number.isFinite(issuedAt)) {
      return { status: "bad_payload" };
    }

    const issuedAtMs = issuedAt * 1000;
    const ageMs = nowMs - issuedAtMs;
    // Exactly at either limit still counts as fresh.
    if (
      ageMs > LOGIN_SIGNATURE_MAX_AGE_SECONDS * 1000 ||
      -ageMs > LOGIN_SIGNATURE_MAX_FUTURE_SECONDS * 1000
    ) {
      return {
        status: "stale",
        platformUserId: uniqueId,
        ageBracket: staleSignatureAgeBracket(ageMs),
      };
    }
    return { status: "ok", platformUserId: uniqueId, issuedAtMs };
  } catch {
    // Belt and braces — nothing above is expected to throw. Fail closed.
    return { status: "bad_signature" };
  }
}
