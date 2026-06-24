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

function tokensMatch(provided: string, expected: string): boolean {
  if (expected.length === 0 || provided.length !== expected.length) {
    return false; // timingSafeEqual throws on length mismatch — guard first.
  }
  return timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
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
