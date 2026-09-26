/**
 * @jest-environment jsdom
 */
jest.mock("../../src/client/Utils", () => ({
  translateText: jest.fn((key: string) => key),
}));
jest.mock("../../src/client/FlagInput", () => ({
  FLAG_STORAGE_KEY: "flag",
}));
jest.mock("../../src/client/PlayerProfileView", () => ({
  // ADR-111 / task 0211: rescaled 1,000 -> 100. Every XP figure below moved with
  // it, so each fixture keeps the citizen/non-citizen state it was written to test.
  CITIZENSHIP_XP_THRESHOLD: 100,
  loadPlayerProfileView: jest.fn().mockResolvedValue(null),
}));
jest.mock("../../src/client/flashist/FlashistFacade", () => ({
  flashistConstants: {
    analyticEvents: {
      CITIZENSHIP_SURFACE_SEEN: "Citizenship:Seen",
      PROFILE_LOGIN_RESTART_REQUESTED: "Profile:Login:Restart:Requested",
      PROFILE_LOGIN_RESTART_CANCELLED: "Profile:Login:Restart:Cancelled",
    },
    uiElementIds: {
      citizenshipLoginToEarn: "CitizenshipLoginToEarn",
      purchaseCitizenship: "PurchaseCitizenship",
    },
    features: {
      // ON in tests so the existing suites keep exercising current behavior;
      // the flag-off suite below toggles it per test (restored in beforeEach).
      CITIZENSHIP_CARD_ENABLED: true,
    },
  },
  flashist_logEventAnalytics: jest.fn(),
  flashist_waitGameInitComplete: jest.fn().mockResolvedValue(undefined),
  FlashistFacade: {
    instance: {
      yaGamesAvailable: true,
      isYandexDegraded: jest.fn().mockReturnValue(false),
      logUiTapEvent: jest.fn(),
      openYandexAuthDialog: jest.fn().mockResolvedValue(false),
      isCitizenshipUiEnabled: jest.fn().mockResolvedValue(true),
      getCatalogProduct: jest.fn().mockReturnValue(null),
      whenPaymentsCatalogSettled: jest.fn(),
    },
  },
}));
jest.mock("../../src/client/CitizenshipPurchase", () => ({
  runCitizenshipPurchase: jest.fn(),
}));
jest.mock("../../src/client/PaymentsReconciliation", () => ({
  PURCHASES_RECONCILED_EVENT: "geoconflict-purchases-reconciled",
}));
jest.mock("../../src/client/NameChangeRequest", () => ({
  submitNameChangeRequest: jest.fn(),
  cancelNameChangeRequest: jest.fn(),
}));
jest.mock("../../src/client/TenureGrantClaim", () => ({
  maybeClaimTenureGrant: jest.fn(),
}));

import {
  CITIZENSHIP_LOGIN_REQUESTED_EVENT,
  CITIZENSHIP_LOGIN_SUCCEEDED_EVENT,
  CitizenshipCard,
  resetCitizenshipSeenReportedForTests,
  type CitizenshipLoginSucceededDetail,
} from "../../src/client/CitizenshipCard";
import { runCitizenshipPurchase } from "../../src/client/CitizenshipPurchase";
import {
  FlashistFacade,
  flashist_logEventAnalytics,
  flashistConstants,
} from "../../src/client/flashist/FlashistFacade";
import {
  cancelNameChangeRequest,
  submitNameChangeRequest,
} from "../../src/client/NameChangeRequest";
import { PURCHASES_RECONCILED_EVENT } from "../../src/client/PaymentsReconciliation";
import { loadPlayerProfileView } from "../../src/client/PlayerProfileView";
import { maybeClaimTenureGrant } from "../../src/client/TenureGrantClaim";

const isYandexDegraded = FlashistFacade.instance.isYandexDegraded as jest.Mock;
const logUiTapEvent = FlashistFacade.instance.logUiTapEvent as jest.Mock;
const openYandexAuthDialog = FlashistFacade.instance
  .openYandexAuthDialog as jest.Mock;
const isCitizenshipUiEnabled = FlashistFacade.instance
  .isCitizenshipUiEnabled as jest.Mock;
const getCatalogProduct = FlashistFacade.instance
  .getCatalogProduct as jest.Mock;
const whenPaymentsCatalogSettled = FlashistFacade.instance
  .whenPaymentsCatalogSettled as jest.Mock;
const logEventAnalytics = flashist_logEventAnalytics as jest.Mock;
const loadProfile = loadPlayerProfileView as jest.Mock;
const runPurchase = runCitizenshipPurchase as jest.Mock;
const submitNameChange = submitNameChangeRequest as jest.Mock;
const cancelNameChange = cancelNameChangeRequest as jest.Mock;
const claimTenureGrant = maybeClaimTenureGrant as jest.Mock;

const CITIZENSHIP_PRODUCT = {
  id: "citizenship",
  title: "Гражданство",
  description: "",
  imageURI: "",
  price: "99 ₽",
  priceValue: "99",
  priceCurrencyCode: "RUB",
  getPriceCurrencyImage: () => "",
};

const NON_CITIZEN_PROFILE = {
  displayName: "Игрок_7734",
  xp: 25,
  isCitizen: false,
  // Confirmed by a successful server read — the CTA precondition (review R1).
  isAuthoritative: true,
};

