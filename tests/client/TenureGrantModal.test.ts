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
});
