const START_SCREEN_CONTROL_IDS = [
  "settings-button",
  "feedback-button",
  "start-screen-announcements-button",
] as const;

type DocumentLike = {
  getElementById: (id: string) => {
    classList?: {
      add: (token: string) => void;
      remove: (token: string) => void;
    };
  } | null;
};

export function setStartScreenControlsHidden(
  hidden: boolean,
  root: DocumentLike = document,
): void {
  START_SCREEN_CONTROL_IDS.forEach((id) => {
    const element = root.getElementById(id);
    if (!element?.classList) {
      return;
    }

    if (hidden) {
      element.classList.add("hidden");
    } else {
      element.classList.remove("hidden");
    }
  });
}
