/**
 * @jest-environment jsdom
 */
// Task 0253 (v1 review R5, carried into the redesign): a language switch must
// re-render the tenure-grant notice, like its sibling start-screen surfaces.

import { LangSelector } from "../../src/client/LangSelector";

describe("LangSelector.applyTranslation re-render list", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    jest.restoreAllMocks();
  });

  it.each(["tenure-grant-modal", "citizenship-card", "game-starting-modal"])(
    "re-renders <%s>",
    (tag) => {
      jest.spyOn(console, "warn").mockImplementation(() => {});
      const element = document.createElement(tag);
      const requestUpdate = jest.fn();
      Object.assign(element, { requestUpdate });
      document.body.appendChild(element);

      // Constructor skipped: applyTranslation only needs the prototype.
      const selector = Object.create(LangSelector.prototype) as {
        applyTranslation(): void;
      };
      selector.applyTranslation();

      expect(requestUpdate).toHaveBeenCalled();
    },
  );
});
