/**
 * @jest-environment jsdom
 */
// Task 0302: the interim "citizens only" notice (removed by 0301). Title, one
// line, Close — NO buy button — and silent while citizenship is switched off.
jest.mock("../../src/client/Utils", () => ({
  translateText: jest.fn((key: string) => key),
}));
jest.mock("../../src/client/flashist/FlashistFacade", () => ({
  FlashistFacade: {
    instance: {
      isCitizenshipSurfacesEnabled: jest.fn().mockResolvedValue(true),
    },
  },
}));

import { CitizensOnlyModal } from "../../src/client/CitizensOnlyModal";
import { FlashistFacade } from "../../src/client/flashist/FlashistFacade";

const isSurfacesEnabled = FlashistFacade.instance
  .isCitizenshipSurfacesEnabled as jest.Mock;

async function mount(): Promise<CitizensOnlyModal> {
  const modal = new CitizensOnlyModal();
  document.body.appendChild(modal);
  await modal.updateComplete;
  return modal;
}

const overlay = (modal: CitizensOnlyModal) =>
  modal.shadowRoot!.querySelector(".modal-overlay")!;

describe("CitizensOnlyModal", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    isSurfacesEnabled.mockResolvedValue(true);
  });

  it("is registered as <citizens-only-modal>", () => {
    expect(customElements.get("citizens-only-modal")).toBe(CitizensOnlyModal);
  });

  it("is hidden until shown", async () => {
    const modal = await mount();
    expect(overlay(modal).classList.contains("visible")).toBe(false);
  });

  it("shows the title, the line and Close — and no buy button", async () => {
    const modal = await mount();
    await modal.show();
    await modal.updateComplete;

    expect(overlay(modal).classList.contains("visible")).toBe(true);
    const text = modal.shadowRoot!.textContent!;
    expect(text).toContain("citizens_only_modal.title");
    expect(text).toContain("citizens_only_modal.body");
    expect(text).toContain("citizens_only_modal.close");
    expect(text).not.toContain("buy");
    expect(modal.shadowRoot!.querySelectorAll("button")).toHaveLength(1);
  });

  it("Close hides it", async () => {
    const modal = await mount();
    await modal.show();
    await modal.updateComplete;

    (
      modal.shadowRoot!.querySelector(
        "#citizens-only-modal-close",
      ) as HTMLElement
    ).click();
    await modal.updateComplete;

    expect(overlay(modal).classList.contains("visible")).toBe(false);
  });

  it("does nothing while the citizenship kill switch is off", async () => {
    isSurfacesEnabled.mockResolvedValue(false);
    const modal = await mount();

    await modal.show();
    await modal.updateComplete;

    expect(modal.isVisible).toBe(false);
    expect(overlay(modal).classList.contains("visible")).toBe(false);
  });
});
