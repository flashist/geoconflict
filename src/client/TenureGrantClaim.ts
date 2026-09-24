// Client → profile-server claim of the one-time tenure XP grant (task 0253;
// ADR-112 as amended by the 2026-09-15 redesign). Follows NameChangeRequest.ts:
// the orchestration lives outside the card so its outcome mapping and analytics
// are unit-testable, and it NEVER throws — every path resolves to a result.
//
// THE SERVER RECORD IS THE MARKER. Nothing is stored on the device. The claim
// runs only while `POST /v1/login` says `grantChecks.tenure === "pending"`; a
// checked claim writes a server row (0 XP included), after which every login
// says `done`. A failure is retried ONLY if it happened before the server
// recorded the check (no connection, a refusal, an error it rolled back):
// nothing was written, the next page load's login still says `pending`, and
// the claim runs again.
//
// ⚠️ Residual, by design: a failure AFTER the server committed — a timeout, a
// dropped connection, a gateway error or a 200 the client could not read — is
// NOT retried. The row exists (XP possibly granted), the next login says
// `done`, and no popup ever follows.

import {
  TenureGrantResponseSchema,
  type TenureEvidence,
} from "../core/profile/TenureGrantContract";
import {
  FlashistFacade,
  flashist_logEventAnalytics,
  flashistConstants,
} from "./flashist/FlashistFacade";
import { getLoginOutcome, profileFetch } from "./ProfileSession";
import { readTenureEvidence } from "./TenureEvidence";

const TENURE_GRANT_FETCH_TIMEOUT_MS = 10_000;

export type TenureGrantClaimResult =
  /** Nothing was sent: gate off, no session, already checked, storage unreadable, or already tried this load. */
  | { status: "skipped" }
  /** The server granted `xpAwarded` XP; `xp` is the new total. */
  | { status: "granted"; xpAwarded: number; xp: number }
  /** The server recorded a final check: 0 XP, or an earlier check. */
  | { status: "below_minimum" | "duplicate" }
  /**
   * No usable server answer. Retried next page load only if the server wrote
   * nothing; after a commit whose answer was lost, never (see the header).
   */
  | { status: "failed" };

// Once per page load, however many times the card connects.
let attempted = false;

/** Test seam — forget this load's attempt. */
export function resetTenureClaimForTests(): void {
  attempted = false;
}

function logRejected(suffix: "BelowMinimum" | "Duplicate"): void {
  flashist_logEventAnalytics(
    `${flashistConstants.analyticEvents.CITIZENSHIP_TENURE_GRANT_REJECTED}:${suffix}`,
  );
}

/** Reading `window.localStorage` itself can throw (blocked iframe storage). */
function readEvidence(): TenureEvidence | null {
  try {
    return readTenureEvidence(localStorage);
  } catch {
    return null;
  }
}

/**
 * Claim the tenure grant for the logged-in player, at most once per page load.
 * The caller (the citizenship card) is already behind the citizenship gate; the
 * gate is checked here too, so this module can never claim on its own.
 */
export async function maybeClaimTenureGrant(): Promise<TenureGrantClaimResult> {
  if (attempted) {
    return { status: "skipped" };
  }
  attempted = true;
  try {
    // Task 0236's combined gate: CITIZENSHIP_CARD_ENABLED AND citizenship_ui.
    if (!(await FlashistFacade.instance.isCitizenshipSurfacesEnabled())) {
      return { status: "skipped" };
    }
    // Null = guest, degraded boot, failed login or unconfigured API.
    const login = await getLoginOutcome();
    if (login === null || login.grantChecks.tenure !== "pending") {
      return { status: "skipped" };
    }
    // Null only when storage cannot be read (plan D1): send nothing rather
    // than a 0/0 that would burn the one-time check. No event either.
    const evidence = readEvidence();
    if (evidence === null) {
      return { status: "skipped" };
    }

    // Bearer, the one re-login and the one retry are profileFetch's. The body
    // carries no id — the session is the caller.
    const result = await profileFetch("/v1/profile/tenure-grant", {
      method: "POST",
      body: JSON.stringify({ evidence }),
      timeoutMs: TENURE_GRANT_FETCH_TIMEOUT_MS,
    });
    if (result.kind === "response" && result.response.status === 200) {
      const json: unknown = await result.response.json().catch(() => null);
      const parsed = TenureGrantResponseSchema.safeParse(json);
      if (parsed.success) {
        switch (parsed.data.status) {
          case "granted":
            flashist_logEventAnalytics(
              flashistConstants.analyticEvents.CITIZENSHIP_TENURE_GRANT_CLAIMED,
              parsed.data.xpAwarded,
            );
            return {
              status: "granted",
              xpAwarded: parsed.data.xpAwarded,
              xp: parsed.data.xp,
            };
          case "below_minimum":
            logRejected("BelowMinimum");
            return { status: "below_minimum" };
          case "duplicate":
            logRejected("Duplicate");
            return { status: "duplicate" };
        }
      }
    }
  } catch {
    // Fall through to failed — never throw to the card.
  }
  flashist_logEventAnalytics(
    flashistConstants.analyticEvents.CITIZENSHIP_TENURE_GRANT_CLAIM_FAILED,
  );
  return { status: "failed" };
}
