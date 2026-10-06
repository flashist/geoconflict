// The login's verification decision, as one pure function (task 0325).
//
// The login route calls this and COUNTS the outcome
// (`geoconflict.profile.login.verification`); since S3a (task 0340) it also mints
// the session's `vfy` claim from `verified` — `vfy:true` only for `ok`.
//
// The fail rule, for every outcome but `ok`: an UNVERIFIED session, never a refused
// login. ⛔ Never log the signature (see PlayerSignature.ts).
//
// ADR-121 (task 0391): the id is checked BEFORE the age, so `stale` means "the right
// player, too old" and a genuine signature for someone else is `id_mismatch`
// whatever its age. The signed id stays inside this function: `LoginVerification`
// has no field for it, so it cannot reach the route, a metric or a response.

import { verifySignedPlayer } from "./PlayerSignature";
import type {
  LoginVerificationOutcome,
  StaleSignatureAgeBracket,
} from "./Telemetry";

export interface LoginVerification {
  outcome: LoginVerificationOutcome;
  /** True only for `ok`: a fresh, genuine signature for the SAME id the login asserts. */
  verified: boolean;
  /** Present only when `outcome === "stale"`: how far `issuedAt` was from now (task 0366). */
  staleAgeBracket?: StaleSignatureAgeBracket;
}

export function classifyLoginSignature(
  signature: string | undefined,
  assertedPlatformUserId: string,
  secret: string,
  nowMs: number,
): LoginVerification {
  if (signature === undefined) {
    return { outcome: "absent", verified: false };
  }
  const result = verifySignedPlayer(signature, secret, nowMs);
  if (result.status !== "ok" && result.status !== "stale") {
    return { outcome: result.status, verified: false };
  }
  // ADR-121 Decision 2: id first, then age — `stale` means "right player, too old".
  // A genuine signature for someone else is not proof of THIS login's id.
  if (result.platformUserId !== assertedPlatformUserId) {
    return { outcome: "id_mismatch", verified: false };
  }
  if (result.status === "stale") {
    return {
      outcome: "stale",
      verified: false,
      staleAgeBracket: result.ageBracket,
    };
  }
  return { outcome: "ok", verified: true };
}
