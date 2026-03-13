export const TUTORIAL_COMPLETED_KEY = "tutorialCompleted";
export const TUTORIAL_START_TIME_KEY = "tutorialStartTime";
export const TUTORIAL_ATTEMPT_COUNT_KEY = "tutorialAttemptCount";

export function incrementAndGetTutorialAttemptCount(): number {
  const stored = localStorage.getItem(TUTORIAL_ATTEMPT_COUNT_KEY);
  const parsed = parseInt(stored ?? "", 10);
  const next = (Number.isNaN(parsed) ? 0 : parsed) + 1;
  localStorage.setItem(TUTORIAL_ATTEMPT_COUNT_KEY, String(next));
  return next;
}