describe("CitizenshipCard", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    localStorage.clear();
    jest.clearAllMocks();
    // Plain field, not a jest.fn() — clearAllMocks() won't restore it after a
    // test sets it to false.
    FlashistFacade.instance.yaGamesAvailable = true;
    isYandexDegraded.mockReturnValue(false);
    loadProfile.mockResolvedValue(null);
    openYandexAuthDialog.mockResolvedValue(false);
    isCitizenshipUiEnabled.mockResolvedValue(true);
    // Plain field on the mocked constants object — clearAllMocks() won't
    // restore it after the flag-off suite sets it to false.
    flashistConstants.features.CITIZENSHIP_CARD_ENABLED = true;
    // Payments defaults: no catalog product (CTA hidden), catalog never
    // settles (the card only subscribes — must not hang or throw).
    getCatalogProduct.mockReturnValue(null);
    whenPaymentsCatalogSettled.mockReturnValue(new Promise(() => {}));
    runPurchase.mockResolvedValue("error");
    submitNameChange.mockResolvedValue({ status: "ok" });
    cancelNameChange.mockResolvedValue({ status: "ok" });
    claimTenureGrant.mockResolvedValue({ status: "skipped" });
    resetCitizenshipSeenReportedForTests();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("local CITIZENSHIP_CARD_ENABLED flag (task 0054)", () => {
    it("renders nothing and touches no analytics, profile, or experiment flag when off", async () => {
      flashistConstants.features.CITIZENSHIP_CARD_ENABLED = false;

      const card = await appendCard({ visible: true });

      expect(card.textContent!.trim()).toBe("");
      expect(card.classList.contains("hidden")).toBe(true);
      expect(logEventAnalytics).not.toHaveBeenCalled();
      expect(loadProfile).not.toHaveBeenCalled();
      expect(isCitizenshipUiEnabled).not.toHaveBeenCalled();
    });

    it("stays hidden when off even in degraded mode", async () => {
      flashistConstants.features.CITIZENSHIP_CARD_ENABLED = false;
      isYandexDegraded.mockReturnValue(true);

      const card = await appendCard({ visible: true });

      expect(card.textContent!.trim()).toBe("");
      expect(card.classList.contains("hidden")).toBe(true);
      expect(logEventAnalytics).not.toHaveBeenCalled();
    });

    it("stays hidden when off even when the experiment flag would enable the card", async () => {
      flashistConstants.features.CITIZENSHIP_CARD_ENABLED = false;
      isCitizenshipUiEnabled.mockResolvedValue(true);

      const card = await appendCard({ visible: true });

      expect(card.textContent!.trim()).toBe("");
      expect(card.classList.contains("hidden")).toBe(true);
      expect(isCitizenshipUiEnabled).not.toHaveBeenCalled();
    });

    it("ships with the real flag ON (citizenship launched — 0065 §6)", () => {
      // Guards against an accidental revert to OFF: reads the real module,
      // bypassing this file's mock. Citizenship launched in 0065 §6 (owner
      // ruling 2026-09-26); turning the constant back to false is the
      // code-level rollback, at which point this test flips too.
      const realConstants = jest.requireActual<
        typeof import("../../src/client/flashist/FlashistFacade")
      >("../../src/client/flashist/FlashistFacade").flashistConstants;
      expect(realConstants.features.CITIZENSHIP_CARD_ENABLED).toBe(true);
    });
  });

  describe("citizenship_ui experiment flag", () => {
    it("renders nothing and fires no analytics when the flag is disabled", async () => {
      isCitizenshipUiEnabled.mockResolvedValue(false);

      const card = await appendCard({ visible: true });

      expect(card.textContent!.trim()).toBe("");
      expect(card.classList.contains("hidden")).toBe(true);
      expect(logEventAnalytics).not.toHaveBeenCalled();
      expect(loadProfile).not.toHaveBeenCalled();
    });

    it("renders the card and fires Citizenship:Seen when the flag is enabled", async () => {
      const card = await appendCard({ visible: true });

      expect(card.textContent).toContain("citizenship_card.title");
      expect(card.classList.contains("hidden")).toBe(false);
      expect(logEventAnalytics).toHaveBeenCalledWith("Citizenship:Seen");
    });

    it("stays hidden in degraded mode when the flag reads false (task 0291)", async () => {
      // isYandexDegraded() is `yaGamesAvailable && !yandexSdkPlayerObject`, so
      // it covers two shapes: the SDK never loaded, where the flag fetch needs
      // it and so resolves false (genuinely unreadable); and the SDK loaded but
      // getPlayer() failed, where getFlags() still works and a false flag is a
      // real switch-off. The card used to bypass the gate for both (fail OPEN);
      // 0291 withdrew that — degraded mode fails CLOSED either way.
      isCitizenshipUiEnabled.mockResolvedValue(false);
      isYandexDegraded.mockReturnValue(true);

      const card = await appendCard({ visible: true });

      expect(card.textContent!.trim()).toBe("");
      expect(card.classList.contains("hidden")).toBe(true);
      expect(logEventAnalytics).not.toHaveBeenCalled();
      expect(loadProfile).not.toHaveBeenCalled();
    });
  });

  describe("guest state", () => {
    it("renders the guest shell strings", async () => {
      const card = await appendCard({ visible: true });

      expect(card.textContent).toContain("citizenship_card.title");
      expect(card.textContent).toContain("citizenship_card.guest_subtitle");
      expect(card.textContent).not.toContain(
        "citizenship_card.guest_subtitle_degraded",
      );
      expect(card.textContent).toContain("citizenship_card.login_cta");
      expect(card.textContent).not.toContain("citizenship_card.xp_label");
    });

    it("hides the login CTA when there is no Yandex context", async () => {
      FlashistFacade.instance.yaGamesAvailable = false;

      const card = await appendCard({ visible: true });

      expect(card.textContent).toContain("citizenship_card.title");
      expect(card.textContent).toContain("citizenship_card.guest_subtitle");
      expect(card.textContent).not.toContain(
        "citizenship_card.guest_subtitle_degraded",
      );
      expect(card.textContent).not.toContain("citizenship_card.login_cta");
      expect(card.querySelector("#citizenship-login-button")).toBeNull();
    });

    it("shows the degraded subtitle and no CTA when the Yandex SDK is degraded", async () => {
      isYandexDegraded.mockReturnValue(true);

      const card = await appendCard({ visible: true });

      expect(card.textContent).toContain("citizenship_card.title");
      expect(card.textContent).toContain(
        "citizenship_card.guest_subtitle_degraded",
      );
      expect(card.textContent).not.toContain("citizenship_card.login_cta");
      expect(card.querySelector("#citizenship-login-button")).toBeNull();
    });

    it("fires the login analytics and event on CTA tap", async () => {
      const card = await appendCard({ visible: true });
      const loginRequests: Event[] = [];
      document.addEventListener(CITIZENSHIP_LOGIN_REQUESTED_EVENT, (event) => {
        loginRequests.push(event);
      });

      const loginButton = card.querySelector(
        "#citizenship-login-button",
      ) as HTMLButtonElement;
      expect(loginButton).not.toBeNull();
      loginButton.click();

      expect(logUiTapEvent).toHaveBeenCalledTimes(1);
      expect(logUiTapEvent).toHaveBeenCalledWith("CitizenshipLoginToEarn");
      expect(loginRequests).toHaveLength(1);
    });

    // Task 0273 (owner ruling D3): a successful mid-load login asks for a FULL
    // restart rather than only re-reading the profile — the page has no session
    // token, so the whole start sequence must run again with the player logged in.
    it("asks for a restart after a successful login, exactly once", async () => {
      const card = await appendCard({ visible: true });
      openYandexAuthDialog.mockResolvedValue(true);
      const requests: CustomEvent<CitizenshipLoginSucceededDetail>[] = [];
      document.addEventListener(CITIZENSHIP_LOGIN_SUCCEEDED_EVENT, (event) => {
        requests.push(event as CustomEvent<CitizenshipLoginSucceededDetail>);
      });

      (
        card.querySelector("#citizenship-login-button") as HTMLButtonElement
      ).click();
      await flushMicrotasks();
      await flushLit(card);

      expect(openYandexAuthDialog).toHaveBeenCalledTimes(1);
      expect(requests).toHaveLength(1);
      expect(logEventAnalytics).toHaveBeenCalledWith(
        "Profile:Login:Restart:Requested",
      );
      // The card does NOT reload itself and does not re-read on its own.
      expect(loadProfile).toHaveBeenCalledTimes(1); // the initial load only
    });

    it("the restart request carries a fallback that transitions the card to logged-in", async () => {
      const card = await appendCard({ visible: true });
      openYandexAuthDialog.mockResolvedValue(true);
      const requests: CustomEvent<CitizenshipLoginSucceededDetail>[] = [];
      document.addEventListener(CITIZENSHIP_LOGIN_SUCCEEDED_EVENT, (event) => {
        requests.push(event as CustomEvent<CitizenshipLoginSucceededDetail>);
      });
      loadProfile.mockResolvedValue({
        displayName: "Игрок_7734",
        xp: 0,
        isCitizen: false,
      });

      (
        card.querySelector("#citizenship-login-button") as HTMLButtonElement
      ).click();
      await flushMicrotasks();

      // What Main.ts does when the restart is refused (mid-match / already used).
      requests[0].detail.fallback();
      await flushMicrotasks();
      await flushLit(card);

      expect(card.textContent).toContain("Игрок_7734");
      expect(card.textContent).toContain("citizenship_card.xp_label");
      expect(card.querySelector("#citizenship-login-button")).toBeNull();
    });

    it("does NOT ask for a restart when the auth dialog is dismissed", async () => {
      const card = await appendCard({ visible: true });
      openYandexAuthDialog.mockResolvedValue(false);
      const requests: Event[] = [];
      document.addEventListener(CITIZENSHIP_LOGIN_SUCCEEDED_EVENT, (event) => {
        requests.push(event);
      });

      (
        card.querySelector("#citizenship-login-button") as HTMLButtonElement
      ).click();
      await flushMicrotasks();

      expect(requests).toHaveLength(0);
      expect(logEventAnalytics).toHaveBeenCalledWith(
        "Profile:Login:Restart:Cancelled",
      );
      expect(logEventAnalytics).not.toHaveBeenCalledWith(
        "Profile:Login:Restart:Requested",
      );
    });

    it("ignores re-taps while the auth dialog is open", async () => {
      const card = await appendCard({ visible: true });
      let resolveDialog: (value: boolean) => void = () => {};
      openYandexAuthDialog.mockImplementation(
        () => new Promise<boolean>((resolve) => (resolveDialog = resolve)),
      );

      const loginButton = card.querySelector(
        "#citizenship-login-button",
      ) as HTMLButtonElement;
      loginButton.click();
      loginButton.click();
      loginButton.click();

      expect(logUiTapEvent).toHaveBeenCalledTimes(1);
      expect(openYandexAuthDialog).toHaveBeenCalledTimes(1);

      resolveDialog(false);
      await flushMicrotasks();

      loginButton.click();
      expect(openYandexAuthDialog).toHaveBeenCalledTimes(2);
    });

    it("stays in the guest state when the auth dialog is dismissed", async () => {
      const card = await appendCard({ visible: true });
      openYandexAuthDialog.mockResolvedValue(false);

      (
        card.querySelector("#citizenship-login-button") as HTMLButtonElement
      ).click();
      await flushMicrotasks();
      await flushLit(card);

      expect(card.textContent).toContain("citizenship_card.login_cta");
    });
  });

  describe("authorized, not yet a citizen", () => {
    it("renders name, XP value, and a partial bar without the citizen badge", async () => {
      loadProfile.mockResolvedValue({
        displayName: "Игрок_7734",
        xp: 25,
        isCitizen: false,
      });

      const card = await appendCard({ visible: true });

      expect(card.textContent).toContain("Игрок_7734");
      expect(card.textContent).toContain("citizenship_card.xp_label");
      expect(card.textContent).toContain((25).toLocaleString());
      expect(card.textContent).toContain((100).toLocaleString());
      expect(card.textContent).not.toContain("citizenship_card.citizen_badge");
      expect(card.textContent).not.toContain("citizenship_card.guest_subtitle");

      const bar = card.querySelector("#citizenship-xp-bar-fill") as HTMLElement;
      expect(bar).not.toBeNull();
      expect(bar.style.width).toBe("25%");
    });

    it("caps the bar at 100% while showing XP past the threshold", async () => {
      loadProfile.mockResolvedValue({
        displayName: "Игрок_7734",
        xp: 150,
        isCitizen: false,
      });

      const card = await appendCard({ visible: true });

      const bar = card.querySelector("#citizenship-xp-bar-fill") as HTMLElement;
      expect(bar.style.width).toBe("100%");
      expect(card.textContent).toContain((150).toLocaleString());
    });
  });

  describe("citizen state", () => {
    it("renders the citizen badge and a full bar", async () => {
      loadProfile.mockResolvedValue({
        displayName: "Игрок_7734",
        xp: 124,
        isCitizen: true,
      });

      const card = await appendCard({ visible: true });

      expect(card.textContent).toContain("citizenship_card.citizen_badge");
      expect(card.textContent).toContain((124).toLocaleString());
      const bar = card.querySelector("#citizenship-xp-bar-fill") as HTMLElement;
      expect(bar.style.width).toBe("100%");
    });
  });

  describe("Citizenship:Seen", () => {
    it("fires exactly once when the card is visible, in any state", async () => {
      loadProfile.mockResolvedValue({
        displayName: "Игрок_7734",
        xp: 0,
        isCitizen: false,
      });
      await appendCard({ visible: true });

      expect(logEventAnalytics).toHaveBeenCalledTimes(1);
      expect(logEventAnalytics).toHaveBeenCalledWith("Citizenship:Seen");
    });

    it("does not fire again on re-render or reconnect", async () => {
      const card = await appendCard({ visible: true });

      card.requestUpdate();
      await flushLit(card);
      card.remove();
      document.body.appendChild(card);
      await flushLit(card);
      await flushMicrotasks();

      expect(logEventAnalytics).toHaveBeenCalledTimes(1);
    });

    it("does not fire while the card is not visible", async () => {
      const card = await appendCard({ visible: false });

      expect(logEventAnalytics).not.toHaveBeenCalled();

      setCardVisibility(true);
      card.maybeReportSeen();

      expect(logEventAnalytics).toHaveBeenCalledTimes(1);
    });
  });

  describe("buy citizenship CTA (task 0018)", () => {
    const buyButton = (card: CitizenshipCard) =>
      card.querySelector("#citizenship-buy-button") as HTMLButtonElement | null;
    const errorLine = (card: CitizenshipCard) =>
      card.querySelector("#citizenship-purchase-error");

    it("renders the CTA with the catalog price for an authorized non-citizen", async () => {
      getCatalogProduct.mockReturnValue(CITIZENSHIP_PRODUCT);
      loadProfile.mockResolvedValue(NON_CITIZEN_PROFILE);

      const card = await appendCard({ visible: true });

      const button = buyButton(card);
      expect(button).not.toBeNull();
      expect(button!.textContent).toContain("citizenship_paid.buy_cta");
      expect(button!.textContent).toContain("99 ₽");
      expect(getCatalogProduct).toHaveBeenCalledWith("citizenship");
    });

    it("follows the catalog price — never a hardcoded string", async () => {
      getCatalogProduct.mockReturnValue({
        ...CITIZENSHIP_PRODUCT,
        price: "149 ₽",
      });
      loadProfile.mockResolvedValue(NON_CITIZEN_PROFILE);

      const card = await appendCard({ visible: true });

      expect(buyButton(card)!.textContent).toContain("149 ₽");
      expect(buyButton(card)!.textContent).not.toContain("99 ₽");
    });

    it("is hidden ENTIRELY (no disabled button) when the catalog has no product", async () => {
      getCatalogProduct.mockReturnValue(null);
      loadProfile.mockResolvedValue(NON_CITIZEN_PROFILE);

      const card = await appendCard({ visible: true });

      expect(buyButton(card)).toBeNull();
      expect(card.textContent).not.toContain("citizenship_paid.buy_cta");
    });

    it("is hidden for a citizen even when the product exists (Part D)", async () => {
      getCatalogProduct.mockReturnValue(CITIZENSHIP_PRODUCT);
      loadProfile.mockResolvedValue({
        displayName: "Игрок_7734",
        xp: 1240,
        isCitizen: true,
      });

      const card = await appendCard({ visible: true });

      expect(card.textContent).toContain("citizenship_card.citizen_badge");
      expect(buyButton(card)).toBeNull();
    });

    it("is hidden when the profile read is NOT authoritative (zero-state), even with the product present", async () => {
      // Review R1: every authorized fetch failure degrades to a zero-state
      // reporting isCitizen: false — a real citizen behind a failed read must
      // never see a working buy button (session-long second-charge path).
      getCatalogProduct.mockReturnValue(CITIZENSHIP_PRODUCT);
      loadProfile.mockResolvedValue({
        displayName: "Игрок_7734",
        xp: 0,
        isCitizen: false,
        isAuthoritative: false,
      });

      const card = await appendCard({ visible: true });

      // Logged-in shell renders; the CTA does not.
      expect(card.textContent).toContain("citizenship_card.xp_label");
      expect(buyButton(card)).toBeNull();
      expect(card.textContent).not.toContain("citizenship_paid.buy_cta");
    });

    it("is hidden in the guest state even when the product exists", async () => {
      getCatalogProduct.mockReturnValue(CITIZENSHIP_PRODUCT);
      loadProfile.mockResolvedValue(null);

      const card = await appendCard({ visible: true });

      expect(card.textContent).toContain("citizenship_card.guest_subtitle");
      expect(buyButton(card)).toBeNull();
    });

    it("tap fires UI:Tap:PurchaseCitizenship, runs the flow, and transitions to citizen on grant", async () => {
      getCatalogProduct.mockReturnValue(CITIZENSHIP_PRODUCT);
      loadProfile.mockResolvedValue(NON_CITIZEN_PROFILE);
      const card = await appendCard({ visible: true });
      runPurchase.mockResolvedValue("granted");
      loadProfile.mockResolvedValue({
        displayName: "Игрок_7734",
        xp: 25,
        isCitizen: true,
      });

      buyButton(card)!.click();
      await flushMicrotasks();
      await flushLit(card);

      expect(logUiTapEvent).toHaveBeenCalledWith("PurchaseCitizenship");
      expect(runPurchase).toHaveBeenCalledTimes(1);
      expect(card.textContent).toContain("citizenship_card.citizen_badge");
      expect(buyButton(card)).toBeNull();
      expect(errorLine(card)).toBeNull();
    });

    it("shows the non-blocking error on failure and clears it on a successful retry", async () => {
      getCatalogProduct.mockReturnValue(CITIZENSHIP_PRODUCT);
      loadProfile.mockResolvedValue(NON_CITIZEN_PROFILE);
      const card = await appendCard({ visible: true });
      runPurchase.mockResolvedValue("error");

      buyButton(card)!.click();
      await flushMicrotasks();
      await flushLit(card);

      // Failure: error line visible, button still there — retry is possible.
      expect(errorLine(card)).not.toBeNull();
      expect(card.textContent).toContain("citizenship_paid.purchase_error");
      expect(buyButton(card)).not.toBeNull();

      runPurchase.mockResolvedValue("granted");
      buyButton(card)!.click();
      await flushMicrotasks();
      await flushLit(card);

      expect(runPurchase).toHaveBeenCalledTimes(2);
      expect(errorLine(card)).toBeNull();
    });

    it("ignores re-taps while a purchase is in flight", async () => {
      getCatalogProduct.mockReturnValue(CITIZENSHIP_PRODUCT);
      loadProfile.mockResolvedValue(NON_CITIZEN_PROFILE);
      const card = await appendCard({ visible: true });
      let resolveFlow: (value: string) => void = () => {};
      runPurchase.mockImplementation(
        () => new Promise<string>((resolve) => (resolveFlow = resolve)),
      );

      const button = buyButton(card)!;
      button.click();
      button.click();
      button.click();

      expect(runPurchase).toHaveBeenCalledTimes(1);
      expect(logUiTapEvent).toHaveBeenCalledTimes(1);

      resolveFlow("error");
      await flushMicrotasks();
      await flushLit(card);
      buyButton(card)!.click();
      expect(runPurchase).toHaveBeenCalledTimes(2);
    });

    it("keeps the citizen presentation after a confirmed grant even when the profile re-fetch is stale", async () => {
      getCatalogProduct.mockReturnValue(CITIZENSHIP_PRODUCT);
      loadProfile.mockResolvedValue(NON_CITIZEN_PROFILE);
      const card = await appendCard({ visible: true });
      runPurchase.mockResolvedValue("granted");
      // Re-fetch still reports non-citizen (lag / failure → zero-state): the
      // server-confirmed grant must win — no buy button to charge twice.
      loadProfile.mockResolvedValue(NON_CITIZEN_PROFILE);

      buyButton(card)!.click();
      await flushMicrotasks();
      await flushLit(card);

      expect(card.textContent).toContain("citizenship_card.citizen_badge");
      expect(buyButton(card)).toBeNull();
    });

    it("reveals the CTA when the payments catalog settles after the first render", async () => {
      let settleCatalog: () => void = () => {};
      whenPaymentsCatalogSettled.mockReturnValue(
        new Promise<string>((resolve) => {
          settleCatalog = () => resolve("ready");
        }),
      );
      getCatalogProduct.mockReturnValue(null);
      loadProfile.mockResolvedValue(NON_CITIZEN_PROFILE);
      const card = await appendCard({ visible: true });

      expect(buyButton(card)).toBeNull();

      getCatalogProduct.mockReturnValue(CITIZENSHIP_PRODUCT);
      settleCatalog();
      await flushMicrotasks();
      await flushLit(card);

      expect(buyButton(card)).not.toBeNull();
    });

    it("re-fetches the profile on the purchases-reconciled signal and leaves State 2", async () => {
      getCatalogProduct.mockReturnValue(CITIZENSHIP_PRODUCT);
      loadProfile.mockResolvedValue(NON_CITIZEN_PROFILE);
      const card = await appendCard({ visible: true });
      expect(buyButton(card)).not.toBeNull();

      loadProfile.mockResolvedValue({
        displayName: "Игрок_7734",
        xp: 25,
        isCitizen: true,
      });
      window.dispatchEvent(new CustomEvent(PURCHASES_RECONCILED_EVENT));
      await flushMicrotasks();
      await flushLit(card);

      expect(card.textContent).toContain("citizenship_card.citizen_badge");
      expect(buyButton(card)).toBeNull();
    });
  });

  // ── Tenure grant (task 0253; ADR-112 as amended 2026-09-15) ─────────────
  describe("tenure grant claim (task 0253)", () => {
    async function settle(card: CitizenshipCard): Promise<void> {
      for (let i = 0; i < 4; i++) {
        await flushMicrotasks();
        await flushLit(card);
      }
    }

    /** A stand-in for the real <tenure-grant-modal> in the page. */
    function appendModal(): jest.Mock {
      const modal = document.createElement("tenure-grant-modal");
      const show = jest.fn();
      Object.assign(modal, { show });
      document.body.appendChild(modal);
      return show;
    }

    it("kill switch OFF: no claim (verification 13)", async () => {
      flashistConstants.features.CITIZENSHIP_CARD_ENABLED = false;
      loadProfile.mockResolvedValue(NON_CITIZEN_PROFILE);

      const card = await appendCard({ visible: true });
      await settle(card);

      expect(claimTenureGrant).not.toHaveBeenCalled();
    });

    it("citizenship_ui flag disabled: no claim", async () => {
      isCitizenshipUiEnabled.mockResolvedValue(false);
      loadProfile.mockResolvedValue(NON_CITIZEN_PROFILE);

      const card = await appendCard({ visible: true });
      await settle(card);

      expect(claimTenureGrant).not.toHaveBeenCalled();
    });

    it("enabled: claims once, after the first profile read", async () => {
      loadProfile.mockResolvedValue(NON_CITIZEN_PROFILE);

      const card = await appendCard({ visible: true });
      await settle(card);

      expect(claimTenureGrant).toHaveBeenCalledTimes(1);
      expect(claimTenureGrant).toHaveBeenCalledWith();
      expect(loadProfile.mock.invocationCallOrder[0]).toBeLessThan(
        claimTenureGrant.mock.invocationCallOrder[0],
      );
    });

    it("granted: opens the modal with the XP and refreshes the profile", async () => {
      const show = appendModal();
      loadProfile
        .mockResolvedValueOnce(NON_CITIZEN_PROFILE)
        .mockResolvedValue({ ...NON_CITIZEN_PROFILE, xp: 55 });
      claimTenureGrant.mockResolvedValue({
        status: "granted",
        xpAwarded: 30,
        xp: 55,
      });

      const card = await appendCard({ visible: true });
      await settle(card);

      expect(show).toHaveBeenCalledTimes(1);
      expect(show).toHaveBeenCalledWith({ xpAwarded: 30, xp: 55 });
      expect(loadProfile).toHaveBeenCalledTimes(2);
      expect(card.textContent).toContain("55");
    });

    it.each([
      [{ status: "skipped" }],
      [{ status: "below_minimum" }],
      [{ status: "duplicate" }],
      [{ status: "failed" }],
      [{ status: "granted", xpAwarded: 0, xp: 25 }],
    ])("%o: no modal and no extra profile read", async (result) => {
      const show = appendModal();
      loadProfile.mockResolvedValue(NON_CITIZEN_PROFILE);
      claimTenureGrant.mockResolvedValue(result);

      const card = await appendCard({ visible: true });
      await settle(card);

      expect(claimTenureGrant).toHaveBeenCalledTimes(1);
      expect(show).not.toHaveBeenCalled();
      expect(loadProfile).toHaveBeenCalledTimes(1);
    });

    it("a granted answer after the card left the page opens nothing", async () => {
      const show = appendModal();
      loadProfile.mockResolvedValue(NON_CITIZEN_PROFILE);
      let resolveClaim: (value: unknown) => void = () => {};
      claimTenureGrant.mockReturnValue(
        new Promise((resolve) => {
          resolveClaim = resolve;
        }),
      );

      const card = await appendCard({ visible: true });
      await settle(card);
      card.remove();
      resolveClaim({ status: "granted", xpAwarded: 10, xp: 35 });
      await flushMicrotasks();

      expect(show).not.toHaveBeenCalled();
    });

    it("a claim that rejects never breaks the card", async () => {
      loadProfile.mockResolvedValue(NON_CITIZEN_PROFILE);
      claimTenureGrant.mockRejectedValue(new Error("boom"));
      const warn = jest.spyOn(console, "warn").mockImplementation(() => {});

      const card = await appendCard({ visible: true });
      await settle(card);

      expect(card.textContent).toContain("Игрок_7734");
      expect(warn).toHaveBeenCalledWith(
        "Tenure grant claim failed:",
        expect.any(Error),
      );
    });

    it("the purchases-reconciled refresh never claims again", async () => {
      loadProfile.mockResolvedValue(NON_CITIZEN_PROFILE);

      const card = await appendCard({ visible: true });
      await settle(card);
      window.dispatchEvent(new Event(PURCHASES_RECONCILED_EVENT));
      await settle(card);

      expect(loadProfile).toHaveBeenCalledTimes(2);
      expect(claimTenureGrant).toHaveBeenCalledTimes(1);
    });
  });

  // ── Name change (task 0067, citizens only) ───────────────────────────────
  describe("name change", () => {
    const CITIZEN_PROFILE = {
      displayName: "Игрок_7734",
      xp: 1000,
      isCitizen: true,
      isAuthoritative: true,
      nameChange: null,
    };

    const nameCta = (card: CitizenshipCard) =>
      card.querySelector("#citizenship-name-change-cta");
    const nameInput = (card: CitizenshipCard) =>
      card.querySelector<HTMLInputElement>("#citizenship-name-change-input");
    const nameSubmit = (card: CitizenshipCard) =>
      card.querySelector<HTMLButtonElement>("#citizenship-name-change-submit");
    const nameWithdraw = (card: CitizenshipCard) =>
      card.querySelector<HTMLButtonElement>(
        "#citizenship-name-change-withdraw",
      );
    const nameRetry = (card: CitizenshipCard) =>
      card.querySelector<HTMLButtonElement>("#citizenship-name-change-retry");
    const nameError = (card: CitizenshipCard) =>
      card.querySelector("#citizenship-name-change-error");

    async function openEditor(card: CitizenshipCard) {
      (nameCta(card) as HTMLButtonElement).click();
      await flushLit(card);
      return card;
    }

    async function typeName(card: CitizenshipCard, value: string) {
      const input = nameInput(card)!;
      input.value = value;
      input.dispatchEvent(new Event("input"));
      await flushLit(card);
    }

    // Brief step 1 — the entry point must be absent, not merely disabled.
    describe("visibility", () => {
      it("is hidden for a guest", async () => {
        loadProfile.mockResolvedValue(null);
        const card = await appendCard({ visible: true });
        expect(nameCta(card)).toBeNull();
      });

      it("is hidden for an authorized NON-citizen", async () => {
        loadProfile.mockResolvedValue({
          ...CITIZEN_PROFILE,
          isCitizen: false,
        });
        const card = await appendCard({ visible: true });
        expect(nameCta(card)).toBeNull();
      });

      it("is hidden when the profile read was NOT authoritative", async () => {
        // A zero-state fallback reports isCitizen:false and knows nothing about
        // requests — showing a citizens-only control off it would be a lie the
        // server then rejects with 403.
        loadProfile.mockResolvedValue({
          ...CITIZEN_PROFILE,
          isAuthoritative: false,
        });
        const card = await appendCard({ visible: true });
        expect(nameCta(card)).toBeNull();
      });

      it("is shown for an authoritative citizen", async () => {
        loadProfile.mockResolvedValue(CITIZEN_PROFILE);
        const card = await appendCard({ visible: true });
        expect(nameCta(card)).not.toBeNull();
        expect(card.textContent).toContain("citizenship_name_change.cta");
      });

      it("tolerates a profile view with no nameChange field at all", async () => {
        const { nameChange, ...withoutField } = CITIZEN_PROFILE;
        void nameChange;
        loadProfile.mockResolvedValue(withoutField);
        const card = await appendCard({ visible: true });
        expect(nameCta(card)).not.toBeNull();
      });
    });

    describe("submitting (brief step 2)", () => {
      it("opens an editor and submits the typed name", async () => {
        loadProfile.mockResolvedValue(CITIZEN_PROFILE);
        const card = await openEditor(await appendCard({ visible: true }));
        expect(nameInput(card)).not.toBeNull();
        await typeName(card, "NewName");
        nameSubmit(card)!.click();
        await flushLit(card);
        expect(submitNameChange).toHaveBeenCalledWith("NewName");
      });

      it("trims the submitted name", async () => {
        loadProfile.mockResolvedValue(CITIZEN_PROFILE);
        const card = await openEditor(await appendCard({ visible: true }));
        await typeName(card, "  NewName  ");
        nameSubmit(card)!.click();
        await flushLit(card);
        expect(submitNameChange).toHaveBeenCalledWith("NewName");
      });

      it("re-reads the profile on success rather than latching pending locally", async () => {
        loadProfile.mockResolvedValue(CITIZEN_PROFILE);
        const card = await openEditor(await appendCard({ visible: true }));
        loadProfile.mockClear();
        await typeName(card, "NewName");
        nameSubmit(card)!.click();
        await flushLit(card);
        await flushMicrotasks();
        expect(loadProfile).toHaveBeenCalledTimes(1);
      });

      it("shows the SAME username message the in-game input uses for a broken rule", async () => {
        loadProfile.mockResolvedValue(CITIZEN_PROFILE);
        submitNameChange.mockResolvedValue({
          status: "invalid",
          violation: "too_short",
        });
        const card = await openEditor(await appendCard({ visible: true }));
        await typeName(card, "ab");
        nameSubmit(card)!.click();
        await flushLit(card);
        await flushMicrotasks();
        await flushLit(card);
        expect(nameError(card)!.textContent).toContain("username.too_short");
      });

      it.each([
        ["name_taken", "citizenship_name_change.error_name_taken"],
        ["pending_exists", "citizenship_name_change.error_pending_exists"],
        ["not_citizen", "citizenship_name_change.error_not_citizen"],
        ["error", "citizenship_name_change.error_generic"],
      ])("shows a distinct message for %s", async (status, key) => {
        loadProfile.mockResolvedValue(CITIZEN_PROFILE);
        submitNameChange.mockResolvedValue({ status });
        const card = await openEditor(await appendCard({ visible: true }));
        await typeName(card, "Ivan");
        nameSubmit(card)!.click();
        await flushLit(card);
        await flushMicrotasks();
        await flushLit(card);
        expect(nameError(card)!.textContent).toContain(key);
      });

      it("ignores a second submit while one is in flight", async () => {
        loadProfile.mockResolvedValue(CITIZEN_PROFILE);
        let resolve!: (value: unknown) => void;
        submitNameChange.mockReturnValue(
          new Promise((r) => {
            resolve = r;
          }),
        );
        const card = await openEditor(await appendCard({ visible: true }));
        await typeName(card, "NewName");
        nameSubmit(card)!.click();
        await flushLit(card);
        nameSubmit(card)!.click();
        await flushLit(card);
        expect(submitNameChange).toHaveBeenCalledTimes(1);
        resolve({ status: "ok" });
      });

      it("closes the editor without submitting on cancel", async () => {
        loadProfile.mockResolvedValue(CITIZEN_PROFILE);
        const card = await openEditor(await appendCard({ visible: true }));
        card
          .querySelector<HTMLButtonElement>(
            "#citizenship-name-change-cancel-edit",
          )!
          .click();
        await flushLit(card);
        expect(nameInput(card)).toBeNull();
        expect(nameCta(card)).not.toBeNull();
        expect(submitNameChange).not.toHaveBeenCalled();
      });
    });

    describe("pending state", () => {
      const PENDING = {
        ...CITIZEN_PROFILE,
        nameChange: {
          status: "pending" as const,
          requested_name: "NewName",
          decided_at: null,
        },
      };

      it("shows the pending state and the requested name, not the CTA", async () => {
        loadProfile.mockResolvedValue(PENDING);
        const card = await appendCard({ visible: true });
        expect(card.textContent).toContain(
          "citizenship_name_change.pending_label",
        );
        expect(nameCta(card)).toBeNull();
      });

      // Owner amendment 2 — this button is what a griefed citizen uses to free
      // the one-pending slot they never asked for.
      it("offers a withdraw button that calls the cancel endpoint", async () => {
        loadProfile.mockResolvedValue(PENDING);
        const card = await appendCard({ visible: true });
        expect(nameWithdraw(card)).not.toBeNull();
        nameWithdraw(card)!.click();
        await flushLit(card);
        expect(cancelNameChange).toHaveBeenCalledTimes(1);
      });

      it("re-reads the profile after a successful withdraw", async () => {
        loadProfile.mockResolvedValue(PENDING);
        const card = await appendCard({ visible: true });
        loadProfile.mockClear();
        nameWithdraw(card)!.click();
        await flushLit(card);
        await flushMicrotasks();
        expect(loadProfile).toHaveBeenCalledTimes(1);
      });

      it("treats no_pending as success — the request is already gone", async () => {
        loadProfile.mockResolvedValue(PENDING);
        cancelNameChange.mockResolvedValue({ status: "no_pending" });
        const card = await appendCard({ visible: true });
        loadProfile.mockClear();
        nameWithdraw(card)!.click();
        await flushLit(card);
        await flushMicrotasks();
        await flushLit(card);
        expect(loadProfile).toHaveBeenCalledTimes(1);
        expect(nameError(card)).toBeNull();
      });

      it("shows an error when the withdraw itself fails", async () => {
        loadProfile.mockResolvedValue(PENDING);
        cancelNameChange.mockResolvedValue({ status: "error" });
        const card = await appendCard({ visible: true });
        nameWithdraw(card)!.click();
        await flushLit(card);
        await flushMicrotasks();
        await flushLit(card);
        expect(nameError(card)!.textContent).toContain(
          "citizenship_name_change.error_generic",
        );
      });
    });

    // Brief step 4 — a rejected request must show a rejected state AND let the
    // player try again.
    describe("rejected state", () => {
      const REJECTED = {
        ...CITIZEN_PROFILE,
        nameChange: {
          status: "rejected" as const,
          requested_name: "BadName",
          decided_at: "2026-08-28T10:00:00.000Z",
        },
      };

      it("shows the rejected state and the requested name", async () => {
        loadProfile.mockResolvedValue(REJECTED);
        const card = await appendCard({ visible: true });
        expect(card.textContent).toContain(
          "citizenship_name_change.rejected_label",
        );
        expect(nameRetry(card)).not.toBeNull();
      });

      it("NEVER renders an operator rejection reason — it is not on the wire", async () => {
        loadProfile.mockResolvedValue(REJECTED);
        const card = await appendCard({ visible: true });
        expect(card.textContent).not.toContain("rejection_reason");
      });

      it("lets the player open the editor again and submit a new name", async () => {
        loadProfile.mockResolvedValue(REJECTED);
        const card = await appendCard({ visible: true });
        nameRetry(card)!.click();
        await flushLit(card);
        expect(nameInput(card)).not.toBeNull();
        await typeName(card, "BetterName");
        nameSubmit(card)!.click();
        await flushLit(card);
        expect(submitNameChange).toHaveBeenCalledWith("BetterName");
      });
    });

    describe("approved state", () => {
      it("returns to the plain CTA once a change was approved", async () => {
        loadProfile.mockResolvedValue({
          ...CITIZEN_PROFILE,
          displayName: "NewName",
          nameChange: {
            status: "approved" as const,
            requested_name: "NewName",
            decided_at: "2026-08-28T10:00:00.000Z",
          },
        });
        const card = await appendCard({ visible: true });
        expect(nameCta(card)).not.toBeNull();
        expect(card.textContent).not.toContain(
          "citizenship_name_change.pending_label",
        );
      });
    });
  });
});

function setCardVisibility(visible: boolean): void {
  jest
    .spyOn(
      CitizenshipCard.prototype as never as { isCardVisible: () => boolean },
      "isCardVisible",
    )
    .mockReturnValue(visible);
}

async function appendCard({
  visible,
}: {
  visible: boolean;
}): Promise<CitizenshipCard> {
  setCardVisibility(visible);
  const card = new CitizenshipCard();
  document.body.appendChild(card);
  await flushLit(card);
  await flushMicrotasks();
  await flushLit(card);
  return card;
}

async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

async function flushLit(element: Element): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  if ("updateComplete" in element) {
    await (element as Element & { updateComplete: Promise<unknown> })
      .updateComplete;
  }
}
