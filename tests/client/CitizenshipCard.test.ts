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
      CITIZENSHIP_STATUS_UNVERIFIED: "Citizenship:Status:Unverified",
      CITIZENSHIP_STATUS_READ_FAILED: "Citizenship:Status:ReadFailed",
      CITIZENSHIP_STATUS_RESTART: "Citizenship:Status:Restart",
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
      whenPlatformRecoveredLate: jest.fn(),
      whenYandexAuthorizedLate: jest.fn(),
      reloadApp: jest.fn(),
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
  dismissNameChangeRejection: jest.fn(),
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
import {
  getApprovedName,
  resetApprovedNameForTests,
} from "../../src/client/ApprovedName";
import { resetCitizenshipNoticeReportedForTests } from "../../src/client/CitizenshipNotice";
import { runCitizenshipPurchase } from "../../src/client/CitizenshipPurchase";
import {
  CITIZENSHIP_GRANTED_MID_SESSION_EVENT,
  type CitizenshipGrantedMidSessionDetail,
} from "../../src/client/CitizenshipRestartOffer";
import {
  getCitizenshipStatus,
  getProfileVerificationStatus,
  isCurrentPlayerPaidCitizen,
  publishPaidCitizenship,
  resetCitizenshipStatusForTests,
} from "../../src/client/CitizenshipStatus";
import {
  FlashistFacade,
  flashist_logEventAnalytics,
  flashistConstants,
} from "../../src/client/flashist/FlashistFacade";
import {
  cancelNameChangeRequest,
  dismissNameChangeRejection,
  submitNameChangeRequest,
} from "../../src/client/NameChangeRequest";
import { PURCHASES_RECONCILED_EVENT } from "../../src/client/PaymentsReconciliation";
import { loadPlayerProfileView } from "../../src/client/PlayerProfileView";
import {
  PROFILE_READ_RESTART_MARKER_KEY,
  resetProfileReadRestartForTests,
} from "../../src/client/ProfileReadRestart";
import {
  beginJoiningLobby,
  reportBackOnStartScreen,
  resetStartScreenPresenceForTests,
  setStartScreenPresenceSource,
} from "../../src/client/StartScreenPresence";
import { maybeClaimTenureGrant } from "../../src/client/TenureGrantClaim";
import { translateText } from "../../src/client/Utils";

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
const whenPlatformRecoveredLate = FlashistFacade.instance
  .whenPlatformRecoveredLate as jest.Mock;
const whenYandexAuthorizedLate = FlashistFacade.instance
  .whenYandexAuthorizedLate as jest.Mock;
