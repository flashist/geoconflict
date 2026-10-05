// Profile:Login:SignatureAge:* and Profile:Login:Signature:Refetch:* (task 0372):
// how old the Yandex signed player data is when login takes it, and whether a
// second signed call returns a newer one. Diagnostics only — nothing here changes
// what login sends. Pure helpers only — FlashistFacade fires the events.
//
// ⛔ The signature is a credential, and its payload holds the player's public name
// and avatar (152-ФЗ). The reader below returns ONLY the top-level `issuedAt`
// number; the decoded text and object stay local to it and are dropped. Nothing
// here logs, stores or returns any other part of the signature.

import { SIGNATURE_MAX } from "../core/profile/LoginContract";

// The freshness window and stale-age bracket edges of task 0366, FROZEN here on
// purpose. ADR-121 (task 0391) widened the server's window to 24 h and re-cut its
// past brackets; these client labels keep 0366's edges so 0372's GameAnalytics
// series stay comparable across that change. Only the FUTURE side (300 s limit,
// 900 s split) still matches the server, and a parity test sweeps that side.
const FRESH_MAX_AGE_SECONDS = 900;
const FRESH_MAX_FUTURE_SECONDS = 300;
const FUTURE_SMALL_MAX_SECONDS = 900;
const PAST_20M_SECONDS = 1_200;
const PAST_30M_SECONDS = 1_800;
const PAST_1H_SECONDS = 3_600;
const PAST_6H_SECONDS = 21_600;
const PAST_24H_SECONDS = 86_400;

/**
 * The closed list of age labels — the only strings ever appended to the
 * SignatureAge event. `Fresh` is ≤ 15 min old / ≤ 5 min ahead — the pre-ADR-121
 * window, which since task 0391 no longer equals the server's `ok` (24 h). The
 * eight others are 0366's stale brackets in PascalCase; `Unreadable` is
 * client-only.
 */
export type SignatureAgeLabel =
  | "Fresh"
  | "Future5m15m"
  | "FutureOver15m"
  | "Past15m20m"
  | "Past20m30m"
  | "Past30m1h"
  | "Past1h6h"
  | "Past6h24h"
  | "PastOver24h"
  | "Unreadable";

/**
 * Client label → the 0366 server bracket it matched (one to one). Historical since
 * ADR-121 (task 0391): the server no longer emits the five `past_*` values under
 * 24 h, nor `past_over_24h` (now split into three). Kept, name and all, so the
 * labels keep their documented meaning.
 */
export const SIGNATURE_AGE_TO_SERVER_BRACKET = {
  Future5m15m: "future_5m_15m",
  FutureOver15m: "future_over_15m",
  Past15m20m: "past_15m_20m",
  Past20m30m: "past_20m_30m",
  Past30m1h: "past_30m_1h",
  Past1h6h: "past_1h_6h",
  Past6h24h: "past_6h_24h",
  PastOver24h: "past_over_24h",
} as const;

/** The outcome of comparing a second signed call's `issuedAt` with the first. */
export type SignatureRefetchResult = "Newer" | "Same" | "Older" | "Failed";

/**
 * The top-level `issuedAt` (seconds) from the payload half of a
 * `<signature>.<payload>` envelope, or null when anything about it is wrong.
 * Splits on the first dot and tolerates URL-safe and unpadded base64, as the
 * server does — but `atob` is stricter than the server's Node `Buffer` decode on
 * malformed base64 (a stray non-base64 character, data after `=`, over-padding):
 * those read as null here (`Unreadable`) even where the server can decode them.
 * Never throws, and returns nothing but the number.
 */
export function readSignatureIssuedAtSeconds(signed: unknown): number | null {
  try {
    if (typeof signed !== "string" || signed.length > SIGNATURE_MAX) {
      return null;
    }
    const dotIndex = signed.indexOf(".");
    if (dotIndex <= 0 || dotIndex === signed.length - 1) {
      return null;
    }
    const payloadBase64 = signed
      .slice(dotIndex + 1)
      .replace(/-/g, "+")
      .replace(/_/g, "/");
    // A byte string, not UTF-8 text. Safe to parse as JSON directly: every byte of
    // a UTF-8 multibyte character is ≥ 0x80, never `"` or `\`, so the structure —
    // and the one number read — is identical.
    const parsed: unknown = JSON.parse(atob(payloadBase64));
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      return null;
    }
    const issuedAt = (parsed as Record<string, unknown>).issuedAt;
    if (typeof issuedAt !== "number" || !Number.isFinite(issuedAt)) {
      return null;
    }
    return issuedAt;
  } catch {
    return null;
  }
}

/**
 * Which label an `issuedAt` falls in, against the device clock `nowMs`. The
 * same comparisons as 0366's server: the window's limits (exactly 900 s old /
 * 300 s ahead) are `Fresh`; each bracket is open below and closed above. (The
 * server's old limit is 24 h since ADR-121; these labels stay on 0366's edges.)
 */
export function signatureAgeLabel(
  issuedAtSeconds: number | null,
  nowMs: number,
): SignatureAgeLabel {
  if (issuedAtSeconds === null) {
    return "Unreadable";
  }
  const ageMs = nowMs - issuedAtSeconds * 1000;
  if (
    ageMs <= FRESH_MAX_AGE_SECONDS * 1000 &&
    -ageMs <= FRESH_MAX_FUTURE_SECONDS * 1000
  ) {
    return "Fresh";
  }
  if (ageMs < 0) {
    return -ageMs <= FUTURE_SMALL_MAX_SECONDS * 1000
      ? "Future5m15m"
      : "FutureOver15m";
  }
  if (ageMs <= PAST_20M_SECONDS * 1000) {
    return "Past15m20m";
  }
  if (ageMs <= PAST_30M_SECONDS * 1000) {
    return "Past20m30m";
  }
  if (ageMs <= PAST_1H_SECONDS * 1000) {
    return "Past30m1h";
  }
  if (ageMs <= PAST_6H_SECONDS * 1000) {
    return "Past1h6h";
  }
  if (ageMs <= PAST_24H_SECONDS * 1000) {
    return "Past6h24h";
  }
  return "PastOver24h";
}

/** True for the six past-stale labels (older than 0366's 900 s window). */
export function isPastStale(label: SignatureAgeLabel): boolean {
  return (
    label === "Past15m20m" ||
    label === "Past20m30m" ||
    label === "Past30m1h" ||
    label === "Past1h6h" ||
    label === "Past6h24h" ||
    label === "PastOver24h"
  );
}

/** How the second call's `issuedAt` compares with the first. No clock involved. */
export function compareIssuedAt(
  firstSeconds: number,
  secondSeconds: number,
): "Newer" | "Same" | "Older" {
  if (secondSeconds > firstSeconds) {
    return "Newer";
  }
  if (secondSeconds === firstSeconds) {
    return "Same";
  }
  return "Older";
}
