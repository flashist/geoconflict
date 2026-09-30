/**
 * @jest-environment jsdom
 */
// Task 0336: a match start closes the windows in Main.ts's pre-start close
// list — including the tenure gift's thank-you popup, which used to stay over
// the live match until tapped. Uses the REAL popup elements.
jest.mock("../../src/client/Utils", () => ({
  translateText: jest.fn((key: string) => key),
}));
jest.mock("../../src/client/flashist/FlashistFacade", () => ({
  flashistConstants: {
    analyticEvents: {
      CITIZENSHIP_RESTART_PROMPT_SHOWN: "Citizenship:RestartPrompt:Shown",
      CITIZENSHIP_RESTART_PROMPT_RESTART: "Citizenship:RestartPrompt:Restart",
      CITIZENSHIP_RESTART_PROMPT_LATER: "Citizenship:RestartPrompt:Later",
    },
  },
  flashist_logEventAnalytics: jest.fn(),
}));

import { CitizenshipRestartModal } from "../../src/client/CitizenshipRestartModal";
import { closePreStartModals } from "../../src/client/PreStartModals";
import { TenureGrantModal } from "../../src/client/TenureGrantModal";

async function mount<
  T extends HTMLElement & { updateComplete: Promise<unknown> },
>(element: T): Promise<T> {
  document.body.appendChild(element);
  await element.updateComplete;
  return element;
}

describe("closePreStartModals (task 0336)", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("S1. hides an open tenure thank-you popup and drops its close follow-up", async () => {
    const modal = await mount(new TenureGrantModal());
    const onClosed = jest.fn();
    modal.show({ xpAwarded: 30, xp: 55 }, onClosed);
    await modal.updateComplete;
    expect(modal.isVisible).toBe(true);

    closePreStartModals();
    await modal.updateComplete;

    expect(modal.isVisible).toBe(false);
    expect(
      modal
        .shadowRoot!.querySelector(".modal-overlay")!
        .classList.contains("visible"),
    ).toBe(false);
    expect(onClosed).not.toHaveBeenCalled();
  });

  it("S2. regression: still closes the restart popup", async () => {
    const modal = await mount(new CitizenshipRestartModal());
    modal.show(() => false);
    await modal.updateComplete;
    expect(modal.isVisible).toBe(true);

    closePreStartModals();
    await modal.updateComplete;

    expect(modal.isVisible).toBe(false);
  });
});
