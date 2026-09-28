/**
 * The page's one answer to "does this player have an approved name?" (task
 * 0321), for the start-screen name box, which shows that name locked. The
 * citizenship card is the only writer: it already reads the profile, so no
 * second profile fetch is made and `Citizenship:Earned:XP` cannot fire twice
 * (the same single-reader rule as `CitizenshipStatus.ts`).
 *
 * - `unknown`: nothing published yet (profile still loading, card disabled,
 *   guest, or every read so far failed). The name box behaves as before 0321.
 * - `none`: an authoritative profile read shows no approved name
 *   (`display_name` is null — never set, or cleared by an operator, task 0314).
 * - `approved`: an authoritative profile read shows this `display_name`
 *   (owner ruling Q1, 2026-09-28: regardless of citizen status).
 *
 * Only a SUCCESSFUL read is ever published: a failed read after a good one
 * leaves the last answer in place, so it neither locks nor unlocks the box.
 */
export type ApprovedNameState =
  | { kind: "unknown" }
  | { kind: "none" }
  | { kind: "approved"; name: string };

type ApprovedNameListener = (state: ApprovedNameState) => void;

const UNKNOWN: ApprovedNameState = { kind: "unknown" };

let currentState: ApprovedNameState = UNKNOWN;
const listeners = new Set<ApprovedNameListener>();

function isSameState(a: ApprovedNameState, b: ApprovedNameState): boolean {
  if (a.kind === "approved" && b.kind === "approved") {
    return a.name === b.name;
  }
  return a.kind === b.kind;
}

export function publishApprovedName(state: ApprovedNameState): void {
  if (isSameState(state, currentState)) {
    return;
  }
  currentState = state;
  for (const listener of listeners) {
    listener(state);
  }
}

export function getApprovedName(): ApprovedNameState {
  return currentState;
}

/** Returns an unsubscribe function. The listener is not called on subscribe. */
export function subscribeApprovedName(
  listener: ApprovedNameListener,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function resetApprovedNameForTests(): void {
  currentState = UNKNOWN;
  listeners.clear();
}
