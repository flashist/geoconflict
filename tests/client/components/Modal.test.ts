/**
 * @jest-environment jsdom
 */
jest.mock("../../../src/client/Utils", () => ({
  translateText: jest.fn((key: string) => key),
}));

import { OModal } from "../../../src/client/components/baseComponents/Modal";

// Task 0415: `heading` (upstream `title`) must never become a `title` attribute —
// browsers show that as a native hover tooltip over the whole window, which
// Yandex Games forbids.
describe("OModal heading, no native tooltip", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("renders the heading text in the header with no title attribute anywhere", async () => {
    const modal = await appendOpenModal((element) => {
      element.heading = "Приватное лобби";
    });

    const header = modal.shadowRoot!.querySelector(".c-modal__header")!;
    expect(header.textContent).toContain("Приватное лобби");
    expect(modal.hasAttribute("title")).toBe(false);
    expect(modal.shadowRoot!.querySelector("[title]")).toBeNull();
  });

  it("the heading attribute in markup renders as text, not as a title", async () => {
    document.body.innerHTML = `<o-modal heading="Single Player"></o-modal>`;
    const modal = document.querySelector("o-modal") as OModal;
    modal.open();
    await modal.updateComplete;

    expect(modal.heading).toBe("Single Player");
    expect(
      modal.shadowRoot!.querySelector(".c-modal__header")!.textContent,
    ).toContain("Single Player");
    expect(modal.hasAttribute("title")).toBe(false);
    expect(modal.shadowRoot!.querySelector("[title]")).toBeNull();
  });

  it("translationKey still wins over heading, with no title anywhere", async () => {
    const modal = await appendOpenModal((element) => {
      element.heading = "ignored";
      element.translationKey = "help_modal.title";
    });

    const header = modal.shadowRoot!.querySelector(".c-modal__header")!;
    expect(header.textContent).toContain("help_modal.title");
    expect(header.textContent).not.toContain("ignored");
    expect(modal.hasAttribute("title")).toBe(false);
    expect(modal.shadowRoot!.querySelector("[title]")).toBeNull();
  });
});

async function appendOpenModal(
  configure: (modal: OModal) => void,
): Promise<OModal> {
  const modal = new OModal();
  configure(modal);
  document.body.appendChild(modal);
  modal.open();
  await modal.updateComplete;
  return modal;
}