const reloadApp = FlashistFacade.instance.reloadApp as jest.Mock;
const logEventAnalytics = flashist_logEventAnalytics as jest.Mock;
const loadProfile = loadPlayerProfileView as jest.Mock;
const runPurchase = runCitizenshipPurchase as jest.Mock;
const submitNameChange = submitNameChangeRequest as jest.Mock;
const cancelNameChange = cancelNameChangeRequest as jest.Mock;
const dismissRejection = dismissNameChangeRejection as jest.Mock;
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
  // No approved name (task 0321).
  approvedName: null,
  // Not a verified owner view (task 0250 S3b) — fail-closed.
  isPaidCitizen: false,
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
    // Late platform recovery (task 0329): by default the platform never
    // recovers late — the signal never settles.
    whenPlatformRecoveredLate.mockReturnValue(new Promise(() => {}));
    // Late Yandex login (task 0397): by default the boot answer stands.
    whenYandexAuthorizedLate.mockReturnValue(new Promise(() => {}));
    runPurchase.mockResolvedValue("error");
    submitNameChange.mockResolvedValue({ status: "ok" });
    cancelNameChange.mockResolvedValue({ status: "ok" });
    claimTenureGrant.mockResolvedValue({ status: "skipped" });
    resetCitizenshipSeenReportedForTests();
    resetCitizenshipStatusForTests();
    resetApprovedNameForTests();
    resetStartScreenPresenceForTests();
    resetCitizenshipNoticeReportedForTests();
    resetProfileReadRestartForTests();
    sessionStorage.clear();
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
      // A real (authoritative) read: a fixture without `isAuthoritative` is a
      // failed read since task 0397 and would also log ReadFailed.
      loadProfile.mockResolvedValue({
        displayName: "Игрок_7734",
        xp: 0,
        isCitizen: false,
        isAuthoritative: true,
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
      expect(show).toHaveBeenCalledWith(
        { xpAwarded: 30, xp: 55 },
        expect.any(Function),
      );
      expect(loadProfile).toHaveBeenCalledTimes(2);
      expect(card.textContent).toContain("55");
    });

    // Task 0303 (owner ruling Q-A, 2026-09-28): a gift that MADE the player a
    // citizen offers the restart popup, after the thank-you popup is closed.
    describe("restart offer after a gift that made a citizen (task 0303)", () => {
      let signals: CitizenshipGrantedMidSessionDetail[] = [];
      const onSignal = (event: Event) => {
        signals.push(
          (event as CustomEvent<CitizenshipGrantedMidSessionDetail>).detail,
        );
      };

      beforeEach(() => {
        signals = [];
        window.addEventListener(
          CITIZENSHIP_GRANTED_MID_SESSION_EVENT,
          onSignal,
        );
      });

      afterEach(() => {
        window.removeEventListener(
          CITIZENSHIP_GRANTED_MID_SESSION_EVENT,
          onSignal,
        );
      });

      const CITIZEN_PROFILE = {
        ...NON_CITIZEN_PROFILE,
        xp: 100,
        isCitizen: true,
      };
      const closeThankYou = (show: jest.Mock) =>
        (show.mock.calls[0][1] as () => void)();

      it("fires tenure only once the thank-you popup is closed", async () => {
        const show = appendModal();
        loadProfile
          .mockResolvedValueOnce({ ...NON_CITIZEN_PROFILE, xp: 60 })
          .mockResolvedValue(CITIZEN_PROFILE);
        claimTenureGrant.mockResolvedValue({
          status: "granted",
          xpAwarded: 40,
          xp: 100,
        });

        const card = await appendCard({ visible: true });
        await settle(card);
        expect(show).toHaveBeenCalledTimes(1);
        expect(signals).toEqual([]);

        closeThankYou(show);
        await settle(card);

        expect(signals).toEqual([{ source: "tenure" }]);
      });

      it("fires once the re-read lands, when the popup was closed first", async () => {
        const show = appendModal();
        let resolveReRead: (value: unknown) => void = () => {};
        loadProfile
          .mockResolvedValueOnce({ ...NON_CITIZEN_PROFILE, xp: 60 })
          .mockReturnValue(
            new Promise((resolve) => {
              resolveReRead = resolve;
            }),
          );
        claimTenureGrant.mockResolvedValue({
          status: "granted",
          xpAwarded: 40,
          xp: 100,
        });

        const card = await appendCard({ visible: true });
        await settle(card);
        closeThankYou(show);
        await settle(card);
        expect(signals).toEqual([]);

        resolveReRead(CITIZEN_PROFILE);
        await settle(card);

        expect(signals).toEqual([{ source: "tenure" }]);
      });

      it("an existing citizen who gets the gift: nothing", async () => {
        const show = appendModal();
        loadProfile.mockResolvedValue(CITIZEN_PROFILE);
        claimTenureGrant.mockResolvedValue({
          status: "granted",
          xpAwarded: 20,
          xp: 100,
        });

        const card = await appendCard({ visible: true });
        await settle(card);
        closeThankYou(show);
        await settle(card);

        expect(show).toHaveBeenCalledTimes(1);
        expect(signals).toEqual([]);
      });

      it("a gift that leaves the player below the threshold: nothing", async () => {
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
        closeThankYou(show);
        await settle(card);

        expect(signals).toEqual([]);
      });

      it("a failed re-read: nothing (the next load catches up)", async () => {
        const show = appendModal();
        loadProfile
          .mockResolvedValueOnce({ ...NON_CITIZEN_PROFILE, xp: 60 })
          // The zero-state fallback of a failed read: not authoritative.
          .mockResolvedValue({
            ...NON_CITIZEN_PROFILE,
            xp: 0,
            isAuthoritative: false,
          });
        claimTenureGrant.mockResolvedValue({
          status: "granted",
          xpAwarded: 40,
          xp: 100,
        });

        const card = await appendCard({ visible: true });
        await settle(card);
        closeThankYou(show);
        await settle(card);

        expect(signals).toEqual([]);
      });
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

  // Task 0336 (0329 review R3): the tenure thank-you popup never opens over a
  // lobby or match. The claim and the profile re-read are network round trips,
  // so the player can join while they run — and a join counts as away from its
  // first line (beginJoiningLobby), not only once Main has set gameStop.
  describe("tenure popup never over a lobby or match (task 0336)", () => {
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

    /** The tenure claim, answered by hand. */
    function deferredClaim(): { answer: (result: unknown) => void } {
      let answer: (result: unknown) => void = () => {};
      claimTenureGrant.mockReturnValue(
        new Promise((resolve) => {
          answer = resolve;
        }),
      );
      return { answer: (result) => answer(result) };
    }

    const GRANTED = { status: "granted", xpAwarded: 30, xp: 55 };

    let away = false;
    const goAway = () => {
      away = true;
    };
    const comeBack = () => {
      away = false;
      reportBackOnStartScreen();
    };

    beforeEach(() => {
      away = false;
      setStartScreenPresenceSource(() => away);
      loadProfile
        .mockResolvedValueOnce(NON_CITIZEN_PROFILE)
        .mockResolvedValue({ ...NON_CITIZEN_PROFILE, xp: 55 });
    });

    it("C1. gate reveal, the player joins while the claim is pending: no popup until back on the start screen", async () => {
      const show = appendModal();
      const claim = deferredClaim();

      const card = await appendCard({ visible: true });
      await settle(card);
      expect(claimTenureGrant).toHaveBeenCalledTimes(1);

      goAway();
      claim.answer(GRANTED);
      await settle(card);

      expect(show).not.toHaveBeenCalled();
      // The re-read is not held back with the popup: status and XP publish now.
      expect(loadProfile).toHaveBeenCalledTimes(2);
      expect(card.textContent).toContain("55");

      comeBack();
      await settle(card);

      expect(show).toHaveBeenCalledTimes(1);
      expect(show).toHaveBeenCalledWith(
        { xpAwarded: 30, xp: 55 },
        expect.any(Function),
      );
    });

    it("C2. gate reveal, the player joins during the first profile read: no popup until back", async () => {
      const show = appendModal();
      let answerFirstRead: (value: unknown) => void = () => {};
      loadProfile.mockReset();
      loadProfile
        .mockReturnValueOnce(
          new Promise((resolve) => {
            answerFirstRead = resolve;
          }),
        )
        .mockResolvedValue({ ...NON_CITIZEN_PROFILE, xp: 55 });
      claimTenureGrant.mockResolvedValue(GRANTED);

      const card = await appendCard({ visible: true });
      await settle(card);
      expect(claimTenureGrant).not.toHaveBeenCalled();

      goAway();
      answerFirstRead(NON_CITIZEN_PROFILE);
      await settle(card);

      expect(claimTenureGrant).toHaveBeenCalledTimes(1);
      expect(show).not.toHaveBeenCalled();
      expect(loadProfile).toHaveBeenCalledTimes(2);

      comeBack();
      await settle(card);

      expect(show).toHaveBeenCalledTimes(1);
    });

    it("C3. late reveal (0329): recovers on the start screen, the player leaves during the claim: no popup until back", async () => {
      const show = appendModal();
      let recover: () => void = () => {};
      whenPlatformRecoveredLate.mockReturnValue(
        new Promise<void>((resolve) => {
          recover = () => resolve();
        }),
      );
      isCitizenshipUiEnabled.mockResolvedValueOnce(false);
      const claim = deferredClaim();

      const card = await appendCard({ visible: true });
      isCitizenshipUiEnabled.mockResolvedValue(true);
      recover();
      await settle(card);
      expect(card.classList.contains("hidden")).toBe(false);
      expect(claimTenureGrant).toHaveBeenCalledTimes(1);

      goAway();
      claim.answer(GRANTED);
      await settle(card);

      expect(show).not.toHaveBeenCalled();

      comeBack();
      await settle(card);

      expect(show).toHaveBeenCalledTimes(1);
    });

    it("C4. a join still in its setup awaits (gameStop not set yet) holds the popup back", async () => {
      const show = appendModal();
      const claim = deferredClaim();

      const card = await appendCard({ visible: true });
      await settle(card);

      // The source still reads "on the start screen": Main has not set gameStop.
      const endJoining = beginJoiningLobby();
      claim.answer(GRANTED);
      await settle(card);
      expect(show).not.toHaveBeenCalled();

      goAway(); // gameStop set: the join's setup is over
      endJoining();
      await settle(card);
      expect(show).not.toHaveBeenCalled();

      comeBack();
      await settle(card);
      expect(show).toHaveBeenCalledTimes(1);
    });

    it("C5. a join whose setup fails shows the held popup (no hang)", async () => {
      const show = appendModal();
      const claim = deferredClaim();

      const card = await appendCard({ visible: true });
      await settle(card);

      const endJoining = beginJoiningLobby();
      claim.answer(GRANTED);
      await settle(card);
      expect(show).not.toHaveBeenCalled();

      endJoining(); // failed: gameStop was never set
      await settle(card);

      expect(show).toHaveBeenCalledTimes(1);
    });

    it("C6. the player stays on the start screen: the popup shows once, and a later return shows nothing more", async () => {
      const show = appendModal();
      claimTenureGrant.mockResolvedValue(GRANTED);

      const card = await appendCard({ visible: true });
      await settle(card);
      expect(show).toHaveBeenCalledTimes(1);

      reportBackOnStartScreen();
      await settle(card);

      expect(show).toHaveBeenCalledTimes(1);
    });

    it("C7. a gift that made a citizen, popup held back: the restart signal waits for the popup to be closed", async () => {
      const signals: CitizenshipGrantedMidSessionDetail[] = [];
      const onSignal = (event: Event) => {
        signals.push(
          (event as CustomEvent<CitizenshipGrantedMidSessionDetail>).detail,
        );
      };
      window.addEventListener(CITIZENSHIP_GRANTED_MID_SESSION_EVENT, onSignal);
      try {
        const show = appendModal();
        loadProfile.mockReset();
        loadProfile
          .mockResolvedValueOnce({ ...NON_CITIZEN_PROFILE, xp: 60 })
          .mockResolvedValue({
            ...NON_CITIZEN_PROFILE,
            xp: 100,
            isCitizen: true,
          });
        const claim = deferredClaim();

        const card = await appendCard({ visible: true });
        await settle(card);

        goAway();
        claim.answer({ status: "granted", xpAwarded: 40, xp: 100 });
        await settle(card);
        expect(show).not.toHaveBeenCalled();
        expect(signals).toEqual([]);

        comeBack();
        await settle(card);
        expect(show).toHaveBeenCalledTimes(1);
        expect(signals).toEqual([]);

        (show.mock.calls[0][1] as () => void)();
        await settle(card);

        expect(signals).toEqual([{ source: "tenure" }]);
      } finally {
        window.removeEventListener(
          CITIZENSHIP_GRANTED_MID_SESSION_EVENT,
          onSignal,
        );
      }
    });

    it("C8. a card removed while its popup waits opens nothing on the return", async () => {
      const show = appendModal();
      const claim = deferredClaim();

      const card = await appendCard({ visible: true });
      await settle(card);

      goAway();
      claim.answer(GRANTED);
      await settle(card);
      card.remove();

      comeBack();
      await settle(card);

      expect(show).not.toHaveBeenCalled();
    });
  });

  // ── Name change (task 0067, citizens only) ───────────────────────────────
  // Task 0302: the card is the page's only citizenship reader; perk locks (the
  // private-lobby row) follow the status it publishes.
  describe("publishes citizenship status (task 0302)", () => {
    const buyButton = (card: CitizenshipCard) =>
      card.querySelector("#citizenship-buy-button") as HTMLButtonElement | null;

    it("publishes citizen for an authoritative citizen profile", async () => {
      loadProfile.mockResolvedValue({
        ...NON_CITIZEN_PROFILE,
        isCitizen: true,
      });
      await appendCard({ visible: true });
      expect(getCitizenshipStatus()).toBe("citizen");
    });

    it("publishes not_citizen for an authoritative non-citizen", async () => {
      loadProfile.mockResolvedValue(NON_CITIZEN_PROFILE);
      await appendCard({ visible: true });
      expect(getCitizenshipStatus()).toBe("not_citizen");
    });

    it("publishes not_citizen for a guest", async () => {
      loadProfile.mockResolvedValue(null);
      await appendCard({ visible: true });
      expect(getCitizenshipStatus()).toBe("not_citizen");
    });

    it("publishes nothing (stays unknown) while the card is disabled", async () => {
      isCitizenshipUiEnabled.mockResolvedValue(false);
      loadProfile.mockResolvedValue({
        ...NON_CITIZEN_PROFILE,
        isCitizen: true,
      });
      await appendCard({ visible: true });
      expect(getCitizenshipStatus()).toBe("unknown");
    });

    it("publishes citizen right after a server-confirmed grant, before the re-fetch settles", async () => {
      getCatalogProduct.mockReturnValue(CITIZENSHIP_PRODUCT);
      loadProfile.mockResolvedValue(NON_CITIZEN_PROFILE);
      const card = await appendCard({ visible: true });
      expect(getCitizenshipStatus()).toBe("not_citizen");
      runPurchase.mockResolvedValue("granted");
      // The follow-up re-fetch never settles: only the publish made at the
      // moment of the confirmed grant can unlock the perk.
      loadProfile.mockReturnValue(new Promise(() => {}));

      buyButton(card)!.click();
      await flushMicrotasks();
      await flushLit(card);

      expect(getCitizenshipStatus()).toBe("citizen");
    });
  });

  // Task 0248: the interstitial-ad gate reads the paid answer the card
  // publishes. Only a verified paid read is paid; every applied read
  // republishes, so a failed read brings ads back (fail open).
  describe("publishes paid citizenship (task 0248)", () => {
    const buyButton = (card: CitizenshipCard) =>
      card.querySelector("#citizenship-buy-button") as HTMLButtonElement | null;

    // Two chained reads need more than one flush to drain.
    async function settle(card: CitizenshipCard): Promise<void> {
      for (let i = 0; i < 4; i++) {
        await flushMicrotasks();
        await flushLit(card);
      }
    }

    const reconcile = () =>
      window.dispatchEvent(new CustomEvent(PURCHASES_RECONCILED_EVENT));

    const PAID_PROFILE = {
      ...NON_CITIZEN_PROFILE,
      xp: 100,
      isCitizen: true,
      isPaidCitizen: true,
    };
    // What loadPlayerProfileView returns on a failed or timed-out read.
    const FAILED_READ_PROFILE = {
      ...NON_CITIZEN_PROFILE,
      xp: 0,
      isAuthoritative: false,
    };

    it("publishes true for a verified paid owner view", async () => {
      loadProfile.mockResolvedValue(PAID_PROFILE);
      await appendCard({ visible: true });
      expect(isCurrentPlayerPaidCitizen()).toBe(true);
    });

    it.each([
      ["a guest", null],
      ["a failed read (zero-state)", FAILED_READ_PROFILE],
      [
        "an earned-only citizen",
        { ...NON_CITIZEN_PROFILE, xp: 100, isCitizen: true },
      ],
      [
        "a non-authoritative read claiming paid",
        { ...PAID_PROFILE, isAuthoritative: false },
      ],
    ])("publishes false for %s", async (_label, view) => {
      // Seeded true so the test proves the card overwrote it.
      publishPaidCitizenship(true);
      loadProfile.mockResolvedValue(view);
      await appendCard({ visible: true });
      expect(isCurrentPlayerPaidCitizen()).toBe(false);
    });

    it("publishes nothing when CITIZENSHIP_CARD_ENABLED is off", async () => {
      flashistConstants.features.CITIZENSHIP_CARD_ENABLED = false;
      loadProfile.mockResolvedValue(PAID_PROFILE);
      await appendCard({ visible: true });
      expect(loadProfile).not.toHaveBeenCalled();
      expect(isCurrentPlayerPaidCitizen()).toBe(false);
    });

    it("publishes nothing when citizenship_ui is off", async () => {
      isCitizenshipUiEnabled.mockResolvedValue(false);
      loadProfile.mockResolvedValue(PAID_PROFILE);
      await appendCard({ visible: true });
      expect(loadProfile).not.toHaveBeenCalled();
      expect(isCurrentPlayerPaidCitizen()).toBe(false);
    });

    it("a later failed re-read flips true back to false", async () => {
      loadProfile.mockResolvedValue(PAID_PROFILE);
      const card = await appendCard({ visible: true });
      expect(isCurrentPlayerPaidCitizen()).toBe(true);

      loadProfile.mockResolvedValue(FAILED_READ_PROFILE);
      reconcile();
      await settle(card);

      expect(loadProfile).toHaveBeenCalledTimes(2);
      expect(isCurrentPlayerPaidCitizen()).toBe(false);
    });

    it("a superseded (stale) read does not overwrite a newer one", async () => {
      let resolveFirst: (value: unknown) => void = () => {};
      const firstRead = new Promise((resolve) => {
        resolveFirst = resolve;
      });
      loadProfile
        .mockReturnValueOnce(firstRead)
        .mockResolvedValueOnce(PAID_PROFILE);

      const card = await appendCard({ visible: true });
      reconcile();
      await settle(card);
      expect(isCurrentPlayerPaidCitizen()).toBe(true);

      // The slow first read lands with the older, unpaid answer.
      resolveFirst(NON_CITIZEN_PROFILE);
      await settle(card);

      expect(isCurrentPlayerPaidCitizen()).toBe(true);
    });

    it("publishes true from the re-read after a purchase", async () => {
      getCatalogProduct.mockReturnValue(CITIZENSHIP_PRODUCT);
      loadProfile.mockResolvedValue(NON_CITIZEN_PROFILE);
      const card = await appendCard({ visible: true });
      expect(isCurrentPlayerPaidCitizen()).toBe(false);
      runPurchase.mockResolvedValue("granted");
      loadProfile.mockResolvedValue(PAID_PROFILE);

      buyButton(card)!.click();
      await settle(card);

      expect(runPurchase).toHaveBeenCalledTimes(1);
      expect(isCurrentPlayerPaidCitizen()).toBe(true);
    });

    it("does not publish true on a confirmed grant whose re-read is unverified", async () => {
      // paidGrantConfirmed is deliberately not used (ADR-116 Decision 4).
      getCatalogProduct.mockReturnValue(CITIZENSHIP_PRODUCT);
      loadProfile.mockResolvedValue(NON_CITIZEN_PROFILE);
      const card = await appendCard({ visible: true });
      runPurchase.mockResolvedValue("granted");
      // An unverified re-read: citizen, but not the owner view.
      loadProfile.mockResolvedValue({
        ...NON_CITIZEN_PROFILE,
        xp: 100,
        isCitizen: true,
      });

      buyButton(card)!.click();
      await settle(card);

      expect(getCitizenshipStatus()).toBe("citizen");
      expect(isCurrentPlayerPaidCitizen()).toBe(false);
    });
  });

  // Task 0321: the start-screen name box locks to what the card publishes.
  describe("publishes the approved name (task 0321)", () => {
    const APPROVED_PROFILE = {
      ...NON_CITIZEN_PROFILE,
      isCitizen: true,
      displayName: "Commander",
      approvedName: "Commander",
    };

    it("publishes approved for an authoritative read with a display_name", async () => {
      loadProfile.mockResolvedValue(APPROVED_PROFILE);
      await appendCard({ visible: true });
      expect(getApprovedName()).toEqual({
        kind: "approved",
        name: "Commander",
      });
    });

    // Owner ruling Q1 (2026-09-28): the lock follows display_name, not
    // citizenship. This also pins the 0319/0325 watch item: if display_name
    // ever stops reaching unverified reads, the lock silently stops.
    it("publishes approved for a NON-citizen with a display_name (Q1)", async () => {
      loadProfile.mockResolvedValue({
        ...APPROVED_PROFILE,
        isCitizen: false,
      });
      await appendCard({ visible: true });
      expect(getApprovedName()).toEqual({
        kind: "approved",
        name: "Commander",
      });
    });

    it("publishes none for an authoritative read without one", async () => {
      loadProfile.mockResolvedValue(NON_CITIZEN_PROFILE);
      await appendCard({ visible: true });
      expect(getApprovedName()).toEqual({ kind: "none" });
    });

    it("publishes nothing for a guest", async () => {
      loadProfile.mockResolvedValue(null);
      await appendCard({ visible: true });
      expect(getApprovedName()).toEqual({ kind: "unknown" });
    });

    it("publishes nothing for a zero-state (failed or timed-out) read", async () => {
      loadProfile.mockResolvedValue({
        ...APPROVED_PROFILE,
        isAuthoritative: false,
        approvedName: null,
      });
      await appendCard({ visible: true });
      expect(getApprovedName()).toEqual({ kind: "unknown" });
    });

    it("publishes nothing while the card is disabled", async () => {
      isCitizenshipUiEnabled.mockResolvedValue(false);
      loadProfile.mockResolvedValue(APPROVED_PROFILE);
      await appendCard({ visible: true });
      expect(getApprovedName()).toEqual({ kind: "unknown" });
      expect(loadProfile).not.toHaveBeenCalled();
    });

    it("a failed re-read after a good one leaves the approved name in place", async () => {
      loadProfile.mockResolvedValue(APPROVED_PROFILE);
      await appendCard({ visible: true });
      loadProfile.mockResolvedValue({
        ...APPROVED_PROFILE,
        isAuthoritative: false,
        approvedName: null,
      });

      window.dispatchEvent(new Event(PURCHASES_RECONCILED_EVENT));
      await flushMicrotasks();

      expect(loadProfile).toHaveBeenCalledTimes(2);
      expect(getApprovedName()).toEqual({
        kind: "approved",
        name: "Commander",
      });
    });

    it("a re-read showing the name cleared publishes none (task 0314)", async () => {
      loadProfile.mockResolvedValue(APPROVED_PROFILE);
      await appendCard({ visible: true });
      loadProfile.mockResolvedValue({
        ...APPROVED_PROFILE,
        approvedName: null,
      });

      window.dispatchEvent(new Event(PURCHASES_RECONCILED_EVENT));
      await flushMicrotasks();

      expect(getApprovedName()).toEqual({ kind: "none" });
    });

    it("stays the single profile reader: one load, one read", async () => {
      loadProfile.mockResolvedValue(APPROVED_PROFILE);
      await appendCard({ visible: true });
      expect(loadProfile).toHaveBeenCalledTimes(1);
    });
  });

  // ── Task 0326: a slow, older profile read never overwrites a newer one ──
  // Owner ruling Q1 (2026-09-28): drop a read only if a NEWER read has already
  // been applied. Ruling Q2: prove one server read per refresh, never retried —
  // `Citizenship:Earned:XP` is dormant (task 0250 S1, D4), so it fires zero
  // times and cannot be counted here.
  describe("stale-read guard (task 0326)", () => {
    const buyButton = (card: CitizenshipCard) =>
      card.querySelector("#citizenship-buy-button") as HTMLButtonElement | null;

    // Two chained reads need more than one flush to drain.
    async function settle(card: CitizenshipCard): Promise<void> {
      for (let i = 0; i < 4; i++) {
        await flushMicrotasks();
        await flushLit(card);
      }
    }

    /** A read the test resolves by hand, to control the landing order. */
    function deferredRead(): {
      promise: Promise<unknown>;
      resolve: (value: unknown) => void;
    } {
      let resolve: (value: unknown) => void = () => {};
      const promise = new Promise((r) => {
        resolve = r;
      });
      return { promise, resolve };
    }

    const reconcile = () =>
      window.dispatchEvent(new CustomEvent(PURCHASES_RECONCILED_EVENT));

    const CITIZEN_PROFILE = {
      ...NON_CITIZEN_PROFILE,
      xp: 100,
      isCitizen: true,
    };

    it("the first read landing after the reconciliation re-read is dropped", async () => {
      getCatalogProduct.mockReturnValue(CITIZENSHIP_PRODUCT);
      const firstRead = deferredRead();
      loadProfile
        .mockReturnValueOnce(firstRead.promise)
        .mockResolvedValueOnce({ ...CITIZEN_PROFILE, approvedName: "New" });

      const card = await appendCard({ visible: true });
      // The first read is in flight; reconciliation re-grants meanwhile.
      expect(loadProfile).toHaveBeenCalledTimes(1);
      reconcile();
      await settle(card);
      expect(card.textContent).toContain("citizenship_card.citizen_badge");

      // The slow first read finally lands with the older, non-citizen answer.
      firstRead.resolve({ ...NON_CITIZEN_PROFILE, approvedName: "Old" });
      await settle(card);

      expect(card.textContent).toContain("citizenship_card.citizen_badge");
      expect(buyButton(card)).toBeNull();
      expect(getCitizenshipStatus()).toBe("citizen");
      expect(getApprovedName()).toEqual({ kind: "approved", name: "New" });
      // One read per refresh: nothing dropped is ever retried.
      expect(loadProfile).toHaveBeenCalledTimes(2);
    });

    describe("an awaiting caller still resumes when its read is superseded", () => {
      let signals: CitizenshipGrantedMidSessionDetail[] = [];
      const onSignal = (event: Event) => {
        signals.push(
          (event as CustomEvent<CitizenshipGrantedMidSessionDetail>).detail,
        );
      };

      beforeEach(() => {
        signals = [];
        window.addEventListener(
          CITIZENSHIP_GRANTED_MID_SESSION_EVENT,
          onSignal,
        );
      });

      afterEach(() => {
        window.removeEventListener(
          CITIZENSHIP_GRANTED_MID_SESSION_EVENT,
          onSignal,
        );
      });

      function appendModal(): jest.Mock {
        const modal = document.createElement("tenure-grant-modal");
        const show = jest.fn();
        Object.assign(modal, { show });
        document.body.appendChild(modal);
        return show;
      }
      const closeThankYou = (show: jest.Mock) =>
        (show.mock.calls[0][1] as () => void)();

      it("tenure: a stale re-read is dropped and the restart offer still fires", async () => {
        const show = appendModal();
        const tenureReRead = deferredRead();
        loadProfile
          .mockResolvedValueOnce({ ...NON_CITIZEN_PROFILE, xp: 60 })
          .mockReturnValueOnce(tenureReRead.promise)
          .mockResolvedValueOnce(CITIZEN_PROFILE);
        claimTenureGrant.mockResolvedValue({
          status: "granted",
          xpAwarded: 40,
          xp: 100,
        });

        const card = await appendCard({ visible: true });
        await settle(card);
        // The tenure re-read is in flight; a newer reconciliation read lands.
        expect(loadProfile).toHaveBeenCalledTimes(2);
        reconcile();
        await settle(card);

        tenureReRead.resolve({ ...NON_CITIZEN_PROFILE, xp: 60 });
        await settle(card);
        closeThankYou(show);
        await settle(card);

        expect(signals).toEqual([{ source: "tenure" }]);
        expect(card.textContent).toContain("citizenship_card.citizen_badge");
        expect(loadProfile).toHaveBeenCalledTimes(3);
      });

      it("name submit: a superseded re-read still clears the in-flight flag", async () => {
        const IDLE_CITIZEN = { ...CITIZEN_PROFILE, nameChange: null };
        loadProfile.mockResolvedValue({
          ...IDLE_CITIZEN,
          displayName: "Before",
        });
        const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
        const card = await appendCard({ visible: true });

        async function submitName(name: string): Promise<void> {
          (
            card.querySelector(
              "#citizenship-name-change-cta",
            ) as HTMLButtonElement
          ).click();
          await flushLit(card);
          const input = card.querySelector<HTMLInputElement>(
            "#citizenship-name-change-input",
          )!;
          input.value = name;
          input.dispatchEvent(new Event("input"));
          await flushLit(card);
          card
            .querySelector<HTMLButtonElement>(
              "#citizenship-name-change-submit",
            )!
            .click();
          await flushLit(card);
        }

        const submitReRead = deferredRead();
        loadProfile
          .mockReturnValueOnce(submitReRead.promise)
          .mockResolvedValueOnce({ ...IDLE_CITIZEN, displayName: "Fresh" });
        await submitName("NewName");
        await settle(card);
        expect(loadProfile).toHaveBeenCalledTimes(2);
        reconcile();
        await settle(card);

        submitReRead.resolve({ ...IDLE_CITIZEN, displayName: "Stale" });
        await settle(card);

        expect(card.textContent).toContain("Fresh");
        expect(card.textContent).not.toContain("Stale");
        expect(loadProfile).toHaveBeenCalledTimes(3);

        // The flag was cleared, so a second submit goes through.
        loadProfile.mockResolvedValue({
          ...IDLE_CITIZEN,
          displayName: "Fresh",
        });
        await submitName("OtherName");
        await settle(card);
        expect(submitNameChange).toHaveBeenCalledTimes(2);
        expect(submitNameChange).toHaveBeenLastCalledWith("OtherName");
        expect(loadProfile).toHaveBeenCalledTimes(4);
        expect(warn).not.toHaveBeenCalled();
      });

      // Owner ruling Q1: an older read that is still newer than the screen is
      // applied, so the tenure check sees the gift even while a later read is
      // still loading.
      it("tenure: the re-read applies while a newer read is still loading", async () => {
        const show = appendModal();
        const tenureReRead = deferredRead();
        const laterRead = deferredRead();
        loadProfile
          .mockResolvedValueOnce({ ...NON_CITIZEN_PROFILE, xp: 60 })
          .mockReturnValueOnce(tenureReRead.promise)
          .mockReturnValueOnce(laterRead.promise);
        claimTenureGrant.mockResolvedValue({
          status: "granted",
          xpAwarded: 40,
          xp: 100,
        });

        const card = await appendCard({ visible: true });
        await settle(card);
        expect(loadProfile).toHaveBeenCalledTimes(2);
        reconcile();
        await settle(card);
        expect(loadProfile).toHaveBeenCalledTimes(3);

        tenureReRead.resolve(CITIZEN_PROFILE);
        await settle(card);
        closeThankYou(show);
        await settle(card);

        expect(signals).toEqual([{ source: "tenure" }]);
        laterRead.resolve(CITIZEN_PROFILE);
        await settle(card);
        expect(card.textContent).toContain("citizenship_card.citizen_badge");
      });
    });

    it("an older read that lands while a newer one is pending is applied, then the newer one", async () => {
      loadProfile.mockResolvedValueOnce(NON_CITIZEN_PROFILE);
      const card = await appendCard({ visible: true });
      await settle(card);

      const olderRead = deferredRead();
      const newerRead = deferredRead();
      loadProfile
        .mockReturnValueOnce(olderRead.promise)
        .mockReturnValueOnce(newerRead.promise);
      reconcile();
      reconcile();
      await settle(card);
      expect(loadProfile).toHaveBeenCalledTimes(3);

      olderRead.resolve({ ...CITIZEN_PROFILE, displayName: "Middle" });
      await settle(card);
      expect(card.textContent).toContain("citizenship_card.citizen_badge");
      expect(card.textContent).toContain("Middle");
      expect(getCitizenshipStatus()).toBe("citizen");

      newerRead.resolve({ ...CITIZEN_PROFILE, displayName: "Latest" });
      await settle(card);
      expect(card.textContent).toContain("Latest");
      expect(card.textContent).not.toContain("Middle");
      expect(loadProfile).toHaveBeenCalledTimes(3);
    });

    // Review R1, accepted residual "Fast-failing newer read wins": the guard
    // ranks reads by issue order, not quality. A newer read that FAILS fast
    // (the non-authoritative zero-state) is applied, and the older good read
    // landing after it is dropped. This pins today's behaviour; changing it is
    // an owner decision, not a fix.
    it("pins R1: a newer read failing fast wins over an older good read landing later", async () => {
      getCatalogProduct.mockReturnValue(CITIZENSHIP_PRODUCT);
      const firstRead = deferredRead();
      loadProfile.mockReturnValueOnce(firstRead.promise).mockResolvedValueOnce({
        displayName: "Игрок_7734",
        xp: 0,
        isCitizen: false,
        isAuthoritative: false,
        nameChange: null,
        approvedName: null,
      });

      const card = await appendCard({ visible: true });
      expect(loadProfile).toHaveBeenCalledTimes(1);
      // The newer reconciliation read fails fast and lands first.
      reconcile();
      await settle(card);

      // The older, good read lands last with an authoritative citizen answer.
      firstRead.resolve({ ...CITIZEN_PROFILE, approvedName: "Good" });
      await settle(card);

      // Dropped: the card stays on the zero-state for this page load.
      expect(card.textContent).not.toContain("citizenship_card.citizen_badge");
      expect(buyButton(card)).toBeNull();
      expect(getCitizenshipStatus()).toBe("not_citizen");
      expect(getApprovedName()).toEqual({ kind: "unknown" });
      expect(loadProfile).toHaveBeenCalledTimes(2);
    });
  });

  // ── Task 0329: a card hidden on a degraded boot re-checks its gate when the
  // Yandex platform recovers late. Owner ruling Q1 (2026-09-28): the card
  // listens whenever the flag check hides it; on the signal it re-reads the flag
  // and reveals only if the flag is really on (0291 fail-closed kept).
  describe("late platform recovery (task 0329)", () => {
    async function settle(card: CitizenshipCard): Promise<void> {
      for (let i = 0; i < 4; i++) {
        await flushMicrotasks();
        await flushLit(card);
      }
    }

    /** The facade's recovery signal, resolved by hand. */
    function deferredRecovery(): { recover: () => void } {
      let recover: () => void = () => {};
      whenPlatformRecoveredLate.mockReturnValue(
        new Promise<void>((resolve) => {
          recover = () => resolve();
        }),
      );
      return { recover: () => recover() };
    }

    const reconcile = () =>
      window.dispatchEvent(new CustomEvent(PURCHASES_RECONCILED_EVENT));

    it("reveals the card when the flag is on after a late recovery", async () => {
      const recovery = deferredRecovery();
      isCitizenshipUiEnabled.mockResolvedValueOnce(false);

      const card = await appendCard({ visible: true });
      expect(card.classList.contains("hidden")).toBe(true);
      expect(card.textContent!.trim()).toBe("");
      expect(loadProfile).not.toHaveBeenCalled();

      isCitizenshipUiEnabled.mockResolvedValue(true);
      recovery.recover();
      await settle(card);

      expect(card.classList.contains("hidden")).toBe(false);
      expect(card.textContent).toContain("citizenship_card.title");
      expect(logEventAnalytics).toHaveBeenCalledWith("Citizenship:Seen");
      expect(loadProfile).toHaveBeenCalledTimes(1);
      expect(isCitizenshipUiEnabled).toHaveBeenCalledTimes(2);
    });

    it("publishes the citizenship status once revealed (perk no longer unknown)", async () => {
      const recovery = deferredRecovery();
      isCitizenshipUiEnabled.mockResolvedValueOnce(false);
      loadProfile.mockResolvedValue({
        ...NON_CITIZEN_PROFILE,
        isCitizen: true,
      });

      const card = await appendCard({ visible: true });
      expect(getCitizenshipStatus()).toBe("unknown");

      isCitizenshipUiEnabled.mockResolvedValue(true);
      recovery.recover();
      await settle(card);

      expect(getCitizenshipStatus()).toBe("citizen");
    });

    it("stays hidden when the flag is still off after recovery", async () => {
      const recovery = deferredRecovery();
      isCitizenshipUiEnabled.mockResolvedValue(false);

      const card = await appendCard({ visible: true });
      recovery.recover();
      await settle(card);

      expect(card.classList.contains("hidden")).toBe(true);
      expect(card.textContent!.trim()).toBe("");
      expect(isCitizenshipUiEnabled).toHaveBeenCalledTimes(2);
      expect(loadProfile).not.toHaveBeenCalled();
      expect(logEventAnalytics).not.toHaveBeenCalled();
      expect(getCitizenshipStatus()).toBe("unknown");
    });

    it("stays hidden when the platform never recovers", async () => {
      isCitizenshipUiEnabled.mockResolvedValue(false);

      const card = await appendCard({ visible: true });
      await settle(card);

      expect(card.classList.contains("hidden")).toBe(true);
      expect(whenPlatformRecoveredLate).toHaveBeenCalledTimes(1);
      expect(isCitizenshipUiEnabled).toHaveBeenCalledTimes(1);
      expect(loadProfile).not.toHaveBeenCalled();
    });

    // Owner ruling Q2 on 0326: `Citizenship:Earned:XP` is dormant (0250 S1,
    // D4), so one server read per refresh stands in for it.
    it("reads the profile once across a recovery; reconciliation reads only after the reveal", async () => {
      const recovery = deferredRecovery();
      isCitizenshipUiEnabled.mockResolvedValueOnce(false);
      loadProfile.mockResolvedValue(NON_CITIZEN_PROFILE);

      const card = await appendCard({ visible: true });
      // Hidden: the reconciliation listener is not registered yet.
      reconcile();
      await settle(card);
      expect(loadProfile).not.toHaveBeenCalled();

      isCitizenshipUiEnabled.mockResolvedValue(true);
      recovery.recover();
      await settle(card);
      expect(loadProfile).toHaveBeenCalledTimes(1);
      expect(claimTenureGrant).toHaveBeenCalledTimes(1);

      reconcile();
      await settle(card);
      expect(loadProfile).toHaveBeenCalledTimes(2);
      expect(claimTenureGrant).toHaveBeenCalledTimes(1);
    });

    it("does nothing extra for a card already shown at the gate", async () => {
      const recovery = deferredRecovery();

      const card = await appendCard({ visible: true });
      recovery.recover();
      await settle(card);

      expect(card.classList.contains("hidden")).toBe(false);
      expect(whenPlatformRecoveredLate).not.toHaveBeenCalled();
      expect(isCitizenshipUiEnabled).toHaveBeenCalledTimes(1);
      expect(loadProfile).toHaveBeenCalledTimes(1);
      expect(
        logEventAnalytics.mock.calls.filter(
          ([event]) => event === "Citizenship:Seen",
        ),
      ).toHaveLength(1);
    });

    it("does not reveal a card disconnected before the signal", async () => {
      const recovery = deferredRecovery();
      isCitizenshipUiEnabled.mockResolvedValueOnce(false);

      const card = await appendCard({ visible: true });
      card.remove();
      isCitizenshipUiEnabled.mockResolvedValue(true);
      recovery.recover();
      await settle(card);

      expect(card.classList.contains("hidden")).toBe(true);
      expect(isCitizenshipUiEnabled).toHaveBeenCalledTimes(1);
      expect(loadProfile).not.toHaveBeenCalled();
      expect(logEventAnalytics).not.toHaveBeenCalled();
    });

    it("does not reveal a card disconnected while the second flag read is pending", async () => {
      const recovery = deferredRecovery();
      isCitizenshipUiEnabled.mockResolvedValueOnce(false);

      const card = await appendCard({ visible: true });
      let resolveFlag: (value: boolean) => void = () => {};
      isCitizenshipUiEnabled.mockReturnValue(
        new Promise<boolean>((resolve) => {
          resolveFlag = resolve;
        }),
      );
      recovery.recover();
      await settle(card);
      expect(isCitizenshipUiEnabled).toHaveBeenCalledTimes(2);

      card.remove();
      resolveFlag(true);
      await settle(card);

      expect(card.classList.contains("hidden")).toBe(true);
      expect(loadProfile).not.toHaveBeenCalled();
      expect(logEventAnalytics).not.toHaveBeenCalled();
    });

    it("never subscribes when the local CITIZENSHIP_CARD_ENABLED flag is off", async () => {
      flashistConstants.features.CITIZENSHIP_CARD_ENABLED = false;

      await appendCard({ visible: true });

      expect(whenPlatformRecoveredLate).not.toHaveBeenCalled();
    });

    // Review R1: `YaGames.init()` has no upper bound, so the recovery can land
    // after the player joined a lobby or match. The late reveal (and with it the
    // tenure gift popup and Citizenship:Seen) waits for the start screen — a
    // lobby or match is never interrupted (the 0303 rule).
    describe("recovery while away from the start screen (review R1)", () => {
      /** A stand-in for the real <tenure-grant-modal> in the page. */
      function appendModal(): jest.Mock {
        const modal = document.createElement("tenure-grant-modal");
        const show = jest.fn();
        Object.assign(modal, { show });
        document.body.appendChild(modal);
        return show;
      }

      let away = false;
      beforeEach(() => {
        away = false;
        setStartScreenPresenceSource(() => away);
        loadProfile.mockResolvedValue(NON_CITIZEN_PROFILE);
        claimTenureGrant.mockResolvedValue({
          status: "granted",
          xpAwarded: 30,
          xp: 55,
        });
      });

      it("waits for the start screen: no reveal, gift popup or Seen during a lobby or match", async () => {
        const show = appendModal();
        const recovery = deferredRecovery();
        isCitizenshipUiEnabled.mockResolvedValueOnce(false);

        const card = await appendCard({ visible: true });
        away = true; // the player joined a lobby, then the platform recovered
        isCitizenshipUiEnabled.mockResolvedValue(true);
        recovery.recover();
        await settle(card);

        expect(card.classList.contains("hidden")).toBe(true);
        expect(loadProfile).not.toHaveBeenCalled();
        expect(claimTenureGrant).not.toHaveBeenCalled();
        expect(show).not.toHaveBeenCalled();
        expect(logEventAnalytics).not.toHaveBeenCalled();

        away = false; // back on the start screen (left the lobby)
        reportBackOnStartScreen();
        await settle(card);

        expect(card.classList.contains("hidden")).toBe(false);
        expect(logEventAnalytics).toHaveBeenCalledWith("Citizenship:Seen");
        expect(claimTenureGrant).toHaveBeenCalledTimes(1);
        expect(show).toHaveBeenCalledTimes(1);
        expect(loadProfile).toHaveBeenCalledTimes(2); // first read + gift re-read
      });

      it("reveals at once when the player is on the start screen", async () => {
        const show = appendModal();
        const recovery = deferredRecovery();
        isCitizenshipUiEnabled.mockResolvedValueOnce(false);

        const card = await appendCard({ visible: true });
        isCitizenshipUiEnabled.mockResolvedValue(true);
        recovery.recover();
        await settle(card);

        expect(card.classList.contains("hidden")).toBe(false);
        expect(logEventAnalytics).toHaveBeenCalledWith("Citizenship:Seen");
        expect(show).toHaveBeenCalledTimes(1);
      });

      it("does not reveal a card disconnected while it waits for the start screen", async () => {
        const recovery = deferredRecovery();
        isCitizenshipUiEnabled.mockResolvedValueOnce(false);

        const card = await appendCard({ visible: true });
        away = true;
        isCitizenshipUiEnabled.mockResolvedValue(true);
        recovery.recover();
        await settle(card);

        card.remove();
        away = false;
        reportBackOnStartScreen();
        await settle(card);

        expect(card.classList.contains("hidden")).toBe(true);
        expect(loadProfile).not.toHaveBeenCalled();
        expect(claimTenureGrant).not.toHaveBeenCalled();
        expect(logEventAnalytics).not.toHaveBeenCalled();
      });

      // Task 0336 deliberately reverses this test's old assertion (the popup
      // opened at once): the gate reveal is unchanged, but its gift popup now
      // waits for the start screen like every other path.
      it("a card shown at the gate while away still reveals, but its gift popup waits (task 0336)", async () => {
        const show = appendModal();
        away = true; // the gate reveal itself is not the late path: no wait

        const card = await appendCard({ visible: true });
        await settle(card);

        expect(card.classList.contains("hidden")).toBe(false);
        expect(show).not.toHaveBeenCalled();

        away = false;
        reportBackOnStartScreen();
        await settle(card);

        expect(show).toHaveBeenCalledTimes(1);
      });
    });
  });

  // Task 0397: the session status line (owner rulings Q1–Q3, 2026-10-06) and
  // the 0278 paths folded into it.
  describe("session status line (task 0397)", () => {
    async function settle(card: CitizenshipCard): Promise<void> {
      for (let i = 0; i < 4; i++) {
        await flushMicrotasks();
        await flushLit(card);
      }
    }

    const reconcile = () =>
      window.dispatchEvent(new CustomEvent(PURCHASES_RECONCILED_EVENT));

    const notice = (card: CitizenshipCard) =>
      card.querySelector("#citizenship-status-notice");
    const restartButton = (card: CitizenshipCard) =>
      card.querySelector(
        "#citizenship-status-restart",
      ) as HTMLButtonElement | null;
    const loginButton = (card: CitizenshipCard) =>
      card.querySelector("#citizenship-login-button");
    const checkingLine = (card: CitizenshipCard) =>
      card.querySelector("#citizenship-status-checking");
    const statusEvents = () =>
      logEventAnalytics.mock.calls
        .map(([event]) => event as string)
        .filter((event) => event.startsWith("Citizenship:Status:"));

    /** A read held open by the test. */
    function pendingRead(): (value: unknown) => void {
      let resolve: (value: unknown) => void = () => {};
      loadProfile.mockReturnValueOnce(
        new Promise((r) => {
          resolve = r;
        }),
      );
      return (value) => resolve(value);
    }

    /** The facade's late-login signal, resolved by hand. */
    function deferredLateLogin(): () => void {
      let fire: () => void = () => {};
      whenYandexAuthorizedLate.mockReturnValue(
        new Promise<void>((resolve) => {
          fire = () => resolve();
        }),
      );
      return () => fire();
    }

    const UNVERIFIED_CITIZEN = {
      ...NON_CITIZEN_PROFILE,
      xp: 100,
      isCitizen: true,
      isVerifiedRead: false,
    };
    const VERIFIED_PAID = {
      ...UNVERIFIED_CITIZEN,
      isPaidCitizen: true,
      isVerifiedRead: true,
    };
    const VERIFIED_EARNED = { ...UNVERIFIED_CITIZEN, isVerifiedRead: true };
    // What loadPlayerProfileView returns on a failed or timed-out read.
    const FAILED_READ = {
      ...NON_CITIZEN_PROFILE,
      xp: 0,
      isAuthoritative: false,
      isVerifiedRead: false,
    };

    describe("checking (before the first read lands)", () => {
      it("shows the checking line — no login button, no buy button", async () => {
        getCatalogProduct.mockReturnValue(CITIZENSHIP_PRODUCT);
        const resolve = pendingRead();

        const card = await appendCard({ visible: true });

        expect(checkingLine(card)).not.toBeNull();
        expect(card.textContent).toContain("citizenship_status.checking");
        expect(loginButton(card)).toBeNull();
        expect(card.querySelector("#citizenship-buy-button")).toBeNull();
        expect(card.textContent).not.toContain(
          "citizenship_card.guest_subtitle",
        );
        expect(getProfileVerificationStatus()).toBe("unknown");
        expect(statusEvents()).toEqual([]);

        resolve(NON_CITIZEN_PROFILE);
        await settle(card);
        expect(checkingLine(card)).toBeNull();
        expect(card.querySelector("#citizenship-buy-button")).not.toBeNull();
      });

      it("still fires Citizenship:Seen while checking", async () => {
        pendingRead();
        await appendCard({ visible: true });
        expect(logEventAnalytics).toHaveBeenCalledWith("Citizenship:Seen");
      });
    });

    it("guest: the guest card, unchanged, and nothing new", async () => {
      const card = await appendCard({ visible: true });

      expect(loginButton(card)).not.toBeNull();
      expect(checkingLine(card)).toBeNull();
      expect(notice(card)).toBeNull();
      expect(getProfileVerificationStatus()).toBe("guest");
      expect(statusEvents()).toEqual([]);
    });

    describe("couldn't load (failed read)", () => {
      it("shows the notice and the Restart game button; logs ReadFailed once", async () => {
        loadProfile.mockResolvedValue(FAILED_READ);
        const card = await appendCard({ visible: true });

        expect(card.textContent).toContain("citizenship_status.read_failed");
        expect(card.textContent).not.toContain(
          "citizenship_status.still_failing",
        );
        expect(restartButton(card)).not.toBeNull();
        expect(restartButton(card)!.textContent).toContain(
          "citizenship_status.restart",
        );

        reconcile();
        await settle(card);
        expect(statusEvents()).toEqual(["Citizenship:Status:ReadFailed"]);
      });

      it("a press on the start screen writes the marker, logs Restart and reloads", async () => {
        loadProfile.mockResolvedValue(FAILED_READ);
        const card = await appendCard({ visible: true });

        restartButton(card)!.click();

        expect(reloadApp).toHaveBeenCalledTimes(1);
        expect(statusEvents()).toEqual([
          "Citizenship:Status:ReadFailed",
          "Citizenship:Status:Restart",
        ]);
        expect(
          sessionStorage.getItem(PROFILE_READ_RESTART_MARKER_KEY),
        ).not.toBe(null);

        // A second tap before the page unloads does nothing.
        restartButton(card)!.click();
        expect(reloadApp).toHaveBeenCalledTimes(1);
      });

      it.each([
        ["in a lobby or match", () => setStartScreenPresenceSource(() => true)],
        ["while a join is being set up", () => void beginJoiningLobby()],
      ])(
        "a press %s does nothing and logs nothing; the button stays",
        async (_label, goAway) => {
          loadProfile.mockResolvedValue(FAILED_READ);
          const card = await appendCard({ visible: true });
          goAway();

          restartButton(card)!.click();
          await settle(card);

          expect(reloadApp).not.toHaveBeenCalled();
          expect(statusEvents()).toEqual(["Citizenship:Status:ReadFailed"]);
          expect(sessionStorage.getItem(PROFILE_READ_RESTART_MARKER_KEY)).toBe(
            null,
          );
          expect(restartButton(card)).not.toBeNull();

          // Back on the start screen, the same button works.
          resetStartScreenPresenceForTests();
          restartButton(card)!.click();
          expect(reloadApp).toHaveBeenCalledTimes(1);
        },
      );

      it("after a restart from this button, a failed read says still not working", async () => {
        sessionStorage.setItem(PROFILE_READ_RESTART_MARKER_KEY, "1");
        loadProfile.mockResolvedValue(FAILED_READ);

        const card = await appendCard({ visible: true });

        expect(card.textContent).toContain("citizenship_status.still_failing");
        expect(card.textContent).not.toContain(
          "citizenship_status.read_failed",
        );
        expect(restartButton(card)).not.toBeNull();
        expect(statusEvents()).toEqual(["Citizenship:Status:ReadFailed"]);
        // Read once and removed, so it cannot carry past this load.
        expect(sessionStorage.getItem(PROFILE_READ_RESTART_MARKER_KEY)).toBe(
          null,
        );
      });

      it("a restart that DID help: the marker is consumed and nothing shows", async () => {
        sessionStorage.setItem(PROFILE_READ_RESTART_MARKER_KEY, "1");
        loadProfile.mockResolvedValue(NON_CITIZEN_PROFILE);

        const card = await appendCard({ visible: true });

        expect(notice(card)).toBeNull();
        expect(sessionStorage.getItem(PROFILE_READ_RESTART_MARKER_KEY)).toBe(
          null,
        );
      });

      // Review R1: the marker is consumed on the load after the restart even
      // when the card never shows on it, so it cannot reach a later load.
      it.each([
        [
          "killed",
          () => {
            flashistConstants.features.CITIZENSHIP_CARD_ENABLED = false;
          },
        ],
        [
          "hidden by the flag",
          () => {
            isCitizenshipUiEnabled.mockResolvedValue(false);
          },
        ],
      ])(
        "a card %s on the next load still consumes the marker",
        async (_label, disableCard) => {
          sessionStorage.setItem(PROFILE_READ_RESTART_MARKER_KEY, "1");
          disableCard();

          const hiddenCard = await appendCard({ visible: true });

          expect(hiddenCard.classList.contains("hidden")).toBe(true);
          expect(sessionStorage.getItem(PROFILE_READ_RESTART_MARKER_KEY)).toBe(
            null,
          );

          // A much later load whose read fails: no recent restart, so the
          // plain couldn't-load text, never "still not working".
          hiddenCard.remove();
          resetProfileReadRestartForTests();
          flashistConstants.features.CITIZENSHIP_CARD_ENABLED = true;
          isCitizenshipUiEnabled.mockResolvedValue(true);
          loadProfile.mockResolvedValue(FAILED_READ);

          const laterCard = await appendCard({ visible: true });

          expect(laterCard.textContent).toContain(
            "citizenship_status.read_failed",
          );
          expect(laterCard.textContent).not.toContain(
            "citizenship_status.still_failing",
          );
        },
      );

      it("a card hidden at boot and revealed late on the same load still says still not working", async () => {
        sessionStorage.setItem(PROFILE_READ_RESTART_MARKER_KEY, "1");
        let recover: () => void = () => {};
        whenPlatformRecoveredLate.mockReturnValue(
          new Promise<void>((resolve) => {
            recover = () => resolve();
          }),
        );
        isCitizenshipUiEnabled.mockResolvedValueOnce(false);
        loadProfile.mockResolvedValue(FAILED_READ);

        const card = await appendCard({ visible: true });
        expect(card.classList.contains("hidden")).toBe(true);
        expect(sessionStorage.getItem(PROFILE_READ_RESTART_MARKER_KEY)).toBe(
          null,
        );

        isCitizenshipUiEnabled.mockResolvedValue(true);
        recover();
        await settle(card);

        expect(card.classList.contains("hidden")).toBe(false);
        expect(card.textContent).toContain("citizenship_status.still_failing");
      });

      // 0278 Situation B: an authorized player whose read comes back
      // non-authoritative (failed login, D3 latch) — never a bare 0 XP card
      // with no action.
      it("0278 situation B: a failed login gets the notice and the button, not a bare 0 XP card", async () => {
        getCatalogProduct.mockReturnValue(CITIZENSHIP_PRODUCT);
        loadProfile.mockResolvedValue(FAILED_READ);

        const card = await appendCard({ visible: true });

        expect(card.textContent).toContain("citizenship_card.xp_label");
        expect(card.querySelector("#citizenship-buy-button")).toBeNull();
        expect(restartButton(card)).not.toBeNull();
        expect(getProfileVerificationStatus()).toBe("read_failed");
      });
    });

    describe("unverified", () => {
      it("a citizen: the text only, no button; logs Unverified once", async () => {
        loadProfile.mockResolvedValue(UNVERIFIED_CITIZEN);
        const card = await appendCard({ visible: true });

        expect(card.textContent).toContain("citizenship_status.unverified");
        expect(restartButton(card)).toBeNull();
        expect(getProfileVerificationStatus()).toBe("unverified");

        reconcile();
        await settle(card);
        expect(statusEvents()).toEqual(["Citizenship:Status:Unverified"]);
      });

      it("a non-citizen: nothing new", async () => {
        loadProfile.mockResolvedValue(NON_CITIZEN_PROFILE);
        const card = await appendCard({ visible: true });

        expect(notice(card)).toBeNull();
        expect(getProfileVerificationStatus()).toBe("unverified");
        expect(statusEvents()).toEqual([]);
      });

      it("a confirmed purchase whose re-read is unverified shows the notice", async () => {
        getCatalogProduct.mockReturnValue(CITIZENSHIP_PRODUCT);
        loadProfile.mockResolvedValue(NON_CITIZEN_PROFILE);
        const card = await appendCard({ visible: true });
        runPurchase.mockResolvedValue("granted");
        loadProfile.mockResolvedValue(UNVERIFIED_CITIZEN);

        (
          card.querySelector("#citizenship-buy-button") as HTMLButtonElement
        ).click();
        await settle(card);

        expect(card.textContent).toContain("citizenship_status.unverified");
        expect(isCurrentPlayerPaidCitizen()).toBe(false);
      });
    });

    describe("verified", () => {
      it("paid: the verified line, from the one published paid value", async () => {
        loadProfile.mockResolvedValue(VERIFIED_PAID);
        const card = await appendCard({ visible: true });

        expect(card.textContent).toContain("citizenship_status.verified_paid");
        expect(isCurrentPlayerPaidCitizen()).toBe(true);
        expect(restartButton(card)).toBeNull();
        expect(statusEvents()).toEqual([]);
      });

      it("not paid: nothing new", async () => {
        loadProfile.mockResolvedValue(VERIFIED_EARNED);
        const card = await appendCard({ visible: true });

        expect(notice(card)).toBeNull();
        expect(getProfileVerificationStatus()).toBe("verified");
      });

      it("never the verified line on an unverified read claiming paid", async () => {
        loadProfile.mockResolvedValue({
          ...UNVERIFIED_CITIZEN,
          isPaidCitizen: true,
        });
        const card = await appendCard({ visible: true });

        expect(card.textContent).not.toContain(
          "citizenship_status.verified_paid",
        );
        expect(card.textContent).toContain("citizenship_status.unverified");
      });
    });

    it("a purchases-reconciled re-read updates the line without a reload", async () => {
      loadProfile.mockResolvedValue(FAILED_READ);
      const card = await appendCard({ visible: true });
      expect(restartButton(card)).not.toBeNull();

      loadProfile.mockResolvedValue(VERIFIED_PAID);
      reconcile();
      await settle(card);

      expect(restartButton(card)).toBeNull();
      expect(card.textContent).toContain("citizenship_status.verified_paid");
      expect(reloadApp).not.toHaveBeenCalled();
    });

    it("kill switch off: nothing renders and nothing publishes", async () => {
      flashistConstants.features.CITIZENSHIP_CARD_ENABLED = false;
      loadProfile.mockResolvedValue(FAILED_READ);

      const card = await appendCard({ visible: true });

      expect(card.textContent!.trim()).toBe("");
      expect(getProfileVerificationStatus()).toBe("unknown");
      expect(statusEvents()).toEqual([]);
      expect(whenYandexAuthorizedLate).not.toHaveBeenCalled();
    });

    it("citizenship_ui off: nothing renders and nothing publishes", async () => {
      isCitizenshipUiEnabled.mockResolvedValue(false);
      loadProfile.mockResolvedValue(FAILED_READ);

      const card = await appendCard({ visible: true });

      expect(card.textContent!.trim()).toBe("");
      expect(getProfileVerificationStatus()).toBe("unknown");
    });

    it("a superseded read publishes nothing", async () => {
      const resolveFirst = pendingRead();
      loadProfile.mockResolvedValueOnce(VERIFIED_PAID);

      const card = await appendCard({ visible: true });
      reconcile();
      await settle(card);
      expect(getProfileVerificationStatus()).toBe("verified");

      resolveFirst(FAILED_READ);
      await settle(card);

      expect(getProfileVerificationStatus()).toBe("verified");
      expect(statusEvents()).toEqual([]);
    });

    it("stays the single profile reader: one load per refresh", async () => {
      loadProfile.mockResolvedValue(UNVERIFIED_CITIZEN);
      const card = await appendCard({ visible: true });
      expect(loadProfile).toHaveBeenCalledTimes(1);
      reconcile();
      await settle(card);
      expect(loadProfile).toHaveBeenCalledTimes(2);
    });

    // 0278 folded in: the Yandex player turns out to be logged in only after
    // the card's read said guest.
    describe("late Yandex login (0278)", () => {
      it("card showing as guest: shows checking, reads exactly once more, ends in the real state", async () => {
        const fireLateLogin = deferredLateLogin();
        const card = await appendCard({ visible: true });
        expect(loginButton(card)).not.toBeNull();
        expect(loadProfile).toHaveBeenCalledTimes(1);

        const resolve = pendingRead();
        fireLateLogin();
        await settle(card);

        expect(checkingLine(card)).not.toBeNull();
        expect(loginButton(card)).toBeNull();
        expect(getProfileVerificationStatus()).toBe("unknown");
        expect(loadProfile).toHaveBeenCalledTimes(2);

        resolve(UNVERIFIED_CITIZEN);
        await settle(card);

        expect(checkingLine(card)).toBeNull();
        expect(card.textContent).toContain("citizenship_status.unverified");
        expect(loadProfile).toHaveBeenCalledTimes(2);
      });

      it("card showing as guest: a re-read that fails ends in couldn't-load + button", async () => {
        const fireLateLogin = deferredLateLogin();
        const card = await appendCard({ visible: true });

        loadProfile.mockResolvedValue(FAILED_READ);
        fireLateLogin();
        await settle(card);

        expect(card.textContent).toContain("citizenship_status.read_failed");
        expect(restartButton(card)).not.toBeNull();
        expect(loginButton(card)).toBeNull();
        expect(loadProfile).toHaveBeenCalledTimes(2);
      });

      it("a signal already fired before the reveal causes no second read", async () => {
        whenYandexAuthorizedLate.mockReturnValue(Promise.resolve());
        loadProfile.mockResolvedValue(UNVERIFIED_CITIZEN);

        const card = await appendCard({ visible: true });
        await settle(card);

        expect(loadProfile).toHaveBeenCalledTimes(1);
        expect(card.textContent).toContain("citizenship_status.unverified");
      });

      it("late SDK, card hidden (0329): the reveal shows checking, then the real state; no extra read", async () => {
        const fireLateLogin = deferredLateLogin();
        let recover: () => void = () => {};
        whenPlatformRecoveredLate.mockReturnValue(
          new Promise<void>((resolve) => {
            recover = () => resolve();
          }),
        );
        isCitizenshipUiEnabled.mockResolvedValueOnce(false);

        const card = await appendCard({ visible: true });
        expect(card.classList.contains("hidden")).toBe(true);

        // The late player and the late recovery land while the card is hidden.
        fireLateLogin();
        await settle(card);
        expect(loadProfile).not.toHaveBeenCalled();

        const resolve = pendingRead();
        isCitizenshipUiEnabled.mockResolvedValue(true);
        recover();
        await settle(card);
        expect(card.classList.contains("hidden")).toBe(false);
        expect(checkingLine(card)).not.toBeNull();

        resolve(VERIFIED_PAID);
        await settle(card);

        expect(card.textContent).toContain("citizenship_status.verified_paid");
        expect(loadProfile).toHaveBeenCalledTimes(1);
      });

      it("a reconnected card ignores the old connection's subscription", async () => {
        const fireLateLogin = deferredLateLogin();
        const card = await appendCard({ visible: true });
        card.remove();
        document.body.appendChild(card);
        await settle(card);
        // One read per reveal; both connections subscribed to the same signal.
        expect(loadProfile).toHaveBeenCalledTimes(2);

        fireLateLogin();
        await settle(card);

        // Only the live connection re-reads.
        expect(loadProfile).toHaveBeenCalledTimes(3);
      });
    });
  });

  describe("name change", () => {
    const CITIZEN_PROFILE = {
      displayName: "Игрок_7734",
      xp: 1000,
      isCitizen: true,
      isAuthoritative: true,
      nameChange: null,
      approvedName: null,
      isPaidCitizen: false,
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
    const nameDismiss = (card: CitizenshipCard) =>
      card.querySelector<HTMLButtonElement>("#citizenship-name-change-dismiss");

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

      // Task 0307: the card translated `username.<violation>` WITHOUT params, so
      // a too-long name showed the raw text "{max}". Driven with the real en
      // text and `{param}` substitution, to read what a player reads.
      describe("the name rule, stated in full (task 0307)", () => {
        const en = jest.requireActual("../../resources/lang/en.json") as Record<
          string,
          Record<string, string>
        >;
        beforeEach(() => {
          (translateText as jest.Mock).mockImplementation(
            (key: string, params: Record<string, string | number> = {}) => {
              const [section, name] = key.split(".");
              let text = en[section]?.[name] ?? key;
              for (const [param, value] of Object.entries(params)) {
                text = text.replace(`{${param}}`, String(value));
              }
              return text;
            },
          );
        });
        afterEach(() => {
          (translateText as jest.Mock).mockImplementation((key: string) => key);
        });

        it("a too-long error shows 27, never the raw {max}, and states the full rule", async () => {
          loadProfile.mockResolvedValue(CITIZEN_PROFILE);
          submitNameChange.mockResolvedValue({
            status: "invalid",
            violation: "too_long",
          });
          const card = await openEditor(await appendCard({ visible: true }));
          await typeName(card, "a".repeat(27));
          nameSubmit(card)!.click();
          await flushLit(card);
          await flushMicrotasks();
          await flushLit(card);
          const text = nameError(card)!.textContent ?? "";
          expect(text).toContain("Username must not exceed 27 characters.");
          expect(text).toContain(
            "3–27 characters: letters, numbers, spaces, _ and [ ].",
          );
          expect(text).not.toContain("{");
        });

        it("shows the rule hint under the input while editing, and caps it at 27", async () => {
          loadProfile.mockResolvedValue(CITIZEN_PROFILE);
          const card = await openEditor(await appendCard({ visible: true }));
          expect(nameInput(card)!.getAttribute("maxlength")).toBe("27");
          expect(
            card.querySelector("#citizenship-name-change-rules-hint")!
              .textContent,
          ).toContain("3–27 characters: letters, numbers, spaces, _ and [ ].");
        });
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

      // ── Task 0314, owner ruling Q1: a Hide button, remembered by the server ──
      describe("Hide (task 0314)", () => {
        const IDLE = { ...CITIZEN_PROFILE, nameChange: null };
        const PENDING_AFTER = {
          ...CITIZEN_PROFILE,
          nameChange: {
            status: "pending" as const,
            requested_name: "BetterName",
            decided_at: null,
          },
        };

        async function tapHide(card: CitizenshipCard) {
          nameDismiss(card)!.click();
          await flushLit(card);
          await flushMicrotasks();
          await flushLit(card);
        }

        it("shows a Hide button next to Try another name", async () => {
          loadProfile.mockResolvedValue(REJECTED);
          const card = await appendCard({ visible: true });
          expect(nameDismiss(card)).not.toBeNull();
          expect(nameDismiss(card)!.textContent).toContain(
            "citizenship_name_change.dismiss",
          );
          expect(nameRetry(card)).not.toBeNull();
        });

        it("is offered ONLY on the declined notice — not idle, pending or approved", async () => {
          for (const profile of [
            IDLE,
            PENDING_AFTER,
            {
              ...CITIZEN_PROFILE,
              nameChange: {
                status: "approved" as const,
                requested_name: "NewName",
                decided_at: "2026-08-28T10:00:00.000Z",
              },
            },
          ]) {
            document.body.innerHTML = "";
            loadProfile.mockResolvedValue(profile);
            const card = await appendCard({ visible: true });
            expect(nameDismiss(card)).toBeNull();
          }
        });

        it("tap → dismiss → re-reads the profile → the card is idle", async () => {
          loadProfile.mockResolvedValue(REJECTED);
          dismissRejection.mockResolvedValue({ status: "ok" });
          const card = await appendCard({ visible: true });
          loadProfile.mockClear();
          loadProfile.mockResolvedValue(IDLE);
          await tapHide(card);
          expect(dismissRejection).toHaveBeenCalledTimes(1);
          // The idle state comes from the SERVER, never latched locally.
          expect(loadProfile).toHaveBeenCalledTimes(1);
          expect(nameCta(card)).not.toBeNull();
          expect(card.textContent).not.toContain(
            "citizenship_name_change.rejected_label",
          );
          expect(nameError(card)).toBeNull();
        });

        it("stores nothing on the device", async () => {
          loadProfile.mockResolvedValue(REJECTED);
          dismissRejection.mockResolvedValue({ status: "ok" });
          const card = await appendCard({ visible: true });
          loadProfile.mockResolvedValue(IDLE);
          const before = localStorage.length;
          await tapHide(card);
          expect(localStorage.length).toBe(before);
        });

        it("on error, keeps the notice and shows the error line", async () => {
          loadProfile.mockResolvedValue(REJECTED);
          dismissRejection.mockResolvedValue({ status: "error" });
          const card = await appendCard({ visible: true });
          loadProfile.mockClear();
          await tapHide(card);
          expect(loadProfile).not.toHaveBeenCalled();
          expect(card.textContent).toContain(
            "citizenship_name_change.rejected_label",
          );
          expect(nameError(card)!.textContent).toContain(
            "citizenship_name_change.error_generic",
          );
        });

        it("ignores a second tap while one is in flight", async () => {
          loadProfile.mockResolvedValue(REJECTED);
          let resolveDismiss: (value: { status: "ok" }) => void = () => {};
          dismissRejection.mockReturnValue(
            new Promise((resolve) => {
              resolveDismiss = resolve;
            }),
          );
          const card = await appendCard({ visible: true });
          nameDismiss(card)!.click();
          nameDismiss(card)!.click();
          await flushLit(card);
          expect(dismissRejection).toHaveBeenCalledTimes(1);
          resolveDismiss({ status: "ok" });
          await flushMicrotasks();
        });

        it("after hiding, CTA → editor → submit still reaches pending", async () => {
          loadProfile.mockResolvedValue(REJECTED);
          dismissRejection.mockResolvedValue({ status: "ok" });
          submitNameChange.mockResolvedValue({ status: "ok" });
          const card = await appendCard({ visible: true });
          loadProfile.mockResolvedValue(IDLE);
          await tapHide(card);
          await openEditor(card);
          await typeName(card, "BetterName");
          loadProfile.mockResolvedValue(PENDING_AFTER);
          nameSubmit(card)!.click();
          await flushLit(card);
          await flushMicrotasks();
          await flushLit(card);
          expect(submitNameChange).toHaveBeenCalledWith("BetterName");
          expect(card.textContent).toContain(
            "citizenship_name_change.pending_label",
          );
        });
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
