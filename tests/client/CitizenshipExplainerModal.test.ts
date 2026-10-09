/**
 * @jest-environment jsdom
 */
// Task 0301: the "What is citizenship?" explainer popup. It owns no purchase
// state — every action goes through the citizenship card (a stand-in here).
jest.mock("../../src/client/Utils", () => ({
  translateText: jest.fn(
    (key: string, params?: Record<string, string | number>) =>
      params !== undefined && Object.keys(params).length > 0
        ? `${key}${JSON.stringify(params)}`
        : key,
  ),
}));
jest.mock("../../src/client/flashist/FlashistFacade", () => ({
  flashistConstants: {
    analyticEvents: {},
    uiElementIds: {
      purchaseCitizenshipExplainer: "PurchaseCitizenshipExplainer",
      purchasePaidCitizenshipExplainer: "PurchasePaidCitizenshipExplainer",
      citizenshipLoginExplainer: "CitizenshipLoginExplainer",
    },
    citizenshipExplainerSources: {
      cardLink: "CardLink",
      instructions: "Instructions",
      lockedFeature: "LockedFeature",
    },
  },
  flashist_logEventAnalytics: jest.fn(),
  FlashistFacade: {
    instance: {
      isCitizenshipSurfacesEnabled: jest.fn(),
      logCitizenshipExplainerOpenedEvent: jest.fn(),
    },
  },
}));
jest.mock("../../src/client/PrivateLobbyAccess", () => ({
  isPrivateLobbyRowEnabled: jest.fn(),
}));

import { CITIZENSHIP_XP_THRESHOLD } from "../../src/core/profile/Citizenship";
import { openCitizenshipExplainer } from "../../src/client/CitizenshipExplainer";
import { CitizenshipExplainerModal } from "../../src/client/CitizenshipExplainerModal";
import {
  CITIZENSHIP_OFFER_CHANGED_EVENT,
  type CitizenshipOffer,
} from "../../src/client/CitizenshipOffer";
import { dispatchCitizenshipGrantedMidSession } from "../../src/client/CitizenshipRestartOffer";
import { FlashistFacade } from "../../src/client/flashist/FlashistFacade";
import { isPrivateLobbyRowEnabled } from "../../src/client/PrivateLobbyAccess";
import { translateText } from "../../src/client/Utils";

const isSurfacesEnabled = FlashistFacade.instance
  .isCitizenshipSurfacesEnabled as jest.Mock;
const logOpened = FlashistFacade.instance
  .logCitizenshipExplainerOpenedEvent as jest.Mock;
const isRowEnabled = isPrivateLobbyRowEnabled as jest.Mock;
const translate = translateText as jest.Mock;

interface CardStandIn {
  getCitizenshipOffer: jest.Mock;
  buyCitizenship: jest.Mock;
  logIn: jest.Mock;
}

/** A stand-in for the real <citizenship-card> in the page. */
function appendCard(offer: CitizenshipOffer): CardStandIn {
  const card = document.createElement("citizenship-card");
  const standIn: CardStandIn = {
    getCitizenshipOffer: jest.fn(() => offer),
    buyCitizenship: jest.fn().mockResolvedValue("granted"),
    logIn: jest.fn().mockResolvedValue(undefined),
  };
  Object.assign(card, standIn);
  document.body.appendChild(card);
  return standIn;
}

async function mount(): Promise<CitizenshipExplainerModal> {
  const modal = new CitizenshipExplainerModal();
  document.body.appendChild(modal);
  await modal.updateComplete;
  return modal;
}

async function showFrom(
  modal: CitizenshipExplainerModal,
  source: Parameters<CitizenshipExplainerModal["show"]>[0] = {
    source: "CardLink",
  },
): Promise<void> {
  await modal.show(source);
  await modal.updateComplete;
}

