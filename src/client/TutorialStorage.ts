export const TUTORIAL_COMPLETED_KEY = "tutorialCompleted";
export const TUTORIAL_START_TIME_KEY = "tutorialStartTime";
export const TUTORIAL_ATTEMPT_COUNT_KEY = "tutorialAttemptCount";

export function incrementAndGetTutorialAttemptCount(): number {
  const stored = localStorage.getItem(TUTORIAL_ATTEMPT_COUNT_KEY);
  const next = (stored ? parseInt(stored, 10) : 0) + 1;
  localStorage.setItem(TUTORIAL_ATTEMPT_COUNT_KEY, String(next));
  return next;
}
