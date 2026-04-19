import { setStartScreenControlsHidden } from "../../src/client/StartScreenControls";

function createElement() {
  const classes = new Set<string>();

  return {
    classList: {
      add: (token: string) => {
        classes.add(token);
      },
      remove: (token: string) => {
        classes.delete(token);
      },
      contains: (token: string) => classes.has(token),
    },
  };
}

describe("start screen controls visibility", () => {
  it("restores hidden start-screen controls on same-page leave paths", () => {
    const settingsButton = createElement();
    const feedbackButton = createElement();
    const announcementsButton = createElement();

    const root = {
      getElementById: (id: string) => {
        switch (id) {
          case "settings-button":
            return settingsButton;
          case "feedback-button":
            return feedbackButton;
          case "start-screen-announcements-button":
            return announcementsButton;
          default:
            return null;
        }
      },
    };

    setStartScreenControlsHidden(true, root);

    expect(settingsButton.classList.contains("hidden")).toBe(true);
    expect(feedbackButton.classList.contains("hidden")).toBe(true);
    expect(announcementsButton.classList.contains("hidden")).toBe(true);

    setStartScreenControlsHidden(false, root);

    expect(settingsButton.classList.contains("hidden")).toBe(false);
    expect(feedbackButton.classList.contains("hidden")).toBe(false);
    expect(announcementsButton.classList.contains("hidden")).toBe(false);
  });
});
