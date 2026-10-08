// The citizenship card's one-line status notice (task 0397; owner rulings
// Q1–Q3, 2026-10-06). Pure: the card hands in what it knows and renders the
// answer. Lives outside the card so every input combination is unit-testable
// without a browser.
//
// Display-only. Nothing here grants or withholds a benefit: the paid answer the
// ad gate uses is `isCurrentPlayerPaidCitizen()` (task 0248), and the notice
// only reads it (ADR-116 Decision 4).

import type { ProfileVerificationStatus } from "./CitizenshipStatus";
import {
  flashist_logEventAnalytics,
  flashistConstants,
} from "./flashist/FlashistFacade";

/**
 * - `checking`: no read applied yet — replaces the guest card, so a logged-in
 *   player is never offered a login button while the read is in flight.
 * - `read_failed`: the read failed; text plus the Restart game button.
 * - `still_failing`: the same, after a restart from that button did not help.
 * - `unverified`: a citizen whose session is not confirmed; text only (Q1, Q3).
 * - `verified_paid`: a verified session of a paid citizen; the card thanks them
 *   for supporting the game (task 0407 wording).
 * - `none`: nothing new (guests, verified non-paid players, unverified
 *   non-citizens — they cannot have paid).
 */
export type CitizenshipNotice =
  | "none"
  | "checking"
  | "read_failed"
  | "still_failing"
  | "unverified"
  | "verified_paid";

export interface CitizenshipNoticeInputs {
  verificationStatus: ProfileVerificationStatus;
  /** The card's citizen presentation, including a just-confirmed purchase. */
  isCitizen: boolean;
  /** `isCurrentPlayerPaidCitizen()` — the same value the 0248 ad gate reads. */
  isPaidCitizen: boolean;
  /** This page load follows a press of the read-failed Restart game button. */
  restartedAfterReadFailure: boolean;
}

export function deriveCitizenshipNotice(
  inputs: CitizenshipNoticeInputs,
): CitizenshipNotice {
  switch (inputs.verificationStatus) {
    case "unknown":
      return "checking";
    case "guest":
      return "none";
    case "read_failed":
      return inputs.restartedAfterReadFailure ? "still_failing" : "read_failed";
    case "unverified":
      return inputs.isCitizen ? "unverified" : "none";
    case "verified":
      return inputs.isPaidCitizen ? "verified_paid" : "none";
  }
}

// At most once per page load each (owner ruling Q2). In memory on purpose: a
// reload is a new page load.
let unverifiedReported = false;
let readFailedReported = false;

/**
 * Log the notice the card just applied. `Citizenship:Status:Unverified` and
 * `Citizenship:Status:ReadFailed` (the latter shared by `still_failing`), each
 * at most once per page load; every other notice logs nothing. No ids, no paid
 * flag, no value.
 */
export function reportCitizenshipNoticeShown(notice: CitizenshipNotice): void {
  if (notice === "unverified") {
    if (unverifiedReported) {
      return;
    }
    unverifiedReported = true;
    flashist_logEventAnalytics(
      flashistConstants.analyticEvents.CITIZENSHIP_STATUS_UNVERIFIED,
    );
    return;
  }
  if (notice === "read_failed" || notice === "still_failing") {
    if (readFailedReported) {
      return;
    }
    readFailedReported = true;
    flashist_logEventAnalytics(
      flashistConstants.analyticEvents.CITIZENSHIP_STATUS_READ_FAILED,
    );
  }
}

export function resetCitizenshipNoticeReportedForTests(): void {
  unverifiedReported = false;
  readFailedReported = false;
}
