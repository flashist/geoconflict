/**
 * @jest-environment jsdom
 */
jest.mock("../../../src/client/Utils", () => ({
  translateText: jest.fn((key: string) => key),
}));

import { OButton } from "../../../src/client/components/baseComponents/Button";

describe("OButton subtitle support", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("renders title-only buttons exactly as before", async () => {
    const button = await appendButton((element) => {
      element.title = "Play";
    });

    expect(button.textContent).toContain("Play");
    expect(button.querySelector(".c-button__subtitle")).toBeNull();
  });

  it("renders a translated subtitle when subtitleTranslationKey is set", async () => {
    const button = await appendButton((element) => {
      element.translationKey = "main.single_player";
      element.subtitleTranslationKey = "main.single_player_subtitle";
    });

    const subtitle = button.querySelector(".c-button__subtitle");
    expect(subtitle).not.toBeNull();
    expect(subtitle!.textContent).toContain("main.single_player_subtitle");
    expect(button.textContent).toContain("main.single_player");
  });
});

async function appendButton(
  configure: (button: OButton) => void,
): Promise<OButton> {
  const button = new OButton();
  configure(button);
  document.body.appendChild(button);
  await Promise.resolve();
  await Promise.resolve();
  await button.updateComplete;
  return button;
}
