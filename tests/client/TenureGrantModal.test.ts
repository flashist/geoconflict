/**
 * @jest-environment jsdom
 */
// The one-time tenure-grant notice (task 0253): XP only — no day count.
jest.mock("../../src/client/Utils", () => ({
  translateText: jest.fn((key: string, params?: Record<string, unknown>) =>
    params ? `${key} ${JSON.stringify(params)}` : key,
  ),
}));

import { TenureGrantModal } from "../../src/client/TenureGrantModal";

async function mount(): Promise<TenureGrantModal> {
  const modal = new TenureGrantModal();
  document.body.appendChild(modal);
  await modal.updateComplete;
  return modal;
}

const overlay = (modal: TenureGrantModal) =>
  modal.shadowRoot!.querySelector(".modal-overlay")!;

describe("TenureGrantModal", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("is registered as <tenure-grant-modal>", () => {
    expect(customElements.get("tenure-grant-modal")).toBe(TenureGrantModal);
  });

  it("is hidden until shown", async () => {
    const modal = await mount();
    expect(modal.isVisible).toBe(false);
    expect(overlay(modal).classList.contains("visible")).toBe(false);
  });

  it("shows the grant, with the threshold from the shared constant and no day count", async () => {
    const modal = await mount();
    modal.show({ xpAwarded: 37, xp: 45 });
    await modal.updateComplete;

    expect(overlay(modal).classList.contains("visible")).toBe(true);
    const text = modal.shadowRoot!.textContent!;
    expect(text).toContain("citizenship_tenure_grant.title");
    expect(text).toContain(
      `citizenship_tenure_grant.body ${JSON.stringify({
        xp: 37,
        total: 45,
        threshold: 100,
      })}`,
    );
    expect(text).toContain("citizenship_tenure_grant.cta");
    expect(text).not.toContain("days");
  });

  it("the CTA closes it", async () => {
    const modal = await mount();
    modal.show({ xpAwarded: 5, xp: 5 });
    await modal.updateComplete;

    (
      modal.shadowRoot!.querySelector("#tenure-grant-modal-cta") as HTMLElement
    ).click();
    await modal.updateComplete;

    expect(modal.isVisible).toBe(false);
    expect(overlay(modal).classList.contains("visible")).toBe(false);
  });

  // Task 0303: the card waits for this before offering the restart popup.
  it("the CTA calls onClosed once, after hiding", async () => {
    const modal = await mount();
    const onClosed = jest.fn(() => {
      expect(modal.isVisible).toBe(false);
    });
    modal.show({ xpAwarded: 5, xp: 5 }, onClosed);
    await modal.updateComplete;
    expect(onClosed).not.toHaveBeenCalled();

    const cta = modal.shadowRoot!.querySelector(
      "#tenure-grant-modal-cta",
    ) as HTMLElement;
    cta.click();
    cta.click();

    expect(onClosed).toHaveBeenCalledTimes(1);
  });

  it("the CTA works without onClosed", async () => {
    const modal = await mount();
    modal.show({ xpAwarded: 5, xp: 5 });
    await modal.updateComplete;

    (
      modal.shadowRoot!.querySelector("#tenure-grant-modal-cta") as HTMLElement
    ).click();

    expect(modal.isVisible).toBe(false);
  });

  // Task 0336: Main.ts's pre-start close list. The page reloads after a match,
  // so the card's follow-up (the restart offer) is dropped, never run.
  it("M1. close() hides it and never calls onClosed, even after a later CTA tap", async () => {
    const modal = await mount();
    const onClosed = jest.fn();
    modal.show({ xpAwarded: 5, xp: 5 }, onClosed);
    await modal.updateComplete;

    modal.close();
    await modal.updateComplete;

    expect(modal.isVisible).toBe(false);
    expect(overlay(modal).classList.contains("visible")).toBe(false);

    (
      modal.shadowRoot!.querySelector("#tenure-grant-modal-cta") as HTMLElement
    ).click();
    expect(onClosed).not.toHaveBeenCalled();
  });
});
