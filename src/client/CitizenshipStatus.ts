import type { PlayerProfileView } from "./PlayerProfileView";

/**
 * The page's one answer to "is this player a citizen?" (task 0302), for
 * surfaces that lock a citizen perk. The citizenship card is the only writer:
 * it already reads the profile, so no second profile fetch is made and
 * `Citizenship:Earned:XP` cannot fire twice.
 *
 * - `unknown`: nothing published yet (profile still loading, card disabled).
 * - `not_citizen`: guest, non-citizen, or a profile read that failed.
 * - `citizen`: a successfully read citizen profile, or a paid grant the server
 *   confirmed.
 *
 * Every perk treats anything but `citizen` as locked (owner ruling 2026-09-27,
 * Q2): unknown and unreadable fail closed.
 */
export type CitizenshipStatus = "unknown" | "not_citizen" | "citizen";

export function deriveCitizenshipStatus(
  profile: PlayerProfileView | null,
  paidGrantConfirmed: boolean,
): CitizenshipStatus {
  if (
    profile !== null &&
    ((profile.isAuthoritative && profile.isCitizen) || paidGrantConfirmed)
  ) {
    return "citizen";
  }
  return "not_citizen";
}

type CitizenshipStatusListener = (status: CitizenshipStatus) => void;

let currentStatus: CitizenshipStatus = "unknown";
const listeners = new Set<CitizenshipStatusListener>();

export function publishCitizenshipStatus(status: CitizenshipStatus): void {
  if (status === currentStatus) {
    return;
  }
  currentStatus = status;
  for (const listener of listeners) {
    listener(status);
  }
}

export function getCitizenshipStatus(): CitizenshipStatus {
  return currentStatus;
}

/** Returns an unsubscribe function. The listener is not called on subscribe. */
export function subscribeCitizenshipStatus(
  listener: CitizenshipStatusListener,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function resetCitizenshipStatusForTests(): void {
  currentStatus = "unknown";
  listeners.clear();
}
