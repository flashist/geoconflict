/**
 * @jest-environment jsdom
 */
// Task 0303: the "restart to apply" popup — its text, and which tap logs what.
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
// Task 0494: a test-only product, so the popup's text and events can follow it.
jest.mock("../../src/client/ProductClientConfig", () => {
  const actual = jest.requireActual("../../src/client/ProductClientConfig");
  return {
    getProductClientConfig: (productId: string) =>
      productId === "test_item"
        ? {
            analytics: {
              restartPrompt: {
                shown: "TestItem:RestartPrompt:Shown",
                restart: "TestItem:RestartPrompt:Restart",
                later: "TestItem:RestartPrompt:Later",
              },
            },
            restartPromptTitleKey: "test_item_restart.title",
            restartPromptBodyKey: "test_item_restart.body",
            isUiEnabled: null,
          }
        : actual.getProductClientConfig(productId),
  };
});

import type { PaymentProductId } from "../../src/core/profile/PaymentsContract";
import { CitizenshipRestartModal } from "../../src/client/CitizenshipRestartModal";
import { createCitizenshipRestartOffer } from "../../src/client/CitizenshipRestartOffer";
import { flashist_logEventAnalytics } from "../../src/client/flashist/FlashistFacade";

const logEventAnalytics = flashist_logEventAnalytics as jest.Mock;

const loggedEvents = (): string[] =>
  logEventAnalytics.mock.calls.map((call) => call[0] as string);

async function mount(): Promise<CitizenshipRestartModal> {
  const modal = new CitizenshipRestartModal();
  document.body.appendChild(modal);
  await modal.updateComplete;
  return modal;
}

const overlay = (modal: CitizenshipRestartModal) =>
  modal.shadowRoot!.querySelector(".modal-overlay")!;

const click = (modal: CitizenshipRestartModal, id: string) =>
  (modal.shadowRoot!.querySelector(`#${id}`) as HTMLElement).click();

describe("CitizenshipRestartModal", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    jest.clearAllMocks();
  });

  it("is registered as <citizenship-restart-modal>", () => {
    expect(customElements.get("citizenship-restart-modal")).toBe(
      CitizenshipRestartModal,
    );
  });

  it("is hidden until shown, and logs nothing before then", async () => {
    const modal = await mount();
    expect(modal.isVisible).toBe(false);
    expect(overlay(modal).classList.contains("visible")).toBe(false);
    expect(logEventAnalytics).not.toHaveBeenCalled();
  });

  it("renders all four keys and logs Shown when shown", async () => {
    const modal = await mount();
    modal.show(() => true);
    await modal.updateComplete;

    expect(overlay(modal).classList.contains("visible")).toBe(true);
    const text = modal.shadowRoot!.textContent!;
    for (const key of ["title", "body", "restart", "later"]) {
      expect(text).toContain(`citizenship_restart_modal.${key}`);
    }
    expect(loggedEvents()).toEqual(["Citizenship:RestartPrompt:Shown"]);
  });

  it("Restart now calls the offer's restart(), which logs Restart and reloads", async () => {
    const reload = jest.fn();
    const offer = createCitizenshipRestartOffer({
      isAwayFromStartScreen: () => false,
      isSurfacesEnabled: async () => true,
      showPrompt: jest.fn(),
      reload,
    });
    const restart = jest.spyOn(offer, "restart");
    const modal = await mount();
    modal.show(() => offer.restart());
    await modal.updateComplete;

    click(modal, "citizenship-restart-modal-restart");

    expect(restart).toHaveBeenCalledTimes(1);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(loggedEvents()).toEqual([
      "Citizenship:RestartPrompt:Shown",
      "Citizenship:RestartPrompt:Restart",
    ]);
  });

  it("a refused restart (match live) hides the popup instead", async () => {
    const modal = await mount();
    modal.show(() => false);
    await modal.updateComplete;

    click(modal, "citizenship-restart-modal-restart");
    await modal.updateComplete;

    expect(modal.isVisible).toBe(false);
  });

  // Review R3: a refused restart re-shows the same offer on the start screen;
  // that is one offer, so Shown is logged once and then one outcome.
  it("re-shown after a refused restart: Shown once, then the outcome", async () => {
    let refuse = true;
    const modal = await mount();
    modal.show(() => !refuse);
    await modal.updateComplete;

    click(modal, "citizenship-restart-modal-restart");
    await modal.updateComplete;
    expect(modal.isVisible).toBe(false);

    refuse = false;
    modal.show(() => !refuse);
    await modal.updateComplete;
    expect(modal.isVisible).toBe(true);
    click(modal, "citizenship-restart-modal-later");

    expect(loggedEvents()).toEqual([
      "Citizenship:RestartPrompt:Shown",
      "Citizenship:RestartPrompt:Later",
    ]);
  });

  it("Later logs Later and hides", async () => {
    const onRestart = jest.fn(() => true);
    const modal = await mount();
    modal.show(onRestart);
    await modal.updateComplete;

    click(modal, "citizenship-restart-modal-later");
    await modal.updateComplete;

    expect(modal.isVisible).toBe(false);
    expect(overlay(modal).classList.contains("visible")).toBe(false);
    expect(onRestart).not.toHaveBeenCalled();
    expect(loggedEvents()).toEqual([
      "Citizenship:RestartPrompt:Shown",
      "Citizenship:RestartPrompt:Later",
    ]);
  });

  it("close() hides without logging (Main.ts pre-start close list)", async () => {
    const modal = await mount();
    modal.show(() => true);
    await modal.updateComplete;
    logEventAnalytics.mockClear();

    modal.close();
    await modal.updateComplete;

    expect(modal.isVisible).toBe(false);
    expect(logEventAnalytics).not.toHaveBeenCalled();
  });

  describe("per product (task 0494; RP-1 keeps Later)", () => {
    const TEST_ITEM = "test_item" as unknown as PaymentProductId;

    it("show(onRestart, productId) renders that product's title and body, with both buttons", async () => {
      const modal = await mount();
      modal.show(() => true, TEST_ITEM);
      await modal.updateComplete;

      const text = modal.shadowRoot!.textContent!;
      expect(text).toContain("test_item_restart.title");
      expect(text).toContain("test_item_restart.body");
      expect(text).not.toContain("citizenship_restart_modal.title");
      expect(
        modal.shadowRoot!.querySelector("#citizenship-restart-modal-restart"),
      ).not.toBeNull();
      expect(
        modal.shadowRoot!.querySelector("#citizenship-restart-modal-later"),
      ).not.toBeNull();
    });

    it("logs that product's Shown and Later", async () => {
      const modal = await mount();
      modal.show(() => true, TEST_ITEM);
      await modal.updateComplete;

      click(modal, "citizenship-restart-modal-later");

      expect(loggedEvents()).toEqual([
        "TestItem:RestartPrompt:Shown",
        "TestItem:RestartPrompt:Later",
      ]);
    });

    it("no product is citizenship: today's text and events", async () => {
      const modal = await mount();
      modal.show(() => true);
      await modal.updateComplete;

      expect(modal.shadowRoot!.textContent!).toContain(
        "citizenship_restart_modal.title",
      );
      click(modal, "citizenship-restart-modal-later");
      expect(loggedEvents()).toEqual([
        "Citizenship:RestartPrompt:Shown",
        "Citizenship:RestartPrompt:Later",
      ]);
    });
  });
});