const root = (modal: CitizenshipExplainerModal) => modal.shadowRoot!;
const byId = (modal: CitizenshipExplainerModal, id: string) =>
  root(modal).getElementById(id) as HTMLElement | null;
const isOpen = (modal: CitizenshipExplainerModal) =>
  root(modal).querySelector(".modal-overlay")!.classList.contains("visible");
const text = (modal: CitizenshipExplainerModal) => root(modal).textContent!;

async function flush(modal: CitizenshipExplainerModal): Promise<void> {
  for (let i = 0; i < 3; i++) {
    await Promise.resolve();
  }
  await modal.updateComplete;
}

const BUY: CitizenshipOffer = { kind: "buy", price: "99 ₽", xp: 25 };
const CITIZEN_BUY: CitizenshipOffer = { kind: "citizen_buy", price: "99 ₽" };

describe("CitizenshipExplainerModal (task 0301)", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    jest.clearAllMocks();
    isSurfacesEnabled.mockResolvedValue(true);
    isRowEnabled.mockResolvedValue(true);
  });

  it("is registered as <citizenship-explainer-modal>", () => {
    expect(customElements.get("citizenship-explainer-modal")).toBe(
      CitizenshipExplainerModal,
    );
  });

  it("is hidden until shown", async () => {
    appendCard(BUY);
    const modal = await mount();
    expect(isOpen(modal)).toBe(false);
  });

  describe("the kill switch", () => {
    it("stays hidden and fires no event while the surfaces are off", async () => {
      isSurfacesEnabled.mockResolvedValue(false);
      appendCard(BUY);
      const modal = await mount();

      await showFrom(modal);

      expect(modal.isVisible).toBe(false);
      expect(isOpen(modal)).toBe(false);
      expect(logOpened).not.toHaveBeenCalled();
    });

    it("stays hidden when the surfaces read throws (fail closed)", async () => {
      jest.spyOn(console, "warn").mockImplementation(() => {});
      isSurfacesEnabled.mockRejectedValue(new Error("boom"));
      appendCard(BUY);
      const modal = await mount();

      await showFrom(modal);

      expect(isOpen(modal)).toBe(false);
      expect(logOpened).not.toHaveBeenCalled();
    });
  });

  describe("the opened event", () => {
    it.each([
      [{ source: "CardLink" } as const, "CardLink"],
      [{ source: "Instructions" } as const, "Instructions"],
      [
        { source: "LockedFeature", featureId: "PrivateLobby" } as const,
        "LockedFeature:PrivateLobby",
      ],
    ])("fires once per show from %j with suffix %s", async (source, suffix) => {
      appendCard(BUY);
      const modal = await mount();

      await showFrom(modal, source);

      expect(isOpen(modal)).toBe(true);
      expect(logOpened).toHaveBeenCalledTimes(1);
      expect(logOpened).toHaveBeenCalledWith(suffix);
    });

    it("fires again on a second show", async () => {
      appendCard(BUY);
      const modal = await mount();

      await showFrom(modal);
      modal.close();
      await showFrom(modal, { source: "Instructions" });

      expect(logOpened.mock.calls).toEqual([["CardLink"], ["Instructions"]]);
    });

    it("does not open when closed while its checks were still running", async () => {
      appendCard(BUY);
      const modal = await mount();

      const showing = modal.show({ source: "CardLink" });
      modal.close();
      await showing;
      await modal.updateComplete;

      expect(isOpen(modal)).toBe(false);
      expect(logOpened).not.toHaveBeenCalled();
    });
  });

  describe("content", () => {
    it("renders every built benefit", async () => {
      appendCard(BUY);
      const modal = await mount();
      await showFrom(modal);

      for (const key of [
        "citizenship_explainer.title",
        "citizenship_explainer.benefit_badge",
        "citizenship_explainer.benefit_name_change",
        "citizenship_explainer.benefit_private_lobby",
        "citizenship_explainer.benefit_no_ads",
        "citizenship_explainer.paid_only_title",
        "citizenship_explainer.close",
      ]) {
        expect(text(modal)).toContain(key);
      }
    });

    // Task 0408: the ad-free perk is paid-only, so it sits under its own
    // sub-heading below the all-citizens list, not in it.
    it("the ad-free line sits under the paid-only sub-heading, not in the all-citizens list", async () => {
      appendCard(BUY);
      const modal = await mount();
      await showFrom(modal);

      const allCitizens = byId(modal, "citizenship-explainer-benefits")!;
      const paidOnlyTitle = byId(
        modal,
        "citizenship-explainer-paid-only-title",
      )!;
      const paidOnly = byId(modal, "citizenship-explainer-paid-only")!;

      expect(allCitizens.textContent).toContain(
        "citizenship_explainer.benefit_badge",
      );
      expect(allCitizens.textContent).toContain(
        "citizenship_explainer.benefit_name_change",
      );
      expect(allCitizens.textContent).toContain(
        "citizenship_explainer.benefit_private_lobby",
      );
      expect(allCitizens.textContent).not.toContain(
        "citizenship_explainer.benefit_no_ads",
      );
      expect(paidOnlyTitle.textContent).toContain(
        "citizenship_explainer.paid_only_title",
      );
      expect(paidOnly.textContent).toContain(
        "citizenship_explainer.benefit_no_ads",
      );

      const follows = Node.DOCUMENT_POSITION_FOLLOWING;
      expect(allCitizens.compareDocumentPosition(paidOnlyTitle) & follows).toBe(
        follows,
      );
      expect(paidOnlyTitle.compareDocumentPosition(paidOnly) & follows).toBe(
        follows,
      );
    });

    it("keeps the paid-only block when the private-lobby line is hidden", async () => {
      isRowEnabled.mockResolvedValue(false);
      appendCard(BUY);
      const modal = await mount();
      await showFrom(modal);

      expect(byId(modal, "citizenship-explainer-benefit-private-lobby")).toBe(
        null,
      );
      expect(
        byId(modal, "citizenship-explainer-paid-only-title"),
      ).not.toBeNull();
      expect(
        byId(modal, "citizenship-explainer-benefit-no-ads")!.textContent,
      ).toContain("citizenship_explainer.benefit_no_ads");
    });

    it("shows the private-lobby line only when the row is enabled (owner ruling Q3)", async () => {
      isRowEnabled.mockResolvedValue(false);
      appendCard(BUY);
      const modal = await mount();
      await showFrom(modal);

      expect(byId(modal, "citizenship-explainer-benefit-private-lobby")).toBe(
        null,
      );
      expect(text(modal)).not.toContain(
        "citizenship_explainer.benefit_private_lobby",
      );

      modal.close();
      isRowEnabled.mockResolvedValue(true);
      await showFrom(modal);

      expect(
        byId(modal, "citizenship-explainer-benefit-private-lobby"),
      ).not.toBeNull();
    });

    it("hides the private-lobby line when the row check throws", async () => {
      isRowEnabled.mockRejectedValue(new Error("boom"));
      appendCard(BUY);
      const modal = await mount();
      await showFrom(modal);

      expect(isOpen(modal)).toBe(true);
      expect(byId(modal, "citizenship-explainer-benefit-private-lobby")).toBe(
        null,
      );
    });

    it("the free route takes its numbers from the code constants", async () => {
      appendCard(BUY);
      const modal = await mount();
      await showFrom(modal);

      expect(translate).toHaveBeenCalledWith(
        "citizenship_explainer.free_body",
        {
          threshold: CITIZENSHIP_XP_THRESHOLD,
        },
      );
      expect(translate).toHaveBeenCalledWith("citizenship_explainer.your_xp", {
        xp: 25,
        threshold: CITIZENSHIP_XP_THRESHOLD,
      });
    });

    it.each([
      ["buy", BUY],
      ["citizen_buy", CITIZEN_BUY],
    ] as const)(
      "names nothing that is not built (%s)",
      async (_label, offer) => {
        appendCard(offer);
        const modal = await mount();
        await showFrom(modal);

        const keys = translate.mock.calls.map(([key]) => key as string);
        for (const key of keys) {
          expect(key).not.toMatch(/emoji|archive|inbox|replay|vote|flag|soon/i);
        }
      },
    );
  });

  // Task 0421 (owner ruling 2026-10-08): the intro paragraph, the "free"
  // heading and the "buy" heading were removed to shorten the popup; the
  // "citizens get" heading followed on 2026-10-09 (owner change). They
  // must not creep back in any case the popup draws.
  it.each([
    ["checking", { kind: "checking" }],
    ["guest", { kind: "guest", canLogIn: true }],
    ["guest, no login", { kind: "guest", canLogIn: false }],
    ["citizen", { kind: "citizen" }],
    ["citizen_buy", CITIZEN_BUY],
    ["read_failed", { kind: "read_failed" }],
    ["no_product", { kind: "no_product", xp: 25 }],
    ["buy", BUY],
  ] as Array<[string, CitizenshipOffer]>)(
    "draws none of 0421's removed lines (%s)",
    async (_label, offer) => {
      appendCard(offer);
      const modal = await mount();
      await showFrom(modal);

      for (const key of [
        "citizenship_explainer.intro",
        "citizenship_explainer.free_title",
        "citizenship_explainer.buy_title",
        "citizenship_explainer.benefits_title",
      ]) {
        expect(text(modal)).not.toContain(key);
      }
    },
  );

  // Task 0421 (owner change 2026-10-09): someone who is already a citizen is
  // not told how to get citizenship for free.
  it.each([
    ["checking", { kind: "checking" }, true],
    ["guest", { kind: "guest", canLogIn: true }, true],
    ["guest, no login", { kind: "guest", canLogIn: false }, true],
    ["citizen", { kind: "citizen" }, false],
    ["citizen_buy", CITIZEN_BUY, false],
    ["read_failed", { kind: "read_failed" }, true],
    ["no_product", { kind: "no_product", xp: 25 }, true],
    ["buy", BUY, true],
  ] as Array<[string, CitizenshipOffer, boolean]>)(
    "the free-route line (%s): shown = %s",
    async (_label, offer, isShown) => {
      appendCard(offer);
      const modal = await mount();
      await showFrom(modal);

      expect(byId(modal, "citizenship-explainer-free-body") !== null).toBe(
        isShown,
      );
      expect(text(modal).includes("citizenship_explainer.free_body")).toBe(
        isShown,
      );
    },
  );

  describe("the action area, per offer", () => {
    it("buy: the Buy button with the catalog price", async () => {
      appendCard(BUY);
      const modal = await mount();
      await showFrom(modal);

      const button = byId(modal, "citizenship-explainer-buy");
      expect(button).not.toBeNull();
      expect(button!.textContent).toContain("citizenship_paid.buy_cta");
      expect(button!.textContent).toContain("99 ₽");
      // Task 0421: no "Or buy it now" heading — the button names the purchase.
      expect(text(modal)).not.toContain("citizenship_explainer.buy_title");
    });

    it("buy: a tap buys through the card with the explainer tap id", async () => {
      const card = appendCard(BUY);
      const modal = await mount();
      await showFrom(modal);

      byId(modal, "citizenship-explainer-buy")!.click();
      await flush(modal);

      expect(card.buyCitizenship).toHaveBeenCalledTimes(1);
      expect(card.buyCitizenship).toHaveBeenCalledWith(
        "PurchaseCitizenshipExplainer",
      );
      expect(byId(modal, "citizenship-explainer-purchase-error")).toBeNull();
    });

    it("buy: an error result shows the error line under the popup's own button", async () => {
      const card = appendCard(BUY);
      card.buyCitizenship.mockResolvedValue("error");
      const modal = await mount();
      await showFrom(modal);

      byId(modal, "citizenship-explainer-buy")!.click();
      await flush(modal);

      expect(
        byId(modal, "citizenship-explainer-purchase-error"),
      ).not.toBeNull();
      expect(text(modal)).toContain("citizenship_paid.purchase_error");
    });

    it("buy: the error line is gone in a freshly opened popup", async () => {
      const card = appendCard(BUY);
      card.buyCitizenship.mockResolvedValue("error");
      const modal = await mount();
      await showFrom(modal);
      byId(modal, "citizenship-explainer-buy")!.click();
      await flush(modal);

      modal.close();
      await showFrom(modal);

      expect(byId(modal, "citizenship-explainer-purchase-error")).toBeNull();
    });

    it("buy: busy (a card purchase already running) shows nothing", async () => {
      const card = appendCard(BUY);
      card.buyCitizenship.mockResolvedValue("busy");
      const modal = await mount();
      await showFrom(modal);

      byId(modal, "citizenship-explainer-buy")!.click();
      await flush(modal);

      expect(byId(modal, "citizenship-explainer-purchase-error")).toBeNull();
      expect(isOpen(modal)).toBe(true);
    });

    it("guest who can log in: hint plus a login button that logs in through the card", async () => {
      const card = appendCard({ kind: "guest", canLogIn: true });
      const modal = await mount();
      await showFrom(modal);

      expect(text(modal)).toContain("citizenship_explainer.login_hint");
      expect(byId(modal, "citizenship-explainer-buy")).toBeNull();
      byId(modal, "citizenship-explainer-login")!.click();

      expect(card.logIn).toHaveBeenCalledWith("CitizenshipLoginExplainer");
      expect(card.buyCitizenship).not.toHaveBeenCalled();
    });

    it("guest who cannot log in: the hint only, no dead button", async () => {
      appendCard({ kind: "guest", canLogIn: false });
      const modal = await mount();
      await showFrom(modal);

      expect(text(modal)).toContain("citizenship_explainer.login_hint");
      expect(byId(modal, "citizenship-explainer-login")).toBeNull();
    });

    it("citizen: the already-a-citizen line, no buy", async () => {
      appendCard({ kind: "citizen" });
      const modal = await mount();
      await showFrom(modal);

      expect(text(modal)).toContain("citizenship_explainer.already_citizen");
      expect(byId(modal, "citizenship-explainer-buy")).toBeNull();
      expect(byId(modal, "citizenship-explainer-your-xp")).toBeNull();
    });

    // Task 0409: an earned citizen, verified not paid.
    it("citizen_buy: already-citizen line, own heading, and a Buy button with the price", async () => {
      appendCard(CITIZEN_BUY);
      const modal = await mount();
      await showFrom(modal);

      const alreadyCitizen = byId(
        modal,
        "citizenship-explainer-already-citizen",
      )!;
      const title = byId(modal, "citizenship-explainer-citizen-buy-title")!;
      const button = byId(modal, "citizenship-explainer-citizen-buy")!;
      expect(alreadyCitizen.textContent).toContain(
        "citizenship_explainer.already_citizen",
      );
      expect(title.textContent).toContain(
        "citizenship_explainer.citizen_buy_title",
      );
      expect(button.textContent).toContain(
        "citizenship_explainer.citizen_buy_cta",
      );
      expect(button.textContent).toContain("99 ₽");
      expect(button.classList.contains("primary-btn")).toBe(true);
      // Never the non-citizen copy or the XP progress.
      expect(byId(modal, "citizenship-explainer-buy")).toBeNull();
      expect(byId(modal, "citizenship-explainer-your-xp")).toBeNull();
      expect(text(modal)).not.toContain("citizenship_explainer.buy_title");
      expect(text(modal)).not.toContain("citizenship_paid.buy_cta");
    });

    it("citizen_buy: the button sits at the bottom — after the already-citizen line and heading, before Close", async () => {
      appendCard(CITIZEN_BUY);
      const modal = await mount();
      await showFrom(modal);

      const follows = Node.DOCUMENT_POSITION_FOLLOWING;
      const alreadyCitizen = byId(
        modal,
        "citizenship-explainer-already-citizen",
      )!;
      const title = byId(modal, "citizenship-explainer-citizen-buy-title")!;
      const button = byId(modal, "citizenship-explainer-citizen-buy")!;
      const paidOnly = byId(modal, "citizenship-explainer-paid-only")!;
      const close = byId(modal, "citizenship-explainer-close")!;
      expect(paidOnly.compareDocumentPosition(alreadyCitizen) & follows).toBe(
        follows,
      );
      expect(alreadyCitizen.compareDocumentPosition(title) & follows).toBe(
        follows,
      );
      expect(title.compareDocumentPosition(button) & follows).toBe(follows);
      expect(button.compareDocumentPosition(close) & follows).toBe(follows);
    });

    it("citizen_buy: a tap buys through the card with its own tap id", async () => {
      const card = appendCard(CITIZEN_BUY);
      const modal = await mount();
      await showFrom(modal);

      byId(modal, "citizenship-explainer-citizen-buy")!.click();
      await flush(modal);

      expect(card.buyCitizenship).toHaveBeenCalledTimes(1);
      expect(card.buyCitizenship).toHaveBeenCalledWith(
        "PurchasePaidCitizenshipExplainer",
      );
      expect(byId(modal, "citizenship-explainer-purchase-error")).toBeNull();
    });

    it("citizen_buy: an error result shows the error line", async () => {
      const card = appendCard(CITIZEN_BUY);
      card.buyCitizenship.mockResolvedValue("error");
      const modal = await mount();
      await showFrom(modal);

      byId(modal, "citizenship-explainer-citizen-buy")!.click();
      await flush(modal);

      expect(
        byId(modal, "citizenship-explainer-purchase-error"),
      ).not.toBeNull();
      expect(text(modal)).toContain("citizenship_paid.purchase_error");
      // Retryable: the button stays.
      expect(byId(modal, "citizenship-explainer-citizen-buy")).not.toBeNull();
    });

    it("citizen_buy: busy shows nothing", async () => {
      const card = appendCard(CITIZEN_BUY);
      card.buyCitizenship.mockResolvedValue("busy");
      const modal = await mount();
      await showFrom(modal);

      byId(modal, "citizenship-explainer-citizen-buy")!.click();
      await flush(modal);

      expect(byId(modal, "citizenship-explainer-purchase-error")).toBeNull();
      expect(isOpen(modal)).toBe(true);
    });

    it("citizen: no citizen Buy button either", async () => {
      appendCard({ kind: "citizen" });
      const modal = await mount();
      await showFrom(modal);

      expect(byId(modal, "citizenship-explainer-citizen-buy")).toBeNull();
      expect(text(modal)).not.toContain(
        "citizenship_explainer.citizen_buy_title",
      );
    });

    it("read_failed: the card's read-failed line, no buy", async () => {
      appendCard({ kind: "read_failed" });
      const modal = await mount();
      await showFrom(modal);

      expect(text(modal)).toContain("citizenship_status.read_failed");
      expect(byId(modal, "citizenship-explainer-buy")).toBeNull();
    });

    it("no_product: no purchase line at all, but the XP progress", async () => {
      appendCard({ kind: "no_product", xp: 40 });
      const modal = await mount();
      await showFrom(modal);

      expect(byId(modal, "citizenship-explainer-buy")).toBeNull();
      expect(text(modal)).not.toContain("citizenship_paid.buy_cta");
      expect(text(modal)).not.toContain("citizenship_explainer.buy_title");
      expect(byId(modal, "citizenship-explainer-your-xp")).not.toBeNull();
    });

    it("checking: the checking line, no buy", async () => {
      appendCard({ kind: "checking" });
      const modal = await mount();
      await showFrom(modal);

      expect(text(modal)).toContain("citizenship_status.checking");
      expect(byId(modal, "citizenship-explainer-buy")).toBeNull();
    });

    it("no card in the page: the checking line, no buy", async () => {
      const modal = await mount();
      await showFrom(modal);

      expect(isOpen(modal)).toBe(true);
      expect(text(modal)).toContain("citizenship_status.checking");
      expect(byId(modal, "citizenship-explainer-buy")).toBeNull();
    });
  });

  describe("live updates", () => {
    it("re-renders on the offer-changed event (e.g. the profile landed)", async () => {
      let offer: CitizenshipOffer = { kind: "checking" };
      const card = appendCard(offer);
      card.getCitizenshipOffer.mockImplementation(() => offer);
      const modal = await mount();
      await showFrom(modal);
      expect(byId(modal, "citizenship-explainer-buy")).toBeNull();

      offer = BUY;
      window.dispatchEvent(new CustomEvent(CITIZENSHIP_OFFER_CHANGED_EVENT));
      await modal.updateComplete;

      expect(byId(modal, "citizenship-explainer-buy")).not.toBeNull();
    });

    it("the citizen Buy appears and disappears live with the offer (task 0409)", async () => {
      let offer: CitizenshipOffer = { kind: "citizen" };
      const card = appendCard(offer);
      card.getCitizenshipOffer.mockImplementation(() => offer);
      const modal = await mount();
      await showFrom(modal);
      expect(byId(modal, "citizenship-explainer-citizen-buy")).toBeNull();

      offer = CITIZEN_BUY;
      window.dispatchEvent(new CustomEvent(CITIZENSHIP_OFFER_CHANGED_EVENT));
      await modal.updateComplete;
      expect(byId(modal, "citizenship-explainer-citizen-buy")).not.toBeNull();

      offer = { kind: "citizen" };
      window.dispatchEvent(new CustomEvent(CITIZENSHIP_OFFER_CHANGED_EVENT));
      await modal.updateComplete;
      expect(byId(modal, "citizenship-explainer-citizen-buy")).toBeNull();
    });

    it("the mid-session grant event closes it", async () => {
      appendCard(BUY);
      const modal = await mount();
      await showFrom(modal);

      dispatchCitizenshipGrantedMidSession("purchase");
      await modal.updateComplete;

      expect(isOpen(modal)).toBe(false);
    });

    it("stops listening once removed from the page", async () => {
      appendCard(BUY);
      const modal = await mount();
      await showFrom(modal);
      modal.remove();
      const close = jest.spyOn(modal, "close");

      dispatchCitizenshipGrantedMidSession("purchase");

      expect(close).not.toHaveBeenCalled();
    });
  });

  it("Close hides it", async () => {
    appendCard(BUY);
    const modal = await mount();
    await showFrom(modal);

    byId(modal, "citizenship-explainer-close")!.click();
    await modal.updateComplete;

    expect(isOpen(modal)).toBe(false);
  });

  it("close() hides it (the pre-start close path)", async () => {
    appendCard(BUY);
    const modal = await mount();
    await showFrom(modal);

    modal.close();
    await modal.updateComplete;

    expect(modal.isVisible).toBe(false);
  });

  describe("openCitizenshipExplainer()", () => {
    it("shows the popup in the page with the given source", async () => {
      appendCard(BUY);
      const modal = await mount();
      const show = jest.spyOn(modal, "show");

      openCitizenshipExplainer({ source: "Instructions" });

      expect(show).toHaveBeenCalledWith({ source: "Instructions" });
    });

    it("does nothing (and does not throw) without a popup in the page", () => {
      expect(() =>
        openCitizenshipExplainer({ source: "CardLink" }),
      ).not.toThrow();
    });
  });
});
