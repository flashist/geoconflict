/**
 * @jest-environment jsdom
 */
// Task 0301: the Citizenship section in Instructions. Hidden by default (fail
// closed), shown only when the citizenship surfaces are on; its link opens the
// explainer popup with the Instructions source.
jest.mock("../../src/client/Utils", () => ({
  translateText: jest.fn((key: string) => key),
}));
jest.mock("../../src/client/flashist/FlashistFacade", () => ({
  flashist_waitGameInitComplete: jest.fn(),
  FlashistFacade: {
    instance: {
      isCitizenshipSurfacesEnabled: jest.fn(),
    },
  },
}));

import { CitizenshipHelpSection } from "../../src/client/CitizenshipHelpSection";
import {
  FlashistFacade,
  flashist_waitGameInitComplete,
} from "../../src/client/flashist/FlashistFacade";

const isSurfacesEnabled = FlashistFacade.instance
  .isCitizenshipSurfacesEnabled as jest.Mock;
const waitGameInit = flashist_waitGameInitComplete as jest.Mock;

async function mount(): Promise<CitizenshipHelpSection> {
  const section = new CitizenshipHelpSection();
  document.body.appendChild(section);
  for (let i = 0; i < 4; i++) {
    await Promise.resolve();
  }
  await section.updateComplete;
  return section;
}

/** A stand-in for the real <citizenship-explainer-modal> in the page. */
function appendExplainer(): jest.Mock {
  const modal = document.createElement("citizenship-explainer-modal");
  const show = jest.fn();
  Object.assign(modal, { show });
  document.body.appendChild(modal);
  return show;
}

describe("CitizenshipHelpSection (task 0301)", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    jest.clearAllMocks();
    waitGameInit.mockResolvedValue(undefined);
    isSurfacesEnabled.mockResolvedValue(true);
  });

  it("is registered as <citizenship-help-section>", () => {
    expect(customElements.get("citizenship-help-section")).toBe(
      CitizenshipHelpSection,
    );
  });

  it("is hidden until platform init completes", async () => {
    waitGameInit.mockReturnValue(new Promise(() => {}));
    const section = await mount();

    expect(section.textContent!.trim()).toBe("");
    expect(isSurfacesEnabled).not.toHaveBeenCalled();
  });

  it("stays hidden — no separator either — while the surfaces are off", async () => {
    isSurfacesEnabled.mockResolvedValue(false);
    const section = await mount();

    expect(section.textContent!.trim()).toBe("");
    expect(section.querySelector("hr")).toBeNull();
  });

  it("stays hidden when the surfaces read throws (fail closed)", async () => {
    jest.spyOn(console, "warn").mockImplementation(() => {});
    isSurfacesEnabled.mockRejectedValue(new Error("boom"));
    const section = await mount();

    expect(section.textContent!.trim()).toBe("");
  });

  it("shows the title, the line, the link and its separator when the surfaces are on", async () => {
    const section = await mount();

    expect(section.textContent).toContain("help_modal.citizenship_title");
    expect(section.textContent).toContain("help_modal.citizenship_desc");
    expect(section.textContent).toContain("citizenship_explainer.link");
    expect(section.querySelector("hr")).not.toBeNull();
  });

  it("the link opens the explainer with the Instructions source", async () => {
    const show = appendExplainer();
    const section = await mount();

    (section.querySelector("#citizenship-help-link") as HTMLElement).click();

    expect(show).toHaveBeenCalledTimes(1);
    expect(show).toHaveBeenCalledWith({ source: "Instructions" });
  });
});
