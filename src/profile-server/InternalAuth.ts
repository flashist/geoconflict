// App-layer auth for the internal crediting endpoint.
//
// Defense-in-depth: nginx's `location /internal/` IP-allowlist (setup-profile.sh)
// is the network layer; this bearer-token check is the independent app layer, so a
// misconfigured allowlist or an attacker already on an allowed host still needs the
// shared PROFILE_INTERNAL_TOKEN. Fails CLOSED — an empty/unset token rejects every
// request rather than defaulting to open.

import { timingSafeEqual } from "crypto";
import type { NextFunction, Request, Response } from "express";

const BEARER_PREFIX = "Bearer ";

/**
 * Constant-time shared-secret comparison, fail-CLOSED.
 *
 * Exported since task 0277 so a second shared-secret check can reuse THIS
 * comparison rather than grow a parallel one — ADR-114 counts "one more place a
 * fail-closed check must be right" as a cost, and reuse removes it instead of
 * accepting it. Behaviour is unchanged by the export.
 */
export function tokensMatch(provided: string, expected: string): boolean {
  // ⚠️ The guard counts UTF-8 BYTES, not JS string length (review R1). timingSafeEqual
  // compares Buffers, so the lengths that must match are the buffers' — and the two
  // disagree for any non-ASCII character. Guarding on string length let a wrong secret
  // of equal string length but different byte length reach timingSafeEqual, which
  // THROWS RangeError: a 500 instead of a 401 here, and in the alert relay a 500
  // instead of the contracted 200 with the out-of-band alarm never firing.
  const expectedBytes = Buffer.from(expected);
  const providedBytes = Buffer.from(provided);
  if (
    expectedBytes.length === 0 ||
    providedBytes.length !== expectedBytes.length
  ) {
    return false;
  }
  return timingSafeEqual(providedBytes, expectedBytes);
}

export function internalAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const expected = process.env.PROFILE_INTERNAL_TOKEN ?? "";
  const header = req.get("authorization") ?? "";
  const provided = header.startsWith(BEARER_PREFIX)
    ? header.slice(BEARER_PREFIX.length)
    : "";

  if (!tokensMatch(provided, expected)) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  next();
}
